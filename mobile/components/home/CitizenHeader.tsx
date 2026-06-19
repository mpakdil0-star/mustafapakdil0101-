import React from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../../constants/typography';
import { getFileUrl } from '../../constants/api';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

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

      {/* Başlık Düzeni (Centered Header) */}
      <View style={styles.centeredHeader}>
        <Text style={styles.headerTitleMain}>HOŞGELDİN</Text>
        <Text style={styles.headerSubtitleSub}>
          {displayFullName}
        </Text>
      </View>

      {/* Profil Avatarı & Bildirim İkonu Alanı */}
      <View style={styles.profileRow}>
        {/* Sol Sütun Boşluk / Sürgülü Ayar (Simetri) */}
        <View style={styles.symmetricalLeftCol} />

        {/* Ortalanmış dairesel bir avatar (Etrafında gold/white border) */}
        <TouchableOpacity
          style={[styles.centeredAvatarContainer, { borderColor: 'rgba(255, 255, 255, 0.35)' }]}
          activeOpacity={0.8}
          onPress={() => handleActionWithAuth('/profile')}
        >
          {isAuthenticated && user?.profileImageUrl ? (
            <Image
              source={{ uri: getFileUrl(user.profileImageUrl) || '' }}
              style={styles.centeredAvatarImage}
            />
          ) : (
            <View style={styles.centeredAvatarPlaceholder}>
              <Ionicons name="person" size={32} color="rgba(255, 255, 255, 0.85)" />
            </View>
          )}
        </TouchableOpacity>

        {/* Bildirim zili avatarın sağ tarafında simetrik duracak */}
        <View style={styles.symmetricalRightCol}>
          <TouchableOpacity
            style={styles.notificationButton}
            activeOpacity={0.7}
            onPress={() => handleActionWithAuth('/profile/notifications')}
          >
            <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
            {isAuthenticated && unreadCount > 0 && (
              <Animated.View style={[styles.notificationBadge, { transform: [{ scale: badgePulseAnim }], borderColor: colors.primary || '#0D9488' }]}>
                <Text style={styles.notificationBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </Animated.View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Full-Width Glassmorphic Search Bar with Split Touch Targets */}
      <View style={styles.headerFullSearchBarContainer}>
        <TouchableOpacity
          style={styles.headerFullSearchInputArea}
          activeOpacity={0.7}
          onPress={onSearchPress}
        >
          <Ionicons name="search-outline" size={18} color="rgba(255, 255, 255, 0.85)" />
          <Text style={styles.headerFullSearchPlaceholder}>Hizmet veya Kategori Ara...</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.seeAllPillInsideSearch}
          activeOpacity={0.7}
          onPress={() => handleActionWithAuth('/electricians')}
        >
          <Text style={styles.seeAllPillText}>Tüm Ustalar</Text>
          <Ionicons name="arrow-forward" size={11} color="#FFFFFF" style={{ marginLeft: 3 }} />
        </TouchableOpacity>
      </View>

      {/* AI Assistant Quick Banner */}
      <TouchableOpacity
        style={styles.aiBannerContainer}
        activeOpacity={0.85}
        onPress={() => router.push({ pathname: '/ai-assistant', params: { role: 'CITIZEN' } })}
      >
        <LinearGradient
          colors={['rgba(13, 148, 136, 0.24)', 'rgba(45, 212, 191, 0.07)']}
          style={styles.aiBannerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}>
            <View style={styles.aiBannerIconCircle}>
              <Ionicons name="sparkles" size={14} color="#2DD4BF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.aiBannerTitle}>Arıza Teşhis Sihirbazı (AI)</Text>
              <Text style={styles.aiBannerSubtitle}>Arızayı tarif et, yapay zeka ilanını hazırlasın</Text>
            </View>
          </View>
          <View style={styles.aiBannerBadge}>
            <Text style={styles.aiBannerBadgeText}>Hemen Dene</Text>
            <Ionicons name="chevron-forward" size={11} color="#2DD4BF" />
          </View>
        </LinearGradient>
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
          { emoji: '🧹', label: 'Temizlik', color: '#C084FC', id: 'temizlik' },
          { emoji: '🚚', label: 'Nakliyat', color: '#FB923C', id: 'nakliyat' },
          { emoji: '🎨', label: 'Boya Badana', color: '#F472B6', id: 'boya-badana' },
          { emoji: '🛋️', label: 'Koltuk/Halı', color: '#34D399', id: 'koltuk-hali' },
          { emoji: '🔩', label: 'Mobilya', color: '#C084FC', id: 'mobilya-montaj' },
          { emoji: '📦', label: 'Küçük Nakliye', color: '#FACC15', id: 'kucuk-nakliye' },
          { emoji: '🔥', label: 'Kombi', color: '#F87171', id: 'kombi-servis' },
          { emoji: '🛗', label: 'Asansör', color: '#64748B', id: 'asansor' },
          { emoji: '🐛', label: 'İlaçlama', color: '#22D3EE', id: 'bocek-ilaclama' },
          { emoji: '📹', label: 'Güvenlik', color: '#818CF8', id: 'guvenlik-kamera' },
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
  backButtonAbsolute: {
    position: 'absolute',
    left: 0,
    top: 4,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  centeredHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  headerTitleMain: {
    fontFamily: fonts.extraBold,
    fontSize: 18,
    color: '#FFFFFF',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  headerSubtitleSub: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.75)',
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
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FFFFFF',
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontFamily: fonts.bold,
  },
  headerFullSearchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
    height: 48,
    paddingHorizontal: 16,
    marginBottom: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  headerFullSearchInputArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: '100%',
  },
  headerFullSearchPlaceholder: {
    fontFamily: fonts.medium,
    fontSize: 12.5,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  seeAllPillInsideSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  seeAllPillText: {
    fontFamily: fonts.bold,
    fontSize: 10.5,
    color: '#FFFFFF',
    letterSpacing: 0.2,
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
  aiBannerContainer: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.35)',
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: 'rgba(13, 148, 136, 0.1)',
    shadowColor: '#2DD4BF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 5,
  },
  aiBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    justifyContent: 'space-between',
  },
  aiBannerIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(45, 212, 191, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.35)',
  },
  aiBannerTitle: {
    fontFamily: fonts.bold,
    fontSize: 12.5,
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },
  aiBannerSubtitle: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 1,
  },
  aiBannerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(45, 212, 191, 0.22)',
    borderColor: 'rgba(45, 212, 191, 0.35)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 2,
  },
  aiBannerBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 9.5,
    color: '#2DD4BF',
  },
});
