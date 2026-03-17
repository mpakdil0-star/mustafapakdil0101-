import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    ActivityIndicator,
    TouchableOpacity,
    Dimensions,
    StatusBar,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
const BarChart = ({ data, maxHeight = 90 }: { data: WeeklyEarning[]; maxHeight?: number }) => {
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
    const insets = useSafeAreaInsets();
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
        <View style={[styles.container, { backgroundColor: colors.backgroundDark }]}>
            <StatusBar barStyle="dark-content" />

            {/* Premium Header with Safe Area handling */}
            <View style={{ height: 60 + insets.top }}>
                <PremiumHeader
                    title="İstatistiklerim"
                    subtitle="Performans ve Kazanç Özeti"
                    showBackButton
                    variant="transparent"
                />
            </View>

            <ScrollView
                style={styles.container}
                contentContainerStyle={[
                    styles.content,
                    { paddingBottom: Math.max(insets.bottom, 24) }
                ]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                <View style={styles.overviewContainer}>
                    <LinearGradient
                        colors={[colors.primary, colors.primaryDark || colors.primary]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.premiumEarningsCard}
                    >
                        <View style={styles.earningsContent}>
                            <View style={styles.earningsHeader}>
                                <View style={styles.earningsIconBox}>
                                    <Ionicons name="wallet-outline" size={20} color="#FFF" />
                                </View>
                                <Text style={styles.earningsLabel}>Toplam Kazanç</Text>
                            </View>
                            <Text style={styles.earningsValue}>
                                {stats?.totalEarnings.toLocaleString('tr-TR')} <Text style={styles.currency}>₺</Text>
                            </Text>
                            <View style={styles.periodBadge}>
                                <Ionicons name="calendar-outline" size={10} color="#FFF" />
                                <Text style={styles.periodText}>Tüm Zamanlar</Text>
                            </View>
                        </View>
                    </LinearGradient>
                </View>

                <View style={styles.statsGrid}>
                    <Card style={styles.statCard}>
                        <View style={[styles.iconContainer, { backgroundColor: colors.primary + '10' }]}>
                            <Ionicons name="briefcase-outline" size={20} color={colors.primary} />
                        </View>
                        <Text style={[styles.statValue, { color: colors.text }]}>{stats?.totalBids}</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Verilen Teklif</Text>
                    </Card>

                    <Card style={styles.statCard}>
                        <View style={[styles.iconContainer, { backgroundColor: '#FFF7ED' }]}>
                            <Ionicons name="hammer-outline" size={20} color="#F97316" />
                        </View>
                        <Text style={[styles.statValue, { color: colors.text }]}>{stats?.activeJobs}</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Devam Eden</Text>
                    </Card>

                    <Card style={styles.statCard}>
                        <View style={[styles.iconContainer, { backgroundColor: '#F0FDF4' }]}>
                            <Ionicons name="checkmark-done" size={20} color="#10B981" />
                        </View>
                        <Text style={[styles.statValue, { color: colors.text }]}>{stats?.completedJobs}</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Tamamlanan</Text>
                    </Card>

                    <Card style={styles.statCard}>
                        <View style={[styles.iconContainer, { backgroundColor: '#FEF9C3' }]}>
                            <Ionicons name="star-outline" size={20} color="#F59E0B" />
                        </View>
                        <Text style={[styles.statValue, { color: colors.text }]}>{Number(stats?.rating || 0).toFixed(1)}</Text>
                        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{stats?.reviewCount} Değerlendirme</Text>
                    </Card>
                </View>

                {/* Haftalık Kazanç Grafiği */}
                <Card style={styles.chartCard}>
                    <View style={styles.chartHeader}>
                        <View style={styles.chartTitleBox}>
                            <View style={[styles.chartIndicator, { backgroundColor: colors.primary }]} />
                            <Text style={[styles.chartTitle, { color: colors.text }]}>Haftalık Kazanç</Text>
                        </View>
                        <View style={styles.chartMeta}>
                            <Text style={[styles.chartSubtitle, { color: colors.textSecondary }]}>Toplam: {weeklyTotal.toLocaleString('tr-TR')} ₺</Text>
                        </View>
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
                <Card style={styles.chartCard}>
                    <View style={styles.chartHeader}>
                        <View style={styles.chartTitleBox}>
                            <View style={[styles.chartIndicator, { backgroundColor: colors.secondary || colors.primary }]} />
                            <Text style={[styles.chartTitle, { color: colors.text }]}>Kategori Dağılımı</Text>
                        </View>
                        <Ionicons name="stats-chart-outline" size={16} color={colors.textLight} />
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
        </View>
    );
}

const barStyles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        height: 120,
        paddingTop: 16,
    },
    barContainer: {
        flex: 1,
        alignItems: 'center',
    },
    barWrapper: {
        height: 90,
        justifyContent: 'flex-end',
        width: '100%',
        alignItems: 'center',
    },
    bar: {
        width: 20,
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
        fontFamily: fonts.bold,
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
        padding: 12,
        paddingBottom: 24,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    overviewContainer: {
        marginBottom: 12,
    },
    premiumEarningsCard: {
        borderRadius: 20,
        padding: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    earningsContent: {
        alignItems: 'flex-start',
    },
    earningsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    earningsIconBox: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    earningsLabel: {
        fontFamily: fonts.medium,
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.9)',
    },
    earningsValue: {
        fontFamily: fonts.black,
        fontSize: 32,
        color: staticColors.white,
        marginBottom: 8,
    },
    currency: {
        fontSize: 20,
        fontFamily: fonts.bold,
    },
    periodBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    periodText: {
        fontFamily: fonts.bold,
        fontSize: 10,
        color: staticColors.white,
        textTransform: 'uppercase',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 12,
    },
    statCard: {
        width: (screenWidth - 34) / 2, // 12+12+10 spacing/gap
        padding: 10,
        alignItems: 'center',
        borderRadius: 16,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    statValue: {
        fontFamily: fonts.black,
        fontSize: 18,
        marginBottom: 1,
    },
    statLabel: {
        fontFamily: fonts.medium,
        fontSize: 11,
        textAlign: 'center',
    },
    chartCard: {
        padding: 14,
        marginBottom: 12,
        borderRadius: 18,
    },
    chartHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    chartTitleBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    chartIndicator: {
        width: 4,
        height: 16,
        borderRadius: 2,
    },
    chartTitle: {
        fontFamily: fonts.black,
        fontSize: 15,
    },
    chartMeta: {
        alignItems: 'flex-end',
    },
    chartSubtitle: {
        fontFamily: fonts.bold,
        fontSize: 11,
    },
    noDataContainer: {
        height: 80,
        justifyContent: 'center',
        alignItems: 'center',
    },
    noDataText: {
        fontFamily: fonts.medium,
        fontSize: 13,
    },
});
