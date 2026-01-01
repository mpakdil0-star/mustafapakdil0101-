import apiClient from './api';
import { API_ENDPOINTS } from '../constants/api';

export interface Notification {
  id: string;
  userId: string;
  type: 'BID_RECEIVED' | 'BID_ACCEPTED' | 'BID_REJECTED' | 'MESSAGE_RECEIVED' | 'JOB_UPDATED' | 'new_job_available' | 'new_message';
  title: string;
  message: string;
  isRead: boolean;
  relatedId?: string; // jobId, bidId, messageId, etc.
  createdAt: string;
}

export const notificationService = {
  async getNotifications() {
    try {
      const response = await apiClient.get(API_ENDPOINTS.NOTIFICATIONS || '/notifications');
      return response.data.data?.notifications || [];
    } catch (error: any) {
      // Backend endpoint henüz hazır değilse boş liste döndür
      if (error?.response?.status === 404) {
        return [];
      }
      throw error;
    }
  },

  async markAsRead(notificationId: string) {
    const response = await apiClient.put(
      `${API_ENDPOINTS.NOTIFICATIONS || '/notifications'}/${notificationId}/read`
    );
    return response.data.data;
  },

  async markAllAsRead() {
    const response = await apiClient.put(
      `${API_ENDPOINTS.NOTIFICATIONS || '/notifications'}/read-all`
    );
    return response.data.data;
  },

  async deleteNotification(notificationId: string) {
    const response = await apiClient.delete(
      `${API_ENDPOINTS.NOTIFICATIONS || '/notifications'}/${notificationId}`
    );
    return response.data.data;
  },
};

