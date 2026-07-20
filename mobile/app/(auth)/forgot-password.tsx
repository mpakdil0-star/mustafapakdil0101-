import { useEffect, useState } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
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
    const { recovery } = useLocalSearchParams<{ recovery?: string }>();
    const [step, setStep] = useState<1 | 2>(1); // 1: Email, 2: Reset Form
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form States
    const [email, setEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Validations
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (recovery === '1') setStep(2);
    }, [recovery]);

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
                'Bağlantı Gönderildi',
                response.message || 'Şifre yenileme bağlantısı e-posta adresinize gönderildi.',
                'success'
            );
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

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            await authService.resetPassword({ newPassword });

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
                    colors={['#07111E', '#09252A', '#07111E']}
                    style={StyleSheet.absoluteFill}
                />

                {/* Decorative Blobs */}
                <View style={[styles.glowBlob, { top: -100, right: -100, backgroundColor: '#0D9488' }]} />
                <View style={[styles.glowBlob, { bottom: -100, left: -100, backgroundColor: '#4682B4', opacity: 0.15 }]} />

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
                                    inputContainerStyle={{ backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.12)' }}
                                    style={{ color: colors.white }}
                                    placeholderTextColor="rgba(255,255,255,0.45)"
                                />

                                {error && <Text style={styles.errorFull}>{error}</Text>}

                                <TouchableOpacity
                                    onPress={handleSendCode}
                                    disabled={isLoading}
                                    activeOpacity={0.8}
                                    style={styles.submitButtonWrapper}
                                >
                                    <LinearGradient
                                        colors={['#0D9488', '#4682B4']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.submitButtonGradient}
                                    >
                                        {isLoading ? (
                                            <ActivityIndicator size="small" color="#FFFFFF" />
                                        ) : (
                                            <>
                                                <Text style={styles.submitButtonText}>Bağlantı Gönder</Text>
                                                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                                            </>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <View style={styles.emailBadge}>
                                    <Text style={styles.emailBadgeText}>Güvenli şifre yenileme oturumu</Text>
                                </View>

                                <Input
                                    label="Yeni Şifre"
                                    placeholder="••••••••"
                                    value={newPassword}
                                    onChangeText={(t) => { setNewPassword(t); setErrors({}); }}
                                    secureTextEntry
                                    error={errors.newPassword}
                                    editable={!isLoading}
                                    labelStyle={{ color: 'rgba(255,255,255,0.95)' }}
                                    inputContainerStyle={{ backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.12)' }}
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
                                    inputContainerStyle={{ backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.12)' }}
                                    style={{ color: colors.white }}
                                />

                                {error && <Text style={styles.errorFull}>{error}</Text>}

                                <TouchableOpacity
                                    onPress={handleResetPassword}
                                    disabled={isLoading}
                                    activeOpacity={0.8}
                                    style={styles.submitButtonWrapper}
                                >
                                    <LinearGradient
                                        colors={['#0D9488', '#4682B4']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.submitButtonGradient}
                                    >
                                        {isLoading ? (
                                            <ActivityIndicator size="small" color="#FFFFFF" />
                                        ) : (
                                            <>
                                                <Text style={styles.submitButtonText}>Şifreyi Yenile</Text>
                                                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                                            </>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
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
        backgroundColor: '#07111E',
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
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(13, 148, 136, 0.3)',
        shadowColor: '#0D9488',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 5,
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
        color: '#0D9488',
        fontFamily: fonts.bold,
        fontSize: 12,
    },
    errorFull: {
        color: '#F87171',
        fontFamily: fonts.medium,
        textAlign: 'center',
        marginVertical: 10,
    },
    submitButtonWrapper: {
        marginTop: 20,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#0D9488',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
    },
    submitButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 10,
    },
    submitButtonText: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: '#FFFFFF',
    },
});
