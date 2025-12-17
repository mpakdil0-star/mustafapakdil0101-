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
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { createJob, clearError, fetchJobs, fetchMyJobs } from '../../store/slices/jobSlice';
import { logout } from '../../store/slices/authSlice';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Picker } from '../../components/common/Picker';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import {
  CITY_NAMES,
  getDistrictsByCity,
  getNeighborhoodsByCityAndDistrict,
} from '../../constants/locations';

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

export default function CreateJobScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.jobs);
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);

  // Authentication kontrolü - sayfa yüklendiğinde
  useEffect(() => {
    if (!isAuthenticated || !user) {
      // Kısa bir delay ile alert göster (sayfa render olsun)
      const timer = setTimeout(() => {
        Alert.alert(
          'Giriş Gerekli',
          'İlan oluşturmak için giriş yapmanız gerekiyor.',
          [
            {
              text: 'İptal',
              style: 'cancel',
              onPress: () => router.back(),
            },
            {
              text: 'Giriş Yap',
              onPress: () => router.replace('/(auth)/login'),
            },
          ]
        );
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, user, router]);

  // Pre-fill category from params
  useEffect(() => {
    if (params.category && typeof params.category === 'string') {
      const cat = params.category;
      if (JOB_CATEGORIES.includes(cat)) {
        setCategory(cat);
      }
    }
  }, [params.category]);

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

  // Location options
  const districtOptions = getDistrictsByCity(city);
  const neighborhoodOptions = getNeighborhoodsByCityAndDistrict(city, district);

  // Reset district and neighborhood when city changes
  useEffect(() => {
    if (city) {
      setDistrict('');
      setNeighborhood('');
      if (errors.district) setErrors({ ...errors, district: '' });
    }
  }, [city]);

  // Reset neighborhood when district changes
  useEffect(() => {
    if (district) {
      setNeighborhood('');
    }
  }, [district]);

  useEffect(() => {
    if (error) {
      Alert.alert('Hata', error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

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

    if (estimatedBudget && parseFloat(estimatedBudget) <= 0) {
      newErrors.estimatedBudget = 'Geçerli bir bütçe giriniz';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    // Authentication kontrolü
    if (!isAuthenticated || !user) {
      Alert.alert(
        'Giriş Gerekli',
        'İlan oluşturmak için giriş yapmanız gerekiyor.',
        [
          {
            text: 'İptal',
            style: 'cancel',
          },
          {
            text: 'Giriş Yap',
            onPress: () => router.replace('/(auth)/login'),
          },
        ]
      );
      return;
    }

    // Sadece vatandaşlar ilan oluşturabilir
    if (user.userType !== 'CITIZEN') {
      Alert.alert(
        'Yetki Hatası',
        'Sadece vatandaşlar ilan oluşturabilir.',
        [{ text: 'Tamam' }]
      );
      return;
    }

    try {
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
          latitude: 41.0082, // Default Istanbul coordinates - in real app, use location service
          longitude: 28.9784,
        },
        urgencyLevel,
        estimatedBudget: estimatedBudget ? parseFloat(estimatedBudget) : undefined,
      };

      const newJob = await dispatch(createJob(jobData)).unwrap();

      Alert.alert('Başarılı', 'İlanınız başarıyla oluşturuldu!', [
        {
          text: 'Tamam',
          onPress: () => {
            // Refresh jobs lists
            dispatch(fetchJobs({ status: 'OPEN', limit: 20 }));
            dispatch(fetchMyJobs()); // Refresh my jobs list
            router.back();
            // Navigate to job detail after a delay
            setTimeout(() => {
              router.push(`/jobs/${newJob.id}`);
            }, 500);
          },
        },
      ]);
    } catch (err: any) {
      // Token refresh hatası veya 401 hatası için özel mesaj
      const errorMessage = err.message || '';
      const isTokenError = errorMessage.includes('Token') ||
        errorMessage.includes('401') ||
        errorMessage.includes('Unauthorized') ||
        err.shouldRedirectToLogin;

      if (isTokenError) {
        const message = errorMessage.includes('formatı geçersiz')
          ? 'Token formatı geçersiz. Lütfen tekrar giriş yapın.'
          : 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.';

        Alert.alert(
          'Oturum Sonlandı',
          message,
          [
            {
              text: 'Giriş Yap',
              onPress: () => {
                // Logout action dispatch et
                dispatch(logout());
                router.replace('/(auth)/login');
              },
            },
          ]
        );
      } else {
        Alert.alert('Hata', err.message || 'İlan oluşturulurken bir hata oluştu');
      }
    }
  };

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
          <Text style={styles.formTitle}>Yeni İş İlanı</Text>

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
            <Text style={styles.hintText}>
              {description.length}/500 karakter (Minimum 20 karakter)
            </Text>
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

          {/* Subcategory Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Alt Kategori (Opsiyonel)</Text>
            <TextInput
              style={styles.input}
              placeholder="Örn: Pano Arızası, Led Aydınlatma"
              value={subcategory}
              onChangeText={setSubcategory}
              placeholderTextColor={colors.textLight}
            />
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
            onValueChange={(value) => {
              setCity(value);
              if (errors.city) setErrors({ ...errors, city: '' });
            }}
            error={errors.city}
            required
          />

          {/* District Picker */}
          <Picker
            label="İlçe"
            placeholder={city ? 'İlçe seçiniz' : 'Önce şehir seçiniz'}
            value={district}
            options={districtOptions}
            onValueChange={(value) => {
              setDistrict(value);
              if (errors.district) setErrors({ ...errors, district: '' });
            }}
            error={errors.district}
            required
            disabled={!city || districtOptions.length === 0}
          />

          {/* Neighborhood Picker */}
          {district && neighborhoodOptions.length > 0 && (
            <Picker
              label="Mahalle (Opsiyonel)"
              placeholder="Mahalle seçiniz"
              value={neighborhood}
              options={neighborhoodOptions}
              onValueChange={setNeighborhood}
            />
          )}

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
              style={[styles.input, errors.estimatedBudget && styles.inputError]}
              placeholder="Örn: 2500 (Opsiyonel)"
              value={estimatedBudget}
              onChangeText={(text) => {
                setEstimatedBudget(text.replace(/[^0-9.]/g, ''));
                if (errors.estimatedBudget)
                  setErrors({ ...errors, estimatedBudget: '' });
              }}
              keyboardType="numeric"
              placeholderTextColor={colors.textLight}
            />
            {errors.estimatedBudget && (
              <Text style={styles.errorText}>{errors.estimatedBudget}</Text>
            )}
            <Text style={styles.hintText}>
              İsteğe bağlı: Ne kadar bütçeniz olduğunu belirtin
            </Text>
          </View>
        </Card>

        {/* Submit Button */}
        <Button
          title={isLoading ? 'Oluşturuluyor...' : 'İlanı Oluştur'}
          onPress={handleSubmit}
          variant="primary"
          fullWidth
          disabled={isLoading}
          style={styles.submitButton}
        />

        {/* Info Card */}
        <Card style={styles.infoCard}>
          <Text style={styles.infoTitle}>💡 İpucu</Text>
          <Text style={styles.infoText}>
            • Detaylı açıklama yazarsanız, elektrikçiler size daha iyi teklif verebilir{'\n'}
            • Fotoğraf eklemek (yakında eklenecek) daha fazla teklif almanızı sağlar{'\n'}
            • Acil işler için yüksek aciliyet seviyesi seçin
          </Text>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
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
  hintText: {
    ...typography.caption,
    color: colors.textSecondary,
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
  submitButton: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  infoCard: {
    padding: spacing.md,
    backgroundColor: colors.infoLight + '20',
    borderLeftWidth: 4,
    borderLeftColor: colors.info,
  },
  infoTitle: {
    ...typography.h6,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  infoText: {
    ...typography.body2,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});

