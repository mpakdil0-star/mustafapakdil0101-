import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../components/common/Card';
import { colors as staticColors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import api from '../../services/api';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import { fonts } from '../../constants/typography';
import { useAppColors } from '../../hooks/useAppColors';

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
    const colors = useAppColors();

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
        <View style={[styles.card, { shadowColor: colors.primary }]}>
            <View style={styles.header}>
                <Text style={styles.serviceName} numberOfLines={1}>{item.title}</Text>
                <View style={[
                    styles.statusBadge,
                    { backgroundColor: item.status === 'COMPLETED' ? staticColors.success + '15' : staticColors.error + '15' }
                ]}>
                    <Text style={[
                        styles.status,
                        { color: item.status === 'COMPLETED' ? staticColors.success : staticColors.error }
                    ]}>
                        {item.status === 'COMPLETED' ? 'Tamamlandı' : 'İptal Edildi'}
                    </Text>
                </View>
            </View>

            <Text style={styles.category}>{item.category}</Text>

            <View style={styles.metaContainer}>
                {(item.electrician || item.citizen) && (
                    <View style={styles.metaItem}>
                        <View style={styles.metaIconWrapper}>
                            <Ionicons name="person-outline" size={12} color={colors.textLight} />
                        </View>
                        <Text style={styles.metaText}>
                            {item.electrician?.fullName || item.citizen?.fullName}
                        </Text>
                    </View>
                )}

                <View style={styles.metaItem}>
                    <View style={styles.metaIconWrapper}>
                        <Ionicons name="calendar-outline" size={12} color={colors.textLight} />
                    </View>
                    <Text style={styles.metaText}>
                        {formatDate(item.status === 'COMPLETED' ? item.completedAt : item.cancelledAt)}
                    </Text>
                </View>

                {item.status === 'COMPLETED' && item.hasReview && item.rating && (
                    <View style={styles.metaItem}>
                        <Ionicons name="star" size={12} color={staticColors.warning} />
                        <Text style={[styles.metaText, { color: staticColors.warning, fontFamily: fonts.bold }]}>
                            {item.rating}/5
                        </Text>
                    </View>
                )}
            </View>

            {item.cancellationReason && (
                <View style={[styles.reasonContainer, { backgroundColor: staticColors.error + '08' }]}>
                    <Ionicons name="alert-circle-outline" size={14} color={staticColors.error} />
                    <Text style={styles.reasonText} numberOfLines={2}>
                        {item.cancellationReason}
                    </Text>
                </View>
            )}

            <View style={styles.divider} />

            <View style={styles.footer}>
                <Text style={styles.priceLabel}>Toplam Tutar</Text>
                <Text style={[styles.price, { color: colors.primary }]}>{formatPrice(item.finalPrice)}</Text>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <PremiumHeader title="Geçmiş İşlerim" showBackButton />

            <FlatList
                data={jobs}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[colors.primary]}
                        tintColor={colors.primary}
                    />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <View style={[styles.emptyIconContainer, { shadowColor: colors.primary }]}>
                            <Ionicons name="time-outline" size={60} color={colors.primary + '40'} />
                        </View>
                        <Text style={styles.emptyTitle}>Henüz Geçmiş İş Yok</Text>
                        <Text style={styles.emptyText}>
                            Tamamladığınız veya iptal edilen işler burada listelenecektir.
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
        backgroundColor: '#F8FAFC',
    },
    content: {
        padding: spacing.lg,
        flexGrow: 1,
    },
    card: {
        borderRadius: 24,
        padding: 16,
        marginBottom: 16,
        backgroundColor: staticColors.white,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    serviceName: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: staticColors.text,
        flex: 1,
        marginRight: 10,
        letterSpacing: -0.5,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
    },
    status: {
        fontFamily: fonts.bold,
        fontSize: 11,
    },
    category: {
        fontFamily: fonts.medium,
        fontSize: 12,
        color: staticColors.textSecondary,
        marginBottom: 12,
    },
    metaContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 12,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    metaIconWrapper: {
        width: 20,
        height: 20,
        borderRadius: 6,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    metaText: {
        fontFamily: fonts.medium,
        fontSize: 12,
        color: staticColors.textSecondary,
    },
    reasonContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 12,
        marginBottom: 12,
        gap: 8,
    },
    reasonText: {
        fontFamily: fonts.medium,
        fontSize: 12,
        color: staticColors.error,
        flex: 1,
    },
    divider: {
        height: 1,
        backgroundColor: staticColors.borderLight,
        marginVertical: 12,
        opacity: 0.5,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    priceLabel: {
        fontFamily: fonts.medium,
        fontSize: 13,
        color: staticColors.textSecondary,
    },
    price: {
        fontFamily: fonts.extraBold,
        fontSize: 18,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 100,
        paddingHorizontal: 40,
    },
    emptyIconContainer: {
        width: 110,
        height: 110,
        borderRadius: 55,
        backgroundColor: staticColors.white,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 4,
    },
    emptyTitle: {
        fontFamily: fonts.bold,
        fontSize: 20,
        color: staticColors.text,
        marginBottom: 8,
    },
    emptyText: {
        fontFamily: fonts.medium,
        fontSize: 14,
        color: staticColors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
    },
});
