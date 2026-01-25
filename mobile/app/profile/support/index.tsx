import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PremiumHeader } from '../../../components/common/PremiumHeader';
import { colors as staticColors } from '../../../constants/colors';
import { spacing } from '../../../constants/spacing';
import { fonts } from '../../../constants/typography';
import { useAppColors } from '../../../hooks/useAppColors';
import api from '../../../services/api';

interface Ticket {
    id: string;
    subject: string;
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    ticketType: string;
    createdAt: string;
    priority: string;
}

export default function SupportTicketsScreen() {
    const router = useRouter();
    const colors = useAppColors();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchTickets = async () => {
        try {
            const response = await api.get('/support');
            if (response.data.success) {
                setTickets(response.data.data);
            }
        } catch (error) {
            console.error('Fetch tickets error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchTickets();
        }, [])
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchTickets();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'open': return '#3B82F6';
            case 'in_progress': return '#F59E0B';
            case 'resolved': return '#10B981';
            case 'closed': return '#64748B';
            default: return '#64748B';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'open': return 'Açık';
            case 'in_progress': return 'İnceleniyor';
            case 'resolved': return 'Çözüldü';
            case 'closed': return 'Kapandı';
            default: return status;
        }
    };

    const renderItem = ({ item }: { item: Ticket }) => (
        <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => router.push(`/profile/support/${item.id}`)}
        >
            <View style={styles.cardHeader}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
                    <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                        {getStatusText(item.status)}
                    </Text>
                </View>
                <Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString('tr-TR')}</Text>
            </View>

            <Text style={styles.subject}>{item.subject}</Text>

            <View style={styles.cardFooter}>
                <Text style={styles.type}>
                    {item.ticketType === 'complaint' ? 'Şikayet' :
                        item.ticketType === 'technical' ? 'Teknik' :
                            item.ticketType === 'refund' ? 'İade' : 'Soru'}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: staticColors.textLight, marginRight: 4 }}>Detay</Text>
                    <Ionicons name="chevron-forward" size={16} color={staticColors.textLight} />
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <PremiumHeader
                title="Destek Taleplerim"
                showBackButton
                rightElement={
                    <TouchableOpacity onPress={() => router.push('/profile/support/create')}>
                        <Ionicons name="add-circle" size={28} color="#fff" />
                    </TouchableOpacity>
                }
            />

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={tickets}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="chatbubbles-outline" size={64} color={staticColors.textLight} />
                            <Text style={styles.emptyText}>Henüz bir destek talebiniz yok.</Text>
                            <TouchableOpacity
                                style={[styles.createBtn, { backgroundColor: colors.primary }]}
                                onPress={() => router.push('/profile/support/create')}
                            >
                                <Text style={styles.createBtnText}>Yeni Talep Oluştur</Text>
                            </TouchableOpacity>
                        </View>
                    }
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
    list: {
        padding: spacing.md,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 6,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontFamily: fonts.semiBold,
        fontSize: 12,
    },
    date: {
        fontFamily: fonts.regular,
        fontSize: 12,
        color: staticColors.textLight,
    },
    subject: {
        fontFamily: fonts.bold,
        fontSize: 15,
        color: staticColors.text,
        marginBottom: 12,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        paddingTop: 12,
    },
    type: {
        fontFamily: fonts.medium,
        fontSize: 12,
        color: staticColors.textSecondary,
    },
    empty: {
        alignItems: 'center',
        marginTop: 60,
    },
    emptyText: {
        fontFamily: fonts.medium,
        fontSize: 15,
        color: staticColors.textSecondary,
        marginTop: 16,
        marginBottom: 24,
    },
    createBtn: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 24,
    },
    createBtnText: {
        color: '#fff',
        fontFamily: fonts.bold,
        fontSize: 14,
    }
});
