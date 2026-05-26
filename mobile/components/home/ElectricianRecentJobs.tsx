import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../../constants/typography';
import { colors as staticColors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { CountdownTimer } from '../common/CountdownTimer';

interface ElectricianRecentJobsProps {
  recentJobs: any[];
  colors: any;
  handleActionWithAuth: (route: string, params?: any) => void;
  mockExpire1: string;
  mockExpire2: string;
  mockExpire3: string;
}

export const ElectricianRecentJobs: React.FC<ElectricianRecentJobsProps> = ({
  recentJobs,
  colors,
  handleActionWithAuth,
  mockExpire1,
  mockExpire2,
  mockExpire3,
}) => {
  return (
    <View style={styles.section}>
      {/* İş İlanları Section Header */}
      <TouchableOpacity
        style={styles.sectionHeaderRow}
        activeOpacity={0.7}
        onPress={() => handleActionWithAuth('/(tabs)/jobs')}
      >
        <View style={styles.sectionTitleContainer}>
          <Text style={styles.sectionTitle}>İŞ İLANLARI</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
      </TouchableOpacity>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolsScrollContainer}>
        {recentJobs.length > 0 ? (
          recentJobs.slice(0, 5).map((job: any) => {
            const isUrgent = job.urgencyLevel === 'HIGH' || job.urgencyLevel === 'MEDIUM';
            const statusColor = isUrgent ? '#C2410C' : '#0284C7';
            const badgeBgColor = isUrgent ? '#FFEDD5' : '#E0F2FE';
            
            return (
              <TouchableOpacity
                key={job.id}
                style={[styles.hotLeadCard, isUrgent ? styles.glowPrimary : styles.glowAccent]}
                onPress={() => handleActionWithAuth(`/jobs/${job.id}`)}
                activeOpacity={0.85}
              >
                <View style={styles.hotLeadHeaderRow}>
                  <Text style={styles.hotLeadTitle} numberOfLines={1}>{job.title || 'İş İlanı'}</Text>
                  <View style={[styles.hotLeadUrgentBadge, { backgroundColor: badgeBgColor }]}>
                    <Ionicons name="time" size={10} color={statusColor} />
                    <Text style={[styles.hotLeadUrgentText, { color: statusColor }]}>
                      {isUrgent ? 'Acil' : 'Yeni'}
                    </Text>
                  </View>
                </View>

                <View style={styles.hotLeadLocationRow}>
                  <Ionicons name="location" size={12} color={colors.primary} />
                  <Text style={styles.hotLeadLocationText} numberOfLines={1}>
                    {job.location?.district ? `${job.location.district}, ` : ''}{job.location?.city || 'İstanbul'}
                  </Text>
                </View>

                {(job.expiresAt || job.earliestBidExpiresAt) && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8, paddingHorizontal: 2 }}>
                    <Ionicons name="time-outline" size={12} color="#D97706" />
                    <CountdownTimer 
                      expiresAt={job.expiresAt || job.earliestBidExpiresAt} 
                      minimal={true}
                      size="small"
                    />
                  </View>
                )}

                <View style={styles.hotLeadBottomRow}>
                  <View style={styles.hotLeadPriceCol}>
                    {job.estimatedBudget ? (
                      <>
                        <Text style={[styles.hotLeadPrice, { color: colors.primary }]}>
                          ₺{Number(job.estimatedBudget).toLocaleString('tr-TR')}
                        </Text>
                        <Text style={[styles.hotLeadPriceStatus, { color: isUrgent ? '#C2410C' : colors.textSecondary }]}>
                          {isUrgent ? ' - Acil!' : ' - Standart'}
                        </Text>
                      </>
                    ) : (
                      <Text style={[styles.hotLeadPriceStatus, { color: isUrgent ? '#C2410C' : colors.textSecondary }]}>
                        {isUrgent ? 'Acil İlan' : 'Standart İlan'}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={[styles.hotLeadActionBtn, { backgroundColor: colors.primary }]}
                    onPress={() => handleActionWithAuth(`/jobs/${job.id}`)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.hotLeadActionBtnText}>Teklif Ver</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <>
            {/* Mockup Job 1 */}
            <TouchableOpacity
              style={[styles.hotLeadCard, styles.glowPrimary]}
              onPress={() => handleActionWithAuth('/(tabs)/jobs')}
              activeOpacity={0.85}
            >
              <View style={styles.hotLeadHeaderRow}>
                <Text style={styles.hotLeadTitle} numberOfLines={1}>Acil Pano Arızası</Text>
                <View style={[styles.hotLeadUrgentBadge, { backgroundColor: '#FFEDD5' }]}>
                  <Ionicons name="time" size={10} color="#C2410C" />
                  <Text style={[styles.hotLeadUrgentText, { color: '#C2410C' }]}>14dk</Text>
                </View>
              </View>

              <View style={styles.hotLeadLocationRow}>
                <Ionicons name="location" size={12} color={colors.primary} />
                <Text style={styles.hotLeadLocationText} numberOfLines={1}>Kadıköy, 1.2km</Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8, paddingHorizontal: 2 }}>
                <Ionicons name="time-outline" size={12} color="#D97706" />
                <CountdownTimer 
                  expiresAt={mockExpire1} 
                  minimal={true}
                  size="small"
                />
              </View>

              <View style={styles.hotLeadBottomRow}>
                <View style={styles.hotLeadPriceCol}>
                  <Text style={[styles.hotLeadPrice, { color: colors.primary }]}>₺850</Text>
                  <Text style={[styles.hotLeadPriceStatus, { color: '#C2410C' }]}> - Acil!</Text>
                </View>
                <TouchableOpacity
                  style={[styles.hotLeadActionBtn, { backgroundColor: colors.primary }]}
                  onPress={() => handleActionWithAuth('/(tabs)/jobs')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.hotLeadActionBtnText}>Teklif Ver</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>

            {/* Mockup Job 2 */}
            <TouchableOpacity
              style={[styles.hotLeadCard, styles.glowAccent]}
              onPress={() => handleActionWithAuth('/(tabs)/jobs')}
              activeOpacity={0.85}
            >
              <View style={styles.hotLeadHeaderRow}>
                <Text style={styles.hotLeadTitle} numberOfLines={1}>Priz Değişimi</Text>
                <View style={[styles.hotLeadUrgentBadge, { backgroundColor: '#E0F2FE' }]}>
                  <Ionicons name="time" size={10} color="#0284C7" />
                  <Text style={[styles.hotLeadUrgentText, { color: '#0284C7' }]}>25dk</Text>
                </View>
              </View>

              <View style={styles.hotLeadLocationRow}>
                <Ionicons name="location" size={12} color={colors.primary} />
                <Text style={styles.hotLeadLocationText} numberOfLines={1}>Üsküdar, 2.5km</Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8, paddingHorizontal: 2 }}>
                <Ionicons name="time-outline" size={12} color="#D97706" />
                <CountdownTimer 
                  expiresAt={mockExpire2} 
                  minimal={true}
                  size="small"
                />
              </View>

              <View style={styles.hotLeadBottomRow}>
                <View style={styles.hotLeadPriceCol}>
                  <Text style={[styles.hotLeadPrice, { color: colors.primary }]}>₺350</Text>
                  <Text style={[styles.hotLeadPriceStatus, { color: colors.textSecondary }]}> - Standart</Text>
                </View>
                <TouchableOpacity
                  style={[styles.hotLeadActionBtn, { backgroundColor: colors.primary }]}
                  onPress={() => handleActionWithAuth('/(tabs)/jobs')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.hotLeadActionBtnText}>Teklif Ver</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>

            {/* Mockup Job 3 */}
            <TouchableOpacity
              style={[styles.hotLeadCard, styles.glowAccent]}
              onPress={() => handleActionWithAuth('/(tabs)/jobs')}
              activeOpacity={0.85}
            >
              <View style={styles.hotLeadHeaderRow}>
                <Text style={styles.hotLeadTitle} numberOfLines={1}>Aydınlatma Montajı</Text>
                <View style={[styles.hotLeadUrgentBadge, { backgroundColor: '#E0F2FE' }]}>
                  <Ionicons name="time" size={10} color="#0284C7" />
                  <Text style={[styles.hotLeadUrgentText, { color: '#0284C7' }]}>45dk</Text>
                </View>
              </View>

              <View style={styles.hotLeadLocationRow}>
                <Ionicons name="location" size={12} color={colors.primary} />
                <Text style={styles.hotLeadLocationText} numberOfLines={1}>Beşiktaş, 3.1km</Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8, paddingHorizontal: 2 }}>
                <Ionicons name="time-outline" size={12} color="#D97706" />
                <CountdownTimer 
                  expiresAt={mockExpire3} 
                  minimal={true}
                  size="small"
                />
              </View>

              <View style={styles.hotLeadBottomRow}>
                <View style={styles.hotLeadPriceCol}>
                  <Text style={[styles.hotLeadPrice, { color: colors.primary }]}>₺1,200</Text>
                  <Text style={[styles.hotLeadPriceStatus, { color: colors.textSecondary }]}> - Fırsat</Text>
                </View>
                <TouchableOpacity
                  style={[styles.hotLeadActionBtn, { backgroundColor: colors.primary }]}
                  onPress={() => handleActionWithAuth('/(tabs)/jobs')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.hotLeadActionBtnText}>Teklif Ver</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginVertical: spacing.md,
    paddingHorizontal: spacing.screenPadding,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    justifyContent: 'space-between',
  },
  sectionTitleContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fonts.bold,
    letterSpacing: 0.5,
  },
  toolsScrollContainer: {
    paddingRight: 16,
    gap: 12,
    paddingVertical: 4,
  },
  hotLeadCard: {
    width: 250,
    backgroundColor: staticColors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  glowPrimary: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  glowAccent: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  hotLeadHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  hotLeadTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: staticColors.text,
    flex: 1,
    marginRight: 8,
  },
  hotLeadUrgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  hotLeadUrgentText: {
    fontFamily: fonts.bold,
    fontSize: 9,
  },
  hotLeadLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  hotLeadLocationText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: staticColors.textSecondary,
  },
  hotLeadBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  hotLeadPriceCol: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  hotLeadPrice: {
    fontFamily: fonts.extraBold,
    fontSize: 16,
  },
  hotLeadPriceStatus: {
    fontFamily: fonts.bold,
    fontSize: 9,
  },
  hotLeadActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  hotLeadActionBtnText: {
    color: '#FFF',
    fontFamily: fonts.bold,
    fontSize: 11,
  },
});
