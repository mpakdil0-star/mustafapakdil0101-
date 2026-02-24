import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { PremiumAlert } from '../../../../components/common/PremiumAlert';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppDispatch, useAppSelector } from '../../../../hooks/redux';
import { fetchBidById } from '../../../../store/slices/bidSlice';
import { messageService } from '../../../../services/messageService';
import { Card } from '../../../../components/common/Card';
import { Button } from '../../../../components/common/Button';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../../constants/colors';
import { spacing } from '../../../../constants/spacing';
import { typography, fonts } from '../../../../constants/typography';
import { PremiumHeader } from '../../../../components/common/PremiumHeader';
import { LinearGradient } from 'expo-linear-gradient';

export default function BidDetailScreen() {
  const router = useRouter();
  const { bidId, id: jobId } = useLocalSearchParams<{ bidId: string; id: string }>();
  const dispatch = useAppDispatch();
  const { currentBid, isLoading, error } = useAppSelector((state) => state.bids);
  const { user } = useAppSelector((state) => state.auth);
  const isOwner = user?.userType === 'CITIZEN';

  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info' | 'confirm';
    buttons?: { text: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }[];
  }>({ visible: false, title: '', message: '' });

  const showAlert = (title: string, message: string, type: any = 'info', buttons?: any[]) => {
    setAlertConfig({ visible: true, title, message, type, buttons });
  };

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
    <View style={styles.container}>
      <PremiumHeader
        title="Teklif Detayı"
        subtitle={currentBid.jobPost?.title || 'İlan Özeti'}
        showBackButton
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >

        {/* Bid Header Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <LinearGradient
              colors={colors.gradientPrimary as any}
              style={styles.titleIndicator}
            />
            <Text style={styles.sectionTitleBold}>Genel Bakış</Text>
          </View>
          <Card style={styles.headerCard} elevated>
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(currentBid.status) + '15' },
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
              <View style={styles.bidAmountContainer}>
                <Text style={styles.amountValue}>
                  {typeof currentBid.amount === 'string'
                    ? parseFloat(currentBid.amount).toFixed(0)
                    : currentBid.amount}{' '}
                  ₺
                </Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Details Sections */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <LinearGradient
              colors={colors.gradientPrimary as any}
              style={styles.titleIndicator}
            />
            <Text style={styles.sectionTitleBold}>Detaylar</Text>
          </View>

          <Card style={styles.detailsCard} elevated>
            <View style={styles.infoRow}>
              <View style={styles.infoLabelGroup}>
                <Ionicons name="person-outline" size={18} color={colors.primary} />
                <Text style={styles.infoLabel}>Usta Bilgisi</Text>
              </View>
              <Text style={styles.infoValue}>
                {currentBid.electrician?.fullName || 'Usta'}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoLabelGroup}>
                <Ionicons name="time-outline" size={18} color={colors.primary} />
                <Text style={styles.infoLabel}>Tahmini Süre</Text>
              </View>
              <Text style={styles.infoValue}>
                {currentBid.estimatedDuration} saat
              </Text>
            </View>

            {currentBid.estimatedStartDate && (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <View style={styles.infoLabelGroup}>
                    <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                    <Text style={styles.infoLabel}>Başlangıç</Text>
                  </View>
                  <Text style={styles.infoValue}>
                    {new Date(currentBid.estimatedStartDate).toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'long',
                    })}
                  </Text>
                </View>
              </>
            )}
          </Card>
        </View>

        {/* Message Section */}
        {currentBid.message && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <LinearGradient
                colors={colors.gradientPrimary as any}
                style={styles.titleIndicator}
              />
              <Text style={styles.sectionTitleBold}>Mesaj</Text>
            </View>
            <Card style={styles.messageCard} elevated>
              <Text style={styles.messageText}>{currentBid.message}</Text>
            </Card>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {currentBid.status === 'ACCEPTED' && (
            <Button
              title="Mesaj Gönder"
              onPress={async () => {
                try {
                  // Konuşma başlat veya mevcut olanı bul
                  const response = await messageService.sendMessage({
                    receiverId: currentBid.electricianId,
                    content: 'Merhaba, teklifinizi kabul ettim. İş ile ilgili detayları buradan konuşabiliriz.',
                    bidId: currentBid.id,
                    jobId: currentBid.jobPostId
                  });

                  if (response?.conversationId) {
                    router.push(`/messages/${response.conversationId}`);
                  } else {
                    showAlert('Hata', 'Mesajlaşma başlatılamadı.', 'error');
                  }
                } catch (error: any) {
                  console.error('Start chat error:', error);
                  showAlert('Hata', 'Mesajlaşma şu an kullanılamıyor.', 'error');
                }
              }}
              variant="primary"
              fullWidth
              icon={<Ionicons name="chatbubbles-outline" size={20} color={colors.white} />}
              style={styles.messageButton}
            />
          )}
        </View>
      </ScrollView>

      <PremiumAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        buttons={alertConfig.buttons}
        onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.screenPadding,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundDark,
  },
  loadingText: {
    ...typography.body2,
    color: colors.textSecondary,
    marginTop: spacing.md,
    fontFamily: fonts.medium,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.backgroundDark,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  errorTitle: {
    ...typography.h4Style,
    color: colors.text,
    fontFamily: fonts.bold,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  errorText: {
    ...typography.body2,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    fontFamily: fonts.regular,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  titleIndicator: {
    width: 4,
    height: 18,
    borderRadius: 2,
    marginRight: spacing.sm,
  },
  sectionTitleBold: {
    ...typography.h4Style,
    color: colors.text,
    fontFamily: fonts.bold,
  },
  headerCard: {
    padding: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  bidAmountContainer: {
    backgroundColor: colors.primary + '10',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
  },
  amountValue: {
    ...typography.h3Style,
    color: colors.primary,
    fontFamily: fonts.bold,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 13,
    fontFamily: fonts.bold,
  },
  detailsCard: {
    padding: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    ...typography.body2,
    color: colors.textSecondary,
    fontFamily: fonts.medium,
  },
  infoValue: {
    ...typography.body1,
    color: colors.text,
    fontFamily: fonts.bold,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.sm,
  },
  messageCard: {
    padding: spacing.md,
  },
  messageText: {
    ...typography.body1,
    color: colors.text,
    lineHeight: 22,
    fontFamily: fonts.regular,
    fontStyle: 'italic',
  },
  actionButtons: {
    marginTop: spacing.lg,
  },
  messageButton: {
    borderRadius: 16,
    height: 56,
  },
  backButton: {
    minWidth: 150,
  },
});

