import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, Platform, ImageBackground, ImageSourcePropType } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';
import { useRouter, useSegments } from 'expo-router';
import { useAppSelector } from '../../hooks/redux';
import { useAppColors } from '../../hooks/useAppColors';

interface PremiumHeaderProps {
    title: string;
    subtitle?: string;
    showBackButton?: boolean;
    onBackPress?: () => void;
    rightElement?: React.ReactNode;
    variant?: 'primary' | 'emergency' | 'transparent';
    style?: ViewStyle;
    backgroundImage?: ImageSourcePropType;
    layout?: 'default' | 'tab';
}

export const PremiumHeader: React.FC<PremiumHeaderProps> = ({
    title,
    subtitle,
    showBackButton = false,
    onBackPress,
    rightElement,
    variant = 'primary',
    style,
    backgroundImage,
    layout = 'default',
}) => {
    const colors = useAppColors();
    const router = useRouter();
    const segments = useSegments() as string[];

    const { isAuthenticated, guestRole } = useAppSelector((state) => state.auth);
    const shouldShowBackButton = showBackButton || (!isAuthenticated && !!guestRole);

    const handleBack = () => {
        if (onBackPress) {
            onBackPress();
            return;
        }

        const rootDomain = segments[0];
        const isDetailView = segments.length > 2 || (segments.length === 2 && segments[0] !== '(tabs)');
        const isTabRoot = segments[0] === '(tabs)' && segments.length === 2;

        // Misafir modunda ve ana tab ekranındaysak hoşgeldin ekranına dön
        if (!isAuthenticated && guestRole && isTabRoot) {
            router.replace('/(auth)/welcome');
            return;
        }

        // Akıllı Rota Analizi - Detay sayfalarından geri dönüş
        if (isDetailView) {
            // İlan oluşturma ekranlarından her zaman ana sayfaya dön
            if (segments[1] === 'create' || segments[1] === 'quick-create') {
                router.replace('/(tabs)');
                return;
            }

            if (rootDomain === 'jobs') {
                router.replace('/(tabs)/jobs');
                return;
            } else if (rootDomain === 'messages') {
                router.replace('/(tabs)/messages');
                return;
            } else if (rootDomain === 'profile') {
                router.replace('/(tabs)/profile');
                return;
            }
        }

        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/(tabs)');
        }
    };

    const { user } = useAppSelector((state) => state.auth);
    const isElectrician = user?.userType === 'ELECTRICIAN';

    const gradientColors = variant === 'emergency'
        ? (colors.gradientEmergency as [string, string, ...string[]])
        : variant === 'transparent'
            ? (['transparent', 'transparent'] as [string, string, ...string[]])
            : isElectrician
                ? ([colors.primary, colors.primary] as [string, string, ...string[]])
                : ((colors as any).gradientHeaderAmethyst || [colors.primary + '88', colors.primaryLight + 'DD']) as [string, string, ...string[]];

    const isTransparent = variant === 'transparent';
    const headerTextColor = isTransparent ? colors.text : staticColors.white;
    const headerSubtitleColor = isTransparent ? colors.textSecondary : 'rgba(255, 255, 255, 0.8)';
    const iconColor = isTransparent ? colors.primary : staticColors.white;

    return (
        <View style={[
            styles.container,
            { backgroundColor: colors.primary, shadowColor: isElectrician ? colors.primary : (colors as any).shadowAmethyst || colors.primary },
            variant === 'transparent' && { backgroundColor: 'transparent', elevation: 0, shadowOpacity: 0 },
            style
        ]}>
            <ImageBackground
                source={backgroundImage}
                style={styles.headerImageBg}
                imageStyle={styles.headerImage}
            >
                <LinearGradient
                    colors={gradientColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.headerGradient}
                >
                    {/* Decorative Elements - Hidden if transparent for cleaner look over light themes */}
                    {!isTransparent && (
                        <>
                            <View style={[styles.headerDecorativeCircle1, !isElectrician && { backgroundColor: (colors as any).glowAmethystSoft || 'rgba(167, 139, 250, 0.15)' }]} />
                            <View style={[styles.headerDecorativeCircle2, !isElectrician && { backgroundColor: (colors as any).glassPurple || 'rgba(139, 92, 246, 0.15)' }]} />
                            <View style={[styles.headerDecorativeCircle3, !isElectrician && { backgroundColor: (colors as any).glowAmethyst || 'rgba(139, 92, 246, 0.3)' }]} />
                        </>
                    )}

                    <View style={styles.headerTop}>
                        {layout === 'default' ? (
                            <>
                                <View style={styles.leftContainer}>
                                    {shouldShowBackButton && (
                                        <TouchableOpacity
                                            style={[styles.backButton, isTransparent && { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}
                                            onPress={handleBack}
                                            activeOpacity={0.7}
                                        >
                                            <Ionicons name="chevron-back" size={24} color={iconColor} />
                                        </TouchableOpacity>
                                    )}
                                </View>

                                <View style={styles.titleContainer}>
                                    <Text style={[styles.headerTitle, { color: headerTextColor }]}>{title}</Text>
                                    {subtitle && <Text style={[styles.headerSubtitle, { color: headerSubtitleColor }]}>{subtitle}</Text>}
                                </View>

                                <View style={styles.rightContainer}>
                                    {rightElement || <View style={{ width: 40 }} />}
                                </View>
                            </>
                        ) : (
                            <View style={styles.tabHeaderContent}>
                                {shouldShowBackButton && (
                                    <TouchableOpacity
                                        style={[styles.backButton, { marginRight: 15 }, isTransparent && { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}
                                        onPress={handleBack}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="chevron-back" size={24} color={iconColor} />
                                    </TouchableOpacity>
                                )}
                                <View style={styles.tabTextContainer}>
                                    {subtitle && <Text style={[styles.tabSubtitle, { color: headerSubtitleColor }]}>{subtitle}</Text>}
                                    <Text style={[styles.tabTitle, { color: headerTextColor }]}>{title}</Text>
                                </View>
                                <View style={styles.tabRightContainer}>
                                    {rightElement}
                                </View>
                            </View>
                        )}
                    </View>
                </LinearGradient>
            </ImageBackground>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        overflow: 'hidden',
        elevation: 10,
    },
    headerImageBg: {
        width: '100%',
    },
    headerImage: {
        opacity: 0.45,
    },
    headerGradient: {
        paddingTop: Platform.OS === 'ios' ? 60 : 50,
        paddingBottom: 34,
        paddingHorizontal: spacing.lg,
        position: 'relative',
        overflow: 'hidden',
    },
    headerDecorativeCircle1: {
        position: 'absolute',
        top: -60,
        right: -60,
        width: 220,
        height: 220,
        borderRadius: 110,
        backgroundColor: 'rgba(255, 255, 255, 0.12)',
    },
    headerDecorativeCircle2: {
        position: 'absolute',
        top: 100,
        left: -40,
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
    },
    headerDecorativeCircle3: {
        position: 'absolute',
        top: 60,
        left: '40%',
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 1,
    },
    leftContainer: {
        minWidth: 44,
        alignItems: 'flex-start',
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    titleContainer: {
        alignItems: 'center',
        flex: 1,
    },
    headerTitle: {
        fontFamily: fonts.extraBold,
        fontSize: 19,
        color: staticColors.white,
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontFamily: fonts.medium,
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.8)',
        textAlign: 'center',
        marginTop: 2,
    },
    rightContainer: {
        minWidth: 44,
        alignItems: 'flex-end',
    },
    tabHeaderContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
    },
    tabTextContainer: {
        flex: 1,
        gap: 4,
    },
    tabSubtitle: {
        fontFamily: fonts.medium,
        fontSize: 15,
        color: 'rgba(255, 255, 255, 0.9)',
    },
    tabTitle: {
        fontFamily: fonts.extraBold,
        fontSize: 22,
        color: staticColors.white,
        letterSpacing: -0.5,
    },
    tabRightContainer: {
        marginLeft: 16,
    },
});
