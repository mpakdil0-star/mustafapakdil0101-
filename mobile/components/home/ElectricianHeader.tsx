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
      {/* Decorative Glowing Circles for premium mesh visual depth */}
      <View style={[styles.headerDecorativeCircle1, { backgroundColor: 'rgba(255, 255, 255, 0.04)' }]} />
      <View style={[styles.headerDecorativeCircle2, { backgroundColor: 'rgba(255, 255, 255, 0.02)' }]} />
      <View style={[styles.headerDecorativeCircle3, { backgroundColor: 'rgba(255, 255, 255, 0.03)' }]} />

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

      {/* Sağ Üst Köşede Simetrik Rating Rozeti */}
      <View style={styles.ratingBadgeAbsolute}>
        <Ionicons name="star" size={11} color="#E5C158" style={{ marginRight: 2 }} />
        <Text style={styles.ratingBadgeText}>
          {Number(user?.electricianProfile?.ratingAverage || (user as any)?.averageRating || 5.0).toFixed(1)} ★ {ustaCategoryTitle} Ustası
        </Text>
      </View>

      <View style={styles.centeredHeader}>
        <Text 
          style={styles.headerTitleMain}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {isAuthenticated ? `HOŞGELDİN ${firstName} ${lastName}`.toUpperCase() : 'MİSAFİR USTA'}
        </Text>
      </View>

      {/* Profil Avatarı & Bildirim İkonu Alanı */}
      <View style={styles.profileRow}>
        {/* Sol Sütun Boşluk / Sürgülü Ayar (Simetri) */}
        <View style={styles.symmetricalLeftCol}>
          <TouchableOpacity
            style={styles.settingsButton}
            activeOpacity={0.7}
            onPress={() => handleActionWithAuth('/profile')}
          >
            <Ionicons name="settings-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Ortalanmış dairesel bir avatar (Etrafında lüks altın sarısı halka) */}
        <View style={{ position: 'relative' }}>
          <TouchableOpacity
            style={[styles.centeredAvatarContainer, { borderColor: colors.accentGold || '#E5C158', borderWidth: 2 }]}
            activeOpacity={0.8}
            onPress={() => handleActionWithAuth('/profile')}
          >
            {isAuthenticated && user?.profileImageUrl ? (
              <Image source={{ uri: getFileUrl(user.profileImageUrl) || '' }} style={styles.centeredAvatarImage} />
            ) : (
              <View style={styles.centeredAvatarPlaceholder}>
                <Ionicons name="person" size={32} color="rgba(255, 255, 255, 0.85)" />
              </View>
            )}
          </TouchableOpacity>
          
          {/* Green Verified Badge on Avatar Corner */}
          {isAuthenticated && user?.isVerified && (
            <View style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              backgroundColor: '#10B981',
              width: 20,
              height: 20,
              borderRadius: 10,
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 2,
              borderColor: colors.secondary || '#1E293B',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 3,
              elevation: 2,
            }}>
              <Ionicons name="checkmark" size={10} color="#FFFFFF" />
            </View>
          )}
        </View>

        {/* Bildirim zili (notifications-outline) avatarın sağ tarafında simetrik duracak */}
        <View style={styles.symmetricalRightCol}>
          <TouchableOpacity
            style={styles.notificationButton}
            activeOpacity={0.7}
            onPress={() => handleActionWithAuth('/profile/notifications')}
          >
            <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
            {isAuthenticated && unreadCount > 0 && (
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
          <View style={styles.valueRow}>
            <Ionicons name="wallet-outline" size={18} color="#10B981" style={{ marginRight: 6 }} />
            <Text style={[styles.unifiedCardValue, { color: '#10B981' }]}>
              {stats ? `₺${stats.totalEarnings.toLocaleString('tr-TR')}` : '₺0'}
            </Text>
          </View>
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
          <View style={styles.valueRow}>
            <Ionicons name="briefcase-outline" size={17} color="#2E5C8A" style={{ marginRight: 6 }} />
            <Text style={styles.unifiedCardValueDark}>
              {stats ? stats.activeBids : '0'}
            </Text>
          </View>
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
  headerDecorativeCircle1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    zIndex: 0,
  },
  headerDecorativeCircle2: {
    position: 'absolute',
    bottom: -30,
    left: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    zIndex: 0,
  },
  headerDecorativeCircle3: {
    position: 'absolute',
    top: 40,
    left: '30%',
    width: 50,
    height: 50,
    borderRadius: 25,
    zIndex: 0,
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
    fontSize: 19,
    color: '#FFFFFF', // Pure White
    letterSpacing: 0.5,
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
    paddingRight: 22,
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
    borderColor: 'rgba(255, 255, 255, 0.35)', // Clean White border like Citizen
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.12)', // Translucent white like Citizen
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFFFFF', // White Glow like Citizen
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
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
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
  settingsButton: {
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
    backgroundColor: 'rgba(229, 193, 88, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(229, 193, 88, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
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
