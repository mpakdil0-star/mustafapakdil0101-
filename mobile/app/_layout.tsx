import React, { useEffect, useState, useCallback } from 'react';
import { Slot, useRouter, useSegments, SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Provider, useSelector } from 'react-redux';
import { store } from '../store/store';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { InteractionManager, View, Text } from 'react-native';
import { RootState } from '../store/store';
import { useFonts } from 'expo-font';
import { fontFiles } from '../constants/typography';
import { socketService } from '../services/socketService';
import { authService } from '../services/authService';
import { PremiumAlert } from '../components/common/PremiumAlert';
import { useAppDispatch } from '../hooks/redux';
import { addNotification, fetchNotifications } from '../store/slices/notificationSlice';
import { getMe } from '../store/slices/authSlice';
import { Alert } from 'react-native';

// Prevent splash from auto-hiding
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const router = useRouter();
  const segments = useSegments();
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
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

      // Check onboarding first if not already there
      if (!isOnboarding) {
        const redirectedToOnboarding = await checkOnboarding();
        if (redirectedToOnboarding) return;
      }

      // If we are at root, or not in a specific group, we might need a default redirect
      // but expo-router usually handles the initial route. 
      // The following logic handles auth-based redirection.

      if (!segments.length) return;

      // Allow guests to browse everything in tabs
      if (isAuthenticated && inAuthGroup) {
        // Connect socket if authenticated and in auth group (redirecting to tabs)
        socketService.connect();
        try {
          router.replace('/(tabs)');
        } catch (error) {
          console.warn('Navigation error, will retry:', error);
        }
      } else if (isAuthenticated) {
        // Ensure socket is connected if authenticated anywhere else
        socketService.connect();
      }
    };

    runNavigationLogic();
  }, [isAuthenticated, segments, isNavigationReady, router]);

  // Fetch initial notification count and SYNC USER STATUS on login/app start
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchNotifications());
      dispatch(getMe());
    }
  }, [isAuthenticated, dispatch]);

  // Check if electrician profile is incomplete and redirect to mandatory profile completion
  useEffect(() => {
    // Wait for user data to be fully loaded
    if (!isAuthenticated || !isNavigationReady) return;
    if (hasCheckedProfile) return;

    // Small delay to ensure getMe() has completed and user data is populated
    const timer = setTimeout(() => {
      if (!user) {
        console.log('🔧 Profil kontrolü: user henüz yüklenmedi');
        return;
      }

      console.log('🔧 Profil kontrolü:', {
        userType: user.userType,
        exp: user.electricianProfile?.experienceYears,
        specs: user.electricianProfile?.specialties
      });

      // Only check for electricians
      if (user.userType !== 'ELECTRICIAN') {
        setHasCheckedProfile(true);
        return;
      }

      // Check if profile is incomplete
      const profile = user.electricianProfile;
      const hasExperience = profile?.experienceYears && profile.experienceYears > 0;
      const hasSpecialties = profile?.specialties && profile.specialties.length > 0 &&
        profile.specialties.some((s: string) => s !== 'Genel' && s !== 'Genel Elektrik');

      const isProfileIncomplete = !hasExperience || !hasSpecialties;

      console.log('🔧 Profil durumu:', { hasExperience, hasSpecialties, isProfileIncomplete });

      if (isProfileIncomplete) {
        // Don't redirect if already on edit page
        const currentPath = segments.join('/');
        const isOnEditPage = currentPath.includes('profile') && currentPath.includes('edit');
        if (!isOnEditPage) {
          console.log('🔧 Usta profili eksik, yönlendiriliyor...');
          router.replace('/profile/edit?mandatory=true');
        }
      }

      setHasCheckedProfile(true);
    }, 1000); // 1 saniye bekle - getMe() için yeterli süre

    return () => clearTimeout(timer);
  }, [isAuthenticated, user, isNavigationReady, hasCheckedProfile, segments, router]);

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

    // Foreground Push Notification Listener
    let pushSubscription: any;

    // Using dynamic import for notifications
    const setupNotifications = async () => {
      try {
        const { Platform } = await import('react-native');
        const Constants = (await import('expo-constants')).default;

        // Skip if Expo Go on Android
        if (Constants.appOwnership === 'expo' && Platform.OS === 'android') {
          return null;
        }

        const Notifications = await import('expo-notifications');
        return Notifications.addNotificationReceivedListener(notification => {
          console.log('📬 Background/Push Notification received in foreground:', notification);
        });
      } catch (err) {
        console.warn('Push Notifications listener setup failed:', err);
        return null;
      }
    };

    setupNotifications().then(sub => {
      if (sub) pushSubscription = sub;
    });

    const unsubscribe = socketService.onNotification((data: any) => {
      console.log('🔔 Global Notification received:', data);

      // Add to Redux store for the notification center
      dispatch(addNotification({
        id: data.id || `notif-${Date.now()}`,
        type: data.type,
        title: data.title || (data.type === 'new_job_available' ? 'Yeni İş İlanı!' : 'Bildirim'),
        message: data.message || `${data.locationPreview || ''} yeni bir ilan açıldı`,
        isRead: false,
        relatedId: data.jobId || data.conversationId,
        createdAt: new Date().toISOString()
      }));

      if (data.type === 'new_job_available') {
        showAlert(
          '🔔 Yeni İş İlanı!',
          `${data.locationPreview} bölgesinde yeni bir ${data.category} ilanı açıldı: "${data.title}"`,
          'info',
          [
            { text: 'Kapat', variant: 'ghost', onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) },
            {
              text: 'Detayları Gör',
              variant: 'primary',
              onPress: () => {
                setAlertConfig(prev => ({ ...prev, visible: false }));
                router.push(`/jobs/${data.jobId}`);
              }
            }
          ]
        );
      } else if (data.type === 'new_message' && segments[0] !== 'messages') {
        // Only show if NOT already in chat
        showAlert(
          '💬 Yeni Mesaj',
          `${data.senderName}: ${data.preview}`,
          'info',
          [
            { text: 'Kapat', variant: 'ghost', onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) },
            {
              text: 'Cevapla',
              variant: 'primary',
              onPress: () => {
                setAlertConfig(prev => ({ ...prev, visible: false }));
                router.push(`/messages/${data.conversationId}`);
              }
            }
          ]
        );
      } else if (data.type === 'JOB_CANCELLED') {
        // 💰 Kredi iadesi yapılmış olabilir, profili güncelle
        dispatch(getMe() as any);

        showAlert(
          '🚫 İlan İptal Edildi',
          data.body || data.message || 'Teklif verdiğiniz bir ilan iptal edildi. Krediniz iade edilmiştir.',
          'warning',
          [
            { text: 'Tamam', variant: 'ghost', onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) }
          ]
        );
      } else if (data.type === 'JOB_COMPLETED') {
        // İş bittiğinde de profil (puan vs) güncellensin
        dispatch(getMe() as any);

        showAlert(
          '🎉 Tebrikler!',
          data.body || 'İş tamamlandı ve onaylandı!',
          'success',
          [
            { text: 'Harika!', variant: 'primary', onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) }
          ]
        );
      }
    });

    // Bid notification listener - for citizens to see new bids
    const unsubscribeBids = socketService.onBidNotification((data: any) => {
      console.log('📢 Bid Notification received:', data);

      // Add to Redux store
      dispatch(addNotification({
        id: data.id || `bid-notif-${Date.now()}`,
        type: data.type,
        title: data.type === 'bid_received' ? 'Yeni Teklif!' : (data.type === 'bid_accepted' ? 'Teklif Kabul Edildi!' : 'Teklif Reddedildi'),
        message: data.message || (data.type === 'bid_received' ? `"${data.jobTitle}" ilanınıza teklif verildi.` : `"${data.jobTitle}" ilanındaki teklifiniz güncellendi.`),
        isRead: false,
        relatedId: data.jobPostId || data.jobId,
        createdAt: new Date().toISOString()
      }));

      if (data.type === 'bid_received') {
        showAlert(
          '💰 Yeni Teklif Aldınız!',
          `"${data.jobTitle}" ilanınıza ${data.electricianName} tarafından ${data.amount}₺ teklif verildi.`,
          'info',
          [
            { text: 'Kapat', variant: 'ghost', onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) },
            {
              text: 'Teklifleri Gör',
              variant: 'primary',
              onPress: () => {
                setAlertConfig(prev => ({ ...prev, visible: false }));
                router.push(`/jobs/${data.jobPostId}`);
              }
            }
          ]
        );
      } else if (data.type === 'bid_accepted') {
        showAlert(
          '✅ Teklifiniz Kabul Edildi!',
          data.message || `"${data.jobTitle}" için teklifiniz kabul edildi.`,
          'success',
          [
            {
              text: 'Harika!', variant: 'primary', onPress: () => {
                setAlertConfig(prev => ({ ...prev, visible: false }));
                router.push(`/jobs/${data.jobPostId}`);
              }
            }
          ]
        );
      } else if (data.type === 'bid_rejected') {
        showAlert(
          '❌ Teklifiniz Reddedildi',
          data.message || `"${data.jobTitle}" için teklifiniz reddedildi.`,
          'error',
          [
            { text: 'Tamam', variant: 'ghost', onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) }
          ]
        );
      }
    });

    const unsubscribeStatus = socketService.onJobStatusUpdate((data: any) => {
      console.log('🔄 Job Status Notification received:', data);
      dispatch(addNotification({
        id: data.id || `status-notif-${Date.now()}`,
        type: data.type,
        title: data.title,
        message: data.message,
        isRead: false,
        relatedId: data.jobId,
        createdAt: new Date().toISOString()
      }));

      showAlert(data.title, data.message, 'info', [
        { text: 'Tamam', variant: 'primary', onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) }
      ]);
    });

    const unsubscribeReview = socketService.onNewReview((data: any) => {
      console.log('⭐ Review Notification received:', data);
      dispatch(addNotification({
        id: data.id || `review-notif-${Date.now()}`,
        type: data.type,
        title: data.title,
        message: data.message,
        isRead: false,
        relatedId: data.jobId,
        createdAt: new Date().toISOString()
      }));

      showAlert(data.title, data.message, 'success', [
        { text: 'Harika!', variant: 'primary', onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) }
      ]);
    });

    const unsubscribeMessage = socketService.onMessage((data: any) => {
      console.log('💬 Global Message received:', data);
      // Only show notification if NOT on the messages tab
      if (segments[0] !== 'messages') {
        dispatch(addNotification({
          id: data.message?.id || `msg-${Date.now()}`,
          type: 'new_message',
          title: '💬 Yeni Mesaj',
          message: `${data.senderName || 'Bir kullanıcı'}: ${data.preview || 'Yeni bir mesajınız var'}`,
          isRead: false,
          relatedId: data.conversationId,
          createdAt: new Date().toISOString()
        }));

        showAlert(
          '💬 Yeni Mesaj',
          `${data.senderName || 'Bir kullanıcı'}: ${data.preview || 'Yeni bir mesajınız var'}`,
          'info',
          [
            { text: 'Kapat', variant: 'ghost', onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) },
            {
              text: 'Cevapla',
              variant: 'primary',
              onPress: () => {
                setAlertConfig(prev => ({ ...prev, visible: false }));
                router.push(`/messages/${data.conversationId}`);
              }
            }
          ]
        );
      }
    });

    return () => {
      unsubscribe();
      unsubscribeBids();
      unsubscribeStatus();
      unsubscribeReview();
      unsubscribeMessage();
    };
  }, [isAuthenticated, segments]);

  return (
    <>
      <Slot />
      <PremiumAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        buttons={alertConfig.buttons}
        onClose={() => setAlertConfig((prev: any) => ({ ...prev, visible: false }))}
      />
    </>
  );
}

// Global Error Handler removed due to incompatibility
// const setJSExceptionHandler...

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontFiles);
  const [lastError, setLastError] = useState<string | null>(null);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Catch component errors
  if (fontError) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>Yazı Tipi Yükleme Hatası</Text>
        <Text style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginTop: 10 }}>{fontError.message}</Text>
      </View>
    );
  }

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider onLayout={onLayoutRootView}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Provider store={store}>
          <StatusBar style="light" />
          <RootLayoutNav />
        </Provider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
