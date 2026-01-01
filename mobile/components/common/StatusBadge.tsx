import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';

type BadgeVariant = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'info' | 'warning';

interface StatusBadgeProps {
    variant: BadgeVariant;
    label?: string;
    size?: 'small' | 'medium';
    style?: ViewStyle;
    showIcon?: boolean;
}

const BADGE_CONFIG: Record<BadgeVariant, {
    backgroundColor: string;
    textColor: string;
    icon: keyof typeof Ionicons.glyphMap;
    defaultLabel: string;
}> = {
    pending: {
        backgroundColor: colors.warningLight,
        textColor: '#92400E',
        icon: 'time-outline',
        defaultLabel: 'Beklemede',
    },
    in_progress: {
        backgroundColor: colors.infoLight,
        textColor: '#1E40AF',
        icon: 'construct-outline',
        defaultLabel: 'Devam Ediyor',
    },
    completed: {
        backgroundColor: colors.successLight,
        textColor: '#166534',
        icon: 'checkmark-circle-outline',
        defaultLabel: 'Tamamlandı',
    },
    cancelled: {
        backgroundColor: colors.errorLight,
        textColor: '#DC2626',
        icon: 'close-circle-outline',
        defaultLabel: 'İptal Edildi',
    },
    info: {
        backgroundColor: colors.infoLight,
        textColor: '#0369A1',
        icon: 'information-circle-outline',
        defaultLabel: 'Bilgi',
    },
    warning: {
        backgroundColor: colors.warningLight,
        textColor: '#D97706',
        icon: 'warning-outline',
        defaultLabel: 'Uyarı',
    },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
    variant,
    label,
    size = 'medium',
    style,
    showIcon = true,
}) => {
    const config = BADGE_CONFIG[variant];
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
                    size={size === 'small' ? 12 : 14}
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
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: spacing.radius.round,
        alignSelf: 'flex-start',
    },
    containerSmall: {
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    icon: {
        marginRight: 4,
    },
    text: {
        fontFamily: fonts.semiBold,
        fontSize: 12,
    },
    textSmall: {
        fontSize: 10,
    },
});
