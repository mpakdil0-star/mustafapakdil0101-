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
import { colors as staticColors } from '../../constants/colors';
import { fonts } from '../../constants/typography';
import api from '../../services/api';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import { EmptyState } from '../../components/common/EmptyState';

const { width } = Dimensions.get('window');

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

  // Cities List for Filter
  const CITIES = ['Tüm Türkiye', 'İstanbul', 'Ankara', 'İzmir', 'Adana', 'Antalya', 'Bursa', 'Mersin', 'Kocaeli', 'Gaziantep'];

  // Fetch Forum Posts
  const fetchForumPosts = async () => {
    try {
      const response = await api.get('/community/forum');
      if (response.data?.success) {
        setForumPosts(response.data.data);
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

  // Fetch Showcase Items
  const fetchShowcaseItems = async () => {
    try {
      const response = await api.get('/showcase');
      if (response.data?.success) {
        setShowcaseItems(response.data.data);
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
        setJobOffers(response.data.data);
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
                forumPosts.map((post) => (
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
                        <Image 
                          source={{ uri: post.ustaAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80' }} 
                          style={styles.forumAvatar} 
                        />
                        <View style={[styles.verifiedBadgeMini, { backgroundColor: colors.primary }]}>
                          <Ionicons name="checkmark" size={8} color="#FFF" />
                        </View>
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.forumAuthor}>{post.ustaName}</Text>
                        <View style={styles.authorBadgeRow}>
                          <View style={styles.authorRoleBadge}>
                            <Text style={styles.authorRoleBadgeText}>Zanaatkar</Text>
                          </View>
                          {post.ustaCity && (
                            <View style={styles.authorCityBadge}>
                              <Ionicons name="location-outline" size={10} color="#64748B" />
                              <Text style={styles.authorCityBadgeText}>{post.ustaCity}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <Text style={styles.metaTime}>3 saat önce</Text>
                    </View>

                    {/* HD Wired Electrical Panel Image */}
                    {post.imageUrl ? (
                      <Image source={{ uri: post.imageUrl }} style={styles.forumImage} />
                    ) : (
                      <Image source={{ uri: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80' }} style={styles.forumImage} />
                    )}

                    {/* Title & Description & Tags */}
                    <Text style={styles.forumTitle}>{post.title || '3-Phase Smart Panel Issue'}</Text>
                    <Text style={styles.forumDesc} numberOfLines={3}>{post.description || 'Siemens 3-Phase Smart Panel üzerinde yaşanan voltaj dalgalanması sorunu...'}</Text>
                    
                    {/* structured capsules instead of raw text */}
                    <View style={styles.tagCapsulesRow}>
                      <View style={[styles.tagCapsule, { backgroundColor: colors.primary + '08', borderColor: colors.primary + '18' }]}>
                        <Ionicons name="construct-outline" size={10} color={colors.primary} />
                        <Text style={[styles.tagCapsuleText, { color: colors.primary }]}>Teknik Soru</Text>
                      </View>
                      <View style={[styles.tagCapsule, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD' }]}>
                        <Ionicons name="flash-outline" size={10} color="#0284C7" />
                        <Text style={[styles.tagCapsuleText, { color: '#0284C7' }]}>Elektrik</Text>
                      </View>
                    </View>

                    {/* Footer Row */}
                    <View style={styles.forumFooter}>
                      <View style={styles.footerPillsRow}>
                        <View style={[styles.footerPill, { backgroundColor: colors.primary + '10' }]}>
                          <Ionicons name="chatbubble-outline" size={12} color={colors.primary} style={{ marginRight: 4 }} />
                          <Text style={[styles.footerPillText, { color: colors.primary }]}>
                            {post.comments?.length ? `${post.comments.length} Cevap` : '0 Yorum'}
                          </Text>
                        </View>
                        <View style={styles.footerShareBtn}>
                          <Ionicons name="share-social-outline" size={12} color="#64748B" />
                        </View>
                      </View>
                      
                      <View style={styles.mockVoteContainer}>
                        <TouchableOpacity style={styles.voteBtn}>
                          <Ionicons name="caret-up" size={14} color="#64748B" />
                        </TouchableOpacity>
                        <Text style={styles.mockVoteText}>+189</Text>
                        <TouchableOpacity style={styles.voteBtn}>
                          <Ionicons name="caret-down" size={14} color="#94A3B8" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
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
                    <View key={item.id} style={styles.masonryItem}>
                      <View style={styles.imageWrapper}>
                        <Image source={{ uri: item.image }} style={styles.masonryImage} />
                        {item.images && item.images.length > 1 && (
                          <View style={styles.multiPhotoBadge}>
                            <Ionicons name="layers" size={10} color="#FFF" />
                            <Text style={styles.multiPhotoText}>+{item.images.length - 1}</Text>
                          </View>
                        )}
                        <LinearGradient
                          colors={['transparent', 'rgba(15, 23, 42, 0.85)']}
                          style={styles.masonryImageOverlay}
                        >
                          <View style={styles.masonryImageOverlayContent}>
                            <Text style={styles.masonryTitle} numberOfLines={1}>{item.title}</Text>
                            <View style={styles.masonryUstaRow}>
                              <Ionicons name="person-circle-outline" size={11} color="rgba(255,255,255,0.85)" />
                              <Text style={styles.masonryUstaText}>{item.ustaName ? item.ustaName.split(' ')[0] : 'Usta'}</Text>
                            </View>
                          </View>
                        </LinearGradient>
                      </View>
                      
                      {item.ustaId === user?.id && (
                        <TouchableOpacity
                          style={styles.masonryDeleteBtn}
                          onPress={() => handleDeleteShowcaseItem(item.id)}
                        >
                          <Ionicons name="trash" size={12} color="#EF4444" />
                        </TouchableOpacity>
                      )}
                    </View>
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
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  forumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarWrapper: {
    position: 'relative',
  },
  forumAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  verifiedBadgeMini: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFF',
  },
  forumAuthor: {
    color: '#0F172A',
    fontSize: 13.5,
    fontFamily: fonts.bold,
  },
  authorBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 1,
  },
  authorRoleBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  authorRoleBadgeText: {
    fontSize: 8.5,
    fontFamily: fonts.bold,
    color: '#475569',
  },
  authorCityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  authorCityBadgeText: {
    fontSize: 9,
    fontFamily: fonts.medium,
    color: '#64748B',
  },
  metaTime: {
    color: '#94A3B8',
    fontSize: 10.5,
    fontFamily: fonts.medium,
  },
  forumTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontFamily: fonts.bold,
    marginBottom: 4,
  },
  forumDesc: {
    color: '#475569',
    fontSize: 12,
    fontFamily: fonts.regular,
    lineHeight: 17,
    marginBottom: 8,
  },
  tagCapsulesRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  tagCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 3,
  },
  tagCapsuleText: {
    fontSize: 9.5,
    fontFamily: fonts.bold,
  },
  forumImage: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    resizeMode: 'cover',
    marginBottom: 10,
    backgroundColor: '#0F172A',
  },
  forumFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
    marginTop: 4,
  },
  footerPillsRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  footerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  footerPillText: {
    fontSize: 10,
    fontFamily: fonts.bold,
  },
  footerShareBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mockVoteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 4,
    height: 26,
    gap: 2,
  },
  voteBtn: {
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mockVoteText: {
    color: '#334155',
    fontSize: 10.5,
    fontFamily: fonts.bold,
    paddingHorizontal: 2,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  imageWrapper: {
    width: '100%',
    height: 150,
    position: 'relative',
    backgroundColor: '#0F172A',
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
});
