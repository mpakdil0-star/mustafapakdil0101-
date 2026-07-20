import { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput, Modal } from 'react-native';
import { PremiumAlert } from '../../components/common/PremiumAlert';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getFileUrl } from '../../constants/api';
import locationService from '../../services/locationService';
import { Card } from '../../components/common/Card';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import { Button } from '../../components/common/Button';
import { Picker } from '../../components/common/Picker';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';
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

const getSpecialtyIcon = (specialty: string) => {
    const spec = specialty || '';
    if (spec.includes('Elektrik')) return 'flash-sharp';
    if (spec.includes('Çilingir')) return 'key-sharp';
    if (spec.includes('Klima')) return 'snow-sharp';
    if (spec.includes('Beyaz Eşya')) return 'hardware-chip-sharp';
    if (spec.includes('Tesisat')) return 'water-sharp';
    if (spec.includes('Temizlik')) return 'sparkles';
    if (spec.includes('Nakliyat')) return 'car-sharp';
    if (spec.includes('Boya')) return 'color-palette-sharp';
    if (spec.includes('Koltuk') || spec.includes('Halı')) return 'bed-sharp';
    if (spec.includes('Mobilya')) return 'cube-sharp';
    if (spec.includes('Küçük Nakliye')) return 'cube-outline';
    if (spec.includes('Kombi')) return 'flame-sharp';
    if (spec.includes('Asansör')) return 'swap-vertical-sharp';
    if (spec.includes('Böcek') || spec.includes('İlaçlama')) return 'bug-sharp';
    if (spec.includes('Güvenlik') || spec.includes('Kamera')) return 'videocam-sharp';
    return 'construct-sharp';
};

interface FilterChipProps {
    label: string;
    active: boolean;
    onPress: () => void;
    icon?: string;
}

const FilterChip = ({ label, active, onPress, icon }: FilterChipProps) => (
    <TouchableOpacity
        style={[
            styles.selectableFilterChip,
            active && styles.selectableFilterChipActive
        ]}
        onPress={onPress}
    >
        {icon && <Ionicons name={icon as any} size={14} color={active ? colors.white : colors.primary} />}
        <Text style={[
            styles.selectableFilterChipText,
            active && styles.selectableFilterChipTextActive
        ]}>{label}</Text>
    </TouchableOpacity>
);

export default function ElectriciansListScreen() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCity, setSelectedCity] = useState('');
    const [selectedDistrict, setSelectedDistrict] = useState('');
    const [activeFilters, setActiveFilters] = useState({
        sortBy: null as string | null,
        isEngineerOnly: false
    });
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
            const response = { data: { success: true, data: await locationService.getSavedLocations() } };
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
        // Helper: serviceCategory veya specialties içeriğinden ana kategori etiketini belirler
        const resolveCategory = (item: any): string => {
            const cat = item.serviceCategory || item.electricianProfile?.serviceCategory;
            if (cat === 'cilingir') return 'Çilingir';
            if (cat === 'klima') return 'Klima';
            if (cat === 'beyaz-esya') return 'Beyaz Eşya';
            if (cat === 'tesisat') return 'Tesisat';
            if (cat === 'elektrik') return 'Elektrik';
            if (cat === 'temizlik') return 'Temizlik';
            if (cat === 'nakliyat') return 'Nakliyat';
            if (cat === 'boya-badana') return 'Boya Badana';
            if (cat === 'koltuk-hali') return 'Koltuk/Halı Yıkama';
            if (cat === 'mobilya-montaj') return 'Mobilya Montaj';
            if (cat === 'kucuk-nakliye') return 'Küçük Nakliye';
            if (cat === 'kombi-servis') return 'Kombi Servisi';
            if (cat === 'asansor') return 'Asansör Bakım';
            if (cat === 'bocek-ilaclama') return 'Böcek İlaçlama';
            if (cat === 'guvenlik-kamera') return 'Güvenlik Kamera';

            const specs = item.specialties || item.electricianProfile?.specialties || item.services || [];
            const specsStr = Array.isArray(specs) ? specs.join(' ').toLowerCase() : '';
            if (specsStr.includes('klima') || specsStr.includes('soğutma') || specsStr.includes('isıtma')) return 'Klima';
            if (specsStr.includes('anahtar') || specsStr.includes('kilit') || specsStr.includes('barel')) return 'Çilingir';
            if (specsStr.includes('beyaz eşya') || specsStr.includes('buzdolabı') || specsStr.includes('çamaşır')) return 'Beyaz Eşya';
            if (specsStr.includes('tesisat') || specsStr.includes('musluk') || specsStr.includes('boru')) return 'Tesisat';

            return 'Elektrik';
        };

        const combinedData = [
            ...electricians.map(e => ({
                id: e.id,
                name: e.fullName,
                rating: Number(e.electricianProfile?.ratingAverage) || 0,
                reviewCount: e.electricianProfile?.totalReviews || 0,
                specialty: resolveCategory(e),
                isVerified: e.isVerified === true && e.electricianProfile?.verificationStatus === 'VERIFIED',
                isAuthorizedEngineer: e.electricianProfile?.isAuthorizedEngineer || false,
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

            const matchesAvailable = activeFilters.sortBy === 'available' ? (elec as any).isAvailable : true;
            const matchesEngineer = activeFilters.isEngineerOnly ? (elec as any).isAuthorizedEngineer : true;

            return matchesSearch && matchesCity && matchesDistrict && matchesAvailable && matchesEngineer;
        });

        // Sıralama Mantığı
        if (activeFilters.sortBy === 'popular') {
            result = [...result].sort((a, b) => b.reviewCount - a.reviewCount);
        }

        return result;
    }, [searchQuery, selectedCity, selectedDistrict, activeFilters, electricians, userLocations]);

    return (
        <View style={styles.container}>
            <PremiumHeader title="Öne Çıkan Ustalar" showBackButton />

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
                    <View style={{ alignItems: 'center' }}>
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
                        {selectedCity && selectedCity !== 'Tümü' && (
                            <Text style={styles.selectedCityLabel} numberOfLines={1}>{selectedCity}</Text>
                        )}
                    </View>
                </View>

                {/* Show Active District/Special Chips */}
                {(selectedDistrict || activeFilters.isEngineerOnly) && (
                    <View style={styles.activeFilters}>
                        {selectedDistrict && (
                            <View style={[styles.filterChip, { marginLeft: 0 }]}>
                                <Ionicons name="navigate-circle" size={12} color={colors.primary} />
                                <Text style={styles.filterChipText}>{selectedDistrict}</Text>
                                <TouchableOpacity
                                    onPress={() => setSelectedDistrict('')}
                                    style={styles.filterChipClose}
                                >
                                    <Ionicons name="close-circle" size={16} color={colors.primary} />
                                </TouchableOpacity>
                            </View>
                        )}
                        {activeFilters.isEngineerOnly && (
                            <View style={[styles.filterChip, { marginLeft: selectedDistrict ? 8 : 0 }]}>
                                <Ionicons name="ribbon-sharp" size={12} color={colors.primary} />
                                <Text style={styles.filterChipText}>Yetkili Mühendis</Text>
                                <TouchableOpacity
                                    onPress={() => setActiveFilters(prev => ({ ...prev, isEngineerOnly: false }))}
                                    style={styles.filterChipClose}
                                >
                                    <Ionicons name="close-circle" size={16} color={colors.primary} />
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
                        style={[styles.quickFilterChip, activeFilters.sortBy === 'popular' && styles.quickFilterChipActive]}
                        onPress={() => setActiveFilters(prev => ({ ...prev, sortBy: prev.sortBy === 'popular' ? null : 'popular' }))}
                    >
                        <Ionicons name="star" size={14} color={activeFilters.sortBy === 'popular' ? colors.white : colors.primary} />
                        <Text style={[styles.quickFilterText, activeFilters.sortBy === 'popular' && styles.quickFilterTextActive]}>En Popüler</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.quickFilterChip, activeFilters.isEngineerOnly && styles.quickFilterChipActive]}
                        onPress={() => setActiveFilters(prev => ({ ...prev, isEngineerOnly: !prev.isEngineerOnly }))}
                    >
                        <Ionicons name="ribbon" size={14} color={activeFilters.isEngineerOnly ? colors.white : colors.primary} />
                        <Text style={[styles.quickFilterText, activeFilters.isEngineerOnly && styles.quickFilterTextActive]}>Yetkili Mühendis</Text>
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
                            <View style={styles.cardHeaderRow}>
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
                                    {/* Live Status Availability Dot */}
                                    <View style={[
                                        styles.statusDot,
                                        electrician.isAvailable ? styles.statusDotActive : styles.statusDotBusy
                                    ]} />
                                </View>

                                <View style={styles.headerMainInfo}>
                                    <View style={styles.nameBadgeRow}>
                                        <Text style={styles.name} numberOfLines={1}>{electrician.name}</Text>
                                        {electrician.isAuthorizedEngineer && (
                                            <View style={styles.engineerBadge}>
                                                <View style={styles.engineerBadgeInner}>
                                                    <Ionicons name="ribbon" size={10} color={colors.primary} />
                                                    <Text style={styles.engineerBadgeText}>MÜHENDİS</Text>
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                    <View style={styles.specialtyContainer}>
                                        <View style={[
                                            styles.specialtyBadge,
                                            electrician.specialty.includes('Elektrik') && styles.specialtyBadge_elektrik,
                                            electrician.specialty.includes('Çilingir') && styles.specialtyBadge_cilingir,
                                            electrician.specialty.includes('Klima') && styles.specialtyBadge_klima,
                                            electrician.specialty.includes('Beyaz Eşya') && styles.specialtyBadge_beyaz_esya,
                                            electrician.specialty.includes('Tesisat') && styles.specialtyBadge_tesisat
                                        ]}>
                                            <Ionicons 
                                                name={getSpecialtyIcon(electrician.specialty) as any} 
                                                size={11} 
                                                color={
                                                    electrician.specialty.includes('Elektrik') ? '#0D9488' :
                                                    electrician.specialty.includes('Çilingir') ? '#A855F7' :
                                                    electrician.specialty.includes('Klima') ? '#0EA5E9' :
                                                    electrician.specialty.includes('Beyaz Eşya') ? '#6366F1' :
                                                    electrician.specialty.includes('Tesisat') ? '#F97316' : '#475569'
                                                } 
                                                style={{ marginRight: 4 }}
                                            />
                                            <Text style={[
                                                styles.specialtyBadgeText,
                                                electrician.specialty.includes('Elektrik') && styles.specialtyBadgeText_elektrik,
                                                electrician.specialty.includes('Çilingir') && styles.specialtyBadgeText_cilingir,
                                                electrician.specialty.includes('Klima') && styles.specialtyBadgeText_klima,
                                                electrician.specialty.includes('Beyaz Eşya') && styles.specialtyBadgeText_beyaz_esya,
                                                electrician.specialty.includes('Tesisat') && styles.specialtyBadgeText_tesisat
                                            ]}>
                                                {electrician.specialty}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.ratingBox}>
                                    <Ionicons name="star" size={12} color="#F59E0B" />
                                    <Text style={styles.ratingVal}>
                                        {electrician.rating.toFixed(1)}
                                    </Text>
                                    <Text style={styles.reviewCountTxt}>({electrician.reviewCount})</Text>
                                </View>
                            </View>

                            <View style={styles.metaRow}>
                                <View style={styles.metaBadge}>
                                    <Ionicons name="location-outline" size={12} color={colors.primary} />
                                    <Text style={styles.metaBadgeText}>{electrician.location}</Text>
                                </View>
                                <View style={[styles.metaBadge, styles.experienceBadgeContainer]}>
                                    <Ionicons name="ribbon-outline" size={12} color={colors.success} />
                                    <Text style={styles.experienceBadgeText}>{electrician.experience}</Text>
                                </View>
                            </View>

                            {electrician.latestReview && (
                                <View style={styles.reviewBox}>
                                    <Ionicons 
                                        name={"quote" as any} 
                                        size={36} 
                                        color="rgba(13, 148, 136, 0.04)" 
                                        style={styles.reviewWatermark} 
                                    />
                                    <View style={styles.reviewContentRow}>
                                        <Ionicons name="chatbubbles-outline" size={14} color={colors.primary} style={styles.reviewIcon} />
                                        <Text style={styles.reviewComment} numberOfLines={2}>
                                            "{electrician.latestReview.comment}"
                                        </Text>
                                    </View>
                                    <Text style={styles.reviewUser}>— {electrician.latestReview.user}</Text>
                                </View>
                            )}

                            <TouchableOpacity
                                onPress={() => router.push({ pathname: '/jobs/create', params: { electricianId: electrician.id } })}
                                activeOpacity={0.9}
                            >
                                <LinearGradient
                                    colors={[colors.primary, '#0891B2']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.actionBtn}
                                >
                                    <Text style={styles.actionBtnText}>Hemen İletişime Geç</Text>
                                    <Ionicons name="chatbubbles-outline" size={16} color={colors.white} />
                                </LinearGradient>
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
                        <TouchableOpacity style={styles.resetBtn} onPress={() => { setSearchQuery(''); setSelectedCity('Tümü'); setActiveFilters({ sortBy: null, isEngineerOnly: false }); }}>
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
        backgroundColor: 'rgba(15, 23, 42, 0.03)', // very light tint for clean contrast
        borderRadius: 14,
        paddingHorizontal: spacing.md,
        height: 46,
        borderWidth: 1.5,
        borderColor: 'rgba(13, 148, 136, 0.08)', // subtle teal border
    },
    searchInput: {
        flex: 1,
        marginLeft: spacing.xs,
        fontFamily: fonts.medium,
        fontSize: 14,
        color: colors.text,
    },
    filterBtn: {
        width: 46,
        height: 46,
        borderRadius: 14,
        backgroundColor: 'rgba(13, 148, 136, 0.05)', // very light teal zemin
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(13, 148, 136, 0.08)',
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
        backgroundColor: 'rgba(13, 148, 136, 0.08)',
        paddingLeft: 12,
        paddingRight: 6,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 6,
        borderWidth: 1,
        borderColor: 'rgba(13, 148, 136, 0.15)',
    },
    filterChipText: {
        fontFamily: fonts.bold,
        fontSize: 13,
        color: colors.primary,
        marginRight: 2,
    },
    filterChipClose: {
        marginLeft: 2,
    },
    selectedCityLabel: {
        fontFamily: fonts.bold,
        fontSize: 10,
        color: colors.primary,
        marginTop: 4,
        textAlign: 'center',
        maxWidth: 60,
    },
    quickFiltersContainer: {
        gap: spacing.sm,
        paddingRight: spacing.md,
    },
    quickFilterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 100,
        borderWidth: 1,
        borderColor: 'rgba(13, 148, 136, 0.12)', // subtle teal border
        gap: 6,
    },
    quickFilterChipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 3,
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
        marginBottom: 16,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0', // clean professional slate border
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.04, // very soft floating shadow
        shadowRadius: 16,
        elevation: 3,
        overflow: 'hidden',
    },
    cardPressable: {
        padding: spacing.md,
    },
    cardHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    headerMainInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    nameBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 2,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
        paddingLeft: 2,
    },
    experienceBadgeContainer: {
        backgroundColor: '#ECFDF5', // ultra soft premium success background
        borderWidth: 1,
        borderColor: '#A7F3D0', // soft emerald border
    },
    experienceBadgeText: {
        fontFamily: fonts.bold,
        fontSize: 11,
        color: '#059669', // solid emerald text
    },
    avatarWrapper: {
        position: 'relative',
        marginRight: spacing.sm,
        shadowColor: 'rgba(13, 148, 136, 0.2)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
    },
    avatarImg: {
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: colors.borderLight,
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    statusDot: {
        position: 'absolute',
        bottom: 2,
        left: 2,
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    statusDotActive: {
        backgroundColor: '#10B981', // emerald green
    },
    statusDotBusy: {
        backgroundColor: '#94A3B8', // slate gray
    },
    fallbackAvatar: {
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: 'rgba(13, 148, 136, 0.06)', // soft teal zemin
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(13, 148, 136, 0.15)',
    },
    avatarInitial: {
        fontFamily: fonts.bold,
        fontSize: 22,
        color: colors.primary,
    },
    verifiedBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        backgroundColor: colors.primary,
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#FFFFFF',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 2,
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
        fontSize: 17,
        color: '#0F172A', // Slate 900 for premium contrast
        flex: 1,
        marginRight: 8,
    },
    ratingBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFBEB', // premium warm amber background
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
        borderWidth: 1,
        borderColor: '#FDE68A', // golden border
    },
    ratingVal: {
        fontFamily: fonts.bold,
        fontSize: 12,
        color: '#B45309', // elegant deep amber text
    },
    reviewCountTxt: {
        fontFamily: fonts.medium,
        fontSize: 10,
        color: '#78350F', // Darker elegant amber
        opacity: 0.85,
    },
    specialtyContainer: {
        flexDirection: 'row',
        marginTop: 4,
    },
    specialtyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3.5,
        borderRadius: 8,
        backgroundColor: 'rgba(15, 23, 42, 0.04)',
    },
    specialtyBadgeText: {
        fontFamily: fonts.bold,
        fontSize: 11,
        color: '#475569',
        letterSpacing: 0.3,
    },
    specialtyBadge_elektrik: {
        backgroundColor: 'rgba(13, 148, 136, 0.08)',
    },
    specialtyBadgeText_elektrik: {
        color: '#0D9488',
    },
    specialtyBadge_cilingir: {
        backgroundColor: 'rgba(168, 85, 247, 0.08)',
    },
    specialtyBadgeText_cilingir: {
        color: '#A855F7',
    },
    specialtyBadge_klima: {
        backgroundColor: 'rgba(14, 165, 233, 0.08)',
    },
    specialtyBadgeText_klima: {
        color: '#0EA5E9',
    },
    specialtyBadge_beyaz_esya: {
        backgroundColor: 'rgba(99, 102, 241, 0.08)',
    },
    specialtyBadgeText_beyaz_esya: {
        color: '#6366F1',
    },
    specialtyBadge_tesisat: {
        backgroundColor: 'rgba(249, 115, 22, 0.08)',
    },
    specialtyBadgeText_tesisat: {
        color: '#F97316',
    },
    metaInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
    },
    metaBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 4,
    },
    metaBadgeText: {
        fontFamily: fonts.medium,
        fontSize: 11,
        color: '#475569',
    },
    reviewBox: {
        position: 'relative', // critical for absolute positioned watermark
        backgroundColor: 'rgba(13, 148, 136, 0.02)', // ultra light teal
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: 'rgba(13, 148, 136, 0.05)',
        borderLeftWidth: 3,
        borderLeftColor: colors.primary, // clean teal accent line
        overflow: 'hidden',
    },
    reviewWatermark: {
        position: 'absolute',
        right: 8,
        bottom: -2,
    },
    reviewContentRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 4,
        zIndex: 1,
    },
    reviewIcon: {
        marginTop: 2,
        marginRight: 6,
    },
    reviewComment: {
        flex: 1,
        fontFamily: fonts.medium,
        fontStyle: 'italic',
        fontSize: 12,
        color: '#334155', // Slate 700
        lineHeight: 18, // increased line height for legibility
    },
    reviewUser: {
        fontFamily: fonts.bold,
        fontSize: 11,
        color: '#64748B', // Slate 500
        textAlign: 'right',
        marginTop: 4,
        zIndex: 1,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 14,
        gap: 8,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2, // soft glow shadow
        shadowRadius: 10,
        elevation: 4,
        marginTop: 6,
    },
    actionBtnText: {
        fontFamily: fonts.bold,
        fontSize: 13,
        color: colors.white, // White text
        letterSpacing: 0.8,
        textTransform: 'uppercase', // uppercase CTA is highly professional
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
    selectableFilterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        marginRight: 8,
        marginBottom: 8,
        gap: 6,
    },
    selectableFilterChipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    selectableFilterChipText: {
        fontFamily: fonts.medium,
        fontSize: 14,
        color: colors.textSecondary,
    },
    selectableFilterChipTextActive: {
        color: colors.white,
    },
    nameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 6,
    },
    engineerBadge: {
        backgroundColor: 'rgba(13, 148, 136, 0.1)', // Light teal zemin
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(13, 148, 136, 0.25)',
        overflow: 'hidden',
    },
    engineerBadgeInner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 2,
        gap: 2,
    },
    engineerBadgeText: {
        color: colors.primary, // Teal text
        fontSize: 8,
        fontFamily: fonts.bold,
        letterSpacing: 0.5,
    },
});
