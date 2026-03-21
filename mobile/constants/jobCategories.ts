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
    { id: 'elektrik-proje', name: 'Elektrik Proje Çizimi', icon: 'document-text', colors: ['#3B82F6', '#1E3A8A'], parentCategory: 'elektrik' },
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

/**
 * Tüm kategorileri birleştir (eski kodlarla uyumluluk için)
 */
export const JOB_CATEGORIES: JobCategory[] = [
    ...ELEKTRIK_CATEGORIES,
    ...CILINGIR_CATEGORIES,
    ...KLIMA_CATEGORIES,
    ...BEYAZ_ESYA_CATEGORIES,
    ...TESISAT_CATEGORIES,
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
        default: return ELEKTRIK_CATEGORIES;
    }
};

/**
 * ID'ye göre kategori bilgisi getir
 */
export const getJobCategoryById = (id: string): JobCategory | undefined => {
    return JOB_CATEGORIES.find(cat => cat.id === id);
};

