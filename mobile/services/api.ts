import axios, { AxiosInstance, AxiosError } from 'axios';
import { Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../constants/api';

const API_TOKEN_KEY = 'auth_token';
const API_REFRESH_TOKEN_KEY = 'refresh_token';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 60000, // 60 seconds for large image uploads
      headers: {
        'Content-Type': 'application/json',
        'Bypass-Tunnel-Reminder': 'true',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor - Add token (public endpoint'ler hariç)
    this.client.interceptors.request.use(
      async (config) => {
        const fullUrl = `${config.baseURL || ''}${config.url || ''}`;
        console.log(`🚀 [NET] Sending ${config.method?.toUpperCase()} to: ${fullUrl}`);

        const url = config.url || '';
        const method = (config.method || 'get').toLowerCase();
        const isPublicEndpoint = url.includes('/jobs') &&
          !url.includes('/my-jobs') &&
          !url.includes('/bids') &&
          method === 'get';

        if (isPublicEndpoint) {
          delete config.headers.Authorization;
        } else {
          const token = await SecureStore.getItemAsync(API_TOKEN_KEY);
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - Handle errors and token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;
        const is401 = error.response?.status === 401;
        const url = originalRequest?.url || '';

        // Check if this is an auth endpoint (login, register, refresh-token)
        const isAuthEndpoint = url.includes('/auth/login') ||
          url.includes('/auth/register') ||
          url.includes('/auth/refresh-token') ||
          url.includes('/auth/me');

        const isPublicEndpoint = url.includes('/jobs') &&
          !url.includes('/my-jobs') &&
          originalRequest?.method === 'get';

        // Public endpoint'lerde 401 alınırsa, token'ı kaldır ve tekrar dene
        if (is401 && isPublicEndpoint && !originalRequest._retry) {
          originalRequest._retry = true;
          delete originalRequest.headers.Authorization;
          try {
            return await this.client.request(originalRequest);
          } catch (retryError) {
            return Promise.reject(error);
          }
        }

        // Token refresh logic - EXCLUDE auth endpoints
        const shouldRefreshToken = is401 && !isAuthEndpoint && !isPublicEndpoint && !originalRequest._retry;

        if (shouldRefreshToken) {
          originalRequest._retry = true;
          console.log('🔄 Token expired, attempting refresh...');

          try {
            const refreshToken = await SecureStore.getItemAsync(API_REFRESH_TOKEN_KEY);
            if (!refreshToken) {
              console.log('ℹ️ No refresh token found, logging out...');
              await this.clearTokens();
              try {
                const { store } = await import('../store/store');
                const { logout } = await import('../store/slices/authSlice');
                store.dispatch(logout());
              } catch (e) { }
              return Promise.reject(error);
            }

            const response = await axios.post(`${API_BASE_URL}auth/refresh-token`, {
              refreshToken,
            }, {
              headers: {
                'Bypass-Tunnel-Reminder': 'true',
              }
            });

            const { accessToken, refreshToken: newRefreshToken } = response.data.data;
            await SecureStore.setItemAsync(API_TOKEN_KEY, accessToken);
            if (newRefreshToken) {
              await SecureStore.setItemAsync(API_REFRESH_TOKEN_KEY, newRefreshToken);
            }

            console.log('✅ Token refreshed successfully');
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return this.client(originalRequest);
          } catch (refreshError: any) {
            console.log('ℹ️ Token refresh failed, logging out...');
            await this.clearTokens();
            try {
              const { store } = await import('../store/store');
              const { logout } = await import('../store/slices/authSlice');
              store.dispatch(logout());
            } catch (e) { }
            return Promise.reject(error);
          }
        }

        // Show detailed error alert for debugging (Removed for production UX)
        let errorMessage = (error.response?.data as any)?.message || (error.response?.data as any)?.error || error.message || 'Bilinmeyen Hata';

        if (typeof errorMessage === 'object') {
          try {
            errorMessage = JSON.stringify(errorMessage);
          } catch (e) {
            errorMessage = '[Complex Error Object]';
          }
        }

        const statusCode = error.response?.status || 'No Status';
        const errorUrl = error.config?.url || 'Unknown URL';
        const responseHeaders = error.response?.headers;

        console.error(`❌ [API ERROR] ${originalRequest?.method?.toUpperCase()} ${errorUrl} -> Status: ${statusCode}, Message: ${errorMessage}`);

        return Promise.reject(error);
      }
    );
  }

  async setTokens(accessToken: string, refreshToken: string) {
    await SecureStore.setItemAsync(API_TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(API_REFRESH_TOKEN_KEY, refreshToken);
  }

  async clearTokens() {
    await SecureStore.deleteItemAsync(API_TOKEN_KEY);
    await SecureStore.deleteItemAsync(API_REFRESH_TOKEN_KEY);
  }

  async getToken(): Promise<string | null> {
    return SecureStore.getItemAsync(API_TOKEN_KEY);
  }

  getClient(): AxiosInstance {
    return this.client;
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message?: string }> {
    const response = await this.client.put('/users/password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  }
}

export const apiService = new ApiService();
export default apiService.getClient();
