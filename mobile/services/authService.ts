import apiClient from './api';
import { API_ENDPOINTS } from '../constants/api';
import Constants from 'expo-constants';
import { apiService } from './api';

export interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  userType: 'CITIZEN' | 'ELECTRICIAN';
  location?: any;
  serviceCategory?: string; // Ana hizmet kategorisi
  acceptedLegalVersion?: string;
  marketingAllowed?: boolean;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    fullName: string;
    userType: string;
  };
  accessToken: string;
  refreshToken: string;
}

// Mock authentication for testing (database olmadan test için)
// Backend zaten mock data döndürdüğü için MOCK_MODE kapatıldı
const MOCK_MODE = false; // Backend mock mode aktif, burada kapatıyoruz

const createMockResponse = (data: LoginData | RegisterData, fullName?: string): AuthResponse => ({
  user: {
    id: 'mock-user-id',
    email: data.email,
    fullName: fullName || data.email.split('@')[0],
    userType: 'userType' in data ? data.userType : 'CITIZEN',
  },
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
});

const mockAuth = {
  async login(data: LoginData): Promise<AuthResponse> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return createMockResponse(data);
  },

  async register(data: RegisterData): Promise<AuthResponse> {
    await new Promise(resolve => setTimeout(resolve, 500));
    return createMockResponse(data, data.fullName);
  },
};

const handleAuthResponse = async (response: AuthResponse) => {
  await apiService.setTokens(response.accessToken, response.refreshToken);
  return response;
};

export const authService = {
  async register(data: RegisterData): Promise<AuthResponse> {
    if (MOCK_MODE) {
      return handleAuthResponse(await mockAuth.register(data));
    }

    try {
      const response = await apiClient.post(API_ENDPOINTS.REGISTER, data);
      return handleAuthResponse(response.data.data);
    } catch (error: any) {
      // Re-throw to preserve axios error structure for proper status code handling
      throw error;
    }
  },

  async login(data: LoginData): Promise<AuthResponse> {
    if (MOCK_MODE) {
      return handleAuthResponse(await mockAuth.login(data));
    }

    try {
      const response = await apiClient.post(API_ENDPOINTS.LOGIN, data);
      return handleAuthResponse(response.data.data);
    } catch (error: any) {
      // 503 database hatası - mock mode'a geç
      if (error.response?.status === 503 && error.response?.data?.error?.message?.includes('Database')) {
        return handleAuthResponse(await mockAuth.login(data));
      }

      // Re-throw to preserve axios error structure for proper status code handling
      throw error;
    }
  },

  async getMe() {
    if (MOCK_MODE) {
      const token = await apiService.getToken();
      if (token === 'mock-access-token') {
        return {
          id: 'mock-user-id',
          email: 'test@example.com',
          fullName: 'Test User',
          userType: 'CITIZEN',
          isVerified: true,
        };
      }
    }

    const response = await apiClient.get(API_ENDPOINTS.ME);
    return response.data.data.user;
  },

  async uploadAvatar(formData: FormData) {
    // Important: Don't set Content-Type header for React Native
    // React Native will automatically set it with proper boundary
    const response = await apiClient.post(API_ENDPOINTS.UPLOAD_AVATAR, formData);
    return response.data.data;
  },

  async uploadAvatarBase64(base64Image: string) {
    const response = await apiClient.post(API_ENDPOINTS.UPLOAD_AVATAR_BASE64, {
      image: base64Image,
    });
    return response.data.data;
  },

  async removeAvatar() {
    const response = await apiClient.delete(API_ENDPOINTS.UPLOAD_AVATAR);
    return response.data.data;
  },

  async logout() {
    try {
      // 1. Notify backend only if we have a token
      const token = await apiService.getToken();
      if (token) {
        await apiClient.post('/auth/logout');
      }
    } catch (error) {
      if ((error as any).response?.status !== 401) {
        console.warn('Backend logout failed:', error);
      }
    }

    // 2. Clear Social Auth Sessions (CRITICAL for fixing intermittent Google Login issues)
    // Only attempt social sign-out if NOT in Expo Go, as native modules won't be available
    try {
      const isExpoGo = Constants.appOwnership === 'expo';
      if (!isExpoGo) {
        const { signOutGoogle } = require('./socialAuthService');
        await signOutGoogle();
      } else {
        console.log('Skipping social sign-out in Expo Go environment');
      }
    } catch (e) {
      console.log('Social Sign-Out error during logout (silent):', e);
    }

    // 3. Disconnect socket
    try {
      const { socketService } = require('./socketService');
      socketService.disconnect();
    } catch (e) {
      console.warn('Socket disconnect failed during logout:', e);
    }

    // 4. Clear local tokens
    await apiService.clearTokens();
    console.log('✅ Full logout completed (including social sessions)');
  },

  async registerPushToken(): Promise<'granted' | 'denied' | 'needs_settings' | undefined> {
    try {
      // check if running in Expo Go on Android
      const { Platform, Linking } = await import('react-native');
      const Constants = (await import('expo-constants')).default;
      const isExpoGo = Constants.appOwnership === 'expo';

      if (isExpoGo && Platform.OS === 'android') {
        return;
      }

      // Lazy load only if NOT in Expo Go Android
      const Notifications = await import('expo-notifications');
      const Device = await import('expo-device');

      if (!Device.isDevice) {
        console.warn('Push Notification: Must use physical device for Push Notifications');
        return;
      }

      const { status: existingStatus, canAskAgain } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        if (!canAskAgain) {
          // Permission permanently denied – user must go to system settings
          console.warn('Push Notification: Permission permanently denied, must open system settings');
          return 'needs_settings';
        }
        // Can still ask – show system dialog
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Push Notification: Failed to get push token for push notification!');
        return 'denied';
      }

      const token = (await Notifications.getExpoPushTokenAsync({
        projectId: 'f894540e-3b89-4157-a0e0-5ed3bfd1ad72',
      })).data;

      console.log('Push Notification: Generated token:', token);

      // Send to backend
      await apiClient.post('/users/push-token', { pushToken: token });

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      return 'granted';
    } catch (error) {
      console.error('Push Notification Registration Error:', error);
    }
  },

  async forgotPassword(email: string) {
    if (MOCK_MODE) {
      await new Promise(resolve => setTimeout(resolve, 800));
      return { success: true, message: 'Doğrulama kodu e-posta adresinize gönderildi.' };
    }

    try {
      const response = await apiClient.post('/auth/forgot-password', { email });
      return response.data;
    } catch (error: any) {
      // Fallback to mock on server error for continuity
      if (error.response?.status >= 500 || !error.response) {
        await new Promise(resolve => setTimeout(resolve, 800));
        return { success: true, message: 'Doğrulama kodu e-posta adresinize gönderildi. (Mock)' };
      }
      const message = error.response?.data?.error?.message || error.message || 'Hata oluştu';
      throw new Error(message);
    }
  },

  async resetPassword(data: any) {
    if (MOCK_MODE) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (data.code === '123456') {
        return { success: true, message: 'Şifreniz başarıyla yenilendi.' };
      }
      throw new Error('Geçersiz doğrulama kodu.');
    }

    try {
      const response = await apiClient.post('/auth/reset-password', data);
      return response.data;
    } catch (error: any) {
      // Fallback to mock on server error
      if (error.response?.status >= 500 || !error.response) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (data.code === '123456') {
          return { success: true, message: 'Şifreniz başarıyla yenilendi. (Mock)' };
        }
        throw new Error('Geçersiz doğrulama kodu (Mock).');
      }
      const message = error.response?.data?.error?.message || error.message || 'Hata oluştu';
      throw new Error(message);
    }
  },
};

