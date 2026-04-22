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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { PremiumAlert } from '../../components/common/PremiumAlert';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { login, googleLogin, appleLogin } from '../../store/slices/authSlice';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { validateEmail, validatePassword } from '../../utils/validation';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';

export default function LoginScreen() {
  const router = useRouter();
  const { redirectTo } = useLocalSearchParams<{ redirectTo?: string }>();
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);

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

  // Logo animation
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // Entrance animation sequence
    Animated.sequence([
      // Logo fade in and scale
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 12,
          bounciness: 8,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      // Form slide up
      Animated.parallel([
        Animated.timing(formOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(formTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          speed: 14,
          bounciness: 4,
        }),
      ]),
    ]).start();
  }, []);

  const validate = () => {
    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);

    setEmailError(emailErr || '');
    setPasswordError(passwordErr || '');

    return !emailErr && !passwordErr;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    try {
      await dispatch(login({ email, password })).unwrap();

      // The guestRole is now automatically cleared in the Redux slice.
      // We wait a tiny bit for the state to settle before checking the role.
      setTimeout(() => {
        try {
          if (redirectTo) {
            router.replace(redirectTo as any);
          } else {
            // Check Redux state for the final decision (or use email for simple check)
            if (email.toLowerCase().includes('admin')) {
              router.replace('/admin');
            } else {
              // The _layout.tsx will handle the final guarding, but we can be explicit
              router.replace('/(tabs)');
            }
          }
        } catch (navError) {
          console.error('[Login] Navigation failed:', navError);
          router.replace('/');
        }
      }, 200);
    } catch (err: any) {
      // Check if this is a "user not found" error
      const errorMessage = err?.message || err || 'Giriş yapılamadı';
      const isUserNotFound =
        errorMessage.toLowerCase().includes('bulunamadı') ||
        errorMessage.includes('USER_NOT_FOUND') ||
        err?.code === 'USER_NOT_FOUND';

      if (isUserNotFound) {
        showAlert(
          'Hesap Bulunamadı',
          'Bu e-posta adresi ile kayıtlı bir hesap bulunamadı. Yeni bir hesap oluşturmak ister misiniz?',
          'info',
          [
            {
              text: 'Vazgeç',
              variant: 'ghost',
              onPress: () => setAlertConfig(prev => ({ ...prev, visible: false }))
            },
            {
              text: 'Kayıt Ol',
              variant: 'primary',
              onPress: () => {
                setAlertConfig(prev => ({ ...prev, visible: false }));
                router.push({
                  pathname: '/(auth)/role-select',
                  params: { redirectTo }
                });
              }
            }
          ]
        );
      } else {
        showAlert('Giriş Hatası', errorMessage, 'error');
      }
    }
  };

  // ============================================================
  // SOSYAL GİRİŞ
  // ============================================================

  const handleGoogleLogin = async () => {
    setSocialLoading('google');
    try {
      const result = await dispatch(googleLogin(undefined)).unwrap();
      // Başarılı giriş
      setTimeout(() => {
        router.replace(redirectTo ? (redirectTo as any) : '/(tabs)');
      }, 200);
    } catch (err: any) {
      if (err === 'CANCELLED') {
        // Kullanıcı iptal etti, sessizce devam et
      } else if (err?.code === 'USER_NOT_FOUND') {
        showAlert(
          'Hesap Bulunamadı',
          'Bu Google hesabı ile kayıtlı kullanıcı bulunamadı. Kayıt olmak ister misiniz?',
          'info',
          [
            { text: 'Vazgeç', variant: 'ghost', onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) },
            { text: 'Kayıt Ol', variant: 'primary', onPress: () => {
              setAlertConfig(prev => ({ ...prev, visible: false }));
              router.push({ pathname: '/(auth)/role-select', params: { redirectTo } });
            }}
          ]
        );
      } else if (typeof err === 'string') {
        showAlert('Google Giriş Hatası', err, 'error');
      }
    } finally {
      setSocialLoading(null);
    }
  };

  const handleAppleLogin = async () => {
    setSocialLoading('apple');
    try {
      const result = await dispatch(appleLogin(undefined)).unwrap();
      setTimeout(() => {
        router.replace(redirectTo ? (redirectTo as any) : '/(tabs)');
      }, 200);
    } catch (err: any) {
      if (err === 'CANCELLED') {
        // Kullanıcı iptal etti
      } else if (err?.code === 'USER_NOT_FOUND') {
        showAlert(
          'Hesap Bulunamadı',
          'Bu Apple hesabı ile kayıtlı kullanıcı bulunamadı. Kayıt olmak ister misiniz?',
          'info',
          [
            { text: 'Vazgeç', variant: 'ghost', onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) },
            { text: 'Kayıt Ol', variant: 'primary', onPress: () => {
              setAlertConfig(prev => ({ ...prev, visible: false }));
              router.push({ pathname: '/(auth)/role-select', params: { redirectTo } });
            }}
          ]
        );
      } else if (typeof err === 'string') {
        showAlert('Apple Giriş Hatası', err, 'error');
      }
    } finally {
      setSocialLoading(null);
    }
  };

  const handleTestLogin = async (role: 'citizen' | 'electrician') => {
    // Demo hesapları - mock mode'da otomatik olarak oluşturulur
    const testEmail = role === 'citizen' ? 'demo@vatandas.com' : 'demo@usta.com';
    const testPassword = '123456';

    setEmail(testEmail);
    setPassword(testPassword);

    try {
      await dispatch(login({ email: testEmail, password: testPassword })).unwrap();
      if (redirectTo) {
        router.replace(redirectTo as any);
      } else {
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      // Eğer kullanıcı yoksa, otomatik kayıt yap
      showAlert(
        'Demo Giriş',
        'Demo hesabı oluşturuluyor...',
        'info'
      );

      // Kayıt sayfasına yönlendir ve pre-fill yap
      router.push({
        pathname: '/(auth)/register',
        params: {
          initialRole: role === 'citizen' ? 'CITIZEN' : 'ELECTRICIAN'
        }
      });
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Decorative Background Elements */}
          {/* Premium Background Gradient */}
          <LinearGradient
            colors={['#1E1B4B', '#4C1D95', '#1E1B4B']}
            style={StyleSheet.absoluteFill}
          />

          {/* Animated Glow Blobs */}
          <View style={[styles.glowBlob, { top: -100, right: -100, backgroundColor: '#7C3AED' }]} />
          <View style={[styles.glowBlob, { bottom: -100, left: -100, backgroundColor: '#4F46E5', opacity: 0.2 }]} />

          <View style={styles.innerContent}>
            {/* Header with Back Button */}
            <View style={styles.headerTop}>
              <TouchableOpacity
                onPress={() => router.replace('/(auth)/welcome')}
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={24} color={colors.white} />
              </TouchableOpacity>
            </View>

            {/* Logo/Brand Section */}
            <Animated.View
              style={[
                styles.brandSection,
                {
                  opacity: logoOpacity,
                  transform: [{ scale: logoScale }],
                }
              ]}
            >
              <View style={styles.logoCircle}>
                <LinearGradient
                  colors={['#8B5CF6', '#7C3AED']}
                  style={styles.logoGradient}
                >
                  <Ionicons name="flash" size={42} color={colors.white} />
                </LinearGradient>
              </View>
              <Text style={styles.title}>Giriş Yap</Text>
              <Text style={styles.subtitle}>Sektörün uzmanlarıyla buluşun</Text>
            </Animated.View>

            {/* Form Section */}
            <Animated.View
              style={[
                styles.formSection,
                {
                  opacity: formOpacity,
                  transform: [{ translateY: formTranslateY }],
                }
              ]}
            >
              <View style={styles.formCard}>
                <Input
                  label="E-posta Adresi"
                  placeholder="ornek@email.com"
                  value={email}
                  onChangeText={(text: string) => {
                    setEmail(text);
                    setEmailError('');
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  error={emailError}
                  editable={!isLoading}
                  labelStyle={{ color: 'rgba(255,255,255,0.95)' }}
                  inputContainerStyle={{ backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.2)' }}
                  style={{ color: colors.white }}
                  placeholderTextColor="rgba(255,255,255,0.45)"
                />

                <Input
                  label="Şifre"
                  placeholder="••••••••"
                  value={password}
                  onChangeText={(text: string) => {
                    setPassword(text);
                    setPasswordError('');
                  }}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password"
                  error={passwordError}
                  editable={!isLoading}
                  labelStyle={{ color: 'rgba(255,255,255,0.95)' }}
                  inputContainerStyle={{ backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.2)' }}
                  style={{ color: colors.white }}
                  placeholderTextColor="rgba(255,255,255,0.45)"
                />

                <TouchableOpacity
                  onPress={() => router.push('/(auth)/forgot-password')}
                  style={{ alignSelf: 'flex-end', marginBottom: 20, marginTop: -10 }}
                >
                  <Text style={{ color: colors.white, fontFamily: fonts.semiBold, fontSize: 14 }}>
                    Şifremi Unuttum
                  </Text>
                </TouchableOpacity>

                {error && (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={16} color={colors.error} />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                <TouchableOpacity
                  onPress={handleLogin}
                  disabled={isLoading}
                  activeOpacity={0.8}
                  style={styles.loginButtonWrapper}
                >
                  <LinearGradient
                    colors={colors.gradientPrimary as any}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.loginButtonGradient}
                  >
                    <Text style={styles.loginButtonText}>Giriş Yap</Text>
                    <Ionicons name="arrow-forward" size={20} color={colors.white} />
                  </LinearGradient>
                </TouchableOpacity>

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>veya</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* ===== SOSYAL GİRİŞ BUTONLARI ===== */}
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
                        {socialLoading === 'google' ? 'Bağlanıyor...' : 'Google ile devam et'}
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
                        {socialLoading === 'apple' ? 'Bağlanıyor...' : 'Apple ile devam et'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
                {/* ===== SOSYAL GİRİŞ BUTONLARI BİTİŞ ===== */}

                <Button
                  title="Kayıt Ol"
                  onPress={() => router.push({
                    pathname: '/(auth)/role-select',
                    params: { redirectTo }
                  })}
                  variant="outline"
                  fullWidth
                  disabled={isLoading}
                  style={[styles.registerBtn, { marginTop: 16 }]}
                  textStyle={{ color: colors.white }}
                />

                <TouchableOpacity
                  onPress={() => router.replace('/')}
                  style={styles.guestLink}
                >
                  <Text style={styles.guestLinkText}>Giriş yapmadan devam et</Text>
                </TouchableOpacity>

                <View style={styles.legalFooter}>
                  <TouchableOpacity onPress={() => router.push('/legal/terms')}>
                    <Text style={styles.legalFooterText}>Kullanım Koşulları</Text>
                  </TouchableOpacity>
                  <Text style={styles.legalFooterDivider}>•</Text>
                  <TouchableOpacity onPress={() => router.push('/legal/kvkk')}>
                    <Text style={styles.legalFooterText}>KVKK Aydınlatma Metni</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Test Buttons - Only in Development */}

            </Animated.View>
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
  brandSection: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    padding: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: 20,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  logoGradient: {
    flex: 1,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: fonts.extraBold,
    fontSize: 34,
    color: colors.white,
    marginBottom: 8,
    letterSpacing: -1,
    textShadowColor: 'rgba(124, 58, 237, 0.5)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
  formSection: {
    flex: 1,
  },
  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 30,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    padding: spacing.md,
    borderRadius: 16,
    marginBottom: spacing.md,
    gap: 8,
  },
  errorText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: '#F87171',
    flex: 1,
  },
  loginButtonWrapper: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  },
  loginButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  loginButtonText: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.white,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  dividerText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    marginHorizontal: spacing.lg,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
  // ===== Sosyal Giriş Buton Stilleri Bitiş =====
  registerBtn: {
    borderRadius: 18,
    height: 56,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  guestLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  guestLinkText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
  },
  legalFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    gap: 8,
  },
  legalFooterText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.4)',
    textDecorationLine: 'underline',
  },
  legalFooterDivider: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 12,
  },
  testSection: {
    marginTop: 30,
    backgroundColor: 'rgba(255,255,255,0.02)',
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  testTitle: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  testButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  testBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  testBtnText: {
    color: colors.white,
    fontFamily: fonts.bold,
    fontSize: 13,
  },
});
