import React from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { fonts } from '../../constants/typography';
import { getFileUrl } from '../../constants/api';

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
  newJobsCount: number;
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
  newJobsCount,
}) => {
  const router = useRouter();
  const rating = Number(user?.electricianProfile?.ratingAverage || stats?.rating || 0);
  const reviewCount = Number(user?.electricianProfile?.totalReviews || stats?.reviewCount || 0);
  const creditBalance = Number(user?.electricianProfile?.creditBalance || 0);
  const displayName = isAuthenticated
    ? `${firstName || ''} ${lastName || ''}`.trim() || user?.fullName || 'Usta'
    : 'Misafir Usta';
  const reputationText = reviewCount > 0
    ? `${rating.toFixed(1)} puan · ${reviewCount} yorum`
    : 'Henüz değerlendirme yok';

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        {!isAuthenticated ? (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/welcome'))}
            activeOpacity={0.75}
          >
            <Ionicons name="arrow-back" size={21} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.avatarButton, { borderColor: colors.accentGold || '#E5C158' }]}
            activeOpacity={0.8}
            onPress={() => handleActionWithAuth('/profile')}
          >
            {user?.profileImageUrl ? (
              <Image source={{ uri: getFileUrl(user.profileImageUrl) || '' }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person" size={23} color="rgba(255,255,255,0.9)" />
            )}
            {user?.isVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark" size={8} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>
        )}

        <View style={styles.identityBlock}>
          <Text style={styles.welcomeLabel} maxFontSizeMultiplier={1.2}>Hoş geldiniz</Text>
          <Text style={styles.name} numberOfLines={1} maxFontSizeMultiplier={1.15}>{displayName}</Text>
          <Text style={styles.meta} numberOfLines={1} maxFontSizeMultiplier={1.1}>
            {ustaCategoryTitle} · {reputationText}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.iconButton}
          activeOpacity={0.75}
          onPress={() => handleActionWithAuth('/profile/notifications')}
        >
          <Ionicons name="notifications-outline" size={21} color="#FFFFFF" />
          {isAuthenticated && unreadCount > 0 && (
            <Animated.View style={[styles.notificationBadge, { transform: [{ scale: badgePulseAnim }] }]}>
              <Text style={styles.notificationBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </Animated.View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.summaryCard}>
        <TouchableOpacity
          style={styles.summaryItem}
          activeOpacity={0.78}
          onPress={() => handleActionWithAuth('/profile/buy-credits')}
        >
          <View style={[styles.summaryIcon, { backgroundColor: 'rgba(229,193,88,0.14)' }]}>
            <Ionicons name="wallet-outline" size={16} color="#E5C158" />
          </View>
          <Text style={styles.summaryValue} numberOfLines={1} maxFontSizeMultiplier={1.1}>{creditBalance}</Text>
          <Text style={styles.summaryLabel} maxFontSizeMultiplier={1.1}>Kredi</Text>
        </TouchableOpacity>

        <View style={styles.summaryDivider} />

        <TouchableOpacity
          style={styles.summaryItem}
          activeOpacity={0.78}
          onPress={() => handleActionWithAuth('/(tabs)/jobs')}
        >
          <View style={[styles.summaryIcon, { backgroundColor: 'rgba(45,212,191,0.13)' }]}>
            <Ionicons name="briefcase-outline" size={16} color="#2DD4BF" />
          </View>
          <Text style={styles.summaryValue} numberOfLines={1} maxFontSizeMultiplier={1.1}>{newJobsCount}</Text>
          <Text style={styles.summaryLabel} maxFontSizeMultiplier={1.1}>Yeni iş</Text>
        </TouchableOpacity>

        <View style={styles.summaryDivider} />

        <TouchableOpacity
          style={styles.summaryItem}
          activeOpacity={0.78}
          onPress={() => handleActionWithAuth('/(tabs)/jobs', { tab: 'bids' })}
        >
          <View style={[styles.summaryIcon, { backgroundColor: 'rgba(96,165,250,0.13)' }]}>
            <Ionicons name="paper-plane-outline" size={16} color="#60A5FA" />
          </View>
          <Text style={styles.summaryValue} numberOfLines={1} maxFontSizeMultiplier={1.1}>{Number(stats?.activeBids || 0)}</Text>
          <Text style={styles.summaryLabel} maxFontSizeMultiplier={1.1}>Aktif teklif</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  topRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarButton: {
    width: 52,
    height: 52,
    borderRadius: 17,
    overflow: 'hidden',
    borderWidth: 1.5,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  verifiedBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityBlock: {
    flex: 1,
    paddingHorizontal: 12,
  },
  welcomeLabel: {
    color: 'rgba(255,255,255,0.62)',
    fontFamily: fonts.medium,
    fontSize: 10.5,
    marginBottom: 1,
  },
  name: {
    color: '#FFFFFF',
    fontFamily: fonts.extraBold,
    fontSize: 17.5,
    letterSpacing: -0.25,
  },
  meta: {
    color: 'rgba(255,255,255,0.7)',
    fontFamily: fonts.medium,
    fontSize: 9.8,
    marginTop: 2,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontFamily: fonts.bold,
    fontSize: 8,
  },
  summaryCard: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingHorizontal: 5,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.17)',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  summaryValue: {
    color: '#FFFFFF',
    fontFamily: fonts.extraBold,
    fontSize: 15,
    lineHeight: 18,
  },
  summaryLabel: {
    color: 'rgba(255,255,255,0.63)',
    fontFamily: fonts.medium,
    fontSize: 9,
    marginTop: 1,
  },
  summaryDivider: {
    width: 1,
    height: 38,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
});
