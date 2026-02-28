import React, { useEffect, useState, useCallback } from 'react';
import { Slot, useRouter, useSegments, SplashScreen, useGlobalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Provider, useSelector } from 'react-redux';
import { store } from '../store/store';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { InteractionManager, View, Text, Platform } from 'react-native';
import { RootState } from '../store/store';
import { useFonts } from 'expo-font';
import { fontFiles } from '../constants/typography';
import { socketService } from '../services/socketService';
import { authService } from '../services/authService';
import { PremiumAlert } from '../components/common/PremiumAlert';
import { useAppDispatch } from '../hooks/redux';
import { addNotification, fetchNotifications, incrementUnreadCount } from '../store/slices/notificationSlice';
import { getMe, setRequiredLegalVersion } from '../store/slices/authSlice';
import LegalUpdateModal from '../components/legal/LegalUpdateModal';
import { Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
// TODO: Uncomment after running: npx expo install expo-network
// import { OfflineBanner } from '../components/common/OfflineBanner';

// CRITICAL: Configure notification handler for foreground AND background display
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

// Prevent splash from auto-hiding
SplashScreen.preventAutoHideAsync();


function RootLayoutNav() {
  const router = useRouter();
  const segments = useSegments();
  const params = useGlobalSearchParams();
  const dispatch = useAppDispatch();
  const { isAuthenticated, user, isLoading, requiredLegalVersion } = useSelector((state: RootState) => state.auth);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [isNavigationReady, setIsNavigationReady] = useState(false);
  const [hasCheckedProfile, setHasCheckedProfile] = useState(false);

  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info' | 'confirm';
    buttons?: { text: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }[];
  }>({ visible: false, title: '', message: '' });

  const showAlert = (title: string, message: string, type: any = 'info', buttons?: any[]) => {
    setAlertConfig({ visible: true, title, message, type, buttons });
  };

  useEffect(() => {
    const interaction = InteractionManager.runAfterInteractions(() => {
      setIsNavigationReady(true);
    });

    return () => interaction.cancel();
  }, []);

  // Helper to check if electrician profile is incomplete
  const checkIsProfileIncomplete = useCallback((userData: any) => {
    if (userData?.userType !== 'ELECTRICIAN') return false;

    const profile = userData.electricianProfile;
    if (!profile) return true; // No profile object yet

    const hasExperience = profile.experienceYears && profile.experienceYears > 0;
    const hasSpecialties = profile.specialties &&
      profile.specialties.length > 0 &&
      profile.specialties.some((s: string) => s !== 'Genel' && s !== 'Genel Elektrik');

    return !hasExperience || !hasSpecialties;
  }, []);

  useEffect(() => {
    if (!isNavigationReady) return;

    const checkOnboarding = async () => {
      try {
        const { getItemAsync } = await import('expo-secure-store');
        const hasSeenOnboarding = await getItemAsync('has_seen_onboarding');

        if (!hasSeenOnboarding) {
          router.replace('/onboarding');
          return true;
        }
        return false;
      } catch (error) {
        console.warn('Onboarding check failed:', error);
        return false;
      }
    };

    const runNavigationLogic = async () => {
      const inAuthGroup = segments[0] === '(auth)';
      const isOnboarding = segments[0] === 'onboarding';
      const currentPath = segments.join('/');
      const isInsideProfileGroup = segments[0] === 'profile';

      // 1. Check onboarding first if not already there
      if (!isOnboarding) {
        const redirectedToOnboarding = await checkOnboarding();
        if (redirectedToOnboarding) return;
      }

      // 2. Auth-based redirection
      if (!segments.length) return;

      if (isAuthenticated) {
        // Ensure socket is connected
        socketService.connect();

        // Admin check
        if (user?.userType === 'ADMIN') {
          if (inAuthGroup || currentPath === '') {
            router.replace('/admin');
          }
          return;
        }

        // Profile completion check for professionals
        if (user?.userType === 'ELECTRICIAN') {
          // Wait for profile data to be fully loaded if possible, 
          // but if we are in auth group and just registered, we should check what we have
          const isIncomplete = checkIsProfileIncomplete(user);

          if (isIncomplete && !isInsideProfileGroup) {
            router.replace('/profile/edit?mandatory=true');
            return;
          }

          // If profile is complete but we are still on the mandatory edit page, go home
          if (!isIncomplete && isInsideProfileGroup && params.mandatory === 'true') {
            console.log('✅ Profile complete, exiting mandatory edit mode');
            router.replace('/(tabs)');
            return;
          }
        }

        // Default: If in auth group, go to tabs
        if (inAuthGroup) {
          router.replace('/(tabs)');
        }
      }
    };

    runNavigationLogic();
  }, [isAuthenticated, user, user?.electricianProfile, segments, isNavigationReady, router, checkIsProfileIncomplete, params.mandatory]);

  // Fetch initial notification count and SYNC USER STATUS on login/app start
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchNotifications());
      dispatch(getMe());
    }
  }, [isAuthenticated, dispatch]);

  // Legal Version Check
  useEffect(() => {
    if (isAuthenticated && user && requiredLegalVersion) {
      if (user.acceptedLegalVersion !== requiredLegalVersion) {
        setShowLegalModal(true);
      }
    }
  }, [isAuthenticated, user?.acceptedLegalVersion, requiredLegalVersion]);

  const handleLegalAccept = (version: string) => {
    setShowLegalModal(false);
    // Locally update required version to hide modal
    dispatch(setRequiredLegalVersion(version));
  };


  // Global Socket Notification Listener
  useEffect(() => {
    if (!isAuthenticated) return;

    // Register Push Token on login
    const requestNotificationPermission = async () => {
      try {
        const { Platform } = await import('react-native');
        const Constants = (await import('expo-constants')).default;

        // CRITICAL: SDK 53+ removed push support from Expo Go Android
        // We MUST NOT even import the module to avoid the error stack
        if (Platform.OS === 'android' && Constants.appOwnership === 'expo') {
          return;
        }

        const Notifications = await import('expo-notifications');
        const { status } = await Notifications.getPermissionsAsync();

        if (status !== 'granted') {
          showAlert(
            '🔔 Bildirimlerinizi Açın',
            'Yeni iş ilanları, teklifler ve mesajlardan anında haberdar olmak için bildirimleri açmanızı öneririz.',
            'info',
            [
              {
                text: 'Daha Sonra',
                variant: 'ghost',
                onPress: () => setAlertConfig(prev => ({ ...prev, visible: false }))
              },
              {
                text: 'Bildirimleri Aç',
                variant: 'primary',
                onPress: async () => {
                  setAlertConfig(prev => ({ ...prev, visible: false }));
                  await authService.registerPushToken();
                }
              }
            ]
          );
        } else {
          await authService.registerPushToken();
        }
      } catch (err) {
        console.warn('Notification permission check failed:', err);
        await authService.registerPushToken();
      }
    };

    requestNotificationPermission();

    // Listen for new notifications via socket
    const unsubscribe = socketService.onNotification((notification) => {
      console.log('🔔 [_layout] Socket notification received:', JSON.stringify(notification));

      // Ignore notifications triggered by the user themselves
      if ((notification as any).creatorId === user?.id) {
        console.log('🔔 [_layout] Ignored socket notification triggered by self');
        return;
      }

      // Add to Redux store
      dispatch(addNotification(notification));
      console.log('🔔 [_layout] addNotification dispatched');

      // Show in-app alert if appropriate
      showAlert(
        (notification as any).title || 'Bildirim',
        (notification as any).message || notification.preview || '',
        'info',
        [
          {
            text: 'Görüntüle',
            variant: 'primary',
            onPress: () => {
              setAlertConfig(prev => ({ ...prev, visible: false }));

              // Check notification type and route accordingly
              const notificationType = (notification as any).type;
              const conversationId = (notification as any).conversationId;
              const jobId = (notification as any).jobId || (notification as any).data?.jobId;

              // Message notifications - route to messages screen
              if (notificationType === 'new_message' || conversationId) {
                if (conversationId) {
                  router.push(`/messages/${conversationId}`);
                } else {
                  router.push('/(tabs)/messages');
                }
              }
              // Job notifications - route to job details
              else if (jobId) {
                router.push(`/jobs/${jobId}`);
              }
              // Default - go to notifications list
              else {
                router.push('/(tabs)/profile');
              }
            }
          },
          { text: 'Kapat', onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) }
        ]
      );
    });

    // Listen for bid-related notifications (bid_received, bid_accepted, bid_rejected)
    const unsubscribeBid = socketService.onBidNotification((bidNotification) => {
      console.log('📢 [GLOBAL] Bid notification received:', bidNotification.type);

      // Determine alert type based on bid notification type
      let alertType: 'success' | 'error' | 'info' = 'info';
      let alertTitle = 'Bildirim';

      if (bidNotification.type === 'bid_received') {
        alertType = 'info';
        alertTitle = '💼 Yeni Teklif Alındı';
      } else if (bidNotification.type === 'bid_accepted') {
        alertType = 'success';
        alertTitle = '🎉 Teklifiniz Kabul Edildi';
      } else if (bidNotification.type === 'bid_rejected') {
        alertType = 'error';
        alertTitle = '❌ Teklifiniz Reddedildi';
      }

      // Add to Redux notification store as well
      dispatch(addNotification({
        id: `bid-${Date.now()}`,
        type: bidNotification.type,
        title: alertTitle,
        message: bidNotification.message,
        isRead: false,
        relatedId: bidNotification.jobPostId,
        relatedType: 'JOB',
        createdAt: new Date().toISOString()
      }));

      // Show in-app alert
      showAlert(
        alertTitle,
        bidNotification.message,
        alertType,
        [
          {
            text: 'İlanı Gör',
            variant: 'primary',
            onPress: () => {
              setAlertConfig(prev => ({ ...prev, visible: false }));
              if (bidNotification.jobPostId) {
                router.push(`/jobs/${bidNotification.jobPostId}`);
              }
            }
          },
          { text: 'Kapat', onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) }
        ]
      );
    });

    // Listen for job status updates (job completed, cancelled, etc.)
    const unsubscribeJobStatus = socketService.onJobStatusUpdate((statusNotification: any) => {
      console.log('🔄 [GLOBAL] Job status update received:', statusNotification);

      dispatch(addNotification({
        id: `job-status-${Date.now()}`,
        type: 'job_status_updated',
        title: statusNotification.title || '📋 İş Durumu Güncellendi',
        message: statusNotification.message || 'İşinizin durumu değişti.',
        isRead: false,
        relatedId: statusNotification.jobId,
        relatedType: 'JOB',
        createdAt: new Date().toISOString()
      }));

      showAlert(
        statusNotification.title || '📋 İş Durumu Güncellendi',
        statusNotification.message || 'İşinizin durumu değişti.',
        'info',
        [
          {
            text: 'Görüntüle',
            variant: 'primary',
            onPress: () => {
              setAlertConfig(prev => ({ ...prev, visible: false }));
              if (statusNotification.jobId) {
                router.push(`/jobs/${statusNotification.jobId}`);
              }
            }
          },
          { text: 'Kapat', onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) }
        ]
      );
    });

    // Listen for new reviews
    const unsubscribeReview = socketService.onNewReview((reviewNotification: any) => {
      console.log('⭐ [GLOBAL] New review received:', reviewNotification);

      dispatch(addNotification({
        id: `review-${Date.now()}`,
        type: 'new_review',
        title: '⭐ Yeni Değerlendirme',
        message: reviewNotification.message || 'Yeni bir değerlendirme aldınız!',
        isRead: false,
        relatedId: reviewNotification.reviewId || reviewNotification.jobId,
        relatedType: 'REVIEW',
        createdAt: new Date().toISOString()
      }));

      showAlert(
        '⭐ Yeni Değerlendirme',
        reviewNotification.message || 'Yeni bir değerlendirme aldınız!',
        'success',
        [
          {
            text: 'Profili Gör',
            variant: 'primary',
            onPress: () => {
              setAlertConfig(prev => ({ ...prev, visible: false }));
              router.push('/profile');
            }
          },
          { text: 'Kapat', onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) }
        ]
      );
    });

    return () => {
      unsubscribe();
      unsubscribeBid();
      unsubscribeJobStatus();
      unsubscribeReview();
    };
  }, [isAuthenticated, dispatch, router]);

  // PUSH NOTIFICATION TAP HANDLER (Deep Linking for background/closed app)
  useEffect(() => {
    // Handle notification tap when app is in background or closed
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('🔔 [DEEP LINK] Push notification tapped:', JSON.stringify(response.notification.request.content.data));

      const data = response.notification.request.content.data as any;

      // Route based on notification data
      if (data?.conversationId) {
        // Message notification
        router.push(`/messages/${data.conversationId}`);
      } else if (data?.ticketId || data?.type === 'support_ticket_updated' || data?.type === 'support_reply' || data?.type === 'support_status') {
        // Support ticket notification
        router.push(`/profile/support`);
      } else if (data?.jobId) {
        // Job-related notification (new bid, bid accepted, job status, etc.)
        router.push(`/jobs/${data.jobId}`);
      } else if (data?.type === 'new_review') {
        // Review notification
        router.push('/(tabs)/profile');
      } else {
        // Default: go to notifications
        router.push('/profile/notifications');
      }
    });

    // Increment badge when push notification received (foreground)
    const receivedSubscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('🔔 [FOREGROUND] Push received, incrementing badge');
      dispatch(incrementUnreadCount());
    });

    // Also check for initial notification (app was opened from killed state via notification)
    const checkInitialNotification = async () => {
      const lastNotification = await Notifications.getLastNotificationResponseAsync();
      if (lastNotification) {
        console.log('🔔 [DEEP LINK] App opened from notification:', JSON.stringify(lastNotification.notification.request.content.data));

        const data = lastNotification.notification.request.content.data as any;

        // Small delay to ensure navigation is ready
        setTimeout(() => {
          if (data?.conversationId) {
            router.push(`/messages/${data.conversationId}`);
          } else if (data?.jobId) {
            router.push(`/jobs/${data.jobId}`);
          } else if (data?.type === 'new_review') {
            router.push('/(tabs)/profile');
          }
        }, 1000);
      }
    };

    if (isNavigationReady) {
      checkInitialNotification();
    }

    return () => {
      responseSubscription.remove();
      receivedSubscription.remove();
    };
  }, [router, isNavigationReady, dispatch]);

  const [fontsLoaded] = useFonts(fontFiles);

  useEffect(() => {
    if (fontsLoaded && isNavigationReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isNavigationReady]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <StatusBar style="dark" />
          <Slot />

          <PremiumAlert
            visible={alertConfig.visible}
            title={alertConfig.title}
            message={alertConfig.message}
            onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
            type={alertConfig.type}
            buttons={alertConfig.buttons}
          />

          <LegalUpdateModal
            visible={showLegalModal}
            requiredVersion={requiredLegalVersion || 'v1.0'}
            onAccept={handleLegalAccept}
          />
        </GestureHandlerRootView>
        {/* TODO: Uncomment after running: npx expo install expo-network */}
        {/* <OfflineBanner /> */}
      </SafeAreaProvider>
    </Provider>
  );
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <RootLayoutNav />
    </Provider>
  );
}
