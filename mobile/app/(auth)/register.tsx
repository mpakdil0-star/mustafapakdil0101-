import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Animated,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { register, googleLogin, appleLogin, getMe } from '../../store/slices/authSlice';
import { Input } from '../../components/common/Input';
import { validateEmail, validatePassword, validateFullName, validatePhone } from '../../utils/validation';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';
import { PremiumAlert } from '../../components/common/PremiumAlert';
import { API_BASE_URL } from '../../constants/api';
import api from '../../services/api';
import { SERVICE_CATEGORIES } from '../../constants/serviceCategories';
import { LEGAL_TEXTS } from '../../constants/legalTexts';

export default function RegisterScreen() {
  const router = useRouter();
  const { initialRole, serviceCategory: paramServiceCategory, redirectTo, type } = useLocalSearchParams<{
    initialRole?: string;
    serviceCategory?: string;
    redirectTo?: string;
    type?: string;
  }>();
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.auth);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);

  const effectiveRole = type || initialRole;
  const userType = effectiveRole === 'ELECTRICIAN' ? 'ELECTRICIAN' : 'CITIZEN';
  const serviceCategory = paramServiceCategory || 'elektrik';
  const [marketingAllowed, setMarketingAllowed] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const formAnimation = useRef(new Animated.Value(0)).current;
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [kvkkAccepted, setKvkkAccepted] = useState(false);
  const [showLegalError, setShowLegalError] = useState(false);
  const shakeAnimation = useRef(new Animated.Value(0)).current;

  // Email Verification Modal States
  const [emailVerifyModal, setEmailVerifyModal] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [registeredFullName, setRegisteredFullName] = useState('');
  const [mockCode, setMockCode] = useState<string | null>(null);
  const codeInputRef = useRef<TextInput>(null);

  const triggerLegalError = () => {
    setShowLegalError(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    
    // Shake animation
    Animated.sequence([
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true })
    ]).start();

    setTimeout(() => setShowLegalError(false), 3000);
  };

  // Phone modal states
  const [isPhoneModalVisible, setIsPhoneModalVisible] = useState(false);

  useEffect(() => {
    let interval: any;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const toggleManualForm = () => {
    const toValue = showManualForm ? 0 : 1;
    setShowManualForm(!showManualForm);
    Animated.spring(formAnimation, {
      toValue,
      useNativeDriver: false,
      tension: 20,
      friction: 7
    }).start();
  };

  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info' | 'confirm';
    buttons?: { text: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }[];
  }>({ visible: false, title: '', message: '' });

  const showAlert = (title: string, message: string, type: any = 'info', buttons?: any[]) => {
    setAlertConfig({ visible: true, title, message, type, buttons });
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    const nameErr = validateFullName(fullName);
    const emailErr = validateEmail(email);
    const phoneErr = validatePhone(phone);
    const passwordErr = validatePassword(password);

    if (nameErr) newErrors.fullName = nameErr;
    if (emailErr) newErrors.email = emailErr;
    if (passwordErr) newErrors.password = passwordErr;
    if (phoneErr) newErrors.phone = phoneErr;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendCode = async () => {
    setIsPhoneModalVisible(true);
  };

  const sendVerificationCode = async (emailAddr: string, name: string) => {
    try {
      const resp = await api.post('/auth/send-verification', { email: emailAddr, fullName: name });
      const data = resp.data;
      if (data.mockCode) {
        setMockCode(data.mockCode); 
      } else {
        setMockCode(null);
      }
      setResendTimer(120); 
      setEmailVerifyModal(true);
      setTimeout(() => codeInputRef.current?.focus(), 400);
    } catch (err) {
      console.warn('E-posta doğrulama isteği gönderilemedi:', err);
      // Still show the modal so user can retry with "Tekrar Gönder" button
      setResendTimer(0);
      setEmailVerifyModal(true);
    }
  };

  const handleVerifyCode = async () => {
    if (verifyCode.length !== 6) {
      setVerifyError('Lütfen 6 haneli kodu girin.');
      return;
    }

    setIsVerifying(true);
    setVerifyError('');

    try {
      const resp = await api.post('/auth/verify-email', { email: registeredEmail, code: verifyCode });
      const data = resp.data;
      if (data.success) {
        setEmailVerifyModal(false);
        await dispatch(getMe()).unwrap();
        
        showAlert('✅ Başarılı', 'E-posta adresiniz doğrulandı!', 'success', [
          { text: 'Tamam', onPress: () => navigateAfterRegister() }
        ]);
      } else {
        setVerifyError(data.error?.message || 'Geçersiz kod. Lütfen tekrar deneyin.');
      }
    } catch (err) {
      setVerifyError('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsVerifying(false);
    }
  };

  const navigateAfterRegister = () => {
    if (redirectTo) {
      router.replace(redirectTo as any);
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleGoogleLogin = async () => {
    if (!termsAccepted || !kvkkAccepted) {
      triggerLegalError();
      return;
    }
    setSocialLoading('google');
    try {
      await dispatch(googleLogin({ userType, serviceCategory: userType === 'ELECTRICIAN' ? serviceCategory : undefined })).unwrap();
    } catch (err: any) {
      console.error('Google registration error:', err);
      if (err !== 'CANCELLED') {
        showAlert('Google Kayıt Hatası', typeof err === 'string' ? err : 'Google ile kayıt yapılırken bir hata oluştu.', 'error');
      }
    } finally {
      setSocialLoading(null);
    }
  };

  const handleAppleLogin = async () => {
    if (!termsAccepted || !kvkkAccepted) {
      triggerLegalError();
      return;
    }
    setSocialLoading('apple');
    try {
      await dispatch(appleLogin({ userType, serviceCategory: userType === 'ELECTRICIAN' ? serviceCategory : undefined })).unwrap();
    } catch (err: any) {
      if (err !== 'CANCELLED') {
        showAlert('Apple Kayıt Hatası', typeof err === 'string' ? err : 'Apple ile kayıt yapılırken bir hata oluştu.', 'error');
      }
    } finally {
      setSocialLoading(null);
    }
  };

  const handleRegister = async (forceRegister = false) => {
    if (!validate()) return;
    if (!termsAccepted || !kvkkAccepted) {
      triggerLegalError();
      return;
    }

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
          acceptedLegalVersion: '25 Mart 2026 Tarihli Sözleşme',
          marketingAllowed
        })
      ).unwrap();

      setRegisteredEmail(email);
      setRegisteredFullName(fullName);
      setVerifyCode('');
      await sendVerificationCode(email, fullName);
    } catch (err: any) {
      showAlert('Kayıt Hatası', err?.message || err || 'Kayıt yapılırken bir hata oluştu.', 'error');
    }
  };

  const accentColor = userType === 'CITIZEN' ? '#7C3AED' : '#3B82F6';
  const [legalModal, setLegalModal] = useState<{ visible: boolean; type: 'KVKK' | 'TERMS' }>({ visible: false, type: 'KVKK' });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <Modal
        visible={emailVerifyModal}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={[styles.iconCircle, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="mail-open" size={32} color={colors.primary} />
              </View>
              <Text style={styles.modalTitle}>E-posta Doğrulama</Text>
              <Text style={styles.modalSubtitle}>
                E-posta adresinize 6 haneli doğrulama kodu gönderdik. Lütfen kodu aşağıya girin.
              </Text>

              {mockCode && (
                <View style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)' }}>
                  <Text style={{ color: '#34D399', fontSize: 12, textAlign: 'center', marginBottom: 4 }}>🧪 Test Modu — Gerçek E-posta Gönderilmedi</Text>
                  <Text style={{ color: colors.white, fontSize: 24, fontFamily: fonts.bold, textAlign: 'center', letterSpacing: 8 }}>{mockCode}</Text>
                </View>
              )}

              <TextInput
                ref={codeInputRef}
                style={styles.codeInput}
                value={verifyCode}
                onChangeText={setVerifyCode}
                placeholder="000000"
                placeholderTextColor="rgba(255,255,255,0.2)"
                keyboardType="number-pad"
                maxLength={6}
              />

              {verifyError ? <Text style={styles.errorText}>{verifyError}</Text> : null}

              <TouchableOpacity
                style={[styles.verifyButton, isVerifying && { opacity: 0.7 }]}
                onPress={handleVerifyCode}
                disabled={isVerifying}
              >
                <LinearGradient
                  colors={colors.gradientPrimary as any}
                  style={styles.verifyButtonGradient}
                >
                  <Text style={styles.verifyButtonText}>{isVerifying ? 'Doğrulanıyor...' : 'Doğrula'}</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => resendTimer === 0 && sendVerificationCode(registeredEmail, registeredFullName)}
                disabled={resendTimer > 0}
                style={{ marginTop: 20 }}
              >
                <Text style={[styles.resendText, resendTimer > 0 && { opacity: 0.5 }]}>
                  {resendTimer > 0 ? `Kodu tekrar gönder (${resendTimer}s)` : 'Kodu tekrar gönder'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isPhoneModalVisible}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="call" size={48} color={accentColor} style={{ alignSelf: 'center', marginBottom: 16 }} />
            <Text style={styles.modalTitle}>Telefon Doğrulaması</Text>
            <Text style={styles.modalSubtitle}>
              Güvenliğiniz için telefon numaranızı doğrulamanız gerekmektedir. Devam etmek istiyor musunuz?
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: 'rgba(255,255,255,0.05)', flex: 1 }]}
                onPress={() => setIsPhoneModalVisible(false)}
              >
                <Text style={[styles.modalButtonText, { color: 'rgba(255,255,255,0.6)' }]}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: accentColor, flex: 1 }]}
                onPress={() => {
                  setIsPhoneModalVisible(false);
                  handleRegister(true);
                }}
              >
                <Text style={styles.modalButtonText}>Onayla</Text>
              </TouchableOpacity>
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
          <LinearGradient
            colors={userType === 'CITIZEN' ? ['#1E1B4B', '#4C1D95', '#1E1B4B'] : ['#0F172A', '#1E3A8A', '#0F172A']}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.glowBlob, { top: -100, right: -100, backgroundColor: accentColor }]} />

          <View style={styles.innerContent}>
            <View style={styles.headerTop}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={24} color={colors.white} />
              </TouchableOpacity>
            </View>

            <View style={styles.header}>
              <Text style={styles.title}>Kayıt Ol</Text>
              <Text style={styles.subtitle}>Sektörün uzmanlarını veya müşterilerini bulun</Text>
            </View>

            <View style={styles.roleBadgeContainer}>
              <View style={[styles.roleBadge, { backgroundColor: accentColor + '20', borderColor: accentColor }]}>
                <Ionicons
                  name={userType === 'ELECTRICIAN' ? 'construct' : 'person'}
                  size={16}
                  color={accentColor}
                />
                <Text style={[styles.roleBadgeText, { color: accentColor }]}>
                  {userType === 'ELECTRICIAN' 
                    ? `${SERVICE_CATEGORIES.find(c => c.id === serviceCategory)?.name || 'Usta'} olarak kayıt` 
                    : 'Müşteri olarak kayıt'}
                </Text>
                <TouchableOpacity
                  onPress={() => router.replace('/(auth)/role-select')}
                  style={styles.changeRoleBtn}
                >
                  <Text style={styles.changeRoleText}>Değiştir</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formSection}>
              <Animated.View style={[
                styles.legalErrorWrapper,
                showLegalError && styles.legalErrorActive,
                { transform: [{ translateX: shakeAnimation }] }
              ]}>
                <TouchableOpacity
                  style={styles.legalCheckboxContainer}
                  onPress={() => {
                    setTermsAccepted(!termsAccepted);
                    setKvkkAccepted(!kvkkAccepted);
                    setShowLegalError(false);
                  }}
                >
                  <View style={[
                    styles.checkbox,
                    (termsAccepted && kvkkAccepted) && { backgroundColor: accentColor, borderColor: accentColor },
                    showLegalError && { borderColor: '#EF4444', borderWidth: 2 }
                  ]}>
                    {(termsAccepted && kvkkAccepted) && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.legalLabel, showLegalError && { color: '#FFFFFF' }]}>
                      <Text style={styles.legalLink} onPress={() => setLegalModal({ visible: true, type: 'TERMS' })}>Kullanım Koşullarını</Text> ve <Text style={styles.legalLink} onPress={() => setLegalModal({ visible: true, type: 'KVKK' })}>KVKK Politikasını</Text> okudum, onaylıyorum.
                    </Text>
                  </View>
                </TouchableOpacity>
                {showLegalError && (
                  <View style={styles.legalErrorHint}>
                    <Text style={styles.legalErrorHintText}>Devam etmek için onayınız gerekli</Text>
                  </View>
                )}
              </Animated.View>

              <View style={{ height: 24 }} />

              <View style={styles.socialSection}>
                <TouchableOpacity
                  onPress={handleGoogleLogin}
                  disabled={isLoading || socialLoading !== null}
                  activeOpacity={0.85}
                  style={[styles.googleButtonWrapper, socialLoading === 'google' && { opacity: 0.7 }]}
                >
                  <LinearGradient
                    colors={['#EA4335', '#FBBC04', '#34A853', '#4285F4']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.googleButtonBorder}
                  >
                    <View style={styles.googleButtonInner}>
                      <Image
                        source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }}
                        style={styles.googleIcon}
                      />
                      <Text style={styles.googleButtonText}>
                        {socialLoading === 'google' ? 'Bağlanıyor...' : 'Google ile kayıt ol'}
                      </Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>

                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    onPress={handleAppleLogin}
                    disabled={isLoading || socialLoading !== null}
                    activeOpacity={0.8}
                    style={[styles.socialButton, styles.socialButtonApple, socialLoading === 'apple' && { opacity: 0.7 }]}
                  >
                    <View style={styles.socialButtonInner}>
                      <Ionicons name="logo-apple" size={22} color="#FFFFFF" />
                      <Text style={[styles.socialButtonText, styles.socialButtonTextApple]}>
                        {socialLoading === 'apple' ? 'Bağlanıyor...' : 'Apple ile kayıt ol'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                onPress={toggleManualForm}
                style={styles.toggleFormButton}
                activeOpacity={0.7}
              >
                <View style={styles.socialDivider}>
                  <View style={styles.socialDividerLine} />
                  <View style={styles.dividerContent}>
                    <Text style={styles.dividerText}>veya e-posta ile kayıt ol</Text>
                    <Ionicons
                      name={showManualForm ? "chevron-up" : "chevron-down"}
                      size={14}
                      color="rgba(255,255,255,0.5)"
                    />
                  </View>
                  <View style={styles.socialDividerLine} />
                </View>
              </TouchableOpacity>

              {showManualForm && (
                <Animated.View style={{
                  opacity: formAnimation,
                  transform: [{
                    translateY: formAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 0]
                    })
                  }]
                }}>
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

                  {error && (
                    <View style={styles.errorContainer}>
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    onPress={() => handleRegister()}
                    disabled={isLoading}
                    activeOpacity={0.8}
                    style={[
                      styles.registerButtonWrapper,
                      { shadowColor: accentColor }
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
                </Animated.View>
              )}

              <View style={styles.loginLink}>
                <Text style={styles.loginLinkText}>Zaten hesabınız var mı? </Text>
                <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
                  <Text style={[styles.loginLinkHighlight, { color: accentColor }]}>Giriş Yap</Text>
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

      <Modal
        visible={legalModal.visible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.legalModalContainer}>
          <View style={styles.legalModalContent}>
            <View style={styles.legalModalHeader}>
              <Text style={styles.legalModalTitle}>
                {legalModal.type === 'KVKK' ? 'KVKK Aydınlatma Metni' : 'Kullanım Koşulları'}
              </Text>
              <TouchableOpacity onPress={() => setLegalModal({ ...legalModal, visible: false })}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.legalModalBody} showsVerticalScrollIndicator={true}>
              <Text style={styles.legalText}>
                {legalModal.type === 'KVKK' ? LEGAL_TEXTS.KVKK : LEGAL_TEXTS.TERMS}
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>


    </KeyboardAvoidingView>
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
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xl,
  },
  headerTop: {
    height: 50,
    justifyContent: 'center',
    marginBottom: spacing.md,
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
    opacity: 0.15,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontFamily: fonts.extraBold,
    fontSize: 32,
    color: colors.white,
    letterSpacing: -1,
  },
  subtitle: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
  },
  roleBadgeContainer: {
    marginBottom: spacing.xl,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  changeRoleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
  },
  changeRoleText: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.white,
  },
  formSection: {
    flex: 1,
  },
  legalCheckboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 8,
  },
  legalErrorWrapper: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  legalErrorActive: {
    borderColor: '#F87171',
    backgroundColor: 'rgba(248, 113, 113, 0.08)',
    borderWidth: 1.2,
  },
  legalErrorHint: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 6,
    marginTop: -2,
  },
  legalErrorHintText: {
    color: '#F87171',
    fontSize: 11,
    fontFamily: fonts.medium,
    letterSpacing: 0.3,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  legalLabel: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: 18,
  },
  legalLink: {
    color: colors.white,
    textDecorationLine: 'underline',
  },
  socialSection: {
    marginBottom: 10,
  },
  googleButtonWrapper: {
    marginBottom: 14,
    borderRadius: 18,
    shadowColor: '#4285F4',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  googleButtonBorder: {
    borderRadius: 18,
    padding: 2,
  },
  googleButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  googleIcon: {
    width: 24,
    height: 24,
  },
  googleButtonText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: '#1F2937',
    letterSpacing: 0.3,
  },
  socialButton: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  socialButtonApple: {
    backgroundColor: '#000000',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  socialButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 12,
  },
  socialButtonText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: '#1F2937',
    letterSpacing: 0.2,
  },
  socialButtonTextApple: {
    color: '#FFFFFF',
  },
  toggleFormButton: {
    paddingVertical: 10,
    marginBottom: 10,
  },
  socialDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  socialDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  dividerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dividerText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    marginHorizontal: 8,
  },
  registerButtonWrapper: {
    marginTop: 20,
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
    color: colors.white,
  },
  errorContainer: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
  },
  errorText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: '#F87171',
    textAlign: 'center',
  },
  loginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  loginLinkText: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
  },
  loginLinkHighlight: {
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalHeader: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: fonts.bold,
    fontSize: 20,
    color: colors.white,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  codeInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    height: 64,
    width: '100%',
    textAlign: 'center',
    fontSize: 28,
    fontFamily: fonts.bold,
    color: colors.white,
    letterSpacing: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 20,
  },
  verifyButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  verifyButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  verifyButtonText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.white,
  },
  resendText: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.primary,
  },
  modalButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.white,
  },
  legalModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'flex-end',
  },
  legalModalContent: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    height: '80%',
    padding: 24,
  },
  legalModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  legalModalTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.white,
  },
  legalModalBody: {
    flex: 1,
  },
  legalText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 22,
    paddingBottom: 40,
  },
});
