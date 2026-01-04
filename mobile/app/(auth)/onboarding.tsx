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
    Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/typography';

const slides = [
    {
        id: '1',
        title: 'Hızlı Usta Bul',
        description: 'Konumunuza en yakın elektrikçileri saniyeler içinde görüntüleyin.',
        icon: 'map',
        color: '#3B82F6', // Blue
    },
    {
        id: '2',
        title: 'Güvenilir Hizmet',
        description: 'Onaylı profiller, gerçek yorumlar ve puanlarla güvenle çalışın.',
        icon: 'shield-checkmark',
        color: '#8B5CF6', // Violet
    },
    {
        id: '3',
        title: 'Kolay İşlemler',
        description: 'İhtiyacınızı belirtin, ustalardan gelen teklifleri karşılaştırın ve işi başlatın.',
        icon: 'flash',
        color: '#EC4899', // Pink
    },
];

const Paginator = ({ data, scrollX }: { data: any[]; scrollX: Animated.Value }) => {
    const { width } = useWindowDimensions();

    return (
        <View style={{ flexDirection: 'row', height: 64 }}>
            {data.map((_, i) => {
                const inputRange = [(i - 1) * width, i * width, (i + 1) * width];

                const dotWidth = scrollX.interpolate({
                    inputRange,
                    outputRange: [10, 20, 10],
                    extrapolate: 'clamp',
                });

                const opacity = scrollX.interpolate({
                    inputRange,
                    outputRange: [0.3, 1, 0.3],
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
    const { width, height } = useWindowDimensions();
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollX = useRef(new Animated.Value(0)).current;
    const slidesRef = useRef<FlatList>(null);

    const viewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems && viewableItems.length > 0) {
            setCurrentIndex(viewableItems[0].index);
        }
    }).current;

    const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

    const scrollTo = async () => {
        if (currentIndex < slides.length - 1) {
            slidesRef.current?.scrollToIndex({ index: currentIndex + 1 });
        } else {
            // Last slide - Finish
            try {
                await SecureStore.setItemAsync('has_seen_onboarding', 'true');
                router.replace('/(auth)/welcome');
            } catch (error) {
                console.error('Error saving onboarding state:', error);
                router.replace('/(auth)/welcome');
            }
        }
    };

    const skip = async () => {
        try {
            await SecureStore.setItemAsync('has_seen_onboarding', 'true');
            router.replace('/(auth)/welcome');
        } catch (error) {
            console.error('Error saving onboarding state:', error);
            router.replace('/(auth)/welcome');
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Background */}
            <LinearGradient
                colors={['#0F172A', '#1E1B4B', '#0F172A']}
                style={StyleSheet.absoluteFill}
            />

            {/* Ambient Glows */}
            <View style={[styles.glowBlob, { top: -100, right: -100, backgroundColor: slides[currentIndex]?.color || '#3B82F6' }]} />
            <View style={[styles.glowBlob, { bottom: -100, left: -100, backgroundColor: slides[currentIndex]?.color || '#3B82F6', opacity: 0.1 }]} />


            <View style={{ flex: 3 }}>
                <FlatList
                    data={slides}
                    renderItem={({ item }) => (
                        <View style={[styles.slide, { width }]}>

                            {/* Icon Circle */}
                            <View style={[styles.iconContainer, { shadowColor: item.color }]}>
                                <LinearGradient
                                    colors={[item.color, item.color + '88']}
                                    style={styles.iconGradient}
                                >
                                    <Ionicons name={item.icon as any} size={64} color="#FFF" />
                                </LinearGradient>
                            </View>

                            <View style={styles.textContainer}>
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

                <View style={[
                    styles.buttonContainer,
                    currentIndex === slides.length - 1 && { justifyContent: 'center' }
                ]}>
                    {/* Skip Text Button */}
                    {currentIndex < slides.length - 1 && (
                        <TouchableOpacity onPress={skip} style={styles.skipButton}>
                            <Text style={styles.skipText}>Atla</Text>
                        </TouchableOpacity>
                    )}

                    {/* Next / Main Button */}
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={scrollTo}
                        style={[
                            styles.nextButton,
                            { backgroundColor: slides[currentIndex].color },
                            currentIndex === slides.length - 1 && styles.startButton
                        ]}
                    >
                        {currentIndex === slides.length - 1 ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                <Text style={styles.nextButtonText}>Hemen Başla</Text>
                                <Ionicons name="rocket-outline" size={20} color="#FFF" />
                            </View>
                        ) : (
                            <Ionicons name="arrow-forward" size={24} color="#FFF" />
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A',
        justifyContent: 'center',
        alignItems: 'center',
    },
    glowBlob: {
        position: 'absolute',
        width: 400,
        height: 400,
        borderRadius: 200,
        opacity: 0.2,
        transform: [{ scale: 1.5 }],
    },
    slide: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    iconContainer: {
        width: 140,
        height: 140,
        borderRadius: 70,
        marginBottom: 40,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    iconGradient: {
        flex: 1,
        borderRadius: 70,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    textContainer: {
        alignItems: 'center',
    },
    title: {
        fontFamily: fonts.extraBold,
        fontSize: 32,
        color: colors.white,
        marginBottom: 16,
        textAlign: 'center',
        letterSpacing: -1,
    },
    description: {
        fontFamily: fonts.medium,
        fontSize: 16,
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
        lineHeight: 24,
    },
    footer: {
        flex: 1,
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingBottom: 50,
        width: '100%',
    },
    dot: {
        height: 10,
        borderRadius: 5,
        backgroundColor: '#FFF',
        marginHorizontal: 8,
    },
    buttonContainer: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    skipButton: {
        padding: 10,
    },
    skipText: {
        color: 'rgba(255,255,255,0.6)',
        fontFamily: fonts.semiBold,
        fontSize: 16,
    },
    nextButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#3B82F6',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    startButton: {
        width: 180,
        borderRadius: 16,
    },
    nextButtonText: {
        color: '#FFF',
        fontFamily: fonts.bold,
        fontSize: 16,
        paddingHorizontal: 20, // If width changes
    }
});
