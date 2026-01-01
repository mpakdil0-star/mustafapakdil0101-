import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';

type SkeletonVariant = 'text' | 'title' | 'avatar' | 'card' | 'button' | 'image';

interface SkeletonLoaderProps {
    variant?: SkeletonVariant;
    width?: number | string;
    height?: number;
    borderRadius?: number;
    style?: ViewStyle;
}

const VARIANT_STYLES: Record<SkeletonVariant, { width: number | string; height: number; borderRadius: number }> = {
    text: { width: '100%', height: 14, borderRadius: 4 },
    title: { width: '60%', height: 20, borderRadius: 4 },
    avatar: { width: 48, height: 48, borderRadius: 24 },
    card: { width: '100%', height: 120, borderRadius: spacing.radius.lg },
    button: { width: '100%', height: 50, borderRadius: spacing.radius.md },
    image: { width: '100%', height: 200, borderRadius: spacing.radius.md },
};

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
    variant = 'text',
    width,
    height,
    borderRadius,
    style,
}) => {
    const shimmerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(shimmerAnim, {
                    toValue: 0,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, [shimmerAnim]);

    const variantStyle = VARIANT_STYLES[variant];
    const opacity = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7],
    });

    return (
        <Animated.View
            style={[
                styles.skeleton,
                {
                    width: width ?? variantStyle.width,
                    height: height ?? variantStyle.height,
                    borderRadius: borderRadius ?? variantStyle.borderRadius,
                    opacity,
                },
                style,
            ]}
        />
    );
};

// Predefined skeleton layouts
export const SkeletonCard: React.FC<{ style?: ViewStyle }> = ({ style }) => (
    <View style={[styles.cardContainer, style]}>
        <View style={styles.cardHeader}>
            <SkeletonLoader variant="avatar" />
            <View style={styles.cardHeaderText}>
                <SkeletonLoader variant="title" width="80%" />
                <SkeletonLoader variant="text" width="50%" style={{ marginTop: 8 }} />
            </View>
        </View>
        <SkeletonLoader variant="text" style={{ marginTop: 16 }} />
        <SkeletonLoader variant="text" width="90%" style={{ marginTop: 8 }} />
        <SkeletonLoader variant="text" width="70%" style={{ marginTop: 8 }} />
    </View>
);

export const SkeletonListItem: React.FC<{ style?: ViewStyle }> = ({ style }) => (
    <View style={[styles.listItem, style]}>
        <SkeletonLoader variant="avatar" width={40} height={40} borderRadius={20} />
        <View style={styles.listItemContent}>
            <SkeletonLoader variant="title" width="70%" />
            <SkeletonLoader variant="text" width="50%" style={{ marginTop: 6 }} />
        </View>
    </View>
);

const styles = StyleSheet.create({
    skeleton: {
        backgroundColor: colors.backgroundDark,
    },
    cardContainer: {
        backgroundColor: colors.surface,
        borderRadius: spacing.radius.lg,
        padding: spacing.cardPadding,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardHeaderText: {
        flex: 1,
        marginLeft: 12,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    listItemContent: {
        flex: 1,
        marginLeft: 12,
    },
});
