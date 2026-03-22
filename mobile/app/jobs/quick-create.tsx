import { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import locationService from '../../services/locationService';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { createJob, fetchJobs, fetchMyJobs } from '../../store/slices/jobSlice';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import { colors as staticColors } from '../../constants/colors';
import { fonts } from '../../constants/typography';
import { useAppColors } from '../../hooks/useAppColors';
import { AuthGuardModal } from '../../components/common/AuthGuardModal';
import { PremiumAlert } from '../../components/common/PremiumAlert';
import {
    CITY_NAMES,
    getDistrictsByCity,
    getNeighborhoodsByCityAndDistrict,
} from '../../constants/locations';
import LocationPicker from '../../components/common/LocationPicker';
import { Picker } from '../../components/common/Picker';
import { getSubCategoriesByParent, JobCategory } from '../../constants/jobCategories';

const EMERGENCY_TYPES = [
    { id: 'elektrik', label: 'Elektrik', color: '#7C3AED', icon: 'flash' },
    { id: 'tesisat', label: 'Su/Tesisat', color: '#0284C7', icon: 'water' },
    { id: 'cilingir', label: 'Çilingir', color: '#D97706', icon: 'key' },
    { id: 'beyaz-esya', label: 'Beyaz Eşya', color: '#16A34A', icon: 'construct' },
    { id: 'klima', label: 'Klima', color: '#2563EB', icon: 'snow' },
];

const getDescriptionPlaceholder = (type: string | null): string => {
    switch (type) {
        case 'elektrik': return 'Örnek: Mutfak prizleri çalışmıyor, sigorta attı...';
        case 'tesisat': return 'Örnek: Lavabodan su akıyor, acil tamir lazım...';
        case 'cilingir': return 'Örnek: Anahtar içeride kaldı, kapı kilitli...';
        case 'beyaz-esya': return 'Örnek: Çamaşır makinesi su boşaltmıyor...';
        case 'klima': return 'Örnek: Klima soğutmuyor, acil servis lazım...';
        default: return 'Sorununuzu kısaca açıklayın...';
    }
};

const getCategoryImage = (id: string) => {
    switch (id) {
        case 'elektrik': return require('../../assets/images/categories/electric.png');
        case 'cilingir': return require('../../assets/images/categories/locksmith_3d_clean.png');
        case 'klima': return require('../../assets/images/categories/ac_3d_clean.png');
        case 'beyaz-esya': return require('../../assets/images/categories/appliances_3d_clean.png');
        case 'tesisat': return require('../../assets/images/categories/plumbing.png');
        default: return undefined;
    }
};

const MAX_IMAGES = 3;

export default function QuickCreateScreen() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { isLoading } = useAppSelector((state) => state.jobs);
    const { user, isAuthenticated } = useAppSelector((state) => state.auth);
    const colors = useAppColors();

    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [images, setImages] = useState<string[]>([]);
    const [description, setDescription] = useState<string>('');
    const [budget, setBudget] = useState<string>('');
    const [city, setCity] = useState('');
    const [district, setDistrict] = useState('');
    const [neighborhood, setNeighborhood] = useState('');
    const [address, setAddress] = useState('');
    const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [createdJobId, setCreatedJobId] = useState<string | null>(null);
    const [photoLoading, setPhotoLoading] = useState(false);
    const [selectedSubCategory, setSelectedSubCategory] = useState<JobCategory | null>(null);

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

    const districtOptions = getDistrictsByCity(city);
    const neighborhoodOptions = getNeighborhoodsByCityAndDistrict(city, district);

    useEffect(() => {
        if (city) { setDistrict(''); setNeighborhood(''); }
    }, [city]);

    useEffect(() => {
        if (district) { setNeighborhood(''); }
    }, [district]);

    useEffect(() => {
        const initializeLocation = async () => {
            if (!isAuthenticated) return;
            if (user?.city) {
                setCity(user.city);
                if (user.district) setDistrict(user.district);
            }
            try {
                const response = await api.get('/locations');
                if (response.data.success && response.data.data.length > 0) {
                    setSavedAddresses(response.data.data);
                    const first = response.data.data[0];
                    if (first) {
                        setCity(first.city);
                        setDistrict(first.district || '');
                        setNeighborhood(first.neighborhood || '');
                        setAddress(first.address);
                        setCoords({ latitude: first.latitude, longitude: first.longitude });
                    }
                }
            } catch (error) {
                console.error('Error fetching addresses:', error);
            }
        };
        if (isAuthenticated) initializeLocation();
    }, [isAuthenticated]);

    useEffect(() => {
        if (!isAuthenticated || !user) setShowAuthModal(true);
    }, [isAuthenticated, user]);

    const handleTakePhoto = async () => {
        if (images.length >= MAX_IMAGES) {
            showAlert('Limit', `En fazla ${MAX_IMAGES} fotoğraf ekleyebilirsiniz`, 'warning');
            return;
        }
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') return;
            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.4,
                base64: true,
            });
            if (!result.canceled && result.assets?.[0]) {
                const asset = result.assets[0];
                setImages([...images, asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri]);
            }
        } catch (error) {
            showAlert('Hata', 'Fotoğraf çekilemedi', 'error');
        }
    };

    const handlePickImage = async () => {
        if (images.length >= MAX_IMAGES) {
            showAlert('Limit', `En fazla ${MAX_IMAGES} fotoğraf ekleyebilirsiniz`, 'warning');
            return;
        }
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.4,
                base64: true,
            });
            if (!result.canceled && result.assets?.[0]) {
                const asset = result.assets[0];
                setImages([...images, asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri]);
            }
        } catch (error) {
            showAlert('Hata', 'Fotoğraf seçilemedi', 'error');
        }
    };

    const handleRemoveImage = (index: number) => {
        setImages(images.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        const validationErrors: string[] = [];
        if (!selectedType) validationErrors.push('• Arıza tipi seçilmedi');
        if (!city) validationErrors.push('• Şehir seçilmedi');
        if (!district) validationErrors.push('• İlçe seçilmedi');
        if (!address || address.trim().length < 10) validationErrors.push('• Adres en az 10 karakter olmalı');
        if (!description || description.trim().length < 10) validationErrors.push('• Sorun açıklaması en az 10 karakter olmalı');

        if (validationErrors.length > 0) {
            showAlert('Eksik Bilgiler', 'Lütfen kontrol edin:\n\n' + validationErrors.join('\n'), 'warning');
            return;
        }

        const typeInfo = EMERGENCY_TYPES.find(t => t.id === selectedType);
        const finalTitle = `🚨 ACİL: ${selectedSubCategory ? selectedSubCategory.name : typeInfo?.label}`;
        
        try {
            const jobData = {
                title: finalTitle,
                description: description.trim(),
                category: selectedSubCategory ? selectedSubCategory.name : getCategoryFromType(selectedType!),
                location: {
                    address, city, district, neighborhood: neighborhood || undefined,
                    latitude: coords?.latitude || 41.0082,
                    longitude: coords?.longitude || 28.9784,
                },
                urgencyLevel: 'HIGH' as const,
                images: images.length > 0 ? images : undefined,
                serviceCategory: selectedType || undefined,
            };

            const newJob = await dispatch(createJob(jobData)).unwrap();
            setCreatedJobId(newJob.id);
            dispatch(fetchJobs({ status: 'OPEN', limit: 20 }));
            dispatch(fetchMyJobs());
            setShowSuccessModal(true);
        } catch (err: any) {
            showAlert('Hata', err.message || 'Hızlı çağrı oluşturulamadı', 'error');
        }
    };

    const getCategoryFromType = (type: string): string => {
        switch (type) {
            case 'elektrik': return 'Elektrik Tamiri';
            case 'tesisat': return 'Tesisat';
            case 'cilingir': return 'Çilingir';
            case 'beyaz-esya': return 'Beyaz Eşya';
            case 'klima': return 'Klima Servisi';
            default: return 'Diğer';
        }
    };

    const emergencyGradient = colors.gradientEmergency as [string, string, ...string[]];

    return (
        <View style={[styles.container, { backgroundColor: colors.backgroundLight }]}>
            <PremiumHeader title="Acil Usta Çağır" showBackButton />

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                >
                    <LinearGradient
                        colors={emergencyGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.emergencyBanner}
                    >
                        <View style={styles.emergencyIconWrapper}>
                            <Ionicons name="flash" size={18} color="#FFF" />
                        </View>
                        <View style={styles.bannerTextBlock}>
                            <Text style={styles.bannerTitle}>Hızlı müdahale</Text>
                            <Text style={styles.bannerSubtitle} numberOfLines={2}>
                                Çağrınız bölgenizdeki ustalara iletilir.
                            </Text>
                        </View>
                        <View style={styles.bannerBadge}>
                            <Text style={styles.bannerBadgeText}>7/24</Text>
                        </View>
                    </LinearGradient>

                    <View style={styles.sectionBlock}>
                        <Text style={[styles.sectionKicker, { color: colors.textLight }]}>1 · Hizmet</Text>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Hangi alanda usta lazım?</Text>
                    </View>

                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.typeScrollContent}
                    >
                        {EMERGENCY_TYPES.map((type) => {
                            const isSelected = selectedType === type.id;
                            return (
                                <TouchableOpacity
                                    key={type.id}
                                    style={[
                                        styles.typeBtn,
                                        { borderColor: colors.border },
                                        isSelected && { borderColor: type.color, backgroundColor: type.color + '08' },
                                    ]}
                                    activeOpacity={0.85}
                                    onPress={() => {
                                        setSelectedType(type.id);
                                        setSelectedSubCategory(null); // Reset sub-category on main category change
                                    }}
                                >
                                    <View style={[styles.typeIconBox, { backgroundColor: type.color + '14' }]}>
                                        <Image source={getCategoryImage(type.id)} style={styles.type3dImage} resizeMode="contain" />
                                    </View>
                                    <Text
                                        style={[styles.typeLabel, { color: colors.textSecondary }, isSelected && { color: type.color, fontFamily: fonts.bold }]}
                                        numberOfLines={2}
                                    >
                                        {type.label}
                                    </Text>
                                    {isSelected && (
                                        <View style={[styles.checkIndicator, { backgroundColor: type.color }]}>
                                            <Ionicons name="checkmark" size={9} color="#FFF" />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {/* Sub-category Bubbles */}
                    {selectedType && (
                        <View style={styles.subCategoryContainer}>
                            <Text style={[styles.subCategoryHeading, { color: colors.textSecondary }]}>
                                {selectedType === 'elektrik' ? 'Hangi konuda proje veya detaylı servis lazım?' : 'Hızlı detay seçin (opsiyonel)'}
                            </Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.subCategoryScrollContent}
                            >
                                {getSubCategoriesByParent(selectedType).map((sub) => {
                                    const isSubSelected = selectedSubCategory?.id === sub.id;
                                    return (
                                        <TouchableOpacity
                                            key={sub.id}
                                            style={[
                                                styles.subCategoryChip,
                                                { borderColor: colors.border },
                                                isSubSelected && {
                                                    backgroundColor: sub.colors ? sub.colors[0] : colors.primary,
                                                    borderColor: sub.colors ? sub.colors[0] : colors.primary
                                                }
                                            ]}
                                            onPress={() => setSelectedSubCategory(isSubSelected ? null : sub)}
                                        >
                                            {sub.icon && (
                                                <Ionicons
                                                    name={sub.icon as any}
                                                    size={14}
                                                    color={isSubSelected ? colors.white : colors.textSecondary}
                                                    style={{ marginRight: 6 }}
                                                />
                                            )}
                                            <Text
                                                style={[
                                                    styles.subCategoryText,
                                                    { color: colors.textSecondary },
                                                    isSubSelected && { color: colors.white, fontFamily: fonts.bold }
                                                ]}
                                            >
                                                {sub.name}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    )}

                    <View style={[styles.sectionBlock, styles.sectionBlockTight]}>
                        <Text style={[styles.sectionKicker, { color: colors.textLight }]}>2 · Konum</Text>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Nerede?</Text>
                    </View>

                    <Card variant="default" style={styles.mainCard}>
                        {savedAddresses.length > 0 && (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.addressScroll}>
                                {savedAddresses.map((addr) => (
                                    <TouchableOpacity
                                        key={addr.id}
                                        style={[
                                            styles.addressChip,
                                            { borderColor: colors.border, backgroundColor: colors.surfaceElevated },
                                            coords?.latitude === addr.latitude && { backgroundColor: colors.primary, borderColor: colors.primary },
                                        ]}
                                        onPress={() => {
                                            setCity(addr.city); setDistrict(addr.district || '');
                                            setNeighborhood(addr.neighborhood || ''); setAddress(addr.address);
                                            setCoords({ latitude: addr.latitude, longitude: addr.longitude });
                                        }}
                                    >
                                        <Text style={[styles.addressChipText, { color: colors.textSecondary }, coords?.latitude === addr.latitude && { color: colors.textInverse }]}>
                                            {addr.city} / {addr.district}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        )}

                        <LocationPicker
                            onLocationSelected={(loc) => {
                                setCoords({ latitude: loc.latitude, longitude: loc.longitude });
                                if (loc.address) setAddress(loc.address);
                                if (loc.city) {
                                    const matchedCity = CITY_NAMES.find(c => c.toLowerCase().includes(loc.city!.toLowerCase()));
                                    if (matchedCity) setCity(matchedCity);
                                }
                                if (loc.district) setDistrict(loc.district);
                            }}
                            initialLocation={coords || { latitude: 41.0082, longitude: 28.9784 }}
                        />

                        <View style={styles.row}>
                            <View style={{ flex: 1 }}><Picker label="Şehir" value={city} options={CITY_NAMES} onValueChange={setCity} /></View>
                            <View style={{ flex: 1 }}><Picker label="İlçe" value={district} options={districtOptions} onValueChange={setDistrict} disabled={!city} /></View>
                        </View>
                        <Picker label="Mahalle" value={neighborhood} options={neighborhoodOptions.length > 0 ? neighborhoodOptions : (district ? ['Merkez'] : [])} onValueChange={setNeighborhood} disabled={!district} />
                        <TextInput
                            style={[styles.addressInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
                            placeholder="Detaylı adres (bina, daire no...)"
                            value={address}
                            onChangeText={setAddress}
                            multiline
                            placeholderTextColor={colors.textLight}
                        />
                    </Card>

                    <View style={[styles.sectionBlock, styles.sectionBlockTight]}>
                        <Text style={[styles.sectionKicker, { color: colors.textLight }]}>3 · Açıklama</Text>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Sorunu anlat</Text>
                    </View>

                    <Card variant="default" style={styles.mainCard}>
                        <TextInput
                            style={[styles.textArea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
                            placeholder={getDescriptionPlaceholder(selectedType)}
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={3}
                            placeholderTextColor={colors.textLight}
                        />
                        <View style={styles.photoRow}>
                            <TouchableOpacity style={[styles.photoBtn, { backgroundColor: colors.borderLight }]} onPress={handleTakePhoto}>
                                <Ionicons name="camera" size={18} color={colors.primary} />
                                <Text style={[styles.photoBtnText, { color: colors.primary }]}>Çek</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.photoBtn, { backgroundColor: colors.borderLight }]} onPress={handlePickImage}>
                                <Ionicons name="images" size={18} color={colors.primary} />
                                <Text style={[styles.photoBtnText, { color: colors.primary }]}>Galeri</Text>
                            </TouchableOpacity>
                            {images.map((img, i) => (
                                <View key={i} style={styles.imgPreview}>
                                    <Image source={{ uri: img }} style={styles.img} />
                                    <TouchableOpacity style={styles.imgRemove} onPress={() => handleRemoveImage(i)}>
                                        <Ionicons name="close-circle" size={16} color={staticColors.error} />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                        <View style={[styles.budgetRow, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}>
                            <Ionicons name="wallet-outline" size={18} color={colors.textLight} />
                            <TextInput
                                style={[styles.budgetInput, { color: colors.text }]}
                                placeholder="Tahmini bütçe (opsiyonel)"
                                value={budget}
                                onChangeText={setBudget}
                                keyboardType="numeric"
                                placeholderTextColor={colors.textLight}
                            />
                            <Text style={[styles.currency, { color: colors.textSecondary }]}>₺</Text>
                        </View>
                    </Card>

                    <Button
                        title="Hemen usta çağır"
                        onPress={handleSubmit}
                        loading={isLoading}
                        variant="primary"
                        style={styles.submitBtn}
                        icon={<Ionicons name="flash" size={18} color="#FFF" />}
                    />
                    <Text style={[styles.safetyHint, { color: colors.textLight }]}>Güvenliğiniz için ödemeyi uygulama üzerinden yapın.</Text>
                </ScrollView>
            </KeyboardAvoidingView>

            <AuthGuardModal
                visible={showAuthModal}
                onClose={() => { setShowAuthModal(false); router.back(); }}
                onLogin={() => { setShowAuthModal(false); router.replace({ pathname: '/(auth)/login', params: { redirectTo: '/jobs/quick-create' } }); }}
                onRegister={() => { setShowAuthModal(false); router.replace({ pathname: '/(auth)/register', params: { redirectTo: '/jobs/quick-create' } }); }}
                title="Giriş Gerekiyor"
                message="Acil usta çağırabilmek için giriş yapmanız gerekmektedir."
                icon="flash-outline"
            />

            <Modal visible={showSuccessModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <LinearGradient colors={['rgba(30, 41, 59, 0.98)', 'rgba(15, 23, 42, 0.95)']} style={styles.successModal}>
                        <View style={styles.successIconBox}>
                            <LinearGradient colors={['#EF4444', '#DC2626']} style={styles.iconCircle}>
                                <Ionicons name="flash" size={32} color="#FFF" />
                            </LinearGradient>
                        </View>
                        <Text style={styles.successTitle}>Çağrı Gönderildi!</Text>
                        <Text style={styles.successMessage}>Ustalar en kısa sürede teklif verecek.</Text>
                        <Button title="Çağrıyı Takip Et" onPress={() => { setShowSuccessModal(false); router.replace(`/jobs/${createdJobId}`); }} variant="primary" fullWidth />
                    </LinearGradient>
                </View>
            </Modal>

            <PremiumAlert visible={alertConfig.visible} title={alertConfig.title} message={alertConfig.message} type={alertConfig.type} buttons={alertConfig.buttons} onClose={() => setAlertConfig({ ...alertConfig, visible: false })} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollView: { flex: 1 },
    content: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 28 },
    emergencyBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 14,
        marginBottom: 12,
        elevation: 3,
        shadowColor: '#DC2626',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.22,
        shadowRadius: 6,
    },
    emergencyIconWrapper: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.22)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    bannerTextBlock: { flex: 1, minWidth: 0 },
    bannerTitle: { fontFamily: fonts.bold, fontSize: 15, color: '#FFF', letterSpacing: -0.2 },
    bannerSubtitle: { fontFamily: fonts.medium, fontSize: 12, color: 'rgba(255,255,255,0.88)', marginTop: 2, lineHeight: 16 },
    bannerBadge: {
        backgroundColor: 'rgba(0,0,0,0.18)',
        paddingHorizontal: 9,
        paddingVertical: 5,
        borderRadius: 20,
        marginLeft: 6,
    },
    bannerBadgeText: { fontFamily: fonts.bold, fontSize: 11, color: '#FFF', letterSpacing: 0.3 },
    sectionBlock: { marginBottom: 8, marginTop: 4 },
    sectionBlockTight: { marginTop: 10 },
    sectionKicker: { fontFamily: fonts.semiBold, fontSize: 11, letterSpacing: 0.4, marginBottom: 2, textTransform: 'uppercase' },
    sectionTitle: { fontFamily: fonts.bold, fontSize: 15, letterSpacing: -0.2 },
    typeScrollContent: { gap: 8, paddingVertical: 2, paddingRight: 4, marginBottom: 12 },
    typeBtn: {
        width: 100,
        minHeight: 96,
        backgroundColor: '#FFF',
        borderRadius: 14,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 6,
        position: 'relative',
    },
    typeIconBox: { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
    type3dImage: { width: 42, height: 42 },
    typeLabel: { fontFamily: fonts.semiBold, fontSize: 11, textAlign: 'center', lineHeight: 14 },
    checkIndicator: { position: 'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    mainCard: { padding: 10, borderRadius: 16, marginBottom: 12 },
    addressScroll: { flexDirection: 'row', marginBottom: 10 },
    addressChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, marginRight: 8 },
    addressChipText: { fontFamily: fonts.bold, fontSize: 11 },
    row: { flexDirection: 'row', gap: 8, marginBottom: 4 },
    addressInput: { borderRadius: 12, borderWidth: 1, padding: 10, fontFamily: fonts.medium, fontSize: 13, marginTop: 8, minHeight: 56, textAlignVertical: 'top' },
    textArea: { borderRadius: 12, borderWidth: 1, padding: 10, fontFamily: fonts.medium, fontSize: 14, minHeight: 72, textAlignVertical: 'top' },
    photoRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 10 },
    photoBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 11 },
    photoBtnText: { fontFamily: fonts.bold, fontSize: 12 },
    imgPreview: { width: 40, height: 40, borderRadius: 8, position: 'relative' },
    img: { width: '100%', height: '100%', borderRadius: 8 },
    imgRemove: { position: 'absolute', top: -5, right: -5, backgroundColor: '#FFF', borderRadius: 10 },
    budgetRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1 },
    budgetInput: { flex: 1, paddingHorizontal: 6, fontFamily: fonts.semiBold, fontSize: 14 },
    currency: { fontFamily: fonts.bold, fontSize: 14 },
    submitBtn: { marginTop: 6, minHeight: 50, borderRadius: 14, shadowColor: '#EF4444', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 5 },
    safetyHint: { textAlign: 'center', fontFamily: fonts.medium, fontSize: 11, marginTop: 10, lineHeight: 15, paddingHorizontal: 8 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.8)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    successModal: { width: '100%', borderRadius: 28, padding: 24, alignItems: 'center' },
    successIconBox: { marginBottom: 20 },
    iconCircle: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
    successTitle: { fontFamily: fonts.extraBold, fontSize: 24, color: '#FFF', marginBottom: 8 },
    successMessage: { fontFamily: fonts.medium, fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 24 },
    subCategoryContainer: {
        marginBottom: 16,
        marginTop: 4,
        paddingHorizontal: 4,
    },
    subCategoryHeading: {
        fontFamily: fonts.semiBold,
        fontSize: 12,
        marginBottom: 10,
        marginLeft: 4,
    },
    subCategoryScrollContent: {
        paddingRight: 20,
        gap: 8,
    },
    subCategoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1.5,
        backgroundColor: '#FFF',
    },
    subCategoryText: {
        fontFamily: fonts.medium,
        fontSize: 12,
    },
});
