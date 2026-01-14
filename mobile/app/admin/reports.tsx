import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import { Card } from '../../components/common/Card';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/typography';
import { spacing } from '../../constants/spacing';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../services/api';

interface Stats {
    users: {
        total: number;
        citizens: number;
        electricians: number;
        admins: number;
    };
    serviceCategories: {
        elektrik: number;
        cilingir: number;
        klima: number;
        'beyaz-esya': number;
        tesisat: number;
    };
    status: {
        verified: number;
        pending: number;
        suspended: number;
    };
    activity: {
        jobs: { total: number; open: number; completed: number; cancelled: number };
        bids: { total: number; accepted: number };
        totalCredits: number;
    };
    regions: Array<{
        city: string;
        electricians: number;
        citizens: number;
        total: number;
    }>;
}

const SERVICE_CATEGORY_INFO = [
    { id: 'elektrik', name: 'Elektrikçi', icon: 'flash', color: '#F59E0B' },
    { id: 'cilingir', name: 'Çilingir', icon: 'key', color: '#6366F1' },
    { id: 'klima', name: 'Klima', icon: 'snow', color: '#06B6D4' },
    { id: 'beyaz-esya', name: 'Beyaz Eşya', icon: 'cube', color: '#8B5CF6' },
    { id: 'tesisat', name: 'Tesisat', icon: 'water', color: '#3B82F6' },
];

export default function AdminReportsScreen() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchStats = useCallback(async () => {
        try {
            const response = await api.get('/admin/stats');
            if (response.data.success) {
                setStats(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchStats();
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <PremiumHeader title="Sistem Raporları" showBackButton />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Yükleniyor...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <PremiumHeader title="Sistem Raporları" showBackButton />

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                showsVerticalScrollIndicator={false}
            >
                {/* User Summary */}
                <Text style={styles.sectionTitle}>👥 Kullanıcı Özeti</Text>
                <View style={styles.summaryGrid}>
                    <StatCard
                        value={stats?.users.total || 0}
                        label="Toplam"
                        icon="people"
                        color="#6366F1"
                    />
                    <StatCard
                        value={stats?.users.citizens || 0}
                        label="Vatandaş"
                        icon="home"
                        color="#8B5CF6"
                    />
                    <StatCard
                        value={stats?.users.electricians || 0}
                        label="Usta"
                        icon="construct"
                        color="#10B981"
                    />
                </View>

                {/* Service Categories */}
                <Text style={styles.sectionTitle}>🔧 Hizmet Türleri</Text>
                <Card style={styles.categoryCard}>
                    {SERVICE_CATEGORY_INFO.map((cat) => (
                        <View key={cat.id} style={styles.categoryRow}>
                            <View style={[styles.categoryIcon, { backgroundColor: cat.color + '15' }]}>
                                <Ionicons name={cat.icon as any} size={20} color={cat.color} />
                            </View>
                            <Text style={styles.categoryName}>{cat.name}</Text>
                            <View style={styles.categoryCountBadge}>
                                <Text style={styles.categoryCount}>
                                    {stats?.serviceCategories[cat.id as keyof typeof stats.serviceCategories] || 0}
                                </Text>
                            </View>
                        </View>
                    ))}
                </Card>

                {/* Platform Activity */}
                <Text style={styles.sectionTitle}>📊 Platform Aktivitesi</Text>
                <View style={styles.activityGrid}>
                    <ActivityCard
                        title="İlanlar"
                        items={[
                            { label: 'Toplam', value: stats?.activity.jobs.total || 0, color: '#6366F1' },
                            { label: 'Açık', value: stats?.activity.jobs.open || 0, color: '#10B981' },
                            { label: 'Tamamlanan', value: stats?.activity.jobs.completed || 0, color: '#3B82F6' },
                            { label: 'İptal', value: stats?.activity.jobs.cancelled || 0, color: '#EF4444' },
                        ]}
                    />
                    <ActivityCard
                        title="Teklifler"
                        items={[
                            { label: 'Toplam', value: stats?.activity.bids.total || 0, color: '#8B5CF6' },
                            { label: 'Kabul', value: stats?.activity.bids.accepted || 0, color: '#10B981' },
                        ]}
                    />
                </View>

                {/* Credits */}
                <Card style={styles.creditCard}>
                    <LinearGradient
                        colors={['#F59E0B', '#D97706']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.creditGradient}
                    >
                        <Ionicons name="flash" size={32} color="#FFF" />
                        <View style={styles.creditInfo}>
                            <Text style={styles.creditLabel}>Platformdaki Toplam Kredi</Text>
                            <Text style={styles.creditValue}>{stats?.activity.totalCredits || 0}</Text>
                        </View>
                    </LinearGradient>
                </Card>

                {/* Status */}
                <Text style={styles.sectionTitle}>✅ Durum Kontrolü</Text>
                <View style={styles.statusGrid}>
                    <StatusBadge
                        value={stats?.status.verified || 0}
                        label="Onaylı"
                        icon="shield-checkmark"
                        color="#10B981"
                    />
                    <StatusBadge
                        value={stats?.status.pending || 0}
                        label="Bekleyen"
                        icon="time"
                        color="#F59E0B"
                    />
                    <StatusBadge
                        value={stats?.status.suspended || 0}
                        label="Askıda"
                        icon="ban"
                        color="#EF4444"
                    />
                </View>

                {/* Regional Distribution */}
                <Text style={styles.sectionTitle}>📍 Bölge Dağılımı</Text>
                <Card style={styles.regionCard}>
                    {stats?.regions && stats.regions.length > 0 ? (
                        <>
                            <View style={styles.regionHeader}>
                                <Text style={styles.regionHeaderText}>Şehir</Text>
                                <Text style={styles.regionHeaderText}>Usta</Text>
                                <Text style={styles.regionHeaderText}>Vatandaş</Text>
                            </View>
                            {stats.regions.map((region, index) => (
                                <View key={region.city} style={[styles.regionRow, index === stats.regions.length - 1 && { borderBottomWidth: 0 }]}>
                                    <View style={styles.regionCityContainer}>
                                        <Ionicons name="location" size={16} color={colors.primary} />
                                        <Text style={styles.regionCity}>{region.city}</Text>
                                    </View>
                                    <Text style={styles.regionCount}>{region.electricians}</Text>
                                    <Text style={styles.regionCount}>{region.citizens}</Text>
                                </View>
                            ))}
                        </>
                    ) : (
                        <Text style={styles.noDataText}>Bölge verisi bulunamadı</Text>
                    )}
                </Card>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

// Stat Card Component
const StatCard = ({ value, label, icon, color }: { value: number; label: string; icon: string; color: string }) => (
    <View style={[styles.statCard, { shadowColor: color }]}>
        <LinearGradient
            colors={['#FFFFFF', '#F8FAFC']}
            style={styles.statCardGradient}
        >
            <View style={[styles.statIconBox, { backgroundColor: color + '15' }]}>
                <Ionicons name={icon as any} size={24} color={color} />
            </View>
            <Text style={[styles.statValue, { color }]}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </LinearGradient>
    </View>
);

// Activity Card Component
const ActivityCard = ({ title, items }: { title: string; items: Array<{ label: string; value: number; color: string }> }) => (
    <Card style={styles.activityCard}>
        <Text style={styles.activityTitle}>{title}</Text>
        {items.map((item, index) => (
            <View key={index} style={styles.activityRow}>
                <View style={[styles.activityDot, { backgroundColor: item.color }]} />
                <Text style={styles.activityLabel}>{item.label}</Text>
                <Text style={[styles.activityValue, { color: item.color }]}>{item.value}</Text>
            </View>
        ))}
    </Card>
);

// Status Badge Component
const StatusBadge = ({ value, label, icon, color }: { value: number; label: string; icon: string; color: string }) => (
    <View style={[styles.statusBadge, { backgroundColor: color + '10', borderColor: color + '30' }]}>
        <Ionicons name={icon as any} size={20} color={color} />
        <Text style={[styles.statusValue, { color }]}>{value}</Text>
        <Text style={styles.statusLabel}>{label}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    content: {
        padding: spacing.md,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontFamily: fonts.medium,
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: 12,
    },
    sectionTitle: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: colors.text,
        marginTop: 20,
        marginBottom: 12,
    },
    summaryGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    statCard: {
        flex: 1,
        borderRadius: 16,
        overflow: 'hidden',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    statCardGradient: {
        padding: 16,
        alignItems: 'center',
    },
    statIconBox: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    statValue: {
        fontFamily: fonts.extraBold,
        fontSize: 28,
    },
    statLabel: {
        fontFamily: fonts.medium,
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
    },
    categoryCard: {
        borderRadius: 16,
        padding: 8,
    },
    categoryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    categoryIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    categoryName: {
        flex: 1,
        fontFamily: fonts.semiBold,
        fontSize: 15,
        color: colors.text,
    },
    categoryCountBadge: {
        backgroundColor: colors.primary + '15',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
    },
    categoryCount: {
        fontFamily: fonts.bold,
        fontSize: 14,
        color: colors.primary,
    },
    activityGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    activityCard: {
        flex: 1,
        padding: 16,
        borderRadius: 16,
    },
    activityTitle: {
        fontFamily: fonts.bold,
        fontSize: 14,
        color: colors.text,
        marginBottom: 12,
    },
    activityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    activityDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8,
    },
    activityLabel: {
        flex: 1,
        fontFamily: fonts.medium,
        fontSize: 13,
        color: colors.textSecondary,
    },
    activityValue: {
        fontFamily: fonts.bold,
        fontSize: 14,
    },
    creditCard: {
        marginTop: 16,
        borderRadius: 16,
        overflow: 'hidden',
        padding: 0,
    },
    creditGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        gap: 16,
    },
    creditInfo: {
        flex: 1,
    },
    creditLabel: {
        fontFamily: fonts.medium,
        fontSize: 13,
        color: 'rgba(255,255,255,0.8)',
    },
    creditValue: {
        fontFamily: fonts.extraBold,
        fontSize: 32,
        color: '#FFF',
    },
    statusGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    statusBadge: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    statusValue: {
        fontFamily: fonts.extraBold,
        fontSize: 24,
        marginVertical: 4,
    },
    statusLabel: {
        fontFamily: fonts.medium,
        fontSize: 11,
        color: colors.textSecondary,
    },
    regionCard: {
        borderRadius: 16,
        padding: 0,
        overflow: 'hidden',
    },
    regionHeader: {
        flexDirection: 'row',
        backgroundColor: colors.primary + '10',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    regionHeaderText: {
        flex: 1,
        fontFamily: fonts.bold,
        fontSize: 12,
        color: colors.primary,
        textAlign: 'center',
    },
    regionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    regionCityContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    regionCity: {
        fontFamily: fonts.semiBold,
        fontSize: 14,
        color: colors.text,
    },
    regionCount: {
        flex: 1,
        fontFamily: fonts.bold,
        fontSize: 14,
        color: colors.text,
        textAlign: 'center',
    },
    noDataText: {
        fontFamily: fonts.medium,
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        padding: 20,
    },
});
