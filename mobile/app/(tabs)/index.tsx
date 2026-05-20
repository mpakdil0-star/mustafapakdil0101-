import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, TouchableOpacity, Modal, ImageBackground, Image, Platform, Dimensions, PanResponder, Alert, ActivityIndicator, AppState, Linking, TextInput } from 'react-native';
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
import { CountdownTimer } from '../../components/common/CountdownTimer';
import * as ImagePicker from 'expo-image-picker';


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
  const [activeReelsIndex, setActiveReelsIndex] = useState(0);
  const [pushBannerLoading, setPushBannerLoading] = useState(false);
  const [activeHomeTab, setActiveHomeTab] = useState<'ustalar' | 'ilanlar'>('ustalar');
  const [recentJobs, setRecentJobs] = useState<any[]>([]);
  const [isLoadingRecentJobs, setIsLoadingRecentJobs] = useState(false);
  const [stats, setStats] = useState<any>(null);
  
  // Marketplace / Pazar Yeri States
  const [marketplaceProducts, setMarketplaceProducts] = useState([
    {
      id: 'prod-1',
      title: 'Makita Şarjlı Matkap 18V',
      price: 1750,
      category: 'El Aleti',
      sellerName: 'Mustafa Yılmaz (Usta)',
      sellerType: 'ELECTRICIAN',
      location: 'Kadıköy, İstanbul',
      desc: 'Çok temiz durumda, yedek bataryası ve şarj aletiyle birlikte verilecektir. İhtiyaç fazlasıdır.',
      date: 'Bugün',
    },
    {
      id: 'prod-2',
      title: 'Öznur 3x2.5 NYM Kablo (45m)',
      price: 850,
      category: 'Kablo',
      sellerName: 'Ahmet Kaya (Vatandaş)',
      sellerType: 'CITIZEN',
      location: 'Üsküdar, İstanbul',
      desc: 'Ev tadilatından kalan sıfır rulo bakır kablo. İhtiyacım olmadığı için satıyorum.',
      date: 'Bugün',
    },
    {
      id: 'prod-3',
      title: 'Siemens 16A Sigorta Kutusu (10 Adet)',
      price: 450,
      category: 'Şalt / Malzeme',
      sellerName: 'Bülent Tan (Usta)',
      sellerType: 'ELECTRICIAN',
      location: 'Beşiktaş, İstanbul',
      desc: 'Şantiyeden kalan sıfır kutusunda otomatik sigortalar. Toptan fiyatına verilecektir.',
      date: 'Dün',
    }
  ]);
  const [isAddProductModalVisible, setIsAddProductModalVisible] = useState(false);
  const [isProductDetailModalVisible, setIsProductDetailModalVisible] = useState(false);
  const [isAllProductsModalVisible, setIsAllProductsModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  
  // New Product Form States
  const [newProdTitle, setNewProdTitle] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('Kablo');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdImage, setNewProdImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Marketplace Search and Filtering States
  const [marketSearchQuery, setMarketSearchQuery] = useState('');
  const [marketSelectedFilter, setMarketSelectedFilter] = useState('');

  // AsyncStorage key for marketplace persistence
  const MARKETPLACE_STORAGE_KEY = 'marketplace_products_v1';

  // Load marketplace products: AsyncStorage first, then try backend sync
  const fetchMarketplaceProducts = async () => {
    try {
      // 1. Load from AsyncStorage (instant, always works)
      const stored = await AsyncStorage.getItem(MARKETPLACE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMarketplaceProducts(parsed);
        }
      }

      // 2. Try backend sync silently (optional — won't error if 404)
      try {
        const response = await api.get(API_ENDPOINTS.MARKETPLACE);
        if (response.data?.success && response.data.data && response.data.data.length > 0) {
          setMarketplaceProducts(response.data.data);
          await AsyncStorage.setItem(MARKETPLACE_STORAGE_KEY, JSON.stringify(response.data.data));
        }
      } catch (_backendErr) {
        // Backend doesn't support marketplace yet — silently ignore
      }
    } catch (error) {
      console.log('Marketplace load error:', error);
    }
  };

  // Save marketplace products to AsyncStorage
  const saveMarketplaceToStorage = async (products: any[]) => {
    try {
      await AsyncStorage.setItem(MARKETPLACE_STORAGE_KEY, JSON.stringify(products));
    } catch (_e) {
      // Silently ignore storage errors
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchMarketplaceProducts();
    }, [])
  );

  const handlePickProductImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        const base64Str = result.assets[0].base64 
          ? `data:image/jpeg;base64,${result.assets[0].base64}` 
          : result.assets[0].uri;
        setNewProdImage(base64Str);
      }
    } catch (error) {
      Alert.alert('Hata', 'Fotoğraf seçilirken bir hata oluştu.');
    }
  };

  const handleAddProduct = async () => {
    if (!newProdTitle.trim() || !newProdPrice.trim() || !newProdDesc.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen tüm alanları doldurun.');
      return;
    }

    const priceNum = parseFloat(newProdPrice);
    if (isNaN(priceNum)) {
      Alert.alert('Geçersiz Fiyat', 'Lütfen geçerli bir sayı girin.');
      return;
    }

    const userLocation = user?.city ? `${user.city}` : 'İstanbul';

    const newProduct = {
      id: `prod-${Date.now()}`,
      title: newProdTitle,
      price: priceNum,
      category: newProdCategory,
      sellerName: user?.fullName ? `${user.fullName} (${isElectrician ? 'Usta' : 'Vatandaş'})` : (isElectrician ? 'Mustafa Yılmaz (Usta)' : 'Ahmet Kaya (Vatandaş)'),
      sellerType: isElectrician ? 'ELECTRICIAN' : 'CITIZEN',
      location: userLocation,
      desc: newProdDesc,
      date: 'Bugün',
      image: newProdImage,
    };

    setIsUploadingImage(true);

    // Add to local state immediately
    const updatedProducts = [newProduct, ...marketplaceProducts];
    setMarketplaceProducts(updatedProducts);

    // Save to AsyncStorage for persistence
    await saveMarketplaceToStorage(updatedProducts);

    // Try backend sync silently (optional)
    try {
      const response = await api.post(API_ENDPOINTS.MARKETPLACE, newProduct);
      if (response.data?.success && response.data.data) {
        setMarketplaceProducts(response.data.data);
        await saveMarketplaceToStorage(response.data.data);
      }
    } catch (_e) {
      // Backend not available — already saved locally
    }

    setIsUploadingImage(false);
    setNewProdTitle('');
    setNewProdPrice('');
    setNewProdDesc('');
    setNewProdCategory('Kablo');
    setNewProdImage(null);
    setIsAddProductModalVisible(false);
    Alert.alert('Başarılı', 'İlanınız pazar yerinde başarıyla yayınlandı! 🚀');
  };

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
  const initializationRef = useRef(false);


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
  const fetchRecentJobs = useCallback(async () => {
    if (!isInitialized) return;
    setIsLoadingRecentJobs(true);
    try {
      let params: any = { limit: 10 };
      if (isElectrician) {
        params.serviceCategory = user?.electricianProfile?.serviceCategory || user?.serviceCategory || 'elektrik';
      }
      const result = await jobService.getJobs(params);
      if (result && result.jobs && result.jobs.length > 0) {
        setRecentJobs(result.jobs.slice(0, 10));
      } else {
        // Fallback: Fetch any available open jobs from database so the screen always shows REAL jobs
        const generalJobsResult = await jobService.getJobs({ limit: 10 });
        if (generalJobsResult && generalJobsResult.jobs) {
          setRecentJobs(generalJobsResult.jobs.slice(0, 10));
        } else {
          setRecentJobs([]);
        }
      }
    } catch (error) {
      console.log('Error fetching recent jobs:', error);
      setRecentJobs([]);
    } finally {
      setIsLoadingRecentJobs(false);
    }
  }, [isElectrician, isInitialized, user]);

  const fetchStats = useCallback(async () => {
    if (!isAuthenticated || !isElectrician) return;
    try {
      const response = await api.get('/users/stats');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('[HomeScreen] Error fetching stats:', error);
    }
  }, [isAuthenticated, isElectrician]);


  const fetchFeaturedElectricians = useCallback(async () => {
    if (isElectrician || !isInitialized) return;
    setIsLoadingElectricians(true);
    try {
      let cityToSearch = userCities.length > 0 ? userCities[0] : undefined;
      let response = await userService.getElectricians({ city: cityToSearch });

      if (!response.success || !response.data || (response.data as any[]).length === 0) {
        if (cityToSearch) {
          response = await userService.getElectricians({});
        }
      }

      if (response.success && response.data) {
        let sorted = (response.data as any[])
          .sort((a, b) => {
            const ratingA = a.electricianProfile?.ratingAverage || a.electricianProfile?.rating || 0;
            const ratingB = b.electricianProfile?.ratingAverage || b.electricianProfile?.rating || 0;
            return ratingB - ratingA;
          })
          .slice(0, 10); // Daha fazla veri çekip içinden bulalım

        // Özel istek: Ufuk Soydan ve Mehmet Cebiş yer değiştirsin (Ufuk ilk sırada olsun)
        const ufukIndex = sorted.findIndex(e => e.fullName?.toLowerCase() === 'ufuk soydan');
        const mehmetIndex = sorted.findIndex(e => e.fullName?.toLowerCase() === 'mehmet cebiş');

        if (ufukIndex !== -1 && mehmetIndex !== -1) {
          // İkisi de varsa yerlerini değiştir
          const temp = sorted[ufukIndex];
          sorted[ufukIndex] = sorted[mehmetIndex];
          sorted[mehmetIndex] = temp;
        } else if (ufukIndex !== -1) {
          // Sadece Ufuk varsa onu en başa çek
          const [ufuk] = sorted.splice(ufukIndex, 1);
          sorted.unshift(ufuk);
        }

        setFeaturedElectricians(sorted.slice(0, 5));
      }
    } catch (error) {
      console.log('Error fetching featured electricians:', error);
      setFeaturedElectricians([]);
    } finally {
      setIsLoadingElectricians(false);
    }
  }, [isElectrician, isInitialized, userCities]);

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
        fetchRecentJobs();
        if (isElectrician) {
          fetchStats();
        } else {
          fetchFeaturedElectricians();
        }
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
            checkPushStatus(),
            isElectrician ? fetchStats() : Promise.resolve(),
            fetchRecentJobs()
          ]);
          
          setIsInitialized(true);
          console.log('✅ [Home] Initialization complete');
        } catch (err) {
          console.error('[Home] Initialization error:', err);
          setIsInitialized(true);
        }
      };

      runInitialization();
    }, [isAuthenticated, isElectrician, fetchRecentJobs, fetchFeaturedElectricians, fetchStats])
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

  // Separate useEffect for initial fetching
  useEffect(() => {
    if (isInitialized) {
      fetchRecentJobs();
      if (isElectrician) {
        fetchStats();
      } else {
        fetchFeaturedElectricians();
      }
    }
  }, [isElectrician, isInitialized, fetchFeaturedElectricians, fetchRecentJobs, fetchStats]);

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

  const fullName = isAuthenticated ? (user?.fullName || 'USTA') : 'MİSAFİR USTA';
  const nameParts = fullName.toUpperCase().split(' ');
  const firstName = nameParts[0] || 'MİSAFİR';
  const lastName = nameParts.slice(1).join(' ') || 'USTA';

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundLight }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.premiumHeaderContainer}>
          <ImageBackground
            source={require('../../assets/images/header_bg.png')}
            style={styles.premiumHeader}
            imageStyle={styles.headerImage}
          >
            {/* Vibrant Orange Gradient Overlay for Usta */}
            <LinearGradient
              colors={isElectrician
                ? [colors.primary, colors.primaryDark || '#B91C1C']
                : (colors.gradientHeaderAmethyst as any) || [colors.primary + '88', colors.primaryLight + 'DD']
              }
              style={StyleSheet.absoluteFill}
            />

            {/* Glowing Decorative Circles */}
            <View style={[styles.headerDecorativeCircle1, isElectrician && { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]} />
            <View style={[styles.headerDecorativeCircle2, isElectrician && { backgroundColor: 'rgba(255, 255, 255, 0.05)' }]} />
            <View style={[styles.headerDecorativeCircle3, isElectrician && { backgroundColor: 'rgba(255, 255, 255, 0.15)' }]} />
        {/* Premium Welcome Header with Background Image and Enhanced Decoration */}



            <View style={[styles.headerTopRow, !isElectrician && { marginBottom: 0 }]}>
              {!isAuthenticated && (
                <TouchableOpacity
                  style={styles.headerIconButton}
                  onPress={() => router.canGoBack() ? router.back() : router.replace('/(auth)/welcome')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-back" size={24} color={colors.white} />
                </TouchableOpacity>
              )}

              {isElectrician ? (
                <>
                  {/* Left: Name on two lines, large & uppercase */}
                  <View style={styles.ustaHeaderNameContainer}>
                    <Text style={styles.ustaHeaderNameLine}>{firstName}</Text>
                    {lastName ? <Text style={styles.ustaHeaderNameLine}>{lastName}</Text> : null}
                  </View>

                  {/* Right: Rating + Role + Avatar & Notification */}
                  <View style={styles.ustaHeaderRightContainer}>
                    <View style={styles.ustaRatingAndRoleColumn}>
                      <View style={styles.ustaRatingRow}>
                        <Text style={styles.ustaRatingText}>{user?.averageRating?.toFixed(1) || '4.9'}</Text>
                        <Ionicons name="star" size={13} color="#FBBF24" style={{ marginLeft: 2 }} />
                      </View>
                      <Text style={styles.ustaRoleText}>
                        {getUstaCategory(user || { serviceCategory: 'elektrik' })} Ustası
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.ustaAvatarContainer}
                      activeOpacity={0.8}
                      onPress={() => handleActionWithAuth('/profile')}
                    >
                      {user?.profileImageUrl ? (
                        <Image source={{ uri: getFileUrl(user.profileImageUrl) || '' }} style={styles.ustaAvatarImage} />
                      ) : (
                        <View style={styles.ustaAvatarPlaceholder}>
                          <Ionicons name="person" size={20} color="#043A2F" />
                        </View>
                      )}
                    </TouchableOpacity>

                    {/* Elegant notification bell */}
                    <TouchableOpacity
                      style={styles.ustaNotificationBellMini}
                      activeOpacity={0.7}
                      onPress={() => handleActionWithAuth('/profile/notifications')}
                    >
                      <Ionicons name="notifications" size={18} color="#FFF" />
                      {unreadCount > 0 && (
                        <View style={styles.ustaNotificationDot} />
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  {/* Citizen Compact Header */}
                  <TouchableOpacity 
                    style={styles.compactSearchButton}
                    activeOpacity={0.8}
                    onPress={() => handleActionWithAuth('/electricians')}
                  >
                    <Ionicons name="search" size={16} color="rgba(255,255,255,0.7)" />
                    <Text style={styles.compactSearchText}>Ara...</Text>
                  </TouchableOpacity>
                  
                  <View style={styles.citizenTitleContainer}>
                    <Text style={styles.citizenTitleText}>İşbitir</Text>
                  </View>

                  <View style={styles.citizenRightIcons}>
                    <TouchableOpacity style={styles.headerLinkButton} activeOpacity={0.7} onPress={() => handleActionWithAuth('/profile')}>
                      <Ionicons name="person-outline" size={26} color={colors.white} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerLinkButton} activeOpacity={0.7} onPress={() => handleActionWithAuth('/profile/notifications')}>
                      <Ionicons name="notifications-outline" size={24} color={colors.white} />
                      {unreadCount > 0 && (
                        <Animated.View style={[styles.notificationBadge, { transform: [{ scale: badgePulseAnim }] }]}>
                          <Text style={styles.notificationBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                        </Animated.View>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>

            {/* Dashboard cards inside the gradient background exactly as in mockup */}
            {isElectrician && (
               <View style={styles.ustaHeaderDashboardRow}>
                 <TouchableOpacity
                   style={[styles.ustaDashboardCardDark, styles.glowPrimary]}
                   onPress={() => handleActionWithAuth('/electrician/stats')}
                   activeOpacity={0.85}
                 >
                   <Text style={styles.ustaDashCardLabel}>Toplam Kazanç</Text>
                   <Text style={styles.ustaDashCardValue}>
                     {stats ? `₺${stats.totalEarnings.toLocaleString('tr-TR')}` : '₺0.00'}
                   </Text>
                   <Text style={styles.ustaDashCardSub}>Tüm Zamanlar</Text>
                 </TouchableOpacity>
 
                 <TouchableOpacity
                   style={[styles.ustaDashboardCardDark, styles.glowAccent]}
                   onPress={() => handleActionWithAuth('/(tabs)/jobs', { tab: 'bids' })}
                   activeOpacity={0.85}
                 >
                   <Text style={styles.ustaDashCardLabel}>Aktif Teklifler</Text>
                   <Text style={styles.ustaDashCardValue}>
                     {stats ? stats.activeBids : '0'}
                   </Text>
                   <Text style={styles.ustaDashCardSub}>Bekleyen</Text>
                 </TouchableOpacity>
               </View>
             )}
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



            {/* Professional Tools Section */}
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleContainer}>
                <Text style={styles.sectionTitle}>PROFESYONEL ARAÇLAR</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolsScrollContainer}>
              <TouchableOpacity
                style={styles.toolCardModern}
                onPress={() => handleActionWithAuth('/tools/calendar')}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark || '#B91C1C', '#431407']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.toolIconBoxGradient, { shadowColor: colors.primary }]}
                >
                  <Image
                    source={require('../../assets/images/tool_calendar.jpg')}
                    style={styles.toolIconImage}
                  />
                </LinearGradient>
                <Text style={styles.toolCardTitle}>Takvim</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.toolCardModern}
                onPress={() => handleActionWithAuth('/tools/ledger')}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark || '#B91C1C', '#431407']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.toolIconBoxGradient, { shadowColor: colors.primary }]}
                >
                  <Image
                    source={require('../../assets/images/tool_ledger.jpg')}
                    style={styles.toolIconImage}
                  />
                </LinearGradient>
                <Text style={styles.toolCardTitle}>Defter</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.toolCardModern}
                onPress={() => handleActionWithAuth('/tools/quote')}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark || '#B91C1C', '#431407']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.toolIconBoxGradient, { shadowColor: colors.primary }]}
                >
                  <Image
                    source={require('../../assets/images/tool_quotes.jpg')}
                    style={styles.toolIconImage}
                  />
                </LinearGradient>
                <Text style={styles.toolCardTitle}>PDF Teklifler</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Sıcak Fırsatlar (Hot Leads) Section */}
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleContainer}>
                <Text style={styles.sectionTitle}>SICAK FIRSATLAR</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolsScrollContainer}>
              {recentJobs.length > 0 ? recentJobs.slice(0, 5).map((job: any, index: number) => {
                const isUrgent = job.urgencyLevel === 'HIGH' || job.urgencyLevel === 'MEDIUM';
                const statusColor = isUrgent ? colors.primary : '#F59E0B';
                const badgeBgColor = isUrgent ? 'rgba(255, 75, 43, 0.1)' : 'rgba(245, 158, 11, 0.1)';
                const iconColor = isUrgent ? colors.primary : '#F59E0B';
                
                return (
                  <TouchableOpacity
                    key={job.id}
                    style={[styles.hotLeadCard, isUrgent ? styles.glowPrimary : styles.glowAccent]}
                    onPress={() => handleActionWithAuth(`/jobs/${job.id}`)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.hotLeadHeaderRow}>
                      <Text style={styles.hotLeadTitle} numberOfLines={1}>{job.title || 'İş İlanı'}</Text>
                      <View style={[styles.hotLeadUrgentBadge, { backgroundColor: badgeBgColor }]}>
                        <Ionicons name="time" size={10} color={statusColor} />
                        <Text style={[styles.hotLeadUrgentText, { color: statusColor }]}>
                          {isUrgent ? 'Acil' : 'Yeni'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.hotLeadLocationRow}>
                      <Ionicons name="location" size={12} color={iconColor} />
                      <Text style={styles.hotLeadLocationText} numberOfLines={1}>
                        {job.location?.district ? `${job.location.district}, ` : ''}{job.location?.city || 'İstanbul'}
                      </Text>
                    </View>

                    <View style={styles.hotLeadBottomRow}>
                      <View style={styles.hotLeadPriceCol}>
                        <Text style={[styles.hotLeadPrice, { color: statusColor }]}>
                          ₺{job.estimatedBudget ? Number(job.estimatedBudget).toLocaleString('tr-TR') : '850'}
                        </Text>
                        <Text style={[styles.hotLeadPriceStatus, { color: statusColor }]}>
                          {isUrgent ? ' - Acil!' : ' - Standart'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.hotLeadActionBtn, { backgroundColor: isUrgent ? colors.primary : '#F59E0B' }]}
                        onPress={() => handleActionWithAuth(`/jobs/${job.id}`)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.hotLeadActionBtnText}>Teklif Ver</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              }) : (
                <>
                  {/* Mockup Job 1 */}
                  <TouchableOpacity
                    style={[styles.hotLeadCard, styles.glowPrimary]}
                    onPress={() => handleActionWithAuth('/(tabs)/jobs')}
                    activeOpacity={0.85}
                  >
                    <View style={styles.hotLeadHeaderRow}>
                      <Text style={styles.hotLeadTitle} numberOfLines={1}>Acil Pano Arızası</Text>
                      <View style={[styles.hotLeadUrgentBadge, { backgroundColor: 'rgba(255, 75, 43, 0.1)' }]}>
                        <Ionicons name="time" size={10} color={colors.primary} />
                        <Text style={[styles.hotLeadUrgentText, { color: colors.primary }]}>14dk</Text>
                      </View>
                    </View>

                    <View style={styles.hotLeadLocationRow}>
                      <Ionicons name="location" size={12} color={colors.primary} />
                      <Text style={styles.hotLeadLocationText} numberOfLines={1}>Kadıköy, 1.2km</Text>
                    </View>

                    <View style={styles.hotLeadBottomRow}>
                      <View style={styles.hotLeadPriceCol}>
                        <Text style={[styles.hotLeadPrice, { color: colors.primary }]}>₺850</Text>
                        <Text style={[styles.hotLeadPriceStatus, { color: colors.primary }]}> - Acil!</Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.hotLeadActionBtn, { backgroundColor: colors.primary }]}
                        onPress={() => handleActionWithAuth('/(tabs)/jobs')}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.hotLeadActionBtnText}>Teklif Ver</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>

                  {/* Mockup Job 2 */}
                  <TouchableOpacity
                    style={[styles.hotLeadCard, styles.glowAccent]}
                    onPress={() => handleActionWithAuth('/(tabs)/jobs')}
                    activeOpacity={0.85}
                  >
                    <View style={styles.hotLeadHeaderRow}>
                      <Text style={styles.hotLeadTitle} numberOfLines={1}>Priz Değişimi</Text>
                      <View style={[styles.hotLeadUrgentBadge, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                        <Ionicons name="time" size={10} color="#F59E0B" />
                        <Text style={[styles.hotLeadUrgentText, { color: '#F59E0B' }]}>25dk</Text>
                      </View>
                    </View>

                    <View style={styles.hotLeadLocationRow}>
                      <Ionicons name="location" size={12} color="#F59E0B" />
                      <Text style={styles.hotLeadLocationText} numberOfLines={1}>Üsküdar, 2.5km</Text>
                    </View>

                    <View style={styles.hotLeadBottomRow}>
                      <View style={styles.hotLeadPriceCol}>
                        <Text style={[styles.hotLeadPrice, { color: '#F59E0B' }]}>₺350</Text>
                        <Text style={[styles.hotLeadPriceStatus, { color: '#F59E0B' }]}> - Standart</Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.hotLeadActionBtn, { backgroundColor: '#F59E0B' }]}
                        onPress={() => handleActionWithAuth('/(tabs)/jobs')}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.hotLeadActionBtnText}>Teklif Ver</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>

                  {/* Mockup Job 3 */}
                  <TouchableOpacity
                    style={[styles.hotLeadCard, styles.glowAccent]}
                    onPress={() => handleActionWithAuth('/(tabs)/jobs')}
                    activeOpacity={0.85}
                  >
                    <View style={styles.hotLeadHeaderRow}>
                      <Text style={styles.hotLeadTitle} numberOfLines={1}>Aydınlatma Montajı</Text>
                      <View style={[styles.hotLeadUrgentBadge, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                        <Ionicons name="time" size={10} color="#F59E0B" />
                        <Text style={[styles.hotLeadUrgentText, { color: '#F59E0B' }]}>45dk</Text>
                      </View>
                    </View>

                    <View style={styles.hotLeadLocationRow}>
                      <Ionicons name="location" size={12} color="#F59E0B" />
                      <Text style={styles.hotLeadLocationText} numberOfLines={1}>Beşiktaş, 3.1km</Text>
                    </View>

                    <View style={styles.hotLeadBottomRow}>
                      <View style={styles.hotLeadPriceCol}>
                        <Text style={[styles.hotLeadPrice, { color: '#F59E0B' }]}>₺1,200</Text>
                        <Text style={[styles.hotLeadPriceStatus, { color: '#F59E0B' }]}> - Fırsat</Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.hotLeadActionBtn, { backgroundColor: '#F59E0B' }]}
                        onPress={() => handleActionWithAuth('/(tabs)/jobs')}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.hotLeadActionBtnText}>Teklif Ver</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        )}

        {/* Vitrin / Showcase Section (Citizen Only) */}
        {!isElectrician && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleContainer}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>REELS</Text>
              </View>
            </View>

            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.vitrinScroller}
              snapToInterval={262} // vitrinCardSmall width (250) + gap (12)
              decelerationRate="fast"
              scrollEventThrottle={16}
              onScroll={(e) => {
                const scrollPosition = e.nativeEvent.contentOffset.x;
                const index = Math.max(0, Math.min(2, Math.round(scrollPosition / 262)));
                if (activeReelsIndex !== index) {
                  setActiveReelsIndex(index);
                }
              }}
            >
              {Array.from({ length: 3 }).map((_, colIndex) => {
                const vitrinItems = [
                  { id: 1, title: 'Elektrik Tesisat', desc: 'Güvenli ve profesyonel', icon: 'flash', serviceCategory: 'elektrik', image: require('../../assets/images/v_vitrin_elektrik.jpg') },
                  { id: 2, title: 'Güvenlik Kamera', desc: 'Kurulum ve bakım', icon: 'videocam', serviceCategory: 'elektrik', image: require('../../assets/images/v_vitrin_kamera.jpg') },
                  { id: 3, title: 'Klima Servisi', desc: 'Montaj ve temizlik', icon: 'snow', serviceCategory: 'klima', image: require('../../assets/images/v_vitrin_klima.jpg') },
                  { id: 4, title: 'Tesisat & Su', desc: 'Acil müdahale', icon: 'water', serviceCategory: 'tesisat', image: require('../../assets/images/v_vitrin_tesisat.jpg') },
                  { id: 5, title: 'Çilingir', desc: 'Kapı açma ve kilit', icon: 'key', serviceCategory: 'cilingir', image: require('../../assets/images/v_vitrin_cilingir.jpg') },
                  { id: 6, title: 'Beyaz Eşya', desc: 'Tamir ve bakım', icon: 'construct', serviceCategory: 'beyaz-esya', image: require('../../assets/images/v_vitrin_beyaz_esya.jpg') },
                ];
                return (
                  <View key={colIndex} style={styles.vitrinColumn}>
                    {vitrinItems.slice(colIndex * 2, colIndex * 2 + 2).map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        activeOpacity={0.85}
                        onPress={() => handleActionWithAuth('/jobs/create', { serviceCategory: item.serviceCategory })}
                        style={styles.vitrinCardSmall}
                      >
                        <ImageBackground source={item.image} style={styles.vitrinCardBg} imageStyle={styles.vitrinCardBgImage}>
                          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={styles.vitrinCardGradient}>
                            <View style={styles.vitrinCardContentRow}>
                              <View style={styles.vitrinIconCircleSm}>
                                <Ionicons name={item.icon as any} size={20} color="#FFF" />
                              </View>
                              <View style={styles.vitrinCardTextCol}>
                                <Text style={styles.vitrinCardTitle} numberOfLines={2}>{item.title}</Text>
                                <Text style={styles.vitrinCardDesc} numberOfLines={1}>{item.desc}</Text>
                              </View>
                            </View>
                          </LinearGradient>
                        </ImageBackground>
                      </TouchableOpacity>
                    ))}
                  </View>
                );
              })}
            </ScrollView>

            {/* Pagination Indicators */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 12, gap: 6 }}>
              {[0, 1, 2].map((i) => (
                <View 
                  key={i} 
                  style={{
                    width: activeReelsIndex === i ? 20 : 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: activeReelsIndex === i ? colors.primary : colors.primary + '30',
                  }}
                />
              ))}
            </View>
          </View>
        )}

        {/* KEŞFET - Main Service Categories Section (Citizen Only) */}
        {
          !isElectrician && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleContainer}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>KEŞFET</Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.headerProjectAction}
                  onPress={() => handleActionWithAuth('/jobs/create', { category: 'Elektrik Proje Çizimi', serviceCategory: 'elektrik' })}
                >
                  <LinearGradient
                    colors={['#A78BFA', '#7C3AED']}
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



        {/* Toggleable Section: Son İş İlanları / Öne Çıkan Ustalar (Citizen Only) */}
        {
          !isElectrician && (
            <View style={[styles.section, { paddingBottom: 10, marginTop: -6 }]}>
              <View style={{ flexDirection: 'row', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
                <TouchableOpacity
                  style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: activeHomeTab === 'ustalar' ? 2 : 0, borderBottomColor: colors.primary }}
                  onPress={() => setActiveHomeTab('ustalar')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.sectionTitle, { color: activeHomeTab === 'ustalar' ? colors.text : colors.textSecondary, fontSize: 13, textTransform: 'uppercase' }]}>ÖNE ÇIKAN USTALAR</Text>
                </TouchableOpacity>
                
                <View style={{ flex: 1 }}>
                  <TouchableOpacity
                    style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: activeHomeTab === 'ilanlar' ? 2 : 0, borderBottomColor: colors.primary }}
                    onPress={() => setActiveHomeTab('ilanlar')}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.sectionTitle, { color: activeHomeTab === 'ilanlar' ? colors.text : colors.textSecondary, fontSize: 13, textTransform: 'uppercase' }]}>SON İŞ İLANLARI</Text>
                  </TouchableOpacity>

                  {activeHomeTab === 'ustalar' && (
                    <TouchableOpacity 
                      style={{ position: 'absolute', bottom: -10, right: 0, zIndex: 10, paddingHorizontal: 10 }}
                      onPress={() => router.push('/electricians' as any)}
                    >
                      <Text style={{ color: colors.primary, fontFamily: fonts.bold, fontSize: 11 }}>Tüm Ustalar &gt;</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {activeHomeTab === 'ilanlar' ? (
                isLoadingRecentJobs ? (
                  <View style={{ padding: 40, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={{ marginTop: 10, color: staticColors.textSecondary, fontFamily: fonts.medium }}>İlanlar yükleniyor...</Text>
                  </View>
                ) : recentJobs.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentJobsHorizontalScroller}>
                    {recentJobs.map((job) => (
                      <TouchableOpacity
                        key={job.id}
                        style={styles.recentJobCardHorizontal}
                        activeOpacity={0.85}
                        onPress={() => router.push(`/jobs/${job.id}` as any)}
                      >
                        <View style={styles.recentJobUserAvatar}>
                           {job.citizen?.profileImageUrl ? (
                              <Image source={{ uri: getFileUrl(job.citizen.profileImageUrl) || '' }} style={{width: '100%', height: '100%', borderRadius: 16}} />
                            ) : (
                              <Ionicons name="person" size={28} color={colors.primary} />
                            )}
                        </View>
                        
                        <View style={styles.recentJobInfoHorizontal}>
                          <View style={styles.recentJobHeaderHorizontal}>
                            <View style={{ flex: 1, paddingRight: 8 }}>
                              <Text style={styles.recentJobTitleHorizontal} numberOfLines={1}>{job.serviceCategory ? getUstaCategory({ serviceCategory: job.serviceCategory }) : 'Genel'}</Text>
                              <Text style={styles.recentJobSubtextHorizontal} numberOfLines={1}>{job.title}</Text>
                              <View style={{flexDirection: 'row', alignItems: 'center', marginTop: 2}}>
                                <Ionicons name="location-outline" size={10} color={staticColors.textLight} style={{marginRight: 2}} />
                                <Text style={styles.recentJobCategoryTextHorizontal} numberOfLines={1}>{job.location?.city || 'Türkiye'}</Text>
                              </View>
                            </View>
                            {job.hasTimedBids && (
                              <View style={styles.homeTimerContainer}>
                                <View style={styles.homeTimerBadgeMinimal}>
                                  <Ionicons name="time-outline" size={10} color="#D97706" style={{ marginRight: 3 }} />
                                  <Text style={styles.homeTimerLabelSmall}>SÜRELİ TEKLİF</Text>
                                </View>
                                {job.earliestBidExpiresAt && (
                                  <View style={styles.homeTimerValueWrapper}>
                                    <CountdownTimer 
                                      expiresAt={job.earliestBidExpiresAt} 
                                      minimal={true}
                                      size="small"
                                    />
                                  </View>
                                )}
                              </View>
                            )}
                          </View>
                          
                          <View style={styles.bidStatProfessionalBadge}>
                             <Ionicons name="chatbubble-ellipses-outline" size={12} color="#059669" style={{marginRight: 4}} />
                             <Text style={styles.bidStatProfessionalNumber}>{job.bidCount || 0}</Text>
                             <Text style={styles.bidStatProfessionalLabel}>TEKLİF</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : (
                  <View style={{ padding: 40, alignItems: 'center' }}>
                    <Ionicons name="briefcase-outline" size={36} color={colors.textLight} />
                    <Text style={{ marginTop: 12, color: colors.textSecondary, fontFamily: fonts.medium, textAlign: 'center' }}>
                      Henüz iş ilanı bulunmuyor.
                    </Text>
                  </View>
                )
              ) : (
                isLoadingElectricians ? (
                  <View style={{ padding: 40, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={{ marginTop: 10, color: staticColors.textSecondary, fontFamily: fonts.medium }}>Ustalar yükleniyor...</Text>
                  </View>
                ) : featuredElectricians.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentJobsHorizontalScroller}>
                    {featuredElectricians.map((elec) => (
                      <TouchableOpacity
                        key={elec.id}
                        style={styles.recentJobCardHorizontal}
                        activeOpacity={0.85}
                        onPress={() => router.push(`/electricians/${elec.id}` as any)}
                      >
                        <View style={styles.recentJobUserAvatar}>
                           {elec.profileImageUrl ? (
                              <Image source={{ uri: getFileUrl(elec.profileImageUrl) || '' }} style={{width: '100%', height: '100%', borderRadius: 16}} />
                            ) : (
                              <Ionicons name="person" size={28} color={colors.primary} />
                            )}
                        </View>
                        
                        <View style={styles.recentJobInfoHorizontal}>
                          <View style={styles.recentJobHeaderHorizontal}>
                            <View style={{ flex: 1, paddingRight: 8 }}>
                              <View style={{flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2}}>
                                 <Text style={[styles.recentJobTitleHorizontal, {marginBottom: 0}]} numberOfLines={1}>{elec.fullName || 'Usta'}</Text>
                                 {elec.isVerified === true && elec.electricianProfile?.verificationStatus === 'VERIFIED' && (
                                    <Ionicons name="shield-checkmark" size={14} color="#10B981" />
                                 )}
                              </View>
                              <Text style={styles.recentJobSubtextHorizontal} numberOfLines={1}>{getUstaCategory(elec)}</Text>
                              <Text style={styles.recentJobCategoryTextHorizontal} numberOfLines={1}>{elec.locations?.[0] ? `${elec.locations[0].district || ''}, ${elec.locations[0].city || ''}`.replace(/^, /, '').replace(/, $/, '') || 'Türkiye' : 'Türkiye'}</Text>
                            </View>
                          </View>
                          
                          <View style={[styles.timerBadge, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                            <Ionicons name="star" size={10} color="#10B981" style={{ marginRight: 2 }} />
                            <Text style={[styles.timerBadgeText, { color: '#10B981' }]}>{Number(elec.electricianProfile?.ratingAverage || 0).toFixed(1)} Puan</Text>
                          </View>
                          <View style={styles.priceTextContainer}>
                             <Text style={styles.priceTextLarge}>{elec.electricianProfile?.totalReviews || 0}</Text>
                             <Text style={styles.priceTextSmall}>Değerlendirme</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : (
                  <View style={{ padding: 40, alignItems: 'center' }}>
                    <Ionicons name="people-outline" size={36} color={colors.textLight} />
                    <Text style={{ marginTop: 12, color: colors.textSecondary, fontFamily: fonts.medium, textAlign: 'center' }}>
                      Şu an için öne çıkan usta bulunmuyor.
                    </Text>
                  </View>
                )
              )}
            </View>
          )
        }

        {/* ==================== PAZAR YERİ & İKİNCİ EL ==================== */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleContainer}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>PAZAR YERİ & İKİNCİ EL</Text>
                <TouchableOpacity 
                  onPress={() => setIsAllProductsModalVisible(true)}
                  style={{ backgroundColor: 'rgba(245, 158, 11, 0.12)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 }}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 11, fontFamily: fonts.bold, color: '#F59E0B' }}>Tümünü Gör ➔</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.sectionSubtitle}>Ustalar ve vatandaşlar arası malzeme satışı</Text>
            </View>
            <TouchableOpacity
              style={styles.addProductBtn}
              activeOpacity={0.8}
              onPress={() => setIsAddProductModalVisible(true)}
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryDark || '#B91C1C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.addProductBtnGradient}
              >
                <Ionicons name="add-circle" size={14} color="#FFF" style={{ marginRight: 2 }} />
                <Text style={styles.addProductBtnText}>İlan Ekle</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.marketScrollContainer}
          >
            {marketplaceProducts.map((prod) => {
              const isUsta = prod.sellerType === 'ELECTRICIAN';
              return (
                <TouchableOpacity
                  key={prod.id}
                  style={styles.marketCard}
                  activeOpacity={0.9}
                  onPress={() => {
                    setSelectedProduct(prod);
                    setIsProductDetailModalVisible(true);
                  }}
                >
                  {prod.image ? (
                    <ImageBackground
                      source={{ uri: prod.image }}
                      style={{ width: '100%', height: 185 }}
                      imageStyle={{ borderRadius: 20 }}
                    >
                      <LinearGradient
                        colors={['rgba(15, 23, 42, 0.3)', '#0F172A']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={[styles.marketCardGradient, { backgroundColor: 'transparent' }]}
                      >
                        <View style={styles.marketCardHeader}>
                          <View style={[styles.marketCategoryBadge, { backgroundColor: isUsta ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)' }]}>
                            <Text style={[styles.marketCategoryText, { color: isUsta ? '#F59E0B' : '#10B981' }]}>{prod.category}</Text>
                          </View>
                          <Text style={styles.marketDateText}>{prod.date}</Text>
                        </View>

                        <Text style={styles.marketProductTitle} numberOfLines={1}>{prod.title}</Text>
                        <Text style={styles.marketProductDesc} numberOfLines={2}>{prod.desc}</Text>

                        <View style={styles.marketCardFooter}>
                          <View style={styles.marketPriceWrapper}>
                            <Text style={styles.marketPriceLabel}>Fiyat</Text>
                            <Text style={styles.marketPriceValue}>₺{prod.price}</Text>
                          </View>

                          <View style={styles.marketSellerBadge}>
                            <Ionicons name={isUsta ? "build" : "person"} size={10} color="#94A3B8" style={{ marginRight: 3 }} />
                            <Text style={styles.marketSellerText} numberOfLines={1}>
                              {isUsta ? 'Usta' : 'Vatandaş'}
                            </Text>
                          </View>
                        </View>
                      </LinearGradient>
                    </ImageBackground>
                  ) : (
                    <LinearGradient
                      colors={['#1E293B', '#0F172A']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.marketCardGradient}
                    >
                      <View style={styles.marketCardHeader}>
                        <View style={[styles.marketCategoryBadge, { backgroundColor: isUsta ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)' }]}>
                          <Text style={[styles.marketCategoryText, { color: isUsta ? '#F59E0B' : '#10B981' }]}>{prod.category}</Text>
                        </View>
                        <Text style={styles.marketDateText}>{prod.date}</Text>
                      </View>

                      <Text style={styles.marketProductTitle} numberOfLines={1}>{prod.title}</Text>
                      <Text style={styles.marketProductDesc} numberOfLines={2}>{prod.desc}</Text>

                      <View style={styles.marketCardFooter}>
                        <View style={styles.marketPriceWrapper}>
                          <Text style={styles.marketPriceLabel}>Fiyat</Text>
                          <Text style={styles.marketPriceValue}>₺{prod.price}</Text>
                        </View>

                        <View style={styles.marketSellerBadge}>
                          <Ionicons name={isUsta ? "build" : "person"} size={10} color="#94A3B8" style={{ marginRight: 3 }} />
                          <Text style={styles.marketSellerText} numberOfLines={1}>
                            {isUsta ? 'Usta' : 'Vatandaş'}
                          </Text>
                        </View>
                      </View>
                    </LinearGradient>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ==================== YENİ İLAN EKLE MODAL ==================== */}
        <Modal
          visible={isAddProductModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setIsAddProductModalVisible(false)}
        >
          <View style={styles.hiwModalOverlay}>
            <View style={[styles.marketModalContent, { maxHeight: '90%', paddingBottom: 24 }]}>
              <View style={styles.hiwHeader}>
                <Text style={styles.marketModalTitle}>Ürün Satış İlanı Ekle</Text>
                <TouchableOpacity onPress={() => setIsAddProductModalVisible(false)} style={styles.hiwCloseBtn}>
                  <Ionicons name="close" size={24} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ marginTop: 16 }} showsVerticalScrollIndicator={false}>
                {/* Photo Upload Zone */}
                <Text style={styles.formLabel}>Ürün Fotoğrafı</Text>
                {newProdImage ? (
                  <View style={{ position: 'relative', width: '100%', height: 160, borderRadius: 16, overflow: 'hidden', marginBottom: 16, borderHorizontalWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                    <Image source={{ uri: newProdImage }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                    <TouchableOpacity
                      style={{ position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(15, 23, 42, 0.75)', padding: 6, borderRadius: 20 }}
                      onPress={() => setNewProdImage(null)}
                    >
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={{
                      height: 100,
                      borderRadius: 16,
                      borderStyle: 'dashed',
                      borderWidth: 1.5,
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                      backgroundColor: 'rgba(255, 255, 255, 0.03)',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginBottom: 16,
                      gap: 4
                    }}
                    onPress={handlePickProductImage}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="camera-outline" size={26} color="#F59E0B" />
                    <Text style={{ fontSize: 12, fontFamily: fonts.bold, color: '#FFF' }}>Fotoğraf Seç (İsteğe Bağlı)</Text>
                    <Text style={{ fontSize: 9.5, fontFamily: fonts.medium, color: '#94A3B8' }}>Galeriden bir ürün görseli yükleyin</Text>
                  </TouchableOpacity>
                )}

                <Text style={styles.formLabel}>Ürün Adı *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Örn: Makita Şarjlı Matkap, 50m Kablo vb."
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={newProdTitle}
                  onChangeText={setNewProdTitle}
                />

                <Text style={styles.formLabel}>Kategori *</Text>
                <View style={styles.categoryPickerRow}>
                  {['El Aleti', 'Kablo', 'Şalt / Malzeme', 'Diğer'].map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryPickerBtn,
                        newProdCategory === cat && { backgroundColor: colors.primary, borderColor: colors.primary }
                      ]}
                      onPress={() => setNewProdCategory(cat)}
                    >
                      <Text style={[styles.categoryPickerText, newProdCategory === cat && { color: '#FFF' }]}>{cat}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.formLabel}>Fiyat (₺) *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Örn: 1500"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  keyboardType="numeric"
                  value={newProdPrice}
                  onChangeText={setNewProdPrice}
                />

                <Text style={styles.formLabel}>Ürün Açıklaması *</Text>
                <TextInput
                  style={[styles.formInput, { height: 80, textAlignVertical: 'top', paddingTop: 10 }]}
                  placeholder="Ürünün durumu, markası ve teslimat bilgileri..."
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  multiline={true}
                  numberOfLines={4}
                  value={newProdDesc}
                  onChangeText={setNewProdDesc}
                />

                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: colors.primary, marginTop: 16 }]}
                  onPress={handleAddProduct}
                  activeOpacity={0.8}
                  disabled={isUploadingImage}
                >
                  {isUploadingImage ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.submitBtnText}>İlanı Yayınla 🚀</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ==================== TÜM PAZAR YERİ İLANLARI MODAL ==================== */}
        <Modal
          visible={isAllProductsModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setIsAllProductsModalVisible(false)}
        >
          <View style={styles.hiwModalOverlay}>
            <View style={[styles.marketModalContent, { maxHeight: '90%', paddingBottom: 24 }]}>
              <View style={styles.hiwHeader}>
                <Text style={styles.marketModalTitle}>Tüm Pazar Yeri İlanları</Text>
                <TouchableOpacity onPress={() => setIsAllProductsModalVisible(false)} style={styles.hiwCloseBtn}>
                  <Ionicons name="close" size={24} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              {/* Search Bar */}
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, paddingHorizontal: 12, height: 44, marginTop: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
                <Ionicons name="search" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
                <TextInput
                  style={{ flex: 1, color: '#FFF', fontFamily: fonts.medium, fontSize: 13.5, height: '100%', paddingVertical: 0 }}
                  placeholder="Ürün adı, satıcı veya kategori ara..."
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={marketSearchQuery}
                  onChangeText={setMarketSearchQuery}
                />
                {marketSearchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setMarketSearchQuery('')}>
                    <Ionicons name="close-circle" size={16} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Category Filter Tabs */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 36, marginBottom: 16 }} contentContainerStyle={{ alignItems: 'center' }}>
                {['Tümü', 'El Aleti', 'Kablo', 'Şalt / Malzeme', 'Diğer'].map((cat) => {
                  const isSelected = (cat === 'Tümü' && marketSelectedFilter === '') || (marketSelectedFilter === cat);
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 6,
                        borderRadius: 20,
                        backgroundColor: isSelected ? colors.primary : 'rgba(255,255,255,0.05)',
                        marginRight: 8,
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: 28
                      }}
                      onPress={() => setMarketSelectedFilter(cat === 'Tümü' ? '' : cat)}
                    >
                      <Text style={{ color: '#FFF', fontFamily: fonts.bold, fontSize: 11 }}>{cat}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <ScrollView showsVerticalScrollIndicator={false}>
                {marketplaceProducts
                  .filter((p) => {
                    const matchesSearch = p.title.toLowerCase().includes(marketSearchQuery.toLowerCase()) ||
                      p.desc.toLowerCase().includes(marketSearchQuery.toLowerCase()) ||
                      p.sellerName.toLowerCase().includes(marketSearchQuery.toLowerCase());
                    const matchesCat = marketSelectedFilter === '' || p.category.includes(marketSelectedFilter) || marketSelectedFilter.includes(p.category);
                    return matchesSearch && matchesCat;
                  })
                  .map((prod) => {
                    const isUsta = prod.sellerType === 'ELECTRICIAN';
                    return (
                      <TouchableOpacity
                        key={prod.id}
                        style={{
                          backgroundColor: 'rgba(255,255,255,0.03)',
                          borderRadius: 16,
                          padding: 12,
                          marginBottom: 12,
                          borderWidth: 1,
                          borderColor: 'rgba(255,255,255,0.06)',
                          flexDirection: 'row',
                          gap: 12
                        }}
                        onPress={() => {
                          setSelectedProduct(prod);
                          setIsProductDetailModalVisible(true);
                        }}
                      >
                        {prod.image ? (
                          <Image source={{ uri: prod.image }} style={{ width: 70, height: 70, borderRadius: 10, backgroundColor: '#1E293B' }} />
                        ) : (
                          <View style={{ width: 70, height: 70, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' }}>
                            <Ionicons name={prod.category === 'Kablo' ? 'analytics' : 'construct'} size={24} color="#94A3B8" />
                          </View>
                        )}
                        <View style={{ flex: 1, justifyContent: 'space-between' }}>
                          <View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text style={{ color: isUsta ? '#F59E0B' : '#10B981', fontSize: 9, fontFamily: fonts.bold, textTransform: 'uppercase' }}>{prod.category}</Text>
                              <Text style={{ color: '#64748B', fontSize: 9, fontFamily: fonts.medium }}>{prod.date}</Text>
                            </View>
                            <Text style={{ color: '#FFF', fontSize: 13, fontFamily: fonts.bold, marginTop: 2 }} numberOfLines={1}>{prod.title}</Text>
                            <Text style={{ color: '#94A3B8', fontSize: 10.5, fontFamily: fonts.regular, marginTop: 2 }} numberOfLines={1}>{prod.desc}</Text>
                          </View>
                          
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                            <Text style={{ color: colors.primary, fontSize: 13.5, fontFamily: fonts.extraBold }}>₺{prod.price}</Text>
                            <Text style={{ color: '#94A3B8', fontSize: 10, fontFamily: fonts.medium }} numberOfLines={1}>{prod.sellerName.split(' ')[0]}</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* ==================== ÜRÜN DETAY MODAL ==================== */}
        <Modal
          visible={isProductDetailModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsProductDetailModalVisible(false)}
        >
          <View style={styles.hiwModalOverlay}>
            <View style={[styles.marketModalContent, { paddingBottom: 24 }]}>
              <View style={styles.hiwHeader}>
                <Text style={styles.marketModalTitle}>Ürün Detayları</Text>
                <TouchableOpacity onPress={() => setIsProductDetailModalVisible(false)} style={styles.hiwCloseBtn}>
                  <Ionicons name="close" size={24} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              {selectedProduct && (
                <View style={{ marginTop: 20 }}>
                  {/* Photo Header */}
                  {selectedProduct.image && (
                    <View style={{ width: '100%', height: 180, borderRadius: 16, overflow: 'hidden', marginBottom: 16 }}>
                      <Image source={{ uri: selectedProduct.image }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                    </View>
                  )}

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={[styles.marketCategoryBadge, { backgroundColor: selectedProduct.sellerType === 'ELECTRICIAN' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)' }]}>
                      <Text style={[styles.marketCategoryText, { color: selectedProduct.sellerType === 'ELECTRICIAN' ? '#F59E0B' : '#10B981' }]}>{selectedProduct.category}</Text>
                    </View>
                    <Text style={{ color: '#94A3B8', fontSize: 12, fontFamily: fonts.medium }}>{selectedProduct.date}</Text>
                  </View>

                  <Text style={{ fontSize: 18, fontFamily: fonts.bold, color: '#FFF', marginTop: 12 }}>{selectedProduct.title}</Text>
                  
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 }}>
                    <Ionicons name="location-outline" size={14} color="#94A3B8" />
                    <Text style={{ color: '#94A3B8', fontSize: 12, fontFamily: fonts.medium }}>{selectedProduct.location}</Text>
                  </View>

                  <View style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 12, marginTop: 16 }}>
                    <Text style={{ color: '#E2E8F0', fontSize: 13, lineHeight: 20, fontFamily: fonts.regular }}>{selectedProduct.desc}</Text>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingTop: 16 }}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={{ color: '#94A3B8', fontSize: 11, fontFamily: fonts.medium }}>Satıcı</Text>
                      <Text style={{ color: '#FFF', fontSize: 13.5, fontFamily: fonts.bold }} numberOfLines={1}>{selectedProduct.sellerName}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ color: '#94A3B8', fontSize: 11, fontFamily: fonts.medium }}>Fiyat</Text>
                      <Text style={{ color: colors.primary, fontSize: 20, fontFamily: fonts.extraBold }}>₺{selectedProduct.price}</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.submitBtn, { backgroundColor: colors.primary, marginTop: 24, flexDirection: 'row', gap: 8, justifyContent: 'center' }]}
                    onPress={() => {
                      setIsProductDetailModalVisible(false);
                      router.push('/(tabs)/messages');
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="chatbubbles" size={18} color="#FFF" />
                    <Text style={styles.submitBtnText}>Satıcıyla İletişime Geç (Sohbet Et)</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>

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

      {/* ACİL USTA button is now integrated into the center tab bar */}

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
  compactSearchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    width: 90,
    gap: 6,
  },
  compactSearchText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  citizenTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  citizenTitleText: {
    fontFamily: fonts.extraBold,
    fontSize: 22,
    color: staticColors.white,
    letterSpacing: 0.5,
  },
  citizenRightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  ustaHeaderNameContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  ustaHeaderNameLine: {
    fontFamily: fonts.extraBold,
    fontSize: 24,
    color: staticColors.white,
    letterSpacing: -0.5,
    lineHeight: 28,
    textTransform: 'uppercase',
  },
  ustaHeaderRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ustaRatingAndRoleColumn: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  ustaRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ustaRatingText: {
    fontFamily: fonts.extraBold,
    fontSize: 16,
    color: staticColors.white,
  },
  ustaRoleText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  ustaAvatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
  },
  ustaAvatarImage: {
    width: '100%',
    height: '100%',
  },
  ustaAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ustaNotificationBellMini: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  ustaNotificationDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  ustaHeaderDashboardRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 6,
  },
  ustaDashboardCardDark: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  glowPrimary: {
    shadowColor: '#FF4B2B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  glowAccent: {
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  glowGreen: {
    shadowColor: '#FF4B2B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  glowBlue: {
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },

  ustaDashCardLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 6,
  },
  ustaDashCardValue: {
    fontFamily: fonts.extraBold,
    fontSize: 22,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  ustaDashCardSub: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
  },

  toolIconBoxDark: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  toolIconBoxGradient: {
    width: 64,
    height: 64,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  toolIconImage: {
    width: 44,
    height: 44,
    resizeMode: 'contain',
  },
  hotLeadCard: {
    width: 210,
    backgroundColor: staticColors.white,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  hotLeadHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  hotLeadTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: staticColors.text,
    flex: 1,
    marginRight: 6,
  },
  hotLeadUrgentBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  hotLeadUrgentText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: '#EF4444',
  },
  hotLeadLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  hotLeadLocationText: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    color: '#94A3B8',
  },
  hotLeadBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  hotLeadPriceCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hotLeadPrice: {
    fontFamily: fonts.extraBold,
    fontSize: 16,
    color: '#059669',
  },
  hotLeadPriceStatus: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: '#EF4444',
  },
  hotLeadActionBtn: {
    backgroundColor: '#043A2F',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hotLeadActionBtnText: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: '#FFFFFF',
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
  ustaDashboardRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  ustaDashboardCard: {
    flex: 1,
    backgroundColor: staticColors.white,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  ustaDashboardIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  ustaDashboardStatNumber: {
    fontFamily: fonts.extraBold,
    fontSize: 28,
    color: staticColors.text,
    marginBottom: 2,
  },
  ustaDashboardStatLabel: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: staticColors.textSecondary,
    textAlign: 'center',
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
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: staticColors.text,
    textAlign: 'center',
    marginTop: 6,
  },
  toolCardDesc: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: staticColors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  toolsScrollContainer: {
    paddingVertical: 8,
    gap: 12,
  },
  toolCardModern: {
    width: 85,
    alignItems: 'center',
    paddingVertical: 4,
    marginRight: 8,
  },
  addProductBtn: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  addProductBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  addProductBtnText: {
    color: '#FFF',
    fontFamily: fonts.bold,
    fontSize: 11.5,
  },
  marketScrollContainer: {
    paddingVertical: 8,
    gap: 12,
  },
  marketCard: {
    width: 230,
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  marketCardGradient: {
    padding: 16,
    height: 185,
    justifyContent: 'space-between',
  },
  marketModalContent: {
    width: '100%',
    backgroundColor: '#0F172A',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  marketModalTitle: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: '#FFFFFF',
  },
  marketCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  marketCategoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  marketCategoryText: {
    fontFamily: fonts.bold,
    fontSize: 9,
    textTransform: 'uppercase',
  },
  marketDateText: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: '#64748B',
  },
  marketProductTitle: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    color: '#FFFFFF',
    marginTop: 8,
  },
  marketProductDesc: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 15,
    marginTop: 4,
  },
  marketCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 8,
    marginTop: 8,
  },
  marketPriceWrapper: {
    flexDirection: 'column',
  },
  marketPriceLabel: {
    fontFamily: fonts.medium,
    fontSize: 8.5,
    color: '#64748B',
    textTransform: 'uppercase',
  },
  marketPriceValue: {
    fontFamily: fonts.extraBold,
    fontSize: 14,
    color: '#FFF',
  },
  marketSellerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  marketSellerText: {
    fontFamily: fonts.bold,
    fontSize: 9,
    color: '#94A3B8',
  },
  // Form and Modal Elements
  formLabel: {
    fontFamily: fonts.bold,
    fontSize: 12.5,
    color: '#E2E8F0',
    marginTop: 12,
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    color: '#FFF',
    fontFamily: fonts.medium,
    fontSize: 13.5,
  },
  categoryPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  categoryPickerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  categoryPickerText: {
    fontFamily: fonts.bold,
    fontSize: 11.5,
    color: '#94A3B8',
  },
  submitBtn: {
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: '#FFF',
  },
  toolIconBoxModern: {
    width: 52,
    height: 52,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
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
  // Search Bar
  searchBarContainer: {
    marginTop: 16,
    marginBottom: 4,
  },
  searchBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 44,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  searchBarPlaceholder: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: 'rgba(255,255,255,0.65)',
    flex: 1,
  },
  // Vitrin / Showcase Carousel
  vitrinScroller: {
    paddingRight: 16,
    gap: 12,
  },
  vitrinColumn: {
    gap: 12,
  },
  vitrinCardSmall: {
    width: 250,
    height: 125,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  vitrinCardBg: {
    flex: 1,
  },
  vitrinCardBgImage: {
    borderRadius: 20,
  },
  vitrinCardGradient: {
    flex: 1,
    padding: 12,
    justifyContent: 'flex-end',
  },
  vitrinCardContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  vitrinIconCircleSm: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  vitrinCardTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  vitrinCardTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: '#FFF',
    marginBottom: 2,
  },
  vitrinCardDesc: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
  },
  // See All Button
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  // Featured Electricians - Horizontal Card Style
  featuredHorizontalScroller: {
    paddingRight: 16,
    gap: 12,
    paddingVertical: 4,
  },
  featuredHorizontalCard: {
    width: 150,
    backgroundColor: staticColors.white,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  featuredHCardImage: {
    width: '100%',
    height: 110,
    backgroundColor: '#F1F5F9',
  },
  featuredHCardImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  featuredHCardContent: {
    padding: 10,
  },
  featuredHCardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  featuredHCardName: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: staticColors.text,
    flex: 1,
  },
  featuredHCardSpecialty: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: staticColors.textSecondary,
    marginBottom: 4,
  },
  featuredHCardRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 3,
  },
  featuredHCardRating: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: '#D97706',
  },
  featuredHCardReviews: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: staticColors.textLight,
  },
  featuredHCardLocation: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: staticColors.textLight,
  },
  // Recent Job Cards (Horizontal Compact)
  recentJobsHorizontalScroller: {
    paddingRight: 16,
    gap: 12,
    paddingVertical: 4,
  },
  recentJobCardHorizontal: {
    width: 320,
    flexDirection: 'row',
    backgroundColor: staticColors.white,
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    alignItems: 'flex-start',
  },
  recentJobUserAvatar: {
    width: 70,
    height: 70,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  recentJobInfoHorizontal: {
    flex: 1,
    height: '100%',
  },
  recentJobHeaderHorizontal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  recentJobTitleHorizontal: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: staticColors.text,
    marginBottom: 2,
  },
  recentJobSubtextHorizontal: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: staticColors.textSecondary,
    marginBottom: 2,
  },
  recentJobCategoryTextHorizontal: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: staticColors.textLight,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)', // Light Amber
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    position: 'absolute',
    top: 0,
    right: 0,
  },
  timerBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 8,
    color: '#D97706',
  },
  homeTimerContainer: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  homeTimerBadgeMinimal: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  homeTimerLabelSmall: {
    fontFamily: fonts.medium,
    fontSize: 7.5,
    color: '#D97706',
    letterSpacing: 0.5,
  },
  homeTimerValueWrapper: {
    marginTop: -2,
  },
  bidStatProfessionalBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4', // Very light emerald tint
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1FAE5', // Emerald 100
  },
  bidStatProfessionalNumber: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: '#047857', // Emerald 700
    marginRight: 2,
  },
  bidStatProfessionalLabel: {
    fontFamily: fonts.medium,
    fontSize: 8,
    color: '#059669', // Emerald 600
    letterSpacing: 0.4,
  },
  priceTextContainer: {
    position: 'absolute',
    bottom: -4,
    right: 0,
    alignItems: 'flex-end',
  },
  priceTextLarge: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: '#3B82F6',
  },
  priceTextSmall: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: staticColors.textSecondary,
  },
});
