import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Animated,
    Dimensions,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors as staticColors } from '../../constants/colors';
import { fonts } from '../../constants/typography';
import { spacing } from '../../constants/spacing';
import { useAppColors } from '../../hooks/useAppColors';

const { width, height } = Dimensions.get('window');

interface AlertButton {
    text: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
}

interface PremiumAlertProps {
    visible: boolean;
    type?: 'success' | 'error' | 'warning' | 'info' | 'confirm';
    title: string;
    message: string;
    buttons?: AlertButton[];
    onClose?: () => void;
}

export const PremiumAlert: React.FC<PremiumAlertProps> = ({
    visible,
    type = 'info',
    title,
    message,
    buttons = [],
    onClose
}) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;
    const [shouldRender, setShouldRender] = useState(visible);
    const colors = useAppColors();
    const isLight = colors.background === '#FFFFFF' || colors.background === '#F8FAFC';

    useEffect(() => {
        if (visible) {
            setShouldRender(true);
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 8,
                    tension: 40,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 0.9,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                setShouldRender(false);
            });
        }
    }, [visible]);

    if (!shouldRender) return null;

    const getIcon = () => {
        switch (type) {
            case 'success': return { name: 'checkmark-circle', color: '#10B981', glow: '#10B98115' };
            case 'error': return { name: 'alert-circle', color: colors.error, glow: colors.error + '15' };
            case 'warning': return { name: 'warning', color: '#F59E0B', glow: '#F59E0B15' };
            case 'confirm': return { name: 'help-circle', color: colors.primary, glow: colors.primary + '15' };
            default: return { name: 'information-circle', color: colors.primary, glow: colors.primary + '15' };
        }
    };

    const iconData = getIcon();
    const titleColor = isLight ? '#0F172A' : '#FFFFFF';
    const messageColor = isLight ? '#475569' : 'rgba(255, 255, 255, 0.6)';
    const ghostBorderColor = isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.1)';

    return (
        <Modal
            transparent
            visible={visible}
            animationType="none"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <Animated.View
                    style={[
                        styles.backdrop,
                        { opacity: fadeAnim }
                    ]}
                >
                    <TouchableOpacity
                        activeOpacity={1}
                        style={styles.backdropPress}
                        onPress={onClose}
                    />
                </Animated.View>

                <Animated.View
                    style={[
                        styles.alertContainer,
                        {
                            backgroundColor: isLight ? 'rgba(255, 255, 255, 0.96)' : 'rgba(30, 41, 59, 0.96)',
                            borderColor: isLight ? 'rgba(13, 148, 136, 0.1)' : 'rgba(255, 255, 255, 0.08)',
                            opacity: fadeAnim,
                            transform: [{ scale: scaleAnim }]
                        }
                    ]}
                >
                    <View style={styles.glassBackground}>
                        {/* Status Icon with Glow */}
                        <View style={[styles.iconContainer, { backgroundColor: iconData.glow }]}>
                            <Ionicons name={iconData.name as any} size={36} color={iconData.color} />
                        </View>

                        <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
                        <Text style={[styles.message, { color: messageColor }]}>{message}</Text>

                        <View style={styles.buttonContainer}>
                            {buttons.length > 0 ? (
                                buttons.map((btn, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        onPress={btn.onPress}
                                        style={[
                                            styles.button,
                                            buttons.length > 2 ? styles.buttonStack : styles.buttonSide,
                                            btn.variant === 'ghost' && [styles.buttonGhost, { borderColor: ghostBorderColor }],
                                            btn.variant === 'danger' && [styles.buttonDanger, { borderColor: colors.error + '30', backgroundColor: colors.error + '10' }]
                                        ]}
                                    >
                                        {btn.variant === 'primary' || !btn.variant ? (
                                            <LinearGradient
                                                colors={[colors.primary, colors.primaryDark]}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 0 }}
                                                style={styles.buttonGradient}
                                            >
                                                <Text style={styles.buttonTextPrimary}>{btn.text}</Text>
                                            </LinearGradient>
                                        ) : (
                                            <Text style={[
                                                styles.buttonTextSecondary,
                                                { color: isLight ? '#475569' : '#F8FAFC' },
                                                btn.variant === 'danger' && { color: colors.error },
                                                btn.variant === 'ghost' && { color: isLight ? '#94A3B8' : 'rgba(255,255,255,0.4)' }
                                            ]}>
                                                {btn.text}
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                ))
                            ) : (
                                <TouchableOpacity onPress={onClose} style={styles.button}>
                                    <LinearGradient
                                        colors={[colors.primary, colors.primaryDark]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.buttonGradient}
                                    >
                                        <Text style={styles.buttonTextPrimary}>Tamam</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
    },
    backdropPress: {
        flex: 1,
    },
    alertContainer: {
        width: width * 0.85,
        borderRadius: 28,
        overflow: 'hidden',
        borderWidth: 1.5,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.15,
                shadowRadius: 20,
            },
            android: {
                elevation: 15,
            },
        }),
    },
    glassBackground: {
        padding: 24,
        alignItems: 'center',
    },
    iconContainer: {
        width: 72,
        height: 72,
        borderRadius: 36,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontFamily: fonts.bold,
        fontSize: 20,
        textAlign: 'center',
        marginBottom: 10,
        letterSpacing: -0.4,
    },
    message: {
        fontFamily: fonts.medium,
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 28,
        paddingHorizontal: 10,
    },
    buttonContainer: {
        width: '100%',
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 12,
    },
    button: {
        borderRadius: 14,
        overflow: 'hidden',
    },
    buttonSide: {
        flex: 1,
        minWidth: 120,
    },
    buttonStack: {
        width: '100%',
    },
    buttonGradient: {
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonGhost: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonDanger: {
        borderWidth: 1,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonTextPrimary: {
        fontFamily: fonts.bold,
        fontSize: 15,
        color: '#fff',
    },
    buttonTextSecondary: {
        fontFamily: fonts.bold,
        fontSize: 15,
    }
});
