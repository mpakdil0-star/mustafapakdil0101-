import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';

type RealtimeCallback = (value: any) => void;
type NotificationFilter = (row: any) => boolean;

interface Subscriber {
  id: number;
  filter: NotificationFilter;
  callback: RealtimeCallback;
}

let nextSubscriberId = 1;
const subscribers = new Map<number, Subscriber>();
let activeChannel: RealtimeChannel | null = null;
let activeUserId: string | null = null;

const bidTypes = new Set([
  'bid_received',
  'bid_accepted',
  'bid_rejected',
  'bid_updated',
  'bid_withdrawn',
  'bid_update_requested',
]);
const jobStatusTypes = new Set(['job_completed', 'job_cancelled', 'job_status_updated']);

const mapNotification = (row: any) => ({
  id: row.id,
  userId: row.user_id,
  type: row.type,
  title: row.title,
  message: row.message,
  preview: row.message,
  isRead: Boolean(row.is_read),
  relatedId: row.related_id || undefined,
  relatedType: row.related_type || undefined,
  actionUrl: row.action_url || undefined,
  conversationId: row.related_type === 'CONVERSATION' ? row.related_id : undefined,
  jobId: row.related_type === 'JOB' ? row.related_id : undefined,
  jobPostId: row.related_type === 'JOB' ? row.related_id : undefined,
  reviewId: row.related_type === 'REVIEW' ? row.related_id : undefined,
  createdAt: row.created_at,
});

const ensureChannel = async (userId: string) => {
  if (activeChannel && activeUserId === userId) return;

  if (activeChannel) {
    void supabase.removeChannel(activeChannel);
    activeChannel = null;
  }

  activeUserId = userId;
  activeChannel = supabase
    .channel(`ui-notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const row = payload.new as any;
        if (!row) return;
        const mapped = mapNotification(row);
        subscribers.forEach(({ filter, callback }) => {
          try {
            if (filter(row)) callback(mapped);
          } catch (err) {
            console.warn('[socketService] subscriber callback error:', err);
          }
        });
      },
    )
    .subscribe();
};

const subscribe = (filter: NotificationFilter, callback: RealtimeCallback) => {
  const id = nextSubscriberId++;
  subscribers.set(id, { id, filter, callback });

  void supabase.auth.getUser().then(({ data, error }) => {
    if (error || !data.user || !subscribers.has(id)) return;
    void ensureChannel(data.user.id);
  });

  return () => {
    subscribers.delete(id);
    if (subscribers.size === 0 && activeChannel) {
      void supabase.removeChannel(activeChannel);
      activeChannel = null;
      activeUserId = null;
    }
  };
};

export const socketService = {
  onNotification: (callback: RealtimeCallback) => subscribe(
    (row) => !bidTypes.has(row.type) && !jobStatusTypes.has(row.type) && row.type !== 'new_review',
    callback,
  ),
  onBidNotification: (callback: RealtimeCallback) => subscribe(
    (row) => bidTypes.has(row.type),
    callback,
  ),
  onJobStatusUpdate: (callback: RealtimeCallback) => subscribe(
    (row) => jobStatusTypes.has(row.type),
    callback,
  ),
  onNewReview: (callback: RealtimeCallback) => subscribe(
    (row) => row.type === 'new_review',
    callback,
  ),
  getConnectionStatus: () => activeChannel !== null,
};

export default socketService;
