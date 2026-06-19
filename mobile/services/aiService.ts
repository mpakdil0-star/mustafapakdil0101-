import apiClient from './api';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface ImageAttachment {
  base64: string;
  mimeType: string;
}

export const aiService = {
  /**
   * Sends a message to the AI assistant backend.
   * @param message The user's new message.
   * @param history Chat history formatted for the model.
   * @param image Optional image attachment with base64 and mimeType.
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
};
