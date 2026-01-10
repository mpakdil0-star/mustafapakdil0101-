import { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    Image,
    ActivityIndicator,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    ImageBackground,
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
import { spacing } from '../../constants/spacing';
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

const EMERGENCY_TYPES = [
    { id: 'elektrik', label: 'Elektrik', color: '#7C3AED' },
    { id: 'tesisat', label: 'Su/Tesisat', color: '#0284C7' },
    { id: 'cilingir', label: 'Çilingir', color: '#D97706' },
    { id: 'beyaz-esya', label: 'Beyaz Eşya', color: '#16A34A' },
    { id: 'klima', label: 'Klima', color: '#2563EB' },
];

// Map category ID to 3D image asset (same as home screen)
const getCategoryImage = (id: string) => {
    switch (id) {
        case 'elektrik': return require('../../assets/images/categories/3d_electric.png');
        case 'cilingir': return require('../../assets/images/categories/3d_locksmith.png');
        case 'klima': return require('../../assets/images/categories/3d_aircon.png');
        case 'beyaz-esya': return require('../../assets/images/categories/3d_appliances.png');
        case 'tesisat': return require('../../assets/images/categories/3d_plumbing.png');
        default: return null;
    }
};

const MAX_IMAGES = 3;

export default function QuickCreateScreen() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { isLoading, error } = useAppSelector((state) => state.jobs);
    const { user, isAuthenticated } = useAppSelector((state) => state.auth);
    const colors = useAppColors();

    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [images, setImages] = useState<string[]>([]);
    const [description, setDescription] = useState<string>('');

    // Location State - Start with empty values, will be filled by GPS
    const [city, setCity] = useState('');
    const [district, setDistrict] = useState('');
    const [neighborhood, setNeighborhood] = useState('');
    const [address, setAddress] = useState('');
    const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isLoadingLocation, setIsLoadingLocation] = useState(true);
    const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [createdJobId, setCreatedJobId] = useState<string | null>(null);

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

    // Derived Options
    const districtOptions = getDistrictsByCity(city);
    const neighborhoodOptions = getNeighborhoodsByCityAndDistrict(city, district);

    // Reset district and neighborhood when city changes
    useEffect(() => {
        if (city) {
            setDistrict('');
            setNeighborhood('');
        }
    }, [city]);

    // Reset neighborhood when district changes
    useEffect(() => {
        if (district) {
            setNeighborhood('');
        }
    }, [district]);

    // Initialize Location: User Profile -> Saved Address -> GPS Fallback
    useEffect(() => {
        const initializeLocation = async () => {
            if (!isAuthenticated) return;

            // Step 1: Check user object for city (Fastest)
            if (user?.city) {
                setCity(user.city);
                if (user.district) setDistrict(user.district);
            }

            let foundSaved = false;
            try {
                // Step 2: Fetch actual saved addresses
                const response = await api.get('/locations');
                if (response.data.success && response.data.data.length > 0) {
                    const saved = response.data.data;
                    setSavedAddresses(saved);

                    // Auto-use first saved address (more specific than user.city)
                    const first = saved[0];
                    if (first) {
                        setCity(first.city);
                        setDistrict(first.district || '');
                        setNeighborhood(first.neighborhood || '');
                        setAddress(first.address);
                        setCoords({ latitude: first.latitude, longitude: first.longitude });

                        setIsLoadingLocation(false);
                        foundSaved = true;
                    }
                }
            } catch (error) {
                console.error('Error fetching addresses for quick-create:', error);
            }

            // Fallback to GPS if no saved address found
            if (!foundSaved) {
                // If we at least have city from user profile, don't show loading forever
                if (user?.city) setIsLoadingLocation(false);
                getLocation();
            }
        };

        if (isAuthenticated) {
            initializeLocation();
        }
    }, [isAuthenticated]);

    // Authentication kontrolü
    useEffect(() => {
        if (!isAuthenticated || !user) {
            setShowAuthModal(true);
        }
    }, [isAuthenticated, user]);

    const getLocation = async () => {
        try {
            setIsLoadingLocation(true);

            // Use the robust service which handles permissions and fallbacks
            let fetchedCoords = await locationService.getCurrentLocation();

            // If automatic location fails, fallback to user's profile city
            if (!fetchedCoords) {
                console.log('Location service returned null, using profile fallback.');
                const profileCity = user?.city || 'İstanbul';
                showAlert(
                    'Konum Alınamadı',
                    `Konumunuz otomatik olarak belirlenemedi. Profil bilginizdeki şehir (${profileCity}) seçildi. Lütfen haritadan düzeltin.`,
                    'warning'
                );

                setCity(profileCity);
                setDistrict(user?.district || '');
                setAddress('Konum alınamadı - Profil bilgisi kullanıldı');
                // Don't set coords if GPS failed, keep it null
                return;
            }

            const { latitude, longitude } = fetchedCoords;
            setCoords({ latitude, longitude });

            // Reverse geocode explicitly
            const addressData = await locationService.reverseGeocode(latitude, longitude);

            if (addressData) {
                if (addressData.city) {
                    // Try to match normalized city
                    const matchedCity = CITY_NAMES.find(c => c.toLowerCase().includes(addressData.city!.toLowerCase()));
                    if (matchedCity) setCity(matchedCity);
                    else setCity(addressData.city);
                }
                if (addressData.district) setDistrict(addressData.district);
                if (addressData.neighborhood) setNeighborhood(addressData.neighborhood);
                if (addressData.address) setAddress(addressData.address);
            } else {
                setAddress('Konum Paylaşıldı');
            }
        } catch (error) {
            console.error('Location error in quick-create:', error);
            // Fallback to user's profile city
            const profileCity = user?.city || 'İstanbul';
            setCity(profileCity);
            setDistrict(user?.district || '');
            setAddress('Konum hatası - Profil bilgisi kullanıldı');
        } finally {
            setIsLoadingLocation(false);
        }
    };

    // ... (Image handlers remain same) ...

    const handleTakePhoto = async () => {
        if (images.length >= MAX_IMAGES) {
            showAlert('Limit', `En fazla ${MAX_IMAGES} fotoğraf ekleyebilirsiniz`, 'warning');
            return;
        }

        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                showAlert('İzin Gerekli', 'Kamera izni vermeniz gerekiyor', 'error');
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.4,
                base64: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                if (asset.base64) {
                    setImages([...images, `data:image/jpeg;base64,${asset.base64}`]);
                } else if (asset.uri) { // Fix: check uri separately
                    setImages([...images, asset.uri]);
                }
            }
        } catch (error) {
            showAlert('Hata', 'Fotoğraf çekilirken bir hata oluştu', 'error');
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

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                if (asset.base64) {
                    setImages([...images, `data:image/jpeg;base64,${asset.base64}`]);
                } else if (asset.uri) {
                    setImages([...images, asset.uri]);
                }
            }
        } catch (error) {
            showAlert('Hata', 'Fotoğraf seçilirken bir hata oluştu', 'error');
        }
    };

    const handleRemoveImage = (index: number) => {
        setImages(images.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        console.log('🔍 handleSubmit called');
        console.log('📋 Current form state:', { selectedType, city, district, address: address?.length, description: description?.length });

        // Comprehensive validation
        const validationErrors: string[] = [];

        // 1. Check emergency type selection
        if (!selectedType) {
            validationErrors.push('• Arıza tipi seçilmedi');
        }

        // 2. Check city
        if (!city) {
            validationErrors.push('• Şehir seçilmedi');
        }

        // 3. Check district
        if (!district) {
            validationErrors.push('• İlçe seçilmedi');
        }

        // 4. Check neighborhood
        if (!neighborhood) {
            validationErrors.push('• Mahalle seçilmedi');
        }

        // 5. Check address (minimum 10 characters)
        if (!address || address.trim().length < 10) {
            validationErrors.push('• Detaylı adres en az 10 karakter olmalı');
        }

        // 6. Check description character limit (max 500)
        if (description.length > 500) {
            validationErrors.push('• Açıklama en fazla 500 karakter olabilir');
        }

        // 7. Check address character limit (max 200)
        if (address.length > 200) {
            validationErrors.push('• Adres en fazla 200 karakter olabilir');
        }

        console.log('❗ Validation errors:', validationErrors);

        // If there are validation errors, show them in a popup
        if (validationErrors.length > 0) {
            console.log('🚨 Showing validation alert popup');
            showAlert(
                'Eksik Bilgiler',
                'Lütfen aşağıdaki alanları kontrol edin:\n\n' + validationErrors.join('\n'),
                'warning',
                [{ text: 'Tamam', variant: 'primary', onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) }]
            );
            return;
        }

        console.log('✅ Validation passed, creating job...');

        const typeInfo = EMERGENCY_TYPES.find(t => t.id === selectedType);

        try {
            const jobData = {
                title: `🚨 ACİL: ${typeInfo?.label}`,
                description: description.trim() || `Acil elektrik arızası: ${typeInfo?.label}. Hızlı müdahale bekliyorum.`,
                category: getCategoryFromType(selectedType!), // Non-null assertion - already validated above
                location: {
                    address: address || 'Adres detayda belirtilecek',
                    city: city,
                    district: district,
                    neighborhood: neighborhood || undefined,
                    latitude: coords?.latitude || 41.0082,
                    longitude: coords?.longitude || 28.9784,
                },
                urgencyLevel: 'HIGH' as const,
                images: images.length > 0 ? images : undefined,
            };

            const newJob = await dispatch(createJob(jobData)).unwrap();

            // Show themed success modal
            setCreatedJobId(newJob.id);
            dispatch(fetchJobs({ status: 'OPEN', limit: 20 }));
            dispatch(fetchMyJobs());
            setShowSuccessModal(true);
        } catch (err: any) {
            showAlert('Hata', err.message || 'Hızlı çağrı oluşturulamadı', 'error');
        }
    };

    const getCategoryFromType = (type: string): string => {
        // Return category name that matches JOB_CATEGORIES for proper notification routing
        switch (type) {
            case 'elektrik': return 'Elektrik Tamiri';
            case 'tesisat': return 'Tesisat';
            case 'cilingir': return 'Çilingir';
            case 'beyaz-esya': return 'Beyaz Eşya';
            case 'klima': return 'Klima Servisi';
            default: return 'Diğer';
        }
    };

    return (
        <View style={styles.container}>
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
                    {/* Emergency Banner */}
                    <View style={styles.emergencyBanner}>
                        <View style={styles.emergencyIconWrapper}>
                            <Ionicons name="flash" size={24} color={colors.white} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.bannerTitle}>Hızlı Müdahale</Text>
                            <Text style={styles.bannerSubtitle}>Çağrınız bölgenizdeki tüm aktif ustalara anında iletilir.</Text>
                        </View>
                    </View>

                    {/* Arıza Tipi */}
                    <Card variant="default" elevated={false} style={styles.sectionCard}>
                        <View style={styles.sectionHeader}>
                            <View style={[styles.sectionIconWrapper, { backgroundColor: staticColors.error + '10' }]}>
                                <Ionicons name="alert-circle-outline" size={20} color={staticColors.error} />
                            </View>
                            <Text style={styles.sectionTitle}>Arıza Tipi Seçin</Text>
                        </View>

                        <View style={styles.typeGrid}>
                            {EMERGENCY_TYPES.map((type) => (
                                <TouchableOpacity
                                    key={type.id}
                                    style={[
                                        styles.typeBtn,
                                        selectedType === type.id
                                            ? { borderColor: type.color, backgroundColor: type.color + '10', shadowColor: type.color }
                                            : {}
                                    ]}
                                    activeOpacity={0.7}
                                    onPress={() => setSelectedType(type.id)}
                                >
                                    <View style={styles.typeBtnContent}>
                                        <View style={[styles.typeIconBox, { backgroundColor: type.color + '15' }]}>
                                            <Image
                                                source={getCategoryImage(type.id)}
                                                style={styles.type3dImage}
                                                resizeMode="contain"
                                            />
                                        </View>
                                        <Text style={[
                                            styles.typeLabel,
                                            selectedType === type.id && { color: type.color, fontFamily: fonts.bold }
                                        ]} numberOfLines={2}>
                                            {type.label}
                                        </Text>
                                        {selectedType === type.id && (
                                            <View style={[styles.checkBadge, { backgroundColor: type.color }]}>
                                                <Ionicons name="checkmark" size={10} color={colors.white} />
                                            </View>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Card>

                    {/* Kayıtlı Adres Seçimi */}
                    {savedAddresses.length > 0 && (
                        <View style={styles.savedAddressesContainer}>
                            <Text style={styles.savedTitle}>Kayıtlı Adresten Seç</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.addressScroll}>
                                {savedAddresses.map((addr) => (
                                    <TouchableOpacity
                                        key={addr.id}
                                        style={[
                                            styles.addressChip,
                                            coords?.latitude === addr.latitude && [styles.addressChipActive, { backgroundColor: colors.primary, borderColor: colors.primary, shadowColor: colors.primary }]
                                        ]}
                                        onPress={() => {
                                            setCity(addr.city);
                                            setDistrict(addr.district || '');
                                            setNeighborhood(addr.neighborhood || '');
                                            setAddress(addr.address);
                                            setCoords({ latitude: addr.latitude, longitude: addr.longitude });
                                        }}
                                    >
                                        <Ionicons
                                            name="location"
                                            size={14}
                                            color={coords?.latitude === addr.latitude ? staticColors.white : colors.primary}
                                        />
                                        <Text style={[
                                            styles.addressChipText,
                                            coords?.latitude === addr.latitude && [styles.addressChipTextActive, { color: staticColors.white }]
                                        ]}>
                                            {addr.city} / {addr.district || 'Merkez'}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    {/* Konum Bilgileri */}
                    <Card variant="default" style={styles.sectionCard}>
                        <View style={styles.sectionHeader}>
                            <View style={[styles.sectionIconWrapper, { backgroundColor: colors.primary + '10' }]}>
                                <Ionicons name="location-outline" size={20} color={colors.primary} />
                            </View>
                            <Text style={styles.sectionTitle}>Konum Bilgileri</Text>
                        </View>

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

                        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                            <View style={{ flex: 1 }}>
                                <Picker
                                    label="Şehir"
                                    value={city}
                                    options={CITY_NAMES}
                                    onValueChange={setCity}
                                    error={errors.city}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Picker
                                    label="İlçe"
                                    value={district}
                                    options={districtOptions}
                                    onValueChange={setDistrict}
                                    error={errors.district}
                                    disabled={!city}
                                />
                            </View>
                        </View>

                        <Picker
                            label="Mahalle"
                            value={neighborhood}
                            options={neighborhoodOptions.length > 0 ? neighborhoodOptions : (district ? ['Merkez'] : [])}
                            onValueChange={setNeighborhood}
                            error={errors.neighborhood}
                            disabled={!district}
                        />

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Detaylı Adres</Text>
                            <TextInput
                                style={[styles.textAreaSmall, errors.address && styles.inputError]}
                                placeholder="Bina, daire, kat bilgisi yazın..."
                                value={address}
                                onChangeText={(text) => {
                                    setAddress(text);
                                    if (errors.address) setErrors({ ...errors, address: '' });
                                }}
                                multiline
                                numberOfLines={2}
                                placeholderTextColor={colors.textLight}
                            />
                            {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
                        </View>
                    </Card>

                    {/* Detaylar ve Görsel */}
                    <Card variant="default" style={styles.sectionCard}>
                        <View style={styles.sectionHeader}>
                            <View style={[styles.sectionIconWrapper, { backgroundColor: colors.primary + '10' }]}>
                                <Ionicons name="camera-outline" size={20} color={colors.primary} />
                            </View>
                            <Text style={styles.sectionTitle}>Ek Detaylar (Opsiyonel)</Text>
                        </View>

                        <TextInput
                            style={styles.descInput}
                            placeholder="Kısaca sorunu açıklayın..."
                            placeholderTextColor={colors.textLight}
                            value={description}
                            onChangeText={setDescription}
                            multiline
                            numberOfLines={2}
                            autoCorrect={false}
                            spellCheck={false}
                            autoCapitalize="sentences"
                        />

                        <View style={styles.imageActionRow}>
                            <TouchableOpacity style={[styles.imgActionBtn, { borderColor: colors.primary + '20' }]} onPress={handleTakePhoto}>
                                <Ionicons name="camera" size={24} color={colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.imgActionBtn, { borderColor: colors.primary + '20' }]} onPress={handlePickImage}>
                                <Ionicons name="images" size={24} color={colors.primary} />
                            </TouchableOpacity>

                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
                                {images.map((img, index) => (
                                    <View key={index} style={styles.imgWrapper}>
                                        <Image source={{ uri: img }} style={styles.previewImg} />
                                        <TouchableOpacity
                                            style={styles.imgRemoveBtn}
                                            onPress={() => handleRemoveImage(index)}
                                        >
                                            <Ionicons name="close-circle" size={18} color={colors.error} />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </ScrollView>
                        </View>
                    </Card>

                    <Button
                        title="HEMEN USTA ÇAĞIR"
                        onPress={handleSubmit}
                        loading={isLoading}
                        variant="primary"
                        style={styles.callBtn}
                        icon={<Ionicons name="flash" size={20} color={colors.white} />}
                    />

                    <Text style={styles.footerNote}>
                        * Acil çağrılarda servis ücreti farklılık gösterebilir.
                    </Text>
                </ScrollView>
            </KeyboardAvoidingView>

            <AuthGuardModal
                visible={showAuthModal}
                onClose={() => {
                    setShowAuthModal(false);
                    router.back();
                }}
                onLogin={() => {
                    setShowAuthModal(false);
                    router.replace({
                        pathname: '/(auth)/login',
                        params: { redirectTo: '/jobs/quick-create' }
                    });
                }}
                onRegister={() => {
                    setShowAuthModal(false);
                    router.replace({
                        pathname: '/(auth)/register',
                        params: { redirectTo: '/jobs/quick-create' }
                    });
                }}
                title="Giriş Gerekiyor"
                message="Acil usta çağırabilmek için giriş yapmanız veya kayıt olmanız gerekmektedir."
                icon="flash-outline"
            />

            {/* Success Modal - Emergency Glass Glow Design */}
            <Modal visible={showSuccessModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <LinearGradient
                        colors={['rgba(30, 41, 59, 0.98)', 'rgba(15, 23, 42, 0.95)']}
                        style={styles.successModal}
                    >
                        <View style={styles.successIconWrapper}>
                            <View style={styles.successIconGlow} />
                            <LinearGradient
                                colors={['#EF4444', '#DC2626']}
                                style={styles.successIconBox}
                            >
                                <Ionicons name="flash" size={36} color={staticColors.white} />
                            </LinearGradient>
                        </View>

                        <Text style={[styles.successTitle, { color: staticColors.white }]}>Çağrı Gönderildi! ⚡</Text>
                        <Text style={[styles.successMessage, { color: 'rgba(255,255,255,0.6)' }]}>
                            Yakındaki ustalara bildirim gönderildi. En kısa sürede teklifler gelmeye başlayacak!
                        </Text>

                        <View style={styles.successBtnGroup}>
                            <TouchableOpacity
                                style={[styles.successSecondaryBtn, { backgroundColor: 'rgba(255,255,255,0.1)' }]}
                                onPress={() => {
                                    setShowSuccessModal(false);
                                    router.back();
                                }}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.successSecondaryBtnText, { color: 'rgba(255,255,255,0.6)' }]}>Ana Sayfa</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.successPrimaryBtn, { shadowColor: '#EF4444' }]}
                                onPress={() => {
                                    setShowSuccessModal(false);
                                    router.back();
                                    if (createdJobId) {
                                        setTimeout(() => {
                                            router.push(`/jobs/${createdJobId}`);
                                        }, 300);
                                    }
                                }}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={['#EF4444', '#DC2626']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.successPrimaryBtnGradient}
                                >
                                    <Ionicons name="eye-outline" size={18} color={staticColors.white} style={{ marginRight: 6 }} />
                                    <Text style={styles.successPrimaryBtnText}>Çağrıyı Takip Et</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>
                </View>
            </Modal>

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
    scrollView: {
        flex: 1,
    },
    content: {
        padding: 12, // Reduced from spacing.md
        paddingBottom: 40,
    },
    emergencyBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EF4444',
        padding: 16, // Increased padding
        borderRadius: 12, // Updated per request
        marginBottom: 12,
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
    emergencyIconWrapper: {
        width: 40, // Reduced from 48
        height: 40, // Reduced from 48
        borderRadius: 12, // Reduced from 14
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    bannerTitle: {
        fontFamily: fonts.bold,
        fontSize: 15,
        color: staticColors.white,
    },
    bannerSubtitle: {
        fontFamily: fonts.medium,
        fontSize: 11,
        color: 'rgba(255, 255, 255, 0.95)',
    },
    sectionCard: {
        padding: 12,
        marginBottom: 10,
        borderRadius: 20,
        backgroundColor: staticColors.white,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12, // Reduced from 20
        gap: 10,
    },
    sectionIconWrapper: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: staticColors.primary + '10',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sectionTitle: {
        fontFamily: fonts.bold,
        fontSize: 15,
        color: '#1F2937', // Darker black
    },
    typeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8, // Reduced from 10
    },
    typeBtn: {
        width: '31%',
        aspectRatio: 0.9,
        backgroundColor: staticColors.white,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: staticColors.borderLight,
        shadowColor: 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        elevation: 0,
        overflow: 'hidden',
    },
    typeBtnContent: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 4,
    },
    typeIconBox: {
        width: 48, // Larger for 3D icons
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
        position: 'relative',
        overflow: 'hidden',
    },
    typeGlowEffect: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderRadius: 10,
        transform: [{ scale: 1.5 }],
        opacity: 0.5,
    },
    type3dImage: {
        width: 40,
        height: 40,
    },
    typeLabel: {
        fontFamily: fonts.extraBold,
        fontSize: 11, // Slightly smaller
        color: staticColors.text,
        textAlign: 'center',
    },
    checkBadge: {
        position: 'absolute',
        top: 4,
        right: 4,
        width: 14,
        height: 14,
        borderRadius: 7,
        justifyContent: 'center',
        alignItems: 'center',
    },
    locationLoading: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        gap: 8,
    },
    locationText: {
        fontFamily: fonts.medium,
        fontSize: 13,
        color: staticColors.textSecondary,
    },
    locationBox: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 12,
        padding: 10,
    },
    locationMain: {
        fontFamily: fonts.bold,
        fontSize: 13,
        color: staticColors.text,
    },
    locationSub: {
        fontFamily: fonts.medium,
        fontSize: 11,
        color: staticColors.textSecondary,
        marginTop: 2,
    },
    descInput: {
        backgroundColor: '#F3F4F6', // Light gray
        borderRadius: 12,
        padding: 12,
        fontFamily: fonts.regular,
        fontSize: 14,
        color: staticColors.text,
        borderWidth: 0, // No border
        height: 60,
        marginBottom: 10,
    },
    imageActionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    imgActionBtn: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: staticColors.white,
        borderWidth: 1,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imgWrapper: {
        position: 'relative',
        marginRight: 8,
    },
    previewImg: {
        width: 44, // Reduced from 50
        height: 44, // Reduced from 50
        borderRadius: 10,
    },
    imgRemoveBtn: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: staticColors.white,
        borderRadius: 8,
    },
    callBtn: {
        marginTop: 8,
        height: 50, // Reduced from 60
        borderRadius: 16, // Reduced from 20
        backgroundColor: '#EF4444',
    },
    footerNote: {
        textAlign: 'center',
        fontFamily: fonts.medium,
        fontSize: 11,
        color: staticColors.textLight,
        marginTop: 20,
    },
    savedAddressesContainer: {
        marginBottom: 16,
    },
    savedTitle: {
        fontFamily: fonts.bold,
        fontSize: 13,
        color: staticColors.textSecondary,
        marginBottom: 8,
    },
    inputContainer: {
        marginBottom: 16,
    },
    label: {
        fontFamily: fonts.semiBold, // Bolder
        fontSize: 14,
        color: '#333333', // Darker
        marginBottom: 6,
    },
    textAreaSmall: {
        backgroundColor: '#F3F4F6', // Light gray
        borderRadius: 12,
        padding: 14,
        fontFamily: fonts.regular,
        fontSize: 14,
        color: staticColors.text,
        borderWidth: 0, // No border
        height: 80,
        textAlignVertical: 'top',
    },
    inputError: {
        borderColor: staticColors.error,
    },
    errorText: {
        fontFamily: fonts.regular,
        fontSize: 12,
        color: staticColors.error,
        marginTop: 4,
    },
    addressScroll: {
        flexDirection: 'row',
    },
    addressChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: staticColors.white,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        marginRight: 8,
        marginBottom: 4,
        borderWidth: 1,
        borderColor: staticColors.borderLight,
        gap: 6,
    },
    addressChipActive: {
    },
    addressChipText: {
        fontFamily: fonts.bold,
        fontSize: 12,
        color: staticColors.text,
    },
    addressChipTextActive: {
    },
    // Success Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    successModal: {
        width: '100%',
        borderRadius: 32,
        padding: 32,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.5)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.2,
        shadowRadius: 30,
        elevation: 20,
    },
    successIconWrapper: {
        width: 100,
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    successIconGlow: {
        position: 'absolute',
        width: 80,
        height: 80,
        backgroundColor: '#EF4444',
        borderRadius: 40,
        opacity: 0.25,
        transform: [{ scale: 1.5 }],
    },
    successIconBox: {
        width: 72,
        height: 72,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    successTitle: {
        fontFamily: fonts.extraBold,
        fontSize: 26,
        color: staticColors.text,
        marginBottom: 10,
        textAlign: 'center',
    },
    successMessage: {
        fontFamily: fonts.medium,
        fontSize: 15,
        color: staticColors.textSecondary,
        textAlign: 'center',
        lineHeight: 23,
        marginBottom: 28,
        paddingHorizontal: 10,
    },
    successBtnGroup: {
        flexDirection: 'row',
        width: '100%',
        gap: 12,
    },
    successSecondaryBtn: {
        flex: 1,
        height: 52,
        borderRadius: 16,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    successSecondaryBtnText: {
        fontFamily: fonts.bold,
        fontSize: 14,
        color: staticColors.textSecondary,
    },
    successPrimaryBtn: {
        flex: 1.5,
        height: 52,
        borderRadius: 16,
        overflow: 'hidden',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
    },
    successPrimaryBtnGradient: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    successPrimaryBtnText: {
        fontFamily: fonts.bold,
        fontSize: 14,
        color: staticColors.white,
    },
});
