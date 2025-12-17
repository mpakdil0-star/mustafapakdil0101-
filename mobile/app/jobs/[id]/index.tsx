import { useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useAppDispatch, useAppSelector } from '../../../hooks/redux';
import { fetchJobById, clearCurrentJob } from '../../../store/slices/jobSlice';
import { fetchJobBids, acceptBid, rejectBid, clearJobBids } from '../../../store/slices/bidSlice';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { colors } from '../../../constants/colors';
import { spacing } from '../../../constants/spacing';
import { typography } from '../../../constants/typography';
import { API_BASE_URL } from '../../../constants/api';

export default function JobDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const { currentJob, isLoading, error, jobs, myJobs } = useAppSelector((state) => state.jobs);
  const { jobBids, myBids, isLoading: isBidsLoading } = useAppSelector((state) => state.bids);
  const { user } = useAppSelector((state) => state.auth);

  // Track if we've started loading to prevent double loads
  const hasStartedLoading = useRef(false);

  // Try to find job from cache first (from jobs list or myJobs list)
  const cachedJob = useMemo(() => {
    if (currentJob?.id === id) return currentJob;
    const fromJobs = jobs.find(j => j.id === id);
    if (fromJobs) return fromJobs;
    const fromMyJobs = myJobs.find(j => j.id === id);
    if (fromMyJobs) return fromMyJobs;
    return null;
  }, [id, currentJob, jobs, myJobs]);

  // Use cached job for immediate display, currentJob for full data
  const displayJob = currentJob?.id === id ? currentJob : cachedJob;

  useEffect(() => {
    if (id && !hasStartedLoading.current) {
      hasStartedLoading.current = true;
      // Load data in parallel
      Promise.all([
        dispatch(fetchJobById(id)),
        dispatch(fetchJobBids(id))
      ]);
    }

    return () => {
      hasStartedLoading.current = false;
      dispatch(clearCurrentJob());
      dispatch(clearJobBids());
    };
  }, [id, dispatch]);

  const getUrgencyColor = useCallback((urgency: string) => {
    switch (urgency) {
      case 'HIGH':
        return colors.error;
      case 'MEDIUM':
        return colors.warning;
      case 'LOW':
        return colors.success;
      default:
        return colors.textSecondary;
    }
  }, []);

  const getUrgencyText = useCallback((urgency: string) => {
    switch (urgency) {
      case 'HIGH':
        return 'Acil';
      case 'MEDIUM':
        return 'Orta';
      case 'LOW':
        return 'Düşük';
      default:
        return urgency;
    }
  }, []);

  // Show loading if we have no data to display
  if (!displayJob) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>İlan yükleniyor...</Text>
      </View>
    );
  }

  if (error && !displayJob) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>İlan Bulunamadı</Text>
        <Text style={styles.errorText}>
          {error || 'İlan bilgileri yüklenemedi.'}
        </Text>
        <Button
          title="Geri Dön"
          onPress={() => router.push('/(tabs)/jobs')}
          variant="primary"
          style={styles.errorBackButton}
        />
      </View>
    );
  }

  // If we still don't have any job data, show error
  if (!displayJob) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>İlan Bulunamadı</Text>
        <Button
          title="Geri Dön"
          onPress={() => router.push('/(tabs)/jobs')}
          variant="primary"
          style={styles.errorBackButton}
        />
      </View>
    );
  }

  // Use displayJob for rendering
  const jobData = displayJob;

  const isOwner = user?.id === jobData.citizenId;
  const isElectrician = user?.userType === 'ELECTRICIAN';
  // Check if user has already bid on this job (check both jobBids and myBids)
  const hasBidOnJob =
    isElectrician &&
    (jobBids.some((bid) => bid.electricianId === user?.id) ||
      myBids.some((bid) => bid.jobPostId === id));
  const canBid = isElectrician && !isOwner && jobData.status === 'OPEN' && !hasBidOnJob;

  const location =
    typeof jobData.location === 'object'
      ? `${jobData.location.neighborhood || ''}, ${jobData.location.district || ''}, ${jobData.location.city || ''}`
      : jobData.location || 'Konum belirtilmemiş';


  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Back Button Header */}
        <View style={styles.backHeaderContainer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push('/(tabs)/jobs')}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonIcon}>←</Text>
            <Text style={styles.backButtonText}>Geri</Text>
          </TouchableOpacity>
        </View>

        {/* Job Header Card */}
        <Card style={styles.headerCard} elevated>
          <View style={styles.titleRow}>
            <Text style={styles.jobTitle}>{jobData.title}</Text>
            <View
              style={[
                styles.urgencyBadge,
                { backgroundColor: getUrgencyColor(jobData.urgencyLevel) + '20' },
              ]}
            >
              <Text
                style={[
                  styles.urgencyText,
                  { color: getUrgencyColor(jobData.urgencyLevel) },
                ]}
              >
                {getUrgencyText(jobData.urgencyLevel)}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>📍</Text>
              <Text style={styles.metaText} numberOfLines={1}>
                {location}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaIcon}>💼</Text>
              <Text style={styles.metaText}>{jobData.category}</Text>
            </View>
          </View>

          {jobData.estimatedBudget && (
            <View style={styles.budgetContainer}>
              <Text style={styles.budgetLabel}>Tahmini Bütçe:</Text>
              <Text style={styles.budgetValue}>
                {typeof jobData.estimatedBudget === 'string'
                  ? parseFloat(jobData.estimatedBudget).toFixed(0)
                  : jobData.estimatedBudget}{' '}
                ₺
              </Text>
            </View>
          )}
        </Card>

        {/* Description Card */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>📝 Açıklama</Text>
          <Text style={styles.description}>{jobData.description}</Text>
        </Card>

        {/* Job Info Card */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>ℹ️ İlan Bilgileri</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Durum:</Text>
            <Text
              style={[
                styles.infoValue,
                {
                  color:
                    jobData.status === 'OPEN'
                      ? colors.success
                      : jobData.status === 'CANCELLED'
                        ? colors.error
                        : colors.textSecondary,
                },
              ]}
            >
              {jobData.status === 'OPEN'
                ? 'Açık'
                : jobData.status === 'CANCELLED'
                  ? 'İptal Edildi'
                  : jobData.status}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Görüntülenme:</Text>
            <Text style={styles.infoValue}>{jobData.viewCount || 0}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Teklif Sayısı:</Text>
            <Text style={styles.infoValue}>
              {jobData.bidCount || jobBids.length || 0}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Oluşturulma:</Text>
            <Text style={styles.infoValue}>
              {new Date(jobData.createdAt).toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </View>
        </Card>

        {/* Bids Card (only for owners) */}
        {isOwner && jobBids.length > 0 && (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>💼 Teklifler ({jobBids.length})</Text>
            {jobBids.map((bid) => (
              <TouchableOpacity
                key={bid.id}
                style={styles.bidItem}
                onPress={() => router.push(`/jobs/${id}/bid-detail/${bid.id}`)}
                activeOpacity={0.7}
              >
                <View style={styles.bidHeader}>
                  <View style={styles.bidHeaderLeft}>
                    <Text style={styles.bidElectrician}>
                      {bid.electrician?.fullName || 'Elektrikçi'}
                    </Text>
                    {bid.status === 'ACCEPTED' && (
                      <View style={styles.statusBadgeAccepted}>
                        <Text style={styles.statusBadgeText}>✅ Kabul Edildi</Text>
                      </View>
                    )}
                    {bid.status === 'REJECTED' && (
                      <View style={styles.statusBadgeRejected}>
                        <Text style={styles.statusBadgeText}>❌ Reddedildi</Text>
                      </View>
                    )}
                    {bid.status === 'PENDING' && (
                      <View style={styles.statusBadgePending}>
                        <Text style={styles.statusBadgeText}>⏳ Beklemede</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.bidAmount}>
                    {typeof bid.amount === 'string'
                      ? parseFloat(bid.amount).toFixed(0)
                      : bid.amount}{' '}
                    ₺
                  </Text>
                </View>
                {bid.message && (
                  <Text style={styles.bidMessage} numberOfLines={2}>
                    {bid.message}
                  </Text>
                )}
                {bid.status === 'PENDING' && jobData.status === 'OPEN' && (
                  <View style={styles.bidActions}>
                    <Button
                      title="Kabul Et"
                      onPress={async () => {
                        Alert.alert(
                          'Teklifi Kabul Et',
                          `${bid.electrician?.fullName || 'Elektrikçi'}nin teklifini kabul etmek istediğinize emin misiniz?`,
                          [
                            { text: 'İptal', style: 'cancel' },
                            {
                              text: 'Kabul Et',
                              onPress: async () => {
                                try {
                                  await dispatch(acceptBid(bid.id)).unwrap();
                                  dispatch(fetchJobById(id));
                                  dispatch(fetchJobBids(id));
                                  Alert.alert('Başarılı', 'Teklif kabul edildi!');
                                } catch (err: any) {
                                  Alert.alert('Hata', err.message || 'Teklif kabul edilirken bir hata oluştu');
                                }
                              },
                            },
                          ]
                        );
                      }}
                      variant="primary"
                      size="small"
                      style={styles.acceptButton}
                    />
                    <Button
                      title="Reddet"
                      onPress={async () => {
                        Alert.alert(
                          'Teklifi Reddet',
                          `${bid.electrician?.fullName || 'Elektrikçi'}nin teklifini reddetmek istediğinize emin misiniz?`,
                          [
                            { text: 'İptal', style: 'cancel' },
                            {
                              text: 'Reddet',
                              style: 'destructive',
                              onPress: async () => {
                                try {
                                  await dispatch(rejectBid(bid.id)).unwrap();
                                  dispatch(fetchJobById(id));
                                  dispatch(fetchJobBids(id));
                                  Alert.alert('Başarılı', 'Teklif reddedildi');
                                } catch (err: any) {
                                  Alert.alert('Hata', err.message || 'Teklif reddedilirken bir hata oluştu');
                                }
                              },
                            },
                          ]
                        );
                      }}
                      variant="outline"
                      size="small"
                      style={styles.rejectButton}
                    />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </Card>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {canBid && (
            <Button
              title="Teklif Ver"
              onPress={() => router.push(`/jobs/${id}/bid`)}
              variant="primary"
              fullWidth
            />
          )}

          {/* Vatandaş için İlan İptali - OPEN veya BIDDING durumunda */}
          {isOwner && (jobData.status === 'OPEN' || jobData.status === 'BIDDING') && (
            <Button
              title="İlanı İptal Et"
              onPress={() => {
                const hasAcceptedBid = jobBids.some(bid => bid.status === 'ACCEPTED');
                Alert.alert(
                  'İlanı İptal Et',
                  hasAcceptedBid
                    ? 'Bu ilanın kabul edilmiş teklifi var. Yine de iptal etmek istiyor musunuz?'
                    : 'Bu ilanı iptal etmek istediğinize emin misiniz?',
                  [
                    { text: 'Vazgeç', style: 'cancel' },
                    {
                      text: 'İptal Et',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          const token = await SecureStore.getItemAsync('auth_token');
                          const url = `${API_BASE_URL}/jobs/${id}/cancel`;
                          console.log('Cancel URL:', url);
                          console.log('Token:', token ? 'exists' : 'missing');

                          const response = await fetch(url, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${token}`,
                            },
                          });

                          console.log('Response status:', response.status);
                          const data = await response.json();
                          console.log('Response data:', JSON.stringify(data));

                          if (data.success) {
                            Alert.alert('Başarılı', 'İlan iptal edildi');
                            router.push('/(tabs)/jobs');
                          } else {
                            Alert.alert('Hata', data.error?.message || JSON.stringify(data));
                          }
                        } catch (error: any) {
                          console.error('Cancel error:', error);
                          Alert.alert('Hata', error.message || 'Bir hata oluştu');
                        }
                      },
                    },
                  ]
                );
              }}
              variant="outline"
              fullWidth
              style={styles.cancelButton}
            />
          )}

          {/* Vatandaş için İş Onaylama - IN_PROGRESS veya BIDDING (onay bekleniyor) */}
          {isOwner && (jobData.status === 'IN_PROGRESS' || jobData.status === 'BIDDING') && (
            <Button
              title={jobData.status === 'BIDDING' ? 'İşi Onayla (Tamamlandı)' : 'İşi Tamamlandı Olarak Onayla'}
              onPress={() => {
                Alert.alert(
                  'İşi Onayla',
                  'Bu işin tamamlandığını onaylıyor musunuz?',
                  [
                    { text: 'Hayır', style: 'cancel' },
                    {
                      text: 'Evet, Onayla',
                      onPress: async () => {
                        try {
                          const response = await fetch(`${API_BASE_URL}/jobs/${id}/confirm-complete`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${await SecureStore.getItemAsync('auth_token')}`,
                            },
                          });
                          const data = await response.json();
                          if (data.success) {
                            Alert.alert('Başarılı', 'İş tamamlandı olarak onaylandı! Şimdi değerlendirme yapabilirsiniz.', [
                              { text: 'Değerlendir', onPress: () => showReviewPrompt() },
                              { text: 'Sonra', style: 'cancel' },
                            ]);
                            dispatch(fetchJobById(id));
                          } else {
                            Alert.alert('Hata', data.error?.message || 'İş onaylanamadı');
                          }
                        } catch (error: any) {
                          Alert.alert('Hata', error.message || 'Bir hata oluştu');
                        }
                      },
                    },
                  ]
                );
              }}
              variant="primary"
              fullWidth
            />
          )}

          {/* Vatandaş için Değerlendirme - COMPLETED durumunda */}
          {isOwner && jobData.status === 'COMPLETED' && !jobData.hasReview && (
            <Button
              title="Elektrikçiyi Değerlendir ⭐"
              onPress={() => showReviewPrompt()}
              variant="primary"
              fullWidth
            />
          )}

          {/* Elektrikçi için İş Tamamlama - IN_PROGRESS durumunda */}
          {isElectrician && jobData.status === 'IN_PROGRESS' && hasBidOnJob && (
            <Button
              title="İşi Tamamla"
              onPress={() => {
                Alert.alert(
                  'İşi Tamamla',
                  'Bu işi tamamladınız mı? Vatandaş onayı bekleniyor olarak işaretlenecek.',
                  [
                    { text: 'Hayır', style: 'cancel' },
                    {
                      text: 'Evet, Tamamladım',
                      onPress: async () => {
                        try {
                          const response = await fetch(`${API_BASE_URL}/jobs/${id}/mark-complete`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${await SecureStore.getItemAsync('auth_token')}`,
                            },
                          });
                          const data = await response.json();
                          if (data.success) {
                            Alert.alert('Başarılı', 'İş tamamlandı olarak işaretlendi. Vatandaş onayı bekleniyor.');
                            dispatch(fetchJobById(id));
                          } else {
                            Alert.alert('Hata', data.error?.message || 'İşlem başarısız');
                          }
                        } catch (error: any) {
                          Alert.alert('Hata', error.message || 'Bir hata oluştu');
                        }
                      },
                    },
                  ]
                );
              }}
              variant="primary"
              fullWidth
            />
          )}

          {isOwner && jobData.status === 'OPEN' && (
            <Button
              title="İlanı Düzenle"
              onPress={() => router.push(`/jobs/${id}/edit`)}
              variant="outline"
              fullWidth
              style={styles.editButton}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );

  // Değerlendirme göster
  function showReviewPrompt() {
    const acceptedBid = jobBids.find(bid => bid.status === 'ACCEPTED');
    const electricianName = acceptedBid?.electrician?.fullName || 'Elektrikçi';
    const electricianId = acceptedBid?.electricianId;

    Alert.prompt(
      `${electricianName} Değerlendirmesi`,
      'Lütfen 1-5 arası puan verin (1=Kötü, 5=Mükemmel)',
      [
        { text: 'İptal', style: 'cancel' },
        {
          onPress: async (ratingStr?: string) => {
            const rating = parseInt(ratingStr || '0', 10);
            if (rating < 1 || rating > 5) {
              Alert.alert('Hata', 'Lütfen 1-5 arası bir puan girin');
              return;
            }

            try {
              const response = await fetch(`${API_BASE_URL}/jobs/${id}/review`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${await SecureStore.getItemAsync('auth_token')}`,
                },
                body: JSON.stringify({
                  rating,
                  electricianId,
                  comment: `${rating} yıldız değerlendirme`,
                }),
              });
              const data = await response.json();
              if (data.success) {
                Alert.alert('Teşekkürler!', 'Değerlendirmeniz kaydedildi');
                dispatch(fetchJobById(id));
              } else {
                Alert.alert('Hata', data.error?.message || 'Değerlendirme kaydedilemedi');
              }
            } catch (error: any) {
              Alert.alert('Hata', error.message || 'Bir hata oluştu');
            }
          },
        },
      ],
      'plain-text',
      '',
      'numeric'
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  content: {
    padding: spacing.screenPadding,
    paddingTop: 0,
    paddingBottom: spacing.xxl,
  },
  backHeaderContainer: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    marginHorizontal: -spacing.screenPadding,
    marginBottom: spacing.md,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  backButtonIcon: {
    fontSize: 24,
    color: colors.white,
    marginRight: spacing.xs,
    fontWeight: 'bold',
  },
  backButtonText: {
    ...typography.body1,
    color: colors.white,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
  },
  loadingText: {
    ...typography.body2,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.backgroundLight,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  errorTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  errorText: {
    ...typography.body2,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  errorBackButton: {
    minWidth: 150,
  },
  headerCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  jobTitle: {
    ...typography.h4,
    color: colors.text,
    fontWeight: '700',
    flex: 1,
    marginRight: spacing.sm,
  },
  urgencyBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.radius.sm,
  },
  urgencyText: {
    ...typography.caption,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaIcon: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  metaText: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  budgetContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primaryLight + '10',
    borderRadius: spacing.radius.sm,
    marginTop: spacing.sm,
  },
  budgetLabel: {
    ...typography.body2,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  budgetValue: {
    ...typography.h5,
    color: colors.primary,
    fontWeight: '700',
  },
  sectionCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h5,
    color: colors.text,
    marginBottom: spacing.md,
    fontWeight: '700',
  },
  description: {
    ...typography.body1,
    color: colors.text,
    lineHeight: 24,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingVertical: spacing.xs,
  },
  infoLabel: {
    ...typography.body2,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    ...typography.body1,
    color: colors.text,
    fontWeight: '600',
  },
  bidItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    borderRadius: spacing.radius.sm,
    marginBottom: spacing.xs,
  },
  bidHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  bidHeaderLeft: {
    flex: 1,
    marginRight: spacing.sm,
  },
  bidElectrician: {
    ...typography.body1,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  statusBadgeAccepted: {
    backgroundColor: colors.success + '20',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: spacing.radius.sm,
    alignSelf: 'flex-start',
  },
  statusBadgeRejected: {
    backgroundColor: colors.error + '20',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: spacing.radius.sm,
    alignSelf: 'flex-start',
  },
  statusBadgePending: {
    backgroundColor: colors.warning + '20',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: spacing.radius.sm,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '600',
  },
  bidAmount: {
    ...typography.h5,
    color: colors.primary,
    fontWeight: '700',
  },
  bidMessage: {
    ...typography.body2,
    color: colors.textSecondary,
    lineHeight: 20,
    fontStyle: 'italic',
    marginBottom: spacing.sm,
  },
  bidActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  acceptButton: {
    flex: 1,
  },
  rejectButton: {
    flex: 1,
  },
  moreBids: {
    ...typography.body2,
    color: colors.primary,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontWeight: '600',
  },
  actionButtons: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  editButton: {
    marginTop: spacing.xs,
  },
  cancelButton: {
    borderColor: colors.error,
  },
});

