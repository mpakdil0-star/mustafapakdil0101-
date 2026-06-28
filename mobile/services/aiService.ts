import apiClient from './api';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface ImageAttachment {
  base64: string;
  mimeType: string;
}

export interface CostEstimate {
  found: boolean;
  category?: string;
  min?: number;
  max?: number;
  unit?: string;
  note?: string;
  label?: string;
  message?: string;
}

export const aiService = {
  /**
   * Sends a message to the AI assistant backend.
   */
  async sendMessage(
    message: string,
    history: ChatMessage[] = [],
    image?: ImageAttachment
  ): Promise<{ text: string; fallback: boolean }> {
    const response = await apiClient.post('/ai/chat', {
      message,
      history,
      image,
    });
    return response.data.data;
  },

  /**
   * Returns a price range estimate for the given service category.
   */
  async getCostEstimate(category: string): Promise<CostEstimate> {
    try {
      const response = await apiClient.get(`/ai/cost-estimate?category=${encodeURIComponent(category)}`);
      return response.data.data;
    } catch {
      return { found: false };
    }
  },
};
