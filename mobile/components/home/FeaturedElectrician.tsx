import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';

interface FeaturedElectricianProps {
    name: string;
    rating: number;
    reviewCount: number;
    specialty: string;
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
    isVerified,
    onPress,
    onBook,
}: FeaturedElectricianProps) => {
    return (
        <Card style={styles.container} onPress={onPress} elevated>
            <View style={styles.header}>
                <View style={styles.avatarContainer}>
                    <Ionicons name="person" size={24} color={colors.textSecondary} />
                </View>
                <View style={styles.infoContainer}>
                    <View style={styles.nameRow}>
                        <Text style={styles.name}>{name}</Text>
                        {isVerified && (
                            <Ionicons name="checkmark-circle" size={16} color={colors.primary} style={styles.verifiedIcon} />
                        )}
                    </View>
                    <Text style={styles.specialty}>{specialty}</Text>
                    <View style={styles.ratingContainer}>
                        <Ionicons name="star" size={14} color={colors.warning} />
                        <Text style={styles.rating}>{rating}</Text>
                        <Text style={styles.reviewCount}>({reviewCount})</Text>
                    </View>
                </View>
            </View>

            <Button
                title="Hemen Teklif Al"
                onPress={onBook}
                variant="outline"
                size="small"
                style={styles.button}
            />
        </Card>
    );
};

const styles = StyleSheet.create({
    container: {
        width: 200,
        marginRight: spacing.md,
        padding: spacing.md,
    },
    header: {
        flexDirection: 'row',
        marginBottom: spacing.md,
    },
    avatarContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.sm,
    },
    infoContainer: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    name: {
        fontFamily: fonts.semiBold,
        fontSize: 14,
        color: colors.text,
        marginRight: 4,
    },
    verifiedIcon: {
        marginLeft: 2,
    },
    specialty: {
        fontFamily: fonts.regular,
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 2,
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rating: {
        fontFamily: fonts.semiBold,
        fontSize: 12,
        color: colors.text,
        marginLeft: 4,
        marginRight: 2,
    },
    reviewCount: {
        fontFamily: fonts.regular,
        fontSize: 12,
        color: colors.textSecondary,
    },
    button: {
        marginTop: 'auto',
    },
});
