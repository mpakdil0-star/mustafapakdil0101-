import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../../constants/typography';
import { spacing } from '../../constants/spacing';
import { CountdownTimer } from '../common/CountdownTimer';
import { SERVICE_CATEGORIES } from '../../constants/serviceCategories';

interface ElectricianRecentJobsProps {
  recentJobs: any[];
  colors: any;
  handleActionWithAuth: (route: string, params?: any) => void;
}

const getCategoryName = (job: any) => {
  const categoryId = job?.serviceCategory || job?.service_category;
  const mainCategory = SERVICE_CATEGORIES.find((category) => category.id === categoryId);
  return job?.category || mainCategory?.name || 'Genel hizmet';
};

const getLocationText = (job: any) => {
  const district = job?.location?.district || job?.district;
  const city = job?.location?.city || job?.city;
  if (district && city) return `${district}, ${city}`;
  return district || city || 'Konum belirtilmedi';
};

export const ElectricianRecentJobs: React.FC<ElectricianRecentJobsProps> = ({
  recentJobs,
  colors,
  handleActionWithAuth,
}) => {
  return (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.sectionHeader}
        activeOpacity={0.75}
        onPress={() => handleActionWithAuth('/(tabs)/jobs')}
      >
        <View style={styles.headerCopy}>
          <Text style={[styles.sectionTitle, { color: colors.text }]} maxFontSizeMultiplier={1.2}>Size uygun işler</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]} maxFontSizeMultiplier={1.15}>
            Hizmet alanınıza göre yayınlanan güncel ilanlar
          </Text>
        </View>
        <View style={[styles.allJobsButton, { backgroundColor: colors.primary + '10' }]}>
          <Text style={[styles.allJobsText, { color: colors.primary }]} maxFontSizeMultiplier={1.1}>Tümü</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </View>
      </TouchableOpacity>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {recentJobs.length > 0 ? (
          recentJobs.slice(0, 5).map((job: any) => {
            const isUrgent = job.urgencyLevel === 'HIGH';
            const isPriority = job.urgencyLevel === 'MEDIUM';
            const createdAt = job.createdAt || job.created_at;
            const isNew = createdAt
              ? Date.now() - new Date(createdAt).getTime() <= 24 * 60 * 60 * 1000
              : false;
            const expiresAt = job.expiresAt || job.earliestBidExpiresAt;
            const statusLabel = isUrgent ? 'Acil' : isPriority ? 'Öncelikli' : isNew ? 'Yeni' : 'Açık';
            const statusColor = isUrgent ? '#C2410C' : isPriority ? '#B45309' : '#047857';
            const statusBackground = isUrgent ? '#FFF7ED' : isPriority ? '#FFFBEB' : '#ECFDF5';

            return (
              <TouchableOpacity
                key={job.id}
                style={styles.jobCard}
                onPress={() => handleActionWithAuth(`/jobs/${job.id}`)}
                activeOpacity={0.84}
              >
                <View style={styles.cardTopRow}>
                  <View style={[styles.categoryBadge, { backgroundColor: colors.primary + '10' }]}>
                    <Ionicons name="construct-outline" size={11} color={colors.primary} />
                    <Text style={[styles.categoryText, { color: colors.primary }]} numberOfLines={1} maxFontSizeMultiplier={1.1}>
                      {getCategoryName(job)}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusBackground }]}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {statusLabel}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.jobTitle, { color: colors.text }]} numberOfLines={2} maxFontSizeMultiplier={1.15}>
                  {job.title || 'İş ilanı'}
                </Text>

                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={13} color="#64748B" />
                  <Text style={styles.locationText} numberOfLines={1} maxFontSizeMultiplier={1.1}>
                    {getLocationText(job)}
                  </Text>
                </View>

                <View style={styles.cardFooter}>
                  <View style={styles.priceBlock}>
                    <Text style={styles.priceLabel}>Tahmini bütçe</Text>
                    <Text style={[styles.priceValue, { color: colors.primary }]} numberOfLines={1} maxFontSizeMultiplier={1.1}>
                      {job.estimatedBudget
                        ? `₺${Number(job.estimatedBudget).toLocaleString('tr-TR')}`
                        : 'Belirtilmedi'}
                    </Text>
                  </View>

                  <View style={styles.footerRight}>
                    {expiresAt && (
                      <View style={styles.timerRow}>
                        <Ionicons name="time-outline" size={12} color="#D97706" />
                        <CountdownTimer expiresAt={expiresAt} minimal={true} size="small" />
                      </View>
                    )}
                    <View style={[styles.inspectButton, { backgroundColor: colors.primary }]}>
                      <Text style={styles.inspectButtonText}>İncele</Text>
                      <Ionicons name="arrow-forward" size={12} color="#FFFFFF" />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <TouchableOpacity
            style={styles.emptyCard}
            onPress={() => handleActionWithAuth('/(tabs)/jobs')}
            activeOpacity={0.84}
          >
            <View style={[styles.emptyIcon, { backgroundColor: colors.primary + '10' }]}>
              <Ionicons name="briefcase-outline" size={23} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Şu anda uygun ilan yok</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Yeni ilanlar yayınlandığında burada görünecek.</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.md,
    marginBottom: 8,
    paddingHorizontal: spacing.screenPadding,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 11,
  },
  headerCopy: {
    flex: 1,
    paddingRight: 10,
  },
  sectionTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 17,
    letterSpacing: -0.25,
  },
  sectionSubtitle: {
    fontFamily: fonts.medium,
    fontSize: 10.5,
    marginTop: 2,
  },
  allJobsButton: {
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  allJobsText: {
    fontFamily: fonts.bold,
    fontSize: 11,
  },
  scrollContent: {
    paddingRight: 16,
    paddingBottom: 7,
    gap: 10,
  },
  jobCard: {
    width: 276,
    minHeight: 184,
    borderRadius: 17,
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4EAEE',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 9,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  categoryBadge: {
    maxWidth: 170,
    minHeight: 25,
    paddingHorizontal: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  categoryText: {
    flexShrink: 1,
    fontFamily: fonts.bold,
    fontSize: 9.5,
  },
  statusBadge: {
    minHeight: 24,
    paddingHorizontal: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  statusText: {
    fontFamily: fonts.bold,
    fontSize: 9.5,
  },
  jobTitle: {
    minHeight: 39,
    fontFamily: fonts.bold,
    fontSize: 14.5,
    lineHeight: 19,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    marginBottom: 12,
  },
  locationText: {
    flex: 1,
    color: '#64748B',
    fontFamily: fonts.medium,
    fontSize: 10.5,
  },
  cardFooter: {
    marginTop: 'auto',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F5',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  priceBlock: {
    flex: 1,
    paddingRight: 8,
  },
  priceLabel: {
    color: '#94A3B8',
    fontFamily: fonts.medium,
    fontSize: 8.5,
  },
  priceValue: {
    fontFamily: fonts.extraBold,
    fontSize: 14.5,
    marginTop: 1,
  },
  footerRight: {
    alignItems: 'flex-end',
    gap: 5,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  inspectButton: {
    minHeight: 29,
    paddingHorizontal: 10,
    borderRadius: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inspectButtonText: {
    color: '#FFFFFF',
    fontFamily: fonts.bold,
    fontSize: 10.5,
  },
  emptyCard: {
    width: 276,
    minHeight: 140,
    borderRadius: 17,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4EAEE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  emptyText: {
    fontFamily: fonts.medium,
    fontSize: 10.5,
    lineHeight: 15,
    marginTop: 3,
    textAlign: 'center',
  },
});
