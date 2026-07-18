/**
 * Analytics API facade.
 *
 * A native analytics provider is not bundled in the current application. Keeping
 * this facade makes call sites stable without attempting to import a missing
 * Firebase package or writing user and purchase data to production logs.
 */
const debugEvent = (eventName: string, params?: Record<string, unknown>) => {
  if (__DEV__) console.debug(`[Analytics] ${eventName}`, params || {});
};

export const logEvent = async (eventName: string, params?: Record<string, unknown>) => {
  debugEvent(eventName, params);
};

export const setUserId = async (userId: string) => {
  if (__DEV__) console.debug('[Analytics] user_id_changed', { hasUserId: Boolean(userId) });
};

export const setUserProperty = async (name: string, value: string) => {
  debugEvent('user_property_changed', { name, hasValue: Boolean(value) });
};

export const logScreenView = async (screenName: string, screenClass?: string) => {
  debugEvent('screen_view', { screenName, screenClass });
};

export const Analytics = {
  userRegistered: (userType: string) => logEvent('user_registered', { user_type: userType }),
  userLoggedIn: (userType: string) => logEvent('user_logged_in', { user_type: userType }),
  userLoggedOut: () => logEvent('user_logged_out'),
  jobCreated: (category: string, hasImages: boolean) => logEvent('job_created', { category, has_images: hasImages }),
  jobViewed: (jobId: string, category: string) => logEvent('job_viewed', { job_id: jobId, category }),
  jobCompleted: (jobId: string, category: string) => logEvent('job_completed', { job_id: jobId, category }),
  jobCancelled: (jobId: string, reason?: string) => logEvent('job_cancelled', { job_id: jobId, reason }),
  bidSent: (jobId: string, amount: number) => logEvent('bid_sent', { job_id: jobId, amount }),
  bidAccepted: (bidId: string, jobId: string) => logEvent('bid_accepted', { bid_id: bidId, job_id: jobId }),
  bidRejected: (bidId: string, jobId: string) => logEvent('bid_rejected', { bid_id: bidId, job_id: jobId }),
  messageSent: (conversationId: string) => logEvent('message_sent', { conversation_id: conversationId }),
  conversationStarted: (withUserId: string) => logEvent('conversation_started', { with_user_id: withUserId }),
  reviewSubmitted: (rating: number, hasComment: boolean) => logEvent('review_submitted', { rating, has_comment: hasComment }),
  creditsPurchased: (amount: number, packageName: string) => logEvent('credits_purchased', { amount, package_name: packageName }),
  creditsSpent: (amount: number, purpose: string) => logEvent('credits_spent', { amount, purpose }),
  userReported: (reason: string) => logEvent('user_reported', { reason }),
  screenView: logScreenView,
  setUser: setUserId,
  setProperty: setUserProperty,
};

export default Analytics;
