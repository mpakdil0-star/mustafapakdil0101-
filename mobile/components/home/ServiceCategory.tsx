import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';

interface ServiceCategoryProps {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
    color?: string;
}

export const ServiceCategory = ({ icon, label, onPress, color = colors.primary }: ServiceCategoryProps) => {
    return (
        <TouchableOpacity style={styles.container} onPress={onPress}>
            <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
                <Ionicons name={icon} size={28} color={color} />
            </View>
            <Text style={styles.label} numberOfLines={2}>{label}</Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        width: 80,
        marginRight: spacing.md,
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: spacing.radius.lg,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    label: {
        fontFamily: fonts.medium,
        fontSize: 12,
        color: colors.text,
        textAlign: 'center',
        lineHeight: 16,
    },
});
