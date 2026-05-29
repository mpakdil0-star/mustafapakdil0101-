import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, TouchableOpacity, Modal, ImageBackground, Image, Platform, Dimensions, PanResponder, Alert, ActivityIndicator, AppState, Linking, TextInput, StatusBar } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchNotifications } from '../../store/slices/notificationSlice';
import { colors as staticColors } from '../../constants/colors';
import { useAppColors } from '../../hooks/useAppColors';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';
import { FeaturedElectrician } from '../../components/home/FeaturedElectrician';
import { CitizenHeader } from '../../components/home/CitizenHeader';
import { CitizenExploreCategories } from '../../components/home/CitizenExploreCategories';
import { CitizenUstaAndJobsSection } from '../../components/home/CitizenUstaAndJobsSection';
import { CitizenMarketplace } from '../../components/home/CitizenMarketplace';
import { CitizenReelsShowcase } from '../../components/home/CitizenReelsShowcase';
import { ElectricianHeader } from '../../components/home/ElectricianHeader';
import { ElectricianTools } from '../../components/home/ElectricianTools';
import { ElectricianRecentJobs } from '../../components/home/ElectricianRecentJobs';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../services/api';
import { authService } from '../../services/authService';
import { API_ENDPOINTS, getFileUrl } from '../../constants/api';
import { jobService } from '../../services/jobService';
import { userService } from '../../services/userService';
import HesKabloImage from '../../assets/images/mock_hes_kablo.jpg';
import SiemensSigortaImage from '../../assets/images/mock_siemens_sigorta.jpg';
import { messageService } from '../../services/messageService';
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
      Animated.delay(index * 40),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 45,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const getProfessionalName = (id: string, defaultName: string) => {
    if (id === 'elektrik') return 'Elektrik Ustası';
    if (id === 'cilingir') return 'Çilingir Hizmeti';
    if (id === 'klima') return 'Klima Servisi';
    if (id === 'beyaz-esya') return 'Beyaz Eşya Ustası';
    if (id === 'tesisat') return 'Tesisat Ustası';
    return defaultName;
  };

  const getCategorySubtext = (id: string) => {
    if (id === 'elektrik') return 'Arıza, Tesisat & Montaj';
    if (id === 'cilingir') return '7/24 Kilit & Kapı Açma';
    if (id === 'klima') return 'Bakım, Montaj & Onarım';
    if (id === 'beyaz-esya') return 'Cihaz Tamir & Onarım';
    if (id === 'tesisat') return 'Tesisat, Kaçak & Montaj';
    return 'Güvenilir Hizmetler';
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          styles.serviceCategoryHorizontalCard,
          { 
            shadowColor: '#0F172A',
            borderColor: 'rgba(13, 148, 136, 0.05)',
          }
        ]}
        onPress={() => onPress(cat.id)}
        activeOpacity={0.88}
      >
        {/* Modern Circular Lens Icon Container */}
        <View style={styles.serviceCategoryIconContainer}>
          <LinearGradient
            colors={['rgba(13, 148, 136, 0.06)', 'rgba(6, 182, 212, 0.12)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Ionicons name={cat.icon} size={20} color={colors.primary} />
        </View>

        {/* Text Content */}
        <View style={styles.serviceCategoryTextContainer}>
          <Text style={[styles.serviceCategoryTitleText, { color: colors.text }]} numberOfLines={1}>
            {getProfessionalName(cat.id, cat.name)}
          </Text>
          <Text style={styles.serviceCategorySubtextText} numberOfLines={1}>
            {getCategorySubtext(cat.id)}
          </Text>
        </View>

        {/* Interactive Chevron Indicator */}
        <View style={styles.categoryCardChevron}>
          <Ionicons name="chevron-forward" size={12} color="#94A3B8" />
        </View>
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

const defaultProducts = [
  {
    id: 'mock-market-1',
    title: '3x2.5 HES NYM Kablo (50 Metre)',
    desc: 'İnşaat fazlası rulo, hiç açılmamış ve kullanılmamıştır. Orijinal rulo paketindedir.',
    price: 1200,
    category: 'Kablo',
    sellerName: 'Ahmet Kaya (Vatandaş)',
    sellerId: 'mock-citizen-1',
    sellerType: 'CITIZEN',
    location: 'Kadıköy, İstanbul',
    date: 'Bugün',
    image: HesKabloImage,
  },
  {
    id: 'mock-market-2',
    title: 'Siemens 3 Faz Sigorta Grubu (25A)',
    desc: 'Sistem panosundan sökülen, çok temiz durumdaki 3 kutuplu Siemens sigortalar.',
    price: 450,
    category: 'Şalt Malzemesi',
    sellerName: 'Mustafa Yılmaz (Usta)',
    sellerId: 'mock-electrician-1',
    sellerType: 'ELECTRICIAN',
    location: 'Üsküdar, İstanbul',
    date: 'Dün',
    image: SiemensSigortaImage,
  }
];

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
  const [userLocations, setUserLocations] = useState<any[]>([]);
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
  const [marketplaceProducts, setMarketplaceProducts] = useState<any[]>([]);
  const displayProducts = marketplaceProducts.length > 0 ? marketplaceProducts : defaultProducts;
  const [isAddProductModalVisible, setIsAddProductModalVisible] = useState(false);
  const [isProductDetailModalVisible, setIsProductDetailModalVisible] = useState(false);
  const [isAllProductsModalVisible, setIsAllProductsModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  
  // Showcase / Hünerler States
  const [homeShowcaseItems, setHomeShowcaseItems] = useState<any[]>([]);
  const [selectedShowcaseItem, setSelectedShowcaseItem] = useState<any>(null);
  const [isShowcaseDetailModalVisible, setIsShowcaseDetailModalVisible] = useState(false);
  const [showcaseActiveImageIndex, setShowcaseActiveImageIndex] = useState(0);
  
  // New Product Form States
  const [newProdTitle, setNewProdTitle] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('Kablo');
  const [newProdPrice, setNewProdPrice] = useState('');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdLocation, setNewProdLocation] = useState('');
  const [newProdImages, setNewProdImages] = useState<string[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showPhotoSourceModal, setShowPhotoSourceModal] = useState(false);
  const [showFullscreenImage, setShowFullscreenImage] = useState<any>(null);
  const [isStartingChat, setIsStartingChat] = useState(false);

  useEffect(() => {
    if (isAddProductModalVisible) {
      const defaultLoc = userLocations.find(l => l.isDefault) || userLocations[0];
      if (defaultLoc) {
        const formatted = `${defaultLoc.district ? defaultLoc.district + ', ' : ''}${defaultLoc.city || ''}`.replace(/^, /, '').replace(/, $/, '');
        setNewProdLocation(formatted || user?.city || 'İstanbul');
      } else {
        setNewProdLocation(user?.city || 'İstanbul');
      }
    }
  }, [isAddProductModalVisible, user, userLocations]);

  // Marketplace Search and Filtering States
  const [marketSearchQuery, setMarketSearchQuery] = useState('');
  const [marketSelectedFilter, setMarketSelectedFilter] = useState('');

  // AsyncStorage key for marketplace persistence
  const MARKETPLACE_STORAGE_KEY = 'marketplace_products_v1';

  // Load marketplace products: AsyncStorage first, then try backend sync with smart local preservation
  const fetchMarketplaceProducts = useCallback(async () => {
    try {
      let localProducts: any[] = [];

      // 1. Load from AsyncStorage (instant, always works)
      const stored = await AsyncStorage.getItem(MARKETPLACE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          localProducts = parsed;
          setMarketplaceProducts(localProducts);
        }
      }

      // 2. Try backend sync silently (optional — won't error if 404)
      try {
        const response = await api.get(API_ENDPOINTS.MARKETPLACE);
        if (response.data?.success && Array.isArray(response.data.data)) {
          const backendProducts = response.data.data;

          // SMART SYNC: Keep all locally created listings flagged with isLocal or matching user ID
          const myLocalProducts = localProducts.filter(
            p => p.isLocal === true || p.sellerId === user?.id || p.sellerId === 'mock-current-user'
          );

          // Merge backend products with user's local products to avoid duplicates
          const merged = [...myLocalProducts];
          backendProducts.forEach((bProd: any) => {
            // If the backend product belongs to the user, ensure it is flagged as isLocal
            const isMyProduct = bProd.sellerId === user?.id || bProd.sellerId === 'mock-current-user';
            const mergedProd = isMyProduct ? { ...bProd, isLocal: true } : bProd;

            const existingIdx = merged.findIndex(mProd => mProd.id === mergedProd.id);
            if (existingIdx === -1) {
              merged.push(mergedProd);
            } else if (isMyProduct) {
              // Ensure the local flag is set/preserved in the local array
              merged[existingIdx] = { ...merged[existingIdx], isLocal: true };
            }
          });

          setMarketplaceProducts(merged);
          await AsyncStorage.setItem(MARKETPLACE_STORAGE_KEY, JSON.stringify(merged));
        }
      } catch (_backendErr) {
        // Backend doesn't support marketplace yet — silently ignore
      }
    } catch (error) {
      console.log('Marketplace load error:', error);
    }
  }, [user]);

  // Save marketplace products to AsyncStorage
  const saveMarketplaceToStorage = async (products: any[]) => {
    try {
      await AsyncStorage.setItem(MARKETPLACE_STORAGE_KEY, JSON.stringify(products));
    } catch (_e) {
      // Silently ignore storage errors
    }
  };

  const fetchHomeShowcase = async () => {
    try {
      const response = await api.get('/showcase');
      if (response.data?.success && Array.isArray(response.data.data) && response.data.data.length > 0) {
        // Build a map of electrician avatars to backfill missing ones (e.g. for items uploaded before the avatar change)
        let electriciansMap: Record<string, { profileImageUrl?: string; ratingAverage?: number; ratingCount?: number; city?: string }> = {};
        try {
          const elecRes = await userService.getElectricians({});
          if (elecRes && elecRes.success && Array.isArray(elecRes.data)) {
            elecRes.data.forEach((elec: any) => {
              if (elec.id) {
                electriciansMap[elec.id] = {
                  profileImageUrl: elec.profileImageUrl || undefined,
                  ratingAverage: elec.ratingAverage ?? undefined,
                  ratingCount: elec.ratingCount ?? undefined,
                  city: elec.city || (elec.locations && elec.locations[0]?.city) || undefined,
                };
              }
            });
          }
        } catch (err) {
          console.log('Error fetching electricians map for showcase:', err);
        }

        // Group by ustaId and keep the latest item for each usta
        const grouped: Record<string, any> = {};
        response.data.data.forEach((item: any) => {
          if (!grouped[item.ustaId]) {
            const elecInfo = electriciansMap[item.ustaId] || {};
            grouped[item.ustaId] = {
              ...item,
              ustaAvatar: item.ustaAvatar || elecInfo.profileImageUrl || null,
              ustaRatingAverage: item.ustaRatingAverage ?? elecInfo.ratingAverage ?? null,
              ustaRatingCount: item.ustaRatingCount ?? elecInfo.ratingCount ?? null,
              ustaCity: item.ustaCity || elecInfo.city || null,
            };
          }
        });
        setHomeShowcaseItems(Object.values(grouped));
      } else {
        // Fallback to beautiful mock showcase items if empty or error
        const mockItems = [
          { id: 'sc-1', title: 'Pano Kablolama Tesisatı', description: 'Schneider şalt malzemesi ile özenle çekilmiş endüstriyel dağıtım panosu.', image: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500', ustaName: 'Ahmet Yılmaz (Usta)', ustaId: 'mock-electrician-1', ustaAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100' },
          { id: 'sc-2', title: 'Akıllı Ev LED Tasarımları', description: 'Modern mimariye uygun lüks asma tavan aydınlatma ve otomasyon kurulumu.', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=500', ustaName: 'Mustafa Kaya (Usta)', ustaId: 'mock-electrician-3', ustaAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100' },
          { id: 'sc-3', title: 'Sigorta Kutusu Revizyonu', description: 'Eski tip panonun sıfır Siemens malzemeleri ile güvenli bir şekilde yenilenmesi.', image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=500', ustaName: 'Bülent Tan (Usta)', ustaId: 'mock-electrician-4', ustaAvatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100' },
          { id: 'sc-4', title: 'Güvenlik Kamera Altyapısı', description: '4K UltraHD Dahua IP kamera kurulumu ve kablo kanallama işçiliği.', image: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=500', ustaName: 'Mustafa Yılmaz (Usta)', ustaId: 'mock-electrician-1', ustaAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100' },
          { id: 'sc-5', title: 'Klima Dezenfekte ve Bakımı', description: 'Antibakteriyel solüsyon ile detaylı klima iç ünite petek temizliği.', image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=500', ustaName: 'Tuğçe Klimacı (Usta)', ustaId: 'mock-electrician-2', ustaAvatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100' },
          { id: 'sc-6', title: 'Sıfır Daire Kablo Çekimi', description: 'Tüm dairenin tadilat öncesi güvenli NYM kablolama ve borulama işlemi.', image: 'https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=500', ustaName: 'Ahmet Kaya (Usta)', ustaId: 'mock-electrician-5', ustaAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100' }
        ];
        const grouped: Record<string, any> = {};
        mockItems.forEach((item: any) => {
          if (!grouped[item.ustaId]) {
            grouped[item.ustaId] = item;
          }
        });
        setHomeShowcaseItems(Object.values(grouped));
      }
    } catch (_err) {
      // Fallback
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchMarketplaceProducts();
      fetchHomeShowcase();
    }, [fetchMarketplaceProducts])
  );

  const handleChooseFromGallery = async () => {
    try {
      const remainingCount = 5 - newProdImages.length;
      if (remainingCount <= 0) {
        Alert.alert('Sınır Aşıldı', 'En fazla 5 adet fotoğraf yükleyebilirsiniz.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: remainingCount,
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newImages = result.assets.map(asset => 
          asset.base64 
            ? `data:image/jpeg;base64,${asset.base64}` 
            : asset.uri
        );
        setNewProdImages(prev => {
          const combined = [...prev, ...newImages];
          return combined.slice(0, 5);
        });
      }
    } catch (error) {
      Alert.alert('Hata', 'Fotoğraf seçilirken bir hata oluştu.');
    }
  };

  const handleTakePhoto = async () => {
    try {
      if (newProdImages.length >= 5) {
        Alert.alert('Sınır Aşıldı', 'En fazla 5 adet fotoğraf yükleyebilirsiniz.');
        return;
      }

      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Kamera İzni Gerekli', 'Fotoğraf çekebilmek için kamera erişim izni vermelisiniz. Lütfen cihaz ayarlarından izin verin.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        const base64Str = result.assets[0].base64 
          ? `data:image/jpeg;base64,${result.assets[0].base64}` 
          : result.assets[0].uri;
        setNewProdImages(prev => [...prev, base64Str]);
      }
    } catch (error) {
      Alert.alert('Hata', 'Fotoğraf çekilirken bir hata oluştu.');
    }
  };

  const handlePickProductImage = () => {
    if (newProdImages.length >= 5) {
      Alert.alert('Sınır Aşıldı', 'En fazla 5 adet fotoğraf yükleyebilirsiniz.');
      return;
    }
    setShowPhotoSourceModal(true);
  };

  const handleContactSeller = async (sellerId: string, sellerName: string) => {
    if (!isAuthenticated) {
      setPendingAction({ path: '/(tabs)/index' });
      setShowAuthModal(true);
      return;
    }

    if (sellerId === user?.id) {
      Alert.alert('Bilgi', 'Kendi ilanınız için sohbet başlatamazsınız.');
      return;
    }

    setIsStartingChat(true);
    try {
      // Create or locate the conversation with the EXACT seller of the product
      let conversation: any = null;
      try {
        conversation = await messageService.findOrCreateConversation(sellerId);
      } catch (innerErr) {
        console.warn('⚠️ findOrCreateConversation threw, generating local mock:', innerErr);
      }

      // If the API call returned null or threw, build a local mock conversation
      if (!conversation || !conversation.id) {
        const mockId = `mock-conv-${sellerId}-${user?.id || 'guest'}`;
        conversation = { id: mockId };
      }
      
      setIsProductDetailModalVisible(false);
      router.push({
        pathname: `/messages/${conversation.id}`,
        params: { sellerName: sellerName, sellerId: sellerId }
      });
    } catch (err) {
      // Last-resort fallback
      console.warn('⚠️ handleContactSeller outer catch:', err);
      const fallbackId = `mock-conv-${sellerId}-fallback`;
      setIsProductDetailModalVisible(false);
      router.push({
        pathname: `/messages/${fallbackId}`,
        params: { sellerName: sellerName, sellerId: sellerId }
      });
    } finally {
      setIsStartingChat(false);
    }
  };

  const handleAddProduct = async () => {
    if (!newProdTitle.trim() || !newProdPrice.trim() || !newProdDesc.trim() || !newProdLocation.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen tüm alanları doldurun.');
      return;
    }

    const priceNum = parseFloat(newProdPrice);
    if (isNaN(priceNum)) {
      Alert.alert('Geçersiz Fiyat', 'Lütfen geçerli bir sayı girin.');
      return;
    }

    const userLocation = newProdLocation.trim();

    const newProduct = {
      id: `prod-${Date.now()}`,
      title: newProdTitle,
      price: priceNum,
      category: newProdCategory,
      sellerName: user?.fullName ? `${user.fullName} (${isElectrician ? 'Usta' : 'Vatandaş'})` : (isElectrician ? 'Mustafa Yılmaz (Usta)' : 'Ahmet Kaya (Vatandaş)'),
      sellerId: user?.id || 'mock-current-user',
      sellerType: isElectrician ? 'ELECTRICIAN' : 'CITIZEN',
      location: userLocation,
      desc: newProdDesc,
      date: 'Bugün',
      image: newProdImages.length > 0 ? newProdImages[0] : null,
      images: newProdImages,
      isLocal: true, // Flag to identify custom local products across logouts
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
        // Map over the backend response and restore/ensure isLocal flag is set to true for our custom products
        const mergedData = response.data.data.map((bProd: any) => {
          const isMatch = bProd.id === newProduct.id || updatedProducts.some(p => p.id === bProd.id && p.isLocal);
          if (isMatch) {
            return { ...bProd, isLocal: true };
          }
          return bProd;
        });
        setMarketplaceProducts(mergedData);
        await saveMarketplaceToStorage(mergedData);
      }
    } catch (_e) {
      // Backend not available — already saved locally
    }

    setIsUploadingImage(false);
    setNewProdTitle('');
    setNewProdPrice('');
    setNewProdDesc('');
    setNewProdLocation('');
    setNewProdCategory('Kablo');
    setNewProdImages([]);
    setIsAddProductModalVisible(false);
    Alert.alert('Başarılı', 'İlanınız pazar yerinde başarıyla yayınlandı! 🚀');
  };

  const handleDeleteProduct = async (productId: string) => {
    Alert.alert(
      'İlanı Sil',
      'Bu ilanı pazar yerinden tamamen silmek istediğinize emin misiniz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Evet, Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              // 1. Local state update
              const updatedProducts = marketplaceProducts.filter(p => p.id !== productId);
              setMarketplaceProducts(updatedProducts);
              await saveMarketplaceToStorage(updatedProducts);
              
              // Close detail modal
              setIsProductDetailModalVisible(false);
              setSelectedProduct(null);

              // 2. Backend sync (skip if mock product)
              if (!productId.startsWith('mock-')) {
                await api.delete(`${API_ENDPOINTS.MARKETPLACE}/${productId}`);
              }
              
              Alert.alert('Başarılı', 'İlan başarıyla silindi.');
            } catch (error) {
              console.log('Error deleting product:', error);
            }
          }
        }
      ]
    );
  };

  const handleMarkAsSold = async (productId: string) => {
    Alert.alert(
      'Satıldı Olarak İşaretle',
      'Bu ürünü satıldı olarak işaretlemek istiyor musunuz? Bu işlem geri alınamaz ve iletişim kapatılır.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Evet, Satıldı',
          onPress: async () => {
            try {
              // 1. Local state update
              const updatedProducts = marketplaceProducts.map(p => {
                if (p.id === productId) {
                  return { ...p, isSold: true };
                }
                return p;
              });
              setMarketplaceProducts(updatedProducts);
              await saveMarketplaceToStorage(updatedProducts);

              // Close detail modal or update selectedProduct in modal
              setIsProductDetailModalVisible(false);
              setSelectedProduct(null);

              // 2. Backend sync (skip if mock product)
              if (!productId.startsWith('mock-')) {
                await api.put(`${API_ENDPOINTS.MARKETPLACE}/${productId}`);
              }

              Alert.alert('Tebrikler 🎉', 'Ürününüz satıldı olarak işaretlendi!');
            } catch (error) {
              console.log('Error marking product as sold:', error);
            }
          }
        }
      ]
    );
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
  const mockExpire1 = useRef(new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()).current;
  const mockExpire2 = useRef(new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString()).current;
  const mockExpire3 = useRef(new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString()).current;


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
        params.serviceCategory = user?.electricianProfile?.serviceCategory || (user as any)?.serviceCategory || 'elektrik';
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
            isElectrician
              ? authService.getVerificationStatus().catch(() => ({ data: { status: null } }))
              : Promise.resolve({ data: { status: null } } as any)
          ]);
          
          if (locRes.data.success) {
            setUserLocations(locRes.data.data);
            setLocationsCount(locRes.data.data.length);
            const cities = locRes.data.data.map((l: any) => l.city).filter(Boolean);
            setUserCities(prev => JSON.stringify(prev) === JSON.stringify(cities) ? prev : cities);
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
                setUserLocations(locations);
                const cities = locations.map((l: any) => l.city).filter(Boolean);
                setUserCities(prev => JSON.stringify(prev) === JSON.stringify(cities) ? prev : cities);
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
            isElectrician ? fetchVerification() : Promise.resolve(),
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
    <View style={[styles.container, { backgroundColor: isElectrician ? colors.background : colors.backgroundLight }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={[
          styles.premiumHeaderContainer, 
          isElectrician ? { 
            backgroundColor: colors.headerDeepSlate || '#4682B4', 
            shadowColor: '#4682B4', 
            shadowOffset: { width: 0, height: 4 }, 
            shadowOpacity: 0.04,
            shadowRadius: 8, 
            elevation: 2,
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
          } : {
            shadowColor: colors.primary,
          }
        ]}>
          {isElectrician ? (
            <ImageBackground
              source={require('../../assets/images/header_bg.png')}
              style={[styles.premiumHeader, { backgroundColor: colors.headerDeepSlate || '#4682B4', borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.15)' }]}
              imageStyle={[styles.headerImage, { opacity: 0.05 }]}
            >
              <LinearGradient
                colors={[colors.headerDeepSlate || '#4682B4', '#2E5C8A']}
                style={StyleSheet.absoluteFill}
              />
              <StatusBar 
                barStyle="light-content" 
                backgroundColor={colors.headerDeepSlate || '#4682B4'} 
                translucent={false}
              />
              <ElectricianHeader
                user={user}
                firstName={firstName}
                lastName={lastName}
                unreadCount={unreadCount}
                badgePulseAnim={badgePulseAnim}
                handleActionWithAuth={handleActionWithAuth}
                colors={colors}
                stats={stats}
                ustaCategoryTitle={getUstaCategory(user || { serviceCategory: 'elektrik' })}
                isAuthenticated={isAuthenticated}
              />
            </ImageBackground>
          ) : (
            <ImageBackground
              source={require('../../assets/images/header_bg.png')}
              style={styles.premiumHeader}
              imageStyle={styles.headerImage}
            >
              {/* Vibrant Gradient Overlay */}
              <LinearGradient
                colors={(colors.gradientHeaderAmethyst as any) || [colors.primary + '88', colors.primaryLight + 'DD']}
                style={StyleSheet.absoluteFill}
              />

              {/* Glowing Decorative Circles */}
              <View style={styles.headerDecorativeCircle1} />
              <View style={styles.headerDecorativeCircle2} />
              <View style={styles.headerDecorativeCircle3} />

              <CitizenHeader
                user={user}
                isAuthenticated={isAuthenticated}
                unreadCount={unreadCount}
                badgePulseAnim={badgePulseAnim}
                handleActionWithAuth={handleActionWithAuth}
                colors={colors}
              />
            </ImageBackground>
          )}
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
                    <View style={[styles.healthIconContainer, { backgroundColor: colors.primary }]}>
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
                        { backgroundColor: colors.primary },
                        { transform: [{ scale: healthPulseAnim }] }
                      ]}
                    >
                      <Text style={styles.healthActionText}>{isElectrician ? 'GİT' : 'BAŞLA'}</Text>
                      <Ionicons name="flash" size={14} color={staticColors.white} />
                    </Animated.View>
                  </View>

                  {/* Dynamic Progress Bar */}
                  <View style={styles.healthProgressRow}>
                    <View style={styles.healthProgressBarBg}>
                      <View style={[styles.healthProgressBarFill, { width: `${completionPercent}%`, backgroundColor: colors.primary }]} />
                    </View>
                    <Text style={[styles.healthProgressPercent, { color: colors.primary, fontFamily: fonts.bold }]}>%{completionPercent}</Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            </View>
          )
        }

        {/* Electrician Quick Actions (RESTORED) */}
        {isElectrician && (
          <>
            <ElectricianTools
              handleActionWithAuth={handleActionWithAuth}
              colors={colors}
            />

            <ElectricianRecentJobs
              recentJobs={recentJobs}
              colors={colors}
              handleActionWithAuth={handleActionWithAuth}
              mockExpire1={mockExpire1}
              mockExpire2={mockExpire2}
              mockExpire3={mockExpire3}
            />
          </>
        )}

        {/* Vitrin / Showcase Section (Citizen Only) */}
        {/* Vitrin / Showcase Section (Citizen Only) */}
        {!isElectrician && (
          <CitizenReelsShowcase
            homeShowcaseItems={homeShowcaseItems}
            colors={colors}
            setSelectedShowcaseItem={setSelectedShowcaseItem}
            setShowcaseActiveImageIndex={setShowcaseActiveImageIndex}
            setIsShowcaseDetailModalVisible={setIsShowcaseDetailModalVisible}
            isAuthenticated={isAuthenticated}
            onAuthRequired={() => setShowAuthModal(true)}
          />
        )}

        {/* KEŞFET - Main Service Categories Section (Citizen Only) */}
        {!isElectrician && (
          <CitizenExploreCategories
            colors={colors}
            handleActionWithAuth={handleActionWithAuth}
          />
        )}



        {/* Toggleable Section: Son İş İlanları / Öne Çıkan Ustalar (Citizen Only) */}
        {!isElectrician && (
          <CitizenUstaAndJobsSection
            activeHomeTab={activeHomeTab}
            setActiveHomeTab={setActiveHomeTab}
            isLoadingRecentJobs={isLoadingRecentJobs}
            recentJobs={recentJobs}
            isLoadingElectricians={isLoadingElectricians}
            featuredElectricians={featuredElectricians}
            colors={colors}
            isAuthenticated={isAuthenticated}
            onAuthRequired={() => setShowAuthModal(true)}
          />
        )}

        {/* ==================== PAZAR YERİ & İKİNCİ EL ==================== */}
        <CitizenMarketplace
          marketplaceProducts={marketplaceProducts}
          colors={colors}
          setIsAllProductsModalVisible={setIsAllProductsModalVisible}
          setIsAddProductModalVisible={setIsAddProductModalVisible}
          setSelectedProduct={setSelectedProduct}
          setIsProductDetailModalVisible={setIsProductDetailModalVisible}
          isAuthenticated={isAuthenticated}
          onAuthRequired={() => setShowAuthModal(true)}
        />

        {/* ==================== YENİ İLAN EKLE MODAL ==================== */}
        <Modal
          visible={isAddProductModalVisible}
          transparent={false}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setIsAddProductModalVisible(false)}
        >
          <LinearGradient
            colors={['#F8FAFC', '#F0FDFA', '#F8FAFC']}
            style={{ flex: 1 }}
          >
            {/* Background Glow Blobs */}
            <View style={{ position: 'absolute', top: -100, right: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: colors.primary, opacity: 0.04 }} />
            <View style={{ position: 'absolute', bottom: -100, left: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: '#0EA5E9', opacity: 0.03 }} />

            <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 56 : 24, paddingBottom: 16 }}>
              {/* Header Row */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingHorizontal: 2 }}>
                <View>
                  <Text style={{ fontSize: 22, fontFamily: fonts.bold, color: '#0F172A', letterSpacing: -0.3 }}>
                    Ürün Satış İlanı Ekle
                  </Text>
                  <Text style={{ fontSize: 12, fontFamily: fonts.medium, color: '#64748B', marginTop: 1 }}>
                    Eşyalarınızı ustalar veya vatandaşlar ile paylaşın
                  </Text>
                </View>
                <TouchableOpacity 
                  onPress={() => setIsAddProductModalVisible(false)} 
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: '#FFFFFF',
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    shadowColor: '#0F172A',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 6,
                    elevation: 2,
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close-outline" size={24} color="#475569" />
                </TouchableOpacity>
              </View>

              <ScrollView 
                style={{ marginTop: 12 }} 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 32 }}
              >
                {/* Photo Upload Zone */}
                <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: '#334155', marginTop: 8, marginBottom: 8 }}>
                  Ürün Fotoğrafları (En fazla 5 adet)
                </Text>
                
                {newProdImages.length === 0 ? (
                  <TouchableOpacity
                    style={{
                      height: 120,
                      borderRadius: 18,
                      borderStyle: 'dashed',
                      borderWidth: 1.5,
                      borderColor: colors.primary,
                      backgroundColor: '#FFFFFF',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginBottom: 16,
                      gap: 6,
                      shadowColor: '#0F172A',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.02,
                      shadowRadius: 8,
                      elevation: 1,
                    }}
                    onPress={handlePickProductImage}
                    activeOpacity={0.7}
                  >
                    <View style={{
                      width: 42,
                      height: 42,
                      borderRadius: 21,
                      backgroundColor: 'rgba(13, 148, 136, 0.08)',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}>
                      <Ionicons name="camera-outline" size={22} color={colors.primary} />
                    </View>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: 12.5, fontFamily: fonts.bold, color: '#1E293B' }}>Fotoğraf Seç veya Çek</Text>
                      <Text style={{ fontSize: 10, fontFamily: fonts.medium, color: '#64748B', marginTop: 2 }}>Galeriden yükleyin veya kamera ile çekin</Text>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }} contentContainerStyle={{ paddingVertical: 4 }}>
                    {newProdImages.map((img, index) => (
                      <View 
                        key={index} 
                        style={{ 
                          position: 'relative', 
                          width: 88, 
                          height: 88, 
                          borderRadius: 14, 
                          overflow: 'hidden', 
                          marginRight: 12, 
                          borderWidth: 1, 
                          borderColor: '#E2E8F0',
                          backgroundColor: '#FFFFFF',
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.05,
                          shadowRadius: 4,
                          elevation: 2,
                        }}
                      >
                        <Image source={{ uri: img }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                        <TouchableOpacity
                          style={{ 
                            position: 'absolute', 
                            top: 4, 
                            right: 4, 
                            backgroundColor: 'rgba(239, 68, 68, 0.9)', 
                            width: 22,
                            height: 22,
                            borderRadius: 11,
                            justifyContent: 'center',
                            alignItems: 'center',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.2,
                            shadowRadius: 2,
                          }}
                          onPress={() => {
                            setNewProdImages(prev => prev.filter((_, i) => i !== index));
                          }}
                        >
                          <Ionicons name="trash-outline" size={12} color="#FFFFFF" />
                        </TouchableOpacity>
                        
                        {index === 0 && (
                          <View style={{ 
                            position: 'absolute', 
                            bottom: 0, 
                            left: 0, 
                            right: 0, 
                            backgroundColor: colors.primary, 
                            paddingVertical: 2, 
                            alignItems: 'center' 
                          }}>
                            <Text style={{ color: '#FFFFFF', fontSize: 8.5, fontFamily: fonts.bold, letterSpacing: 0.3 }}>KAPAK</Text>
                          </View>
                        )}
                      </View>
                    ))}
                    
                    {newProdImages.length < 5 && (
                      <TouchableOpacity
                        style={{
                          width: 88,
                          height: 88,
                          borderRadius: 14,
                          borderStyle: 'dashed',
                          borderWidth: 1.5,
                          borderColor: colors.primary,
                          backgroundColor: '#FFFFFF',
                          justifyContent: 'center',
                          alignItems: 'center',
                          gap: 4
                        }}
                        onPress={handlePickProductImage}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="add" size={20} color={colors.primary} />
                        <Text style={{ fontSize: 9.5, fontFamily: fonts.bold, color: colors.primary }}>Görsel Ekle</Text>
                        <Text style={{ fontSize: 8.5, fontFamily: fonts.medium, color: '#94A3B8' }}>{newProdImages.length}/5</Text>
                      </TouchableOpacity>
                    )}
                  </ScrollView>
                )}

                {/* Form Group: Product Name */}
                <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: '#334155', marginTop: 8, marginBottom: 8 }}>
                  Ürün Adı *
                </Text>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  height: 50,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.01,
                  shadowRadius: 4,
                  elevation: 1,
                }}>
                  <Ionicons name="cube-outline" size={18} color="#94A3B8" style={{ marginRight: 10 }} />
                  <TextInput
                    style={{ flex: 1, color: '#0F172A', fontFamily: fonts.medium, fontSize: 13.5, height: '100%', paddingVertical: 0 }}
                    placeholder="Örn: Makita Şarjlı Matkap, 50m Kablo vb."
                    placeholderTextColor="#94A3B8"
                    value={newProdTitle}
                    onChangeText={setNewProdTitle}
                  />
                </View>

                {/* Form Group: Category Selection */}
                <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: '#334155', marginTop: 14, marginBottom: 8 }}>
                  Kategori Seçimi *
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, marginBottom: 4 }}>
                  {['El Aleti', 'Kablo', 'Şalt / Malzeme', 'Diğer'].map((cat) => {
                    const isSelected = newProdCategory === cat;
                    
                    let iconName: any = 'cube-outline';
                    if (cat === 'El Aleti') iconName = 'hammer-outline';
                    else if (cat === 'Kablo') iconName = 'git-commit-outline';
                    else if (cat === 'Şalt / Malzeme') iconName = 'flash-outline';

                    return (
                      <TouchableOpacity
                        key={cat}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '48.4%',
                          height: 44,
                          borderRadius: 14,
                          backgroundColor: isSelected ? colors.primary : '#FFFFFF',
                          borderWidth: 1,
                          borderColor: isSelected ? colors.primary : '#E2E8F0',
                          shadowColor: isSelected ? colors.primary : '#000',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: isSelected ? 0.08 : 0.01,
                          shadowRadius: 4,
                          elevation: 1,
                        }}
                        onPress={() => setNewProdCategory(cat)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name={iconName} size={15} color={isSelected ? '#FFFFFF' : '#64748B'} style={{ marginRight: 6 }} />
                        <Text style={{ 
                          color: isSelected ? '#FFFFFF' : '#475569', 
                          fontFamily: isSelected ? fonts.bold : fonts.semiBold, 
                          fontSize: 12.5 
                        }}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Form Group: Price */}
                <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: '#334155', marginTop: 14, marginBottom: 8 }}>
                  Fiyat (₺) *
                </Text>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  height: 50,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.01,
                  shadowRadius: 4,
                  elevation: 1,
                }}>
                  <Ionicons name="card-outline" size={18} color="#94A3B8" style={{ marginRight: 10 }} />
                  <TextInput
                    style={{ flex: 1, color: '#0F172A', fontFamily: fonts.medium, fontSize: 13.5, height: '100%', paddingVertical: 0 }}
                    placeholder="Örn: 1500"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    value={newProdPrice}
                    onChangeText={setNewProdPrice}
                  />
                </View>

                {/* Form Group: Location */}
                <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: '#334155', marginTop: 14, marginBottom: 8 }}>
                  Konum (Şehir/İlçe) *
                </Text>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  height: 50,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.01,
                  shadowRadius: 4,
                  elevation: 1,
                }}>
                  <Ionicons name="pin-outline" size={18} color="#94A3B8" style={{ marginRight: 10 }} />
                  <TextInput
                    style={{ flex: 1, color: '#0F172A', fontFamily: fonts.medium, fontSize: 13.5, height: '100%', paddingVertical: 0 }}
                    placeholder="Örn: Ankara, Keçiören"
                    placeholderTextColor="#94A3B8"
                    value={newProdLocation}
                    onChangeText={setNewProdLocation}
                  />
                </View>

                {/* Form Group: Description */}
                <Text style={{ fontFamily: fonts.bold, fontSize: 13, color: '#334155', marginTop: 14, marginBottom: 8 }}>
                  Ürün Açıklaması *
                </Text>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  height: 100,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.01,
                  shadowRadius: 4,
                  elevation: 1,
                }}>
                  <Ionicons name="document-text-outline" size={18} color="#94A3B8" style={{ marginRight: 10, marginTop: 2 }} />
                  <TextInput
                    style={{ flex: 1, color: '#0F172A', fontFamily: fonts.medium, fontSize: 13.5, height: '100%', paddingVertical: 0, textAlignVertical: 'top' }}
                    placeholder="Ürünün durumu, markası ve teslimat bilgileri..."
                    placeholderTextColor="#94A3B8"
                    multiline={true}
                    numberOfLines={4}
                    value={newProdDesc}
                    onChangeText={setNewProdDesc}
                  />
                </View>

                {/* Submit button */}
                <TouchableOpacity
                  style={{
                    backgroundColor: colors.primary,
                    borderRadius: 14,
                    height: 52,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginTop: 24,
                    shadowColor: colors.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.15,
                    shadowRadius: 8,
                    elevation: 3,
                  }}
                  onPress={handleAddProduct}
                  activeOpacity={0.8}
                  disabled={isUploadingImage}
                >
                  {isUploadingImage ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={{ color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 14.5 }}>
                      İlanı Yayınla
                    </Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </LinearGradient>
        </Modal>

        {/* ==================== FOTOĞRAF SEÇİM YÖNTEMİ MODAL (PREMIUM THEME) ==================== */}
        <Modal
          visible={showPhotoSourceModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowPhotoSourceModal(false)}
        >
          <View style={styles.hiwModalOverlay}>
            <View style={[styles.marketModalContent, { width: '90%', paddingBottom: 24 }]}>
              <View style={styles.hiwHeader}>
                <Text style={styles.marketModalTitle}>Fotoğraf Ekle</Text>
                <TouchableOpacity onPress={() => setShowPhotoSourceModal(false)} style={styles.hiwCloseBtn}>
                  <Ionicons name="close" size={20} color="#FFF" />
                </TouchableOpacity>
              </View>

              <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 13, fontFamily: fonts.medium, marginBottom: 20 }}>
                Ürününüzün fotoğrafını nasıl eklemek istersiniz?
              </Text>

              <View style={{ gap: 12 }}>
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    padding: 16,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                  }}
                  activeOpacity={0.7}
                  onPress={() => {
                    setShowPhotoSourceModal(false);
                    handleTakePhoto();
                  }}
                >
                  <View style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', padding: 10, borderRadius: 12, marginRight: 14 }}>
                    <Ionicons name="camera" size={20} color="#F59E0B" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#FFF', fontSize: 14, fontFamily: fonts.bold }}>Kamera ile Fotoğraf Çek</Text>
                    <Text style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 11, fontFamily: fonts.medium, marginTop: 2 }}>
                      Kameranızı açarak anlık bir ürün fotoğrafı çekin
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="rgba(255, 255, 255, 0.3)" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    padding: 16,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                  }}
                  activeOpacity={0.7}
                  onPress={() => {
                    setShowPhotoSourceModal(false);
                    handleChooseFromGallery();
                  }}
                >
                  <View style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', padding: 10, borderRadius: 12, marginRight: 14 }}>
                    <Ionicons name="images" size={20} color="#F59E0B" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#FFF', fontSize: 14, fontFamily: fonts.bold }}>Galeriden Görsel Seç</Text>
                    <Text style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 11, fontFamily: fonts.medium, marginTop: 2 }}>
                      Cihazınızın galerisinden mevcut bir görsel yükleyin
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="rgba(255, 255, 255, 0.3)" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    paddingVertical: 14,
                    borderRadius: 16,
                    alignItems: 'center',
                    marginTop: 8,
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.05)',
                  }}
                  activeOpacity={0.7}
                  onPress={() => setShowPhotoSourceModal(false)}
                >
                  <Text style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 13, fontFamily: fonts.bold }}>Vazgeç</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ==================== TÜM PAZAR YERİ İLANLARI MODAL ==================== */}
        <Modal
          visible={isAllProductsModalVisible}
          transparent={false}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setIsAllProductsModalVisible(false)}
        >
          <LinearGradient
            colors={['#F8FAFC', '#F0FDFA', '#F8FAFC']}
            style={{ flex: 1 }}
          >
            {/* Background Ambient Glow Blobs */}
            <View style={{ position: 'absolute', top: -80, right: -80, width: 280, height: 280, borderRadius: 140, backgroundColor: colors.primary, opacity: 0.05 }} />
            <View style={{ position: 'absolute', bottom: -80, left: -80, width: 280, height: 280, borderRadius: 140, backgroundColor: '#0EA5E9', opacity: 0.04 }} />

            <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 56 : 48, paddingBottom: 0 }}>
              
              {/* Premium Header Row */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, paddingHorizontal: 2 }}>
                <View>
                  <Text style={{ fontSize: 23, fontFamily: fonts.extraBold, color: '#0F172A', letterSpacing: -0.5 }}>
                    Pazar Yeri & İkinci El
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 4 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' }} />
                    <Text style={{ fontSize: 12, fontFamily: fonts.bold, color: '#64748B' }}>
                      {(() => {
                        const totalCount = displayProducts.length;
                        const filteredCount = displayProducts.filter((p) => {
                          const matchesSearch = p.title.toLowerCase().includes(marketSearchQuery.toLowerCase()) ||
                            p.desc.toLowerCase().includes(marketSearchQuery.toLowerCase()) ||
                            p.sellerName.toLowerCase().includes(marketSearchQuery.toLowerCase());
                          const matchesCat = marketSelectedFilter === '' || p.category.includes(marketSelectedFilter) || marketSelectedFilter.includes(p.category);
                          return matchesSearch && matchesCat;
                        }).length;
                        return marketSearchQuery || marketSelectedFilter
                          ? `${filteredCount} ilan bulundu (Toplam ${totalCount})`
                          : `${totalCount} aktif ilan listeleniyor`;
                      })()}
                    </Text>
                  </View>
                </View>
                
                {/* Minimalist Close Button */}
                <TouchableOpacity 
                  onPress={() => setIsAllProductsModalVisible(false)} 
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    backgroundColor: '#FFFFFF',
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    shadowColor: '#0F172A',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.04,
                    shadowRadius: 6,
                    elevation: 2,
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={20} color="#475569" />
                </TouchableOpacity>
              </View>

              {/* Advanced Search Bar with Focus Shadows */}
              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                backgroundColor: '#FFFFFF', 
                borderRadius: 14, 
                paddingHorizontal: 14, 
                height: 48, 
                marginTop: 10, 
                marginBottom: 10, 
                borderWidth: 1, 
                borderColor: '#E2E8F0',
                shadowColor: '#0F172A',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.02,
                shadowRadius: 8,
                elevation: 2,
              }}>
                <Ionicons name="search-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
                <TextInput
                  style={{ flex: 1, color: '#0F172A', fontFamily: fonts.medium, fontSize: 13.5, height: '100%', paddingVertical: 0 }}
                  placeholder="Ürün adı, satıcı veya kategori ara..."
                  placeholderTextColor="#94A3B8"
                  value={marketSearchQuery}
                  onChangeText={setMarketSearchQuery}
                />
                {marketSearchQuery.length > 0 && (
                  <TouchableOpacity 
                    onPress={() => setMarketSearchQuery('')}
                    style={{ padding: 4 }}
                  >
                    <Ionicons name="close-circle" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Dynamic Category Selector Tabs */}
              <View style={{ height: 40, marginBottom: 10 }}>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 2 }}
                >
                  {['Tümü', 'El Aleti', 'Kablo', 'Şalt / Malzeme', 'Diğer'].map((cat) => {
                    const isSelected = (cat === 'Tümü' && marketSelectedFilter === '') || (marketSelectedFilter === cat);
                    
                    // Count items in this category dynamically
                    const categoryCount = (() => {
                      if (cat === 'Tümü') return displayProducts.length;
                      return displayProducts.filter(p => p.category.includes(cat) || cat.includes(p.category)).length;
                    })();

                    // Map categories to modern outline icons
                    let iconName: any = 'grid-outline';
                    if (cat === 'El Aleti') iconName = 'hammer-outline';
                    else if (cat === 'Kablo') iconName = 'git-commit-outline';
                    else if (cat === 'Şalt / Malzeme') iconName = 'flash-outline';
                    else if (cat === 'Diğer') iconName = 'cube-outline';

                    return (
                      <TouchableOpacity
                        key={cat}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingHorizontal: 12,
                          height: 34,
                          borderRadius: 17,
                          backgroundColor: isSelected ? colors.primary : '#FFFFFF',
                          marginRight: 8,
                          borderWidth: 1,
                          borderColor: isSelected ? colors.primary : '#E2E8F0',
                          shadowColor: isSelected ? colors.primary : '#000',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: isSelected ? 0.15 : 0.01,
                          shadowRadius: 4,
                          elevation: 1,
                        }}
                        onPress={() => setMarketSelectedFilter(cat === 'Tümü' ? '' : cat)}
                        activeOpacity={0.8}
                      >
                        <Ionicons 
                          name={iconName} 
                          size={13} 
                          color={isSelected ? '#FFFFFF' : '#64748B'} 
                          style={{ marginRight: 5 }} 
                        />
                        <Text style={{ 
                          color: isSelected ? '#FFFFFF' : '#475569', 
                          fontFamily: isSelected ? fonts.bold : fonts.semiBold, 
                          fontSize: 12 
                        }}>
                          {cat}
                        </Text>
                        <View style={{
                          backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.22)' : '#F1F5F9',
                          paddingHorizontal: 5,
                          paddingVertical: 1,
                          borderRadius: 7,
                          marginLeft: 5,
                        }}>
                          <Text style={{
                            color: isSelected ? '#FFFFFF' : '#64748B',
                            fontSize: 9,
                            fontFamily: fonts.bold,
                          }}>
                            {categoryCount}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Sleek Vertical Product Feed */}
              <ScrollView 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 88 }}
              >
                {(() => {
                  const filtered = displayProducts.filter((p) => {
                    const matchesSearch = p.title.toLowerCase().includes(marketSearchQuery.toLowerCase()) ||
                      p.desc.toLowerCase().includes(marketSearchQuery.toLowerCase()) ||
                      p.sellerName.toLowerCase().includes(marketSearchQuery.toLowerCase());
                    const matchesCat = marketSelectedFilter === '' || p.category.includes(marketSelectedFilter) || marketSelectedFilter.includes(p.category);
                    return matchesSearch && matchesCat;
                  });

                  if (filtered.length === 0) {
                    return (
                      <View style={{ 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        marginTop: 40, 
                        backgroundColor: '#FFFFFF', 
                        borderRadius: 20, 
                        padding: 32,
                        borderWidth: 1,
                        borderColor: '#E2E8F0',
                        shadowColor: '#0F172A',
                        shadowOffset: { width: 0, height: 6 },
                        shadowOpacity: 0.02,
                        shadowRadius: 12,
                        elevation: 2,
                      }}>
                        <View style={{
                          width: 72,
                          height: 72,
                          borderRadius: 36,
                          backgroundColor: '#F0FDFA',
                          justifyContent: 'center',
                          alignItems: 'center',
                          marginBottom: 16,
                        }}>
                          <Ionicons name="search-outline" size={32} color={colors.primary} />
                        </View>
                        <Text style={{ 
                          fontSize: 16, 
                          fontFamily: fonts.bold, 
                          color: '#1E293B',
                          textAlign: 'center',
                          marginBottom: 6
                        }}>
                          Aradığınız İlan Bulunamadı
                        </Text>
                        <Text style={{ 
                          fontSize: 12.5, 
                          fontFamily: fonts.medium, 
                          color: '#64748B', 
                          textAlign: 'center',
                          lineHeight: 17,
                          marginBottom: 16,
                          paddingHorizontal: 12
                        }}>
                          Arama teriminizi değiştirerek ya da farklı bir filtre seçerek tekrar deneyebilirsiniz.
                        </Text>
                        <TouchableOpacity
                          style={{
                            backgroundColor: colors.primary,
                            borderRadius: 10,
                            paddingHorizontal: 18,
                            paddingVertical: 9,
                            shadowColor: colors.primary,
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.12,
                            shadowRadius: 6,
                            elevation: 2,
                          }}
                          onPress={() => {
                            setMarketSearchQuery('');
                            setMarketSelectedFilter('');
                          }}
                        >
                          <Text style={{ color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 12.5 }}>
                            Filtreleri Temizle
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  }

                  return filtered.map((prod) => {
                    const isUsta = prod.sellerType === 'ELECTRICIAN';
                    const sellerDisplayName = prod.sellerName ? prod.sellerName.split(' (')[0] : (isUsta ? 'Usta' : 'Vatandaş');
                    
                    // Dynamic theme badge styling
                    let tagBg = '#F1F5F9';
                    let tagText = '#475569';
                    if (prod.category.includes('Alet')) {
                      tagBg = '#FEF3C7';
                      tagText = '#D97706';
                    } else if (prod.category.includes('Kablo')) {
                      tagBg = '#ECFDF5';
                      tagText = '#059669';
                    } else if (prod.category.includes('Şalt')) {
                      tagBg = '#E0F2FE';
                      tagText = '#0284C7';
                    } else if (prod.category.includes('Diğer')) {
                      tagBg = '#F3E8FF';
                      tagText = '#7C3AED';
                    }

                    return (
                      <TouchableOpacity
                        key={prod.id}
                        style={{
                          backgroundColor: '#FFFFFF',
                          borderRadius: 18,
                          padding: 12,
                          marginBottom: 10,
                          borderWidth: 1,
                          borderColor: '#F1F5F9',
                          flexDirection: 'row',
                          gap: 12,
                          shadowColor: '#0F172A',
                          shadowOffset: { width: 0, height: 6 },
                          shadowOpacity: 0.03,
                          shadowRadius: 10,
                          elevation: 2,
                        }}
                        onPress={() => {
                          setSelectedProduct(prod);
                          setIsProductDetailModalVisible(true);
                        }}
                        activeOpacity={0.9}
                      >
                        {/* Premium Aspect Image Container */}
                        <View style={{ position: 'relative', width: 96, height: 96, borderRadius: 12, overflow: 'hidden', backgroundColor: '#F8FAFC' }}>
                          {prod.image ? (
                            <Image 
                              source={typeof prod.image === 'string' ? { uri: prod.image } : prod.image} 
                              style={{ width: '100%', height: '100%', resizeMode: 'cover' }} 
                            />
                          ) : (
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F5F9' }}>
                              <Ionicons name="cube-outline" size={26} color="#94A3B8" />
                            </View>
                          )}
                          
                          {/* Top-left float category pill */}
                          <View style={{ position: 'absolute', top: 4, left: 4, zIndex: 2 }}>
                            <View style={{
                              backgroundColor: tagBg,
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              borderRadius: 5,
                              shadowColor: '#000',
                              shadowOffset: { width: 0, height: 1 },
                              shadowOpacity: 0.05,
                              shadowRadius: 2,
                            }}>
                              <Text style={{ 
                                color: tagText, 
                                fontSize: 7.5, 
                                fontFamily: fonts.extraBold, 
                                textTransform: 'uppercase',
                                letterSpacing: 0.2
                              }}>
                                {prod.category}
                              </Text>
                            </View>
                          </View>

                          {/* Beautiful angled sold banner overlay */}
                          {prod.isSold && (
                            <View style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              backgroundColor: 'rgba(15, 23, 42, 0.7)',
                              justifyContent: 'center',
                              alignItems: 'center',
                              zIndex: 3
                            }}>
                              <View style={{
                                borderWidth: 1.5,
                                borderColor: '#10B981',
                                paddingHorizontal: 5,
                                paddingVertical: 1.5,
                                borderRadius: 4,
                                transform: [{ rotate: '-12deg' }]
                              }}>
                                <Text style={{ color: '#10B981', fontSize: 8.5, fontFamily: fonts.extraBold, letterSpacing: 0.5 }}>SATILDI</Text>
                              </View>
                            </View>
                          )}
                        </View>

                        {/* Premium Content / Information Column */}
                        <View style={{ flex: 1, justifyContent: 'space-between' }}>
                          <View>
                            {/* Seller badge & Date Row */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: isUsta ? 'rgba(245, 158, 11, 0.06)' : 'rgba(16, 185, 129, 0.06)',
                                borderWidth: 0.5,
                                borderColor: isUsta ? 'rgba(245, 158, 11, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                                paddingHorizontal: 7,
                                paddingVertical: 1.5,
                                borderRadius: 6,
                                gap: 3
                              }}>
                                <Ionicons 
                                  name={isUsta ? "build" : "person"} 
                                  size={9.5} 
                                  color={isUsta ? '#D97706' : '#059669'} 
                                />
                                <Text style={{ 
                                  color: isUsta ? '#D97706' : '#059669', 
                                  fontSize: 8.5, 
                                  fontFamily: fonts.bold, 
                                  textTransform: 'uppercase',
                                  letterSpacing: 0.2 
                                }}>
                                  {isUsta ? 'Usta' : 'Vatandaş'}
                                </Text>
                              </View>
                              <Text style={{ color: '#94A3B8', fontSize: 9.5, fontFamily: fonts.bold }}>{prod.date}</Text>
                            </View>

                            {/* Product Title */}
                            <Text 
                              style={{ color: '#0F172A', fontSize: 14.5, fontFamily: fonts.bold, marginTop: 5 }} 
                              numberOfLines={1}
                            >
                              {prod.title}
                            </Text>

                            {/* Product Brief Description */}
                            <Text 
                              style={{ color: '#64748B', fontSize: 11.5, fontFamily: fonts.medium, marginTop: 1.5, lineHeight: 14.5 }} 
                              numberOfLines={1}
                            >
                              {prod.desc}
                            </Text>
                          </View>
                          
                          {/* Price Tag & Profile Badge Row */}
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                            <Text style={{ color: colors.primary, fontSize: 16.5, fontFamily: fonts.extraBold, letterSpacing: -0.2 }}>
                              ₺{prod.price}
                            </Text>
                            
                            <View style={{ 
                              flexDirection: 'row', 
                              alignItems: 'center', 
                              backgroundColor: '#F8FAFC', 
                              paddingHorizontal: 7, 
                              paddingVertical: 2.5, 
                              borderRadius: 7, 
                              borderWidth: 1, 
                              borderColor: '#E2E8F0', 
                              gap: 3.5 
                            }}>
                              <Ionicons name="person-circle-outline" size={11} color="#64748B" />
                              <Text 
                                style={{ color: '#475569', fontSize: 9.5, fontFamily: fonts.bold, maxWidth: 90 }} 
                                numberOfLines={1}
                              >
                                {sellerDisplayName}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  });
                })()}
              </ScrollView>
            </View>

            {/* Premium Brand-Gradient Add Product FAB (Floating Action Button) */}
            <TouchableOpacity 
              onPress={() => {
                setIsAllProductsModalVisible(false);
                setIsAddProductModalVisible(true);
              }}
              style={{
                position: 'absolute',
                bottom: 56,
                right: 20,
                borderRadius: 28,
                overflow: 'hidden',
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
                elevation: 8,
                zIndex: 10,
              }}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryDark || '#B91C1C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  height: 52,
                  gap: 6,
                }}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 13.5 }}>İlan Ekle</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </Modal>

        {/* ==================== ÜRÜN DETAY MODAL ==================== */}
        <Modal
          visible={isProductDetailModalVisible}
          transparent={false}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setIsProductDetailModalVisible(false)}
        >
          <LinearGradient
            colors={['#F8FAFC', '#F0FDFA', '#F8FAFC']}
            style={{ flex: 1 }}
          >
            {/* Background Glow Blobs */}
            <View style={{ position: 'absolute', top: -100, right: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: colors.primary, opacity: 0.04 }} />
            <View style={{ position: 'absolute', bottom: -100, left: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: '#0EA5E9', opacity: 0.03 }} />

            <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 56 : 24, paddingBottom: 16 }}>
              {/* Header Row */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingHorizontal: 2 }}>
                <View>
                  <Text style={{ fontSize: 22, fontFamily: fonts.bold, color: '#0F172A', letterSpacing: -0.3 }}>
                    Ürün Detayları
                  </Text>
                  <Text style={{ fontSize: 12, fontFamily: fonts.medium, color: '#64748B', marginTop: 1 }}>
                    İkinci el pazar yerindeki ürün özelliklerini inceleyin
                  </Text>
                </View>
                <TouchableOpacity 
                  onPress={() => setIsProductDetailModalVisible(false)} 
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: '#FFFFFF',
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    shadowColor: '#0F172A',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 6,
                    elevation: 2,
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close-outline" size={24} color="#475569" />
                </TouchableOpacity>
              </View>

              {selectedProduct && (
                <ScrollView 
                  style={{ marginTop: 12 }} 
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 32 }}
                >
                  {/* Photo Header swiper */}
                  {selectedProduct.images && selectedProduct.images.length > 0 ? (
                    <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ marginBottom: 16, borderRadius: 20, overflow: 'hidden' }}>
                      {selectedProduct.images.map((img: string, idx: number) => (
                        <TouchableOpacity
                          key={idx}
                          activeOpacity={0.9}
                          onPress={() => setShowFullscreenImage(img)}
                          style={{ 
                            width: Dimensions.get('window').width - 40, 
                            height: 220, 
                            position: 'relative',
                            backgroundColor: '#FFFFFF',
                            borderWidth: 1,
                            borderColor: '#F1F5F9'
                          }}
                        >
                          <Image source={{ uri: img }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                          <View style={{ position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0, 0, 0, 0.65)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Ionicons name="expand" size={12} color="#FFF" />
                            <Text style={{ color: '#FFF', fontSize: 10, fontFamily: fonts.bold }}>Büyütmek için Dokunun</Text>
                          </View>
                          {selectedProduct.images.length > 1 && (
                            <View style={{ position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.65)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                              <Text style={{ color: '#FFF', fontSize: 10, fontFamily: fonts.bold }}>{idx + 1}/{selectedProduct.images.length}</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  ) : selectedProduct.image ? (
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => setShowFullscreenImage(selectedProduct.image)}
                      style={{ 
                        width: '100%', 
                        height: 220, 
                        borderRadius: 20, 
                        overflow: 'hidden', 
                        marginBottom: 16, 
                        position: 'relative',
                        backgroundColor: '#FFFFFF',
                        borderWidth: 1,
                        borderColor: '#F1F5F9',
                        shadowColor: '#0F172A',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.02,
                        shadowRadius: 10,
                        elevation: 2,
                      }}
                    >
                      <Image source={typeof selectedProduct.image === 'string' ? { uri: selectedProduct.image } : selectedProduct.image} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                      <View style={{ position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0, 0, 0, 0.65)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="expand" size={12} color="#FFF" />
                        <Text style={{ color: '#FFF', fontSize: 10, fontFamily: fonts.bold }}>Büyütmek için Dokunun</Text>
                      </View>
                    </TouchableOpacity>
                  ) : null}

                  {/* Kategori, Tarih and SellerType Row */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                      {/* Category tag pill */}
                      <View style={{
                        backgroundColor: selectedProduct.sellerType === 'ELECTRICIAN' ? 'rgba(217, 119, 6, 0.08)' : 'rgba(5, 150, 105, 0.08)',
                        paddingHorizontal: 10,
                        paddingVertical: 4.5,
                        borderRadius: 8,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4
                      }}>
                        <Ionicons 
                          name={selectedProduct.sellerType === 'ELECTRICIAN' ? "build-outline" : "person-outline"} 
                          size={11} 
                          color={selectedProduct.sellerType === 'ELECTRICIAN' ? '#D97706' : '#059669'} 
                        />
                        <Text style={{ 
                          color: selectedProduct.sellerType === 'ELECTRICIAN' ? '#D97706' : '#059669', 
                          fontSize: 9.5, 
                          fontFamily: fonts.bold, 
                          textTransform: 'uppercase',
                          letterSpacing: 0.3 
                        }}>
                          {selectedProduct.sellerType === 'ELECTRICIAN' ? 'Usta Satıcı' : 'Vatandaş'}
                        </Text>
                      </View>

                      {/* Product Category name tag */}
                      <View style={{
                        backgroundColor: '#F1F5F9',
                        paddingHorizontal: 10,
                        paddingVertical: 4.5,
                        borderRadius: 8,
                      }}>
                        <Text style={{
                          color: '#475569',
                          fontSize: 9.5,
                          fontFamily: fonts.bold,
                        }}>
                          {selectedProduct.category}
                        </Text>
                      </View>
                    </View>

                    {/* Date label */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="time-outline" size={13} color="#94A3B8" />
                      <Text style={{ color: '#94A3B8', fontSize: 11.5, fontFamily: fonts.medium }}>
                        {selectedProduct.date}
                      </Text>
                    </View>
                  </View>

                  {/* Title & Location details */}
                  <Text style={{ fontSize: 20, fontFamily: fonts.bold, color: '#0F172A', marginTop: 12, lineHeight: 26 }}>
                    {selectedProduct.title}
                  </Text>
                  
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 5 }}>
                    <Ionicons name="pin-outline" size={14} color={colors.primary} />
                    <Text style={{ color: '#64748B', fontSize: 13, fontFamily: fonts.medium }}>
                      {selectedProduct.location}
                    </Text>
                  </View>

                  {/* Description Box */}
                  <View style={{ 
                    backgroundColor: '#FFFFFF', 
                    borderRadius: 20, 
                    padding: 16, 
                    marginTop: 16,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    shadowColor: '#0F172A',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.01,
                    shadowRadius: 8,
                    elevation: 1,
                  }}>
                    <Text style={{ fontFamily: fonts.bold, fontSize: 13.5, color: '#1E293B', marginBottom: 6 }}>
                      Açıklama
                    </Text>
                    <Text style={{ color: '#475569', fontSize: 13, lineHeight: 20, fontFamily: fonts.medium }}>
                      {selectedProduct.desc}
                    </Text>
                  </View>

                  {/* Seller & Price Info Card */}
                  <View style={{ 
                    flexDirection: 'row', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginTop: 16, 
                    backgroundColor: '#FFFFFF',
                    borderRadius: 20,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    shadowColor: '#0F172A',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.01,
                    shadowRadius: 8,
                    elevation: 1,
                  }}>
                    <View style={{ flex: 1, marginRight: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: '#F1F5F9',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}>
                        <Ionicons name="person-outline" size={18} color={colors.primary} />
                      </View>
                      <View>
                        <Text style={{ color: '#94A3B8', fontSize: 10.5, fontFamily: fonts.bold }}>SATICI</Text>
                        <Text style={{ color: '#1E293B', fontSize: 13.5, fontFamily: fonts.bold }} numberOfLines={1}>
                          {selectedProduct.sellerName}
                        </Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ color: '#94A3B8', fontSize: 10.5, fontFamily: fonts.bold }}>FİYAT</Text>
                      <Text style={{ color: colors.primary, fontSize: 22, fontFamily: fonts.extraBold }}>
                        ₺{selectedProduct.price}
                      </Text>
                    </View>
                  </View>

                  {/* Owner options / Chat Action buttons */}
                  {(user?.id ? (selectedProduct.sellerId === user.id || user.email === 'mpakdil0@gmail.com') : (selectedProduct.sellerId === 'mock-current-user' || selectedProduct.isLocal === true)) ? (
                    <View style={{ marginTop: 24, gap: 12 }}>
                      <View style={{ 
                        backgroundColor: '#F0FDF4', 
                        borderWidth: 1, 
                        borderColor: '#DCFCE7', 
                        borderRadius: 16, 
                        paddingVertical: 12, 
                        paddingHorizontal: 16, 
                        alignItems: 'center', 
                        justifyContent: 'center' 
                      }}>
                        <Text style={{ color: '#15803D', fontSize: 13, fontFamily: fonts.bold, textAlign: 'center' }}>
                          {selectedProduct.isSold ? 'Bu ilanı başarıyla sattınız 🤝' : 'Bu ilan size aittir (Kendi ürününüz)'}
                        </Text>
                      </View>
                      
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        {!selectedProduct.isSold && (
                          <TouchableOpacity
                            style={{
                              flex: 1,
                              height: 48,
                              backgroundColor: '#10B981',
                              borderRadius: 14,
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 8,
                              shadowColor: '#10B981',
                              shadowOffset: { width: 0, height: 4 },
                              shadowOpacity: 0.1,
                              shadowRadius: 6,
                              elevation: 2,
                            }}
                            activeOpacity={0.8}
                            onPress={() => handleMarkAsSold(selectedProduct.id)}
                          >
                            <Ionicons name="checkmark-circle-outline" size={18} color="#FFF" />
                            <Text style={{ color: '#FFF', fontSize: 13.5, fontFamily: fonts.bold }}>Satıldı Yap</Text>
                          </TouchableOpacity>
                        )}
                        
                        <TouchableOpacity
                          style={{
                            flex: 1,
                            height: 48,
                            backgroundColor: '#FFFFFF',
                            borderWidth: 1.5,
                            borderColor: '#EF4444',
                            borderRadius: 14,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            shadowColor: '#EF4444',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.02,
                            shadowRadius: 6,
                            elevation: 1,
                          }}
                          activeOpacity={0.8}
                          onPress={() => handleDeleteProduct(selectedProduct.id)}
                        >
                          <Ionicons name="trash-outline" size={18} color="#EF4444" />
                          <Text style={{ color: '#EF4444', fontSize: 13.5, fontFamily: fonts.bold }}>İlanı Sil</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : selectedProduct.isSold ? (
                    <View
                      style={{
                        height: 48,
                        backgroundColor: '#F1F5F9',
                        borderWidth: 1,
                        borderColor: '#E2E8F0',
                        borderRadius: 14,
                        marginTop: 24,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                      }}
                    >
                      <Ionicons name="lock-closed-outline" size={18} color="#64748B" />
                      <Text style={{ color: '#64748B', fontSize: 14, fontFamily: fonts.bold }}>Bu Ürün Satıldı 🤝</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={{ 
                        backgroundColor: colors.primary, 
                        marginTop: 24, 
                        flexDirection: 'row', 
                        gap: 8, 
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: 52,
                        borderRadius: 14,
                        shadowColor: colors.primary,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.15,
                        shadowRadius: 8,
                        elevation: 3,
                      }}
                      onPress={() => handleContactSeller(selectedProduct.sellerId, selectedProduct.sellerName)}
                      activeOpacity={0.8}
                      disabled={isStartingChat}
                    >
                      {isStartingChat ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <>
                          <Ionicons name="chatbubbles-outline" size={18} color="#FFF" />
                          <Text style={{ color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 14 }}>
                            Satıcıyla İletişime Geç (Sohbet Et)
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </ScrollView>
              )}
            </View>
          </LinearGradient>
        </Modal>

        {/* ==================== FOTOĞRAF TAM EKRAN GÖSTERİCİ MODAL ==================== */}
        <Modal
          visible={!!showFullscreenImage}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowFullscreenImage(null)}
        >
          <TouchableOpacity 
            style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.95)', justifyContent: 'center', alignItems: 'center' }} 
            activeOpacity={1}
            onPress={() => setShowFullscreenImage(null)}
          >
            {showFullscreenImage && (
              <Image 
                source={typeof showFullscreenImage === 'string' ? { uri: showFullscreenImage } : showFullscreenImage} 
                style={{ width: '100%', height: '80%', resizeMode: 'contain' }} 
              />
            )}
            
            {/* Close Button at top right */}
            <TouchableOpacity 
              style={{ position: 'absolute', top: 50, right: 20, backgroundColor: 'rgba(255,255,255,0.15)', padding: 10, borderRadius: 25, zIndex: 100 }}
              onPress={() => setShowFullscreenImage(null)}
            >
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
          </TouchableOpacity>
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

        {/* ==================== HÜNER (REELS) DETAY MODAL ==================== */}
        <Modal
          visible={isShowcaseDetailModalVisible && !!selectedShowcaseItem}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsShowcaseDetailModalVisible(false)}
        >
          <View style={styles.hiwModalOverlay}>
            <View style={[
              styles.marketModalContent,
              {
                backgroundColor: '#FFFFFF',
                paddingBottom: 0,
                maxHeight: Dimensions.get('window').height * 0.92,
                padding: 0,
                borderColor: '#E2E8F0',
                borderRadius: 28,
                overflow: 'hidden',
              }
            ]}>

              {selectedShowcaseItem && (
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 28 }}
                  bounces={false}
                >
                  {/* ── HERO FOTOĞRAF BÖLÜMÜ ── */}
                  {(() => {
                    const showcaseImages = selectedShowcaseItem.images && selectedShowcaseItem.images.length > 0
                      ? selectedShowcaseItem.images
                      : [selectedShowcaseItem.image].filter(Boolean);

                    const cardWidth = Dimensions.get('window').width - 48;

                    return (
                      <View style={{ position: 'relative' }}>
                        {showcaseImages.length > 0 ? (
                          <ScrollView
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            snapToInterval={cardWidth}
                            decelerationRate="fast"
                            onScroll={(e) => {
                              const offset = e.nativeEvent.contentOffset.x;
                              const activeIdx = Math.floor((offset + cardWidth / 2) / cardWidth);
                              setShowcaseActiveImageIndex(activeIdx);
                            }}
                            scrollEventThrottle={16}
                            style={{ width: '100%', height: 280 }}
                          >
                            {showcaseImages.map((imgUrl: string, idx: number) => (
                              <TouchableOpacity
                                key={idx}
                                activeOpacity={0.97}
                                onPress={() => setShowFullscreenImage(imgUrl)}
                                style={{ width: cardWidth, height: 280, overflow: 'hidden' }}
                              >
                                <Image
                                  source={typeof imgUrl === 'string' ? { uri: getFileUrl(imgUrl) || '' } : imgUrl}
                                  style={{ width: '100%', height: '100%', resizeMode: 'cover' }}
                                />
                                <LinearGradient
                                  colors={['transparent', 'rgba(0,0,0,0.72)']}
                                  style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 120 }}
                                />
                                {/* Büyüt hint */}
                                <View style={{
                                  position: 'absolute', bottom: 14, right: 14,
                                  backgroundColor: 'rgba(255,255,255,0.18)',
                                  borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
                                  paddingHorizontal: 10, paddingVertical: 5,
                                  borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 5,
                                }}>
                                  <Ionicons name="expand-outline" size={13} color="#FFF" />
                                  <Text style={{ color: '#FFF', fontSize: 10, fontFamily: fonts.bold }}>Büyüt</Text>
                                </View>
                                {/* Fotoğraf sayacı */}
                                {showcaseImages.length > 1 && (
                                  <View style={{
                                    position: 'absolute', top: 14, right: 14,
                                    backgroundColor: 'rgba(0,0,0,0.55)',
                                    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.2)',
                                    paddingHorizontal: 9, paddingVertical: 4,
                                    borderRadius: 12,
                                  }}>
                                    <Text style={{ color: '#FFF', fontSize: 11, fontFamily: fonts.bold }}>{idx + 1} / {showcaseImages.length}</Text>
                                  </View>
                                )}
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        ) : (
                          <View style={{ height: 200, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' }}>
                            <Ionicons name="image-outline" size={44} color="#CBD5E1" />
                          </View>
                        )}

                        {/* Kapat butonu — fotoğraf üstünde */}
                        <TouchableOpacity
                          onPress={() => setIsShowcaseDetailModalVisible(false)}
                          activeOpacity={0.8}
                          style={{
                            position: 'absolute', top: 14, left: 14,
                            backgroundColor: 'rgba(0,0,0,0.52)',
                            width: 36, height: 36, borderRadius: 18,
                            justifyContent: 'center', alignItems: 'center',
                            borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
                          }}
                        >
                          <Ionicons name="close" size={19} color="#FFF" />
                        </TouchableOpacity>

                        {/* Carousel dots */}
                        {showcaseImages.length > 1 && (
                          <View style={{
                            position: 'absolute', bottom: 14, left: 0, right: 0,
                            flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5,
                          }}>
                            {showcaseImages.map((_: any, idx: number) => (
                              <View
                                key={idx}
                                style={{
                                  width: showcaseActiveImageIndex === idx ? 20 : 6,
                                  height: 6, borderRadius: 3,
                                  backgroundColor: showcaseActiveImageIndex === idx ? '#FFF' : 'rgba(255,255,255,0.45)',
                                }}
                              />
                            ))}
                          </View>
                        )}
                      </View>
                    );
                  })()}

                  {/* ── İÇERİK BÖLÜMÜ ── */}
                  <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>

                    {/* Zanaat Vitrini badge + başlık */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <LinearGradient
                        colors={['#FFFBEB', '#FEF3C7']}
                        style={{
                          flexDirection: 'row', alignItems: 'center', gap: 5,
                          paddingHorizontal: 11, paddingVertical: 5,
                          borderRadius: 20, borderWidth: 0.5, borderColor: '#FDE68A',
                        }}
                      >
                        <Ionicons name="sparkles" size={11} color="#D97706" />
                        <Text style={{ color: '#B45309', fontFamily: fonts.bold, fontSize: 9.5, letterSpacing: 0.4, textTransform: 'uppercase' }}>Usta Vitrini</Text>
                      </LinearGradient>
                    </View>

                    <Text style={{ fontSize: 22, fontFamily: fonts.bold, color: '#0F172A', lineHeight: 30, marginBottom: 16 }}>
                      {selectedShowcaseItem.title}
                    </Text>

                    {/* Divider */}
                    <View style={{ height: 1, backgroundColor: '#F1F5F9', marginBottom: 16 }} />

                    {/* Usta Açıklaması */}
                    <View style={{
                      backgroundColor: '#F8FAFC',
                      borderRadius: 16,
                      padding: 16,
                      marginBottom: 20,
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                        <View style={{
                          width: 28, height: 28, borderRadius: 14,
                          backgroundColor: colors.primary + '18',
                          justifyContent: 'center', alignItems: 'center',
                        }}>
                          <Ionicons name="document-text-outline" size={14} color={colors.primary} />
                        </View>
                        <Text style={{ color: '#475569', fontSize: 11, fontFamily: fonts.bold, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                          Usta Açıklaması
                        </Text>
                      </View>
                      <Text style={{ color: '#334155', fontSize: 14, lineHeight: 22, fontFamily: fonts.regular }}>
                        {selectedShowcaseItem.description || 'Usta tarafından gerçekleştirilen profesyonel ve titiz bir çalışma.'}
                      </Text>
                    </View>

                    {/* Divider */}
                    <View style={{ height: 1, backgroundColor: '#F1F5F9', marginBottom: 20 }} />

                    {/* ── USTA PROFİL KARTI ── */}
                    <Text style={{ fontSize: 11, fontFamily: fonts.bold, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
                      ESERİN SAHİBİ
                    </Text>

                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => {
                        setIsShowcaseDetailModalVisible(false);
                        router.push({
                          pathname: `/electricians/${selectedShowcaseItem.ustaId}`,
                          params: { scrollToGallery: 'true' }
                        } as any);
                      }}
                      style={{
                        borderRadius: 20,
                        overflow: 'hidden',
                        marginBottom: 20,
                        shadowColor: '#0F172A',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.08,
                        shadowRadius: 12,
                        elevation: 3,
                      }}
                    >
                      <LinearGradient
                        colors={['#F8FAFF', '#EEF2FF']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          padding: 16,
                          gap: 14,
                          borderWidth: 1,
                          borderColor: '#E0E7FF',
                          borderRadius: 20,
                        }}
                      >
                        {/* Avatar */}
                        <View style={{
                          width: 56, height: 56, borderRadius: 28,
                          backgroundColor: '#E0E7FF',
                          justifyContent: 'center', alignItems: 'center',
                          borderWidth: 2.5, borderColor: colors.primary,
                          overflow: 'hidden',
                          shadowColor: colors.primary,
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.3,
                          shadowRadius: 6,
                        }}>
                          {selectedShowcaseItem.ustaAvatar ? (
                            <Image
                              source={{ uri: getFileUrl(selectedShowcaseItem.ustaAvatar) || '' }}
                              style={{ width: '100%', height: '100%' }}
                              resizeMode="cover"
                            />
                          ) : (
                            <Ionicons name="person" size={24} color={colors.primary} />
                          )}
                        </View>

                        {/* Bilgiler */}
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                            <Text style={{ color: '#0F172A', fontSize: 16, fontFamily: fonts.bold }} numberOfLines={1}>
                              {selectedShowcaseItem.ustaName}
                            </Text>
                            <Ionicons name="checkmark-circle" size={15} color="#10B981" />
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            {selectedShowcaseItem.ustaRatingAverage != null && (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                <Ionicons name="star" size={12} color="#F59E0B" />
                                <Text style={{ fontSize: 12, fontFamily: fonts.bold, color: '#374151' }}>{Number(selectedShowcaseItem.ustaRatingAverage).toFixed(1)}</Text>
                                {selectedShowcaseItem.ustaRatingCount != null && (
                                  <Text style={{ fontSize: 10, fontFamily: fonts.medium, color: '#9CA3AF' }}>({selectedShowcaseItem.ustaRatingCount} yorum)</Text>
                                )}
                              </View>
                            )}
                            {selectedShowcaseItem.ustaRatingAverage != null && selectedShowcaseItem.ustaCity && (
                              <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#D1D5DB' }} />
                            )}
                            {selectedShowcaseItem.ustaCity && (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                                <Ionicons name="location-outline" size={11} color="#6B7280" />
                                <Text style={{ fontSize: 11, fontFamily: fonts.medium, color: '#6B7280' }}>{selectedShowcaseItem.ustaCity}</Text>
                              </View>
                            )}
                          </View>
                        </View>

                        {/* Ok */}
                        <View style={{
                          width: 36, height: 36, borderRadius: 18,
                          backgroundColor: colors.primary,
                          justifyContent: 'center', alignItems: 'center',
                          shadowColor: colors.primary,
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.4,
                          shadowRadius: 5,
                          elevation: 3,
                        }}>
                          <Ionicons name="arrow-forward" size={17} color="#FFF" />
                        </View>
                      </LinearGradient>
                    </TouchableOpacity>

                    {/* ── ALT CTA ── */}
                    {selectedShowcaseItem.ustaId === user?.id ? (
                      <View style={{
                        backgroundColor: '#EFF6FF',
                        borderWidth: 1, borderColor: '#BFDBFE',
                        borderRadius: 16,
                        paddingVertical: 14, paddingHorizontal: 16,
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                      }}>
                        <Ionicons name="information-circle-outline" size={16} color="#2563EB" />
                        <Text style={{ color: '#2563EB', fontSize: 13, fontFamily: fonts.semiBold }}>
                          Bu ilan size aittir
                        </Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        onPress={() => {
                          setIsShowcaseDetailModalVisible(false);
                          handleContactSeller(selectedShowcaseItem.ustaId, selectedShowcaseItem.ustaName);
                        }}
                        activeOpacity={0.85}
                        disabled={isStartingChat}
                        style={{ borderRadius: 18, overflow: 'hidden' }}
                      >
                        <LinearGradient
                          colors={[colors.primary, colors.primaryDark || colors.primary]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={{
                            flexDirection: 'row', gap: 10,
                            justifyContent: 'center', alignItems: 'center',
                            height: 56, borderRadius: 18,
                            shadowColor: colors.primary,
                            shadowOffset: { width: 0, height: 6 },
                            shadowOpacity: 0.35,
                            shadowRadius: 12,
                            elevation: 6,
                          }}
                        >
                          {isStartingChat ? (
                            <ActivityIndicator size="small" color="#FFF" />
                          ) : (
                            <>
                              <Ionicons name="chatbubble-ellipses" size={20} color="#FFF" />
                              <Text style={{ color: '#FFFFFF', fontSize: 15, fontFamily: fonts.bold, letterSpacing: 0.3 }}>
                                Ustayla Sohbet Başlat
                              </Text>
                            </>
                          )}
                        </LinearGradient>
                      </TouchableOpacity>
                    )}
                  </View>
                </ScrollView>
              )}
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
                colors={['rgba(255,255,255,0.98)', 'rgba(255,255,255,0.93)']}
                style={styles.completionModal}
              >
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1, marginRight: 8 }}>
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
                    <Text style={[styles.modalProgressPercent, { color: colors.primary }]}>%{completionPercent}</Text>
                    <Text style={styles.modalProgressLabel}>Tamamlandı</Text>
                  </View>
                  <View style={styles.modalProgressBg}>
                    <View style={[styles.modalProgressFill, { width: `${completionPercent}%`, backgroundColor: colors.primary }]} />
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
                      <View style={[
                        styles.checklistIconBox, 
                        { backgroundColor: colors.primary + '12' }, 
                        item.isPending && { backgroundColor: staticColors.warning + '10' }
                      ]}>
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
                  style={[styles.modalMainBtn, { shadowColor: colors.primary }]}
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
  // ========== PREMIUM CITIZEN DESIGN SYSTEM ==========

  // --- Modern Capsule Tab Switcher ---
  modernTabSwitcherContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    borderRadius: 14,
    padding: 3,
    marginBottom: 14,
  },
  modernTabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
    justifyContent: 'center',
  },
  modernTabButtonActive: {
    backgroundColor: '#0D9488',
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  modernTabText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // --- Neon-Glass Quick Search Pills ---
  quickPillsContainer: {
    paddingVertical: 10,
    paddingHorizontal: 0,
    gap: 8,
  },
  quickPillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    gap: 6,
  },
  quickPillText: {
    fontFamily: fonts.semiBold,
    fontSize: 12.5,
    color: 'rgba(255, 255, 255, 0.95)',
    letterSpacing: 0.2,
  },

  // --- Enhanced Reels Section ---
  reelsSectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 8,
    gap: 3,
  },
  reelsSectionBadgeText: {
    fontFamily: fonts.extraBold,
    fontSize: 10,
    color: '#EF4444',
    letterSpacing: 0.5,
  },

  // --- Featured Usta Premium Card ---
  featuredUstaCard: {
    width: 265,
    backgroundColor: staticColors.white,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  featuredUstaAvatarBorder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2.5,
    borderColor: '#FBBF24',
    padding: 2,
    shadowColor: '#FBBF24',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  featuredUstaAvatarInner: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredUstaRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 3,
  },
  featuredUstaRatingText: {
    fontFamily: fonts.extraBold,
    fontSize: 13,
    color: '#D97706',
  },
  featuredUstaSkillChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  featuredUstaSkillText: {
    fontFamily: fonts.medium,
    fontSize: 10.5,
    color: '#64748B',
  },
  featuredUstaProfileBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  featuredUstaProfileBtnText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: '#FFF',
    letterSpacing: 0.3,
  },
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
  headerFullSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 14,
    height: 46,
    paddingLeft: 12,
    paddingRight: 5,
    marginTop: 12,
    marginBottom: 4,
  },
  headerFullSearchInner: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerFullSearchPlaceholder: {
    fontFamily: fonts.medium,
    fontSize: 13.5,
    color: 'rgba(255, 255, 255, 0.75)',
    marginLeft: 10,
  },
  headerSearchActionCircleGlass: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  citizenTitleText: {
    fontFamily: fonts.bold,
    fontSize: 20,
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    zIndex: 1000,
    paddingHorizontal: 20,
  },
  completionModal: {
    borderRadius: 28,
    padding: 24,
    backgroundColor: staticColors.white,
    maxHeight: '80%',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
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
  toolsScrollContainer: {
    paddingVertical: 8,
    gap: 12,
  },
  toolsGridContainer: {
    flexDirection: 'row',
    gap: 12,
    height: 176,
    marginTop: 6,
    paddingHorizontal: 2,
    width: '100%',
  },
  toolGridLeftCard: {
    flex: 1.1,
    height: '100%',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  toolLeftCardContent: {
    flex: 1,
    padding: 14,
    justifyContent: 'space-between',
  },
  toolIconBadgeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  toolLeftCardTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: '#FFF',
  },
  toolLeftCardSubtitle: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 2,
  },
  toolGridRightColumn: {
    flex: 1,
    height: '100%',
    flexDirection: 'column',
    gap: 10,
  },
  toolGridRightCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  toolRightCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  toolIconBadgeCircleSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  toolRightCardTitle: {
    fontFamily: fonts.bold,
    fontSize: 12.5,
    color: '#FFF',
  },
  toolRightCardSubtitle: {
    fontFamily: fonts.medium,
    fontSize: 9.5,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 1,
  },
  watermarkIconContainerLeft: {
    position: 'absolute',
    bottom: -25,
    right: -25,
    transform: [{ rotate: '-15deg' }],
  },
  watermarkIconContainerRight: {
    position: 'absolute',
    bottom: -15,
    right: -15,
    transform: [{ rotate: '-10deg' }],
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
    width: 215,
    height: 245,
    borderRadius: 18,
    overflow: 'hidden',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  marketImageContainer: {
    width: '100%',
    height: 120,
    position: 'relative',
    overflow: 'hidden',
  },
  marketDetailsContainer: {
    flex: 1,
    padding: 12,
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
    paddingVertical: 3,
    borderRadius: 6,
  },
  marketCategoryText: {
    fontFamily: fonts.bold,
    fontSize: 9,
    textTransform: 'uppercase',
  },
  marketDateText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: '#94A3B8',
  },
  marketProductTitle: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    marginTop: 0,
  },
  marketProductDesc: {
    fontFamily: fonts.medium,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 4,
  },
  marketCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    paddingTop: 8,
    marginTop: 6,
  },
  marketPriceWrapper: {
    flexDirection: 'column',
  },
  marketPriceLabel: {
    fontFamily: fonts.medium,
    fontSize: 8.5,
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  marketPriceValue: {
    fontFamily: fonts.extraBold,
    fontSize: 14,
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
  serviceCategoryHorizontalCard: {
    width: 230,
    height: 72,
    backgroundColor: staticColors.white,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  serviceCategoryIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 23, // perfect circle
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.15)',
  },
  serviceCategoryTextContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  serviceCategoryTitleText: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    lineHeight: 17,
    letterSpacing: 0.1,
  },
  serviceCategorySubtextText: {
    fontFamily: fonts.medium,
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 2,
  },
  categoryCardChevron: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
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
    shadowColor: '#0EA5E9', // Match Sky Blue/Teal Glow
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
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
