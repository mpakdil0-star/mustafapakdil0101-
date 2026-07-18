import { supabase } from './supabase';

type RealtimeCallback = (value: any) => void;
type NotificationFilter = (row: any) => boolean;

let channelSequence = 0;
let activeSubscriptions = 0;

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

const subscribe = (filter: NotificationFilter, callback: RealtimeCallback) => {
  let disposed = false;
  let unsubscribe: (() => void) | null = null;

  void supabase.auth.getUser().then(({ data, error }) => {
    if (disposed || error || !data.user) return;
    const channelName = `ui-notifications:${data.user.id}:${channelSequence++}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${data.user.id}`,
        },
        (payload) => {
          const row = payload.new as any;
          if (row && filter(row)) callback(mapNotification(row));
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') activeSubscriptions += 1;
      });

    unsubscribe = () => {
      activeSubscriptions = Math.max(0, activeSubscriptions - 1);
      void supabase.removeChannel(channel);
    };
    if (disposed) unsubscribe();
  });

  return () => {
    disposed = true;
    unsubscribe?.();
    unsubscribe = null;
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
  getConnectionStatus: () => activeSubscriptions > 0,
};

export default socketService;
