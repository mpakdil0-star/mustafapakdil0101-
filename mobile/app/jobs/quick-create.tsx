import { useState, useEffect, useRef, useCallback } from 'react';
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
    Animated,
    Easing,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { validateJobText } from '../../utils/validation';

const EMERGENCY_TYPES = [
    { id: 'elektrik', label: 'Elektrik', color: '#7C3AED', icon: 'flash' },
    { id: 'tesisat', label: 'Su/Tesisat', color: '#0284C7', icon: 'water' },
    { id: 'cilingir', label: 'Çilingir', color: '#D97706', icon: 'key' },
    { id: 'beyaz-esya', label: 'Beyaz Eşya', color: '#16A34A', icon: 'construct' },
    { id: 'klima', label: 'Klima', color: '#2563EB', icon: 'snow' },
    { id: 'temizlik', label: 'Temizlik', color: '#7C3AED', icon: 'sparkles' },
    { id: 'nakliyat', label: 'Nakliyat', color: '#EA580C', icon: 'car' },
    { id: 'boya-badana', label: 'Boya Badana', color: '#DB2777', icon: 'color-palette' },
    { id: 'koltuk-hali', label: 'Koltuk/Halı', color: '#059669', icon: 'bed' },
    { id: 'mobilya-montaj', label: 'Mobilya', color: '#9333EA', icon: 'cube' },
    { id: 'kucuk-nakliye', label: 'Küçük Nakliye', color: '#CA8A04', icon: 'cube-outline' },
    { id: 'kombi-servis', label: 'Kombi', color: '#DC2626', icon: 'flame' },
    { id: 'asansor', label: 'Asansör', color: '#475569', icon: 'swap-vertical' },
    { id: 'bocek-ilaclama', label: 'İlaçlama', color: '#0891B2', icon: 'bug' },
    { id: 'guvenlik-kamera', label: 'Kamera', color: '#4F46E5', icon: 'videocam' },
];

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

const getDescriptionPlaceholder = (type: string | null, subCategoryId?: string): string => {
    // Elektrik
    if (subCategoryId === 'elektrik-proje') return 'Örn: 2 Katlı müstakil ev projesi, 200m2, mimari plan hazır. Belediye onayı dahil teklif bekliyoruz...';
    if (subCategoryId === 'elektrik-tesisat') return 'Örn: Evin salon ve mutfağındaki eski kablolar değişecek, yeni priz hatları çekilecek...';
    if (subCategoryId === 'elektrik-tamir') return 'Örn: Çamaşır makinesi çalışınca sigorta atıyor, mutfaktan yanık kokusu geldi...';
    if (subCategoryId === 'aydinlatma') return 'Örn: Salona 2 adet avize takılacak, asma tavana şerit LED çekilecek...';
    if (subCategoryId === 'priz-anahtar') return 'Örn: 3 adet priz yerinden çıktı, yatak odasına 2 adet yeni priz çekilmesi gerekiyor...';
    if (subCategoryId === 'elektrik-panosu') return 'Örn: Apartman girişindeki panoda şalterler eski, kablolar düzensiz. Yenilenmesi gerekiyor...';
    if (subCategoryId === 'kablo-cekimi') return 'Örn: Modemden arka odaya dışarıdan veya kanaldan ethernet kablosu çekilecek...';
    if (subCategoryId === 'uydu-sistemleri') return 'Örn: Çanak antende sinyal yok, lnb değişimi veya yön ayarı yapılması lazım...';
    if (subCategoryId === 'elektrik-kontrol') return 'Örn: Yeni taşındığım evin elektrik tesisatında kaçak var mı kontrol edilmesini istiyorum...';

    // Çilingir
    if (subCategoryId === 'kapi-acma') return 'Örn: Çelik kapı çekili durumda kilitli değil, anahtar evin içinde unuttum...';
    if (subCategoryId === 'kilit-degisimi') return 'Örn: Yeni eve taşındım, üst ve alt kilit göbeklerinin (barel) yenilenmesini istiyorum...';
    if (subCategoryId === 'anahtar-kopyalama') return 'Örn: Apartman kapısı için 3 adet manyetik çip/göstergeç kopyalanmasını istiyorum...';
    if (subCategoryId === 'kasa-acma') return 'Örn: Elektronik dijital kasanın pili bitti veya şifresini unuttum, zararsız açılması lazım...';
    if (subCategoryId === 'oto-cilingir') return 'Örn: 2015 model aracımın bagajında anahtarı unuttum, kapılar otomatik kilitlendi...';

    // Klima
    if (subCategoryId === 'klima-montaj') return 'Örn: Yeni aldığım klimanın yatak odasına kurulumu yapılacak, dış motor balkon duvarına asılacak...';
    if (subCategoryId === 'klima-bakim') return 'Örn: Klimanın filtreleri temizlenecek, genel performansı incelenecek ve koku giderici sıkılacak...';
    if (subCategoryId === 'klima-tamir') return 'Örn: Klimayı açtığımda sadece fan çalışıyor, soğuk hava üflemiyor. Işıkları yanıp sönüyor...';
    if (subCategoryId === 'gaz-dolumu') return 'Örn: Cihaz soğutmuyor, servis daha önce gazın bittiğini söyledi. Yeniden gaz şarjı gerekiyor...';
    if (subCategoryId === 'klima-temizlik') return 'Örn: Klimadan kötü koku geliyor, içinin ilaçlı suyla profesyonel şekilde yıkanmasını istiyorum...';

    // Beyaz Eşya
    if (subCategoryId === 'camasir-makinesi') return 'Örn: Program bitmesine rağmen içinde su kaldı, kapağı açılmıyor, altından su damlatıyor...';
    if (subCategoryId === 'bulasik-makinesi') return 'Örn: Bardaklar çizik ve lekeli çıkıyor, deterjanı tam eritmeden programı bitiriyor...';
    if (subCategoryId === 'buzdolabi') return 'Örn: Buzluk donduruyor fakat alt bölmedeki yiyecekler bozulmaya başladı, motor sürekli çalışıyor...';
    if (subCategoryId === 'firin-ocak') return 'Örn: Ankastre fırının sadece üst rezistansı çalışıyor, keklerin altı hamur kalıyor...';
    if (subCategoryId === 'kurutma-makinesi') return 'Örn: 2 saatlik program bitmesine rağmen çamaşırlar tam kurumuyor, sıcaklık vermiyor...';

    // Tesisat
    if (subCategoryId === 'tikaniklik') return 'Örn: Mutfak lavabosundan su gitmiyor, sular geri taşıyor. Makine ile açılması lazım...';
    if (subCategoryId === 'su-kacagi') return 'Örn: Banyonun alt katındaki komşunun tavanında sararma ve damlama var, kaçağın cihazla bulunması lazım...';
    if (subCategoryId === 'musluk-batarya') return 'Örn: Lavabo çeşmesi dipten su kaçırıyor, yeni batarya aldım sadece montajı yapılacak...';
    if (subCategoryId === 'petek-kombi') return 'Örn: Kombi çalışıyor ama peteklerin alt kısmı soğuk kalıyor. Makineli petek temizliği istiyorum...';
    if (subCategoryId === 'tuvalet-lavabo') return 'Örn: Klozetin sifonu sürekli içeriye su akıtıyor, şamandıra bozuk, yenisi takılacak...';    switch (type) {
        case 'elektrik': return 'Örnek: Mutfak prizleri çalışmıyor, sigorta attı, vb...';
        case 'tesisat': return 'Örnek: Lavabodan su akıyor, acil tamir lazım...';
        case 'cilingir': return 'Örnek: Anahtar içeride kaldı, kapı kilitli...';
        case 'beyaz-esya': return 'Örnek: Çamaşır makinesi su boşaltmıyor...';
        case 'klima': return 'Örnek: Klima soğutmuyor, acil servis lazım...';
        case 'temizlik': return 'Örnek: Ev temizliği yapılacak, 3+1 daire...';
        case 'nakliyat': return 'Örnek: 2+1 eşyalar taşınacak, 3. kat asansörsüz...';
        case 'boya-badana': return 'Örnek: 2 oda boyası yapılacak, renk değişimi...';
        case 'koltuk-hali': return 'Örnek: L koltuk ve 2 halı yıkanacak...';
        case 'mobilya-montaj': return 'Örnek: İkea dolap ve yatak montajı yapılacak...';
        case 'kucuk-nakliye': return 'Örnek: Tek parça koltuk taşınacak, 5. kata...';
        case 'kombi-servis': return 'Örnek: Kombi su ısıtmıyor, arıza kodu veriyor...';
        case 'asansor': return 'Örnek: Asansör arada kalıyor, bakım gerekiyor...';
        case 'bocek-ilaclama': return 'Örnek: Mutfakta hamamböceği var, ilaçlama lazım...';
        case 'guvenlik-kamera': return 'Örnek: 4 kameralı sistem kurulacak, dış mekan...';
        default: return 'Sorununuzu kısaca açıklayın...';
    }
};

const getCategoryImage = (id: string) => {
    switch (id) {
        case 'elektrik': return require('../../assets/images/categories/electric_3d_clean_v3.png');
        case 'cilingir': return require('../../assets/images/categories/locksmith_3d_clean_v2.png');
        case 'klima': return require('../../assets/images/categories/ac_3d_clean_v2.png');
        case 'beyaz-esya': return require('../../assets/images/categories/appliances_3d_clean_v2.png');
        case 'tesisat': return require('../../assets/images/categories/plumbing_3d_clean_v3.png');
        case 'temizlik': return require('../../assets/images/categories/cleaning_3d_clean_v2.png');
        case 'nakliyat': return require('../../assets/images/categories/moving_3d_clean_v2.png');
        case 'boya-badana': return require('../../assets/images/categories/painting_3d_clean_v2.png');
        case 'koltuk-hali': return require('../../assets/images/categories/sofacl_3d_clean_v2.png');
        case 'mobilya-montaj': return require('../../assets/images/categories/furniture_3d_clean_v2.png');
        case 'kucuk-nakliye': return require('../../assets/images/categories/smallcg_3d_clean_v2.png');
        case 'kombi-servis': return require('../../assets/images/categories/boiler_3d_clean_v2.png');
        case 'asansor': return require('../../assets/images/categories/elevator_3d_clean_v2.png');
        case 'bocek-ilaclama': return require('../../assets/images/categories/pest_3d_clean_v2.png');
        case 'guvenlik-kamera': return require('../../assets/images/categories/seccam_3d_clean_v2.png');
        default: return undefined;
    }
};

const MAX_IMAGES = 3;

const trLowerCase = (str: string) => {
    return str
        .replace(/İ/g, 'i')
        .replace(/I/g, 'ı')
        .replace(/Ş/g, 'ş')
        .replace(/Ğ/g, 'ğ')
        .replace(/Ü/g, 'ü')
        .replace(/Ö/g, 'ö')
        .replace(/Ç/g, 'ç')
        .toLowerCase();
};

export default function QuickCreateScreen() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { isLoading } = useAppSelector((state) => state.jobs);
    const { user, isAuthenticated } = useAppSelector((state) => state.auth);    const colors = useAppColors();
    const insets = useSafeAreaInsets();

    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [isSearchActive, setIsSearchActive] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
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

    // Project specific states
    const [projectBuildingType, setProjectBuildingType] = useState('');
    const [projectOtherBuildingType, setProjectOtherBuildingType] = useState('');
    const [projectArea, setProjectArea] = useState('');
    const [projectInstalledPower, setProjectInstalledPower] = useState('');
    const [projectFloors, setProjectFloors] = useState('');
    const [projectPurpose, setProjectPurpose] = useState('');
    const [projectHasArchitecturePlan, setProjectHasArchitecturePlan] = useState<boolean | null>(null);
    const [projectRoomsPerFloor, setProjectRoomsPerFloor] = useState('');
    const [projectWeakCurrentSystems, setProjectWeakCurrentSystems] = useState<string[]>([]);
    const [projectModernSystems, setProjectModernSystems] = useState<string[]>([]);
    const [projectNeedsApproval, setProjectNeedsApproval] = useState<boolean | null>(null);
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
    };    // Pulse animation for emergency banner
    const pulseAnim = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.15, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, []);    // Helper: get active type color
    const activeColor = EMERGENCY_TYPES.find(t => t.id === selectedType)?.color || colors.primary;

    const filteredTypes = EMERGENCY_TYPES.filter(type => {
        if (!searchQuery) return true;
        const normalizedQuery = trLowerCase(searchQuery);
        const normalizedLabel = trLowerCase(type.label);
        return normalizedLabel.includes(normalizedQuery);
    });

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
                allowsEditing: false,
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
                allowsEditing: false,
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
        const newErrors: Record<string, string> = {};
        
        // Gibberish (anlamsız metin) kontrolü - açıklama alanı
        const descErr = validateJobText(description || '', 'Sorun açıklaması', 10);
        if (descErr) newErrors.description = descErr;
        else if (!description || description.trim().length < 10) newErrors.description = 'Açıklama en az 10 karakter olmalı';
        if (!selectedType) newErrors.type = 'Lütfen bir hizmet alanı seçiniz';
        if (selectedType && !selectedSubCategory) newErrors.subCategory = 'Lütfen spesifik bir hizmet dalı seçin';
        if (!city) newErrors.city = 'Lütfen şehir seçiniz';
        if (!district) newErrors.district = 'Lütfen ilçe seçiniz';
        if (!neighborhood) newErrors.neighborhood = 'Lütfen mahalle seçiniz';
        if (!address || address.trim().length < 10) newErrors.address = 'Adres en az 10 karakter olmalı';

        if (selectedSubCategory?.id === 'elektrik-proje') {
            if (!projectBuildingType) newErrors.projectBuildingType = 'Yapı tipi seçilmelidir';
            if (!projectArea || projectArea.trim() === '') newErrors.projectArea = 'Alan girilmelidir';
            if (!projectPurpose) newErrors.projectPurpose = 'Proje amacı seçilmelidir';
            if (projectHasArchitecturePlan === null) newErrors.projectHasArchitecturePlan = 'Mimari plan durumu seçilmelidir';
            if (projectNeedsApproval === null) newErrors.projectNeedsApproval = 'Resmi onay takibi seçilmelidir';
            
            if (projectHasArchitecturePlan === true && images.length === 0) {
                newErrors.images = 'Mimari plan yüklenmesi zorunludur';
            }
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            showAlert('Eksik Bilgiler', 'Lütfen kırmızı ile işaretlenmiş zorunlu alanları doldurunuz.', 'warning');
            return;
        }

        setErrors({});

        const typeInfo = EMERGENCY_TYPES.find(t => t.id === selectedType);
        const finalTitle = `ACİL: ${selectedSubCategory ? selectedSubCategory.name : typeInfo?.label}`;
        try {
            let finalDescription = description.trim();
            if (selectedSubCategory?.id === 'elektrik-proje') {
                const selectedPurpose = PROJECT_PURPOSES.find(p => p.value === projectPurpose)?.label;
                let selectedTypeLabel = BUILDING_TYPES.find(b => b.value === projectBuildingType)?.label;
                if (projectBuildingType === 'diger' && projectOtherBuildingType.trim()) {
                    selectedTypeLabel += ` (${projectOtherBuildingType.trim()})`;
                }

                const allSystems = [...projectWeakCurrentSystems, ...projectModernSystems];
                const systemLabels = allSystems.map(id => {
                    const found = [...WEAK_CURRENT_SYSTEMS, ...MODERN_SYSTEMS].find(s => s.id === id);
                    return found ? found.label : id;
                }).join(', ');
                
                finalDescription = 
                    `📐 ELEKTRİK PROJE DETAYLARI\n` +
                    `--------------------------------\n` +
                    `• Yapı Tipi: ${selectedTypeLabel || 'Belirtilmedi'}\n` +
                    `• Toplam Alan: ${projectArea || '-'} m²\n` +
                    `• Kurulu Güç: ${projectInstalledPower ? projectInstalledPower + ' kW' : 'Belirtilmedi'}\n` +
                    `• Kat Sayısı: ${projectFloors || '1'}\n` +
                    `• Oda/Bölüm Sayısı: ${projectRoomsPerFloor || '-'}\n` +
                    `• Proje Amacı: ${selectedPurpose || 'Yeni Yapı'}\n` +
                    `• Mimari Plan: ${projectHasArchitecturePlan === true ? 'Mevcut (DWG/PDF)' : projectHasArchitecturePlan === false ? 'Yok (Rölöve Gerekli)' : 'Belirtilmedi'}\n` +
                    `• Resmi Onay: ${projectNeedsApproval === true ? 'Mühendis Takip Edecek' : projectNeedsApproval === false ? 'Müşteri Takip Edecek' : 'Belirtilmedi'}\n` +
                    `• Ek Sistemler: ${systemLabels || 'Standart'}\n` +
                    `--------------------------------\n\n` +
                    `📝 MÜŞTERİ NOTU:\n` +
                    description.trim();
            }

            const jobData: any = {
                title: finalTitle,
                description: finalDescription,
                category: selectedSubCategory?.name || 'Elektrik Tamiri',
                location: {
                    address: address.trim(),
                    city: city.trim(),
                    district: district.trim(),
                    neighborhood: neighborhood?.trim() || '',
                    latitude: parseFloat((coords?.latitude || 41.0082).toString()),
                    longitude: parseFloat((coords?.longitude || 28.9784).toString()),
                },
                urgencyLevel: 'HIGH',
                images: (images && images.length > 0) ? images : undefined,
                serviceCategory: (selectedType || 'elektrik').toLowerCase(),
            };

            if (budget && budget.trim() !== '') {
                const cleanBudget = budget.replace(',', '.');
                const parsedBudget = parseFloat(cleanBudget);
                if (!isNaN(parsedBudget)) {
                    jobData.estimatedBudget = parsedBudget;
                }
            }

            const newJob = await dispatch(createJob(jobData)).unwrap();
            setCreatedJobId(newJob.id);
            dispatch(fetchJobs({ status: 'OPEN', limit: 20 }));
            dispatch(fetchMyJobs());
            setShowSuccessModal(true);
        } catch (err: any) {
            showAlert('Hata', err.message || 'Hızlı çağrı oluşturulamadı', 'error');
        }
    };    const getCategoryFromType = (type: string): string => {
        switch (type) {
            case 'elektrik': return 'Elektrik Tamiri';
            case 'tesisat': return 'Tesisat';
            case 'cilingir': return 'Çilingir';
            case 'beyaz-esya': return 'Beyaz Eşya';
            case 'klima': return 'Klima Servisi';
            case 'temizlik': return 'Temizlik';
            case 'nakliyat': return 'Evden Eve Nakliyat';
            case 'boya-badana': return 'Boya Badana';
            case 'koltuk-hali': return 'Koltuk/Halı Yıkama';
            case 'mobilya-montaj': return 'Mobilya Montaj';
            case 'kucuk-nakliye': return 'Küçük Nakliye';
            case 'kombi-servis': return 'Kombi Servisi';
            case 'asansor': return 'Asansör Bakım';
            case 'bocek-ilaclama': return 'Böcek İlaçlama';
            case 'guvenlik-kamera': return 'Güvenlik Kamera';
            default: return 'Diğer';
        }
    };

    const emergencyGradient = colors.gradientEmergency as [string, string, ...string[]];

    return (
        <View style={[styles.container, { backgroundColor: colors.backgroundLight }]}>
            <PremiumHeader title="Acil Usta Çağır" showBackButton />

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 40}
            >
                <ScrollView
                    style={styles.scrollView}                    contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 32 }]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >                    <LinearGradient
                        colors={emergencyGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.emergencyBanner}
                    >
                        <Animated.View style={[styles.emergencyIconWrapper, { transform: [{ scale: pulseAnim }] }]}>
                            <Ionicons name="flash" size={22} color="#FFF" />
                        </Animated.View>
                        <View style={styles.bannerTextBlock}>
                            <Text style={styles.bannerTitle}>Hızlı müdahale</Text>
                            <Text style={styles.bannerSubtitle} numberOfLines={2}>
                                Çağrınız bölgenizdeki ustalara anında iletilir.
                            </Text>
                        </View>
                        <View style={styles.bannerBadge}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ADE80' }} />
                                <Text style={styles.bannerBadgeText}>7/24</Text>
                            </View>
                        </View>
                    </LinearGradient>                    {/* Section: Hizmet */}
                    <View style={[styles.sectionLabelRow, { justifyContent: 'space-between', alignItems: 'center' }]}>
                        {isSearchActive ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 }}>
                                <LinearGradient
                                    colors={[activeColor, activeColor + 'CC']}
                                    style={styles.stepBadge}
                                >
                                    <Text style={styles.stepBadgeText}>1</Text>
                                </LinearGradient>
                                <TextInput
                                    style={[
                                        styles.searchInput,
                                        {
                                            color: colors.text,
                                            borderColor: activeColor + '50',
                                            backgroundColor: colors.surfaceElevated,
                                        }
                                    ]}
                                    placeholder="Hizmet ara... (örn: boya, kombi)"
                                    placeholderTextColor={colors.textLight}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    autoFocus
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                                <TouchableOpacity
                                    onPress={() => {
                                        setIsSearchActive(false);
                                        setSearchQuery('');
                                    }}
                                    style={styles.searchCloseBtn}
                                >
                                    <Ionicons name="close-circle" size={22} color={activeColor} />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <LinearGradient
                                        colors={[activeColor, activeColor + 'CC']}
                                        style={styles.stepBadge}
                                    >
                                        <Text style={styles.stepBadgeText}>1</Text>
                                    </LinearGradient>
                                    <Text style={[styles.sectionLabelText, { color: colors.text }]}>Hizmet Seçin</Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => setIsSearchActive(true)}
                                    style={[
                                        styles.searchToggleBtn,
                                        {
                                            backgroundColor: colors.surfaceElevated,
                                            borderColor: colors.border,
                                            borderWidth: 1,
                                            borderRadius: 10,
                                            width: 32,
                                            height: 32,
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                        }
                                    ]}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="search-outline" size={16} color={activeColor} />
                                </TouchableOpacity>
                            </>
                        )}
                    </View>

                    {filteredTypes.length > 0 ? (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.typeScrollContent}
                            decelerationRate="fast"
                        >
                            {filteredTypes.map((type) => {
                                const isSelected = selectedType === type.id;
                                const hasError = !!errors.type && !selectedType;
                                return (
                                    <TouchableOpacity
                                        key={type.id}                                        style={[
                                            styles.typeBtn,
                                            { borderColor: colors.border, backgroundColor: colors.surface },
                                            isSelected && {
                                                borderColor: type.color,
                                                backgroundColor: type.color + '08',
                                                shadowColor: type.color,
                                                shadowOffset: { width: 0, height: 4 },
                                                shadowOpacity: 0.25,
                                                shadowRadius: 8,
                                                elevation: 6,
                                            },
                                            hasError && { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
                                        ]}
                                        activeOpacity={0.85}
                                        onPress={() => {
                                            setSelectedType(type.id);
                                            setSelectedSubCategory(null);
                                            setErrors(prev => ({ ...prev, type: '' }));
                                        }}
                                    >
                                        <View style={[styles.typeIconBox, { backgroundColor: type.color + '12' }]}>
                                            <Image source={getCategoryImage(type.id)} style={styles.type3dImage} resizeMode="contain" />
                                        </View>
                                        <Text
                                            style={[
                                                styles.typeLabel,
                                                {
                                                    color: isSelected ? type.color : colors.textSecondary,
                                                    fontFamily: isSelected ? fonts.bold : undefined,
                                                    backgroundColor: 'transparent'
                                                }
                                            ]}
                                            numberOfLines={2}
                                        >
                                            {type.label}
                                        </Text>
                                        {isSelected && (
                                            <View style={[styles.accentLine, { backgroundColor: type.color }]} />
                                        )}
                                        {isSelected && (
                                            <LinearGradient
                                                colors={[type.color, type.color + 'CC']}
                                                style={styles.checkIndicator}
                                            >
                                                <Ionicons name="checkmark" size={10} color="#FFF" />
                                            </LinearGradient>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    ) : (
                        <View style={[
                            styles.emptySearchContainer,
                            {                                borderColor: colors.border + '50',
                                backgroundColor: colors.surfaceElevated,
                            }
                        ]}>
                            <Ionicons name="search-outline" size={24} color={colors.textSecondary + '60'} />
                            <Text style={[styles.emptySearchText, { color: colors.textSecondary }]}>
                                Aradığınız usta / hizmet bulunamadı.
                            </Text>
                        </View>
                    )}
                    {!!errors.type && !selectedType && (
                        <Text style={styles.errorTextSmall}>{errors.type}</Text>
                    )}

                    {/* Sub-category Bubbles */}
                    {selectedType && (
                        <View style={styles.subCategoryContainer}>
                            <View style={styles.subCategoryHeader}>
                                <View style={[styles.dot, { backgroundColor: EMERGENCY_TYPES.find(t => t.id === selectedType)?.color }]} />
                                <Text style={[styles.subCategoryHeading, { color: colors.textSecondary }]}>
                                    {selectedType === 'elektrik' ? 'Hangi konuda proje veya detaylı servis lazım?' : 'Hızlı detay seçin (opsiyonel)'}
                                </Text>
                            </View>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.subCategoryScrollContent}
                            >
                                {getSubCategoriesByParent(selectedType).map((sub) => {
                                    const isSubSelected = selectedSubCategory?.id === sub.id;
                                    const isProject = sub.id === 'elektrik-proje';

                                    if (isProject && isSubSelected) {
                                        return (
                                            <TouchableOpacity key={sub.id} onPress={() => setSelectedSubCategory(null)} activeOpacity={0.9}>
                                                <LinearGradient
                                                    colors={['#2563EB', '#1E40AF']}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 1 }}
                                                    style={[styles.subCategoryChip, { borderWidth: 0, elevation: 6, shadowColor: '#2563EB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }]}
                                                >
                                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                        <Ionicons name={sub.icon as any} size={14} color="#FFF" style={{ marginRight: 6 }} />
                                                        <Text style={[styles.subCategoryText, { color: '#FFF', fontFamily: fonts.bold }]}>{sub.name}</Text>
                                                    </View>
                                                </LinearGradient>
                                            </TouchableOpacity>
                                        );
                                    }

                                    return (
                                        <TouchableOpacity
                                            key={sub.id}                                            style={[
                                                styles.subCategoryChip,
                                                { borderColor: isProject ? '#3B82F6' : colors.border, backgroundColor: colors.surface },
                                                isProject && !isSubSelected && { borderStyle: 'dashed', borderWidth: 1.5, backgroundColor: colors.surfaceElevated },
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
                                                    color={isSubSelected ? colors.white : (isProject ? '#2563EB' : colors.textSecondary)}
                                                    style={{ marginRight: 6 }}
                                                />
                                            )}
                                            <Text
                                                style={[
                                                    styles.subCategoryText,
                                                    { color: isProject ? '#1E40AF' : colors.textSecondary },
                                                    isSubSelected && { color: colors.white, fontFamily: fonts.bold }
                                                ]}
                                            >
                                                {sub.name}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                            {!!errors.subCategory && !selectedSubCategory && (
                                <Text style={[styles.errorTextSmall, { marginTop: 8 }]}>{errors.subCategory}</Text>
                            )}
                        </View>
                    )}

                    {/* Conditional Project Form */}
                    {selectedSubCategory?.id === 'elektrik-proje' && (
                        <Card variant="default" style={[styles.mainCard, { borderLeftWidth: 4, borderLeftColor: '#3B82F6', backgroundColor: '#F0F9FF', padding: 16 }]}>
                            <View style={{ marginBottom: 16 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                    <View style={{backgroundColor: '#3B82F6', borderRadius: 6, padding: 4, marginRight: 8}}>
                                        <Ionicons name="document-text" size={14} color="#FFF" />
                                    </View>
                                    <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: '#1E40AF' }}>Proje Teknik Bilgileri</Text>
                                </View>
                                <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: '#64748B', lineHeight: 18 }}>
                                    Hızlı teklif alabilmek için proje detaylarını belirtin.
                                </Text>
                            </View>

                            <View style={styles.row}>
                                <View style={{ flex: 1.5, marginRight: 8 }}>
                                    <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 4, fontSize: 12 }]}>Yapı Tipi</Text>
                                    <Picker 
                                        value={BUILDING_TYPES.find(b => b.value === projectBuildingType)?.label || ''} 
                                        options={BUILDING_TYPES.map(b => b.label)} 
                                        onValueChange={(val) => {
                                            const found = BUILDING_TYPES.find(b => b.label === val);
                                            if (found) {
                                                setProjectBuildingType(found.value);
                                                setErrors(prev => ({ ...prev, projectBuildingType: '' }));
                                            }
                                        }} 
                                        required
                                        error={errors.projectBuildingType}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 4, fontSize: 12 }]}>Alan (m²) *</Text>
                                    <TextInput
                                        style={[
                                            styles.smallInput, 
                                            { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceElevated },
                                            errors.projectArea ? { borderColor: '#EF4444' } : {}
                                        ]}
                                        placeholder=" m²"
                                        value={projectArea}
                                        onChangeText={(val) => { setProjectArea(val); setErrors(prev => ({ ...prev, projectArea: '' })); }}
                                        keyboardType="numeric"
                                    />
                                    {!!errors.projectArea && <Text style={styles.errorTextSmall}>{errors.projectArea}</Text>}
                                </View>
                            </View>

                            {projectBuildingType === 'diger' && (
                                <View style={[styles.row, { marginTop: 8 }]}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 4, fontSize: 12 }]}>Diğer Yapı Tipi</Text>
                                        <TextInput
                                            style={[styles.smallInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
                                            placeholder="Lütfen açıklayınız"
                                            value={projectOtherBuildingType}
                                            onChangeText={setProjectOtherBuildingType}
                                        />
                                    </View>
                                </View>
                            )}

                            <View style={[styles.row, { marginTop: 12 }]}>
                                <View style={{ flex: 1.5, marginRight: 8 }}>
                                    <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 4, fontSize: 12 }]}>Proje Amacı</Text>
                                    <Picker 
                                        value={PROJECT_PURPOSES.find(p => p.value === projectPurpose)?.label || ''} 
                                        options={PROJECT_PURPOSES.map(p => p.label)} 
                                        onValueChange={(val) => {
                                            const found = PROJECT_PURPOSES.find(p => p.label === val);
                                            if (found) {
                                                setProjectPurpose(found.value);
                                                setErrors(prev => ({ ...prev, projectPurpose: '' }));
                                            }
                                        }} 
                                        required
                                        error={errors.projectPurpose}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 4, fontSize: 12 }]}>Kat</Text>
                                            <TextInput
                                                style={[styles.smallInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
                                                placeholder="Kat"
                                                value={projectFloors}
                                                onChangeText={setProjectFloors}
                                                keyboardType="numeric"
                                            />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 4, fontSize: 12 }]}>Oda</Text>
                                            <TextInput
                                                style={[styles.smallInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
                                                placeholder="Oda"
                                                value={projectRoomsPerFloor}
                                                onChangeText={setProjectRoomsPerFloor}
                                                keyboardType="numeric"
                                            />
                                        </View>
                                    </View>
                                </View>
                            </View>

                            <View style={[styles.row, { marginTop: 12 }]}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 4, fontSize: 12 }]}>Kurulu Güç (kW)</Text>
                                    <TextInput
                                        style={[styles.smallInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceElevated }]}
                                        placeholder="Örn: 15"
                                        keyboardType="numeric"
                                        value={projectInstalledPower}
                                        onChangeText={setProjectInstalledPower}
                                    />
                                </View>
                            </View>

                            <View style={{ marginTop: 16 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                    <Text style={[styles.label, { color: colors.textSecondary, fontSize: 12, marginBottom: 0 }]}>Ek Sistemler (Zayıf Akım/Modern)</Text>
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

                            <View style={{ marginTop: 16 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                    <Text style={[styles.label, { color: colors.textSecondary, fontSize: 12, marginBottom: 0 }]}>Resmi Onay Takibi Kimde? *</Text>
                                    <TouchableOpacity onPress={() => showInfoTip('Resmi Onay Nedir?', 'Projenin TEDAŞ veya ilgili elektrik dağıtım şirketi tarafından onaylanması sürecidir. Bu süreci mühendisin takip etmesi işleri hızlandırır.')} style={{ marginLeft: 6 }}>
                                        <Ionicons name="help-circle-outline" size={16} color={colors.primary} />
                                    </TouchableOpacity>
                                </View>
                                <View style={[styles.choiceRow, errors.projectNeedsApproval ? { padding: 2, borderRadius: 12, borderWidth: 1, borderColor: '#EF4444' } : {}]}>
                                    <TouchableOpacity 
                                        activeOpacity={0.7}
                                        style={[styles.choiceBtn, projectNeedsApproval === true && styles.choiceBtnActive]}
                                        onPress={() => { setProjectNeedsApproval(true); setErrors(prev => ({ ...prev, projectNeedsApproval: '' })); }}
                                    >
                                        <Text style={[styles.choiceBtnText, projectNeedsApproval === true && styles.choiceBtnTextActive]}>Mühendis</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        activeOpacity={0.7}
                                        style={[styles.choiceBtn, projectNeedsApproval === false && styles.choiceBtnActive]}
                                        onPress={() => { setProjectNeedsApproval(false); setErrors(prev => ({ ...prev, projectNeedsApproval: '' })); }}
                                    >
                                        <Text style={[styles.choiceBtnText, projectNeedsApproval === false && styles.choiceBtnTextActive]}>Müşteri</Text>
                                    </TouchableOpacity>
                                </View>
                                {!!errors.projectNeedsApproval && <Text style={styles.errorTextSmall}>{errors.projectNeedsApproval}</Text>}
                            </View>

                            <View style={{ marginTop: 16 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                    <Text style={[styles.label, { color: colors.textSecondary, fontSize: 12, marginBottom: 0 }]}>Mimari planınız var mı? *</Text>
                                    <TouchableOpacity onPress={() => showInfoTip('Mimari Plan Nedir?', 'Proje çiziminin temelidir. Eğer DWG veya PDF formatında planınız yoksa, mühendisin yerinde rölöve (ölçüm) alması gerekir.')} style={{ marginLeft: 6 }}>
                                        <Ionicons name="help-circle-outline" size={16} color={colors.primary} />
                                    </TouchableOpacity>
                                </View>
                                <View style={[styles.choiceRow, errors.projectHasArchitecturePlan ? { padding: 2, borderRadius: 12, borderWidth: 1, borderColor: '#EF4444' } : {}]}>
                                    <TouchableOpacity 
                                        activeOpacity={0.7}
                                        style={[styles.choiceBtn, projectHasArchitecturePlan === true && styles.choiceBtnActive]}
                                        onPress={() => { setProjectHasArchitecturePlan(true); setErrors(prev => ({ ...prev, projectHasArchitecturePlan: '' })); }}
                                    >
                                        <Text style={[styles.choiceBtnText, projectHasArchitecturePlan === true && styles.choiceBtnTextActive]}>Evet, Var</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        activeOpacity={0.7}
                                        style={[styles.choiceBtn, projectHasArchitecturePlan === false && styles.choiceBtnActive]}
                                        onPress={() => { setProjectHasArchitecturePlan(false); setErrors(prev => ({ ...prev, projectHasArchitecturePlan: '' })); }}
                                    >
                                        <Text style={[styles.choiceBtnText, projectHasArchitecturePlan === false && styles.choiceBtnTextActive]}>Yok (Rölöve)</Text>
                                    </TouchableOpacity>
                                </View>
                                {!!errors.projectHasArchitecturePlan && <Text style={styles.errorTextSmall}>{errors.projectHasArchitecturePlan}</Text>}
                                {projectHasArchitecturePlan === true && (
                                    <View style={{ 
                                        flexDirection: 'row', 
                                        alignItems: 'center', 
                                        marginTop: 8, 
                                        backgroundColor: (images.length > 0) ? '#10B98115' : '#EF444410', 
                                        padding: 8, 
                                        borderRadius: 8,
                                        borderWidth: 1,
                                        borderColor: (images.length > 0) ? '#10B98130' : '#EF444420'
                                    }}>
                                        <Ionicons 
                                            name={(images.length > 0) ? "checkmark-circle-outline" : "warning-outline"} 
                                            size={14} 
                                            color={(images.length > 0) ? "#10B981" : "#EF4444"} 
                                            style={{ marginRight: 6 }} 
                                        />
                                        <Text style={{ 
                                            fontFamily: fonts.medium, 
                                            fontSize: 11, 
                                            color: (images.length > 0) ? "#059669" : "#EF4444", 
                                            flex: 1 
                                        }}>
                                            {(images.length > 0) 
                                                ? "Plan fotoğrafı başarıyla eklendi." 
                                                : "Planı olduğunu belirtenlerin, aşağıdan planın en az bir fotoğrafını eklemesi zorunludur."}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </Card>
                    )}                    {/* Section: Konum */}
                    <View style={styles.sectionDivider} />
                    <View style={styles.sectionLabelRow}>
                        <LinearGradient
                            colors={[activeColor, activeColor + 'CC']}
                            style={styles.stepBadge}
                        >
                            <Text style={styles.stepBadgeText}>2</Text>
                        </LinearGradient>
                        <Text style={[styles.sectionLabelText, { color: colors.text }]}>Konum Bilgisi</Text>
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
                            <View style={{ flex: 1 }}>
                                <Picker 
                                    label="Şehir" 
                                    value={city} 
                                    options={CITY_NAMES} 
                                    onValueChange={(val) => { setCity(val); setErrors(prev => ({ ...prev, city: '' })); }} 
                                    error={errors.city}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Picker 
                                    label="İlçe" 
                                    value={district} 
                                    options={districtOptions} 
                                    onValueChange={(val) => { setDistrict(val); setErrors(prev => ({ ...prev, district: '' })); }} 
                                    disabled={!city} 
                                    error={errors.district}
                                />
                            </View>
                        </View>
                        <Picker 
                            label="Mahalle" 
                            value={neighborhood} 
                            options={neighborhoodOptions.length > 0 ? neighborhoodOptions : (district ? ['Merkez'] : [])} 
                            onValueChange={(val) => { setNeighborhood(val); setErrors(prev => ({ ...prev, neighborhood: '' })); }} 
                            disabled={!district} 
                            error={errors.neighborhood}
                        />
                        <View>
                            <TextInput
                                style={[
                                    styles.addressInput, 
                                    { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceElevated },
                                    errors.address && { borderColor: '#EF4444', backgroundColor: '#FEF2F2' }
                                ]}
                                placeholder="Detaylı adres (bina, daire no...)"
                                value={address}
                                onChangeText={(val) => { setAddress(val); if (val.length >= 10) setErrors(prev => ({ ...prev, address: '' })); }}
                                multiline
                                placeholderTextColor={colors.textLight}
                            />
                            {!!errors.address && <Text style={styles.errorTextSmall}>{errors.address}</Text>}
                        </View>
                    </Card>                    {/* Section: Açıklama */}
                    <View style={styles.sectionDivider} />
                    <View style={styles.sectionLabelRow}>
                        <LinearGradient
                            colors={[activeColor, activeColor + 'CC']}
                            style={styles.stepBadge}
                        >
                            <Text style={styles.stepBadgeText}>3</Text>
                        </LinearGradient>
                        <Text style={[styles.sectionLabelText, { color: colors.text }]}>Sorunu Anlatın</Text>
                    </View>

                    <Card variant="default" style={styles.mainCard}>
                        <View style={[styles.cardAccentTop, { backgroundColor: activeColor }]} />
                        <View>
                            <TextInput
                                style={[
                                    styles.descriptionInput, 
                                    { color: colors.text, borderColor: colors.border, backgroundColor: colors.surfaceElevated },
                                    errors.description && { borderColor: '#EF4444', backgroundColor: '#FEF2F2' }
                                ]}
                                placeholder={getDescriptionPlaceholder(selectedType, selectedSubCategory?.id)}
                                value={description}
                                onChangeText={(val) => { setDescription(val); if (val.length >= 10) setErrors(prev => ({ ...prev, description: '' })); }}
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                                placeholderTextColor={colors.textLight}
                            />
                            {!!errors.description && <Text style={styles.errorTextSmall}>{errors.description}</Text>}
                        </View>
                        <View style={styles.photoRow}>
                            <TouchableOpacity style={[styles.photoBtn, styles.photoBtnDashed, { borderColor: activeColor + '40' }]} onPress={handleTakePhoto}>
                                <Ionicons name="camera" size={16} color={activeColor} />
                                <Text style={[styles.photoBtnText, { color: activeColor }]}>Çek</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.photoBtn, styles.photoBtnDashed, { borderColor: activeColor + '40' }]} onPress={handlePickImage}>
                                <Ionicons name="images" size={16} color={activeColor} />
                                <Text style={[styles.photoBtnText, { color: activeColor }]}>Galeri</Text>
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
                            <Ionicons name="wallet-outline" size={18} color={activeColor} />
                            <TextInput
                                style={[styles.budgetInput, { color: colors.text }]}
                                placeholder="Tahmini bütçe (opsiyonel)"
                                value={budget}
                                onChangeText={setBudget}
                                keyboardType="numeric"
                                placeholderTextColor={colors.textLight}
                            />
                            <Text style={[styles.currency, { color: activeColor }]}>₺</Text>
                        </View>
                    </Card>                    <Button
                        title="Hemen Usta Çağır"
                        onPress={handleSubmit}
                        loading={isLoading}
                        variant="primary"
                        style={[styles.submitBtn, {
                            shadowColor: activeColor,
                        }]}
                        icon={<Ionicons name="flash" size={20} color="#FFF" />}
                    />
                    <View style={styles.safetyRow}>
                        <Ionicons name="shield-checkmark" size={14} color="#10B981" />
                        <Text style={[styles.safetyHint, { color: colors.textSecondary }]}>Güvenliğiniz için ödemeyi uygulama üzerinden yapın.</Text>
                    </View>
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
            />            <Modal visible={showSuccessModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <LinearGradient colors={['rgba(30, 41, 59, 0.98)', 'rgba(15, 23, 42, 0.95)']} style={styles.successModal}>
                        {/* Decorative radial circles */}
                        <View style={[styles.decorCircle, { top: -30, right: -30, width: 120, height: 120, backgroundColor: activeColor + '08' }]} />
                        <View style={[styles.decorCircle, { bottom: -20, left: -20, width: 80, height: 80, backgroundColor: activeColor + '06' }]} />
                        <View style={styles.successIconBox}>
                            <View style={[styles.iconOuterRing, { borderColor: activeColor + '30' }]}>
                                <LinearGradient colors={[activeColor, activeColor + 'CC']} style={styles.iconCircle}>
                                    <Ionicons name="checkmark" size={36} color="#FFF" />
                                </LinearGradient>
                            </View>
                        </View>
                        <Text style={styles.successTitle}>Çağrı Gönderildi!</Text>
                        <Text style={styles.successMessage}>
                            {selectedType ? `${EMERGENCY_TYPES.find(t => t.id === selectedType)?.label || ''} ustası en kısa sürede teklif verecek.` : 'Ustalar en kısa sürede teklif verecek.'}
                        </Text>
                        <Button title="Çağrıyı Takip Et" onPress={() => { setShowSuccessModal(false); router.replace(`/jobs/${createdJobId}`); }} variant="primary" fullWidth />
                    </LinearGradient>
                </View>
            </Modal>

            <PremiumAlert visible={alertConfig.visible} title={alertConfig.title} message={alertConfig.message} type={alertConfig.type} buttons={alertConfig.buttons} onClose={() => setAlertConfig({ ...alertConfig, visible: false })} />
            
            <Modal visible={infoModal.visible} transparent animationType="fade">
                <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
                    <View style={{ width: '85%', backgroundColor: '#FFF', borderRadius: 20, padding: 24, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                            <View style={{ backgroundColor: colors.primary + '15', padding: 8, borderRadius: 12, marginRight: 12 }}>
                                <Ionicons name="information-circle" size={24} color={colors.primary} />
                            </View>
                            <Text style={{ fontFamily: fonts.bold, fontSize: 18, color: '#1E293B' }}>{infoModal.title}</Text>
                        </View>
                        <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: '#64748B', lineHeight: 22, marginBottom: 24 }}>
                            {infoModal.desc}
                        </Text>
                        <Button title="Anladım" onPress={() => setInfoModal({ ...infoModal, visible: false })} variant="primary" fullWidth />
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({    container: { flex: 1 },    scrollView: { flex: 1 },
    content: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 10 },    emergencyBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 18,
        marginBottom: 14,
        elevation: 6,
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },    emergencyIconWrapper: {
        width: 42,
        height: 42,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.35)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },    bannerTextBlock: { flex: 1, minWidth: 0 },
    bannerTitle: { fontFamily: fonts.bold, fontSize: 16, color: '#FFF', letterSpacing: -0.3 },
    bannerSubtitle: { fontFamily: fonts.medium, fontSize: 12, color: 'rgba(255,255,255,0.92)', marginTop: 2, lineHeight: 16 },    bannerBadge: {
        backgroundColor: 'rgba(255,255,255,0.18)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        marginLeft: 8,
    },
    bannerBadgeText: { fontFamily: fonts.bold, fontSize: 11, color: '#FFF', letterSpacing: 0.5 },    sectionLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
        marginTop: 14,
        paddingHorizontal: 2,
    },
    sectionLabelText: {
        fontFamily: fonts.bold,
        fontSize: 14,
        letterSpacing: -0.2,
    },
    stepBadge: {
        width: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepBadgeText: {
        fontFamily: fonts.bold,
        fontSize: 11,
        color: '#FFF',
    },
    sectionDivider: {
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.05)',
        marginVertical: 10,
        marginHorizontal: 4,
    },    typeScrollContent: { gap: 8, paddingVertical: 4, paddingRight: 4, marginBottom: 8 },
    typeBtn: {
        width: 80,
        height: 96,
        backgroundColor: '#FFF',
        borderRadius: 20,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 4,
        position: 'relative',
        shadowColor: 'transparent',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
        elevation: 0,
    },
    typeIconBox: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
    type3dImage: { width: '85%', height: '85%' },
    typeLabel: { fontFamily: fonts.semiBold, fontSize: 10, textAlign: 'center', lineHeight: 13, width: '100%' },
    accentLine: { width: 20, height: 2.5, borderRadius: 2, marginTop: 3 },
    checkIndicator: { position: 'absolute', top: 5, right: 5, width: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },    mainCard: { padding: 14, borderRadius: 18, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, overflow: 'hidden' },
    cardAccentTop: { height: 3, borderRadius: 2, marginBottom: 12, marginHorizontal: -14, marginTop: -14, },
    addressScroll: { flexDirection: 'row', marginBottom: 10 },
    addressChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, marginRight: 8 },
    addressChipText: { fontFamily: fonts.bold, fontSize: 11 },
    row: { flexDirection: 'row', gap: 8, marginBottom: 4 },
    addressInput: { borderRadius: 12, borderWidth: 1, padding: 12, fontFamily: fonts.medium, fontSize: 13, marginTop: 8, minHeight: 48, textAlignVertical: 'top' },
    textArea: { borderRadius: 12, borderWidth: 1, padding: 12, fontFamily: fonts.medium, fontSize: 13, minHeight: 60, textAlignVertical: 'top' },    photoRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    photoBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, borderWidth: 1, borderColor: 'transparent' },
    photoBtnDashed: { borderStyle: 'dashed', borderWidth: 1.5, backgroundColor: 'transparent' },
    photoBtnIconWrap: { width: 0, height: 0 },
    photoBtnText: { fontFamily: fonts.bold, fontSize: 12 },    imgPreview: { width: 48, height: 48, borderRadius: 12, position: 'relative', borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' },
    img: { width: '100%', height: '100%', borderRadius: 11 },
    imgRemove: { position: 'absolute', top: -6, right: -6, backgroundColor: '#FFF', borderRadius: 12, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 3 },
    budgetRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1 },
    budgetInput: { flex: 1, paddingHorizontal: 6, fontFamily: fonts.bold, fontSize: 13 },
    currency: { fontFamily: fonts.bold, fontSize: 14 },    submitBtn: { 
        marginTop: 14, 
        minHeight: 52, 
        borderRadius: 16, 
        shadowOffset: { width: 0, height: 4 }, 
        shadowOpacity: 0.3, 
        shadowRadius: 10, 
        elevation: 8 
    },
    safetyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10, paddingHorizontal: 16 },
    safetyHint: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 15 },    modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.88)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    successModal: { width: '100%', borderRadius: 32, padding: 36, alignItems: 'center', overflow: 'hidden' },
    decorCircle: { position: 'absolute', borderRadius: 999 },
    successIconBox: { marginBottom: 28 },
    iconOuterRing: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, justifyContent: 'center', alignItems: 'center' },
    iconCircle: { width: 76, height: 76, borderRadius: 38, justifyContent: 'center', alignItems: 'center', elevation: 12, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 16 },
    successTitle: { fontFamily: fonts.extraBold, fontSize: 28, color: '#FFF', marginBottom: 10, letterSpacing: -0.5 },
    successMessage: { fontFamily: fonts.medium, fontSize: 15, color: 'rgba(255,255,255,0.82)', textAlign: 'center', marginBottom: 32, lineHeight: 23 },
    subCategoryContainer: {
        marginBottom: 20,
        marginTop: 4,
        paddingHorizontal: 2,
    },
    subCategoryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        marginLeft: 4,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 8,
    },
    subCategoryHeading: {
        fontFamily: fonts.bold,
        fontSize: 13,
    },
    subCategoryScrollContent: {
        paddingRight: 24,
        gap: 10,
    },
    subCategoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 14,
        borderWidth: 1.5,
        backgroundColor: '#FFF',
    },
    subCategoryText: {
        fontFamily: fonts.bold,
        fontSize: 13,
    },
    smallInput: {
        height: 44,
        borderRadius: 12,
        borderWidth: 1.5,
        paddingHorizontal: 12,
        fontFamily: fonts.bold,
        fontSize: 14,
    },
    choiceRow: {
        flexDirection: 'row',
        marginTop: 10,
        gap: 12,
    },
    choiceBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: '#E2E8F0',
        backgroundColor: '#FFF',
        alignItems: 'center',
    },
    choiceBtnActive: {
        borderColor: '#3B82F6',
        backgroundColor: '#EFF6FF',
    },
    choiceBtnText: {
        fontFamily: fonts.bold,
        fontSize: 13,
        color: '#64748B',
    },
    choiceBtnTextActive: {
        color: '#3B82F6',
    },
    errorTextSmall: {
        fontSize: 12,
        color: '#EF4444',
        marginTop: 6,
        marginLeft: 6,
        fontFamily: fonts.bold,
    },
    label: {
        fontFamily: fonts.bold,
        fontSize: 14,
        marginBottom: 8,
    },
    pillContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 6,
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1.5,
        gap: 6,
    },
    pillText: {
        fontFamily: fonts.bold,
        fontSize: 12,
    },    descriptionInput: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 12,
        fontFamily: fonts.medium,
        fontSize: 13,
        minHeight: 60,
        textAlignVertical: 'top',
    },    searchInput: {
        flex: 1,
        height: 38,
        borderRadius: 19,
        borderWidth: 1.5,
        paddingHorizontal: 14,
        fontFamily: fonts.medium,
        fontSize: 13,
        paddingVertical: 0,
    },
    searchCloseBtn: {
        padding: 4,
    },
    searchToggleBtn: {
        padding: 0,
    },
    emptySearchContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 24,
        paddingHorizontal: 16,
        borderRadius: 18,
        borderWidth: 1,
        borderStyle: 'dashed',
        marginHorizontal: 4,
        marginBottom: 8,
    },
    emptySearchText: {
        fontFamily: fonts.medium,
        fontSize: 13,
        textAlign: 'center',
        marginTop: 6,
    },
});
