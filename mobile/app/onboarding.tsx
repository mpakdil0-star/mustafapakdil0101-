import React, { useState, useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    FlatList,
    TouchableOpacity,
    Dimensions,
    SafeAreaView,
    Animated,
    Image,
    ViewToken,
    StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../constants/colors';
import { fonts } from '../constants/typography';
import { spacing } from '../constants/spacing';
import * as SecureStore from 'expo-secure-store';

const { width, height } = Dimensions.get('window');

const ONBOARDING_DATA = [
    {
        id: '1',
        title: 'Hızlı Çözüm, Uzman Eller',
        description: 'Saniyeler içinde en yetkin elektrikçilere ulaşın, sorununuzu anında çözün.',
        icon: 'flash-outline',
        image: require('../assets/images/onboarding_fast_solution_neon.png'),
        colors: ['#3B82F6', '#2563EB'] as const,
        glow: '#3B82F6',
    },
    {
        id: '2',
        title: 'Teklif Al, Karşılaştır',
        description: 'Bütçenize en uygun teklifleri görün ve size özel uzmanı güvenle seçin.',
        icon: 'document-text-outline',
        image: require('../assets/images/onboarding_get_offers_neon.png'),
        colors: ['#10B981', '#059669'] as const,
        glow: '#10B981',
    },
    {
        id: '3',
        title: '7/24 Acil Müdahale',
        description: 'Gece veya gündüz fark etmez, acil durumlarda profesyonel yardım yanınızda.',
        icon: 'time-outline',
        image: require('../assets/images/onboarding_emergency_sos_neon.png'),
        colors: ['#EF4444', '#B91C1C'] as const,
        glow: '#EF4444',
    },
    {
        id: '4',
        title: 'Güvenli ve Şeffaf',
        description: 'Güvenilir uzmanlar ve şeffaf fiyatlandırma ile evinizi garantiye alın.',
        icon: 'shield-checkmark-outline',
        image: require('../assets/images/onboarding_trust_secure_neon.png'),
        colors: ['#8B5CF6', '#6D28D9'] as const,
        glow: '#8B5CF6',
    },
];

export default function OnboardingScreen() {
    const router = useRouter();
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollX = useRef(new Animated.Value(0)).current;
    const slidesRef = useRef<FlatList>(null);

    const viewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        if (viewableItems.length > 0 && viewableItems[0].index !== null) {
            setCurrentIndex(viewableItems[0].index);
        }
    }).current;

    const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

    const handleFinish = async () => {
        try {
            await SecureStore.setItemAsync('has_seen_onboarding', 'true');
            router.replace('/(auth)/welcome');
        } catch (error) {
            console.error('Error saving onboarding state:', error);
            router.replace('/(auth)/welcome');
        }
    };

    const scrollTo = () => {
        if (currentIndex < ONBOARDING_DATA.length - 1) {
            slidesRef.current?.scrollToIndex({ index: currentIndex + 1 });
        } else {
            handleFinish();
        }
    };

    const OnboardingItem = ({ item }: { item: typeof ONBOARDING_DATA[0] }) => {
        const floatAnim = useRef(new Animated.Value(0)).current;

        React.useEffect(() => {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(floatAnim, {
                        toValue: 1,
                        duration: 2000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(floatAnim, {
                        toValue: 0,
                        duration: 2000,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        }, []);

        const translateY = floatAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -15],
        });

        return (
            <View style={styles.itemContainer}>
                {/* Background Glow */}
                <View style={[styles.glowCircle, { backgroundColor: item.glow, opacity: 0.12 }]} />

                <View style={styles.glassCard}>
                    <Animated.View style={[styles.iconWrapper, { transform: [{ translateY }] }]}>
                        {/* Inner Glow */}
                        <View style={[styles.innerGlow, { backgroundColor: item.glow }]} />
                        {item.image ? (
                            <Image source={item.image} style={styles.image} resizeMode="contain" />
                        ) : (
                            <View style={styles.placeholderIcon}>
                                <Ionicons name={item.icon as any} size={width * 0.25} color="#fff" />
                            </View>
                        )}
                    </Animated.View>

                    <View style={styles.textContainer}>
                        <Text style={styles.title}>{item.title}</Text>
                        <Text style={styles.description}>{item.description}</Text>
                    </View>
                </View>
            </View>
        );
    };

    const Paginator = () => {
        return (
            <View style={styles.paginatorContainer}>
                {ONBOARDING_DATA.map((_, i) => {
                    const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
                    const dotWidth = scrollX.interpolate({
                        inputRange,
                        outputRange: [8, 24, 8],
                        extrapolate: 'clamp',
                    });
                    const opacity = scrollX.interpolate({
                        inputRange,
                        outputRange: [0.3, 1, 0.3],
                        extrapolate: 'clamp',
                    });
                    return (
                        <Animated.View
                            style={[styles.dot, { width: dotWidth, opacity }]}
                            key={i.toString()}
                        />
                    );
                })}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient
                colors={['#0F172A', '#1E1B4B']}
                style={StyleSheet.absoluteFill}
            />

            <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleFinish} style={styles.skipButton}>
                        <Text style={styles.skipText}>Atla</Text>
                    </TouchableOpacity>
                </View>

                <FlatList
                    data={ONBOARDING_DATA}
                    renderItem={({ item }) => <OnboardingItem item={item} />}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    pagingEnabled
                    bounces={false}
                    keyExtractor={(item) => item.id}
                    onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
                        useNativeDriver: false,
                    })}
                    onViewableItemsChanged={viewableItemsChanged}
                    viewabilityConfig={viewConfig}
                    ref={slidesRef}
                />

                <View style={styles.footer}>
                    <Paginator />

                    <TouchableOpacity
                        style={styles.button}
                        activeOpacity={0.8}
                        onPress={scrollTo}
                    >
                        <LinearGradient
                            colors={ONBOARDING_DATA[currentIndex].colors}
                            style={styles.buttonGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Text style={styles.buttonText}>
                                {currentIndex === ONBOARDING_DATA.length - 1 ? 'Hemen Başla' : 'Sonraki'}
                            </Text>
                            <Ionicons
                                name={currentIndex === ONBOARDING_DATA.length - 1 ? 'rocket' : 'arrow-forward'}
                                size={18}
                                color="#fff"
                            />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A',
    },
    header: {
        height: 60,
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingHorizontal: spacing.lg,
    },
    skipButton: {
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.md,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    skipText: {
        fontFamily: fonts.semiBold,
        fontSize: 14,
        color: '#CBD5E1',
    },
    itemContainer: {
        width,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
    },
    glowCircle: {
        position: 'absolute',
        width: width * 0.8,
        height: width * 0.8,
        borderRadius: width * 0.4,
        top: height * 0.1,
    },
    glassCard: {
        width: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 40,
        padding: spacing.xl,
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 40 },
        shadowOpacity: 0.4,
        shadowRadius: 50,
        elevation: 20,
        overflow: 'hidden',
    },
    iconWrapper: {
        width: width * 0.55,
        height: width * 0.55,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    innerGlow: {
        position: 'absolute',
        width: width * 0.45,
        height: width * 0.45,
        borderRadius: width * 0.225,
        opacity: 0.25,
    },
    placeholderIcon: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 100,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    image: {
        width: '110%',
        height: '110%',
    },
    textContainer: {
        alignItems: 'center',
        marginTop: spacing.md,
    },
    title: {
        fontFamily: fonts.extraBold,
        fontSize: 28,
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: spacing.sm,
        letterSpacing: -0.5,
    },
    description: {
        fontFamily: fonts.medium,
        fontSize: 16,
        color: '#94A3B8',
        textAlign: 'center',
        paddingHorizontal: spacing.md,
        lineHeight: 24,
        opacity: 0.9,
    },
    footer: {
        height: 160,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.xl,
    },
    paginatorContainer: {
        flexDirection: 'row',
        height: 40,
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    dot: {
        height: 8,
        borderRadius: 4,
        backgroundColor: '#7C3AED',
        marginHorizontal: 4,
    },
    button: {
        width: '100%',
        height: 56,
    },
    buttonGradient: {
        width: '100%',
        height: '100%',
        borderRadius: 20,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 5,
    },
    buttonText: {
        fontFamily: fonts.bold,
        fontSize: 18,
        color: '#fff',
    },
});
