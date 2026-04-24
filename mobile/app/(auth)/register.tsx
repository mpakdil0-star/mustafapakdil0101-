import { useState, useEffect, useRef } from 'react';
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
  TextInput,
  Image,
} from 'react-native';
import { PremiumAlert } from '../../components/common/PremiumAlert';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import LocationPicker from '../../components/common/LocationPicker';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { register, getMe, googleLogin, appleLogin } from '../../store/slices/authSlice';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { validateEmail, validatePassword, validateRequired, validatePhone } from '../../utils/validation';
import { colors as baseColors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';
import { SERVICE_CATEGORIES, ServiceCategory } from '../../constants/serviceCategories';
import { API_BASE_URL } from '../../constants/api';

export default function RegisterScreen() {
  const router = useRouter();
  const { redirectTo, initialRole, serviceCategory: initialServiceCategory } = useLocalSearchParams<{ redirectTo?: string; initialRole?: 'CITIZEN' | 'ELECTRICIAN'; serviceCategory?: string }>();
  const dispatch = useAppDispatch();
  const { isLoading, error, isAuthenticated } = useAppSelector((state) => state.auth);

  // Safety net: If authenticated but still on this screen after 1.5s, force navigation
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const timer = setTimeout(() => {
        console.log('🛡️ [Register] Safety net triggered - forcing navigation');
        router.replace('/(tabs)');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, isLoading]);

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

  // E-posta doğrulama state'leri
  const [emailVerifyModal, setEmailVerifyModal] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [mockCode, setMockCode] = useState<string | null>(null); // Test modunda gösterilir
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [registeredFullName, setRegisteredFullName] = useState('');
  const codeInputRef = useRef<TextInput>(null);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info' | 'confirm';
    buttons?: { text: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }[];
  }>({ visible: false, title: '', message: '' });

  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);

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

  // E-posta doğrulama kodu gönder
  const sendVerificationCode = async (emailAddr: string, name: string) => {
    try {
      const resp = await fetch(`${API_BASE_URL}auth/send-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailAddr, fullName: name }),
      });
      const data = await resp.json();
      if (data.mockCode) {
        setMockCode(data.mockCode); // Test modunda kodu göster
      } else {
        setMockCode(null);
      }
      setResendTimer(60); // Geri sayımı 60 saniyeden başlat
      setEmailVerifyModal(true);
      setTimeout(() => codeInputRef.current?.focus(), 400);
    } catch (err) {
      // Hata olursa doğrulamayı atla, ana sayfaya geç
      console.warn('E-posta doğrulama isteği gönderilemedi, atlanıyor.');
      navigateAfterRegister();
    }
  };

  // E-posta kodunu doğrula
  const handleVerifyCode = async () => {
    if (verifyCode.length !== 6) {
      setVerifyError('Lütfen 6 haneli kodu girin.');
      return;
    }
    setVerifyLoading(true);
    setVerifyError('');
    try {
      const resp = await fetch(`${API_BASE_URL}auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: registeredEmail, code: verifyCode }),
      });
      const data = await resp.json();
      if (data.success) {
        setEmailVerifyModal(false);
        // CRITICAL: Fetch updated user info to sync `isVerified: true` in Redux 
        // before _layout.tsx throws the user out to login screen
        await dispatch(getMe()).unwrap();
        
        showAlert('✅ Başarılı', 'E-posta adresiniz doğrulandı!', 'success', [
          { text: 'Devam Et', onPress: navigateAfterRegister, variant: 'primary' }
        ]);
      } else {
        setVerifyError(data.error?.message || 'Geçersiz kod.');
      }
    } catch (err) {
      setVerifyError('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const navigateAfterRegister = () => {
    try {
      router.replace('/(tabs)');
    } catch (navErr) {
      console.log('Navigation handled by _layout.tsx');
    }
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
          content: found.content.replace(/\\n/g, '\n')
        });
      }
    } catch (err) {
      console.error('Failed to load legal doc for modal:', err);
    }
  };

  // ============================================================
  // SOSYAL KAYIT
  // ============================================================

  const handleGoogleRegister = async () => {
    setSocialLoading('google');
    try {
      await dispatch(googleLogin({ userType, serviceCategory: userType === 'ELECTRICIAN' ? serviceCategory : undefined })).unwrap();
      
      // Rely on _layout.tsx for navigation
      console.log('✅ Google Login successful, waiting for _layout.tsx to handle redirect');
    } catch (err: any) {
      console.error('Google registration error:', err);
      if (err !== 'CANCELLED') {
        showAlert('Google Kayıt Hatası', 'Google ile kayıt işlemi yapılırken bir hata oluştu. Lütfen tekrar deneyin.', 'error');
      }
    } finally {
      setSocialLoading(null);
    }
  };

  const handleAppleRegister = async () => {
    setSocialLoading('apple');
    try {
      await dispatch(appleLogin({ userType, serviceCategory: userType === 'ELECTRICIAN' ? serviceCategory : undefined })).unwrap();
      
      // Rely on _layout.tsx for navigation
      console.log('✅ Apple Login successful, waiting for _layout.tsx to handle redirect');
    } catch (err: any) {
      if (err === 'CANCELLED') {
        // Kullanıcı iptal etti
      } else if (typeof err === 'string') {
        showAlert('Apple Kayıt Hatası', err, 'error');
      } else {
        showAlert('Apple Kayıt Hatası', 'Apple ile kayıt sırasında bir hata oluştu.', 'error');
      }
    } finally {
      setSocialLoading(null);
    }
  };

  const handleRegister = async (forceRegister = false) => {
    if (!validate()) return;

    if (!termsAccepted || !kvkkAccepted) {
      showAlert('Bilgi', 'Devam etmek için Kullanıcı Sözleşmesi ve KVKK metinlerini onaylamanız gerekmektedir.', 'warning');
      return;
    }

    // Show phone confirmation modal
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

      // Kayıt başarılı → e-posta doğrulama modalını göster
      setRegisteredEmail(email);
      setRegisteredFullName(fullName);
      setVerifyCode('');
      setVerifyError('');
      await sendVerificationCode(email, fullName);

    } catch (err: any) {
      showAlert('Kayıt Hatası', err || 'Kayıt olunamadı. Lütfen tekrar deneyin.', 'error');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* E-posta Doğrulama Modalı */}
      <Modal
        visible={emailVerifyModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {}}
      >
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(15, 23, 42, 0.95)' }]}>
          <View style={[styles.modalContent, { backgroundColor: 'rgba(20, 30, 55, 0.98)', borderColor: 'rgba(255,255,255,0.12)', borderWidth: 1 }]}>
            <LinearGradient
              colors={['#7C3AED', '#4F46E5']}
              style={styles.modalHeader}
            >
              <Ionicons name="mail-outline" size={36} color="#FFFFFF" />
              <Text style={styles.modalTitle}>E-posta Doğrulama</Text>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, textAlign: 'center', marginTop: 4 }}>
                {registeredEmail}
              </Text>
            </LinearGradient>

            <View style={styles.modalBody}>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, textAlign: 'center', marginBottom: 20, lineHeight: 21 }}>
                E-posta adresinize 6 haneli doğrulama kodu gönderdik. Lütfen kodu aşağıya girin.
              </Text>

              {/* Test modu: kodu direkt göster */}
              {mockCode && (
                <View style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)' }}>
                  <Text style={{ color: '#34D399', fontSize: 12, textAlign: 'center', marginBottom: 4 }}>🧪 Test Modu — Gerçek E-posta Gönderilmedi</Text>
                  <Text style={{ color: '#6EE7B7', fontSize: 26, textAlign: 'center', fontFamily: fonts.bold, letterSpacing: 8 }}>{mockCode}</Text>
                </View>
              )}

              {/* Kod giriş kutusu */}
              <TextInput
                ref={codeInputRef}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  borderWidth: 1.5,
                  borderColor: verifyError ? '#F87171' : 'rgba(124, 58, 237, 0.5)',
                  borderRadius: 16,
                  color: '#FFFFFF',
                  fontSize: 32,
                  fontFamily: fonts.bold,
                  letterSpacing: 10,
                  textAlign: 'center',
                  paddingVertical: 18,
                  marginBottom: 8,
                }}
                value={verifyCode}
                onChangeText={(t) => { setVerifyCode(t.replace(/\D/g, '').slice(0, 6)); setVerifyError(''); }}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="------"
                placeholderTextColor="rgba(255,255,255,0.2)"
              />

              {verifyError ? (
                <Text style={{ color: '#F87171', fontSize: 13, textAlign: 'center', marginBottom: 12 }}>{verifyError}</Text>
              ) : null}

              <TouchableOpacity
                style={[
                  { borderRadius: 14, overflow: 'hidden', marginTop: 8 },
                  (verifyLoading || verifyCode.length !== 6) && { opacity: 0.5 }
                ]}
                onPress={handleVerifyCode}
                disabled={verifyLoading || verifyCode.length !== 6}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={['#7C3AED', '#4F46E5']}
                  style={{ paddingVertical: 16, alignItems: 'center' }}
                >
                  <Text style={{ color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 16 }}>
                    {verifyLoading ? 'Doğrulanıyor...' : 'Doğrula'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ marginTop: 16, alignItems: 'center' }}
                onPress={() => sendVerificationCode(registeredEmail, registeredFullName)}
                disabled={resendTimer > 0}
              >
                <Text style={{ color: resendTimer > 0 ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.6)', fontSize: 13, fontFamily: fonts.medium }}>
                  {resendTimer > 0 ? `Kodu Tekrar Gönder (${resendTimer}s)` : 'Kodu Tekrar Gönder'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ marginTop: 24, paddingVertical: 8, alignItems: 'center' }}
                onPress={() => setEmailVerifyModal(false)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="arrow-back" size={14} color="#F87171" />
                  <Text style={{ color: '#F87171', fontSize: 13, fontFamily: fonts.semiBold }}>Geri Dön / Vazgeç</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
                    ? 'Bu numara daha sonra değiştirilemez ve başlangıç krediniz (5 kredi) bu numaraya tanımlanacaktır.'
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

              {/* ===== KVKK / Kullanım Koşulları Onayı (EN ÜSTTE) ===== */}
              <TouchableOpacity
                style={styles.legalCheckboxContainer}
                onPress={() => {
                  const val = !termsAccepted;
                  setTermsAccepted(val);
                  setKvkkAccepted(val);
                  setMarketingAllowed(val);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, termsAccepted && { backgroundColor: accentColor, borderColor: accentColor }]}>
                  {termsAccepted && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                </View>
                <Text style={styles.legalNoticeText}>
                  <Text style={[styles.legalLink, { color: accentColor }]} onPress={(e) => { e.stopPropagation(); openLegalModal('terms'); }}>Kullanım Koşullarını</Text> ve <Text style={[styles.legalLink, { color: accentColor }]} onPress={(e) => { e.stopPropagation(); openLegalModal('kvkk'); }}>KVKK Politikasını</Text> okudum, onaylıyorum.
                </Text>
              </TouchableOpacity>

              <View style={{ height: 16 }} />

              {/* ===== SOSYAL KAYIT BUTONLARI ===== */}
              <TouchableOpacity
                onPress={() => {
                  if (!termsAccepted || !kvkkAccepted) {
                    showAlert(
                      '⚠️ Onay Gerekli',
                      'Devam etmek için Kullanım Koşullarını ve KVKK Politikasını okuduğunuzu onaylamanız gerekmektedir.',
                      'warning'
                    );
                    return;
                  }
                  handleGoogleRegister();
                }}
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
                  onPress={() => {
                    if (!termsAccepted || !kvkkAccepted) {
                      showAlert(
                        '⚠️ Onay Gerekli',
                        'Devam etmek için Kullanım Koşullarını ve KVKK Politikasını okuduğunuzu onaylamanız gerekmektedir.',
                        'warning'
                      );
                      return;
                    }
                    handleAppleRegister();
                  }}
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

              <View style={styles.socialDivider}>
                <View style={styles.socialDividerLine} />
                <Text style={styles.socialDividerText}>veya</Text>
                <View style={styles.socialDividerLine} />
              </View>
              {/* ===== SOSYAL KAYIT BUTONLARI BİTİŞ ===== */}

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
                onPress={() => {
                  if (!termsAccepted || !kvkkAccepted) {
                    showAlert(
                      '⚠️ Onay Gerekli',
                      'Devam etmek için Kullanım Koşullarını ve KVKK Politikasını okuduğunuzu onaylamanız gerekmektedir.',
                      'warning'
                    );
                    return;
                  }
                  handleRegister();
                }}
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
  // ===== Google Premium Button =====
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
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
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
  // ===== Apple Button =====
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
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 15,
    gap: 12,
  },
  socialIcon: {
    width: 22,
    height: 22,
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
  socialDivider: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginVertical: 16,
  },
  socialDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  socialDividerText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    marginHorizontal: 16,
  },
});
