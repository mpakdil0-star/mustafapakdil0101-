export interface WebCategory { id: string; name: string; icon: string; description: string; badge?: string; popular?: boolean; }

export const MAIN_CATEGORIES: WebCategory[] = [
  { id: 'elektrik', name: 'Elektrik & Aydınlatma', icon: 'Zap', description: 'Şalter, priz, avize montajı, elektrik arıza & tesisat', popular: true, badge: 'Hızlı Usta' },
  { id: 'cilingir', name: 'Acil Çilingir & Kilit', icon: 'KeyRound', description: 'Kapı açma, kilit ve göbek değişimi, oto çilingir', popular: true, badge: '7/24 Acil' },
  { id: 'tesisat', name: 'Su & Sıhhi Tesisat', icon: 'Droplets', description: 'Su kaçağı tespiti, tıkanıklık açma, batarya & musluk', popular: true },
  { id: 'klima', name: 'Klima & Havalandırma', icon: 'Snowflake', description: 'Klima montaj, gaz dolumu, periyodik bakım ve arıza', popular: true },
  { id: 'kombi-servis', name: 'Kombi Servisi & Petek', icon: 'Flame', description: 'Kombi arıza, yıllık bakım, petek temizleme ve montaj', popular: false },
  { id: 'beyaz-esya', name: 'Beyaz Eşya Servisi', icon: 'Wrench', description: 'Çamaşır makinesi, buzdolabı, bulaşık makinesi tamiri', popular: false },
  { id: 'temizlik', name: 'Ev & Ofis Temizliği', icon: 'Sparkles', description: 'Detaylı ev temizliği, inşaat sonrası temizlik, cam', popular: false },
  { id: 'boya-badana', name: 'Boya & Badana', icon: 'Paintbrush', description: 'İç cephe boya, alçı tamiratı, dekoratif boya işleri', popular: false },
  { id: 'mobilya-montaj', name: 'Mobilya Montaj', icon: 'Hammer', description: 'Gardırop, masa, dolap montajı ve demonte kurulum', popular: false }
];

export const POPULAR_CITIES = ['Adana', 'İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Mersin', 'Gaziantep'];
