import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { register } from '../../store/slices/authSlice';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { validateEmail, validatePassword, validateRequired } from '../../utils/validation';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';

export default function RegisterScreen() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.auth);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState<'CITIZEN' | 'ELECTRICIAN'>('CITIZEN');

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    const fullNameErr = validateRequired(fullName, 'Ad soyad');
    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password);

    if (fullNameErr) newErrors.fullName = fullNameErr;
    if (emailErr) newErrors.email = emailErr;
    if (passwordErr) newErrors.password = passwordErr;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    try {
      await dispatch(
        register({
          fullName,
          email,
          phone: phone || undefined,
          password,
          userType,
        })
      ).unwrap();
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Kayıt Hatası', err || 'Kayıt olunamadı. Lütfen tekrar deneyin.');
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
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Hesap Oluştur</Text>
            <Text style={styles.subtitle}>Hizmet almaya veya vermeye başlayın</Text>
          </View>

          {/* User Type Selection */}
          <View style={styles.userTypeSection}>
            <Text style={styles.sectionLabel}>Kullanıcı Tipi</Text>
            <View style={styles.userTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.userTypeButton,
                  userType === 'CITIZEN' && styles.userTypeButtonActive,
                ]}
                onPress={() => setUserType('CITIZEN')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="person"
                  size={24}
                  color={userType === 'CITIZEN' ? colors.primary : colors.textSecondary}
                />
                <Text style={[styles.userTypeText, userType === 'CITIZEN' && styles.userTypeTextActive]}>
                  Vatandaş
                </Text>
                <Text style={[styles.userTypeSubtext, userType === 'CITIZEN' && styles.userTypeSubtextActive]}>
                  Hizmet almak istiyorum
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.userTypeButton,
                  userType === 'ELECTRICIAN' && styles.userTypeButtonActive,
                ]}
                onPress={() => setUserType('ELECTRICIAN')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="construct"
                  size={24}
                  color={userType === 'ELECTRICIAN' ? colors.primary : colors.textSecondary}
                />
                <Text style={[styles.userTypeText, userType === 'ELECTRICIAN' && styles.userTypeTextActive]}>
                  Elektrikçi
                </Text>
                <Text style={[styles.userTypeSubtext, userType === 'ELECTRICIAN' && styles.userTypeSubtextActive]}>
                  Hizmet vermek istiyorum
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Form */}
          <View style={styles.formSection}>
            <Input
              label="Ad Soyad"
              placeholder="Ahmet Yılmaz"
              value={fullName}
              onChangeText={(text) => {
                setFullName(text);
                setErrors({ ...errors, fullName: '' });
              }}
              error={errors.fullName}
              editable={!isLoading}
            />

            <Input
              label="Email"
              placeholder="ornek@email.com"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setErrors({ ...errors, email: '' });
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              error={errors.email}
              editable={!isLoading}
            />

            <Input
              label="Telefon (Opsiyonel)"
              placeholder="05XX XXX XX XX"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              editable={!isLoading}
            />

            <Input
              label="Şifre"
              placeholder="En az 6 karakter"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setErrors({ ...errors, password: '' });
              }}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              error={errors.password}
              editable={!isLoading}
            />

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Button
              title="Kayıt Ol"
              onPress={handleRegister}
              loading={isLoading}
              disabled={isLoading}
              fullWidth
              style={styles.registerButton}
            />

            <View style={styles.loginLink}>
              <Text style={styles.loginLinkText}>Zaten hesabınız var mı? </Text>
              <TouchableOpacity onPress={() => router.back()} disabled={isLoading}>
                <Text style={styles.loginLinkButton}>Giriş yapın</Text>
              </TouchableOpacity>
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
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 26,
    color: colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.textSecondary,
  },
  userTypeSection: {
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.text,
    marginBottom: spacing.md,
  },
  userTypeContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  userTypeButton: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: spacing.radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.backgroundLight,
    alignItems: 'center',
  },
  userTypeButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + '10',
  },
  userTypeText: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: 4,
  },
  userTypeTextActive: {
    color: colors.primary,
  },
  userTypeSubtext: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textLight,
    textAlign: 'center',
  },
  userTypeSubtextActive: {
    color: colors.primaryDark,
  },
  formSection: {
    flex: 1,
  },
  errorContainer: {
    backgroundColor: colors.errorLight + '40',
    padding: spacing.md,
    borderRadius: spacing.radius.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.error,
    textAlign: 'center',
  },
  registerButton: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  loginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginLinkText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
  },
  loginLinkButton: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.primary,
  },
});
