// Türkiye'nin şehir, ilçe ve mahalle verileri
export interface City {
  name: string;
  districts: District[];
}

export interface District {
  name: string;
  neighborhoods: string[];
}

export const TURKISH_CITIES: City[] = [
  {
    name: 'İstanbul',
    districts: [
      {
        name: 'Kadıköy',
        neighborhoods: [
          'Acıbadem',
          'Bostancı',
          'Caddebostan',
          'Fenerbahçe',
          'Göztepe',
          'Hasanpaşa',
          'Kozyatağı',
          'Moda',
          'Suadiye',
          'Üsküdar',
        ],
      },
      {
        name: 'Beşiktaş',
        neighborhoods: [
          'Abbasağa',
          'Arnavutköy',
          'Bebek',
          'Etiler',
          'Levent',
          'Ortaköy',
          'Ulus',
          'Vişnezade',
        ],
      },
      {
        name: 'Şişli',
        neighborhoods: [
          'Bomonti',
          'Feriköy',
          'Halaskargazi',
          'Harbiye',
          'Kurtuluş',
          'Mecidiyeköy',
          'Pangaltı',
        ],
      },
      {
        name: 'Beyoğlu',
        neighborhoods: [
          'Cihangir',
          'Galata',
          'Karaköy',
          'Taksim',
          'Tophane',
        ],
      },
      {
        name: 'Ümraniye',
        neighborhoods: [
          'Adem Yavuz',
          'Atakent',
          'Çakmak',
          'Yamanevler',
          'Yenişehir',
        ],
      },
      {
        name: 'Kartal',
        neighborhoods: [
          'Cumhuriyet',
          'Gümüşpınar',
          'Karlıktepe',
          'Sarıgazi',
          'Yukarı',
        ],
      },
      {
        name: 'Pendik',
        neighborhoods: [
          'Bahçelievler',
          'Ertuğrul Gazi',
          'Fevzi Çakmak',
          'Güzelyalı',
          'Kurtköy',
        ],
      },
      {
        name: 'Bakırköy',
        neighborhoods: [
          'Ataköy',
          'Basınköy',
          'Cevizlik',
          'Yeşilköy',
          'Yeşilyurt',
        ],
      },
    ],
  },
  {
    name: 'Ankara',
    districts: [
      {
        name: 'Çankaya',
        neighborhoods: [
          'Ahlatlıbel',
          'Bahçelievler',
          'Kızılay',
          'Kavaklıdere',
          'Yenimahalle',
        ],
      },
      {
        name: 'Keçiören',
        neighborhoods: [
          'Akpınar',
          'Aktepe',
          'Etlik',
          'Gümüşdere',
          'Yenidoğan',
        ],
      },
      {
        name: 'Yenimahalle',
        neighborhoods: [
          'Demetevler',
          'Karşıyaka',
          'Şentepe',
          'Yıldırım Beyazıt',
        ],
      },
    ],
  },
  {
    name: 'İzmir',
    districts: [
      {
        name: 'Bornova',
        neighborhoods: [
          'Atatürk',
          'Erzene',
          'Evka-3',
          'Naldöken',
          'Yunus Emre',
        ],
      },
      {
        name: 'Karşıyaka',
        neighborhoods: [
          'Alaybey',
          'Bostanlı',
          'Çiğli',
          'İnciraltı',
          'Nergiz',
        ],
      },
      {
        name: 'Konak',
        neighborhoods: [
          'Alsancak',
          'Basmane',
          'Güzelyalı',
          'Kahramanlar',
          'Mithatpaşa',
        ],
      },
    ],
  },
  {
    name: 'Bursa',
    districts: [
      {
        name: 'Osmangazi',
        neighborhoods: [
          'Alacahırka',
          'Bağlarbaşı',
          'Demirtaş',
          'Hamitler',
          'Hocaalizade',
        ],
      },
      {
        name: 'Nilüfer',
        neighborhoods: [
          'Çalı',
          'Fethiye',
          'Konak',
          'Üçevler',
          'Yıldırım',
        ],
      },
    ],
  },
  {
    name: 'Antalya',
    districts: [
      {
        name: 'Muratpaşa',
        neighborhoods: [
          'Altındağ',
          'Çaybaşı',
          'Fener',
          'Kalkınma',
          'Lara',
        ],
      },
      {
        name: 'Kepez',
        neighborhoods: [
          'Barış',
          'Çamlıbel',
          'Özcan',
          'Yeni Doğan',
        ],
      },
    ],
  },
  {
    name: 'Adana',
    districts: [
      {
        name: 'Seyhan',
        neighborhoods: [
          'Bahçeşehir',
          'Kurtuluş',
          'Reşatbey',
          'Yenibaraj',
        ],
      },
      {
        name: 'Çukurova',
        neighborhoods: [
          'Kurtuluş',
          'Kılıçarslan',
          'Yeni Doğan',
        ],
      },
    ],
  },
];

// Şehir listesi (sadece isimler)
export const CITY_NAMES = TURKISH_CITIES.map(city => city.name);

// Şehre göre ilçe listesi
export const getDistrictsByCity = (cityName: string): string[] => {
  const city = TURKISH_CITIES.find(c => c.name === cityName);
  return city ? city.districts.map(d => d.name) : [];
};

// Şehir ve ilçeye göre mahalle listesi
export const getNeighborhoodsByCityAndDistrict = (
  cityName: string,
  districtName: string
): string[] => {
  const city = TURKISH_CITIES.find(c => c.name === cityName);
  if (!city) return [];
  
  const district = city.districts.find(d => d.name === districtName);
  return district ? district.neighborhoods : [];
};

