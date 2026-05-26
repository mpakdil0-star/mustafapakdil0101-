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
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Sağ Üst Köşede Simetrik Rating Rozeti (4.9 ★ Elektrik Ustası) */}
      <View style={styles.ratingBadgeAbsolute}>
        <Ionicons name="star" size={11} color="#E5C158" style={{ marginRight: 2 }} />
        <Text style={styles.ratingBadgeText}>
          {((user as any)?.averageRating || 4.9).toFixed(1)} ★ {ustaCategoryTitle} Ustası
        </Text>
      </View>

      {/* Başlık Düzeni (Centered Header) */}
      <View style={styles.centeredHeader}>
        <Text style={styles.headerTitleMain}>İŞBİTİR USTA</Text>
        <Text style={styles.headerSubtitleSub}>
          {isAuthenticated ? `${firstName} ${lastName}` : 'Misafir Usta'}
        </Text>
      </View>

      {/* Profil Avatarı & Bildirim İkonu Alanı */}
      <View style={styles.profileRow}>
        {/* Sol Sütun Boşluk / Sürgülü Ayar (Simetri) */}
        <View style={styles.symmetricalLeftCol} />

        {/* Ortalanmış dairesel bir avatar (Etrafında altın border) */}
        <TouchableOpacity
          style={styles.centeredAvatarContainer}
          activeOpacity={0.8}
          onPress={() => handleActionWithAuth('/profile')}
        >
          {user?.profileImageUrl ? (
            <Image source={{ uri: getFileUrl(user.profileImageUrl) || '' }} style={styles.centeredAvatarImage} />
          ) : (
            <View style={styles.centeredAvatarPlaceholder}>
              <Ionicons name="person" size={32} color="#E5C158" />
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
            <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
            {unreadCount > 0 && (
              <Animated.View style={[styles.notificationBadge, { transform: [{ scale: badgePulseAnim }] }]}>
                <Text style={styles.notificationBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </Animated.View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Birleşik Finansal Özet Kartı (Unified balanced Card) */}
      <View style={styles.unifiedCard}>
        {/* Sol Bölüm (Toplam Kazanç - Beyaz) */}
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

        {/* Dikey ayırıcı dikey hat (rgba(148, 163, 184, 0.2)) */}
        <View style={styles.verticalDivider} />

        {/* Sağ Bölüm (Aktif Teklifler - Beyaz) */}
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
    backgroundColor: 'transparent',
  },
  backButtonAbsolute: {
    position: 'absolute',
    left: 0,
    top: 4,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  centeredHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 38,
    marginBottom: 12,
  },
  headerTitleMain: {
    fontFamily: fonts.extraBold,
    fontSize: 18,
    color: '#FFFFFF', // Pure White
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  headerSubtitleSub: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: '#CBD5E1', // Light Gray/Slate
    marginTop: 1,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingLeft: 22,
  },
  centeredAvatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#E5C158', // Champagne Gold border
    overflow: 'hidden',
    backgroundColor: '#2E5C8A', // Deep Steel Blue zemin
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#E5C158', // Gold Glow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  centeredAvatarImage: {
    width: '100%',
    height: '100%',
  },
  centeredAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2E5C8A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingBadgeAbsolute: {
    position: 'absolute',
    right: 0,
    top: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 9,
    color: '#E5C158', // Premium Gold
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
    borderColor: '#4682B4', // Matches the blue background!
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontFamily: fonts.bold,
  },
  unifiedCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF', // Pure White Card
    borderRadius: 16,
    paddingVertical: 16,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(70, 130, 180, 0.12)',
    shadowColor: '#4682B4',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.03, // Opacity between 0.02 and 0.04
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
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(70, 130, 180, 0.15)',
    alignSelf: 'center',
  },
  unifiedCardLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    color: '#64748B', // Slate Gray
    marginBottom: 4,
  },
  unifiedCardValue: {
    fontFamily: fonts.extraBold,
    fontSize: 20,
    color: '#2E5C8A', // Deep Steel Blue
    marginBottom: 2,
  },
  unifiedCardValueDark: {
    fontFamily: fonts.extraBold,
    fontSize: 20,
    color: '#2E5C8A', // Deep Steel Blue
    marginBottom: 2,
  },
  unifiedCardSub: {
    fontFamily: fonts.medium,
    fontSize: 9,
    color: '#94A3B8',
  },
});
