import { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    TouchableOpacity,
} from 'react-native';
import { PremiumAlert } from '../../../components/common/PremiumAlert';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useAppDispatch, useAppSelector } from '../../../hooks/redux';
import { fetchJobById, fetchMyJobs } from '../../../store/slices/jobSlice';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Picker } from '../../../components/common/Picker';
import { colors as staticColors } from '../../../constants/colors';
import { spacing } from '../../../constants/spacing';
import { typography, fonts } from '../../../constants/typography';
import { useAppColors } from '../../../hooks/useAppColors';
import { PremiumHeader } from '../../../components/common/PremiumHeader';
import { API_BASE_URL } from '../../../constants/api';
import {
    CITY_NAMES,
    getDistrictsByCity,
    getNeighborhoodsByCityAndDistrict,
} from '../../../constants/locations';

const JOB_CATEGORIES = [
    'Elektrik Tesisatı',
    'Elektrik Tamiri',
    'Aydınlatma',
    'Priz ve Anahtar',
    'Elektrik Panosu',
    'Kablo Çekimi',
    'Uydu Sistemleri',
    'Elektrik Kontrolü',
    'Diğer',
];

const URGENCY_LEVELS = [
    { value: 'LOW', label: 'Düşük', icon: '🟢' },
    { value: 'MEDIUM', label: 'Orta', icon: '🟡' },
    { value: 'HIGH', label: 'Acil', icon: '🔴' },
];

export default function EditJobScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const dispatch = useAppDispatch();
    const { currentJob, isLoading: jobLoading } = useAppSelector((state) => state.jobs);
    const { user } = useAppSelector((state) => state.auth);
    const colors = useAppColors();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [subcategory, setSubcategory] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('İstanbul');
    const [district, setDistrict] = useState('');
    const [neighborhood, setNeighborhood] = useState('');
    const [urgencyLevel, setUrgencyLevel] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
    const [estimatedBudget, setEstimatedBudget] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [dataLoaded, setDataLoaded] = useState(false);

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

    // Mevcut iş verilerini yükle
    useEffect(() => {
        if (id) {
            dispatch(fetchJobById(id));
        }
    }, [id, dispatch]);

    // İş verileri geldiğinde form'u doldur
    useEffect(() => {
        if (currentJob && !dataLoaded) {
            setTitle(currentJob.title || '');
            setDescription(currentJob.description || '');
            setCategory(currentJob.category || '');
            setSubcategory(currentJob.subcategory || '');
            setUrgencyLevel(currentJob.urgencyLevel || 'MEDIUM');
            setEstimatedBudget(currentJob.estimatedBudget?.toString() || '');

            // Location
            if (typeof currentJob.location === 'object') {
                setAddress(currentJob.location.address || '');
                setCity(currentJob.location.city || 'İstanbul');
                setDistrict(currentJob.location.district || '');
                setNeighborhood(currentJob.location.neighborhood || '');
            }

            setDataLoaded(true);
        }
    }, [currentJob, dataLoaded]);

    // Location options
    const districtOptions = getDistrictsByCity(city);
    const neighborhoodOptions = getNeighborhoodsByCityAndDistrict(city, district);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!title.trim()) {
            newErrors.title = 'Başlık zorunludur';
        } else if (title.trim().length < 5) {
            newErrors.title = 'Başlık en az 5 karakter olmalıdır';
        }

        if (!description.trim()) {
            newErrors.description = 'Açıklama zorunludur';
        } else if (description.trim().length < 5) {
            newErrors.description = 'Açıklama en az 5 karakter olmalıdır';
        }

        if (!category) {
            newErrors.category = 'Kategori seçiniz';
        }

        if (!city.trim()) {
            newErrors.city = 'Şehir zorunludur';
        }

        if (!district.trim()) {
            newErrors.district = 'İlçe zorunludur';
        }

        if (!address.trim()) {
            newErrors.address = 'Adres zorunludur';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setIsSubmitting(true);

        try {
            const token = await SecureStore.getItemAsync('auth_token');

            const jobData = {
                title: title.trim(),
                description: description.trim(),
                category,
                subcategory: subcategory.trim() || undefined,
                location: {
                    address: address.trim(),
                    city: city.trim(),
                    district: district.trim(),
                    neighborhood: neighborhood.trim() || undefined,
                    latitude: 41.0082,
                    longitude: 28.9784,
                },
                urgencyLevel,
                estimatedBudget: estimatedBudget ? parseFloat(estimatedBudget) : undefined,
            };

            const response = await fetch(`${API_BASE_URL}jobs/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(jobData),
            });

            const data = await response.json();

            if (data.success) {
                showAlert('Başarılı', 'İlan başarıyla güncellendi!', 'success', [
                    {
                        text: 'Tamam',
                        variant: 'primary',
                        onPress: () => {
                            setAlertConfig(prev => ({ ...prev, visible: false }));
                            dispatch(fetchMyJobs());
                            router.back();
                        },
                    },
                ]);
            } else {
                showAlert('Hata', data.error?.message || 'İlan güncellenemedi', 'error');
            }
        } catch (error: any) {
            console.error('Update error:', error);
            showAlert('Hata', error.message || 'Bir hata oluştu', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (jobLoading && !dataLoaded) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: colors.backgroundDark }]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>İlan bilgileri yükleniyor...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <PremiumHeader
                title="İlanı Düzenle"
                subtitle={category || 'İlan bilgilerinizi güncelleyin'}
                showBackButton
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Basic Info Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                        <LinearGradient
                            colors={colors.gradientPrimary as any}
                            style={styles.titleIndicator}
                        />
                        <Text style={[styles.sectionTitleBold, { color: colors.text }]}>Temel Bilgiler</Text>
                    </View>
                    <Card style={styles.formCard} elevated>

                        {/* Title Input */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.text }]}>
                                Başlık <Text style={styles.required}>*</Text>
                            </Text>
                            <TextInput
                                style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundDark }, errors.title && styles.inputError]}
                                placeholder="Örn: Ev Elektrik Tesisatı Arızası"
                                value={title}
                                onChangeText={(text) => {
                                    setTitle(text);
                                    if (errors.title) setErrors({ ...errors, title: '' });
                                }}
                                placeholderTextColor={staticColors.textLight}
                            />
                            {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
                        </View>

                        {/* Description Input */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.text }]}>
                                Açıklama <Text style={styles.required}>*</Text>
                            </Text>
                            <TextInput
                                style={[styles.textArea, { color: colors.text, backgroundColor: colors.backgroundDark }, errors.description && styles.inputError]}
                                placeholder="İş hakkında detaylı bilgi verin..."
                                value={description}
                                onChangeText={(text) => {
                                    setDescription(text);
                                    if (errors.description) setErrors({ ...errors, description: '' });
                                }}
                                multiline
                                numberOfLines={6}
                                textAlignVertical="top"
                                placeholderTextColor={staticColors.textLight}
                            />
                            {errors.description && (
                                <Text style={styles.errorText}>{errors.description}</Text>
                            )}
                        </View>

                        {/* Category Selection */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.text }]}>
                                Kategori <Text style={styles.required}>*</Text>
                            </Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={styles.categoryScroll}
                            >
                                {JOB_CATEGORIES.map((cat) => (
                                    <TouchableOpacity
                                        key={cat}
                                        style={[
                                            styles.categoryChip,
                                            category === cat && [styles.categoryChipSelected, { backgroundColor: colors.primary, borderColor: colors.primary }],
                                        ]}
                                        onPress={() => {
                                            setCategory(cat);
                                            if (errors.category) setErrors({ ...errors, category: '' });
                                        }}
                                    >
                                        <Text
                                            style={[
                                                styles.categoryChipText,
                                                category === cat && [styles.categoryChipTextSelected, { color: staticColors.white }],
                                            ]}
                                        >
                                            {cat}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                            {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
                        </View>
                    </Card>
                </View>

                {/* Location Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                        <LinearGradient
                            colors={colors.gradientPrimary as any}
                            style={styles.titleIndicator}
                        />
                        <Text style={[styles.sectionTitleBold, { color: colors.text }]}>Konum Bilgileri</Text>
                    </View>
                    <Card style={styles.formCard} elevated>

                        {/* City Picker */}
                        <Picker
                            label="Şehir"
                            placeholder="Şehir seçiniz"
                            value={city}
                            options={CITY_NAMES}
                            onValueChange={setCity}
                            error={errors.city}
                            required
                        />

                        {/* District Picker */}
                        <Picker
                            label="İlçe"
                            placeholder={city ? 'İlçe seçiniz' : 'Önce şehir seçiniz'}
                            value={district}
                            options={districtOptions}
                            onValueChange={setDistrict}
                            error={errors.district}
                            required
                            disabled={!city || districtOptions.length === 0}
                        />

                        {/* Address Input */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.text }]}>
                                Adres <Text style={styles.required}>*</Text>
                            </Text>
                            <TextInput
                                style={[styles.textArea, { color: colors.text, backgroundColor: colors.backgroundDark }, errors.address && styles.inputError]}
                                placeholder="Sokak, cadde, bina no, daire no..."
                                value={address}
                                onChangeText={(text) => {
                                    setAddress(text);
                                    if (errors.address) setErrors({ ...errors, address: '' });
                                }}
                                multiline
                                numberOfLines={3}
                                textAlignVertical="top"
                                placeholderTextColor={staticColors.textLight}
                            />
                            {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
                        </View>

                        {/* Urgency Level */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.text }]}>Aciliyet Seviyesi</Text>
                            <View style={styles.urgencyContainer}>
                                {URGENCY_LEVELS.map((level) => (
                                    <TouchableOpacity
                                        key={level.value}
                                        style={[
                                            styles.urgencyButton,
                                            urgencyLevel === level.value && [styles.urgencyButtonSelected, { backgroundColor: colors.primary, borderColor: colors.primary }],
                                        ]}
                                        onPress={() => setUrgencyLevel(level.value as any)}
                                    >
                                        <Text style={styles.urgencyIcon}>{level.icon}</Text>
                                        <Text
                                            style={[
                                                styles.urgencyText,
                                                { color: colors.text },
                                                urgencyLevel === level.value && [styles.urgencyTextSelected, { color: staticColors.white }],
                                            ]}
                                        >
                                            {level.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {/* Budget Input */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: colors.text }]}>Tahmini Bütçe (₺)</Text>
                            <TextInput
                                style={[styles.input, { color: colors.text, backgroundColor: colors.backgroundDark }]}
                                placeholder="Örn: 2500 (Opsiyonel)"
                                value={estimatedBudget}
                                onChangeText={(text) => setEstimatedBudget(text.replace(/[^0-9.]/g, ''))}
                                keyboardType="numeric"
                                placeholderTextColor={staticColors.textLight}
                            />
                        </View>
                    </Card>
                </View>

                {/* Submit Buttons */}
                <View style={styles.buttonContainer}>
                    <Button
                        title="İptal"
                        onPress={() => router.back()}
                        variant="secondary"
                        style={styles.cancelButton}
                    />
                    <TouchableOpacity
                        onPress={handleSubmit}
                        disabled={isSubmitting}
                        activeOpacity={0.8}
                        style={styles.submitButtonWrapper}
                    >
                        <LinearGradient
                            colors={colors.gradientPrimary as any}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.submitButtonGradient}
                        >
                            <Text style={styles.submitButtonText}>
                                {isSubmitting ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                            </Text>
                            <Ionicons name="save-outline" size={20} color={staticColors.white} />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        ...typography.body2,
        marginTop: spacing.md,
        fontFamily: fonts.medium,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: spacing.screenPadding,
        paddingTop: spacing.md,
        paddingBottom: spacing.xxl,
    },
    section: {
        marginBottom: spacing.xl,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    titleIndicator: {
        width: 4,
        height: 18,
        borderRadius: 2,
        marginRight: spacing.sm,
    },
    sectionTitleBold: {
        ...typography.h4Style,
        fontFamily: fonts.bold,
    },
    formCard: {
        padding: spacing.md,
    },
    inputGroup: {
        marginBottom: spacing.lg,
    },
    label: {
        ...typography.body2,
        fontFamily: fonts.bold,
        marginBottom: spacing.xs,
    },
    required: {
        color: staticColors.error,
    },
    input: {
        ...typography.body1,
        borderRadius: 12,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        minHeight: 48,
        fontFamily: fonts.medium,
        borderWidth: 1,
        borderColor: staticColors.borderLight,
    },
    textArea: {
        ...typography.body1,
        borderRadius: 12,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        minHeight: 120,
        fontFamily: fonts.regular,
        borderWidth: 1,
        borderColor: staticColors.borderLight,
    },
    inputError: {
        borderColor: staticColors.error,
        backgroundColor: staticColors.error + '05',
    },
    errorText: {
        ...typography.caption,
        color: staticColors.error,
        marginTop: spacing.xs,
        fontFamily: fonts.medium,
    },
    categoryScroll: {
        marginVertical: spacing.xs,
    },
    categoryChip: {
        paddingHorizontal: spacing.md,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: staticColors.white,
        borderWidth: 1,
        borderColor: staticColors.borderLight,
        marginRight: spacing.sm,
    },
    categoryChipSelected: {
    },
    categoryChipText: {
        fontSize: 13,
        color: staticColors.textSecondary,
        fontFamily: fonts.medium,
    },
    categoryChipTextSelected: {
        fontFamily: fonts.bold,
    },
    urgencyContainer: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.xs,
    },
    urgencyButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: staticColors.white,
        borderWidth: 1,
        borderColor: staticColors.borderLight,
        gap: 6,
    },
    urgencyButtonSelected: {
    },
    urgencyIcon: {
        fontSize: 16,
    },
    urgencyText: {
        fontSize: 13,
        fontFamily: fonts.medium,
    },
    urgencyTextSelected: {
        fontFamily: fonts.bold,
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: spacing.md,
        marginTop: spacing.lg,
        alignItems: 'center',
    },
    cancelButton: {
        flex: 1,
        height: 56,
    },
    submitButtonWrapper: {
        flex: 2,
        borderRadius: 16,
        overflow: 'hidden',
    },
    submitButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 56,
        gap: 8,
    },
    submitButtonText: {
        color: staticColors.white,
        fontFamily: fonts.bold,
        fontSize: 15,
    },
});
