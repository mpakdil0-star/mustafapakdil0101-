import apiClient from './api';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export const aiService = {
  /**
   * Sends a message to the AI assistant backend.
   * @param message The user's new message.
   * @param history Chat history formatted for the model.
   */
  async sendMessage(message: string, history: ChatMessage[] = []): Promise<{ text: string; fallback: boolean }> {
    const response = await apiClient.post('/ai/chat', {
      message,
      history,
    });
    return response.data.data;
  },
};
