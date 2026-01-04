import { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { PremiumAlert } from '../../components/common/PremiumAlert';
import { authService } from '../../services/authService';
import { validateEmail, validatePassword } from '../../utils/validation';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const [step, setStep] = useState<1 | 2>(1); // 1: Email, 2: Reset Form
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form States
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Validations
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [alertConfig, setAlertConfig] = useState<{
        visible: boolean;
        title: string;
        message: string;
        type?: 'success' | 'error' | 'warning' | 'info';
        onClose?: () => void;
    }>({ visible: false, title: '', message: '' });

    const showAlert = (title: string, message: string, type: any = 'info', onClose?: () => void) => {
        setAlertConfig({ visible: true, title, message, type, onClose });
    };

    const handleSendCode = async () => {
        const emailErr = validateEmail(email);
        if (emailErr) {
            setErrors({ email: emailErr });
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const response = await authService.forgotPassword(email);
            // Simulate backend sending a code
            showAlert(
                'Kod Gönderildi',
                response.message || 'Sıfırlama kodunuz e-posta adresinize gönderildi. (Test Kodu: 123456)',
                'success'
            );
            setStep(2);
        } catch (err: any) {
            const msg = err.message || 'Kod gönderilemedi. Lütfen tekrar deneyin.';
            setError(msg);
            // Show alert for critical errors logic if needed
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async () => {
        // Validate
        const newErrors: Record<string, string> = {};
        const passErr = validatePassword(newPassword);
        if (passErr) newErrors.newPassword = passErr;
        if (newPassword !== confirmPassword) newErrors.confirmPassword = 'Şifreler eşleşmiyor';
        if (!code || code.length < 6) newErrors.code = 'Geçerli bir kod giriniz';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            await authService.resetPassword(email, code, newPassword);

            showAlert(
                'Başarılı',
                'Şifreniz başarıyla güncellendi. Yeni şifrenizle giriş yapabilirsiniz.',
                'success',
                () => router.replace('/(auth)/login')
            );
        } catch (err: any) {
            setError(err.message || 'Şifre sıfırlama başarısız oldu.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <LinearGradient
                    colors={['#1E1B4B', '#4C1D95', '#1E1B4B']}
                    style={StyleSheet.absoluteFill}
                />

                {/* Decorative Blobs */}
                <View style={[styles.glowBlob, { top: -100, right: -100, backgroundColor: '#7C3AED' }]} />
                <View style={[styles.glowBlob, { bottom: -100, left: -100, backgroundColor: '#4F46E5', opacity: 0.2 }]} />

                <View style={styles.innerContent}>
                    {/* Header */}
                    <View style={styles.headerTop}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color={colors.white} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.titleSection}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="lock-open-outline" size={40} color="#FFFFFF" />
                        </View>
                        <Text style={styles.title}>
                            {step === 1 ? 'Şifremi Unuttum' : 'Yeni Şifre Belirle'}
                        </Text>
                        <Text style={styles.subtitle}>
                            {step === 1
                                ? 'Hesabınıza erişmek için doğrulama kodu alın'
                                : 'Lütfen yeni şifrenizi girin'}
                        </Text>
                    </View>

                    <View style={styles.formCard}>
                        {step === 1 ? (
                            <>
                                <Input
                                    label="E-posta Adresi"
                                    placeholder="ornek@email.com"
                                    value={email}
                                    onChangeText={(t) => { setEmail(t); setErrors({}); }}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    error={errors.email}
                                    editable={!isLoading}
                                    labelStyle={{ color: 'rgba(255,255,255,0.95)' }}
                                    inputContainerStyle={{ backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.2)' }}
                                    style={{ color: colors.white }}
                                    placeholderTextColor="rgba(255,255,255,0.45)"
                                />

                                {error && <Text style={styles.errorFull}>{error}</Text>}

                                <Button
                                    title={isLoading ? 'Gönderiliyor...' : 'Kod Gönder'}
                                    onPress={handleSendCode}
                                    disabled={isLoading}
                                    style={{ marginTop: 20 }}
                                />
                            </>
                        ) : (
                            <>
                                <View style={styles.emailBadge}>
                                    <Text style={styles.emailBadgeText}>{email}</Text>
                                    <TouchableOpacity onPress={() => setStep(1)}>
                                        <Text style={styles.changeText}>Değiştir</Text>
                                    </TouchableOpacity>
                                </View>

                                <Input
                                    label="Doğrulama Kodu"
                                    placeholder="123456"
                                    value={code}
                                    onChangeText={(t) => { setCode(t); setErrors({}); }}
                                    keyboardType="number-pad"
                                    maxLength={6}
                                    error={errors.code}
                                    editable={!isLoading}
                                    labelStyle={{ color: 'rgba(255,255,255,0.95)' }}
                                    inputContainerStyle={{ backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.2)' }}
                                    style={{ color: colors.white }}
                                />

                                <Input
                                    label="Yeni Şifre"
                                    placeholder="••••••••"
                                    value={newPassword}
                                    onChangeText={(t) => { setNewPassword(t); setErrors({}); }}
                                    secureTextEntry
                                    error={errors.newPassword}
                                    editable={!isLoading}
                                    labelStyle={{ color: 'rgba(255,255,255,0.95)' }}
                                    inputContainerStyle={{ backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.2)' }}
                                    style={{ color: colors.white }}
                                />

                                <Input
                                    label="Yeni Şifre (Tekrar)"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChangeText={(t) => { setConfirmPassword(t); setErrors({}); }}
                                    secureTextEntry
                                    error={errors.confirmPassword}
                                    editable={!isLoading}
                                    labelStyle={{ color: 'rgba(255,255,255,0.95)' }}
                                    inputContainerStyle={{ backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.2)' }}
                                    style={{ color: colors.white }}
                                />

                                {error && <Text style={styles.errorFull}>{error}</Text>}

                                <Button
                                    title={isLoading ? 'Güncelleniyor...' : 'Şifreyi Yenile'}
                                    onPress={handleResetPassword}
                                    disabled={isLoading}
                                    style={{ marginTop: 20 }}
                                />
                            </>
                        )}
                    </View>
                </View>
            </ScrollView>

            <PremiumAlert
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                buttons={[{
                    text: 'Tamam', onPress: () => {
                        alertConfig.onClose?.();
                        setAlertConfig(prev => ({ ...prev, visible: false }));
                    }
                }]}
                onClose={() => {
                    alertConfig.onClose?.();
                    setAlertConfig(prev => ({ ...prev, visible: false }));
                }}
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
    glowBlob: {
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: 150,
        opacity: 0.15,
    },
    innerContent: {
        padding: spacing.screenPadding,
        paddingTop: spacing.xxxl,
        paddingBottom: spacing.xl,
    },
    headerTop: {
        marginBottom: spacing.xl,
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
    titleSection: {
        alignItems: 'center',
        marginBottom: 40,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    title: {
        fontFamily: fonts.bold,
        fontSize: 28,
        color: '#FFF',
        marginBottom: 10,
    },
    subtitle: {
        fontFamily: fonts.medium,
        fontSize: 16,
        color: 'rgba(255,255,255,0.6)',
        textAlign: 'center',
    },
    formCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    emailBadge: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        padding: 12,
        borderRadius: 12,
        marginBottom: 20,
    },
    emailBadgeText: {
        color: '#FFF',
        fontFamily: fonts.medium,
    },
    changeText: {
        color: '#7C3AED',
        fontFamily: fonts.bold,
        fontSize: 12,
    },
    errorFull: {
        color: '#F87171',
        fontFamily: fonts.medium,
        textAlign: 'center',
        marginVertical: 10,
    },
});
