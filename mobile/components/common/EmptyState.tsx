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
    const isLight = colors.background === '#FFFFFF' || colors.background === '#F8FAFC';

    return (
        <View style={[styles.container, style]}>
            <Card 
                variant="default" 
                style={[
                    styles.card,
                    { 
                        shadowColor: isElectrician ? '#000000' : colors.primary,
                        backgroundColor: isLight ? '#F0FDFA' : colors.surface,
                    }
                ]}
            >
                <View style={[styles.iconCircle, { backgroundColor: colors.primary + '12' }]}>
                    <Ionicons name={icon} size={36} color={colors.primary} />
                    <View style={[styles.iconGlow, { backgroundColor: colors.primary + '18' }]} />
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
        borderRadius: 28,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.06,
        shadowRadius: 20,
        elevation: 4,
    },
    iconCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        position: 'relative',
    },
    iconGlow: {
        position: 'absolute',
        width: 90,
        height: 90,
        borderRadius: 45,
        zIndex: -1,
        opacity: 0.4,
    },
    title: {
        fontFamily: fonts.bold,
        fontSize: 18,
        textAlign: 'center',
        marginBottom: 10,
        letterSpacing: -0.4,
    },
    description: {
        fontFamily: fonts.medium,
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    button: {
        minWidth: 160,
    },
});
