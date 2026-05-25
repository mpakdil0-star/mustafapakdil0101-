import React from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../../constants/typography';
import { getFileUrl } from '../../constants/api';

interface CitizenHeaderProps {
  user: any;
  isAuthenticated: boolean;
  unreadCount: number;
  badgePulseAnim: any;
  handleActionWithAuth: (route: string, params?: any) => void;
  colors: any;
}

export const CitizenHeader: React.FC<CitizenHeaderProps> = ({
  user,
  isAuthenticated,
  unreadCount,
  badgePulseAnim,
  handleActionWithAuth,
  colors,
}) => {
  return (
    <View style={styles.container}>
      {/* Top Header Row (Logo, Profile/Avatar, Notification Bell) */}
      <View style={styles.headerTopRow}>
        <View style={styles.logoContainer}>
          <Text style={styles.citizenTitleText}>İşbitir</Text>
          <View style={[styles.logoDot, { backgroundColor: colors.secondary || '#0EA5E9' }]} />
        </View>

        <View style={styles.citizenRightIcons}>
          {/* Circular avatar if authenticated, otherwise person icon */}
          <TouchableOpacity
            style={[styles.citizenAvatarContainer, { borderColor: 'rgba(255, 255, 255, 0.35)' }]}
            activeOpacity={0.8}
            onPress={() => handleActionWithAuth('/profile')}
          >
            {isAuthenticated && user?.profileImageUrl ? (
              <Image
                source={{ uri: getFileUrl(user.profileImageUrl) || '' }}
                style={styles.citizenAvatarImage}
              />
            ) : (
              <View style={styles.citizenAvatarPlaceholder}>
                <Ionicons name="person-outline" size={17} color="#FFF" />
              </View>
            )}
          </TouchableOpacity>

          {/* Elegant Notification Bell with Pulsing Badge */}
          <TouchableOpacity
            style={styles.headerLinkButton}
            activeOpacity={0.7}
            onPress={() => handleActionWithAuth('/profile/notifications')}
          >
            <Ionicons name="notifications-outline" size={24} color="#FFF" />
            {unreadCount > 0 && (
              <Animated.View style={[styles.notificationBadge, { transform: [{ scale: badgePulseAnim }] }]}>
                <Text style={styles.notificationBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </Animated.View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Full-Width Glassmorphic Search Bar */}
      <TouchableOpacity
        style={styles.headerFullSearchBar}
        activeOpacity={0.85}
        onPress={() => handleActionWithAuth('/electricians')}
      >
        <View style={styles.headerFullSearchInner}>
          <Ionicons name="search-outline" size={18} color="rgba(255, 255, 255, 0.75)" />
          <Text style={styles.headerFullSearchPlaceholder}>Güvenilir Usta veya Hizmet Arayın...</Text>
        </View>
        <View style={styles.headerSearchActionCircleGlass}>
          <Ionicons name="funnel-outline" size={13} color="rgba(255, 255, 255, 0.85)" />
        </View>
      </TouchableOpacity>

      {/* Neon-Glass Quick Search Pills / Category Capsules */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.quickPillsContainer}
      >
        {[
          { emoji: '⚡', label: 'Elektrik', color: '#FBBF24', id: 'elektrik' },
          { emoji: '🔑', label: 'Çilingir', color: '#60A5FA', id: 'cilingir' },
          { emoji: '❄️', label: 'Klima', color: '#34D399', id: 'klima' },
          { emoji: '🔧', label: 'Beyaz Eşya', color: '#A78BFA', id: 'beyaz-esya' },
          { emoji: '🚿', label: 'Su/Tesisat', color: '#38BDF8', id: 'tesisat' },
        ].map((pill) => (
          <TouchableOpacity
            key={pill.id}
            style={styles.quickPillButton}
            activeOpacity={0.8}
            onPress={() => handleActionWithAuth('/jobs/create', { serviceCategory: pill.id })}
          >
            <Text style={styles.quickPillEmoji}>{pill.emoji}</Text>
            <Text style={styles.quickPillText}>{pill.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 2,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  citizenTitleText: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: '#FFF',
    letterSpacing: 0.5,
  },
  logoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginBottom: 4,
  },
  citizenRightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  citizenAvatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  citizenAvatarImage: {
    width: '100%',
    height: '100%',
  },
  citizenAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerLinkButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1,
    borderColor: '#FFF',
  },
  notificationBadgeText: {
    color: '#FFF',
    fontFamily: fonts.bold,
    fontSize: 9,
    textAlign: 'center',
  },
  headerFullSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    borderRadius: 14,
    height: 48,
    paddingHorizontal: 16,
    marginBottom: 16,
    width: '100%',
  },
  headerFullSearchInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerFullSearchPlaceholder: {
    fontFamily: fonts.medium,
    fontSize: 12.5,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  headerSearchActionCircleGlass: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  quickPillsContainer: {
    paddingVertical: 2,
    gap: 8,
  },
  quickPillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 5,
  },
  quickPillEmoji: {
    fontSize: 13,
  },
  quickPillText: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.95)',
    letterSpacing: 0.2,
  },
});
