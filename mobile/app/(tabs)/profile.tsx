import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Image, Dimensions, Platform, ImageBackground, Modal, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { logout, setUser } from '../../store/slices/authSlice';
import { authService } from '../../services/authService';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import { colors as staticColors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';
import { PremiumAlert } from '../../components/common/PremiumAlert';
import { useAppColors } from '../../hooks/useAppColors';
import { getFileUrl } from '../../constants/api';
import { AuthGuardModal } from '../../components/common/AuthGuardModal';
import { SERVICE_CATEGORIES } from '../../constants/serviceCategories';

const { width } = Dimensions.get('window');


export default function ProfileScreen() {
  const router = useRouter();
  const colors = useAppColors();
  const dispatch = useAppDispatch();
  const { user, guestRole } = useAppSelector((state) => state.auth);
  const isElectrician = user?.userType === 'ELECTRICIAN' || guestRole === 'ELECTRICIAN';

  // Menü öğelerini bileşen içinde tanımla ki dinamik renklere erişebilsin
  const BASE_MENU_ITEMS = [
    { icon: 'person-outline', label: 'Profil Bilgileri', route: '/profile/edit', color: colors.primary },
  ];

  const CITIZEN_MENU_ITEMS = [
    { icon: 'heart-outline', label: 'Favori Ustalarım', route: '/profile/favorites', color: '#EF4444' },
  ];

  const ELECTRICIAN_MENU_ITEMS = [
    { icon: 'wallet-outline', label: 'Cüzdanım ve Krediler', route: '/profile/wallet', color: colors.primary },
    { icon: 'shield-checkmark-outline', label: 'Belge Onayı', route: '/profile/verification', color: '#10B981' },
    { icon: 'stats-chart-outline', label: 'İstatistiklerim', route: '/electrician/stats', color: '#8B5CF6' },
  ];

  const BOTTOM_MENU_ITEMS = [
    { icon: 'notifications-outline', label: 'Bildirim Ayarları', route: '/profile/notification_settings', color: '#6B7280' },
    { icon: 'shield-checkmark-outline', label: 'Güvenlik', route: '/profile/security', color: '#10B981' },
    { icon: 'document-text-outline', label: 'Kullanım Koşulları', route: '/legal/terms', color: '#6B7280' },
    { icon: 'shield-outline', label: 'KVKK Politikası', route: '/legal/kvkk', color: '#6B7280' },
    { icon: 'ban-outline', label: 'Engellenen Kullanıcılar', route: '/profile/blocked', color: '#F43F5E' },
    { icon: 'help-circle-outline', label: 'Yardım & Destek', route: '/profile/help', color: '#374151' },
  ];

  const ADMIN_MENU_ITEMS = [
    { icon: 'settings-outline', label: 'Sistem Yöneticisi', route: '/admin', color: '#6366F1' },
    { icon: 'people-outline', label: 'Kullanıcı Yönetimi', route: '/admin/users', color: '#8B5CF6' },
    { icon: 'shield-outline', label: 'Doğrulama Havuzu', route: '/profile/admin_verifications', color: staticColors.error },
  ];

  const menuItems = [
    ...BASE_MENU_ITEMS,
    ...(user?.userType === 'ADMIN' ? ADMIN_MENU_ITEMS : []),
    ...(isElectrician ? ELECTRICIAN_MENU_ITEMS : (user?.userType === 'CITIZEN' ? CITIZEN_MENU_ITEMS : [])),
    ...BOTTOM_MENU_ITEMS,
  ];

  const [showAuthModal, setShowAuthModal] = React.useState(false);
  const [pendingPath, setPendingPath] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [showLogoutModal, setShowLogoutModal] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const [alertConfig, setAlertConfig] = React.useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info' | 'confirm';
    buttons?: { text: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }[];
  }>({ visible: false, title: '', message: '' });

  const showAlert = (title: string, message: string, type: any = 'info', buttons?: any[]) => {
    setAlertConfig({ visible: true, title, message, type, buttons });
  };

  const handleMenuItemPress = (route: string) => {
    if (!user) {
      setPendingPath(route);
      setShowAuthModal(true);
      return;
    }
    router.push(route as any);
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await dispatch(logout());
      setShowLogoutModal(false);
      router.replace('/(auth)/login');
    } catch (error) {
      showAlert('Hata', 'Çıkış yapılırken bir hata oluştu.', 'error');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handlePhotoOptions = () => {
    const buttons = [
      { text: 'Fotoğraf Seç', onPress: handlePickImage, variant: 'primary' },
      ...(user?.profileImageUrl ? [{ text: 'Fotoğrafı Kaldır', onPress: handleRemovePhoto, variant: 'danger' }] : []),
      { text: 'İptal', onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })), variant: 'ghost' }
    ];

    setAlertConfig({
      visible: true,
      title: 'Profil Fotoğrafı',
      message: 'Profil fotoğrafınızı güncellemek veya kaldırmak mı istiyorsunuz?',
      type: 'info',
      buttons: buttons as any
    });
  };

  const handleRemovePhoto = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const updatedUser = await authService.removeAvatar();
      dispatch(setUser(updatedUser));
      showAlert('Başarılı', 'Profil fotoğrafı kaldırıldı', 'success');
    } catch (error: any) {
      dispatch(setUser({ ...user, profileImageUrl: undefined } as any));
      showAlert('Başarılı', 'Profil fotoğrafı kaldırıldı', 'success');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // Native cropper looks bad on Android, disabling it
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0].base64) {
        setIsLoading(true);
        try {
          const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
          console.log('📸 [PHOTO UPLOAD] Uploading photo...');
          const updatedUser = await authService.uploadAvatarBase64(base64Image);
          console.log('📸 [PHOTO UPLOAD] Backend response:', JSON.stringify(updatedUser, null, 2));
          console.log('📸 [PHOTO UPLOAD] User type in response:', updatedUser.userType);
          dispatch(setUser(updatedUser));
          console.log('📸 [PHOTO UPLOAD] Redux state updated');
          showAlert('Başarılı', 'Profil fotoğrafı güncellendi', 'success');
        } catch (error: any) {
          console.error('📸 [PHOTO UPLOAD] Error:', error);
          showAlert('Hata', error.message || 'Fotoğraf yüklenemedi', 'error');
        } finally {
          setIsLoading(false);
        }
      }
    } catch (error) {
      console.error('📸 [PHOTO UPLOAD] Picker error:', error);
      showAlert('Hata', 'Fotoğraf seçilirken bir hata oluştu', 'error');
      setIsLoading(false);
    }
  };



  if (!user) {
    return (
      <View style={styles.container}>
        <PremiumHeader
          title="Profilim"
          subtitle="Giriş yapın veya Kayıt olun"
          layout="tab"
          backgroundImage={require('../../assets/images/header_bg.png')}
        />
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.guestContent}>
          <Card style={styles.guestCard} elevated>
            <View style={[styles.guestIconContainer, { backgroundColor: colors.primary + '10' }]}>
              <Ionicons name="person-circle-outline" size={60} color={colors.primary} />
            </View>
            <Text style={[styles.guestTitle, { color: colors.text }]}>Profilinizi Yönetin</Text>
            <Text style={[styles.guestSubtitle, { color: staticColors.textSecondary }]}>
              Profilinizi oluşturarak ilan verebilir, teklif gönderebilir ve ustalarla anlık mesajlaşabilirsiniz.
            </Text>

            <Button
              title="Giriş Yap / Kayıt Ol"
              onPress={() => setShowAuthModal(true)}
              variant="primary"
              fullWidth
              style={styles.guestButton}
            />

            <TouchableOpacity
              style={styles.guestHelpButton}
              onPress={() => router.push('/profile/help')}
            >
              <Text style={[styles.guestHelpText, { color: colors.primary }]}>Yardım mı lazım? Bize ulaşın</Text>
            </TouchableOpacity>
          </Card>

          <Text style={[styles.versionText, { color: staticColors.textLight }]}>Versiyon 1.0.4 - Premium Misafir Modu</Text>
        </ScrollView>
        <AuthGuardModal
          visible={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onLogin={() => {
            setShowAuthModal(false);
            router.push('/(auth)/login');
          }}
          onRegister={() => {
            setShowAuthModal(false);
            router.push('/(auth)/role-select');
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PremiumHeader
        title="Profilim"
        subtitle="Hesabınızı Yönetin"
        layout="tab"
        backgroundImage={require('../../assets/images/header_bg.png')}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Profile Profile Card with Glass Glow */}
        <View style={[styles.profileCardContainer, !isElectrician && { shadowColor: (colors as any).shadowAmethyst || colors.primary }]}>
          <LinearGradient
            colors={isElectrician ? [staticColors.white, '#F1F5F9'] : (colors as any).gradientAmethystLight || [staticColors.white, '#F5F3FF']}
            style={[styles.profileCard, !isElectrician && { borderColor: (colors as any).borderAmethyst || 'rgba(167, 139, 250, 0.3)' }]}
          >
            <View style={styles.avatarGlowWrapper}>
              <View style={[styles.avatarGlow, { backgroundColor: colors.primary + '30' }]} />
              <TouchableOpacity
                onPress={handlePhotoOptions}
                activeOpacity={0.9}
                style={[styles.avatarMainContainer, !isElectrician && { shadowColor: (colors as any).shadowAmethyst || colors.primary }]}
              >
                {user?.profileImageUrl ? (
                  <Image
                    source={{ uri: getFileUrl(user.profileImageUrl) || '' }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary + '10' }]}>
                    <Text style={[styles.avatarText, { color: colors.primary }]}>
                      {user?.fullName?.charAt(0).toUpperCase() || 'U'}
                    </Text>
                  </View>
                )}
                <View style={[styles.cameraIconBadge, { backgroundColor: colors.primary }]}>
                  <Ionicons name="camera" size={14} color={staticColors.white} />
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.userMainInfo}>
              <Text style={[styles.userNameText, { color: colors.text }]}>{user?.fullName}</Text>
              <Text style={[styles.userEmailText, { color: staticColors.textSecondary }]}>{user?.email}</Text>
              {user?.phone && (
                <View style={styles.userPhoneRow}>
                  <Ionicons name="call-outline" size={14} color={staticColors.textLight} />
                  <Text style={[styles.userPhoneText, { color: staticColors.textLight }]}>{user.phone}</Text>
                </View>
              )}

              <View style={styles.userBadgesRow}>
                <View style={[styles.typeBadge, { backgroundColor: colors.primary + '15' }]}>
                  <Text style={[styles.typeBadgeText, { color: colors.primary }]}>
                    {user?.userType === 'ELECTRICIAN'
                      ? (SERVICE_CATEGORIES.find(c => c.id === (user as any)?.electricianProfile?.serviceCategory)?.name?.toUpperCase() || 'ELEKTRİKÇİ')
                      : 'BİREYSEL'
                    }
                  </Text>
                </View>
                {isElectrician && (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="shield-checkmark" size={12} color={staticColors.white} />
                    <Text style={styles.verifiedText}>ONAYLI USTA</Text>
                  </View>
                )}
              </View>

              {isElectrician && (
                <TouchableOpacity
                  style={styles.creditRow}
                  onPress={() => router.push('/profile/wallet')}
                >
                  <Ionicons name="flash" size={14} color="#F59E0B" />
                  <Text style={styles.creditText}>
                    Kalan Teklif Hakkı: <Text style={styles.creditValue}>{Number((user as any)?.electricianProfile?.creditBalance || 0)}</Text>
                  </Text>
                  <Ionicons name="chevron-forward" size={12} color="#92400E" style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              )}
            </View>
          </LinearGradient>
        </View>

        {/* Action Menu Sections */}
        <View style={styles.menuContainer}>
          <Text style={[styles.menuSectionHeader, { color: staticColors.textLight }]}>HESAP VE AYARLAR</Text>
          <Card variant="default" style={styles.menuGlassCard} padding={0}>
            {menuItems.map((item, index) => (
              <React.Fragment key={index}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleMenuItemPress(item.route)}
                  activeOpacity={0.6}
                >
                  <View style={styles.menuItemInner}>
                    <View style={[styles.menuIconBox, { backgroundColor: item.color + '10' }]}>
                      <Ionicons name={item.icon as any} size={20} color={item.color} />
                    </View>
                    <Text style={[styles.menuItemLabel, { color: colors.text }]}>{item.label}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={staticColors.textLight} />
                </TouchableOpacity>
                {index < menuItems.length - 1 && <View style={styles.menuSeparator} />}
              </React.Fragment>
            ))}
          </Card>
        </View>



        <Button
          title="ÇIKIŞ YAP"
          onPress={handleLogout}
          variant="danger"
          style={styles.exitBtn}
          icon={<Ionicons name="log-out-outline" size={20} color={staticColors.white} />}
        />

        <Text style={[styles.versionText, { color: staticColors.textLight }]}>Versiyon 1.0.4 - Premium</Text>
      </ScrollView>

      {/* Logout Confirmation Modal - Glass Glow Theme */}
      <Modal visible={showLogoutModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <LinearGradient
            colors={['rgba(255,255,255,0.98)', 'rgba(248, 250, 252, 0.95)']}
            style={styles.logoutModal}
          >
            <View style={styles.logoutIconWrapper}>
              <View style={styles.logoutIconGlow} />
              <LinearGradient
                colors={['#EF4444', '#DC2626']}
                style={styles.logoutIconBox}
              >
                <Ionicons name="log-out-outline" size={32} color={staticColors.white} />
              </LinearGradient>
            </View>

            <Text style={styles.logoutTitle}>Çıkış Yap</Text>
            <Text style={styles.logoutMessage}>
              Hesabınızdan çıkış yapmak istediğinize emin misiniz?
            </Text>

            <View style={styles.logoutBtnGroup}>
              <TouchableOpacity
                style={styles.logoutCancelBtn}
                onPress={() => setShowLogoutModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.logoutCancelBtnText}>Vazgeç</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.logoutConfirmBtn}
                onPress={confirmLogout}
                disabled={isLoggingOut}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#EF4444', '#DC2626']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.logoutConfirmBtnGradient}
                >
                  {isLoggingOut ? (
                    <ActivityIndicator size="small" color={staticColors.white} />
                  ) : (
                    <Text style={styles.logoutConfirmBtnText}>Çıkış Yap</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </Modal>

      <PremiumAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        buttons={alertConfig.buttons}
        onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  profileCardContainer: {
    marginTop: -20,
    zIndex: 10,
    shadowColor: staticColors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  profileCard: {
    borderRadius: 30,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  avatarGlowWrapper: {
    position: 'relative',
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    opacity: 0.6,
    transform: [{ scale: 1.2 }],
  },
  avatarMainContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: staticColors.white,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 46,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 46,
    backgroundColor: staticColors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontFamily: fonts.extraBold,
    fontSize: 36,
    color: staticColors.primary,
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: staticColors.primary,
    borderWidth: 3,
    borderColor: staticColors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userMainInfo: {
    alignItems: 'center',
  },
  userNameText: {
    fontFamily: fonts.extraBold,
    fontSize: 22,
    color: staticColors.text,
    letterSpacing: -0.5,
  },
  userEmailText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: staticColors.textSecondary,
    marginBottom: 4,
  },
  userPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  userPhoneText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: staticColors.textLight,
  },
  userBadgesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  typeBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 4,
  },
  verifiedText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: staticColors.white,
  },
  menuContainer: {
    marginTop: 24,
  },
  menuSectionHeader: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: staticColors.textLight,
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 8,
  },
  menuGlassCard: {
    borderRadius: 24,
    backgroundColor: staticColors.white,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: staticColors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  menuItemInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  menuIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemLabel: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: staticColors.text,
  },
  menuSeparator: {
    height: 1,
    backgroundColor: staticColors.borderLight,
    marginHorizontal: 16,
    opacity: 0.5,
  },
  exitBtn: {
    marginTop: 30,
    height: 56,
    borderRadius: 18,
    shadowColor: staticColors.error,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  versionText: {
    textAlign: 'center',
    marginTop: 24,
    fontFamily: fonts.medium,
    fontSize: 11,
    color: staticColors.textLight,
  },
  headerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  creditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  creditText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: '#92400E',
  },
  creditValue: {
    fontFamily: fonts.bold,
  },
  guestContent: {
    padding: spacing.md,
    alignItems: 'center',
    flexGrow: 1,
  },
  guestCard: {
    marginTop: spacing.lg,
    width: '100%',
    padding: 24,
    alignItems: 'center',
    borderRadius: 24,
    backgroundColor: staticColors.white,
  },
  guestIconContainer: {
    marginBottom: 16,
    backgroundColor: staticColors.primary + '10',
    padding: 16,
    borderRadius: 40,
  },
  guestTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 18,
    color: staticColors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  guestSubtitle: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: staticColors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  guestButton: {
    height: 50,
    borderRadius: 14,
  },
  guestHelpButton: {
    marginTop: 20,
    padding: 10,
  },
  guestHelpText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: staticColors.primary,
  },
  // Logout Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logoutModal: {
    width: '100%',
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 20,
  },
  logoutIconWrapper: {
    width: 90,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoutIconGlow: {
    position: 'absolute',
    width: 70,
    height: 70,
    backgroundColor: '#EF4444',
    borderRadius: 35,
    opacity: 0.25,
    transform: [{ scale: 1.5 }],
  },
  logoutIconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  logoutTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 22,
    color: staticColors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  logoutMessage: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: staticColors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  logoutBtnGroup: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  logoutCancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutCancelBtnText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: staticColors.textSecondary,
  },
  logoutConfirmBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    overflow: 'hidden',
  },
  logoutConfirmBtnGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutConfirmBtnText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: staticColors.white,
  },
});
