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
  const [newShowcaseImage, setNewShowcaseImage] = useState<string | null>(null);

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

  // Handle Pick Image
  const handlePickImage = async (type: 'forum' | 'showcase') => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('İzin Gerekli', 'Fotoğraf seçebilmek için galeri izni vermelisiniz.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      if (type === 'forum') setNewPostImage(result.assets[0].uri);
      if (type === 'showcase') setNewShowcaseImage(result.assets[0].uri);
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
    if (!newShowcaseTitle.trim() || !newShowcaseImage) {
      Alert.alert('Eksik Bilgi', 'Lütfen başlık doldurun ve bir görsel seçin.');
      return;
    }

    const newItem = {
      title: newShowcaseTitle,
      description: newShowcaseDesc,
      image: newShowcaseImage,
      ustaId: user?.id || 'mock-usta-id',
      ustaName: user?.fullName || 'Usta',
      ustaCity: user?.city || 'İstanbul',
    };

    try {
      const response = await api.post('/showcase', newItem);
      if (response.data?.success) {
        setShowcaseItems(response.data.data);
        setIsNewShowcaseModalVisible(false);
        setNewShowcaseTitle('');
        setNewShowcaseDesc('');
        setNewShowcaseImage(null);
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

  // Filter Job Offers by City
  const filteredJobOffers = jobOffers.filter(
    (job) => selectedCity === 'Tüm Türkiye' || job.city === selectedCity
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundDark }]}>
      {/* Header */}
      <View style={styles.header}>
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={styles.headerBackground}
        >
          <Text style={styles.headerTitle}>Usta Kanalları</Text>
          <Text style={styles.headerSubtitle}>Mesleki yardımlaşma, iş paylaşımı ve zanaat vitrini</Text>
        </LinearGradient>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {[
          { id: 'forum', label: 'Teknik Destek', icon: 'chatbubble-ellipses-outline' },
          { id: 'jobs', label: 'İş Paslama', icon: 'briefcase-outline' },
          { id: 'gallery', label: 'Hünerlerim', icon: 'images-outline' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tabBtn,
                isActive && { borderBottomColor: colors.primary, borderBottomWidth: 3 }
              ]}
              onPress={() => setActiveTab(tab.id as any)}
            >
              <Ionicons name={tab.icon as any} size={18} color={isActive ? colors.primary : '#94A3B8'} />
              <Text style={[styles.tabLabel, { color: isActive ? colors.primary : '#94A3B8' }]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
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
                style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                onPress={() => setIsNewPostModalVisible(true)}
              >
                <Ionicons name="add-circle" size={20} color="#FFF" />
                <Text style={styles.actionBtnText}>Yeni Teknik Soru Sor</Text>
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
                    <View style={styles.forumHeader}>
                      <View style={styles.avatarPlaceholder}>
                        <Ionicons name="person" size={16} color="#FFF" />
                      </View>
                      <View>
                        <Text style={styles.forumAuthor}>{post.ustaName}</Text>
                        <Text style={styles.forumMeta}>{post.ustaCity || 'İstanbul'} • 1 dk önce</Text>
                      </View>
                    </View>

                    <Text style={styles.forumTitle}>{post.title}</Text>
                    <Text style={styles.forumDesc}>{post.description}</Text>

                    {post.imageUrl && (
                      <Image source={{ uri: post.imageUrl }} style={styles.forumImage} />
                    )}

                    <View style={styles.forumFooter}>
                      <View style={styles.commentCountBox}>
                        <Ionicons name="chatbubble-outline" size={16} color="#94A3B8" />
                        <Text style={styles.commentCountText}>{post.comments?.length || 0} Yorum</Text>
                      </View>
                      <Text style={{ color: colors.primary, fontFamily: fonts.bold, fontSize: 11.5 }}>Yardım Et / Yorum Yaz ➔</Text>
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
                  style={[styles.cityFilterBtn, { borderColor: colors.primary + '30' }]}
                  onPress={() => setIsCityFilterModalVisible(true)}
                >
                  <Ionicons name="location-outline" size={16} color={colors.primary} />
                  <Text style={[styles.cityFilterText, { color: colors.primary }]}>{selectedCity}</Text>
                  <Ionicons name="chevron-down" size={14} color={colors.primary} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.miniAddBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setIsNewJobModalVisible(true)}
                >
                  <Ionicons name="add" size={18} color="#FFF" />
                  <Text style={styles.miniAddBtnText}>İş Pasla</Text>
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
                      <View style={[styles.cityBadge, { backgroundColor: colors.primary + '15' }]}>
                        <Text style={[styles.cityBadgeText, { color: colors.primary }]}>{offer.city}</Text>
                      </View>
                      <Text style={styles.jobCardDate}>Bugün</Text>
                    </View>

                    <Text style={styles.jobCardTitle}>{offer.title}</Text>
                    <Text style={styles.jobCardDesc}>{offer.description}</Text>

                    <View style={styles.jobCardFooter}>
                      <View>
                        <Text style={styles.jobCardAuthorLabel}>Paslayan Usta</Text>
                        <Text style={styles.jobCardAuthor}>{offer.ustaName}</Text>
                      </View>

                      {offer.ustaId !== user?.id && (
                        <TouchableOpacity
                          style={[styles.jobContactBtn, { backgroundColor: '#10B981' }]}
                          onPress={() => {
                            Alert.alert('İletişime Geç', `${offer.ustaName} ile görüşme başlatılsın mı?`);
                          }}
                        >
                          <Ionicons name="chatbubbles" size={14} color="#FFF" />
                          <Text style={styles.jobContactText}>İşi Al / Konuş</Text>
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
                style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                onPress={() => setIsNewShowcaseModalVisible(true)}
              >
                <Ionicons name="camera" size={20} color="#FFF" />
                <Text style={styles.actionBtnText}>Yeni Hüner Fotoğrafı Yükle</Text>
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
                      <Image source={{ uri: item.image }} style={styles.masonryImage} />
                      <View style={styles.masonryContent}>
                        <Text style={styles.masonryTitle}>{item.title}</Text>
                        <Text style={styles.masonryUsta}>@{item.ustaName.split(' ')[0]}</Text>
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
                <Ionicons name="close" size={24} color="#FFF" />
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
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>{selectedPost?.title}</Text>
              <TouchableOpacity onPress={() => setIsCommentsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#FFF" />
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
                <Ionicons name="close" size={24} color="#FFF" />
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
                <Ionicons name="close" size={24} color="#FFF" />
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

            <Text style={styles.label}>Çalışma Görseli *</Text>
            {newShowcaseImage ? (
              <View style={styles.previewContainer}>
                <Image source={{ uri: newShowcaseImage }} style={styles.previewImage} />
                <TouchableOpacity style={styles.removeImageBtn} onPress={() => setNewShowcaseImage(null)}>
                  <Ionicons name="close" size={16} color="#FFF" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.imageSelector} onPress={() => handlePickImage('showcase')}>
                <Ionicons name="camera-outline" size={24} color={colors.primary} />
                <Text style={{ color: colors.primary, fontFamily: fonts.bold, fontSize: 13, marginTop: 4 }}>Galeri veya Kameradan Seç</Text>
              </TouchableOpacity>
            )}

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
  header: {
    width: '100%',
    height: Platform.OS === 'ios' ? 120 : 100,
    overflow: 'hidden',
  },
  headerBackground: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 22,
    fontFamily: fonts.bold,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontFamily: fonts.medium,
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    height: 48,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    height: '100%',
  },
  tabLabel: {
    fontFamily: fonts.bold,
    fontSize: 12,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 12,
    marginBottom: 16,
  },
  actionBtnText: {
    color: '#FFF',
    fontFamily: fonts.bold,
    fontSize: 13.5,
  },
  forumCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  forumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6D28D9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  forumAuthor: {
    color: '#FFF',
    fontSize: 13.5,
    fontFamily: fonts.bold,
  },
  forumMeta: {
    color: '#94A3B8',
    fontSize: 10.5,
    fontFamily: fonts.medium,
  },
  forumTitle: {
    color: '#FFF',
    fontSize: 15,
    fontFamily: fonts.bold,
    marginBottom: 6,
  },
  forumDesc: {
    color: '#94A3B8',
    fontSize: 12.5,
    fontFamily: fonts.regular,
    lineHeight: 18,
    marginBottom: 12,
  },
  forumImage: {
    width: '100%',
    height: 160,
    borderRadius: 12,
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
  commentCountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  commentCountText: {
    color: '#94A3B8',
    fontSize: 12,
    fontFamily: fonts.medium,
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
    backgroundColor: 'rgba(255,255,255,0.03)',
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 18,
    gap: 4,
  },
  miniAddBtnText: {
    color: '#FFF',
    fontFamily: fonts.bold,
    fontSize: 12,
  },
  jobCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  jobCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cityBadgeText: {
    fontSize: 10.5,
    fontFamily: fonts.bold,
    textTransform: 'uppercase',
  },
  jobCardDate: {
    color: '#64748B',
    fontSize: 10.5,
    fontFamily: fonts.medium,
  },
  jobCardTitle: {
    color: '#FFF',
    fontSize: 14.5,
    fontFamily: fonts.bold,
    marginBottom: 6,
  },
  jobCardDesc: {
    color: '#94A3B8',
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
  jobCardAuthorLabel: {
    color: '#64748B',
    fontSize: 9.5,
    fontFamily: fonts.medium,
  },
  jobCardAuthor: {
    color: '#E2E8F0',
    fontSize: 12,
    fontFamily: fonts.bold,
  },
  jobContactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 8,
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
    backgroundColor: '#1E293B',
    borderRadius: 16,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    position: 'relative',
  },
  masonryImage: {
    width: '100%',
    height: 160,
    resizeMode: 'cover',
    backgroundColor: '#0F172A',
  },
  masonryContent: {
    padding: 10,
  },
  masonryTitle: {
    color: '#FFF',
    fontSize: 12,
    fontFamily: fonts.bold,
  },
  masonryUsta: {
    color: '#94A3B8',
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
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    paddingBottom: 14,
    marginBottom: 16,
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 16.5,
    fontFamily: fonts.bold,
  },
  label: {
    color: '#E2E8F0',
    fontSize: 12.5,
    fontFamily: fonts.bold,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    color: '#FFF',
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
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
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
    color: '#E2E8F0',
    fontSize: 13.5,
    fontFamily: fonts.regular,
    lineHeight: 20,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
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
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  commentAuthor: {
    color: '#FFF',
    fontSize: 12,
    fontFamily: fonts.bold,
    marginBottom: 2,
  },
  commentText: {
    color: '#94A3B8',
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
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 12,
  },
  commentInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    color: '#FFF',
    paddingHorizontal: 12,
    height: 40,
    fontFamily: fonts.medium,
    fontSize: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
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
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cityModalContent: {
    backgroundColor: '#1E293B',
    width: '80%',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cityModalTitle: {
    color: '#FFF',
    fontSize: 15,
    fontFamily: fonts.bold,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
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
    color: '#E2E8F0',
    fontSize: 13,
    fontFamily: fonts.medium,
  },
});
