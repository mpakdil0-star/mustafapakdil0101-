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

const { width } = Dimensions.get('window');

interface AuthGuardModalProps {
    visible: boolean;
    onClose: () => void;
    onLogin: () => void;
    onRegister: () => void;
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
    const { t } = useTranslation();
    const displayTitle = title || t('auth.roleSelection', 'Harika Bir Adım!'); // tr.json'da tam karşılığı yoksa fallback
    const displayMessage = message || 'Ustalardan teklif almak, mesajlaşmak ve işini hemen çözmek için topluluğumuza katılın.';
    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <LinearGradient
                    colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
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
                            <Ionicons name={icon} size={42} color={staticColors.white} />
                        </View>
                        <Text style={styles.title}>{displayTitle}</Text>
                        <Text style={styles.subtitle}>{displayMessage}</Text>
                    </LinearGradient>

                    <View style={styles.body}>
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
                                onPress={onRegister}
                                activeOpacity={0.8}
                                style={[styles.secondaryButton, { borderColor: colors.primary, backgroundColor: staticColors.white + '80' }]}
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
    cancelButtonText: {
        fontFamily: fonts.bold,
        fontSize: 14,
        color: staticColors.textLight,
    },
});
