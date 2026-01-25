import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, TextInput } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import { colors as staticColors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';
import { useAppColors } from '../../hooks/useAppColors';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';

export default function AdminJobsScreen() {
    const router = useRouter();
    const colors = useAppColors();
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Pagination State
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);

    const fetchJobs = async (pageNum: number = 1, shouldRefresh: boolean = false) => {
        if (loading && pageNum > 1) return; // Prevent double loading

        try {
            if (pageNum === 1 && !shouldRefresh) setLoading(true); // Only show initial loader
            const limit = 20;
            const response = await api.get(`/admin/jobs?page=${pageNum}&limit=${limit}`);

            if (response.data.success) {
                const newJobs = response.data.data;
                const pagination = response.data.pagination;

                if (pageNum === 1) {
                    setJobs(newJobs);
                } else {
                    setJobs(prev => [...prev, ...newJobs]);
                }

                setHasMore(pagination ? pagination.hasMore : false);
                setPage(pageNum);
            }
        } catch (error) {
            console.error('Fetch jobs error:', error);
            Alert.alert('Hata', 'İlanlar yüklenemedi');
        } finally {
            setLoading(false);
            setRefreshing(false);
            setIsFetchingMore(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchJobs(1);
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        setHasMore(true); // Reset hasMore on refresh
        fetchJobs(1, true);
    };

    const loadMore = () => {
        if (!hasMore || isFetchingMore || loading || refreshing) return;
        setIsFetchingMore(true);
        fetchJobs(page + 1);
    };

    const handleDelete = (jobId: string) => {
        Alert.alert(
            'İlanı Sil',
            'Bu ilanı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Sil',
                    style: 'destructive',
                    onPress: async () => {
                        setDeletingId(jobId);
                        try {
                            const response = await api.delete(`/admin/jobs/${jobId}`);
                            if (response.data.success) {
                                Alert.alert('Başarılı', 'İlan silindi');
                                // Refresh list to remove deleted item accurately
                                onRefresh();
                            }
                        } catch (error) {
                            Alert.alert('Hata', 'İlan silinemedi');
                        } finally {
                            setDeletingId(null);
                        }
                    }
                }
            ]
        );
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'OPEN': return '#10B981';     // Green
            case 'BIDDING': return '#3B82F6';  // Blue
            case 'IN_PROGRESS': return '#F59E0B'; // Orange
            case 'COMPLETED': return '#64748B'; // Gray
            case 'CANCELLED': return '#EF4444'; // Red
            default: return '#64748B';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'OPEN': return 'Açık';
            case 'BIDDING': return 'Teklif Bekliyor';
            case 'IN_PROGRESS': return 'İşlemde';
            case 'COMPLETED': return 'Tamamlandı';
            case 'CANCELLED': return 'İptal Edildi';
            default: return status;
        }
    };

    // Note: Filtering logic currently happens on client-side for demonstrated purposes.
    // For large datasets, search should also move to backend.
    const filteredJobs = jobs.filter(job => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            job.title?.toLowerCase().includes(q) ||
            job.citizen?.fullName?.toLowerCase().includes(q) ||
            job.category?.toLowerCase().includes(q) ||
            job.location?.city?.toLowerCase().includes(q)
        );
    });

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.headerLeft}>
                    <Text style={styles.jobTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.category}>{item.category} • {item.location?.city || 'Şehir Yok'}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                        {getStatusText(item.status)}
                    </Text>
                </View>
            </View>

            <View style={styles.divider} />

            {item.description && (
                <Text style={styles.description} numberOfLines={2}>
                    {item.description}
                </Text>
            )}

            <View style={styles.detailsRow}>
                <View style={styles.detailItem}>
                    <Ionicons name="person-outline" size={14} color={staticColors.textSecondary} />
                    <Text style={styles.detailText}>{item.citizen?.fullName || 'Bilinmeyen'}</Text>
                </View>
                <View style={styles.detailItem}>
                    <Ionicons name="calendar-outline" size={14} color={staticColors.textSecondary} />
                    <Text style={styles.detailText}>{new Date(item.createdAt).toLocaleDateString('tr-TR')}</Text>
                </View>
            </View>

            <View style={styles.actionRow}>
                <Text style={styles.bidCount}>{item.bidCount || 0} Teklif</Text>

                <TouchableOpacity
                    style={[styles.deleteBtn, deletingId === item.id && styles.disabledBtn]}
                    onPress={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
                >
                    {deletingId === item.id ? (
                        <ActivityIndicator size="small" color="#EF4444" />
                    ) : (
                        <>
                            <Ionicons name="trash-outline" size={16} color="#EF4444" style={{ marginRight: 4 }} />
                            <Text style={styles.deleteText}>Sil</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderFooter = () => {
        if (!isFetchingMore) return null;
        return (
            <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.primary} />
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <PremiumHeader title="İlan Yönetimi" showBackButton />

            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color={staticColors.textSecondary} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="İlan başlığı, kullanıcı veya şehir ara..."
                        placeholderTextColor={staticColors.textLight}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={18} color={staticColors.textLight} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={filteredJobs}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Text style={styles.emptyText}>
                                {searchQuery ? 'Arama kriterlerine uygun ilan bulunamadı.' : 'Henüz hiç ilan yok.'}
                            </Text>
                        </View>
                    }
                    onEndReached={loadMore}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={renderFooter}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    searchContainer: {
        paddingHorizontal: spacing.md,
        paddingTop: spacing.sm,
        paddingBottom: spacing.sm,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 48,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontFamily: fonts.medium,
        fontSize: 14,
        color: staticColors.text,
    },
    list: {
        padding: spacing.md,
        paddingBottom: 20,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12
    },
    headerLeft: {
        flex: 1,
        marginRight: 10
    },
    jobTitle: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: staticColors.text,
        marginBottom: 4
    },
    category: {
        fontFamily: fonts.medium,
        fontSize: 12,
        color: staticColors.textSecondary
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: {
        fontFamily: fonts.bold,
        fontSize: 11,
    },
    divider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginVertical: 12
    },
    detailsRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 12
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    detailText: {
        fontFamily: fonts.medium,
        fontSize: 13,
        color: staticColors.textSecondary
    },
    description: {
        fontFamily: fonts.regular,
        fontSize: 14,
        color: staticColors.text,
        marginBottom: 12,
        lineHeight: 20
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4
    },
    bidCount: {
        fontFamily: fonts.bold,
        fontSize: 13,
        color: staticColors.text
    },
    deleteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: '#FEF2F2', // Light red
        borderWidth: 1,
        borderColor: '#FEE2E2'
    },
    disabledBtn: {
        opacity: 0.7
    },
    deleteText: {
        fontFamily: fonts.bold,
        fontSize: 13,
        color: '#EF4444'
    },
    emptyText: {
        fontFamily: fonts.medium,
        color: staticColors.textSecondary,
        fontSize: 14
    },
    footerLoader: {
        paddingVertical: 20,
        alignItems: 'center',
    }
});
