import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { useRouter, useFocusEffect, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector } from '../../../hooks/redux';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { colors as staticColors } from '../../../constants/colors';
import { spacing } from '../../../constants/spacing';
import { typography, fonts } from '../../../constants/typography';
import { useAppColors } from '../../../hooks/useAppColors';
import apiClient from '../../../services/api';
import { API_ENDPOINTS } from '../../../constants/api';
import { PremiumHeader } from '../../../components/common/PremiumHeader';
import { PremiumAlert } from '../../../components/common/PremiumAlert';

export default function AddressesScreen() {
    const router = useRouter();
    const { user } = useAppSelector((state) => state.auth);
    const isElectrician = user?.userType === 'ELECTRICIAN';
    const colors = useAppColors();

    const [locations, setLocations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [alertConfig, setAlertConfig] = useState<{
        visible: boolean;
        title: string;
        message: string;
        type?: 'success' | 'error' | 'warning' | 'info' | 'confirm';
        buttons?: { text: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }[];
    }>({ visible: false, title: '', message: '' });

    const showAlert = (title: string, message: string, type: any = 'info', buttons?: any[]) => {
        setAlertConfig({ visible: true, title, message, type, buttons });
    };

    const fetchLocations = async () => {
        try {
            setLoading(true);
            const response = await apiClient.get(API_ENDPOINTS.LOCATIONS);
            setLocations(response.data.data || []);
        } catch (error) {
            console.error('Failed to fetch locations:', error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchLocations();
        }, [])
    );

    const handleEdit = (id: string) => {
        router.push({ pathname: '/profile/addresses/edit', params: { id } });
    };

    const handleDelete = (id: string) => {
        showAlert(
            isElectrician ? 'Hizmet Bölgesini Sil' : 'Adresi Sil',
            `Bu ${isElectrician ? 'hizmet bölgesini' : 'adresi'} silmek istediğinize emin misiniz?`,
            'confirm',
            [
                { text: 'İptal', variant: 'ghost', onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) },
                {
                    text: 'Sil',
                    variant: 'danger',
                    onPress: async () => {
                        try {
                            setAlertConfig(prev => ({ ...prev, visible: false }));
                            await apiClient.delete(`${API_ENDPOINTS.LOCATIONS}/${id}`);
                            fetchLocations();
                        } catch (error) {
                            console.error('Failed to delete location:', error);
                            showAlert('Hata', 'Silme işlemi başarısız oldu.', 'error');
                        }
                    }
                },
            ]
        );
    };

    const renderAddressItem = ({ item }: { item: any }) => (
        <Card variant="default" style={[styles.addressCard, { shadowColor: colors.primary }]}>
            <View style={styles.addressHeader}>
                <View style={styles.titleContainer}>
                    <View style={[styles.iconCircle, { backgroundColor: colors.primary + '15' }]}>
                        <Ionicons name="location" size={20} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.addressTitle}>{item.city} / {item.district}</Text>
                        <Text style={styles.addressSubtitle}>{item.neighborhood || 'Merkez'}</Text>
                    </View>
                </View>
                <View style={styles.actions}>
                    <TouchableOpacity
                        onPress={() => handleEdit(item.id)}
                        style={[styles.actionButton, { backgroundColor: colors.primary + '10' }]}
                        activeOpacity={0.6}
                    >
                        <Ionicons name="pencil" size={16} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => handleDelete(item.id)}
                        style={[styles.actionButton, { backgroundColor: staticColors.error + '10' }]}
                        activeOpacity={0.6}
                    >
                        <Ionicons name="trash-outline" size={16} color={staticColors.error} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.addressDetailRow}>
                <View style={styles.mapIconWrapper}>
                    <Ionicons name="map-outline" size={14} color={staticColors.textLight} />
                </View>
                <Text style={styles.addressText} numberOfLines={2}>
                    {item.address}
                </Text>
            </View>
        </Card>
    );

    return (
        <View style={styles.container}>
            <PremiumHeader
                title={isElectrician ? 'Hizmet Bölgeleri' : 'Adreslerim'}
                showBackButton
            />

            {loading && locations.length === 0 ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={locations}
                    renderItem={renderAddressItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <View style={[styles.emptyIconContainer, { shadowColor: colors.primary }]}>
                                <Ionicons name="map-outline" size={60} color={colors.primary + '40'} />
                            </View>
                            <Text style={styles.emptyTitle}>
                                {isElectrician ? 'Henüz Bölge Yok' : 'Henüz Adres Yok'}
                            </Text>
                            <Text style={styles.emptyText}>
                                {isElectrician
                                    ? 'Hizmet bölgesi ekleyerek o bölgedeki yeni işlerden anlık bildirim alabilirsiniz.'
                                    : 'Kayıtlı bir adresiniz bulunmamaktadır. Yeni bir adres ekleyerek zaman kazanabilirsiniz.'}
                            </Text>
                        </View>
                    }
                />
            )}

            <View style={styles.footer}>
                <Button
                    title={isElectrician ? "Yeni Bölge Ekle" : "Yeni Adres Ekle"}
                    onPress={() => router.push('/profile/addresses/add')}
                    fullWidth
                    style={styles.addButton}
                    icon={<Ionicons name="add-circle" size={22} color={staticColors.white} />}
                />
            </View>
            <PremiumAlert
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                buttons={alertConfig.buttons}
                onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: spacing.lg,
        paddingBottom: 110,
    },
    addressCard: {
        marginBottom: 16,
        padding: 16,
        borderRadius: 24,
        backgroundColor: staticColors.white,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
    },
    addressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    addressTitle: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: staticColors.text,
        letterSpacing: -0.3,
    },
    addressSubtitle: {
        fontFamily: fonts.medium,
        fontSize: 13,
        color: staticColors.textSecondary,
    },
    actions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    divider: {
        height: 1,
        backgroundColor: staticColors.borderLight,
        marginVertical: 12,
        opacity: 0.5,
    },
    addressDetailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    mapIconWrapper: {
        width: 24,
        height: 24,
        borderRadius: 6,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    addressText: {
        fontFamily: fonts.medium,
        fontSize: 13,
        color: staticColors.textSecondary,
        flex: 1,
        lineHeight: 18,
    },
    emptyContainer: {
        paddingVertical: 60,
        alignItems: 'center',
        paddingHorizontal: 30,
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
    footer: {
        position: 'absolute',
        bottom: 20, // Moved up from 0
        left: 0,
        right: 0,
        padding: spacing.lg,
        paddingBottom: Platform.OS === 'ios' ? 44 : 30,
        backgroundColor: 'rgba(248, 250, 252, 0.95)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.8)',
    },
    addButton: {
        borderRadius: 18,
    },
});
