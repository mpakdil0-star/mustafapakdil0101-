import React from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
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

    const specs = elec.specialties || elec.electricianProfile?.specialties || [];
    const specsStr = Array.isArray(specs) ? specs.join(' ').toLowerCase() : '';
    if (specsStr.includes('klima') || specsStr.includes('soğutma')) return 'Klima';
    if (specsStr.includes('çilingir') || specsStr.includes('anahtar') || specsStr.includes('kilit')) return 'Çilingir';
    if (specsStr.includes('beyaz eşya') || specsStr.includes('çamaşır') || specsStr.includes('buzdolabı')) return 'Beyaz Eşya';
    if (specsStr.includes('tesisat') || specsStr.includes('boru') || specsStr.includes('musluk')) return 'Tesisat';
    return 'Elektrik';
  };

  return (
    <View style={[styles.section, { paddingBottom: 10, marginTop: -6 }]}>
      {/* Premium Capsule Tab Switcher */}
      <View style={styles.modernTabSwitcherContainer}>
        <TouchableOpacity
          style={[styles.modernTabButton, activeHomeTab === 'ustalar' && styles.modernTabButtonActive]}
          onPress={() => setActiveHomeTab('ustalar')}
          activeOpacity={0.7}
        >
          <Text style={[styles.modernTabText, { color: activeHomeTab === 'ustalar' ? '#FFF' : colors.textSecondary }]}>
            ÖNE ÇIKAN USTALAR
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modernTabButton, activeHomeTab === 'ilanlar' && styles.modernTabButtonActive]}
          onPress={() => setActiveHomeTab('ilanlar')}
          activeOpacity={0.7}
        >
          <Text style={[styles.modernTabText, { color: activeHomeTab === 'ilanlar' ? '#FFF' : colors.textSecondary }]}>
            SON İŞ İLANLARI
          </Text>
        </TouchableOpacity>
      </View>

      {activeHomeTab === 'ustalar' && (
        <TouchableOpacity 
          style={{ alignSelf: 'flex-end', marginBottom: 8, paddingHorizontal: 4 }}
          onPress={() => router.push('/electricians')}
        >
          <Text style={{ color: '#0D9488', fontFamily: fonts.bold, fontSize: 11 }}>Tüm Ustalar &gt;</Text>
        </TouchableOpacity>
      )}

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
              <View key={elec.id} style={styles.featuredUstaCard}>
                {/* Top Row: Avatar + Info + Rating */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <View style={styles.featuredUstaAvatarBorder}>
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
                      <Text style={{ fontFamily: fonts.bold, fontSize: 15, color: colors.text }} numberOfLines={1}>{elec.fullName || 'Usta'}</Text>
                      {elec.isVerified === true && elec.electricianProfile?.verificationStatus === 'VERIFIED' && (
                        <Ionicons name="shield-checkmark" size={14} color="#10B981" />
                      )}
                    </View>
                    <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: '#64748B', marginTop: 2 }} numberOfLines={1}>{getUstaCategory(elec)}</Text>
                    <Text style={{ fontFamily: fonts.regular, fontSize: 11, color: '#94A3B8', marginTop: 1 }} numberOfLines={1}>{elec.locations?.[0] ? `${elec.locations[0].district || ''}, ${elec.locations[0].city || ''}`.replace(/^, /, '').replace(/, $/, '') || 'Türkiye' : 'Türkiye'}</Text>
                  </View>
                  <View style={styles.featuredUstaRatingBadge}>
                    <Ionicons name="star" size={12} color="#FBBF24" />
                    <Text style={styles.featuredUstaRatingText}>{Number(elec.electricianProfile?.ratingAverage || 0).toFixed(1)}</Text>
                  </View>
                </View>
                
                {/* Skill Chips */}
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                  <View style={styles.featuredUstaSkillChip}>
                    <Text style={styles.featuredUstaSkillText}>{getUstaCategory(elec)}</Text>
                  </View>
                  <View style={styles.featuredUstaSkillChip}>
                    <Text style={styles.featuredUstaSkillText}>{elec.electricianProfile?.totalReviews || 0} Değerlendirme</Text>
                  </View>
                </View>

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
                    colors={['#FBBF24', '#F59E0B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12, gap: 6 }}
                  >
                    <Text style={styles.featuredUstaProfileBtnText}>Profili Gör</Text>
                    <Ionicons name="arrow-forward" size={14} color="#FFF" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ))}
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
    marginVertical: 12,
    width: '100%',
  },
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
    paddingVertical: 3,
    borderRadius: 6,
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
});
