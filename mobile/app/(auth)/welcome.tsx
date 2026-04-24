import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    Animated,
    StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/typography';
import { useAppDispatch } from '../../hooks/redux';
import { setGuestRole, logout } from '../../store/slices/authSlice';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
    const router = useRouter();
    const dispatch = useAppDispatch();

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const shineAnim = useRef(new Animated.Value(-100)).current;

    useEffect(() => {
        // Entrance Animations
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.spring(slideAnim, {
                toValue: 0,
                tension: 20,
                friction: 7,
                useNativeDriver: true,
            }),
        ]).start();

        // Logo Pulse Animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.2,
                    duration: 2000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 2000,
                    useNativeDriver: true,
                }),
            ])
        ).start();

        // Shine Animation Loop
        const startShine = () => {
            shineAnim.setValue(-100);
            Animated.timing(shineAnim, {
                toValue: 400,
                duration: 800,
                useNativeDriver: true,
            }).start(() => {
                setTimeout(startShine, 4000);
            });
        };
        startShine();
    }, []);

    const handleGuestEntry = (role: 'CITIZEN' | 'ELECTRICIAN', path: string) => {
        dispatch(setGuestRole(role));
        router.replace(path as any);
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            {/* Premium Background Gradient */}
            <LinearGradient
                colors={['#0F172A', '#1E1B4B', '#0F172A']}
                style={StyleSheet.absoluteFill}
            />

            {/* Animated Glow Blobs */}
            <View style={[styles.glowBlob, { top: -100, right: -100, backgroundColor: '#7C3AED' }]} />
            <View style={[styles.glowBlob, { bottom: -100, left: -100, backgroundColor: '#3B82F6', opacity: 0.15 }]} />

            <View style={styles.overlay}>
                <Animated.View
                    style={[
                        styles.content,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }]
                        }
                    ]}
                >
                    <View style={styles.logoSection}>
                        <View style={styles.logoWrapper}>
                            <Animated.View style={[
                                styles.logoPulse,
                                {
                                    transform: [{ scale: pulseAnim }],
                                    opacity: pulseAnim.interpolate({
                                        inputRange: [1, 1.2],
                                        outputRange: [0.6, 0],
                                    }),
                                }
                            ]} />
                            <View style={styles.logoIconContainer}>
                                <LinearGradient
                                    colors={['#8B5CF6', '#7C3AED']}
                                    style={styles.logoGradient}
                                >
                                    <Ionicons name="flash" size={42} color={colors.white} />
                                </LinearGradient>
                            </View>
                        </View>
                        <Text style={styles.title}>İşbitir</Text>
                        <Text style={styles.subtitle}>Hizmet almanın kolay hali.</Text>
                    </View>

                    <View style={styles.buttonSection}>
                        <TouchableOpacity
                            onPress={() => handleGuestEntry('CITIZEN', '/(tabs)')}
                            activeOpacity={0.8}
                            style={styles.mainButton}
                        >
                            <View style={[styles.glassCard, styles.citizenBorder]}>
                                <LinearGradient
                                    colors={['rgba(124, 58, 237, 0.15)', 'rgba(124, 58, 237, 0.05)']}
                                    style={styles.cardGradient}
                                >
                                    <View style={[styles.buttonIcon, { backgroundColor: '#7C3AED' }]}>
                                        <Ionicons name="people" size={24} color={colors.white} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.buttonTitle}>Hizmet Alan</Text>
                                        <Text style={styles.buttonSubtitle}>Hızlıca uzman bul, ilan ver</Text>
                                    </View>
                                    <Ionicons name="arrow-forward" size={20} color="#7C3AED" />
                                </LinearGradient>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => handleGuestEntry('ELECTRICIAN', '/(tabs)')}
                            activeOpacity={0.8}
                            style={[styles.mainButton, { marginTop: 16 }]}
                        >
                            <View style={[styles.glassCard, styles.electricianBorder]}>
                                <LinearGradient
                                    colors={['rgba(59, 130, 246, 0.15)', 'rgba(59, 130, 246, 0.05)']}
                                    style={styles.cardGradient}
                                >
                                    <View style={[styles.buttonIcon, { backgroundColor: '#3B82F6' }]}>
                                        <Ionicons name="construct" size={24} color={colors.white} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.buttonTitle}>Hizmet Veren</Text>
                                        <Text style={styles.buttonSubtitle}>İşleri gör, teklif ver</Text>
                                    </View>
                                    <Ionicons name="arrow-forward" size={20} color="#3B82F6" />
                                </LinearGradient>
                            </View>
                        </TouchableOpacity>

                        <View style={styles.authContainer}>
                            <TouchableOpacity
                                onPress={() => router.push('/(auth)/role-select')}
                                style={styles.registerButton}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={['rgba(124, 58, 237, 0.45)', 'rgba(124, 58, 237, 0.15)']}
                                    style={styles.registerGradient}
                                >
                                    <Animated.View style={[
                                        styles.shineLayer,
                                        { transform: [{ translateX: shineAnim }, { rotate: '25deg' }] }
                                    ]}>
                                        <LinearGradient
                                            colors={['transparent', 'rgba(255, 255, 255, 0.2)', 'transparent']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={StyleSheet.absoluteFill}
                                        />
                                    </Animated.View>
                                    <Text style={styles.registerText}>Ücretsiz Kayıt Ol</Text>
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => router.push('/(auth)/login')}
                                style={styles.loginLink}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.loginLinkText}>
                                    Zaten hesabınız var mı? <Text style={styles.loginLinkHighlight}>Giriş Yap</Text>
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>
            </View >
        </View >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A',
    },
    overlay: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    content: {
        width: '100%',
    },
    glowBlob: {
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: 150,
        opacity: 0.15,
    },
    logoSection: {
        alignItems: 'center',
        marginBottom: 60,
    },
    logoWrapper: {
        width: 100,
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    logoPulse: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#7C3AED',
    },
    logoIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        padding: 3,
        backgroundColor: 'rgba(255,255,255,0.1)',
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 10 },
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
        fontSize: 38,
        color: colors.white,
        letterSpacing: -1.5,
        textShadowColor: 'rgba(124, 58, 237, 0.5)',
        textShadowOffset: { width: 0, height: 4 },
        textShadowRadius: 10,
    },
    subtitle: {
        fontFamily: fonts.medium,
        fontSize: 15,
        color: 'rgba(255,255,255,0.85)',
        marginTop: 8,
    },
    buttonSection: {
        width: '100%',
    },
    mainButton: {
        borderRadius: 24,
        overflow: 'hidden',
    },
    glassCard: {
        borderRadius: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 1,
    },
    citizenBorder: {
        borderColor: 'rgba(124, 58, 237, 0.3)',
    },
    electricianBorder: {
        borderColor: 'rgba(59, 130, 246, 0.3)',
    },
    cardGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 24,
        paddingHorizontal: 20,
        gap: 16,
    },
    buttonIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonTitle: {
        fontFamily: fonts.bold,
        fontSize: 20,
        color: colors.white,
        marginBottom: 2,
    },
    buttonSubtitle: {
        fontFamily: fonts.medium,
        fontSize: 13,
        color: 'rgba(255,255,255,0.7)',
    },
    authContainer: {
        width: '100%',
        alignItems: 'center',
        marginTop: 40,
        gap: 20,
    },
    registerButton: {
        width: '100%',
        overflow: 'hidden',
        borderRadius: 16,
        backgroundColor: 'rgba(124, 58, 237, 0.1)',
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 8,
    },
    registerGradient: {
        width: '100%',
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(124, 58, 237, 0.4)',
    },
    registerText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: fonts.bold,
        letterSpacing: 0.5,
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    loginLink: {
        paddingVertical: 10,
    },
    loginLinkText: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 14,
        fontFamily: fonts.medium,
    },
    loginLinkHighlight: {
        color: '#fff',
        fontFamily: fonts.bold,
        textDecorationLine: 'underline',
    },
    shineLayer: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 20,
        backgroundColor: 'transparent',
    },
});
