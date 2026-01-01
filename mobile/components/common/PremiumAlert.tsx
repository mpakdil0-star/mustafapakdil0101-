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
            case 'success': return { name: 'checkmark-circle', color: '#10B981', glow: '#10B98130' };
            case 'error': return { name: 'alert-circle', color: '#EF4444', glow: '#EF444430' };
            case 'warning': return { name: 'warning', color: '#F59E0B', glow: '#F59E0B30' };
            case 'confirm': return { name: 'help-circle', color: colors.primary, glow: colors.primary + '30' };
            default: return { name: 'information-circle', color: colors.primary, glow: colors.primary + '30' };
        }
    };

    const iconData = getIcon();

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
                            opacity: fadeAnim,
                            transform: [{ scale: scaleAnim }]
                        }
                    ]}
                >
                    <View style={styles.glassBackground}>
                        {/* Status Icon with Glow */}
                        <View style={[styles.iconContainer, { backgroundColor: iconData.glow }]}>
                            <Ionicons name={iconData.name as any} size={40} color={iconData.color} />
                        </View>

                        <Text style={styles.title}>{title}</Text>
                        <Text style={styles.message}>{message}</Text>

                        <View style={styles.buttonContainer}>
                            {buttons.length > 0 ? (
                                buttons.map((btn, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        onPress={btn.onPress}
                                        style={[
                                            styles.button,
                                            buttons.length > 2 ? styles.buttonStack : styles.buttonSide,
                                            btn.variant === 'ghost' && styles.buttonGhost,
                                            btn.variant === 'danger' && styles.buttonDanger
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
                                                btn.variant === 'danger' && { color: '#EF4444' },
                                                btn.variant === 'ghost' && { color: 'rgba(255,255,255,0.4)' }
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
        borderRadius: 32,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        backgroundColor: 'rgba(30, 41, 59, 0.85)',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.3,
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
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontFamily: fonts.bold,
        fontSize: 22,
        color: '#fff',
        textAlign: 'center',
        marginBottom: 12,
        letterSpacing: -0.5,
    },
    message: {
        fontFamily: fonts.medium,
        fontSize: 15,
        color: 'rgba(255, 255, 255, 0.6)',
        textAlign: 'center',
        lineHeight: 22,
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
        borderRadius: 16,
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
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonGhost: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonDanger: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)',
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonTextPrimary: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: '#fff',
    },
    buttonTextSecondary: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: '#fff',
    }
});
