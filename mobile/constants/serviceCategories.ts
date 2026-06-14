import { colors as staticColors } from './colors';

export interface ServiceCategory {
    id: string;
    name: string;
    icon: string;
    colors: [string, string];
    description: string;
}

/**
 * Ana Hizmet Kategorileri (Meslekler)
 * Her usta kayıt olurken bir veya birden fazla kategoride uzmanlaşabilir.
 */
export const SERVICE_CATEGORIES: ServiceCategory[] = [
    {
        id: 'elektrik',
        name: 'Elektrik',
        icon: 'flash',
        colors: ['#2DD4BF', '#0D9488'],
        description: 'Elektrik tesisatı, tamir, aydınlatma ve pano işleri',
    },
    {
        id: 'cilingir',
        name: 'Çilingir',
        icon: 'key',
        colors: ['#FBBF24', '#D97706'],
        description: 'Kapı açma, kilit değişimi, anahtar kopyalama',
    },
    {
        id: 'klima',
        name: 'Klima',
        icon: 'snow',
        colors: ['#60A5FA', '#2563EB'],
        description: 'Klima montaj, bakım, onarım ve gaz dolumu',
    },
    {
        id: 'beyaz-esya',
        name: 'Beyaz Eşya',
        icon: 'construct',
        colors: ['#4ADE80', '#16A34A'],
        description: 'Çamaşır makinesi, buzdolabı, bulaşık makinesi tamiri',
    },
    {
        id: 'tesisat',
        name: 'Su/Tesisat',
        icon: 'water',
        colors: ['#38BDF8', '#0284C7'],
        description: 'Tıkanıklık açma, su kaçağı, musluk ve sıhhi tesisat',
    },
    {
        id: 'temizlik',
        name: 'Temizlik',
        icon: 'sparkles',
        colors: ['#A78BFA', '#7C3AED'],
        description: 'Ev temizliği, ofis temizliği, inşaat sonrası temizlik',
    },
    {
        id: 'nakliyat',
        name: 'Evden Eve Nakliyat',
        icon: 'car',
        colors: ['#FB923C', '#EA580C'],
        description: 'Ev ve ofis taşıma, eşya paketleme, nakliye hizmetleri',
    },
    {
        id: 'boya-badana',
        name: 'Boya Badana',
        icon: 'color-palette',
        colors: ['#F472B6', '#DB2777'],
        description: 'İç cephe, dış cephe boya, dekorasyon ve duvar kağıdı',
    },
    {
        id: 'koltuk-hali',
        name: 'Koltuk/Halı Yıkama',
        icon: 'bed',
        colors: ['#34D399', '#059669'],
        description: 'Koltuk yıkama, halı yıkama, perde yıkama hizmetleri',
    },
    {
        id: 'mobilya-montaj',
        name: 'Mobilya Montaj',
        icon: 'cube',
        colors: ['#C084FC', '#9333EA'],
        description: 'Mobilya kurulum, montaj ve demontaj hizmetleri',
    },
    {
        id: 'kucuk-nakliye',
        name: 'Küçük Nakliye',
        icon: 'cube-outline',
        colors: ['#FACC15', '#CA8A04'],
        description: 'Tek parça eşya taşıma, küçük nakliye hizmetleri',
    },
    {
        id: 'kombi-servis',
        name: 'Kombi Servisi',
        icon: 'flame',
        colors: ['#F87171', '#DC2626'],
        description: 'Kombi bakım, onarım, montaj ve arıza giderme',
    },
    {
        id: 'asansor',
        name: 'Asansör Bakım',
        icon: 'swap-vertical',
        colors: ['#64748B', '#475569'],
        description: 'Asansör bakım, tamir ve periyodik kontrol hizmetleri',
    },
    {
        id: 'bocek-ilaclama',
        name: 'Böcek İlaçlama',
        icon: 'bug',
        colors: ['#22D3EE', '#0891B2'],
        description: 'Haşere ilaçlama, böcek ve kemirgen mücadele',
    },
    {
        id: 'guvenlik-kamera',
        name: 'Güvenlik Kamera',
        icon: 'videocam',
        colors: ['#818CF8', '#4F46E5'],
        description: 'Güvenlik kamerası, alarm sistemi kurulum ve bakım',
    },
];

/**
 * ID'ye göre kategori bilgisi getir
 */
export const getServiceCategoryById = (id: string): ServiceCategory | undefined => {
    return SERVICE_CATEGORIES.find(cat => cat.id === id);
};

/**
 * Varsayılan kategori (elektrik)
 */
export const DEFAULT_SERVICE_CATEGORY = 'elektrik';
