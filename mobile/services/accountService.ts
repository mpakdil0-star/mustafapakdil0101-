import { supabase } from './supabase';

const requireUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw error ?? new Error('Oturum bulunamadı');
  return user;
};

export const supportService = {
  async list() {
    const { data, error } = await supabase.from('support_tickets').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(t => ({ ...t, ticketType: t.ticket_type, createdAt: t.created_at }));
  },
  async create(input: { subject: string; description: string; ticketType: string; priority: string }) {
    const user = await requireUser();
    const { data, error } = await supabase.from('support_tickets').insert({ user_id: user.id, subject: input.subject, description: input.description, ticket_type: input.ticketType, priority: input.priority }).select().single();
    if (error) throw error;
    return data;
  },
  async get(id: string) {
    const { data: ticket, error } = await supabase.from('support_tickets').select('*').eq('id', id).single();
    if (error) throw error;
    const { data: messages, error: messageError } = await supabase.from('support_ticket_messages').select('*').eq('ticket_id', id).order('created_at');
    if (messageError) throw messageError;
    return { ...ticket, ticketType: ticket.ticket_type, createdAt: ticket.created_at, messages: (messages ?? []).map(m => ({ ...m, createdAt: m.created_at, isAdmin: m.is_admin })) };
  },
  async sendMessage(ticketId: string, text: string) {
    const user = await requireUser();
    const { error } = await supabase.from('support_ticket_messages').insert({ ticket_id: ticketId, sender_id: user.id, text: text.trim(), is_admin: false });
    if (error) throw error;
  },
};

export const safetyService = {
  async listBlocked() {
    const { data: blocks, error } = await supabase.from('blocks').select('blocked_id').order('created_at', { ascending: false });
    if (error) throw error;
    const ids = (blocks ?? []).map(b => b.blocked_id);
    if (!ids.length) return [];
    const { data, error: usersError } = await supabase.from('user_cards').select('*').in('id', ids);
    if (usersError) throw usersError;
    return (data ?? []).map(item => ({
      id: item.id,
      fullName: item.full_name,
      profileImageUrl: item.profile_image_url,
      userType: item.user_type,
    }));
  },
  async toggleBlock(blockedId: string) {
    const user = await requireUser();
    const { data: existing, error } = await supabase.from('blocks').select('id').eq('blocker_id', user.id).eq('blocked_id', blockedId).maybeSingle();
    if (error) throw error;
    if (existing) {
      const { error: deleteError } = await supabase.from('blocks').delete().eq('id', existing.id);
      if (deleteError) throw deleteError;
      return false;
    }
    const { error: insertError } = await supabase.from('blocks').insert({ blocker_id: user.id, blocked_id: blockedId });
    if (insertError) throw insertError;
    return true;
  },
  async report(input: { reportedId: string; jobId?: string | null; reason: string; description: string }) {
    const user = await requireUser();
    const { error } = await supabase.from('reports').insert({ reporter_id: user.id, reported_id: input.reportedId, job_id: input.jobId || null, reason: input.reason, description: input.description });
    if (error) throw error;
  },
};

export const preferenceService = {
  async get<T>() {
    const user = await requireUser();
    const { data, error } = await supabase.from('users').select('notification_settings').eq('id', user.id).single();
    if (error) throw error;
    const settings = (data.notification_settings ?? {}) as Record<string, unknown>;
    const pushEnabled = typeof settings.pushEnabled === 'boolean'
      ? settings.pushEnabled
      : typeof settings.push === 'boolean' ? settings.push : true;
    const emailEnabled = typeof settings.emailEnabled === 'boolean'
      ? settings.emailEnabled
      : typeof settings.email === 'boolean' ? settings.email : true;
    return {
      ...settings,
      push: pushEnabled,
      pushEnabled,
      email: emailEnabled,
      emailEnabled,
      promoEnabled: typeof settings.promoEnabled === 'boolean' ? settings.promoEnabled : false,
      securityEnabled: typeof settings.securityEnabled === 'boolean' ? settings.securityEnabled : true,
    } as T;
  },
  async update(value: object) {
    const user = await requireUser();
    const settings = value as Record<string, unknown>;
    const pushEnabled = typeof settings.pushEnabled === 'boolean'
      ? settings.pushEnabled
      : typeof settings.push === 'boolean' ? settings.push : true;
    const emailEnabled = typeof settings.emailEnabled === 'boolean'
      ? settings.emailEnabled
      : typeof settings.email === 'boolean' ? settings.email : true;
    const normalized = {
      ...settings,
      push: pushEnabled,
      pushEnabled,
      email: emailEnabled,
      emailEnabled,
      promoEnabled: typeof settings.promoEnabled === 'boolean' ? settings.promoEnabled : false,
      securityEnabled: typeof settings.securityEnabled === 'boolean' ? settings.securityEnabled : true,
    };
    const { error } = await supabase.from('users').update({ notification_settings: normalized }).eq('id', user.id);
    if (error) throw error;
  },
  async clearPushTokens() {
    const user = await requireUser();
    const { error } = await supabase.from('push_tokens').delete().eq('user_id', user.id);
    if (error) throw error;
  },
};
