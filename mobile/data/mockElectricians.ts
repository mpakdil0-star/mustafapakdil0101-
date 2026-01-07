// Mock Electrician Data
// Gerçek uygulama: Bu veriler backend API'den gelecek

export interface MockElectrician {
    id: string;
    name: string;
    rating: number;
    reviewCount: number;
    specialty: string;
    isVerified: boolean;
    location: string;
    city: string;
    experience: string;
    about: string;
    services: string[];
    completedJobs: number;
    responseTime: string;
    isAvailable?: boolean;
    imageUrl?: string;
    latestReview?: {
        user: string;
        comment: string;
    };
}

export const MOCK_ELECTRICIANS: MockElectrician[] = [
    {
        id: '1',
        name: 'Ahmet Yılmaz',
        rating: 4.8,
        reviewCount: 124,
        specialty: 'Elektrik Tesisatı',
        isVerified: true,
        location: 'Kadıköy, İstanbul',
        city: 'İstanbul',
        experience: '12 yıl',
        imageUrl: 'https://randomuser.me/api/portraits/men/1.jpg',
        about: 'Elektrik tesisatı konusunda 12 yıllık deneyime sahip, sertifikalı elektrik ustası. Konut ve işyeri elektrik işlerinde uzmanım.',
        services: [
            'Elektrik Tesisatı Kurulumu',
            'Arıza Tespiti ve Onarım',
            'Aydınlatma Sistemleri',
            'Pano ve Sigorta İşleri',
        ],
        completedJobs: 156,
        responseTime: '2 saat',
        latestReview: {
            user: 'Hakan K.',
            comment: 'Harika bir usta, çok hızlı ve temiz çalıştı. Kesinlikle tavsiye ederim.',
        },
    },
    {
        id: '2',
        name: 'Mehmet Demir',
        rating: 4.9,
        reviewCount: 89,
        specialty: 'Avize & Aydınlatma',
        isVerified: true,
        location: 'Üsküdar, İstanbul',
        city: 'İstanbul',
        experience: '8 yıl',
        imageUrl: 'https://randomuser.me/api/portraits/men/2.jpg',
        about: 'Avize montajı ve aydınlatma sistemleri konusunda uzman elektrikçi. Özel dekoratif aydınlatma çözümleri sunuyorum.',
        services: [
            'Avize Montajı',
            'LED Aydınlatma',
            'Akıllı Aydınlatma Sistemleri',
            'Dekoratif Işıklandırma',
        ],
        completedJobs: 98,
        responseTime: '1 saat',
        latestReview: {
            user: 'Selin G.',
            comment: 'Avize montajını 15 dakikada tertemiz yaptı. Çok profesyonel.',
        },
    },
    {
        id: '3',
        name: 'Ayşe Kaya',
        rating: 4.7,
        reviewCount: 56,
        specialty: 'Tamirat & Tadilat',
        isVerified: false,
        location: 'Çankaya, Ankara',
        city: 'Ankara',
        experience: '5 yıl',
        imageUrl: 'https://randomuser.me/api/portraits/women/3.jpg',
        about: 'Elektrik tamirat ve tadilat işlerinde deneyimli elektrikçi. Hızlı ve güvenilir hizmet sunuyorum.',
        services: [
            'Elektrik Tamiratı',
            'Priz ve Anahtar Değişimi',
            'Kablo Yenileme',
            'Acil Arıza Müdahalesi',
        ],
        completedJobs: 67,
        responseTime: '3 saat',
        latestReview: {
            user: 'Murat A.',
            comment: 'Priz arızasını anında çözdü, işinin ehli bir usta.',
        },
    },
    {
        id: '4',
        name: 'Ali Çelik',
        rating: 4.6,
        reviewCount: 72,
        specialty: 'Priz & Anahtar',
        isVerified: true,
        location: 'Konak, İzmir',
        city: 'İzmir',
        experience: '10 yıl',
        imageUrl: 'https://randomuser.me/api/portraits/men/4.jpg',
        about: 'Priz, anahtar ve elektrik aksesuarları montajında uzman. Kaliteli ve uygun fiyatlı hizmet.',
        services: [
            'Priz Montajı',
            'Anahtar ve Dimmer',
            'Dış Mekan Prizleri',
            'Akıllı Priz Sistemleri',
        ],
        completedJobs: 134,
        responseTime: '2 saat',
        latestReview: {
            user: 'Ebru B.',
            comment: 'Tüm anahtar takımını bir günde değiştirdi, eline sağlık.',
        },
    },
    {
        id: '5',
        name: 'Zeynep Aydın',
        rating: 4.8,
        reviewCount: 93,
        specialty: 'Akıllı Ev Sistemleri',
        isVerified: true,
        location: 'Nilüfer, Bursa',
        city: 'Bursa',
        experience: '6 yıl',
        imageUrl: 'https://randomuser.me/api/portraits/women/5.jpg',
        about: 'Akıllı ev sistemleri ve otomasyon konusunda uzman. Modern teknolojilerle entegre elektrik çözümleri.',
        services: [
            'Akıllı Ev Sistemleri',
            'Otomasyon Kurulumu',
            'Sesli Kontrol Sistemleri',
            'Enerji Yönetimi',
        ],
        completedJobs: 112,
        responseTime: '4 saat',
        isAvailable: true,
        latestReview: {
            user: 'Can Y.',
            comment: 'Akıllı ev sistemleri konusunda gerçekten uzman, vizyoner bir bakış açısı var.',
        },
    },
    {
        id: '6',
        name: 'Murat Yıldız',
        rating: 4.9,
        reviewCount: 42,
        specialty: 'Arıza & Tamir',
        isVerified: true,
        location: 'Seyhan, Adana',
        city: 'Adana',
        experience: '15 yıl',
        imageUrl: 'https://randomuser.me/api/portraits/men/6.jpg',
        about: 'Adana genelinde 15 yıllık tecrübemle her türlü elektrik arızasına hızlı müdahale ediyorum.',
        services: ['Arıza Onarım', 'Pano Tamiri', 'Tesisat Yenileme'],
        completedJobs: 210,
        responseTime: '30 dk',
    },
    {
        id: '7',
        name: 'Hüseyin Demir',
        rating: 4.7,
        reviewCount: 28,
        specialty: 'Klima Elektriği',
        isVerified: false,
        location: 'Çukurova, Adana',
        city: 'Adana',
        experience: '10 yıl',
        imageUrl: 'https://randomuser.me/api/portraits/men/7.jpg',
        about: 'Klima elektrik tesisatı ve bakımında uzmanım. Çukurova bölgesinde hizmet veriyorum.',
        services: ['Klima Tesisatı', 'Bakım', 'Montaj'],
        completedJobs: 85,
        responseTime: '1 saat',
    },
    {
        id: '8',
        name: 'Kemal Öztürk',
        rating: 4.5,
        reviewCount: 15,
        specialty: 'Aydınlatma',
        isVerified: true,
        location: 'Yüreğir, Adana',
        city: 'Adana',
        experience: '4 yıl',
        imageUrl: 'https://randomuser.me/api/portraits/men/8.jpg',
        about: 'Yüreğir bölgesinde aydınlatma ve led spot işleriniz itina ile yapılır.',
        services: ['LED Spot', 'Avize', 'Bahçe Aydınlatma'],
        completedJobs: 45,
        responseTime: '15 dk',
    },
    {
        id: '9',
        name: 'Fatma Yılmaz',
        rating: 5.0,
        reviewCount: 30,
        specialty: 'Genel Elektrik',
        isVerified: true,
        location: 'Sarıçam, Adana',
        city: 'Adana',
        experience: '7 yıl',
        imageUrl: 'https://randomuser.me/api/portraits/women/9.jpg',
        about: 'Sarıçam ve çevresinde her türlü elektrik arızasına 7/24 hizmet.',
        services: ['Arıza', 'Montaj', 'Bakım'],
        completedJobs: 90,
        responseTime: '20 dk',
    },
];

// Helper function to get electrician by ID
export const getElectricianById = (id: string): MockElectrician | undefined => {
    return MOCK_ELECTRICIANS.find(e => e.id === id);
};

// Get featured electricians (first 5, optionally filtered by city/cities)
export const getFeaturedElectricians = (cityQuery?: string | string[]) => {
    if (!cityQuery || (Array.isArray(cityQuery) && cityQuery.length === 0)) {
        return MOCK_ELECTRICIANS.slice(0, 5);
    }

    const normalize = (str: string) => str.toLocaleLowerCase('tr-TR').trim();
    const searchCities = Array.isArray(cityQuery)
        ? cityQuery.map(normalize)
        : [normalize(cityQuery)];

    const filtered = MOCK_ELECTRICIANS.filter(
        e => {
            const eCity = normalize(e.city);
            return searchCities.some(sc => eCity === sc || eCity.includes(sc) || sc.includes(eCity));
        }
    );

    // If no electricians found in city, return general featured ones as fallback
    if (filtered.length === 0) {
        return MOCK_ELECTRICIANS.slice(0, 5);
    }

    return filtered.slice(0, 5);
};
