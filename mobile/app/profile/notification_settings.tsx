import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, Platform, ImageBackground, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { Card } from '../../components/common/Card';
import { colors as staticColors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';
import { useAppColors } from '../../hooks/useAppColors';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import api from '../../services/api';

const NOTIFICATION_PREFS_KEY = 'notification_preferences';

interface NotificationPreferences {
    pushEnabled: boolean;
    emailEnabled: boolean;
    promoEnabled: boolean;
    securityEnabled: boolean;
}

const defaultPreferences: NotificationPreferences = {
    pushEnabled: true,
    emailEnabled: true,
    promoEnabled: false,
    securityEnabled: true,
};

const NotificationItem = ({
    title,
    description,
    value,
    onValueChange,
    icon,
    colors,
    isSaving
}: {
    title: string;
    description?: string;
    value: boolean;
    onValueChange: (val: boolean) => void;
    icon: any;
    colors: any;
    isSaving?: boolean;
}) => (
    <View style={styles.itemContainer}>
        <View style={[styles.iconWrapper, { backgroundColor: value ? colors.primary + '10' : '#F1F5F9' }]}>
            <Ionicons name={icon} size={20} color={value ? colors.primary : staticColors.textLight} />
        </View>
        <View style={styles.textContainer}>
            <Text style={styles.itemTitle}>{title}</Text>
            {description && <Text style={styles.itemDescription}>{description}</Text>}
        </View>
        {isSaving ? (
            <ActivityIndicator size="small" color={colors.primary} />
        ) : (
            <Switch
                trackColor={{ false: staticColors.border, true: colors.primary + '40' }}
                thumbColor={value ? colors.primary : '#f4f3f4'}
                ios_backgroundColor={staticColors.border}
                onValueChange={onValueChange}
                value={value}
            />
        )}
    </View>
);

export default function NotificationsScreen() {
    const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
    const [isLoading, setIsLoading] = useState(true);
    const [savingKey, setSavingKey] = useState<string | null>(null);
    const colors = useAppColors();

    // Load preferences on mount
    useEffect(() => {
        loadPreferences();
    }, []);

    const loadPreferences = async () => {
        try {
            // First, try to load from SecureStore (instant)
            const stored = await SecureStore.getItemAsync(NOTIFICATION_PREFS_KEY);
            if (stored) {
                setPreferences(JSON.parse(stored));
            }

            // Then, try to sync from API
            try {
                const response = await api.get('/users/notification-preferences');
                if (response.data.success && response.data.data) {
                    const apiPrefs = response.data.data;
                    setPreferences(apiPrefs);
                    // Update local storage with server data
                    await SecureStore.setItemAsync(NOTIFICATION_PREFS_KEY, JSON.stringify(apiPrefs));
                }
            } catch (apiError) {
                console.log('Could not sync from API, using local preferences');
            }
        } catch (error) {
            console.error('Error loading preferences:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const updatePreference = useCallback(async (key: keyof NotificationPreferences, value: boolean) => {
        const newPreferences = { ...preferences, [key]: value };

        // Update state immediately for responsive UI
        setPreferences(newPreferences);
        setSavingKey(key);

        try {
            // Save to SecureStore first (instant persistence)
            await SecureStore.setItemAsync(NOTIFICATION_PREFS_KEY, JSON.stringify(newPreferences));

            // Sync to backend
            try {
                await api.put('/users/notification-preferences', newPreferences);
            } catch (apiError) {
                console.log('API sync failed, preferences saved locally');
            }
        } catch (error) {
            console.error('Error saving preference:', error);
            // Revert on error
            setPreferences(preferences);
        } finally {
            setSavingKey(null);
        }
    }, [preferences]);

    if (isLoading) {
        return (
            <View style={styles.container}>
                <PremiumHeader
                    title="Bildirim Ayarları"
                    showBackButton
                    backgroundImage={require('../../assets/images/header_bg.png')}
                />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Ayarlar yükleniyor...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <PremiumHeader
                title="Bildirim Ayarları"
                showBackButton
                backgroundImage={require('../../assets/images/header_bg.png')}
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Info Card with Glass Polish */}
                <Card variant="default" style={[styles.infoGlassCard, { shadowColor: colors.primary }]}>
                    <View style={[styles.infoIconWrapper, { backgroundColor: colors.primary + '10' }]}>
                        <Ionicons name="notifications-outline" size={24} color={colors.primary} />
                        <View style={[styles.iconGlow, { backgroundColor: colors.primary }]} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.infoTitle}>Bildirim tercihlerinizi yönetin</Text>
                        <Text style={styles.description}>
                            Hangi durumlarda bildirim alacağınızı belirleyerek uygulama deneyiminizi özelleştirin.
                        </Text>
                    </View>
                </Card>

                <Text style={styles.sectionHeading}>Genel Bildirimler</Text>
                <Card variant="default" style={[styles.menuGlassCard, { shadowColor: colors.primary }]}>
                    <NotificationItem
                        title="Anlık Bildirimler"
                        description="Uygulama içi önemli güncellemeler ve mesajlar."
                        value={preferences.pushEnabled}
                        onValueChange={(val) => updatePreference('pushEnabled', val)}
                        icon="notifications-circle-outline"
                        colors={colors}
                        isSaving={savingKey === 'pushEnabled'}
                    />
                    <View style={styles.divider} />
                    <NotificationItem
                        title="E-posta Bildirimleri"
                        description="Özet bilgiler ve faturalar e-posta adresinize gönderilsin."
                        value={preferences.emailEnabled}
                        onValueChange={(val) => updatePreference('emailEnabled', val)}
                        icon="mail-outline"
                        colors={colors}
                        isSaving={savingKey === 'emailEnabled'}
                    />
                </Card>

                <Text style={styles.sectionHeading}>Fırsatlar ve Güvenlik</Text>
                <Card variant="default" style={[styles.menuGlassCard, { shadowColor: colors.primary }]}>
                    <NotificationItem
                        title="Kampanya ve Fırsatlar"
                        description="Size özel tekliflerden haberdar olun."
                        value={preferences.promoEnabled}
                        onValueChange={(val) => updatePreference('promoEnabled', val)}
                        icon="gift-outline"
                        colors={colors}
                        isSaving={savingKey === 'promoEnabled'}
                    />
                    <View style={styles.divider} />
                    <NotificationItem
                        title="Güvenlik Uyarıları"
                        description="Hesabınızla ilgili şüpheli durumlarda anında bildirim alın."
                        value={preferences.securityEnabled}
                        onValueChange={(val) => updatePreference('securityEnabled', val)}
                        icon="shield-checkmark-outline"
                        colors={colors}
                        isSaving={savingKey === 'securityEnabled'}
                    />
                </Card>

                <View style={styles.footerNote}>
                    <Ionicons name="checkmark-circle" size={16} color={staticColors.success} />
                    <Text style={styles.footerNoteText}>
                        Ayarlarınız otomatik olarak kaydedilir ve cihazınızda saklanır.
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: spacing.md,
        paddingBottom: 40,
    },
    infoGlassCard: {
        flexDirection: 'row',
        backgroundColor: staticColors.white,
        padding: 20,
        borderRadius: 24,
        marginBottom: 24,
        gap: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.8)',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 4,
    },
    infoIconWrapper: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    iconGlow: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderRadius: 14,
        opacity: 0.1,
        transform: [{ scale: 1.5 }],
    },
    infoTitle: {
        fontFamily: fonts.extraBold,
        fontSize: 16,
        color: staticColors.text,
        marginBottom: 4,
        letterSpacing: -0.3,
    },
    description: {
        fontFamily: fonts.medium,
        fontSize: 13,
        color: staticColors.textSecondary,
        lineHeight: 18,
    },
    sectionHeading: {
        fontFamily: fonts.bold,
        fontSize: 13,
        color: staticColors.textSecondary,
        marginBottom: 12,
        marginLeft: 8,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    menuGlassCard: {
        padding: 8,
        borderRadius: 24,
        backgroundColor: staticColors.white,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.8)',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 2,
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
    },
    iconWrapper: {
        width: 42,
        height: 42,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
    },
    itemTitle: {
        fontFamily: fonts.bold,
        fontSize: 15,
        color: staticColors.text,
        marginBottom: 2,
    },
    itemDescription: {
        fontFamily: fonts.medium,
        fontSize: 12,
        color: staticColors.textSecondary,
    },
    divider: {
        height: 1,
        backgroundColor: staticColors.borderLight,
        marginLeft: 70,
        marginVertical: 4,
        opacity: 0.5,
    },
    footerNote: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        gap: 8,
        marginTop: 8,
    },
    footerNoteText: {
        fontFamily: fonts.medium,
        fontSize: 11,
        color: staticColors.textLight,
        textAlign: 'center',
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: spacing.md,
        fontFamily: fonts.medium,
        fontSize: 14,
        color: staticColors.textSecondary,
    },
});
