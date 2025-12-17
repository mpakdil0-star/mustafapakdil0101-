import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
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
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

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
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Giriş Hatası', err || 'Giriş yapılamadı. Lütfen tekrar deneyin.');
    }
  };

  const handleTestLogin = async (role: 'citizen' | 'electrician') => {
    const testEmail = role === 'citizen' ? 'mpakdil0@gmail.com' : 'mpakdil0@electrician.com';
    const testPassword = 'password123';

    setEmail(testEmail);
    setPassword(testPassword);

    try {
      await dispatch(login({ email: testEmail, password: testPassword })).unwrap();
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Test Giriş Hatası', err || 'Giriş yapılamadı.');
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
          {/* Logo/Brand Section */}
          <View style={styles.brandSection}>
            <View style={styles.logoContainer}>
              <Ionicons name="flash" size={40} color={colors.primary} />
            </View>
            <Text style={styles.title}>Elektrikçiler</Text>
            <Text style={styles.subtitle}>Profesyonel hizmete ulaşın</Text>
          </View>

          {/* Form Section */}
          <View style={styles.formSection}>
            <View style={styles.form}>
              <Input
                label="Email"
                placeholder="ornek@email.com"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setEmailError('');
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                error={emailError}
                editable={!isLoading}
              />

              <Input
                label="Şifre"
                placeholder="••••••••"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setPasswordError('');
                }}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
                error={passwordError}
                editable={!isLoading}
              />

              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <Button
                title="Giriş Yap"
                onPress={handleLogin}
                loading={isLoading}
                disabled={isLoading}
                fullWidth
                style={styles.loginButton}
              />

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>veya</Text>
                <View style={styles.dividerLine} />
              </View>

              <Button
                title="Hesap Oluştur"
                onPress={() => router.push('/(auth)/register')}
                variant="outline"
                fullWidth
                disabled={isLoading}
              />

              {/* Test Buttons - Only in Development */}
              {__DEV__ && (
                <View style={styles.testSection}>
                  <Text style={styles.testTitle}>👇 Geliştirici Hızlı Giriş 👇</Text>
                  <View style={styles.testButtonsRow}>
                    <Button
                      title="🧪 Vatandaş"
                      onPress={() => handleTestLogin('citizen')}
                      variant="primary"
                      size="small"
                      style={{ flex: 1, marginRight: 8, backgroundColor: '#4CAF50' }}
                    />
                    <Button
                      title="🧪 Elektrikçi"
                      onPress={() => handleTestLogin('electrician')}
                      variant="primary"
                      size="small"
                      style={{ flex: 1, marginLeft: 8, backgroundColor: '#FF9800' }}
                    />
                  </View>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xl,
  },
  brandSection: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: colors.primaryLight + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 28,
    color: colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.textSecondary,
  },
  formSection: {
    flex: 1,
    justifyContent: 'center',
  },
  form: {
    width: '100%',
  },
  errorContainer: {
    backgroundColor: colors.errorLight + '40',
    padding: spacing.sm,
    borderRadius: spacing.radius.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.error,
    textAlign: 'center',
  },
  loginButton: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    marginHorizontal: spacing.lg,
  },
  testSection: {
    marginTop: spacing.xl,
    padding: spacing.md,
    backgroundColor: '#f5f5f5',
    borderRadius: spacing.radius.md,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  testTitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
    fontWeight: 'bold',
  },
  testButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
