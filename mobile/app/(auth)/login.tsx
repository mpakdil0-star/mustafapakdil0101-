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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { PremiumAlert } from '../../components/common/PremiumAlert';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { login } from '../../store/slices/authSlice';
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
      // Small delay to allow Redux state to fully update
      setTimeout(() => {
        try {
          if (redirectTo) {
            router.replace(redirectTo as any);
          } else {
            router.replace('/(tabs)');
          }
        } catch (navError) {
          console.error('[Login] Navigation failed:', navError);
          router.replace('/');
        }
      }, 150);
    } catch (err: any) {
      // Check if this is a "user not found" error
      const errorMessage = err?.message || err || 'Giriş yapılamadı';
      const isUserNotFound =
        errorMessage.includes('kayıtlı kullanıcı bulunamadı') ||
        errorMessage.includes('USER_NOT_FOUND') ||
        err?.code === 'USER_NOT_FOUND';

      if (isUserNotFound) {
        showAlert(
          'Kayıt Gerekli',
          'Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı. Lütfen önce kayıt olun.',
          'info',
          [
            {
              text: 'İptal',
              style: 'cancel',
              onPress: () => setAlertConfig(prev => ({ ...prev, visible: false }))
            },
            {
              text: 'Kayıt Ol',
              onPress: () => router.push('/(auth)/register')
            }
          ]
        );
      } else {
        showAlert('Giriş Hatası', errorMessage, 'error');
      }
    }
  };

  const handleTestLogin = async (role: 'citizen' | 'electrician') => {
    const testEmail = role === 'citizen' ? 'citizen@test.com' : 'electrician@test.com';
    const testPassword = 'test123';

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
      showAlert('Test Giriş Hatası', err || 'Giriş yapılamadı.', 'error');
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

                <Button
                  title="Kayıt Ol"
                  onPress={() => router.push({
                    pathname: '/(auth)/register',
                    params: { redirectTo }
                  })}
                  variant="outline"
                  fullWidth
                  disabled={isLoading}
                  style={styles.registerBtn}
                  textStyle={{ color: colors.white }}
                />

                <TouchableOpacity
                  onPress={() => router.replace('/')}
                  style={styles.guestLink}
                >
                  <Text style={styles.guestLinkText}>Giriş yapmadan devam et</Text>
                </TouchableOpacity>
              </View>
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
    marginVertical: spacing.lg,
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
