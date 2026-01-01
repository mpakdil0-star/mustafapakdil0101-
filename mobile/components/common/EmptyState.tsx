import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';
import { useAppColors } from '../../hooks/useAppColors';
import { useAppSelector } from '../../hooks/redux';
import { Card } from './Card';
import { Button } from './Button';

interface EmptyStateProps {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    description: string;
    buttonTitle?: string;
    onButtonPress?: () => void;
    style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon,
    title,
    description,
    buttonTitle,
    onButtonPress,
    style,
}) => {
    const colors = useAppColors();
    const { user, guestRole } = useAppSelector((state) => state.auth);
    const isElectrician = user?.userType === 'ELECTRICIAN' || guestRole === 'ELECTRICIAN';

    return (
        <View style={[styles.container, style]}>
            <Card variant="default" style={[
                styles.card,
                !isElectrician && {
                    shadowColor: (colors as any).shadowAmethyst || colors.primary,
                    backgroundColor: (colors as any).backgroundAmethyst || colors.backgroundLight
                }
            ]}>
                <View style={[styles.iconCircle, { backgroundColor: colors.primary + '10' }]}>
                    <Ionicons name={icon} size={40} color={colors.primary} />
                    <View style={[styles.iconGlow, { backgroundColor: colors.primary + '20' }]} />
                </View>
                <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>
                {buttonTitle && onButtonPress && (
                    <Button
                        title={buttonTitle}
                        onPress={onButtonPress}
                        variant="primary"
                        style={styles.button}
                    />
                )}
            </Card>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    card: {
        width: '100%',
        alignItems: 'center',
        padding: 32,
        borderRadius: 32,
        backgroundColor: staticColors.white,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.8)',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.05,
        shadowRadius: 16,
        elevation: 4,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        position: 'relative',
    },
    iconGlow: {
        position: 'absolute',
        width: 100,
        height: 100,
        borderRadius: 50,
        zIndex: -1,
        opacity: 0.5,
    },
    title: {
        fontFamily: fonts.bold,
        fontSize: 20,
        textAlign: 'center',
        marginBottom: 12,
    },
    description: {
        fontFamily: fonts.medium,
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    button: {
        minWidth: 180,
        height: 52,
        borderRadius: 16,
    },
});
