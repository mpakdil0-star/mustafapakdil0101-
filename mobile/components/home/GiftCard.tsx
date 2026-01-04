import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors } from '../../constants/colors';
import { fonts } from '../../constants/typography';

const { width } = Dimensions.get('window');

interface GiftCardProps {
    onPress: () => void;
}

export const GiftCard: React.FC<GiftCardProps> = ({ onPress }) => {
    // Shimmer animation
    const shimmerAnim = useRef(new Animated.Value(-1)).current;

    useEffect(() => {
        const runShimmer = () => {
            shimmerAnim.setValue(-1);
            Animated.timing(shimmerAnim, {
                toValue: 2,
                duration: 2000,
                // useNativeDriver: true, // Native driver not supported for some properties in this specific shimmer implementation if complex
                useNativeDriver: false
            }).start(() => {
                setTimeout(runShimmer, 3000);
            });
        };
        runShimmer();
    }, []);

    const shimmerTranslate = shimmerAnim.interpolate({
        inputRange: [-1, 2],
        outputRange: [-width, width * 2]
    });

    return (
        <TouchableOpacity
            style={styles.container}
            activeOpacity={0.9}
            onPress={onPress}
        >
            <LinearGradient
                colors={['#4F46E5', '#7C3AED']} // Indigo to Violet
                start={{ x: 0, y: 0 }}
                end={{ x: 0.9, y: 0.6 }}
                style={styles.gradient}
            >
                {/* Glass Effect Overlay */}
                <View style={styles.glassOverlay} />

                {/* Decorative Circles */}
                <View style={styles.circle1} />
                <View style={styles.circle2} />

                {/* Shimmer Effect */}
                <Animated.View
                    style={[
                        styles.shimmer,
                        { transform: [{ translateX: shimmerTranslate }, { rotate: '20deg' }] }
                    ]}
                >
                    <LinearGradient
                        colors={['transparent', 'rgba(255,255,255,0.4)', 'transparent']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFill}
                    />
                </Animated.View>

                {/* Content */}
                <View style={styles.content}>
                    <View style={styles.leftSide}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="gift" size={28} color="#FFD700" />
                        </View>
                        <View style={styles.textContainer}>
                            <Text style={styles.title}>Arkadaşını Davet Et</Text>
                            <Text style={styles.subtitle}>500 ₺ İndirim Kazan!</Text>
                        </View>
                    </View>
                    <View style={styles.rightSide}>
                        <View style={styles.arrowCircle}>
                            <Ionicons name="chevron-forward" size={20} color="#7C3AED" />
                        </View>
                    </View>
                </View>
            </LinearGradient>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        height: 80, // Slightly taller for premium feel
        borderRadius: 20,
        marginVertical: 12,
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 8,
    },
    gradient: {
        flex: 1,
        borderRadius: 20,
        overflow: 'hidden',
        position: 'relative',
        justifyContent: 'center',
    },
    glassOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 20,
    },
    circle1: {
        position: 'absolute',
        top: -30,
        right: -20,
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    circle2: {
        position: 'absolute',
        bottom: -40,
        left: 20,
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    shimmer: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        width: 60,
        zIndex: 10,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        zIndex: 20,
    },
    leftSide: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    textContainer: {
        justifyContent: 'center',
    },
    title: {
        color: 'rgba(255, 255, 255, 0.95)',
        fontSize: 13,
        fontFamily: fonts.medium,
        marginBottom: 2,
    },
    subtitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: fonts.extraBold,
        textShadowColor: 'rgba(0, 0, 0, 0.15)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
        letterSpacing: -0.5,
    },
    rightSide: {
        justifyContent: 'center',
    },
    arrowCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
});
