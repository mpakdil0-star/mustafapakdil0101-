export type NotificationNavigationData = Record<string, unknown> & {
  type?: unknown;
  actionUrl?: unknown;
  action_url?: unknown;
  relatedId?: unknown;
  related_id?: unknown;
  relatedType?: unknown;
  related_type?: unknown;
  jobId?: unknown;
  conversationId?: unknown;
  ticketId?: unknown;
  userId?: unknown;
  job_id?: unknown;
  conversation_id?: unknown;
  ticket_id?: unknown;
  user_id?: unknown;
  data?: unknown;
  payload?: unknown;
};

const objectValue = (value: unknown): NotificationNavigationData | null => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as NotificationNavigationData;
  }
  if (typeof value !== 'string') return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as NotificationNavigationData
      : null;
  } catch {
    return null;
  }
};

const flattenNotificationData = (data: NotificationNavigationData): NotificationNavigationData => ({
  ...(objectValue(data.payload) || {}),
  ...(objectValue(data.data) || {}),
  ...data,
});

const segment = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized ? encodeURIComponent(normalized) : null;
};

const safeInternalActionUrl = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const path = value.trim();
  if (!path.startsWith('/') || path.startsWith('//')) return null;

  const allowed = [
    /^\/jobs\/[^/?#]+(?:[/?#].*)?$/,
    /^\/messages\/[^/?#]+(?:[/?#].*)?$/,
    /^\/admin\/users(?:[/?#].*)?$/,
    /^\/profile(?:[/?#].*)?$/,
    /^\/tools\/calendar(?:[/?#].*)?$/,
    /^\/tools\/ledger(?:[/?#].*)?$/,
    /^\/\(tabs\)\/(?:profile|jobs|messages)(?:[/?#].*)?$/,
  ];
  return allowed.some((pattern) => pattern.test(path)) ? path : null;
};

export const getNotificationTargetPath = (
  data: NotificationNavigationData | null | undefined,
): string | null => {
  if (!data) return null;

  const normalizedData = flattenNotificationData(data);

  const actionUrl = safeInternalActionUrl(normalizedData.actionUrl ?? normalizedData.action_url);
  if (actionUrl) return actionUrl;

  const type = typeof normalizedData.type === 'string' ? normalizedData.type.trim().toLowerCase() : '';
  const relatedType = typeof (normalizedData.relatedType ?? normalizedData.related_type) === 'string'
    ? String(normalizedData.relatedType ?? normalizedData.related_type).trim().toUpperCase()
    : '';
  const relatedId = segment(normalizedData.relatedId ?? normalizedData.related_id);

  if (type === 'calendar_reminder') return '/tools/calendar';
  if (type === 'ledger_reminder') return '/tools/ledger';

  const conversationId = segment(normalizedData.conversationId ?? normalizedData.conversation_id)
    ?? (relatedType === 'CONVERSATION' ? relatedId : null);
  if (conversationId) return `/messages/${conversationId}`;

  if (relatedId && /(^|_)(message|conversation|chat)(_|$)/.test(type)) {
    return `/messages/${relatedId}`;
  }

  if (
    segment(normalizedData.ticketId ?? normalizedData.ticket_id)
    || type === 'support_ticket_updated'
    || type === 'support_reply'
    || type === 'support_status'
  ) return '/profile/support';

  const jobId = segment(normalizedData.jobId ?? normalizedData.job_id)
    ?? (relatedType === 'JOB' ? relatedId : null);
  if (jobId) return `/jobs/${jobId}`;

  if (relatedId && /(^|_)(job|bid|quote|work|proposal)(_|$)/.test(type)) {
    return `/jobs/${relatedId}`;
  }

  const userId = segment(normalizedData.userId ?? normalizedData.user_id)
    ?? (relatedType === 'USER' ? relatedId : null);
  if (userId && type === 'new_user_registered') return `/admin/users?userId=${userId}`;

  if (type === 'new_review') return '/profile';
  return null;
};
