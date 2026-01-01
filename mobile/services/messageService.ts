import apiClient from './api';
import { API_ENDPOINTS } from '../constants/api';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  read: boolean;
  createdAt: string;
  sender?: {
    id: string;
    fullName: string;
    profileImageUrl?: string | null;
  };
  receiver?: {
    id: string;
    fullName: string;
    profileImageUrl?: string | null;
  };
}

export interface Conversation {
  id: string;
  participant1Id?: string;
  participant2Id?: string;
  lastMessage?: Message;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
  participant1?: {
    id: string;
    fullName: string;
    profileImageUrl?: string | null;
  };
  participant2?: {
    id: string;
    fullName: string;
    profileImageUrl?: string | null;
  };
  otherUser?: {
    id: string;
    fullName: string;
    profileImageUrl?: string | null;
  };
}

export interface CreateMessageData {
  receiverId: string;
  content: string;
  jobId?: string;
  bidId?: string;
}

export const messageService = {
  async getConversations() {
    try {
      const response = await apiClient.get(API_ENDPOINTS.CONVERSATIONS || '/conversations');
      return response.data.data?.conversations || [];
    } catch (error: any) {
      // Backend endpoint henüz hazır değilse boş liste döndür
      if (error?.response?.status === 404) {
        return [];
      }
      throw error;
    }
  },

  async getConversation(conversationId: string) {
    const response = await apiClient.get(
      `${API_ENDPOINTS.CONVERSATIONS || '/conversations'}/${conversationId}`
    );
    return response.data.data?.conversation;
  },

  async getMessages(conversationId: string) {
    const response = await apiClient.get(
      `${API_ENDPOINTS.CONVERSATIONS || '/conversations'}/${conversationId}/messages`
    );
    return response.data.data?.messages || [];
  },

  async sendMessage(data: CreateMessageData) {
    const response = await apiClient.post('/messages', data);
    return response.data.data?.message;
  },

  async markAsRead(conversationId: string) {
    const response = await apiClient.put(
      `${API_ENDPOINTS.CONVERSATIONS || '/conversations'}/${conversationId}/read`
    );
    return response.data.data;
  },
};

