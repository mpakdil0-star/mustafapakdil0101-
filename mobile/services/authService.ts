import apiClient from './api';
import { API_ENDPOINTS } from '../constants/api';
import { apiService } from './api';

export interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  userType: 'CITIZEN' | 'ELECTRICIAN';
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
      const message = error.response?.data?.error?.message || error.message || 'Kayıt işlemi başarısız oldu';
      throw new Error(message);
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

      const message = error.response?.data?.error?.message || error.message || 'Giriş işlemi başarısız oldu';
      throw new Error(message);
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
    await apiService.clearTokens();
  },

  async registerPushToken() {
    try {
      // check if running in Expo Go on Android
      const { Platform } = await import('react-native');
      const Constants = (await import('expo-constants')).default;
      const isExpoGo = Constants.appOwnership === 'expo';

      if (isExpoGo && Platform.OS === 'android') {
        console.warn('Push Notification: Remote notifications are not supported in Expo Go on Android. Use a development build to test push notifications.');
        return;
      }

      // Lazy load only if NOT in Expo Go Android
      const Notifications = await import('expo-notifications');
      const Device = await import('expo-device');

      if (!Device.isDevice) {
        console.warn('Push Notification: Must use physical device for Push Notifications');
        return;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { Alert } = await import('react-native');
        await new Promise((resolve) => {
          Alert.alert(
            'Bildirim İzni',
            'Yeni iş ilanlarından ve mesajlardan anında haberdar olmak için bildirimlere izin vermeniz önerilir.',
            [
              { text: 'Şimdi Değil', style: 'cancel', onPress: () => resolve(null) },
              { text: 'Devam Et', onPress: () => resolve(null) }
            ]
          );
        });
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Push Notification: Failed to get push token for push notification!');
        return;
      }

      const token = (await Notifications.getExpoPushTokenAsync()).data;

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

      return token;
    } catch (error) {
      console.error('Push Notification Registration Error:', error);
    }
  },
};

