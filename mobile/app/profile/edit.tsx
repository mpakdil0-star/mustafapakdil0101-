import React, { useState, useRef, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Alert, Text, TouchableOpacity, Modal, Platform, Image, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
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
import { BackHandler } from 'react-native';

// Uzmanlık alanları listesi
// ... (rest of imports remains similar)
// Uzmanlık alanları listesi - Kategorilere göre
const SPECIALTIES_BY_CATEGORY: Record<string, { id: string; label: string; icon: string }[]> = {
    elektrik: [
        { id: 'projeCizimi', label: 'Elektrik Proje Çizimi', icon: 'document-text-outline' },
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

    const [fullName, setFullName] = useState(() => draftProfile?.fullName ?? user?.fullName ?? '');
    const [email, setEmail] = useState(() => draftProfile?.email ?? user?.email ?? '');
    const [phoneNumber, setPhoneNumber] = useState(() => draftProfile?.phone ?? user?.phone ?? '');
    const [experienceYears, setExperienceYears] = useState(() => {
        const val = draftProfile?.experienceYears ??
            user?.electricianProfile?.experienceYears?.toString() ??
            (user as any)?.experienceYears?.toString() ?? '';
        return val === '0' ? '' : val;
    });
    const [selectedExpertise, setSelectedExpertise] = useState<string[]>(
        draftProfile?.specialties ??
        user?.electricianProfile?.specialties ??
        (user as any)?.specialties ?? []
    );
    const [loading, setLoading] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [isExpertiseExpanded, setIsExpertiseExpanded] = useState(true); // Default open for easier access
    const [photoLoading, setPhotoLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const phoneInputRef = useRef<any>(null);

    // Prevent going back if mandatory
    useEffect(() => {
        if (mandatory) {
            const backAction = () => {
                showAlert(
                    'Profil Tamamlama Zorunlu', 
                    'Uygulamayı kullanabilmek için lütfen profil bilgilerinizi eksiksiz doldurup kaydedin. Bu bilgiler müşterilerinizin size ulaşabilmesi için gereklidir.', 
                    'warning',
                    [{ text: 'Anladım', onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) }]
                );
                return true; // Strictly blocks back button
            };

            const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
            return () => backHandler.remove();
        }
    }, [mandatory]);

    // Auto-focus logic removed due to missing ref support in Input component

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

    // Sync state to Redux Draft to prevent data loss when navigating
    useEffect(() => {
        dispatch(setDraftProfile({
            fullName,
            email,
            phone: phoneNumber,
            experienceYears,
            specialties: selectedExpertise
        }));
    }, [fullName, email, phoneNumber, experienceYears, selectedExpertise]);

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
            if (newExpYears && newExpYears !== '0' && (experienceYears === '' || experienceYears === '0')) {
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
    
    // Sync phoneNumber from draft/user if it becomes empty (data recovery)
    useEffect(() => {
        if (!phoneNumber || phoneNumber === '') {
            const recoveryPhone = draftProfile?.phone ?? user?.phone;
            if (recoveryPhone) {
                setPhoneNumber(recoveryPhone);
            }
        }
    }, [draftProfile?.phone, user?.phone]);

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
                        const response = await api.get(`${API_ENDPOINTS.LOCATIONS}?t=${Date.now()}`);
                        setLocations(response.data.data || []);
                    } catch (error) {
                        console.error('Failed to fetch locations:', error);
                    } finally {
                        setLocationsLoading(false);
                    }
                }
            };
            
            fetchLocations();
        }, [user]) // Re-run when user object changes or on focus
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
        const newErrors: Record<string, string> = {};

        // Validate all required fields
        if (!fullName || fullName.trim() === '') {
            newErrors.fullName = 'Lütfen ad soyad alanını doldurunuz.';
        }
        if (!email || email.trim() === '') {
            newErrors.email = 'Lütfen e-posta alanını doldurunuz.';
        }
        if (!phoneNumber || phoneNumber.trim() === '') {
            newErrors.phoneNumber = 'Lütfen telefon numaranızı giriniz.';
        } else {
            const cleanPhone = phoneNumber.replace(/\D/g, ''); // Sadece rakamları al
            if (cleanPhone.length < 10 || cleanPhone.length > 11) {
                newErrors.phoneNumber = 'Telefon numarası 10 veya 11 hane olmalıdır.';
            }
        }

        // Electrician-specific validations
        if (user?.userType === 'ELECTRICIAN' || !!mandatory) {
            if (!experienceYears || experienceYears.trim() === '' || parseInt(experienceYears) <= 0) {
                newErrors.experienceYears = 'Lütfen deneyim yılınızı giriniz.';
            }
            if (selectedExpertise.length === 0) {
                newErrors.specialties = 'Lütfen en az bir uzmanlık alanı seçiniz.';
            }
            // Check service areas from API (locations state)
            if (locations.length === 0) {
                newErrors.locations = 'Lütfen en az bir hizmet bölgesi ekleyiniz.';
            }
        }

        // Validate experience and specialties (mandatory for experts)
        if (isElectrician) {
            if (!experienceYears || experienceYears === '' || experienceYears === '0') {
                newErrors.experienceYears = 'Lütfen tecrübe yılınızı belirtiniz.';
            }
            if (!selectedExpertise || selectedExpertise.length === 0) {
                newErrors.selectedExpertise = 'Lütfen en az bir uzmanlık alanı seçiniz.';
            }
            if (!locations || locations.length === 0) {
                newErrors.locations = 'Hizmet verebilmeniz için en az bir hizmet bölgesi eklemelisiniz.';
            }
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            if (newErrors.locations) {
                showValidationError('Hizmet verebilmeniz için en az bir hizmet bölgesi eklemelisiniz. "Hizmet Bölgelerimi Seç" kısmından bölge ekleyebilirsiniz.');
            } else {
                showAlert('Eksik Bilgiler', 'Lütfen kırmızı ile işaretlenmiş zorunlu alanları doldurunuz.', 'warning');
            }
            return;
        }

        setErrors({});

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
            {/* Ambient Background Glow Blobs */}
            <View style={[styles.glowBlob, { top: -80, right: -80, backgroundColor: colors.primary, opacity: 0.05 }]} />
            <View style={[styles.glowBlob, { bottom: -80, left: -80, backgroundColor: isElectrician ? '#6366F1' : '#06B6D4', opacity: 0.05 }]} />

            {/* Prevent escape via gestures or header for mandatory flow */}
            <Stack.Screen 
                options={{ 
                    gestureEnabled: !mandatory,
                    headerShown: false
                }} 
            />
            
            <PremiumHeader
                title={mandatory ? "Profilinizi Tamamlayın" : "Profili Düzenle"}
                showBackButton={!mandatory}
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Main Card: Kişisel Bilgiler & Profil Künyesi & Adres Yönetimi */}
                <Card variant="default" style={[styles.mainCard, { shadowColor: colors.primary, marginBottom: spacing.sm }]}>
                    {/* Üst Profil Künyesi (Inline Horizontal Layout) */}
                    <View style={styles.inlineProfileHeader}>
                        <TouchableOpacity
                            style={styles.previewAvatarWrapper}
                            onPress={handlePhotoOptions}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={[colors.primary + '30', colors.primary + '08']}
                                style={styles.avatarRing}
                            >
                                {user?.profileImageUrl ? (
                                    <Image
                                        source={{ uri: getFileUrl(user.profileImageUrl) || '' }}
                                        style={styles.previewAvatar}
                                    />
                                ) : (
                                    <View style={[styles.previewAvatarPlaceholder, { backgroundColor: colors.primary + '12' }]}>
                                        <Text style={[styles.previewAvatarText, { color: colors.primary }]}>
                                            {user?.fullName?.charAt(0).toUpperCase() || 'U'}
                                        </Text>
                                    </View>
                                )}
                            </LinearGradient>
                            <View style={[styles.photoCameraBadge, { backgroundColor: colors.primary }]}>
                                {photoLoading ? (
                                    <ActivityIndicator size={8} color="#FFF" />
                                ) : (
                                    <Ionicons name="camera" size={10} color="#FFF" />
                                )}
                            </View>
                        </TouchableOpacity>

                        <View style={styles.inlineProfileInfo}>
                            <Text style={[styles.previewName, { color: colors.text }]} numberOfLines={1}>
                                {user?.fullName}
                            </Text>
                            
                            {user?.userType === 'ELECTRICIAN' ? (
                                <View style={styles.previewMetaRow}>
                                    <View style={[styles.previewBadge, { backgroundColor: colors.primary + '12' }]}>
                                        <Text style={[styles.previewBadgeText, { color: colors.primary }]}>
                                            {SERVICE_CATEGORIES.find(c => c.id === user?.electricianProfile?.serviceCategory)?.name || 'Usta'}
                                        </Text>
                                    </View>
                                    <View style={styles.previewStat}>
                                        <Ionicons name="star" size={11} color="#F59E0B" />
                                        <Text style={styles.previewStatText}>{Number((user?.electricianProfile as any)?.ratingAverage || 0).toFixed(1)}</Text>
                                    </View>
                                    <View style={styles.previewStat}>
                                        <Ionicons name="briefcase-outline" size={11} color={staticColors.textLight} />
                                        <Text style={styles.previewStatText}>{experienceYears || '0'} Yıl</Text>
                                    </View>
                                </View>
                            ) : (
                                <TouchableOpacity onPress={handlePhotoOptions} style={styles.photoChangeBtn}>
                                    <Ionicons name={user?.profileImageUrl ? "refresh-outline" : "camera-outline"} size={12} color={colors.primary} />
                                    <Text style={[styles.photoChangeHint, { color: colors.primary }]}>
                                        {user?.profileImageUrl ? 'Fotoğrafı değiştir' : 'Fotoğraf ekle'}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    <View style={styles.inlineDivider} />

                    {/* Kişisel Bilgiler Form Alanı */}
                    <View style={styles.sectionPadding}>
                        <Input
                            label="Ad Soyad *"
                            value={fullName}
                            onChangeText={(val) => { setFullName(val); setErrors(prev => ({ ...prev, fullName: '' })); }}
                            placeholder="Adınız ve Soyadınız"
                            autoCapitalize="words"
                            containerStyle={styles.input}
                            editable={false}
                            error={errors.fullName}
                            leftIcon={<Ionicons name="person-outline" size={16} color={staticColors.textLight} />}
                        />

                        <Input
                            label="E-posta"
                            value={email}
                            onChangeText={(val) => { setEmail(val); setErrors(prev => ({ ...prev, email: '' })); }}
                            placeholder="ornek@email.com"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            containerStyle={styles.input}
                            editable={false}
                            error={errors.email}
                            leftIcon={<Ionicons name="mail-outline" size={16} color={staticColors.textLight} />}
                        />

                        <Input
                            label={isElectrician ? "Telefon Numarası *" : "Telefon Numarası"}
                            value={phoneNumber}
                            onChangeText={(val) => { 
                                const cleanVal = val.replace(/\D/g, ''); // Sadece rakam kabul et
                                if (cleanVal.length <= 11) {
                                    setPhoneNumber(cleanVal);
                                    setErrors(prev => ({ ...prev, phoneNumber: '' })); 
                                }
                            }}
                            placeholder="05XX XXX XX XX"
                            keyboardType="phone-pad"
                            containerStyle={styles.input}
                            editable={!user?.phone || phoneNumber !== user?.phone || !!mandatory || !user?.isVerified}
                            error={errors.phoneNumber}
                            maxLength={11}
                            leftIcon={<Ionicons name="call-outline" size={16} color={staticColors.textLight} />}
                        />

                        {user?.userType === 'ELECTRICIAN' && (
                            <Input
                                label="Deneyim (Yıl) *"
                                value={experienceYears}
                                onChangeText={(val) => { setExperienceYears(val); setErrors(prev => ({ ...prev, experienceYears: '' })); }}
                                placeholder="Örn: 10"
                                keyboardType="numeric"
                                containerStyle={styles.inputNoMargin}
                                error={errors.experienceYears}
                                leftIcon={<Ionicons name="briefcase-outline" size={16} color={staticColors.textLight} />}
                            />
                        )}
                    </View>

                    <View style={styles.inlineDivider} />

                    {/* Adres/Konum Yönetim Satırı (Inline Row) */}
                    <View style={styles.sectionPadding}>
                        <TouchableOpacity
                            style={[
                                styles.inlineServiceRow, 
                                errors.locations && { borderColor: '#EF4444', borderWidth: 1.5, backgroundColor: '#FEF2F2', padding: 8, borderRadius: 8 }
                            ]}
                            onPress={() => { router.push('/profile/addresses'); setErrors(prev => ({ ...prev, locations: '' })); }}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.serviceAreaIconBox, { backgroundColor: colors.primary + '10' }]}>
                                <Ionicons name={isElectrician ? "map-outline" : "location-outline"} size={16} color={colors.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.serviceAreaCardTitle}>
                                    {isElectrician ? 'Hizmet Bölgelerimi Seç *' : 'Adreslerimi Yönet'}
                                </Text>
                                <Text style={styles.serviceAreaCardSubtitle}>
                                    {isElectrician
                                        ? (locations.length > 0 ? `${locations.length} bölgede aktifsiniz` : 'Hizmet verilecek ilçeler')
                                        : (locations.length > 0 ? `${locations.length} kayıtlı adres` : 'Henüz adres eklenmedi')}
                                </Text>
                            </View>
                            {locations.length > 0 ? (
                                <View style={[styles.locationCountBadge, { backgroundColor: colors.primary }]}>
                                    <Text style={styles.locationCountText}>{locations.length}</Text>
                                </View>
                            ) : isElectrician ? (
                                <View style={[styles.locationCountBadge, { backgroundColor: colors.primary, paddingHorizontal: 6, paddingVertical: 3 }]}>
                                    <Ionicons name="add" size={12} color={staticColors.white} />
                                </View>
                            ) : null}
                            <Ionicons name="chevron-forward" size={14} color={staticColors.textLight} />
                        </TouchableOpacity>
                        {errors.locations && (
                            <Text style={{ fontSize: 11, color: '#EF4444', marginTop: 4, marginLeft: 4, fontFamily: fonts.medium }}>
                                {errors.locations}
                            </Text>
                        )}
                    </View>
                </Card>

                {/* Card 2: Uzmanlık Alanları (Usta/Electrician için) */}
                {user?.userType === 'ELECTRICIAN' && (
                    <Card variant="default" style={[styles.mainCard, { shadowColor: colors.primary, marginBottom: spacing.md }]}>
                        <View style={styles.sectionPadding}>
                            <TouchableOpacity
                                style={styles.expandableHeader}
                                onPress={() => setIsExpertiseExpanded(!isExpertiseExpanded)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.sectionHeaderNoMargin}>
                                    <View style={[styles.sectionIconBox, { backgroundColor: colors.primary + '10' }]}>
                                        <Ionicons name="sparkles" size={15} color={colors.primary} />
                                    </View>
                                    <View>
                                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Uzmanlık Alanları *</Text>
                                        <Text style={[styles.sectionSubtitle, { color: errors.specialties ? '#EF4444' : (selectedExpertise.length > 0 ? colors.textSecondary : '#EF4444'), marginTop: 1 }]}>
                                            {errors.specialties || (selectedExpertise.length > 0 ? 'Hangi alanlarda uzmansın?' : 'Lütfen en az bir alan seçiniz.')}
                                        </Text>
                                    </View>
                                </View>
                                <Ionicons
                                    name={isExpertiseExpanded ? "chevron-up" : "chevron-down"}
                                    size={18}
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
                                                onPress={() => { toggleExpertise(option.label); setErrors(prev => ({ ...prev, specialties: '' })); }}
                                                activeOpacity={0.8}
                                            >
                                                <LinearGradient
                                                    colors={(isSelected ? (colors.primaryGradient || [colors.primary, colors.primaryDark]) : ['#FFFFFF', '#F8FAFC']) as any}
                                                    style={[
                                                        styles.expertiseItem,
                                                        isSelected && [styles.expertiseItemSelected, { borderColor: colors.primary, shadowColor: colors.primary }]
                                                    ]}
                                                >
                                                    <View style={[styles.expertiseIconBox, { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : colors.primary + '10' }]}>
                                                        <Ionicons
                                                            name={option.icon as any}
                                                            size={13}
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
                    </Card>
                )}

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
                <View style={styles.modalOverlay}>
                    <LinearGradient
                        colors={['rgba(255, 255, 255, 0.98)', 'rgba(248, 250, 252, 0.96)']}
                        style={styles.successModal}
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

                        <Text style={[styles.successTitle, { color: colors.text }]}>Başarılı!</Text>
                        <Text style={[styles.successMessage, { color: staticColors.textSecondary }]}>Profil bilgileriniz güvenle güncellendi.</Text>

                        <TouchableOpacity
                            style={[styles.successModalBtn, { shadowColor: colors.primary }]}
                            onPress={() => {
                                setShowSuccessModal(false);
                                // Always replace to home after mandatory setup or just return
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
                <View style={styles.modalOverlay}>
                    <LinearGradient
                        colors={['rgba(255, 255, 255, 0.98)', 'rgba(248, 250, 252, 0.96)']}
                        style={styles.warningModal}
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

                        <Text style={[styles.warningTitle, { color: colors.text }]}>Eksik Bilgi</Text>
                        <Text style={[styles.warningMessage, { color: staticColors.textSecondary }]}>{warningMessage}</Text>

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
        position: 'relative',
    },
    glowBlob: {
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: 150,
        zIndex: 0,
    },
    scrollView: {
        flex: 1,
        zIndex: 1,
    },
    content: {
        padding: 10,
        paddingBottom: 16,
    },
    previewCard: {
        backgroundColor: staticColors.white,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(226, 232, 240, 0.8)',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.03,
        shadowRadius: 12,
        elevation: 2,
    },
    previewCardInner: {
        alignItems: 'center',
    },
    inlineProfileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: 10,
        gap: 10,
    },
    inlineProfileInfo: {
        flex: 1,
        gap: 2,
    },
    inlineDivider: {
        height: 1,
        backgroundColor: '#E2E8F0',
        opacity: 0.5,
    },
    inlineServiceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    previewAvatarWrapper: {
        position: 'relative',
        marginBottom: 0,
    },
    avatarRing: {
        width: 58,
        height: 58,
        borderRadius: 29,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 2,
    },
    previewAvatar: {
        width: 54,
        height: 54,
        borderRadius: 27,
    },
    previewAvatarPlaceholder: {
        width: 54,
        height: 54,
        borderRadius: 27,
        justifyContent: 'center',
        alignItems: 'center',
    },
    previewAvatarText: {
        fontFamily: fonts.extraBold,
        fontSize: 20,
    },
    photoCameraBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: staticColors.white,
    },
    previewName: {
        fontFamily: fonts.extraBold,
        fontSize: 15,
        color: staticColors.text,
        marginBottom: 2,
        letterSpacing: -0.3,
    },
    previewMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    previewBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    previewBadgeText: {
        fontFamily: fonts.bold,
        fontSize: 9,
        letterSpacing: 0.3,
    },
    previewStat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    previewStatText: {
        fontFamily: fonts.bold,
        fontSize: 10,
        color: staticColors.textSecondary,
    },
    photoChangeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 1,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    photoChangeHint: {
        fontFamily: fonts.bold,
        fontSize: 10,
    },
    mainCard: {
        borderRadius: 16,
        backgroundColor: staticColors.white,
        borderWidth: 1,
        borderColor: 'rgba(226, 232, 240, 0.8)',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.02,
        shadowRadius: 8,
        elevation: 2,
        overflow: 'hidden',
    },
    sectionPadding: {
        padding: 12,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 10,
    },
    sectionHeaderNoMargin: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flex: 1,
    },
    sectionIconBox: {
        width: 22,
        height: 22,
        borderRadius: 6,
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
        fontSize: 10,
        color: staticColors.textSecondary,
    },
    input: {
        marginBottom: 8,
    },
    inputNoMargin: {
        marginBottom: 0,
    },
    serviceAreaCard: {
        backgroundColor: '#F8FAFC',
        borderRadius: 10,
        padding: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    serviceAreaCardInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    serviceAreaIconBox: {
        width: 30,
        height: 30,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    serviceAreaCardTitle: {
        fontFamily: fonts.bold,
        fontSize: 12,
        color: staticColors.text,
    },
    serviceAreaCardSubtitle: {
        fontFamily: fonts.medium,
        fontSize: 10,
        color: staticColors.textSecondary,
        marginTop: 1,
    },
    locationCountBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 4,
    },
    locationCountText: {
        fontFamily: fonts.bold,
        fontSize: 10,
        color: staticColors.white,
    },
    expandableHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    expertiseGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 5,
        marginTop: 10,
    },
    expertiseItemWrapper: {
        width: '49%',
    },
    expertiseItem: {
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    expertiseItemSelected: {
        borderColor: 'transparent',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2,
    },
    expertiseIconBox: {
        width: 16,
        height: 16,
        borderRadius: 5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    expertiseLabel: {
        fontFamily: fonts.bold,
        fontSize: 9.5,
        color: staticColors.textSecondary,
        flex: 1,
    },
    expertiseLabelSelected: {
        color: staticColors.white,
    },
    saveButtonContainer: {
        marginTop: 10,
        marginBottom: 8,
    },
    changesIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        marginBottom: 6,
    },
    changesIndicatorText: {
        fontFamily: fonts.bold,
        fontSize: 11,
        color: '#10B981',
    },
    saveButton: {
        height: 42,
        borderRadius: 12,
    },
    saveButtonActive: {
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    successModal: {
        width: '100%',
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.5)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 12,
    },
    successIconWrapper: {
        width: 60,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    successIconGlow: {
        position: 'absolute',
        width: 44,
        height: 44,
        backgroundColor: '#10B981',
        borderRadius: 22,
        opacity: 0.15,
        transform: [{ scale: 1.4 }],
    },
    successIconBox: {
        width: 46,
        height: 46,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    successTitle: {
        fontFamily: fonts.extraBold,
        fontSize: 18,
        marginBottom: 4,
    },
    successMessage: {
        fontFamily: fonts.medium,
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 16,
        marginBottom: 16,
    },
    successModalBtn: {
        width: '100%',
        height: 42,
        borderRadius: 12,
        overflow: 'hidden',
    },
    successModalBtnGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    successModalBtnText: {
        fontFamily: fonts.bold,
        fontSize: 13,
        color: staticColors.white,
    },
    warningModal: {
        width: '100%',
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.5)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 12,
    },
    warningIconWrapper: {
        width: 60,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    warningIconGlow: {
        position: 'absolute',
        width: 44,
        height: 44,
        backgroundColor: '#F59E0B',
        borderRadius: 22,
        opacity: 0.15,
        transform: [{ scale: 1.4 }],
    },
    warningIconBox: {
        width: 46,
        height: 46,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    warningTitle: {
        fontFamily: fonts.extraBold,
        fontSize: 18,
        marginBottom: 4,
    },
    warningMessage: {
        fontFamily: fonts.medium,
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 16,
        marginBottom: 16,
        paddingHorizontal: 6,
    },
    warningModalBtn: {
        width: '100%',
        height: 42,
        borderRadius: 12,
        overflow: 'hidden',
    },
    warningModalBtnGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    warningModalBtnText: {
        fontFamily: fonts.bold,
        fontSize: 13,
        color: staticColors.white,
    },
});
