import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';
import { useAppColors } from '../../hooks/useAppColors';
import { useAppSelector } from '../../hooks/redux';
import { getFileUrl } from '../../constants/api';

interface FeaturedElectricianProps {
    name: string;
    rating: number;
    reviewCount: number;
    specialty: string;
    location: string; // Real location from data
    isVerified?: boolean;
    imageUrl?: string;
    onPress: () => void;
    onBook: () => void;
}

export const FeaturedElectrician = ({
    name,
    rating,
    reviewCount,
    specialty,
    location,
    isVerified,
    imageUrl,
    onPress,
}: FeaturedElectricianProps) => {
    const colors = useAppColors();
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.98,
            useNativeDriver: true,
            speed: 50,
            bounciness: 4,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            speed: 50,
            bounciness: 4,
        }).start();
    };

    const renderStars = (rating: number) => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            stars.push(
                <Ionicons
                    key={i}
                    name={i <= Math.floor(rating) ? "star" : (i - rating < 1 ? "star-half" : "star-outline")}
                    size={14}
                    color="#FBBF24"
                />
            );
        }
        return stars;
    };

    return (
        <Animated.View style={[
            styles.container,
            { transform: [{ scale: scaleAnim }] }
        ]}>
            <TouchableOpacity
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={0.9}
                style={styles.touchable}
            >
                {/* Profile Image - Left Side */}
                <View style={styles.avatarContainer}>
                    {imageUrl ? (
                        <Image source={{ uri: getFileUrl(imageUrl) || '' }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primaryLight + '20' }]}>
                            <Ionicons name="person" size={28} color={colors.primary} />
                        </View>
                    )}
                    {isVerified && (
                        <View style={styles.verifiedBadge}>
                            <Ionicons name="checkmark" size={8} color={staticColors.white} />
                        </View>
                    )}
                </View>

                {/* Content - Right Side */}
                <View style={styles.infoContent}>
                    <Text style={styles.name} numberOfLines={1}>{name}</Text>

                    <View style={styles.ratingRow}>
                        <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
                        <View style={styles.starsContainer}>
                            {renderStars(rating)}
                        </View>
                    </View>

                    <View style={styles.reviewRow}>
                        <Text style={styles.reviewText}>{rating.toFixed(1)} ({reviewCount} yorum)</Text>
                        <View style={styles.locationContainer}>
                            <Ionicons name="location" size={14} color="#10B981" />
                            <Text style={styles.locationText}>{location}</Text>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        backgroundColor: staticColors.white,
        borderRadius: 20,
        padding: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 3,
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.03)',
    },
    touchable: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        width: 70,
        height: 70,
        borderRadius: 35,
        position: 'relative',
        marginRight: 16,
    },
    avatar: {
        width: '100%',
        height: '100%',
        borderRadius: 35,
    },
    avatarPlaceholder: {
        width: '100%',
        height: '100%',
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
    },
    verifiedBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#10B981',
        borderWidth: 1.5,
        borderColor: staticColors.white,
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoContent: {
        flex: 1,
    },
    name: {
        fontFamily: fonts.bold,
        fontSize: 17,
        color: staticColors.black,
        marginBottom: 4,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    ratingText: {
        fontFamily: fonts.bold,
        fontSize: 15,
        color: staticColors.black,
        marginRight: 6,
    },
    starsContainer: {
        flexDirection: 'row',
        gap: 2,
    },
    reviewRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
    },
    reviewText: {
        fontFamily: fonts.medium,
        fontSize: 12,
        color: '#94A3B8',
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    locationText: {
        fontFamily: fonts.medium,
        fontSize: 12,
        color: '#94A3B8',
    },
});
