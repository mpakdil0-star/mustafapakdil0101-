import React, { useState, useRef, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Alert, Text, TouchableOpacity, Modal, Platform, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../../constants/typography';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAppSelector } from '../../hooks/redux';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { colors as staticColors } from '../../constants/colors';
import { useAppColors } from '../../hooks/useAppColors';
import { spacing } from '../../constants/spacing';
import { useDispatch } from 'react-redux';
import { setUser, setDraftProfile, clearDraftProfile } from '../../store/slices/authSlice';
import api from '../../services/api';
import { useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { authService } from '../../services/authService';

// Uzmanlık alanları listesi
// ... (rest of imports remains similar)
// Uzmanlık alanları listesi - Kategorilere göre
const SPECIALTIES_BY_CATEGORY: Record<string, { id: string; label: string; icon: string }[]> = {
    elektrik: [
        { id: 'arizaOnarim', label: 'Arıza Onarım', icon: 'build-outline' },
        { id: 'tesisatYenileme', label: 'Tesisat Yenileme', icon: 'construct-outline' },
        { id: 'prizAnahtar', label: 'Priz/Anahtar Montajı', icon: 'radio-outline' },
        { id: 'aydinlatma', label: 'Aydınlatma Sistemleri', icon: 'bulb-outline' },
        { id: 'sigortaPanosu', label: 'Sigorta Panosu', icon: 'grid-outline' },
        { id: 'topraklama', label: 'Topraklama', icon: 'earth-outline' },
        { id: 'klimaElektrik', label: 'Klima Elektrik Bağlantısı', icon: 'snow-outline' },
        { id: 'guvenlikSistemi', label: 'Güvenlik Sistemi Kurulumu', icon: 'shield-outline' },
        { id: 'uyduSistemleri', label: 'Uydu Sistemleri', icon: 'planet-outline' },
        { id: 'solarPanel', label: 'Solar Panel Kurulumu', icon: 'sunny-outline' },
        { id: 'endüstriyel', label: 'Endüstriyel Elektrik', icon: 'business-outline' },
        { id: 'akilliiEv', label: 'Akıllı Ev Sistemleri', icon: 'home-outline' },
        { id: 'acilServis', label: 'Acil Servis', icon: 'warning-outline' },
    ],
    tesisat: [
        { id: 'suKacagi', label: 'Su Kaçağı Tespiti', icon: 'water-outline' },
        { id: 'tikaniklik', label: 'Tıkanıklık Açma', icon: 'remove-circle-outline' },
        { id: 'musluk', label: 'Musluk/Armatür Tamiri', icon: 'construct-outline' },
        { id: 'borulama', label: 'Boru Tesisatı Yenileme', icon: 'git-merge-outline' },
        { id: 'klozet', label: 'Klozet Tamiri/Montaj', icon: 'ellipse-outline' },
        { id: 'dusakabin', label: 'Duşakabin Montajı', icon: 'square-outline' },
        { id: 'kalorifer', label: 'Kalorifer Tesisatı', icon: 'thermometer-outline' },
        { id: 'pompa', label: 'Su Pompası/Hidrofor', icon: 'refresh-outline' },
        { id: 'dogalgaz', label: 'Doğalgaz Tesisatı', icon: 'flame-outline' },
        { id: 'acil', label: 'Acil Su Tesisatçısı', icon: 'warning-outline' },
    ],
    cilingir: [
        { id: 'kapiAcma', label: 'Kapı Açma', icon: 'key-outline' },
        { id: 'kilitDegisim', label: 'Kilit Değiştirme', icon: 'lock-open-outline' },
        { id: 'barel', label: 'Barel (Göbek) Değişimi', icon: 'sync-outline' },
        { id: 'otoKapi', label: 'Oto Kapısı Açma', icon: 'car-outline' },
        { id: 'kasa', label: 'Kasa Çilingiri', icon: 'cube-outline' },
        { id: 'hidrolik', label: 'Kapı Hidroliği Montajı', icon: 'download-outline' },
        { id: 'kopyalama', label: 'Anahtar Kopyalama', icon: 'copy-outline' },
        { id: 'elektronik', label: 'Elektronik Kilit', icon: 'hardware-chip-outline' },
        { id: 'master', label: 'Master Anahtar', icon: 'people-outline' },
        { id: 'acil', label: '7/24 Acil Çilingir', icon: 'warning-outline' },
    ],
    'beyaz-esya': [
        { id: 'camasir', label: 'Çamaşır Makinesi', icon: 'shirt-outline' },
        { id: 'bulasik', label: 'Bulaşık Makinesi', icon: 'restaurant-outline' },
        { id: 'buzdolabi', label: 'Buzdolabı Tamiri', icon: 'snow-outline' },
        { id: 'firin', label: 'Fırın/Ocak Tamiri', icon: 'flame-outline' },
        { id: 'kurutma', label: 'Kurutma Makinesi', icon: 'sunny-outline' },
        { id: 'montaj', label: 'Montaj/Kurulum', icon: 'tools-outline' },
        { id: 'yedekparca', label: 'Yedek Parça', icon: 'settings-outline' },
        { id: 'bakim', label: 'Periyodik Bakım', icon: 'calendar-outline' },
    ],
    klima: [
        { id: 'bakim', label: 'Klima Bakımı', icon: 'water-outline' },
        { id: 'montaj', label: 'Klima Montajı', icon: 'move-outline' },
        { id: 'ariza', label: 'Klima Arıza', icon: 'alert-circle-outline' },
        { id: 'gaz', label: 'Gaz Dolumu', icon: 'speedometer-outline' },
        { id: 'kart', label: 'Anakart Tamiri', icon: 'hardware-chip-outline' },
        { id: 'vrf', label: 'VRF Sistemleri', icon: 'business-outline' },
        { id: 'altyapi', label: 'Altyapı Hazırlığı', icon: 'construct-outline' },
    ]
};

import { useFocusEffect } from 'expo-router';
import { API_ENDPOINTS, getFileUrl } from '../../constants/api';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import { PremiumAlert } from '../../components/common/PremiumAlert';
import { SERVICE_CATEGORIES } from '../../constants/serviceCategories';

export default function EditProfileScreen() {
    const router = useRouter();
    const dispatch = useDispatch();
    const { user } = useAppSelector((state) => state.auth);
    const colors = useAppColors();
    const { mandatory } = useLocalSearchParams();
    const { draftProfile } = useAppSelector((state) => state.auth);
    const isElectrician = user?.userType === 'ELECTRICIAN' || !!mandatory;

    const [fullName, setFullName] = useState(user?.fullName || '');
    const [email, setEmail] = useState(user?.email || '');
    const [phoneNumber, setPhoneNumber] = useState(user?.phone || '');
    const [experienceYears, setExperienceYears] = useState(
        draftProfile?.experienceYears ??
        user?.electricianProfile?.experienceYears?.toString() ??
        (user as any)?.experienceYears?.toString() ?? ''
    );
    const [selectedExpertise, setSelectedExpertise] = useState<string[]>(
        draftProfile?.specialties ??
        user?.electricianProfile?.specialties ??
        (user as any)?.specialties ?? []
    );
    const [loading, setLoading] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [isExpertiseExpanded, setIsExpertiseExpanded] = useState(true); // Default open for easier access
    const [photoLoading, setPhotoLoading] = useState(false);

    // === Photo Upload Logic ===
    const handlePhotoOptions = () => {
        const buttons: any[] = [
            { text: 'Galeriden Seç', onPress: handlePickImage, variant: 'primary' },
            ...(user?.profileImageUrl ? [{ text: 'Fotoğrafı Kaldır', onPress: handleRemovePhoto, variant: 'danger' }] : []),
            { text: 'İptal', onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })), variant: 'ghost' }
        ];
        setAlertConfig({
            visible: true,
            title: 'Profil Fotoğrafı',
            message: user?.profileImageUrl
                ? 'Profil fotoğrafınızı güncellemek veya kaldırmak mı istiyorsunuz?'
                : 'Profil fotoğrafı ekleyerek profilinizi daha güvenilir hale getirin.',
            type: 'info',
            buttons
        });
    };

    const handlePickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                quality: 0.8,
                base64: true,
            });
            if (!result.canceled && result.assets?.[0]?.base64) {
                setPhotoLoading(true);
                try {
                    const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
                    const updatedUser = await authService.uploadAvatarBase64(base64Image);
                    dispatch(setUser(updatedUser));
                    showAlert('Başarılı', 'Profil fotoğrafı güncellendi!', 'success');
                } catch (error: any) {
                    showAlert('Hata', error.message || 'Fotoğraf yüklenemedi', 'error');
                } finally {
                    setPhotoLoading(false);
                }
            }
        } catch (error) {
            showAlert('Hata', 'Fotoğraf seçilirken bir hata oluştu', 'error');
        }
    };

    const handleRemovePhoto = async () => {
        if (!user) return;
        setPhotoLoading(true);
        try {
            const updatedUser = await authService.removeAvatar();
            dispatch(setUser(updatedUser));
            showAlert('Başarılı', 'Profil fotoğrafı kaldırıldı', 'success');
        } catch (error: any) {
            dispatch(setUser({ ...user, profileImageUrl: undefined } as any));
            showAlert('Başarılı', 'Profil fotoğrafı kaldırıldı', 'success');
        } finally {
            setPhotoLoading(false);
        }
    };

    // Track initial values to detect changes
    const initialValues = useRef({
        experienceYears: user?.electricianProfile?.experienceYears?.toString() || '',
        selectedExpertise: user?.electricianProfile?.specialties || [],
    });

    // Check if any editable field has changed
    const hasChanges = useMemo(() => {
        if (user?.userType !== 'ELECTRICIAN') return false;
        const expChanged = experienceYears !== initialValues.current.experienceYears;
        // Create copies before sorting to avoid mutating read-only arrays
        const currentSorted = [...selectedExpertise].sort();
        const initialSorted = [...initialValues.current.selectedExpertise].sort();
        const expertiseChanged = JSON.stringify(currentSorted) !== JSON.stringify(initialSorted);
        return expChanged || expertiseChanged;
    }, [experienceYears, selectedExpertise, user?.userType]);

    // Sync state to Redux Draft
    useEffect(() => {
        if (user?.userType === 'ELECTRICIAN') {
            dispatch(setDraftProfile({
                experienceYears,
                specialties: selectedExpertise
            }));
        }
    }, [experienceYears, selectedExpertise, user?.userType]);

    // CRITICAL: Re-initialize form state when user data changes (e.g., after login)
    // useState initializers only run once, so we need this effect to sync
    useEffect(() => {
        if (user && !draftProfile) {
            // Only reinitialize if no draft exists (avoid overwriting user edits)
            const newExpYears = user.electricianProfile?.experienceYears?.toString() ??
                (user as any)?.experienceYears?.toString() ?? '';
            const newSpecialties = user.electricianProfile?.specialties ??
                (user as any)?.specialties ?? [];

            // Only update if values are actually different and non-empty from server
            if (newExpYears && newExpYears !== '0' && experienceYears === '') {
                setExperienceYears(newExpYears);
            }
            if (newSpecialties.length > 0 && selectedExpertise.length === 0) {
                setSelectedExpertise(newSpecialties);
            }

            // Update initial values ref for change detection
            initialValues.current = {
                experienceYears: newExpYears || '',
                selectedExpertise: newSpecialties || [],
            };
        }
    }, [user?.electricianProfile?.experienceYears, user?.electricianProfile?.specialties]);

    // Service areas / locations
    const [locations, setLocations] = useState<any[]>([]);
    const [locationsLoading, setLocationsLoading] = useState(true);

    // Warning modal state
    const [showWarningModal, setShowWarningModal] = useState(false);
    const [warningMessage, setWarningMessage] = useState('');

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

    // Fetch locations when screen is focused
    useFocusEffect(
        React.useCallback(() => {
            const fetchLocations = async () => {
                if (user) {
                    try {
                        setLocationsLoading(true);
                        const response = await api.get(API_ENDPOINTS.LOCATIONS);
                        setLocations(response.data.data || []);
                    } catch (error) {
                        console.error('Failed to fetch locations:', error);
                        setLocations([]);
                    } finally {
                        setLocationsLoading(false);
                    }
                }
            };
            fetchLocations();
        }, [user])
    );

    const showValidationError = (message: string) => {
        setWarningMessage(message);
        setShowWarningModal(true);
    };

    const toggleExpertise = (label: string) => {
        setSelectedExpertise(prev => {
            if (prev.includes(label)) {
                return prev.filter(item => item !== label);
            } else {
                return [...prev, label];
            }
        });
    };

    // Determine current specialties based on user's category
    const serviceCategory = user?.electricianProfile?.serviceCategory || 'elektrik';
    const currentExpertiseOptions = SPECIALTIES_BY_CATEGORY[serviceCategory] || SPECIALTIES_BY_CATEGORY['elektrik'];

    const handleSave = async (forceSave = false) => {
        // Validate all required fields
        if (!fullName || fullName.trim() === '') {
            showValidationError('Lütfen ad soyad alanını doldurunuz.');
            return;
        }
        if (!email || email.trim() === '') {
            showValidationError('Lütfen e-posta alanını doldurunuz.');
            return;
        }
        if (!phoneNumber || phoneNumber.trim() === '') {
            // Ustalar için telefon alanı pasifse uyarı verme
            if (!isElectrician) {
                showValidationError('Lütfen telefon numarası alanını doldurunuz.');
                return;
            }
        }

        // Electrician-specific validations
        if (user?.userType === 'ELECTRICIAN') {
            if (!experienceYears || experienceYears.trim() === '' || parseInt(experienceYears) <= 0) {
                showValidationError('Lütfen deneyim yılınızı giriniz.');
                return;
            }
            if (selectedExpertise.length === 0) {
                showValidationError('Lütfen en az bir uzmanlık alanı seçiniz.');
                return;
            }
            // Check service areas from API (locations state)
            if (locations.length === 0) {
                showValidationError('Lütfen en az bir hizmet bölgesi ekleyiniz. "Bölgelerimi Yönet" butonuna tıklayarak bölge ekleyebilirsiniz.');
                return;
            }
        }

        // Check if phone is being saved for the first time (Electrician only)
        if (!forceSave && user?.userType === 'ELECTRICIAN' && !user?.isVerified && phoneNumber) {
            showAlert(
                'Telefon Numarasını Onayla',
                `Telefon numaranız [${phoneNumber}] olarak kaydedilecek ve bir daha değiştirilemeyecektir. Başlangıç krediniz bu numaraya tanımlanacaktır. Emin misiniz?`,
                'confirm',
                [
                    { text: 'Düzenle', variant: 'ghost', onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) },
                    {
                        text: 'Onaylıyorum', variant: 'primary', onPress: () => {
                            setAlertConfig(prev => ({ ...prev, visible: false }));
                            handleSave(true);
                        }
                    }
                ]
            );
            return;
        }

        try {
            setLoading(true);

            const response = await api.put('/users/profile', {
                fullName,
                email,
                phone: phoneNumber,
                experienceYears: experienceYears ? parseInt(experienceYears) : 0,
                specialties: selectedExpertise,
            });

            if (response.data.success) {
                // Update local redux state
                dispatch(setUser(response.data.data.user || response.data.data));

                // Clear draft on success
                dispatch(clearDraftProfile());

                // Mark profile setup as completed (prevents future mandatory redirects)
                if (mandatory && user?.id) {
                    try {
                        const SecureStore = await import('expo-secure-store');
                        await SecureStore.setItemAsync('profile_setup_completed_' + user.id, 'true');
                        console.log('✅ Profile setup completed flag saved from edit screen');
                    } catch (e) {
                        console.warn('Failed to save profile setup flag:', e);
                    }
                }

                setShowSuccessModal(true);
            } else {
                throw new Error(response.data.message || 'Bir hata oluştu');
            }
        } catch (error: any) {
            console.error('Profile update error:', error);
            const errorMessage = error.response?.data?.error?.message || error.message || 'Profil güncellenirken bir hata oluştu.';
            showAlert('Hata', errorMessage, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <PremiumHeader
                title={mandatory ? "Profilinizi Tamamlayın" : "Profili Düzenle"}
                showBackButton
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Profile Photo Upload Card - Visible to ALL users */}
                <View style={[styles.previewCard, { shadowColor: colors.primary }]}>
                    <TouchableOpacity
                        style={styles.previewAvatarWrapper}
                        onPress={handlePhotoOptions}
                        activeOpacity={0.8}
                    >
                        {user?.profileImageUrl ? (
                            <Image
                                source={{ uri: getFileUrl(user.profileImageUrl) || '' }}
                                style={styles.previewAvatar}
                            />
                        ) : (
                            <View style={[styles.previewAvatarPlaceholder, { backgroundColor: colors.primary + '15' }]}>
                                <Text style={[styles.previewAvatarText, { color: colors.primary }]}>
                                    {user?.fullName?.charAt(0).toUpperCase() || 'U'}
                                </Text>
                            </View>
                        )}
                        {/* Camera badge overlay */}
                        <View style={[styles.photoCameraBadge, { backgroundColor: colors.primary }]}>
                            {photoLoading ? (
                                <ActivityIndicator size={10} color="#FFF" />
                            ) : (
                                <Ionicons name="camera" size={12} color="#FFF" />
                            )}
                        </View>
                    </TouchableOpacity>
                    <View style={styles.previewInfo}>
                        <Text style={styles.previewName}>{user?.fullName}</Text>
                        {user?.userType === 'ELECTRICIAN' ? (
                            <View style={styles.previewMetaRow}>
                                <View style={[styles.previewBadge, { backgroundColor: colors.primary + '15' }]}>
                                    <Text style={[styles.previewBadgeText, { color: colors.primary }]}>
                                        {SERVICE_CATEGORIES.find(c => c.id === user?.electricianProfile?.serviceCategory)?.name || 'Usta'}
                                    </Text>
                                </View>
                                <View style={styles.previewStat}>
                                    <Ionicons name="star" size={12} color="#F59E0B" />
                                    <Text style={styles.previewStatText}>{Number((user?.electricianProfile as any)?.ratingAverage || 0).toFixed(1)}</Text>
                                </View>
                                <View style={styles.previewStat}>
                                    <Ionicons name="briefcase-outline" size={12} color={staticColors.textLight} />
                                    <Text style={styles.previewStatText}>{experienceYears || '0'} Yıl</Text>
                                </View>
                            </View>
                        ) : (
                            <TouchableOpacity onPress={handlePhotoOptions}>
                                <Text style={[styles.photoChangeHint, { color: colors.primary }]}>
                                    {user?.profileImageUrl ? 'Fotoğrafı değiştir' : '📷 Fotoğraf ekle'}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    {user?.userType === 'ELECTRICIAN' && (
                        <View style={styles.previewHint}>
                            <Ionicons name="eye-outline" size={14} color={staticColors.textLight} />
                            <Text style={styles.previewHintText}>Önizleme</Text>
                        </View>
                    )}
                </View>

                <Card variant="default" style={[styles.mainCard, { shadowColor: colors.primary }]}>
                    {/* Temel Bilgiler */}
                    <View style={styles.sectionPadding}>
                        <Input
                            label="Ad Soyad"
                            value={fullName}
                            onChangeText={setFullName}
                            placeholder="Adınız ve Soyadınız"
                            autoCapitalize="words"
                            containerStyle={styles.input}
                            editable={false}
                        />

                        <Input
                            label="E-posta"
                            value={email}
                            onChangeText={setEmail}
                            placeholder="ornek@email.com"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            containerStyle={styles.input}
                            editable={false}
                        />

                        <Input
                            label="Telefon Numarası"
                            value={phoneNumber}
                            onChangeText={setPhoneNumber}
                            placeholder="0555 555 55 55"
                            keyboardType="phone-pad"
                            containerStyle={styles.input}
                            editable={false}
                            helperText={"Bu bilgiler kayıt esnasında belirlenir ve değiştirilemez."}
                        />

                        {user?.userType === 'ELECTRICIAN' && (
                            <Input
                                label="Deneyim (Yıl)"
                                value={experienceYears}
                                onChangeText={setExperienceYears}
                                placeholder="Örn: 10"
                                keyboardType="numeric"
                                containerStyle={styles.inputNoMargin}
                            />
                        )}
                    </View>

                    {/* Adres/Bölge Yönetimi Bölümü */}
                    <>
                        <View style={styles.divider} />
                        <View style={styles.sectionPadding}>
                            <TouchableOpacity
                                style={styles.serviceAreaCard}
                                onPress={() => router.push('/profile/addresses')}
                                activeOpacity={0.7}
                            >
                                <View style={styles.serviceAreaCardInner}>
                                    <View style={styles.serviceAreaIconBox}>
                                        <Ionicons name={isElectrician ? "map-outline" : "location-outline"} size={22} color={colors.primary} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.serviceAreaCardTitle}>
                                            {isElectrician ? 'Hizmet Bölgelerimi Seç' : 'Adreslerimi Yönet'}
                                        </Text>
                                        <Text style={styles.serviceAreaCardSubtitle}>
                                            {isElectrician
                                                ? (locations.length > 0 ? `${locations.length} bölgede hizmet veriyorsunuz` : 'İş almak istediğiniz ilçeleri ekleyin')
                                                : (locations.length > 0 ? `${locations.length} kayıtlı adres` : 'Henüz adres eklenmedi')}
                                        </Text>
                                    </View>
                                    {locations.length > 0 ? (
                                        <View style={styles.locationCountBadge}>
                                            <Text style={styles.locationCountText}>{locations.length}</Text>
                                        </View>
                                    ) : isElectrician ? (
                                        <View style={[styles.locationCountBadge, { backgroundColor: colors.primary, paddingHorizontal: 6 }]}>
                                            <Ionicons name="add" size={16} color={staticColors.white} />
                                        </View>
                                    ) : null}
                                    <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
                                </View>
                            </TouchableOpacity>
                        </View>
                    </>

                    {/* Uzmanlık Alanları - Ustalar için */}
                    {user?.userType === 'ELECTRICIAN' && (
                        <>
                            <View style={styles.divider} />
                            <View style={styles.sectionPadding}>
                                <TouchableOpacity
                                    style={styles.expandableHeader}
                                    onPress={() => setIsExpertiseExpanded(!isExpertiseExpanded)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.sectionHeaderNoMargin}>
                                        <View style={[styles.sectionIconBox, { backgroundColor: colors.primary + '10' }]}>
                                            <Ionicons name="sparkles" size={20} color={colors.primary} />
                                        </View>
                                        <View>
                                            <Text style={[styles.sectionTitle, { color: colors.text }]}>Uzmanlık Alanları</Text>
                                            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Hangi alanlarda uzmansın?</Text>
                                        </View>
                                    </View>
                                    <Ionicons
                                        name={isExpertiseExpanded ? "chevron-up" : "chevron-down"}
                                        size={20}
                                        color={colors.textLight}
                                    />
                                </TouchableOpacity>

                                {isExpertiseExpanded && (
                                    <View style={styles.expertiseGrid}>
                                        {currentExpertiseOptions.map((option) => {
                                            const isSelected = selectedExpertise.includes(option.label);
                                            return (
                                                <TouchableOpacity
                                                    key={option.id}
                                                    style={styles.expertiseItemWrapper}
                                                    onPress={() => toggleExpertise(option.label)}
                                                    activeOpacity={0.8}
                                                >
                                                    <LinearGradient
                                                        colors={(isSelected ? (colors.primaryGradient || [colors.primary, colors.primaryDark]) : [staticColors.white, '#F8FAFC']) as any}
                                                        style={[
                                                            styles.expertiseItem,
                                                            isSelected && [styles.expertiseItemSelected, { borderColor: colors.primary, shadowColor: colors.primary }]
                                                        ]}
                                                    >
                                                        <View style={styles.expertiseIconBox}>
                                                            <Ionicons
                                                                name={option.icon as any}
                                                                size={16}
                                                                color={isSelected ? staticColors.white : colors.primary}
                                                            />
                                                        </View>
                                                        <Text style={[
                                                            styles.expertiseLabel,
                                                            { color: isSelected ? staticColors.white : colors.textSecondary },
                                                            isSelected && styles.expertiseLabelSelected
                                                        ]}>
                                                            {option.label}
                                                        </Text>
                                                    </LinearGradient>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                )}
                            </View>
                        </>
                    )}
                </Card>

                <View style={styles.saveButtonContainer}>
                    {user?.userType === 'ELECTRICIAN' && hasChanges && (
                        <View style={styles.changesIndicator}>
                            <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                            <Text style={styles.changesIndicatorText}>Değişiklikler kaydedilmeyi bekliyor</Text>
                        </View>
                    )}
                    <Button
                        title={hasChanges ? "Değişiklikleri Kaydet ✓" : "Değişiklikleri Kaydet"}
                        onPress={handleSave}
                        loading={loading}
                        variant="primary"
                        fullWidth
                        style={[
                            styles.saveButton,
                            hasChanges && styles.saveButtonActive
                        ]}
                    />
                </View>
            </ScrollView>

            <Modal visible={showSuccessModal} transparent animationType="fade">
                <View style={[styles.modalOverlay, { backgroundColor: 'rgba(15, 23, 42, 0.85)' }]}>
                    <LinearGradient
                        colors={['rgba(30, 41, 59, 0.98)', 'rgba(15, 23, 42, 0.95)']}
                        style={[styles.successModal, { borderColor: 'rgba(255,255,255,0.1)' }]}
                    >
                        <View style={styles.successIconWrapper}>
                            <View style={styles.successIconGlow} />
                            <LinearGradient
                                colors={['#10B981', '#059669']}
                                style={styles.successIconBox}
                            >
                                <Ionicons name="checkmark" size={32} color={staticColors.white} />
                            </LinearGradient>
                        </View>

                        <Text style={[styles.successTitle, { color: staticColors.white }]}>Başarılı!</Text>
                        <Text style={[styles.successMessage, { color: 'rgba(255,255,255,0.6)' }]}>Profil bilgileriniz güvenle güncellendi.</Text>

                        <TouchableOpacity
                            style={[styles.successModalBtn, { shadowColor: colors.primary }]}
                            onPress={() => {
                                setShowSuccessModal(false);
                                if (mandatory) {
                                    router.replace('/(tabs)');
                                } else {
                                    router.back();
                                }
                            }}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={[colors.primary, colors.primaryDark]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.successModalBtnGradient}
                            >
                                <Text style={styles.successModalBtnText}>Ana Sayfaya Dön</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </LinearGradient>
                </View>
            </Modal>

            {/* Warning Modal - Glass Glow Design */}
            <Modal visible={showWarningModal} transparent animationType="fade">
                <View style={[styles.modalOverlay, { backgroundColor: 'rgba(15, 23, 42, 0.85)' }]}>
                    <LinearGradient
                        colors={['rgba(30, 41, 59, 0.98)', 'rgba(15, 23, 42, 0.95)']}
                        style={[styles.warningModal, { borderColor: 'rgba(255,255,255,0.1)' }]}
                    >
                        <View style={styles.warningIconWrapper}>
                            <View style={styles.warningIconGlow} />
                            <LinearGradient
                                colors={['#F59E0B', '#D97706']}
                                style={styles.warningIconBox}
                            >
                                <Ionicons name="alert" size={32} color={staticColors.white} />
                            </LinearGradient>
                        </View>

                        <Text style={[styles.warningTitle, { color: staticColors.white }]}>Eksik Bilgi</Text>
                        <Text style={[styles.warningMessage, { color: 'rgba(255,255,255,0.6)' }]}>{warningMessage}</Text>

                        <TouchableOpacity
                            style={[styles.warningModalBtn, { shadowColor: colors.primary }]}
                            onPress={() => setShowWarningModal(false)}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={[colors.primary, colors.primaryDark]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.warningModalBtnGradient}
                            >
                                <Text style={styles.warningModalBtnText}>Anladım</Text>
                            </LinearGradient>
                        </TouchableOpacity>
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
        padding: 10,
        paddingBottom: 20,
    },
    mainCard: {
        borderRadius: 20,
        backgroundColor: staticColors.white,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 2,
        overflow: 'hidden',
    },
    sectionPadding: {
        padding: 12,
    },
    divider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginHorizontal: 12,
    },
    infoCard: {
        borderRadius: 24,
        padding: 20,
        backgroundColor: staticColors.white,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 4,
    },
    infoTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
    },
    infoCardTitle: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: staticColors.text,
    },
    infoText: {
        fontFamily: fonts.medium,
        fontSize: 14,
        color: staticColors.textSecondary,
        lineHeight: 20,
        marginBottom: 20,
    },
    input: {
        marginBottom: 6,
    },
    inputNoMargin: {
        marginBottom: 0,
    },
    button: {
        marginTop: 10,
    },
    expertiseButton: {
        marginTop: 5,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 12,
        marginBottom: 8,
    },
    sectionHeaderNoMargin: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    expandableHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 2,
    },
    sectionIconBox: {
        width: 30,
        height: 30,
        borderRadius: 8,
        backgroundColor: staticColors.primary + '10',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sectionTitle: {
        fontFamily: fonts.bold,
        fontSize: 13,
        color: staticColors.text,
    },
    sectionSubtitle: {
        fontFamily: fonts.medium,
        fontSize: 11,
        color: staticColors.textSecondary,
    },
    expertiseContainer: {
        marginBottom: 16,
    },
    expertiseGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 10,
    },
    expertiseItemWrapper: {
        width: '49%',
    },
    expertiseItem: {
        paddingHorizontal: 8,
        paddingVertical: 7,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    expertiseItemSelected: {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    expertiseIconBox: {
        width: 20,
        height: 20,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },
    expertiseLabel: {
        fontFamily: fonts.bold,
        fontSize: 10,
        color: staticColors.textSecondary,
        flex: 1,
    },
    expertiseLabelSelected: {
        color: staticColors.white,
    },
    checkBadge: {
        marginLeft: 'auto',
    },
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
        width: 80,
        height: 80,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    successIconGlow: {
        position: 'absolute',
        width: 60,
        height: 60,
        backgroundColor: '#10B981',
        borderRadius: 30,
        opacity: 0.2,
        transform: [{ scale: 1.5 }],
    },
    successIconBox: {
        width: 64,
        height: 64,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    successTitle: {
        fontFamily: fonts.extraBold,
        fontSize: 24,
        color: staticColors.text,
        marginBottom: 8,
    },
    successMessage: {
        fontFamily: fonts.medium,
        fontSize: 15,
        color: staticColors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    successModalBtn: {
        width: '100%',
        height: 54,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: staticColors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
    },
    successModalBtnGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    successModalBtnText: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: staticColors.white,
    },
    serviceAreasContainer: {
        marginBottom: 20,
    },
    serviceAreaCard: {
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    serviceAreaCardInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    serviceAreaIconBox: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: staticColors.primary + '10',
        justifyContent: 'center',
        alignItems: 'center',
    },
    serviceAreaCardTitle: {
        fontFamily: fonts.bold,
        fontSize: 15,
        color: staticColors.text,
    },
    serviceAreaCardSubtitle: {
        fontFamily: fonts.medium,
        fontSize: 12,
        color: staticColors.textSecondary,
        marginTop: 2,
    },
    locationCountBadge: {
        backgroundColor: staticColors.success,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        marginRight: 8,
    },
    locationCountText: {
        fontFamily: fonts.bold,
        fontSize: 12,
        color: staticColors.white,
    },
    // Warning Modal Styles
    warningModal: {
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
    warningIconWrapper: {
        width: 80,
        height: 80,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    warningIconGlow: {
        position: 'absolute',
        width: 60,
        height: 60,
        backgroundColor: '#F59E0B',
        borderRadius: 30,
        opacity: 0.2,
        transform: [{ scale: 1.5 }],
    },
    warningIconBox: {
        width: 64,
        height: 64,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    warningTitle: {
        fontFamily: fonts.extraBold,
        fontSize: 24,
        color: staticColors.text,
        marginBottom: 8,
    },
    warningMessage: {
        fontFamily: fonts.medium,
        fontSize: 15,
        color: staticColors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
        paddingHorizontal: 10,
    },
    warningModalBtn: {
        width: '100%',
        height: 54,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: staticColors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
    },
    warningModalBtnGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    warningModalBtnText: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: staticColors.white,
    },
    // Profile Preview Card Styles
    previewCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: staticColors.white,
        borderRadius: 16,
        padding: 10,
        marginBottom: 10,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    previewAvatarWrapper: {
        marginRight: 10,
    },
    previewAvatar: {
        width: 44,
        height: 44,
        borderRadius: 12,
    },
    previewAvatarPlaceholder: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    previewAvatarText: {
        fontFamily: fonts.bold,
        fontSize: 18,
    },
    previewInfo: {
        flex: 1,
    },
    previewName: {
        fontFamily: fonts.bold,
        fontSize: 14,
        color: staticColors.text,
        marginBottom: 2,
    },
    previewMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    previewBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    previewBadgeText: {
        fontFamily: fonts.semiBold,
        fontSize: 10,
    },
    previewStat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    previewStatText: {
        fontFamily: fonts.medium,
        fontSize: 11,
        color: staticColors.textSecondary,
    },
    previewHint: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    previewHintText: {
        fontFamily: fonts.medium,
        fontSize: 10,
        color: staticColors.textLight,
    },
    photoCameraBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: staticColors.white,
    },
    photoChangeHint: {
        fontFamily: fonts.bold,
        fontSize: 12,
        marginTop: 2,
    },
    // Save Button Container & Changes Indicator
    saveButtonContainer: {
        marginTop: 16,
        marginBottom: 20,
    },
    changesIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginBottom: 10,
    },
    changesIndicatorText: {
        fontFamily: fonts.medium,
        fontSize: 12,
        color: '#10B981',
    },
    saveButton: {
        // Base styles handled by Button component
    },
    saveButtonActive: {
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 12,
    },
    categoryItem: {
        flex: 1,
        minWidth: '30%',
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        gap: 6,
    },
    categoryText: {
        fontFamily: fonts.medium,
        fontSize: 11,
        textAlign: 'center',
    },
});
