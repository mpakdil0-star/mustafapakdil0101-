import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';
import { useAppColors } from '../../hooks/useAppColors';

type BadgeVariant = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'info' | 'warning';

interface StatusBadgeProps {
    variant: BadgeVariant;
    label?: string;
    size?: 'small' | 'medium';
    style?: ViewStyle;
    showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
    variant,
    label,
    size = 'medium',
    style,
    showIcon = true,
}) => {
    const colors = useAppColors();

    const getBadgeConfig = (badgeVariant: BadgeVariant) => {
        const isLight = colors.background === '#FFFFFF' || colors.background === '#F8FAFC';
        switch (badgeVariant) {
            case 'pending':
                return {
                    backgroundColor: isLight ? 'rgba(245, 158, 11, 0.08)' : 'rgba(245, 158, 11, 0.16)',
                    textColor: isLight ? '#B45309' : '#FCD34D',
                    icon: 'time-outline' as keyof typeof Ionicons.glyphMap,
                    defaultLabel: 'Beklemede',
                };
            case 'in_progress':
                return {
                    backgroundColor: isLight ? 'rgba(13, 148, 136, 0.08)' : 'rgba(249, 115, 22, 0.16)',
                    textColor: colors.primary,
                    icon: 'construct-outline' as keyof typeof Ionicons.glyphMap,
                    defaultLabel: 'Devam Ediyor',
                };
            case 'completed':
                return {
                    backgroundColor: isLight ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.16)',
                    textColor: isLight ? '#047857' : '#34D399',
                    icon: 'checkmark-circle-outline' as keyof typeof Ionicons.glyphMap,
                    defaultLabel: 'Tamamlandı',
                };
            case 'cancelled':
                return {
                    backgroundColor: isLight ? 'rgba(244, 63, 94, 0.08)' : 'rgba(244, 63, 94, 0.16)',
                    textColor: isLight ? '#BE123C' : '#FB7185',
                    icon: 'close-circle-outline' as keyof typeof Ionicons.glyphMap,
                    defaultLabel: 'İptal Edildi',
                };
            case 'info':
                return {
                    backgroundColor: isLight ? 'rgba(14, 165, 233, 0.08)' : 'rgba(14, 165, 233, 0.16)',
                    textColor: colors.secondary,
                    icon: 'information-circle-outline' as keyof typeof Ionicons.glyphMap,
                    defaultLabel: 'Bilgi',
                };
            case 'warning':
                return {
                    backgroundColor: isLight ? 'rgba(245, 158, 11, 0.08)' : 'rgba(245, 158, 11, 0.16)',
                    textColor: isLight ? '#D97706' : '#FBBF24',
                    icon: 'warning-outline' as keyof typeof Ionicons.glyphMap,
                    defaultLabel: 'Uyarı',
                };
        }
    };

    const config = getBadgeConfig(variant);
    const displayLabel = label || config.defaultLabel;

    return (
        <View
            style={[
                styles.container,
                size === 'small' && styles.containerSmall,
                { backgroundColor: config.backgroundColor },
                style,
            ]}
        >
            {showIcon && (
                <Ionicons
                    name={config.icon}
                    size={size === 'small' ? 11 : 13}
                    color={config.textColor}
                    style={styles.icon}
                />
            )}
            <Text
                style={[
                    styles.text,
                    size === 'small' && styles.textSmall,
                    { color: config.textColor },
                ]}
            >
                {displayLabel}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: spacing.radius.sm, // Pill tag style
        alignSelf: 'flex-start',
    },
    containerSmall: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: spacing.radius.xs,
    },
    icon: {
        marginRight: 4,
    },
    text: {
        fontFamily: fonts.semiBold,
        fontSize: 11,
    },
    textSmall: {
        fontSize: 9,
    },
});
