import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { assertSupabaseConfigured, supabase } from './supabase';

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  relatedId?: string;
  relatedType?: string;
  actionUrl?: string;
  createdAt: string;
}

const mapNotification = (row: any): Notification => ({
  id: row.id,
  userId: row.user_id,
  type: row.type,
  title: row.title,
  message: row.message,
  isRead: Boolean(row.is_read),
  relatedId: row.related_id || undefined,
  relatedType: row.related_type || undefined,
  actionUrl: row.action_url || undefined,
  createdAt: row.created_at,
});

const getUserId = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw error || new Error('Oturum bulunamadı.');
  return data.user.id;
};

export const notificationService = {
  async getNotifications() {
    assertSupabaseConfigured();
    const userId = await getUserId();
    const now = new Date().toISOString();
    const { data, error } = await supabase.from('notifications').select('*')
      .eq('user_id', userId)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return (data || []).map(mapNotification);
  },

  async markAsRead(notificationId: string) {
    const { data, error } = await supabase.from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId).select('*').single();
    if (error) throw error;
    return mapNotification(data);
  },

  async getUnreadCount() {
    const userId = await getUserId();
    const now = new Date().toISOString();
    const { count, error } = await supabase.from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('is_read', false)
      .or(`expires_at.is.null,expires_at.gt.${now}`);
    if (error) throw error;
    return count || 0;
  },

  async markAllAsRead() {
    const userId = await getUserId();
    const { error } = await supabase.from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId).eq('is_read', false);
    if (error) throw error;
    return { success: true };
  },

  async markRelatedAsRead(type: string, relatedId: string) {
    const userId = await getUserId();
    const { error } = await supabase.from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId).eq('type', type).eq('related_id', relatedId).eq('is_read', false);
    if (error) throw error;
    return { success: true };
  },

  async deleteNotification(notificationId: string) {
    const { error } = await supabase.from('notifications').delete().eq('id', notificationId);
    if (error) throw error;
    return { success: true };
  },

  subscribe(userId: string, onChange: (notification: Notification, event: string) => void) {
    const channel = supabase.channel(`notifications:${userId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}`,
      }, (payload: RealtimePostgresChangesPayload<any>) => {
        const row = payload.new && Object.keys(payload.new).length ? payload.new : payload.old;
        if (row) onChange(mapNotification(row), payload.eventType);
      }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  },
};
