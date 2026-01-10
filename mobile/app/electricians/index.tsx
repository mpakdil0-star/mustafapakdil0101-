import { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, Modal } from 'react-native';
import { PremiumAlert } from '../../components/common/PremiumAlert';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { API_ENDPOINTS, getFileUrl } from '../../constants/api';
import { Card } from '../../components/common/Card';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import { Button } from '../../components/common/Button';
import { Picker } from '../../components/common/Picker';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';
import { MOCK_ELECTRICIANS } from '../../data/mockElectricians';
import { userService } from '../../services/userService';
import { CITY_NAMES, getDistrictsByCity } from '../../constants/locations';

// Haversine formula to calculate distance between two points in km
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
};

const deg2rad = (deg: number) => {
    return deg * (Math.PI / 180);
};

export default function ElectriciansListScreen() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCity, setSelectedCity] = useState('');
    const [selectedDistrict, setSelectedDistrict] = useState('');
    const [activeFilter, setActiveFilter] = useState<string | null>(null);
    const [isCityModalVisible, setIsCityModalVisible] = useState(false);

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

    const [electricians, setElectricians] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [userLocations, setUserLocations] = useState<any[]>([]);

    const districtOptions = useMemo(() => {
        if (!selectedCity || selectedCity === 'Tümü') return [];
        return getDistrictsByCity(selectedCity);
    }, [selectedCity]);

    const loadElectricians = async () => {
        setLoading(true);
        try {
            const result = await userService.getElectricians();
            if (result && result.success) {
                setElectricians(result.data);
            }
        } catch (error) {
            console.error('Error loading electricians:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadUserLocations = async () => {
        try {
            const response = await api.get(API_ENDPOINTS.LOCATIONS);
            if (response.data.success) {
                const locations = response.data.data;
                setUserLocations(locations);

                // Automatically select the default city if available and no city is currently selected
                if (locations.length > 0 && !selectedCity) {
                    const defaultLoc = locations.find((l: any) => l.isDefault) || locations[0];
                    if (defaultLoc?.city) {
                        setSelectedCity(defaultLoc.city);
                    }
                }
            }
        } catch (error) {
            console.error('Error loading user locations:', error);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadElectricians();
            loadUserLocations();
        }, [])
    );

    const filteredElectricians = useMemo(() => {
        // Mock data ve API verisini birleştir
        const combinedData = [
            ...MOCK_ELECTRICIANS.map(m => ({
                ...m,
                profileImageUrl: m.imageUrl // Mock verilerdeki imageUrl'i profileImageUrl'e çevir
            })),
            ...electricians.map(e => ({
                id: e.id,
                name: e.fullName,
                rating: Number(e.electricianProfile?.ratingAverage) || 0,
                reviewCount: e.electricianProfile?.totalReviews || 0,
                specialty: e.electricianProfile?.specialties?.[0] || 'Genel Hizmet',
                isVerified: e.isVerified,
                location: e.locations?.[0] ? `${e.locations[0].district}, ${e.locations[0].city}` : 'Konum Belirtilmedi',
                city: e.locations?.[0]?.city || 'Diğer',
                experience: `${e.electricianProfile?.experienceYears || 0} Yıl`,
                isAvailable: e.electricianProfile?.isAvailable ?? true,
                profileImageUrl: e.profileImageUrl,
                latestReview: e.reviewsReceived?.[0] ? {
                    comment: e.reviewsReceived[0].comment,
                    user: e.reviewsReceived[0].reviewer?.fullName || 'Anonim Kullanıcı'
                } : null,
                coordinates: e.locations?.[0] ? {
                    latitude: Number(e.locations[0].latitude),
                    longitude: Number(e.locations[0].longitude)
                } : null
            }))
        ];

        // Mükerrer kayıtları önle
        const uniqueData = Array.from(new Map(combinedData.map(item => [item.id, item])).values());

        let result = uniqueData.filter((elec) => {
            const matchesSearch =
                elec.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                elec.specialty.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesCity = !selectedCity || selectedCity === 'Tümü' ||
                elec.city.toLowerCase() === selectedCity.toLowerCase() ||
                elec.location.toLowerCase().includes(selectedCity.toLowerCase());

            const matchesDistrict = !selectedDistrict ||
                elec.location.toLowerCase().includes(selectedDistrict.toLowerCase());

            const matchesAvailable = activeFilter === 'available' ? (elec as any).isAvailable : true;

            return matchesSearch && matchesCity && matchesDistrict && matchesAvailable;
        });

        // Sıralama Mantığı
        if (activeFilter === 'near') {
            if (userLocations.length > 0) {
                const defaultLoc = userLocations.find((l: any) => l.isDefault) || userLocations[0];
                const userCity = defaultLoc.city;

                // Sadece kullanıcının şehrindeki ustaları getir
                const normalize = (str: string) => str ? str.toLowerCase().trim() : '';
                const cityFiltered = result.filter((elec: any) => {
                    const elecCity = normalize(elec.city);
                    const targetCity = normalize(userCity);
                    return elecCity === targetCity || elecCity.includes(targetCity) || targetCity.includes(elecCity);
                });

                if (cityFiltered.length > 0) {
                    result = cityFiltered;
                } else {
                    showAlert('Bu Şehirde Usta Yok', `${userCity} şehrinde henüz hizmet veren usta bulunmuyor.`, 'warning');
                }
            } else {
                showAlert('Adres Bulunamadı', 'Konum bazlı arama için lütfen profilinize bir adres ekleyin.', 'warning');
            }
        } else if (activeFilter === 'popular') {
            result = [...result].sort((a, b) => b.reviewCount - a.reviewCount);
        }

        return result;
    }, [searchQuery, selectedCity, selectedDistrict, activeFilter, electricians, userLocations]);

    return (
        <View style={styles.container}>
            <PremiumHeader title="Tüm Ustalar" showBackButton />

            {/* Search and Filters Header */}
            <View style={styles.filterSection}>
                <View style={styles.searchRow}>
                    <View style={styles.searchBar}>
                        <Ionicons name="search-outline" size={20} color={colors.textLight} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Usta veya uzmanlık ara..."
                            placeholderTextColor={colors.textLight}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={18} color={colors.textLight} />
                            </TouchableOpacity>
                        )}
                    </View>

                    <TouchableOpacity
                        style={[
                            styles.filterBtn,
                            selectedCity && selectedCity !== 'Tümü' && styles.filterBtnActive
                        ]}
                        onPress={() => setIsCityModalVisible(true)}
                    >
                        <Ionicons
                            name="location-outline"
                            size={20}
                            color={selectedCity && selectedCity !== 'Tümü' ? colors.white : colors.primary}
                        />
                    </TouchableOpacity>
                </View>

                {/* Show Active City/District Chips */}
                {(selectedCity || selectedDistrict) && (
                    <View style={styles.activeFilters}>
                        {selectedCity && selectedCity !== 'Tümü' && (
                            <View style={styles.filterChip}>
                                <Text style={styles.filterChipText}>{selectedCity}</Text>
                                <TouchableOpacity onPress={() => { setSelectedCity('Tümü'); setSelectedDistrict(''); }}>
                                    <Ionicons name="close" size={14} color={colors.primary} />
                                </TouchableOpacity>
                            </View>
                        )}
                        {selectedDistrict && (
                            <View style={[styles.filterChip, { marginLeft: 8 }]}>
                                <Text style={styles.filterChipText}>{selectedDistrict}</Text>
                                <TouchableOpacity onPress={() => setSelectedDistrict('')}>
                                    <Ionicons name="close" size={14} color={colors.primary} />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}

                {/* Quick Selection Filters */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.quickFiltersContainer}
                >
                    <TouchableOpacity
                        style={[styles.quickFilterChip, activeFilter === 'near' && styles.quickFilterChipActive]}
                        onPress={() => setActiveFilter(activeFilter === 'near' ? null : 'near')}
                    >
                        <Ionicons name="location" size={14} color={activeFilter === 'near' ? colors.white : colors.primary} />
                        <Text style={[styles.quickFilterText, activeFilter === 'near' && styles.quickFilterTextActive]}>En Yakın</Text>
                    </TouchableOpacity>


                </ScrollView>
            </View>

            {/* City Selection Modal - Form Style */}
            <Modal
                visible={isCityModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsCityModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Konum Filtrele</Text>
                            <TouchableOpacity onPress={() => setIsCityModalVisible(false)} style={styles.modalCloseBtn}>
                                <Ionicons name="close" size={24} color={colors.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={{ padding: 20 }}>
                            <Picker
                                label="Şehir"
                                value={selectedCity === 'Tümü' ? '' : selectedCity}
                                options={['Tümü', ...CITY_NAMES]}
                                onValueChange={(val) => {
                                    setSelectedCity(val);
                                    setSelectedDistrict('');
                                }}
                                placeholder="Şehir Seçiniz"
                            />

                            <Picker
                                label="İlçe"
                                value={selectedDistrict}
                                options={['Tümü', ...districtOptions]}
                                onValueChange={(val) => val === 'Tümü' ? setSelectedDistrict('') : setSelectedDistrict(val)}
                                disabled={!selectedCity || selectedCity === 'Tümü'}
                                placeholder={!selectedCity || selectedCity === 'Tümü' ? 'Önce Şehir Seçin' : 'İlçe Seçiniz'}
                            />

                            <Button
                                title="Filtrele"
                                onPress={() => setIsCityModalVisible(false)}
                                variant="primary"
                                style={{ marginTop: 20 }}
                            />
                            <Button
                                title="Temizle"
                                onPress={() => {
                                    setSelectedCity('Tümü');
                                    setSelectedDistrict('');
                                    setIsCityModalVisible(false);
                                }}
                                variant="outline"
                                style={{ marginTop: 10 }}
                            />
                        </View>
                    </View>
                </View>
            </Modal>

            <ScrollView
                style={styles.listContainer}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.resultsText}>
                    {filteredElectricians.length} uzman usta listeleniyor
                </Text>

                {filteredElectricians.map((electrician) => (
                    <Card key={electrician.id} variant="default" style={styles.electricianCard}>
                        <TouchableOpacity
                            style={styles.cardPressable}
                            onPress={() => router.push(`/electricians/${electrician.id}` as any)}
                            activeOpacity={0.8}
                        >
                            <View style={styles.profileRow}>
                                <View style={styles.avatarWrapper}>
                                    {(electrician.profileImageUrl || (electrician as any).imageUrl) ? (
                                        <Image
                                            source={{ uri: getFileUrl(electrician.profileImageUrl || (electrician as any).imageUrl) || '' }}
                                            style={styles.avatarImg}
                                        />
                                    ) : (
                                        <View style={styles.fallbackAvatar}>
                                            <Text style={styles.avatarInitial}>
                                                {electrician.name.charAt(0)}
                                            </Text>
                                        </View>
                                    )}
                                    {electrician.isVerified && (
                                        <View style={styles.verifiedBadge}>
                                            <Ionicons name="shield-checkmark" size={10} color={colors.white} />
                                        </View>
                                    )}
                                </View>

                                <View style={styles.mainInfo}>
                                    <View style={styles.topRow}>
                                        <Text style={styles.name} numberOfLines={1}>{electrician.name}</Text>
                                        <View style={styles.ratingBox}>
                                            <Ionicons name="star" size={12} color="#F59E0B" />
                                            <Text style={styles.ratingVal}>{electrician.rating.toFixed(1)}</Text>
                                        </View>
                                    </View>

                                    <Text style={styles.specialtyText}>{electrician.specialty}</Text>

                                    <View style={styles.metaInfoRow}>
                                        <View style={styles.metaBadge}>
                                            <Ionicons name="location-outline" size={12} color={colors.primary} />
                                            <Text style={styles.metaBadgeText}>{electrician.location}</Text>
                                        </View>
                                        <View style={[styles.metaBadge, { backgroundColor: colors.success + '10' }]}>
                                            <Ionicons name="ribbon-outline" size={12} color={colors.success} />
                                            <Text style={[styles.metaBadgeText, { color: colors.success }]}>{electrician.experience}</Text>
                                        </View>
                                    </View>
                                </View>

                                <Ionicons name="chevron-forward" size={18} color={colors.borderAccent} />
                            </View>

                            {electrician.latestReview && (
                                <View style={styles.reviewBox}>
                                    <Ionicons name="chatbubble-outline" size={12} color={colors.primary + '50'} style={{ marginBottom: 4 }} />
                                    <Text style={styles.reviewComment} numberOfLines={1}>
                                        {electrician.latestReview.comment}
                                    </Text>
                                    <Text style={styles.reviewUser}>— {electrician.latestReview.user}</Text>
                                </View>
                            )}

                            <TouchableOpacity
                                style={styles.actionBtn}
                                onPress={() => router.push({ pathname: '/jobs/create', params: { electricianId: electrician.id } })}
                            >
                                <Text style={styles.actionBtnText}>Hemen İletişime Geç</Text>
                                <Ionicons name="chatbubbles-outline" size={16} color={colors.primary} />
                            </TouchableOpacity>
                        </TouchableOpacity>
                    </Card>
                ))}

                {filteredElectricians.length === 0 && (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIconContainer}>
                            <Ionicons name="search-outline" size={40} color={colors.primary + '30'} />
                        </View>
                        <Text style={styles.emptyTitle}>Usta Bulunamadı</Text>
                        <Text style={styles.emptyDesc}>Arama kriterlerinizi veya filtreleri değiştirerek tekrar deneyebilirsiniz.</Text>
                        <TouchableOpacity style={styles.resetBtn} onPress={() => { setSearchQuery(''); setSelectedCity('Tümü'); setActiveFilter(null); }}>
                            <Text style={styles.resetBtnText}>Filtreleri Temizle</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>

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
    filterSection: {
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.sm,
        backgroundColor: colors.background,
        zIndex: 1,
    },
    searchRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.sm,
        marginTop: 10,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: spacing.radius.lg,
        paddingHorizontal: spacing.md,
        height: 48,
        borderWidth: 1,
        borderColor: colors.border,
    },
    searchInput: {
        flex: 1,
        marginLeft: spacing.xs,
        fontFamily: fonts.medium,
        fontSize: 14,
        color: colors.text,
    },
    filterBtn: {
        width: 48,
        height: 48,
        borderRadius: spacing.radius.lg,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    filterBtnActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    activeFilters: {
        flexDirection: 'row',
        marginBottom: spacing.sm,
        paddingHorizontal: 4,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary + '15',
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: spacing.radius.md,
        gap: 6,
    },
    filterChipText: {
        fontFamily: fonts.medium,
        fontSize: 12,
        color: colors.primary,
    },
    quickFiltersContainer: {
        gap: spacing.sm,
        paddingRight: spacing.md,
    },
    quickFilterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.md,
        paddingVertical: 8,
        borderRadius: spacing.radius.round,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 6,
    },
    quickFilterChipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    quickFilterText: {
        fontFamily: fonts.medium,
        fontSize: 13,
        color: colors.textSecondary,
    },
    quickFilterTextActive: {
        color: colors.white,
    },
    listContainer: {
        flex: 1,
    },
    content: {
        padding: spacing.md,
        paddingTop: spacing.xs,
    },
    resultsText: {
        fontFamily: fonts.medium,
        fontSize: 13,
        color: colors.textSecondary,
        marginBottom: spacing.sm,
        marginLeft: 4,
    },
    electricianCard: {
        marginBottom: spacing.md,
        padding: 0,
        overflow: 'hidden',
    },
    cardPressable: {
        padding: spacing.md,
    },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    avatarWrapper: {
        position: 'relative',
        marginRight: spacing.sm,
    },
    avatarImg: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.borderLight,
    },
    fallbackAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.primary + '10',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitial: {
        fontFamily: fonts.bold,
        fontSize: 22,
        color: colors.primary,
    },
    verifiedBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: colors.primary,
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.white,
    },
    mainInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 2,
    },
    name: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: colors.text,
        flex: 1,
        marginRight: 8,
    },
    ratingBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFBEB',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        gap: 4,
    },
    ratingVal: {
        fontFamily: fonts.bold,
        fontSize: 12,
        color: '#D97706',
    },
    specialtyText: {
        fontFamily: fonts.medium,
        fontSize: 13,
        color: colors.textSecondary,
        marginBottom: 6,
    },
    metaInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    metaBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaBadgeText: {
        fontFamily: fonts.medium,
        fontSize: 12,
        color: colors.textSecondary,
    },
    reviewBox: {
        backgroundColor: colors.backgroundLight,
        borderRadius: 12,
        padding: 10,
        marginBottom: 12,
    },
    reviewComment: {
        fontFamily: fonts.regular,
        fontSize: 13,
        color: colors.text,
        marginBottom: 4,
    },
    reviewUser: {
        fontFamily: fonts.medium,
        fontSize: 11,
        color: colors.textSecondary,
        textAlign: 'right',
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary + '10',
        paddingVertical: 10,
        borderRadius: 12,
        gap: 8,
    },
    actionBtnText: {
        fontFamily: fonts.bold,
        fontSize: 13,
        color: colors.primary,
    },
    emptyState: {
        alignItems: 'center',
        padding: 40,
        marginTop: 20,
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.primary + '05',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontFamily: fonts.bold,
        fontSize: 18,
        color: colors.text,
        marginBottom: 8,
    },
    emptyDesc: {
        fontFamily: fonts.regular,
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: 24,
    },
    resetBtn: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: colors.surface,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border,
    },
    resetBtnText: {
        fontFamily: fonts.medium,
        fontSize: 14,
        color: colors.text,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        minHeight: 400,
        paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
    },
    modalTitle: {
        fontFamily: fonts.bold,
        fontSize: 18,
        color: colors.text,
    },
    modalCloseBtn: {
        padding: 4,
    },
});
