import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import { colors as staticColors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';
import { useAppColors } from '../../hooks/useAppColors';
import api from '../../services/api';

interface Ticket {
    id: string;
    subject: string;
    description: string;
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    ticketType: string;
    createdAt: string;
    priority: string;
    user: {
        fullName: string;
        email: string;
        phone: string;
    }
}

export default function AdminSupportScreen() {
    const router = useRouter();
    const colors = useAppColors();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Navigation handling
    const handleTicketPress = (ticketId: string) => {
        router.push(`/admin/support/${ticketId}`);
    };

    const fetchTickets = async () => {
        try {
            const response = await api.get('/support/admin/all');
            if (response.data.success) {
                setTickets(response.data.data);
            }
        } catch (error) {
            console.error('Fetch tickets error:', error);
            Alert.alert('Hata', 'Talepler yüklenemedi');
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
            onPress={() => handleTicketPress(item.id)}
        >
            <View style={styles.cardHeader}>
                <View style={styles.userInfo}>
                    <Text style={styles.userName}>{item.user?.fullName || 'Bilinmeyen'}</Text>
                    <Text style={styles.userEmail}>{item.user?.phone}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                        {getStatusText(item.status)}
                    </Text>
                </View>
            </View>

            <Text style={styles.subject}>{item.subject}</Text>
            <Text style={styles.description} numberOfLines={2}>{item.description}</Text>

            <View style={styles.cardFooter}>
                <Text style={styles.date}>{new Date(item.createdAt).toLocaleString('tr-TR')}</Text>
                <Text style={[styles.priority, { color: item.priority === 'high' ? '#EF4444' : '#64748B' }]}>
                    {item.priority === 'high' ? 'Yüksek Öncelik' : item.priority === 'medium' ? 'Normal' : 'Düşük'}
                </Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <PremiumHeader title="Destek Talepleri" showBackButton />

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
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    userInfo: {
        gap: 2,
    },
    userName: {
        fontFamily: fonts.bold,
        fontSize: 14,
        color: staticColors.text,
    },
    userEmail: {
        fontFamily: fonts.regular,
        fontSize: 12,
        color: staticColors.textSecondary,
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
    subject: {
        fontFamily: fonts.bold,
        fontSize: 15,
        color: staticColors.text,
        marginBottom: 4,
    },
    description: {
        fontFamily: fonts.regular,
        fontSize: 13,
        color: staticColors.textSecondary,
        marginBottom: 12,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        paddingTop: 8,
    },
    date: {
        fontFamily: fonts.medium,
        fontSize: 11,
        color: staticColors.textLight,
    },
    priority: {
        fontFamily: fonts.bold,
        fontSize: 11,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    modalContent: {
        backgroundColor: '#fff',
        width: '100%',
        borderRadius: 20,
        padding: 24,
    },
    modalTitle: {
        fontFamily: fonts.bold,
        fontSize: 18,
        marginBottom: 8,
        textAlign: 'center'
    },
    modalSubtitle: {
        fontFamily: fonts.regular,
        fontSize: 14,
        color: staticColors.textSecondary,
        marginBottom: 24,
        textAlign: 'center'
    },
    actionButtons: {
        gap: 12,
        marginTop: 16,
    },
    label: {
        fontFamily: fonts.bold,
        fontSize: 13,
        color: staticColors.text,
        marginBottom: 8,
        alignSelf: 'flex-start'
    },
    input: {
        backgroundColor: '#F1F5F9',
        width: '100%',
        borderRadius: 12,
        padding: 12,
        minHeight: 80,
        textAlignVertical: 'top',
        fontFamily: fonts.medium,
        fontSize: 14,
    },
    actionBtn: {
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center'
    },
    actionBtnText: {
        color: '#fff',
        fontFamily: fonts.bold,
        fontSize: 14
    },
    cancelBtn: {
        marginTop: 16,
        paddingVertical: 12,
        alignItems: 'center'
    },
    cancelBtnText: {
        fontFamily: fonts.medium,
        color: staticColors.textSecondary
    }
});
