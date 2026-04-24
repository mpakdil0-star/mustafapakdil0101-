import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors as staticColors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';
import { useAppColors } from '../../hooks/useAppColors';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

type ModalStep = 'INITIAL' | 'ROLE_SELECT';

interface AuthGuardModalProps {
    visible: boolean;
    onClose: () => void;
    onLogin: () => void;
    onRegister?: (role?: 'CITIZEN' | 'ELECTRICIAN') => void;
    title?: string;
    message?: string;
    icon?: keyof typeof Ionicons.glyphMap;
}

export const AuthGuardModal: React.FC<AuthGuardModalProps> = ({
    visible,
    onClose,
    onLogin,
    onRegister,
    title,
    message,
    icon = 'sparkles-outline',
}) => {
    const colors = useAppColors();
    const router = useRouter();
    const { t } = useTranslation();
    const [step, setStep] = React.useState<ModalStep>('INITIAL');

    // Reset step when modal closes
    React.useEffect(() => {
        if (!visible) {
            setTimeout(() => setStep('INITIAL'), 300);
        }
    }, [visible]);

    const displayTitle = step === 'INITIAL' 
        ? (title || t('auth.roleSelection', 'Harika Bir Adım!'))
        : 'Nasıl Kayıt Olmak İstersiniz?';
        
    const displayMessage = step === 'INITIAL'
        ? (message || 'Ustalardan teklif almak, mesajlaşmak ve işini hemen çözmek için topluluğumuza katılın.')
        : 'Size en uygun deneyimi sunabilmemiz için lütfen bir rol seçin.';

    const handleRegisterPress = () => {
        setStep('ROLE_SELECT');
    };

    const handleRoleSelect = (role: 'CITIZEN' | 'ELECTRICIAN') => {
        onClose();
        if (onRegister) {
            onRegister(role);
        } else {
            // Default routing if onRegister is not provided or doesn't handle navigation
            router.push({
                pathname: '/(auth)/register',
                params: { type: role }
            });
        }
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <LinearGradient
                    colors={['rgba(255,255,255,0.98)', 'rgba(248, 250, 252, 0.95)']}
                    style={styles.content}
                >
                    <LinearGradient
                        colors={[colors.primary, colors.primaryDark]}
                        style={styles.header}
                    >
                        <View style={styles.headerDecorativeCircle1} />
                        <View style={styles.headerDecorativeCircle2} />

                        <View style={styles.iconWrapper}>
                            <View style={[styles.iconGlow, { backgroundColor: staticColors.white }]} />
                            <Ionicons 
                                name={step === 'INITIAL' ? icon : (icon === 'sparkles-outline' ? 'person-add-outline' : icon)} 
                                size={42} 
                                color={staticColors.white} 
                            />
                        </View>
                        <Text style={styles.title}>{displayTitle}</Text>
                        <Text style={styles.subtitle}>{displayMessage}</Text>
                    </LinearGradient>

                    <View style={styles.body}>
                        {step === 'INITIAL' ? (
                            <View style={styles.actions}>
                                <TouchableOpacity
                                    onPress={onLogin}
                                    activeOpacity={0.8}
                                    style={[styles.primaryButton, { shadowColor: colors.primary }]}
                                >
                                    <LinearGradient
                                        colors={[colors.primary, colors.primaryDark]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.buttonGradient}
                                    >
                                        <Text style={styles.primaryButtonText}>{t('auth.login', 'Giriş Yap')}</Text>
                                        <Ionicons name="arrow-forward" size={18} color={staticColors.white} />
                                    </LinearGradient>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={handleRegisterPress}
                                    activeOpacity={0.8}
                                    style={[styles.secondaryButton, { borderColor: colors.primary, backgroundColor: staticColors.white }]}
                                >
                                    <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>{t('auth.register', 'Kayıt Ol')}</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={onClose}
                                    activeOpacity={0.6}
                                    style={styles.cancelButton}
                                >
                                    <Text style={styles.cancelButtonText}>{t('common.cancel', 'Vazgeç')}</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.actions}>
                                <View style={styles.roleContainer}>
                                    {/* Citizen Option */}
                                    <TouchableOpacity
                                        style={[styles.roleOptionWrapper, { shadowColor: '#7C3AED' }]}
                                        onPress={() => handleRoleSelect('CITIZEN')}
                                        activeOpacity={0.9}
                                    >
                                        <LinearGradient
                                            colors={['#FFFFFF', '#F8F9FF']}
                                            style={styles.roleOptionCard}
                                        >
                                            <LinearGradient
                                                colors={['#7C3AED', '#6D28D9']}
                                                style={styles.roleIconContainer}
                                            >
                                                <Ionicons name="people" size={24} color="#FFF" />
                                            </LinearGradient>
                                            <View style={styles.roleTextContainer}>
                                                <Text style={[styles.roleOptionTitle, { color: '#1E1B4B' }]}>Vatandaş</Text>
                                                <Text style={styles.roleOptionDesc}>Usta bulmak, ilan vermek istiyorum</Text>
                                            </View>
                                            <View style={[styles.roleArrowBox, { backgroundColor: '#7C3AED10' }]}>
                                                <Ionicons name="chevron-forward" size={18} color="#7C3AED" />
                                            </View>
                                        </LinearGradient>
                                    </TouchableOpacity>

                                    {/* Electrician Option */}
                                    <TouchableOpacity
                                        style={[styles.roleOptionWrapper, { shadowColor: '#3B82F6' }]}
                                        onPress={() => handleRoleSelect('ELECTRICIAN')}
                                        activeOpacity={0.9}
                                    >
                                        <LinearGradient
                                            colors={['#FFFFFF', '#F0F7FF']}
                                            style={styles.roleOptionCard}
                                        >
                                            <LinearGradient
                                                colors={['#3B82F6', '#2563EB']}
                                                style={styles.roleIconContainer}
                                            >
                                                <Ionicons name="construct" size={24} color="#FFF" />
                                            </LinearGradient>
                                            <View style={styles.roleTextContainer}>
                                                <Text style={[styles.roleOptionTitle, { color: '#0F172A' }]}>Usta</Text>
                                                <Text style={styles.roleOptionDesc}>İş almak, teklif vermek istiyorum</Text>
                                            </View>
                                            <View style={[styles.roleArrowBox, { backgroundColor: '#3B82F610' }]}>
                                                <Ionicons name="chevron-forward" size={18} color="#3B82F6" />
                                            </View>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity
                                    onPress={() => setStep('INITIAL')}
                                    style={styles.backButton}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.backButtonInner}>
                                        <Ionicons name="arrow-back" size={18} color="#64748B" />
                                        <Text style={styles.backButtonText}>Geri Dön</Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </LinearGradient>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.lg,
    },
    content: {
        width: width * 0.9,
        borderRadius: 32,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.4)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.2,
        shadowRadius: 30,
        elevation: 20,
    },
    header: {
        paddingTop: 40,
        paddingBottom: 30,
        alignItems: 'center',
        paddingHorizontal: 24,
        position: 'relative',
        overflow: 'hidden',
    },
    headerDecorativeCircle1: {
        position: 'absolute',
        top: -30,
        right: -30,
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    headerDecorativeCircle2: {
        position: 'absolute',
        bottom: -20,
        left: -20,
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    iconWrapper: {
        width: 80,
        height: 80,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    iconGlow: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        backgroundColor: staticColors.white,
        opacity: 0.2,
        borderRadius: 24,
        transform: [{ scale: 1.2 }],
    },
    title: {
        fontFamily: fonts.extraBold,
        fontSize: 24,
        color: staticColors.white,
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontFamily: fonts.medium,
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.9)',
        textAlign: 'center',
        lineHeight: 20,
    },
    body: {
        padding: 24,
    },
    actions: {
        width: '100%',
        gap: 12,
    },
    primaryButton: {
        width: '100%',
        height: 54,
        borderRadius: 16,
        overflow: 'hidden',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
    },
    buttonGradient: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    primaryButtonText: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: staticColors.white,
    },
    secondaryButton: {
        width: '100%',
        height: 54,
        borderRadius: 16,
        borderWidth: 1.5,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    secondaryButtonText: {
        fontFamily: fonts.bold,
        fontSize: 16,
    },
    cancelButton: {
        marginTop: 8,
        paddingVertical: 8,
        alignItems: 'center',
    },
    backButton: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    backButtonInner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
        gap: 8,
    },
    cancelButtonText: {
        fontFamily: fonts.bold,
        fontSize: 14,
        color: staticColors.textLight,
    },
    roleContainer: {
        gap: 16,
        marginBottom: 24,
    },
    roleOptionWrapper: {
        borderRadius: 24,
        backgroundColor: 'transparent',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 8,
    },
    roleOptionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.8)',
    },
    roleIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    roleTextContainer: {
        flex: 1,
        marginLeft: 16,
    },
    roleOptionTitle: {
        fontFamily: fonts.extraBold,
        fontSize: 18,
        marginBottom: 2,
    },
    roleOptionDesc: {
        fontFamily: fonts.medium,
        fontSize: 12,
        color: '#64748B',
        lineHeight: 16,
    },
    roleArrowBox: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    backButton: {
        paddingVertical: 12,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },
    backButtonText: {
        fontFamily: fonts.bold,
        fontSize: 14,
        color: staticColors.textLight,
    },
});
