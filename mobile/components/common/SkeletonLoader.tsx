import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ViewStyle } from 'react-native';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';
import { useAppColors } from '../../hooks/useAppColors';

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
    const colors = useAppColors();
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
        outputRange: [0.35, 0.65],
    });

    return (
        <Animated.View
            style={[
                styles.skeleton,
                {
                    backgroundColor: colors.skeleton,
                    width: (width ?? variantStyle.width) as any,
                    height: height ?? variantStyle.height,
                    borderRadius: borderRadius ?? variantStyle.borderRadius,
                    opacity: opacity as any,
                },
                style,
            ]}
        />
    );
};

// Predefined skeleton layouts
export const SkeletonCard: React.FC<{ style?: ViewStyle }> = ({ style }) => {
    const colors = useAppColors();
    return (
        <View style={[styles.cardContainer, { backgroundColor: colors.surface }, style]}>
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
};

export const SkeletonListItem: React.FC<{ style?: ViewStyle }> = ({ style }) => (
    <View style={[styles.listItem, style]}>
        <SkeletonLoader variant="avatar" width={40} height={40} borderRadius={20} />
        <View style={styles.listItemContent}>
            <SkeletonLoader variant="title" width="70%" />
            <SkeletonLoader variant="text" width="50%" style={{ marginTop: 6 }} />
        </View>
    </View>
);

export const SkeletonChat: React.FC<{ style?: ViewStyle }> = ({ style }) => {
    const colors = useAppColors();
    return (
        <View style={[styles.chatSkeletonContainer, style]}>
            {/* Centered Pill: Mesajlar yükleniyor... */}
            <View style={[styles.chatPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.chatPillDot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.chatPillText, { color: colors.textSecondary }]}>Mesajlar yükleniyor...</Text>
            </View>

            {/* Bubble 1: Other User (Left) */}
            <View style={styles.chatLeftRow}>
                <SkeletonLoader variant="avatar" width={32} height={32} borderRadius={16} />
                <View style={[styles.chatBubbleLeft, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <SkeletonLoader variant="text" width="85%" height={12} style={{ marginBottom: 6 }} />
                    <SkeletonLoader variant="text" width="60%" height={12} />
                </View>
            </View>

            {/* Bubble 2: My Message (Right) */}
            <View style={styles.chatRightRow}>
                <View style={[styles.chatBubbleRight, { backgroundColor: colors.primary + '18' }]}>
                    <SkeletonLoader variant="text" width="90%" height={12} style={{ marginBottom: 6 }} />
                    <SkeletonLoader variant="text" width="70%" height={12} style={{ marginBottom: 6 }} />
                    <SkeletonLoader variant="text" width="40%" height={10} style={{ alignSelf: 'flex-end' }} />
                </View>
            </View>

            {/* Bubble 3: Other User (Left) */}
            <View style={styles.chatLeftRow}>
                <SkeletonLoader variant="avatar" width={32} height={32} borderRadius={16} />
                <View style={[styles.chatBubbleLeft, { backgroundColor: colors.surface, borderColor: colors.border, width: '50%' }]}>
                    <SkeletonLoader variant="text" width="80%" height={12} />
                </View>
            </View>

            {/* Bubble 4: My Message (Right) */}
            <View style={styles.chatRightRow}>
                <View style={[styles.chatBubbleRight, { backgroundColor: colors.primary + '18', width: '65%' }]}>
                    <SkeletonLoader variant="text" width="75%" height={12} />
                </View>
            </View>

            {/* Bubble 5: Other User (Left) */}
            <View style={styles.chatLeftRow}>
                <SkeletonLoader variant="avatar" width={32} height={32} borderRadius={16} />
                <View style={[styles.chatBubbleLeft, { backgroundColor: colors.surface, borderColor: colors.border, width: '75%' }]}>
                    <SkeletonLoader variant="text" width="95%" height={12} style={{ marginBottom: 6 }} />
                    <SkeletonLoader variant="text" width="55%" height={12} />
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    skeleton: {
        // Base background is overriden by dynamic colors
    },
    cardContainer: {
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
    chatSkeletonContainer: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    chatPill: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 20,
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    chatPillDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
    },
    chatPillText: {
        fontSize: 12,
        fontFamily: fonts.medium,
    },
    chatLeftRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginBottom: 14,
        gap: 8,
    },
    chatBubbleLeft: {
        width: '68%',
        padding: 14,
        borderRadius: 18,
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 2,
        elevation: 1,
    },
    chatRightRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 14,
    },
    chatBubbleRight: {
        width: '75%',
        padding: 14,
        borderRadius: 18,
        borderBottomRightRadius: 4,
    },
});
