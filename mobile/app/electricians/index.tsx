import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '../../components/common/Card';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import { mockElectriciansList } from '../../constants/mockElectricians';

export default function ElectriciansScreen() {
  const router = useRouter();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={false} onRefresh={() => {}} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Search Header */}
      <Card style={styles.searchCard}>
        <Text style={styles.searchTitle}>🔍 Elektrikçi Ara</Text>
        <Text style={styles.searchSubtitle}>
          Şehrinizdeki profesyonel elektrikçileri keşfedin
        </Text>
      </Card>

      {/* Electricians List */}
      {mockElectriciansList.map((electrician) => (
        <TouchableOpacity
          key={electrician.id}
          onPress={() => router.push(`/electricians/${electrician.id}`)}
          activeOpacity={0.7}
        >
          <Card style={styles.electricianCard} elevated>
            <View style={styles.electricianHeader}>
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>
                  {electrician.fullName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.electricianInfo}>
                <Text style={styles.electricianName}>{electrician.fullName}</Text>
                <View style={styles.ratingContainer}>
                  <Text style={styles.ratingIcon}>⭐</Text>
                  <Text style={styles.rating}>{electrician.rating}</Text>
                  <Text style={styles.reviewCount}>
                    ({electrician.reviewCount} değerlendirme)
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.specialtiesContainer}>
              {electrician.specialties.map((specialty, index) => (
                <View key={index} style={styles.specialtyTag}>
                  <Text style={styles.specialtyText}>{specialty}</Text>
                </View>
              ))}
            </View>

            <View style={styles.electricianMeta}>
              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>📍</Text>
                <Text style={styles.metaText}>{electrician.location}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaIcon}>⚡</Text>
                <Text style={styles.metaText}>{electrician.experience}</Text>
              </View>
            </View>
          </Card>
        </TouchableOpacity>
      ))}

      {/* Empty State */}
      {mockElectriciansList.length === 0 && (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>👷</Text>
          <Text style={styles.emptyTitle}>Elektrikçi Bulunamadı</Text>
          <Text style={styles.emptySubtitle}>
            Arama kriterlerinize uygun elektrikçi bulunamadı.
          </Text>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  content: {
    padding: spacing.screenPadding,
    paddingBottom: spacing.xl,
  },
  searchCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.primaryLight + '20',
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  searchTitle: {
    ...typography.h5,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  searchSubtitle: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  electricianCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  electricianHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    ...typography.h4,
    color: colors.white,
    fontWeight: 'bold',
  },
  electricianInfo: {
    flex: 1,
  },
  electricianName: {
    ...typography.h6,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingIcon: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  rating: {
    ...typography.body2,
    color: colors.text,
    fontWeight: '600',
    marginRight: spacing.xs,
  },
  reviewCount: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  specialtiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  specialtyTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primaryLight + '30',
    borderRadius: spacing.radius.sm,
  },
  specialtyText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  electricianMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
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
});

