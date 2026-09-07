import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { markNotificationAsRead, markAllNotificationsAsRead, fetchNotifications } from '../../store/slices/notificationSlice';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';
import { useAppColors } from '../../hooks/useAppColors';
import { getNotificationTargetPath } from '../../utils/notificationNavigation';
import { SkeletonListItem } from '../../components/common/SkeletonLoader';
import { formatRelativeTime } from '../../utils/date';

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

// --- Modern Full-Width Notification Card ---
interface NotificationCardProps {
    item: any;
    onPress: () => void;
    colors: any;
}

const NotificationCard: React.FC<NotificationCardProps> = ({ item, onPress, colors }) => {
    const iconConfig = useMemo(() => {
        const t = (item.type || '').toLowerCase();
        if (t.includes('message') || t === 'new_message' || t === 'message_received') {
            return { name: 'chatbubbles', color: '#0D9488', bg: '#0D948818' };
        }
        if (t === 'job_offer' || t.includes('offer')) {
            return { name: 'briefcase', color: '#3B82F6', bg: '#3B82F618' };
        }
        if (t.includes('bid') || t.includes('teklif') || t === 'bid_received') {
            return { name: 'pricetag', color: '#F59E0B', bg: '#F59E0B18' };
        }
        if (t.includes('review') || t.includes('star')) {
            return { name: 'star', color: '#EAB308', bg: '#EAB30818' };
        }
        if (t.includes('system') || t === 'security') {
            return { name: 'shield-checkmark', color: '#10B981', bg: '#10B98118' };
        }
        return { name: 'notifications', color: '#6366F1', bg: '#6366F118' };
    }, [item.type]);

    const formattedTime = useMemo(() => {
        return formatRelativeTime(item.createdAt);
    }, [item.createdAt]);

    return (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={onPress}
            style={[
                styles.cardContainer,
                {
                    backgroundColor: colors.surface || '#FFFFFF',
                    borderColor: item.isRead ? (colors.border || '#E2E8F0') : (colors.primary + '50'),
                },
                !item.isRead && [
                    styles.unreadCard,
                    { borderLeftColor: colors.primary, borderLeftWidth: 3.5 },
                ],
            ]}
        >
            {/* Category / Type Icon Avatar */}
            <View style={[styles.iconContainer, { backgroundColor: iconConfig.bg }]}>
                <Ionicons name={iconConfig.name as any} size={20} color={iconConfig.color} />
            </View>

            {/* Middle Content */}
            <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                    <Text
                        style={[
                            styles.cardTitle,
                            {
                                color: colors.text,
                                fontFamily: item.isRead ? fonts.semiBold : fonts.bold,
                            },
                        ]}
                        numberOfLines={1}
                    >
                        {item.title}
                    </Text>
                    <Text style={[styles.timeText, { color: colors.textSecondary }]}>
                        {formattedTime}
                    </Text>
                </View>

                <Text
                    style={[
                        styles.cardMessage,
                        { color: item.isRead ? colors.textSecondary : colors.text },
                    ]}
                    numberOfLines={2}
                >
                    {item.message}
                </Text>
            </View>

            {/* Glowing Unread Indicator Dot */}
            {!item.isRead && (
                <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
            )}
        </TouchableOpacity>
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
            <View style={[styles.emptyIconCircle, { backgroundColor: (colors.primary || '#0D9488') + '12' }]}>
                <Ionicons name="notifications-off-outline" size={44} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Bildiriminiz Yok</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {selectedCategory === 'ALL'
                    ? 'Şu an için size ulaşan yeni bir bildirim bulunmuyor.'
                    : 'Bu filtreye uygun bildirim bulunamadı.'}
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
                        <TouchableOpacity
                            onPress={handleMarkAllRead}
                            style={styles.markAllBtn}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="checkmark-done" size={16} color="#FFFFFF" />
                            <Text style={styles.markAllBtnText}>Tümünü Oku</Text>
                        </TouchableOpacity>
                    ) : undefined
                }
            />

            {/* Filter Tabs Horizontal Bar */}
            <View style={[styles.filterWrapper, { backgroundColor: colors.background, borderBottomColor: (colors.border || '#E2E8F0') + '40' }]}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterContainer}
                    style={{ flexGrow: 0 }}
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
                                        backgroundColor: isActive ? colors.primary : (colors.surface || '#FFFFFF'),
                                        borderColor: isActive ? colors.primary : (colors.border || '#E2E8F0'),
                                    },
                                ]}
                                activeOpacity={0.7}
                                onPress={() => setSelectedCategory(tab.id)}
                            >
                                <Ionicons
                                    name={tab.icon}
                                    size={15}
                                    color={isActive ? '#FFFFFF' : colors.textSecondary}
                                />
                                <Text style={[
                                    styles.filterChipText,
                                    { color: isActive ? '#FFFFFF' : colors.text },
                                ]}>
                                    {tab.label}
                                </Text>
                                {count > 0 && (
                                    <View style={[
                                        styles.filterChipBadge,
                                        {
                                            backgroundColor: isActive ? 'rgba(255,255,255,0.28)' : (colors.primary + '18'),
                                        },
                                    ]}>
                                        <Text style={[
                                            styles.filterChipBadgeText,
                                            { color: isActive ? '#FFFFFF' : colors.primary },
                                        ]}>
                                            {count}
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Notifications Content */}
            {isLoading && notifications.length === 0 ? (
                <View style={styles.skeletonContainer}>
                    {[1, 2, 3, 4, 5].map((i) => (
                        <SkeletonListItem key={i} style={{ marginBottom: 12 }} />
                    ))}
                </View>
            ) : (
                <FlatList
                    data={filteredNotifications}
                    renderItem={({ item }) => (
                        <NotificationCard
                            item={item}
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
    // Header Right Button
    markAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 36,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.18)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.25)',
        gap: 5,
    },
    markAllBtnText: {
        fontFamily: fonts.semiBold,
        fontSize: 12,
        color: '#FFFFFF',
    },
    // Filter Chips Horizontal Scroll
    filterWrapper: {
        borderBottomWidth: 1,
        paddingVertical: 10,
    },
    filterContainer: {
        paddingHorizontal: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        gap: 6,
    },
    filterChipText: {
        fontFamily: fonts.semiBold,
        fontSize: 13,
    },
    filterChipBadge: {
        minWidth: 20,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
    },
    filterChipBadgeText: {
        fontFamily: fonts.bold,
        fontSize: 11,
    },
    // List & Cards
    listContent: {
        padding: spacing.md,
        paddingBottom: spacing.xxxl,
    },
    skeletonContainer: {
        flex: 1,
        padding: spacing.md,
    },
    cardContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    unreadCard: {
        shadowOpacity: 0.1,
        elevation: 2,
    },
    iconContainer: {
        width: 42,
        height: 42,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    cardContent: {
        flex: 1,
        marginRight: 6,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
        gap: 8,
    },
    cardTitle: {
        fontSize: 14,
        flex: 1,
    },
    timeText: {
        fontFamily: fonts.medium,
        fontSize: 11,
    },
    cardMessage: {
        fontFamily: fonts.regular,
        fontSize: 13,
        lineHeight: 18,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginLeft: 4,
    },
    // Empty State
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
        marginBottom: 16,
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
        maxWidth: 260,
        lineHeight: 20,
    },
});
