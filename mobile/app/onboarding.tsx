import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    useWindowDimensions,
    Animated,
    TouchableOpacity,
    StatusBar,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import { fonts } from '../constants/typography';
import { useAppSelector } from '../hooks/redux';
import { completeOnboarding, hasCompletedOnboarding } from '../utils/onboardingState';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const slides = [
    {
        id: '1',
        eyebrow: 'İHTİYACINI SEÇ',
        title: 'Doğru ustayı kolayca bul',
        description: 'Elektrikten tesisata, çilingirden kombiye tüm ihtiyaçların için yakınındaki güvenilir ustalara ulaş.',
        icon: 'search-outline',
        color: '#22D3EE',
        secondaryColor: '#0E7490',
    },
    {
        id: '2',
        eyebrow: 'TEKLİFLERİ KARŞILAŞTIR',
        title: 'İşini en iyi teklifle çöz',
        description: 'Talebini yayınla, ustalardan gelen teklifleri tek ekranda karşılaştır ve sana uygun olanı seç.',
        icon: 'briefcase-outline',
        color: '#34D399',
        secondaryColor: '#047857',
    },
    {
        id: '3',
        eyebrow: 'ANINDA HABERDAR OL',
        title: 'Teklif ve mesajları kaçırma',
        description: 'Yeni işlerden, tekliflerden ve mesajlardan anında haberdar ol; tüm süreci cebinden yönet.',
        icon: 'notifications-outline',
        color: '#FBBF24',
        secondaryColor: '#B45309',
    },
    {
        id: '4',
        eyebrow: 'GÜVENLE TAMAMLA',
        title: 'Kararını güvenle ver',
        description: 'Gerçek müşteri yorumlarını incele, onaylı profilleri keşfet ve işini güvenle tamamla.',
        icon: 'shield-checkmark-outline',
        color: '#A78BFA',
        secondaryColor: '#6D28D9',
    },
];

const Paginator = ({ data, scrollX }: { data: any[]; scrollX: Animated.Value }) => {
    const { width } = useWindowDimensions();

    return (
        <View style={styles.pagination}>
            {data.map((_, i) => {
                const inputRange = [(i - 1) * width, i * width, (i + 1) * width];

                const dotWidth = scrollX.interpolate({
                    inputRange,
                    outputRange: [7, 28, 7],
                    extrapolate: 'clamp',
                });

                const opacity = scrollX.interpolate({
                    inputRange,
                    outputRange: [0.28, 1, 0.28],
                    extrapolate: 'clamp',
                });

                return (
                    <Animated.View
                        key={i.toString()}
                        style={[
                            styles.dot,
                            { width: dotWidth, opacity },
                        ]}
                    />
                );
            })}
        </View>
    );
};

export default function OnboardingScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
    const { width } = useWindowDimensions();
    const [isCheckingState, setIsCheckingState] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isCompleting, setIsCompleting] = useState(false);
    const scrollX = useRef(new Animated.Value(0)).current;
    const slidesRef = useRef<FlatList>(null);

    const viewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems && viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index);
        }
    }).current;

    const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

    useEffect(() => {
        let active = true;
        hasCompletedOnboarding()
            .then((completed) => {
                if (!active) return;
                if (completed) {
                    router.replace(isAuthenticated ? '/(tabs)' : '/(auth)/welcome');
                    return;
                }
                setIsCheckingState(false);
            })
            .catch((error) => {
                console.warn('Onboarding state could not be read:', error);
                if (active) router.replace(isAuthenticated ? '/(tabs)' : '/(auth)/welcome');
            });
        return () => { active = false; };
    }, [isAuthenticated, router]);

    const scrollTo = async () => {
        if (currentIndex < slides.length - 1) {
            slidesRef.current?.scrollToIndex({ index: currentIndex + 1 });
        } else {
            if (isCompleting) return;
            setIsCompleting(true);
            try {
                await completeOnboarding();
                router.replace(isAuthenticated ? '/(tabs)' : '/(auth)/welcome');
            } catch (error) {
                console.error('Error saving onboarding state:', error);
                router.replace(isAuthenticated ? '/(tabs)' : '/(auth)/welcome');
            }
        }
    };

    const skip = async () => {
        if (isCompleting) return;
        setIsCompleting(true);
        try {
            await completeOnboarding();
            router.replace(isAuthenticated ? '/(tabs)' : '/(auth)/welcome');
        } catch (error) {
            console.error('Error saving onboarding state:', error);
            router.replace(isAuthenticated ? '/(tabs)' : '/(auth)/welcome');
        }
    };

    if (isCheckingState) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#5EEAD4" />
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) }]}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Background */}
            <LinearGradient
                colors={['#03131F', '#072B35', '#071827']}
                style={StyleSheet.absoluteFill}
            />

            {/* Ambient Glows */}
            <View style={[styles.glowBlob, styles.glowTop, { backgroundColor: slides[currentIndex].color }]} />
            <View style={[styles.glowBlob, styles.glowBottom, { backgroundColor: slides[currentIndex].secondaryColor }]} />

            <View style={styles.header}>
                <View style={styles.brandRow}>
                    <View style={styles.brandMark}><Ionicons name="flash" size={16} color="#042F2E" /></View>
                    <Text style={styles.brand}>işbitir</Text>
                </View>
                {currentIndex < slides.length - 1 && (
                    <TouchableOpacity onPress={skip} disabled={isCompleting} style={styles.skipButton} activeOpacity={0.7}>
                        <Text style={styles.skipText}>Atla</Text>
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.sliderArea}>
                <FlatList
                    data={slides}
                    renderItem={({ item }) => (
                        <View style={[styles.slide, { width }]}>

                            <View style={[styles.visualCard, { borderColor: item.color + '45' }]}>
                                <View style={[styles.cardGlow, { backgroundColor: item.color }]} />
                                <LinearGradient
                                    colors={[item.color, item.secondaryColor]}
                                    style={styles.iconContainer}
                                >
                                    <Ionicons name={item.icon as any} size={54} color="#FFF" />
                                </LinearGradient>
                                <View style={styles.checkPill}>
                                    <Ionicons name="checkmark-circle" size={16} color="#5EEAD4" />
                                    <Text style={styles.checkPillText}>Kolay · Hızlı · Güvenli</Text>
                                </View>
                            </View>

                            <View style={styles.textContainer}>
                                <Text style={[styles.eyebrow, { color: item.color }]}>{item.eyebrow}</Text>
                                <Text style={styles.title}>{item.title}</Text>
                                <Text style={styles.description}>{item.description}</Text>
                            </View>
                        </View>
                    )}
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
            </View>

            <View style={styles.footer}>
                <Paginator data={slides} scrollX={scrollX} />

                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={scrollTo}
                        disabled={isCompleting}
                        style={[styles.nextButton, isCompleting && styles.buttonDisabled]}
                    >
                        {isCompleting ? (
                            <ActivityIndicator color="#042F2E" />
                        ) : (
                            <>
                                <Text style={styles.nextButtonText}>
                                    {currentIndex === slides.length - 1 ? 'Hemen Başla' : 'Devam Et'}
                                </Text>
                                <Ionicons name="arrow-forward" size={20} color="#042F2E" />
                            </>
                        )}
                    </TouchableOpacity>
                    <Text style={styles.stepText}>{currentIndex + 1} / {slides.length}</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#03131F',
    },
    glowBlob: {
        position: 'absolute',
        width: 330,
        height: 330,
        borderRadius: 165,
        opacity: 0.14,
    },
    glowTop: {
        top: -150,
        right: -130,
    },
    glowBottom: {
        bottom: -190,
        left: -140,
    },
    header: {
        height: 72,
        paddingHorizontal: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    brandRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
    },
    brandMark: {
        width: 30,
        height: 30,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#5EEAD4',
    },
    brand: {
        color: '#F8FAFC',
        fontFamily: fonts.extraBold,
        fontSize: 20,
        letterSpacing: -0.6,
    },
    sliderArea: {
        flex: 1,
    },
    slide: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 28,
    },
    visualCard: {
        width: 238,
        height: 238,
        borderRadius: 42,
        marginBottom: 38,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.055)',
        borderWidth: 1,
    },
    cardGlow: {
        position: 'absolute',
        width: 170,
        height: 170,
        borderRadius: 85,
        opacity: 0.12,
        transform: [{ scale: 1.35 }],
    },
    iconContainer: {
        width: 112,
        height: 112,
        borderRadius: 34,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.28)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.28,
        shadowRadius: 18,
        elevation: 10,
    },
    checkPill: {
        position: 'absolute',
        bottom: 22,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 20,
        backgroundColor: 'rgba(3,19,31,0.78)',
        borderWidth: 1,
        borderColor: 'rgba(94,234,212,0.18)',
    },
    checkPillText: {
        color: '#CCFBF1',
        fontFamily: fonts.semiBold,
        fontSize: 11,
    },
    textContainer: {
        alignItems: 'center',
        maxWidth: 360,
    },
    eyebrow: {
        fontFamily: fonts.bold,
        fontSize: 12,
        letterSpacing: 1.4,
        marginBottom: 10,
    },
    title: {
        fontFamily: fonts.extraBold,
        fontSize: 31,
        lineHeight: 37,
        color: colors.white,
        marginBottom: 14,
        textAlign: 'center',
        letterSpacing: -0.9,
    },
    description: {
        fontFamily: fonts.medium,
        fontSize: 15,
        color: '#AFC3CF',
        textAlign: 'center',
        lineHeight: 23,
    },
    footer: {
        alignSelf: 'stretch',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 8,
    },
    pagination: {
        height: 42,
        flexDirection: 'row',
        alignItems: 'center',
    },
    dot: {
        height: 7,
        borderRadius: 4,
        backgroundColor: '#5EEAD4',
        marginHorizontal: 5,
    },
    buttonContainer: {
        width: '100%',
        alignItems: 'center',
    },
    skipButton: {
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.06)',
    },
    skipText: {
        color: '#CBD5E1',
        fontFamily: fonts.semiBold,
        fontSize: 14,
    },
    nextButton: {
        width: '100%',
        height: 56,
        borderRadius: 18,
        backgroundColor: '#5EEAD4',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        shadowColor: '#2DD4BF',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 14,
        elevation: 7,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    nextButtonText: {
        color: '#042F2E',
        fontFamily: fonts.bold,
        fontSize: 16,
    },
    stepText: {
        color: '#64808E',
        fontFamily: fonts.semiBold,
        fontSize: 12,
        marginTop: 10,
    },
});
