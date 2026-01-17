import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    FlatList,
    Animated,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fonts } from '../../constants/typography';

const { width, height } = Dimensions.get('window');

const ONBOARDING_KEY = 'electrician_onboarding_completed';

interface OnboardingSlide {
    id: string;
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    title: string;
    description: string;
    bulletPoints?: string[];
}

const slides: OnboardingSlide[] = [
    {
        id: '1',
        icon: 'rocket',
        iconColor: '#7C3AED',
        title: 'İşbitir\'e Hoş Geldiniz!',
        description: 'Türkiye\'nin en kolay iş bulma platformu. Binlerce müşteri sizi bekliyor.',
    },
    {
        id: '2',
        icon: 'wallet',
        iconColor: '#3B82F6',
        title: 'Kredi Sistemi Nasıl Çalışır?',
        description: '',
        bulletPoints: [
            'Her teklif verdiğinizde 1 kredi harcanır',
            'İlan vatandaş tarafından iptal edilirse krediniz iade edilir',
            'Krediniz bittiğinde Profil → Cüzdanım → Kredi Yükle',
        ],
    },
    {
        id: '3',
        icon: 'gift',
        iconColor: '#10B981',
        title: '5 Kredi Hediye!',
        description: 'İlk kayıt bonusu olarak 5 kredi hesabınıza tanımlandı. 5 ilana ücretsiz teklif verebilirsiniz!',
    },
    {
        id: '4',
        icon: 'location',
        iconColor: '#F59E0B',
        title: 'Hizmet Bölgenizi Seçin',
        description: '',
        bulletPoints: [
            'Profil → Hizmet Bölgelerim sayfasından çalışmak istediğiniz bölgeleri ekleyin',
            'Sadece seçtiğiniz bölgelerden ilan bildirimi alırsınız',
        ],
    },
    {
        id: '5',
        icon: 'trophy',
        iconColor: '#EF4444',
        title: 'Daha Fazla İş Almak İçin',
        description: '',
        bulletPoints: [
            '🔔 Bildirimleri açık tutun',
            '⚡ Hızlı cevap verin',
            '📸 Profilinizi tamamlayın',
            '⭐ İyi değerlendirmeler alın',
        ],
    },
];

export default function ElectricianOnboardingScreen() {
    const router = useRouter();
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);
    const scrollX = useRef(new Animated.Value(0)).current;

    const completeOnboarding = async () => {
        try {
            await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
            router.replace('/(tabs)');
        } catch (error) {
            console.error('Error saving onboarding status:', error);
            router.replace('/(tabs)');
        }
    };

    const handleNext = () => {
        if (currentIndex < slides.length - 1) {
            flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
            setCurrentIndex(currentIndex + 1);
        } else {
            completeOnboarding();
        }
    };

    const handleSkip = () => {
        completeOnboarding();
    };

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index || 0);
        }
    }).current;

    const renderSlide = ({ item, index }: { item: OnboardingSlide; index: number }) => (
        <View style={styles.slide}>
            <View style={styles.iconContainer}>
                <View style={[styles.iconGlow, { backgroundColor: item.iconColor }]} />
                <LinearGradient
                    colors={[item.iconColor, item.iconColor + 'CC']}
                    style={styles.iconBox}
                >
                    <Ionicons name={item.icon} size={48} color="#FFFFFF" />
                </LinearGradient>
            </View>

            <Text style={styles.title}>{item.title}</Text>

            {item.description ? (
                <Text style={styles.description}>{item.description}</Text>
            ) : null}

            {item.bulletPoints && item.bulletPoints.length > 0 ? (
                <View style={styles.bulletContainer}>
                    {item.bulletPoints.map((point, idx) => (
                        <View key={idx} style={styles.bulletRow}>
                            <View style={[styles.bulletDot, { backgroundColor: item.iconColor }]} />
                            <Text style={styles.bulletText}>{point}</Text>
                        </View>
                    ))}
                </View>
            ) : null}
        </View>
    );

    const renderDots = () => (
        <View style={styles.dotsContainer}>
            {slides.map((_, index) => {
                const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
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
                        key={index}
                        style={[
                            styles.dot,
                            {
                                width: dotWidth,
                                opacity,
                                backgroundColor: '#3B82F6',
                            },
                        ]}
                    />
                );
            })}
        </View>
    );

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#0F172A', '#1E3A8A', '#0F172A']}
                style={StyleSheet.absoluteFill}
            />

            {/* Skip Button */}
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                <Text style={styles.skipText}>Atla</Text>
            </TouchableOpacity>

            {/* Slides */}
            <FlatList
                ref={flatListRef}
                data={slides}
                renderItem={renderSlide}
                keyExtractor={(item) => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: false }
                )}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
                scrollEventThrottle={16}
            />

            {/* Dots */}
            {renderDots()}

            {/* Next/Start Button */}
            <TouchableOpacity style={styles.nextButton} onPress={handleNext} activeOpacity={0.8}>
                <LinearGradient
                    colors={['#3B82F6', '#1D4ED8']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.nextButtonGradient}
                >
                    <Text style={styles.nextButtonText}>
                        {currentIndex === slides.length - 1 ? 'Başla' : 'İleri'}
                    </Text>
                    <Ionicons
                        name={currentIndex === slides.length - 1 ? 'checkmark-circle' : 'arrow-forward'}
                        size={20}
                        color="#FFFFFF"
                    />
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A',
    },
    skipButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 40,
        right: 24,
        zIndex: 10,
        padding: 8,
    },
    skipText: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.6)',
    },
    slide: {
        width,
        flex: 1,
        paddingHorizontal: 32,
        paddingTop: height * 0.15,
        alignItems: 'center',
    },
    iconContainer: {
        marginBottom: 40,
        position: 'relative',
    },
    iconGlow: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        opacity: 0.2,
        top: -10,
        left: -10,
    },
    iconBox: {
        width: 100,
        height: 100,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontFamily: fonts.extraBold,
        fontSize: 28,
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: 20,
        letterSpacing: -0.5,
    },
    description: {
        fontFamily: fonts.medium,
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.7)',
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: 16,
    },
    bulletContainer: {
        width: '100%',
        paddingHorizontal: 8,
    },
    bulletRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    bulletDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginTop: 6,
        marginRight: 12,
    },
    bulletText: {
        flex: 1,
        fontFamily: fonts.medium,
        fontSize: 15,
        color: 'rgba(255, 255, 255, 0.8)',
        lineHeight: 22,
    },
    dotsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    dot: {
        height: 8,
        borderRadius: 4,
        marginHorizontal: 4,
    },
    nextButton: {
        marginHorizontal: 32,
        marginBottom: Platform.OS === 'ios' ? 50 : 32,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 15,
        elevation: 8,
    },
    nextButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        gap: 10,
    },
    nextButtonText: {
        fontFamily: fonts.bold,
        fontSize: 17,
        color: '#FFFFFF',
    },
});
