import React, { useEffect, useCallback, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../../store/slices/notificationSlice';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import { colors as staticColors } from '../../constants/colors';
import { fonts } from '../../constants/typography';
import { useAppColors } from '../../hooks/useAppColors';
import { formatRelativeTime } from '../../utils/date';
import { bidService } from '../../services/bidService';
import { getNotificationTargetPath } from '../../utils/notificationNavigation';
import { SkeletonListItem } from '../../components/common/SkeletonLoader';

type FilterCategory = 'ALL' | 'MESSAGES' | 'JOBS' | 'SYSTEM';

const FILTER_TABS: { id: FilterCategory; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'ALL', label: 'Tümü', icon: 'apps-outline' },
    { id: 'MESSAGES', label: 'Mesajlar', icon: 'chatbubbles-outline' },
    { id: 'JOBS', label: 'İş & Teklifler', icon: 'briefcase-outline' },
    { id: 'SYSTEM', label: 'Sistem', icon: 'shield-checkmark-outline' },
];

export default function NotificationsScreen() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const colors = useAppColors();
    const { notifications, isLoading, unreadCount } = useAppSelector((state) => state.notifications);
    const { user } = useAppSelector((state) => state.auth);
    const isAdmin = user?.userType === 'ADMIN';
    const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('ALL');

    const visibleFilterTabs = useMemo(() => {
        if (isAdmin) return FILTER_TABS;
        return FILTER_TABS.filter((tab) => tab.id !== 'SYSTEM');
    }, [isAdmin]);

    const onRefresh = useCallback(() => {
        dispatch(fetchNotifications());
    }, [dispatch]);

    useEffect(() => {
        dispatch(fetchNotifications());
    }, [dispatch]);

    // Categorize notification
    const getNotificationCategory = (type: string): 'MESSAGES' | 'JOBS' | 'SYSTEM' => {
        const t = (type || '').toLowerCase();
        if (t.includes('message') || t === 'new_message' || t === 'message_received') {
            return 'MESSAGES';
        }
        if (
            t.includes('job') ||
            t.includes('bid') ||
            t.includes('teklif') ||
            t.includes('review')
        ) {
            return 'JOBS';
        }
        return 'SYSTEM';
    };

    // Filter notifications based on tab
    const filteredNotifications = useMemo(() => {
        if (selectedCategory === 'ALL') return notifications;
        return notifications.filter((n) => getNotificationCategory(n.type) === selectedCategory);
    }, [notifications, selectedCategory]);

    // Count per category
    const categoryCounts = useMemo(() => {
        const counts = { ALL: notifications.length, MESSAGES: 0, JOBS: 0, SYSTEM: 0 };
        notifications.forEach((n) => {
            const cat = getNotificationCategory(n.type);
            counts[cat] = (counts[cat] || 0) + 1;
        });
        return counts;
    }, [notifications]);

    const handleNotificationPress = async (notification: any) => {
        if (!notification.isRead) {
            dispatch(markNotificationAsRead(notification.id));
        }

        const directTarget = getNotificationTargetPath(notification);
        if (directTarget) {
            router.push(directTarget as any);
            return;
        }

        const type = (notification.type || '').toUpperCase();
        const relatedId = notification.relatedId;
        const relatedType = notification.relatedType;

        if (!relatedId) {
            console.warn('[Notifications] No relatedId found for notification:', notification.id);
            return;
        }

        if (relatedType === 'CONVERSATION' || type === 'NEW_MESSAGE' || type === 'MESSAGE_RECEIVED') {
            router.push(`/messages/${relatedId}`);
        } else if (
            relatedType === 'JOB' ||
            type === 'NEW_JOB_AVAILABLE' ||
            type === 'JOB_UPDATED' ||
            type === 'JOB_ASSIGNED' ||
            type === 'NEW_BID' ||
            type === 'BID_RECEIVED' ||
            type === 'JOB_COMPLETE_REQUEST' ||
            type === 'JOB_CONFIRMED' ||
            type === 'NEW_REVIEW'
        ) {
            router.push(`/jobs/${relatedId}`);
        } else if (relatedType === 'BID') {
            try {
                const bid = await bidService.getBidById(relatedId);
                if (bid?.jobPostId) {
                    router.push(`/jobs/${bid.jobPostId}`);
                }
            } catch (error) {
                console.error('[Notifications] Error fetching bid details:', error);
            }
        } else if (type.includes('BID') || type === 'YENI_TEKLIF' || type === 'NEW_BID') {
            router.push(`/jobs/${relatedId}`);
        }
    };

    const getNotificationVisuals = (type: string, title: string) => {
        const normalizedType = (type || '').toLowerCase();

        if (normalizedType === 'new_message' || normalizedType === 'message_received') {
            const initial = (title || 'M').charAt(0).toUpperCase();
            return {
                isAvatar: true,
                initial,
                name: 'chatbubble-ellipses' as const,
                color: '#8B5CF6',
                bg: '#F5F3FF',
            };
        }
        if (normalizedType === 'new_job_available') {
            return { isAvatar: false, name: 'flash' as const, color: '#F59E0B', bg: '#FFFBEB' };
        }
        if (normalizedType === 'bid_received' || normalizedType === 'new_bid') {
            return { isAvatar: false, name: 'pricetag' as const, color: '#10B981', bg: '#ECFDF5' };
        }
        if (normalizedType === 'bid_accepted' || normalizedType === 'job_confirmed') {
            return { isAvatar: false, name: 'checkmark-circle' as const, color: '#10B981', bg: '#ECFDF5' };
        }
        if (normalizedType === 'bid_rejected') {
            return { isAvatar: false, name: 'close-circle' as const, color: '#EF4444', bg: '#FEF2F2' };
        }
        if (normalizedType === 'new_review') {
            return { isAvatar: false, name: 'star' as const, color: '#F59E0B', bg: '#FFFBEB' };
        }
        if (normalizedType.includes('user') || normalizedType.includes('kayıt')) {
            return { isAvatar: false, name: 'person-add' as const, color: '#0EA5E9', bg: '#F0F9FF' };
        }
        return { isAvatar: false, name: 'notifications' as const, color: colors.primary, bg: colors.primary + '12' };
    };

    const renderItem = ({ item }: { item: any }) => {
        const visual = getNotificationVisuals(item.type, item.title);
        const timeAgo = formatRelativeTime(item.createdAt);

        return (
            <TouchableOpacity
                style={[
                    styles.notificationCard,
                    !item.isRead && styles.unreadCard,
                ]}
                onPress={() => handleNotificationPress(item)}
                activeOpacity={0.7}
            >
                {/* Left Visual: User Avatar for Messages or Themed Icon */}
                <View style={styles.visualContainer}>
                    {visual.isAvatar ? (
                        <View style={[styles.avatarBox, { backgroundColor: visual.bg }]}>
                            <Text style={[styles.avatarText, { color: visual.color }]}>{visual.initial}</Text>
                            <View style={[styles.miniBadge, { backgroundColor: visual.color }]}>
                                <Ionicons name="chatbubble-ellipses" size={10} color="#FFF" />
                            </View>
                        </View>
                    ) : (
                        <View style={[styles.iconBox, { backgroundColor: visual.bg }]}>
                            <Ionicons name={visual.name as any} size={22} color={visual.color} />
                        </View>
                    )}
                </View>

                {/* Content Area */}
                <View style={styles.contentContainer}>
                    <View style={styles.headerRow}>
                        <Text
                            style={[
                                styles.notificationTitle,
                                !item.isRead && styles.unreadTitle,
                            ]}
                            numberOfLines={1}
                        >
                            {item.title}
                        </Text>
                        <Text style={[styles.timeText, !item.isRead && styles.unreadTimeText]}>
                            {timeAgo}
                        </Text>
                    </View>

                    <Text
                        style={[
                            styles.notificationMessage,
                            !item.isRead && styles.unreadMessageText,
                        ]}
                        numberOfLines={2}
                    >
                        {item.message}
                    </Text>
                </View>

                {/* Unread Indicator Dot */}
                {!item.isRead && <View style={styles.unreadIndicator} />}
            </TouchableOpacity>
        );
    };

    const renderHeader = () => (
        <View style={styles.listHeader}>
            {/* Category Filter Chips */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterScroll}
            >
                {visibleFilterTabs.map((tab) => {
                    const isSelected = selectedCategory === tab.id;
                    const count = categoryCounts[tab.id] || 0;
                    return (
                        <TouchableOpacity
                            key={tab.id}
                            style={[
                                styles.filterChip,
                                isSelected && [styles.filterChipActive, { backgroundColor: colors.primary }],
                            ]}
                            onPress={() => setSelectedCategory(tab.id)}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name={tab.icon}
                                size={15}
                                color={isSelected ? '#FFF' : staticColors.textSecondary}
                                style={{ marginRight: 6 }}
                            />
                            <Text
                                style={[
                                    styles.filterChipText,
                                    isSelected && styles.filterChipTextActive,
                                ]}
                            >
                                {tab.label}
                            </Text>
                            {count > 0 && (
                                <View
                                    style={[
                                        styles.filterCountBadge,
                                        isSelected
                                            ? { backgroundColor: 'rgba(255,255,255,0.25)' }
                                            : { backgroundColor: '#E2E8F0' },
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.filterCountText,
                                            isSelected ? { color: '#FFF' } : { color: staticColors.textSecondary },
                                        ]}
                                    >
                                        {count}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {/* Sub-Header: Total count & Mark All Read */}
            {notifications.length > 0 && (
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                        {selectedCategory === 'ALL'
                            ? 'BİLDİRİMLER'
                            : `${FILTER_TABS.find((t) => t.id === selectedCategory)?.label.toUpperCase()} (${filteredNotifications.length})`}
                    </Text>
                    {unreadCount > 0 && (
                        <TouchableOpacity
                            onPress={() => dispatch(markAllNotificationsAsRead())}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Text style={[styles.markAllText, { color: colors.primary }]}>
                                Tümünü okundu yap
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}
        </View>
    );

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
                        <Ionicons name="settings-outline" size={22} color={staticColors.white} />
                    </TouchableOpacity>
                }
                backgroundImage={require('../../assets/images/header_bg.png')}
            />

            <FlatList
                data={filteredNotifications}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={colors.primary} />
                }
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={
                    isLoading ? (
                        <View style={styles.skeletonContainer}>
                            <SkeletonListItem />
                            <SkeletonListItem />
                            <SkeletonListItem />
                            <SkeletonListItem />
                        </View>
                    ) : (
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIconWrapper}>
                                <Ionicons name="notifications-off-outline" size={56} color="#CBD5E1" />
                            </View>
                            <Text style={styles.emptyTitle}>Bildirim bulunmuyor</Text>
                            <Text style={styles.emptySubtitle}>
                                {selectedCategory === 'ALL'
                                    ? 'İşleriniz, teklifleriniz ve mesajlarınızla ilgili tüm güncellemeler burada yer alacak.'
                                    : 'Bu filtreye uygun bildirim bulunmuyor.'}
                            </Text>
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
        paddingHorizontal: 16,
        paddingBottom: 40,
        flexGrow: 1,
    },
    listHeader: {
        marginBottom: 10,
    },
    filterScroll: {
        paddingVertical: 12,
        gap: 8,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 2,
        elevation: 1,
    },
    filterChipActive: {
        borderColor: 'transparent',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 2,
    },
    filterChipText: {
        fontFamily: fonts.medium,
        fontSize: 13,
        color: staticColors.textSecondary,
    },
    filterChipTextActive: {
        color: '#FFFFFF',
        fontFamily: fonts.bold,
    },
    filterCountBadge: {
        marginLeft: 6,
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 10,
    },
    filterCountText: {
        fontFamily: fonts.bold,
        fontSize: 11,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
        marginBottom: 10,
        paddingHorizontal: 2,
    },
    sectionTitle: {
        fontFamily: fonts.bold,
        fontSize: 11,
        color: '#94A3B8',
        letterSpacing: 0.8,
    },
    markAllText: {
        fontFamily: fonts.bold,
        fontSize: 12,
    },
    headerIconButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.25)',
    },
    notificationCard: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 14,
        marginBottom: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
        elevation: 1,
    },
    unreadCard: {
        backgroundColor: '#FFFFFF',
        borderColor: '#E2E8F0',
        borderLeftWidth: 4,
        borderLeftColor: '#3B82F6',
        shadowColor: '#3B82F6',
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
    },
    visualContainer: {
        marginRight: 12,
    },
    avatarBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    avatarText: {
        fontFamily: fonts.bold,
        fontSize: 18,
    },
    miniBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFF',
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    contentContainer: {
        flex: 1,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 3,
    },
    notificationTitle: {
        fontFamily: fonts.medium,
        fontSize: 14,
        color: '#334155',
        flex: 1,
        marginRight: 8,
    },
    unreadTitle: {
        fontFamily: fonts.bold,
        color: '#0F172A',
    },
    timeText: {
        fontFamily: fonts.regular,
        fontSize: 11,
        color: '#94A3B8',
    },
    unreadTimeText: {
        fontFamily: fonts.medium,
        color: '#3B82F6',
    },
    notificationMessage: {
        fontFamily: fonts.regular,
        fontSize: 13,
        color: '#64748B',
        lineHeight: 18,
    },
    unreadMessageText: {
        color: '#334155',
    },
    unreadIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#3B82F6',
        marginLeft: 10,
    },
    skeletonContainer: {
        paddingTop: 10,
        gap: 12,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 80,
        paddingHorizontal: 40,
    },
    emptyIconWrapper: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontFamily: fonts.bold,
        fontSize: 17,
        color: '#334155',
        marginBottom: 6,
    },
    emptySubtitle: {
        fontFamily: fonts.medium,
        fontSize: 13,
        color: '#94A3B8',
        textAlign: 'center',
        lineHeight: 19,
    },
});

