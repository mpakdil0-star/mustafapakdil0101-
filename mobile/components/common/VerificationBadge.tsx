import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/typography';
import { LinearGradient } from 'expo-linear-gradient';

interface VerificationBadgeProps {
    status?: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
    licenseVerified?: boolean;
    size?: 'small' | 'medium' | 'large';
    showLabel?: boolean;
}

export function VerificationBadge({
    status,
    licenseVerified = false,
    size = 'medium',
    showLabel = false
}: VerificationBadgeProps) {
    const shimAnim = useRef(new Animated.Value(-1)).current;

    useEffect(() => {
        const startShimmer = () => {
            shimAnim.setValue(-1);
            Animated.timing(shimAnim, {
                toValue: 1,
                duration: 2500,
                easing: Easing.linear,
                useNativeDriver: true,
            }).start(() => startShimmer());
        };
        startShimmer();
    }, []);

    // Only show badge for APPROVED + licenseVerified
    if (status !== 'APPROVED' || !licenseVerified) {
        return null;
    }

    const iconSizeMap = {
        small: 14,
        medium: 16,
        large: 20,
    };

    const iconSize = iconSizeMap[size];
    const labelStyle = [
        styles.label,
        size === 'small' && styles.labelSmall,
        size === 'large' && styles.labelLarge,
    ];

    const translateX = shimAnim.interpolate({
        inputRange: [-1, 1],
        outputRange: [-40, 40],
    });

    const containerStyle = [
        styles.container,
        size === 'small' && styles.containerSmall,
        size === 'large' && styles.containerLarge,
    ];

    return (
        <View style={containerStyle}>
            <LinearGradient
                colors={['#FFD700', '#DAA520', '#FFD700']} // Gold palette
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                    styles.badgeBg,
                    size === 'small' && { minWidth: 20, minHeight: 20, borderRadius: 10 },
                    size === 'large' && { minWidth: 32, minHeight: 32, borderRadius: 16 }
                ]}
            >
                <Animated.View style={[
                    styles.shimmer,
                    { transform: [{ translateX }] }
                ]}>
                    <LinearGradient
                        colors={['transparent', 'rgba(255, 255, 255, 0.4)', 'transparent']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFill}
                    />
                </Animated.View>
                <Ionicons name="shield-checkmark" size={iconSize} color={colors.white} />
            </LinearGradient>
            {showLabel && (
                <Text style={labelStyle}>Onaylı</Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    badgeBg: {
        padding: 2,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        minWidth: 24,
        minHeight: 24,
    },
    shimmer: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 40,
        zIndex: 1,
    },
    containerSmall: {
        gap: 4,
    },
    containerLarge: {
        gap: 8,
    },
    label: {
        fontFamily: fonts.bold,
        fontSize: 12,
        color: '#DAA520', // Darker gold for text
    },
    labelSmall: {
        fontSize: 10,
    },
    labelLarge: {
        fontSize: 14,
    },
});
