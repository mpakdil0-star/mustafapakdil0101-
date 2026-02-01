/**
 * Analytics Service
 * Firebase Analytics wrapper for event tracking
 * 
 * NOTE: Full Firebase Analytics requires google-services.json for Android
 * and GoogleService-Info.plist for iOS. In development/Expo Go,
 * events are logged to console only.
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Check if we're in Expo Go (development)
const isExpoGo = Constants.appOwnership === 'expo';

// Track if analytics is available
let analyticsModule: any = null;
let isAnalyticsEnabled = false;

// Initialize analytics
const initAnalytics = async () => {
    if (isExpoGo) {
        console.log('📊 [Analytics] Running in Expo Go - using console logging only');
        return;
    }

    try {
        // Dynamic import to avoid errors in Expo Go
        analyticsModule = await import('@react-native-firebase/analytics');
        isAnalyticsEnabled = true;
        console.log('📊 [Analytics] Firebase Analytics initialized');
    } catch (error) {
        console.warn('📊 [Analytics] Firebase not available, using console logging');
    }
};

// Initialize on module load
initAnalytics();

/**
 * Log a custom event
 */
export const logEvent = async (eventName: string, params?: Record<string, any>) => {
    const logParams = { ...params, timestamp: new Date().toISOString() };

    // Always log to console for debugging
    console.log(`📊 [Analytics] Event: ${eventName}`, logParams);

    if (isAnalyticsEnabled && analyticsModule) {
        try {
            await analyticsModule.default().logEvent(eventName, logParams);
        } catch (error) {
            console.warn('Analytics event failed:', error);
        }
    }
};

/**
 * Set user ID for tracking
 */
export const setUserId = async (userId: string) => {
    console.log(`📊 [Analytics] User ID set: ${userId}`);

    if (isAnalyticsEnabled && analyticsModule) {
        try {
            await analyticsModule.default().setUserId(userId);
        } catch (error) {
            console.warn('Set user ID failed:', error);
        }
    }
};

/**
 * Set user properties
 */
export const setUserProperty = async (name: string, value: string) => {
    console.log(`📊 [Analytics] User Property: ${name} = ${value}`);

    if (isAnalyticsEnabled && analyticsModule) {
        try {
            await analyticsModule.default().setUserProperty(name, value);
        } catch (error) {
            console.warn('Set user property failed:', error);
        }
    }
};

/**
 * Log screen view
 */
export const logScreenView = async (screenName: string, screenClass?: string) => {
    console.log(`📊 [Analytics] Screen View: ${screenName}`);

    if (isAnalyticsEnabled && analyticsModule) {
        try {
            await analyticsModule.default().logScreenView({
                screen_name: screenName,
                screen_class: screenClass || screenName,
            });
        } catch (error) {
            console.warn('Log screen view failed:', error);
        }
    }
};

// ============================================
// Pre-defined Event Helpers
// ============================================

export const Analytics = {
    // User Events
    userRegistered: (userType: string) => logEvent('user_registered', { user_type: userType }),
    userLoggedIn: (userType: string) => logEvent('user_logged_in', { user_type: userType }),
    userLoggedOut: () => logEvent('user_logged_out'),

    // Job Events
    jobCreated: (category: string, hasImages: boolean) =>
        logEvent('job_created', { category, has_images: hasImages }),
    jobViewed: (jobId: string, category: string) =>
        logEvent('job_viewed', { job_id: jobId, category }),
    jobCompleted: (jobId: string, category: string) =>
        logEvent('job_completed', { job_id: jobId, category }),
    jobCancelled: (jobId: string, reason?: string) =>
        logEvent('job_cancelled', { job_id: jobId, reason }),

    // Bid Events
    bidSent: (jobId: string, amount: number) =>
        logEvent('bid_sent', { job_id: jobId, amount }),
    bidAccepted: (bidId: string, jobId: string) =>
        logEvent('bid_accepted', { bid_id: bidId, job_id: jobId }),
    bidRejected: (bidId: string, jobId: string) =>
        logEvent('bid_rejected', { bid_id: bidId, job_id: jobId }),

    // Message Events
    messageSent: (conversationId: string) =>
        logEvent('message_sent', { conversation_id: conversationId }),
    conversationStarted: (withUserId: string) =>
        logEvent('conversation_started', { with_user_id: withUserId }),

    // Review Events
    reviewSubmitted: (rating: number, hasComment: boolean) =>
        logEvent('review_submitted', { rating, has_comment: hasComment }),

    // Credit Events
    creditsPurchased: (amount: number, packageName: string) =>
        logEvent('credits_purchased', { amount, package_name: packageName }),
    creditsSpent: (amount: number, purpose: string) =>
        logEvent('credits_spent', { amount, purpose }),

    // Report Events
    userReported: (reason: string) =>
        logEvent('user_reported', { reason }),

    // Navigation
    screenView: logScreenView,
    setUser: setUserId,
    setProperty: setUserProperty,
};

export default Analytics;
