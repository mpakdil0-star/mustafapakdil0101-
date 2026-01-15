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
    if (!conversationId) return null;
    const response = await apiClient.get(
      `${API_ENDPOINTS.CONVERSATIONS || 'conversations'}/${conversationId}`
    );
    return response.data.data?.conversation;
  },

  async findConversation(recipientId: string, jobId?: string) {
    try {
      const response = await apiClient.get(`${API_ENDPOINTS.CONVERSATIONS || 'conversations'}/find`, {
        params: { recipientId, jobId }
      });
      return response.data.data?.conversation;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      throw error;
    }
  },

  async getMessages(conversationId: string) {
    if (!conversationId) return [];
    const response = await apiClient.get(
      `${API_ENDPOINTS.CONVERSATIONS || 'conversations'}/${conversationId}/messages`
    );
    return response.data.data?.messages || [];
  },

  async sendMessage(data: CreateMessageData) {
    // Mesaj gönderme endpointi güncellendi: /conversations/:id/messages
    // Ancak yeni konuşma başlatırken conversationId olmayabilir.
    // Bu durumda backend'e özel bir endpoint gerekebilir veya /conversations post edilip sonra mesaj atılır.
    // Şimdilik existing /messages endpointi varsa onu kullanalım, yoksa conversatin create edip atalım.

    // Backend'de POST /conversations/:id/messages var.
    // Eğer conversationId yoksa önce oluşturup sonra mesaj atmalıyız.

    // NOTE: Backend'de genel bir POST /messages endpointi olmayabilir.
    // createConversation -> sendMessage akışı daha doğru.

    // Geçici olarak create logic'i buraya ekleyelim:
    let convId = '';

    try {
      const existing = await messageService.findConversation(data.receiverId, data.jobId);
      if (existing) {
        convId = existing.id;
      } else {
        // Create new
        const createRes = await apiClient.post(API_ENDPOINTS.CONVERSATIONS || 'conversations', {
          recipientId: data.receiverId,
          jobPostId: data.jobId
        });
        convId = createRes.data.data.conversation.id;
      }

      const response = await apiClient.post(
        apiClient.defaults.baseURL + `conversations/${convId}/messages`,
        { content: data.content }
      );
      return response.data.data?.message;

    } catch (e) {
      console.error("Message send failed:", e);
      throw e;
    }
  },

  async markAsRead(conversationId: string) {
    const response = await apiClient.put(
      `${API_ENDPOINTS.CONVERSATIONS || '/conversations'}/${conversationId}/read`
    );
    return response.data.data;
  },
};

