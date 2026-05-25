import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../../constants/typography';
import { colors as staticColors } from '../../constants/colors';
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
    <>
      {/* Top Row: Name, Rating, Avatar, Notification */}
      <View style={styles.headerTopRow}>
        {!isAuthenticated && (
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(auth)/welcome')}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={colors.white} />
          </TouchableOpacity>
        )}

        {/* Left: Name on two lines, large & uppercase */}
        <View style={styles.ustaHeaderNameContainer}>
          <Text style={styles.ustaHeaderNameLine}>{firstName}</Text>
          {lastName ? <Text style={styles.ustaHeaderNameLine}>{lastName}</Text> : null}
        </View>

        {/* Right: Rating + Role + Avatar & Notification */}
        <View style={styles.ustaHeaderRightContainer}>
          <View style={styles.ustaRatingAndRoleColumn}>
            <View style={styles.ustaRatingRow}>
              <Text style={styles.ustaRatingText}>{(user as any)?.averageRating?.toFixed(1) || '4.9'}</Text>
              <Ionicons name="star" size={13} color="#FBBF24" style={{ marginLeft: 2 }} />
            </View>
            <Text style={styles.ustaRoleText}>
              {ustaCategoryTitle} Ustası
            </Text>
          </View>

          <TouchableOpacity
            style={styles.ustaAvatarContainer}
            activeOpacity={0.8}
            onPress={() => handleActionWithAuth('/profile')}
          >
            {user?.profileImageUrl ? (
              <Image source={{ uri: getFileUrl(user.profileImageUrl) || '' }} style={styles.ustaAvatarImage} />
            ) : (
              <View style={styles.ustaAvatarPlaceholder}>
                <Ionicons name="person" size={20} color="#043A2F" />
              </View>
            )}
          </TouchableOpacity>

          {/* Elegant notification bell */}
          <TouchableOpacity
            style={styles.headerLinkButton}
            activeOpacity={0.7}
            onPress={() => handleActionWithAuth('/profile/notifications')}
          >
            <Ionicons name="notifications-outline" size={24} color={colors.white} />
            {unreadCount > 0 && (
              <Animated.View style={[styles.notificationBadge, { transform: [{ scale: badgePulseAnim }] }]}>
                <Text style={styles.notificationBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </Animated.View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Dashboard cards inside the gradient background exactly as in mockup */}
      <View style={styles.ustaHeaderDashboardRow}>
        <TouchableOpacity
          style={[styles.ustaDashboardCardDark, styles.glowPrimary]}
          onPress={() => handleActionWithAuth('/electrician/stats')}
          activeOpacity={0.85}
        >
          <Text style={styles.ustaDashCardLabel}>Toplam Kazanç</Text>
          <Text style={styles.ustaDashCardValue}>
            {stats ? `₺${stats.totalEarnings.toLocaleString('tr-TR')}` : '₺0.00'}
          </Text>
          <Text style={styles.ustaDashCardSub}>Tüm Zamanlar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.ustaDashboardCardDark, styles.glowAccent]}
          onPress={() => handleActionWithAuth('/(tabs)/jobs', { tab: 'bids' })}
          activeOpacity={0.85}
        >
          <Text style={styles.ustaDashCardLabel}>Aktif Teklifler</Text>
          <Text style={styles.ustaDashCardValue}>
            {stats ? stats.activeBids : '0'}
          </Text>
          <Text style={styles.ustaDashCardSub}>Bekleyen</Text>
        </TouchableOpacity>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    marginRight: 12,
  },
  ustaHeaderNameContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  ustaHeaderNameLine: {
    fontFamily: fonts.extraBold,
    fontSize: 24,
    color: staticColors.white,
    letterSpacing: -0.5,
    lineHeight: 28,
    textTransform: 'uppercase',
  },
  ustaHeaderRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ustaRatingAndRoleColumn: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  ustaRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ustaRatingText: {
    fontFamily: fonts.extraBold,
    fontSize: 16,
    color: staticColors.white,
  },
  ustaRoleText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  ustaAvatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
  },
  ustaAvatarImage: {
    width: '100%',
    height: '100%',
  },
  ustaAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerLinkButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#0D9488',
  },
  notificationBadgeText: {
    color: '#FFF',
    fontSize: 8,
    fontFamily: fonts.bold,
  },
  ustaHeaderDashboardRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 6,
  },
  ustaDashboardCardDark: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  glowPrimary: {
    shadowColor: '#FF4B2B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  glowAccent: {
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  ustaDashCardLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 6,
  },
  ustaDashCardValue: {
    fontFamily: fonts.extraBold,
    fontSize: 22,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  ustaDashCardSub: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
  },
});
