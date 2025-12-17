import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../components/common/Card';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import api from '../../services/api';

interface HistoryJob {
    id: string;
    title: string;
    category: string;
    status: 'COMPLETED' | 'CANCELLED';
    completedAt: string | null;
    cancelledAt: string | null;
    cancellationReason?: string | null;
    createdAt: string;
    electrician?: {
        id: string;
        fullName: string;
        profileImageUrl: string | null;
    } | null;
    citizen?: {
        id: string;
        fullName: string;
        profileImageUrl: string | null;
    } | null;
    finalPrice: number | null;
    hasReview: boolean;
    rating: number | null;
}

export default function HistoryScreen() {
    const router = useRouter();
    const [jobs, setJobs] = useState<HistoryJob[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchHistory = useCallback(async () => {
        try {
            const response = await api.get('/users/history');
            if (response.data.success) {
                setJobs(response.data.data.jobs);
            }
        } catch (error: any) {
            console.error('Error fetching job history:', error);
            setJobs([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchHistory();
    }, [fetchHistory]);

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    const formatPrice = (price: number | null) => {
        if (!price) return '-';
        return `${Number(price).toLocaleString('tr-TR')} ₺`;
    };

    const renderItem = ({ item }: { item: HistoryJob }) => (
        <Card style={styles.card} onPress={() => router.push(`/jobs/${item.id}`)}>
            <View style={styles.header}>
                <Text style={styles.serviceName}>{item.title}</Text>
                <View style={[
                    styles.statusBadge,
                    { backgroundColor: item.status === 'COMPLETED' ? colors.successLight : colors.errorLight }
                ]}>
                    <Text style={[
                        styles.status,
                        { color: item.status === 'COMPLETED' ? colors.success : colors.error }
                    ]}>
                        {item.status === 'COMPLETED' ? 'Tamamlandı' : 'İptal Edildi'}
                    </Text>
                </View>
            </View>

            <Text style={styles.category}>{item.category}</Text>

            {(item.electrician || item.citizen) && (
                <View style={styles.row}>
                    <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
                    <Text style={styles.personName}>
                        {item.electrician?.fullName || item.citizen?.fullName}
                    </Text>
                </View>
            )}

            <View style={styles.row}>
                <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.value}>
                    {formatDate(item.status === 'COMPLETED' ? item.completedAt : item.cancelledAt)}
                </Text>
            </View>

            {item.status === 'COMPLETED' && item.hasReview && item.rating && (
                <View style={styles.row}>
                    <Ionicons name="star" size={16} color={colors.warning} />
                    <Text style={styles.rating}>{item.rating}/5 puan verildi</Text>
                </View>
            )}

            {item.cancellationReason && (
                <View style={styles.reasonContainer}>
                    <Text style={styles.reasonLabel}>İptal Nedeni:</Text>
                    <Text style={styles.reasonText}>{item.cancellationReason}</Text>
                </View>
            )}

            <View style={styles.divider} />

            <View style={styles.footer}>
                <Text style={styles.priceLabel}>Toplam Tutar</Text>
                <Text style={styles.price}>{formatPrice(item.finalPrice)}</Text>
            </View>
        </Card>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={jobs}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[colors.primary]}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="time-outline" size={64} color={colors.textSecondary} />
                        <Text style={styles.emptyTitle}>Henüz Geçmiş İş Yok</Text>
                        <Text style={styles.emptyText}>
                            Tamamladığınız veya iptal edilen işler burada görünecektir.
                        </Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.backgroundLight,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.backgroundLight,
    },
    content: {
        padding: spacing.md,
        flexGrow: 1,
    },
    card: {
        padding: spacing.md,
        marginBottom: spacing.md,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    serviceName: {
        ...typography.h6,
        color: colors.text,
        flex: 1,
        marginRight: spacing.sm,
    },
    statusBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: spacing.radius.sm,
    },
    status: {
        ...typography.caption,
        fontWeight: 'bold',
    },
    category: {
        ...typography.caption,
        color: colors.textSecondary,
        marginBottom: spacing.sm,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.xs,
    },
    personName: {
        ...typography.body2,
        color: colors.text,
        marginLeft: spacing.sm,
    },
    value: {
        ...typography.body2,
        color: colors.textSecondary,
        marginLeft: spacing.sm,
    },
    rating: {
        ...typography.body2,
        color: colors.warning,
        marginLeft: spacing.sm,
        fontWeight: '600',
    },
    reasonContainer: {
        backgroundColor: colors.errorLight,
        padding: spacing.sm,
        borderRadius: spacing.radius.sm,
        marginTop: spacing.sm,
    },
    reasonLabel: {
        ...typography.caption,
        color: colors.error,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    reasonText: {
        ...typography.caption,
        color: colors.error,
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: spacing.sm,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    priceLabel: {
        ...typography.body2,
        color: colors.textSecondary,
    },
    price: {
        ...typography.h5,
        color: colors.primary,
        fontWeight: 'bold',
    },
    emptyContainer: {
        flex: 1,
        padding: spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: spacing.xl * 2,
    },
    emptyTitle: {
        ...typography.h5,
        color: colors.text,
        marginTop: spacing.md,
        marginBottom: spacing.sm,
    },
    emptyText: {
        ...typography.body1,
        color: colors.textSecondary,
        textAlign: 'center',
    },
});
