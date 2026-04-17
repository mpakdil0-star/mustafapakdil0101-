import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, RefreshControl, Alert, ActivityIndicator, Modal, KeyboardAvoidingView, Platform, ScrollView, Image, Clipboard } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import { colors as staticColors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';
import { useAppColors } from '../../hooks/useAppColors';
import api, { apiService } from '../../services/api';
import { getFileUrl } from '../../constants/api';
import { useDispatch } from 'react-redux';
import { impersonateLogin } from '../../store/slices/authSlice';




interface User {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    userType: 'CITIZEN' | 'ELECTRICIAN' | 'ADMIN';

    profileImageUrl?: string;
    creditBalance: number;
    isVerified: boolean;
    isActive: boolean;
    verificationStatus?: string;
    completedJobsCount?: number;
    serviceCategory?: string;
    isAuthorizedEngineer?: boolean;
    locations?: { city: string; district?: string }[];
    pushStatus?: 'ACTIVE' | 'PENDING' | 'DISABLED';
}

type FilterType = 'ALL' | 'CITIZEN' | 'ELECTRICIAN' | 'ENGINEER';

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
    const [expandedInfo, setExpandedInfo] = useState<Set<string>>(new Set());
    const [messagingUserId, setMessagingUserId] = useState<string | null>(null); 
    const [impersonatingUserId, setImpersonatingUserId] = useState<string | null>(null); 
    const dispatch = useDispatch();

    // Bulk Notification State
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [bulkNotifModalVisible, setBulkNotifModalVisible] = useState(false);
    const [bulkNotifTitle, setBulkNotifTitle] = useState('İşBitir');
    const [bulkNotifBody, setBulkNotifBody] = useState('');
    const [isSendingBulk, setIsSendingBulk] = useState(false);

    const toggleUserSelection = (userId: string) => {
        setExpandedLocations(new Set()); 
        setExpandedInfo(new Set());
        const next = new Set(selectedUsers);
        if (next.has(userId)) {
            next.delete(userId);
        } else {
            next.add(userId);
        }
        setIsSelectionMode(next.size > 0);
        setSelectedUsers(next);
    };

    const handleSelectAll = () => {
        if (selectedUsers.size === users.length && users.length > 0) {
            setSelectedUsers(new Set());
            setIsSelectionMode(false);
        } else if (users.length > 0) {
            setSelectedUsers(new Set(users.map(u => u.id)));
            setIsSelectionMode(true);
        }
    };

    const sendBulkNotification = async () => {
        if (!bulkNotifTitle.trim() || !bulkNotifBody.trim()) {
            Alert.alert('Hata', 'Lütfen duyuru başlığı ve metni giriniz.');
            return;
        }

        setIsSendingBulk(true);
        try {
            const userIdArray = selectedUsers.size > 0 ? Array.from(selectedUsers) : 'ALL';
            
            const res = await api.post('/admin/notifications/bulk', {
                userIds: userIdArray,
                title: bulkNotifTitle,
                body: bulkNotifBody
            });

            if (res.data.success) {
                Alert.alert('Başarılı', res.data.data.message || 'Bildirimler gönderildi.');
                setBulkNotifModalVisible(false);
                setSelectedUsers(new Set());
                setIsSelectionMode(false);
                setBulkNotifTitle('');
                setBulkNotifBody('');
            }
        } catch (error: any) {
            const msg = error.response?.data?.error?.message || 'Bildirim gönderilemedi.';
            Alert.alert('Hata', msg);
        } finally {
            setIsSendingBulk(false);
        }
    };

    const handleDeleteUser = async (userId: string, fullName: string) => {
        Alert.alert(
            '⚠️ Kullanıcıyı Sil',
            `"${fullName}" adlı kullanıcıyı tamamen silmek istediğinize emin misiniz? bu işlem geri alınamaz.`,
            [
                { text: 'Vazgeç', style: 'cancel' },
                {
                    text: 'Sil',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const res = await api.delete(`/admin/users/${userId}`);
                            if (res.data.success) {
                                setUsers(prev => prev.filter(u => u.id !== userId));
                                Alert.alert('Başarılı', 'Kullanıcı silindi.');
                            }
                        } catch (error: any) {
                            const msg = error.response?.data?.message || 'Kullanıcı silinemedi.';
                            Alert.alert('Hata', msg);
                        }
                    }
                }
            ]
        );
    };

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

    const toggleInfo = (userId: string) => {
        setExpandedInfo(prev => {
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

    // Admin olarak kullanıcıya mesaj gönder
    const handleSendMessage = async (targetUserId: string) => {
        if (messagingUserId) return; // Zaten işlem devam ediyor
        setMessagingUserId(targetUserId);
        try {
            // Mevcut konuşmayı bul veya yenisini oluştur
            const response = await api.post('/conversations', {
                recipientId: targetUserId,
            });

            if (response.data.success && response.data.data.conversation) {
                const conversationId = response.data.data.conversation.id;
                router.push(`/messages/${conversationId}`);
            } else {
                Alert.alert('Hata', 'Konuşma oluşturulamadı');
            }
        } catch (error: any) {
            console.error('Failed to create conversation:', error);
            Alert.alert('Hata', 'Mesaj penceresi açılamadı. Lütfen tekrar deneyin.');
        } finally {
            setMessagingUserId(null);
        }
    };

    // Admin olarak başka bir kullanıcının hesabına geçici giriş yap
    const handleImpersonate = async (targetUser: User) => {
        Alert.alert(
            '🔐 Hesaba Geçiş',
            `"${targetUser.fullName}" adlı kullanıcının hesabına 4 saatliğine giriş yapmak istediğinizden emin misiniz?\n\nGeri dönmek için çıkış yapıp kendi hesabınızla giriş yapabilirsiniz.`,
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Geçiş Yap',
                    style: 'destructive',
                    onPress: async () => {
                        setImpersonatingUserId(targetUser.id);
                        try {
                            const response = await api.post(`/admin/impersonate/${targetUser.id}`);
                            if (response.data.success) {
                                const { accessToken, user } = response.data.data;
                                // Token'ı SecureStore'a kaydet
                                await apiService.setTokens(accessToken, accessToken); // refresh olarak da aynısını koy (4 saat geçerli)
                                // Redux store'u atomik olarak güncelle (user + token birlikte)
                                dispatch(impersonateLogin({
                                    user: {
                                        ...user,
                                        isVerified: user.isVerified,
                                        isImpersonated: true,
                                    },


                                    accessToken,
                                }));
                                Alert.alert(
                                    '✅ Geçiş Başarılı',
                                    `"${user.fullName}" hesabına geçildi. Ana sayfaya yönlendiriliyorsunuz.\n\nNot: Bu oturum 4 saat geçerlidir.`,
                                    [{ text: 'Tamam', onPress: () => router.replace('/(tabs)') }]
                                );
                            }
                        } catch (error: any) {
                            const msg = error.response?.data?.error?.message || 'Hesaba geçiş başarısız oldu.';
                            Alert.alert('Hata', msg);
                        } finally {
                            setImpersonatingUserId(null);
                        }
                    }
                }
            ]
        );
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

    const renderUserItem = ({ item }: { item: User }) => {
        const isSelected = selectedUsers.has(item.id);

        return (
        <TouchableOpacity
            style={[
                styles.userCard, 
                !item.isActive && styles.userCardInactive,
                isSelected && { borderColor: colors.primary, borderWidth: 2 }
            ]}
            onLongPress={() => toggleUserSelection(item.id)}
            onPress={() => isSelectionMode ? toggleUserSelection(item.id) : null}
            activeOpacity={isSelectionMode ? 0.8 : 1}
        >
            <View style={styles.userHeader}>
                <View style={[styles.avatar, { backgroundColor: item.userType === 'ELECTRICIAN' ? colors.primary + '20' : '#F1F5F9' }]}>
                    {item.profileImageUrl && getFileUrl(item.profileImageUrl) ? (
                        <Image
                            source={{ uri: getFileUrl(item.profileImageUrl)! }}
                            style={styles.avatarImage}
                        />
                    ) : (
                        <Ionicons
                            name={item.userType === 'ADMIN' ? 'shield-checkmark' : (item.userType === 'ELECTRICIAN' ? 'construct' : 'person')}
                            size={24}
                            color={item.userType === 'ELECTRICIAN' ? colors.primary : staticColors.textSecondary}
                        />
                    )}
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
                                    } else if (item.pushStatus === 'UNINSTALLED') {
                                        Alert.alert('Uygulama Silinmiş', 'Sistem bu cihaza bildirim yollamaya çalışırken hata aldı. Kullanıcı büyük ihtimalle uygulamayı cihazından silmiş.');
                                    } else {
                                        Alert.alert('Bildirim Durumu: Kapalı', 'Kullanıcı kendi isteğiyle bildirim almayı tamamen kapatmış.');
                                    }
                                }}
                                style={{ marginLeft: 6, justifyContent: 'center', alignItems: 'center' }}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Ionicons
                                    name={item.pushStatus === 'ACTIVE' ? "notifications" : item.pushStatus === 'PENDING' ? "notifications-outline" : item.pushStatus === 'UNINSTALLED' ? "phone-portrait-outline" : "notifications-off"}
                                    size={16}
                                    color={item.pushStatus === 'ACTIVE' ? '#10B981' : item.pushStatus === 'PENDING' ? '#F59E0B' : item.pushStatus === 'UNINSTALLED' ? '#EF4444' : staticColors.textLight}
                                />
                            </TouchableOpacity>
                        )}
                        {!item.isActive && (
                            <View style={styles.suspendedBadge}>
                                <Text style={styles.suspendedText}>Askıda</Text>
                            </View>
                        )}
                        {item.pushStatus === 'UNINSTALLED' && (
                            <View style={[styles.suspendedBadge, { backgroundColor: '#FEE2E2', borderColor: '#EF4444', marginLeft: 4 }]}>
                                <Text style={[styles.suspendedText, { color: '#EF4444' }]}>Silinmiş</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.userPhone}>{item.phone || 'Telefon yok'}</Text>
                </View>
                <View style={styles.userTypeContainer}>
                    <View style={[
                        styles.userTypeBadge, 
                        { backgroundColor: item.userType === 'ADMIN' ? '#7C3AED15' : (item.userType === 'ELECTRICIAN' ? colors.primary + '15' : '#F1F5F9') }
                    ]}>
                        <Text style={[
                            styles.userTypeText, 
                            { color: item.userType === 'ADMIN' ? '#7C3AED' : (item.userType === 'ELECTRICIAN' ? colors.primary : staticColors.textSecondary) }
                        ]}>
                            {item.userType === 'ADMIN' ? 'Yönetici' : (item.userType === 'ELECTRICIAN' ? 'Usta' : 'Vatandaş')}
                        </Text>
                    </View>
                    {item.isAuthorizedEngineer && (
                        <View style={[styles.userTypeBadge, { backgroundColor: '#8B5CF615', marginTop: 4 }]}>
                            <Text style={[styles.userTypeText, { color: '#8B5CF6' }]}>
                                Yetkili Müh
                            </Text>
                        </View>
                    )}
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
            {/* İletişim Bilgisi Kutucuğu */}
            {expandedInfo.has(item.id) && (
                <View style={styles.contactInfoBox}>
                    <View style={styles.contactInfoRow}>
                        <Ionicons name="mail-outline" size={14} color={colors.primary} />
                        <Text style={styles.contactInfoLabel}>E-posta:</Text>
                        <Text style={styles.contactInfoValue} selectable numberOfLines={1}>{item.email || 'Belirtilmemiş'}</Text>
                    </View>
                    <View style={styles.contactInfoRow}>
                        <Ionicons name="call-outline" size={14} color={colors.primary} />
                        <Text style={styles.contactInfoLabel}>Telefon:</Text>
                        <Text style={styles.contactInfoValue} selectable>{item.phone || 'Belirtilmemiş'}</Text>
                    </View>
                </View>
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
                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.primary + '15' }]}
                    onPress={() => handleSendMessage(item.id)}
                    disabled={messagingUserId === item.id}
                >
                    {messagingUserId === item.id ? (
                        <ActivityIndicator size={14} color={colors.primary} />
                    ) : (
                        <Ionicons name="chatbubble-outline" size={16} color={colors.primary} />
                    )}
                    <Text style={[styles.actionBtnText, { color: colors.primary }]}>Mesaj</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#6366F115' }]}
                    onPress={() => toggleInfo(item.id)}
                >
                    <Ionicons name={expandedInfo.has(item.id) ? 'chevron-up-outline' : 'information-circle-outline'} size={16} color="#6366F1" />
                    <Text style={[styles.actionBtnText, { color: '#6366F1' }]}>Bilgi</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#F59E0B15' }]}
                    onPress={() => handleImpersonate(item)}
                    disabled={impersonatingUserId === item.id}
                >
                    {impersonatingUserId === item.id ? (
                        <ActivityIndicator size={14} color="#F59E0B" />
                    ) : (
                        <Ionicons name="log-in-outline" size={16} color="#F59E0B" />
                    )}
                    <Text style={[styles.actionBtnText, { color: '#F59E0B' }]}>Giriş</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#EF444415' }]}
                    onPress={() => handleDeleteUser(item.id, item.fullName)}
                >
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Sil</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
};

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
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    contentContainerStyle={styles.filterScroll}
                >
                    <FilterButton type="ALL" label="Tümü" />
                    <FilterButton type="CITIZEN" label="Vatandaş" />
                    <FilterButton type="ELECTRICIAN" label="Usta" />
                    <FilterButton type="ENGINEER" label="Yetkili Müh" />
                </ScrollView>
            </View>

            {/* Toplu İşlem & Seçim Alanı */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingBottom: spacing.sm }}>
                <TouchableOpacity onPress={handleSelectAll} style={{ paddingVertical: 8 }}>
                    <Text style={{ color: colors.primary, fontFamily: fonts.bold }}>{selectedUsers.size === users.length && users.length > 0 ? 'Tüm Seçimi Kaldır' : 'Tümünü Seç'}</Text>
                </TouchableOpacity>
                {(selectedUsers.size > 0 || users.length > 0) && (
                    <TouchableOpacity onPress={() => setBulkNotifModalVisible(true)} style={{ backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 }}>
                        <Text style={{ color: '#fff', fontFamily: fonts.bold }}>{selectedUsers.size > 0 ? `${selectedUsers.size} Kişiye Duyuru` : 'Herkese Duyuru'}</Text>
                    </TouchableOpacity>
                )}
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

            {/* Bulk Notification Modal */}
            <Modal
                transparent
                visible={bulkNotifModalVisible}
                animationType="slide"
                onRequestClose={() => setBulkNotifModalVisible(false)}
            >
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { width: '90%' }]}>
                        <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
                            <Ionicons name="megaphone" size={32} color={colors.primary} />
                        </View>
                        <Text style={styles.modalTitle}>Duyuru Gönder</Text>
                        <Text style={styles.modalSubtitle}>{selectedUsers.size > 0 ? `${selectedUsers.size} kullanıcıya` : 'Tüm kullanıcılara'} Push Bildirimi gönderilecek.</Text>

                        <Text style={{ fontFamily: fonts.bold, color: staticColors.text, alignSelf: 'flex-start', marginTop: 10 }}>Başlık</Text>
                        <TextInput
                            style={[styles.modalInput, { borderColor: colors.primary, marginTop: 4 }]}
                            placeholder="Bildirim Başlığı"
                            placeholderTextColor={staticColors.textLight}
                            value={bulkNotifTitle}
                            onChangeText={setBulkNotifTitle}
                        />

                        <Text style={{ fontFamily: fonts.bold, color: staticColors.text, alignSelf: 'flex-start', marginTop: 10 }}>İçerik</Text>
                        <TextInput
                            style={[styles.modalInput, { borderColor: colors.primary, marginTop: 4, height: 80, textAlignVertical: 'top' }]}
                            placeholder="Mesajınız..."
                            placeholderTextColor={staticColors.textLight}
                            multiline
                            numberOfLines={3}
                            value={bulkNotifBody}
                            onChangeText={setBulkNotifBody}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.modalBtnCancel]}
                                onPress={() => setBulkNotifModalVisible(false)}
                            >
                                <Text style={styles.modalBtnTextCancel}>İptal</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                                onPress={sendBulkNotification}
                                disabled={isSendingBulk}
                            >
                                {isSendingBulk ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Ionicons name="send" size={16} color="#fff" />
                                        <Text style={styles.modalBtnTextConfirm}>Gönder</Text>
                                    </View>
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
        paddingVertical: spacing.sm,
    },
    filterScroll: {
        paddingHorizontal: spacing.md,
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
        overflow: 'hidden',
    },
    avatarImage: {
        width: 48,
        height: 48,
        borderRadius: 14,
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
        flexWrap: 'wrap',
    },
    contactInfoBox: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 12,
        marginTop: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 8,
    },
    contactInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    contactInfoLabel: {
        fontFamily: fonts.semiBold,
        fontSize: 12,
        color: staticColors.textSecondary,
    },
    contactInfoValue: {
        fontFamily: fonts.medium,
        fontSize: 12,
        color: staticColors.text,
        flex: 1,
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
