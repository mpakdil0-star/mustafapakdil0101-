import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector } from '../../hooks/redux';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';
import { ServiceCategory } from '../../components/home/ServiceCategory';
import { FeaturedElectrician } from '../../components/home/FeaturedElectrician';

const CATEGORIES = [
  { id: 'Aydınlatma', label: 'Aydınlatma', icon: 'bulb' as const },
  { id: 'Elektrik Tamiri', label: 'Arıza Tespiti', icon: 'construct' as const },
  { id: 'Elektrik Tesisatı', label: 'Tesisat', icon: 'flash' as const },
  { id: 'Kablo Çekimi', label: 'Kablo Çekimi', icon: 'wifi' as const },
  { id: 'Priz ve Anahtar', label: 'Priz/Anahtar', icon: 'hardware-chip' as const },
];

const FEATURED_ELECTRICIANS = [
  {
    id: '1',
    name: 'Ahmet Yılmaz',
    rating: 4.8,
    reviewCount: 124,
    specialty: 'Elektrik Tesisatı',
    isVerified: true,
  },
  {
    id: '2',
    name: 'Mehmet Demir',
    rating: 4.9,
    reviewCount: 89,
    specialty: 'Avize & Aydınlatma',
    isVerified: true,
  },
  {
    id: '3',
    name: 'Ayşe Kaya',
    rating: 4.7,
    reviewCount: 56,
    specialty: 'Tamirat & Tadilat',
    isVerified: false,
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAppSelector((state) => state.auth);
  const isElectrician = user?.userType === 'ELECTRICIAN';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeLabel}>Hoş geldin,</Text>
        <Text style={styles.welcomeName}>{user?.fullName}</Text>
        <Text style={styles.welcomeSubtitle}>
          {isElectrician
            ? 'Yeni iş fırsatlarını keşfedin'
            : 'Elektrikçi hizmeti ihtiyacınız mı var?'}
        </Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        {isElectrician ? (
          <>
            <Card style={styles.actionCard} elevated>
              <View style={styles.actionContent}>
                <View style={styles.actionIconContainer}>
                  <Ionicons name="search" size={24} color={colors.primary} />
                </View>
                <View style={styles.actionTextContainer}>
                  <Text style={styles.actionTitle}>İş İlanlarını Görüntüle</Text>
                  <Text style={styles.actionSubtitle}>Size uygun iş fırsatlarını keşfedin</Text>
                </View>
              </View>
              <Button
                title="İlanları Gör"
                onPress={() => router.push('/(tabs)/jobs')}
                variant="primary"
                size="medium"
                fullWidth
              />
            </Card>

            <Card style={styles.actionCard} elevated>
              <View style={styles.actionContent}>
                <View style={[styles.actionIconContainer, { backgroundColor: colors.successLight + '30' }]}>
                  <Ionicons name="stats-chart" size={24} color={colors.success} />
                </View>
                <View style={styles.actionTextContainer}>
                  <Text style={styles.actionTitle}>İstatistiklerim</Text>
                  <Text style={styles.actionSubtitle}>Performansınızı takip edin</Text>
                </View>
              </View>
              <Button
                title="Görüntüle"
                onPress={() => router.push('/electrician/stats')}
                variant="outline"
                size="medium"
                fullWidth
              />
            </Card>
          </>
        ) : (
          <>
            {/* Service Categories */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Hizmet Seçin</Text>
                <TouchableOpacity onPress={() => router.push('/jobs/create')}>
                  <Text style={styles.seeAll}>Tümü</Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesList}
              >
                {CATEGORIES.map((cat) => (
                  <ServiceCategory
                    key={cat.id}
                    icon={cat.icon}
                    label={cat.label}
                    onPress={() => router.push({ pathname: '/jobs/create', params: { category: cat.id } })}
                  />
                ))}
              </ScrollView>
            </View>

            {/* CTA Banner */}
            <Card style={styles.ctaCard} elevated>
              <View style={styles.ctaContent}>
                <View style={styles.ctaTextContainer}>
                  <Text style={styles.ctaTitle}>Acil Elektrikçi mi Lazım?</Text>
                  <Text style={styles.ctaSubtitle}>Hemen talep oluştur, ustalar seni arasın.</Text>
                </View>
                <View style={styles.ctaIconContainer}>
                  <Ionicons name="megaphone" size={32} color={colors.white} />
                </View>
              </View>
              <Button
                title="Hemen Teklif Al"
                onPress={() => router.push('/jobs/create')}
                variant="primary"
                size="medium"
                fullWidth
                style={styles.ctaButton}
              />
            </Card>

            {/* Featured Electricians */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Öne Çıkan Ustalar</Text>
                <TouchableOpacity onPress={() => router.push('/electricians')}>
                  <Text style={styles.seeAll}>Tümü</Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.featuredList}
              >
                {FEATURED_ELECTRICIANS.map((elec) => (
                  <FeaturedElectrician
                    key={elec.id}
                    name={elec.name}
                    rating={elec.rating}
                    reviewCount={elec.reviewCount}
                    specialty={elec.specialty}
                    isVerified={elec.isVerified}
                    onPress={() => router.push(`/electricians/${elec.id}` as any)}
                    onBook={() => router.push({ pathname: '/jobs/create', params: { electricianId: elec.id } })}
                  />
                ))}
              </ScrollView>
            </View>
          </>
        )}
      </View>

      {/* Info Section */}
      <Card style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <Ionicons name="bulb-outline" size={20} color={colors.info} />
          <Text style={styles.infoTitle}>İpuçları</Text>
        </View>
        <Text style={styles.infoText}>
          {isElectrician
            ? 'Profilinizi tamamlayarak daha fazla iş alabilirsiniz. Deneyimlerinizi ve sertifikalarınızı eklemeyi unutmayın!'
            : 'Detaylı açıklama yazarsanız, elektrikçiler size daha iyi teklif verebilir. Fotoğraf eklemek de yardımcı olur!'}
        </Text>
      </Card>
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
    paddingBottom: 80,
  },
  welcomeSection: {
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  welcomeLabel: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.textSecondary,
  },
  welcomeName: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: colors.primary,
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
  },
  quickActions: {
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
  },
  seeAll: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.primary,
  },
  categoriesList: {
    paddingRight: spacing.lg,
  },
  featuredList: {
    paddingRight: spacing.lg,
  },
  ctaCard: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderRadius: spacing.radius.lg,
  },
  ctaContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  ctaTextContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  ctaTitle: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.white,
    marginBottom: spacing.xs,
  },
  ctaSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
  },
  ctaIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaButton: {
    backgroundColor: colors.white,
    borderWidth: 0,
  },
  // Legacy styles for Electrician View
  actionCard: {
    padding: spacing.lg,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: spacing.radius.md,
    backgroundColor: colors.primaryLight + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: colors.text,
    marginBottom: 4,
  },
  actionSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
  },
  infoCard: {
    backgroundColor: colors.infoLight + '30',
    borderLeftWidth: 4,
    borderLeftColor: colors.info,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  infoTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  infoText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
