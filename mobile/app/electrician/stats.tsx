import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../components/common/Card';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';
import api from '../../services/api';

const { width: screenWidth } = Dimensions.get('window');

interface WeeklyEarning {
    day: string;
    amount: number;
}

interface CategoryItem {
    category: string;
    count: number;
}

interface Stats {
    totalBids: number;
    activeBids: number;
    activeJobs: number;
    completedJobs: number;
    totalEarnings: number;
    rating: number;
    reviewCount: number;
    weeklyEarnings: WeeklyEarning[];
    categoryDistribution: CategoryItem[];
}

// Basit çubuk grafik komponenti
const BarChart = ({ data, maxHeight = 120 }: { data: WeeklyEarning[]; maxHeight?: number }) => {
    const maxAmount = Math.max(...data.map(d => d.amount), 1);

    return (
        <View style={barStyles.container}>
            {data.map((item, index) => {
                const barHeight = (item.amount / maxAmount) * maxHeight;
                return (
                    <View key={index} style={barStyles.barContainer}>
                        <View style={barStyles.barWrapper}>
                            <View
                                style={[
                                    barStyles.bar,
                                    {
                                        height: barHeight || 4,
                                        backgroundColor: item.amount > 0 ? colors.primary : colors.border,
                                    }
                                ]}
                            />
                        </View>
                        <Text style={barStyles.label}>{item.day}</Text>
                        {item.amount > 0 && (
                            <Text style={barStyles.amount}>{formatCompact(item.amount)}</Text>
                        )}
                    </View>
                );
            })}
        </View>
    );
};

// Pasta grafik yerine yatay çubuk grafik
const HorizontalBarChart = ({ data }: { data: CategoryItem[] }) => {
    const maxCount = Math.max(...data.map(d => d.count), 1);
    const chartColors = [colors.primary, colors.secondary, colors.success, colors.warning, colors.info];

    return (
        <View style={hBarStyles.container}>
            {data.map((item, index) => {
                const barWidth = (item.count / maxCount) * 100;
                return (
                    <View key={index} style={hBarStyles.row}>
                        <Text style={hBarStyles.label} numberOfLines={1}>{item.category}</Text>
                        <View style={hBarStyles.barContainer}>
                            <View
                                style={[
                                    hBarStyles.bar,
                                    {
                                        width: `${barWidth}%`,
                                        backgroundColor: chartColors[index % chartColors.length],
                                    }
                                ]}
                            />
                        </View>
                        <Text style={hBarStyles.count}>{item.count}</Text>
                    </View>
                );
            })}
        </View>
    );
};

const formatCompact = (num: number): string => {
    if (num >= 1000) {
        return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
};

export default function StatisticsScreen() {
    const router = useRouter();
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchStats = async () => {
        try {
            const response = await api.get('/users/stats');
            if (response.data.success) {
                setStats(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchStats();
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    const weeklyTotal = stats?.weeklyEarnings?.reduce((sum, item) => sum + item.amount, 0) || 0;

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>İstatistiklerim</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.overviewContainer}>
                <Card style={styles.earningsCard} elevated>
                    <Text style={styles.earningsLabel}>Toplam Kazanç</Text>
                    <Text style={styles.earningsValue}>
                        {stats?.totalEarnings.toLocaleString('tr-TR')} ₺
                    </Text>
                    <View style={styles.periodBadge}>
                        <Text style={styles.periodText}>Tüm Zamanlar</Text>
                    </View>
                </Card>
            </View>

            <View style={styles.statsGrid}>
                <Card style={styles.statCard}>
                    <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight + '20' }]}>
                        <Ionicons name="briefcase" size={24} color={colors.primary} />
                    </View>
                    <Text style={styles.statValue}>{stats?.totalBids}</Text>
                    <Text style={styles.statLabel}>Verilen Teklif</Text>
                </Card>

                <Card style={styles.statCard}>
                    <View style={[styles.iconContainer, { backgroundColor: colors.warning + '20' }]}>
                        <Ionicons name="hammer" size={24} color={colors.warning} />
                    </View>
                    <Text style={styles.statValue}>{stats?.activeJobs}</Text>
                    <Text style={styles.statLabel}>Devam Eden</Text>
                </Card>

                <Card style={styles.statCard}>
                    <View style={[styles.iconContainer, { backgroundColor: colors.success + '20' }]}>
                        <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                    </View>
                    <Text style={styles.statValue}>{stats?.completedJobs}</Text>
                    <Text style={styles.statLabel}>Tamamlanan</Text>
                </Card>

                <Card style={styles.statCard}>
                    <View style={[styles.iconContainer, { backgroundColor: colors.info + '20' }]}>
                        <Ionicons name="star" size={24} color={colors.info} />
                    </View>
                    <Text style={styles.statValue}>{stats?.rating.toFixed(1)}</Text>
                    <Text style={styles.statLabel}>{stats?.reviewCount} Değerlendirme</Text>
                </Card>
            </View>

            {/* Haftalık Kazanç Grafiği */}
            <Card style={styles.chartCard} elevated>
                <View style={styles.chartHeader}>
                    <View>
                        <Text style={styles.chartTitle}>Haftalık Kazanç</Text>
                        <Text style={styles.chartSubtitle}>Son 7 gün: {weeklyTotal.toLocaleString('tr-TR')} ₺</Text>
                    </View>
                    <Ionicons name="bar-chart-outline" size={20} color={colors.textSecondary} />
                </View>
                {stats?.weeklyEarnings && stats.weeklyEarnings.length > 0 ? (
                    <BarChart data={stats.weeklyEarnings} />
                ) : (
                    <View style={styles.noDataContainer}>
                        <Text style={styles.noDataText}>Henüz veri yok</Text>
                    </View>
                )}
            </Card>

            {/* Kategori Dağılımı */}
            <Card style={styles.chartCard} elevated>
                <View style={styles.chartHeader}>
                    <Text style={styles.chartTitle}>Kategori Dağılımı</Text>
                    <Ionicons name="pie-chart-outline" size={20} color={colors.textSecondary} />
                </View>
                {stats?.categoryDistribution && stats.categoryDistribution.length > 0 ? (
                    <HorizontalBarChart data={stats.categoryDistribution} />
                ) : (
                    <View style={styles.noDataContainer}>
                        <Text style={styles.noDataText}>Henüz veri yok</Text>
                    </View>
                )}
            </Card>
        </ScrollView>
    );
}

const barStyles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        height: 160,
        paddingTop: 20,
    },
    barContainer: {
        flex: 1,
        alignItems: 'center',
    },
    barWrapper: {
        height: 120,
        justifyContent: 'flex-end',
        width: '100%',
        alignItems: 'center',
    },
    bar: {
        width: 24,
        borderRadius: 4,
        minHeight: 4,
    },
    label: {
        fontFamily: fonts.medium,
        fontSize: 11,
        color: colors.textSecondary,
        marginTop: 8,
    },
    amount: {
        fontFamily: fonts.semiBold,
        fontSize: 9,
        color: colors.primary,
        marginTop: 2,
    },
});

const hBarStyles = StyleSheet.create({
    container: {
        gap: spacing.sm,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    label: {
        fontFamily: fonts.regular,
        fontSize: 12,
        color: colors.text,
        width: 90,
    },
    barContainer: {
        flex: 1,
        height: 16,
        backgroundColor: colors.backgroundLight,
        borderRadius: 8,
        overflow: 'hidden',
        marginHorizontal: spacing.sm,
    },
    bar: {
        height: '100%',
        borderRadius: 8,
    },
    count: {
        fontFamily: fonts.semiBold,
        fontSize: 12,
        color: colors.text,
        width: 24,
        textAlign: 'right',
    },
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.backgroundLight,
    },
    content: {
        padding: spacing.screenPadding,
        paddingBottom: 40,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.backgroundLight,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.lg,
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    headerTitle: {
        fontFamily: fonts.semiBold,
        fontSize: 18,
        color: colors.text,
    },
    overviewContainer: {
        marginBottom: spacing.lg,
    },
    earningsCard: {
        alignItems: 'center',
        padding: spacing.xl,
        backgroundColor: colors.primary,
    },
    earningsLabel: {
        fontFamily: fonts.medium,
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.9)',
        marginBottom: spacing.xs,
    },
    earningsValue: {
        fontFamily: fonts.bold,
        fontSize: 32,
        color: colors.white,
        marginBottom: spacing.md,
    },
    periodBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    periodText: {
        fontFamily: fonts.medium,
        fontSize: 12,
        color: colors.white,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
        marginBottom: spacing.lg,
    },
    statCard: {
        width: '47%',
        padding: spacing.md,
        alignItems: 'center',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    statValue: {
        fontFamily: fonts.bold,
        fontSize: 20,
        color: colors.text,
        marginBottom: 2,
    },
    statLabel: {
        fontFamily: fonts.regular,
        fontSize: 12,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    chartCard: {
        padding: spacing.lg,
        marginBottom: spacing.md,
    },
    chartHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.lg,
    },
    chartTitle: {
        fontFamily: fonts.semiBold,
        fontSize: 16,
        color: colors.text,
    },
    chartSubtitle: {
        fontFamily: fonts.regular,
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
    },
    noDataContainer: {
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    noDataText: {
        fontFamily: fonts.regular,
        fontSize: 14,
        color: colors.textSecondary,
    },
});
