import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../components/common/Card';
import { colors as staticColors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';
import { useAppColors } from '../../hooks/useAppColors';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import api from '../../services/api';
import { useAppSelector } from '../../hooks/redux';

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
    const colors = useAppColors();
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
                                        backgroundColor: item.amount > 0 ? colors.primary : staticColors.border,
                                    }
                                ]}
                            />
                        </View>
                        <Text style={[barStyles.label, { color: colors.textSecondary }]}>{item.day}</Text>
                        {item.amount > 0 && (
                            <Text style={[barStyles.amount, { color: colors.primary }]}>{formatCompact(item.amount)}</Text>
                        )}
                    </View>
                );
            })}
        </View>
    );
};

// Pasta grafik yerine yatay çubuk grafik
const HorizontalBarChart = ({ data }: { data: CategoryItem[] }) => {
    const colors = useAppColors();
    const maxCount = Math.max(...data.map(d => d.count), 1);
    const chartColors = [colors.primary, colors.secondary, colors.success, colors.warning, colors.info];

    return (
        <View style={hBarStyles.container}>
            {data.map((item, index) => {
                const barWidth = (item.count / maxCount) * 100;
                return (
                    <View key={index} style={hBarStyles.row}>
                        <Text style={[hBarStyles.label, { color: colors.text }]} numberOfLines={1}>{item.category}</Text>
                        <View style={[hBarStyles.barContainer, { backgroundColor: colors.backgroundLight }]}>
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
                        <Text style={[hBarStyles.count, { color: colors.text }]}>{item.count}</Text>
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
    const colors = useAppColors();
    const { isAuthenticated } = useAppSelector((state) => state.auth);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchStats = async () => {
        try {
            const response = await api.get('/users/stats');
            if (response.data.success) {
                setStats(response.data.data);
            }
        } catch (error: any) {
            console.error('Error fetching stats:', error);
            if (error.response?.status === 401) {
                // If unauthorized, redirect to login
                router.replace('/(auth)/login');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            fetchStats();
        } else {
            setLoading(false);
            router.replace('/(auth)/login');
        }
    }, [isAuthenticated]);

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
            style={[styles.container, { backgroundColor: colors.backgroundDark }]}
            contentContainerStyle={styles.content}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
        >
            <PremiumHeader
                title="İstatistiklerim"
                subtitle="Performans ve Kazanç Özeti"
                showBackButton
            />

            <View style={styles.overviewContainer}>
                <Card style={[styles.earningsCard, { backgroundColor: colors.primary, shadowColor: colors.primary }]} elevated>
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
            <Card style={[styles.chartCard, { shadowColor: colors.primary }]} elevated>
                <View style={styles.chartHeader}>
                    <View>
                        <Text style={[styles.chartTitle, { color: colors.text }]}>Haftalık Kazanç</Text>
                        <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>Son 7 gün: {weeklyTotal.toLocaleString('tr-TR')} ₺</Text>
                    </View>
                    <Ionicons name="bar-chart-outline" size={20} color={colors.textSecondary} />
                </View>
                {stats?.weeklyEarnings && stats.weeklyEarnings.length > 0 ? (
                    <BarChart data={stats.weeklyEarnings} />
                ) : (
                    <View style={styles.noDataContainer}>
                        <Text style={[styles.noDataText, { color: colors.textSecondary }]}>Henüz veri yok</Text>
                    </View>
                )}
            </Card>

            {/* Kategori Dağılımı */}
            <Card style={[styles.chartCard, { shadowColor: colors.primary }]} elevated>
                <View style={styles.chartHeader}>
                    <Text style={[styles.chartTitle, { color: colors.text }]}>Kategori Dağılımı</Text>
                    <Ionicons name="pie-chart-outline" size={20} color={colors.textSecondary} />
                </View>
                {stats?.categoryDistribution && stats.categoryDistribution.length > 0 ? (
                    <HorizontalBarChart data={stats.categoryDistribution} />
                ) : (
                    <View style={styles.noDataContainer}>
                        <Text style={[styles.noDataText, { color: colors.textSecondary }]}>Henüz veri yok</Text>
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
        marginTop: 8,
    },
    amount: {
        fontFamily: fonts.semiBold,
        fontSize: 9,
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
        width: 90,
    },
    barContainer: {
        flex: 1,
        height: 16,
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
        width: 24,
        textAlign: 'right',
    },
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: spacing.screenPadding,
        paddingBottom: 40,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    overviewContainer: {
        marginBottom: spacing.lg,
    },
    earningsCard: {
        alignItems: 'center',
        padding: spacing.xl,
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
        color: staticColors.white,
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
        color: staticColors.white,
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
        marginBottom: 2,
    },
    statLabel: {
        fontFamily: fonts.regular,
        fontSize: 12,
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
    },
    chartSubtitle: {
        fontFamily: fonts.regular,
        fontSize: 12,
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
    },
});
