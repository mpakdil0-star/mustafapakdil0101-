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
        colors: ['#A78BFA', '#7C3AED'],
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
