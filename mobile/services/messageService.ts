import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { assertSupabaseConfigured, supabase } from './supabase';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  recipientId: string;
  content: string;
  read: boolean;
  isRead: boolean;
  messageType: 'TEXT' | 'IMAGE' | 'FILE' | 'LOCATION' | 'SYSTEM';
  mediaUrl?: string | null;
  fileName?: string | null;
  createdAt: string;
  sender?: UserCard;
  receiver?: UserCard;
}

interface UserCard {
  id: string;
  fullName: string;
  profileImageUrl: string | null;
  userType?: string;
}

export interface Conversation {
  id: string;
  participant1Id?: string;
  participant2Id?: string;
  jobPostId?: string | null;
  lastMessage?: Message;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
  participant1?: UserCard;
  participant2?: UserCard;
  otherUser?: UserCard;
}

export interface CreateMessageData {
  receiverId: string;
  content: string;
  jobId?: string;
  bidId?: string;
}

const mapCard = (row: any): UserCard => ({
  id: row.id,
  fullName: row.full_name,
  profileImageUrl: row.profile_image_url ?? null,
  userType: row.user_type,
});

const mapMessage = (row: any, cards?: Map<string, UserCard>): Message => ({
  id: row.id,
  conversationId: row.conversation_id,
  senderId: row.sender_id,
  receiverId: row.recipient_id,
  recipientId: row.recipient_id,
  content: row.content,
  read: Boolean(row.is_read),
  isRead: Boolean(row.is_read),
  messageType: row.message_type || 'TEXT',
  mediaUrl: row.media_url,
  fileName: row.file_name,
  createdAt: row.created_at,
  sender: cards?.get(row.sender_id),
  receiver: cards?.get(row.recipient_id),
});

const getCards = async (ids: string[]) => {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return new Map<string, UserCard>();
  const { data, error } = await supabase.from('user_cards').select('*').in('id', unique);
  if (error) throw error;
  return new Map((data || []).map((row: any) => [row.id, mapCard(row)]));
};

const currentUserId = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw error || new Error('Oturum bulunamadı.');
  return data.user.id;
};

const mapConversations = async (rows: any[], userId: string) => {
  const cards = await getCards(rows.flatMap((row) => [row.participant_1_id, row.participant_2_id]));
  return rows.map((row): Conversation => {
    const otherId = row.participant_1_id === userId ? row.participant_2_id : row.participant_1_id;
    const unreadCount = row.participant_1_id === userId
      ? row.unread_count_participant_1
      : row.unread_count_participant_2;
    return {
      id: row.id,
      participant1Id: row.participant_1_id,
      participant2Id: row.participant_2_id,
      jobPostId: row.job_post_id,
      unreadCount: unreadCount || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      participant1: cards.get(row.participant_1_id),
      participant2: cards.get(row.participant_2_id),
      otherUser: cards.get(otherId),
      lastMessage: row.last_message_at ? ({
        id: `preview-${row.id}`,
        conversationId: row.id,
        senderId: '', receiverId: '', recipientId: '',
        content: row.last_message_preview || '',
        read: unreadCount === 0, isRead: unreadCount === 0,
        messageType: 'TEXT', createdAt: row.last_message_at,
      }) : undefined,
    };
  });
};

const uploadAttachment = async (conversationId: string, uri: string) => {
  const response = await fetch(uri);
  if (!response.ok) throw new Error('Mesaj eki okunamadı.');
  const mime = response.headers.get('content-type') || 'application/octet-stream';
  const rawExtension = uri.split('?')[0].split('.').pop()?.toLowerCase();
  const extension = rawExtension && rawExtension.length <= 5 ? rawExtension : mime.includes('pdf') ? 'pdf' : 'jpg';
  const path = `${conversationId}/${Date.now()}.${extension}`;
  const { error } = await supabase.storage.from('message-attachments').upload(
    path, await response.arrayBuffer(), { contentType: mime, upsert: false }
  );
  if (error) throw error;
  return { path, mime };
};

export const messageService = {
  async getConversations() {
    assertSupabaseConfigured();
    const userId = await currentUserId();
    const { data, error } = await supabase.from('conversations').select('*')
      .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`)
      .order('last_message_at', { ascending: false, nullsFirst: false });
    if (error) throw error;
    return mapConversations(data || [], userId);
  },

  async getConversation(conversationId: string) {
    if (!conversationId) return null;
    const userId = await currentUserId();
    const { data, error } = await supabase.from('conversations').select('*').eq('id', conversationId).single();
    if (error) throw error;
    return (await mapConversations([data], userId))[0];
  },

  async findConversation(recipientId: string, jobId?: string) {
    const userId = await currentUserId();
    const { data, error } = await supabase.from('conversations').select('*')
      .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`);
    if (error) throw error;
    const row = (data || []).find((item: any) =>
      [item.participant_1_id, item.participant_2_id].includes(recipientId)
      && (item.job_post_id || null) === (jobId || null)
    );
    return row ? (await mapConversations([row], userId))[0] : null;
  },

  async findOrCreateConversation(recipientId: string, jobId?: string): Promise<Conversation> {
    const { data, error } = await supabase.rpc('find_or_create_conversation', {
      recipient_id: recipientId,
      job_id: jobId || null,
    });
    if (error) throw error;
    const userId = await currentUserId();
    return (await mapConversations([data], userId))[0];
  },

  async getMessages(conversationId: string) {
    if (!conversationId) return [];
    const { data, error } = await supabase.from('messages').select('*')
      .eq('conversation_id', conversationId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });
    if (error) throw error;
    const cards = await getCards((data || []).flatMap((row: any) => [row.sender_id, row.recipient_id]));
    return (data || []).map((row: any) => mapMessage(row, cards));
  },

  async sendMessage(data: CreateMessageData) {
    const conversation = await this.findOrCreateConversation(data.receiverId, data.jobId);
    return this.sendMessageToConversation(conversation.id, data.content);
  },

  async sendMessageToConversation(conversationId: string, content: string, attachmentUri?: string) {
    let attachment: { path: string; mime: string } | null = null;
    if (attachmentUri) attachment = await uploadAttachment(conversationId, attachmentUri);
    const messageType = attachment ? (attachment.mime === 'application/pdf' ? 'FILE' : 'IMAGE') : 'TEXT';
    const { data, error } = await supabase.rpc('send_message', {
      conversation_id: conversationId,
      message_content: content,
      message_type: messageType,
      media_url: attachment?.path || null,
      file_name: attachment?.path.split('/').pop() || null,
      file_size: null,
    });
    if (error) {
      if (attachment) await supabase.storage.from('message-attachments').remove([attachment.path]);
      throw error;
    }
    const cards = await getCards([data.sender_id, data.recipient_id]);
    return mapMessage(data, cards);
  },

  async markAsRead(conversationId: string) {
    const { error } = await supabase.rpc('mark_conversation_read', { conversation_id: conversationId });
    if (error) throw error;
    return { success: true };
  },

  subscribeToConversation(conversationId: string, onChange: (message: Message, event: string) => void) {
    const channel = supabase.channel(`conversation:${conversationId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}`,
      }, async (payload: RealtimePostgresChangesPayload<any>) => {
        const row = payload.new && Object.keys(payload.new).length ? payload.new : payload.old;
        if (!row) return;
        const cards = await getCards([row.sender_id, row.recipient_id]);
        onChange(mapMessage(row, cards), payload.eventType);
      }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  },

  subscribeToConversationList(userId: string, onChange: () => void) {
    const channel = supabase.channel(`conversation-list:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, onChange)
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  },
};
