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
      const response = await apiClient.get(API_ENDPOINTS.NOTIFICATIONS);
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
      API_ENDPOINTS.NOTIFICATION_READ(notificationId)
    );
    return response.data.data;
  },

  async getUnreadCount() {
    const response = await apiClient.get(
      API_ENDPOINTS.NOTIFICATIONS_UNREAD_COUNT
    );
    return response.data.data.count;
  },

  async markAllAsRead() {
    const response = await apiClient.put(
      API_ENDPOINTS.NOTIFICATIONS_READ_ALL
    );
    return response.data.data;
  },

  async markRelatedAsRead(type: string, relatedId: string) {
    const response = await apiClient.put(
      API_ENDPOINTS.NOTIFICATIONS_RELATED_READ,
      { type, relatedId }
    );
    return response.data.data;
  },

  async deleteNotification(notificationId: string) {
    const response = await apiClient.delete(
      API_ENDPOINTS.NOTIFICATION_DETAIL(notificationId)
    );
    return response.data.data;
  },
};

