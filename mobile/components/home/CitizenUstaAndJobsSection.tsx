import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { fonts } from '../../constants/typography';
import { colors as staticColors } from '../../constants/colors';
import { getFileUrl } from '../../constants/api';
import { CountdownTimer } from '../common/CountdownTimer';

interface CitizenUstaAndJobsSectionProps {
  activeHomeTab: 'ustalar' | 'ilanlar';
  setActiveHomeTab: (tab: 'ustalar' | 'ilanlar') => void;
  isLoadingRecentJobs: boolean;
  recentJobs: any[];
  isLoadingElectricians: boolean;
  featuredElectricians: any[];
  colors: any;
  isAuthenticated: boolean;
  onAuthRequired: () => void;
}

export const CitizenUstaAndJobsSection: React.FC<CitizenUstaAndJobsSectionProps> = ({
  activeHomeTab,
  setActiveHomeTab,
  isLoadingRecentJobs,
  recentJobs,
  isLoadingElectricians,
  featuredElectricians,
  colors,
  isAuthenticated,
  onAuthRequired,
}) => {
  const router = useRouter();

  const getUstaCategory = (elec: any) => {
    const cat = elec.serviceCategory || elec.electricianProfile?.serviceCategory;
    if (cat === 'cilingir') return 'Çilingir';
    if (cat === 'klima') return 'Klima';
    if (cat === 'beyaz-esya') return 'Beyaz Eşya';
    if (cat === 'tesisat') return 'Tesisat';
    if (cat === 'elektrik') return 'Elektrik';
    if (cat === 'temizlik') return 'Temizlik';
    if (cat === 'nakliyat') return 'Nakliyat';
    if (cat === 'boya-badana') return 'Boya Badana';
    if (cat === 'koltuk-hali') return 'Koltuk/Halı Yıkama';
    if (cat === 'mobilya-montaj') return 'Mobilya Montaj';
    if (cat === 'kucuk-nakliye') return 'Küçük Nakliye';
    if (cat === 'kombi-servis') return 'Kombi Servisi';
    if (cat === 'asansor') return 'Asansör Bakım';
    if (cat === 'bocek-ilaclama') return 'Böcek İlaçlama';
    if (cat === 'guvenlik-kamera') return 'Güvenlik Kamera';

    const specs = elec.specialties || elec.electricianProfile?.specialties || [];
    const specsStr = Array.isArray(specs) ? specs.join(' ').toLowerCase() : '';
    if (specsStr.includes('klima') || specsStr.includes('soğutma')) return 'Klima';
    if (specsStr.includes('çilingir') || specsStr.includes('anahtar') || specsStr.includes('kilit')) return 'Çilingir';
    if (specsStr.includes('beyaz eşya') || specsStr.includes('çamaşır') || specsStr.includes('buzdolabı')) return 'Beyaz Eşya';
    if (specsStr.includes('tesisat') || specsStr.includes('boru') || specsStr.includes('musluk')) return 'Tesisat';
    return 'Elektrik';
  };

  const getVisibleMetrics = (elec: any) => {
    const rating = Number(elec.electricianProfile?.ratingAverage || 0);
    const reviews = Number(elec.electricianProfile?.totalReviews || 0);
    const completedJobs = Number(elec.electricianProfile?.completedJobs || elec.completedJobs || 0);

    return [
      { key: 'rating', value: rating.toFixed(1), numericValue: rating, label: 'puan', icon: 'star' as const, color: '#D97706' },
      { key: 'reviews', value: String(reviews), numericValue: reviews, label: 'yorum', icon: 'chatbubble-ellipses-outline' as const, color: '#0F766E' },
      { key: 'jobs', value: String(completedJobs), numericValue: completedJobs, label: 'iş', icon: 'checkmark-done-outline' as const, color: '#059669' },
    ].filter(metric => metric.numericValue > 0);
  };

  return (
    <View style={styles.section}>
      {/* Premium Capsule Tab Switcher */}
      <View style={styles.modernTabSwitcherContainer}>
        <TouchableOpacity
          style={[
            styles.modernTabButton,
            activeHomeTab === 'ustalar' && [styles.modernTabButtonActive, { backgroundColor: colors.primary, shadowColor: colors.primary }]
          ]}
          onPress={() => setActiveHomeTab('ustalar')}
          activeOpacity={0.7}
        >
          <Text style={[styles.modernTabText, { color: activeHomeTab === 'ustalar' ? '#FFF' : colors.textSecondary }]}>
            Öne Çıkan Ustalar
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.modernTabButton,
            activeHomeTab === 'ilanlar' && [styles.modernTabButtonActive, { backgroundColor: colors.primary, shadowColor: colors.primary }]
          ]}
          onPress={() => setActiveHomeTab('ilanlar')}
          activeOpacity={0.7}
        >
          <Text style={[styles.modernTabText, { color: activeHomeTab === 'ilanlar' ? '#FFF' : colors.textSecondary }]}>
            Son İş İlanları
          </Text>
        </TouchableOpacity>
      </View>

      {activeHomeTab === 'ilanlar' ? (
        isLoadingRecentJobs ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={{ marginTop: 10, color: staticColors.textSecondary, fontFamily: fonts.medium }}>
              İlanlar yükleniyor...
            </Text>
          </View>
        ) : recentJobs.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentJobsHorizontalScroller}>
            {recentJobs.map((job) => (
              <TouchableOpacity
                key={job.id}
                style={styles.recentJobCardHorizontal}
                onPress={() => {
                  if (!isAuthenticated) {
                    onAuthRequired();
                    return;
                  }
                  router.push(`/jobs/${job.id}`);
                }}
                activeOpacity={0.85}
              >
                <View style={styles.recentJobUserAvatar}>
                  {job.citizen?.profileImageUrl ? (
                    <Image source={{ uri: getFileUrl(job.citizen.profileImageUrl) || '' }} style={{ width: '100%', height: '100%', borderRadius: 16 }} />
                  ) : (
                    <Ionicons name="person" size={28} color={colors.primary} />
                  )}
                </View>
                
                <View style={styles.recentJobInfoHorizontal}>
                  <View style={styles.recentJobHeaderHorizontal}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={styles.recentJobTitleHorizontal} numberOfLines={1}>
                        {job.serviceCategory ? getUstaCategory({ serviceCategory: job.serviceCategory }) : 'Genel'}
                      </Text>
                      <Text style={styles.recentJobSubtextHorizontal} numberOfLines={1}>{job.title}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                        <Ionicons name="location-outline" size={10} color={staticColors.textLight} style={{ marginRight: 2 }} />
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
                    <Ionicons name="chatbubble-ellipses-outline" size={12} color="#059669" style={{ marginRight: 4 }} />
                    <Text style={styles.bidStatProfessionalNumber}>{job.bidCount || 0}</Text>
                    <Text style={styles.bidStatProfessionalLabel}>TEKLİF</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}

            {/* "Tüm İlanları Gör" End Card */}
            <TouchableOpacity
              style={[
                styles.seeAllUstaEndCard,
                {
                  borderColor: colors.primary + '30',
                }
              ]}
              onPress={() => router.push('/(tabs)/jobs')}
              activeOpacity={0.8}
            >
              <View style={[styles.seeAllUstaIconCircle, { backgroundColor: colors.primary + '12' }]}>
                <Ionicons name="arrow-forward" size={24} color={colors.primary} />
              </View>
              <Text style={[styles.seeAllUstaEndCardText, { color: colors.primary }]}>
                Tüm İlanları Gör
              </Text>
              <Text style={styles.seeAllUstaEndCardSubtext}>
                Tüm fırsatları incele
              </Text>
            </TouchableOpacity>
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
              <View 
                key={elec.id} 
                style={[
                  styles.featuredUstaCard,
                  {
                    shadowColor: colors.primary,
                    borderColor: 'rgba(0,0,0,0.06)'
                  }
                ]}
              >
                <View style={[styles.featuredUstaAccent, { backgroundColor: colors.primary }]} />
                {/* Identity and service information */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <View style={[styles.featuredUstaAvatarBorder, { borderColor: colors.primary }]}>
                    <View style={styles.featuredUstaAvatarInner}>
                      {elec.profileImageUrl ? (
                        <Image source={{ uri: getFileUrl(elec.profileImageUrl) || '' }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      ) : (
                        <Ionicons name="person" size={24} color="#94A3B8" />
                      )}
                    </View>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.text }} numberOfLines={1} maxFontSizeMultiplier={1.2}>{elec.fullName || 'Usta'}</Text>
                      {elec.isVerified === true && elec.electricianProfile?.verificationStatus === 'VERIFIED' && (
                        <Ionicons name="shield-checkmark" size={14} color="#10B981" />
                      )}
                    </View>
                    <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.textSecondary || '#64748B', marginTop: 2 }} numberOfLines={1} maxFontSizeMultiplier={1.15}>{getUstaCategory(elec)}</Text>
                    <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: colors.textLight || '#94A3B8', marginTop: 1 }} numberOfLines={1}>{elec.locations?.[0] ? `${elec.locations[0].district || ''}, ${elec.locations[0].city || ''}`.replace(/^, /, '').replace(/, $/, '') || 'Türkiye' : 'Türkiye'}</Text>
                  </View>
                </View>

                {/* Zero values add noise and reduce trust. Show only meaningful metrics. */}
                {getVisibleMetrics(elec).length > 0 ? (
                  <View style={styles.featuredUstaMetricsRow}>
                    {getVisibleMetrics(elec).map((metric, index) => (
                      <React.Fragment key={metric.key}>
                        {index > 0 && <View style={styles.featuredUstaMetricDivider} />}
                        <View style={styles.featuredUstaMetric}>
                          <Ionicons name={metric.icon} size={13} color={metric.color} />
                          <Text style={styles.featuredUstaMetricValue}>{metric.value}</Text>
                          <Text style={styles.featuredUstaMetricLabel}>{metric.label}</Text>
                        </View>
                      </React.Fragment>
                    ))}
                  </View>
                ) : (
                  <View style={styles.featuredUstaEmptyMetrics}>
                    <Ionicons name="sparkles-outline" size={13} color="#0F766E" />
                    <Text style={styles.featuredUstaEmptyMetricsText}>Henüz değerlendirme bulunmuyor</Text>
                  </View>
                )}

                {/* Profile Button */}
                <TouchableOpacity
                  style={styles.featuredUstaProfileBtn}
                  activeOpacity={0.85}
                  onPress={() => {
                    if (!isAuthenticated) {
                      onAuthRequired();
                      return;
                    }
                    router.push(`/electricians/${elec.id}`);
                  }}
                >
                  <LinearGradient
                    colors={colors.primaryGradient || ['#0D9488', '#2DD4BF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.profileBtnGradient}
                  >
                    <Text style={styles.featuredUstaProfileBtnText}>Profili Gör</Text>
                    <Ionicons name="arrow-forward" size={14} color="#FFF" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ))}

            {/* "Tüm Ustaları Gör" End Card */}
            <TouchableOpacity
              style={[
                styles.seeAllUstaEndCard,
                {
                  borderColor: colors.primary + '30',
                }
              ]}
              onPress={() => router.push('/electricians')}
              activeOpacity={0.8}
            >
              <View style={[styles.seeAllUstaIconCircle, { backgroundColor: colors.primary + '12' }]}>
                <Ionicons name="arrow-forward" size={24} color={colors.primary} />
              </View>
              <Text style={[styles.seeAllUstaEndCardText, { color: colors.primary }]}>
                Tüm Ustaları Gör
              </Text>
              <Text style={styles.seeAllUstaEndCardSubtext}>
                Uzman ustaları incele
              </Text>
            </TouchableOpacity>
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
  );
};

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    width: '100%',
  },
  modernTabSwitcherContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    borderRadius: 14,
    padding: 3,
    marginBottom: 9,
  },
  modernTabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
    justifyContent: 'center',
  },
  modernTabButtonActive: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  modernTabText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    letterSpacing: 0.05,
  },
  seeAllUstaEndCard: {
    width: 155,
    borderRadius: 20,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
  },
  seeAllUstaIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  seeAllUstaEndCardText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 2,
  },
  seeAllUstaEndCardSubtext: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'center',
  },
  recentJobsHorizontalScroller: {
    paddingRight: 16,
    gap: 12,
    paddingVertical: 6,
  },
  recentJobCardHorizontal: {
    width: 325,
    flexDirection: 'row',
    backgroundColor: staticColors.white,
    borderRadius: 18,
    padding: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    alignItems: 'flex-start',
  },
  recentJobUserAvatar: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    fontSize: 14.5,
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
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  bidStatProfessionalNumber: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: '#047857',
    marginRight: 2,
  },
  bidStatProfessionalLabel: {
    fontFamily: fonts.medium,
    fontSize: 8.5,
    color: '#047857',
  },
  featuredUstaCard: {
    width: 276,
    backgroundColor: staticColors.white,
    borderRadius: 20,
    padding: 14,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    overflow: 'hidden',
  },
  featuredUstaAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  featuredUstaAvatarBorder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    padding: 2,
  },
  featuredUstaAvatarInner: {
    width: '100%',
    height: '100%',
    borderRadius: 23,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredUstaRatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 3,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  featuredUstaRatingText: {
    fontFamily: fonts.extraBold,
    fontSize: 12.5,
    color: '#B45309',
  },
  featuredUstaSkillChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  featuredUstaSkillText: {
    fontFamily: fonts.bold,
    fontSize: 10.5,
  },
  featuredUstaMetricsRow: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 7,
    marginBottom: 9,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#EEF2F6',
  },
  featuredUstaMetric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  featuredUstaMetricValue: {
    color: '#1E293B',
    fontFamily: fonts.extraBold,
    fontSize: 11.5,
  },
  featuredUstaMetricLabel: {
    color: '#94A3B8',
    fontFamily: fonts.medium,
    fontSize: 8.5,
  },
  featuredUstaMetricDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#E2E8F0',
  },
  featuredUstaEmptyMetrics: {
    minHeight: 34,
    marginBottom: 9,
    borderRadius: 11,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  featuredUstaEmptyMetricsText: {
    color: '#64748B',
    fontFamily: fonts.medium,
    fontSize: 9.5,
  },
  featuredUstaProfileBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  profileBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
  },
  featuredUstaProfileBtnText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: '#FFF',
    letterSpacing: 0.3,
  },
});
