import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ImageBackground,
    Dimensions,
    TouchableOpacity,
    Animated,
    StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';
import { useAppDispatch } from '../../hooks/redux';
import { setGuestRole } from '../../store/slices/authSlice';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
    const router = useRouter();
    const dispatch = useAppDispatch();

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;

    useEffect(() => {
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
    }, []);

    const handleGuestEntry = (role: 'CITIZEN' | 'ELECTRICIAN', path: string) => {
        // Record the persona choice
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
            <View style={[styles.glowBlob, { top: height * 0.4, left: width * 0.3, width: 200, height: 200, opacity: 0.05, backgroundColor: '#FFFFFF' }]} />

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
                        <View style={styles.logoCircle}>
                            <LinearGradient
                                colors={['#8B5CF6', '#7C3AED']}
                                style={styles.logoGradient}
                            >
                                <Ionicons name="flash" size={42} color={colors.white} />
                            </LinearGradient>
                        </View>
                        <Text style={styles.title}>Elektrikçiler</Text>
                        <Text style={styles.subtitle}>Sektörün uzmanlarıyla buluşun</Text>
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
                                        <Text style={styles.buttonTitle} numberOfLines={1} adjustsFontSizeToFit>Vatandaş Olarak Gez</Text>
                                        <Text style={styles.buttonSubtitle}>Hızlıca usta bul ve ilan ver</Text>
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
                                        <Text style={styles.buttonTitle} numberOfLines={1} adjustsFontSizeToFit>Usta Olarak Gez</Text>
                                        <Text style={styles.buttonSubtitle}>İşleri gör ve teklif ver</Text>
                                    </View>
                                    <Ionicons name="arrow-forward" size={20} color="#3B82F6" />
                                </LinearGradient>
                            </View>
                        </TouchableOpacity>

                        <View style={styles.authLinksContainer}>
                            <TouchableOpacity
                                onPress={() => router.push('/(auth)/login')}
                                style={styles.authLink}
                            >
                                <Text style={styles.authLinkText}>Giriş Yap</Text>
                            </TouchableOpacity>

                            <View style={styles.authDivider} />

                            <TouchableOpacity
                                onPress={() => router.push('/(auth)/register')}
                                style={styles.authLink}
                            >
                                <Text style={styles.authLinkText}>Kayıt Ol</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Dev-only Reset Onboarding (Subtle) */}
                        <TouchableOpacity
                            onPress={async () => {
                                const SecureStore = await import('expo-secure-store');
                                await SecureStore.deleteItemAsync('has_seen_onboarding');
                                router.replace('/onboarding');
                            }}
                            style={{ marginTop: 20, alignSelf: 'center', opacity: 0.5 }}
                        >
                            <Text style={{ color: '#fff', fontSize: 12, textDecorationLine: 'underline' }}>Tanıtımı Sıfırla (Test)</Text>
                        </TouchableOpacity>
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
    logoCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        padding: 3,
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginBottom: 24,
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    buttonTitle: {
        fontFamily: fonts.bold,
        fontSize: 20,
        color: colors.white,
        marginBottom: 2,
        letterSpacing: -0.5,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    buttonSubtitle: {
        fontFamily: fonts.medium,
        fontSize: 13,
        color: 'rgba(255,255,255,0.7)',
    },
    authLinksContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 40,
        gap: 20,
    },
    authLink: {
        paddingVertical: 10,
        paddingHorizontal: 20,
    },
    authLinkText: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: '#FFFFFF',
    },
    authDivider: {
        width: 1,
        height: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
});
