// API Configuration - AUTOMATIC IP DETECTION
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// OTOMATIK IP TESPİTİ - Manuel ayar gerekmez!
const getLocalhostAddress = () => {
  try {
    const debuggerHost = Constants.expoConfig?.hostUri?.split(':')[0];
    const fallbackIP = '192.168.1.58'; // Sunucunun Gerçek Wi-Fi IP'si

    if (debuggerHost &&
      !debuggerHost.includes('localhost') &&
      !debuggerHost.includes('127.0.0.1')) {
      return debuggerHost;
    }

    // Emulator Fallbacks (Only in Dev mode)
    if (__DEV__) {
      if (Platform.OS === 'android') return '10.0.2.2';
      if (Platform.OS === 'ios') return 'localhost';
    }

    // Physical Device or Production Build
    return fallbackIP;
  } catch (error) {
    return '192.168.1.58';
  }
};

const LOCALHOST = getLocalhostAddress();
const PORT = '3002';
const API_VERSION = 'v1';

// Tünel Adresi (Nihai)
const TUNNEL_URL = 'https://leptospiral-palaeontologically-hilton.ngrok-free.dev';

// Environment-based configuration
const getApiUrl = () => {
  const baseUrl = `${TUNNEL_URL}/api/${API_VERSION}`;
  console.log('🔌 Backend URL (Tunnel):', baseUrl);
  return process.env.EXPO_PUBLIC_API_URL || baseUrl;
};

export const API_BASE_URL = getApiUrl();

// WebSocket URL
export const WS_BASE_URL = TUNNEL_URL;

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  LOGOUT: '/auth/logout',
  REFRESH_TOKEN: '/auth/refresh-token',
  VERIFY_EMAIL: '/auth/verify-email',

  // User
  ME: '/users/me',
  USER_PROFILE: '/users/profile',
  UPDATE_PROFILE: '/users/profile',
  CHANGE_PASSWORD: '/users/change-password',
  UPLOAD_AVATAR: '/users/avatar',
  UPLOAD_AVATAR_BASE64: '/users/avatar/base64',

  // Jobs
  JOBS: '/jobs',
  JOB_DETAIL: (id: string) => `/jobs/${id}`,
  CREATE_JOB: '/jobs',
  MY_JOBS: '/jobs/my-jobs',

  // Bids
  BIDS: '/bids',
  BID_DETAIL: (id: string) => `/bids/${id}`,
  CREATE_BID: '/bids',
  MY_BIDS: '/bids/my-bids',
  JOB_BIDS: (jobId: string) => `/bids/job/${jobId}`,
  ACCEPT_BID: (bidId: string) => `/bids/${bidId}/accept`,
  REJECT_BID: (bidId: string) => `/bids/${bidId}/reject`,
  WITHDRAW_BID: (bidId: string) => `/bids/${bidId}/withdraw`,

  // Messages
  CONVERSATIONS: '/conversations',
  MESSAGES: (conversationId: string) => `/conversations/${conversationId}/messages`,
  SEND_MESSAGE: (conversationId: string) => `/conversations/${conversationId}/messages`,

  // Notifications
  NOTIFICATIONS: '/notifications',

  // Locations
  LOCATIONS: '/locations',
};

// Helper function to get full file URL
// Uploads are served from root (http://server:3001/uploads), not from /api/v1
export const getFileUrl = (filePath: string | null | undefined): string | null => {
  if (!filePath) return null;
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath; // Already a full URL
  }
  // Use tunnel URL for files too
  return `${TUNNEL_URL}${filePath}`;
};

// Log configuration on app start
console.log('📱 API Configuration:');
console.log('   Base URL:', API_BASE_URL);
console.log('   WebSocket:', WS_BASE_URL);
console.log('   Platform:', Platform.OS);
console.log('   Dev Mode:', __DEV__);
