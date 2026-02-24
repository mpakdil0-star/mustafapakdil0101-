// API Configuration - AUTOMATIC IP DETECTION
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// OTOMATIK IP TESPİTİ - Manuel ayar gerekmez!
const getLocalhostAddress = () => {
  try {
    const debuggerHost = Constants.expoConfig?.hostUri?.split(':')[0];
    const fallbackIP = '192.168.1.79'; // Sunucunun Gerçek Wi-Fi IP'si

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
    return '192.168.1.79';
  }
};

const LOCALHOST = getLocalhostAddress();
const PORT = '5000'; // Fixed: Backend runs on 5000, not 3001
const API_VERSION = 'v1';

// Production Backend URL (Render.com)
const TUNNEL_URL: string = 'https://elektrikciler-backend.onrender.com'; // Production URL

// Environment-based configuration
const getApiUrl = () => {
  // 1. Eğer TUNNEL_URL doluysa onu kullan (Remote test)
  if (TUNNEL_URL && TUNNEL_URL.length > 0) {
    const baseUrl = `${TUNNEL_URL}/api/${API_VERSION}/`;
    console.log('🔌 Backend URL (Ngrok Tunnel):', baseUrl);
    return baseUrl;
  }

  // 2. Yoksa Yerel IP'yi kullan (Local test - Fast & Stable)
  const baseUrl = `http://${LOCALHOST}:${PORT}/api/${API_VERSION}/`;
  console.log('🏠 Backend URL (Local IP):', baseUrl);
  return process.env.EXPO_PUBLIC_API_URL || baseUrl;
};

export const API_BASE_URL = getApiUrl();

// WebSocket URL (also via tunnel for remote access, fallback to local IP)
export const WS_BASE_URL = TUNNEL_URL && TUNNEL_URL.length > 0
  ? TUNNEL_URL
  : `http://${LOCALHOST}:${PORT}`;

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  LOGIN: 'auth/login',
  REGISTER: 'auth/register',
  LOGOUT: 'auth/logout',
  REFRESH_TOKEN: 'auth/refresh-token',
  VERIFY_EMAIL: 'auth/verify-email',

  // User
  ME: 'users/me',
  USER_PROFILE: 'users/profile',
  UPDATE_PROFILE: 'users/profile',
  CHANGE_PASSWORD: 'users/change-password',
  UPLOAD_AVATAR: 'users/avatar',
  UPLOAD_AVATAR_BASE64: 'users/avatar/base64',

  // Jobs
  JOBS: 'jobs',
  JOB_DETAIL: (id: string) => `jobs/${encodeURIComponent(id)}`,
  COMPLETE_JOB: (id: string) => `jobs/${encodeURIComponent(id)}/complete`,
  REVIEW_JOB: (id: string) => `jobs/${encodeURIComponent(id)}/review`,
  CANCEL_JOB: (id: string) => `jobs/${encodeURIComponent(id)}/cancel`,
  CREATE_JOB: 'jobs',
  MY_JOBS: 'jobs/my-jobs',

  // Bids
  BIDS: 'bids',
  BID_DETAIL: (id: string) => `bids/${encodeURIComponent(id)}`,
  CREATE_BID: 'bids',
  MY_BIDS: 'bids/my-bids',
  JOB_BIDS: (jobId: string) => `bids/job/${encodeURIComponent(jobId)}`,
  ACCEPT_BID: (bidId: string) => `bids/${encodeURIComponent(bidId)}/accept`,
  REJECT_BID: (bidId: string) => `bids/${encodeURIComponent(bidId)}/reject`,
  WITHDRAW_BID: (bidId: string) => `bids/${encodeURIComponent(bidId)}/withdraw`,

  // Messages
  CONVERSATIONS: 'conversations',
  CONVERSATION_DETAIL: (id: string) => `conversations/${encodeURIComponent(id)}`,
  MESSAGES: (conversationId: string) => `conversations/${encodeURIComponent(conversationId)}/messages`,
  SEND_MESSAGE: (conversationId: string) => `conversations/${encodeURIComponent(conversationId)}/messages`,
  MARK_CONVERSATION_READ: (id: string) => `conversations/${encodeURIComponent(id)}/read`,

  // Notifications
  NOTIFICATIONS: 'notifications',
  NOTIFICATION_DETAIL: (id: string) => `notifications/${encodeURIComponent(id)}`,
  NOTIFICATION_READ: (id: string) => `notifications/${encodeURIComponent(id)}/read`,
  NOTIFICATIONS_UNREAD_COUNT: 'notifications/unread-count',
  NOTIFICATIONS_READ_ALL: 'notifications/read-all',
  NOTIFICATIONS_RELATED_READ: 'notifications/related-read',

  // Locations
  LOCATIONS: 'locations',

  // Favorites
  FAVORITES: 'favorites',
  ADD_FAVORITE: (electricianId: string) => `favorites/${encodeURIComponent(electricianId)}`,
  REMOVE_FAVORITE: (electricianId: string) => `favorites/${encodeURIComponent(electricianId)}`,
  CHECK_FAVORITE: (electricianId: string) => `favorites/${encodeURIComponent(electricianId)}/check`,

  // Reviews
  REVIEWS: 'reviews',
  ELECTRICIAN_REVIEWS: (electricianId: string) => `reviews/electrician/${encodeURIComponent(electricianId)}`,
  SUBMIT_REVIEW: 'reviews',

  // Payments & Credits
  CREDIT_PACKAGES: 'payments/packages',
  PURCHASE_CREDITS: 'payments/purchase',
  TRANSACTION_HISTORY: 'payments/transactions',
};

// Helper function to get full file URL
// Uploads are served from root (http://server:3001/uploads), not from /api/v1
export const getFileUrl = (filePath: string | null | undefined): string | null => {
  if (!filePath) return null;

  // If it's a base64 data URL, return as-is
  if (filePath.startsWith('data:image')) {
    return filePath;
  }

  // If it's already a full URL, return as-is
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }

  // For file paths, use the TUNNEL URL for remote access
  if (TUNNEL_URL && TUNNEL_URL.length > 0) {
    return `${TUNNEL_URL}${filePath}`;
  }

  // Or fallback to Local IP
  return `http://${LOCALHOST}:${PORT}${filePath}`;
};

// Log configuration on app start
console.log('📱 API Configuration:');
console.log('   Base URL:', API_BASE_URL);
console.log('   WebSocket:', WS_BASE_URL);
console.log('   Platform:', Platform.OS);
console.log('   Dev Mode:', __DEV__);
