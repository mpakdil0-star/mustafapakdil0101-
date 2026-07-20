/** Compatibility facade while legacy UI listeners are removed. Supabase Realtime is authoritative. */
const unsubscribe = () => {};

export const socketService = {
  onNotification: (_callback: (value: any) => void) => unsubscribe,
  onBidNotification: (_callback: (value: any) => void) => unsubscribe,
  onJobStatusUpdate: (_callback: (value: any) => void) => unsubscribe,
  onNewReview: (_callback: (value: any) => void) => unsubscribe,
  getConnectionStatus: () => false,
};

export default socketService;
