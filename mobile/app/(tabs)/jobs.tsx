import { useEffect, useState, useCallback, useMemo, useRef, memo } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, ListRenderItem } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchJobs, fetchMyJobs, fetchJobById } from '../../store/slices/jobSlice';
import { fetchMyBids, fetchJobBids, withdrawBid } from '../../store/slices/bidSlice';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Picker } from '../../components/common/Picker';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';

type TabType = 'all' | 'my' | 'bids';

export default function JobsScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { jobs, myJobs, isLoading, error } = useAppSelector((state) => state.jobs);
  const { myBids, isLoading: isLoadingBids } = useAppSelector((state) => state.bids);
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const isElectrician = user?.userType === 'ELECTRICIAN';
  // Vatandaş için varsayılan 'my' (İlanlarım), Elektrikçi için 'all' (Tüm İlanlar)
  const [activeTab, setActiveTab] = useState<TabType>(isElectrician ? 'all' : 'my');

  // Filtreleme state'leri
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  const loadJobs = useCallback(() => {
    const filters: any = { status: 'OPEN', limit: 20 };
    if (selectedCity) filters.city = selectedCity;
    if (selectedDistrict) filters.district = selectedDistrict;

    dispatch(fetchJobs(filters));
  }, [dispatch, selectedCity, selectedDistrict]);

  const loadMyJobs = useCallback(() => {
    dispatch(fetchMyJobs());
  }, [dispatch]);

  const loadMyBids = useCallback(() => {
    dispatch(fetchMyBids());
  }, [dispatch]);

  // Track if initial data has been loaded to prevent redundant calls
  const hasLoadedJobs = useRef(false);
  const hasLoadedMyJobs = useRef(false);
  const hasLoadedMyBids = useRef(false);

  // Ekran ilk açıldığında verileri yükle (sadece 1 kez)
  useFocusEffect(
    useCallback(() => {
      if (isElectrician) {
        // Elektrikçi: Tüm ilanları ve tekliflerini yükle
        if (!hasLoadedJobs.current) {
          loadJobs();
          hasLoadedJobs.current = true;
        }
        if (isAuthenticated && !hasLoadedMyBids.current) {
          loadMyBids();
          hasLoadedMyBids.current = true;
        }
      } else {
        // Vatandaş: Sadece kendi ilanlarını yükle
        if (isAuthenticated && !hasLoadedMyJobs.current) {
          loadMyJobs();
          hasLoadedMyJobs.current = true;
        }
      }
    }, [isAuthenticated, isElectrician])
  );

  // Şehir değiştiğinde ilçe ve mahalle filtrelerini sıfırla
  useEffect(() => {
    if (selectedCity) {
      setSelectedDistrict('');
      setSelectedNeighborhood('');
    }
  }, [selectedCity]);

  // İlçe değiştiğinde mahalle filtresini sıfırla
  useEffect(() => {
    if (selectedDistrict) {
      setSelectedNeighborhood('');
    }
  }, [selectedDistrict]);

  // Prefetch job detail when user starts touching a job card
  const handleJobPressIn = useCallback((jobId: string) => {
    // Prefetch route and data in parallel
    router.prefetch(`/jobs/${jobId}`);
    dispatch(fetchJobById(jobId));
    dispatch(fetchJobBids(jobId));
  }, [dispatch, router]);

  const handleJobPress = useCallback((jobId: string) => {
    router.push(`/jobs/${jobId}`);
  }, [router]);

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

  const handleWithdrawBid = useCallback((bidId: string) => {
    Alert.alert(
      'Teklifi Geri Çek',
      'Bu teklifi geri çekmek istediğinizden emin misiniz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Geri Çek',
          style: 'destructive',
          onPress: () => {
            dispatch(withdrawBid(bidId))
              .unwrap()
              .then(() => {
                Alert.alert('Başarılı', 'Teklifiniz geri çekildi.');
              })
              .catch((err) => {
                Alert.alert('Hata', err || 'Teklif geri çekilemedi.');
              });
          },
        },
      ]
    );
  }, [dispatch]);

  // Mevcut işlerden şehir, ilçe ve mahalle listelerini çıkar
  const cities = useMemo(() => {
    const citySet = new Set<string>();
    jobs.forEach((job) => {
      if (job.location && typeof job.location === 'object' && job.location.city) {
        citySet.add(job.location.city);
      }
    });
    return Array.from(citySet).sort();
  }, [jobs]);

  const districts = useMemo(() => {
    if (!selectedCity) return [];
    const districtSet = new Set<string>();
    jobs.forEach((job) => {
      if (
        job.location &&
        typeof job.location === 'object' &&
        job.location.city === selectedCity &&
        job.location.district
      ) {
        districtSet.add(job.location.district);
      }
    });
    return Array.from(districtSet).sort();
  }, [jobs, selectedCity]);

  const neighborhoods = useMemo(() => {
    if (!selectedCity || !selectedDistrict) return [];
    const neighborhoodSet = new Set<string>();
    jobs.forEach((job) => {
      if (
        job.location &&
        typeof job.location === 'object' &&
        job.location.city === selectedCity &&
        job.location.district === selectedDistrict &&
        job.location.neighborhood
      ) {
        neighborhoodSet.add(job.location.neighborhood);
      }
    });
    return Array.from(neighborhoodSet).sort();
  }, [jobs, selectedCity, selectedDistrict]);

  // Filtrelenmiş işleri hesapla
  const filteredJobs = useMemo(() => {
    let filtered = activeTab === 'all' ? jobs : activeTab === 'bids' ? [] : myJobs;

    if (activeTab === 'all') {
      if (selectedCity) {
        filtered = filtered.filter((job) =>
          job.location &&
          typeof job.location === 'object' &&
          job.location.city === selectedCity
        );
      }
      if (selectedDistrict) {
        filtered = filtered.filter((job) =>
          job.location &&
          typeof job.location === 'object' &&
          job.location.district === selectedDistrict
        );
      }
      if (selectedNeighborhood) {
        filtered = filtered.filter((job) =>
          job.location &&
          typeof job.location === 'object' &&
          job.location.neighborhood === selectedNeighborhood
        );
      }
    }

    return filtered;
  }, [activeTab, jobs, myJobs, selectedCity, selectedDistrict, selectedNeighborhood]);

  // Filtreleri temizle
  const clearFilters = useCallback(() => {
    setSelectedCity('');
    setSelectedDistrict('');
    setSelectedNeighborhood('');
  }, []);

  // Filtre var mı kontrol et
  const hasActiveFilters = selectedCity || selectedDistrict || selectedNeighborhood;

  // Memoize computed values for better performance
  const currentJobs = useMemo(() => {
    return filteredJobs;
  }, [filteredJobs]);

  const isMyJobsEmpty = useMemo(() => {
    return activeTab === 'my' && myJobs.length === 0 && !isLoading;
  }, [activeTab, myJobs.length, isLoading]);

  const isAllJobsEmpty = useMemo(() => {
    return activeTab === 'all' && jobs.length === 0 && !isLoading;
  }, [activeTab, jobs.length, isLoading]);

  const isMyBidsEmpty = useMemo(() => {
    return activeTab === 'bids' && myBids.length === 0 && !isLoadingBids;
  }, [activeTab, myBids.length, isLoadingBids]);

  // Only show loading on initial load when there's no data
  const showInitialLoading = useMemo(() => {
    return (activeTab === 'all' && jobs.length === 0 && isLoading) ||
      (activeTab === 'my' && myJobs.length === 0 && isLoading) ||
      (activeTab === 'bids' && myBids.length === 0 && isLoadingBids);
  }, [activeTab, jobs.length, myJobs.length, myBids.length, isLoading, isLoadingBids]);

  // Only show loading screen on initial load when there's no data
  if (showInitialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Show error if exists
  if (error && !isLoading) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadJobs} />
        }
      >
        <Card style={styles.errorCard}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Hata Oluştu</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Button
            title="Tekrar Dene"
            onPress={loadJobs}
            variant="primary"
            style={styles.retryButton}
          />
        </Card>
      </ScrollView>
    );
  }

  if (isAllJobsEmpty || isMyJobsEmpty || isMyBidsEmpty) {
    return (
      <View style={styles.container}>
        {/* Tab Selector - Sadece elektrikçiler için göster (vatandaş tek sekme kullanıyor) */}
        {isAuthenticated && isElectrician && (
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'all' && styles.tabActive]}
              onPress={() => setActiveTab('all')}
            >
              <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
                Tüm İlanlar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'bids' && styles.tabActive]}
              onPress={() => setActiveTab('bids')}
            >
              <Text style={[styles.tabText, activeTab === 'bids' && styles.tabTextActive]}>
                Tekliflerim
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={isLoading || isLoadingBids}
              onRefresh={
                activeTab === 'all'
                  ? loadJobs
                  : activeTab === 'bids'
                    ? loadMyBids
                    : loadMyJobs
              }
            />
          }
        >
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>
              {activeTab === 'bids' ? '💼' : activeTab === 'my' ? '📋' : '💼'}
            </Text>
            <Text style={styles.emptyTitle}>
              {activeTab === 'bids'
                ? 'Teklifiniz Yok'
                : activeTab === 'my'
                  ? 'İlanınız Yok'
                  : 'İş İlanı Yok'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {error
                ? `Hata: ${error}\n\nLütfen tekrar deneyin.`
                : activeTab === 'bids'
                  ? 'Henüz hiçbir ilana teklif vermediniz.\n\nİlanlara göz atıp teklif vermek için "Tüm İlanlar" sekmesine geçin.'
                  : activeTab === 'my'
                    ? 'Henüz ilan oluşturmadınız.\n\nİlan oluşturmak için ana sayfadan "İlan Oluştur" butonuna tıklayın.'
                    : 'Henüz açık iş ilanı bulunmamaktadır.\n\nİlan oluşturmak için ana sayfadan "İlan Oluştur" butonuna tıklayın.'}
            </Text>
            {error && (
              <Button
                title="Tekrar Dene"
                onPress={
                  activeTab === 'all'
                    ? loadJobs
                    : activeTab === 'bids'
                      ? loadMyBids
                      : loadMyJobs
                }
                variant="primary"
                style={styles.retryButton}
              />
            )}
            {activeTab === 'my' && !error && (
              <Button
                title="İlan Oluştur"
                onPress={() => router.push('/jobs/create')}
                variant="primary"
                style={styles.retryButton}
              />
            )}
          </Card>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <View style={styles.headerContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonIcon}>←</Text>
          <Text style={styles.backButtonText}>Geri</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Selector - Sadece elektrikçiler için göster */}
      {isAuthenticated && isElectrician && (
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'all' && styles.tabActive]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
              Tüm İlanlar
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'bids' && styles.tabActive]}
            onPress={() => setActiveTab('bids')}
          >
            <Text style={[styles.tabText, activeTab === 'bids' && styles.tabTextActive]}>
              Tekliflerim
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Filtreleme Butonu ve Filtreler */}
      {activeTab === 'all' && (
        <View style={styles.filterSection}>
          <TouchableOpacity
            style={styles.filterToggle}
            onPress={() => setShowFilters(!showFilters)}
            activeOpacity={0.7}
          >
            <Text style={styles.filterToggleText}>
              🔍 {showFilters ? 'Filtreleri Gizle' : 'Filtrele'}
            </Text>
            {hasActiveFilters && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>
                  {[selectedCity, selectedDistrict, selectedNeighborhood].filter(Boolean).length}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {showFilters && (
            <Card style={styles.filterCard}>
              <View style={styles.filterHeader}>
                <Text style={styles.filterTitle}>Filtrele</Text>
                {hasActiveFilters && (
                  <TouchableOpacity
                    onPress={clearFilters}
                    style={styles.clearButton}
                  >
                    <Text style={styles.clearButtonText}>Temizle</Text>
                  </TouchableOpacity>
                )}
              </View>

              <Picker
                label="İl"
                placeholder="İl seçiniz"
                value={selectedCity}
                options={cities}
                onValueChange={setSelectedCity}
              />

              <Picker
                label="İlçe"
                placeholder="İlçe seçiniz"
                value={selectedDistrict}
                options={districts}
                onValueChange={setSelectedDistrict}
                disabled={!selectedCity}
              />

              <Picker
                label="Mahalle"
                placeholder="Mahalle seçiniz"
                value={selectedNeighborhood}
                options={neighborhoods}
                onValueChange={setSelectedNeighborhood}
                disabled={!selectedDistrict}
              />

              <Button
                title="Filtrele"
                onPress={() => {
                  loadJobs();
                  setShowFilters(false);
                }}
                variant="primary"
                fullWidth
                style={styles.applyFilterButton}
              />
            </Card>
          )}
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={(activeTab === 'all' && isLoading) ||
              (activeTab === 'bids' && isLoadingBids) ||
              (activeTab === 'my' && isLoading)}
            onRefresh={
              activeTab === 'all'
                ? loadJobs
                : activeTab === 'bids'
                  ? loadMyBids
                  : loadMyJobs
            }
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'bids' ? (
          myBids.map((bid) => {
            const job = bid.jobPost;
            if (!job) return null;

            const getBidStatusColor = (status: string) => {
              switch (status) {
                case 'ACCEPTED':
                  return colors.success;
                case 'REJECTED':
                  return colors.error;
                case 'PENDING':
                  return colors.warning;
                default:
                  return colors.textSecondary;
              }
            };

            const getBidStatusText = (status: string) => {
              switch (status) {
                case 'ACCEPTED':
                  return '✅ Kabul Edildi';
                case 'REJECTED':
                  return '❌ Reddedildi';
                case 'PENDING':
                  return '⏳ Beklemede';
                default:
                  return status;
              }
            };

            return (
              <TouchableOpacity
                key={bid.id}
                onPressIn={() => handleJobPressIn(job.id)}
                onPress={() => handleJobPress(job.id)}
                activeOpacity={0.7}
              >
                <Card style={styles.jobCard} elevated>
                  <View style={styles.jobHeader}>
                    <View style={styles.jobTitleContainer}>
                      <Text style={styles.jobTitle} numberOfLines={2}>
                        {job.title}
                      </Text>
                      <View
                        style={[
                          styles.urgencyBadge,
                          { backgroundColor: getBidStatusColor(bid.status) + '20' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.urgencyText,
                            { color: getBidStatusColor(bid.status) },
                          ]}
                        >
                          {getBidStatusText(bid.status)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.bidInfo}>
                    <View style={styles.bidAmountContainer}>
                      <Text style={styles.bidAmountLabel}>Teklif Tutarı:</Text>
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
                  </View>

                  <Text style={styles.jobDescription} numberOfLines={2}>
                    {job.description}
                  </Text>

                  <View style={styles.jobMeta}>
                    {job.location && typeof job.location === 'object' && (
                      <View style={styles.metaItem}>
                        <Text style={styles.metaIcon}>📍</Text>
                        <Text style={styles.metaText}>
                          {job.location.district || ''}, {job.location.city || ''}
                        </Text>
                      </View>
                    )}
                    <View style={styles.metaItem}>
                      <Text style={styles.metaIcon}>⏱️</Text>
                      <Text style={styles.metaText}>
                        ~{bid.estimatedDuration} saat
                      </Text>
                    </View>
                  </View>

                  <View style={styles.jobFooter}>
                    <Text style={styles.jobDate}>
                      {new Date(bid.createdAt).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </Text>
                    {bid.status === 'PENDING' && (
                      <Button
                        title="Geri Çek"
                        onPress={() => handleWithdrawBid(bid.id)}
                        variant="secondary"
                        size="small"
                        style={styles.withdrawButton}
                        textStyle={styles.withdrawButtonText}
                      />
                    )}
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })
        ) : (
          currentJobs.map((job) => (
            <TouchableOpacity
              key={job.id}
              onPressIn={() => handleJobPressIn(job.id)}
              onPress={() => handleJobPress(job.id)}
              activeOpacity={0.7}
            >
              <Card style={styles.jobCard} elevated>
                <View style={styles.jobHeader}>
                  <View style={styles.jobTitleContainer}>
                    <Text style={styles.jobTitle} numberOfLines={2}>
                      {job.title}
                    </Text>
                    <View style={styles.jobBadgesContainer}>
                      <View
                        style={[
                          styles.urgencyBadge,
                          { backgroundColor: getUrgencyColor(job.urgencyLevel) + '20' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.urgencyText,
                            { color: getUrgencyColor(job.urgencyLevel) },
                          ]}
                        >
                          {getUrgencyText(job.urgencyLevel)}
                        </Text>
                      </View>
                      {/* Status Badge - Always show */}
                      <View
                        style={[
                          styles.urgencyBadge,
                          {
                            backgroundColor: (
                              job.status === 'OPEN' ? colors.primary :
                                job.status === 'IN_PROGRESS' ? colors.info :
                                  job.status === 'COMPLETED' ? colors.success :
                                    job.status === 'CANCELLED' ? colors.error :
                                      job.status === 'BIDDING' ? colors.warning :
                                        colors.textSecondary
                            ) + '20',
                            marginLeft: 6
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.urgencyText,
                            {
                              color: (
                                job.status === 'OPEN' ? colors.primary :
                                  job.status === 'IN_PROGRESS' ? colors.info :
                                    job.status === 'COMPLETED' ? colors.success :
                                      job.status === 'CANCELLED' ? colors.error :
                                        job.status === 'BIDDING' ? colors.warning :
                                          colors.textSecondary
                              )
                            },
                          ]}
                        >
                          {
                            job.status === 'OPEN' ? 'Açık' :
                              job.status === 'IN_PROGRESS' ? 'Devam Ediyor' :
                                job.status === 'COMPLETED' ? 'Tamamlandı' :
                                  job.status === 'CANCELLED' ? 'İptal Edildi' :
                                    job.status === 'BIDDING' ? 'Onay Bekliyor' :
                                      job.status
                          }
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                <Text style={styles.jobDescription} numberOfLines={2}>
                  {job.description}
                </Text>

                <View style={styles.jobMeta}>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaIcon}>📍</Text>
                    <Text style={styles.metaText}>
                      {job.location.district}, {job.location.city}
                    </Text>
                  </View>
                  {job.estimatedBudget && (
                    <View style={styles.metaItem}>
                      <Text style={styles.metaIcon}>💰</Text>
                      <Text style={styles.metaText}>
                        ~{typeof job.estimatedBudget === 'string'
                          ? parseFloat(job.estimatedBudget).toFixed(0)
                          : job.estimatedBudget} ₺
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.jobFooter}>
                  <View style={styles.footerLeft}>
                    <Text style={styles.bidCount}>
                      {job.bidCount} teklif
                    </Text>
                    <Text style={styles.viewCount}>
                      {job.viewCount} görüntüleme
                    </Text>
                  </View>
                  <Text style={styles.jobDate}>
                    {new Date(job.createdAt).toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </Text>
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  headerContainer: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
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
  scrollView: {
    flex: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.screenPadding,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    borderRadius: spacing.radius.md,
    padding: spacing.xs,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    ...typography.body2,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.white,
  },
  content: {
    padding: spacing.screenPadding,
    paddingBottom: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...typography.body2,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorCard: {
    padding: spacing.xl,
    alignItems: 'center',
    marginTop: spacing.xxl,
    backgroundColor: colors.errorLight + '20',
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  errorTitle: {
    ...typography.h4,
    color: colors.error,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  errorText: {
    ...typography.body2,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  retryButton: {
    marginTop: spacing.md,
  },
  jobCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  jobHeader: {
    marginBottom: spacing.sm,
  },
  jobTitleContainer: {
    flex: 1,
    gap: 4,
  },
  jobBadgesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  jobTitle: {
    ...typography.h6,
    color: colors.text,
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
  jobDescription: {
    ...typography.body2,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  jobMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.md,
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
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  footerLeft: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  bidCount: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  viewCount: {
    ...typography.caption,
    color: colors.textLight,
  },
  jobDate: {
    ...typography.caption,
    color: colors.textLight,
  },
  bidInfo: {
    marginBottom: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.primaryLight + '10',
    borderRadius: spacing.radius.sm,
  },
  bidAmountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  bidAmountLabel: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  bidAmount: {
    ...typography.h6,
    color: colors.primary,
    fontWeight: 'bold',
  },
  bidMessage: {
    ...typography.body2,
    color: colors.text,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  filterSection: {
    paddingHorizontal: spacing.screenPadding,
    marginBottom: spacing.sm,
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: spacing.radius.md,
    marginBottom: spacing.sm,
  },
  filterToggleText: {
    ...typography.body1,
    color: colors.text,
    fontWeight: '600',
  },
  filterBadge: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  filterBadgeText: {
    ...typography.caption,
    color: colors.white,
    fontWeight: '700',
    fontSize: 12,
  },
  filterCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  filterTitle: {
    ...typography.h6,
    color: colors.text,
    fontWeight: '700',
  },
  clearButton: {
    padding: spacing.xs,
  },
  clearButtonText: {
    ...typography.body2,
    color: colors.primary,
    fontWeight: '600',
  },
  applyFilterButton: {
    marginTop: spacing.sm,
  },
  withdrawButton: {
    marginLeft: 'auto',
    backgroundColor: colors.error + '10',
    minWidth: 80,
  },
  withdrawButtonText: {
    color: colors.error,
    fontWeight: '600',
    fontSize: 12,
  },
});
