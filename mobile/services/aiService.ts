import { supabase } from './supabase';

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
   * Sends a message to the AI assistant Edge Function.
   */
  async sendMessage(
    message: string,
    history: ChatMessage[] = [],
    image?: ImageAttachment
  ): Promise<{ text: string; fallback: boolean }> {
    const { data, error } = await supabase.functions.invoke('ai-assistant', { body: { action: 'chat', message, history, image } });
    if (error) throw error;
    return data.data;
  },

  /**
   * Returns a price range estimate for the given service category.
   */
  async getCostEstimate(category: string): Promise<CostEstimate> {
    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', { body: { action: 'cost', category } });
      if (error) throw error;
      return data.data;
    } catch {
      return { found: false };
    }
  },
};
