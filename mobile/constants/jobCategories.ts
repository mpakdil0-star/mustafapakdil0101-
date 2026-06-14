import { colors as staticColors } from './colors';

export interface JobCategory {
    id: string;
    name: string;
    icon: string;
    colors: [string, string, ...string[]];
    parentCategory: string; // Ana hizmet kategorisi (elektrik, cilingir, klima, beyaz-esya, tesisat)
}

/**
 * İş Alt Kategorileri
 * Her ana hizmet kategorisi için alt kategori seçenekleri
 */

// ⚡ ELEKTRİK ALT KATEGORİLERİ
export const ELEKTRIK_CATEGORIES: JobCategory[] = [
    { id: 'elektrik-proje', name: 'Elektrik Proje Çizimi', icon: 'document-text', colors: ['#1E3E64', '#0F2137'], parentCategory: 'elektrik' },
    { id: 'elektrik-tesisat', name: 'Elektrik Tesisatı', icon: 'flash', colors: ['#A78BFA', '#7C3AED'], parentCategory: 'elektrik' },
    { id: 'elektrik-tamir', name: 'Elektrik Tamiri', icon: 'hammer', colors: ['#F87171', '#DC2626'], parentCategory: 'elektrik' },
    { id: 'aydinlatma', name: 'Aydınlatma', icon: 'bulb', colors: ['#FBBF24', '#D97706'], parentCategory: 'elektrik' },
    { id: 'priz-anahtar', name: 'Priz ve Anahtar', icon: 'radio', colors: ['#60A5FA', '#2563EB'], parentCategory: 'elektrik' },
    { id: 'elektrik-panosu', name: 'Elektrik Panosu', icon: 'layers', colors: ['#4ADE80', '#16A34A'], parentCategory: 'elektrik' },
    { id: 'kablo-cekimi', name: 'Kablo Çekimi', icon: 'repeat', colors: ['#FB7185', '#E11D48'], parentCategory: 'elektrik' },
    { id: 'uydu-sistemleri', name: 'Uydu Sistemleri', icon: 'planet', colors: ['#2DD4BF', '#0891B2'], parentCategory: 'elektrik' },
    { id: 'elektrik-kontrol', name: 'Elektrik Kontrolü', icon: 'shield-checkmark', colors: ['#818CF8', '#4F46E5'], parentCategory: 'elektrik' },
    { id: 'elektrik-diger', name: 'Diğer', icon: 'options', colors: ['#94A3B8', '#475569'], parentCategory: 'elektrik' },
];

// 🔑 ÇİLİNGİR ALT KATEGORİLERİ
export const CILINGIR_CATEGORIES: JobCategory[] = [
    { id: 'kapi-acma', name: 'Kapı Açma', icon: 'lock-open', colors: ['#FBBF24', '#D97706'], parentCategory: 'cilingir' },
    { id: 'kilit-degisimi', name: 'Kilit Değişimi', icon: 'lock-closed', colors: ['#F87171', '#DC2626'], parentCategory: 'cilingir' },
    { id: 'anahtar-kopyalama', name: 'Anahtar Kopyalama', icon: 'key', colors: ['#60A5FA', '#2563EB'], parentCategory: 'cilingir' },
    { id: 'kasa-acma', name: 'Kasa Açma', icon: 'briefcase', colors: ['#4ADE80', '#16A34A'], parentCategory: 'cilingir' },
    { id: 'oto-cilingir', name: 'Oto Çilingir', icon: 'car', colors: ['#818CF8', '#4F46E5'], parentCategory: 'cilingir' },
    { id: 'cilingir-diger', name: 'Diğer', icon: 'options', colors: ['#94A3B8', '#475569'], parentCategory: 'cilingir' },
];

// ❄️ KLİMA ALT KATEGORİLERİ
export const KLIMA_CATEGORIES: JobCategory[] = [
    { id: 'klima-montaj', name: 'Klima Montaj', icon: 'construct', colors: ['#60A5FA', '#2563EB'], parentCategory: 'klima' },
    { id: 'klima-bakim', name: 'Klima Bakım', icon: 'build', colors: ['#4ADE80', '#16A34A'], parentCategory: 'klima' },
    { id: 'klima-tamir', name: 'Klima Tamir', icon: 'hammer', colors: ['#F87171', '#DC2626'], parentCategory: 'klima' },
    { id: 'gaz-dolumu', name: 'Gaz Dolumu', icon: 'snow', colors: ['#38BDF8', '#0284C7'], parentCategory: 'klima' },
    { id: 'klima-temizlik', name: 'Klima Temizliği', icon: 'sparkles', colors: ['#2DD4BF', '#0891B2'], parentCategory: 'klima' },
    { id: 'klima-diger', name: 'Diğer', icon: 'options', colors: ['#94A3B8', '#475569'], parentCategory: 'klima' },
];

// 🔧 BEYAZ EŞYA ALT KATEGORİLERİ
export const BEYAZ_ESYA_CATEGORIES: JobCategory[] = [
    { id: 'camasir-makinesi', name: 'Çamaşır Makinesi', icon: 'water', colors: ['#4ADE80', '#16A34A'], parentCategory: 'beyaz-esya' },
    { id: 'bulasik-makinesi', name: 'Bulaşık Makinesi', icon: 'restaurant', colors: ['#60A5FA', '#2563EB'], parentCategory: 'beyaz-esya' },
    { id: 'buzdolabi', name: 'Buzdolabı', icon: 'snow', colors: ['#38BDF8', '#0284C7'], parentCategory: 'beyaz-esya' },
    { id: 'firin-ocak', name: 'Fırın/Ocak', icon: 'flame', colors: ['#F87171', '#DC2626'], parentCategory: 'beyaz-esya' },
    { id: 'kurutma-makinesi', name: 'Kurutma Makinesi', icon: 'sunny', colors: ['#FBBF24', '#D97706'], parentCategory: 'beyaz-esya' },
    { id: 'beyaz-esya-diger', name: 'Diğer', icon: 'options', colors: ['#94A3B8', '#475569'], parentCategory: 'beyaz-esya' },
];

// 💧 TESİSAT ALT KATEGORİLERİ
export const TESISAT_CATEGORIES: JobCategory[] = [
    { id: 'tikaniklik', name: 'Tıkanıklık Açma', icon: 'water', colors: ['#38BDF8', '#0284C7'], parentCategory: 'tesisat' },
    { id: 'su-kacagi', name: 'Su Kaçağı', icon: 'alert-circle', colors: ['#F87171', '#DC2626'], parentCategory: 'tesisat' },
    { id: 'musluk-batarya', name: 'Musluk/Batarya', icon: 'water-outline', colors: ['#60A5FA', '#2563EB'], parentCategory: 'tesisat' },
    { id: 'petek-kombi', name: 'Petek/Kombi', icon: 'flame', colors: ['#FBBF24', '#D97706'], parentCategory: 'tesisat' },
    { id: 'tuvalet-lavabo', name: 'Tuvalet/Lavabo', icon: 'home', colors: ['#4ADE80', '#16A34A'], parentCategory: 'tesisat' },
    { id: 'tesisat-diger', name: 'Diğer', icon: 'options', colors: ['#94A3B8', '#475569'], parentCategory: 'tesisat' },
];

// 🧹 TEMİZLİK ALT KATEGORİLERİ
export const TEMIZLIK_CATEGORIES: JobCategory[] = [
    { id: 'ev-temizligi', name: 'Ev Temizliği (Gündelik)', icon: 'home', colors: ['#A78BFA', '#7C3AED'], parentCategory: 'temizlik' },
    { id: 'ofis-temizligi', name: 'Ofis ve İşyeri Temizliği', icon: 'business', colors: ['#818CF8', '#4F46E5'], parentCategory: 'temizlik' },
    { id: 'insaat-temizligi', name: 'İnşaat Sonrası Temizlik', icon: 'construct', colors: ['#F87171', '#DC2626'], parentCategory: 'temizlik' },
    { id: 'temizlik-diger', name: 'Diğer', icon: 'options', colors: ['#94A3B8', '#475569'], parentCategory: 'temizlik' },
];

// 🚚 NAKLİYAT ALT KATEGORİLERİ
export const NAKLIYAT_CATEGORIES: JobCategory[] = [
    { id: 'ev-tasima', name: 'Ev Taşıma', icon: 'home', colors: ['#FB923C', '#EA580C'], parentCategory: 'nakliyat' },
    { id: 'ofis-tasima', name: 'Ofis Taşıma', icon: 'business', colors: ['#F59E0B', '#D97706'], parentCategory: 'nakliyat' },
    { id: 'esya-paketleme', name: 'Eşya Paketleme', icon: 'cube', colors: ['#FBBF24', '#CA8A04'], parentCategory: 'nakliyat' },
    { id: 'depolama', name: 'Depolama', icon: 'file-tray-stacked', colors: ['#60A5FA', '#2563EB'], parentCategory: 'nakliyat' },
    { id: 'nakliyat-diger', name: 'Diğer', icon: 'options', colors: ['#94A3B8', '#475569'], parentCategory: 'nakliyat' },
];

// 🎨 BOYA BADANA ALT KATEGORİLERİ
export const BOYA_BADANA_CATEGORIES: JobCategory[] = [
    { id: 'ic-cephe-boya', name: 'İç Cephe Boya', icon: 'color-palette', colors: ['#F472B6', '#DB2777'], parentCategory: 'boya-badana' },
    { id: 'dis-cephe-boya', name: 'Dış Cephe Boya', icon: 'color-fill', colors: ['#FB923C', '#EA580C'], parentCategory: 'boya-badana' },
    { id: 'duvar-kagidi', name: 'Duvar Kağıdı', icon: 'image', colors: ['#A78BFA', '#7C3AED'], parentCategory: 'boya-badana' },
    { id: 'dekorasyon', name: 'Dekorasyon', icon: 'sparkles', colors: ['#C084FC', '#9333EA'], parentCategory: 'boya-badana' },
    { id: 'boya-diger', name: 'Diğer', icon: 'options', colors: ['#94A3B8', '#475569'], parentCategory: 'boya-badana' },
];

// 🛋️ KOLTUK VE HALI YIKAMA ALT KATEGORİLERİ
export const KOLTUK_HALI_CATEGORIES: JobCategory[] = [
    { id: 'koltuk-yikama', name: 'Koltuk Yıkama', icon: 'bed', colors: ['#34D399', '#059669'], parentCategory: 'koltuk-hali' },
    { id: 'hali-yikama', name: 'Halı Yıkama', icon: 'grid', colors: ['#4ADE80', '#16A34A'], parentCategory: 'koltuk-hali' },
    { id: 'perde-yikama', name: 'Perde Yıkama', icon: 'albums', colors: ['#60A5FA', '#2563EB'], parentCategory: 'koltuk-hali' },
    { id: 'koltuk-hali-diger', name: 'Diğer', icon: 'options', colors: ['#94A3B8', '#475569'], parentCategory: 'koltuk-hali' },
];

// 🔩 MOBİLYA MONTAJ ALT KATEGORİLERİ
export const MOBILYA_MONTAJ_CATEGORIES: JobCategory[] = [
    { id: 'mobilya-kurulum', name: 'Mobilya Kurulum', icon: 'cube', colors: ['#C084FC', '#9333EA'], parentCategory: 'mobilya-montaj' },
    { id: 'mobilya-demontaj', name: 'Mobilya Demontaj', icon: 'cube-outline', colors: ['#A78BFA', '#7C3AED'], parentCategory: 'mobilya-montaj' },
    { id: 'mutfak-montaj', name: 'Mutfak Montajı', icon: 'restaurant', colors: ['#F87171', '#DC2626'], parentCategory: 'mobilya-montaj' },
    { id: 'mobilya-diger', name: 'Diğer', icon: 'options', colors: ['#94A3B8', '#475569'], parentCategory: 'mobilya-montaj' },
];

// 📦 KÜÇÜK NAKLİYE ALT KATEGORİLERİ
export const KUCUK_NAKLIYE_CATEGORIES: JobCategory[] = [
    { id: 'tek-parca-tasima', name: 'Tek Parça Eşya Taşıma', icon: 'cube-outline', colors: ['#FACC15', '#CA8A04'], parentCategory: 'kucuk-nakliye' },
    { id: 'market-alisveris', name: 'Market/Alışveriş Taşıma', icon: 'cart', colors: ['#4ADE80', '#16A34A'], parentCategory: 'kucuk-nakliye' },
    { id: 'kucuk-nakliye-diger', name: 'Diğer', icon: 'options', colors: ['#94A3B8', '#475569'], parentCategory: 'kucuk-nakliye' },
];

// 🔥 KOMBİ SERVİSİ ALT KATEGORİLERİ
export const KOMBI_SERVIS_CATEGORIES: JobCategory[] = [
    { id: 'kombi-bakim', name: 'Kombi Bakım', icon: 'build', colors: ['#F87171', '#DC2626'], parentCategory: 'kombi-servis' },
    { id: 'kombi-tamir', name: 'Kombi Tamir', icon: 'hammer', colors: ['#FB923C', '#EA580C'], parentCategory: 'kombi-servis' },
    { id: 'kombi-montaj', name: 'Kombi Montaj', icon: 'construct', colors: ['#FBBF24', '#D97706'], parentCategory: 'kombi-servis' },
    { id: 'kombi-diger', name: 'Diğer', icon: 'options', colors: ['#94A3B8', '#475569'], parentCategory: 'kombi-servis' },
];

// 🛗 ASANSÖR BAKIM ALT KATEGORİLERİ
export const ASANSOR_CATEGORIES: JobCategory[] = [
    { id: 'asansor-bakim', name: 'Asansör Bakım', icon: 'build', colors: ['#64748B', '#475569'], parentCategory: 'asansor' },
    { id: 'asansor-tamir', name: 'Asansör Tamir', icon: 'hammer', colors: ['#94A3B8', '#64748B'], parentCategory: 'asansor' },
    { id: 'asansor-montaj', name: 'Asansör Montaj', icon: 'construct', colors: ['#60A5FA', '#2563EB'], parentCategory: 'asansor' },
    { id: 'asansor-diger', name: 'Diğer', icon: 'options', colors: ['#94A3B8', '#475569'], parentCategory: 'asansor' },
];

// 🐛 BÖCEK İLAÇLAMA ALT KATEGORİLERİ
export const BOCEK_ILACLAMA_CATEGORIES: JobCategory[] = [
    { id: 'ev-ilaclama', name: 'Ev İlaçlama', icon: 'home', colors: ['#22D3EE', '#0891B2'], parentCategory: 'bocek-ilaclama' },
    { id: 'isyeri-ilaclama', name: 'İşyeri İlaçlama', icon: 'business', colors: ['#2DD4BF', '#0D9488'], parentCategory: 'bocek-ilaclama' },
    { id: 'bahce-ilaclama', name: 'Bahçe İlaçlama', icon: 'leaf', colors: ['#4ADE80', '#16A34A'], parentCategory: 'bocek-ilaclama' },
    { id: 'ilaclama-diger', name: 'Diğer', icon: 'options', colors: ['#94A3B8', '#475569'], parentCategory: 'bocek-ilaclama' },
];

// 📹 GÜVENLİK KAMERA / ALARM ALT KATEGORİLERİ
export const GUVENLIK_KAMERA_CATEGORIES: JobCategory[] = [
    { id: 'kamera-kurulum', name: 'Kamera Kurulum', icon: 'videocam', colors: ['#818CF8', '#4F46E5'], parentCategory: 'guvenlik-kamera' },
    { id: 'alarm-sistemi', name: 'Alarm Sistemi', icon: 'notifications', colors: ['#F87171', '#DC2626'], parentCategory: 'guvenlik-kamera' },
    { id: 'kamera-bakim', name: 'Kamera Bakım/Onarım', icon: 'build', colors: ['#60A5FA', '#2563EB'], parentCategory: 'guvenlik-kamera' },
    { id: 'guvenlik-diger', name: 'Diğer', icon: 'options', colors: ['#94A3B8', '#475569'], parentCategory: 'guvenlik-kamera' },
];

/**
 * Tüm kategorileri birleştir (eski kodlarla uyumluluk için)
 */
export const JOB_CATEGORIES: JobCategory[] = [
    ...ELEKTRIK_CATEGORIES,
    ...CILINGIR_CATEGORIES,
    ...KLIMA_CATEGORIES,
    ...BEYAZ_ESYA_CATEGORIES,
    ...TESISAT_CATEGORIES,
    ...TEMIZLIK_CATEGORIES,
    ...NAKLIYAT_CATEGORIES,
    ...BOYA_BADANA_CATEGORIES,
    ...KOLTUK_HALI_CATEGORIES,
    ...MOBILYA_MONTAJ_CATEGORIES,
    ...KUCUK_NAKLIYE_CATEGORIES,
    ...KOMBI_SERVIS_CATEGORIES,
    ...ASANSOR_CATEGORIES,
    ...BOCEK_ILACLAMA_CATEGORIES,
    ...GUVENLIK_KAMERA_CATEGORIES,
];

/**
 * Ana kategoriye göre alt kategorileri getir
 */
export const getSubCategoriesByParent = (parentCategory: string): JobCategory[] => {
    switch (parentCategory) {
        case 'elektrik': return ELEKTRIK_CATEGORIES;
        case 'cilingir': return CILINGIR_CATEGORIES;
        case 'klima': return KLIMA_CATEGORIES;
        case 'beyaz-esya': return BEYAZ_ESYA_CATEGORIES;
        case 'tesisat': return TESISAT_CATEGORIES;
        case 'temizlik': return TEMIZLIK_CATEGORIES;
        case 'nakliyat': return NAKLIYAT_CATEGORIES;
        case 'boya-badana': return BOYA_BADANA_CATEGORIES;
        case 'koltuk-hali': return KOLTUK_HALI_CATEGORIES;
        case 'mobilya-montaj': return MOBILYA_MONTAJ_CATEGORIES;
        case 'kucuk-nakliye': return KUCUK_NAKLIYE_CATEGORIES;
        case 'kombi-servis': return KOMBI_SERVIS_CATEGORIES;
        case 'asansor': return ASANSOR_CATEGORIES;
        case 'bocek-ilaclama': return BOCEK_ILACLAMA_CATEGORIES;
        case 'guvenlik-kamera': return GUVENLIK_KAMERA_CATEGORIES;
        default: return ELEKTRIK_CATEGORIES;
    }
};

/**
 * ID'ye göre kategori bilgisi getir
 */
export const getJobCategoryById = (id: string): JobCategory | undefined => {
    return JOB_CATEGORIES.find(cat => cat.id === id);
};

