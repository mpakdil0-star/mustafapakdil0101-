import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useAppSelector } from '../../hooks/redux';
import { useAppColors } from '../../hooks/useAppColors';
import { messageService } from '../../services/messageService';
import { userService } from '../../services/userService';
import { colors as staticColors } from '../../constants/colors';
import { fonts } from '../../constants/typography';
import api from '../../services/api';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { getFileUrl } from '../../constants/api';

const { width } = Dimensions.get('window');

const getServiceLabel = (category: string) => {
  const cat = category?.toLowerCase() || '';
  if (cat === 'elektrik') return 'Elektrikçi';
  if (cat === 'cilingir') return 'Çilingir';
  if (cat === 'klima') return 'Klima Ustası';
  if (cat === 'beyaz-esya') return 'Beyaz Eşya Servisi';
  if (cat === 'tesisat') return 'Su Tesisatçısı';
  if (cat === 'kombi') return 'Kombi Servisi';
  if (cat === 'boya') return 'Boya Badana';
  if (cat === 'temizlik') return 'Temizlik';
  if (cat === 'nakliyat') return 'Nakliyat';
  if (cat === 'montaj') return 'Montaj Ustası';
  return 'Usta';
};

const getRelativeTime = (dateString: string) => {
  if (!dateString) return 'Şimdi';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Şimdi';
    if (diffMins < 60) return `${diffMins} dk önce`;
    if (diffHours < 24) return `${diffHours} saat önce`;
    if (diffDays === 1) return 'Dün';
    if (diffDays < 7) return `${diffDays} gün önce`;
    
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch (e) {
    return '3 saat önce';
  }
};

export default function ChannelsScreen() {
  const colors = useAppColors();
  const { user } = useAppSelector((state) => state.auth);
  const router = useRouter();
  
  // Tab State: 'forum' | 'jobs' | 'gallery'
  const [activeTab, setActiveTab] = useState<'forum' | 'jobs' | 'gallery'>('forum');

  // Loading States
  const [isLoading, setIsLoading] = useState(false);

  // 1. Forum States
  const [forumPosts, setForumPosts] = useState<any[]>([]);
  const [isNewPostModalVisible, setIsNewPostModalVisible] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostDesc, setNewPostDesc] = useState('');
  const [newPostImage, setNewPostImage] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [isCommentsModalVisible, setIsCommentsModalVisible] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');


  // 2. Job Sharing States
  const [jobOffers, setJobOffers] = useState<any[]>([]);
  const [selectedCity, setSelectedCity] = useState('Tüm Türkiye');
  const [isNewJobModalVisible, setIsNewJobModalVisible] = useState(false);
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newJobDesc, setNewJobDesc] = useState('');
  const [isCityFilterModalVisible, setIsCityFilterModalVisible] = useState(false);

  // 3. Showcase Gallery States
  const [showcaseItems, setShowcaseItems] = useState<any[]>([]);
  const [isNewShowcaseModalVisible, setIsNewShowcaseModalVisible] = useState(false);
  const [newShowcaseTitle, setNewShowcaseTitle] = useState('');
  const [newShowcaseDesc, setNewShowcaseDesc] = useState('');
  const [newShowcaseImages, setNewShowcaseImages] = useState<string[]>([]);
  const [selectedShowcaseItem, setSelectedShowcaseItem] = useState<any>(null);
  const [isShowcaseDetailModalVisible, setIsShowcaseDetailModalVisible] = useState(false);
  const [showcaseActiveImageIndex, setShowcaseActiveImageIndex] = useState(0);
  const [showFullscreenImage, setShowFullscreenImage] = useState<string | null>(null);
  const [isStartingChat, setIsStartingChat] = useState(false);

  // 4. Service Regions Custom Modal States
  const [isLocationsModalVisible, setIsLocationsModalVisible] = useState(false);
  const [locationsModalUstaName, setLocationsModalUstaName] = useState('');
  const [locationsModalContent, setLocationsModalContent] = useState<string[]>([]);

  // Cities List for Filter
  const CITIES = ['Tüm Türkiye', 'İstanbul', 'Ankara', 'İzmir', 'Adana', 'Antalya', 'Bursa', 'Mersin', 'Kocaeli', 'Gaziantep'];

  // Fetch Forum Posts
  const fetchForumPosts = async () => {
    try {
      const response = await api.get('/community/forum');
      if (response.data?.success) {
        // Enrich items with real electrician data
        let electriciansMap: Record<string, any> = {};
        try {
          const elecRes = await userService.getElectricians({});
          if (elecRes && elecRes.success && Array.isArray(elecRes.data)) {
            elecRes.data.forEach((elec: any) => {
              if (elec.id) {
                // Parse and format service areas dynamically
                let cityOnly = elec.city || (elec.locations && elec.locations[elec.locations.length - 1]?.city) || 'İstanbul';
                let serviceArea = '';
                if (elec.locations && elec.locations.length > 0) {
                  cityOnly = elec.locations[elec.locations.length - 1]?.city || elec.city || 'İstanbul';
                  const cityMap: Record<string, string[]> = {};
                  elec.locations.forEach((loc: any) => {
                    const c = loc.city || '';
                    if (c) {
                      if (!cityMap[c]) cityMap[c] = [];
                      if (loc.district && !cityMap[c].includes(loc.district)) {
                        cityMap[c].push(loc.district);
                      }
                    }
                  });
                  const formatted = Object.entries(cityMap).map(([c, districts]) => {
                    if (districts.length > 0) {
                      return `${districts.join(', ')} (${c})`;
                    }
                    return c;
                  }).join(' • ');
                  if (formatted) serviceArea = formatted;
                }

                electriciansMap[elec.id] = {
                  profileImageUrl: elec.profileImageUrl || undefined,
                  isVerified: elec.isVerified ?? undefined,
                  cityOnly: cityOnly,
                  fullLocations: serviceArea || cityOnly,
                  specialties: elec.electricianProfile?.specialties || [],
                  experienceYears: elec.electricianProfile?.experienceYears || 0,
                  serviceCategory: elec.electricianProfile?.serviceCategory || undefined,
                };
              }
            });
          }
        } catch (_e) { /* ignore */ }

        const enriched = response.data.data.map((item: any) => {
          const elecInfo = electriciansMap[item.ustaId] || {};
          return {
            ...item,
            ustaAvatar: item.ustaAvatar || elecInfo.profileImageUrl || null,
            ustaCityOnly: elecInfo.cityOnly || item.ustaCity || 'İstanbul',
            ustaFullLocations: elecInfo.fullLocations || item.ustaCity || 'İstanbul',
            ustaVerified: elecInfo.isVerified || false,
            ustaSpecialty: elecInfo.specialties?.[0] || (elecInfo.serviceCategory ? getServiceLabel(elecInfo.serviceCategory) : null),
            ustaExperience: elecInfo.experienceYears || null,
          };
        });

        setForumPosts(enriched);
      }
    } catch (err) {
      console.log('Error fetching forum posts:', err);
    }
  };

  // Fetch Job Offers
  const fetchJobOffers = async () => {
    try {
      const response = await api.get('/community/jobs');
      if (response.data?.success) {
        setJobOffers(response.data.data);
      }
    } catch (err) {
      console.log('Error fetching job offers:', err);
    }
  };

  const fetchShowcaseItems = async () => {
    try {
      const response = await api.get('/showcase');
      if (response.data?.success) {
        // Enrich items with real electrician data
        let electriciansMap: Record<string, any> = {};
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
        } catch (_e) { /* ignore */ }

        const enriched = response.data.data.map((item: any) => {
          const elecInfo = electriciansMap[item.ustaId] || {};
          return {
            ...item,
            ustaAvatar: item.ustaAvatar || elecInfo.profileImageUrl || null,
            ustaRatingAverage: item.ustaRatingAverage ?? elecInfo.ratingAverage ?? null,
            ustaRatingCount: item.ustaRatingCount ?? elecInfo.ratingCount ?? null,
            ustaCity: item.ustaCity || elecInfo.city || null,
          };
        });
        setShowcaseItems(enriched);
      }
    } catch (err) {
      console.log('Error fetching showcase items:', err);
    }
  };

  // Load Data on Mount/ActiveTab change
  useEffect(() => {
    setIsLoading(true);
    const loadData = async () => {
      if (activeTab === 'forum') await fetchForumPosts();
      if (activeTab === 'jobs') await fetchJobOffers();
      if (activeTab === 'gallery') await fetchShowcaseItems();
      setIsLoading(false);
    };
    loadData();
  }, [activeTab]);

  // Handle Pick Image for Forum (Single Image)
  const handlePickImage = async (type: 'forum') => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('İzin Gerekli', 'Fotoğraf seçebilmek için galeri izni vermelisiniz.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.6,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const imageStr = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
      if (type === 'forum') setNewPostImage(imageStr);
    }
  };

  // Handle Pick Showcase Image (Supports Camera and Multi-select Gallery)
  const handlePickShowcaseImage = async (source: 'camera' | 'gallery') => {
    try {
      const permissionResult = source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert('İzin Gerekli', `Fotoğraf ${source === 'camera' ? 'çekmek' : 'seçmek'} için gerekli izinleri vermelisiniz.`);
        return;
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: source === 'camera',
        quality: 0.6,
        base64: true,
      };

      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync({
            ...options,
            allowsMultipleSelection: true,
            selectionLimit: 5 - newShowcaseImages.length,
          });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selected = result.assets.map(asset => 
          asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri
        );
        setNewShowcaseImages(prev => {
          const combined = [...prev, ...selected];
          return combined.slice(0, 5);
        });
      }
    } catch (error) {
      Alert.alert('Hata', 'Fotoğraf seçilirken bir sorun oluştu.');
    }
  };

  // Handle Add Forum Post
  const handleAddForumPost = async () => {
    if (!newPostTitle.trim() || !newPostDesc.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen tüm alanları doldurun.');
      return;
    }

    const newPost = {
      title: newPostTitle,
      description: newPostDesc,
      imageUrl: newPostImage,
      ustaId: user?.id || 'mock-usta-id',
      ustaName: user?.fullName || 'Usta',
      ustaCity: user?.city || 'İstanbul',
    };

    try {
      const response = await api.post('/community/forum', newPost);
      if (response.data?.success) {
        setForumPosts(response.data.data);
        setIsNewPostModalVisible(false);
        setNewPostTitle('');
        setNewPostDesc('');
        setNewPostImage(null);
        Alert.alert('Başarılı', 'Sorunuz başarıyla toplulukla paylaşıldı! ⚡');
      }
    } catch (err) {
      Alert.alert('Hata', 'Gönderi oluşturulurken hata oluştu.');
    }
  };

  // Handle Add Comment
  const handleAddComment = async () => {
    if (!newCommentText.trim()) return;

    const newComment = {
      text: newCommentText,
      ustaId: user?.id || 'mock-usta-id',
      ustaName: user?.fullName || 'Usta',
    };

    try {
      const response = await api.post(`/community/forum/${selectedPost.id}/comment`, newComment);
      if (response.data?.success) {
        setForumPosts(response.data.data);
        const updatedPost = response.data.data.find((p: any) => p.id === selectedPost.id);
        setSelectedPost(updatedPost);
        setNewCommentText('');
      }
    } catch (err) {
      Alert.alert('Hata', 'Yorum gönderilemedi.');
    }
  };

  // Handle Contact Usta (Job Sharing)
  const handleContactUsta = async (ustaId: string, ustaName: string) => {
    try {
      let conversation = null;
      try {
        conversation = await messageService.findOrCreateConversation(ustaId);
      } catch (innerErr) {
        console.warn('⚠️ findOrCreateConversation failed:', innerErr);
      }

      if (!conversation || !conversation.id) {
        const mockId = `mock-conv-${ustaId}-${user?.id || 'guest'}`;
        conversation = { id: mockId };
      }

      router.push({
        pathname: `/messages/${conversation.id}`,
        params: { sellerName: ustaName, sellerId: ustaId }
      });
    } catch (err) {
      console.warn('⚠️ handleContactUsta outer catch:', err);
      const fallbackId = `mock-conv-${ustaId}-fallback`;
      router.push({
        pathname: `/messages/${fallbackId}`,
        params: { sellerName: ustaName, sellerId: ustaId }
      });
    }
  };

  // Handle Delete Job Offer
  const handleDeleteJobOffer = async (itemId: string) => {
    Alert.alert('İlanı İptal Et', 'Bu iş paslama ilanınızı silmek ve yayından kaldırmak istediğinize emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Evet, İptal Et',
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await api.delete(`/community/jobs/${itemId}`);
            if (response.data?.success) {
              setJobOffers(response.data.data);
              Alert.alert('Başarılı', 'İş paslama ilanınız başarıyla iptal edildi.');
            }
          } catch (err) {
            Alert.alert('Hata', 'İlan iptal edilemedi.');
          }
        }
      }
    ]);
  };

  // Handle Delete Forum Post
  const handleDeleteForumPost = async (postId: string) => {
    Alert.alert('Soruyu Sil', 'Bu teknik destek sorunuzu silmek istediğinize emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Evet, Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await api.delete(`/community/forum/${postId}`);
            if (response.data?.success) {
              await fetchForumPosts();
              Alert.alert('Başarılı', 'Sorunuz başarıyla silindi.');
            }
          } catch (err) {
            Alert.alert('Hata', 'Soru silinemedi.');
          }
        }
      }
    ]);
  };

  // Handle Add Job Offer
  const handleAddJobOffer = async () => {
    if (!newJobTitle.trim() || !newJobDesc.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen tüm alanları doldurun.');
      return;
    }

    const newJob = {
      title: newJobTitle,
      description: newJobDesc,
      city: user?.city || 'İstanbul',
      ustaCity: user?.city || 'İstanbul',
      ustaId: user?.id || 'mock-usta-id',
      ustaName: user?.fullName || 'Usta',
      ustaAvatar: user?.profileImageUrl || null,
    };

    try {
      const response = await api.post('/community/jobs', newJob);
      if (response.data?.success) {
        // İlanı hemen göstermek için şehir filtresini kullanıcının şehrine ayarla
        const userCity = user?.city || 'İstanbul';
        if (selectedCity !== 'Tüm Türkiye' && selectedCity !== userCity) {
          setSelectedCity(userCity);
        }
        // State'i API yanıtından güncelle
        setJobOffers(response.data.data);
        // Ek güvenlik: Backend'den taze veri çek
        await fetchJobOffers();
        setIsNewJobModalVisible(false);
        setNewJobTitle('');
        setNewJobDesc('');
        Alert.alert('Başarılı', 'İş paslama teklifiniz başarıyla yayınlandı! 🤝');
      }
    } catch (err) {
      Alert.alert('Hata', 'Teklif oluşturulurken hata oluştu.');
    }
  };

  // Handle Add Showcase Gallery Item
  const handleAddShowcaseItem = async () => {
    if (!newShowcaseTitle.trim() || newShowcaseImages.length === 0) {
      Alert.alert('Eksik Bilgi', 'Lütfen başlık doldurun ve en az bir görsel seçin.');
      return;
    }

    const newItem = {
      title: newShowcaseTitle,
      description: newShowcaseDesc,
      image: newShowcaseImages[0],
      images: newShowcaseImages,
      ustaId: user?.id || 'mock-usta-id',
      ustaName: user?.fullName || 'Usta',
      ustaCity: user?.city || 'İstanbul',
      ustaAvatar: user?.profileImageUrl || null,
    };

    try {
      const response = await api.post('/showcase', newItem);
      if (response.data?.success) {
        setShowcaseItems(response.data.data);
        setIsNewShowcaseModalVisible(false);
        setNewShowcaseTitle('');
        setNewShowcaseDesc('');
        setNewShowcaseImages([]);
        Alert.alert('Başarılı', 'Zanaat eseriniz Hüner Galerisinde yayınlandı! 📸');
      }
    } catch (err) {
      Alert.alert('Hata', 'Fotoğraf yüklenirken bir hata oluştu.');
    }
  };

  // Handle Delete Showcase Item
  const handleDeleteShowcaseItem = async (itemId: string) => {
    Alert.alert('Fotoğrafı Sil', 'Bu çalışmanızı galerinizden kaldırmak istediğinize emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Evet, Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await api.delete(`/showcase/${itemId}`);
            if (response.data?.success) {
              setShowcaseItems(response.data.data);
              Alert.alert('Başarılı', 'Çalışmanız galeriden silindi.');
            }
          } catch (err) {
            Alert.alert('Hata', 'Çalışma silinemedi.');
          }
        }
      }
    ]);
  };

  const filteredJobOffers = jobOffers.filter(
    (job) => selectedCity === 'Tüm Türkiye' || (job.ustaCity || job.city || 'İstanbul') === selectedCity
  );

  return (
    <View style={[styles.container, { backgroundColor: '#F8FAFC' }]}>
      {/* Header */}
      <PremiumHeader
        title="Usta Kanalları"
        subtitle="Meslektaşlarınla yardımlaş, iş paylaş ve zanaatini sergile"
        layout="tab"
        backgroundImage={require('../../assets/images/header_bg.png')}
      />

      {/* Tabs */}
      <View style={{ height: 80, marginTop: 12, marginBottom: 4 }}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScrollView}
        >
          {[
            { id: 'forum', label: 'Teknik Destek', icon: 'construct-outline', activeColor: colors.primary, gradientColors: [colors.primary, colors.primaryDark || '#1E40AF'] },
            { id: 'jobs', label: 'İş Paslama', icon: 'briefcase-outline', activeColor: '#06B6D4', gradientColors: ['#06B6D4', '#0891B2'] },
            { id: 'gallery', label: 'Hünerlerim', icon: 'bulb-outline', activeColor: '#10B981', gradientColors: ['#10B981', '#047857'] },
            { id: 'materials', label: 'Malzeme', icon: 'document-text-outline', activeColor: '#059669', gradientColors: ['#059669', '#064E3B'] },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            const iconColor = isActive ? '#FFF' : tab.activeColor;
            const textColor = isActive ? '#FFF' : '#475569';
            return (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.tabCardBtn,
                  isActive && [styles.tabCardBtnActive, { shadowColor: tab.activeColor }]
                ]}
                onPress={() => {
                  if (tab.id !== 'materials') {
                    setActiveTab(tab.id as any);
                  } else {
                    Alert.alert('Yakında', 'Malzeme kanalı yakında hizmete girecektir. 🚀');
                  }
                }}
                activeOpacity={0.8}
              >
                {isActive && (
                  <LinearGradient
                    colors={tab.gradientColors as any}
                    style={[StyleSheet.absoluteFillObject, { borderRadius: 12 }]}
                  />
                )}
                <Ionicons 
                  name={tab.icon as any} 
                  size={18} 
                  color={iconColor} 
                  style={{ marginBottom: 4 }} 
                />
                <Text style={[styles.tabCardLabel, { color: textColor }]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Content ScrollView */}
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* ==================== FORUM / SORU-CEVAP AKIŞI ==================== */}
          {activeTab === 'forum' && (
            <View style={{ width: '100%' }}>
              {forumPosts.length > 0 && (
                <TouchableOpacity
                  style={[styles.actionBtn, { overflow: 'hidden', padding: 0 }]}
                  onPress={() => setIsNewPostModalVisible(true)}
                >
                  <LinearGradient
                    colors={[colors.primary, colors.primaryDark || '#1E40AF']}
                    style={styles.actionBtnGradient}
                  >
                    <Ionicons name="add-circle" size={18} color="#FFF" />
                    <Text style={styles.actionBtnText}>Yeni Teknik Soru Sor</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {forumPosts.length === 0 ? (
                <EmptyState
                  icon="chatbubbles-outline"
                  title="Soru Bulunamadı"
                  description="Henüz bu kanalda bir teknik soru sorulmamış."
                  buttonTitle="İlk Soruyu Sen Sor"
                  onButtonPress={() => setIsNewPostModalVisible(true)}
                />
              ) : (
                forumPosts.map((post) => {
                  const descText = post.description || '';
                  const hashtagRegex = /#\w+/g;
                  const parsedTags = descText.match(hashtagRegex) || [];

                  let cleanedDesc = descText;
                  if (parsedTags.length > 0) {
                    cleanedDesc = descText.replace(hashtagRegex, '').trim();
                  }

                  const relativeTimeStr = getRelativeTime(post.createdAt);

                  return (
                    <TouchableOpacity
                      key={post.id}
                      style={styles.forumCard}
                      activeOpacity={0.8}
                      onPress={() => {
                        setSelectedPost(post);
                        setIsCommentsModalVisible(true);
                      }}
                    >
                      {/* Header Row */}
                      <View style={styles.forumHeader}>
                        <View style={styles.avatarWrapper}>
                          {post.ustaAvatar ? (
                            <Image 
                              source={{ uri: post.ustaAvatar }} 
                              style={styles.forumAvatar} 
                            />
                          ) : (
                            <View style={[styles.forumAvatar, { backgroundColor: colors.primary + '15', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.primary + '30' }]}>
                              <Text style={{ color: colors.primary, fontSize: 15, fontFamily: fonts.bold }}>
                                {post.ustaName ? post.ustaName.charAt(0).toUpperCase() : 'U'}
                              </Text>
                            </View>
                          )}
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Text style={styles.forumAuthor}>{post.ustaName}</Text>
                            {post.ustaVerified && (
                              <Ionicons name="checkmark-circle" size={14} color="#0284C7" />
                            )}
                          </View>
                          <View style={styles.authorBadgeRow}>
                            {!!post.ustaCityOnly && (
                              <TouchableOpacity
                                onPress={(e) => {
                                  e.stopPropagation();
                                  setLocationsModalUstaName(post.ustaName || 'Usta');
                                  setLocationsModalContent(post.ustaFullLocations ? post.ustaFullLocations.split(' • ') : [post.ustaCityOnly || 'İstanbul']);
                                  setIsLocationsModalVisible(true);
                                }}
                                style={styles.authorCityBadge}
                                activeOpacity={0.6}
                              >
                                <Ionicons name="location-outline" size={10} color="#64748B" />
                                <Text style={styles.authorCityBadgeText} numberOfLines={1}>{post.ustaCityOnly}</Text>
                              </TouchableOpacity>
                            )}
                            {!!post.ustaCityOnly && <Text style={styles.bulletSeparator}>•</Text>}
                            <Text style={styles.metaTime}>{relativeTimeStr}</Text>
                          </View>
                        </View>
                        {post.ustaId === user?.id && (
                          <TouchableOpacity
                            onPress={(e) => {
                              e.stopPropagation();
                              handleDeleteForumPost(post.id);
                            }}
                            style={styles.deleteButton}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="trash-outline" size={13} color="#EF4444" />
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* Title & Description */}
                      <Text style={styles.forumTitle}>{post.title}</Text>
                      {!!cleanedDesc && (
                        <Text style={styles.forumDesc} numberOfLines={3}>{cleanedDesc}</Text>
                      )}

                      {/* Dynamic image slot - only show if there is actually an image URL - placed below Title & Description */}
                      {!!post.imageUrl && (
                        <Image source={{ uri: post.imageUrl }} style={styles.forumImage} />
                      )}
                      
                      {/* Dynamic Hashtags & Structured Capsules */}
                      <View style={styles.tagCapsulesRow}>
                        {parsedTags.length > 0 ? (
                          parsedTags.map((tag: string, idx: number) => (
                            <View key={idx} style={[styles.tagCapsule, { backgroundColor: colors.primary + '08', borderColor: colors.primary + '18' }]}>
                              <Text style={[styles.tagCapsuleText, { color: colors.primary }]}>{tag}</Text>
                            </View>
                          ))
                        ) : (
                          <>
                            <View style={[styles.tagCapsule, { backgroundColor: colors.primary + '08', borderColor: colors.primary + '18' }]}>
                              <Ionicons name="construct-outline" size={10} color={colors.primary} />
                              <Text style={[styles.tagCapsuleText, { color: colors.primary }]}>Teknik Soru</Text>
                            </View>
                            <View style={[styles.tagCapsule, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }]}>
                              <Ionicons name="flash-outline" size={10} color="#0284C7" />
                              <Text style={[styles.tagCapsuleText, { color: '#0284C7' }]}>Elektrik</Text>
                            </View>
                          </>
                        )}
                      </View>

                      {/* Footer Row */}
                      <View style={styles.forumFooter}>
                        <View style={styles.footerPillsRow}>
                          <View style={[styles.footerPill, { backgroundColor: colors.primary + '10' }]}>
                            <Ionicons name="chatbubble-outline" size={12} color={colors.primary} style={{ marginRight: 4 }} />
                            <Text style={[styles.footerPillText, { color: colors.primary }]}>
                              {post.comments?.length ? `${post.comments.length} Cevap` : 'Cevap Yaz'}
                            </Text>
                          </View>
                          <TouchableOpacity 
                            style={styles.footerShareBtn}
                            onPress={(e) => {
                              e.stopPropagation();
                              Alert.alert('Paylaş', 'Soru bağlantısı panoya kopyalandı.');
                            }}
                          >
                            <Ionicons name="share-social-outline" size={12} color="#64748B" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          )}

          {/* ==================== İŞ PASLAMA / ORTAKLIK AKIŞI ==================== */}
          {activeTab === 'jobs' && (
            <View style={{ width: '100%' }}>
              <View style={styles.jobsHeaderRow}>
                <TouchableOpacity
                  style={[styles.cityFilterBtn, { borderColor: 'rgba(8, 145, 178, 0.2)' }]}
                  onPress={() => setIsCityFilterModalVisible(true)}
                >
                  <Ionicons name="location-outline" size={14} color="#0891B2" />
                  <Text style={[styles.cityFilterText, { color: '#0891B2' }]}>{selectedCity}</Text>
                  <Ionicons name="chevron-down" size={12} color="#0891B2" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.miniAddBtn, { overflow: 'hidden', padding: 0 }]}
                  onPress={() => setIsNewJobModalVisible(true)}
                >
                  <LinearGradient
                    colors={[colors.primary, colors.primaryDark || '#1E40AF']}
                    style={styles.miniAddBtnGradient}
                  >
                    <Ionicons name="add" size={16} color="#FFF" />
                    <Text style={styles.miniAddBtnText}>İş Pasla</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {filteredJobOffers.length === 0 ? (
                <EmptyState
                  icon="briefcase-outline"
                  title="İş İlanı Bulunamadı"
                  description={`${selectedCity} şehri için henüz bir iş paylaşılmamış.`}
                  buttonTitle="İlk İşi Sen Pasla"
                  onButtonPress={() => setIsNewJobModalVisible(true)}
                />
              ) : (
                filteredJobOffers.map((offer) => {
                  const isOwnJob = offer.ustaId === user?.id;
                  return (
                    <TouchableOpacity
                      key={offer.id}
                      style={[styles.jobCard, { borderLeftColor: colors.primary }]}
                      activeOpacity={isOwnJob ? 1 : 0.85}
                      onPress={() => {
                        if (isOwnJob) {
                          Alert.alert('Bilgi', 'Bu sizin kendi iş ilanınızdır.');
                        } else {
                          Alert.alert(
                            'İletişime Geç',
                            `${offer.ustaName} ile görüşme başlatılsın mı?`,
                            [
                              { text: 'Vazgeç', style: 'cancel' },
                              {
                                text: 'Evet, Başlat',
                                onPress: () => handleContactUsta(offer.ustaId, offer.ustaName)
                              }
                            ]
                          );
                        }
                      }}
                    >
                      <View style={styles.jobCardHeader}>
                        <View style={[styles.cityBadge, { backgroundColor: colors.primary + '08', borderColor: colors.primary + '20' }]}>
                          <Ionicons name="location" size={10} color={colors.primary} style={{ marginRight: 4 }} />
                          <Text style={[styles.cityBadgeText, { color: colors.primary }]}>{offer.ustaCity || offer.city || 'İstanbul'}</Text>
                        </View>
                        <View style={styles.jobCardUrgencyBadge}>
                          <Ionicons name="flash" size={10} color="#F59E0B" style={{ marginRight: 2 }} />
                          <Text style={styles.jobCardUrgencyText}>Aktif Fırsat</Text>
                        </View>
                      </View>

                      <View style={styles.jobCardBody}>
                        <View style={styles.jobCardTitleRow}>
                          <Ionicons name="briefcase-outline" size={14} color={colors.primary} style={{ marginRight: 6 }} />
                          <Text style={styles.jobCardTitle} numberOfLines={1}>{offer.title}</Text>
                        </View>
                        <View style={styles.jobCardDescContainer}>
                          <Text style={styles.jobCardDesc} numberOfLines={2}>{offer.description}</Text>
                        </View>
                      </View>

                      <View style={styles.jobCardFooter}>
                        <View style={styles.jobPublisherRow}>
                          {offer.ustaAvatar ? (
                            <Image 
                              source={{ uri: offer.ustaAvatar }} 
                              style={styles.jobPublisherAvatar} 
                            />
                          ) : (
                            <LinearGradient
                              colors={[colors.primary, colors.primaryDark || '#1E40AF']}
                              style={styles.jobPublisherAvatar}
                            >
                              <Text style={styles.jobPublisherAvatarText}>
                                {offer.ustaName ? offer.ustaName.charAt(0).toUpperCase() : 'U'}
                              </Text>
                            </LinearGradient>
                          )}
                          <View>
                            <Text style={styles.jobCardAuthorLabel}>Paslayan Usta</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                              <Text style={styles.jobCardAuthor}>{offer.ustaName}</Text>
                              <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                            </View>
                          </View>
                        </View>

                        {offer.ustaId !== user?.id && (
                          <TouchableOpacity
                            style={styles.jobContactBtnContainer}
                            onPress={() => {
                              Alert.alert(
                                'İletişime Geç',
                                `${offer.ustaName} ile görüşme başlatılsın mı?`,
                                [
                                  { text: 'Vazgeç', style: 'cancel' },
                                  {
                                    text: 'Evet, Başlat',
                                    onPress: () => handleContactUsta(offer.ustaId, offer.ustaName)
                                  }
                                ]
                              );
                            }}
                          >
                            <LinearGradient
                              colors={['#10B981', '#059669']}
                              style={styles.jobContactGradient}
                            >
                              <Ionicons name="chatbubbles" size={13} color="#FFF" />
                              <Text style={styles.jobContactText}>İşi Al / Konuş</Text>
                            </LinearGradient>
                          </TouchableOpacity>
                        )}
                      </View>

                      {offer.ustaId === user?.id && (
                        <View style={styles.ownerControlRow}>
                          <View style={styles.ownJobBadge}>
                            <Ionicons name="checkmark-circle" size={12} color="#059669" />
                            <Text style={styles.ownJobBadgeText}>İlanınız Yayında</Text>
                          </View>
                          <TouchableOpacity
                            style={styles.jobDeleteBtn}
                            onPress={() => handleDeleteJobOffer(offer.id)}
                          >
                            <Ionicons name="trash" size={12} color="#EF4444" style={{ marginRight: 4 }} />
                            <Text style={styles.jobDeleteBtnText}>İptal Et</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          )}

          {/* ==================== HÜNERLERİM / PHOTO SHOWCASE ==================== */}
          {activeTab === 'gallery' && (
            <View style={{ width: '100%' }}>
              {showcaseItems.length > 0 && (
                <TouchableOpacity
                  style={[styles.actionBtn, { overflow: 'hidden', padding: 0 }]}
                  onPress={() => setIsNewShowcaseModalVisible(true)}
                >
                  <LinearGradient
                    colors={[colors.primary, colors.primaryDark || '#1E40AF']}
                    style={styles.actionBtnGradient}
                  >
                    <Ionicons name="camera" size={18} color="#FFF" />
                    <Text style={styles.actionBtnText}>Yeni Hüner Fotoğrafı Yükle</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {showcaseItems.length === 0 ? (
                <EmptyState
                  icon="images-outline"
                  title="Hüner Bulunamadı"
                  description="Henüz kimse hüner galerisine bir fotoğraf yüklememiş."
                  buttonTitle="İlk Fotoğrafı Sen Yükle"
                  onButtonPress={() => setIsNewShowcaseModalVisible(true)}
                />
              ) : (
                <View style={styles.masonryGrid}>
                  {showcaseItems.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.9}
                      onPress={() => {
                        setSelectedShowcaseItem(item);
                        setShowcaseActiveImageIndex(0);
                        setIsShowcaseDetailModalVisible(true);
                      }}
                      style={styles.masonryItem}
                    >
                      <View style={styles.imageWrapper}>
                        <Image source={{ uri: getFileUrl(item.image) || '' }} style={styles.masonryImage} />
                        {item.images && item.images.length > 1 && (
                          <View style={styles.multiPhotoBadge}>
                            <Ionicons name="layers" size={10} color="#FFF" />
                            <Text style={styles.multiPhotoText}>+{item.images.length - 1}</Text>
                          </View>
                        )}
                        
                        {item.ustaId === user?.id && (
                          <TouchableOpacity
                            style={styles.masonryDeleteBtn}
                            onPress={(e) => {
                              e.stopPropagation(); // prevent opening the modal
                              handleDeleteShowcaseItem(item.id);
                            }}
                          >
                            <Ionicons name="trash" size={12} color="#EF4444" />
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* Professional Card Footer */}
                      <View style={styles.showcaseCardFooter}>
                        <Text style={styles.showcaseCardTitle} numberOfLines={1}>{item.title}</Text>
                        
                        <View style={styles.showcaseCardAuthorRow}>
                          <View style={styles.showcaseCardAvatarContainer}>
                            {item.ustaAvatar ? (
                              <Image 
                                source={{ uri: getFileUrl(item.ustaAvatar) || '' }} 
                                style={styles.showcaseCardAvatar} 
                                resizeMode="cover"
                              />
                            ) : (
                              <Ionicons name="person" size={10} color="#94A3B8" />
                            )}
                          </View>
                          
                          <View style={styles.showcaseCardAuthorInfo}>
                            <Text style={styles.showcaseCardAuthorName} numberOfLines={1}>
                              {item.ustaName}
                            </Text>
                            <View style={styles.showcaseCardLocRow}>
                              <Ionicons name="location" size={8} color={colors.primary} />
                              <Text style={styles.showcaseCardLocText} numberOfLines={1}>
                                {item.ustaCity || 'İstanbul'}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* ==================== MODALS ==================== */}

      {/* 1. New Forum Post Modal */}
      <Modal visible={isNewPostModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Teknik Soru Sor</Text>
              <TouchableOpacity onPress={() => setIsNewPostModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Soru Başlığı *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="help-circle-outline" size={18} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                placeholder="Örn: 24W Akıllı Led Sürücü arızası"
                placeholderTextColor="#94A3B8"
                value={newPostTitle}
                onChangeText={setNewPostTitle}
              />
            </View>

            <Text style={styles.label}>Sorunun Açıklaması *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="document-text-outline" size={18} color="#64748B" style={[styles.inputIcon, { top: 12 }]} />
              <TextInput
                style={[styles.inputWithIcon, { height: 100, textAlignVertical: 'top', paddingTop: 10 }]}
                placeholder="Sorununuzu, hata kodunu veya detayları yazın..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={4}
                value={newPostDesc}
                onChangeText={setNewPostDesc}
              />
            </View>

            <Text style={styles.label}>Fotoğraf Ekle (Opsiyonel)</Text>
            {newPostImage ? (
              <View style={styles.previewContainer}>
                <Image source={{ uri: newPostImage }} style={styles.previewImage} />
                <TouchableOpacity style={styles.removeImageBtn} onPress={() => setNewPostImage(null)}>
                  <Ionicons name="close" size={16} color="#FFF" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.imageSelector} onPress={() => handlePickImage('forum')}>
                <Ionicons name="camera-outline" size={24} color={colors.primary} />
                <Text style={{ color: colors.primary, fontFamily: fonts.bold, fontSize: 13, marginTop: 4 }}>Galeri veya Kameradan Seç</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={handleAddForumPost}>
              <Text style={styles.submitBtnText}>Soruyu Yayınla 🚀</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 2. Forum Comments Modal */}
      <Modal visible={isCommentsModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: '85%', width: '100%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>{selectedPost?.title}</Text>
              <TouchableOpacity onPress={() => setIsCommentsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            {selectedPost && (
              <ScrollView style={{ flex: 1, marginTop: 12 }}>
                <Text style={styles.postBody}>{selectedPost.description}</Text>
                {selectedPost.imageUrl && (
                  <Image source={{ uri: selectedPost.imageUrl }} style={[styles.forumImage, { height: 200 }]} />
                )}

                <View style={styles.divider} />

                <Text style={[styles.sectionTitle, { color: '#1E293B', marginVertical: 12 }]}>Topluluk Cevapları ({selectedPost.comments?.length || 0})</Text>

                {selectedPost.comments && selectedPost.comments.length === 0 ? (
                  <Text style={styles.noCommentsText}>Henüz hiç yorum yapılmamış. Meslektaşına ilk yardımı sen et!</Text>
                ) : (
                  selectedPost.comments?.map((comment: any) => (
                    <View key={comment.id} style={styles.commentBox}>
                      <Text style={styles.commentAuthor}>{comment.ustaName}</Text>
                      <Text style={styles.commentText}>{comment.text}</Text>
                      <Text style={styles.commentTime}>1 dk önce</Text>
                    </View>
                  ))
                )}
              </ScrollView>
            )}

            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentInput}
                placeholder="Yardımcı olacak cevabınızı yazın..."
                placeholderTextColor="#94A3B8"
                value={newCommentText}
                onChangeText={setNewCommentText}
              />
              <TouchableOpacity style={[styles.sendCommentBtn, { backgroundColor: colors.primary }]} onPress={handleAddComment}>
                <Ionicons name="send" size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 3. New Job Offer Modal */}
      <Modal visible={isNewJobModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>İş Pasla / Eleman Bul</Text>
              <TouchableOpacity onPress={() => setIsNewJobModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>İş Başlığı *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="briefcase-outline" size={18} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                placeholder="Örn: Kadıköy'de 3 Günlük Yardımcı Usta Arayışı"
                placeholderTextColor="#94A3B8"
                value={newJobTitle}
                onChangeText={setNewJobTitle}
              />
            </View>

            <Text style={styles.label}>İşin ve Şartların Detayı *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="document-text-outline" size={18} color="#64748B" style={[styles.inputIcon, { top: 12 }]} />
              <TextInput
                style={[styles.inputWithIcon, { height: 100, textAlignVertical: 'top', paddingTop: 10 }]}
                placeholder="Aradığınız şartları, işin niteliğini ve ödeme bilgisini yazın..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={4}
                value={newJobDesc}
                onChangeText={setNewJobDesc}
              />
            </View>

            <View style={{ backgroundColor: 'rgba(245, 158, 11, 0.06)', borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.18)', borderRadius: 12, padding: 12, marginVertical: 12 }}>
              <Text style={{ color: '#D97706', fontSize: 12.5, fontFamily: fonts.bold }}>Önemli Not</Text>
              <Text style={{ color: '#78350F', fontSize: 11, fontFamily: fonts.medium, marginTop: 3 }}>
                Bu iş paslama teklifi sadece sizin kayıtlı olduğunuz şehirdeki ({user?.city || 'İstanbul'}) ustalar tarafından görülecektir.
              </Text>
            </View>

            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={handleAddJobOffer}>
              <Text style={styles.submitBtnText}>Teklifi Yayınla 🤝</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 4. City Filter Modal */}
      <Modal visible={isCityFilterModalVisible} transparent animationType="fade">
        <View style={styles.centerModalOverlay}>
          <View style={styles.cityModalContent}>
            <Text style={styles.cityModalTitle}>Şehir Seçin</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {CITIES.map((city) => (
                <TouchableOpacity
                  key={city}
                  style={[
                    styles.cityListItem,
                    selectedCity === city && { backgroundColor: colors.primary + '15' }
                  ]}
                  onPress={() => {
                    setSelectedCity(city);
                    setIsCityFilterModalVisible(false);
                  }}
                >
                  <Text style={[styles.cityListItemText, selectedCity === city && { color: colors.primary, fontFamily: fonts.bold }]}>{city}</Text>
                  {selectedCity === city && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 5. New Showcase Gallery Modal */}
      <Modal visible={isNewShowcaseModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Hüner Fotoğrafı Yükle</Text>
              <TouchableOpacity onPress={() => setIsNewShowcaseModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Çalışmanın Başlığı *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="image-outline" size={18} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                placeholder="Örn: 24'lü Dağıtım Panosu Kablolama"
                placeholderTextColor="#94A3B8"
                value={newShowcaseTitle}
                onChangeText={setNewShowcaseTitle}
              />
            </View>

            <Text style={styles.label}>Açıklama (Opsiyonel)</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="document-text-outline" size={18} color="#64748B" style={styles.inputIcon} />
              <TextInput
                style={styles.inputWithIcon}
                placeholder="Kullandığınız marka, şantiye bilgisi vb."
                placeholderTextColor="#94A3B8"
                value={newShowcaseDesc}
                onChangeText={setNewShowcaseDesc}
              />
            </View>

            <Text style={styles.label}>Çalışma Görselleri * (En fazla 5 adet)</Text>
            <View style={{ marginBottom: 16 }}>
              {newShowcaseImages.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginBottom: 12 }}>
                  {newShowcaseImages.map((img, idx) => (
                    <View key={idx} style={{ position: 'relative', marginRight: 10 }}>
                      <Image source={{ uri: img }} style={{ width: 80, height: 80, borderRadius: 12, backgroundColor: '#1E293B' }} />
                      <TouchableOpacity 
                        style={{ position: 'absolute', top: -5, right: -5, backgroundColor: '#EF4444', borderRadius: 10, padding: 2 }}
                        onPress={() => {
                          setNewShowcaseImages(prev => prev.filter((_, i) => i !== idx));
                        }}
                      >
                        <Ionicons name="close" size={12} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}

              {newShowcaseImages.length < 5 && (
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity 
                    style={{ flex: 1, height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: colors.primary, borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    onPress={() => handlePickShowcaseImage('gallery')}
                  >
                    <Ionicons name="images-outline" size={20} color={colors.primary} />
                    <Text style={{ color: colors.primary, fontFamily: fonts.bold, fontSize: 12.5 }}>Galeriden Seç</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={{ flex: 1, height: 44, borderRadius: 12, borderWidth: 1.5, borderColor: colors.primary, borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    onPress={() => handlePickShowcaseImage('camera')}
                  >
                    <Ionicons name="camera-outline" size={20} color={colors.primary} />
                    <Text style={{ color: colors.primary, fontFamily: fonts.bold, fontSize: 12.5 }}>Kamera ile Çek</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary, marginTop: 20 }]} onPress={handleAddShowcaseItem}>
              <Text style={styles.submitBtnText}>Hünerini Vitrine Ekle 📸</Text>
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

                  {/* Badge + Başlık */}
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

                  <View style={{ height: 1, backgroundColor: '#F1F5F9', marginBottom: 20 }} />

                  {/* Eserin Sahibi */}
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
                      <View style={{
                        width: 56, height: 56, borderRadius: 28,
                        backgroundColor: '#E0E7FF',
                        justifyContent: 'center', alignItems: 'center',
                        borderWidth: 2.5, borderColor: colors.primary,
                        overflow: 'hidden',
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

                  {/* Alt CTA */}
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
                        handleContactUsta(selectedShowcaseItem.ustaId, selectedShowcaseItem.ustaName);
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
              source={{ uri: showFullscreenImage }} 
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

      {/* ==================== HİZMET BÖLGELERİ CUSTOM MODAL ==================== */}
      <Modal
        visible={isLocationsModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsLocationsModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.locationsModalOverlay}
          activeOpacity={1}
          onPress={() => setIsLocationsModalVisible(false)}
        >
          <TouchableOpacity 
            style={styles.locationsModalContent}
            activeOpacity={1}
          >
            {/* Top Indicator bar */}
            <View style={[styles.locationsIndicatorBar, { backgroundColor: colors.primary }]} />

            {/* Header Block */}
            <View style={styles.locationsModalHeader}>
              <View style={[styles.locationsIconContainer, { backgroundColor: colors.primary + '10' }]}>
                <Ionicons name="location" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.locationsModalTitle}>Hizmet Bölgeleri</Text>
                <Text style={styles.locationsModalSubtitle} numberOfLines={1}>{locationsModalUstaName} Usta</Text>
              </View>
              <TouchableOpacity 
                style={styles.locationsCloseIconButton}
                onPress={() => setIsLocationsModalVisible(false)}
              >
                <Ionicons name="close" size={16} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Content description */}
            <Text style={styles.locationsModalDesc}>
              Ustanın teknik servis ve kurulum hizmeti sunduğu tüm bölgeler aşağıda listelenmiştir:
            </Text>

            {/* Districts List */}
            <ScrollView style={styles.locationsModalScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.locationsListContainer}>
                {locationsModalContent.map((item, idx) => (
                  <View key={idx} style={styles.locationsItemRow}>
                    <View style={[styles.locationsBulletCircle, { backgroundColor: colors.primary }]} />
                    <Text style={styles.locationsItemText}>{item}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>

            {/* Bottom Button */}
            <TouchableOpacity
              onPress={() => setIsLocationsModalVisible(false)}
              activeOpacity={0.85}
              style={{ borderRadius: 12, overflow: 'hidden', marginTop: 16 }}
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryDark || colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.locationsModalCloseBtn}
              >
                <Text style={styles.locationsModalCloseBtnText}>Kapat</Text>
              </LinearGradient>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  headerActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  headerAvatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  // Premium tabs styling
  tabScrollView: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
    height: '100%',
  },
  tabCardBtn: {
    width: 90,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  tabCardBtnActive: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  tabCardLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    textAlign: 'center',
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 80,
  },
  actionBtn: {
    height: 44,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  actionBtnGradient: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionBtnText: {
    color: '#FFF',
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  // Elite Forum Card
  forumCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  forumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarWrapper: {
    position: 'relative',
  },
  forumAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  forumAuthor: {
    color: '#0F172A',
    fontSize: 15,
    fontFamily: fonts.bold,
  },
  authorBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 2,
  },
  authorCityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    maxWidth: width * 0.55,
  },
  authorCityBadgeText: {
    fontSize: 10,
    fontFamily: fonts.medium,
    color: '#64748B',
  },
  bulletSeparator: {
    color: '#94A3B8',
    fontSize: 10,
    marginHorizontal: 5,
    fontFamily: fonts.medium,
  },
  metaTime: {
    color: '#94A3B8',
    fontSize: 10.5,
    fontFamily: fonts.medium,
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#FEE2E2',
  },
  forumTitle: {
    color: '#0F172A',
    fontSize: 17,
    fontFamily: fonts.bold,
    lineHeight: 24,
    marginBottom: 8,
    marginTop: 6,
  },
  forumDesc: {
    color: '#334155',
    fontSize: 13.5,
    fontFamily: fonts.regular,
    lineHeight: 20,
    marginBottom: 12,
  },
  tagCapsulesRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  tagCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 0.5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  tagCapsuleText: {
    fontSize: 10,
    fontFamily: fonts.bold,
  },
  forumImage: {
    width: '100%',
    height: 190,
    borderRadius: 14,
    resizeMode: 'cover',
    marginBottom: 12,
    backgroundColor: '#0F172A',
  },
  forumFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
    marginTop: 4,
  },
  footerPillsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  footerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  footerPillText: {
    fontSize: 11,
    fontFamily: fonts.bold,
  },
  footerShareBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Jobs Styles
  jobsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cityFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    height: 32,
    borderRadius: 10,
    gap: 4,
  },
  cityFilterText: {
    fontFamily: fonts.bold,
    fontSize: 11.5,
  },
  miniAddBtn: {
    height: 32,
    borderRadius: 10,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  miniAddBtnGradient: {
    height: '100%',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniAddBtnText: {
    color: '#FFF',
    fontFamily: fonts.bold,
    fontSize: 11,
  },
  jobCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  jobCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cityBadgeText: {
    fontSize: 9,
    fontFamily: fonts.bold,
    textTransform: 'uppercase',
  },
  jobCardUrgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(245, 158, 11, 0.18)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  jobCardUrgencyText: {
    color: '#F59E0B',
    fontSize: 9.5,
    fontFamily: fonts.bold,
  },
  jobCardTitle: {
    color: '#0F172A',
    fontSize: 14.5,
    fontFamily: fonts.bold,
    flex: 1,
  },
  jobCardDesc: {
    color: '#475569',
    fontSize: 11.5,
    fontFamily: fonts.medium,
    lineHeight: 16,
  },
  jobCardBody: {
    marginVertical: 8,
    gap: 6,
  },
  jobCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  jobCardDescContainer: {
    borderLeftWidth: 2,
    borderLeftColor: '#E2E8F0',
    paddingLeft: 8,
    marginLeft: 2,
  },
  jobCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  jobPublisherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  jobPublisherAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  jobPublisherAvatarText: {
    color: '#FFF',
    fontSize: 10,
    fontFamily: fonts.bold,
  },
  jobCardAuthorLabel: {
    color: '#64748B',
    fontSize: 8.5,
    fontFamily: fonts.medium,
  },
  jobCardAuthor: {
    color: '#334155',
    fontSize: 11,
    fontFamily: fonts.bold,
  },
  jobContactBtnContainer: {
    borderRadius: 6,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  jobContactGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    height: 28,
    gap: 4,
  },
  jobContactText: {
    color: '#FFF',
    fontFamily: fonts.bold,
    fontSize: 10.5,
  },
  ownJobBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(16, 185, 129, 0.18)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 3,
  },
  ownJobBadgeText: {
    color: '#059669',
    fontSize: 9.5,
    fontFamily: fonts.bold,
  },
  jobDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(239, 68, 68, 0.18)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  jobDeleteBtnText: {
    color: '#EF4444',
    fontSize: 9.5,
    fontFamily: fonts.bold,
  },
  ownerControlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  // Masonry Showcase Gallery Styles
  masonryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  masonryItem: {
    width: (width - 34) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  imageWrapper: {
    width: '100%',
    height: 150,
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  showcaseCardFooter: {
    padding: 10,
    backgroundColor: '#FFFFFF',
  },
  showcaseCardTitle: {
    fontFamily: fonts.bold,
    fontSize: 12.5,
    color: '#0F172A',
    marginBottom: 6,
  },
  showcaseCardAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  showcaseCardAvatarContainer: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  showcaseCardAvatar: {
    width: '100%',
    height: '100%',
  },
  showcaseCardAuthorInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  showcaseCardAuthorName: {
    fontFamily: fonts.bold,
    fontSize: 10.5,
    color: '#334155',
    lineHeight: 12,
  },
  showcaseCardLocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 1,
  },
  showcaseCardLocText: {
    fontFamily: fonts.medium,
    fontSize: 8.5,
    color: '#64748B',
  },
  hiwModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  marketModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 10,
  },
  marketModalTitle: {
    fontSize: 18,
    fontFamily: fonts.bold,
    color: '#0F172A',
  },
  masonryImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  masonryImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
  },
  masonryImageOverlayContent: {
    padding: 8,
  },
  multiPhotoBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
    gap: 2,
    zIndex: 2,
  },
  multiPhotoText: {
    color: '#FFF',
    fontSize: 8.5,
    fontFamily: fonts.bold,
  },
  masonryTitle: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontFamily: fonts.bold,
  },
  masonryUstaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  masonryUstaText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 9.5,
    fontFamily: fonts.medium,
  },
  masonryDeleteBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  // Modals Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: Platform.OS === 'android' ? 44 : 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
    marginBottom: 12,
  },
  modalTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontFamily: fonts.bold,
  },
  label: {
    color: '#475569',
    fontSize: 11.5,
    fontFamily: fonts.bold,
    marginBottom: 4,
    marginTop: 6,
  },
  inputWrapper: {
    position: 'relative',
    width: '100%',
    marginBottom: 8,
  },
  inputIcon: {
    position: 'absolute',
    left: 12,
    top: 11,
    zIndex: 2,
  },
  inputWithIcon: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    color: '#0F172A',
    paddingLeft: 38,
    paddingRight: 12,
    height: 40,
    fontFamily: fonts.medium,
    fontSize: 12.5,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    color: '#0F172A',
    paddingHorizontal: 12,
    height: 40,
    fontFamily: fonts.medium,
    fontSize: 12.5,
    marginBottom: 8,
  },
  imageSelector: {
    height: 70,
    borderRadius: 10,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
  },
  previewContainer: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: 10,
    overflow: 'hidden',
    marginVertical: 8,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 3,
    borderRadius: 8,
  },
  submitBtn: {
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  submitBtnText: {
    color: '#FFF',
    fontFamily: fonts.bold,
    fontSize: 13.5,
  },
  postBody: {
    color: '#334155',
    fontSize: 12.5,
    fontFamily: fonts.regular,
    lineHeight: 18,
    marginBottom: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: fonts.bold,
  },
  noCommentsText: {
    color: '#64748B',
    fontSize: 11.5,
    fontFamily: fonts.medium,
    textAlign: 'center',
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  commentBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  commentAuthor: {
    color: '#0F172A',
    fontSize: 11.5,
    fontFamily: fonts.bold,
    marginBottom: 2,
  },
  commentText: {
    color: '#334155',
    fontSize: 12,
    fontFamily: fonts.regular,
  },
  commentTime: {
    color: '#64748B',
    fontSize: 8.5,
    fontFamily: fonts.medium,
    marginTop: 4,
    textAlign: 'right',
  },
  commentInputRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    color: '#0F172A',
    paddingHorizontal: 12,
    height: 36,
    fontFamily: fonts.medium,
    fontSize: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sendCommentBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // City Filter Modal Styles
  centerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cityModalContent: {
    backgroundColor: '#FFFFFF',
    width: '75%',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cityModalTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontFamily: fonts.bold,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
    marginBottom: 8,
  },
  cityListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginVertical: 1,
  },
  cityListItemText: {
    color: '#475569',
    fontSize: 12.5,
    fontFamily: fonts.medium,
  },
  // Custom theme-compliant Locations modal styles
  locationsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  locationsModalContent: {
    width: '90%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 18,
    elevation: 10,
  },
  locationsIndicatorBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  locationsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  locationsIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationsModalTitle: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: '#0F172A',
  },
  locationsModalSubtitle: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: '#64748B',
    marginTop: 1,
  },
  locationsCloseIconButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationsModalDesc: {
    fontSize: 12.5,
    fontFamily: fonts.medium,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 16,
  },
  locationsModalScroll: {
    maxHeight: 200,
  },
  locationsListContainer: {
    gap: 10,
  },
  locationsItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: '#E2E8F0',
  },
  locationsBulletCircle: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  locationsItemText: {
    fontSize: 12,
    fontFamily: fonts.bold,
    color: '#334155',
  },
  locationsModalCloseBtn: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  locationsModalCloseBtnText: {
    color: '#FFFFFF',
    fontFamily: fonts.bold,
    fontSize: 13.5,
  },
});
