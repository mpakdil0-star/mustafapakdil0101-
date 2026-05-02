import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, TouchableOpacity, Modal, ImageBackground, Image, Platform, Dimensions, PanResponder, Alert, ActivityIndicator, AppState, Linking } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchNotifications } from '../../store/slices/notificationSlice';
import { colors as staticColors } from '../../constants/colors';
import { useAppColors } from '../../hooks/useAppColors';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';
import { FeaturedElectrician } from '../../components/home/FeaturedElectrician';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../services/api';
import { authService } from '../../services/authService';
import { API_ENDPOINTS, getFileUrl } from '../../constants/api';
import { jobService } from '../../services/jobService';
import { userService } from '../../services/userService';
import { AuthGuardModal } from '../../components/common/AuthGuardModal';
import { JOB_CATEGORIES } from '../../constants/jobCategories';
import { SERVICE_CATEGORIES } from '../../constants/serviceCategories';
import AsyncStorage from '@react-native-async-storage/async-storage';


// --- Premium Service Category Component ---
const ServiceCategoryItem = ({ cat, index, onPress, styles, colors }: any) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(index * 60),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const getCategoryImage = (id: string) => {
    switch (id) {
      case 'elektrik': return require('../../assets/images/categories/electric.png');
      case 'cilingir': return require('../../assets/images/categories/locksmith_3d_clean.png');
      case 'klima': return require('../../assets/images/categories/ac_3d_clean.png');
      case 'beyaz-esya': return require('../../assets/images/categories/appliances_3d_clean.png');
      case 'tesisat': return require('../../assets/images/categories/plumbing.png');
      default: return undefined;
    }
  };

  return (
    <Animated.View style={{ width: '18%', transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[styles.serviceCategoryCard, { shadowColor: cat.colors[0] + '30', borderColor: colors.borderLight }]}
        onPress={() => onPress(cat.id)}
        activeOpacity={0.88}
      >
        <View style={[styles.serviceCategoryIconBg, { backgroundColor: cat.colors[0] + '08' }]}>
          <View style={StyleSheet.absoluteFill}>
            <LinearGradient
              colors={[`${cat.colors[0]}12`, `${cat.colors[1]}18`]}
              style={[StyleSheet.absoluteFill, { borderRadius: 18, justifyContent: 'center', alignItems: 'center' }]}
            >
              <Ionicons name={cat.icon} size={26} color={cat.colors[0]} />
            </LinearGradient>
          </View>
          <Image
            source={getCategoryImage(cat.id)}
            style={styles.serviceCategoryImage}
            resizeMode="contain"
          />
        </View>
        <Text style={[styles.serviceCategoryName, { color: colors.text }]} numberOfLines={2}>{cat.name}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};


// --- Usta Kategori Helper ---
const getUstaCategory = (elec: any) => {
  const cat = elec.serviceCategory || elec.electricianProfile?.serviceCategory;
  if (cat === 'cilingir') return 'Çilingir';
  if (cat === 'klima') return 'Klima';
  if (cat === 'beyaz-esya') return 'Beyaz Eşya';
  if (cat === 'tesisat') return 'Tesisat';
  if (cat === 'elektrik') return 'Elektrik';

  // Fallback: Check specialties array for keywords
  const specs = elec.specialties || elec.electricianProfile?.specialties || [];
  const specsStr = Array.isArray(specs) ? specs.join(' ').toLowerCase() : '';
  
  if (specsStr.includes('klima') || specsStr.includes('soğutma')) return 'Klima';
  if (specsStr.includes('çilingir') || specsStr.includes('anahtar') || specsStr.includes('kilit')) return 'Çilingir';
  if (specsStr.includes('beyaz eşya') || specsStr.includes('buzdolabı') || specsStr.includes('çamaşır')) return 'Beyaz Eşya';
  if (specsStr.includes('tesisat') || specsStr.includes('su ') || specsStr.includes('musluk')) return 'Tesisat';
  
  // Last resort: if specialty exists as a string
  const specialtyStr = (elec.specialty || '').toLowerCase();
  if (specialtyStr.includes('klima')) return 'Klima';
  if (specialtyStr.includes('çilingir')) return 'Çilingir';
  if (specialtyStr.includes('beyaz eşya')) return 'Beyaz Eşya';
  if (specialtyStr.includes('tesisat')) return 'Tesisat';

  return 'Elektrik';
};


export default function HomeScreen() {
  const router = useRouter();
  const colors = useAppColors();
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, guestRole } = useAppSelector((state) => state.auth);
  const unreadCount = useAppSelector((state) => state.notifications.unreadCount);
  const notifications = useAppSelector((state) => state.notifications.notifications);
  const isElectrician = user?.userType === 'ELECTRICIAN' || guestRole === 'ELECTRICIAN';



  // Toast notification state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'bid' | 'message' | 'general'>('general');
  const toastOpacity = useRef(new Animated.Value(0)).current;

  // Show toast notification
  const showToast = (message: string, type: 'bid' | 'message' | 'general' = 'general') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);

    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(3000),
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true })
    ]).start(() => setToastVisible(false));
  };

  // DEBUG: Remove after fixing the role issue
  console.log('[HomeScreen] guestRole:', guestRole, '| isElectrician:', isElectrician, '| userType:', user?.userType);
  console.log('[HomeScreen] unreadCount:', unreadCount); // DEBUG: Check badge count
  const [newJobsCount, setNewJobsCount] = useState(0);
  const [userCities, setUserCities] = useState<string[]>([]);
  const [locationsCount, setLocationsCount] = useState(0); // Service areas count from API
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isHowItWorksVisible, setIsHowItWorksVisible] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ path: string; params?: any } | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [featuredElectricians, setFeaturedElectricians] = useState<any[]>([]);
  const [isLoadingElectricians, setIsLoadingElectricians] = useState(false);
  const [hideHowItWorks, setHideHowItWorks] = useState(false);
  const [showPushBanner, setShowPushBanner] = useState(false);
  const [pushBannerLoading, setPushBannerLoading] = useState(false);

  // Pulse animation for health action buttons
  const healthPulseAnim = useRef(new Animated.Value(1)).current;

  // RGB Border animation for profile health card
  const borderColorAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(healthPulseAnim, {
          toValue: 1.08,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(healthPulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // RGB Border rotation animation
    Animated.loop(
      Animated.timing(borderColorAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: false, // Color animation doesn't support native driver
      })
    ).start();
  }, []);

  // NEW: Badge Pulse Animation
  const badgePulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (unreadCount > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(badgePulseAnim, { toValue: 1.2, duration: 600, useNativeDriver: true }),
          Animated.timing(badgePulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      badgePulseAnim.setValue(1);
    }
  }, [unreadCount]);

  // Nasıl Çalışır butonunu gizleme tercihini yükle
  useEffect(() => {
    const loadHidePreference = async () => {
      try {
        const hidden = await AsyncStorage.getItem('hide_how_it_works_button');
        if (hidden === 'true') setHideHowItWorks(true);
      } catch (e) { }
    };
    if (isElectrician) loadHidePreference();
  }, [isElectrician]);

  // Interpolate border color through RGB spectrum
  const animatedBorderColor = borderColorAnim.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: ['#3B82F6', '#8B5CF6', '#EC4899', '#F97316', '#3B82F6'] // Blue -> Purple -> Pink -> Orange -> Blue
  });

  const getMissingItems = () => {
    const missing = [];

    // Belge onayı ustalar için en öncelikli olanı (Ödül için kritik)
    if (isElectrician && !user?.isVerified && verificationStatus !== 'VERIFIED') {
      // Eğer belge gönderilmiş ama henüz onaylanmamışsa (PENDING)
      if (verificationStatus === 'PENDING') {
        missing.push({ id: 'verification', label: 'Belge Onayı (İnceleniyor)', icon: 'time-outline', route: '/profile/verification', isPending: true });
      } else {
        missing.push({ id: 'verification', label: 'Belge Onayı', icon: 'shield-checkmark-outline', route: '/profile/verification' });
      }
    }

    if (!user?.fullName || user.fullName.trim() === '') {
      missing.push({ id: 'fullName', label: 'Ad Soyad', icon: 'person-outline', route: '/profile/edit' });
    }

    if (!user?.phone || user.phone.trim() === '') {
      missing.push({ id: 'phone', label: 'Telefon Numarası', icon: 'call-outline', route: '/profile/edit' });
    }

    if (!user?.profileImageUrl) {
      missing.push({ id: 'avatar', label: 'Profil Fotoğrafı', icon: 'camera-outline', route: '/profile/edit' });
    }

    if (isElectrician) {
      if (!user?.electricianProfile?.experienceYears) {
        missing.push({ id: 'experience', label: 'Deneyim Yılı', icon: 'time-outline', route: '/profile/edit' });
      }
      if (!user?.electricianProfile?.specialties || user.electricianProfile.specialties.length === 0) {
        missing.push({ id: 'specialties', label: 'Uzmanlık Alanları', icon: 'construct-outline', route: '/profile/edit' });
      }
      if (locationsCount === 0) {
        missing.push({ id: 'serviceAreas', label: 'Hizmet Bölgeleri', icon: 'location-outline', route: '/profile/addresses' });
      }
    } else {
      // Vatandaşlar için adres bilgisi
      if (locationsCount === 0) {
        missing.push({ id: 'addresses', label: 'Adres Bilgisi', icon: 'location-outline', route: '/profile/addresses' });
      }
    }

    return missing;
  };

  const missingItems = getMissingItems();

  // Animation for Emergency Button Pulse
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Animation for Emergency Button Shimmer (Reflection)
  const shimmerAnim = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    const runShimmer = () => {
      shimmerAnim.setValue(-1);
      Animated.timing(shimmerAnim, {
        toValue: 2,
        duration: 2000,
        useNativeDriver: true,
      }).start(() => {
        setTimeout(runShimmer, 3000);
      });
    };
    runShimmer();
  }, []);

  // Draggable Logic (PanResponder)
  const pan = useRef(new Animated.ValueXY()).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only start dragging if moves more than 2px (prevents accidental drags on press)
        return Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2;
      },
      onPanResponderGrant: () => {
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: () => {
        pan.flattenOffset();
      },
    })
  ).current;

  useEffect(() => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]).start(() => pulse());
    };

    pulse();
  }, []);

  // Calculate profile completion (Example logic)
  const calculateCompletion = () => {
    let score = 20; // Kayıt bonusu
    if (user?.fullName && user.fullName.trim() !== '') score += 10;
    if (user?.profileImageUrl) score += 10;
    if (userCities.length > 0) score += 10;
    if (user?.email) score += 10;
    // Telefon numarası kayıt esnasında zorunlu olduğu için puanı buralara dağıtıldı

    if (isElectrician) {
      // Ustalar için mesleki alanlar
      if (user?.phone) score += 10;
      if (user?.electricianProfile?.experienceYears) score += 10;
      if (user?.electricianProfile?.specialties && user.electricianProfile.specialties.length > 0) score += 10;
      if (locationsCount > 0) score += 10;
      // Belge gönderildiyse veya onaylandıysa puan ver
      if (user?.isVerified || verificationStatus === 'VERIFIED' || verificationStatus === 'PENDING') score += 10;
    } else {
      // Vatandaşlar için
      if (user?.phone) score += 20; 
      if (locationsCount > 0) score += 30; // Strong focus on address
    }

    return Math.min(score, 100);
  };

  const completionPercent = calculateCompletion();

  const fetchNewJobsCount = useCallback(async () => {
    if (!isAuthenticated || !isElectrician) return;
    try {
      // Filter by user's service category (profession)
      const serviceCategory = user?.electricianProfile?.serviceCategory || 'elektrik';
      const result = await jobService.getJobs({ limit: 50, serviceCategory });

      if (result && result.jobs) {
        const last24Hours = Date.now() - 24 * 60 * 60 * 1000;
        const newJobs = result.jobs.filter((job: any) => {
          const jobDate = new Date(job.createdAt).getTime();
          return jobDate >= last24Hours;
        });
        setNewJobsCount(newJobs.length);
      }
    } catch (error) {
      console.error('Error fetching new jobs count:', error);
    }
  }, [isAuthenticated, isElectrician, user]);

  // Kullanıcının konumunu/şehrini ve hizmet bölgelerini yükle
  const initializationRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      const refreshStatus = async () => {
        try {
          const [locRes, verRes] = await Promise.all([
            api.get(`${API_ENDPOINTS.LOCATIONS}?t=${Date.now()}`),
            authService.getVerificationStatus().catch(() => ({ data: { status: null } }))
          ]);
          
          if (locRes.data.success) {
            setLocationsCount(locRes.data.data.length);
            const cities = locRes.data.data.map((l: any) => l.city).filter(Boolean);
            setUserCities(cities);
          }
          
          if (verRes.data?.status) {
            setVerificationStatus(verRes.data.status);
          }
        } catch (e) {
          console.log('Error refreshing status on focus:', e);
        }
      };

      if (initializationRef.current && isAuthenticated) {
        // Refresh necessary data on every focus
        fetchNewJobsCount();
        refreshStatus();
        return;
      }

      const runInitialization = async () => {
        if (!isAuthenticated) {
          setIsInitialized(true);
          return;
        }

        initializationRef.current = true;

        try {
          console.log('🚀 [Home] Initializing data...');
          
          const fetchLocations = async () => {
            try {
              const response = await api.get(`${API_ENDPOINTS.LOCATIONS}?t=${Date.now()}`);
              if (response.data.success && response.data.data.length > 0) {
                const locations = response.data.data;
                const cities = locations.map((l: any) => l.city).filter(Boolean);
                setUserCities(cities);
                setLocationsCount(locations.length);
              }
            } catch (error) {
              console.log('Error fetching locations count:', error);
            }
          };

          const fetchVerification = async () => {
            try {
              const response = await authService.getVerificationStatus();
              setVerificationStatus(response.data?.status || null);
            } catch (vError) {
              console.log('Error fetching verification status:', vError);
            }
          };

          const checkPushStatus = async () => {
            try {
              const { Platform } = await import('react-native');
              const Notifications = await import('expo-notifications');
              const { status } = await Notifications.getPermissionsAsync();
              if (status === 'granted') {
                await AsyncStorage.setItem('push_activated', 'true');
                setShowPushBanner(false);
                if (!user?.isImpersonated) {
                  authService.registerPushToken().catch(() => {});
                }
                return;
              }
              await AsyncStorage.removeItem('push_activated');
              setShowPushBanner(true);
            } catch (e) { }
          };
          
          await Promise.all([
            fetchLocations(),
            fetchVerification(),
            fetchNewJobsCount(),
            checkPushStatus()
          ]);
          
          setIsInitialized(true);
          console.log('✅ [Home] Initialization complete');
        } catch (err) {
          console.error('[Home] Initialization error:', err);
          setIsInitialized(true);
        }
      };

      runInitialization();
    }, [isAuthenticated, isElectrician])
  );



  // AppState listener: auto-detect when user returns from system settings
  // If notification permission was just granted, auto-hide banner & register token
  useEffect(() => {
    if (!isAuthenticated) return;

    const subscription = AppState.addEventListener('change', async (nextState) => {
      if (nextState === 'active' && showPushBanner) {
        try {
          const Constants = (await import('expo-constants')).default;
          if (Platform.OS === 'android' && Constants.appOwnership === 'expo') return;

          const Notifications = await import('expo-notifications');
          const { status } = await Notifications.getPermissionsAsync();

          if (status === 'granted') {
            console.log('🔔 [HomeScreen] Permission granted after returning from settings — registering token...');
            await AsyncStorage.setItem('push_activated', 'true');
            setShowPushBanner(false);
            if (!user?.isImpersonated) {
              await authService.registerPushToken();
              try { await api.put('/users/notification-preferences', { pushEnabled: true }); } catch (e) { }
            }
          }
        } catch (e) {
          console.warn('AppState permission check error:', e);
        }
      }
    });

    return () => subscription.remove();
  }, [isAuthenticated, showPushBanner]);

  // Separate useEffect for fetching featured electricians
  useEffect(() => {
    if (isElectrician || !isInitialized) return;

    const fetchFeaturedElectricians = async () => {
      setIsLoadingElectricians(true);
      try {
        let cityToSearch = userCities.length > 0 ? userCities[0] : undefined;
        let response = await userService.getElectricians({ city: cityToSearch });

        // Fallback: If city-specific search returns no one or no city was provided, fetch all top-rated electricians
        if (!response.success || !response.data || (response.data as any[]).length === 0) {
          if (cityToSearch) {
            console.log(`[Home] No electricians in ${cityToSearch}, falling back to global search...`);
            response = await userService.getElectricians({});
          }
        }

        if (response.success && response.data) {
          // Sort by rating and take top 5
          const sorted = (response.data as any[])
            .sort((a, b) => {
              const ratingA = a.electricianProfile?.ratingAverage || a.electricianProfile?.rating || 0;
              const ratingB = b.electricianProfile?.ratingAverage || b.electricianProfile?.rating || 0;
              return ratingB - ratingA;
            })
            .slice(0, 5);
          setFeaturedElectricians(sorted);
        }
      } catch (error) {
        console.log('Error fetching featured electricians:', error);
        setFeaturedElectricians([]);
      } finally {
        setIsLoadingElectricians(false);
      }
    };

    fetchFeaturedElectricians();
  }, [isElectrician, isInitialized, userCities]); // Refetch if city changes

  // Real-time refresh of new jobs count and unread count when notifications change
  useEffect(() => {
    if (!isAuthenticated) return;

    // Log for debugging
    console.log(`🔔 [HomeScreen] Notification update detected. List size: ${notifications.length}, Unread: ${unreadCount}`);

    // If a new job notification arrived, refresh the jobs count
    const hasNewJobNotif = notifications.length > 0 &&
      notifications[0].type === 'new_job_available' &&
      !notifications[0].isRead;

    if (hasNewJobNotif && isElectrician) {
      fetchNewJobsCount();
    }
  }, [notifications.length, isAuthenticated, isElectrician, fetchNewJobsCount]);

  // Socket setup moved to global _layout.tsx
  // Socket setup moved to global _layout.tsx
  // No longer fetching notifications here to avoid double fetch and potential loops

  const handleActionWithAuth = (path: string, params?: any) => {
    if (!isAuthenticated) {
      setPendingAction({ path, params });
      setShowAuthModal(true);
      return;
    }
    try {
      router.push({ pathname: path as any, params });
    } catch (navError) {
      console.error('[HomeScreen] Navigation error:', path, navError);
      // Fallback: try without params
      try {
        router.push(path as any);
      } catch {
      }
    }
  };

  // SAFETY CHECK: Prevent crash on reload when user is not yet loaded
  if (isAuthenticated && !user) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 20, color: colors.textSecondary, fontFamily: fonts.medium }}>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundLight }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Premium Welcome Header with Background Image and Enhanced Decoration */}
        <View style={styles.premiumHeaderContainer}>
          <ImageBackground
            source={require('../../assets/images/header_bg.png')}
            style={styles.premiumHeader}
            imageStyle={styles.headerImage}
          >
            {/* Amethyst Gradient Overlay */}
            <LinearGradient
              colors={isElectrician
                ? [colors.primary + 'AA', colors.primary + 'F2']
                : (colors.gradientHeaderAmethyst as any) || [colors.primary + '88', colors.primaryLight + 'DD']
              }
              style={StyleSheet.absoluteFill}
            />

            {/* Amethyst Glow Decorative Circles */}
            <View style={[styles.headerDecorativeCircle1, !isElectrician && { backgroundColor: colors.glowAmethystSoft || 'rgba(167, 139, 250, 0.15)' }]} />
            <View style={[styles.headerDecorativeCircle2, !isElectrician && { backgroundColor: colors.glassPurple || 'rgba(139, 92, 246, 0.15)' }]} />
            <View style={[styles.headerDecorativeCircle3, !isElectrician && { backgroundColor: colors.glowAmethyst || 'rgba(139, 92, 246, 0.3)' }]} />

            <View style={styles.headerTopRow}>
              {!isAuthenticated && (
                <TouchableOpacity
                  style={styles.headerIconButton}
                  onPress={() => router.canGoBack() ? router.back() : router.replace('/(auth)/welcome')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-back" size={24} color={colors.white} />
                </TouchableOpacity>
              )}

              <View style={[styles.headerTitleContainer, isAuthenticated && { marginLeft: 0 }]}>
                <Text style={styles.welcomeName}>Merhaba, {user?.fullName?.split(' ')[0] || 'Misafir'}</Text>
              </View>


              {/* Always show notification button for debugging */}
              <TouchableOpacity
                style={styles.headerLinkButton}
                activeOpacity={0.7}
                onPress={() => handleActionWithAuth('/profile/notifications')}
              >
                <Ionicons name="notifications-outline" size={24} color={colors.white} />
                {unreadCount > 0 && (
                  <Animated.View style={[styles.notificationBadge, { transform: [{ scale: badgePulseAnim }] }]}>
                    <Text style={styles.notificationBadgeText}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Text>
                  </Animated.View>
                )}
              </TouchableOpacity>


              <TouchableOpacity
                style={styles.profileAvatarButton}
                activeOpacity={0.7}
                onPress={() => handleActionWithAuth('/profile')}
              >
                {user?.profileImageUrl ? (
                  <Image source={{ uri: getFileUrl(user.profileImageUrl) || '' }} style={styles.headerAvatar} />
                ) : (
                  <View style={styles.headerAvatarPlaceholder}>
                    <Ionicons name="person" size={20} color={colors.primary} />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </ImageBackground>
        </View>

        {/* Push Notification Banner — Fallback for users who dismissed the initial popup */}
        {showPushBanner && isAuthenticated && (
          <View style={[styles.bannerWrapper, { marginTop: 16, marginBottom: -4 }]}>
            <View
              style={[styles.profileHealthCard, { backgroundColor: '#FFFBEB', borderColor: '#F59E0B', borderWidth: 1.5 }]}
            >
              <View style={styles.healthCardContent}>
                <View style={[styles.healthIconContainer, { backgroundColor: '#F59E0B' }]}>
                  <Ionicons name="notifications-off" size={24} color="#FFF" />
                </View>
                <View style={[styles.healthTextContainer, { flex: 1 }]}>
                  <Text style={[styles.healthTitle, { color: '#B45309', fontSize: 14 }]}>Bildirimler Kapalı 🔕</Text>
                  <Text style={[styles.healthSubtitle, { color: '#D97706', fontSize: 12 }]} numberOfLines={2}>
                    İş fırsatlarını ve mesajları kaçırmayın!
                  </Text>
                </View>
                <TouchableOpacity
                  style={{ backgroundColor: '#F59E0B', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  activeOpacity={0.8}
                  onPress={() => {
                    // Deep link directly to the app's notification settings on the OS
                    Linking.openSettings();
                  }}
                >
                  <Text style={{ color: '#FFF', fontFamily: fonts.bold, fontSize: 13 }}>Ayarları Aç</Text>
                  <Ionicons name="open-outline" size={14} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Unified Profile Health Banner - with RGB Border Animation */}
        {
          isInitialized && isAuthenticated && completionPercent < 100 && (
            <View style={styles.bannerWrapper}>
              {/* RGB Animated Border Wrapper */}
              <Animated.View style={[styles.rgbBorderWrapper, { borderColor: animatedBorderColor }]}>
                <TouchableOpacity
                  style={styles.profileHealthCard}
                  activeOpacity={0.9}
                  onPress={() => setShowCompletionModal(true)}
                >
                  <View style={styles.healthCardContent}>
                    <View style={[styles.healthIconContainer, isElectrician && { backgroundColor: '#3B82F6' }]}>
                      <Ionicons name={isElectrician ? "rocket" : "location"} size={24} color={staticColors.white} />
                    </View>

                    <View style={styles.healthTextContainer}>
                      <Text style={styles.healthTitle}>{isElectrician ? 'Hesabını Tamamla' : 'Profil Sağlığı'}</Text>
                      <Text style={styles.healthSubtitle}>
                        {isElectrician
                          ? 'Profilini tamamla, iş alma şansını %50 artır.'
                          : 'Adres ve fotoğraf ekle, usta bulman kolaylaşsın.'}
                      </Text>
                    </View>

                    <Animated.View
                      style={[
                        styles.healthActionButton,
                        isElectrician && { backgroundColor: '#2563EB' },
                        { transform: [{ scale: healthPulseAnim }] }
                      ]}
                    >
                      <Text style={styles.healthActionText}>{isElectrician ? 'GİT' : 'BAŞLA'}</Text>
                      <Ionicons name="flash" size={14} color={staticColors.white} />
                    </Animated.View>
                  </View>

                  {/* Orange/Blue Progress Bar */}
                  <View style={styles.healthProgressRow}>
                    <View style={styles.healthProgressBarBg}>
                      <View style={[styles.healthProgressBarFill, { width: `${completionPercent}%` }, isElectrician && { backgroundColor: '#3B82F6' }]} />
                    </View>
                    <Text style={styles.healthProgressPercent}>%{completionPercent}</Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            </View>
          )
        }


        {/* Electrician Quick Actions (RESTORED) */}
        {isElectrician && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleContainer}>
                <Text style={styles.sectionTitle}>Hızlı İşlemler</Text>
                <Text style={styles.sectionSubtitle}>İşlerini ve profilini buradan yönet</Text>
              </View>
              {!hideHowItWorks && (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TouchableOpacity
                    onPress={() => setIsHowItWorksVisible(true)}
                    activeOpacity={0.8}
                  >
                    <Animated.View
                      style={{
                        borderRadius: 20,
                        overflow: 'hidden',
                        borderWidth: 1.5,
                        borderColor: borderColorAnim.interpolate({
                          inputRange: [0, 0.25, 0.5, 0.75, 1],
                          outputRange: ['#3B82F6', '#8B5CF6', '#EC4899', '#8B5CF6', '#3B82F6']
                        }),
                        shadowColor: borderColorAnim.interpolate({
                          inputRange: [0, 0.25, 0.5, 0.75, 1],
                          outputRange: ['#3B82F6', '#8B5CF6', '#EC4899', '#8B5CF6', '#3B82F6']
                        }),
                        shadowOffset: { width: 0, height: 0 },
                        shadowOpacity: 0.8,
                        shadowRadius: 8,
                        elevation: 6,
                      }}
                    >
                      <LinearGradient
                        colors={['#1E293B', '#0F172A']} // Dark base for neon contrast
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingVertical: 5,
                          paddingLeft: 8,
                          paddingRight: 4,
                          gap: 4,
                        }}
                      >
                        <Ionicons name="bulb" size={12} color="#4ADE80" />
                        <Text style={{ fontFamily: fonts.bold, fontSize: 10, color: '#FFFFFF' }}>Nasıl Çalışır?</Text>
                        <TouchableOpacity
                          onPress={async () => {
                            try {
                              await AsyncStorage.setItem('hide_how_it_works_button', 'true');
                              setHideHowItWorks(true);
                            } catch (e) { }
                          }}
                          hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
                          style={{
                            marginLeft: 2,
                            width: 14,
                            height: 14,
                            borderRadius: 7,
                            backgroundColor: 'rgba(255, 255, 255, 0.25)',
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >
                          <Ionicons name="close" size={9} color="#FFFFFF" />
                        </TouchableOpacity>
                      </LinearGradient>
                    </Animated.View>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.electricianQuickCards}>
              <TouchableOpacity
                style={styles.glassCardFull}
                onPress={() => handleActionWithAuth('/(tabs)/jobs', { tab: 'all' })}
                activeOpacity={0.7}
              >
                <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.cardIconWrapper}>
                  <Ionicons name="search" size={24} color="#FFF" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardMainTitle}>Yeni İşler</Text>
                  <Text style={styles.cardMainSubtitle}>Son 24 saatte {newJobsCount} yeni iş fırsatı var</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.glassCardFull}
                onPress={() => handleActionWithAuth('/(tabs)/jobs', { tab: 'bids' })}
                activeOpacity={0.7}
              >
                <LinearGradient colors={['#10B981', '#059669']} style={styles.cardIconWrapper}>
                  <Ionicons name="pricetag" size={24} color="#FFF" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardMainTitle}>Tekliflerim</Text>
                  <Text style={styles.cardMainSubtitle}>Verdiğin teklifleri takip et</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.glassCardFull}
                onPress={() => handleActionWithAuth('/electrician/stats')}
                activeOpacity={0.7}
              >
                <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.cardIconWrapper}>
                  <Ionicons name="stats-chart" size={24} color="#FFF" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardMainTitle}>İstatistiklerim</Text>
                  <Text style={styles.cardMainSubtitle}>Performansını ve kazancını gör</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
              </TouchableOpacity>

            </View>

            {/* Professional Tools Section */}
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleContainer}>
                <Text style={styles.sectionTitle}>Profesyonel Araçlar</Text>
                <Text style={styles.sectionSubtitle}>İşini kolaylaştıran pratik araçlar</Text>
              </View>
            </View>

            <View style={styles.toolsGridTwo}>
              <TouchableOpacity
                style={styles.toolCardHalf}
                onPress={() => handleActionWithAuth('/tools/quote')}
                activeOpacity={0.85}
              >
                <LinearGradient colors={['#10B981', '#059669']} style={styles.toolIconBox}>
                  <Ionicons name="document-text" size={28} color="#FFF" />
                </LinearGradient>
                <Text style={styles.toolCardTitle}>Teklif Hazırla</Text>
                <Text style={styles.toolCardDesc}>PDF oluştur ve paylaş</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.toolCardHalf}
                onPress={() => handleActionWithAuth('/tools/calendar')}
                activeOpacity={0.85}
              >
                <LinearGradient colors={['#8B5CF6', '#7C3AED']} style={styles.toolIconBox}>
                  <Ionicons name="calendar" size={28} color="#FFF" />
                </LinearGradient>
                <Text style={styles.toolCardTitle}>İş Takvimim</Text>
                <Text style={styles.toolCardDesc}>Planla ve hatırlat</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.toolCardHalf}
                onPress={() => handleActionWithAuth('/tools/ledger')}
                activeOpacity={0.85}
              >
                <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.toolIconBox}>
                  <Ionicons name="wallet" size={28} color="#FFF" />
                </LinearGradient>
                <Text style={styles.toolCardTitle}>Hesap Defteri</Text>
                <Text style={styles.toolCardDesc}>Alacak-verecek takibi</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Main Service Categories Section (Citizen Only) - NEW */}
        {
          !isElectrician && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleContainer}>
                  <Text style={[styles.sectionKicker, { color: colors.textLight }]}>Hizmet Seçimi</Text>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Usta bul</Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.headerProjectAction}
                  onPress={() => handleActionWithAuth('/jobs/create', { category: 'Elektrik Proje Çizimi', serviceCategory: 'elektrik' })}
                >
                  <LinearGradient
                    colors={['#A78BFA', '#7C3AED']} // Matches Electric Category
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.headerProjectGradient}
                  >
                    <View style={styles.headerProjectIconWrapper}>
                      <Ionicons name="flash" size={10} color="#FBBF24" />
                    </View>
                    <Text style={styles.headerProjectText}>Elektrik Proje Çizimi</Text>
                    <Ionicons name="chevron-forward" size={12} color="rgba(255,255,255,0.7)" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              <View style={styles.serviceCategoryGrid}>
                {SERVICE_CATEGORIES.map((cat, index) => (
                  <ServiceCategoryItem
                    key={cat.id}
                    cat={cat}
                    index={index}
                    onPress={(id: string) => handleActionWithAuth('/jobs/create', { serviceCategory: id })}
                    styles={styles}
                    colors={colors}
                  />
                ))}
              </View>
            </View>
          )
        }



        {
          !isElectrician && (
            <View style={styles.section}>
              <View style={styles.sectionBlock}>
                <Text style={[styles.sectionKicker, { color: colors.textLight }]}>Popüler</Text>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Hızlı erişim</Text>
                  <TouchableOpacity onPress={() => router.push('/categories')}>
                    <Text style={[styles.seeAll, { color: colors.primary }]}>Tümü</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryScroller}
              >
                <TouchableOpacity
                  style={styles.categoryItemMatch}
                  onPress={() => handleActionWithAuth('/jobs/create', { category: 'Elektrik Proje Çizimi', serviceCategory: 'elektrik' })}
                  activeOpacity={0.85}
                >
                  <View style={[styles.categoryIconCircleMinimal, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]}>
                    <Ionicons name="document-text" size={22} color="#7C3AED" />
                  </View>
                  <Text style={[styles.categoryLabelMatch, { color: colors.textSecondary }]}>Elektrik Proje</Text>
                </TouchableOpacity>

                {[
                  { id: 'avize-montaj', name: 'Avize Montajı', icon: 'bulb', color: colors.primary }, // filled
                  { id: 'kapi-acma', name: 'Kapı Açma', icon: 'lock-open', color: '#F59E0B' }, // filled
                  { id: 'klima-montaj', name: 'Klima Montaj', icon: 'snow', color: '#3B82F6' }, // filled
                  { id: 'tikaniklik', name: 'Tıkanıklık Açma', icon: 'water', color: '#0284C7' }, // filled
                  { id: 'buzdolabi', name: 'Buzdolabı Tamiri', icon: 'cube', color: '#16A34A' }, // filled
                ].map((cat, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.categoryItemMatch}
                    onPress={() => handleActionWithAuth('/jobs/create', { category: cat.name })}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.categoryIconCircleMinimal, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]}>
                      <Ionicons name={cat.icon as any} size={22} color={cat.color} />
                    </View>
                    <Text style={[styles.categoryLabelMatch, { color: colors.textSecondary }]}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )
        }


        {
          !isElectrician && (
            <View style={styles.section}>
              <View style={styles.sectionBlock}>
                <Text style={[styles.sectionKicker, { color: colors.textLight }]}>Öne Çıkan</Text>
                <View style={styles.sectionHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Ustalar</Text>
                    <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>En yüksek puanlı ve güvenilir uzmanlar</Text>
                  </View>
                  <TouchableOpacity onPress={() => router.push('/electricians')}>
                    <Text style={[styles.seeAll, { color: colors.primary }]}>Tümü</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.featuredVerticalList}>
                {isLoadingElectricians ? (
                  <View style={{ padding: 40, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={{ marginTop: 10, color: staticColors.textSecondary, fontFamily: fonts.medium }}>Ustalar yükleniyor...</Text>
                  </View>
                ) : featuredElectricians.length > 0 ? (
                  featuredElectricians.map((elec) => (
                    <FeaturedElectrician
                      key={elec.id}
                      name={elec.fullName || 'Usta'}
                      rating={elec.electricianProfile?.ratingAverage || elec.electricianProfile?.rating || 0}
                      reviewCount={elec.electricianProfile?.totalReviews || elec.electricianProfile?.reviewCount || 0}
                      specialty={getUstaCategory(elec)}
                      isVerified={elec.isVerified === true && elec.electricianProfile?.verificationStatus === 'VERIFIED'}
                      imageUrl={elec.profileImageUrl ? getFileUrl(elec.profileImageUrl) || undefined : undefined}
                      location={elec.locations?.[0] ? `${elec.locations[0].district || ''}, ${elec.locations[0].city || ''}`.replace(/^, /, '').replace(/, $/, '') || 'Türkiye' : 'Türkiye'}
                      onPress={() => router.push(`/electricians/${elec.id}` as any)}
                      onBook={() => handleActionWithAuth('/jobs/create', { electricianId: elec.id })}
                    />
                  ))
                ) : (
                  <View style={{ padding: 40, alignItems: 'center' }}>
                    <Ionicons name="people-outline" size={36} color={colors.textLight} />
                    <Text style={{ marginTop: 12, color: colors.textSecondary, fontFamily: fonts.medium, textAlign: 'center' }}>
                      Şu an için öne çıkan usta bulunmuyor.
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )
        }

        {/* How It Works Modal */}
        <Modal
          visible={isHowItWorksVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsHowItWorksVisible(false)}
        >
          <View style={styles.hiwModalOverlay}>
            <View style={styles.hiwModalContent}>
              <View style={styles.hiwHeader}>
                <Text style={styles.hiwTitle}>{isElectrician ? 'Ustalar İçin Süreç' : 'Nasıl Çalışır?'}</Text>
                <TouchableOpacity onPress={() => setIsHowItWorksVisible(false)} style={styles.hiwCloseBtn}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.hiwSteps}>
                {(isElectrician ? [
                  { id: 1, title: 'Bölgeni Seç', desc: 'Profilinden hizmet vermek istediğin ilçeleri seçerek yalnızca sana uygun yeni iş bildirimlerini al.', icon: 'map-outline', color: '#8B5CF6' },
                  { id: 2, title: 'İşleri İncele', desc: 'Açılan ilanların tahmini bütçesini, arıza fotoğraflarını ve konumunu değerlendir.', icon: 'search-outline', color: '#3B82F6' },
                  { id: 3, title: 'Teklif Ver', desc: 'Ne kadar sürede yapabileceğini ve rekabetçi fiyatını belirterek müşteriye teklifini sun.', icon: 'document-text-outline', color: '#F59E0B' },
                  { id: 4, title: 'İletişim & Teslim', desc: 'Müşteri teklifini onayladığında, uygulama üzerinden yazış veya arayarak işi temizce teslim et.', icon: 'checkmark-circle-outline', color: '#10B981' },
                ] : [
                  { id: 1, title: 'İlan Ver', desc: 'İhtiyacını anlat, ilanını ücretsiz oluştur.', icon: 'create-outline', color: '#3B82F6' },
                  { id: 2, title: 'Teklif Al', desc: 'Bölgenin ustalarından fiyat al.', icon: 'chatbubbles-outline', color: '#8B5CF6' },
                  { id: 3, title: 'Seçim Yap', desc: 'Puanlara bak, konuş ve en iyisini seç.', icon: 'checkmark-done-circle-outline', color: '#10B981' },
                ]).map((step) => (
                  <View key={step.id} style={styles.hiwStepRow}>
                    <View style={[styles.hiwStepIcon, { backgroundColor: step.color + '15' }]}>
                      <Ionicons name={step.icon as any} size={24} color={step.color} />
                    </View>
                    <View style={styles.hiwStepText}>
                      <Text style={styles.hiwStepTitle}>{step.id}. {step.title}</Text>
                      <Text style={styles.hiwStepDesc}>{step.desc}</Text>
                    </View>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={styles.hiwButton}
                onPress={() => {
                  setIsHowItWorksVisible(false);
                  if (isElectrician) {
                    router.push('/(tabs)/jobs');
                  } else {
                    handleActionWithAuth('/jobs/create');
                  }
                }}
              >
                <Text style={styles.hiwButtonText}>{isElectrician ? 'İlanlara Göz At' : 'Hemen İlan Ver'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <AuthGuardModal
          visible={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onLogin={() => {
            setShowAuthModal(false);
            router.push({
              pathname: '/(auth)/login',
              params: pendingAction ? { redirectTo: pendingAction.path } : undefined
            });
          }}
          onRegister={(role) => {
            setShowAuthModal(false);
            if (role === 'ELECTRICIAN') {
              router.push({
                pathname: '/(auth)/role-select',
                params: {
                  initialRole: 'ELECTRICIAN',
                  redirectTo: pendingAction?.path || undefined
                }
              });
            } else {
              router.push({
                pathname: '/(auth)/register',
                params: {
                  type: role,
                  ...(pendingAction ? { redirectTo: pendingAction.path } : {})
                }
              });
            }
          }}
        />

        {/* Profile Completion Checklist Modal */}
        {
          showCompletionModal && (
            <View style={styles.modalOverlay}>
              <LinearGradient
                colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
                style={styles.completionModal}
              >
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>
                      {isElectrician ? 'Profilini Güçlendir' : 'Hemen Başla'}
                    </Text>
                    <Text style={styles.modalSubtitle}>
                      {isElectrician
                        ? 'Bilgilerini tamamla, %50 daha fazla teklif al.'
                        : 'Bilgilerini tamamla, ustaların güvenini kazan.'}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setShowCompletionModal(false)} style={styles.closeBtn}>
                    <Ionicons name="close" size={24} color={colors.textLight} />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalProgressSection}>
                  <View style={styles.modalProgressHeader}>
                    <Text style={styles.modalProgressPercent}>%{completionPercent}</Text>
                    <Text style={styles.modalProgressLabel}>Tamamlandı</Text>
                  </View>
                  <View style={styles.modalProgressBg}>
                    <View style={[styles.modalProgressFill, { width: `${completionPercent}%` }]} />
                  </View>
                </View>

                <ScrollView style={styles.checklistScroll} showsVerticalScrollIndicator={false}>
                  {missingItems.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.checklistItem, item.isPending && { opacity: 0.8 }]}
                      disabled={item.isPending}
                      onPress={() => {
                        setShowCompletionModal(false);
                        router.push(item.route as any);
                      }}
                    >
                      <View style={[styles.checklistIconBox, item.isPending && { backgroundColor: staticColors.warning + '10' }]}>
                        <Ionicons name={item.icon as any} size={20} color={item.isPending ? staticColors.warning : colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.checklistItemLabel}>{item.label}</Text>
                        {item.isPending && (
                          <Text style={{ fontSize: 10, color: staticColors.warning, fontFamily: fonts.medium }}>İnceleme devam ediyor...</Text>
                        )}
                      </View>
                      {!item.isPending && <Ionicons name="chevron-forward" size={16} color={colors.textLight} />}
                      {item.isPending && <View style={{ backgroundColor: staticColors.warning + '15', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ fontSize: 10, color: staticColors.warning, fontFamily: fonts.bold }}>İnceleniyor</Text>
                      </View>}
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <TouchableOpacity
                  style={styles.modalMainBtn}
                  onPress={() => {
                    setShowCompletionModal(false);
                    router.push('/profile/edit');
                  }}
                >
                  <LinearGradient
                    colors={[colors.primary, colors.primaryDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.modalMainBtnGradient}
                  >
                    <Text style={styles.modalMainBtnText}>Hemen Bilgilerini Düzenle</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          )
        }
      </ScrollView >

      {/* Floating Emergency Button (Citizen Only) */}
      {!isElectrician && (
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.floatingEmergencyWrapper,
            {
              transform: [
                { translateX: pan.x },
                { translateY: pan.y },
                { scale: pulseAnim }
              ]
            }
          ]}
        >
          <TouchableOpacity
            style={styles.floatingEmergencyButton}
            activeOpacity={0.9}
            // Delay press slightly to prioritize drag if moving
            delayPressIn={100}
            onPress={() => router.push('/jobs/quick-create')}
          >
            <LinearGradient
              colors={['#EF4444', '#DC2626']}
              style={styles.floatingEmergencyGradient}
            >
              {/* Sliding Shimmer Reflection */}
              <Animated.View
                style={[
                  styles.shimmerWrapper,
                  {
                    transform: [
                      {
                        translateX: shimmerAnim.interpolate({
                          inputRange: [-1, 2],
                          outputRange: [-150, 200]
                        })
                      },
                      { rotate: '25 deg' }
                    ]
                  }
                ]}
              >
                <LinearGradient
                  colors={['transparent', 'rgba(255, 255, 255, 0.4)', 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>

              {/* Static Glassy Highlight */}
              <View style={styles.staticGlassHighlight} />

              <Ionicons name="flash" size={28} color={staticColors.white} />
              <Text style={styles.floatingEmergencyText}>ACİL USTA</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Toast Notification */}
      {toastVisible && (
        <Animated.View style={[styles.toastContainer, { opacity: toastOpacity }]}>
          <LinearGradient
            colors={
              toastType === 'bid'
                ? ['#10B981', '#059669']
                : toastType === 'message'
                  ? ['#8B5CF6', '#7C3AED']
                  : [colors.primary, colors.primaryDark]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.toastGradient}
          >
            <Ionicons
              name={
                toastType === 'bid'
                  ? 'pricetag'
                  : toastType === 'message'
                    ? 'chatbubbles'
                    : 'notifications'
              }
              size={24}
              color={staticColors.white}
            />
            <Text style={styles.toastText} numberOfLines={2}>{toastMessage}</Text>
          </LinearGradient>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 180,
  },
  premiumHeaderContainer: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
    marginBottom: 0,
  },
  premiumHeader: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: spacing.lg,
    paddingBottom: 20,
    position: 'relative',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerIconButton: {
    padding: 4,
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center', // Vertically center text
  },
  profileAvatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  headerAvatar: {
    width: '100%',
    height: '100%',
  },
  headerAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: staticColors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerImage: {
    opacity: 0.3,
  },
  headerDecorativeCircle1: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerDecorativeCircle2: {
    position: 'absolute',
    top: 100,
    left: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerDecorativeCircle3: {
    position: 'absolute',
    top: 60,
    left: '40%',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  profileHealthCard: {
    backgroundColor: staticColors.white,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.1)',
  },
  healthCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  healthIconContainer: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#F59E0B', // Orange
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  healthTextContainer: {
    flex: 1,
  },
  healthTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: staticColors.black,
    marginBottom: 2,
  },
  healthSubtitle: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  healthActionButton: {
    backgroundColor: '#7C3AED', // Purple
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  healthActionText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: staticColors.white,
  },
  healthProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  healthProgressBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  healthProgressBarFill: {
    height: '100%',
    backgroundColor: '#F59E0B', // Orange
    borderRadius: 4,
  },
  sectionBlock: {
    marginBottom: 12,
    marginTop: 2,
  },
  sectionKicker: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    letterSpacing: 0.4,
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  categoryScroller: {
    paddingRight: 16,
    gap: 12,
  },
  categoryItemMatch: {
    alignItems: 'center',
    width: 76,
  },
  categoryLabelMatch: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 14,
    marginTop: 2,
  },
  fullEmergencyButton: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  fullEmergencyGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  fullEmergencyText: {
    fontFamily: fonts.extraBold,
    fontSize: 18,
    color: staticColors.white,
    letterSpacing: 1,
  },
  headerBackButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    marginRight: 12,
  },
  welcomeTextContainer: {
    flex: 1,
  },
  welcomeRowInner: {
    gap: 4,
  },
  welcomeLabel: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  welcomeName: {
    fontFamily: fonts.extraBold,
    fontSize: 22,
    color: staticColors.white,
    letterSpacing: -0.5,
  },
  notificationButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  notificationDot: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF4B2B',
    borderWidth: 2,
    zIndex: 1,
  },
  actionCardsRow: {
    flexDirection: 'row',
    gap: 0,
  },
  actionCardHalf: {
    flex: 1,
  },
  emergencyButtonCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 16,
    height: 50,
  },
  emergencyIconContainerCompact: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  emergencyTextContent: {
    flex: 1,
  },
  emergencyButtonTitleCompact: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: staticColors.white,
    marginBottom: 2,
  },
  emergencyButtonSubtitleCompact: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  premiumMapCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    paddingRight: 12,
    borderRadius: 16,
    height: 50,
  },
  mapIconGlow: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.15)', // Blue glow
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  premiumMapTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: staticColors.primary,
    marginBottom: 2,
  },
  premiumMapSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: staticColors.textSecondary,
  },
  mapArrowCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: staticColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glassActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    paddingRight: 12,
    borderRadius: 16,
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  statusIconContainerCompact: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  locationLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: staticColors.text,
  },
  bannerWrapper: {
    marginHorizontal: spacing.screenPadding,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  unifiedBannerContainer: {
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8,
  },
  unifiedBannerGlass: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  unifiedBannerBonusBorder: {
    borderColor: '#FBBF24', // Gold border for bonus
    borderWidth: 1.5,
  },
  neonBannerBorder: {
    borderColor: '#3B82F6',
    borderWidth: 1.5,
  },
  neonBannerBorderCitizen: {
    borderColor: '#7C3AED',
    borderWidth: 1.5,
  },
  neonShadow: {
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  neonShadowCitizen: {
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  unifiedContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  unifiedIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconBgBonus: {
    backgroundColor: '#F59E0B', // Amber
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  iconBgRegular: {
    backgroundColor: 'rgba(226, 232, 240, 0.5)', // Light Slate
  },
  unifiedTextContainer: {
    flex: 1,
  },
  unifiedTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: staticColors.text,
    marginBottom: 2,
  },
  neonTitle: {
    color: '#0F4C81', // Darker Sapphire for readability 
  },
  unifiedSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: staticColors.textSecondary,
    lineHeight: 15,
  },
  neonSubtitle: {
    color: '#3B82F6', // Vibrant Sapphire
    fontFamily: fonts.semiBold,
  },
  unifiedActionIcon: {
    marginLeft: 8,
  },
  unifiedProgressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  neonActionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  neonActionBadgeCitizen: {
    backgroundColor: '#7C3AED',
  },
  neonActionText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: staticColors.white,
  },
  unifiedProgressBg: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  unifiedProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  unifiedProgressText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: staticColors.textSecondary,
    width: 32,
    textAlign: 'right',
  },
  section: {
    marginVertical: spacing.md,
    paddingHorizontal: spacing.screenPadding,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    justifyContent: 'space-between',
  },
  sectionHeaderInner: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  titleIndicator: {
    width: 4,
    height: 24,
    borderRadius: 2,
    marginRight: spacing.sm,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  sectionTitleContainer: {
    flex: 1,
  },
  premiumProjectCard: {
    borderRadius: 20,
    padding: 14,
    overflow: 'hidden',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
    marginVertical: 4,
  },
  premiumCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
  },
  premiumCardTextCol: {
    flex: 1,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
    gap: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  premiumBadgeText: {
    color: '#FFF',
    fontSize: 8,
    fontFamily: fonts.extraBold,
    letterSpacing: 0.5,
  },
  premiumCardTitle: {
    color: '#FFF',
    fontSize: 17,
    fontFamily: fonts.bold,
    marginBottom: 2,
  },
  premiumCardDesc: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontFamily: fonts.medium,
    lineHeight: 15,
  },
  premiumCardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    alignSelf: 'flex-start',
    gap: 4,
  },
  premiumActionText: {
    color: '#FFF',
    fontSize: 12,
    fontFamily: fonts.bold,
  },
  premiumCardIconCol: {
    marginLeft: 10,
  },
  premiumIconBg: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  premiumIconBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    backgroundColor: '#FFF',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  premiumCardCircle1: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  premiumCardCircle2: {
    position: 'absolute',
    bottom: -30,
    left: -10,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: staticColors.text,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: staticColors.textSecondary,
  },
  seeAll: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: staticColors.primary,
    marginBottom: 2,
  },
  howItWorksHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  howItWorksHeaderBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    color: staticColors.primary,
  },
  electricianQuickCards: {
    gap: 12,
  },
  glassCardFull: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: staticColors.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: staticColors.borderLight,
    shadowColor: staticColors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardMainTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: staticColors.text,
    marginBottom: 4,
  },
  cardMainSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: staticColors.textSecondary,
  },
  heroActionCard: {
    borderRadius: 24,
    shadowColor: staticColors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  heroActionGradient: {
    padding: 20,
    justifyContent: 'center',
  },
  heroActionContent: {
    flexDirection: 'column',
    gap: 16,
  },
  heroActionTextSection: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  heroActionEmoji: {
    fontSize: 32,
  },
  heroActionTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 18,
    color: staticColors.text,
    marginBottom: 4,
  },
  heroActionSubtitle: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: staticColors.textSecondary,
    lineHeight: 18,
  },
  heroActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 8,
    alignSelf: 'stretch',
    backgroundColor: staticColors.primary,
    shadowColor: staticColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  heroActionButtonText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: staticColors.white,
  },
  featuredList: {
    paddingRight: spacing.lg,
    paddingVertical: 10,
    gap: 12,
  },
  // Modal Styles
  hiwModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  hiwModalContent: {
    width: '100%',
    backgroundColor: staticColors.white,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },
  hiwHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  hiwTitle: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: staticColors.text,
  },
  hiwCloseBtn: {
    padding: 4,
  },
  hiwSteps: {
    gap: 20,
    marginBottom: 24,
  },
  hiwStepRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
  },
  hiwStepIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hiwStepText: {
    flex: 1,
    paddingTop: 2,
  },
  hiwStepTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: staticColors.text,
    marginBottom: 4,
  },
  hiwStepDesc: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: staticColors.textSecondary,
    lineHeight: 18,
  },
  hiwButton: {
    backgroundColor: staticColors.primary,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: staticColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  hiwButtonText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: staticColors.white,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 1000,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  completionModal: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    padding: 24,
    paddingBottom: 40,
    backgroundColor: staticColors.white,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: staticColors.text,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: staticColors.textSecondary,
  },
  closeBtn: {
    padding: 4,
  },
  modalProgressSection: {
    marginBottom: 24,
  },
  modalProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalProgressPercent: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: staticColors.primary,
  },
  modalProgressLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: staticColors.textSecondary,
  },
  modalProgressBg: {
    height: 8,
    backgroundColor: staticColors.borderLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  modalProgressFill: {
    height: '100%',
    backgroundColor: staticColors.primary,
    borderRadius: 4,
  },
  checklistScroll: {
    marginBottom: 24,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: staticColors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: staticColors.borderLight,
    marginBottom: 12,
  },
  checklistIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checklistItemLabel: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: staticColors.text,
  },
  modalMainBtn: {
    shadowColor: staticColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  modalMainBtnGradient: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  modalMainBtnText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: staticColors.white,
  },
  featuredVerticalList: {
    gap: 4,
    marginTop: 6,
  },
  healthProgressPercent: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#64748B',
    width: 35,
  },
  // Floating Emergency Button Styles
  floatingEmergencyWrapper: {
    position: 'absolute',
    bottom: 140, // Moved higher to avoid tab bar overlap
    right: 20,
    zIndex: 9999,
    elevation: 10,
  },
  floatingEmergencyButton: {
    width: 100,
    height: 70,
    borderRadius: 20,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
  },
  floatingEmergencyGradient: {
    flex: 1,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    overflow: 'hidden',
  },
  floatingEmergencyText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: staticColors.white,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  shimmerWrapper: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 60,
    backgroundColor: 'transparent',
    opacity: 0.6,
  },
  staticGlassHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  headerLinkButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    marginRight: 10,
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#EF4444',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: 'rgba(239, 68, 68, 0.5)',
  },
  notificationBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontFamily: fonts.bold,
  },
  toastContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  toastGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  toastText: {
    flex: 1,
    color: staticColors.white,
    fontSize: 14,
    fontFamily: fonts.semiBold,
    lineHeight: 18,
  },
  rgbBorderWrapper: {
    borderWidth: 3,
    borderRadius: 20,
    padding: 2,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  toolsGridTwo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  toolCardHalf: {
    width: '30%',
    flexGrow: 1,
    backgroundColor: staticColors.white,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  toolIconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  toolCardTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: staticColors.text,
    textAlign: 'center',
  },
  toolCardDesc: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: staticColors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  serviceCategoryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingHorizontal: 4,
    gap: 6,
  },
  serviceCategoryCard: {
    width: '100%',
    aspectRatio: 0.62,
    backgroundColor: staticColors.white,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 1.5,
  },
  serviceCategoryIconBg: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  serviceCategoryImage: {
    width: '100%',
    height: '100%',
  },
  serviceCategoryName: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    textAlign: 'center',
    width: '100%',
    lineHeight: 14,
    paddingHorizontal: 2,
  },
  categoryIconCircleMinimal: {
    width: 52,
    height: 52,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1.5,
  },
  // Header Project Button Styles
  headerProjectAction: {
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#7C3AED', // Match Purple Glow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  headerProjectGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 5,
  },
  headerProjectIconWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerProjectText: {
    color: '#FFF',
    fontSize: 10.5,
    fontFamily: fonts.extraBold,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});
