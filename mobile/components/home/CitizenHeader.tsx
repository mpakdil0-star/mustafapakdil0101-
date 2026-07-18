import React from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { fonts } from '../../constants/typography';
import { getFileUrl } from '../../constants/api';

interface CitizenHeaderProps {
  user: any;
  isAuthenticated: boolean;
  unreadCount: number;
  badgePulseAnim: any;
  handleActionWithAuth: (route: string, params?: any) => void;
  colors: any;
  onSearchPress?: () => void;
}

export const CitizenHeader: React.FC<CitizenHeaderProps> = ({
  user,
  isAuthenticated,
  unreadCount,
  badgePulseAnim,
  handleActionWithAuth,
  colors,
  onSearchPress,
}) => {
  const router = useRouter();
  const displayFullName = isAuthenticated ? (user?.fullName || 'Vatandaş') : 'Misafir';

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
            style={styles.avatarButton}
            activeOpacity={0.8}
            onPress={() => handleActionWithAuth('/profile')}
          >
            {user?.profileImageUrl ? (
              <Image source={{ uri: getFileUrl(user.profileImageUrl) || '' }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person" size={21} color="rgba(255,255,255,0.9)" />
            )}
          </TouchableOpacity>
        )}

        <View style={styles.greetingBlock}>
          <Text style={styles.greetingLabel} maxFontSizeMultiplier={1.25}>Hoş geldiniz</Text>
          <Text style={styles.greetingName} numberOfLines={1} maxFontSizeMultiplier={1.2}>{displayFullName}</Text>
        </View>

        <TouchableOpacity
          style={styles.iconButton}
          activeOpacity={0.75}
          onPress={() => handleActionWithAuth('/profile/notifications')}
        >
          <Ionicons name="notifications-outline" size={21} color="#FFFFFF" />
          {isAuthenticated && unreadCount > 0 && (
            <Animated.View
              style={[
                styles.notificationBadge,
                { transform: [{ scale: badgePulseAnim }], borderColor: colors.primary || '#0D9488' },
              ]}
            >
              <Text style={styles.notificationBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </Animated.View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <TouchableOpacity style={styles.searchButton} activeOpacity={0.78} onPress={onSearchPress}>
          <Ionicons name="search-outline" size={19} color="rgba(255,255,255,0.88)" />
          <Text style={styles.searchPlaceholder} numberOfLines={1} maxFontSizeMultiplier={1.2}>Hangi hizmete ihtiyacınız var?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.aiButton}
          activeOpacity={0.82}
          accessibilityLabel="Yapay zekâ asistanını aç"
          onPress={() => router.push({ pathname: '/ai-assistant', params: { role: 'CITIZEN' } })}
        >
          <Ionicons name="sparkles" size={18} color="#5EEAD4" />
          <Text style={styles.aiText} maxFontSizeMultiplier={1.15}>AI</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    marginBottom: 14,
  },
  avatarButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  greetingBlock: {
    flex: 1,
    paddingHorizontal: 12,
  },
  greetingLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontFamily: fonts.medium,
    fontSize: 11.5,
    marginBottom: 1,
  },
  greetingName: {
    color: '#FFFFFF',
    fontFamily: fonts.extraBold,
    fontSize: 18,
    letterSpacing: -0.2,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontFamily: fonts.bold,
    fontSize: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  searchButton: {
    flex: 1,
    height: 48,
    borderRadius: 15,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  searchPlaceholder: {
    flex: 1,
    color: 'rgba(255,255,255,0.84)',
    fontFamily: fonts.medium,
    fontSize: 12.5,
  },
  aiButton: {
    width: 58,
    height: 48,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: 'rgba(13,148,136,0.24)',
    borderWidth: 1,
    borderColor: 'rgba(94,234,212,0.35)',
  },
  aiText: {
    color: '#CCFBF1',
    fontFamily: fonts.extraBold,
    fontSize: 11,
    letterSpacing: 0.3,
  },
});
