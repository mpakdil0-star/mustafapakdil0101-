import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../../constants/typography';
import { getFileUrl } from '../../constants/api';
import { useRouter } from 'expo-router';

interface ElectricianHeaderProps {
  user: any;
  firstName: string;
  lastName: string;
  unreadCount: number;
  badgePulseAnim: Animated.Value;
  handleActionWithAuth: (route: string, params?: any) => void;
  colors: any;
  stats: any;
  ustaCategoryTitle: string;
  isAuthenticated: boolean;
}

export const ElectricianHeader: React.FC<ElectricianHeaderProps> = ({
  user,
  firstName,
  lastName,
  unreadCount,
  badgePulseAnim,
  handleActionWithAuth,
  colors,
  stats,
  ustaCategoryTitle,
  isAuthenticated,
}) => {
  const router = useRouter();

  return (
    <View style={styles.headerContainer}>
      {/* Mutlak Konumlanmış Geri Butonu (Misafir için) */}
      {!isAuthenticated && (
        <TouchableOpacity
          style={styles.backButtonAbsolute}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(auth)/welcome')}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
      )}

      {/* Başlık Düzeni (Centered Header) */}
      <View style={styles.centeredHeader}>
        <Text style={styles.headerTitleMain}>İŞBİTİR USTA</Text>
        <Text style={styles.headerSubtitleSub}>
          {isAuthenticated ? `${firstName} ${lastName}` : 'Misafir Usta'}
        </Text>
      </View>

      {/* Profil Avatarı & Simetrik Elemanlar Satırı */}
      <View style={styles.profileRow}>
        {/* Rating puanı (4.9 ⭐) avatarın sol tarafında simetrik duracak */}
        <View style={styles.symmetricalLeftCol}>
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingText}>
              {(user as any)?.averageRating?.toFixed(1) || '4.9'}
            </Text>
            <Ionicons name="star" size={12} color="#FBBF24" style={{ marginLeft: 2 }} />
          </View>
          <Text style={styles.ustaRoleText}>{ustaCategoryTitle} Ustası</Text>
        </View>

        {/* Ortalanmış dairesel bir avatar (borderRadius: 40, borderWidth: 2, borderColor: '#93C5FD') */}
        <TouchableOpacity
          style={styles.centeredAvatarContainer}
          activeOpacity={0.8}
          onPress={() => handleActionWithAuth('/profile')}
        >
          {user?.profileImageUrl ? (
            <Image source={{ uri: getFileUrl(user.profileImageUrl) || '' }} style={styles.centeredAvatarImage} />
          ) : (
            <View style={styles.centeredAvatarPlaceholder}>
              <Ionicons name="person" size={32} color="#93C5FD" />
            </View>
          )}
        </TouchableOpacity>

        {/* Bildirim zili (notifications-outline) avatarın sağ tarafında simetrik duracak */}
        <View style={styles.symmetricalRightCol}>
          <TouchableOpacity
            style={styles.notificationButton}
            activeOpacity={0.7}
            onPress={() => handleActionWithAuth('/profile/notifications')}
          >
            <Ionicons name="notifications-outline" size={22} color="#1E293B" />
            {unreadCount > 0 && (
              <Animated.View style={[styles.notificationBadge, { transform: [{ scale: badgePulseAnim }] }]}>
                <Text style={styles.notificationBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </Animated.View>
            )}
          </TouchableOpacity>
          <Text style={styles.notificationLabel}>Bildirimler</Text>
        </View>
      </View>

      {/* Birleşik Finansal Özet Kartı (Unified Summary Card) */}
      <View style={styles.unifiedCard}>
        {/* Sol Bölüm (Toplam Kazanç) */}
        <TouchableOpacity
          style={styles.unifiedCardHalf}
          onPress={() => handleActionWithAuth('/electrician/stats')}
          activeOpacity={0.85}
        >
          <Text style={styles.unifiedCardLabel}>Toplam Kazanç</Text>
          <Text style={styles.unifiedCardValue}>
            {stats ? `₺${stats.totalEarnings.toLocaleString('tr-TR')}` : '₺0.00'}
          </Text>
          <Text style={styles.unifiedCardSub}>Tüm Zamanlar</Text>
        </TouchableOpacity>

        {/* Dikey ince ayırıcı çizgi (COLOR_DIVIDER_LIGHT) */}
        <View style={styles.verticalDivider} />

        {/* Sağ Bölüm (Aktif Teklifler) */}
        <TouchableOpacity
          style={styles.unifiedCardHalf}
          onPress={() => handleActionWithAuth('/(tabs)/jobs', { tab: 'bids' })}
          activeOpacity={0.85}
        >
          <Text style={styles.unifiedCardLabel}>Aktif Teklifler</Text>
          <Text style={styles.unifiedCardValueDark}>
            {stats ? stats.activeBids : '0'}
          </Text>
          <Text style={styles.unifiedCardSub}>Bekleyen</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    width: '100%',
    paddingBottom: 4,
  },
  backButtonAbsolute: {
    position: 'absolute',
    left: 0,
    top: 4,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  centeredHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  headerTitleMain: {
    fontFamily: fonts.extraBold,
    fontSize: 20,
    color: '#1E293B', // COLOR_TEXT_MAIN
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  headerSubtitleSub: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: '#64748B', // COLOR_TEXT_MUTED
    marginTop: 2,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 20,
  },
  symmetricalLeftCol: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  symmetricalRightCol: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  ratingText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: '#1E293B',
  },
  ustaRoleText: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'right',
  },
  centeredAvatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#93C5FD',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  centeredAvatarImage: {
    width: '100%',
    height: '100%',
  },
  centeredAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  notificationLabel: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: '#64748B',
    marginTop: 4,
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontFamily: fonts.bold,
  },
  unifiedCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  unifiedCardHalf: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verticalDivider: {
    width: 1,
    height: '70%',
    backgroundColor: '#CBD5E1', // COLOR_DIVIDER_LIGHT
    alignSelf: 'center',
  },
  unifiedCardLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    color: '#64748B',
    marginBottom: 4,
  },
  unifiedCardValue: {
    fontFamily: fonts.extraBold,
    fontSize: 20,
    color: '#0284C7', // COLOR_BRAND_BLUE
    marginBottom: 2,
  },
  unifiedCardValueDark: {
    fontFamily: fonts.extraBold,
    fontSize: 20,
    color: '#1E293B', // COLOR_TEXT_MAIN
    marginBottom: 2,
  },
  unifiedCardSub: {
    fontFamily: fonts.medium,
    fontSize: 9,
    color: '#94A3B8',
  },
});
