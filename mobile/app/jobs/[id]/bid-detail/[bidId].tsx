import { useEffect } from 'react';
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
import { useAppDispatch, useAppSelector } from '../../../../hooks/redux';
import { fetchBidById } from '../../../../store/slices/bidSlice';
import { Card } from '../../../../components/common/Card';
import { Button } from '../../../../components/common/Button';
import { colors } from '../../../../constants/colors';
import { spacing } from '../../../../constants/spacing';
import { typography } from '../../../../constants/typography';

export default function BidDetailScreen() {
  const router = useRouter();
  const { bidId, id: jobId } = useLocalSearchParams<{ bidId: string; id: string }>();
  const dispatch = useAppDispatch();
  const { currentBid, isLoading, error } = useAppSelector((state) => state.bids);
  const { user } = useAppSelector((state) => state.auth);
  const isOwner = user?.userType === 'CITIZEN';

  useEffect(() => {
    if (bidId) {
      dispatch(fetchBidById(bidId));
    }
  }, [bidId, dispatch]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Teklif yükleniyor...</Text>
      </View>
    );
  }

  if (error || !currentBid) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Teklif Bulunamadı</Text>
        <Text style={styles.errorText}>
          {error || 'Teklif bilgileri yüklenemedi.'}
        </Text>
        <Button
          title="Geri Dön"
          onPress={() => router.back()}
          variant="primary"
          style={styles.backButton}
        />
      </View>
    );
  }

  const getStatusColor = (status: string) => {
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

  const getStatusText = (status: string) => {
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Back Button Header */}
      <View style={styles.backHeaderContainer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonIcon}>←</Text>
          <Text style={styles.backButtonText}>Geri</Text>
        </TouchableOpacity>
      </View>

      {/* Bid Header Card */}
      <Card style={styles.headerCard} elevated>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.bidTitle}>Teklif Detayı</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(currentBid.status) + '20' },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: getStatusColor(currentBid.status) },
                ]}
              >
                {getStatusText(currentBid.status)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.amountContainer}>
          <Text style={styles.amountLabel}>Teklif Tutarı</Text>
          <Text style={styles.amountValue}>
            {typeof currentBid.amount === 'string'
              ? parseFloat(currentBid.amount).toFixed(0)
              : currentBid.amount}{' '}
            ₺
          </Text>
        </View>
      </Card>

      {/* Electrician Info Card */}
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>👤 Elektrikçi Bilgileri</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Ad Soyad:</Text>
          <Text style={styles.infoValue}>
            {currentBid.electrician?.fullName || 'Elektrikçi'}
          </Text>
        </View>
      </Card>

      {/* Bid Details Card */}
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>📋 Teklif Detayları</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Tahmini Süre:</Text>
          <Text style={styles.infoValue}>
            {currentBid.estimatedDuration} saat
          </Text>
        </View>
        {currentBid.estimatedStartDate && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tahmini Başlangıç:</Text>
            <Text style={styles.infoValue}>
              {new Date(currentBid.estimatedStartDate).toLocaleDateString('tr-TR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </View>
        )}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Oluşturulma:</Text>
          <Text style={styles.infoValue}>
            {new Date(currentBid.createdAt).toLocaleDateString('tr-TR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </Text>
        </View>
      </Card>

      {/* Message Card */}
      {currentBid.message && (
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>💬 Mesaj</Text>
          <Text style={styles.messageText}>{currentBid.message}</Text>
        </Card>
      )}

      {/* Job Info Card */}
      {currentBid.jobPost && (
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>💼 İş Bilgileri</Text>
          <Text style={styles.jobTitle}>{currentBid.jobPost.title}</Text>
          <Text style={styles.jobDescription} numberOfLines={3}>
            {currentBid.jobPost.description}
          </Text>
          {currentBid.jobPost.location && (
            <View style={styles.locationRow}>
              <Text style={styles.locationIcon}>📍</Text>
              <Text style={styles.locationText}>
                {currentBid.jobPost.location.district}, {currentBid.jobPost.location.city}
              </Text>
            </View>
          )}
        </Card>
      )}

      {/* Action Buttons */}
      {isOwner && currentBid.status === 'PENDING' && currentBid.jobPost?.status === 'OPEN' && (
        <View style={styles.actionButtons}>
          <Button
            title="Mesaj Gönder"
            onPress={() => {
              Alert.alert('Yakında', 'Mesajlaşma özelliği yakında eklenecek');
            }}
            variant="outline"
            fullWidth
            style={styles.messageButton}
          />
        </View>
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
  headerCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flex: 1,
  },
  bidTitle: {
    ...typography.h4,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.radius.sm,
    alignSelf: 'flex-start',
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
  },
  amountContainer: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    alignItems: 'center',
  },
  amountLabel: {
    ...typography.body2,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  amountValue: {
    ...typography.h2,
    color: colors.primary,
    fontWeight: '800',
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
  messageText: {
    ...typography.body1,
    color: colors.text,
    lineHeight: 24,
  },
  jobTitle: {
    ...typography.h6,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  jobDescription: {
    ...typography.body2,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  locationIcon: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  locationText: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  actionButtons: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  messageButton: {
    marginTop: spacing.xs,
  },
});

