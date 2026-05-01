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
import { validateJobText } from '../../utils/validation';
import { SERVICE_CATEGORIES } from '../../constants/serviceCategories';

const MAX_IMAGES = 5;

const URGENCY_LEVELS = [
  { value: 'LOW', label: 'Düşük', icon: 'leaf-outline', color: '#10B981' },
  { value: 'MEDIUM', label: 'Orta', icon: 'time-outline', color: '#F59E0B' },
  { value: 'HIGH', label: 'Acil', icon: 'flash-outline', color: '#EF4444' },
];

// Kategoriye göre dinamik placeholder metinleri
const getPlaceholdersByCategory = (categoryId: string, subCategory?: string) => {
  // Elektrik
  if (subCategory === 'Elektrik Proje Çizimi') {
    return { title: 'Örn: 2 Katlı Müstakil Ev Elektrik Proje Çizimi', description: 'Yeni yapılacak 250m2 müstakil evimiz için belediye/ruhsat onaylı elektrik uygulama projesi çizilecek. Mimari plan DWG olarak mevcut.' };
  } else if (subCategory === 'Elektrik Tesisatı') {
    return { title: 'Örn: Salon ve mutfak yeni tesisat çekimi', description: 'Örn: Evin salon ve mutfağındaki eski kablolar değişecek, yeni priz hatları çekilecek...' };
  } else if (subCategory === 'Elektrik Tamiri') {
    return { title: 'Örn: Sigorta sürekli atıyor', description: 'Örn: Çamaşır makinesi çalışınca sigorta atıyor, mutfaktan yanık kokusu geldi...' };
  } else if (subCategory === 'Aydınlatma') {
    return { title: 'Örn: Avize montajı ve LED döşeme', description: 'Örn: Salona 2 adet avize takılacak, asma tavana şerit LED çekilecek...' };
  } else if (subCategory === 'Priz ve Anahtar') {
    return { title: 'Örn: Priz değişimi ve ilave', description: 'Örn: 3 adet priz yerinden çıktı, yatak odasına 2 adet yeni priz çekilmesi gerekiyor...' };
  } else if (subCategory === 'Elektrik Panosu') {
    return { title: 'Örn: Bina panosu yenileme', description: 'Örn: Apartman girişindeki panoda şalterler eski, kablolar düzensiz. Yenilenmesi gerekiyor...' };
  } else if (subCategory === 'Kablo Çekimi') {
    return { title: 'Örn: Anten/Ağ kablosu çekimi', description: 'Örn: Modemden arka odaya dışarıdan veya kanaldan ethernet kablosu çekilecek...' };
  } else if (subCategory === 'Uydu Sistemleri') {
    return { title: 'Örn: Merkezi sistem çanak ayarı', description: 'Örn: Çanak antende sinyal yok, lnb değişimi veya yön ayarı yapılması lazım...' };
  } else if (subCategory === 'Elektrik Kontrolü') {
    return { title: 'Örn: Genel tesisat kontrolü', description: 'Örn: Yeni taşındığım evin elektrik tesisatında kaçak var mı kontrol edilmesini istiyorum...' };
  }

  // Çilingir
  if (subCategory === 'Kapı Açma') {
    return { title: 'Örn: Kapıda kaldım, anahtar içeride', description: 'Örn: Çelik kapı çekili durumda kilitli değil, anahtar evin içinde unuttum...' };
  } else if (subCategory === 'Kilit Değişimi') {
    return { title: 'Örn: Çelik kapı kilit göbeği değişimi', description: 'Örn: Yeni eve taşındım, üst ve alt kilit göbeklerinin (barel) yenilenmesini istiyorum...' };
  } else if (subCategory === 'Anahtar Kopyalama') {
    return { title: 'Örn: Bina giriş göstergeç kopyalama', description: 'Örn: Apartman kapısı için 3 adet manyetik çip/göstergeç kopyalanmasını istiyorum...' };
  } else if (subCategory === 'Kasa Açma') {
    return { title: 'Örn: Çelik kasa şifresi unutuldu', description: 'Örn: Elektronik dijital kasanın pili bitti veya şifresini unuttum, zararsız açılması lazım...' };
  } else if (subCategory === 'Oto Çilingir') {
    return { title: 'Örn: Araç anahtarı bagajda kaldı', description: 'Örn: 2015 model aracımın bagajında anahtarı unuttum, kapılar otomatik kilitlendi...' };
  }

  // Klima
  if (subCategory === 'Klima Montaj') {
    return { title: 'Örn: 12000 BTU klima montajı', description: 'Örn: Yeni aldığım klimanın yatak odasına kurulumu yapılacak, dış motor balkon duvarına asılacak...' };
  } else if (subCategory === 'Klima Bakım') {
    return { title: 'Örn: Yıllık periyodik bakım', description: 'Örn: Klimanın filtreleri temizlenecek, genel performansı incelenecek ve koku giderici sıkılacak...' };
  } else if (subCategory === 'Klima Tamir') {
    return { title: 'Örn: Klima soğutmuyor', description: 'Örn: Klimayı açtığımda sadece fan çalışıyor, soğuk hava üflemiyor. Işıkları yanıp sönüyor...' };
  } else if (subCategory === 'Gaz Dolumu') {
    return { title: 'Örn: Klima gaz basımı', description: 'Örn: Cihaz soğutmuyor, servis daha önce gazın bittiğini söyledi. Yeniden gaz şarjı gerekiyor...' };
  } else if (subCategory === 'Klima Temizliği') {
    return { title: 'Örn: Detaylı iç ünite yıkama', description: 'Örn: Klimadan kötü koku geliyor, içinin ilaçlı suyla profesyonel şekilde yıkanmasını istiyorum...' };
  }

  // Beyaz Eşya
  if (subCategory === 'Çamaşır Makinesi') {
    return { title: 'Örn: Makine su boşaltmıyor', description: 'Örn: Program bitmesine rağmen içinde su kaldı, kapağı açılmıyor, altından su damlatıyor...' };
  } else if (subCategory === 'Bulaşık Makinesi') {
    return { title: 'Örn: Bulaşıklar kirli çıkıyor', description: 'Örn: Bardaklar çizik ve lekeli çıkıyor, deterjanı tam eritmeden programı bitiriyor...' };
  } else if (subCategory === 'Buzdolabı') {
    return { title: 'Örn: Alt kısım soğutmuyor', description: 'Örn: Buzluk donduruyor fakat alt bölmedeki yiyecekler bozulmaya başladı, motor sürekli çalışıyor...' };
  } else if (subCategory === 'Fırın/Ocak') {
    return { title: 'Örn: Fırın altı pişirmiyor', description: 'Örn: Ankastre fırının sadece üst rezistansı çalışıyor, keklerin altı hamur kalıyor...' };
  } else if (subCategory === 'Kurutma Makinesi') {
    return { title: 'Örn: Çamaşırlar nemli çıkıyor', description: 'Örn: 2 saatlik program bitmesine rağmen çamaşırlar tam kurumuyor, sıcaklık vermiyor...' };
  }

  // Tesisat
  if (subCategory === 'Tıkanıklık Açma') {
    return { title: 'Örn: Mutfak gideri tıkandı', description: 'Örn: Mutfak lavabosundan su gitmiyor, sular geri taşıyor. Makine ile açılması lazım...' };
  } else if (subCategory === 'Su Kaçağı') {
    return { title: 'Örn: Alt kata su damlıyor', description: 'Örn: Banyonun alt katındaki komşunun tavanında sararma ve damlama var, kaçağın cihazla bulunması lazım...' };
  } else if (subCategory === 'Musluk/Batarya') {
    return { title: 'Örn: Banyo bataryası değişimi', description: 'Örn: Lavabo çeşmesi dipten su kaçırıyor, yeni batarya aldım sadece montajı yapılacak...' };
  } else if (subCategory === 'Petek/Kombi') {
    return { title: 'Örn: Petek temizliği ve hava alma', description: 'Örn: Kombi çalışıyor ama peteklerin alt kısmı soğuk kalıyor. Makineli petek temizliği istiyorum...' };
  } else if (subCategory === 'Tuvalet/Lavabo') {
    return { title: 'Örn: Klozet iç takımı değişimi', description: 'Örn: Klozetin sifonu sürekli içeriye su akıtıyor, şamandıra bozuk, yenisi takılacak...' };
  }

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

const getCategoryImage = (id: string | undefined) => {
  if (!id) return null;
  switch (id) {
    case 'elektrik': return require('../../assets/images/categories/electric.png');
    case 'cilingir': return require('../../assets/images/categories/locksmith_3d_clean.png');
    case 'klima': return require('../../assets/images/categories/ac_3d_clean.png');
    case 'beyaz-esya': return require('../../assets/images/categories/appliances_3d_clean.png');
    case 'tesisat': return require('../../assets/images/categories/plumbing.png');
    default: return null;
  }
};

const BUILDING_TYPES = [
  { value: 'daire', label: 'Daire / Apartman' },
  { value: 'villa', label: 'Müstakil Ev / Villa' },
  { value: 'ticari', label: 'Ofis / İş Merkezi' },
  { value: 'sanayi', label: 'Fabrika / Sanayi Yapısı' },
  { value: 'diger', label: 'Diğer' },
];

const PROJECT_PURPOSES = [
  { value: 'yeni', label: 'Yeni Yapı Ruhsatı' },
  { value: 'tadilat', label: 'Tadilat / Revizyon' },
  { value: 'guc-artirimi', label: 'Güç Artırımı / Abone' },
];

const WEAK_CURRENT_SYSTEMS = [
  { id: 'data', label: 'İnternet / Data', icon: 'globe-outline' },
  { id: 'kamera', label: 'Güvenlik Kamerası', icon: 'videocam-outline' },
  { id: 'yangin', label: 'Yangın Alarmı', icon: 'flame-outline' },
  { id: 'tv', label: 'TV / Uydu Sistemi', icon: 'tv-outline' },
];

const MODERN_SYSTEMS = [
  { id: 'akilli-ev', label: 'Akıllı Ev Altyapısı', icon: 'home-outline' },
  { id: 'e-sarj', label: 'E-Şarj İstasyonu', icon: 'flash-outline' },
  { id: 'ges', label: 'Güneş Paneli (GES)', icon: 'sunny-outline' },
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
  const [currentStep, setCurrentStep] = useState(1);
  const isProjectCategory = category === 'Elektrik Proje Çizimi';
  const totalSteps = isProjectCategory ? 5 : 3;
  const scrollViewRef = useRef<ScrollView>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);

  // Elektrik Proje Çizimi Özel Alanları State'leri
  const [projectBuildingType, setProjectBuildingType] = useState('');
  const [projectOtherBuildingType, setProjectOtherBuildingType] = useState('');
  const [projectArea, setProjectArea] = useState('');
  const [projectInstalledPower, setProjectInstalledPower] = useState('');
  const [projectFloors, setProjectFloors] = useState('');
  const [projectRoomsPerFloor, setProjectRoomsPerFloor] = useState('');
  const [projectPurpose, setProjectPurpose] = useState('');
  const [projectHasArchitecturePlan, setProjectHasArchitecturePlan] = useState<boolean | null>(null);
  const [projectNeedsApproval, setProjectNeedsApproval] = useState<boolean | null>(null);
  const [projectSpecialSystems, setProjectSpecialSystems] = useState<string[]>([]);
  const [projectWeakCurrentSystems, setProjectWeakCurrentSystems] = useState<string[]>([]);
  const [projectModernSystems, setProjectModernSystems] = useState<string[]>([]);
  const [infoModal, setInfoModal] = useState<{ visible: boolean; title: string; desc: string }>({ visible: false, title: '', desc: '' });

  const showInfoTip = (title: string, desc: string) => {
    setInfoModal({ visible: true, title, desc });
  };

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
    
    // Handle category param 
    if (params.category && typeof params.category === 'string') {
      const catName = params.category;
      setCategory(catName);
      
      // If it's the premium project category, ensure serviceCategory is 'elektrik'
      if (catName === 'Elektrik Proje Çizimi') {
        setServiceCategory('elektrik');
      } else {
        const foundCat = JOB_CATEGORIES.find(cat => cat.name === catName);
        if (foundCat) {
          setServiceCategory(foundCat.parentCategory);
        }
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
        allowsEditing: false,
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
        allowsEditing: false,
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

    if (isProjectCategory) {
      if (!projectBuildingType) validationErrors.push('• Proje için Yapı Tipi seçilmedi (Adım 2)');
      if (!projectArea || projectArea.trim() === '') validationErrors.push('• Proje için Yapı Alanı (m²) girilmedi (Adım 2)');
      if (!projectPurpose) validationErrors.push('• Proje Amacı seçilmedi (Adım 3)');
      
      if (projectHasArchitecturePlan === true && images.length === 0) {
        validationErrors.push('• Mimari planınız olduğunu belirttiniz. Lütfen ilanınıza planın bir fotoğrafını ekleyiniz (Adım 4).');
      }
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
      let finalDescription = description.trim();

      if (isProjectCategory) {
        const selectedPurpose = PROJECT_PURPOSES.find(p => p.value === projectPurpose)?.label;
        let selectedType = BUILDING_TYPES.find(b => b.value === projectBuildingType)?.label;
        if (projectBuildingType === 'diger' && projectOtherBuildingType.trim()) {
          selectedType += ` (${projectOtherBuildingType.trim()})`;
        }
        const allSystems = [...projectSpecialSystems, ...projectWeakCurrentSystems, ...projectModernSystems];
        const systemLabels = allSystems.map(id => {
          const found = [...WEAK_CURRENT_SYSTEMS, ...MODERN_SYSTEMS, { id: 'asansör', label: 'Asansör' }, { id: 'sanayi', label: 'Sanayi Makineleri' }].find(s => s.id === id);
          return found ? found.label : id;
        }).join(', ');

        finalDescription = `📐 ELEKTRİK PROJE DETAYLARI\n` +
          `--------------------------------\n` +
          `• Yapı Tipi: ${selectedType || 'Belirtilmedi'}\n` +
          `• Toplam Alan: ${projectArea} m²\n` +
          `• Kurulu Güç: ${projectInstalledPower ? projectInstalledPower + ' kW' : 'Belirtilmedi'}\n` +
          `• Kat Sayısı: ${projectFloors || '1'}\n` +
          `• Oda/Bölüm Sayısı: ${projectRoomsPerFloor || '-'}\n` +
          `• Proje Amacı: ${selectedPurpose || 'Yeni Yapı'}\n` +
          `• Mimari Plan: ${projectHasArchitecturePlan ? 'Mevcut (DWG/PDF)' : 'Yok (Rölöve Gerekli)'}\n` +
          `• Resmi Onay: ${projectNeedsApproval ? 'Mühendis Takip Edecek' : 'Müşteri Takip Edecek'}\n` +
          `• Ek Sistemler: ${systemLabels || 'Standart'}\n` +
          `--------------------------------\n\n` +
          `📝 MÜŞTERİ NOTU:\n` +
          description.trim();
      }

      const jobData = {
        title: title.trim(),
        description: finalDescription,
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
      // Gibberish kontrolü - İlan Başlığı
      const titleGibberishError = validateJobText(title, 'İlan başlığı', 5);
      if (titleGibberishError) {
        showAlert('Uyarı', 'Lütfen işinizi daha detaylı ve anlamlı bir şekilde açıklayın.', 'warning');
        return;
      }
      if (!category) {
        setErrors({ ...errors, category: 'Kategori seçiniz' });
        return;
      }
    } else if (isProjectCategory) {
      // Elektrik Proje Çizimi Özel Adımları Doğrulaması
      if (currentStep === 2) {
        const step2Errors: any = {};
        if (!projectBuildingType) {
          step2Errors.projectBuildingType = 'Bina tipi seçiniz';
        }
        if (!projectArea || isNaN(parseFloat(projectArea))) {
          step2Errors.projectArea = 'Geçerli bir alan giriniz';
        }
        if (Object.keys(step2Errors).length > 0) {
          setErrors({ ...errors, ...step2Errors });
          showAlert('Eksik Bilgi', 'Lütfen zorunlu alanları doldurunuz.', 'warning');
          return;
        }
      } else if (currentStep === 3) {
        if (!projectPurpose) {
          setErrors({ ...errors, projectPurpose: 'Lütfen projenin amacını seçiniz' });
          showAlert('Eksik Bilgi', 'Lütfen projenin amacını seçiniz', 'warning');
          return;
        }
        if (projectHasArchitecturePlan === null) {
          setErrors({ ...errors, projectHasArchitecturePlan: 'Mimari plan durumunu belirtiniz' });
          showAlert('Eksik Bilgi', 'Mimari plan durumunu belirtiniz', 'warning');
          return;
        }
        if (projectNeedsApproval === null) {
          setErrors({ ...errors, projectNeedsApproval: 'Resmi onay takibi seçilmelidir' });
          showAlert('Eksik Bilgi', 'Resmi onay takibi seçilmelidir', 'warning');
          return;
        }
      } else if (currentStep === 4) {
        if (!description.trim() || description.trim().length < 10) {
          setErrors({ ...errors, description: 'Lütfen teknik detaylar için en az 10 karakter açıklama yazın' });
          return;
        }
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
      // Gibberish kontrolü - Açıklama
      const descGibberishError = validateJobText(description, 'Açıklama', 10);
      if (descGibberishError) {
        showAlert('Uyarı', 'Lütfen işinizi daha detaylı ve anlamlı bir şekilde açıklayın.', 'warning');
        return;
      }
    }

    setErrors({});
    setCurrentStep(prev => {
      const next = Math.min(prev + 1, totalSteps);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      return next;
    });
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const renderStepIndicator = () => {
    const steps = isProjectCategory ? [1, 2, 3, 4, 5] : [1, 2, 3];
    const getStepLabel = (step: number) => {
      if (isProjectCategory) {
        switch (step) {
          case 1: return 'Giriş';
          case 2: return 'Yapı';
          case 3: return 'Amaç';
          case 4: return 'Detay';
          case 5: return 'Konum';
          default: return '';
        }
      }
      return step === 1 ? 'Giriş' : step === 2 ? 'Detay' : 'Konum';
    };

    return (
      <View style={[styles.stepperContainer, { backgroundColor: colors.surface }]}>
        {steps.map((step) => {
          const isActive = currentStep === step;
          const isCompleted = currentStep > step;

          return (
            <View key={step} style={styles.stepItem}>
              <View style={styles.stepIconContainer}>
                <View style={[
                  styles.stepCircle,
                  isActive ? { backgroundColor: colors.primary, transform: [{ scale: 1.1 }] } :
                    isCompleted ? { backgroundColor: '#10B981' } :
                      { backgroundColor: colors.surfaceElevated, borderWidth: 1.5, borderColor: colors.border }
                ]}>
                  {isCompleted ? (
                    <Ionicons name="checkmark-sharp" size={12} color="#FFF" />
                  ) : (
                    <Text style={[
                      styles.stepNumber,
                      { fontSize: 10 },
                      isActive ? { color: '#FFF' } : { color: colors.textSecondary }
                    ]}>
                      {step}
                    </Text>
                  )}
                </View>
                {/* Metin etiketini sadece aktif adımda veya büyük ekranlarda gösterelim ki sığsın */}
                {(isActive || !isProjectCategory) && (
                  <Text style={[
                    styles.stepLabelText,
                    { fontSize: 9 },
                    isActive ? { color: colors.text, fontFamily: fonts.bold } : { color: colors.textLight }
                  ]}>
                    {getStepLabel(step)}
                  </Text>
                )}
              </View>
              {step < steps.length && (
                <View style={[
                  styles.stepLine,
                  { backgroundColor: isCompleted ? '#10B981' : colors.border }
                ]} />
              )}
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundLight }]}>
      <PremiumHeader
        title="Hemen Hizmet Al"
        showBackButton={currentStep === 1}
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

          {/* AI Wizard Notification - Premium Enhanced */}
          {wizardDraft && (
            <View style={[styles.wizardWrapper, { shadowColor: colors.primary }]}>
              <LinearGradient
                colors={[colors.primary + '18', colors.primary + '0A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.wizardMessage, { borderColor: colors.primary + '25' }]}
              >
                <View style={[styles.wizardIconBg, { backgroundColor: colors.primary }]}>
                  <Ionicons name="sparkles" size={16} color="#FFF" />
                </View>
                <View style={styles.wizardTextContainer}>
                  <Text style={[styles.wizardLabelText, { color: colors.primary }]}>AI AKILLI YARDIMCI</Text>
                  <Text style={[styles.wizardMessageText, { color: colors.text }]}>
                    {wizardDraft.category ? `İlanınızı analiz ettim ve kategoriye "${wizardDraft.category}" olarak atadım. ` : ''}
                    {wizardDraft.urgency === 'HIGH' ? 'Durumu oldukça acil olarak belirledim.' : ''}
                  </Text>
                </View>
              </LinearGradient>
            </View>
          )}

          {/* ADIM 1: TEMEL BİLGİLER (ORTAK) */}
          {currentStep === 1 && (
            <View>
              <Card variant="glass" style={[styles.sectionCard, { borderColor: colors.border, paddingVertical: 10, paddingHorizontal: 10 }]}>
                <View style={[styles.sectionHeader, { marginBottom: 6 }]}>
                  <View style={[styles.sectionIconWrapper, { backgroundColor: colors.primary + '12', width: 28, height: 28 }]}>
                    <Ionicons name="create-outline" size={16} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sectionKicker, { color: colors.textLight, fontSize: 8 }]}>Adım 1</Text>
                    <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 16 }]}>Hizmet Tanımı</Text>
                  </View>
                </View>

                <View style={[styles.inputContainer, { marginBottom: 10 }]}>
                  <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 4 }]}>İlan Başlığı</Text>
                  <TextInput
                    style={[
                      styles.modernInput,
                      { height: 44, paddingVertical: 8 },
                      errors.title && { borderColor: staticColors.error, borderWidth: 1.5 },
                      {
                        backgroundColor: colors.surfaceElevated,
                        borderColor: errors.title ? staticColors.error : colors.border,
                        color: colors.text,
                      },
                    ]}
                    placeholder={getPlaceholdersByCategory(serviceCategory, category).title}
                    value={title}
                    onChangeText={(text) => {
                      setTitle(text);
                      if (errors.title) setErrors({ ...errors, title: '' });
                    }}
                    placeholderTextColor={colors.textSecondary}
                    autoCorrect={false}
                    spellCheck={false}
                    autoCapitalize="sentences"
                  />
                  {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
                </View>

                <View style={[styles.divider, { marginVertical: 8 }]} />

                <View style={[styles.inputContainer, { marginBottom: 8 }]}>
                  <View style={[styles.sectionHeaderNoMargin, { marginBottom: 4 }]}>
                    <View style={[styles.sectionIconWrapper, { backgroundColor: colors.primary + '12', width: 26, height: 26 }]}>
                      <Ionicons name="list-outline" size={14} color={colors.primary} />
                    </View>
                    <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 14 }]}>Kategori</Text>
                  </View>

                  <Text style={[styles.label, { marginTop: 8, marginBottom: 4, color: colors.textSecondary }]}>Hizmet grubu</Text>
                  <View style={[styles.pillContainer, { rowGap: 8 }]}>
                    {SERVICE_CATEGORIES.map((svc) => {
                      const selected = serviceCategory === svc.id;
                      return (
                        <TouchableOpacity
                          key={svc.id}
                          style={[
                            styles.pill,
                            { paddingVertical: 8, borderColor: colors.border, backgroundColor: colors.surfaceElevated },
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
                          {getCategoryImage(svc.id) ? (
                            <Image
                              source={getCategoryImage(svc.id)}
                              style={styles.pillImage}
                              resizeMode="contain"
                            />
                          ) : (
                            <Ionicons
                              name={svc.icon as any}
                              size={16}
                              color={selected ? svc.colors[0] : colors.textSecondary}
                            />
                          )}
                          <Text
                            style={[
                              styles.pillText,
                              { fontSize: 13, color: colors.textSecondary },
                              selected && { color: svc.colors[0], fontFamily: fonts.bold },
                            ]}
                          >
                            {svc.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {serviceCategory && (
                    <View style={{ marginTop: 8 }}>
                      <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 4 }]}>Alt branş</Text>
                      <Picker
                        placeholder="Alt branş seçiniz"
                        value={category}
                        options={getSubCategoriesByParent(serviceCategory).map((cat) => cat.name)}
                        onValueChange={(val) => {
                          setCategory(val);
                          if (errors.category) setErrors({ ...errors, category: '' });
                        }}
                        error={errors.category}
                        icon={
                          <Ionicons
                            name={SERVICE_CATEGORIES.find((s) => s.id === serviceCategory)?.icon as any || "list-outline"}
                            size={18}
                            color={colors.primary}
                          />
                        }
                      />
                    </View>
                  )}
                </View>

                <Button
                  title="Devam Et"
                  onPress={nextStep}
                  style={[styles.nextBtn, { height: 44, marginTop: 10 }]}
                  icon={<Ionicons name="arrow-forward" size={18} color={staticColors.white} />}
                />
              </Card>
            </View>
          )}

          {/* ADIM 2: PROJE YAPI BİLGİLERİ (SADECE PROJE) */}
          {isProjectCategory && currentStep === 2 && (
            <View>
              <Card variant="glass" style={[styles.sectionCard, { borderColor: colors.border }]}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIconWrapper, { backgroundColor: colors.primary + '12' }]}>
                    <Ionicons name="business-outline" size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sectionKicker, { color: colors.textLight, fontSize: 8 }]}>Adım 2</Text>
                    <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 18 }]}>Yapı Bilgileri</Text>
                  </View>
                </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Yapı Tipi *</Text>
              <View style={[styles.pillContainer, errors.projectBuildingType ? { padding: 4, borderRadius: 12, borderWidth: 1, borderColor: '#EF4444' } : {}]}>
                {BUILDING_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.pill,
                      { borderColor: colors.border, backgroundColor: colors.surfaceElevated, width: '48%' },
                      projectBuildingType === type.value && { borderColor: colors.primary, backgroundColor: colors.primary + '0A' }
                    ]}
                    onPress={() => {
                      setProjectBuildingType(type.value);
                      setErrors(prev => ({ ...prev, projectBuildingType: '' }));
                    }}
                  >
                    <Text style={[styles.pillText, { color: projectBuildingType === type.value ? colors.primary : colors.textSecondary }]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {errors.projectBuildingType && <Text style={styles.errorText}>{errors.projectBuildingType}</Text>}
              {projectBuildingType === 'diger' && (
                <TextInput
                  style={[styles.input, { marginTop: 10 }]}
                  placeholder="Lütfen yapı tipini açıklayınız"
                  value={projectOtherBuildingType}
                  onChangeText={setProjectOtherBuildingType}
                />
              )}
            </View>

            <View style={styles.buildingInfoGrid}>
              <View style={[styles.buildingInfoCard, { borderColor: errors.projectArea ? '#EF4444' : colors.border, backgroundColor: colors.surfaceElevated }]}>
                <View style={[styles.buildingInfoIconWrap, { backgroundColor: colors.primary + '12' }]}>
                  <Ionicons name="resize-outline" size={18} color={colors.primary} />
                </View>
                <Text style={[styles.buildingInfoLabel, { color: colors.textSecondary }]}>Toplam Alan (m²) *</Text>
                <TextInput
                  style={[styles.buildingInfoInput, { color: colors.text, borderColor: errors.projectArea ? '#EF4444' : colors.border }]}
                  placeholder="Örn: 250"
                  placeholderTextColor={colors.textLight}
                  value={projectArea}
                  onChangeText={(val) => { setProjectArea(val); setErrors(prev => ({ ...prev, projectArea: '' })); }}
                  keyboardType="numeric"
                />
                {errors.projectArea && <Text style={styles.errorText}>{errors.projectArea}</Text>}
              </View>

              <View style={[styles.buildingInfoCard, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}>
                <View style={[styles.buildingInfoIconWrap, { backgroundColor: '#3B82F6' + '12' }]}>
                  <Ionicons name="layers-outline" size={18} color="#3B82F6" />
                </View>
                <Text style={[styles.buildingInfoLabel, { color: colors.textSecondary }]}>Kat Sayısı</Text>
                <TextInput
                  style={[styles.buildingInfoInput, { color: colors.text, borderColor: colors.border }]}
                  placeholder="Örn: 2"
                  placeholderTextColor={colors.textLight}
                  value={projectFloors}
                  onChangeText={setProjectFloors}
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.buildingInfoCard, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}>
                <View style={[styles.buildingInfoIconWrap, { backgroundColor: '#F59E0B' + '12' }]}>
                  <Ionicons name="flash-outline" size={18} color="#F59E0B" />
                </View>
                <Text style={[styles.buildingInfoLabel, { color: colors.textSecondary }]}>Kurulu Güç (kW)</Text>
                <TextInput
                  style={[styles.buildingInfoInput, { color: colors.text, borderColor: colors.border }]}
                  placeholder="Örn: 15"
                  placeholderTextColor={colors.textLight}
                  value={projectInstalledPower}
                  onChangeText={setProjectInstalledPower}
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.buildingInfoCard, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}>
                <View style={[styles.buildingInfoIconWrap, { backgroundColor: '#10B981' + '12' }]}>
                  <Ionicons name="grid-outline" size={18} color="#10B981" />
                </View>
                <Text style={[styles.buildingInfoLabel, { color: colors.textSecondary }]}>Oda / Bölüm</Text>
                <TextInput
                  style={[styles.buildingInfoInput, { color: colors.text, borderColor: colors.border }]}
                  placeholder="Örn: 5"
                  placeholderTextColor={colors.textLight}
                  value={projectRoomsPerFloor}
                  onChangeText={setProjectRoomsPerFloor}
                  keyboardType="numeric"
                />
              </View>
            </View>

                
                <View style={[styles.btnRow, { marginTop: 24 }]}>
                  <View style={styles.backBtnWrapper}>
                    <Button title="Geri" variant="outline" onPress={prevStep} fullWidth style={{ borderColor: colors.border }} />
                  </View>
                  <View style={styles.flexBtnWrapper}>
                    <Button title="Devam Et" onPress={nextStep} fullWidth icon={<Ionicons name="arrow-forward" size={18} color="#FFF" />} />
                  </View>
                </View>
              </Card>
            </View>
          )}

          {/* ADIM 3: PROJE AMACI VE SİSTEMLER (SADECE PROJE) */}
          {isProjectCategory && currentStep === 3 && (
            <View>
              <Card variant="glass" style={[styles.sectionCard, { borderColor: colors.border, padding: 12, paddingBottom: 12 }]}>
                <View style={[styles.sectionHeader, { marginBottom: 6 }]}>
                  <View style={[styles.sectionIconWrapper, { backgroundColor: colors.primary + '12', width: 28, height: 28 }]}>
                    <Ionicons name="options-outline" size={16} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sectionKicker, { color: colors.textLight, fontSize: 8 }]}>Adım 3</Text>
                    <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 16 }]}>Proje Amacı ve Teknik</Text>
                  </View>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Hangi amaçla çiziliyor? *</Text>
                  <View style={[styles.pillContainer, { marginBottom: 0 }]}>
                    {PROJECT_PURPOSES.map((p) => (
                      <TouchableOpacity
                        key={p.value}
                        style={[
                          styles.pill,
                          { borderColor: colors.border, backgroundColor: colors.surfaceElevated, width: '100%', paddingVertical: 6, marginBottom: 4 },
                          projectPurpose === p.value && { borderColor: colors.primary, backgroundColor: colors.primary + '0A' }
                        ]}
                        onPress={() => { setProjectPurpose(p.value); setErrors(prev => ({ ...prev, projectPurpose: '' })); }}
                      >
                        <Text style={[styles.pillText, { color: projectPurpose === p.value ? colors.primary : colors.textSecondary }]}>
                          {p.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {errors.projectPurpose && <Text style={styles.errorText}>{errors.projectPurpose}</Text>}
                </View>

                <View style={{ height: 1, backgroundColor: colors.border + '15', marginVertical: 6 }} />

                <View style={styles.inputContainer}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 0 }]}>Mimari planınız var mı? *</Text>
                    <TouchableOpacity onPress={() => showInfoTip('Mimari Plan Nedir?', 'Proje çiziminin temelidir. Eğer DWG veya PDF formatında planınız yoksa, mühendisin yerinde rölöve (ölçüm) alması gerekir.')} style={{ marginLeft: 6 }}>
                        <Ionicons name="help-circle-outline" size={16} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.urgencyGrid, { gap: 6, marginTop: 2 }, errors.projectHasArchitecturePlan ? { padding: 4, borderRadius: 12, borderWidth: 1, borderColor: '#EF4444' } : {}]}>
                    <TouchableOpacity
                      style={[styles.urgencyCard, { borderStyle: 'solid', flex: 1, height: 40, borderColor: projectHasArchitecturePlan === true ? colors.primary : colors.border }]}
                      onPress={() => { setProjectHasArchitecturePlan(true); setErrors(prev => ({ ...prev, projectHasArchitecturePlan: '' })); }}
                    >
                      <Ionicons name="document-attach-outline" size={16} color={projectHasArchitecturePlan === true ? colors.primary : colors.textLight} />
                      <Text style={[styles.urgencyCardLabel, projectHasArchitecturePlan === true && { color: colors.primary }]}>Evet, Var</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.urgencyCard, { borderStyle: 'solid', flex: 1, height: 40, borderColor: projectHasArchitecturePlan === false ? colors.primary : colors.border }]}
                      onPress={() => { setProjectHasArchitecturePlan(false); setErrors(prev => ({ ...prev, projectHasArchitecturePlan: '' })); }}
                    >
                      <Ionicons name="pencil-outline" size={16} color={projectHasArchitecturePlan === false ? colors.primary : colors.textLight} />
                      <Text style={[styles.urgencyCardLabel, projectHasArchitecturePlan === false && { color: colors.primary }]}>Yok (Rölöve)</Text>
                    </TouchableOpacity>
                  </View>
                  {errors.projectHasArchitecturePlan && <Text style={styles.errorText}>{errors.projectHasArchitecturePlan}</Text>}
                </View>

                <View style={{ height: 1, backgroundColor: colors.border + '15', marginVertical: 6 }} />

                <View style={styles.inputContainer}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 0 }]}>Resmi onay takibi kimde? *</Text>
                    <TouchableOpacity onPress={() => showInfoTip('Resmi Onay Nedir?', 'Projenin TEDAŞ veya ilgili elektrik dağıtım şirketi tarafından onaylanması sürecidir. Bu süreci mühendisin takip etmesi işleri hızlandırır.')} style={{ marginLeft: 6 }}>
                        <Ionicons name="help-circle-outline" size={16} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                  <View style={[styles.urgencyGrid, { marginTop: 4 }, errors.projectNeedsApproval ? { padding: 4, borderRadius: 12, borderWidth: 1, borderColor: '#EF4444' } : {}]}>
                    <TouchableOpacity
                      style={[styles.urgencyCard, { borderStyle: 'solid', flex: 1, height: 40, borderColor: projectNeedsApproval === true ? colors.primary : colors.border }]}
                      onPress={() => { setProjectNeedsApproval(true); setErrors(prev => ({ ...prev, projectNeedsApproval: '' })); }}
                    >
                      <Text style={[styles.urgencyCardLabel, { textAlign: 'center' }, projectNeedsApproval === true && { color: colors.primary }]}>Mühendis (Dahil)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.urgencyCard, { borderStyle: 'solid', flex: 1, height: 40, borderColor: projectNeedsApproval === false ? colors.primary : colors.border }]}
                      onPress={() => { setProjectNeedsApproval(false); setErrors(prev => ({ ...prev, projectNeedsApproval: '' })); }}
                    >
                      <Text style={[styles.urgencyCardLabel, { textAlign: 'center' }, projectNeedsApproval === false && { color: colors.primary }]}>Müşteri (Sadece Çizim)</Text>
                    </TouchableOpacity>
                  </View>
                  {errors.projectNeedsApproval && <Text style={styles.errorText}>{errors.projectNeedsApproval}</Text>}
                </View>

                <View style={[styles.btnRow, { marginTop: 16 }]}>
                  <View style={styles.backBtnWrapper}>
                    <Button title="Geri" variant="outline" onPress={prevStep} fullWidth style={{ borderColor: colors.border }} />
                  </View>
                  <View style={styles.flexBtnWrapper}>
                    <Button title="Devam Et" onPress={nextStep} fullWidth icon={<Ionicons name="arrow-forward" size={18} color="#FFF" />} />
                  </View>
                </View>
              </Card>
            </View>
          )}

          {/* ADIM 4: DETAY VE GÖRSELLER (ORTAK AMA FARKLI STEP NO) */}
          {(isProjectCategory ? currentStep === 4 : currentStep === 2) && (
            <View>
              <Card variant="glass" style={[styles.sectionCard, { borderColor: colors.border }]}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIconWrapper, { backgroundColor: colors.primary + '12' }]}>
                    <Ionicons name="reader-outline" size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sectionKicker, { color: colors.textLight, fontSize: 8 }]}>Adım {isProjectCategory ? '4' : '2'}</Text>
                    <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 18 }]}>Detay ve görseller</Text>
                  </View>
                </View>
 
                {isProjectCategory && projectHasArchitecturePlan === true && (
                  <View style={{ 
                    marginBottom: 16, 
                    backgroundColor: (images.length > 0) ? '#10B98115' : colors.primary + '10', 
                    padding: 12, 
                    borderRadius: 12, 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    borderColor: (images.length > 0) ? '#10B98130' : colors.primary + '30', 
                    borderWidth: 1 
                  }}>
                    <Ionicons 
                      name={(images.length > 0) ? "checkmark-circle-outline" : "information-circle"} 
                      size={20} 
                      color={(images.length > 0) ? "#10B981" : colors.primary} 
                      style={{ marginRight: 10 }} 
                    />
                    <Text style={{ 
                      fontFamily: fonts.medium, 
                      fontSize: 12, 
                      color: (images.length > 0) ? "#059669" : colors.primary, 
                      flex: 1, 
                      lineHeight: 18 
                    }}>
                      {(images.length > 0) 
                        ? "Plan fotoğrafı/dosyası başarıyla eklendi." 
                        : "Mimari planınızın olduğunu belirttiniz. Ustaların doğru fiyat verebilmesi için lütfen en alttaki bölümden planın fotoğrafını veya ekran görüntüsünü ekleyin."}
                    </Text>
                  </View>
                )}

                {isProjectCategory && (
                  <View style={{ marginBottom: 20 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 0 }]}>Donanım / Ek Sistemler</Text>
                        <TouchableOpacity onPress={() => showInfoTip('Ek Sistemler Nedir?', 'İnternet, Güvenlik, Yangın Alarmı gibi altyapıların projeleridir. Modern binalar için yasal zorunluluk veya konfor standartıdır.')} style={{ marginLeft: 6 }}>
                            <Ionicons name="help-circle-outline" size={16} color={colors.primary} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.pillContainer}>
                      {[...WEAK_CURRENT_SYSTEMS, ...MODERN_SYSTEMS].map((sys) => {
                        const isSelected = [...projectWeakCurrentSystems, ...projectModernSystems].includes(sys.id);
                        return (
                          <TouchableOpacity
                            key={sys.id}
                            style={[
                              styles.pill,
                              { borderColor: colors.border, backgroundColor: colors.surfaceElevated },
                              isSelected && { borderColor: colors.primary, backgroundColor: colors.primary + '0A' }
                            ]}
                            onPress={() => {
                              if (isSelected) {
                                setProjectWeakCurrentSystems(projectWeakCurrentSystems.filter(i => i !== sys.id));
                                setProjectModernSystems(projectModernSystems.filter(i => i !== sys.id));
                              } else {
                                if (WEAK_CURRENT_SYSTEMS.some(i => i.id === sys.id)) setProjectWeakCurrentSystems([...projectWeakCurrentSystems, sys.id]);
                                else setProjectModernSystems([...projectModernSystems, sys.id]);
                              }
                            }}
                          >
                            <Ionicons name={sys.icon as any} size={14} color={isSelected ? colors.primary : colors.textLight} />
                            <Text style={[styles.pillText, { fontSize: 11, color: isSelected ? colors.primary : colors.textSecondary }]}>
                              {sys.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

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
                    placeholder={getPlaceholdersByCategory(serviceCategory, category).description}
                    value={description}
                    onChangeText={(text) => {
                      setDescription(text);
                      if (errors.description) setErrors({ ...errors, description: '' });
                    }}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    placeholderTextColor={colors.textSecondary}
                    autoCorrect={false}
                    spellCheck={false}
                    autoCapitalize="sentences"
                  />
                  {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
                </View>

                <View style={styles.inputContainer}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Fotoğraf / Plan Dosyası</Text>
                  <View style={styles.imageButtons}>
                    <TouchableOpacity
                      style={[styles.modernImageBtn, { borderColor: colors.border, backgroundColor: colors.primary + '08' }]}
                      onPress={handleTakePhoto}
                    >
                      <Ionicons name="camera-outline" size={22} color={colors.primary} />
                      <Text style={[styles.imageActionText, { color: colors.text }]}>Kamera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modernImageBtn, { borderColor: colors.border, backgroundColor: colors.primary + '08' }]}
                      onPress={handlePickImage}
                    >
                      <Ionicons name="images-outline" size={22} color={colors.primary} />
                      <Text style={[styles.imageActionText, { color: colors.text }]}>Dosya Seç</Text>
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
                  <View style={styles.sectionHeaderNoMargin}>
                    <View style={[styles.sectionIconWrapper, { backgroundColor: colors.primary + '12' }]}>
                      <Ionicons name="flash-outline" size={17} color={colors.primary} />
                    </View>
                    <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 16 }]}>Öncelik</Text>
                  </View>
                  <View style={styles.urgencyGrid}>
                    {URGENCY_LEVELS.map((level) => (
                      <TouchableOpacity
                        key={level.value}
                        style={[
                          styles.urgencyCard,
                          { borderColor: colors.border, backgroundColor: colors.surfaceElevated },
                          urgencyLevel === level.value && {
                            borderColor: level.color,
                            backgroundColor: level.color + '1A',
                          },
                        ]}
                        onPress={() => setUrgencyLevel(level.value as any)}
                      >
                        <Ionicons
                          name={level.icon as any}
                          size={20}
                          color={urgencyLevel === level.value ? level.color : colors.textLight}
                        />
                        <Text
                          style={[
                            styles.urgencyCardLabel,
                            { color: colors.textSecondary },
                            urgencyLevel === level.value && { color: level.color, fontFamily: fonts.bold },
                          ]}
                        >
                          {level.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={[styles.btnRow, { marginTop: 16 }]}>
                  <View style={styles.backBtnWrapper}>
                    <Button title="Geri" variant="outline" onPress={prevStep} fullWidth style={{ borderColor: colors.border }} />
                  </View>
                  <View style={styles.flexBtnWrapper}>
                    <Button title="Devam Et" onPress={nextStep} fullWidth style={{ height: 46 }} icon={<Ionicons name="arrow-forward" size={18} color="#FFF" />} />
                  </View>
                </View>
              </Card>
            </View>
          )}

          {/* ADIM 5 (PROJE) VEYA 3 (NORMAL): KONUM VE BÜTÇE */}
          {(isProjectCategory ? currentStep === 5 : currentStep === 3) && (
            <View>
              <Card variant="glass" style={[styles.sectionCard, { borderColor: colors.border, paddingVertical: 8, paddingHorizontal: 10 }]}>
                <View style={[styles.sectionHeader, { marginBottom: 4 }]}>
                  <View style={[styles.sectionIconWrapper, { backgroundColor: colors.primary + '12', width: 26, height: 26 }]}>
                    <Ionicons name="location-outline" size={14} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sectionKicker, { color: colors.textLight, fontSize: 8 }]}>Adım {isProjectCategory ? '5' : '3'}</Text>
                    <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 16 }]}>Konum</Text>
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

                <View style={[styles.row, { marginTop: 4, marginBottom: 0 }]}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 4 }]}>Şehir</Text>
                    <Picker
                      value={city}
                      options={CITY_NAMES}
                      onValueChange={setCity}
                      error={errors.city}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 4 }]}>İlçe</Text>
                    <Picker
                      value={district}
                      options={districtOptions}
                      onValueChange={setDistrict}
                      error={errors.district}
                      disabled={!city}
                    />
                  </View>
                </View>

                <View style={{ marginTop: 2 }}>
                  <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 4 }]}>Mahalle</Text>
                  <Picker
                    value={neighborhood}
                    options={neighborhoodOptions.length > 0 ? neighborhoodOptions : (district ? ['Merkez'] : [])}
                    onValueChange={setNeighborhood}
                    error={errors.neighborhood}
                    disabled={!district}
                  />
                </View>

                <View style={[styles.inputContainer, { marginTop: 4, marginBottom: 4 }]}>
                  <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 4 }]}>Açık adres / tarif</Text>
                  <TextInput
                    style={[
                      styles.modernTextArea,
                      { minHeight: 48, height: 48, paddingVertical: 4 },
                      errors.address && { borderColor: staticColors.error, borderWidth: 1.5 },
                      {
                        backgroundColor: colors.surfaceElevated,
                        borderColor: errors.address ? staticColors.error : colors.border,
                        color: colors.text,
                      },
                    ]}
                    placeholder="Sokak, bina no, kat ve varsa tarif..."
                    placeholderTextColor={colors.textSecondary}
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

                <View style={[styles.inputContainer, { marginBottom: 0 }]}>
                  <View style={[styles.sectionHeaderNoMargin, { gap: 6 }]}>
                    <View style={[styles.sectionIconWrapper, { backgroundColor: colors.primary + '12', width: 24, height: 24 }]}>
                      <Ionicons name="wallet-outline" size={14} color={colors.primary} />
                    </View>
                    <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 13 }]}>Tahmini bütçe (isteğe bağlı)</Text>
                  </View>
                  <View style={[styles.modernBudgetWrapper, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, marginTop: 4, paddingVertical: 0, height: 40 }]}>
                    <TextInput
                      style={[styles.modernBudgetInput, { color: colors.text, paddingVertical: 0, fontSize: 16, height: 40 }]}
                      placeholder="Örn: 500"
                      placeholderTextColor={colors.textLight}
                      keyboardType="numeric"
                      value={estimatedBudget}
                      onChangeText={(text) => setEstimatedBudget(text.replace(/[^0-9.]/g, ''))}
                    />
                    <Text style={[styles.currencyText, { color: colors.primary, fontSize: 14 }]}>₺</Text>
                  </View>
                </View>

                <View style={[styles.btnRow, { marginTop: 10 }]}>
                  <View style={styles.backBtnWrapper}>
                    <Button
                      title="Geri"
                      variant="outline"
                      onPress={prevStep}
                      fullWidth
                      style={{ height: 42, borderColor: colors.border }}
                    />
                  </View>
                  <View style={styles.flexBtnWrapper}>
                    <Button
                      title={isLoading ? 'Gönderiliyor...' : 'İlanı Yayınla'}
                      onPress={handleSubmit}
                      loading={isLoading}
                      variant="success"
                      fullWidth
                      style={{ height: 42 }}
                      icon={<Ionicons name="checkmark-circle" size={16} color={staticColors.white} />}
                    />
                  </View>
                </View>
              </Card>
            </View>
          )}

          <Text style={[styles.finalNote, { color: colors.text }]}>
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

        <Modal visible={infoModal.visible} transparent animationType="fade">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
            <View style={{ width: '100%', backgroundColor: staticColors.white, borderRadius: 24, padding: 24, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <View style={{ backgroundColor: colors.primary + '15', padding: 8, borderRadius: 12, marginRight: 12 }}>
                  <Ionicons name="information-circle" size={24} color={colors.primary} />
                </View>
                <Text style={{ fontFamily: fonts.bold, fontSize: 18, color: staticColors.text }}>{infoModal.title}</Text>
              </View>
              <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: staticColors.textSecondary, lineHeight: 22, marginBottom: 24 }}>
                {infoModal.desc}
              </Text>
              <Button title="Anladım" onPress={() => setInfoModal({ ...infoModal, visible: false })} variant="primary" fullWidth />
            </View>
          </View>
        </Modal>
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
    padding: 12,
    paddingBottom: 32,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stepIconContainer: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  stepNumber: {
    fontSize: 14,
    fontFamily: fonts.bold,
  },
  stepLabelText: {
    fontSize: 11,
    marginLeft: 8,
    fontFamily: fonts.medium,
  },
  stepLine: {
    flex: 1,
    height: 1.5,
    marginHorizontal: 8,
    borderRadius: 1,
  },
  wizardWrapper: {
    marginBottom: 14,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  wizardMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  wizardIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wizardTextContainer: {
    flex: 1,
  },
  wizardLabelText: {
    fontSize: 9,
    fontFamily: fonts.extraBold,
    letterSpacing: 1.2,
    marginBottom: 1,
  },
  wizardMessageText: {
    fontSize: 12,
    fontFamily: fonts.medium,
    lineHeight: 16,
  },
  sectionCard: {
    padding: 16,
    marginBottom: 10,
    borderRadius: 24,
    borderWidth: 1,
    backgroundColor: staticColors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
  },
  sectionKicker: {
    fontFamily: fonts.extraBold,
    fontSize: 9,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  sectionIconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    letterSpacing: -0.3,
  },
  inputContainer: {
    marginBottom: 14,
  },
  label: {
    fontFamily: fonts.bold,
    fontSize: 13,
    marginBottom: 10,
    marginLeft: 2,
  },
  modernInput: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: fonts.medium,
    fontSize: 14,
    borderWidth: 1.5,
  },
  modernTextArea: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: fonts.medium,
    fontSize: 14,
    borderWidth: 1.5,
    minHeight: 100,
  },
  errorText: {
    color: staticColors.error,
    fontSize: 11,
    marginTop: 4,
    marginLeft: 6,
    fontFamily: fonts.bold,
  },
  pillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    marginTop: 0,
    marginBottom: 6,
  },
  pill: {
    width: '48.2%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 8,
  },
  pillText: {
    fontFamily: fonts.bold,
    fontSize: 12,
  },
  pillImage: {
    width: 24,
    height: 24,
    zIndex: 2,
  },
  urgencyGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  urgencyCard: {
    flex: 1,
    height: 52,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  urgencyCardLabel: {
    fontSize: 12,
    fontFamily: fonts.bold,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  backBtnWrapper: {
    flex: 1,
  },
  flexBtnWrapper: {
    flex: 2.2,
  },
  nextBtn: {
    marginTop: 16,
  },
  modernBudgetWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
  },
  modernBudgetInput: {
    flex: 1,
    paddingVertical: 10,
    fontFamily: fonts.extraBold,
    fontSize: 18,
  },
  currencyText: {
    fontFamily: fonts.extraBold,
    fontSize: 16,
  },
  imageButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  modernImageBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  imageActionText: {
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  imagePreviewScroll: {
    marginTop: 12,
  },
  imagePreviewWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 14,
  },
  removeImgBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: staticColors.white,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  divider: {
    height: 1.5,
    backgroundColor: 'rgba(0,0,0,0.03)',
    marginVertical: 16,
  },
  finalNote: {
    textAlign: 'center',
    fontFamily: fonts.medium,
    fontSize: 11,
    marginTop: 12,
    lineHeight: 16,
  },
  buildingInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  buildingInfoCard: {
    width: '47%',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 12,
    alignItems: 'center',
    gap: 6,
  },
  buildingInfoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  buildingInfoLabel: {
    fontFamily: fonts.bold,
    fontSize: 11,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  buildingInfoInput: {
    width: '100%',
    textAlign: 'center',
    fontFamily: fonts.extraBold,
    fontSize: 18,
    borderBottomWidth: 1.5,
    paddingBottom: 4,
    paddingTop: 2,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  sectionHeaderNoMargin: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  // Success Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successModal: {
    width: '100%',
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 25,
    elevation: 15,
  },
  successIconWrapper: {
    width: 84,
    height: 84,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successIconGlow: {
    position: 'absolute',
    width: 64,
    height: 64,
    backgroundColor: '#10B981',
    borderRadius: 32,
    opacity: 0.2,
    transform: [{ scale: 1.4 }],
  },
  successIconBox: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  successTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 22,
    color: staticColors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  successMessage: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: staticColors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  successBtnGroup: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
  successSecondaryBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  successSecondaryBtnText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: staticColors.textSecondary,
  },
  successPrimaryBtn: {
    flex: 1.5,
    height: 46,
    borderRadius: 14,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  successPrimaryBtnGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successPrimaryBtnText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: staticColors.white,
  },
});
