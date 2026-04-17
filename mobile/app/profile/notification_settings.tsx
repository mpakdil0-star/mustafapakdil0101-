import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, Platform, ImageBackground, ActivityIndicator, TouchableOpacity, Linking, Alert, AppState } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import * as SecureStore from 'expo-secure-store';
import { Card } from '../../components/common/Card';
import { colors as staticColors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';
import { useAppColors } from '../../hooks/useAppColors';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import api from '../../services/api';
import { authService } from '../../services/authService';

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
    const [systemPermission, setSystemPermission] = useState<'granted' | 'denied' | 'unknown'>('unknown');
    const colors = useAppColors();
    const { user } = useSelector((state: RootState) => state.auth);
    const appState = useRef(AppState.currentState);
    const previousPermission = useRef<string>('unknown');

    // Check system-level notification permission and auto-register token if granted
    const checkSystemPermission = useCallback(async (autoRegister = false) => {
        try {
            const { Platform: RNPlatform } = await import('react-native');
            const Constants = (await import('expo-constants')).default;
            if (Constants.appOwnership === 'expo' && RNPlatform.OS === 'android') return;

            const Notifications = await import('expo-notifications');
            const { status } = await Notifications.getPermissionsAsync();
            const newPermission = status === 'granted' ? 'granted' : 'denied';

            // If permission just changed from denied to granted, auto-register push token
            if (autoRegister && previousPermission.current === 'denied' && newPermission === 'granted') {
                console.log('🔔 Permission changed to granted — auto-registering push token...');
                if (user?.isImpersonated) return;
                const result = await authService.registerPushToken();
                if (result === 'granted') {
                    console.log('✅ Push token auto-registered after settings change!');
                    // Also update local preference to pushEnabled = true
                    const updatedPrefs = { ...preferences, pushEnabled: true };
                    setPreferences(updatedPrefs);
                    await SecureStore.setItemAsync(NOTIFICATION_PREFS_KEY, JSON.stringify(updatedPrefs));
                    try { await api.put('/users/notification-preferences', updatedPrefs); } catch { }
                }
            }

            previousPermission.current = newPermission;
            setSystemPermission(newPermission);
        } catch {
            setSystemPermission('unknown');
        }
    }, [preferences]);

    // Load preferences on mount + check system permission
    useEffect(() => {
        loadPreferences();
        checkSystemPermission();
    }, []);

    // Listen to AppState changes (user returns from system settings)
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextAppState) => {
            if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
                // User just returned to the app — re-check permission
                console.log('📱 App returned to foreground — checking notification permission...');
                checkSystemPermission(true);
            }
            appState.current = nextAppState;
        });

        return () => subscription.remove();
    }, [checkSystemPermission]);

    const loadPreferences = async () => {
        try {
            // First, try to load from SecureStore (instant)
            const stored = await SecureStore.getItemAsync(NOTIFICATION_PREFS_KEY);
            let prefs = stored ? JSON.parse(stored) : defaultPreferences;

            // Then, try to sync from API
            try {
                const response = await api.get('/users/notification-preferences');
                if (response.data.success && response.data.data) {
                    prefs = response.data.data;
                    // Update local storage with server data
                    await SecureStore.setItemAsync(NOTIFICATION_PREFS_KEY, JSON.stringify(prefs));
                }
            } catch (apiError) {
                console.log('Could not sync from API, using local preferences');
            }

            // FORCE UI synchronization: if system permission is denied, pushEnabled MUST be false
            try {
                const { Platform: RNPlatform } = await import('react-native');
                const Constants = (await import('expo-constants')).default;
                if (!(Constants.appOwnership === 'expo' && RNPlatform.OS === 'android')) {
                    const Notifications = await import('expo-notifications');
                    const { status } = await Notifications.getPermissionsAsync();
                    if (status !== 'granted' && prefs.pushEnabled) {
                        console.log('🔕 System permission is denied -> Forcing pushEnabled to false in state');
                        prefs = { ...prefs, pushEnabled: false };
                        await SecureStore.setItemAsync(NOTIFICATION_PREFS_KEY, JSON.stringify(prefs));
                    }
                }
            } catch (e) {
                console.warn('Sync permission error:', e);
            }

            setPreferences(prefs);
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

            // If pushEnabled is toggled, actually register/unregister the push token
            if (key === 'pushEnabled') {
                if (value === false) {
                    // Disable push: clear push token on backend
                    console.log('🔕 Push notifications disabled - clearing push token');
                    if (user?.isImpersonated) {
                        console.log('🛡️ [IMPERSONATION] Skipping push token clear');
                    } else {
                        try {
                            await api.post('/users/push-token', { pushToken: null });
                            console.log('✅ Push token cleared on backend');
                        } catch (e) {
                            console.warn('Could not clear push token on backend:', e);
                        }
                    }
                } else {
                    // Enable push: re-register push token
                    console.log('🔔 Push notifications enabled - re-registering push token');
                    if (user?.isImpersonated) {
                         console.log('🛡️ [IMPERSONATION] Skipping push token registration');
                    } else {
                        try {
                            const result = await authService.registerPushToken();
                        if (result === 'needs_settings') {
                            // Permission permanently denied – open system settings
                            Alert.alert(
                                'Bildirim İzni Gerekli',
                                'Daha önce bildirim iznini reddettiniz. Açmak için telefon ayarlarını kullanmanız gerekiyor.',
                                [
                                    {
                                        text: 'Vazgeç', style: 'cancel', onPress: () => {
                                            // Revert toggle back to false
                                            setPreferences(prev => ({ ...prev, pushEnabled: false }));
                                            SecureStore.setItemAsync(NOTIFICATION_PREFS_KEY, JSON.stringify({ ...newPreferences, pushEnabled: false }));
                                        }
                                    },
                                    { text: 'Ayarları Aç', onPress: () => Linking.openSettings() }
                                ]
                            );
                            return;
                        } else if (result === 'granted') {
                            console.log('✅ Push token re-registered');
                            setSystemPermission('granted');
                        } else {
                            console.warn('Push token registration failed:', result);
                            setSystemPermission('denied');
                        }
                    } catch (e) {
                        console.warn('Could not re-register push token:', e);
                    }
                }
            }

            // Sync preferences to backend
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

                {/* System Permission Warning Banner */}
                {systemPermission === 'denied' && (
                    <TouchableOpacity
                        style={styles.permissionWarningBanner}
                        activeOpacity={0.85}
                        onPress={async () => {
                            try {
                                const Notifications = await import('expo-notifications');
                                const { canAskAgain } = await Notifications.getPermissionsAsync();

                                if (canAskAgain) {
                                    // Can ask in-app — show native permission dialog
                                    const { status } = await Notifications.requestPermissionsAsync();
                                    if (status === 'granted') {
                                        // Permission granted in-app! Register token immediately
                                        console.log('🔔 Permission granted in-app — registering push token...');
                                        setSystemPermission('granted');
                                        if (user?.isImpersonated) return;
                                        const result = await authService.registerPushToken();
                                        if (result === 'granted') {
                                            const updatedPrefs = { ...preferences, pushEnabled: true };
                                            setPreferences(updatedPrefs);
                                            await SecureStore.setItemAsync(NOTIFICATION_PREFS_KEY, JSON.stringify(updatedPrefs));
                                            try { await api.put('/users/notification-preferences', updatedPrefs); } catch { }
                                        }
                                    }
                                } else {
                                    // Cannot ask again — must go to system settings
                                    Alert.alert(
                                        'Sistem Ayarları Gerekli',
                                        'Bildirim izni kalıcı olarak reddedilmiş. Açmak için telefon ayarlarınızı kullanmanız gerekiyor.',
                                        [
                                            { text: 'Vazgeç', style: 'cancel' },
                                            { text: 'Ayarları Aç', onPress: () => Linking.openSettings() }
                                        ]
                                    );
                                }
                            } catch (e) {
                                console.warn('Permission check error:', e);
                                Linking.openSettings();
                            }
                        }}
                    >
                        <Ionicons name="warning-outline" size={20} color="#fff" />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.permissionWarningTitle}>Bildirimler kapalı</Text>
                            <Text style={styles.permissionWarningDesc}>
                                Dokunarak bildirimleri aktif edin.
                            </Text>
                        </View>
                        <View style={styles.permissionWarningBtn}>
                            <Text style={styles.permissionWarningBtnText}>Aktif Et</Text>
                            <Ionicons name="chevron-forward" size={14} color="#fff" />
                        </View>
                    </TouchableOpacity>
                )}

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
        padding: 12,
        paddingBottom: 20,
    },
    infoGlassCard: {
        flexDirection: 'row',
        backgroundColor: staticColors.white,
        padding: 14,
        borderRadius: 16,
        marginBottom: 16,
        gap: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.8)',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 4,
    },
    infoIconWrapper: {
        width: 40,
        height: 40,
        borderRadius: 12,
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
        fontSize: 14,
        color: staticColors.text,
        marginBottom: 4,
        letterSpacing: -0.3,
    },
    description: {
        fontFamily: fonts.medium,
        fontSize: 12,
        color: staticColors.textSecondary,
        lineHeight: 16,
    },
    sectionHeading: {
        fontFamily: fonts.bold,
        fontSize: 12,
        color: staticColors.textSecondary,
        marginBottom: 8,
        marginLeft: 6,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    menuGlassCard: {
        padding: 4,
        borderRadius: 16,
        backgroundColor: staticColors.white,
        marginBottom: 16,
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
        padding: 10,
        borderRadius: 14,
    },
    iconWrapper: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
    },
    itemTitle: {
        fontFamily: fonts.bold,
        fontSize: 14,
        color: staticColors.text,
        marginBottom: 2,
    },
    itemDescription: {
        fontFamily: fonts.medium,
        fontSize: 11,
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
    permissionWarningBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F59E0B',
        borderRadius: 14,
        padding: 12,
        marginBottom: 16,
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    permissionWarningTitle: {
        fontFamily: fonts.bold,
        fontSize: 14,
        color: '#fff',
        marginBottom: 2,
    },
    permissionWarningDesc: {
        fontFamily: fonts.medium,
        fontSize: 12,
        color: 'rgba(255,255,255,0.85)',
    },
    permissionWarningBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 6,
        gap: 2,
    },
    permissionWarningBtnText: {
        fontFamily: fonts.bold,
        fontSize: 12,
        color: '#fff',
    },
});
