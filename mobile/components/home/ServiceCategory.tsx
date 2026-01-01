import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
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
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.92,
            useNativeDriver: true,
            speed: 50,
            bounciness: 6,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            speed: 50,
            bounciness: 6,
        }).start();
    };

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
                style={styles.container}
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={0.9}
            >
                <View style={[styles.iconContainer, { backgroundColor: color + '18' }]}>
                    <View style={[styles.iconInner, { backgroundColor: color + '25' }]}>
                        <Ionicons name={icon} size={26} color={color} />
                    </View>
                </View>
                <Text style={styles.label} numberOfLines={2}>{label}</Text>
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        width: 84,
        marginRight: spacing.md,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: spacing.radius.xl,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    iconInner: {
        width: 52,
        height: 52,
        borderRadius: spacing.radius.lg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    label: {
        fontFamily: fonts.medium,
        fontSize: 12,
        color: colors.text,
        textAlign: 'center',
        lineHeight: 16,
    },
});
