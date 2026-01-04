import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../../store/slices/notificationSlice';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import { colors as staticColors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';
import { useAppColors } from '../../hooks/useAppColors';
import { LinearGradient } from 'expo-linear-gradient';
import { formatRelativeTime } from '../../utils/date';

export default function NotificationsScreen() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const colors = useAppColors();
    const { notifications, isLoading, unreadCount } = useAppSelector((state) => state.notifications);

    const onRefresh = useCallback(() => {
        dispatch(fetchNotifications());
    }, [dispatch]);

    useEffect(() => {
        dispatch(fetchNotifications());
    }, [dispatch]);

    const handleNotificationPress = async (notification: any) => {
        if (!notification.isRead) {
            dispatch(markNotificationAsRead(notification.id));
        }

        const type = notification.type.toUpperCase();
        const relatedId = notification.relatedId;
        const relatedType = notification.relatedType;

        if (!relatedId) {
            console.warn('[Notifications] No relatedId found for notification:', notification.id);
            return;
        }

        // Navigate based on relatedType first, then fall back to type
        if (relatedType === 'CONVERSATION' || type === 'NEW_MESSAGE' || type === 'MESSAGE_RECEIVED') {
            router.push(`/messages/${relatedId}`);
        } else if (relatedType === 'JOB' ||
            type === 'NEW_JOB_AVAILABLE' ||
            type === 'JOB_UPDATED' ||
            type === 'JOB_ASSIGNED' ||
            type === 'NEW_BID' ||
            type === 'BID_RECEIVED' ||
            type === 'JOB_COMPLETE_REQUEST' ||
            type === 'JOB_CONFIRMED' ||
            type === 'NEW_REVIEW') {
            router.push(`/jobs/${relatedId}`);
        } else if (relatedType === 'BID') {
            // For BID notifications, we need to get the job ID from the bid
            // Since we don't have it in the notification, we'll fetch it
            try {
                const { default: api } = await import('../../services/api');
                const response = await api.get(`/bids/${relatedId}`);
                if (response.data.success && (response.data.data.bid?.jobPostId || response.data.data.jobPostId)) {
                    router.push(`/jobs/${response.data.data.bid?.jobPostId || response.data.data.jobPostId}`);
                } else {
                    console.warn('[Notifications] Could not get job ID from bid');
                }
            } catch (error) {
                console.error('[Notifications] Error fetching bid details:', error);
            }
        } else if (type.includes('BID') || type === 'YENI_TEKLIF' || type === 'NEW_BID') {
            // Fallback: assume relatedId is jobId
            router.push(`/jobs/${relatedId}`);
        }
    };

    const getNotificationIcon = (type: string) => {
        const normalizedType = type.toLowerCase();
        switch (normalizedType) {
            case 'new_message':
            case 'message_received':
                return { name: 'chatbubbles-outline', color: '#8B5CF6' };
            case 'new_job_available':
                return { name: 'flash-outline', color: '#F59E0B' };
            case 'bid_received':
            case 'new_bid':
                return { name: 'pricetag-outline', color: '#10B981' };
            case 'bid_accepted':
                return { name: 'checkmark-circle-outline', color: '#10B981' };
            case 'bid_rejected':
                return { name: 'close-circle-outline', color: '#EF4444' };
            case 'job_complete_request':
                return { name: 'help-circle-outline', color: '#F59E0B' };
            case 'job_confirmed':
                return { name: 'trophy-outline', color: '#FFD700' };
            case 'new_review':
                return { name: 'star-outline', color: '#FCD34D' };
            default:
                return { name: 'notifications-outline', color: colors.primary };
        }
    };

    const renderItem = ({ item }: { item: any }) => {
        const icon = getNotificationIcon(item.type);
        const timeAgo = formatRelativeTime(item.createdAt);

        return (
            <TouchableOpacity
                style={[styles.notificationCard, !item.isRead && styles.unreadCard]}
                onPress={() => handleNotificationPress(item)}
                activeOpacity={0.7}
            >
                <View style={[styles.iconContainer, { backgroundColor: icon.color + '15' }]}>
                    <Ionicons name={icon.name as any} size={24} color={icon.color} />
                </View>

                <View style={styles.contentContainer}>
                    <View style={styles.headerRow}>
                        <Text style={styles.notificationTitle} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.timeText}>{timeAgo}</Text>
                    </View>
                    <Text style={styles.notificationMessage} numberOfLines={2}>{item.message}</Text>
                </View>

                {!item.isRead && <View style={styles.unreadDot} />}
            </TouchableOpacity>
        );
    };

    const renderHeader = () => {
        if (notifications.length === 0) return null;
        return (
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>BİLDİRİMLER</Text>
                {unreadCount > 0 && (
                    <TouchableOpacity onPress={() => dispatch(markAllNotificationsAsRead())}>
                        <Text style={[styles.markAllText, { color: colors.primary }]}>Tümünü okundu işaretle</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <PremiumHeader
                title="Bildirim Merkezi"
                showBackButton
                rightElement={
                    <TouchableOpacity
                        onPress={() => router.push('/profile/notification_settings')}
                        activeOpacity={0.7}
                        style={styles.headerIconButton}
                    >
                        <Ionicons name="settings-outline" size={24} color={staticColors.white} />
                    </TouchableOpacity>
                }
                backgroundImage={require('../../assets/images/header_bg.png')}
            />

            <FlatList
                data={notifications}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={colors.primary} />
                }
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={
                    !isLoading ? (
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIconWrapper}>
                                <Ionicons name="notifications-off-outline" size={64} color={staticColors.textLight + '40'} />
                            </View>
                            <Text style={styles.emptyTitle}>Henüz bildirim yok</Text>
                            <Text style={styles.emptySubtitle}>Bölgenizdeki işler veya gelen mesajlar burada görünecek.</Text>
                        </View>
                    ) : (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={colors.primary} />
                        </View>
                    )
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    listContent: {
        padding: spacing.md,
        paddingBottom: 40,
        flexGrow: 1,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        marginTop: 8,
        paddingHorizontal: 4,
    },
    sectionTitle: {
        fontFamily: fonts.bold,
        fontSize: 12,
        color: staticColors.textSecondary,
        letterSpacing: 1,
    },
    markAllText: {
        fontFamily: fonts.bold,
        fontSize: 12,
    },
    headerIconButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    notificationCard: {
        flexDirection: 'row',
        backgroundColor: staticColors.white,
        borderRadius: 22,
        padding: 16,
        marginBottom: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.02,
        shadowRadius: 10,
        elevation: 1,
    },
    unreadCard: {
        backgroundColor: staticColors.white,
        borderColor: '#3B82F630',
        borderWidth: 1.5,
        shadowOpacity: 0.08,
        shadowColor: '#3B82F6',
        elevation: 3,
    },
    iconContainer: {
        width: 52,
        height: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    contentContainer: {
        flex: 1,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    notificationTitle: {
        fontFamily: fonts.bold,
        fontSize: 15,
        color: staticColors.text,
        flex: 1,
        marginRight: 8,
    },
    timeText: {
        fontFamily: fonts.medium,
        fontSize: 10,
        color: staticColors.textLight,
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    notificationMessage: {
        fontFamily: fonts.medium,
        fontSize: 13,
        color: staticColors.textSecondary,
        lineHeight: 18,
    },
    unreadDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#3B82F6',
        marginLeft: 12,
        shadowColor: '#3B82F6',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 4,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 100,
        paddingHorizontal: 40,
    },
    emptyIconWrapper: {
        marginBottom: 20,
    },
    emptyTitle: {
        fontFamily: fonts.bold,
        fontSize: 18,
        color: staticColors.text,
        marginBottom: 8,
    },
    emptySubtitle: {
        fontFamily: fonts.medium,
        fontSize: 14,
        color: staticColors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 100,
    },
});
