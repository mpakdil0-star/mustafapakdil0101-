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
};

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

  const actionUrl = safeInternalActionUrl(data.actionUrl ?? data.action_url);
  if (actionUrl) return actionUrl;

  const type = typeof data.type === 'string' ? data.type.trim().toLowerCase() : '';
  const relatedType = typeof (data.relatedType ?? data.related_type) === 'string'
    ? String(data.relatedType ?? data.related_type).trim().toUpperCase()
    : '';
  const relatedId = segment(data.relatedId ?? data.related_id);

  if (type === 'calendar_reminder') return '/tools/calendar';
  if (type === 'ledger_reminder') return '/tools/ledger';

  const conversationId = segment(data.conversationId)
    ?? (relatedType === 'CONVERSATION' ? relatedId : null);
  if (conversationId) return `/messages/${conversationId}`;

  if (
    segment(data.ticketId)
    || type === 'support_ticket_updated'
    || type === 'support_reply'
    || type === 'support_status'
  ) return '/profile/support';

  const jobId = segment(data.jobId) ?? (relatedType === 'JOB' ? relatedId : null);
  if (jobId) return `/jobs/${jobId}`;

  const userId = segment(data.userId) ?? (relatedType === 'USER' ? relatedId : null);
  if (userId && type === 'new_user_registered') return `/admin/users?userId=${userId}`;

  if (type === 'new_review') return '/profile';
  return null;
};
