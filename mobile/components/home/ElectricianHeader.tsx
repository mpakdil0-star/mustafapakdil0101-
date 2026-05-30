import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated, Easing } from 'react-native';
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

// Mini Sparkline component (pure View-based, no SVG needed)
const MiniSparkline: React.FC<{ color: string }> = ({ color }) => {
  // Decorative sparkline bars representing activity trend
  const bars = [3, 5, 4, 7, 6, 9, 8, 10, 7, 11, 9, 13];
  const maxBar = Math.max(...bars);

  return (
    <View style={sparkStyles.container}>
      {bars.map((val, i) => (
        <View
          key={i}
          style={[
            sparkStyles.bar,
            {
              height: (val / maxBar) * 22,
              backgroundColor: color,
              opacity: 0.3 + (val / maxBar) * 0.7,
            },
          ]}
        />
      ))}
    </View>
  );
};

const sparkStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 24,
    gap: 2,
    marginTop: 6,
    opacity: 0.85,
  },
  bar: {
    width: 3,
    borderRadius: 1.5,
    minHeight: 2,
  },
});

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

  // Gold halo pulse animation
  const haloPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(haloPulse, {
          toValue: 1.15,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(haloPulse, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [haloPulse]);

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

      {/* ÖNERİ 4: Tipografik Ayrım - İki satırlı başlık */}
      <View style={styles.centeredHeader}>
        <Text style={styles.headerSubLabel}>
          {isAuthenticated ? 'HOŞGELDİN' : 'HOŞGELDİNİZ'}
        </Text>
        <Text 
          style={styles.headerTitleMain}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {isAuthenticated ? `${firstName} ${lastName}`.toUpperCase() : 'MİSAFİR USTA'}
        </Text>
      </View>

      {/* Profil Avatarı & Bildirim İkonu Alanı */}
      <View style={styles.profileRow}>
        {/* Sol Sütun - Ayarlar Butonu (Simetri) */}
        <View style={styles.symmetricalLeftCol}>
          <TouchableOpacity
            style={styles.settingsButton}
            activeOpacity={0.7}
            onPress={() => handleActionWithAuth('/profile')}
          >
            <Ionicons name="settings-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* ÖNERİ 2: Altın Halo Pulse Efekti + Avatar */}
        <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
          {/* Animated Gold Halo Ring (behind avatar) */}
          <Animated.View
            style={[
              styles.avatarHaloRing,
              {
                borderColor: colors.accentGold || '#E5C158',
                transform: [{ scale: haloPulse }],
                opacity: haloPulse.interpolate({
                  inputRange: [1, 1.15],
                  outputRange: [0.25, 0],
                }),
              },
            ]}
          />

          <TouchableOpacity
            style={[styles.centeredAvatarContainer, { borderColor: colors.accentGold || '#E5C158', borderWidth: 2.5 }]}
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
              width: 22,
              height: 22,
              borderRadius: 11,
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 2.5,
              borderColor: colors.secondary || '#1E293B',
              shadowColor: '#10B981',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 3,
            }}>
              <Ionicons name="checkmark" size={11} color="#FFFFFF" />
            </View>
          )}
        </View>

        {/* Bildirim zili */}
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

      {/* ÖNERİ 5: Parlak ince glow ayırıcı çizgi */}
      <View style={styles.glowLineContainer}>
        <View style={styles.glowLineFade} />
        <View style={styles.glowLineCenter} />
        <View style={styles.glowLineFade} />
      </View>

      {/* ÖNERİ 1: Yüzer (Floating) Finansal Kart + ÖNERİ 3: Sparkline */}
      <View style={styles.floatingCardWrapper}>
        <View style={styles.unifiedCard}>
          {/* Sol Bölüm (Toplam Kazanç) */}
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
            {/* ÖNERİ 3: Sparkline */}
            <MiniSparkline color="#10B981" />
          </TouchableOpacity>

          {/* Dikey ayırıcı */}
          <View style={styles.verticalDivider} />

          {/* Sağ Bölüm (Aktif Teklifler) */}
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
            <Text style={[styles.unifiedCardSub, { marginTop: 6 }]}>Bekleyen</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    width: '100%',
    paddingBottom: 30, // Extra padding for floating card overhang
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

  // ÖNERİ 4: İki satırlı tipografi
  centeredHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 38,
    marginBottom: 14,
  },
  headerSubLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.55)',
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  headerTitleMain: {
    fontFamily: fonts.extraBold,
    fontSize: 22,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  headerSubtitleSub: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: '#CBD5E1',
    marginTop: 1,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
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

  // ÖNERİ 2: Altın Halo Ring (avatar arkasında)
  avatarHaloRing: {
    position: 'absolute',
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 2.5,
    borderColor: '#E5C158',
  },

  centeredAvatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2.5,
    borderColor: '#E5C158',
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#E5C158',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
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
  ratingBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 9,
    color: '#E5C158',
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
    borderColor: '#1E293B',
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontFamily: fonts.bold,
  },

  // ÖNERİ 5: Glow Line (parlak ince çizgi)
  glowLineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 6,
    height: 1,
  },
  glowLineFade: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(229, 193, 88, 0.06)',
  },
  glowLineCenter: {
    width: 120,
    height: 1,
    backgroundColor: 'rgba(229, 193, 88, 0.25)',
    borderRadius: 1,
    shadowColor: '#E5C158',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 1,
  },

  // ÖNERİ 1: Floating card
  floatingCardWrapper: {
    marginHorizontal: 4,
    marginTop: 4,
    marginBottom: -26, // Overflows bottom of header into content below
    zIndex: 10,
  },
  unifiedCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  unifiedCardHalf: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verticalDivider: {
    width: 1,
    height: '80%',
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
    alignSelf: 'center',
    borderRadius: 1,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
  },
  unifiedCardLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  unifiedCardValue: {
    fontFamily: fonts.extraBold,
    fontSize: 22,
    color: '#2E5C8A',
  },
  unifiedCardValueDark: {
    fontFamily: fonts.extraBold,
    fontSize: 22,
    color: '#2E5C8A',
  },
  unifiedCardSub: {
    fontFamily: fonts.medium,
    fontSize: 9,
    color: '#94A3B8',
  },
});
