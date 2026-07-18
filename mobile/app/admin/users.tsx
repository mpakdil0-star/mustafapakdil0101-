import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, RefreshControl, Alert, ActivityIndicator, Modal, KeyboardAvoidingView, Platform, ScrollView, Image, Clipboard } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import { colors as staticColors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';
import { useAppColors } from '../../hooks/useAppColors';
import { adminService } from '../../services/adminService';
import { authService } from '../../services/authService';
import { messageService } from '../../services/messageService';
import { getFileUrl } from '../../constants/api';
import { useDispatch, useSelector } from 'react-redux';
import { impersonateLogin } from '../../store/slices/authSlice';
import { RootState } from '../../store/store';




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
    isBanned?: boolean;
    verificationStatus?: string;
    completedJobsCount?: number;
    serviceCategory?: string;
    isAuthorizedEngineer?: boolean;
    locations?: { city: string; district?: string }[];
    pushStatus?: 'ACTIVE' | 'PENDING' | 'DISABLED' | 'UNINSTALLED';
    createdAt?: string;
    updatedAt?: string;
    lastSeenAt?: string;
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
    const [debouncedSearch, setDebouncedSearch] = useState((params.initialSearch as string) || '');
    const [filter, setFilter] = useState<FilterType>((params.initialFilter as FilterType) || 'ALL');
    const [city, setCity] = useState((params.initialCity as string) || '');
    const [district, setDistrict] = useState((params.initialDistrict as string) || '');
    const [category, setCategory] = useState((params.initialCategory as string) || '');
    
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    // Modal State
    const [creditModalVisible, setCreditModalVisible] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [creditAmount, setCreditAmount] = useState('');
    const [isSubmittingCredit, setIsSubmittingCredit] = useState(false);
    const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set());
    const [expandedInfo, setExpandedInfo] = useState<Set<string>>(new Set());
    const [expandedActions, setExpandedActions] = useState<Set<string>>(new Set());
    const [messagingUserId, setMessagingUserId] = useState<string | null>(null); 
    const [impersonatingUserId, setImpersonatingUserId] = useState<string | null>(null); 
    const dispatch = useDispatch();
    const currentAdminId = useSelector((state: RootState) => state.auth.user?.id);

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
        setExpandedActions(new Set());
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
            
            const sent = await adminService.bulkNotify(userIdArray === 'ALL' ? null : userIdArray, bulkNotifTitle, bulkNotifBody);
            const res = { data: { success: true, data: { message: `${sent} kullanıcı için bildirim oluşturuldu.` } } };

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
        try {
            await adminService.deleteUser(userId, true);
        } catch (error: any) {
            Alert.alert('Silme işlemi kullanılamıyor', error?.message || 'Kullanıcı silme ön kontrolü başarısız oldu.');
            return;
        }

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
                            await adminService.deleteUser(userId);
                            const res = { data: { success: true } };
                            if (res.data.success) {
                                setUsers(prev => prev.filter(u => u.id !== userId));
                                setTotalCount(prev => Math.max(0, prev - 1));
                                Alert.alert('Başarılı', 'Kullanıcının giriş hesabı ve bağlı verileri kalıcı olarak silindi.');
                            }
                        } catch (error: any) {
                            const msg = error.response?.data?.message || error.message || 'Kullanıcı silinemedi.';
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

    const toggleActions = (userId: string) => {
        setExpandedActions(prev => {
            const next = new Set(prev);
            if (next.has(userId)) {
                next.delete(userId);
            } else {
                next.add(userId);
            }
            return next;
        });
    };

    const fetchUsers = useCallback(async (requestedPage = 1, replace = true, silent = false) => {
        try {
            const result = await adminService.users({
                    search: debouncedSearch,
                    userType: filter,
                    city: city,
                    district: district,
                    serviceCategory: category,
                    page: requestedPage, limit: 20
            });
            const response = { data: { success: true, data: { users: result.users, pagination: { totalPages: result.totalPages, totalCount: result.totalCount } } } };

            if (response.data.success) {
                const { users: fetchedUsers, pagination } = response.data.data;
                setUsers(previous => replace
                    ? fetchedUsers
                    : [...previous.filter(user => !fetchedUsers.some((nextUser: User) => nextUser.id === user.id)), ...fetchedUsers]
                );
                setTotalPages(pagination.totalPages);
                setTotalCount(pagination.totalCount);
                if (replace) setPage(1);
            }
        } catch (error: any) {
            console.error('Failed to fetch users:', error);
        } finally {
            if (!silent) setLoading(false);
            setIsLoadingMore(false);
            setRefreshing(false);
        }
    }, [debouncedSearch, filter, city, district, category]);

    useEffect(() => {
        if (params.initialSearch !== undefined) setSearchQuery(params.initialSearch as string);
        if (params.initialFilter !== undefined) setFilter(params.initialFilter as FilterType);
        if (params.initialCity !== undefined) setCity(params.initialCity as string);
        if (params.initialDistrict !== undefined) setDistrict(params.initialDistrict as string);
        if (params.initialCategory !== undefined) setCategory(params.initialCategory as string);
    }, [params]);

    useEffect(() => {
        const debounce = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 500);
        return () => clearTimeout(debounce);
    }, [searchQuery]);

    useEffect(() => {
        setLoading(true);
        fetchUsers(1, true);
    }, [fetchUsers]);

    useFocusEffect(useCallback(() => {
        fetchUsers(1, true, true);
        const refreshTimer = setInterval(() => {
            fetchUsers(1, true, true);
        }, 15000);
        return () => clearInterval(refreshTimer);
    }, [fetchUsers]));

    const onRefresh = () => {
        setRefreshing(true);
        fetchUsers(1, true);
    };

    const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
        try {
            await adminService.setUserActive(userId, !currentStatus);
            await fetchUsers(1, true, true);
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
            const conversation = await messageService.findOrCreateConversation(targetUserId);
            const response = { data: { success: true, data: { conversation } } };

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
        if (!targetUser.isActive || targetUser.isBanned) {
            Alert.alert('Hesap aktif değil', 'Kullanıcı hesabına geçmeden önce hesabı aktifleştirin.');
            return;
        }
        if (targetUser.userType === 'ADMIN') {
            Alert.alert('İşlem engellendi', 'Başka bir yönetici hesabına geçiş yapılamaz.');
            return;
        }
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
                            const credentials = await adminService.createImpersonation(targetUser.id);
                            const session = await authService.startImpersonation(credentials);
                            dispatch(impersonateLogin(session));
                            Alert.alert(
                                '✅ Geçiş Başarılı',
                                `"${session.user.fullName}" hesabına geçildi. Üstteki yönetici bandındaki × düğmesiyle güvenli biçimde geri dönebilirsiniz.\n\nBu oturum en fazla 4 saat geçerlidir.`,
                                [{ text: 'Tamam', onPress: () => router.replace('/(tabs)') }]
                            );
                        } catch (error: any) {
                            const msg = error?.message || error.response?.data?.error?.message || 'Hesaba geçiş başarısız oldu.';
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

            const confirmedBalance = await adminService.addCredit(selectedUserId, amount);

            setUsers(previous => previous.map(u =>
                u.id === selectedUserId ? { ...u, creditBalance: confirmedBalance } : u
            ));
            await fetchUsers(1, true, true);

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
                <TouchableOpacity
                    style={styles.selectionButton}
                    onPress={() => toggleUserSelection(item.id)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isSelected }}
                    accessibilityLabel={`${item.fullName} kullanıcısını seç`}
                >
                    <Ionicons
                        name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                        size={22}
                        color={isSelected ? colors.primary : '#CBD5E1'}
                    />
                </TouchableOpacity>
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
                    </View>
                    <Text style={styles.userPhone}>{item.phone || 'Telefon yok'}</Text>
                    {item.createdAt && (
                        <Text style={styles.userRegisterDate}>
                            Kayıt: {new Date(item.createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </Text>
                    )}
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

            <View style={styles.statusRow}>
                <View style={[styles.statusChip, item.isActive && !item.isBanned ? styles.statusChipSuccess : styles.statusChipDanger]}>
                    <View style={[styles.statusDot, { backgroundColor: item.isActive && !item.isBanned ? '#10B981' : '#EF4444' }]} />
                    <Text style={[styles.statusChipText, { color: item.isActive && !item.isBanned ? '#047857' : '#B91C1C' }]}>
                        {item.isActive && !item.isBanned ? 'Aktif' : 'Askıda'}
                    </Text>
                </View>
                <TouchableOpacity
                    style={[
                        styles.statusChip,
                        item.pushStatus === 'ACTIVE'
                            ? styles.statusChipSuccess
                            : item.pushStatus === 'PENDING'
                                ? styles.statusChipWarning
                                : styles.statusChipMuted,
                    ]}
                    onPress={() => Alert.alert(
                        'Bildirim Durumu',
                        item.pushStatus === 'ACTIVE'
                            ? 'Bildirimler açık ve aktif bir cihaz bağlı.'
                            : item.pushStatus === 'PENDING'
                                ? 'Bildirim tercihi açık ancak aktif cihaz henüz doğrulanmadı.'
                                : item.pushStatus === 'UNINSTALLED'
                                    ? 'Bu hesaba bağlı aktif cihaz bulunmuyor.'
                                    : 'Kullanıcı bildirimleri kapatmış.'
                    )}
                >
                    <Ionicons
                        name={item.pushStatus === 'ACTIVE' ? 'notifications' : 'notifications-off-outline'}
                        size={12}
                        color={item.pushStatus === 'ACTIVE' ? '#047857' : item.pushStatus === 'PENDING' ? '#B45309' : '#64748B'}
                    />
                    <Text style={[
                        styles.statusChipText,
                        { color: item.pushStatus === 'ACTIVE' ? '#047857' : item.pushStatus === 'PENDING' ? '#B45309' : '#64748B' },
                    ]}>
                        {item.pushStatus === 'ACTIVE' ? 'Bildirim açık' : item.pushStatus === 'PENDING' ? 'İzin bekliyor' : 'Bildirim kapalı'}
                    </Text>
                </TouchableOpacity>
                {item.isVerified && (
                    <View style={[styles.statusChip, styles.statusChipInfo]}>
                        <Ionicons name="shield-checkmark" size={12} color="#2563EB" />
                        <Text style={[styles.statusChipText, { color: '#1D4ED8' }]}>Doğrulandı</Text>
                    </View>
                )}
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
                                ? Array.from(new Set(
                                    item.locations.map(loc => [loc.district, loc.city].filter(Boolean).join(', '))
                                )).join(' • ')
                                : Array.from(new Set(item.locations.map(loc => loc.city))).map(locationCity => {
                                    const districtCount = new Set(
                                        item.locations
                                            ?.filter(loc => loc.city === locationCity && loc.district)
                                            .map(loc => loc.district)
                                    ).size;
                                    return districtCount > 0 ? `${locationCity} (${districtCount} ilçe)` : locationCity;
                                }).join(' • ')
                            }
                        </Text>
                    </View>
                </TouchableOpacity>
            )}
            {(!item.locations || item.locations.length === 0) && (
                <View style={styles.locationsContainer}>
                    <View style={styles.locationsIconWrapper}>
                        <Ionicons name="location-outline" size={14} color={staticColors.textLight} />
                    </View>
                    <Text style={[styles.locationsText, { color: staticColors.textLight }]}>Konum belirtilmedi</Text>
                </View>
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
                    <View style={styles.contactInfoRow}>
                        <Ionicons name="finger-print-outline" size={14} color={colors.primary} />
                        <Text style={styles.contactInfoLabel}>Kullanıcı ID:</Text>
                        <Text style={styles.contactInfoValue} selectable numberOfLines={1}>{item.id}</Text>
                    </View>
                    <View style={styles.contactInfoRow}>
                        <Ionicons name="pulse-outline" size={14} color={colors.primary} />
                        <Text style={styles.contactInfoLabel}>Son görülme:</Text>
                        <Text style={styles.contactInfoValue} selectable>
                            {item.lastSeenAt ? new Date(item.lastSeenAt).toLocaleString('tr-TR') : 'Kayıt yok'}
                        </Text>
                    </View>
                </View>
            )}
            <View style={styles.actionRow}>
                {item.id !== currentAdminId && (
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnPrimary, { borderColor: colors.primary + '30' }]}
                        onPress={() => handleSendMessage(item.id)}
                        disabled={messagingUserId === item.id}
                    >
                        {messagingUserId === item.id ? (
                            <ActivityIndicator size={16} color={colors.primary} />
                        ) : (
                            <Ionicons name="chatbubble-ellipses-outline" size={17} color={colors.primary} />
                        )}
                        <Text style={[styles.actionBtnText, { color: colors.primary }]}>Mesaj</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity
                    style={[styles.actionBtn, styles.actionBtnPrimary, { borderColor: '#6366F130' }]}
                    onPress={() => toggleInfo(item.id)}
                >
                    <Ionicons name={expandedInfo.has(item.id) ? 'chevron-up' : 'information-circle-outline'} size={17} color="#6366F1" />
                    <Text style={[styles.actionBtnText, { color: '#4F46E5' }]}>Bilgiler</Text>
                </TouchableOpacity>
                {item.userType === 'ELECTRICIAN' && (
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnPrimary, { borderColor: '#10B98130' }]}
                        onPress={() => openCreditModal(item.id)}
                    >
                        <Ionicons name="wallet-outline" size={17} color="#059669" />
                        <Text style={[styles.actionBtnText, { color: '#047857' }]}>Kredi</Text>
                    </TouchableOpacity>
                )}
                {item.userType !== 'ADMIN' && (
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnPrimary, { borderColor: '#CBD5E1' }]}
                        onPress={() => toggleActions(item.id)}
                    >
                        <Ionicons name={expandedActions.has(item.id) ? 'chevron-up' : 'options-outline'} size={17} color="#475569" />
                        <Text style={[styles.actionBtnText, { color: '#334155' }]}>Yönet</Text>
                    </TouchableOpacity>
                )}
            </View>

            {expandedActions.has(item.id) && item.userType !== 'ADMIN' && (
                <View style={styles.managementPanel}>
                    <Text style={styles.managementTitle}>Hesap işlemleri</Text>
                    <View style={styles.managementRow}>
                        {item.isActive && !item.isBanned && (
                            <TouchableOpacity
                                style={[styles.managementBtn, styles.managementBtnWarning]}
                                onPress={() => handleImpersonate(item)}
                                disabled={impersonatingUserId === item.id}
                            >
                                {impersonatingUserId === item.id ? (
                                    <ActivityIndicator size={15} color="#B45309" />
                                ) : (
                                    <Ionicons name="log-in-outline" size={16} color="#B45309" />
                                )}
                                <Text style={[styles.managementBtnText, { color: '#92400E' }]}>Hesaba gir</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={[styles.managementBtn, item.isActive ? styles.managementBtnDanger : styles.managementBtnSuccess]}
                            onPress={() => toggleUserStatus(item.id, item.isActive)}
                        >
                            <Ionicons
                                name={item.isActive ? 'pause-circle-outline' : 'play-circle-outline'}
                                size={16}
                                color={item.isActive ? '#DC2626' : '#059669'}
                            />
                            <Text style={[styles.managementBtnText, { color: item.isActive ? '#B91C1C' : '#047857' }]}>
                                {item.isActive ? 'Askıya al' : 'Aktif et'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.managementBtn, styles.managementBtnDanger]}
                            onPress={() => handleDeleteUser(item.id, item.fullName)}
                        >
                            <Ionicons name="trash-outline" size={16} color="#DC2626" />
                            <Text style={[styles.managementBtnText, { color: '#B91C1C' }]}>Sil</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </TouchableOpacity>
    );
};

    const FilterButton = ({ type, label }: { type: FilterType; label: string }) => (
        <TouchableOpacity
            style={[
                styles.filterBtn, 
                filter === type && { backgroundColor: colors.primary, borderColor: colors.primary, elevation: 4 }
            ]}
            onPress={() => setFilter(type)}
        >
            <Text style={[styles.filterBtnText, filter === type && { color: '#fff' }]}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: '#F8FAFC' }]}>
            <PremiumHeader title="Kullanıcı Yönetimi" subtitle={`${totalCount} kayıt • otomatik güncel`} showBackButton />

            <View style={styles.controlPanel}>
                <View style={styles.searchBox}>
                    <Ionicons name="search" size={18} color={staticColors.textLight} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="İsim, telefon veya mail ara..."
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
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    contentContainerStyle={styles.filterScroll}
                >
                    <FilterButton type="ALL" label="Tümü" />
                    <FilterButton type="CITIZEN" label="Vatandaş" />
                    <FilterButton type="ELECTRICIAN" label="Usta" />
                    <FilterButton type="ENGINEER" label="Mühendis" />
                </ScrollView>
                <View style={styles.bulkToolbar}>
                    <TouchableOpacity onPress={handleSelectAll} style={styles.selectAllButton}>
                        <Ionicons
                            name={selectedUsers.size === users.length && users.length > 0 ? 'checkbox' : 'square-outline'}
                            size={19}
                            color={colors.primary}
                        />
                        <Text style={[styles.selectAllText, { color: colors.primary }]}>
                            {selectedUsers.size === users.length && users.length > 0 ? 'Seçimi kaldır' : 'Sayfadakileri seç'}
                        </Text>
                    </TouchableOpacity>
                    {users.length > 0 && (
                        <TouchableOpacity
                            onPress={() => setBulkNotifModalVisible(true)}
                            style={[styles.announcementButton, { backgroundColor: colors.primary }]}
                        >
                            <Ionicons name="megaphone-outline" size={15} color="#fff" />
                            <Text style={styles.announcementText}>
                                {selectedUsers.size > 0 ? `${selectedUsers.size} kişiye duyuru` : 'Hızlı duyuru'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <View style={styles.resultsHeader}>
                <View>
                    <Text style={styles.resultsTitle}>Kullanıcılar</Text>
                    <Text style={styles.resultsSubtitle}>
                        {selectedUsers.size > 0 ? `${selectedUsers.size} kullanıcı seçildi` : `${totalCount} kayıt listeleniyor`}
                    </Text>
                </View>
                <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>Canlı</Text>
                </View>
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
                            const nextPage = page + 1;
                            setPage(nextPage);
                            fetchUsers(nextPage, false);
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
    controlPanel: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: spacing.md,
        marginTop: 12,
        borderRadius: 20,
        padding: 12,
        borderWidth: 1,
        borderColor: '#E8EEF4',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 2,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 13,
        paddingHorizontal: 14,
        height: 48,
        gap: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        backgroundColor: '#F8FAFC',
    },
    searchInput: {
        flex: 1,
        fontFamily: fonts.medium,
        fontSize: 15,
        color: staticColors.text,
    },
    filterScroll: {
        paddingTop: 10,
        paddingBottom: 2,
        gap: 8,
    },
    filterBtn: {
        paddingHorizontal: 15,
        paddingVertical: 9,
        borderRadius: 12,
        backgroundColor: staticColors.white,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    filterBtnText: {
        fontFamily: fonts.semiBold,
        fontSize: 13,
        color: staticColors.textSecondary,
    },
    bulkToolbar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 12,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    selectAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        paddingVertical: 6,
    },
    selectAllText: {
        fontFamily: fonts.semiBold,
        fontSize: 12,
    },
    announcementButton: {
        minHeight: 36,
        paddingHorizontal: 12,
        borderRadius: 11,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    announcementText: {
        color: '#FFFFFF',
        fontFamily: fonts.bold,
        fontSize: 12,
    },
    resultsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingTop: 17,
        paddingBottom: 4,
    },
    resultsTitle: {
        color: '#0F172A',
        fontFamily: fonts.bold,
        fontSize: 17,
    },
    resultsSubtitle: {
        color: '#94A3B8',
        fontFamily: fonts.medium,
        fontSize: 11,
        marginTop: 2,
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#ECFDF5',
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 10,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#10B981',
    },
    liveText: {
        color: '#047857',
        fontFamily: fonts.semiBold,
        fontSize: 10,
    },
    listContent: {
        paddingHorizontal: spacing.md,
        paddingTop: 8,
        paddingBottom: 80,
    },
    userCard: {
        backgroundColor: staticColors.white,
        borderRadius: 18,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.055,
        shadowRadius: 12,
        elevation: 3,
    },
    userCardInactive: {
        backgroundColor: '#FFFBFB',
        borderColor: '#FECACA',
    },
    userHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    selectionButton: {
        width: 26,
        height: 44,
        justifyContent: 'center',
        alignItems: 'flex-start',
        marginRight: 4,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    avatarImage: {
        width: 48,
        height: 48,
        borderRadius: 15,
    },
    userInfo: {
        flex: 1,
        marginLeft: 11,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    userName: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: staticColors.text,
        maxWidth: 145,
    },
    userPhone: {
        fontFamily: fonts.medium,
        fontSize: 12,
        color: staticColors.textSecondary,
        marginTop: 2,
    },
    userRegisterDate: {
        fontFamily: fonts.medium,
        fontSize: 10,
        color: '#94A3B8',
        marginTop: 2,
    },
    userTypeContainer: {
        alignItems: 'flex-end',
    },
    userTypeBadge: {
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 9,
    },
    userTypeText: {
        fontFamily: fonts.semiBold,
        fontSize: 11,
    },
    statusRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 13,
    },
    statusChip: {
        minHeight: 25,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 8,
        borderRadius: 9,
        borderWidth: 1,
    },
    statusChipSuccess: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
    statusChipDanger: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
    statusChipWarning: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
    statusChipMuted: { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' },
    statusChipInfo: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusChipText: {
        fontFamily: fonts.semiBold,
        fontSize: 10,
    },
    userMeta: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 11,
        paddingTop: 11,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        gap: 8,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 9,
        paddingVertical: 6,
        borderRadius: 9,
    },
    metaText: {
        fontFamily: fonts.medium,
        fontSize: 12,
        color: staticColors.textSecondary,
    },
    actionRow: {
        flexDirection: 'row',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        gap: 7,
        flexWrap: 'wrap',
    },
    contactInfoBox: {
        backgroundColor: '#F8FAFC',
        borderRadius: 13,
        padding: 13,
        marginTop: 12,
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
        justifyContent: 'center',
        paddingHorizontal: 10,
        minHeight: 40,
        borderRadius: 11,
        gap: 6,
    },
    actionBtnPrimary: {
        flexGrow: 1,
        flexBasis: 72,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
    },
    actionBtnText: {
        fontFamily: fonts.semiBold,
        fontSize: 12,
    },
    managementPanel: {
        backgroundColor: '#F8FAFC',
        borderRadius: 14,
        padding: 11,
        marginTop: 9,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    managementTitle: {
        fontFamily: fonts.semiBold,
        fontSize: 10,
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginBottom: 8,
    },
    managementRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 7,
    },
    managementBtn: {
        flexGrow: 1,
        flexBasis: 88,
        minHeight: 38,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        borderWidth: 1,
    },
    managementBtnWarning: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
    managementBtnDanger: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
    managementBtnSuccess: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
    managementBtnText: {
        fontFamily: fonts.semiBold,
        fontSize: 11,
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
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 11,
        paddingHorizontal: 10,
        paddingVertical: 8,
        marginTop: 10,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    locationsIconWrapper: {
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
