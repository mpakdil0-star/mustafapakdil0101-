import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import { mockElectriciansMap } from '../../constants/mockElectricians';
import api from '../../services/api';

export default function ElectricianDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [startingChat, setStartingChat] = useState(false);

  const electrician = id ? mockElectriciansMap[id] : null;

  const handleCall = () => {
    if (electrician?.phone) {
      Linking.openURL(`tel:${electrician.phone.replace(/\s/g, '')}`);
    }
  };

  const handleMessage = async () => {
    if (!id) return;

    setStartingChat(true);
    try {
      // Konuşma başlat veya mevcut konuşmayı getir
      const response = await api.post('/conversations', {
        recipientId: id,
      });

      if (response.data.success && response.data.data.conversation) {
        const conversationId = response.data.data.conversation.id;
        router.push(`/messages/${conversationId}`);
      } else {
        Alert.alert('Hata', 'Konuşma başlatılamadı. Lütfen tekrar deneyin.');
      }
    } catch (error: any) {
      console.error('Error starting conversation:', error);
      // Database yoksa mock konuşma ID'si ile yönlendir
      if (error.response?.status === 503 || error.code === 'ERR_NETWORK') {
        Alert.alert(
          'Veritabanı Bağlantısı Yok',
          'Mesajlaşma için veritabanı bağlantısı gereklidir.',
          [{ text: 'Tamam' }]
        );
      } else {
        Alert.alert('Hata', 'Bir sorun oluştu. Lütfen tekrar deneyin.');
      }
    } finally {
      setStartingChat(false);
    }
  };

  if (!electrician) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Elektrikçi Bulunamadı</Text>
        <Text style={styles.errorText}>Elektrikçi bilgileri yüklenemedi.</Text>
        <Button
          title="Geri Dön"
          onPress={() => router.back()}
          variant="primary"
          style={styles.backButton}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Header Card */}
      <Card style={styles.headerCard} elevated>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {electrician.fullName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{electrician.fullName}</Text>
            <View style={styles.ratingContainer}>
              <Text style={styles.ratingIcon}>⭐</Text>
              <Text style={styles.rating}>{electrician.rating}</Text>
              <Text style={styles.reviewCount}>
                ({electrician.reviewCount} değerlendirme)
              </Text>
            </View>
          </View>
        </View>
      </Card>

      {/* Phone Number Card */}
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>📞 İletişim</Text>
        <View style={styles.phoneContainer}>
          <Text style={styles.phoneNumber}>{electrician.phone}</Text>
          <Button
            title="Ara"
            onPress={handleCall}
            variant="primary"
            size="small"
            style={styles.callButton}
          />
        </View>
      </Card>

      {/* About Card */}
      {electrician.about && (
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Hakkında</Text>
          <Text style={styles.aboutText}>{electrician.about}</Text>
        </Card>
      )}

      {/* Specialties Card */}
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>⚡ Uzmanlık Alanları</Text>
        <View style={styles.specialtiesContainer}>
          {electrician.specialties.map((specialty: string, index: number) => (
            <View key={index} style={styles.specialtyTag}>
              <Text style={styles.specialtyText}>{specialty}</Text>
            </View>
          ))}
        </View>
      </Card>

      {/* Location & Experience Card */}
      <Card style={styles.sectionCard}>
        <View style={styles.metaContainer}>
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

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <Button
          title={startingChat ? "Yükleniyor..." : "📱 Mesaj Gönder"}
          onPress={handleMessage}
          variant="outline"
          style={styles.messageButton}
          loading={startingChat}
          disabled={startingChat}
        />
      </View>
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
  headerCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    ...typography.h3,
    color: colors.white,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.xs,
    fontWeight: 'bold',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingIcon: {
    fontSize: 18,
    marginRight: spacing.xs,
  },
  rating: {
    ...typography.h6,
    color: colors.text,
    fontWeight: '600',
    marginRight: spacing.xs,
  },
  reviewCount: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  sectionCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h6,
    color: colors.text,
    marginBottom: spacing.md,
    fontWeight: '600',
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  phoneNumber: {
    ...typography.body1,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
  },
  callButton: {
    marginLeft: spacing.md,
    minWidth: 80,
  },
  aboutText: {
    ...typography.body1,
    color: colors.text,
    lineHeight: 22,
  },
  specialtiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  specialtyTag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primaryLight + '30',
    borderRadius: spacing.radius.md,
  },
  specialtyText: {
    ...typography.body2,
    color: colors.primary,
    fontWeight: '600',
  },
  metaContainer: {
    gap: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  metaText: {
    ...typography.body1,
    color: colors.textSecondary,
  },
  actionButtons: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  messageButton: {
    width: '100%',
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
  backButton: {
    minWidth: 150,
  },
});

