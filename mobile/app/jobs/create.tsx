import { useState, useEffect, useRef } from 'react';
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
  Image,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { createJob, clearError, fetchJobs, fetchMyJobs } from '../../store/slices/jobSlice';
import { logout } from '../../store/slices/authSlice';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Picker } from '../../components/common/Picker';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import { AuthGuardModal } from '../../components/common/AuthGuardModal';
import { PremiumAlert } from '../../components/common/PremiumAlert';
import { colors as staticColors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';
import { useAppColors } from '../../hooks/useAppColors';
import {
  CITY_NAMES,
  getDistrictsByCity,
  getNeighborhoodsByCityAndDistrict,
} from '../../constants/locations';
import LocationPicker from '../../components/common/LocationPicker';
import { JOB_CATEGORIES, getSubCategoriesByParent } from '../../constants/jobCategories';
import { SERVICE_CATEGORIES } from '../../constants/serviceCategories';

const MAX_IMAGES = 5;

const URGENCY_LEVELS = [
  { value: 'LOW', label: 'Düşük', icon: 'leaf-outline', color: '#10B981' },
  { value: 'MEDIUM', label: 'Orta', icon: 'time-outline', color: '#F59E0B' },
  { value: 'HIGH', label: 'Acil', icon: 'flash-outline', color: '#EF4444' },
];

export default function CreateJobScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.jobs);
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const colors = useAppColors();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [serviceCategory, setServiceCategory] = useState(''); // Ana hizmet kategorisi
  const [category, setCategory] = useState(''); // Alt kategori
  const [subcategory, setSubcategory] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('İstanbul');
  const [district, setDistrict] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [urgencyLevel, setUrgencyLevel] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [estimatedBudget, setEstimatedBudget] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number }>({
    latitude: 41.0082,
    longitude: 28.9784,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isCategoryExpanded, setIsCategoryExpanded] = useState(false);
  const [isUrgencyExpanded, setIsUrgencyExpanded] = useState(false);
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

  // Adres bilgilerini otomatik doldur
  useEffect(() => {
    const fetchDefaultAddress = async () => {
      if (!isAuthenticated) return;

      // 1. Profil bilgilerinden hızlı doldur
      if (user?.city) {
        setCity(user.city);
        if (user.district) setDistrict(user.district);
      }

      // 2. Kayıtlı adreslerden daha detaylı doldur
      try {
        const response = await api.get('/locations');
        if (response.data.success && response.data.data.length > 0) {
          const loc = response.data.data[0];
          if (loc.city) setCity(loc.city);
          if (loc.district) setDistrict(loc.district);
          if (loc.neighborhood) setNeighborhood(loc.neighborhood);
          if (loc.address) setAddress(loc.address);
          if (loc.latitude && loc.longitude) {
            setCoords({ latitude: Number(loc.latitude), longitude: Number(loc.longitude) });
          }
        }
      } catch (error) {
        console.error('Error fetching default address for auto-fill:', error);
      }
    };

    fetchDefaultAddress();
  }, [isAuthenticated, user]);

  // Authentication kontrolü - sayfa yüklendiğinde
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setShowAuthModal(true);
    }
  }, [isAuthenticated, user]);

  // Pre-fill category from params
  useEffect(() => {
    // Handle serviceCategory param (from home screen Ne Lazım cards)
    if (params.serviceCategory && typeof params.serviceCategory === 'string') {
      setServiceCategory(params.serviceCategory);
    }
    // Handle category param (legacy)
    if (params.category && typeof params.category === 'string') {
      const catName = params.category;
      if (JOB_CATEGORIES.some(cat => cat.name === catName)) {
        setCategory(catName);
      }
    }
  }, [params.category, params.serviceCategory]);

  // Akıllı Sihirbaz Mantığı
  const [wizardDraft, setWizardDraft] = useState<{ category?: string; urgency?: string } | null>(null);

  useEffect(() => {
    const fullText = (title + ' ' + description).toLowerCase();
    let predictedCategory = '';
    let predictedUrgency: 'LOW' | 'MEDIUM' | 'HIGH' | '' = '';

    // Kategori Tahmini
    const categoryKeywords: Record<string, string[]> = {
      'Aydınlatma': ['lamba', 'ışık', 'avize', 'spot', 'led', 'aplik', 'armatür', 'duy'],
      'Priz ve Anahtar': ['priz', 'anahtar', 'fiş', 'şalter', 'vavien', 'komütatör'],
      'Elektrik Panosu': ['pano', 'sigorta', 'kaçak akım', 'klemens', 'kontaktör', 'trifaze'],
      'Kablo Çekimi': ['kablo', 'kanal', 'hat çekme', 'sıva altı', 'sıva üstü', 'internet kablo'],
      'Elektrik Tamiri': ['tamir', 'arıza', 'bozuk', 'çalışmıyor', 'temassızlık', 'kısa devre'],
    };

    for (const [cat, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(kw => fullText.includes(kw))) {
        predictedCategory = cat;
        break;
      }
    }

    // Aciliyet Tahmini
    const urgencyKeywords = {
      'HIGH': ['acil', 'duman', 'yanıyor', 'koku', 'kıvılcım', 'patladı', 'elektrik yok', 'karanlık', 'tehlike', 'yangın'],
      'MEDIUM': ['bozuldu', 'çalışmıyor', 'ses geliyor', 'titriyor'],
    };

    if (urgencyKeywords.HIGH.some(kw => fullText.includes(kw))) {
      predictedUrgency = 'HIGH';
    } else if (urgencyKeywords.MEDIUM.some(kw => fullText.includes(kw))) {
      predictedUrgency = 'MEDIUM';
    }

    // Otomatik Uygula (Eğer kullanıcı henüz seçmemişse veya boşsa)
    if (predictedCategory && !category) {
      setCategory(predictedCategory);
      setWizardDraft(prev => ({ ...prev, category: predictedCategory }));
    }
    if (predictedUrgency && urgencyLevel === 'MEDIUM' && predictedUrgency !== 'MEDIUM') {
      setUrgencyLevel(predictedUrgency as any);
      setWizardDraft(prev => ({ ...prev, urgency: predictedUrgency }));
    }

    // 3 saniye sonra wizard mesajını sil
    if (wizardDraft) {
      const timer = setTimeout(() => setWizardDraft(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [title, description]);

  // Image picker handlers
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
        } else if (asset.uri) {
          setImages([...images, asset.uri]);
        }
      }
    } catch (error) {
      showAlert('Hata', 'Fotoğraf çekilirken bir hata oluştu', 'error');
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

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
      showAlert('Hata', error, 'error');
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

    if (!neighborhood.trim()) {
      newErrors.neighborhood = 'Mahalle zorunludur';
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
    // Comprehensive validation with popup
    const validationErrors: string[] = [];

    // 1. Title validation
    if (!title.trim()) {
      validationErrors.push('• Başlık girilmedi');
    } else if (title.trim().length < 5) {
      validationErrors.push('• Başlık en az 5 karakter olmalı');
    } else if (title.length > 100) {
      validationErrors.push('• Başlık en fazla 100 karakter olabilir');
    }

    // 2. Description validation
    if (!description.trim()) {
      validationErrors.push('• Açıklama girilmedi');
    } else if (description.trim().length < 5) {
      validationErrors.push('• Açıklama en az 5 karakter olmalı');
    } else if (description.length > 500) {
      validationErrors.push('• Açıklama en fazla 500 karakter olabilir');
    }

    // 3. Category validation
    if (!category) {
      validationErrors.push('• Kategori seçilmedi');
    }

    // 4. City validation
    if (!city.trim()) {
      validationErrors.push('• Şehir seçilmedi');
    }

    // 5. District validation
    if (!district.trim()) {
      validationErrors.push('• İlçe seçilmedi');
    }

    // 6. Neighborhood validation
    if (!neighborhood.trim()) {
      validationErrors.push('• Mahalle seçilmedi');
    }

    // 7. Address validation
    if (!address.trim()) {
      validationErrors.push('• Detaylı adres girilmedi');
    } else if (address.trim().length < 10) {
      validationErrors.push('• Detaylı adres en az 10 karakter olmalı');
    } else if (address.length > 200) {
      validationErrors.push('• Detaylı adres en fazla 200 karakter olabilir');
    }

    // 8. Budget validation (optional but if entered, must be valid)
    if (estimatedBudget && parseFloat(estimatedBudget) <= 0) {
      validationErrors.push('• Bütçe geçerli bir sayı olmalı');
    }

    // If there are validation errors, show them in a popup
    if (validationErrors.length > 0) {
      // Also set inline errors for visual feedback
      validateForm();

      showAlert(
        'Eksik veya Hatalı Bilgiler',
        'Lütfen aşağıdaki alanları kontrol edin:\n\n' + validationErrors.join('\n'),
        'warning',
        [{ text: 'Tamam', variant: 'primary', onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) }]
      );
      return;
    }

    if (!isAuthenticated || !user) {
      showAlert(
        'Giriş Gerekli',
        'İlan oluşturmak için giriş yapmanız gerekiyor.',
        'info',
        [
          { text: 'İptal', variant: 'ghost', onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) },
          {
            text: 'Giriş Yap',
            variant: 'primary',
            onPress: () => router.replace({
              pathname: '/(auth)/login',
              params: { redirectTo: '/jobs/create' }
            })
          },
        ]
      );
      return;
    }

    if (user.userType !== 'CITIZEN') {
      showAlert('Yetki Hatası', 'Sadece vatandaşlar ilan oluşturabilir.', 'error');
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
          latitude: coords.latitude,
          longitude: coords.longitude,
        },
        urgencyLevel,
        estimatedBudget: estimatedBudget ? parseFloat(estimatedBudget) : undefined,
        images: images.length > 0 ? images : undefined,
      };

      const newJob = await dispatch(createJob(jobData)).unwrap();

      // Show themed success modal
      setCreatedJobId(newJob.id);
      dispatch(fetchJobs({ status: 'OPEN', limit: 20 }));
      dispatch(fetchMyJobs());
      setShowSuccessModal(true);
    } catch (err: any) {
      const errorMessage = err.message || '';
      const isTokenError = errorMessage.includes('401') || err.shouldRedirectToLogin;

      if (isTokenError) {
        showAlert(
          'Oturum Sonlandı',
          'Lütfen tekrar giriş yapın.',
          'warning',
          [
            {
              text: 'Giriş Yap',
              variant: 'primary',
              onPress: () => {
                dispatch(logout());
                router.replace('/(auth)/login');
              },
            },
          ]
        );
      } else {
        showAlert('Hata', err.message || 'İlan oluşturulurken bir hata oluştu', 'error');
      }
    }
  };

  return (
    <View style={styles.container}>
      <PremiumHeader
        title="Hemen Hizmet Al"
        showBackButton
        backgroundImage={require('../../assets/images/header_bg.png')}
      />

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
          {/* AI Wizard Notification */}
          {wizardDraft && (
            <View style={[styles.wizardMessage, { backgroundColor: colors.primary, shadowColor: colors.primary }]}>
              <Ionicons name="sparkles" size={16} color={staticColors.white} />
              <Text style={styles.wizardMessageText}>
                {wizardDraft.category ? `Kategoriyi "${wizardDraft.category}" olarak güncelledim! ` : ''}
                {wizardDraft.urgency === 'HIGH' ? 'Bu önemli bir arıza, aciliyeti yükselttim.' : ''}
              </Text>
            </View>
          )}



          {/* Main Form Section */}
          <Card variant="default" style={styles.sectionCard}>
            {/* İlan Detayı */}
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconWrapper, { backgroundColor: colors.primary + '10' }]}>
                <Ionicons name="document-text-outline" size={20} color={colors.primary} />
              </View>
              <Text style={styles.sectionTitle}>
                İlan Detayı{serviceCategory ? ` - ${SERVICE_CATEGORIES.find(s => s.id === serviceCategory)?.name || ''}` : ''}
              </Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>İlan Başlığı</Text>
              <TextInput
                style={[styles.input, errors.title && styles.inputError]}
                placeholder="Örn: Mutfak tavan aydınlatma arızası"
                value={title}
                onChangeText={(text) => {
                  setTitle(text);
                  if (errors.title) setErrors({ ...errors, title: '' });
                }}
                placeholderTextColor={colors.textLight}
                autoCorrect={false}
                spellCheck={false}
                autoCapitalize="sentences"
              />
              {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Açıklama</Text>
              <View>
                <TextInput
                  style={[styles.textArea, errors.description && styles.inputError]}
                  placeholder="İşin detaylarını, sorunun ne zaman başladığını yazın..."
                  value={description}
                  onChangeText={(text) => {
                    setDescription(text);
                    if (errors.description) setErrors({ ...errors, description: '' });
                  }}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  placeholderTextColor={colors.textLight}
                  autoCorrect={false}
                  spellCheck={false}
                  autoCapitalize="sentences"
                />
              </View>
              {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
            </View>

            <View style={styles.divider} />

            {/* Hizmet Türü ve Kategori Seçimi - Expandable */}
            <TouchableOpacity
              style={styles.expandableHeader}
              onPress={() => setIsCategoryExpanded(!isCategoryExpanded)}
              activeOpacity={0.7}
            >
              <View style={styles.sectionHeaderNoMargin}>
                <View style={[styles.sectionIconWrapper, { backgroundColor: colors.primary + '10' }]}>
                  <Ionicons name="list-outline" size={20} color={colors.primary} />
                </View>
                <Text style={styles.sectionTitle}>Hizmet Türü & Kategori</Text>
              </View>
              <Ionicons
                name={isCategoryExpanded ? "chevron-up" : "chevron-down"}
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            {isCategoryExpanded && (
              <View style={styles.expandableContent}>
                {/* Hizmet Türü Seçimi (Ana Kategori) */}
                <Text style={[styles.label, { marginBottom: 8 }]}>Hizmet Türü</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.categoryScroll}
                  contentContainerStyle={{ paddingBottom: 10, paddingRight: 20 }}
                >
                  {SERVICE_CATEGORIES.map((svc) => (
                    <TouchableOpacity
                      key={svc.id}
                      style={[
                        styles.categoryChip,
                        serviceCategory === svc.id && [styles.categoryChipSelected, { backgroundColor: svc.colors[0], borderColor: svc.colors[0], shadowColor: svc.colors[0] }],
                      ]}
                      onPress={() => {
                        setServiceCategory(svc.id);
                        setCategory(''); // Alt kategoriyi sıfırla
                        if (errors.category) setErrors({ ...errors, category: '' });
                      }}
                    >
                      <LinearGradient
                        colors={serviceCategory === svc.id ? svc.colors : ['transparent', 'transparent']}
                        style={[
                          styles.categoryIconCircle,
                          serviceCategory !== svc.id && { backgroundColor: svc.colors[0] + '20' }
                        ]}
                      >
                        <Ionicons
                          name={svc.icon as any}
                          size={18}
                          color={serviceCategory === svc.id ? staticColors.white : svc.colors[0]}
                        />
                      </LinearGradient>
                      <Text
                        style={[
                          styles.categoryChipText,
                          serviceCategory === svc.id && [styles.categoryChipTextSelected, { color: staticColors.white }],
                        ]}
                        numberOfLines={1}
                      >
                        {svc.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Alt Kategori Seçimi */}
                {serviceCategory && (
                  <>
                    <Text style={[styles.label, { marginTop: 16, marginBottom: 8 }]}>Alt Kategori</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.categoryScroll}
                      contentContainerStyle={{ paddingBottom: 10, paddingRight: 20 }}
                    >
                      {getSubCategoriesByParent(serviceCategory).map((cat) => (
                        <TouchableOpacity
                          key={cat.id}
                          style={[
                            styles.categoryChip,
                            category === cat.name && [styles.categoryChipSelected, { backgroundColor: cat.colors[0], borderColor: cat.colors[0], shadowColor: cat.colors[0] }],
                          ]}
                          onPress={() => {
                            setCategory(cat.name);
                            if (errors.category) setErrors({ ...errors, category: '' });
                          }}
                        >
                          <LinearGradient
                            colors={category === cat.name ? (cat.colors as [string, string]) : ['transparent', 'transparent']}
                            style={[
                              styles.categoryIconCircle,
                              category !== cat.name && { backgroundColor: cat.colors[0] + '20' }
                            ]}
                          >
                            <Ionicons
                              name={cat.icon as any}
                              size={18}
                              color={category === cat.name ? staticColors.white : cat.colors[0]}
                            />
                          </LinearGradient>
                          <Text
                            style={[
                              styles.categoryChipText,
                              category === cat.name && [styles.categoryChipTextSelected, { color: staticColors.white }],
                            ]}
                            numberOfLines={1}
                          >
                            {cat.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </>
                )}

                {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
              </View>
            )}

            <View style={styles.divider} />

            {/* Aciliyet Durumu - Expandable */}
            <TouchableOpacity
              style={styles.expandableHeader}
              onPress={() => setIsUrgencyExpanded(!isUrgencyExpanded)}
              activeOpacity={0.7}
            >
              <View style={styles.sectionHeaderNoMargin}>
                <View style={[styles.sectionIconWrapper, { backgroundColor: '#EF444410' }]}>
                  <Ionicons name="flash-outline" size={20} color="#EF4444" />
                </View>
                <Text style={styles.sectionTitle}>Aciliyet Durumu</Text>
              </View>
              <Ionicons
                name={isUrgencyExpanded ? "chevron-up" : "chevron-down"}
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            {isUrgencyExpanded && (
              <View style={styles.expandableContent}>
                <View style={styles.urgencyContainer}>
                  {URGENCY_LEVELS.map((level) => (
                    <TouchableOpacity
                      key={level.value}
                      style={[
                        styles.urgencyButton,
                        urgencyLevel === level.value && {
                          borderColor: level.color,
                          backgroundColor: level.color + '10',
                          shadowColor: level.color,
                          shadowOpacity: 0.3,
                          shadowRadius: 10,
                          elevation: 6
                        },
                      ]}
                      onPress={() => setUrgencyLevel(level.value as any)}
                    >
                      <Ionicons
                        name={level.icon as any}
                        size={16}
                        color={urgencyLevel === level.value ? level.color : colors.textLight}
                      />
                      <Text
                        style={[
                          styles.urgencyText,
                          urgencyLevel === level.value && { color: level.color, fontFamily: fonts.bold },
                        ]}
                      >
                        {level.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.divider} />

            {/* Konum Bilgileri */}
            <View style={[styles.sectionHeader, { marginTop: 12 }]}>
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
            />

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
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

            <View style={styles.divider} />

            {/* Fotoğraflar ve Bütçe */}
            <View style={[styles.sectionHeader, { marginTop: 12 }]}>
              <View style={[styles.sectionIconWrapper, { backgroundColor: colors.primary + '10' }]}>
                <Ionicons name="camera-outline" size={20} color={colors.primary} />
              </View>
              <Text style={styles.sectionTitle}>Görsel ve Bütçe</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Fotoğraf Ekle (Opsiyonel)</Text>
              <View style={styles.imageButtons}>
                <TouchableOpacity style={[styles.imageActionBtn, { borderColor: colors.primary + '30' }]} onPress={handleTakePhoto}>
                  <Ionicons name="camera" size={24} color={colors.primary} />
                  <Text style={[styles.imageActionText, { color: colors.primary }]}>Çek</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.imageActionBtn, { borderColor: colors.primary + '30' }]} onPress={handlePickImage}>
                  <Ionicons name="images" size={24} color={colors.primary} />
                  <Text style={[styles.imageActionText, { color: colors.primary }]}>Galeri</Text>
                </TouchableOpacity>
              </View>

              {images.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagePreviewScroll}>
                  {images.map((img, index) => (
                    <View key={index} style={styles.imagePreviewWrapper}>
                      <Image source={{ uri: img }} style={styles.previewImage} />
                      <TouchableOpacity
                        style={styles.removeImgBtn}
                        onPress={() => handleRemoveImage(index)}
                      >
                        <Ionicons name="close-circle" size={20} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Tahmini Bütçe (₺) (Opsiyonel)</Text>
              <View style={styles.budgetInputWrapper}>
                <Ionicons name="cash-outline" size={20} color={colors.primary} style={styles.budgetIcon} />
                <TextInput
                  style={styles.budgetInput}
                  placeholder="Seçenekleri değerlendirin (Opsiyonel)"
                  value={estimatedBudget}
                  onChangeText={(text) => setEstimatedBudget(text.replace(/[^0-9.]/g, ''))}
                  keyboardType="numeric"
                  placeholderTextColor={colors.textLight}
                />
              </View>
            </View>
          </Card>

          <Button
            title="İlanı Yayınla"
            onPress={handleSubmit}
            loading={isLoading}
            variant="primary"
            style={styles.submitBtn}
            icon={<Ionicons name="rocket-outline" size={20} color={colors.white} />}
          />

          <Text style={styles.finalNote}>
            İlanınız yayınlandıktan sonra bölgenizdeki uzmanlar size teklif sunacaktır.
          </Text>
        </ScrollView>

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
              params: { redirectTo: '/jobs/create' }
            });
          }}
          onRegister={() => {
            setShowAuthModal(false);
            router.replace({
              pathname: '/(auth)/register',
              params: { redirectTo: '/jobs/create' }
            });
          }}
          title="Giriş Yapmanız Gerekiyor"
          message="İlan oluşturabilmek için bir hesabınızın olması gerekmektedir."
          icon="add-circle-outline"
        />

        {/* Success Modal - Premium Glass Glow Design */}
        <Modal visible={showSuccessModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <LinearGradient
              colors={['rgba(30, 41, 59, 0.98)', 'rgba(15, 23, 42, 0.95)']}
              style={styles.successModal}
            >
              <View style={styles.successIconWrapper}>
                <View style={styles.successIconGlow} />
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  style={styles.successIconBox}
                >
                  <Ionicons name="checkmark-done" size={36} color={staticColors.white} />
                </LinearGradient>
              </View>

              <Text style={[styles.successTitle, { color: staticColors.white }]}>İlan Yayında! 🎉</Text>
              <Text style={[styles.successMessage, { color: 'rgba(255,255,255,0.6)' }]}>
                İlanınız başarıyla oluşturuldu. Bölgenizdeki ustalar en kısa sürede tekliflerini gönderecek.
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
                  style={[styles.successPrimaryBtn, { shadowColor: colors.primary }]}
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
                    colors={[colors.primary, colors.primaryDark]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.successPrimaryBtnGradient}
                  >
                    <Ionicons name="eye-outline" size={18} color={staticColors.white} style={{ marginRight: 6 }} />
                    <Text style={styles.successPrimaryBtnText}>İlanı Görüntüle</Text>
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
      </KeyboardAvoidingView>
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
    padding: 12,
    paddingBottom: 40,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  infoIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: staticColors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  wizardMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    marginBottom: 16,
    gap: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  wizardMessageText: {
    fontSize: 12,
    color: staticColors.white,
    fontFamily: fonts.bold,
    flex: 1,
  },
  micButton: {
    position: 'absolute',
    right: 12,
    top: 38,
    padding: 4,
  },
  textAreaMicButton: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    padding: 4,
  },
  infoTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 17,
    color: staticColors.text,
    marginBottom: 2,
  },
  infoSubtitle: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: staticColors.textSecondary,
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
    marginBottom: 12,
    gap: 10,
  },
  sectionIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 15,
    color: staticColors.text,
  },
  inputContainer: {
    marginBottom: 10,
  },
  label: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: staticColors.textSecondary,
    marginBottom: 4,
    marginLeft: 4,
  },
  input: {
    backgroundColor: staticColors.white,
    borderRadius: 12,
    padding: 10,
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: staticColors.text,
    borderWidth: 1,
    borderColor: staticColors.borderLight,
  },
  inputError: {
    borderColor: staticColors.error,
  },
  textArea: {
    backgroundColor: staticColors.white,
    borderRadius: 12,
    padding: 10,
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: staticColors.text,
    borderWidth: 1,
    borderColor: staticColors.borderLight,
    height: 80,
  },
  textAreaSmall: {
    backgroundColor: staticColors.white,
    borderRadius: 12,
    padding: 10,
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: staticColors.text,
    borderWidth: 1,
    borderColor: staticColors.borderLight,
    height: 50,
  },
  errorText: {
    color: staticColors.error,
    fontSize: 11,
    marginTop: 2,
    marginLeft: 4,
    fontFamily: fonts.medium,
  },
  categoryScroll: {
    marginTop: 4,
  },
  categoryChip: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: staticColors.white,
    borderWidth: 1,
    borderColor: staticColors.borderLight,
    marginRight: 8,
    alignItems: 'center',
    width: 85,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  categoryChipSelected: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  categoryIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryIconCircleSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  categoryChipText: {
    fontFamily: fonts.semiBold,
    fontSize: 10,
    color: staticColors.textSecondary,
    textAlign: 'center',
  },
  categoryChipTextSelected: {
    color: staticColors.white,
    fontFamily: fonts.bold,
  },
  urgencyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 2,
  },
  urgencyButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: staticColors.borderLight,
    backgroundColor: staticColors.white,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  urgencyText: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    color: staticColors.textSecondary,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  imageButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  imageActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: staticColors.white,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 14,
    padding: 10,
    gap: 6,
  },
  imageActionText: {
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  imagePreviewScroll: {
    marginTop: 16,
  },
  imagePreviewWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  removeImgBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: staticColors.white,
    borderRadius: 10,
  },
  budgetInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: staticColors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: staticColors.borderLight,
    paddingHorizontal: 14,
  },
  budgetIcon: {
    marginRight: 10,
  },
  budgetInput: {
    flex: 1,
    paddingVertical: 14,
    fontFamily: fonts.bold,
    fontSize: 15,
    color: staticColors.text,
  },
  submitBtn: {
    marginTop: 10,
    height: 56,
    borderRadius: 18,
  },
  finalNote: {
    textAlign: 'center',
    fontFamily: fonts.medium,
    fontSize: 12,
    color: staticColors.textLight,
    marginTop: 16,
    lineHeight: 18,
  },
  expandableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  sectionHeaderNoMargin: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  expandableContent: {
    marginTop: 4,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: staticColors.borderLight,
    marginVertical: 4,
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
    backgroundColor: '#10B981',
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
