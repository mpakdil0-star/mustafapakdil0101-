import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { PremiumAlert } from '../../components/common/PremiumAlert';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import LocationPicker from '../../components/common/LocationPicker';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { register } from '../../store/slices/authSlice';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { validateEmail, validatePassword, validateRequired, validatePhone } from '../../utils/validation';
import { colors as baseColors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';
import { SERVICE_CATEGORIES, ServiceCategory } from '../../constants/serviceCategories';

export default function RegisterScreen() {
  const router = useRouter();
  const { redirectTo, initialRole, serviceCategory: initialServiceCategory } = useLocalSearchParams<{ redirectTo?: string; initialRole?: 'CITIZEN' | 'ELECTRICIAN'; serviceCategory?: string }>();
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.auth);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [location, setLocation] = useState<{ city: string; district: string; address: string; latitude: number; longitude: number } | null>(null);
  // Use values from role-select screen
  const userType = initialRole === 'ELECTRICIAN' ? 'ELECTRICIAN' : 'CITIZEN';
  const serviceCategory = initialServiceCategory || 'elektrik';
  const [marketingAllowed, setMarketingAllowed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [kvkkAccepted, setKvkkAccepted] = useState(false);

  // Theme selection based on userType
  const colors = userType === 'CITIZEN' ? baseColors : (baseColors as any).ELECTRICIAN_COLORS || baseColors;
  const accentColor = userType === 'CITIZEN' ? '#7C3AED' : '#3B82F6';

  const [isPhoneModalVisible, setIsPhoneModalVisible] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [confirm, setConfirm] = useState<any>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info' | 'confirm';
    buttons?: { text: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }[];
  }>({ visible: false, title: '', message: '' });

  const [legalModal, setLegalModal] = useState<{ visible: boolean; type: string; title: string; content: string }>({
    visible: false,
    type: '',
    title: '',
    content: ''
  });

  const showAlert = (title: string, message: string, type: any = 'info', buttons?: any[]) => {
    setAlertConfig({ visible: true, title, message, type, buttons });
  };

  // userType and serviceCategory are now passed from role-select screen

  const validate = () => {
    const newErrors: Record<string, string> = {};

    const fullNameErr = validateRequired(fullName, 'Ad soyad');
    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);
    const phoneErr = validateRequired(phone, 'Telefon numarası') || validatePhone(phone);

    if (fullNameErr) newErrors.fullName = fullNameErr;
    if (emailErr) newErrors.email = emailErr;
    if (passwordErr) newErrors.password = passwordErr;
    if (phoneErr) newErrors.phone = phoneErr;

    // Location is optional for registration - user can set it later in profile

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };


  // Format phone number to E.164 (e.g. +905554443322)
  const formatPhoneNumber = (number: string) => {
    let cleaned = number.replace(/\D/g, '');
    if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
    if (!cleaned.startsWith('90')) cleaned = '90' + cleaned;
    return '+' + cleaned;
  };

  const handleSendCode = async () => {
    // SMS flow is currently placeholder
    setIsPhoneModalVisible(true);
  };

  const openLegalModal = async (type: string) => {
    try {
      const { getLegalDocuments } = await import('../../services/legalService');
      const docs = await getLegalDocuments();
      const found = docs.find(d => d.type.toLowerCase() === type.toLowerCase());
      if (found) {
        setLegalModal({
          visible: true,
          type: found.type,
          title: found.title,
          content: found.content
        });
      }
    } catch (err) {
      console.error('Failed to load legal doc for modal:', err);
    }
  };

  const handleRegister = async (forceRegister = false) => {
    if (!validate()) return;

    if (!termsAccepted || !kvkkAccepted) {
      showAlert('Bilgi', 'Devam etmek için Kullanıcı Sözleşmesi ve KVKK metinlerini onaylamanız gerekmektedir.', 'warning');
      return;
    }

    // Show confirmation modal for everyone since phone is mandatory
    if (!forceRegister) {
      setIsPhoneModalVisible(true);
      return;
    }

    try {
      await dispatch(
        register({
          fullName,
          email,
          phone,
          password,
          userType,
          serviceCategory: userType === 'ELECTRICIAN' ? serviceCategory : undefined,
          acceptedLegalVersion: 'v1.0', // Mandatory checkbox or notice
          marketingAllowed,
          location: location ? {
            city: location.city,
            district: location.district,
            address: location.address,
            latitude: location.latitude,
            longitude: location.longitude
          } : undefined
        })
      ).unwrap();

      // Small delay to let _layout.tsx handle navigation properly
      // This avoids race condition between register screen and root layout
      await new Promise(resolve => setTimeout(resolve, 500));

      try {
        if (redirectTo) {
          router.replace(redirectTo as any);
        } else {
          router.replace('/(tabs)');
        }
      } catch (navErr) {
        console.log('Navigation handled by _layout.tsx');
      }
    } catch (err: any) {
      showAlert('Kayıt Hatası', err || 'Kayıt olunamadı. Lütfen tekrar deneyin.', 'error');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <Modal
        visible={isPhoneModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsPhoneModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(15, 23, 42, 0.85)' }]}>
          <View style={[styles.modalContent, { backgroundColor: 'rgba(30, 41, 59, 0.98)', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }]}>
            <LinearGradient
              colors={[accentColor, accentColor + 'CC']}
              style={styles.modalHeader}
            >
              <Ionicons name="call-outline" size={32} color="#FFFFFF" />
              <Text style={styles.modalTitle}>Numaranızı Onaylayın</Text>
            </LinearGradient>

            <View style={styles.modalBody}>
              <View style={[styles.phoneDisplayContainer, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                <Text style={[styles.phoneLabelText, { color: 'rgba(255,255,255,0.5)' }]}>Kayıt Edilecek Numara:</Text>
                <Text style={[styles.phoneNumberDisplay, { color: accentColor }]}>{phone}</Text>
                <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>(0 ile başlayan 11 haneli numara)</Text>
              </View>

              <View style={[styles.infoBoxRed, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                <Ionicons name="information-circle-outline" size={20} color="#F87171" />
                <Text style={[styles.infoBoxText, { color: '#F87171' }]}>
                  {userType === 'ELECTRICIAN'
                    ? 'Bu numara daha sonra değiştirilemez ve "İlk Kayıt Bonusu" bu numaraya tanımlanacaktır.'
                    : 'Bu numara daha sonra değiştirilemez ve hesabınızın güvenliği bu numara üzerinden sağlanır.'}
                </Text>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalCancelButton, { backgroundColor: 'rgba(255,255,255,0.05)' }]}
                  onPress={() => setIsPhoneModalVisible(false)}
                >
                  <Text style={[styles.modalCancelText, { color: 'rgba(255,255,255,0.6)' }]}>Düzenle</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalConfirmButton}
                  onPress={() => {
                    setIsPhoneModalVisible(false);
                    handleRegister(true);
                  }}
                >
                  <LinearGradient
                    colors={[accentColor, accentColor + 'CC']}
                    style={styles.modalConfirmGradient}
                  >
                    <Text style={styles.modalConfirmText}>Onaylıyorum</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Decorative Background Elements */}
          <LinearGradient
            colors={userType === 'CITIZEN' ? ['#1E1B4B', '#4C1D95', '#1E1B4B'] : ['#0F172A', '#1E3A8A', '#0F172A']}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.glowBlob, { top: -100, right: -100, backgroundColor: accentColor }]} />

          <View style={styles.innerContent}>
            {/* Header with Back Button */}
            <View style={styles.headerTop}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Kayıt Ol</Text>
              <Text style={styles.subtitle}>Sektörün uzmanlarını veya müşterilerini bulun</Text>
            </View>

            {/* Selected Role Badge */}
            <View style={styles.roleBadgeContainer}>
              <View style={[styles.roleBadge, { backgroundColor: accentColor + '20', borderColor: accentColor }]}>
                <Ionicons
                  name={userType === 'CITIZEN' ? 'person' : 'construct'}
                  size={16}
                  color={accentColor}
                />
                <Text style={[styles.roleBadgeText, { color: accentColor }]}>
                  {userType === 'CITIZEN'
                    ? 'Vatandaş olarak kayıt'
                    : `${SERVICE_CATEGORIES.find(c => c.id === serviceCategory)?.name || 'Usta'} olarak kayıt`
                  }
                </Text>
                <TouchableOpacity
                  onPress={() => router.back()}
                  style={styles.changeBadgeBtn}
                >
                  <Text style={[styles.changeBadgeText, { color: accentColor }]}>Değiştir</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Form */}
            <View style={styles.formSection}>
              <Input
                label="Ad Soyad"
                placeholder="Ahmet Yılmaz"
                value={fullName}
                onChangeText={(text: string) => {
                  setFullName(text);
                  setErrors({ ...errors, fullName: '' });
                }}
                error={errors.fullName}
                editable={!isLoading}
                labelStyle={{ color: 'rgba(255,255,255,0.95)' }}
                inputContainerStyle={{ backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.2)' }}
                style={{ color: '#FFFFFF' }}
                placeholderTextColor="rgba(255,255,255,0.45)"
              />

              <Input
                label="E-posta Adresi"
                placeholder="ornek@email.com"
                value={email}
                onChangeText={(text: string) => {
                  setEmail(text);
                  setErrors({ ...errors, email: '' });
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                error={errors.email}
                editable={!isLoading}
                labelStyle={{ color: 'rgba(255,255,255,0.95)' }}
                inputContainerStyle={{ backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.2)' }}
                style={{ color: '#FFFFFF' }}
                placeholderTextColor="rgba(255,255,255,0.45)"
              />

              <Input
                label="Telefon Numarası"
                placeholder="05XX XXX XX XX"
                value={phone}
                onChangeText={(text: string) => {
                  setPhone(text);
                  setErrors({ ...errors, phone: '' });
                }}
                keyboardType="phone-pad"
                error={errors.phone}
                editable={!isLoading}
                labelStyle={{ color: 'rgba(255,255,255,0.95)' }}
                inputContainerStyle={{ backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.2)' }}
                style={{ color: '#FFFFFF' }}
                placeholderTextColor="rgba(255,255,255,0.45)"
              />

              <Input
                label="Şifre"
                placeholder="En az 6 karakter"
                helperText="En az 6 karakter olmalıdır"
                value={password}
                onChangeText={(text: string) => {
                  setPassword(text);
                  setErrors({ ...errors, password: '' });
                }}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
                error={errors.password}
                editable={!isLoading}
                labelStyle={{ color: 'rgba(255,255,255,0.95)' }}
                inputContainerStyle={{ backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.2)' }}
                style={{ color: '#FFFFFF' }}
                placeholderTextColor="rgba(255,255,255,0.45)"
              />

              <View style={styles.legalSection}>
                <TouchableOpacity
                  style={styles.legalCheckboxContainer}
                  onPress={() => setTermsAccepted(!termsAccepted)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, termsAccepted && { backgroundColor: accentColor, borderColor: accentColor }]}>
                    {termsAccepted && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                  </View>
                  <Text style={styles.legalNoticeText}>
                    <Text style={[styles.legalLink, { color: accentColor }]} onPress={(e) => { e.stopPropagation(); openLegalModal('terms'); }}>Kullanıcı Sözleşmesi</Text>'ni okudum ve kabul ediyorum.
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.legalCheckboxContainer}
                  onPress={() => setKvkkAccepted(!kvkkAccepted)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, kvkkAccepted && { backgroundColor: accentColor, borderColor: accentColor }]}>
                    {kvkkAccepted && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                  </View>
                  <Text style={styles.legalNoticeText}>
                    <Text style={[styles.legalLink, { color: accentColor }]} onPress={(e) => { e.stopPropagation(); openLegalModal('kvkk'); }}>KVKK Aydınlatma Metni</Text>'ni okudum ve kabul ediyorum.
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.marketingContainer}
                onPress={() => setMarketingAllowed(!marketingAllowed)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, marketingAllowed && { backgroundColor: accentColor, borderColor: accentColor }]}>
                  {marketingAllowed && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                </View>
                <Text style={styles.marketingText}>Kampanya ve duyuruları e-posta/SMS yoluyla almayı kabul ediyorum.</Text>
              </TouchableOpacity>

              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <TouchableOpacity
                onPress={() => handleRegister()}
                disabled={isLoading || !termsAccepted || !kvkkAccepted}
                activeOpacity={0.8}
                style={[
                  styles.registerButtonWrapper,
                  { shadowColor: accentColor },
                  (!termsAccepted || !kvkkAccepted) && { opacity: 0.5 }
                ]}
              >
                <LinearGradient
                  colors={[accentColor, accentColor + 'CC']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.registerButtonGradient}
                >
                  <Text style={styles.registerButtonText}>Kayıt Ol</Text>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.loginLink}>
                <Text style={styles.loginLinkText}>Zaten hesabınız var mı? </Text>
                <TouchableOpacity onPress={() => router.back()} disabled={isLoading}>
                  <Text style={[styles.loginLinkButton, { color: accentColor }]}>Giriş Yap</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <PremiumAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        buttons={alertConfig.buttons}
        onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
      />

      {/* Legal Document Modal */}
      <Modal
        visible={legalModal.visible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setLegalModal(prev => ({ ...prev, visible: false }))}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: '#FFFFFF', height: '80%' }]}>
            <View style={[styles.modalHeader, { padding: 20, flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#eee' }]}>
              <Text style={[styles.modalTitle, { color: '#333' }]}>{legalModal.title}</Text>
              <TouchableOpacity onPress={() => setLegalModal(prev => ({ ...prev, visible: false }))}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              <Text style={{ fontSize: 14, lineHeight: 22, color: '#444' }}>{legalModal.content}</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    position: 'relative',
  },
  innerContent: {
    flex: 1,
    paddingHorizontal: spacing.screenPadding,
    paddingTop: Platform.OS === 'ios' ? spacing.xxxl : spacing.xl,
    paddingBottom: spacing.xl,
  },
  headerTop: {
    height: 50,
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  glowBlob: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.1,
  },
  header: {
    marginBottom: spacing.xl,
    marginTop: 20,
  },
  title: {
    fontFamily: fonts.extraBold,
    fontSize: 34,
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: -1,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
  },
  userTypeSection: {
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  userTypeContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  userTypeButton: {
    flex: 1,
    height: 100,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userTypeIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  userTypeText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  formSection: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 30,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    padding: spacing.md,
    borderRadius: 16,
    marginBottom: spacing.md,
  },
  errorText: {
    textAlign: 'center',
  },
  legalSection: {
    marginVertical: 12,
    gap: 8,
  },
  legalCheckboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 10,
  },
  legalNoticeText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 18,
  },
  legalLink: {
    fontFamily: fonts.bold,
    textDecorationLine: 'underline',
  },
  marketingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 8,
    gap: 10,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  marketingText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  registerButtonWrapper: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    borderRadius: 18,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  },
  registerButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  registerButtonText: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: '#FFFFFF',
  },
  loginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  loginLinkText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: 'rgba(255,255,255,0.65)',
  },
  loginLinkButton: {
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    borderRadius: 30,
    overflow: 'hidden',
  },
  modalHeader: {
    padding: 30,
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    fontFamily: fonts.bold,
    fontSize: 22,
    color: '#FFFFFF',
  },
  modalBody: {
    padding: 24,
  },
  phoneDisplayContainer: {
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  phoneLabelText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    marginBottom: 6,
  },
  phoneNumberDisplay: {
    fontFamily: fonts.bold,
    fontSize: 26,
    letterSpacing: 1.5,
  },
  infoBoxRed: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 18,
    gap: 12,
    marginBottom: 24,
  },
  infoBoxText: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  modalCancelText: {
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  modalConfirmButton: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalConfirmGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalConfirmText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryCard: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.sm,
  },
  categoryIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryText: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  // Role Badge Styles
  roleBadgeContainer: {
    marginBottom: 24,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  roleBadgeText: {
    flex: 1,
    fontFamily: fonts.semiBold,
    fontSize: 14,
  },
  changeBadgeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  changeBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 12,
  },
});
