import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, TouchableOpacity, RefreshControl, Alert, Animated, Linking, InteractionManager, Platform } from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchJobs, fetchMyJobs } from '../../store/slices/jobSlice';
import { fetchMyBids } from '../../store/slices/bidSlice';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Picker } from '../../components/common/Picker';
import { colors as staticColors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';
import { useAppColors } from '../../hooks/useAppColors';
import { AuthGuardModal } from '../../components/common/AuthGuardModal';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import api from '../../services/api';
import { EmptyState } from '../../components/common/EmptyState';
import { LinearGradient } from 'expo-linear-gradient';
import { CITY_NAMES, getDistrictsByCity } from '../../constants/locations';
import { formatRelativeTime } from '../../utils/date';

type TabType = 'all' | 'my' | 'bids';

export default function JobsScreen() {
  const router = useRouter();
  const colors = useAppColors();
  const dispatch = useAppDispatch();
  const { jobs, myJobs, isLoading } = useAppSelector((state) => state.jobs);
  const { myBids, isLoading: isLoadingBids } = useAppSelector((state) => state.bids);
  const { user, isAuthenticated, guestRole } = useAppSelector((state) => state.auth);
  const isElectrician = user?.userType === 'ELECTRICIAN' || guestRole === 'ELECTRICIAN';

  const { tab } = useLocalSearchParams<{ tab: TabType }>();

  const isGuest = !isAuthenticated;
  const [activeTab, setActiveTab] = useState<TabType>(
    tab === 'bids' || tab === 'all' || tab === 'my'
      ? tab
      : (isElectrician ? 'all' : 'my')
  );
  const [citizenSubTab, setCitizenSubTab] = useState<'active' | 'history'>('active');

  useEffect(() => {
    if (tab && (tab === 'bids' || tab === 'all' || tab === 'my')) {
      setActiveTab(tab);
    }
  }, [tab]);

  // Filtreleme state'leri
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'urgent'>('newest');

  // GPS ve Radius state'leri
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedRadius, setSelectedRadius] = useState<number>(10);
  const radiusOptions = [2, 5, 10, 25, 50];

  const urgentPulseAnim = useRef(new Animated.Value(1)).current;

  // State for service areas loaded from API
  const [serviceAreasLoaded, setServiceAreasLoaded] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ path: string; params?: any } | null>(null);

  const handleActionWithAuth = (path: string, params?: any) => {
    if (!isAuthenticated) {
      setPendingAction({ path, params });
      setShowAuthModal(true);
      return;
    }
    router.push({ pathname: path as any, params });
  };


  // Auto-apply electrician's service areas as default filter on first load
  useFocusEffect(
    useCallback(() => {
      const fetchServiceAreas = async () => {
        if (isElectrician && isAuthenticated && !serviceAreasLoaded) {
          try {
            const response = await api.get('/locations');
            const locations = response.data.data || [];

            if (locations.length > 0) {
              // Get unique city from locations
              const firstLocation = locations[0];
              if (firstLocation.city) {
                setSelectedCity(firstLocation.city);
                // Get all districts from locations
                const districts = locations.map((loc: any) => loc.district).filter(Boolean);
                if (districts.length > 0) {
                  setSelectedDistricts(districts);
                }
              }
              setServiceAreasLoaded(true);
            }
          } catch (error) {
            console.error('Failed to fetch service areas:', error);
          }
        }
      };

      fetchServiceAreas();
    }, [isElectrician, isAuthenticated, serviceAreasLoaded])
  );


  useEffect(() => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(urgentPulseAnim, { toValue: 0.6, duration: 800, useNativeDriver: true }),
        Animated.timing(urgentPulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ]).start(() => pulse());
    };
    pulse();
  }, []);

  const loadJobs = useCallback(() => {
    // FIX: Use 'ACTIVE' to fetch both OPEN and BIDDING jobs
    const filters: any = { status: 'ACTIVE', limit: 20 };
    if (selectedCity) filters.city = selectedCity;
    if (selectedDistricts.length > 0) filters.districts = selectedDistricts;
    if (userLocation) {
      filters.lat = userLocation.lat;
      filters.lng = userLocation.lng;
      filters.radius = selectedRadius;
    }
    dispatch(fetchJobs(filters));
  }, [dispatch, selectedCity, selectedDistricts, userLocation, selectedRadius]);

  const loadMyJobs = useCallback(() => {
    dispatch(fetchMyJobs());
  }, [dispatch]);

  const loadMyBids = useCallback(() => {
    dispatch(fetchMyBids());
  }, [dispatch]);

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const toggleDistrict = (district: string) => {
    setSelectedDistricts(prev => {
      if (prev.includes(district)) {
        return prev.filter(d => d !== district);
      } else {
        return [...prev, district];
      }
    });
  };

  useFocusEffect(
    useCallback(() => {
      const task = InteractionManager.runAfterInteractions(() => {
        if (isElectrician || isGuest) {
          // Only load jobs after service areas are loaded (for electricians)
          // or immediately for guests
          if (!isElectrician || serviceAreasLoaded || !isAuthenticated) {
            loadJobs();
          }
          if (isAuthenticated && isElectrician) loadMyBids();
        } else if (isAuthenticated) {
          loadMyJobs();
        }
      });

      return () => task.cancel();
    }, [isAuthenticated, isElectrician, isGuest, loadJobs, loadMyBids, loadMyJobs, serviceAreasLoaded])
  );

  const handleJobPress = useCallback((jobId: string) => {
    router.push(`/jobs/${jobId}`);
  }, [router]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Elektrik Tesisatı': return 'construct-outline';
      case 'Aydınlatma': return 'bulb-outline';
      case 'Arıza / Onarım': return 'flash-outline';
      case 'İnternet / Diafon': return 'wifi-outline';
      default: return 'build-outline';
    }
  };

  const filteredJobs = useMemo(() => {
    let filtered = activeTab === 'all' ? jobs : activeTab === 'bids' ? [] : myJobs;

    if (!isElectrician && activeTab === 'my') {
      if (citizenSubTab === 'active') {
        filtered = filtered.filter(j => ['OPEN', 'ACCEPTED', 'IN_PROGRESS', 'BIDDING', 'PENDING_CONFIRMATION'].includes(j.status));
      } else {
        filtered = filtered.filter(j => ['COMPLETED', 'CANCELLED'].includes(j.status));
      }
    }

    return [...filtered].sort((a, b) => {
      if (sortBy === 'urgent') {
        const urgencyOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
        const diff = (urgencyOrder[a.urgencyLevel] || 3) - (urgencyOrder[b.urgencyLevel] || 3);
        if (diff !== 0) return diff;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [activeTab, jobs, myJobs, citizenSubTab, isElectrician, sortBy]);

  const renderEmptyState = () => {
    if (isGuest && activeTab === 'my') {
      return (
        <View style={styles.guestCardWrapper}>
          <Card style={styles.guestCard}>
            <View style={[styles.guestIconContainer, { backgroundColor: colors.primary + '10' }]}>
              <Ionicons name="document-text-outline" size={60} color={colors.primary} />
            </View>
            <Text style={[styles.guestTitle, { color: colors.text }]}>İlanlarınızı Yönetin</Text>
            <Text style={styles.guestSubtitle}>Giriş yaparak veya hesap oluşturarak ilk ilanınızı verebilirsiniz.</Text>
            <Button title="Giriş Yap / Kayıt Ol" onPress={() => setShowAuthModal(true)} variant="primary" fullWidth style={styles.guestButton} />
          </Card>
        </View>
      );
    }
    return (
      <EmptyState
        icon="document-text-outline"
        title="İlan Bulunamadı"
        description="Henüz bu kategoride bir ilan bulunmuyor."
        buttonTitle={isElectrician ? "İlanları Yenile" : "İlan Oluştur"}
        onButtonPress={isElectrician ? loadJobs : () => handleActionWithAuth('/jobs/create')}
      />
    );
  };

  return (
    <View style={styles.container}>
      <PremiumHeader
        title={isElectrician ? (activeTab === 'all' ? "Fırsat İlanları" : "Tekliflerim") : "Siparişlerim"}
        subtitle={isElectrician ? (activeTab === 'all' ? "Bölgendeki yeni iş fırsatlarını yakala" : "Verdiğin teklifleri buradan takip et") : "İşlerinin güncel durumunu takip et"}
        layout="tab"
        backgroundImage={require('../../assets/images/header_bg.png')}
      />

      <View style={styles.tabWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabContainer}
        >
          {isElectrician ? (
            <>
              <TouchableOpacity
                style={[styles.pillTab, activeTab === 'all' && [styles.pillTabActive, { backgroundColor: colors.primary, borderColor: colors.primary, shadowColor: colors.primary }]]}
                onPress={() => setActiveTab('all')}
                activeOpacity={0.8}
              >
                <Ionicons name="briefcase" size={16} color={activeTab === 'all' ? staticColors.white : '#64748B'} style={{ marginRight: 6 }} />
                <Text style={[styles.pillTabText, activeTab === 'all' && styles.pillTabTextActive]}>Tüm İlanlar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.pillTab, activeTab === 'bids' && [styles.pillTabActive, {
                  backgroundColor: colors.primary,
                  borderColor: colors.primary,
                  shadowColor: isElectrician ? colors.primary : (colors as any).shadowAmethyst || colors.primary
                }]]}
                onPress={() => setActiveTab('bids')}
                activeOpacity={0.8}
              >
                <Ionicons name="pricetag" size={16} color={activeTab === 'bids' ? staticColors.white : '#64748B'} style={{ marginRight: 6 }} />
                <Text style={[styles.pillTabText, activeTab === 'bids' && styles.pillTabTextActive]}>Tekliflerim</Text>
              </TouchableOpacity>
            </>
          ) : isAuthenticated && (
            <>
              <TouchableOpacity
                style={[styles.pillTab, citizenSubTab === 'active' && [styles.pillTabActive, { backgroundColor: colors.primary, borderColor: colors.primary, shadowColor: colors.primary }]]}
                onPress={() => setCitizenSubTab('active')}
                activeOpacity={0.8}
              >
                <Ionicons name="radio-button-on" size={16} color={citizenSubTab === 'active' ? staticColors.white : '#64748B'} style={{ marginRight: 6 }} />
                <Text style={[styles.pillTabText, citizenSubTab === 'active' && styles.pillTabTextActive]}>Aktif İşler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.pillTab, citizenSubTab === 'history' && [styles.pillTabActive, { backgroundColor: colors.primary, borderColor: colors.primary, shadowColor: colors.primary }]]}
                onPress={() => setCitizenSubTab('history')}
                activeOpacity={0.8}
              >
                <Ionicons name="time" size={16} color={citizenSubTab === 'history' ? staticColors.white : '#64748B'} style={{ marginRight: 6 }} />
                <Text style={[styles.pillTabText, citizenSubTab === 'history' && styles.pillTabTextActive]}>Geçmiş</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </View>

      {isElectrician && activeTab === 'all' && (
        <View style={styles.filterSection}>
          <TouchableOpacity
            onPress={() => setShowFilters(!showFilters)}
            activeOpacity={0.8}
            style={[styles.filterToggleWrapper, { shadowColor: colors.primary }]}
          >
            <LinearGradient
              colors={showFilters ? [colors.primary, colors.primaryDark] : ['#FFFFFF', '#F8FAFC']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.filterToggleBtn}
            >
              <View style={styles.filterToggleInner}>
                <View style={[styles.filterIconBox, { backgroundColor: showFilters ? 'rgba(255,255,255,0.2)' : colors.primary + '15' }]}>
                  <Ionicons name="options" size={18} color={showFilters ? staticColors.white : colors.primary} />
                </View>
                <View>
                  <Text style={[styles.filterToggleTitle, { color: showFilters ? staticColors.white : staticColors.textLight }]}>Bölge Seçimi</Text>
                  <Text style={[styles.filterToggleText, { color: showFilters ? staticColors.white : colors.text }]} numberOfLines={1}>
                    {selectedCity ? `${selectedCity}${selectedDistricts.length > 0 ? ` (${selectedDistricts.length} İlçe)` : ''}` : 'Türkiye Geneli'}
                  </Text>
                </View>
              </View>
              <Ionicons name={showFilters ? "chevron-up" : "chevron-down"} size={20} color={showFilters ? staticColors.white : staticColors.textLight} />
            </LinearGradient>
          </TouchableOpacity>

          {showFilters && (
            <View style={styles.filterOptionsContainer}>
              <View style={styles.pickerWrapper}>
                <Picker
                  label="Şehir"
                  value={selectedCity}
                  onValueChange={(value) => {
                    setSelectedCity(value);
                    setSelectedDistricts([]);
                  }}
                  options={['Tümü', ...CITY_NAMES]}
                  placeholder="Şehir Seçin"
                />
              </View>

              <View style={styles.districtsGrid}>
                {selectedCity && selectedCity !== 'Tümü' ? (
                  getDistrictsByCity(selectedCity).map((dist) => (
                    <TouchableOpacity
                      key={dist}
                      style={[
                        styles.districtChip,
                        selectedDistricts.includes(dist) && [styles.districtChipSelected, { backgroundColor: colors.primary, borderColor: colors.primary }]
                      ]}
                      onPress={() => toggleDistrict(dist)}
                    >
                      <Text style={[
                        styles.districtChipText,
                        selectedDistricts.includes(dist) && styles.districtChipTextSelected
                      ]}>{dist}</Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.noCityText}>Lütfen önce şehir seçiniz</Text>
                )}
              </View>

              <View style={styles.filterActions}>
                <TouchableOpacity
                  style={styles.resetBtn}
                  onPress={() => {
                    setSelectedCity('');
                    setSelectedDistricts([]);
                    setShowFilters(false);
                  }}
                >
                  <Text style={styles.resetBtnText}>Temizle</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.applyBtn, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
                  onPress={() => {
                    loadJobs();
                    setShowFilters(false);
                  }}
                >
                  <Text style={styles.applyBtnText}>Uygula</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}

      <FlatList
        data={activeTab === 'bids' ? (myBids as any[]) : (filteredJobs as any[])}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading || isLoadingBids} onRefresh={() => activeTab === 'all' ? loadJobs() : activeTab === 'bids' ? loadMyBids() : loadMyJobs()} />}
        ListEmptyComponent={renderEmptyState}
        renderItem={({ item }) => {
          if (activeTab === 'bids') {
            const bid = item as any;
            const job = bid.jobPost;
            const isPendingConfirm = job?.status === 'PENDING_CONFIRMATION';
            const isCompleted = job?.status === 'COMPLETED';

            const statusColor = bid.status === 'ACCEPTED'
              ? (isPendingConfirm ? '#F59E0B' : '#10B981')
              : (bid.status === 'REJECTED' ? '#EF4444' : colors.primary);

            const getBidStatusLabel = () => {
              if (bid.status === 'REJECTED') return 'REDDEDİLDİ';
              if (bid.status === 'ACCEPTED') {
                if (isCompleted) return 'TAMAMLANDI';
                if (isPendingConfirm) return 'ONAY BEKLİYOR';
                return 'İŞ SİZE ATANDI';
              }
              return 'TEKLİF VERİLDİ';
            };

            return (
              <TouchableOpacity onPress={() => handleJobPress(job.id)} activeOpacity={0.9}>
                <Card variant="default" style={styles.jobGlassCard}>
                  <View style={[styles.statusLine, { backgroundColor: statusColor }]} />
                  <View style={styles.cardHeader}>
                    <View style={styles.categoryRow}>
                      <View style={[styles.miniIconBox, { backgroundColor: statusColor + '15' }]}>
                        <Ionicons name={getCategoryIcon(job.category)} size={16} color={statusColor} />
                      </View>
                      <Text style={[styles.statusText, { color: statusColor }]}>
                        {getBidStatusLabel()}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.jobTitleText} numberOfLines={1}>{job.title}</Text>
                </Card>
              </TouchableOpacity>
            );
          }

          const job = item as any;
          const isUrgent = job.urgencyLevel === 'HIGH';
          const bidCount = (job as any).bidCount || 0;
          const isAssigned = !!job.assignedElectricianId;
          const isPendingConfirm = job.status === 'PENDING_CONFIRMATION';
          const accentColor = isPendingConfirm ? '#F59E0B' : (isAssigned || job.status === 'COMPLETED' ? colors.success : colors.primary);

          const getJobStatusLabel = () => {
            if (job.status === 'COMPLETED') return 'Tamamlandı';
            if (job.status === 'CANCELLED') return 'İptal Edildi';
            if (job.status === 'PENDING_CONFIRMATION') {
              return isElectrician ? 'Onay Bekliyor' : 'İş Bitti, Onaylayın';
            }
            const isAssignedToMe = isElectrician && user?.id && String(job.assignedElectricianId) === String(user.id);

            if (isAssigned) {
              if (isElectrician) {
                return isAssignedToMe ? 'İş Size Atandı' : 'Usta Seçildi';
              }
              return 'Usta Seçildi';
            }

            if (bidCount > 0) {
              return isElectrician ? `${bidCount} Teklif` : 'Teklifleri İnceleyin';
            }

            return 'Teklif Bekliyor';
          };

          return (
            <TouchableOpacity onPress={() => handleJobPress(job.id)} activeOpacity={0.9}>
              <Card variant="default" style={[
                styles.jobGlassCard,
                !isElectrician && { shadowColor: (colors as any).shadowAmethyst || colors.primary }
              ]}>
                <View style={[styles.statusLine, { backgroundColor: accentColor }]} />
                <View style={styles.cardHeader}>
                  <View style={styles.categoryRow}>
                    <View style={[styles.miniIconBox, { backgroundColor: accentColor + '10' }]}>
                      <Ionicons name={getCategoryIcon(job.category)} size={16} color={accentColor} />
                    </View>
                    <Text style={[styles.categoryLabel, { color: accentColor }]}>{getJobStatusLabel()}</Text>
                  </View>
                  {isUrgent && (
                    <Animated.View style={[styles.urgentGlowBadge, { opacity: urgentPulseAnim }]}>
                      <LinearGradient colors={['#EF4444', '#DC2626']} style={styles.urgentGradient}>
                        <Ionicons name="flash" size={12} color={staticColors.white} />
                        <Text style={styles.urgentBadgeText}>ACİL</Text>
                      </LinearGradient>
                    </Animated.View>
                  )}
                  {job.estimatedBudget && (
                    <View style={[styles.budgetPill, { backgroundColor: colors.primary + '15' }]}>
                      <Text style={[styles.budgetValueText, { color: colors.primary }]}>
                        {(parseFloat(job.estimatedBudget) || 0).toFixed(0)} ₺
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.jobTitleText} numberOfLines={1}>{job.title}</Text>
                <Text style={styles.jobDescText} numberOfLines={1}>{job.description}</Text>
                <View style={styles.cardFooter}>
                  <View style={styles.metaInfoRow}>
                    <Ionicons name="location-sharp" size={12} color={colors.primary} />
                    <Text style={styles.metaInfoText}>{job.location?.district || 'Konum Yok'}</Text>
                  </View>
                  <View style={styles.metaInfoRow}>
                    <Ionicons name="time-outline" size={12} color={staticColors.textLight} />
                    <Text style={styles.metaInfoText}>{formatRelativeTime(job.createdAt)}</Text>
                  </View>
                </View>

                {(activeTab === 'all' || (activeTab === 'my' && citizenSubTab === 'active')) && (
                  <View style={styles.jobCardActions}>
                    {isAssigned && job.status !== 'OPEN' ? (
                      <>
                        <TouchableOpacity style={[styles.actionBtnSmall, { borderColor: colors.primary + '30' }]} onPress={async () => {
                          const resp = await api.get(`/conversations/find?jobId=${job.id}&electricianId=${job.assignedElectricianId}`);
                          if (resp.data.data) router.push(`/messages/${resp.data.data.id}`);
                        }}>
                          <Ionicons name="chatbubbles" size={16} color={colors.primary} />
                          <Text style={[styles.actionBtnTextSmall, { color: colors.primary }]}>Mesaj</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionBtnSmall, { borderColor: staticColors.success + '30' }]} onPress={() => handleCall((job as any).assignedElectrician?.phone)}>
                          <Ionicons name="call" size={16} color={staticColors.success} />
                          <Text style={[styles.actionBtnTextSmall, { color: staticColors.success }]}>Ara</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <TouchableOpacity style={styles.actionBtnFull} onPress={() => handleJobPress(job.id)}>
                        <LinearGradient
                          colors={isElectrician ? [colors.primary + '15', colors.primary + '08'] : [(colors as any).glassLavender || '#F5F3FF', '#FFFFFF']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={[styles.actionBtnGradient, !isElectrician && { borderColor: (colors as any).borderAmethyst || 'rgba(167, 139, 250, 0.3)', borderWidth: 1 }]}
                        >
                          <Text style={[styles.actionBtnTextFull, { color: colors.primary }]}>
                            {bidCount > 0 ? "Teklifleri Gör" : "Detaylar"}
                          </Text>
                          <Ionicons name="arrow-forward-circle" size={18} color={colors.primary} />
                        </LinearGradient>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </Card>
            </TouchableOpacity>
          );
        }}
        initialNumToRender={6}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        updateCellsBatchingPeriod={50}
      />
      <AuthGuardModal
        visible={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLogin={() => {
          setShowAuthModal(false);
          router.push('/(auth)/login');
        }}
        onRegister={() => {
          setShowAuthModal(false);
          router.push({
            pathname: '/(auth)/register',
            params: {
              ...(pendingAction ? { redirectTo: pendingAction.path } : {}),
              initialRole: isElectrician ? 'ELECTRICIAN' : 'CITIZEN',
            }
          });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  tabWrapper: { backgroundColor: staticColors.white, paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  tabContainer: { flexDirection: 'row', paddingHorizontal: 12, gap: 12 },
  pillTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pillTabActive: {
    elevation: 4,
  },
  pillTabText: { fontFamily: fonts.semiBold, fontSize: 13, color: '#64748B' },
  pillTabTextActive: { color: staticColors.white, fontFamily: fonts.bold },

  listContent: { padding: 16, paddingBottom: 100, flexGrow: 1 },
  jobGlassCard: { borderRadius: 24, padding: 18, marginBottom: 16, backgroundColor: staticColors.white, elevation: 2, overflow: 'hidden' },
  statusLine: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  miniIconBox: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  categoryLabel: { fontFamily: fonts.extraBold, fontSize: 13, textTransform: 'uppercase' },
  jobTitleText: { fontFamily: fonts.extraBold, fontSize: 19, marginBottom: 6 },
  jobDescText: { fontFamily: fonts.medium, fontSize: 14, color: '#475569', marginBottom: 14, lineHeight: 20 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 },
  metaInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaInfoText: { fontFamily: fonts.semiBold, fontSize: 13, color: '#64748B' },
  jobCardActions: { flexDirection: 'row', marginTop: 14, gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  actionBtnSmall: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: staticColors.white, paddingVertical: 10, borderRadius: 12, borderWidth: 1, gap: 6 },
  actionBtnTextSmall: { fontFamily: fonts.bold, fontSize: 13 },
  actionBtnFull: { flex: 1, height: 48, borderRadius: 14, overflow: 'hidden' },
  actionBtnGradient: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  actionBtnTextFull: { fontFamily: fonts.bold, fontSize: 14 },
  urgentGlowBadge: { borderRadius: 8, overflow: 'hidden' },
  urgentGradient: { paddingHorizontal: 8, paddingVertical: 4 },
  urgentBadgeText: { fontFamily: fonts.bold, fontSize: 10, color: staticColors.white },
  statusText: { fontFamily: fonts.bold, fontSize: 11 },
  budgetPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  budgetValueText: { fontFamily: fonts.bold, fontSize: 13 },
  guestCardWrapper: { width: '100%', alignItems: 'center' },
  guestCard: { width: '100%', padding: 24, alignItems: 'center', borderRadius: 24, backgroundColor: staticColors.white },
  guestIconContainer: { marginBottom: 16, padding: 16, borderRadius: 40 },
  guestTitle: { fontFamily: fonts.extraBold, fontSize: 20, textAlign: 'center', marginBottom: 8 },
  guestSubtitle: { fontFamily: fonts.medium, fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 24 },
  guestButton: { borderRadius: 14 },
  filterSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  filterToggleWrapper: {
    borderRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  filterToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  filterIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterToggleInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterToggleTitle: {
    fontFamily: fonts.medium,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterToggleText: {
    fontFamily: fonts.extraBold,
    fontSize: 15,
  },
  filterOptionsContainer: {
    marginTop: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
  },
  pickerWrapper: {
    marginBottom: 16,
  },
  districtsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
    marginBottom: 16,
  },
  districtChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  districtChipSelected: {
    elevation: 4,
  },
  districtChipText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: '#64748B',
  },
  districtChipTextSelected: {
    color: staticColors.white,
    fontFamily: fonts.bold,
  },
  noCityText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: staticColors.textLight,
    padding: 10,
    textAlign: 'center',
    width: '100%',
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  resetBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  resetBtnText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: '#64748B',
  },
  applyBtn: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  applyBtnText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: staticColors.white,
  },
});
