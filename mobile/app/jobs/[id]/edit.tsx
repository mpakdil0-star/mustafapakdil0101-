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
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useAppDispatch, useAppSelector } from '../../../hooks/redux';
import { fetchJobById, fetchMyJobs } from '../../../store/slices/jobSlice';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Picker } from '../../../components/common/Picker';
import { colors } from '../../../constants/colors';
import { spacing } from '../../../constants/spacing';
import { typography } from '../../../constants/typography';
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
        } else if (description.trim().length < 20) {
            newErrors.description = 'Açıklama en az 20 karakter olmalıdır';
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

            const response = await fetch(`${API_BASE_URL}/jobs/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(jobData),
            });

            const data = await response.json();

            if (data.success) {
                Alert.alert('Başarılı', 'İlan başarıyla güncellendi!', [
                    {
                        text: 'Tamam',
                        onPress: () => {
                            dispatch(fetchMyJobs());
                            router.back();
                        },
                    },
                ]);
            } else {
                Alert.alert('Hata', data.error?.message || 'İlan güncellenemedi');
            }
        } catch (error: any) {
            console.error('Update error:', error);
            Alert.alert('Hata', error.message || 'Bir hata oluştu');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (jobLoading && !dataLoaded) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>İlan bilgileri yükleniyor...</Text>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={100}
        >
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Form Card */}
                <Card style={styles.formCard}>
                    <Text style={styles.formTitle}>✏️ İlanı Düzenle</Text>

                    {/* Title Input */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>
                            Başlık <Text style={styles.required}>*</Text>
                        </Text>
                        <TextInput
                            style={[styles.input, errors.title && styles.inputError]}
                            placeholder="Örn: Ev Elektrik Tesisatı Arızası"
                            value={title}
                            onChangeText={(text) => {
                                setTitle(text);
                                if (errors.title) setErrors({ ...errors, title: '' });
                            }}
                            placeholderTextColor={colors.textLight}
                        />
                        {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
                    </View>

                    {/* Description Input */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>
                            Açıklama <Text style={styles.required}>*</Text>
                        </Text>
                        <TextInput
                            style={[styles.textArea, errors.description && styles.inputError]}
                            placeholder="İş hakkında detaylı bilgi verin..."
                            value={description}
                            onChangeText={(text) => {
                                setDescription(text);
                                if (errors.description) setErrors({ ...errors, description: '' });
                            }}
                            multiline
                            numberOfLines={6}
                            textAlignVertical="top"
                            placeholderTextColor={colors.textLight}
                        />
                        {errors.description && (
                            <Text style={styles.errorText}>{errors.description}</Text>
                        )}
                    </View>

                    {/* Category Selection */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>
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
                                        category === cat && styles.categoryChipSelected,
                                    ]}
                                    onPress={() => {
                                        setCategory(cat);
                                        if (errors.category) setErrors({ ...errors, category: '' });
                                    }}
                                >
                                    <Text
                                        style={[
                                            styles.categoryChipText,
                                            category === cat && styles.categoryChipTextSelected,
                                        ]}
                                    >
                                        {cat}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
                    </View>

                    {/* Location Section */}
                    <View style={styles.sectionDivider}>
                        <Text style={styles.sectionTitle}>📍 Konum Bilgileri</Text>
                    </View>

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
                        <Text style={styles.label}>
                            Adres <Text style={styles.required}>*</Text>
                        </Text>
                        <TextInput
                            style={[styles.textArea, errors.address && styles.inputError]}
                            placeholder="Sokak, cadde, bina no, daire no..."
                            value={address}
                            onChangeText={(text) => {
                                setAddress(text);
                                if (errors.address) setErrors({ ...errors, address: '' });
                            }}
                            multiline
                            numberOfLines={3}
                            textAlignVertical="top"
                            placeholderTextColor={colors.textLight}
                        />
                        {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
                    </View>

                    {/* Urgency Level */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Aciliyet Seviyesi</Text>
                        <View style={styles.urgencyContainer}>
                            {URGENCY_LEVELS.map((level) => (
                                <TouchableOpacity
                                    key={level.value}
                                    style={[
                                        styles.urgencyButton,
                                        urgencyLevel === level.value && styles.urgencyButtonSelected,
                                    ]}
                                    onPress={() => setUrgencyLevel(level.value as any)}
                                >
                                    <Text style={styles.urgencyIcon}>{level.icon}</Text>
                                    <Text
                                        style={[
                                            styles.urgencyText,
                                            urgencyLevel === level.value && styles.urgencyTextSelected,
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
                        <Text style={styles.label}>Tahmini Bütçe (₺)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Örn: 2500 (Opsiyonel)"
                            value={estimatedBudget}
                            onChangeText={(text) => setEstimatedBudget(text.replace(/[^0-9.]/g, ''))}
                            keyboardType="numeric"
                            placeholderTextColor={colors.textLight}
                        />
                    </View>
                </Card>

                {/* Submit Buttons */}
                <View style={styles.buttonContainer}>
                    <Button
                        title="İptal"
                        onPress={() => router.back()}
                        variant="outline"
                        style={styles.cancelButton}
                    />
                    <Button
                        title={isSubmitting ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                        onPress={handleSubmit}
                        variant="primary"
                        disabled={isSubmitting}
                        style={styles.submitButton}
                    />
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.backgroundLight,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.backgroundLight,
    },
    loadingText: {
        ...typography.body2,
        color: colors.textSecondary,
        marginTop: spacing.md,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: spacing.screenPadding,
        paddingBottom: spacing.xxl,
    },
    formCard: {
        padding: spacing.lg,
        marginBottom: spacing.md,
    },
    formTitle: {
        ...typography.h4,
        color: colors.text,
        marginBottom: spacing.lg,
    },
    inputGroup: {
        marginBottom: spacing.lg,
    },
    label: {
        ...typography.body2,
        color: colors.text,
        fontWeight: '600',
        marginBottom: spacing.xs,
    },
    required: {
        color: colors.error,
    },
    input: {
        ...typography.body1,
        color: colors.text,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: spacing.radius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        minHeight: 48,
    },
    textArea: {
        ...typography.body1,
        color: colors.text,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: spacing.radius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        minHeight: 120,
    },
    inputError: {
        borderColor: colors.error,
    },
    errorText: {
        ...typography.caption,
        color: colors.error,
        marginTop: spacing.xs,
    },
    categoryScroll: {
        marginVertical: spacing.xs,
    },
    categoryChip: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: spacing.radius.round,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        marginRight: spacing.sm,
    },
    categoryChipSelected: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    categoryChipText: {
        ...typography.body2,
        color: colors.text,
    },
    categoryChipTextSelected: {
        color: colors.white,
        fontWeight: '600',
    },
    sectionDivider: {
        marginTop: spacing.md,
        marginBottom: spacing.md,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.borderLight,
    },
    sectionTitle: {
        ...typography.h6,
        color: colors.text,
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
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: spacing.radius.md,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        gap: spacing.xs,
    },
    urgencyButtonSelected: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    urgencyIcon: {
        fontSize: 16,
    },
    urgencyText: {
        ...typography.body2,
        color: colors.text,
    },
    urgencyTextSelected: {
        color: colors.white,
        fontWeight: '600',
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: spacing.md,
        marginTop: spacing.md,
    },
    cancelButton: {
        flex: 1,
    },
    submitButton: {
        flex: 2,
    },
});
