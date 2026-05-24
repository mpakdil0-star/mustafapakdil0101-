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
import { useAppSelector } from '../../hooks/redux';
import { useAppColors } from '../../hooks/useAppColors';
import { colors as staticColors } from '../../constants/colors';
import { fonts } from '../../constants/typography';
import api from '../../services/api';

const { width } = Dimensions.get('window');

export default function ChannelsScreen() {
  const colors = useAppColors();
  const { user } = useAppSelector((state) => state.auth);
  
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
  const [selectedCity, setSelectedCity] = useState(user?.city || 'İstanbul');
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
        allowsEditing: source === 'camera', // Only allow cropping in camera mode
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
      ustaId: user?.id || 'mock-usta-id',
      ustaName: user?.fullName || 'Usta',
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
      image: newShowcaseImages[0], // primary fallback image
      images: newShowcaseImages,    // all images
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
    (job) => selectedCity === 'Tüm Türkiye' || job.city === selectedCity
  );

  return (
    <View style={[styles.container, { backgroundColor: '#F8FAFC' }]}>
      {/* Header (Premium Slate Design matching mockup) */}
      <View style={styles.header}>
        <View style={styles.headerContentRow}>
          <Text style={styles.headerTitleText}>Usta Kanalları</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerActionBtn} activeOpacity={0.7}>
              <Ionicons name="search" size={20} color="#94A3B8" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerAvatarContainer} activeOpacity={0.7}>
              <Image 
                source={{ uri: user?.profileImageUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80' }} 
                style={styles.headerAvatarImage} 
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Tabs (Horizontal Card Segmented Selector matching mockup) */}
      <View style={{ height: 95, marginBottom: 4 }}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScrollView}
        >
          {[
            { id: 'forum', label: 'Teknik Destek', icon: 'construct-outline', activeColor: '#3B82F6', gradientColors: ['#3B82F6', '#0F4C81'] },
            { id: 'jobs', label: 'İş Paslama', icon: 'briefcase-outline', activeColor: '#06B6D4', gradientColors: ['#06B6D4', '#0891B2'] },
            { id: 'gallery', label: 'Hünerlerim', icon: 'bulb-outline', activeColor: '#10B981', gradientColors: ['#10B981', '#047857'] },
            { id: 'materials', label: 'Malzeme', icon: 'document-text-outline', activeColor: '#059669', gradientColors: ['#059669', '#064E3B'] },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            const borderColor = isActive ? tab.activeColor : tab.activeColor + '40'; // ~25% opacity colored border
            const iconColor = isActive ? '#FFF' : tab.activeColor + 'C0'; // ~75% opacity themed color
            const textColor = isActive ? '#FFF' : tab.activeColor + 'A0'; // ~62% opacity themed color
            return (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.tabCardBtn,
                  { 
                    borderColor: borderColor,
                    shadowColor: isActive ? tab.activeColor : 'transparent',
                  },
                  isActive && styles.tabCardBtnActive
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
                    style={[StyleSheet.absoluteFillObject, { borderRadius: 14 }]}
                  />
                )}
                <Ionicons 
                  name={tab.icon as any} 
                  size={20} 
                  color={iconColor} 
                  style={{ marginBottom: 6 }} 
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
              <TouchableOpacity
                style={[styles.actionBtn, { overflow: 'hidden', padding: 0 }]}
                onPress={() => setIsNewPostModalVisible(true)}
              >
                <LinearGradient
                  colors={['#3B82F6', '#0F4C81']}
                  style={styles.actionBtnGradient}
                >
                  <Ionicons name="add-circle" size={18} color="#FFF" />
                  <Text style={styles.actionBtnText}>Yeni Teknik Soru Sor</Text>
                </LinearGradient>
              </TouchableOpacity>

              {forumPosts.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="chatbubbles-outline" size={48} color="#64748B" />
                  <Text style={styles.emptyText}>Henüz teknik soru sorulmamış.</Text>
                </View>
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
                      <Image 
                        source={{ uri: post.ustaAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80' }} 
                        style={styles.forumAvatar} 
                      />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={styles.forumAuthor}>{post.ustaName}</Text>
                          <Ionicons name="checkmark-circle" size={13} color="#10B981" style={{ marginLeft: 4 }} />
                        </View>
                        <Text style={styles.forumMeta}>Kıdemli Usta</Text>
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
                    <Text style={styles.forumDesc}>{post.description || 'Asking for advice: Troubleshooting fluctuating voltage on a Siemens 3-Phase Smart Panel. The main breaker trips sporadically under load...'}</Text>
                    
                    <Text style={styles.forumTags}>#SmartGrid #VoltageFluctuation #Siemens</Text>

                    {/* Footer Row matching mockup */}
                    <View style={styles.forumFooter}>
                      <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.footerPillsRow}
                      >
                        <View style={[styles.footerPill, { backgroundColor: '#0F4C81' }]}>
                          <Ionicons name="chatbubble" size={12} color="#FFF" style={{ marginRight: 4 }} />
                          <Text style={styles.footerPillText}>{post.comments?.length ? `${post.comments.length + 20} Yorum` : '24 Yorum'}</Text>
                        </View>
                        <View style={[styles.footerPill, { backgroundColor: '#0F4C81' }]}>
                          <Ionicons name="chatbubbles" size={12} color="#FFF" style={{ marginRight: 4 }} />
                          <Text style={styles.footerPillText}>12 Yanıt</Text>
                        </View>
                        <View style={[styles.footerPill, { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)' }]}>
                          <Ionicons name="share-social-outline" size={12} color="#94A3B8" style={{ marginRight: 4 }} />
                          <Text style={[styles.footerPillText, { color: '#94A3B8' }]}>Paylaş</Text>
                        </View>
                        <View style={[styles.footerPill, { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)' }]}>
                          <Ionicons name="bookmark-outline" size={12} color="#94A3B8" style={{ marginRight: 4 }} />
                          <Text style={[styles.footerPillText, { color: '#94A3B8' }]}>Kaydet</Text>
                        </View>
                      </ScrollView>
                      
                      <View style={styles.mockVoteContainer}>
                        <Ionicons name="caret-up" size={13} color="#FFF" />
                        <Text style={styles.mockVoteText}>+189</Text>
                        <Ionicons name="caret-down" size={13} color="rgba(255,255,255,0.35)" />
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
                  style={[styles.cityFilterBtn, { borderColor: 'rgba(6, 182, 212, 0.25)' }]}
                  onPress={() => setIsCityFilterModalVisible(true)}
                >
                  <Ionicons name="location-outline" size={14} color="#22D3EE" />
                  <Text style={[styles.cityFilterText, { color: '#22D3EE' }]}>{selectedCity}</Text>
                  <Ionicons name="chevron-down" size={12} color="#22D3EE" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.miniAddBtn, { overflow: 'hidden', padding: 0 }]}
                  onPress={() => setIsNewJobModalVisible(true)}
                >
                  <LinearGradient
                    colors={['#3B82F6', '#0F4C81']}
                    style={styles.miniAddBtnGradient}
                  >
                    <Ionicons name="add" size={16} color="#FFF" />
                    <Text style={styles.miniAddBtnText}>İş Pasla</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {filteredJobOffers.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="briefcase-outline" size={48} color="#64748B" />
                  <Text style={styles.emptyText}>{selectedCity} için paslanmış aktif iş yok.</Text>
                </View>
              ) : (
                filteredJobOffers.map((offer) => (
                  <View key={offer.id} style={styles.jobCard}>
                    <View style={styles.jobCardHeader}>
                      <View style={styles.cityBadge}>
                        <Text style={styles.cityBadgeText}>{offer.city}</Text>
                      </View>
                      <View style={styles.jobCardUrgencyBadge}>
                        <Ionicons name="flash" size={9} color="#F59E0B" style={{ marginRight: 2 }} />
                        <Text style={styles.jobCardUrgencyText}>Aktif Fırsat</Text>
                      </View>
                    </View>

                    <Text style={styles.jobCardTitle}>{offer.title}</Text>
                    <Text style={styles.jobCardDesc}>{offer.description}</Text>

                    <View style={styles.jobCardFooter}>
                      <View style={styles.jobPublisherRow}>
                        <LinearGradient
                          colors={['#10B981', '#047857']}
                          style={styles.jobPublisherAvatar}
                        >
                          <Text style={styles.jobPublisherAvatarText}>
                            {offer.ustaName ? offer.ustaName.charAt(0).toUpperCase() : 'U'}
                          </Text>
                        </LinearGradient>
                        <View>
                          <Text style={styles.jobCardAuthorLabel}>Paslayan Usta</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={styles.jobCardAuthor}>{offer.ustaName}</Text>
                            <Ionicons name="checkmark-circle" size={11} color="#10B981" style={{ marginLeft: 3 }} />
                          </View>
                        </View>
                      </View>

                      {offer.ustaId !== user?.id && (
                        <TouchableOpacity
                          style={styles.jobContactBtnContainer}
                          onPress={() => {
                            Alert.alert('İletişime Geç', `${offer.ustaName} ile görüşme başlatılsın mı?`);
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
                  </View>
                ))
              )}
            </View>
          )}

          {/* ==================== HÜNERLERİM / PHOTO SHOWCASE ==================== */}
          {activeTab === 'gallery' && (
            <View style={{ width: '100%' }}>
              <TouchableOpacity
                style={[styles.actionBtn, { overflow: 'hidden', padding: 0 }]}
                onPress={() => setIsNewShowcaseModalVisible(true)}
              >
                <LinearGradient
                  colors={['#3B82F6', '#0F4C81']}
                  style={styles.actionBtnGradient}
                >
                  <Ionicons name="camera" size={18} color="#FFF" />
                  <Text style={styles.actionBtnText}>Yeni Hüner Fotoğrafı Yükle</Text>
                </LinearGradient>
              </TouchableOpacity>

              {showcaseItems.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="images-outline" size={48} color="#64748B" />
                  <Text style={styles.emptyText}>Henüz hüner görseli eklenmemiş.</Text>
                </View>
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
                          colors={['transparent', 'rgba(15, 23, 42, 0.7)']}
                          style={styles.masonryImageOverlay}
                        />
                      </View>
                      <View style={styles.masonryContent}>
                        <Text style={styles.masonryTitle} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.masonryUsta}>@{item.ustaName.split(' ')[0]}</Text>
                      </View>
                      
                      {item.ustaId === user?.id && (
                        <TouchableOpacity
                          style={styles.masonryDeleteBtn}
                          onPress={() => handleDeleteShowcaseItem(item.id)}
                        >
                          <Ionicons name="trash" size={11} color="#EF4444" />
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
            <TextInput
              style={styles.input}
              placeholder="Örn: 24W Akıllı Led Sürücü arızası"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={newPostTitle}
              onChangeText={setNewPostTitle}
            />

            <Text style={styles.label}>Sorunun Açıklaması *</Text>
            <TextInput
              style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
              placeholder="Sorununuzu, hata kodunu veya detayları yazın..."
              placeholderTextColor="rgba(255,255,255,0.3)"
              multiline
              numberOfLines={4}
              value={newPostDesc}
              onChangeText={setNewPostDesc}
            />

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

                <Text style={[styles.sectionTitle, { color: '#E2E8F0', marginVertical: 12 }]}>Topluluk Cevapları ({selectedPost.comments?.length || 0})</Text>

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
                placeholderTextColor="rgba(255,255,255,0.3)"
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
            <TextInput
              style={styles.input}
              placeholder="Örn: Kadıköy'de 3 Günlük Yardımcı Usta Arayışı"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={newJobTitle}
              onChangeText={setNewJobTitle}
            />

            <Text style={styles.label}>İşin ve Şartların Detayı *</Text>
            <TextInput
              style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
              placeholder="Aradığınız şartları, işin niteliğini ve ödeme bilgisini yazın..."
              placeholderTextColor="rgba(255,255,255,0.3)"
              multiline
              numberOfLines={4}
              value={newJobDesc}
              onChangeText={setNewJobDesc}
            />

            <View style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.2)', borderRadius: 12, padding: 12, marginVertical: 12 }}>
              <Text style={{ color: '#F59E0B', fontSize: 12.5, fontFamily: fonts.bold }}>Önemli Not</Text>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontFamily: fonts.medium, marginTop: 2 }}>
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
            <TextInput
              style={styles.input}
              placeholder="Örn: 24'lü Dağıtım Panosu Kablolama"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={newShowcaseTitle}
              onChangeText={setNewShowcaseTitle}
            />

            <Text style={styles.label}>Açıklama (Opsiyonel)</Text>
            <TextInput
              style={styles.input}
              placeholder="Kullandığınız marka, şantiye bilgisi vb."
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={newShowcaseDesc}
              onChangeText={setNewShowcaseDesc}
            />

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
                    style={{ flex: 1, height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: colors.primary, borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                    onPress={() => handlePickShowcaseImage('gallery')}
                  >
                    <Ionicons name="images-outline" size={20} color={colors.primary} />
                    <Text style={{ color: colors.primary, fontFamily: fonts.bold, fontSize: 12.5 }}>Galeriden Seç</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={{ flex: 1, height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: colors.primary, borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
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
  // Premium mockup header
  header: {
    width: '100%',
    paddingTop: Platform.OS === 'ios' ? 60 : 30,
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: 'transparent',
  },
  headerContentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  headerTitleText: {
    color: '#0F4C81', // Sapphire deep blue for header title on light bg
    fontSize: 26,
    fontFamily: fonts.bold,
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
  // Scrollable tab cards
  tabScrollView: {
    paddingHorizontal: 16,
    gap: 10,
    alignItems: 'center',
    height: '100%',
  },
  tabCardBtn: {
    width: 95,
    height: 75,
    borderRadius: 16,
    backgroundColor: '#FFFFFF', // Clean white card background
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: 'rgba(0,0,0,0.02)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabCardBtnActive: {
    backgroundColor: 'transparent',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  tabCardLabel: {
    fontFamily: fonts.bold,
    fontSize: 10.5,
    textAlign: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
    fontFamily: fonts.medium,
  },
  actionBtn: {
    height: 44,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
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
    fontSize: 13.5,
  },
  // Birebir aynısı Forum Card
  forumCard: {
    backgroundColor: '#FFFFFF', // Clean white background matching jobs tab
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(59, 130, 246, 0.2)', // Subtle sapphire blue border
    shadowColor: 'rgba(15, 76, 129, 0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  forumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  forumAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  forumAuthor: {
    color: '#0F172A', // Slate 900 for light bg readability
    fontSize: 15,
    fontFamily: fonts.bold,
  },
  forumMeta: {
    color: '#64748B',
    fontSize: 12,
    fontFamily: fonts.medium,
    marginTop: 1,
  },
  metaTime: {
    color: '#94A3B8',
    fontSize: 11.5,
    fontFamily: fonts.medium,
  },
  forumTitle: {
    color: '#0F172A', // Slate 900 for light bg readability
    fontSize: 16.5,
    fontFamily: fonts.bold,
    marginBottom: 6,
  },
  forumDesc: {
    color: '#334155', // Slate 700 for light bg readability
    fontSize: 13,
    fontFamily: fonts.regular,
    lineHeight: 19,
    marginBottom: 10,
  },
  forumTags: {
    color: '#38BDF8',
    fontSize: 12.5,
    fontFamily: fonts.bold,
    marginBottom: 12,
  },
  forumImage: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    resizeMode: 'cover',
    marginBottom: 12,
    backgroundColor: '#0F172A',
  },
  forumFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
    paddingTop: 12,
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
    paddingVertical: 5,
    borderRadius: 12,
  },
  footerPillText: {
    color: '#FFF',
    fontSize: 9.5,
    fontFamily: fonts.bold,
  },
  mockVoteContainer: {
    width: 44,
    height: 64,
    borderRadius: 22,
    backgroundColor: '#3B82F6',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
    marginLeft: 6,
  },
  mockVoteText: {
    color: '#FFF',
    fontSize: 8.5,
    fontFamily: fonts.bold,
    marginTop: -2,
  },
  // Jobs Styles
  jobsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cityFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.05)',
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 18,
    gap: 6,
  },
  cityFilterText: {
    fontFamily: fonts.bold,
    fontSize: 12.5,
  },
  miniAddBtn: {
    height: 36,
    borderRadius: 18,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  miniAddBtnGradient: {
    height: '100%',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniAddBtnText: {
    color: '#FFF',
    fontFamily: fonts.bold,
    fontSize: 12,
  },
  jobCard: {
    backgroundColor: '#FFFFFF', // Clean white background matching jobs tab
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(6, 182, 212, 0.2)', // Subtle cyan border
    shadowColor: 'rgba(6, 182, 212, 0.05)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  jobCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cityBadge: {
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    borderWidth: 0.5,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cityBadgeText: {
    fontSize: 10,
    fontFamily: fonts.bold,
    textTransform: 'uppercase',
    color: '#22D3EE',
  },
  jobCardUrgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  jobCardUrgencyText: {
    color: '#F59E0B',
    fontSize: 10.5,
    fontFamily: fonts.bold,
  },
  jobCardTitle: {
    color: '#0F172A', // Slate 900
    fontSize: 14.5,
    fontFamily: fonts.bold,
    marginBottom: 6,
  },
  jobCardDesc: {
    color: '#334155', // Slate 700
    fontSize: 12.5,
    fontFamily: fonts.regular,
    lineHeight: 18,
    marginBottom: 14,
  },
  jobCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
    paddingTop: 12,
  },
  jobPublisherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  jobPublisherAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  jobPublisherAvatarText: {
    color: '#FFF',
    fontSize: 12,
    fontFamily: fonts.bold,
  },
  jobCardAuthorLabel: {
    color: '#64748B',
    fontSize: 9.5,
    fontFamily: fonts.medium,
  },
  jobCardAuthor: {
    color: '#334155', // Slate 700
    fontSize: 12,
    fontFamily: fonts.bold,
  },
  jobContactBtnContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  jobContactGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 32,
    gap: 6,
  },
  jobContactText: {
    color: '#FFF',
    fontFamily: fonts.bold,
    fontSize: 11.5,
  },
  // Masonry Showcase Gallery Styles
  masonryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  masonryItem: {
    width: (width - 44) / 2,
    backgroundColor: '#FFFFFF', // Clean white background
    borderRadius: 16,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0', // Subtle light grey border
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  imageWrapper: {
    width: '100%',
    height: 160,
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
  },
  multiPhotoBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  multiPhotoText: {
    color: '#FFF',
    fontSize: 9.5,
    fontFamily: fonts.bold,
  },
  masonryContent: {
    padding: 10,
  },
  masonryTitle: {
    color: '#0F172A', // Slate 900
    fontSize: 12,
    fontFamily: fonts.bold,
  },
  masonryUsta: {
    color: '#475569', // Slate 600
    fontSize: 10,
    fontFamily: fonts.medium,
    marginTop: 2,
  },
  masonryDeleteBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  // Modals Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)', // Slightly lighter overlay
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF', // Clean white modal content background
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 14,
    marginBottom: 16,
  },
  modalTitle: {
    color: '#0F172A', // Slate 900
    fontSize: 16.5,
    fontFamily: fonts.bold,
  },
  label: {
    color: '#475569', // Slate 600
    fontSize: 12.5,
    fontFamily: fonts.bold,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#F8FAFC', // Light background for inputs
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    color: '#0F172A',
    paddingHorizontal: 12,
    height: 44,
    fontFamily: fonts.medium,
    fontSize: 13.5,
    marginBottom: 10,
  },
  imageSelector: {
    height: 80,
    borderRadius: 12,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
  },
  previewContainer: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: 10,
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
    padding: 4,
    borderRadius: 10,
  },
  submitBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  submitBtnText: {
    color: '#FFF',
    fontFamily: fonts.bold,
    fontSize: 14.5,
  },
  postBody: {
    color: '#334155', // Slate 700
    fontSize: 13.5,
    fontFamily: fonts.regular,
    lineHeight: 20,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: fonts.bold,
  },
  noCommentsText: {
    color: '#64748B',
    fontSize: 12,
    fontFamily: fonts.medium,
    textAlign: 'center',
    marginVertical: 24,
    paddingHorizontal: 20,
  },
  commentBox: {
    backgroundColor: '#F8FAFC', // Light comment background
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  commentAuthor: {
    color: '#0F172A', // Slate 900
    fontSize: 12,
    fontFamily: fonts.bold,
    marginBottom: 2,
  },
  commentText: {
    color: '#334155', // Slate 700
    fontSize: 12.5,
    fontFamily: fonts.regular,
  },
  commentTime: {
    color: '#64748B',
    fontSize: 9,
    fontFamily: fonts.medium,
    marginTop: 6,
    textAlign: 'right',
  },
  commentInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    color: '#0F172A',
    paddingHorizontal: 12,
    height: 40,
    fontFamily: fonts.medium,
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sendCommentBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // City Filter Modal Styles
  centerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cityModalContent: {
    backgroundColor: '#FFFFFF', // Clean white background for city list
    width: '80%',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cityModalTitle: {
    color: '#0F172A', // Slate 900
    fontSize: 15,
    fontFamily: fonts.bold,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
    marginBottom: 10,
  },
  cityListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginVertical: 2,
  },
  cityListItemText: {
    color: '#475569', // Slate 600
    fontSize: 13,
    fontFamily: fonts.medium,
  },
});
