import axios, { AxiosInstance, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../constants/api';

const API_TOKEN_KEY = 'auth_token';
const API_REFRESH_TOKEN_KEY = 'refresh_token';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor - Add token (public endpoint'ler hariç)
    this.client.interceptors.request.use(
      async (config) => {
        // Public endpoint'leri belirle: GET /jobs, GET /jobs/:id, GET /jobs/:id/bids
        const url = config.url || '';
        const method = (config.method || 'get').toLowerCase();
        const isPublicEndpoint = url.includes('/jobs') &&
          !url.includes('/my-jobs') &&
          !url.includes('/bids') && // Bids endpoints always require auth
          method === 'get';

        // Public endpoint'lerde token gönderme - Authorization header'ı kaldır
        if (isPublicEndpoint) {
          delete config.headers.Authorization;
        } else {
          // Protected endpoint'lerde token ekle (bids endpoints, my-jobs, etc.)
          const token = await SecureStore.getItemAsync(API_TOKEN_KEY);
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          } else if (url.includes('/bids')) {
            // Bids endpoints require auth, log if no token
            console.warn('⚠️ No token found for bids endpoint:', url);
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
        const isAuthMe = error.config?.url?.includes('/auth/me');
        const is401 = error.response?.status === 401;
        // Public endpoint'ler: GET /jobs, GET /jobs/:id, GET /jobs/:id/bids
        const isPublicEndpoint = error.config?.url?.includes('/jobs') &&
          !error.config?.url?.includes('/my-jobs') &&
          error.config?.method === 'get';
        const isNetworkError = error.code === 'ECONNREFUSED' ||
          error.code === 'ENOTFOUND' ||
          error.code === 'ETIMEDOUT' ||
          error.message === 'Network Error' ||
          !error.response;

        // Public endpoint'lerde 401 alınırsa, token'ı kaldır ve tekrar dene
        if (is401 && isPublicEndpoint && !error.config?._retry) {
          const originalRequest = error.config as any;
          originalRequest._retry = true;

          // Token'ı kaldır ve tekrar dene
          delete originalRequest.headers.Authorization;

          try {
            return await this.client.request(originalRequest);
          } catch (retryError) {
            // Retry başarısız olursa, orijinal hatayı döndür
            return Promise.reject(error);
          }
        }

        // Network hatalarını daha detaylı log'la
        if (isNetworkError) {
          const apiUrl = error.config?.baseURL || API_BASE_URL;
          console.warn('🔴 Network Error - Backend\'e bağlanılamıyor');
          console.warn('   Backend URL:', apiUrl);
        } else if (!(isAuthMe && is401)) {
          const url = error.config?.url || 'unknown';
          const method = error.config?.method || 'unknown';

          if (is401) {
            console.warn(`API 401: ${method.toUpperCase()} ${url} - Token yenilenmeli.`);
          } else if (error.response?.status !== 404) {
            // 404 hatalarını gösterme - bunlar fallback mekanizması tarafından işleniyor
            console.error(`API Error: ${error.response?.status} ${method.toUpperCase()} ${url}`);
          }
        }

        const originalRequest = error.config as any;

        // Token refresh (sadece protected endpoint'lerde, /auth/me ve public endpoint'ler hariç)
        const isProtectedEndpoint = !isPublicEndpoint && !isAuthMe;
        // Bid endpoints always require auth
        const isBidEndpoint = originalRequest.url?.includes('/bids/');
        const shouldRefreshToken = error.response?.status === 401 &&
          (isProtectedEndpoint || isBidEndpoint) &&
          !originalRequest._retry;

        if (shouldRefreshToken) {
          originalRequest._retry = true;

          console.log('🔄 Token expired or invalid, attempting refresh...');

          try {
            const refreshToken = await SecureStore.getItemAsync(API_REFRESH_TOKEN_KEY);
            if (!refreshToken) {
              console.error('❌ No refresh token found');
              await this.clearTokens();
              return Promise.reject(error);
            }

            // Refresh token'ın formatını kontrol et (JWT formatında olmalı)
            const isValidFormat = refreshToken && typeof refreshToken === 'string' &&
              refreshToken.split('.').length === 3;
            if (!isValidFormat) {
              console.error('❌ Invalid refresh token format - token appears to be malformed');
              console.error('   Token length:', refreshToken?.length);
              console.error('   Token preview:', refreshToken?.substring(0, 20));
              await this.clearTokens();

              // Logout action dispatch
              try {
                const { store } = await import('../store/store');
                const { logout } = await import('../store/slices/authSlice');
                store.dispatch(logout());
              } catch (dispatchError) {
                console.error('❌ Failed to dispatch logout:', dispatchError);
              }

              const formatError = new Error('Token format is invalid. Please log in again.');
              (formatError as any).shouldRedirectToLogin = true;
              return Promise.reject(formatError);
            }

            console.log('🔄 Refreshing token...');
            const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
              refreshToken,
            });

            const { accessToken, refreshToken: newRefreshToken } = response.data.data;

            await SecureStore.setItemAsync(API_TOKEN_KEY, accessToken);
            if (newRefreshToken) {
              await SecureStore.setItemAsync(API_REFRESH_TOKEN_KEY, newRefreshToken);
            }

            console.log('✅ Token refreshed successfully');

            // Update the original request with the new token
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;

            // Create a new request config to avoid interceptor issues
            const newRequestConfig = {
              ...originalRequest,
              headers: {
                ...originalRequest.headers,
                Authorization: `Bearer ${accessToken}`,
              },
            };

            // Remove _retry flag to allow normal processing
            delete (newRequestConfig as any)._retry;

            return this.client(newRequestConfig);
          } catch (refreshError: any) {
            console.error('❌ Token refresh failed:', refreshError.response?.status, refreshError.message);
            console.error('   Refresh token error details:', refreshError.response?.data);

            // JWT malformed hatası için özel mesaj
            const errorMessage = refreshError.response?.data?.error?.message || refreshError.message || '';
            const isJwtMalformed = errorMessage.includes('malformed') ||
              errorMessage.includes('jwt malformed') ||
              refreshError.response?.data?.error?.message?.includes('malformed');

            if (isJwtMalformed) {
              console.error('❌ JWT token is malformed - clearing tokens and logging out');
            }

            await this.clearTokens();

            // Token refresh başarısız oldu - Redux store'dan logout yap (lazy import)
            try {
              // Lazy import to avoid circular dependency
              const { store } = await import('../store/store');
              const { logout } = await import('../store/slices/authSlice');
              store.dispatch(logout());
              console.log('✅ Logout action dispatched due to refresh token failure');
            } catch (dispatchError) {
              console.error('❌ Failed to dispatch logout action:', dispatchError);
            }

            // Token refresh başarısız oldu - kullanıcının tekrar login olması gerekiyor
            const errorMsg = isJwtMalformed
              ? 'Token formatı geçersiz. Lütfen tekrar giriş yapın.'
              : 'Token süresi doldu ve yenilenemedi. Lütfen tekrar giriş yapın.';
            const enhancedError = new Error(errorMsg);
            (enhancedError as any).originalError = error;
            (enhancedError as any).refreshError = refreshError;
            (enhancedError as any).shouldRedirectToLogin = true;
            return Promise.reject(enhancedError);
          }
        }

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

  // Şifre güncelleme
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

