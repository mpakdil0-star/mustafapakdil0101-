import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Slot, useRouter, useSegments, usePathname, SplashScreen, useGlobalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import { Provider, useSelector } from 'react-redux';
import { store } from '../store/store';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { InteractionManager, View, Text, Platform, StyleSheet, TouchableOpacity, AppState, Image } from 'react-native';
import { RootState } from '../store/store';
import { useFonts } from 'expo-font';
import { fontFiles, fonts } from '../constants/typography';
import { socketService } from '../services/socketService';
import { authService } from '../services/authService';
import { PremiumAlert } from '../components/common/PremiumAlert';
import { useAppDispatch } from '../hooks/redux';
import { addNotification, fetchNotifications, incrementUnreadCount, fetchUnreadCount } from '../store/slices/notificationSlice';
import { clearSession, getMe, initializeAuth, setRequiredLegalVersion, logout, stopImpersonation } from '../store/slices/authSlice';
import { supabase } from '../services/supabase';
import { notificationService } from '../services/notificationService';
import { preferenceService } from '../services/accountService';
import LegalUpdateModal from '../components/legal/LegalUpdateModal';
import { Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getNotificationTargetPath } from '../utils/notificationNavigation';
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
  const pathname = usePathname();
  const params = useGlobalSearchParams();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isInitialized, user, isLoading, requiredLegalVersion } = useSelector((state: RootState) => state.auth);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [isNavigationReady, setIsNavigationReady] = useState(false);
  const [hasCheckedProfile, setHasCheckedProfile] = useState(false);
  const lastRedirectPath = useRef<string | null>(null);
  const isRedirecting = useRef(false);

  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info' | 'confirm';
    buttons?: { text: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }[];
  }>({ visible: false, title: '', message: '' });

  const [pendingNotificationPath, setPendingNotificationPath] = useState<string | null>(null);
  const [hasResolvedInitialNotification, setHasResolvedInitialNotification] = useState(false);
  const handledNotificationResponseIds = useRef(new Set<string>());
  const hasCheckedInitialNotification = useRef(false);
  const notificationNavigationInFlight = useRef<string | null>(null);
  const notificationNavigationWatchdog = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldClearInitialNotificationResponse = useRef(false);

  const showAlert = (title: string, message: string, type: any = 'info', buttons?: any[]) => {
    setAlertConfig({ visible: true, title, message, type, buttons });
  };

  // NEW: App Version Migration & Cache Cleansing
  useEffect(() => {
    const runMigration = async () => {
      try {
        const CURRENT_APP_VERSION = '1.6.11';
        const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
        const lastRunVersion = await AsyncStorage.getItem('last_run_app_version');

        if (lastRunVersion !== CURRENT_APP_VERSION) {
          console.log(`🧹 [Migration] Upgrading app version from ${lastRunVersion || 'none'} to ${CURRENT_APP_VERSION}...`);
          
          // 1. Clear secure store tokens to prevent stale/conflicting auth sessions
          const SecureStore = await import('expo-secure-store');
          await Promise.all(['auth_token', 'refresh_token', 'admin_token_fallback', 'admin_refresh_fallback']
            .map(key => SecureStore.deleteItemAsync(key)));
          
          // 2. Clear old marketplace cache key
          await AsyncStorage.removeItem('marketplace_products_v1');
          
          // 3. Save new run version. Supabase session storage is deliberately
          // preserved; only legacy Express JWT tokens are removed above.
          await AsyncStorage.setItem('last_run_app_version', CURRENT_APP_VERSION);
          
          console.log('✅ [Migration] Clean slate migration completed successfully.');
        }
      } catch (err) {
        console.error('❌ [Migration] Error during version migration:', err);
      }
    };

    runMigration();
  }, [dispatch]);

  // Restore the persisted Supabase session and keep Redux synchronized with
  // Auth events. The callback schedules Redux work outside Supabase's lock.
  useEffect(() => {
    dispatch(initializeAuth());

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      setTimeout(() => {
        if (event === 'SIGNED_OUT') {
          dispatch(clearSession());
        } else if (event === 'PASSWORD_RECOVERY') {
          router.replace('/(auth)/forgot-password?recovery=1');
          dispatch(initializeAuth());
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          dispatch(initializeAuth());
        }
      }, 0);
    });

    const handleUrl = async (url: string | null) => {
      if (!url) return;
      try {
        const handled = await authService.handleAuthUrl(url);
        if (handled) dispatch(initializeAuth());
      } catch (error) {
        console.warn('[Auth] Deep link işlenemedi:', error);
      }
    };

    Linking.getInitialURL().then(handleUrl);
    const linkSubscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));

    return () => {
      authListener.subscription.unsubscribe();
      linkSubscription.remove();
    };
  }, [dispatch, router]);

  // Supabase access tokens can remain locally usable for a short time after
  // an administrator deletes the underlying Auth user. Listen for the
  // server-side revocation event and immediately return the device to guest
  // mode instead of waiting for token expiry or an app restart.
  useEffect(() => {
    if (!isAuthenticated || !user?.id || user.isImpersonated) return;

    let handled = false;
    const revokeLocalSession = async (reason = 'ADMIN_DELETED') => {
      if (handled) return;
      handled = true;
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch {
        // Redux and navigation must still be cleared if local sign-out fails.
      }
      dispatch(clearSession());
      router.replace('/welcome');
      Alert.alert(
        'Oturum sonlandırıldı',
        reason === 'ADMIN_SUSPENDED'
          ? 'Hesabınız yönetici tarafından askıya alındı.'
          : reason === 'ADMIN_BANNED'
            ? 'Hesabınız bir şikâyet incelemesi sonucunda yönetici tarafından kapatıldı.'
          : 'Hesabınız yönetici tarafından silindi.'
      );
    };

    const channel = supabase
      .channel(`account-revocation:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'account_revocations',
          filter: `user_id=eq.${user.id}`,
        },
        payload => { void revokeLocalSession((payload.new as any)?.reason); },
      )
      .subscribe();

    // Covers a deletion that happened while the device was offline or while
    // the Realtime channel was still connecting.
    supabase
      .from('account_revocations')
      .select('id,reason')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) void revokeLocalSession(data.reason);
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isAuthenticated, user?.id, user?.isImpersonated, dispatch, router]);

  useEffect(() => {
    if (!user?.isImpersonated || !user.impersonationExpiresAt) return;
    const remaining = new Date(user.impersonationExpiresAt).getTime() - Date.now();

    const restoreAdmin = async () => {
      try {
        await dispatch(stopImpersonation()).unwrap();
        router.replace('/admin/users');
        Alert.alert('Yönetici moduna dönüldü', 'Süreli kullanıcı oturumu sona erdi.');
      } catch {
        Alert.alert('Oturum hatası', 'Yönetici hesabına otomatik dönüş yapılamadı. Lütfen uygulamayı yeniden açın.');
      }
    };

    if (remaining <= 0) {
      void restoreAdmin();
      return;
    }

    const expiryTimer = setTimeout(() => { void restoreAdmin(); }, remaining);
    return () => clearTimeout(expiryTimer);
  }, [user?.isImpersonated, user?.impersonationExpiresAt, dispatch, router]);

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

    const hasExperience = profile.experienceYears !== undefined && profile.experienceYears !== null && profile.experienceYears > 0;
    const hasSpecialties = Array.isArray(profile.specialties) &&
      profile.specialties.length > 0 &&
      profile.specialties.some((s: string) => s !== 'Genel' && s !== 'Genel Elektrik');
    const hasPhone = userData.phone && userData.phone.trim() !== ''; 

    return !hasExperience || !hasSpecialties || !hasPhone;
  }, []);

  useEffect(() => {
    if (!isNavigationReady || !isInitialized || !hasResolvedInitialNotification) return;
    let authRedirectTimer: ReturnType<typeof setTimeout> | null = null;
    let navigationCancelled = false;

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
      // CRITICAL: Wait until navigation is fully ready before performing any redirects
      if (!isNavigationReady) return;

      // NEW: If we are handling a deep link notification, skip standard redirects to avoid clobbering
      if (pendingNotificationPath) {
        console.log('🛑 [RootNav] Skipping standard redirect because notification path is pending:', pendingNotificationPath);
        return;
      }

      const inAuthGroup = segments.includes('(auth)') || segments.includes('login') || segments.includes('register');
      const isOnboarding = segments[0] === 'onboarding';
      const currentPath = segments.join('/');
      const isInsideProfileGroup = segments[0] === 'profile';
      const isWelcome = segments[0] === 'welcome' || segments.includes('welcome') || currentPath === 'welcome';
      const isPasswordRecovery = segments.includes('forgot-password') && params.recovery === '1';



      // 1. Check onboarding first
      if (!isOnboarding) {
        const redirectedToOnboarding = await checkOnboarding();
        if (redirectedToOnboarding || navigationCancelled) return;
      }

      if (!segments.length) return;

      if (isAuthenticated) {
        if (isPasswordRecovery) return;
        // 2. Auth-based redirection logic
        // Use a small delay instead of InteractionManager to ensure state stability 
        // after native social login modals close.
        authRedirectTimer = setTimeout(async () => {
          if (navigationCancelled) return;
          try {
            console.log('🔄 [RootNav] Logic Start - Path:', currentPath, 'Auth:', isAuthenticated, 'UserType:', user?.userType, 'Verified:', user?.isVerified);
            // Re-check state inside interactions to ensure accuracy
            if (user?.userType === 'ADMIN') {
              if (inAuthGroup || currentPath === '') {
                if (lastRedirectPath.current !== '/admin') {
                   lastRedirectPath.current = '/admin';
                   requestAnimationFrame(() => {
                     router.replace('/admin');
                   });
                }
              }
              return;
            }

            // Case: Unverified users
            if (user && user.isVerified === false) {
              console.log('⏳ [RootNav] User unverified. Current path:', currentPath);
              
              // NEW: If we are in the middle of registration or on the verify screen, DO NOT logout.
              // Just let the app handle the verification flow.
              const isProcessingAuth = currentPath === '(auth)/register' || 
                                       currentPath === '(auth)/verify' || 
                                       currentPath === '(auth)/login' ||
                                       segments.includes('verify');
                                       
              if (isProcessingAuth) {
                console.log('🛡️ [RootNav] Auth in progress, skipping auto-logout for unverified user');
                return;
              }
              
              console.log('🚫 [RootNav] Unverified user on unauthorized path, logging out');
              dispatch(logout());
              showAlert('E-posta Doğrulaması Eksik', 'Güvenliğiniz için e-postanızı doğrulamanız zorunludur.', 'error');
              requestAnimationFrame(() => {
                router.replace('/(auth)/login');
              });
              return;
            }

            // Case: Electrician profile completion
            if (user?.userType === 'ELECTRICIAN') {
              const isIncomplete = checkIsProfileIncomplete(user);
              const { getItemAsync, setItemAsync } = await import('expo-secure-store');
              const profileSetupDone = await getItemAsync('profile_setup_completed_' + user.id);

              console.log('🛠️ [RootNav] Electrician check - Incomplete:', isIncomplete, 'SetupDone:', profileSetupDone);

              const segs = segments as any;
              const isAllowedProfileScreen = segs[1] === 'edit' || segs[1] === 'addresses' || (segs[1] === 'addresses' && segs[2] === 'add');

              if (isIncomplete && !isAllowedProfileScreen && !profileSetupDone) {
                if (lastRedirectPath.current !== '/profile/edit') {
                  lastRedirectPath.current = '/profile/edit';
                  
                  const performProfileRedirect = () => {
                    if (router.canDismiss()) {
                      router.dismissAll();
                    }
                    requestAnimationFrame(() => {
                      console.log('🚀 [RootNav] EXECUTING REPLACE -> /profile/edit');
                      router.replace('/profile/edit?mandatory=true');
                    });
                  };

                  performProfileRedirect();
                  // Retry if stuck
                  setTimeout(() => {
                    if (segments.includes('register') || segments.includes('login')) {
                      console.log('⚠️ [RootNav] Still on auth screen, retrying profile redirect...');
                      performProfileRedirect();
                    }
                  }, 500);
                }
                return;
              }

              if (!isIncomplete && !profileSetupDone) {
                await setItemAsync('profile_setup_completed_' + user.id, 'true');
              }

              if (!isIncomplete && isInsideProfileGroup && params.mandatory === 'true') {
                if (lastRedirectPath.current !== '/(tabs)') {
                   lastRedirectPath.current = '/(tabs)';
                   requestAnimationFrame(() => {
                     router.replace('/(tabs)');
                   });
                }
                return;
              }
            }

            // Case: Default redirect to TABS
            // If user is verified and authenticated, but still on a non-app screen, force redirect to TABS
            const isInApp = segments.includes('(tabs)') || 
                            segments.includes('profile') || 
                            segments.includes('admin') || 
                            segments.includes('jobs') || 
                            segments.includes('messages') || 
                            segments.includes('notifications') || 
                            segments.includes('electricians') || 
                            segments.includes('electrician') || 
                            segments.includes('categories') ||
                            segments.includes('tools');
            
            if (!isInApp && currentPath !== 'onboarding') {
              console.log('➡️ [RootNav] Verified user on non-app screen (' + currentPath + '), forcing redirect to TABS');
              
              if (lastRedirectPath.current !== '/(tabs)') {
                lastRedirectPath.current = '/(tabs)';
                
                const performRedirect = () => {
                  if (router.canDismiss()) {
                    router.dismissAll();
                  }
                  requestAnimationFrame(() => {
                    console.log('🚀 [RootNav] EXECUTING REPLACE -> /(tabs)');
                    router.replace('/(tabs)');
                  });
                };

                performRedirect();
                // If we are still here after 500ms, try once more (handling potential native UI lock)
                setTimeout(() => {
                  if (segments.includes('register') || segments.includes('login')) {
                    console.log('⚠️ [RootNav] Still on auth screen, retrying redirect...');
                    performRedirect();
                  }
                }, 500);
              }
            }
          } catch (err) {
            console.error('❌ [RootNav] Error in navigation logic:', err);
          }
        }, 100);
      } else {
        // 3. Guest/Unauthenticated redirection logic
        // If not authenticated and NOT on allowed public/guest screens, redirect to welcome
        const isPublicScreen = 
          inAuthGroup || 
          isOnboarding || 
          isWelcome || 
          segments.includes('(tabs)') || 
          segments.includes('electricians') || 
          segments.includes('jobs');

        if (!isPublicScreen && currentPath !== '' && currentPath !== 'onboarding' && currentPath !== 'welcome') {
          console.log('🚫 [RootNav] Guest trying to access protected screen (' + currentPath + '), redirecting to welcome');
          if (lastRedirectPath.current !== '/welcome') {
            lastRedirectPath.current = '/welcome';
            requestAnimationFrame(() => {
              router.replace('/welcome');
            });
          }
        } else if (currentPath === '' && !isOnboarding && !isWelcome && !inAuthGroup) {
          // If at root and not in any defined flow, go to welcome
          if (lastRedirectPath.current !== '/welcome') {
            lastRedirectPath.current = '/welcome';
            router.replace('/welcome');
          }
        }
      }
    };

    runNavigationLogic();
    return () => {
      navigationCancelled = true;
      if (authRedirectTimer) clearTimeout(authRedirectTimer);
    };
  }, [isAuthenticated, isInitialized, user?.id, user?.userType, segments, isNavigationReady, params.mandatory, pendingNotificationPath, hasResolvedInitialNotification]);

  // Ref to track if we've already done the initial data fetch for this session
  const initialDataFetched = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      initialDataFetched.current = false;
      return;
    }

    if (isAuthenticated && !initialDataFetched.current) {
      initialDataFetched.current = true;
      
      // Use interaction manager to wait for navigation/transitions to settle
      InteractionManager.runAfterInteractions(async () => {
        try {
          console.log('🚀 [Root] Starting sequential bootstrap...');
          
          // 1. First get user details (this is the most critical)
          await dispatch(getMe()).unwrap();
          
          // 2. Pause to allow navigation redirects to happen first
          await new Promise(resolve => setTimeout(resolve, 800));
          
          // 3. Fetch notifications
          dispatch(fetchNotifications());
          dispatch(fetchUnreadCount());
          
          console.log('✅ [Root] Bootstrap sequence completed');
        } catch (err) {
          console.warn('⚠️ [Root] Bootstrap sequence had errors:', err);
        }
      });
    }
  }, [isAuthenticated, dispatch]);

  // Supabase Realtime is the source of truth for in-app notifications.
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    return notificationService.subscribe(user.id, (notification, event) => {
      if (event === 'DELETE') {
        dispatch(fetchNotifications());
        dispatch(fetchUnreadCount());
        return;
      }
      dispatch(addNotification(notification));
    });
  }, [isAuthenticated, user?.id, dispatch]);

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

    // Register Push Token on login — Device-based notification prompt (one-time per install)
    const requestNotificationPermission = async () => {
      if (user?.isImpersonated) return; // Hesaba bürünülmüşse (Admin Modu) push kaydı yapma
      try {
        const { Platform } = await import('react-native');
        const Constants = (await import('expo-constants')).default;

        // CRITICAL: SDK 53+ removed push support from Expo Go Android
        if (Platform.OS === 'android' && Constants.appOwnership === 'expo') {
          return;
        }

        const NotifModule = await import('expo-notifications');

        const pushPreferenceEnabled = async () => {
          const preferences: Record<string, unknown> = await preferenceService
            .get<Record<string, unknown>>()
            .catch(() => ({} as Record<string, unknown>));
          const configured = preferences.pushEnabled ?? preferences.push;
          return configured !== false;
        };

        // --- ANDROID KANAL AYARLARI (ANLIK BİLDİRİM İÇİN ŞART) ---
        if (Platform.OS === 'android') {
          await NotifModule.setNotificationChannelAsync('default', {
            name: 'Genel Bildirimler',
            importance: NotifModule.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#7C3AED',
            showBadge: true,
            lockscreenVisibility: NotifModule.AndroidNotificationVisibility.PUBLIC,
          });
        }

        const { status } = await NotifModule.getPermissionsAsync();

        if (status === 'granted') {
          // Respect the in-app switch. OS permission alone must not silently
          // re-enable a preference the user explicitly disabled.
          if (await pushPreferenceEnabled()) {
            await authService.registerPushToken();
          } else {
            await authService.deactivateCurrentPushToken();
          }
          const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
          await AsyncStorage.setItem('device_push_prompt_completed', 'true');
          return;
        }

        // Device-based key: persists across account switches, clears on app uninstall
        const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
        const promptCompleted = await AsyncStorage.getItem('device_push_prompt_completed');

        if (promptCompleted === 'true') {
          await authService.deactivateCurrentPushToken();
          const currentPreferences = await preferenceService.get<Record<string, unknown>>().catch(() => ({}));
          await preferenceService.update({ ...currentPreferences, push: false, pushEnabled: false }).catch(() => {});
          // Prompt already shown on this device install — don't show again
          // The home screen banner will take over as fallback
          return;
        }

        // Small delay to let the UI settle after login/navigation
        await new Promise(resolve => setTimeout(resolve, 2500));

        showAlert(
          '🔔 Bildirimlerinizi Açın',
          'Yeni iş ilanları, teklifler ve mesajlardan anında haberdar olmak için bildirimleri açmanızı öneririz.',
          'info',
          [
            {
              text: 'Daha Sonra',
              variant: 'ghost',
              onPress: async () => {
                setAlertConfig(prev => ({ ...prev, visible: false }));
                try {
                  // Mark as completed so it never shows again on this device
                  const AS = (await import('@react-native-async-storage/async-storage')).default;
                  await AS.setItem('device_push_prompt_completed', 'true');
                } catch (e) {
                  console.log('AsyncStorage error:', e);
                }
              }
            },
            {
              text: 'Bildirimleri Aç',
              variant: 'primary',
              onPress: async () => {
                setAlertConfig(prev => ({ ...prev, visible: false }));

                try {
                  // Tiny delay to let our modal close animation finish
                  await new Promise(resolve => setTimeout(resolve, 400));

                  // DIRECTLY trigger the OS-level permission dialog (chained flow)
                  const { status: requestedStatus } = await NotifModule.requestPermissionsAsync();

                  // Mark device prompt as completed regardless of result
                  await AsyncStorage.setItem('device_push_prompt_completed', 'true');

                  if (requestedStatus === 'granted') {
                    // Permission granted! Register the push token immediately
                    await authService.registerPushToken();
                    const currentPreferences = await preferenceService.get<Record<string, unknown>>().catch(() => ({}));
                    await preferenceService.update({ ...currentPreferences, push: true, pushEnabled: true });
                    await AsyncStorage.setItem('push_activated', 'true');
                  } else {
                    await authService.deactivateCurrentPushToken();
                    const currentPreferences = await preferenceService.get<Record<string, unknown>>().catch(() => ({}));
                    await preferenceService.update({ ...currentPreferences, push: false, pushEnabled: false }).catch(() => {});
                  }
                  // If denied, the home screen banner will handle fallback
                } catch (permErr) {
                  console.warn('Permission request error:', permErr);
                  await AsyncStorage.setItem('device_push_prompt_completed', 'true');
                  await authService.registerPushToken();
                }
              }
            }
          ]
        );
      } catch (err) {
        console.warn('Notification permission check failed:', err);
        await authService.registerPushToken();
      }
    };

    requestNotificationPermission();

    // 🔄 PUSH TOKEN KEEP-ALIVE: Re-register token every time app comes to foreground
    // This ensures the token stays valid on the backend even after:
    // - Server restarts (mockStorage cleared on Render free tier)
    // - Expo token refresh
    // - Long periods of app inactivity
    const handleAppStateForPush = async (nextAppState: string) => {
      if (nextAppState === 'active' && !user?.isImpersonated) {
        try {
          // An administrator may have permanently removed this account while
          // the app was in the background. Supabase access tokens can remain
          // locally cached for a short time, so verify that the public profile
          // still exists before doing any authenticated foreground work.
          await authService.getMe();

          const { Platform } = await import('react-native');
          const Constants = (await import('expo-constants')).default;
          if (Platform.OS === 'android' && Constants.appOwnership === 'expo') return;

          const Notifications = await import('expo-notifications');
          const { status } = await Notifications.getPermissionsAsync();
          
          if (status === 'granted') {
            const preferences: Record<string, unknown> = await preferenceService
              .get<Record<string, unknown>>()
              .catch(() => ({} as Record<string, unknown>));
            const pushEnabled = (preferences.pushEnabled ?? preferences.push) !== false;
            if (pushEnabled) {
              console.log('🔄 [PushKeepAlive] App foregrounded — re-registering push token...');
              await authService.registerPushToken();
            } else {
              await authService.deactivateCurrentPushToken();
            }
          } else {
            await authService.deactivateCurrentPushToken();
            const preferences = await preferenceService.get<Record<string, unknown>>().catch(() => ({}));
            await preferenceService.update({ ...preferences, push: false, pushEnabled: false }).catch(() => {});
          }
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          const accountNoLongerExists =
            message.includes('Supabase kullanıcı profili bulunamadı') ||
            message.includes('User from sub claim in JWT does not exist') ||
            message.includes('Oturum bulunamadı');

          if (accountNoLongerExists) {
            console.warn('[Auth] Hesap artık mevcut değil; yerel oturum kapatılıyor.');
            await supabase.auth.signOut({ scope: 'local' });
            dispatch(clearSession());
            return;
          }
          console.warn('🔄 [PushKeepAlive] Token refresh failed (non-blocking):', e);
        }
      }
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateForPush);

    // Listen for new notifications via socket
    const unsubscribe = socketService.onNotification((notification) => {
      console.log('🔔 [_layout] Socket notification received:', JSON.stringify(notification));

      // Ignore notifications triggered by the user themselves
      if ((notification as any).creatorId === user?.id) {
        console.log('🔔 [_layout] Ignored socket notification triggered by self');
        return;
      }

      const convId = (notification as any).conversationId || (notification as any).relatedId;
      // useGlobalSearchParams provides 'id' when in /messages/[id]
      const currentChatId = params.id;

      // PROACTIVE: If user is actively looking at THIS conversation, 
      // add it to Redux state already marked as read and DON'T show an alert
      if (convId && convId === currentChatId) {
        console.log('🔇 [_layout] Notification for active chat received, adding as read to prevent badge');
        dispatch(addNotification({ ...notification, isRead: true }));
        return;
      }

      // Add to Redux store
      dispatch(addNotification(notification));
      console.log('🔔 [_layout] addNotification dispatched');

      // Show in-app alert if appropriate
      showAlert(
        (notification as any).title || 'Bildirim',
        (notification as any).preview || (typeof (notification as any).message === 'string' ? (notification as any).message : '') || 'Yeni bir mesajınız var',
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
      appStateSubscription.remove();
    };
  }, [isAuthenticated, user?.id, dispatch, router]);

  const queueNotificationResponse = useCallback((response: Notifications.NotificationResponse) => {
    const requestId = response.notification.request.identifier;
    if (requestId && handledNotificationResponseIds.current.has(requestId)) return;
    if (requestId) handledNotificationResponseIds.current.add(requestId);

    const data = response.notification.request.content.data as Record<string, unknown>;
    // Never resolve an unknown cold-start payload to the home/welcome route.
    // Authentication may still be restoring at this point; keep a protected
    // inbox fallback queued until the session is ready.
    const targetPath = getNotificationTargetPath(data) ?? '/profile/notifications';
    console.log('[DEEP LINK] Notification navigation queued:', targetPath);
    notificationNavigationInFlight.current = null;
    setPendingNotificationPath(targetPath);
  }, []);

  // Deferred Deep Linking when user gets authenticated
  useEffect(() => {
    const isPublicPath = pendingNotificationPath === '/welcome';
    if (pendingNotificationPath && isInitialized && isNavigationReady && !isAuthenticated && !isPublicPath) {
      if (pathname !== '/welcome') router.replace('/welcome');
      return;
    }
    if (pendingNotificationPath && isInitialized && isNavigationReady && (isAuthenticated || isPublicPath)) {
      if (notificationNavigationInFlight.current === pendingNotificationPath) return;
      console.log('🚀 [RootNav] Navigating to deferred notification path:', pendingNotificationPath);
      const targetPath = pendingNotificationPath;
      notificationNavigationInFlight.current = targetPath;
      let cancelled = false;
      const interaction = InteractionManager.runAfterInteractions(() => {
        requestAnimationFrame(() => {
          if (cancelled) return;
          try {
            router.push(targetPath as any);
            if (notificationNavigationWatchdog.current) {
              clearTimeout(notificationNavigationWatchdog.current);
            }
            // Safety valve: a malformed/removed destination must not lock all
            // standard navigation forever. Normal success clears much earlier
            // in the pathname confirmation effect below.
            notificationNavigationWatchdog.current = setTimeout(() => {
              notificationNavigationInFlight.current = null;
              setPendingNotificationPath(current => current === targetPath ? null : current);
            }, 10_000);
          } catch (error) {
            notificationNavigationInFlight.current = null;
            setPendingNotificationPath(current => current === targetPath ? null : current);
            console.error('[DEEP LINK] Navigation failed:', error);
          }
        });
      });
      return () => {
        cancelled = true;
        interaction.cancel();
      };
    }
  }, [isAuthenticated, isInitialized, pendingNotificationPath, isNavigationReady, pathname, router]);

  // Keep the normal home redirect paused until Expo Router confirms that the
  // notification destination is actually visible. This removes the intermittent
  // cold-start race seen on slower devices or connections.
  useEffect(() => {
    if (!pendingNotificationPath || notificationNavigationInFlight.current !== pendingNotificationPath) return;

    const expectedPath = pendingNotificationPath.split(/[?#]/, 1)[0].replace(/\/$/, '') || '/';
    const currentPath = pathname.replace(/\/$/, '') || '/';
    if (currentPath !== expectedPath) return;

    if (notificationNavigationWatchdog.current) {
      clearTimeout(notificationNavigationWatchdog.current);
      notificationNavigationWatchdog.current = null;
    }
    const confirmationTimer = setTimeout(() => {
      notificationNavigationInFlight.current = null;
      setPendingNotificationPath(current => current === pendingNotificationPath ? null : current);
      if (shouldClearInitialNotificationResponse.current) {
        shouldClearInitialNotificationResponse.current = false;
        Notifications.clearLastNotificationResponseAsync().catch(error => {
          console.warn('[DEEP LINK] Initial notification response could not be cleared:', error);
        });
      }
    }, 300);

    return () => clearTimeout(confirmationTimer);
  }, [pathname, pendingNotificationPath]);

  useEffect(() => () => {
    if (notificationNavigationWatchdog.current) {
      clearTimeout(notificationNavigationWatchdog.current);
    }
  }, []);

  // PUSH NOTIFICATION TAP HANDLER (Deep Linking for background/closed app)
  useEffect(() => {
    // Handle notification tap when app is in background or closed
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      queueNotificationResponse(response);
    });

    // Sync native badge when push received in foreground
    const receivedSubscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('🔔 [FOREGROUND] Push notification received');
      
      // We rely on socket notifications + Redux for the UI badge.
      // If socket is disconnected, we might want to manually fetch.
      dispatch(fetchUnreadCount());
    });

    // Also check for initial notification (app was opened from killed state via notification)
    const checkInitialNotification = async () => {
      if (hasCheckedInitialNotification.current) {
        setHasResolvedInitialNotification(true);
        return;
      }
      hasCheckedInitialNotification.current = true;
      try {
        const lastNotification = await Notifications.getLastNotificationResponseAsync();
        if (lastNotification) {
          shouldClearInitialNotificationResponse.current = true;
          queueNotificationResponse(lastNotification);
        }
      } finally {
        // Do not let the normal auth redirect send the user to the home page
        // before a cold-start notification response has been inspected.
        setHasResolvedInitialNotification(true);
      }
    };

    checkInitialNotification().catch(error => console.error('[DEEP LINK] Initial notification check failed:', error));

    return () => {
      responseSubscription.remove();
      receivedSubscription.remove();
    };
  }, [router, isNavigationReady, isAuthenticated, dispatch, queueNotificationResponse]);

  // Sycn native App icon badge with Redux unreadCount
  const { unreadCount } = useSelector((state: RootState) => state.notifications);
  useEffect(() => {
    if (isAuthenticated) {
      Notifications.setBadgeCountAsync(unreadCount).catch(err => console.log('Badge sync error:', err));
    }
  }, [unreadCount, isAuthenticated]);

  const [fontsLoaded] = useFonts(fontFiles);
  const [showFullScreenSplash, setShowFullScreenSplash] = useState(true);

  useEffect(() => {
    let transitionTimer: ReturnType<typeof setTimeout> | undefined;
    if (fontsLoaded && isNavigationReady) {
      SplashScreen.hideAsync()
        .catch(() => undefined)
        .finally(() => {
          transitionTimer = setTimeout(() => setShowFullScreenSplash(false), 350);
        });
    }
    return () => {
      if (transitionTimer) clearTimeout(transitionTimer);
    };
  }, [fontsLoaded, isNavigationReady]);

  if (!fontsLoaded || !isNavigationReady || showFullScreenSplash) {
    return (
      <View style={styles.fullScreenSplash}>
        <StatusBar hidden />
        <Image
          source={require('../assets/images/splash.png')}
          style={styles.fullScreenSplashImage}
          resizeMode="contain"
          fadeDuration={0}
        />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Slot />

      {user?.isImpersonated && (
        <View style={[styles.impersonationBanner, { top: insets.top + 2 }]}>
          <Ionicons name="shield-checkmark" size={14} color="#FFF" />
          <Text style={styles.impersonationText} numberOfLines={1}>{user.fullName?.split(' ')[0]?.toUpperCase()}</Text>
          <TouchableOpacity
            style={styles.impersonationLogoutBtn}
            onPress={async () => {
              try {
                await dispatch(stopImpersonation()).unwrap();
                router.replace('/admin/users');
              } catch {
                Alert.alert('Hata', 'Yönetici hesabına geri dönülemedi. Lütfen tekrar deneyin.');
              }
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={14} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}

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
    </>
  );
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <RootLayoutNav />
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </Provider>
  );
}

const styles = StyleSheet.create({
  fullScreenSplash: {
    flex: 1,
    backgroundColor: '#071321',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreenSplashImage: {
    width: '94%',
    aspectRatio: 1,
  },
  impersonationBanner: {
    position: 'absolute',
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 8,
  },
  impersonationText: {
    color: '#FFF',
    fontSize: 10,
    fontFamily: fonts.bold,
    letterSpacing: 0.3,
    maxWidth: 100,
  },
  impersonationLogoutBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
