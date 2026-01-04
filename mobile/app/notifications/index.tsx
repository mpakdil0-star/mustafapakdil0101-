import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { markNotificationAsRead, fetchNotifications } from '../../store/slices/notificationSlice';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';
import api from '../../services/api';

// Timeline Component for Visualizing History
const TimelineItem = ({ item, index, isLast, onPress }: { item: any; index: number; isLast: boolean; onPress: () => void }) => {
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
            case 'JOB_OFFER': return '#3B82F6'; // Blue
            case 'BID_RECEIVED': return '#F59E0B'; // Amber
            case 'MESSAGE': return '#10B981'; // Emerald
            case 'security': return '#EF4444'; // Red
            default: return '#8B5CF6'; // Violet
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
                <Text style={styles.timeText}>{timeStr}</Text>
                <Text style={styles.dateText}>{dateStr}</Text>
            </View>

            {/* Timeline Line & Dot */}
            <View style={styles.timeline}>
                <View style={[styles.timelineDot, { borderColor: iconColor, backgroundColor: item.isRead ? 'transparent' : iconColor }]} />
                {!isLast && <View style={styles.timelineLine} />}
            </View>

            {/* Content Card */}
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={onPress}
                style={[styles.cardContainer, !item.isRead && styles.unreadCard]}
            >
                <LinearGradient
                    colors={item.isRead ? ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.02)'] : ['rgba(124, 58, 237, 0.1)', 'rgba(124, 58, 237, 0.05)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.cardGradient}
                >
                    <View style={styles.cardHeader}>
                        <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
                            <Ionicons name={getIcon(item.type) as any} size={18} color={iconColor} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.cardTitle, !item.isRead && { color: colors.white }]} numberOfLines={1}>
                                {item.title}
                            </Text>
                        </View>
                        {!item.isRead && <View style={[styles.newBadge, { backgroundColor: iconColor }]}><Text style={styles.newBadgeText}>YENİ</Text></View>}
                    </View>

                    <Text style={[styles.cardMessage, !item.isRead && { color: 'rgba(255,255,255,0.9)' }]} numberOfLines={2}>
                        {item.message}
                    </Text>
                </LinearGradient>
            </TouchableOpacity>
        </View >
    );
};

export default function NotificationsScreen() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { notifications, isLoading } = useAppSelector((state) => state.notifications);
    const [refreshing, setRefreshing] = useState(false);

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

        // Navigate based on type
        if (notification.type === 'JOB_OFFER' || notification.type === 'JOB_UPDATE') {
            router.push(`/jobs/${notification.relatedId}`);
        } else if (notification.type === 'MESSAGE') {
            router.push(`/messages/${notification.relatedId}`); // conversationId
        }
    };

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
                <Ionicons name="notifications-off-outline" size={48} color="rgba(255,255,255,0.3)" />
            </View>
            <Text style={styles.emptyTitle}>Bildiriminiz Yok</Text>
            <Text style={styles.emptyText}>Şu an için size ulaşan yeni bir bildirim bulunmuyor.</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#0F172A', '#1E293B']}
                style={StyleSheet.absoluteFill}
            />

            <PremiumHeader
                title="Bildirim Merkezi"
                showBackButton
                rightElement={
                    <TouchableOpacity onPress={loadNotifications}>
                        <Ionicons name="refresh" size={20} color={colors.textLight} />
                    </TouchableOpacity>
                } />

            {isLoading && notifications.length === 0 ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    renderItem={({ item, index }) => (
                        <TimelineItem
                            item={item}
                            index={index}
                            isLast={index === notifications.length - 1}
                            onPress={() => handlePress(item)}
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
        backgroundColor: '#0F172A',
    },
    listContent: {
        padding: spacing.lg,
        paddingBottom: spacing.xxxl,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
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
        color: colors.text,
    },
    dateText: {
        fontFamily: fonts.regular,
        fontSize: 11,
        color: colors.textSecondary,
        marginTop: 2,
    },
    graphics: {
        width: 20,
        alignItems: 'center',
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
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginTop: 4,
        marginBottom: -10, // Connect to next
    },
    cardContainer: {
        flex: 1,
        marginBottom: 20,
        marginLeft: 8,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    unreadCard: {
        borderColor: 'rgba(124, 58, 237, 0.4)',
        shadowColor: '#7C3AED',
    },
    cardGradient: {
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
        color: 'rgba(255,255,255,0.9)',
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
        color: 'rgba(255,255,255,0.6)',
        lineHeight: 18,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        fontFamily: fonts.bold,
        fontSize: 18,
        color: colors.text,
        marginBottom: 8,
    },
    emptyText: {
        fontFamily: fonts.regular,
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        maxWidth: 250,
    },
});
