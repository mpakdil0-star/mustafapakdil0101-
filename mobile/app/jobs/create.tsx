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

// Kategoriye göre dinamik placeholder metinleri
const getPlaceholdersByCategory = (categoryId: string) => {
  switch (categoryId) {
    case 'elektrik':
      return {
        title: 'Örn: Mutfak tavan aydınlatma arızası',
        description: 'Sigorta sürekli atıyor, prizden koku geliyor, avize montajı yapılacak...'
      };
    case 'cilingir':
      return {
        title: 'Örn: Anahtar kapıda kırıldı / Kapıda kaldım',
        description: 'Çelik kapı kilitli kaldı, göbek değişimi istiyorum, oto kapısı açılacak...'
      };
    case 'tesisat':
      return {
        title: 'Örn: Banyo lavabosu su kaçırıyor',
        description: 'Mutfak gideri tıkandı, musluk damlatıyor, klozet sifonu çalışmıyor...'
      };
    case 'klima':
      return {
        title: 'Örn: Klima soğutmuyor / Bakım',
        description: 'Gaz dolumu yapılacak, iç üniteden su damlatıyor, montaj söküm yapılacak...'
      };
    case 'beyaz-esya':
      return {
        title: 'Örn: Buzdolabı soğutmuyor',
        description: 'Çamaşır makinesi sallanıyor, motor sesi geliyor, kapı contaları yıpranmış...'
      };
    default:
      return {
        title: 'Örn: İhtiyacınızı kısaca belirtin',
        description: 'İşin detaylarını, sorunun ne zaman başladığını ve beklentilerinizi yazın...'
      };
  }
};

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
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;
  const scrollViewRef = useRef<ScrollView>(null);
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
      const foundCat = JOB_CATEGORIES.find(cat => cat.name === catName);
      if (foundCat) {
        setServiceCategory(foundCat.parentCategory);
        setCategory(catName);
      } else if (JOB_CATEGORIES.some(cat => cat.name === catName)) {
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
      newErrors.description = 'Açıklama boş bırakılamaz';
    } else if (description.trim().length < 10) {
      newErrors.description = 'Açıklama en az 10 karakter olmalıdır';
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
      validationErrors.push('• Açıklama boş bırakılamaz');
    } else if (description.trim().length < 10) {
      validationErrors.push('• Açıklama en az 10 karakter olmalı');
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

    if (user.userType !== 'CITIZEN' && user.userType !== 'ADMIN') {
      showAlert('Yetki Hatası', 'Sadece vatandaşlar ilan oluşturabilir.', 'error');
      return;
    }

    try {
      const jobData = {
        title: title.trim(),
        description: description.trim(),
        serviceCategory, // Ana hizmet kategorisi (elektrik, cilingir, klima, etc.)
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

  const nextStep = () => {
    if (currentStep === 1) {
      if (!title.trim() || title.trim().length < 5) {
        setErrors({ ...errors, title: 'Başlık en az 5 karakter olmalıdır' });
        return;
      }
      if (!category) {
        setErrors({ ...errors, category: 'Kategori seçiniz' });
        return;
      }
    } else if (currentStep === 2) {
      if (!description.trim()) {
        setErrors({ ...errors, description: 'Açıklama boş bırakılamaz' });
        return;
      }
      if (description.trim().length < 10) {
        setErrors({ ...errors, description: 'Açıklama en az 10 karakter olmalıdır' });
        return;
      }
    }

    setErrors({});
    setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const renderStepIndicator = () => (
    <View style={[styles.stepperContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      {[1, 2, 3].map((step) => (
        <View key={step} style={styles.stepItem}>
          <View style={[
            styles.stepCircle,
            currentStep >= step
              ? { backgroundColor: colors.primary, borderWidth: 0 }
              : { backgroundColor: colors.borderLight, borderWidth: 1, borderColor: colors.border },
          ]}>
            {currentStep > step ? (
              <Ionicons name="checkmark" size={14} color={staticColors.white} />
            ) : (
              <Text style={[styles.stepNumber, currentStep >= step ? { color: staticColors.white } : { color: colors.textLight }]}>
                {step}
              </Text>
            )}
          </View>
          <Text
            style={[
              styles.stepLabel,
              currentStep === step
                ? { color: colors.text, fontFamily: fonts.semiBold }
                : currentStep > step
                  ? { color: colors.textSecondary, fontFamily: fonts.medium }
                  : { color: colors.textLight, fontFamily: fonts.medium },
            ]}
            numberOfLines={1}
          >
            {step === 1 ? 'Özet' : step === 2 ? 'Detay' : 'Konum'}
          </Text>
          {step < 3 && (
            <View
              style={[
                styles.stepLine,
                currentStep > step ? { backgroundColor: colors.primary + '55' } : { backgroundColor: colors.border },
              ]}
            />
          )}
        </View>
      ))}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundLight }]}>
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
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {renderStepIndicator()}

          {/* AI Wizard Notification */}
          {wizardDraft && (
            <View
              style={[
                styles.wizardMessage,
                {
                  backgroundColor: colors.surfaceElevated,
                  borderColor: colors.border,
                  shadowColor: colors.shadow,
                },
              ]}
            >
              <View style={[styles.wizardIconBg, { backgroundColor: colors.primary + '12' }]}>
                <Ionicons name="sparkles" size={15} color={colors.primary} />
              </View>
              <Text style={[styles.wizardMessageText, { color: colors.text }]}>
                {wizardDraft.category ? `Öneri: kategori "${wizardDraft.category}" olarak ayarlandı. ` : ''}
                {wizardDraft.urgency === 'HIGH' ? 'Aciliyet yüksek olarak işaretlendi.' : ''}
              </Text>
            </View>
          )}

          {currentStep === 1 && (
            <View>
              <Card variant="glass" style={[styles.sectionCard, { borderColor: colors.border }]}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIconWrapper, { backgroundColor: colors.primary + '12' }]}>
                    <Ionicons name="create-outline" size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sectionKicker, { color: colors.textLight }]}>Adım 1</Text>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Hizmet tanımı</Text>
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>İlan başlığı</Text>
                  <TextInput
                    style={[
                      styles.modernInput,
                      errors.title && { borderColor: staticColors.error, borderWidth: 1.5 },
                      {
                        backgroundColor: colors.surfaceElevated,
                        borderColor: errors.title ? staticColors.error : colors.border,
                        color: colors.text,
                      },
                    ]}
                    placeholder={getPlaceholdersByCategory(serviceCategory).title}
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

                <View style={styles.divider} />

                <View style={styles.inputContainer}>
                  <View style={styles.sectionHeaderNoMargin}>
                    <View style={[styles.sectionIconWrapper, { backgroundColor: colors.primary + '12' }]}>
                      <Ionicons name="list-outline" size={17} color={colors.primary} />
                    </View>
                    <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 15 }]}>Kategori</Text>
                  </View>

                  <Text style={[styles.label, { marginTop: 12, color: colors.textSecondary }]}>Hizmet grubu</Text>
                  <View style={styles.pillContainer}>
                    {SERVICE_CATEGORIES.map((svc) => {
                      const selected = serviceCategory === svc.id;
                      return (
                        <TouchableOpacity
                          key={svc.id}
                          style={[
                            styles.pill,
                            { borderColor: colors.border, backgroundColor: colors.surfaceElevated },
                            selected && {
                              backgroundColor: svc.colors[0] + '14',
                              borderColor: svc.colors[0],
                            },
                          ]}
                          onPress={() => {
                            setServiceCategory(svc.id);
                            setCategory('');
                            if (errors.category) setErrors({ ...errors, category: '' });
                          }}
                        >
                          <Ionicons
                            name={svc.icon as any}
                            size={14}
                            color={selected ? svc.colors[0] : colors.textSecondary}
                          />
                          <Text
                            style={[
                              styles.pillText,
                              { color: colors.textSecondary },
                              selected && { color: svc.colors[0], fontFamily: fonts.semiBold },
                            ]}
                          >
                            {svc.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {serviceCategory && (
                    <Picker
                      label="Alt branş"
                      value={category}
                      options={getSubCategoriesByParent(serviceCategory).map((cat) => cat.name)}
                      onValueChange={(val) => {
                        setCategory(val);
                        if (errors.category) setErrors({ ...errors, category: '' });
                      }}
                      placeholder="Alt branş seçiniz"
                      error={errors.category}
                      icon={<Ionicons name="construct-outline" size={20} color={colors.primary} />}
                    />
                  )}
                </View>

                <Button
                  title="Devam Et"
                  onPress={nextStep}
                  style={styles.nextBtn}
                  icon={<Ionicons name="arrow-forward" size={18} color={staticColors.white} />}
                />
              </Card>
            </View>
          )}

          {currentStep === 2 && (
            <View>
              <Card variant="glass" style={[styles.sectionCard, { borderColor: colors.border }]}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIconWrapper, { backgroundColor: colors.primary + '12' }]}>
                    <Ionicons name="reader-outline" size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sectionKicker, { color: colors.textLight }]}>Adım 2</Text>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Detay ve görseller</Text>
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Açıklama</Text>
                  <TextInput
                    style={[
                      styles.modernTextArea,
                      errors.description && { borderColor: staticColors.error, borderWidth: 1.5 },
                      {
                        backgroundColor: colors.surfaceElevated,
                        borderColor: errors.description ? staticColors.error : colors.border,
                        color: colors.text,
                      },
                    ]}
                    placeholder={getPlaceholdersByCategory(serviceCategory).description}
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
                  {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
                </View>

                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Fotoğraf (isteğe bağlı)</Text>
                  <View style={styles.imageButtons}>
                    <TouchableOpacity
                      style={[styles.modernImageBtn, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
                      onPress={handleTakePhoto}
                    >
                      <Ionicons name="camera-outline" size={22} color={colors.primary} />
                      <Text style={[styles.imageActionText, { color: colors.text }]}>Kamera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modernImageBtn, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
                      onPress={handlePickImage}
                    >
                      <Ionicons name="images-outline" size={22} color={colors.primary} />
                      <Text style={[styles.imageActionText, { color: colors.text }]}>Galeri</Text>
                    </TouchableOpacity>
                  </View>

                  {images.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagePreviewScroll}>
                      {images.map((img, index) => (
                        <View key={index} style={styles.imagePreviewWrapper}>
                          <Image source={{ uri: img }} style={styles.previewImage} />
                          <TouchableOpacity style={styles.removeImgBtn} onPress={() => handleRemoveImage(index)}>
                            <Ionicons name="close-circle" size={22} color={staticColors.error} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </ScrollView>
                  )}
                </View>

                <View style={styles.divider} />

                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Öncelik</Text>
                  <View style={styles.urgencyGrid}>
                    {URGENCY_LEVELS.map((level) => (
                      <TouchableOpacity
                        key={level.value}
                        style={[
                          styles.urgencyCard,
                          { borderColor: colors.border, backgroundColor: colors.surfaceElevated },
                          urgencyLevel === level.value && {
                            borderColor: level.color,
                            backgroundColor: level.color + '0D',
                          },
                        ]}
                        onPress={() => setUrgencyLevel(level.value as any)}
                      >
                        <Ionicons
                          name={level.icon as any}
                          size={22}
                          color={urgencyLevel === level.value ? level.color : colors.textLight}
                        />
                        <Text
                          style={[
                            styles.urgencyCardLabel,
                            { color: colors.textSecondary },
                            urgencyLevel === level.value && { color: level.color, fontFamily: fonts.semiBold },
                          ]}
                        >
                          {level.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.btnRow}>
                  <Button
                    title="Geri"
                    variant="outline"
                    onPress={prevStep}
                    style={styles.backBtn}
                    icon={<Ionicons name="arrow-back" size={18} color={colors.primary} />}
                  />
                  <Button
                    title="Devam Et"
                    onPress={nextStep}
                    style={styles.flexBtn}
                    icon={<Ionicons name="arrow-forward" size={18} color={staticColors.white} />}
                  />
                </View>
              </Card>
            </View>
          )}


          {currentStep === 3 && (
            <View>
              <Card variant="glass" style={[styles.sectionCard, { borderColor: colors.border }]}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIconWrapper, { backgroundColor: colors.primary + '12' }]}>
                    <Ionicons name="location-outline" size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sectionKicker, { color: colors.textLight }]}>Adım 3</Text>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Konum</Text>
                  </View>
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
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Açık adres / tarif</Text>
                  <TextInput
                    style={[
                      styles.modernTextArea,
                      { minHeight: 88, height: 88 },
                      errors.address && { borderColor: staticColors.error, borderWidth: 1.5 },
                      {
                        backgroundColor: colors.surfaceElevated,
                        borderColor: errors.address ? staticColors.error : colors.border,
                        color: colors.text,
                      },
                    ]}
                    placeholder="Sokak, bina no, kat ve varsa tarif..."
                    placeholderTextColor={colors.textLight}
                    value={address}
                    onChangeText={(text) => {
                      setAddress(text);
                      if (errors.address) setErrors({ ...errors, address: '' });
                    }}
                    multiline
                    textAlignVertical="top"
                  />
                  {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
                </View>

                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Tahmini bütçe (₺, isteğe bağlı)</Text>
                  <View style={[styles.modernBudgetWrapper, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                    <TextInput
                      style={[styles.modernBudgetInput, { color: colors.text }]}
                      placeholder="0"
                      placeholderTextColor={colors.textLight}
                      keyboardType="numeric"
                      value={estimatedBudget}
                      onChangeText={(text) => setEstimatedBudget(text.replace(/[^0-9.]/g, ''))}
                    />
                    <Text style={[styles.currencyText, { color: colors.textSecondary }]}>₺</Text>
                  </View>
                </View>

                <View style={styles.btnRow}>
                  <Button
                    title="Geri"
                    variant="outline"
                    onPress={prevStep}
                    style={styles.backBtn}
                    icon={<Ionicons name="arrow-back" size={18} color={colors.primary} />}
                  />
                  <Button
                    title={isLoading ? 'Gönderiliyor...' : 'İlanı Yayınla'}
                    onPress={handleSubmit}
                    loading={isLoading}
                    style={styles.flexBtn}
                    icon={<Ionicons name="checkmark-circle" size={18} color={staticColors.white} />}
                  />
                </View>
              </Card>
            </View>
          )}

          <Text style={[styles.finalNote, { color: colors.textLight }]}>
            İlan yayınlandığında bölgenizdeki ustalara bildirim gönderilir.
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

              <Text style={[styles.successTitle, { color: staticColors.white }]}>İlan yayında</Text>
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
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 10,
    paddingBottom: 30,
  },
  wizardMessage: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 14,
    gap: 12,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  wizardMessageText: {
    fontSize: 13,
    fontFamily: fonts.medium,
    flex: 1,
    lineHeight: 18,
  },
  sectionCard: {
    padding: 14,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: staticColors.white,
  },
  sectionKicker: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
    gap: 12,
  },
  sectionIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    letterSpacing: -0.2,
  },
  inputContainer: {
    marginBottom: 10,
  },
  label: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    marginBottom: 6,
    marginLeft: 2,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: staticColors.text,
    borderWidth: 0,
  },
  inputError: {
    borderColor: staticColors.error,
  },
  textArea: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: staticColors.text,
    borderWidth: 0,
    height: 72,
  },
  textAreaSmall: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: staticColors.text,
    borderWidth: 0,
    height: 48,
  },
  errorText: {
    color: staticColors.error,
    fontSize: 11,
    marginTop: 2,
    marginLeft: 4,
    fontFamily: fonts.medium,
  },
  pillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    marginBottom: 4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  pillText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: staticColors.textSecondary,
  },
  urgencyRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  urgencyPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    gap: 4,
  },
  urgencyPillText: {
    fontFamily: fonts.medium,
    fontSize: 12,
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
    backgroundColor: '#F5F6FA',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 14,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    padding: 10,
    gap: 6,
  },
  imageActionText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
  },
  imagePreviewScroll: {
    marginTop: 10,
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
    backgroundColor: '#F5F6FA',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    paddingHorizontal: 12,
  },
  budgetIcon: {
    marginRight: 8,
  },
  budgetInput: {
    flex: 1,
    paddingVertical: 11,
    paddingRight: 10,
    fontFamily: fonts.bold,
    fontSize: 14,
    color: staticColors.text,
  },
  submitBtn: {
    marginTop: 14,
    height: 52,
    borderRadius: 16,
    shadowColor: staticColors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  finalNote: {
    textAlign: 'center',
    fontFamily: fonts.medium,
    fontSize: 11,
    color: staticColors.textLight,
    marginTop: 10,
    lineHeight: 16,
  },
  sectionHeaderNoMargin: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginVertical: 16,
  },
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stepItem: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
  },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  stepNumber: {
    fontSize: 12,
    fontFamily: fonts.bold,
  },
  stepLabel: {
    fontSize: 11,
    marginLeft: 8,
    maxWidth: 56,
  },
  stepLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth * 2,
    minHeight: 2,
    marginHorizontal: 6,
    borderRadius: 1,
  },
  wizardIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modernInput: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.medium,
    fontSize: 15,
    borderWidth: 1,
  },
  modernTextArea: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.medium,
    fontSize: 15,
    borderWidth: 1,
    minHeight: 120,
  },
  modernImageBtn: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  urgencyGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  urgencyCard: {
    flex: 1,
    minHeight: 76,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  urgencyCardLabel: {
    fontSize: 12,
    fontFamily: fonts.medium,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  backBtn: {
    flex: 1,
  },
  flexBtn: {
    flex: 2,
  },
  nextBtn: {
    marginTop: 20,
  },
  modernBudgetWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  modernBudgetInput: {
    flex: 1,
    paddingVertical: 12,
    fontFamily: fonts.semiBold,
    fontSize: 17,
  },
  currencyText: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
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
