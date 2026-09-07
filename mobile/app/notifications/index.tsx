import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { markNotificationAsRead, markAllNotificationsAsRead, fetchNotifications } from '../../store/slices/notificationSlice';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import { colors as staticColors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';
import { useAppColors } from '../../hooks/useAppColors';
import { getNotificationTargetPath } from '../../utils/notificationNavigation';
import { SkeletonListItem } from '../../components/common/SkeletonLoader';

// --- Filter Tabs ---
type FilterCategory = 'ALL' | 'MESSAGES' | 'JOBS' | 'SYSTEM';

const FILTER_TABS: { id: FilterCategory; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'ALL', label: 'Tümü', icon: 'apps-outline' },
    { id: 'MESSAGES', label: 'Mesajlar', icon: 'chatbubbles-outline' },
    { id: 'JOBS', label: 'İş & Teklifler', icon: 'briefcase-outline' },
    { id: 'SYSTEM', label: 'Sistem', icon: 'shield-checkmark-outline' },
];

const getNotificationCategory = (type: string): 'MESSAGES' | 'JOBS' | 'SYSTEM' => {
    const t = (type || '').toLowerCase();
    if (t.includes('message') || t === 'new_message' || t === 'message_received') {
        return 'MESSAGES';
    }
    if (t.includes('job') || t.includes('bid') || t.includes('teklif') || t.includes('review')) {
        return 'JOBS';
    }
    return 'SYSTEM';
};

// --- Timeline Item Component ---
const TimelineItem = ({ item, index, isLast, onPress, colors }: {
    item: any; index: number; isLast: boolean; onPress: () => void; colors: any;
}) => {
    const getIcon = (type: string) => {
        switch (type) {
            case 'JOB_OFFER': return 'briefcase';
            case 'BID_RECEIVED': return 'pricetag';
            case 'MESSAGE': return 'chatbubble-ellipses';
            case 'SYSTEM': return 'information-circle';
            case 'security': return 'shield-checkmark';
            default: return 'notifications';
        }
    };

    const getColor = (type: string) => {
        switch (type) {
            case 'JOB_OFFER': return '#3B82F6';
            case 'BID_RECEIVED': return '#F59E0B';
            case 'MESSAGE': return '#10B981';
            case 'security': return '#EF4444';
            default: return '#8B5CF6';
        }
    };

    const iconColor = getColor(item.type);
    const date = new Date(item.createdAt);
    const timeStr = format(date, 'HH:mm', { locale: tr });
    const dateStr = format(date, 'd MMMM', { locale: tr });

    return (
        <View style={styles.timelineRow}>
            {/* Time Column */}
            <View style={styles.timeColumn}>
                <Text style={[styles.timeText, { color: colors.text }]}>{timeStr}</Text>
                <Text style={[styles.dateText, { color: colors.textSecondary }]}>{dateStr}</Text>
            </View>

            {/* Timeline Line & Dot */}
            <View style={styles.timeline}>
                <View style={[styles.timelineDot, { borderColor: iconColor, backgroundColor: item.isRead ? 'transparent' : iconColor }]} />
                {!isLast && <View style={[styles.timelineLine, { backgroundColor: colors.border || '#E2E8F0' }]} />}
            </View>

            {/* Content Card */}
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={onPress}
                style={[
                    styles.cardContainer,
                    {
                        backgroundColor: item.isRead
                            ? (colors.surface || '#FFFFFF')
                            : (colors.primary + '08'),
                        borderColor: item.isRead
                            ? (colors.border || '#E2E8F0')
                            : (colors.primary + '30'),
                    },
                    !item.isRead && styles.unreadCard,
                ]}
            >
                <View style={styles.cardInner}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.iconContainer, { backgroundColor: iconColor + '15' }]}>
                            <Ionicons name={getIcon(item.type) as any} size={18} color={iconColor} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                                {item.title}
                            </Text>
                        </View>
                        {!item.isRead && (
                            <View style={[styles.newBadge, { backgroundColor: iconColor }]}>
                                <Text style={styles.newBadgeText}>YENİ</Text>
                            </View>
                        )}
                    </View>

                    <Text style={[styles.cardMessage, { color: colors.textSecondary }]} numberOfLines={2}>
                        {item.message}
                    </Text>
                </View>
            </TouchableOpacity>
        </View>
    );
};

// --- Main Screen ---
export default function NotificationsScreen() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const colors = useAppColors();
    const { notifications, isLoading, unreadCount } = useAppSelector((state) => state.notifications);
    const { user } = useAppSelector((state) => state.auth);
    const isAdmin = user?.userType === 'ADMIN';
    const [refreshing, setRefreshing] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('ALL');

    const visibleFilterTabs = useMemo(() => {
        if (isAdmin) return FILTER_TABS;
        return FILTER_TABS.filter((tab) => tab.id !== 'SYSTEM');
    }, [isAdmin]);

    useEffect(() => {
        loadNotifications();
    }, []);

    const loadNotifications = async () => {
        try {
            await dispatch(fetchNotifications()).unwrap();
        } catch (error) {
            console.error('Failed to load notifications:', error);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadNotifications();
        setRefreshing(false);
    };

    const handlePress = async (notification: any) => {
        if (!notification.isRead) {
            dispatch(markNotificationAsRead(notification.id));
        }
        const targetPath = getNotificationTargetPath(notification);
        if (targetPath) router.push(targetPath as any);
    };

    const handleMarkAllRead = () => {
        dispatch(markAllNotificationsAsRead());
    };

    // Filter notifications
    const filteredNotifications = useMemo(() => {
        if (selectedCategory === 'ALL') return notifications;
        return notifications.filter((n) => getNotificationCategory(n.type) === selectedCategory);
    }, [notifications, selectedCategory]);

    // Category counts
    const categoryCounts = useMemo(() => {
        const counts = { ALL: notifications.length, MESSAGES: 0, JOBS: 0, SYSTEM: 0 };
        notifications.forEach((n) => {
            const cat = getNotificationCategory(n.type);
            counts[cat] = (counts[cat] || 0) + 1;
        });
        return counts;
    }, [notifications]);

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconCircle, { backgroundColor: (colors.primary || '#0D9488') + '10' }]}>
                <Ionicons name="notifications-off-outline" size={48} color={colors.textSecondary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Bildiriminiz Yok</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Şu an için size ulaşan yeni bir bildirim bulunmuyor.
            </Text>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <PremiumHeader
                title="Bildirim Merkezi"
                showBackButton
                rightElement={
                    unreadCount > 0 ? (
                        <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllBtn}>
                            <Ionicons name="checkmark-done" size={20} color={colors.primary} />
                        </TouchableOpacity>
                    ) : undefined
                }
            />

            {/* Filter Chips */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterContainer}
            >
                {visibleFilterTabs.map((tab) => {
                    const isActive = selectedCategory === tab.id;
                    const count = categoryCounts[tab.id];
                    return (
                        <TouchableOpacity
                            key={tab.id}
                            style={[
                                styles.filterChip,
                                {
                                    backgroundColor: isActive ? colors.primary : (colors.surface || '#F1F5F9'),
                                    borderColor: isActive ? colors.primary : (colors.border || '#E2E8F0'),
                                },
                            ]}
                            activeOpacity={0.7}
                            onPress={() => setSelectedCategory(tab.id)}
                        >
                            <Ionicons
                                name={tab.icon}
                                size={14}
                                color={isActive ? '#FFF' : colors.textSecondary}
                            />
                            <Text style={[
                                styles.filterChipText,
                                { color: isActive ? '#FFF' : colors.textSecondary },
                            ]}>
                                {tab.label}
                            </Text>
                            {count > 0 && (
                                <View style={[
                                    styles.filterChipBadge,
                                    { backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : (colors.primary + '15') },
                                ]}>
                                    <Text style={[
                                        styles.filterChipBadgeText,
                                        { color: isActive ? '#FFF' : colors.primary },
                                    ]}>{count}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {/* Content */}
            {isLoading && notifications.length === 0 ? (
                <View style={styles.skeletonContainer}>
                    {[1, 2, 3, 4, 5].map((i) => (
                        <SkeletonListItem key={i} style={{ marginBottom: 12 }} />
                    ))}
                </View>
            ) : (
                <FlatList
                    data={filteredNotifications}
                    renderItem={({ item, index }) => (
                        <TimelineItem
                            item={item}
                            index={index}
                            isLast={index === filteredNotifications.length - 1}
                            onPress={() => handlePress(item)}
                            colors={colors}
                        />
                    )}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
                    }
                    ListEmptyComponent={renderEmpty}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    // Filter Chips
    filterContainer: {
        paddingHorizontal: spacing.md,
        paddingVertical: 12,
        gap: 8,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        gap: 6,
        marginRight: 8,
    },
    filterChipText: {
        fontFamily: fonts.bold,
        fontSize: 12,
    },
    filterChipBadge: {
        minWidth: 20,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 5,
    },
    filterChipBadgeText: {
        fontFamily: fonts.bold,
        fontSize: 10,
    },
    markAllBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    // List
    listContent: {
        padding: spacing.lg,
        paddingBottom: spacing.xxxl,
    },
    skeletonContainer: {
        flex: 1,
        padding: spacing.lg,
    },
    // Timeline
    timelineRow: {
        flexDirection: 'row',
        marginBottom: 4,
        minHeight: 100,
    },
    timeColumn: {
        width: 60,
        alignItems: 'flex-end',
        paddingRight: 12,
        paddingTop: 4,
    },
    timeText: {
        fontFamily: fonts.bold,
        fontSize: 13,
    },
    dateText: {
        fontFamily: fonts.regular,
        fontSize: 11,
        marginTop: 2,
    },
    timeline: {
        width: 24,
        alignItems: 'center',
        marginRight: 8,
    },
    timelineDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 2,
        zIndex: 2,
        marginTop: 6,
    },
    timelineLine: {
        flex: 1,
        width: 2,
        marginTop: 4,
        marginBottom: -10,
    },
    // Card
    cardContainer: {
        flex: 1,
        marginBottom: 20,
        marginLeft: 8,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
    },
    unreadCard: {
        shadowOpacity: 0.1,
        elevation: 4,
    },
    cardInner: {
        padding: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    cardTitle: {
        fontFamily: fonts.bold,
        fontSize: 14,
    },
    newBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 8,
    },
    newBadgeText: {
        fontFamily: fonts.bold,
        fontSize: 9,
        color: '#fff',
    },
    cardMessage: {
        fontFamily: fonts.regular,
        fontSize: 13,
        lineHeight: 18,
    },
    // Empty
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        fontFamily: fonts.bold,
        fontSize: 18,
        marginBottom: 8,
    },
    emptyText: {
        fontFamily: fonts.regular,
        fontSize: 14,
        textAlign: 'center',
        maxWidth: 250,
    },
});
