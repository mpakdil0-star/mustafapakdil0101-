import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';
import { useAppColors } from '../../hooks/useAppColors';
import { getFileUrl } from '../../constants/api';
import { Card } from '../common/Card';

interface FeaturedElectricianProps {
    name: string;
    rating: number;
    reviewCount: number;
    specialty: string;
    location: string;
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
    onBook,
}: FeaturedElectricianProps) => {
    const colors = useAppColors();

    const renderStars = (rating: number) => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            stars.push(
                <Ionicons
                    key={i}
                    name={i <= Math.floor(rating) ? "star" : (i - rating < 1 ? "star-half" : "star-outline")}
                    size={12}
                    color="#FBBF24"
                />
            );
        }
        return stars;
    };

    return (
        <Card
            onPress={onPress}
            variant="default"
            padding={10}
            style={{ width: '100%', marginBottom: 10 }}
        >
            <View style={styles.touchable}>
                {/* Profile Image - Left Side */}
                <View style={styles.avatarContainer}>
                    {imageUrl ? (
                        <Image source={{ uri: getFileUrl(imageUrl) || '' }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary + '12' }]}>
                            <Ionicons name="person" size={26} color={colors.primary} />
                        </View>
                    )}
                    {isVerified && (
                        <View style={[styles.verifiedBadge, { borderColor: colors.surface }]}>
                            <Ionicons name="checkmark" size={8} color={staticColors.white} />
                        </View>
                    )}
                </View>

                {/* Content - Right Side */}
                <View style={styles.infoContent}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                        <Text style={[styles.name, { color: colors.text, flex: 1, marginBottom: 0, marginRight: 8 }]} numberOfLines={1}>{name}</Text>
                        {specialty && (
                            <View style={[styles.specialtyBadge, { backgroundColor: colors.primary + '12' }]}>
                                <Text style={[styles.specialtyText, { color: colors.primary }]}>{specialty}</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.ratingRow}>
                        <Text style={[styles.ratingText, { color: colors.text }]}>{Number(rating || 0).toFixed(1)}</Text>
                        <View style={styles.starsContainer}>
                            {renderStars(Number(rating || 0))}
                        </View>
                    </View>

                    <View style={styles.reviewRow}>
                        <Text style={[styles.reviewText, { color: colors.textSecondary }]}>{reviewCount || 0} değerlendirme</Text>
                        <View style={styles.locationContainer}>
                            <Ionicons name="location" size={14} color="#10B981" />
                            <Text style={[styles.locationText, { color: colors.textSecondary }]}>{location}</Text>
                        </View>
                    </View>
                </View>
            </View>
        </Card>
    );
};

const styles = StyleSheet.create({
    touchable: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        position: 'relative',
        marginRight: 12,
    },
    avatar: {
        width: '100%',
        height: '100%',
        borderRadius: 25,
    },
    avatarPlaceholder: {
        width: '100%',
        height: '100%',
        borderRadius: 25,
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
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoContent: {
        flex: 1,
    },
    name: {
        fontFamily: fonts.bold,
        fontSize: 16,
        marginBottom: 2,
    },
    specialtyBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    specialtyText: {
        fontFamily: fonts.bold,
        fontSize: 10,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    ratingText: {
        fontFamily: fonts.bold,
        fontSize: 14,
        color: staticColors.black,
        marginRight: 4,
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
        fontFamily: fonts.semiBold, // Increased weight for readability
        fontSize: 12,
        color: '#94A3B8',
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    locationText: {
        fontFamily: fonts.semiBold, // Increased weight for readability
        fontSize: 12,
        color: '#94A3B8',
    },
});
