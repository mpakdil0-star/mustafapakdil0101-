// API Configuration
import Constants from 'expo-constants';

const LOCAL_IP = '192.168.1.38'; // Bilgisayarınızın IP adresi

const getLocalhostAddress = () => {
  try {
    const debuggerHost = Constants.expoConfig?.hostUri?.split(':')[0];
    if (debuggerHost &&
      !debuggerHost.includes('localhost') &&
      !debuggerHost.includes('127.0.0.1')) {
      return debuggerHost;
    }
  } catch (error) {
    // Fallback kullanılacak
  }
  return LOCAL_IP;
};

export const API_BASE_URL = __DEV__
  ? `http://${getLocalhostAddress()}:3001/api/v1`
  : 'https://api.elektrikciler.com/api/v1';

export const API_ENDPOINTS = {
  // Auth
  REGISTER: '/auth/register',
  LOGIN: '/auth/login',
  REFRESH_TOKEN: '/auth/refresh-token',
  ME: '/auth/me',

  // Users
  USERS: '/users',
  UPLOAD_AVATAR: '/users/avatar',
  UPLOAD_AVATAR_BASE64: '/users/avatar-base64',
  USER_PROFILE: (id: string) => `/users/${id}/profile`,

  // Jobs
  JOBS: '/jobs',
  JOB_DETAIL: (id: string) => `/jobs/${id}`,
  MY_JOBS: '/jobs/my-jobs',
  JOB_CANCEL: (id: string) => `/jobs/${id}/cancel`,
  JOB_MARK_COMPLETE: (id: string) => `/jobs/${id}/mark-complete`,
  JOB_CONFIRM_COMPLETE: (id: string) => `/jobs/${id}/confirm-complete`,
  JOB_REVIEW: (id: string) => `/jobs/${id}/review`,

  // Bids
  BIDS: '/bids',
  JOB_BIDS: (jobId: string) => `/jobs/${jobId}/bids`,
  MY_BIDS: '/bids/my-bids',

  // Messages
  CONVERSATIONS: '/conversations',
  CONVERSATION_MESSAGES: (id: string) => `/conversations/${id}/messages`,
  MESSAGES: '/messages',

  // Reviews
  REVIEWS: '/reviews',
  ELECTRICIAN_REVIEWS: (id: string) => `/electricians/${id}/reviews`,

  // Notifications
  NOTIFICATIONS: '/notifications',
  UNREAD_COUNT: '/notifications/unread-count',
};

// Base URL without /api/v1 (for static files)
export const SERVER_URL = __DEV__
  ? `http://${getLocalhostAddress()}:3001`
  : 'https://api.elektrikciler.com';

export const getFileUrl = (path: string | undefined | null) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  if (path.startsWith('/')) return `${SERVER_URL}${path}`;
  return `${SERVER_URL}/${path}`;
};

