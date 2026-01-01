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
      { name: 'Kadıköy', neighborhoods: ['Acıbadem', 'Bostancı', 'Caddebostan', 'Caferağa', 'Eğitim', 'Erenköy', 'Fenerbahçe', 'Feneryolu', 'Fikirtepe', 'Göztepe', 'Hasanpaşa', 'Koşuyolu', 'Kozyatağı', 'Merdivenköy', '19 Mayıs', 'Osmanağa', 'Rasimpaşa', 'Sahrayıcedit', 'Suadiye', 'Zühtüpaşa'] },
      { name: 'Beşiktaş', neighborhoods: ['Abbasağa', 'Akatlar', 'Arnavutköy', 'Balmumcu', 'Bebek', 'Cihannüma', 'Dikilitaş', 'Etiler', 'Gayrettepe', 'Konaklar', 'Kuruçeşme', 'Kültür', 'Levazım', 'Levent', 'Mecidiye', 'Muradiye', 'Nisbetiye', 'Ortaköy', 'Sinanpaşa', 'Türkali', 'Ulus', 'Vişnezade', 'Yıldız'] },
      { name: 'Şişli', neighborhoods: ['19 Mayıs', 'Bozkurt', 'Cumhuriyet', 'Duatepe', 'Ergenekon', 'Esentepe', 'Eskişehir', 'Feriköy', 'Fulya', 'Gülbahar', 'Halaskargazi', 'Halide Edip Adıvar', 'Halil Rıfat Paşa', 'Harbiye', 'İnönü', 'İzzetpaşa', 'Kaptanpaşa', 'Kuştepe', 'Mahmut Şevket Paşa', 'Mecidiyeköy', 'Merkez', 'Meşrutiyet', 'Paşa', 'Teşvikiye', 'Yayla'] },
      { name: 'Beyoğlu', neighborhoods: ['Arap Cami', 'Asmalı Mescit', 'Bedrettin', 'Bereketzade', 'Cihangir', 'Fetihtepe', 'Gümüşsuyu', 'Hacıahmet', 'Halıcıoğlu', 'Hüseyinağa', 'İstiklal', 'Kaptanpaşa', 'Karaköy', 'Katip Mustafa Çelebi', 'Kuloğlu', 'Örnektepe', 'Piri Paşa', 'Şahkulu', 'Sütlüce', 'Tomtom'] },
      { name: 'Üsküdar', neighborhoods: ['Acıbadem', 'Altunizade', 'Ayazma', 'Bahçelievler', 'Barbaros', 'Beylerbeyi', 'Bulgurlu', 'Burhaniye', 'Cumhuriyet', 'Çengelköy', 'Ferah', 'Güzeltepe', 'İcladiye', 'Kandilli', 'Kısıklı', 'Kirazlıtepe', 'Kuleli', 'Kuzguncuk', 'Küçük Çamlıca', 'Küçüksu', 'Kuleli', 'Mimar Sinan', 'Murat Reis', 'Salacak', 'Selimiye', 'Sultantepe', 'Vani Köy', 'Yavuztürk', 'Zeynep Kamil'] },
      { name: 'Ümraniye', neighborhoods: ['Adem Yavuz', 'Altınşehir', 'Armağan Evler', 'Aşağı Dudullu', 'Atakent', 'Atatürk', 'Çakmak', 'Çamlık', 'Dumlupınar', 'Elmalıkent', 'Esenevler', 'Esenkent', 'Esenşehir', 'Fatih Sultan Mehmet', 'Hekimbaşı', 'Huzur', 'Ihlamurkuyu', 'İnkılap', 'İstiklal', 'Kazım Karabekir', 'Madenler', 'Mehmet Akif', 'Namık Kemal', 'Necip Fazıl', 'Parseller', 'Saray', 'Site', 'Şerifali', 'Tantavi', 'Tatlısu', 'Tepeüstü', 'Topağacı', 'Yaman Evler', 'Yenişehir', 'Yukarı Dudullu'] },
      { name: 'Ataşehir', neighborhoods: ['Aşık Veysel', 'Atatürk', 'Barbaros', 'Esatpaşa', 'Ferhatpaşa', 'Fetih', 'İçerenköy', 'İnönü', 'Kayışdağı', 'Küçükbakkalköy', 'Mevlana', 'Mimar Sinan', 'Mustafa Kemal', 'Örnek', 'Yeni Çamlıca', 'Yeni Sahra', 'Yenişehir'] },
      { name: 'Bakırköy', neighborhoods: ['Ataköy 1. Kısım', 'Ataköy 2-5-6. Kısım', 'Ataköy 3-4-11. Kısım', 'Ataköy 7-8-9-10. Kısım', 'Basınköy', 'Cevizlik', 'Kartaltepe', 'Osmaniye', 'Sakızağacı', 'Şenlikköy', 'Yenimahalle', 'Yeşilköy', 'Yeşilyurt', 'Zeytinlik', 'Zuhuratbaba'] },
      { name: 'Bahçelievler', neighborhoods: ['Bahçelievler', 'Cumhuriyet', 'Çobançeşme', 'Fevzi Çakmak', 'Hürriyet', 'Kocasinan Merkez', 'Siyavuşpaşa', 'Soğanlı', 'Şirinevler', 'Yenibosna Merkez', 'Zafer'] },
      { name: 'Esenyurt', neighborhoods: ['Akçaburgaz', 'Akevler', 'Akşemseddin', 'Ardıçlı', 'Aşık Veysel', 'Atatürk', 'Bağlarçeşme', 'Balıkyolu', 'Barbaros Hayrettin Paşa', 'Battalgazi', 'Cumhuriyet', 'Çınar', 'Doğan Araslı', 'Esenyurt', 'Fatih', 'Gökevler', 'Güzelyurt', 'Hürriyet', 'İncirtepe', 'İnönü', 'İstiklal', 'Mevlana', 'Mehtap', 'Merkez', 'Namık Kemal', 'Necip Fazıl Kısakürek', 'Orhangazi', 'Osmangazi', 'Örnek', 'Pınar', 'Piri Reis', 'Saadetdere', 'Selahaddin Eyyubi', 'Sultaniye', 'Süleymaniye', 'Şehitler', 'Talataşa', 'Turgut Özal', 'Üçevler', 'Yenikent', 'Yeşilkent', 'Yunus Emre', 'Zafer'] },
      { name: 'Küçükçekmece', neighborhoods: ['Atakent', 'Atatürk', 'Beşyol', 'Cennet', 'Cumhuriyet', 'Fatih', 'Fevzi Çakmak', 'Gültepe', 'Halkalı Merkez', 'İnönü', 'Istasyon', 'Kanarya', 'Kartaltepe', 'Kemalpaşa', 'Mehmet Akif', 'Sultan Murat', 'Tevfik Bey', 'Yarımburgaz', 'Yenimahalle', 'Yeşilova'] },
      { name: 'Kartal', neighborhoods: ['Atalar', 'Cevizli', 'Cumhuriyet', 'Çavuşoğlu', 'Esentepe', 'Gümüşpınar', 'Hürriyet', 'Karlıktepe', 'Kordonboyu', 'Orhantepe', 'Orta', 'Petrol İş', 'Soğanlık Yeni', 'Uğurmumcu', 'Yakacık Çarşı', 'Yakacık Yeni', 'Yalı', 'Yukarı', 'Yunusemre'] },
      { name: 'Maltepe', neighborhoods: ['Altayçeşme', 'Altıntepe', 'Aydınevler', 'Bağlarbaşı', 'Başıbüyük', 'Büyükbakkalköy', 'Cevizli', 'Çınar', 'Esenkent', 'Feyzullah', 'Fındıklı', 'Girne', 'Gülensu', 'Gülsuyu', 'İdealtepe', 'Küçükyalı', 'Yalı', 'Zümrütevler'] },
      { name: 'Pendik', neighborhoods: ['Ahmet Yesevi', 'Bahçelievler', 'Batı', 'Çamçeşme', 'Çamlık', 'Çınardere', 'Doğu', 'Dumlupınar', 'Ertuğrul Gazi', 'Esenler', 'Esenyalı', 'Fatih Center', 'Fevzi Çakmak', 'Güllü Bağlar', 'Güzelyalı', 'Harmandere', 'Kavakpınar', 'Kaynarca', 'Kurtköy', 'Orhangazi', 'Orta', 'Ramizooğlu', 'Sanayi', 'Sapan Bağları', 'Sülüntepe', 'Şeyhli', 'Velibaba', 'Yayalar', 'Yeni Mahalle', 'Yeşilbağlar'] },
    ],
  },
  {
    name: 'Ankara',
    districts: [
      { name: 'Çankaya', neighborhoods: ['100. Yıl', 'Ahlatlıbel', 'Anıttepe', 'Ayrancı', 'Bahçelievler', 'Balanbat', 'Barbaros', 'Birlik', 'Cebeci', 'Çankaya', 'Dikmen', 'Emek', 'Esat', 'Gaziosmanpaşa', 'Güvenevler', 'Huzur', 'İlker', 'İncek', 'Kavaklıdere', 'Kırkkonaklar', 'Kızılay', 'Maltepe', 'Mebusevleri', 'Mürsel Uluç', 'Naci Çakır', 'Oran', 'Öveçler', 'Sancak', 'Sokullu Mehmet Paşa', 'Tunalı Hilmi', 'Yıldızevler', 'Yukarı Ayrancı'] },
      { name: 'Keçiören', neighborhoods: ['19 Mayıs', '23 Nisan', 'Adnan Menderes', 'Aktepe', 'Aşağı Eğlence', 'Ayvalı', 'Bademlik', 'Bağlarbaşı', 'Basınevleri', 'Çaldıran', 'Çiçekli', 'Etlik', 'Gümüşdere', 'Güzelyurt', 'Hasköy', 'İncirli', 'Kalaba', 'Kamil Ocak', 'Kanuni', 'Kuşcağız', 'Osmangazi', 'Ovacık', 'Pınarbaşı', 'Şefkat', 'Tepebaşı', 'Uyanış', 'Yakapınar', 'Yayla', 'Yeşilöz', 'Yükseltepe'] },
      { name: 'Yenimahalle', neighborhoods: ['Batıkent', 'Beştepe', 'Çamlıca', 'Demetevler', 'Ergazi', 'Gazi', 'İvedik', 'Karşıyaka', 'Kardelen', 'Macun', 'Ostim', 'Şentepe', 'Turgut Özal', 'Uğurmumcu', 'Varlık', 'Yeni Batı', 'Yenimahalle'] },
      { name: 'Etimesgut', neighborhoods: ['Ahi Mesut', 'Alsancak', 'Altay', 'Atakent', 'Bağlıca', 'Bahçekapı', 'Elvan', 'Erler', 'Eryaman', 'Etiler', 'Istasyon', 'Kazım Karabekir', 'Oğuzlar', 'Piyade', 'Şehit Osman Avcı', 'Topçu', 'Tunahan', 'Yavuz Selim', 'Yeşilova'] },
      { name: 'Sincan', neighborhoods: ['Ahi Evran', 'Akşemsettin', 'Andiçen', 'Atatürk', 'Cumhuriyet', 'Fatih', 'Gazi Osman Paşa', 'Gökçek', 'Malazgirt', 'Mevlana', 'Osmanlı', 'Pınarbaşı', 'Selçuklu', 'Tandoğan', 'Yenikent'] },
      { name: 'Mamak', neighborhoods: ['Akdere', 'Aşık Veysel', 'Bahçeleriçi', 'Boğaziçi', 'Demirlibahçe', 'Ege', 'Gülveren', 'İstasyon', 'Kayaş', 'Kıbrıs', 'Köstence', 'Lalahan', 'Mutlu', 'Peyas', 'Şafaktepe', 'Tuzluçayır', 'Yeni Bayındır', 'Yeşilbayır'] },
      { name: 'Gölbaşı', neighborhoods: ['Bahçelievler', 'Eymir', 'Gazi Osman Paşa', 'Hacıhasan', 'İncek', 'Karşıyaka', 'Kızılcaşar', 'Örencik', 'Seğmenler', 'Şafak', 'Yavuz Selim'] },
      { name: 'Pursaklar', neighborhoods: ['Ayyıldız', 'Fatih', 'Karaköy', 'Merkez', 'Mimar Sinan', 'Saray', 'Yunus Emre'] },
    ],
  },
  {
    name: 'İzmir',
    districts: [
      { name: 'Konak', neighborhoods: ['Alsancak', 'Altay', 'Atilla', 'Barbaros', 'Basmane', 'Boğaziçi', 'Çankaya', 'Eşrefpaşa', 'Göztepe', 'Güzelyalı', 'Hilal', 'Kadifekale', 'Kahramanlar', 'Kemeraltı', 'Kılıç Reis', 'Kordon', 'Küçükyalı', 'Mecidiye', 'Mithatpaşa', 'Murat Reis', 'Namık Kemal', 'Piri Reis', 'Turgut Reis', 'Üçkuyular', 'Varyant', 'Yenişehir'] },
      { name: 'Karşıyaka', neighborhoods: ['Alaybey', 'Atakent', 'Bahariye', 'Bahçelievler', 'Bahriye Üçok', 'Bostanlı', 'Cumhuriyet', 'Dedebaşı', 'Demirköprü', 'Donanmacı', 'Fikri Altay', 'Goncalar', 'İmbatlı', 'İnönü', 'Mavişehir', 'Nergiz', 'Örnekköy', 'Sancaklı', 'Şemikler', 'Tuna', 'Yalı', 'Yamanlar', 'Zübeyde Hanım'] },
      { name: 'Bornova', neighborhoods: ['Atatürk', 'Barbaros', 'Birlik', 'Çamdibi', 'Egemenlik', 'Erzene', 'Evka-3', 'Evka-4', 'Işıkkent', 'İnönü', 'Kızılay', 'Mevlana', 'Naldöken', 'Özkanlar', 'Pınarbaşı', 'Rafet Paşa', 'Yeşilova', 'Yunus Emre', 'Zafer'] },
      { name: 'Buca', neighborhoods: ['Adatepe', 'Akıncılar', 'Barış', 'Buca Koop', 'Cumhuriyet', 'Çağdaş', 'Dumlupınar', 'Efeler', 'Fırat', 'Gaziler', 'Gediz', 'Hürriyet', 'İzkent', 'Kuruçeşme', 'Menderes', 'Murat Mah', 'Şirinyer', 'Tınaztepe', 'Ufuk', 'Vali Rahmi Bey', 'Yaylacık', 'Yenigün', 'Yıldız'] },
      { name: 'Bayraklı', neighborhoods: ['Adalet', 'Alpaslan', 'Bayraklı', 'Cengizhan', 'Çay', 'Çiçek', 'Fuatsel', 'Gümüşpala', 'Laka', 'Manavkuyu', 'Mansuroğlu', 'Muhittin Erener', 'Nafiz Gürman', 'Onur', 'Postaçılar', 'Soğukkuyu', 'Tepekule', 'Yamanlar', '75. Yıl'] },
      { name: 'Çiğli', neighborhoods: ['Ataşehir', 'Balatçık', 'Cumhuriyet', 'Çağdaş', 'Egekent', 'Evka-2', 'Evka-5', 'Evka-6', 'Güzeltepe', 'Harmandalı', 'İnönü', 'Izkent', 'Kaklıç', 'Köyiçi', 'Maltepe', 'Sasalı', 'Yenimahalle'] },
      { name: 'Gaziemir', neighborhoods: ['Atatürk', 'Atıfbey', 'Beyazevler', 'Dokuz Eylül', 'Emrez', 'Fatih', 'Gazi', 'Gazi Mah', 'Hürriyet', 'Irmak', 'Menderes', 'Sarnıç', 'Yavuz Selim', 'Yeşil Mah'] },
      { name: 'Balçova', neighborhoods: ['Bahçelerarası', 'Çetin Emeç', 'Eğitim', 'Fevzi Çakmak', 'Ilıca', 'Korutürk', 'Onur', 'Teleferik'] },
    ],
  },
  {
    name: 'Bursa',
    districts: [
      { name: 'Osmangazi', neighborhoods: ['Alacahırka', 'Altıparmak', 'Bağlarbaşı', 'Demirtaş', 'Dikkaldırım', 'Doburca', 'Emek', 'Geçit', 'Hamitler', 'Hürriyet', 'Kükürtlü', 'Maksem', 'Nilüfer', 'Panayır', 'Selçukgazi', 'Sırameşeler', 'Soğanlı', 'Yunuseli'] },
      { name: 'Nilüfer', neighborhoods: ['Ataevler', 'Beşevler', 'Çalı', 'Fethiye', 'Görükle', 'Ihsaniye', 'İrfaniye', 'Kayapa', 'Konak', 'Küçük Sanayi', 'Odunluk', 'Özlüce', 'Üçevler', 'Yıldırım', 'Yüzüncüyıl'] },
      { name: 'Yıldırım', neighborhoods: ['Duaçınarı', 'Ertuğrulgazi', 'Esenevler', 'Millet', 'Musababa', 'Namazgah', 'Ortabağlar', 'Selçukbey', 'Siteler', 'Şirinevler', 'Yavuzselim', 'Yeşil', 'Yıldırım'] },
      { name: 'Gürsu', neighborhoods: ['Adaköy', 'İstiklal', 'Kurtuluş', 'Yenimahalle', 'Zafer'] },
      { name: 'Kestel', neighborhoods: ['Ahmet Vefik Paşa', 'Esentepe', 'Kale', 'Vani Mehmet', 'Yeni'] },
      { name: 'Mudanya', neighborhoods: ['Bademli', 'Çağrışan', 'Güzelyalı', 'Halitpaşa', 'Ömerbey', 'Şükrüçavuş'] },
      { name: 'Gemlik', neighborhoods: ['Dr. Ziya Kaya', 'Eşref Dinçer', 'Hamidiye', 'Hisar', 'Kumla', 'Kurşunlu'] },
      { name: 'İnegöl', neighborhoods: ['Alanyurt', 'Burhaniye', 'Hamidiye', 'Kemalpaşa', 'Mahmudiye', 'Süleymaniye', 'Yenice'] },
    ],
  },
  {
    name: 'Antalya',
    districts: [
      { name: 'Muratpaşa', neighborhoods: ['Altındağ', 'Bahçelievler', 'Çağlayan', 'Çaybaşı', 'Demircikara', 'Deniz', 'Fener', 'Güzeloba', 'Haşimişcan', 'Kalkanlı', 'Kırcami', 'Kızılsaray', 'Konuksever', 'Lara', 'Meltem', 'Memurevleri', 'Sinan', 'Şirinyalı', 'Yenigün', 'Yıldız', 'Yüksekalan'] },
      { name: 'Kepez', neighborhoods: ['Altınova', 'Baraj', 'Barış', 'Çamlıbel', 'Dokuma', 'Düdenbaşı', 'Erenköy', 'Gülveren', 'Gündoğdu', 'Hürriyet', 'Kanal', 'Karşıyaka', 'Kütükçü', 'Özgürlük', 'Sütçüler', 'Teomanpaşa', 'Varsak', 'Yeni Doğan', 'Yeşilırmak', 'Zafer'] },
      { name: 'Konyaaltı', neighborhoods: ['Altınkum', 'Arapsuyu', 'Gürsu', 'Hurma', 'Liman', 'Molla Yusuf', 'Öğretmenevleri', 'Pınarbaşı', 'Sarısu', 'Toros', 'Uncalı', 'Uluç'] },
      { name: 'Alanya', neighborhoods: ['Avsallar', 'Cikcilli', 'Çıplaklı', 'Güller Pınarı', 'Kestel', 'Konaklı', 'Mahmutlar', 'Oba', 'Okurcalar', 'Payallar', 'Saray', 'Tosmur'] },
      { name: 'Manavgat', neighborhoods: ['Aşağı Pazarcı', 'Bahçelievler', 'Ilıca', 'Kavaklı', 'Milli Egemenlik', 'Salkımevler', 'Sarılar', 'Side', 'Şelale', 'Yayla'] },
      { name: 'Serik', neighborhoods: ['Belek', 'Boğazkent', 'Cumhuriyet', 'Kadriye', 'Kökez', 'Merkez', 'Orta'] },
    ],
  },
  {
    name: 'Adana',
    districts: [
      { name: 'Seyhan', neighborhoods: ['2000 Evler', 'Ahmet Remzi Yüreğir', 'Akkapı', 'Bahçelievler', 'Barbaros', 'Beşocak', 'Bey', 'Cemalpaşa', 'Çınarlı', 'Denizli', 'Emek', 'Fatih', 'Gazipaşa', 'Gülbahçesi', 'Gürselpaşa', 'Hadiye', 'Hürriyet', 'İsmetpaşa', 'Karasoku', 'Kayalıbağ', 'Kuruköprü', 'Kurtuluş', 'Mestanzade', 'Meydan', 'Narlıca', 'Onur', 'Ovalı', 'Pınar', 'Reşatbey', 'Sakarya', 'Sarıyakup', 'Sucuzade', 'Sümer', 'Tepebağ', 'Türkocağı', 'Uçak', 'Ulucami', 'Yeşiloba', 'Yeşilyurt', 'Ziyapaşa'] },
      { name: 'Çukurova', neighborhoods: ['Belediyeevleri', 'Beyazevler', 'Esentepe', 'Güzelyalı', 'Huzurevleri', 'Karslılar', 'Kurttepe', 'Mahfesığmaz', 'Piri Reis', 'Toros', 'Turgut Özal', 'Yeni Mahalle', 'Yurt', 'Yüzüncüyıl'] },
      { name: 'Sarıçam', neighborhoods: ['Akkuyu', 'Balcalı', 'Boynuyoğun', 'Buruk', 'Cihadiye', 'Çarkıpare', 'Ertuğrul Gazi', 'Gültepe', 'İncirlik', 'Kılıçlı', 'Mehmet Akif Ersoy', 'Orhangazi', 'Remzi Oğuz Arık', 'Şahintepe', 'Yavuz Sultan Selim', 'Yeni Mahalle', 'Yeşiltepe', 'Yıldırım Beyazıt'] },
      { name: 'Yüreğir', neighborhoods: ['Akıncılar', 'Atakent', 'Daday', 'Doğankent', 'Geçitli', 'Güneşli', 'Havutlu', 'İncirlik', 'Karacaoğlan', 'Kiremithane', 'Köprülü', 'PTT Evleri', 'Selçuklu', 'Solaklı', 'Yavuzlar', 'Yeşil Bağlar', 'Yüreğir'] },
      { name: 'Kozan', neighborhoods: ['Arslanpaşa', 'Aydın', 'Cumhuriyet', 'Hacıuşağı', 'Karacaoğlan', 'Mahmutlu', 'Tufanpaşa', 'Varsaklar'] },
      { name: 'Ceyhan', neighborhoods: ['Belediyeevleri', 'Büyükkırım', 'Cumhuriyet', 'Hürriyet', 'İstasyon', 'Konakoğlu', 'Modernevler', 'Mithatpaşa', 'Muradiye', 'Namık Kemal'] },
    ],
  },
  {
    name: 'Konya',
    districts: [
      { name: 'Selçuklu', neighborhoods: ['Bosna Hersek', 'Yazır'] },
      { name: 'Meram', neighborhoods: ['Havzan'] },
      { name: 'Karatay', neighborhoods: ['Şemsitibrizi'] },
      { name: 'Ereğli', neighborhoods: ['Hacı Mütahir'] },
    ],
  },
  {
    name: 'Gaziantep',
    districts: [
      { name: 'Şahinbey', neighborhoods: ['Karataş', 'Akkent'] },
      { name: 'Şehitkamil', neighborhoods: ['İbrahimli', 'Batıkent'] },
      { name: 'Nizip', neighborhoods: ['Fatih'] },
    ],
  },
  {
    name: 'Kocaeli',
    districts: [
      { name: 'İzmit', neighborhoods: ['Yahya Kaptan', 'Belsa Plaza'] },
      { name: 'Gebze', neighborhoods: ['Mutlukent', 'Tatlıkuyu'] },
      { name: 'Darıca', neighborhoods: ['Bayramoğlu'] },
      { name: 'Körfez', neighborhoods: ['Tütünçiftlik'] },
      { name: 'Gölcük', neighborhoods: ['Değirmendere'] },
      { name: 'Kartepe', neighborhoods: ['Köseköy'] },
    ],
  },
  {
    name: 'Mersin',
    districts: [
      { name: 'Yenişehir', neighborhoods: ['Pozcu', 'Kushimoto Sokak'] },
      { name: 'Mezitli', neighborhoods: ['Viranşehir', 'Soli'] },
      { name: 'Toroslar', neighborhoods: ['Yalınayak'] },
      { name: 'Akdeniz', neighborhoods: ['Çankaya'] },
      { name: 'Tarsus', neighborhoods: ['Şehitishak'] },
    ],
  },
  {
    name: 'Diyarbakır',
    districts: [
      { name: 'Kayapınar', neighborhoods: ['75. Yol', 'Diclekent'] },
      { name: 'Bağlar', neighborhoods: ['Bağcılar'] },
      { name: 'Yenişehir', neighborhoods: ['Ofis'] },
      { name: 'Sur', neighborhoods: ['Dağkapı'] },
    ],
  },
  {
    name: 'Kayseri',
    districts: [
      { name: 'Melikgazi', neighborhoods: ['Alpaslan', 'İldem'] },
      { name: 'Kocasinan', neighborhoods: ['Zümrüt'] },
      { name: 'Talas', neighborhoods: ['Bahçelievler'] },
    ],
  },
  {
    name: 'Samsun',
    districts: [
      { name: 'Atakum', neighborhoods: ['Türkiş', 'Mevlana'] },
      { name: 'İlkadım', neighborhoods: ['Çiftlik', 'Bahçelievler'] },
      { name: 'Canik', neighborhoods: ['Belediyeevleri'] },
    ],
  },
  {
    name: 'Eskişehir',
    districts: [
      { name: 'Odunpazarı', neighborhoods: ['Vişnelik', 'Akarbaşı'] },
      { name: 'Tepebaşı', neighborhoods: ['Bağlar', 'Batıkent'] },
    ],
  },
  { name: 'Afyonkarahisar', districts: [{ name: 'Merkez', neighborhoods: ['Dumlupınar'] }] },
  { name: 'Ağrı', districts: [{ name: 'Merkez', neighborhoods: ['Abide'] }] },
  { name: 'Amasya', districts: [{ name: 'Merkez', neighborhoods: ['Hacılar Meydanı'] }] },
  { name: 'Artvin', districts: [{ name: 'Merkez', neighborhoods: ['Çarşı'] }] },
  { name: 'Aydın', districts: [{ name: 'Efeler', neighborhoods: ['Mimar Sinan'] }, { name: 'Kuşadası', neighborhoods: ['Türkmen'] }] },
  { name: 'Balıkesir', districts: [{ name: 'Altıeylül', neighborhoods: ['Bahçelievler'] }, { name: 'Karesi', neighborhoods: ['Atatürk'] }] },
  { name: 'Bilecik', districts: [{ name: 'Merkez', neighborhoods: ['Ertuğrul Gazi'] }] },
  { name: 'Bingöl', districts: [{ name: 'Merkez', neighborhoods: ['Saray'] }] },
  { name: 'Bitlis', districts: [{ name: 'Merkez', neighborhoods: ['Beş Minare'] }] },
  { name: 'Bolu', districts: [{ name: 'Merkez', neighborhoods: ['Tabaklar'] }] },
  { name: 'Burdur', districts: [{ name: 'Merkez', neighborhoods: ['Bahçelievler'] }] },
  { name: 'Çanakkale', districts: [{ name: 'Merkez', neighborhoods: ['Barbaros'] }] },
  { name: 'Çankırı', districts: [{ name: 'Merkez', neighborhoods: ['Karatekin'] }] },
  { name: 'Çorum', districts: [{ name: 'Merkez', neighborhoods: ['Bahçelievler'] }] },
  { name: 'Denizli', districts: [{ name: 'Pamukkale', neighborhoods: ['Çamlık'] }] },
  { name: 'Edirne', districts: [{ name: 'Merkez', neighborhoods: ['Şükrüpaşa'] }] },
  { name: 'Elazığ', districts: [{ name: 'Merkez', neighborhoods: ['Bahçelievler'] }] },
  { name: 'Erzincan', districts: [{ name: 'Merkez', neighborhoods: ['Bahçelievler'] }] },
  { name: 'Erzurum', districts: [{ name: 'Yakutiye', neighborhoods: ['Mumcu'] }] },
  { name: 'Giresun', districts: [{ name: 'Merkez', neighborhoods: ['Hacı Hüseyin'] }] },
  { name: 'Gümüşhane', districts: [{ name: 'Merkez', neighborhoods: ['Hasanbey'] }] },
  { name: 'Hakkari', districts: [{ name: 'Merkez', neighborhoods: ['Bulak'] }] },
  { name: 'Hatay', districts: [{ name: 'Antakya', neighborhoods: ['Akasya'] }, { name: 'İskenderun', neighborhoods: ['Kurtuluş'] }] },
  { name: 'Isparta', districts: [{ name: 'Merkez', neighborhoods: ['Bahçelievler'] }] },
  { name: 'Kars', districts: [{ name: 'Merkez', neighborhoods: ['Ortakapı'] }] },
  { name: 'Kastamonu', districts: [{ name: 'Merkez', neighborhoods: ['Cebrail'] }] },
  { name: 'Kırklareli', districts: [{ name: 'Merkez', neighborhoods: ['Karakaş'] }] },
  { name: 'Kırşehir', districts: [{ name: 'Merkez', neighborhoods: ['Kervansaray'] }] },
  { name: 'Kütahya', districts: [{ name: 'Merkez', neighborhoods: ['Servi'] }] },
  { name: 'Malatya', districts: [{ name: 'Yeşilyurt', neighborhoods: ['Tecde'] }] },
  { name: 'Manisa', districts: [{ name: 'Yunusemre', neighborhoods: ['Güzelyurt'] }] },
  { name: 'Kahramanmaraş', districts: [{ name: 'Onikişubat', neighborhoods: ['Haydar Aliyev'] }] },
  { name: 'Mardin', districts: [{ name: 'Artuklu', neighborhoods: ['Yenişehir'] }] },
  { name: 'Muğla', districts: [{ name: 'Menteşe', neighborhoods: ['Kötekli'] }, { name: 'Bodrum', neighborhoods: ['Bitez'] }] },
  { name: 'Muş', districts: [{ name: 'Merkez', neighborhoods: ['Kültür'] }] },
  { name: 'Nevşehir', districts: [{ name: 'Merkez', neighborhoods: ['2000 Evler'] }] },
  { name: 'Niğde', districts: [{ name: 'Merkez', neighborhoods: ['Aşağı Kayabaşı'] }] },
  { name: 'Ordu', districts: [{ name: 'Altınordu', neighborhoods: ['Akyazı'] }] },
  { name: 'Rize', districts: [{ name: 'Merkez', neighborhoods: ['Müftü'] }] },
  { name: 'Sakarya', districts: [{ name: 'Adapazarı', neighborhoods: ['Çark Caddesi'] }, { name: 'Serdivan', neighborhoods: ['Mavi Durak'] }] },
  { name: 'Siirt', districts: [{ name: 'Merkez', neighborhoods: ['Bahçelievler'] }] },
  { name: 'Sinop', districts: [{ name: 'Merkez', neighborhoods: ['Zeytinlik'] }] },
  { name: 'Sivas', districts: [{ name: 'Merkez', neighborhoods: ['Bağdat Caddesi'] }] },
  { name: 'Tekirdağ', districts: [{ name: 'Süleymanpaşa', neighborhoods: ['Hürriyet'] }, { name: 'Çorlu', neighborhoods: ['Alipaşa'] }] },
  { name: 'Tokat', districts: [{ name: 'Merkez', neighborhoods: ['Karşıyaka'] }] },
  { name: 'Trabzon', districts: [{ name: 'Ortahisar', neighborhoods: ['Beşirli'] }] },
  { name: 'Tunceli', districts: [{ name: 'Merkez', neighborhoods: ['Moğultay'] }] },
  { name: 'Şanlıurfa', districts: [{ name: 'Haliliye', neighborhoods: ['Bahçelievler'] }] },
  { name: 'Uşak', districts: [{ name: 'Merkez', neighborhoods: ['Kemalöz'] }] },
  { name: 'Van', districts: [{ name: 'İpekyolu', neighborhoods: ['Bahçıvan'] }] },
  { name: 'Yozgat', districts: [{ name: 'Merkez', neighborhoods: ['Bahçelievler'] }] },
  { name: 'Zonguldak', districts: [{ name: 'Merkez', neighborhoods: ['İncivez'] }] },
  { name: 'Aksaray', districts: [{ name: 'Merkez', neighborhoods: ['Haci Hasanli'] }] },
  { name: 'Bayburt', districts: [{ name: 'Merkez', neighborhoods: ['Zahit'] }] },
  { name: 'Karaman', districts: [{ name: 'Merkez', neighborhoods: ['Mansurdede'] }] },
  { name: 'Kırıkkale', districts: [{ name: 'Merkez', neighborhoods: ['Fabrikalar'] }] },
  { name: 'Batman', districts: [{ name: 'Merkez', neighborhoods: ['Kültür'] }] },
  { name: 'Şırnak', districts: [{ name: 'Merkez', neighborhoods: ['Yeni'] }] },
  { name: 'Bartın', districts: [{ name: 'Merkez', neighborhoods: ['Kemer Köprü'] }] },
  { name: 'Ardahan', districts: [{ name: 'Merkez', neighborhoods: ['Kaptanpaşa'] }] },
  { name: 'Iğdır', districts: [{ name: 'Merkez', neighborhoods: ['Bağlar'] }] },
  { name: 'Yalova', districts: [{ name: 'Merkez', neighborhoods: ['Bahçelievler'] }] },
  { name: 'Karabük', districts: [{ name: 'Merkez', neighborhoods: ['100. Yıl'] }] },
  { name: 'Kilis', districts: [{ name: 'Merkez', neighborhoods: ['Ekrem Çetin'] }] },
  { name: 'Osmaniye', districts: [{ name: 'Merkez', neighborhoods: ['Fakıuşağı'] }] },
  { name: 'Düzce', districts: [{ name: 'Merkez', neighborhoods: ['Kültür'] }] },
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

