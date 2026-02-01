import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/typography';

interface ReportButtonProps {
    userId: string;
    userName?: string;
    jobId?: string;
    variant?: 'icon' | 'text' | 'full';
    style?: ViewStyle;
}

export const ReportButton: React.FC<ReportButtonProps> = ({
    userId,
    userName,
    jobId,
    variant = 'icon',
    style
}) => {
    const router = useRouter();

    const handlePress = () => {
        router.push({
            pathname: '/profile/report',
            params: { userId, userName, jobId }
        });
    };

    if (variant === 'icon') {
        return (
            <TouchableOpacity
                style={[styles.iconButton, style]}
                onPress={handlePress}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <Ionicons name="flag-outline" size={20} color={colors.textLight} />
            </TouchableOpacity>
        );
    }

    if (variant === 'text') {
        return (
            <TouchableOpacity style={[styles.textButton, style]} onPress={handlePress}>
                <Ionicons name="flag-outline" size={16} color={colors.error} />
                <Text style={styles.textButtonLabel}>Şikayet Et</Text>
            </TouchableOpacity>
        );
    }

    // Full variant
    return (
        <TouchableOpacity style={[styles.fullButton, style]} onPress={handlePress}>
            <Ionicons name="flag-outline" size={20} color={colors.error} />
            <Text style={styles.fullButtonLabel}>Kullanıcıyı Şikayet Et</Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    iconButton: {
        padding: 8
    },
    textButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    textButtonLabel: {
        fontFamily: fonts.medium,
        fontSize: 14,
        color: colors.error
    },
    fullButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14,
        borderRadius: 12,
        backgroundColor: colors.error + '10',
        borderWidth: 1,
        borderColor: colors.error + '30',
        gap: 8
    },
    fullButtonLabel: {
        fontFamily: fonts.bold,
        fontSize: 15,
        color: colors.error
    }
});
