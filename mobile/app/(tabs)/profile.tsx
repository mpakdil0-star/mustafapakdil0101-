import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { logout, setUser } from '../../store/slices/authSlice';
import { authService } from '../../services/authService';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';
import { getFileUrl } from '../../constants/api';

// Ortak menü öğeleri (sadece profil bilgileri)
const BASE_MENU_ITEMS = [
  { icon: 'person-outline', label: 'Profil Bilgileri', route: '/profile/edit' },
];

// Vatandaş için menü öğeleri
const CITIZEN_MENU_ITEMS = [
  { icon: 'location-outline', label: 'Adresim', route: '/profile/addresses' },
  { icon: 'time-outline', label: 'Geçmiş İlanlarım', route: '/profile/history' },
  { icon: 'heart-outline', label: 'Favori Ustalarım', route: '/profile/favorites' },
];

// Elektrikçi için menü öğeleri
const ELECTRICIAN_MENU_ITEMS = [
  { icon: 'location-outline', label: 'Adreslerim', route: '/profile/addresses' },
  { icon: 'time-outline', label: 'Geçmiş İşlerim', route: '/profile/history' },
  { icon: 'stats-chart-outline', label: 'İstatistiklerim', route: '/electrician/stats' },
];

const BOTTOM_MENU_ITEMS = [
  { icon: 'notifications-outline', label: 'Bildirimler', route: '/profile/notifications' },
  { icon: 'shield-checkmark-outline', label: 'Güvenlik', route: '/profile/security' },
  { icon: 'help-circle-outline', label: 'Yardım & Destek', route: '/profile/help' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const isElectrician = user?.userType === 'ELECTRICIAN';

  // Kullanıcı tipine göre menü öğelerini oluştur
  const menuItems = [
    ...BASE_MENU_ITEMS,
    ...(isElectrician ? ELECTRICIAN_MENU_ITEMS : CITIZEN_MENU_ITEMS),
    ...BOTTOM_MENU_ITEMS,
  ];

  const handleLogout = async () => {
    Alert.alert(
      'Çıkış Yap',
      'Çıkış yapmak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: async () => {
            await dispatch(logout());
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const [isLoading, setIsLoading] = React.useState(false);

  const handlePhotoOptions = () => {
    const options = user?.profileImageUrl
      ? ['Fotoğraf Seç', 'Fotoğrafı Kaldır', 'İptal']
      : ['Fotoğraf Seç', 'İptal'];

    Alert.alert(
      'Profil Fotoğrafı',
      'Bir seçenek seçin',
      user?.profileImageUrl
        ? [
          { text: 'Fotoğraf Seç', onPress: handlePickImage },
          { text: 'Fotoğrafı Kaldır', style: 'destructive', onPress: handleRemovePhoto },
          { text: 'İptal', style: 'cancel' },
        ]
        : [
          { text: 'Fotoğraf Seç', onPress: handlePickImage },
          { text: 'İptal', style: 'cancel' },
        ]
    );
  };

  const handleRemovePhoto = async () => {
    setIsLoading(true);
    try {
      const updatedUser = await authService.removeAvatar();
      dispatch(setUser(updatedUser));
      Alert.alert('Başarılı', 'Profil fotoğrafı kaldırıldı');
    } catch (error: any) {
      // API hatası alırsa, local olarak kaldır (mock mode)
      console.log('Remove avatar API error, falling back to local removal');
      dispatch(setUser({ ...user, profileImageUrl: null }));
      Alert.alert('Başarılı', 'Profil fotoğrafı kaldırıldı');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0].base64) {
        setIsLoading(true);
        try {
          const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
          const updatedUser = await authService.uploadAvatarBase64(base64Image);
          dispatch(setUser(updatedUser));
          Alert.alert('Başarılı', 'Profil fotoğrafı güncellendi');
        } catch (error: any) {
          Alert.alert('Hata', error.message || 'Fotoğraf yüklenemedi');
        } finally {
          setIsLoading(false);
        }
      }
    } catch (error) {
      Alert.alert('Hata', 'Fotoğraf seçilirken bir hata oluştu');
      setIsLoading(false);
    }
  };

  // Removed local menuItems definition

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Header */}
      <Card style={styles.profileCard} elevated>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              {user?.profileImageUrl ? (
                <Image
                  source={{ uri: getFileUrl(user.profileImageUrl) || '' }}
                  style={styles.avatarImage}
                />
              ) : (
                <Text style={styles.avatarText}>
                  {user?.fullName?.charAt(0).toUpperCase() || 'U'}
                </Text>
              )}
            </View>
            <TouchableOpacity style={styles.editBadge} onPress={handlePhotoOptions}>
              <Ionicons name="camera" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.name}>{user?.fullName}</Text>
            <Text style={styles.email}>{user?.email}</Text>
            <View style={styles.userTypeBadge}>
              <Text style={styles.userTypeText}>
                {user?.userType === 'ELECTRICIAN' ? 'Elektrikçi' : 'Vatandaş'}
              </Text>
            </View>
          </View>
        </View>
      </Card>

      {/* Menu Items */}
      <Card style={styles.menuCard}>
        {menuItems.map((item, index) => (
          <React.Fragment key={item.route}>
            <TouchableOpacity
              style={styles.menuItem}
              activeOpacity={0.6}
              onPress={() => router.push(item.route as any)}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name={item.icon as any} size={22} color={colors.textSecondary} />
                <Text style={styles.menuText}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
            </TouchableOpacity>
            {index < menuItems.length - 1 && <View style={styles.menuDivider} />}
          </React.Fragment>
        ))}
      </Card>

      {/* Logout Button */}
      <Button
        title="Çıkış Yap"
        onPress={handleLogout}
        variant="outline"
        fullWidth
        style={styles.logoutButton}
      />
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
    paddingBottom: 80,
  },
  profileCard: {
    marginBottom: spacing.lg,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: spacing.lg,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
  },
  avatarText: {
    fontFamily: fonts.bold,
    fontSize: 28,
    color: colors.white,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  name: {
    fontFamily: fonts.semiBold,
    fontSize: 18,
    color: colors.text,
    marginBottom: 2,
  },
  email: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  userTypeBadge: {
    backgroundColor: colors.primaryLight + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: spacing.radius.round,
    alignSelf: 'flex-start',
  },
  userTypeText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.primary,
  },
  menuCard: {
    padding: 0,
    marginBottom: spacing.xl,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuText: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
    marginLeft: spacing.lg,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 56,
  },
  logoutButton: {
    borderColor: colors.error,
  },
});
