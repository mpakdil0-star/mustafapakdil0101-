import { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
  Dimensions,
  Linking,
  TextInput,
  Animated,
  Platform,
} from 'react-native';
import { PremiumAlert } from '../../../components/common/PremiumAlert';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { useAppDispatch, useAppSelector } from '../../../hooks/redux';
import { fetchJobById, clearCurrentJob } from '../../../store/slices/jobSlice';
import { fetchJobBids, acceptBid, clearJobBids } from '../../../store/slices/bidSlice';
import { messageService } from '../../../services/messageService';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { VerificationBadge } from '../../../components/common/VerificationBadge';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors } from '../../../constants/colors';
import { spacing } from '../../../constants/spacing';
import { fonts } from '../../../constants/typography';
import { useAppColors } from '../../../hooks/useAppColors';
import { API_BASE_URL, getFileUrl } from '../../../constants/api';
import { jobService } from '../../../services/jobService';
import { PremiumHeader } from '../../../components/common/PremiumHeader';
import { StatusStepper } from '../../../components/common/StatusStepper';
import { AuthGuardModal } from '../../../components/common/AuthGuardModal';
import { socketService } from '../../../services/socketService';

export default function JobDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const { currentJob, isDetailLoading, error, jobs, myJobs } = useAppSelector((state) => state.jobs);
  const { jobBids, myBids } = useAppSelector((state) => state.bids);
  const { user, guestRole } = useAppSelector((state) => state.auth);
  const colors = useAppColors();

  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isReviewModalVisible, setIsReviewModalVisible] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);

  // Bid Acceptance Modal States
  const [showBidAcceptModal, setShowBidAcceptModal] = useState(false);
  const [acceptingBid, setAcceptingBid] = useState<{ id: string; electricianId: string; electricianName: string; amount: number; phone?: string } | null>(null);
  const [isAcceptingBid, setIsAcceptingBid] = useState(false);
  const [isBidAccepted, setIsBidAccepted] = useState(false);

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

  const urgentPulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(urgentPulseAnim, { toValue: 0.6, duration: 800, useNativeDriver: true }),
        Animated.timing(urgentPulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]).start(() => pulse());
    };
    pulse();
  }, []);

  // Find job from cache first - this should work immediately on back navigation
  const displayJob = useMemo(() => {
    // If id is undefined (can happen on back navigation), use currentJob directly
    if (!id) {
      return currentJob || null;
    }
    // Check currentJob first
    if (currentJob && String(currentJob.id) === String(id)) {
      return currentJob;
    }
    // Check jobs list
    const fromJobs = jobs.find(j => String(j.id) === String(id));
    if (fromJobs) return fromJobs;
    // Check myJobs list
    const fromMyJobs = myJobs.find(j => String(j.id) === String(id));
    if (fromMyJobs) return fromMyJobs;

    return null;
  }, [id, currentJob, jobs, myJobs]);


  // Fetch data on mount, but silently if we already have cached data
  useEffect(() => {
    if (id) {
      dispatch(fetchJobById(id));
      dispatch(fetchJobBids(id));
    }

    // Subscribe to socket notifications for this job
    const unsub = socketService.onBidNotification((data) => {
      if (data.jobPostId === id) {
        console.log('⚡ Real-time update:', data.type);
        dispatch(fetchJobById(id));
        dispatch(fetchJobBids(id));
      }
    });

    return () => {
      unsub();
    };
  }, [id, dispatch]);

  // SHOW DATA IF WE HAVE IT - don't wait for loading
  if (displayJob) {
    // We have data, render the job detail (code continues after this block)
  } else {
    // No data yet
    if (error) {
      return (
        <View style={[styles.loadingContainer, { backgroundColor: colors.backgroundDark }]}>
          <Ionicons name="alert-circle-outline" size={48} color={staticColors.error} />
          <Text style={[styles.errorText, { color: staticColors.white, marginTop: 16 }]}>İlan yüklenemedi.</Text>
          <Text style={{ color: staticColors.textSecondary, textAlign: 'center', marginTop: 8, paddingHorizontal: 40 }}>{error}</Text>
          <TouchableOpacity
            style={{ marginTop: 24, padding: 12, backgroundColor: colors.primary, borderRadius: 12 }}
            onPress={() => dispatch(fetchJobById(id))}
          >
            <Text style={{ color: staticColors.white, fontFamily: fonts.bold }}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Show loading spinner
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.backgroundDark }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: staticColors.textSecondary }]}>Yükleniyor...</Text>
      </View>
    );
  }

  // From here on, displayJob is guaranteed to exist
  const jobData = displayJob;

  const isOwner = user?.id === jobData.citizenId;
  const isElectrician = user?.userType === 'ELECTRICIAN' || guestRole === 'ELECTRICIAN';
  const isAssignedToMe = isElectrician && user?.id && String(jobData?.assignedElectricianId) === String(user.id);
  const isGuest = !user;
  const hasBidOnJob = isElectrician && (jobBids.some(b => b.electricianId === user?.id) || myBids.some(b => b.jobPostId === id));
  const isUrgent = jobData?.urgencyLevel === 'HIGH';

  const handleCall = (phone?: string) => {
    if (phone && phone.trim() !== '') {
      Linking.openURL(`tel:${phone}`);
    } else {
      showAlert('Bilgi', 'Bu kullanıcının telefon numarası sistemde kayıtlı değil veya gizli.', 'info');
    }
  };

  const handleMessagePress = async (receiverId: string, bidId: string, initialMessage?: string) => {
    try {
      // Önce mevcut konuşma var mı kontrol et
      const conversations = await messageService.getConversations();
      const existingConversation = conversations.find((conv: any) =>
        (conv.participant1Id === receiverId || conv.participant2Id === receiverId) ||
        (conv.otherUser?.id === receiverId)
      );

      if (existingConversation) {
        // Mevcut konuşma varsa, mesaj göndermeden direkt oraya git
        router.push(`/messages/${existingConversation.id}`);
        return;
      }

      // Mevcut konuşma yoksa, yeni konuşma başlat ve ilk mesajı gönder
      const resp = await messageService.sendMessage({
        receiverId: receiverId,
        content: initialMessage || 'Merhaba, ilanımla ilgili görüşmek istiyorum.',
        bidId: bidId,
        jobId: id
      });
      if (resp?.conversationId) router.push(`/messages/${resp.conversationId}`);
    } catch (error) {
      showAlert('Hata', 'Sohbet başlatılamadı.', 'error');
    }
  };

  const handleAcceptBid = async () => {
    if (!acceptingBid) return;
    setIsAcceptingBid(true);
    try {
      await dispatch(acceptBid(acceptingBid.id)).unwrap();
      dispatch(fetchJobById(id));
      setIsBidAccepted(true);
      // Don't close or navigate immediately, let the user see the success state
    } catch (error) {
      showAlert('Hata', 'Teklif kabul edilemedi.', 'error');
    } finally {
      setIsAcceptingBid(false);
    }
  };

  const handleCompleteJob = async () => {
    if (!id || rating === 0) {
      showAlert('Hata', 'Lütfen bir puan seçin.', 'error');
      return;
    }

    try {
      await jobService.completeJob(id, { rating, comment: reviewComment });
      setIsReviewModalVisible(false);
      dispatch(fetchJobById(id));
      showAlert('Başarılı', 'İş tamamlandı olarak işaretlendi ve değerlendirmeniz kaydedildi.', 'success');
    } catch (error: any) {
      showAlert('Hata', error.message || 'Bir hata oluştu.', 'error');
    } finally {
      setIsReviewSubmitting(false);
    }
  };

  // DEBUG: Log images
  console.log('🖼️ JobData.images:', jobData.images);

  return (
    <View style={styles.container}>
      <PremiumHeader title="İlan Detayı" subtitle={jobData.category} showBackButton />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.stepperWrapper}>
          <StatusStepper
            steps={[
              { id: 'YAYINDA', label: 'Yayında' },
              { id: 'SECILDI', label: isAssignedToMe ? 'İş Size Atandı' : 'Usta Seçildi' },
              { id: 'BITTI', label: 'Tamamlandı' },
            ]}
            currentStepId={
              jobData.status === 'COMPLETED'
                ? 'BITTI'
                : (jobData.status === 'IN_PROGRESS' || jobData.status === 'PENDING_CONFIRMATION' || !!jobData.assignedElectricianId)
                  ? 'SECILDI'
                  : 'YAYINDA'
            }
          />
        </View>

        <Card style={styles.mainCard}>
          {isUrgent && (
            <Animated.View style={[styles.urgentBadge, { opacity: urgentPulseAnim }]}>
              <LinearGradient colors={['#EF4444', '#DC2626']} style={styles.urgentGradient}>
                <Ionicons name="flash" size={12} color={staticColors.white} />
                <Text style={styles.urgentText}>Acil İlan</Text>
              </LinearGradient>
            </Animated.View>
          )}

          <View style={styles.headerTitleRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.jobTitle, { color: colors.text }]}>{jobData.title}</Text>

              <View style={styles.statusBadgeRow}>
                {(() => {
                  const isPendingConfirm = jobData.status === 'PENDING_CONFIRMATION';
                  const isCompleted = jobData.status === 'COMPLETED';
                  const isCancelled = jobData.status === 'CANCELLED';
                  const isAssigned = !!jobData.assignedElectricianId;
                  const bidCount = jobBids.length;

                  let label = 'Teklif Bekliyor';
                  let color = colors.primary;
                  let icon: any = 'time-outline';

                  if (isCompleted) {
                    label = 'Tamamlandı';
                    color = staticColors.success;
                    icon = 'checkmark-circle';
                  } else if (isCancelled) {
                    label = 'İptal Edildi';
                    color = '#64748B';
                    icon = 'close-circle';
                  } else if (isPendingConfirm) {
                    label = isElectrician ? 'Onay Bekliyor' : 'İş Bitti, Onaylayın';
                    color = '#F59E0B';
                    icon = 'alert-circle';
                  } else if (isAssigned) {
                    label = isAssignedToMe ? 'İş Size Atandı' : 'Usta Seçildi';
                    color = staticColors.success;
                    icon = 'people';
                  } else if (bidCount > 0) {
                    label = isElectrician ? `${bidCount} Teklif` : 'Teklifleri İnceleyin';
                    color = colors.primary;
                    icon = 'pricetag';
                  }

                  return (
                    <View style={[styles.statusBadge, { backgroundColor: color + '15', borderColor: color + '30' }]}>
                      <Ionicons name={icon} size={14} color={color} />
                      <Text style={[styles.statusBadgeText, { color }]}>{label}</Text>
                    </View>
                  );
                })()}
              </View>
            </View>
            {!isOwner && jobData.citizen?.phone && (
              <View style={[styles.trustBadge, { backgroundColor: staticColors.success + '15' }]}>
                <Ionicons name="checkmark-circle" size={14} color={staticColors.success} />
                <Text style={[styles.trustBadgeText, { color: staticColors.success }]}>Telefon Onaylı</Text>
              </View>
            )}
          </View>

          <View style={styles.infoRow}>
            <View style={[styles.infoPill, { backgroundColor: staticColors.borderLight + '40' }]}>
              <Ionicons name="location" size={14} color={colors.primary} />
              <Text style={[styles.infoText, { color: staticColors.textSecondary }]}>{jobData.location?.district || 'Konum Yok'}</Text>
            </View>
            <View style={[styles.infoPill, { backgroundColor: staticColors.borderLight + '40' }]}>
              <Ionicons name="calendar" size={14} color={staticColors.textLight} />
              <Text style={[styles.infoText, { color: staticColors.textSecondary }]}>{new Date(jobData.createdAt).toLocaleDateString('tr-TR')}</Text>
            </View>
          </View>

          {jobData.estimatedBudget ? (
            <LinearGradient colors={[colors.primary + '15', colors.primary + '05']} style={styles.budgetBox}>
              <Text style={[styles.budgetLabel, { color: staticColors.textSecondary }]}>Tahmini Bütçe</Text>
              <Text style={[styles.budgetValue, { color: colors.primary }]}>{(parseFloat(jobData.estimatedBudget.toString()) || 0).toFixed(0)} ₺</Text>
            </LinearGradient>
          ) : null}

          <View style={styles.divider} />

          <Text style={[styles.sectionTitle, { color: colors.text }]}>Açıklama</Text>
          <Text style={styles.description}>{jobData.description}</Text>

          {jobData.images && jobData.images.length > 0 && (
            <View style={styles.imageSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Fotoğraflar</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gallery}>
                {jobData.images.map((img, idx) => (
                  <TouchableOpacity key={idx} onPress={() => { setSelectedImageIndex(idx); setIsImageModalVisible(true); }}>
                    <Image source={{ uri: getFileUrl(img) || undefined }} style={styles.galleryImage} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </Card>

        {isOwner && jobData.status !== 'COMPLETED' && !jobData.assignedElectricianId && (
          <View style={styles.bidsSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Gelen Teklifler ({jobBids.length})</Text>
            {jobBids.length === 0 ? (
              <View style={styles.emptyBids}>
                <Ionicons name="time-outline" size={32} color={colors.textLight} />
                <Text style={styles.emptyBidsText}>Henüz teklif gelmedi.</Text>
              </View>
            ) : (
              jobBids.map((bid) => (
                <Card key={bid.id} style={[styles.bidCard, { backgroundColor: staticColors.white, shadowColor: colors.primary }, bid.status === 'ACCEPTED' && [styles.acceptedBidCard, { borderColor: staticColors.success + '40' }]]}>
                  <View style={styles.bidHeader}>
                    <TouchableOpacity onPress={() => router.push(`/electrician/${bid.electricianId}`)} activeOpacity={0.7}>
                      {bid.electrician?.profileImageUrl && getFileUrl(bid.electrician.profileImageUrl) ? (
                        <Image source={{ uri: getFileUrl(bid.electrician.profileImageUrl)! }} style={styles.bidAvatar} />
                      ) : (
                        <View style={[styles.bidAvatar, { backgroundColor: colors.primary + '15', justifyContent: 'center', alignItems: 'center' }]}>
                          <Ionicons name="person" size={24} color={colors.primary} />
                        </View>
                      )}
                    </TouchableOpacity>
                    <View style={styles.bidInfo}>
                      <Text style={[styles.bidName, { color: colors.text }]}>{bid.electrician?.fullName}</Text>
                      <VerificationBadge status={bid.electrician?.electricianProfile?.verificationStatus} size="small" />
                    </View>
                    <View style={[styles.bidPriceBox, { backgroundColor: colors.primary + '10' }]}>
                      <Text style={[styles.bidPrice, { color: colors.primary }]}>{(parseFloat(bid.amount.toString()) || 0).toFixed(0)} ₺</Text>
                    </View>
                  </View>

                  {bid.message && <Text style={styles.bidMessage}>"{bid.message}"</Text>}

                  <View style={styles.bidActions}>
                    {bid.status === 'PENDING' && (
                      <Button
                        title="Teklifi Kabul Et"
                        onPress={() => {
                          setAcceptingBid({
                            id: bid.id,
                            electricianId: bid.electricianId,
                            electricianName: bid.electrician?.fullName || 'Usta',
                            amount: parseFloat(bid.amount.toString()) || 0,
                            phone: (bid.electrician as any)?.phone
                          });
                          setShowBidAcceptModal(true);
                        }}
                        variant="primary"
                        fullWidth
                      />
                    )}
                  </View>
                </Card>
              ))
            )}
          </View>
        )}

        {isOwner && jobData.status !== 'COMPLETED' && jobData.assignedElectricianId && (
          <View style={styles.assignedSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Seçilen Usta</Text>
            {jobBids.filter(b => b.status === 'ACCEPTED').map(bid => (
              <Card key={bid.id} style={[styles.acceptedBidCard, { borderColor: staticColors.success + '40', backgroundColor: staticColors.white, shadowColor: colors.primary }]}>
                <View style={styles.bidHeader}>
                  <TouchableOpacity onPress={() => router.push(`/electrician/${bid.electricianId}`)} activeOpacity={0.7}>
                    {bid.electrician?.profileImageUrl ? (
                      <Image
                        source={{ uri: getFileUrl(bid.electrician.profileImageUrl) || undefined }}
                        style={styles.bidAvatar}
                        onError={(e) => console.log('Image load error:', e.nativeEvent.error)}
                      />
                    ) : (
                      <View style={[styles.bidAvatar, { backgroundColor: colors.primary + '15', justifyContent: 'center', alignItems: 'center' }]}>
                        <Ionicons name="person" size={24} color={colors.primary} />
                      </View>
                    )}
                  </TouchableOpacity>
                  <View style={styles.bidInfo}>
                    <Text style={[styles.bidName, { color: colors.text }]}>{bid.electrician?.fullName}</Text>
                    <VerificationBadge status={bid.electrician?.electricianProfile?.verificationStatus} size="small" />
                  </View>
                  <View style={[styles.bidPriceBox, { backgroundColor: colors.primary + '10' }]}>
                    <Text style={[styles.bidPrice, { color: colors.primary }]}>{(parseFloat(bid.amount.toString()) || 0).toFixed(0)} ₺</Text>
                  </View>
                </View>
                <View style={styles.activeActions}>
                  <TouchableOpacity style={[styles.actionBtn, { borderColor: colors.primary + '40' }]} onPress={() => handleMessagePress(bid.electricianId, bid.id)}>
                    <Ionicons name="chatbubbles" size={18} color={colors.primary} />
                    <Text style={[styles.actionBtnText, { color: colors.primary }]}>Mesaj Gönder</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, { borderColor: staticColors.success + '40' }]} onPress={() => handleCall((bid.electrician as any)?.phone)}>
                    <Ionicons name="call" size={18} color={staticColors.success} />
                    <Text style={[styles.actionBtnText, { color: staticColors.success }]}>Ara</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))}

            <Button
              title="İşi Tamamlandı Olarak İşaretle"
              onPress={() => setIsReviewModalVisible(true)}
              variant="success"
              fullWidth
              style={[styles.completeBtn, { backgroundColor: staticColors.success }]}
              icon={<Ionicons name="checkmark-done-circle" size={20} color={staticColors.white} />}
            />
          </View>
        )}

        {isAssignedToMe && jobData.status !== 'COMPLETED' && (
          <View style={styles.assignedSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Müşteri Bilgileri</Text>
            <Card style={[styles.acceptedBidCard, { borderColor: colors.primary + '40', backgroundColor: staticColors.white, shadowColor: colors.primary }]}>
              <View style={styles.bidHeader}>
                <Image source={{ uri: getFileUrl(jobData.citizen?.profileImageUrl) || undefined }} style={styles.bidAvatar} />
                <View style={styles.bidInfo}>
                  <Text style={[styles.bidName, { color: colors.text }]}>{jobData.citizen?.fullName}</Text>
                  <View style={[styles.trustBadge, { backgroundColor: staticColors.success + '10', alignSelf: 'flex-start', marginTop: 4 }]}>
                    <Ionicons name="checkmark-circle" size={12} color={staticColors.success} />
                    <Text style={[styles.trustBadgeText, { color: staticColors.success, fontSize: 10 }]}>Müşteri Onaylı</Text>
                  </View>
                </View>
              </View>
              <View style={styles.activeActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, { borderColor: colors.primary + '40' }]}
                  onPress={() => handleMessagePress(jobData.citizenId, jobData.acceptedBidId || '', 'Merhaba, ilanınıza verdiğim teklif kabul edildi. Detayları görüşebiliriz.')}
                >
                  <Ionicons name="chatbubbles" size={18} color={colors.primary} />
                  <Text style={[styles.actionBtnText, { color: colors.primary }]}>Mesaj Gönder</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { borderColor: staticColors.success + '40' }]}
                  onPress={() => handleCall(jobData.citizen?.phone || '')}
                >
                  <Ionicons name="call" size={18} color={staticColors.success} />
                  <Text style={[styles.actionBtnText, { color: staticColors.success }]}>Ara</Text>
                </TouchableOpacity>
              </View>
            </Card>
          </View>
        )}

        {!isOwner && !hasBidOnJob && jobData.status === 'OPEN' && (
          <Button
            title={isGuest ? "Giriş Yap & Teklif Ver" : "Teklif Ver"}
            onPress={() => isGuest ? setShowAuthModal(true) : router.push(`/jobs/${id}/bid`)}
            variant="primary"
            fullWidth
            style={styles.mainActionBtn}
          />
        )}
      </ScrollView>

      <AuthGuardModal
        visible={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLogin={() => {
          setShowAuthModal(false);
          router.push({ pathname: '/(auth)/login', params: { redirectTo: `/jobs/${id}` } });
        }}
        onRegister={() => {
          setShowAuthModal(false);
          router.push({
            pathname: '/(auth)/register',
            params: {
              redirectTo: `/jobs/${id}`,
              initialRole: isElectrician ? 'ELECTRICIAN' : 'CITIZEN'
            }
          });
        }}
        title="Giriş Gerekli"
        message={isElectrician ? "Teklif verebilmek için usta olarak giriş yapmalısınız." : "İlan detaylarını görmek için giriş yapmalısınız."}
      />

      <Modal visible={isImageModalVisible} transparent={true} onRequestClose={() => setIsImageModalVisible(false)}>
        <View style={styles.modalBg}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => setIsImageModalVisible(false)}><Ionicons name="close" size={32} color="#fff" /></TouchableOpacity>
          {selectedImageIndex !== null && <Image source={{ uri: getFileUrl(jobData.images[selectedImageIndex]) || undefined }} style={styles.fullImg} resizeMode="contain" />}
        </View>
      </Modal>

      <Modal visible={isReviewModalVisible} transparent animationType="slide">
        <View style={styles.reviewModalOverlay}>
          <LinearGradient
            colors={['rgba(30, 41, 59, 0.98)', 'rgba(15, 23, 42, 0.95)']}
            style={styles.reviewModalContent}
          >
            <View style={[styles.modalScrollIndicator, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
            <Text style={[styles.reviewModalTitle, { color: staticColors.white }]}>İşi Tamamla & Değerlendir</Text>
            <Text style={[styles.reviewModalSubtitle, { color: 'rgba(255,255,255,0.6)' }]}>Ustanın hizmetinden memnun kaldınız mı?</Text>

            <View style={styles.ratingContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  activeOpacity={0.7}
                  style={star <= rating ? styles.starSelected : styles.starUnselected}
                >
                  <Ionicons
                    name={star <= rating ? "star" : "star-outline"}
                    size={36}
                    color={star <= rating ? staticColors.warning : staticColors.textLight + '50'}
                  />
                  {star <= rating && <View style={[styles.starGlow, { backgroundColor: staticColors.warning }]} />}
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[styles.reviewInput, { color: staticColors.white, backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }]}
              placeholder="Deneyiminizi paylaşın..."
              placeholderTextColor="rgba(255,255,255,0.3)"
              multiline
              numberOfLines={4}
              value={reviewComment}
              onChangeText={setReviewComment}
            />

            <View style={styles.reviewModalActions}>
              <TouchableOpacity
                style={[styles.reviewCancelBtn, { backgroundColor: 'rgba(255,255,255,0.1)' }]}
                onPress={() => setIsReviewModalVisible(false)}
              >
                <Text style={[styles.reviewCancelBtnText, { color: 'rgba(255,255,255,0.6)' }]}>Vazgeç</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.reviewSubmitBtn}
                onPress={handleCompleteJob}
                disabled={isReviewSubmitting || rating === 0}
              >
                <LinearGradient
                  colors={rating === 0 ? ['#CBD5E1', '#94A3B8'] : [colors.primary, colors.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.reviewSubmitGradient}
                >
                  {isReviewSubmitting ? (
                    <ActivityIndicator color={colors.white} size="small" />
                  ) : (
                    <>
                      <Text style={styles.reviewSubmitBtnText}>Tamamla</Text>
                      <Ionicons name="checkmark-circle" size={18} color={colors.white} />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </Modal>

      {/* Bid Acceptance Modal - Glass Glow Theme */}
      <Modal visible={showBidAcceptModal} transparent animationType="fade">
        <View style={styles.bidAcceptOverlay}>
          <LinearGradient
            colors={['rgba(30, 41, 59, 0.98)', 'rgba(15, 23, 42, 0.95)']}
            style={styles.bidAcceptModal}
          >
            <View style={styles.bidAcceptIconWrapper}>
              <View style={[styles.bidAcceptIconGlow, { backgroundColor: isBidAccepted ? staticColors.success : colors.primary }]} />
              <LinearGradient
                colors={isBidAccepted ? ['#10B981', '#059669'] : [colors.primary, colors.primaryDark]}
                style={styles.bidAcceptIconBox}
              >
                <Ionicons name={isBidAccepted ? "checkmark-done" : "checkmark-done-circle"} size={32} color={staticColors.white} />
              </LinearGradient>
            </View>

            <Text style={[styles.bidAcceptTitle, { color: staticColors.white }]}>
              {isBidAccepted ? 'Teklif Kabul Edildi!' : 'Teklifi Kabul Et'}
            </Text>
            <Text style={[styles.bidAcceptMessage, { color: 'rgba(255,255,255,0.6)' }]}>
              {isBidAccepted ? (
                `Tebrikler! ${acceptingBid?.electricianName} ile anlaştınız. Şimdi kendisiyle iletişime geçebilirsiniz.`
              ) : (
                <>
                  <Text style={{ fontWeight: 'bold', color: staticColors.white }}>{acceptingBid?.electricianName}</Text> ustasının{'\n'}
                  <Text style={{ fontWeight: 'bold', color: colors.primary }}>{acceptingBid?.amount?.toFixed(0)} ₺</Text> teklifini kabul etmek istiyor musunuz?
                </>
              )}
            </Text>

            {!isBidAccepted ? (
              <View style={styles.bidAcceptBtnGroup}>
                <TouchableOpacity
                  style={[styles.bidAcceptCancelBtn, { backgroundColor: 'rgba(255,255,255,0.1)' }]}
                  onPress={() => { setShowBidAcceptModal(false); setAcceptingBid(null); }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.bidAcceptCancelBtnText, { color: 'rgba(255,255,255,0.6)' }]}>Vazgeç</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.bidAcceptConfirmBtn}
                  onPress={handleAcceptBid}
                  disabled={isAcceptingBid}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[colors.primary, colors.primaryDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.bidAcceptConfirmGradient}
                  >
                    {isAcceptingBid ? (
                      <ActivityIndicator size="small" color={staticColors.white} />
                    ) : (
                      <Text style={styles.bidAcceptConfirmBtnText}>Evet, Kabul Et</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ width: '100%', gap: 12 }}>
                {acceptingBid?.phone && (
                  <TouchableOpacity
                    style={styles.bidAcceptCallBtn}
                    onPress={() => Linking.openURL(`tel:${acceptingBid.phone}`)}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#10B981', '#059669']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.bidAcceptCallGradient}
                    >
                      <Ionicons name="call" size={18} color={staticColors.white} />
                      <Text style={styles.bidAcceptCallBtnText}>Ustayı Ara</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.bidAcceptCallBtn, { marginTop: 0 }]}
                  onPress={() => {
                    setShowBidAcceptModal(false);
                    if (acceptingBid) {
                      handleMessagePress(acceptingBid.electricianId, acceptingBid.id);
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[colors.primary, colors.primaryDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.bidAcceptCallGradient}
                  >
                    <Ionicons name="chatbubbles" size={18} color={staticColors.white} />
                    <Text style={styles.bidAcceptCallBtnText}>Mesaj Gönder</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ alignSelf: 'center', marginTop: 12 }}
                  onPress={() => { setShowBidAcceptModal(false); setIsBidAccepted(false); setAcceptingBid(null); }}
                >
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontFamily: fonts.bold }}>Kapat</Text>
                </TouchableOpacity>
              </View>
            )}
          </LinearGradient>
        </View>
      </Modal>

      <PremiumAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        buttons={alertConfig.buttons}
        onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, fontFamily: fonts.medium },
  errorText: { fontFamily: fonts.bold, fontSize: 18, textAlign: 'center' },
  stepperWrapper: { marginBottom: 20, backgroundColor: staticColors.white, borderRadius: 20, padding: 8, elevation: 2 },
  mainCard: { padding: 20, borderRadius: 28, backgroundColor: staticColors.white, marginBottom: 24, elevation: 4 },
  urgentBadge: { alignSelf: 'flex-start', borderRadius: 10, overflow: 'hidden', marginBottom: 12 },
  urgentGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, gap: 5 },
  urgentText: { color: '#fff', fontSize: 11, fontFamily: fonts.bold },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 },
  jobTitle: { fontSize: 24, fontFamily: fonts.extraBold, lineHeight: 30, flex: 1 },
  trustBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  trustBadgeText: { fontSize: 12, fontFamily: fonts.bold },
  infoRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  infoPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  infoText: { fontSize: 13, fontFamily: fonts.bold },
  budgetBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 20 },
  budgetLabel: { fontFamily: fonts.bold, fontSize: 14 },
  budgetValue: { fontFamily: fonts.extraBold, fontSize: 20 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontFamily: fonts.extraBold, marginBottom: 10 },
  description: { fontSize: 15, fontFamily: fonts.medium, color: staticColors.textSecondary, lineHeight: 24, marginBottom: 20 },
  imageSection: { marginTop: 10 },
  gallery: { flexDirection: 'row' },
  galleryImage: { width: 100, height: 100, borderRadius: 16, marginRight: 12, backgroundColor: '#eee' },
  bidsSection: { marginTop: 8 },
  emptyBids: { alignItems: 'center', padding: 40, backgroundColor: '#fff', borderRadius: 24, borderStyle: 'dotted', borderWidth: 1, borderColor: '#CBD5E1' },
  emptyBidsText: { marginTop: 12, fontFamily: fonts.medium, color: staticColors.textLight },
  bidCard: { padding: 16, borderRadius: 20, marginBottom: 12, elevation: 2 },
  acceptedBidCard: { borderWidth: 2, borderRadius: 20, padding: 16, marginBottom: 16 },
  bidHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bidAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#eee' },
  bidInfo: { flex: 1 },
  bidName: { fontFamily: fonts.bold, fontSize: 15 },
  bidPriceBox: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  bidPrice: { fontFamily: fonts.extraBold, fontSize: 16 },
  bidMessage: { marginTop: 12, padding: 12, backgroundColor: '#F8FAFC', borderRadius: 12, fontStyle: 'italic', color: staticColors.textSecondary, fontSize: 14 },
  bidActions: { marginTop: 16 },
  activeActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 14, borderWidth: 1 },
  actionBtnText: { fontFamily: fonts.bold, fontSize: 13 },
  bidStatusResult: { textAlign: 'center', fontFamily: fonts.bold, color: staticColors.textLight },
  mainActionBtn: { marginTop: 10, height: 54, borderRadius: 16 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  closeBtn: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
  fullImg: { width: '100%', height: '80%' },
  assignedSection: { marginTop: 8 },
  completeBtn: { marginTop: 10, height: 54, borderRadius: 16 },
  reviewModalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.85)', justifyContent: 'flex-end' },
  reviewModalContent: { borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, borderTopWidth: 1.5, borderTopColor: 'rgba(255,255,255,0.1)' },
  modalScrollIndicator: { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  reviewModalTitle: { fontSize: 24, fontFamily: fonts.extraBold, textAlign: 'center', marginBottom: 8, letterSpacing: -0.5 },
  reviewModalSubtitle: { fontSize: 14, fontFamily: fonts.medium, textAlign: 'center', marginBottom: 30 },
  ratingContainer: { flexDirection: 'row', justifyContent: 'center', gap: 15, marginBottom: 30 },
  starSelected: { position: 'relative' },
  starUnselected: {},
  starGlow: { position: 'absolute', top: '10%', left: '10%', right: '10%', bottom: '10%', borderRadius: 20, opacity: 0.15, transform: [{ scale: 1.5 }], zIndex: -1 },
  reviewInput: { backgroundColor: staticColors.white, borderRadius: 24, padding: 20, height: 140, textAlignVertical: 'top', fontFamily: fonts.medium, fontSize: 16, marginBottom: 30, borderWidth: 1.5, borderColor: '#F1F5F9', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  reviewModalActions: { flexDirection: 'row', gap: 12 },
  reviewCancelBtn: { flex: 1, height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F5F9' },
  reviewCancelBtnText: { fontFamily: fonts.bold, fontSize: 16, color: staticColors.textSecondary },
  reviewSubmitBtn: { flex: 2, height: 56, borderRadius: 18, overflow: 'hidden' },
  reviewSubmitGradient: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  reviewSubmitBtnText: { fontFamily: fonts.extraBold, fontSize: 16, color: staticColors.white },
  // Bid Acceptance Modal Styles
  bidAcceptOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  bidAcceptModal: { width: '100%', borderRadius: 32, padding: 32, alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.1)', shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.3, shadowRadius: 30, elevation: 20 },
  bidAcceptIconWrapper: { width: 90, height: 90, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  bidAcceptIconGlow: { position: 'absolute', width: 70, height: 70, borderRadius: 35, opacity: 0.25, transform: [{ scale: 1.5 }] },
  bidAcceptIconBox: { width: 64, height: 64, borderRadius: 20, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  bidAcceptTitle: { fontFamily: fonts.extraBold, fontSize: 22, color: staticColors.text, marginBottom: 8, textAlign: 'center' },
  bidAcceptMessage: { fontFamily: fonts.medium, fontSize: 14, color: staticColors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  bidAcceptBtnGroup: { flexDirection: 'row', gap: 12, width: '100%' },
  bidAcceptCancelBtn: { flex: 1, height: 52, borderRadius: 16, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  bidAcceptCancelBtnText: { fontFamily: fonts.bold, fontSize: 15, color: staticColors.textSecondary },
  bidAcceptConfirmBtn: { flex: 1, height: 52, borderRadius: 16, overflow: 'hidden' },
  bidAcceptConfirmGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bidAcceptConfirmBtnText: { fontFamily: fonts.bold, fontSize: 15, color: staticColors.white },
  bidAcceptCallBtn: { width: '100%', height: 52, borderRadius: 16, overflow: 'hidden', marginTop: 12 },
  bidAcceptCallGradient: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  bidAcceptCallBtnText: { fontFamily: fonts.bold, fontSize: 15, color: staticColors.white },
  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
    textTransform: 'uppercase',
  },
});
