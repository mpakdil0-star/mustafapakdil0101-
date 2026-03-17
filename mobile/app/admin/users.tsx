import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, RefreshControl, Alert, ActivityIndicator, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import { colors as staticColors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';
import { useAppColors } from '../../hooks/useAppColors';
import api from '../../services/api';

interface User {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    userType: 'CITIZEN' | 'ELECTRICIAN';
    profileImageUrl?: string;
    creditBalance: number;
    isVerified: boolean;
    isActive: boolean;
    verificationStatus?: string;
    completedJobsCount?: number;
    serviceCategory?: string;
    locations?: { city: string; district?: string }[];
    pushStatus?: 'ACTIVE' | 'PENDING' | 'DISABLED';
}

type FilterType = 'ALL' | 'CITIZEN' | 'ELECTRICIAN';

export default function AdminUsersScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const colors = useAppColors();

    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState((params.initialSearch as string) || '');
    const [filter, setFilter] = useState<FilterType>((params.initialFilter as FilterType) || 'ALL');
    const [city, setCity] = useState((params.initialCity as string) || '');
    const [district, setDistrict] = useState((params.initialDistrict as string) || '');
    const [category, setCategory] = useState((params.initialCategory as string) || '');
    
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    // Modal State
    const [creditModalVisible, setCreditModalVisible] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [creditAmount, setCreditAmount] = useState('');
    const [isSubmittingCredit, setIsSubmittingCredit] = useState(false);
    const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set());

    const toggleLocation = (userId: string) => {
        setExpandedLocations(prev => {
            const next = new Set(prev);
            if (next.has(userId)) {
                next.delete(userId);
            } else {
                next.add(userId);
            }
            return next;
        });
    };

    const fetchUsers = useCallback(async (resetPage = false) => {
        try {
            const currentPage = resetPage ? 1 : page;
            const response = await api.get('/admin/users', {
                params: {
                    search: searchQuery,
                    userType: filter,
                    city: city,
                    district: district,
                    serviceCategory: category,
                    page: currentPage,
                    limit: 20
                }
            });

            if (response.data.success) {
                const { users: fetchedUsers, pagination } = response.data.data;
                setUsers(resetPage ? fetchedUsers : [...users, ...fetchedUsers]);
                setTotalPages(pagination.totalPages);
                if (resetPage) setPage(1);
            }
        } catch (error: any) {
            console.error('Failed to fetch users:', error);
        } finally {
            setLoading(false);
            setIsLoadingMore(false);
            setRefreshing(false);
        }
    }, [searchQuery, filter, city, district, category, page]);

    useEffect(() => {
        if (params.initialSearch !== undefined) setSearchQuery(params.initialSearch as string);
        if (params.initialFilter !== undefined) setFilter(params.initialFilter as FilterType);
        if (params.initialCity !== undefined) setCity(params.initialCity as string);
        if (params.initialDistrict !== undefined) setDistrict(params.initialDistrict as string);
        if (params.initialCategory !== undefined) setCategory(params.initialCategory as string);
    }, [params]);

    useEffect(() => {
        setLoading(true);
        fetchUsers(true);
    }, [filter, city, district, category]);

    useEffect(() => {
        if (page > 1) {
            fetchUsers(false);
        }
    }, [page]);

    useEffect(() => {
        const debounce = setTimeout(() => {
            setLoading(true);
            fetchUsers(true);
        }, 500);
        return () => clearTimeout(debounce);
    }, [searchQuery]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchUsers(true);
    };

    const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
        try {
            await api.put(`/admin/users/${userId}`, { isActive: !currentStatus });
            setUsers(users.map(u =>
                u.id === userId ? { ...u, isActive: !currentStatus } : u
            ));
            Alert.alert('Başarılı', currentStatus ? 'Kullanıcı askıya alındı' : 'Kullanıcı aktifleştirildi');
        } catch (error) {
            Alert.alert('Hata', 'İşlem başarısız oldu');
        }
    };

    const openCreditModal = (userId: string) => {
        setSelectedUserId(userId);
        setCreditAmount('');
        setCreditModalVisible(true);
    };

    const handleAddCredit = async () => {
        if (!selectedUserId || !creditAmount) return;

        const amount = parseInt(creditAmount, 10);
        if (isNaN(amount) || amount <= 0) {
            Alert.alert('Hata', 'Geçerli bir miktar giriniz');
            return;
        }

        setIsSubmittingCredit(true);
        try {
            // Find current user balance locally first
            const user = users.find(u => u.id === selectedUserId);
            const currentBalance = user?.creditBalance || 0;
            const newBalance = currentBalance + amount;

            await api.put(`/admin/users/${selectedUserId}`, { creditBalance: newBalance });

            setUsers(users.map(u =>
                u.id === selectedUserId ? { ...u, creditBalance: newBalance } : u
            ));

            setCreditModalVisible(false);
            Alert.alert('Başarılı', `${amount} kredi eklendi`);
        } catch (error) {
            Alert.alert('Hata', 'Kredi eklenirken hata oluştu');
        } finally {
            setIsSubmittingCredit(false);
        }
    };

    const renderUserItem = ({ item }: { item: User }) => (
        <TouchableOpacity
            style={[styles.userCard, !item.isActive && styles.userCardInactive]}
            activeOpacity={0.8}
            onLongPress={() => toggleUserStatus(item.id, item.isActive)}
        >
            <View style={styles.userHeader}>
                <View style={[styles.avatar, { backgroundColor: item.userType === 'ELECTRICIAN' ? colors.primary + '20' : '#F1F5F9' }]}>
                    <Ionicons
                        name={item.userType === 'ELECTRICIAN' ? 'construct' : 'person'}
                        size={24}
                        color={item.userType === 'ELECTRICIAN' ? colors.primary : staticColors.textSecondary}
                    />
                </View>
                <View style={styles.userInfo}>
                    <View style={styles.nameRow}>
                        <Text style={styles.userName} numberOfLines={1}>{item.fullName}</Text>
                        {item.isVerified && (
                            <Ionicons name="checkmark-circle" size={16} color="#10B981" style={{ marginLeft: 4 }} />
                        )}
                        {item.pushStatus && (
                            <TouchableOpacity
                                onPress={() => {
                                    if (item.pushStatus === 'ACTIVE') {
                                        Alert.alert('Bildirim Durumu: Aktif', 'Kullanıcı bildirim alabilir durumda ve cihazı aktif (En son bu hesaptan giriş yapılmış).');
                                    } else if (item.pushStatus === 'PENDING') {
                                        Alert.alert('Bildirim Durumu: Beklemede', 'Kullanıcı bildirimleri kapatmamış ancak şu an aktif bir cihaza bağlı değil (Başka bir hesaba geçmiş olabilir).');
                                    } else {
                                        Alert.alert('Bildirim Durumu: Kapalı', 'Kullanıcı kendi isteğiyle bildirim almayı tamamen kapatmış.');
                                    }
                                }}
                                style={{ marginLeft: 6, justifyContent: 'center', alignItems: 'center' }}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Ionicons
                                    name={item.pushStatus === 'ACTIVE' ? "notifications" : item.pushStatus === 'PENDING' ? "notifications-outline" : "notifications-off"}
                                    size={16}
                                    color={item.pushStatus === 'ACTIVE' ? '#10B981' : item.pushStatus === 'PENDING' ? '#F59E0B' : staticColors.textLight}
                                />
                            </TouchableOpacity>
                        )}
                        {!item.isActive && (
                            <View style={styles.suspendedBadge}>
                                <Text style={styles.suspendedText}>Askıda</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.userPhone}>{item.phone || 'Telefon yok'}</Text>
                </View>
                <View style={styles.userTypeContainer}>
                    <View style={[styles.userTypeBadge, { backgroundColor: item.userType === 'ELECTRICIAN' ? colors.primary + '15' : '#F1F5F9' }]}>
                        <Text style={[styles.userTypeText, { color: item.userType === 'ELECTRICIAN' ? colors.primary : staticColors.textSecondary }]}>
                            {item.userType === 'ELECTRICIAN' ? 'Usta' : 'Vatandaş'}
                        </Text>
                    </View>
                </View>
            </View>

            {item.userType === 'ELECTRICIAN' && (
                <View style={styles.userMeta}>
                    <View style={styles.metaItem}>
                        <Ionicons name="wallet-outline" size={14} color={staticColors.textSecondary} />
                        <Text style={styles.metaText}>{item.creditBalance} Kredi</Text>
                    </View>
                    <View style={styles.metaItem}>
                        <Ionicons name="checkmark-done-outline" size={14} color={staticColors.textSecondary} />
                        <Text style={styles.metaText}>{item.completedJobsCount || 0} İş</Text>
                    </View>
                    {item.serviceCategory && (
                        <View style={styles.metaItem}>
                            <Ionicons name="briefcase-outline" size={14} color={staticColors.textSecondary} />
                            <Text style={styles.metaText}>{item.serviceCategory}</Text>
                        </View>
                    )}
                </View>
            )}
            {item.locations && item.locations.length > 0 && (
                <TouchableOpacity
                    style={styles.locationsContainer}
                    onPress={() => toggleLocation(item.id)}
                    activeOpacity={0.7}
                >
                    <View style={styles.locationsIconWrapper}>
                        <Ionicons name="location-outline" size={14} color={colors.primary} />
                    </View>
                    <View style={styles.locationsListWrapper}>
                        <Text style={styles.locationsText} numberOfLines={expandedLocations.has(item.id) ? undefined : 1}>
                            {expandedLocations.has(item.id)
                                ? item.locations.map(loc => [loc.district, loc.city].filter(Boolean).join(', ')).join(' • ')
                                : Array.from(new Set(item.locations.map(loc => loc.city))).join(' • ')
                            }
                        </Text>
                    </View>
                </TouchableOpacity>
            )}
            <View style={styles.actionRow}>
                {item.userType === 'ELECTRICIAN' && (
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#10B98115' }]}
                        onPress={() => openCreditModal(item.id)}
                    >
                        <Ionicons name="add-circle-outline" size={16} color="#10B981" />
                        <Text style={[styles.actionBtnText, { color: '#10B981' }]}>Kredi Ekle</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: item.isActive ? '#EF444415' : '#10B98115' }]}
                    onPress={() => toggleUserStatus(item.id, item.isActive)}
                >
                    <Ionicons
                        name={item.isActive ? 'pause-circle-outline' : 'play-circle-outline'}
                        size={16}
                        color={item.isActive ? '#EF4444' : '#10B981'}
                    />
                    <Text style={[styles.actionBtnText, { color: item.isActive ? '#EF4444' : '#10B981' }]}>
                        {item.isActive ? 'Askıya Al' : 'Aktifleştir'}
                    </Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    const FilterButton = ({ type, label }: { type: FilterType; label: string }) => (
        <TouchableOpacity
            style={[styles.filterBtn, filter === type && { backgroundColor: colors.primary, borderColor: colors.primary }]}
            onPress={() => setFilter(type)}
        >
            <Text style={[styles.filterBtnText, filter === type && { color: '#fff' }]}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <PremiumHeader title="Kullanıcı Yönetimi" subtitle={`${users.length} kullanıcı`} showBackButton />

            <View style={styles.searchContainer}>
                <View style={styles.searchBox}>
                    <Ionicons name="search" size={20} color={staticColors.textLight} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="İsim veya telefon ara..."
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

            <View style={styles.filterRow}>
                <FilterButton type="ALL" label="Tümü" />
                <FilterButton type="CITIZEN" label="Vatandaş" />
                <FilterButton type="ELECTRICIAN" label="Usta" />
            </View>

            {loading && users.length === 0 ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={users}
                    renderItem={renderUserItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="people-outline" size={48} color={staticColors.textLight} />
                            <Text style={styles.emptyText}>Kullanıcı bulunamadı</Text>
                        </View>
                    }
                    onEndReached={() => {
                        if (page < totalPages && !loading && !isLoadingMore) {
                            setIsLoadingMore(true);
                            setPage(prev => prev + 1);
                        }
                    }}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={
                        isLoadingMore ? (
                            <View style={{ padding: spacing.md, alignItems: 'center' }}>
                                <ActivityIndicator size="small" color={colors.primary} />
                            </View>
                        ) : null
                    }
                />
            )}

            {/* Credit Modal */}
            <Modal
                transparent
                visible={creditModalVisible}
                animationType="fade"
                onRequestClose={() => setCreditModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
                            <Ionicons name="wallet" size={32} color={colors.primary} />
                        </View>
                        <Text style={styles.modalTitle}>Kredi Ekle</Text>
                        <Text style={styles.modalSubtitle}>Kullanıcıya eklenecek miktarı girin</Text>

                        <TextInput
                            style={[styles.modalInput, { borderColor: colors.primary }]}
                            placeholder="Miktar (örn: 100)"
                            placeholderTextColor={staticColors.textLight}
                            keyboardType="number-pad"
                            value={creditAmount}
                            onChangeText={setCreditAmount}
                            autoFocus
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.modalBtnCancel]}
                                onPress={() => setCreditModalVisible(false)}
                            >
                                <Text style={styles.modalBtnTextCancel}>İptal</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                                onPress={handleAddCredit}
                                disabled={isSubmittingCredit}
                            >
                                {isSubmittingCredit ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.modalBtnTextConfirm}>Ekle</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    searchContainer: {
        padding: spacing.md,
        paddingBottom: 0,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: staticColors.white,
        borderRadius: 14,
        paddingHorizontal: 16,
        height: 50,
        gap: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    searchInput: {
        flex: 1,
        fontFamily: fonts.medium,
        fontSize: 15,
        color: staticColors.text,
    },
    filterRow: {
        flexDirection: 'row',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        gap: 8,
    },
    filterBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: staticColors.white,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    filterBtnText: {
        fontFamily: fonts.semiBold,
        fontSize: 13,
        color: staticColors.textSecondary,
    },
    listContent: {
        padding: spacing.md,
        gap: 12,
        paddingBottom: 80,
    },
    userCard: {
        backgroundColor: staticColors.white,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    userCardInactive: {
        opacity: 0.6,
        borderColor: '#EF4444',
    },
    userHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    userInfo: {
        flex: 1,
        marginLeft: 12,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    userName: {
        fontFamily: fonts.bold,
        fontSize: 15,
        color: staticColors.text,
        maxWidth: 150,
    },
    userPhone: {
        fontFamily: fonts.medium,
        fontSize: 13,
        color: staticColors.textSecondary,
        marginTop: 2,
    },
    userTypeContainer: {
        alignItems: 'flex-end',
    },
    userTypeBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    userTypeText: {
        fontFamily: fonts.semiBold,
        fontSize: 11,
    },
    suspendedBadge: {
        backgroundColor: '#EF444420',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 6,
    },
    suspendedText: {
        fontFamily: fonts.semiBold,
        fontSize: 10,
        color: '#EF4444',
    },
    userMeta: {
        flexDirection: 'row',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        gap: 16,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontFamily: fonts.medium,
        fontSize: 12,
        color: staticColors.textSecondary,
    },
    actionRow: {
        flexDirection: 'row',
        marginTop: 12,
        gap: 8,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        gap: 4,
    },
    actionBtnText: {
        fontFamily: fonts.semiBold,
        fontSize: 12,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontFamily: fonts.medium,
        fontSize: 15,
        color: staticColors.textSecondary,
        marginTop: 12,
    },
    /* Modal Styles */
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        width: '100%',
        backgroundColor: staticColors.white,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontFamily: fonts.bold,
        fontSize: 20,
        color: staticColors.text,
        marginBottom: 8,
    },
    modalSubtitle: {
        fontFamily: fonts.medium,
        fontSize: 14,
        color: staticColors.textSecondary,
        marginBottom: 24,
        textAlign: 'center',
    },
    modalInput: {
        width: '100%',
        height: 56,
        borderWidth: 2,
        borderRadius: 16,
        paddingHorizontal: 16,
        fontSize: 18,
        fontFamily: fonts.semiBold,
        color: staticColors.text,
        textAlign: 'center',
        marginBottom: 24,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    modalBtn: {
        flex: 1,
        height: 50,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalBtnCancel: {
        backgroundColor: '#F1F5F9',
    },
    modalBtnTextCancel: {
        fontFamily: fonts.bold,
        fontSize: 15,
        color: staticColors.textSecondary,
    },
    modalBtnTextConfirm: {
        fontFamily: fonts.bold,
        fontSize: 15,
        color: '#fff',
    },
    locationsContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: 16,
        paddingBottom: 12,
        marginTop: -4,
    },
    locationsIconWrapper: {
        marginTop: 2,
        marginRight: 6,
    },
    locationsListWrapper: {
        flex: 1,
    },
    locationsText: {
        fontFamily: fonts.medium,
        fontSize: 12,
        color: staticColors.textSecondary,
        lineHeight: 18,
    },
});
