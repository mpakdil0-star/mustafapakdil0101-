import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';

const CITIZEN_SYSTEM_PROMPT = `Sen "İşBitir" platformunun yapay zekalı arıza teşhis sihirbazısın. Vatandaş kullanıcılara evlerindeki veya iş yerlerindeki arızaları teşhis etmede yardımcı oluyorsun.

TEMEL KURALLAR:
1. Her zaman TÜRKÇE cevap ver. Samimi, net ve kısa ol. Gereksiz uzatma.
2. Tek mesajda her şeyi söyleme. Önce 1-2 kısa soru sor, cevaba göre teşhis yap.
3. İlk mesajda sorun tam anlaşılmıyorsa şunu sor: kaçıncı kat, ne zamandan beri, başka belirti var mı?

ACİL DURUM KURALI (ÇOK ÖNEMLİ):
Kullanıcının mesajında şu tehlikeli durum işaretlerinden biri varsa:
- Duman, yanık kokusu, alev, yangın
- Elektrik çarpması, elektrik kıvılcımı, kablo yanması
- Doğalgaz kokusu, çürük yumurta kokusu, gaz kaçağı
- Su baskını, tavan çökmesi, yapısal hasar
Cevabının TAM BAŞINA "🚨 ACİL:" öneki koy ve kalın harflerle acil güvenlik talimatı ver. 
Ardından ilan butonuna yönlendir. UZUN AÇIKLAMA YAPMA, kısa ve net talimat ver.

GÜVENLİK ÖNCELİĞİ:
- Tehlikeli durumlar: ⚠️ UYARI bloğu kullan, kendin müdahale etme uyarısı ver.
- Güvenli durumlar: Basit DIY adımları öner (kombi basınç ayarı, filtre temizleme, sigorta sıfırlama).

MALİYET BİLGİSİ:
Kullanıcı fiyat/maliyet sorarsa, Türkiye 2024-2025 piyasa ortalamalarını paylaş:
- Elektrik priz/sigorta tamiri: 500-1.500 TL
- Elektrik pano değişimi: 3.000-8.000 TL
- Su/tesisat kaçak tamiri: 800-2.500 TL
- Musluk/batarya değişimi: 500-1.200 TL
- Çilingir kapı açma: 300-800 TL
- Kilit değişimi: 500-1.500 TL
- Klima bakım/gaz dolumu: 800-2.000 TL
- Kombi arıza tamiri: 1.000-3.500 TL
- Kombi basınç/reset: 300-600 TL
- Beyaz eşya tamiri: 500-2.000 TL
- Boya badana (oda): 2.000-5.000 TL
- Ev temizliği: 500-1.500 TL
Not: Bu fiyatlar tahminidir. Gerçek fiyat usta teklifine göre değişir.

KATEGORİLER (15 adet, sadece bu ID'leri kullan):
elektrik, cilingir, klima, beyaz-esya, tesisat, temizlik, nakliyat, boya-badana, koltuk-hali, mobilya-montaj, kucuk-nakliye, kombi-servis, asansor, bocek-ilaclama, guvenlik-kamera

TEŞHİS RAPORU FORMATI:
Sorunu anladığında cevabının SONUNA şu bloğu ekle:
[TEŞHİS RAPORU]
{
  "category": "kategori_id",
  "subCategory": "alt_kategori_id",
  "title": "Kısa ilan başlığı",
  "description": "Ustanın anlayacağı detaylı sorun özeti"
}

Alt kategori örnekleri:
- elektrik: elektrik-proje, elektrik-tesisat, elektrik-tamir, aydinlatma, priz-anahtar, elektrik-panosu, kablo-cekimi, uydu-sistemleri, elektrik-kontrol, elektrik-diger
- cilingir: kapi-acma, kilit-degisimi, anahtar-kopyalama, kasa-acma, oto-cilingir, cilingir-diger
- tesisat: tikaniklik, su-kacagi, musluk-batarya, petek-kombi, tuvalet-lavabo, tesisat-diger
- beyaz-esya: camasir-makinesi, bulasik-makinesi, buzdolabi, firin-ocak, kurutma-makinesi, beyaz-esya-diger
- klima: klima-montaj, klima-bakim, klima-tamir, gaz-dolumu, klima-temizlik, klima-diger
- nakliyat: ev-tasima, ofis-tasima, esya-paketleme, depolama, nakliyat-diger
- temizlik: ev-temizligi, ofis-temizligi, insaat-temizligi, temizlik-diger
- boya-badana: ic-cephe-boya, dis-cephe-boya, duvar-kagidi, dekorasyon, boya-diger
- kombi-servis: kombi-bakim, kombi-tamir, kombi-montaj, kombi-diger`;

const USTA_SYSTEM_PROMPT = `Sen "İşBitir" platformunun profesyonel teknik destek ve teklif hazırlama asistanısın. Hizmet veren ustalara (elektrikçi, tesisatçı vb.) teknik konularda ve teklif yazmada yardımcı oluyorsun.
Görevin:
1. Ustaların sorduğu teknik terimleri, standartları, hata kodlarını (örn. kombi hata kodları, elektrik tesisatı yönetmeliği kablo kesitleri vb.) açıkla.
2. Malzeme hesabı ve tahmini maliyet yapmada yardımcı ol.
3. Ustanın müşteriye gönderebileceği profesyonel teklif şablonları veya mesaj şablonları oluştur.
4. Cevaplarını her zaman TÜRKÇE ver. Net, teknik ve profesyonel bir üslup kullan.
5. Malzeme fiyatları sorulursa 2024-2025 Türkiye toptan fiyat aralıklarını paylaş.`;

// Türkiye 2024-2025 piyasa fiyat tahminleri
const COST_ESTIMATES: Record<string, { min: number; max: number; unit: string; note: string }> = {
  'elektrik':       { min: 500,  max: 3000, unit: 'TL', note: 'Priz/lamba tamirinden pano değişimine kadar değişir' },
  'tesisat':        { min: 500,  max: 3000, unit: 'TL', note: 'Kaçak tamiri, musluk değişimi vb. işe göre değişir' },
  'cilingir':       { min: 300,  max: 1500, unit: 'TL', note: 'Kapı açma ucuz; kilit değişimi daha pahalıdır' },
  'klima':          { min: 800,  max: 2500, unit: 'TL', note: 'Bakım+gaz dolumu; montaj daha pahalı olabilir' },
  'beyaz-esya':     { min: 500,  max: 2500, unit: 'TL', note: 'Arıza tespit + parça + işçilik dahil tahmin' },
  'kombi-servis':   { min: 500,  max: 4000, unit: 'TL', note: 'Basınç ayarı ucuz; kart/valf değişimi pahalı' },
  'temizlik':       { min: 500,  max: 2000, unit: 'TL', note: 'Oda sayısı ve temizlik türüne göre değişir' },
  'boya-badana':    { min: 1500, max: 6000, unit: 'TL', note: 'Alan metrekaresi ve kat sayısına göre değişir' },
  'nakliyat':       { min: 2000, max: 8000, unit: 'TL', note: 'Eşya miktarı ve mesafeye göre büyük değişir' },
  'kucuk-nakliye':  { min: 500,  max: 2000, unit: 'TL', note: 'Tek parça eşya veya küçük koliler için' },
  'mobilya-montaj': { min: 300,  max: 1500, unit: 'TL', note: 'Parça sayısı ve montaj zorluğuna göre değişir' },
  'koltuk-hali':    { min: 300,  max: 1500, unit: 'TL', note: 'Koltuk başına veya metrekare üzerinden hesaplanır' },
  'asansor':        { min: 1000, max: 5000, unit: 'TL', note: 'Bakım ucuz; parça değişimi çok pahalı olabilir' },
  'bocek-ilaclama': { min: 400,  max: 1500, unit: 'TL', note: 'Alan büyüklüğü ve haşere türüne göre değişir' },
  'guvenlik-kamera':{ min: 1500, max: 6000, unit: 'TL', note: 'Kamera sayısı ve kablo uzunluğuna göre değişir' },
};

export const handleAiChat = async (req: AuthRequest, res: Response) => {
  try {
    const { message, history, image } = req.body;
    const userType = req.user?.userType || 'CITIZEN';

    if (!message && !image) {
      return res.status(400).json({
        success: false,
        error: { message: 'Message or image is required' }
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.log('💡 GEMINI_API_KEY not found in environment. Using smart Turkish fallback.');
      let responseText = getFallbackResponse(message || '', userType, history);
      if (image) {
        responseText = `💡 **Bilgi:** Fotoğraflı arıza teşhisi özelliği için Gemini API kurulumu gerekmektedir. Şu an için sadece yazdığınız metne göre arıza tespiti yapıyorum.\n\n` + responseText;
      }
      return res.json({
        success: true,
        data: {
          text: responseText,
          fallback: true
        }
      });
    }

    // Call Gemini API REST Endpoint
    const systemPrompt = userType === 'ELECTRICIAN' ? USTA_SYSTEM_PROMPT : CITIZEN_SYSTEM_PROMPT;
    const model = 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    // Format Gemini requests
    const contents: any[] = [];
    if (history && Array.isArray(history)) {
      history.forEach((h: any) => {
        contents.push({
          role: h.role === 'model' ? 'model' : 'user',
          parts: [{ text: h.text }]
        });
      });
    }
    
    const userParts: any[] = [];
    if (message) {
      userParts.push({ text: message });
    }
    if (image && image.base64 && image.mimeType) {
      userParts.push({
        inlineData: {
          mimeType: image.mimeType,
          data: image.base64
        }
      });
    }

    contents.push({
      role: 'user',
      parts: userParts
    });

    const response = await (global as any).fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents,
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1024
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Gemini API returned error status ${response.status}:`, errorText);
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const json = await response.json();
    const responseText = json.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      throw new Error('Empty response from Gemini');
    }

    return res.json({
      success: true,
      data: {
        text: responseText,
        fallback: false
      }
    });

  } catch (error: any) {
    console.error('❌ AI Chat Error:', error);
    // Fallback to local rule engine if network request fails
    const userType = req.user?.userType || 'CITIZEN';
    const message = req.body?.message || '';
    const history = req.body?.history;
    const image = req.body?.image;
    let responseText = getFallbackResponse(message, userType, history);
    if (image) {
      responseText = `⚠️ **Bağlantı Hatası:** Yapay zeka ile fotoğraf analizi gerçekleştirilemedi. Arızayı metin üzerinden tespit etmeye çalışıyorum.\n\n` + responseText;
    }

    return res.json({
      success: true,
      data: {
        text: responseText,
        fallback: true,
        error: error.message
      }
    });
  }
};

/**
 * GET /api/v1/ai/cost-estimate?category=elektrik
 * Returns a price range estimate for a given service category (Turkish market 2024-2025)
 */
export const getCostEstimate = async (req: AuthRequest, res: Response) => {
  try {
    const category = (req.query.category as string || '').toLowerCase().trim();

    if (!category) {
      return res.status(400).json({
        success: false,
        error: { message: 'category query parameter is required' }
      });
    }

    const estimate = COST_ESTIMATES[category];

    if (!estimate) {
      return res.json({
        success: true,
        data: {
          found: false,
          message: 'Bu kategori için fiyat tahmini henüz mevcut değil.'
        }
      });
    }

    return res.json({
      success: true,
      data: {
        found: true,
        category,
        min: estimate.min,
        max: estimate.max,
        unit: estimate.unit,
        note: estimate.note,
        label: `${estimate.min.toLocaleString('tr-TR')} – ${estimate.max.toLocaleString('tr-TR')} ${estimate.unit}`
      }
    });
  } catch (error: any) {
    console.error('❌ Cost Estimate Error:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Fiyat tahmini alınamadı.' }
    });
  }
};


function getFallbackResponse(message: string, userType: string, history?: any[]): string {
  // Combine current message and history user messages to analyze full context
  let fullContext = message.toLowerCase();
  if (history && Array.isArray(history)) {
    history.forEach((h: any) => {
      const role = h.role === 'model' ? 'model' : 'user';
      if (role === 'user' && h.text) {
        fullContext += ' ' + h.text.toLowerCase();
      }
    });
  }

  const msgLower = fullContext;

  if (userType === 'ELECTRICIAN') {
    // Usta Fallback Responses
    if (msgLower.includes('teklif') || msgLower.includes('fiyat') || msgLower.includes('mesaj')) {
      return `Ustalarımız için profesyonel müşteri teklif şablonu aşağıdadır. İhtiyacınıza göre kopyalayıp düzenleyebilirsiniz:

**[KOPYALANABİLİR TEKLİF ŞABLONU]**
--------------------------------------------------
*Merhaba Sayın [Müşteri Adı],*

*İşBitir platformu üzerinden iletmiş olduğunuz arıza/bakım talebini inceledim. Belirttiğiniz detaylar doğrultusunda tahmini iş planımız şu şekildedir:*

*🛠️ **Yapılacak İşlemler:** [Örn: Sigorta panosu değişimi ve kablo kontrolü]*
*⏳ **Tahmini Süre:** [Örn: 2-3 saat]*
*💼 **Tahmini İşçilik & Malzeme Bedeli:** [Örn: 1.500 TL (Malzeme dahil/hariç)]*

*Tüm işlerimiz garantili olup, iş güvenliği standartlarına uygun olarak tamamlanacaktır. Uygun olduğunuzda detayları netleştirmek için benimle iletişime geçebilirsiniz.*

*Saygılarımla,*
*[Adınız Soyadınız / İşletme Adınız]*
--------------------------------------------------`;
    }

    if (msgLower.includes('sigorta') || msgLower.includes('kablo') || msgLower.includes('akım') || msgLower.includes('kesit')) {
      return `Elektrik tesisatı kablo kesiti ve sigorta akım değerleri standardı kılavuzu:

1. **Aydınlatma Linyeleri:**
   - Kablo Kesiti: en az **1.5 mm²** bakır kablo (NYM / NYA).
   - Koruma Sigortası: **10 Amper** (B Tipi).
2. **Priz Linyeleri:**
   - Kablo Kesiti: en az **2.5 mm²** bakır kablo.
   - Koruma Sigortası: **16 Amper** (C Tipi).
3. **Fırın / Termosifon / Klima Hatları (Özel Linyeler):**
   - Kablo Kesiti: en az **4 mm²** veya **6 mm²** bakır kablo.
   - Koruma Sigortası: Cihaz gücüne göre **20 - 25 - 32 Amper** (C Tipi).

⚠️ *Not: İç Tesisat Yönetmeliği'ne göre buatlarda klemens kullanımı zorunludur. Bantlama yapmaktan kaçının.*`;
    }

    if (msgLower.includes('kombi') || msgLower.includes('hata') || msgLower.includes('kod')) {
      return `Sık karşılaşılan bazı kombi hata kodları ve teknik açıklamaları:

- **E01 / F37 / F05 Hataları (Genel Gaz/Ateşleme Sorunu):**
  - Cihaza gaz ulaşıp ulaşmadığı kontrol edilmelidir.
  - İyonizasyon elektrodu veya gaz valfi arızalı olabilir.
- **F22 / E10 Hataları (Düşük Su Basıncı):**
  - Kombi altındaki doldurma musluğu vasıtasıyla su basıncı **1.5 bar** seviyesine getirilmelidir.
  - Basınç sürekli düşüyorsa tesisatta su kaçağı veya genleşme tankı membranı patlak olabilir.
- **E03 Hataları (Hava Akış / Prosestat Sorunu):**
  - Baca fanı, prosestat veya anakart kontrol edilmelidir. Bacada tıkanıklık veya eğim hatası olabilir.`;
    }

    // Default Usta response
    return `Merhaba Usta! Ben İşBitir AI Teknik Kılavuz Asistanı. 

Size şu konularda yardımcı olabilirim:
- Müşterilere gönderilmek üzere **teklif şablonları** hazırlama (örn: "teklif şablonu ver" yazabilirsiniz)
- Elektrik kablo kesitleri, sigorta akımları ve **standartlar** kılavuzu
- Klima ve kombi **hata kodları** detayları

Sorunuzu netleştirirseniz size detaylı bilgi sunabilirim.`;
  } else {
    // Citizen Fallback Responses
    let matchedCategory: string | undefined = matchCategoryFromText(message) || undefined;
    
    // If no category matched in the current message, check history from newest to oldest
    if (!matchedCategory && history && Array.isArray(history)) {
      const reversedHistory = [...history].reverse();
      for (const h of reversedHistory) {
        const role = h.role === 'model' ? 'model' : 'user';
        if (role === 'user' && h.text) {
          const categoryCandidate = matchCategoryFromText(h.text);
          if (categoryCandidate) {
            matchedCategory = categoryCandidate;
            break;
          }
        }
      }
    }

    let title = 'Genel Ev Bakım & Onarım Hizmeti';
    let description = 'Evdeki teknik sorunlerin giderilmesi için genel usta desteği talep ediliyor.';
    let explanationText = '';

    // Find a descriptive text from user's current message or recent history
    let userDesc = message;
    if ((!userDesc || userDesc.length < 5) && history && Array.isArray(history)) {
      const lastDescUser = [...history].reverse().find(h => h.role === 'user' && h.text && h.text.length > 5);
      if (lastDescUser) {
        userDesc = lastDescUser.text;
      }
    }
    const cleanUserDesc = userDesc || '';
    const getFinalDesc = (defaultVal: string) => {
      const lower = cleanUserDesc.toLowerCase();
      if (cleanUserDesc.length > 5 && !lower.includes('usta lazım') && !lower.includes('bul') && !lower.includes('çağır') && !lower.includes('lazım') && !lower.includes('istiyorum')) {
        return cleanUserDesc;
      }
      return defaultVal;
    };

    if (matchedCategory === 'elektrik') {
      title = 'Priz veya Sigorta Arızası Onarımı';
      description = getFinalDesc('Prizde temassızlık/kıvılcım veya lamba/aydınlatma arızası. Tesisatın kontrol edilip onarılması gerekiyor.');
      explanationText = `Elektrik tesisatı arızaları çok hassas ve risklidir.

⚠️ **ÖNEMLİ GÜVENLİK UYARISI:** Lütfen arızalı prizin/lambanın bağlı olduğu veya tüm dairenin ana sigortasını kapatın! Prizleri sökmeye veya kabloları kurcalamaya çalışmayın.

**Önerilen İlk Yardım Adımları:**
1. Arızalı prize takılı olan tüm fişleri çıkartın.
2. Evde yanık veya plastik kokusu varsa hemen ana şalteri kapatın.
3. Kendi başınıza müdahale etmeyin.

Sizin için bir elektrik arıza talebi hazırladım. Aşağıdaki **"Tek Tıkla İlan Oluştur"** butonuna basarak ilaninizi hemen yayinlayabilir ve bölgenizdeki en iyi elektrikçi ustalardan teklif alabilirsiniz.`;
    } else if (matchedCategory === 'tesisat') {
      title = 'Su Tesisatı Sızıntısı & Musluk Tamiri';
      description = getFinalDesc('Musluk dipten su damlatıyor veya giderde tıkanıklık var. Su sızıntısının tespiti ve arızalı parçanın onarımı/değişimi gerekiyor.');
      explanationText = `Su tesisatı sızıntısı evinize ve alt kata zarar verebilir.

⚠️ **UYARI:** Eğer sızıntı büyükse, daire girişindeki (saatin yanındaki) ana vanayı çevirerek suyu tamamen kapatın.

**Önerilen Adımlar:**
1. Su sayacının yanındaki vanadan su akışını durdurun.
2. Tıkanıklık durumunda kimyasal açıcıları aşırı kullanmaktan kaçının, plastik borulara zarar verebilirsiniz.
3. Sızıntı yerinin etrafındaki elektrikli aletleri uzaklaştırın.

Sizin için bir su tesisatı ilanı hazırladım. Aşağıdaki buton yardımıyla hemen teklif almaya başlayabilirsiniz.`;
    } else if (matchedCategory === 'cilingir') {
      title = 'Acil Çilingir & Kilit Değişimi';
      description = getFinalDesc('Anahtar kapının arkasında kaldı veya kilit göbeği bozuldu. Kapının zarar verilmeden açılması ve kilit barelinin değiştirilmesi gerekiyor.');
      explanationText = `Kapıda kalma durumlarında kilidi zorlamamak en doğrusudur.

**Önerilen Adımlar:**
1. Anahtarı yuvasında zorla çevirmeye çalışmayın, kırılması halinde işi daha da zorlaştırır.
2. Çelik kapılarda kartla açma gibi amatör yöntemler kapı kasasına zarar verebilir.

Sizin için acil bir çilingir hizmet talebi hazırladım. Aşağıdaki butona tıklayarak en yakın güvenilir çilingir ustasını çağırabilirsiniz.`;
    } else if (matchedCategory === 'klima') {
      title = 'Klima Bakım ve Gaz Dolumu';
      description = getFinalDesc('Klima açılıyor fakat soğuk/sıcak hava üflemiyor. Gaz seviyesinin kontrol edilmesi, gerekiyorsa gaz dolumu ve filtre temizliği yapılması lazım.');
      explanationText = `Klima performans sorunları genellikle gaz eksilmesi veya filtre tıkanıklığından kaynaklanır.

**Önerilen Adımlar:**
1. Klimanın ön kapak mandallarını açıp toz filtrelerini çıkartın, sabunlu suyla yıkayıp tamamen kurutarak yerine takın.
2. Dış ünitenin önünde hava akışını engelleyen nesneler varsa kaldırın.
3. Klimanın kumanda modunun (Kar tanesi veya Güneş simgesi) doğru ayarlandığından emin olun.

Sizin için bir klima servisi ilanı hazırladım. Aşağıdaki butondan hemen usta bulabilirsiniz.`;
    } else if (matchedCategory === 'beyaz-esya') {
      title = 'Beyaz Eşya Onarımı';
      description = getFinalDesc('Beyaz eşya çalışırken su boşaltmıyor veya soğutmuyor. Arıza tespiti yapılması ve arızalı parçanın değiştirilmesi gerekiyor.');
      explanationText = `Beyaz eşya arızalarında elektrik ve su beslemelerini kontrol etmek ilk adımdır.

**Önerilen Adımlar:**
1. Çamaşır veya bulaşık makineniz su boşaltmıyorsa, alt kısımdaki pompa filtresini yavaşça açarak yabancı cisim (düğme, bozuk para vb.) olup olmadığını kontrol edin (Dikkat: su akacaktır, altına kap koyun).
2. Buzdolabınız soğutmuyorsa, arkasındaki tozlu ızgaraların hava almasını engelleyen duvar mesafesini kontrol edin.

Sizin için bir beyaz eşya teknik servis talebi hazırladım. Ustalardan teklif almak için aşağıdaki butona tıklayın.`;
    } else if (matchedCategory === 'kombi-servis') {
      title = 'Kombi Arızası ve Petek Temizliği';
      description = getFinalDesc('Kombi sıcak su vermiyor veya petekler ısınmıyor. Bar basıncının ayarlanması, kombi arıza giderme veya petek temizliği gerekiyor.');
      explanationText = `Kombi sistemlerindeki arızalarda gaz ve su basınçları çok önemlidir.

⚠️ **GÜVENLİK UYARISI:** Evde doğalgaz veya çürük yumurta kokusu alıyorsanız, derhal kombiyi kapatın, ana gaz vanasını kapatın, pencereleri açın ve 187 Doğalgaz Acil hattını arayın! Elektrik düğmelerine basmayın.

**Önerilen Adımlar:**
1. Kombi su basınç göstergesini (manometre) kontrol edin. Basınç 1.0 barın altındaysa kombi altındaki küçük vanayı açarak 1.5 bar olana kadar su ekleyin.
2. Kombinizi resetleyin (kapatıp 1 dakika bekledikten sonra tekrar açın).

Sizin için kombi ve petek servisi ilanı hazırladım. Aşağıdaki butondan hızlıca ilan verebilirsiniz.`;
    } else if (matchedCategory === 'nakliyat') {
      title = 'Evden Eve Nakliyat & Taşıma Hizmeti';
      description = getFinalDesc('Ev veya iş yeri eşyalarının yeni adrese güvenle taşınması ve nakliye aracı desteği talep ediliyor.');
      explanationText = `Ev taşıma ve nakliyat süreçlerinde planlama en önemli adımdır.

**Önerilen Adımlar:**
1. Kırılacak hassas eşyalarınızı önceden kolileyip üzerine mutlaka uyarı yazısı yazın.
2. Beyaz eşyaların sabitleme vidalarını takın ve taşımadan önce boşaltıp buzlarını çözdürün.
3. Yeni evdeki yerleşim planını önceden belirleyin.

Sizin için evden eve nakliyat ilanı hazırladım. Aşağıdaki butona tıklayarak profesyonel nakliyeci ustalardan teklif alabilirsiniz.`;
    } else if (matchedCategory === 'temizlik') {
      title = 'Detaylı Ev & Ofis Temizliği';
      description = getFinalDesc('Ev veya ofis temizliği için deneyimli yardımcı desteği talep ediliyor.');
      explanationText = `Profesyonel temizlik hizmeti alırken ihtiyaçlarınızı netleştirmeniz önemlidir.

**Önerilen Adımlar:**
1. İnşaat sonrası temizlik veya standart ev temizliği gibi detayları ustaya belirtin.
2. Temizlik malzemelerinin usta tarafından mı yoksa sizin tarafınızdan mı sağlanacağını netleştirin.

Sizin için temizlik hizmeti ilanı hazırladım. Aşağıdaki butondan hızlıca ilan verebilirsiniz.`;
    } else if (matchedCategory === 'boya-badana') {
      title = 'Boya Badana & Duvar Boyama Hizmeti';
      description = getFinalDesc('Ev veya ofis odalarının alçı, sıva ve boya badana işlemlerinin yapılması gerekiyor.');
      explanationText = `Boya badana işlerinde renk seçimi ve yüzey hazırlığı çok önemlidir.

**Önerilen Adımlar:**
1. Boyanacak alanlardaki priz kapaklarını sökün ve süpürgelikleri maskeleme bandıyla kapatın.
2. Eşyaları odanın ortasına toplayıp üzerlerini koruyucu örtüyle örtün.

Sizin için boya badana ilanı hazırladım. Aşağıdaki butondan hemen teklif almaya başlayabilirsiniz.`;
    } else if (matchedCategory === 'koltuk-hali') {
      title = 'Koltuk ve Halı Yıkama Hizmeti';
      description = getFinalDesc('Koltukların ve halıların profesyonel makinelerle yerinde veya fabrikada yıkanması.');
      explanationText = `Koltuk ve halı yıkama işlemleri kumaş türüne göre özel deterjanlar gerektirir.

**Önerilen Adımlar:**
1. Yıkanacak ürünlerin kumaş türünü ve varsa lekelerin kaynağını ustaya önceden bildirin.
2. Yıkama sonrası kuruma süresi için ortamın havalandırılmasını sağlayın.

Sizin için yıkama hizmeti ilanı hazırladım. Aşağıdaki butondan teklif toplayabilirsiniz.`;
    } else if (matchedCategory === 'mobilya-montaj') {
      title = 'Mobilya Kurulum & Montaj Hizmeti';
      description = getFinalDesc('Demonte mobilyaların (gardırop, dolap, masa vb.) montajının yapılması gerekiyor.');
      explanationText = `Mobilya montajında doğru kılavuz takibi ve hizalama önemlidir.

**Önerilen Adımlar:**
1. Mobilya paketlerini montajın yapılacağı odada açın.
2. Eksik vida veya parça olup olmadığını paket içeriğinden kontrol edin.

Sizin için mobilya montaj ilanı hazırladım. Aşağıdaki butondan usta bulabilirsiniz.`;
    } else if (matchedCategory === 'kucuk-nakliye') {
      title = 'Küçük Nakliye & Parça Eşya Taşıma';
      description = getFinalDesc('Birkaç parça eşyanın kamyonet veya hafif ticari araçla hızlıca taşınması.');
      explanationText = `Küçük nakliye işlerinde eşyaların boyutlarını ve ağırlığını net belirtmek uygun araç seçimi için kritiktir.

**Önerilen Adımlar:**
1. Taşınacak parça eşyaların ölçülerini önceden kaydedin.
2. Taşıma esnasında paketleme gerekip gerekmediğini ustaya bildirin.

Sizin için küçük nakliye ilanı hazırladım. Aşağıdaki butondan hemen ilan oluşturabilirsiniz.`;
    } else if (matchedCategory === 'asansor') {
      title = 'Asansör Bakım & Onarım Hizmeti';
      description = getFinalDesc('Asansörün periyodik bakımı veya arıza onarım işlemlerinin yapılması.');
      explanationText = `Asansör sistemleri can güvenliği açısından sadece yetkili firmalarca kontrol edilmelidir.

⚠️ **GÜVENLİK UYARISI:** Arızalı asansörü kesinlikle kullanıma kapatın ve üzerine uyarı levhası asın. Yetkisiz kişilerin müdahale etmesine izin vermeyin.

Sizin için asansör servis ilanı hazırladım. Aşağıdaki butondan yetkili ustalara ulaşabilirsiniz.`;
    } else if (matchedCategory === 'bocek-ilaclama') {
      title = 'Böcek ve Haşere İlaçlama Hizmeti';
      description = getFinalDesc('Ev veya iş yerindeki haşere, böcek ve kemirgenlere karşı profesyonel ilaçlama.');
      explanationText = `İlaçlama işlemlerinde kullanılan kimyasalların sağlık bakanlığı onaylı olması gerekir.

⚠️ **GÜVENLİK UYARISI:** İlaçlama esnasında ortamda evcil hayvan veya gıda maddesi bulundurmayın. İlaçlama sonrası alanı belirtilen süre boyunca havalandırın.

Sizin için ilaçlama ilanı hazırladım. Aşağıdaki butondan teklif alabilirsiniz.`;
    } else if (matchedCategory === 'guvenlik-kamera') {
      title = 'Güvenlik Kamerası & Alarm Kurulumu';
      description = getFinalDesc('Kamera sistemlerinin montajı, kablolama ve alarm kurulumu işlemleri.');
      explanationText = `Kamera ve alarm konumlandırması güvenlik açıklarını kapatmak için önemlidir.

**Önerilen Adımlar:**
1. Kameraların kör nokta kalmayacak şekilde yerleştirileceği yerleri belirleyin.
2. İnternet altyapısının uzaktan izleme için hazır olduğundan emin olun.

Sizin için güvenlik kamerası ilanı hazırladım. Aşağıdaki butondan hemen ilan verebilirsiniz.`;
    } else {
      // Default general diagnostic
      matchedCategory = 'elektrik';
      title = 'Genel Ev Bakım & Onarım Hizmeti';
      description = 'Evdeki teknik sorunlerin giderilmesi için genel usta desteği talep ediliyor.';
      explanationText = `Merhaba! Ben İşBitir Akıllı Arıza Teşhis Sihirbazıyım. 

Ev veya iş yerinizde yaşadığınız arızayı (örneğin priz kıvılcım çıkarıyor, musluk damlatıyor, kapıda kaldım, klima soğutmuyor vb.) bana kısaca tarif edebilirseniz:
- Olası sebepleri analiz ederim.
- Acil yapılması gereken güvenlik adımlarını söylerim.
- Sizin için otomatik bir ilan oluştururum ve tek tıkla yayınlayabilirsiniz.

Lütfen arızayı veya yapılması gereken işi kısaca yazar mısınız?`;
    }

    // Append the TEŞHİS RAPORU block only if we gave a diagnostic suggestion
    const matchedSub = getFallbackSubCategory(matchedCategory, msgLower);
    const hasDiagnostic = explanationText.includes('İlan Oluştur') || 
                          explanationText.includes('ilanı hazırladım') || 
                          explanationText.includes('ilan hazırlığı') ||
                          explanationText.includes('ilanı oluşturdum') ||
                          explanationText.includes('ilan verebilirsiniz') ||
                          explanationText.includes('talebi hazırladım') ||
                          explanationText.includes('butondan') ||
                          explanationText.includes('butonuna');
    const reportBlock = hasDiagnostic ? `\n\n[TEŞHİS RAPORU]\n{\n  "category": "${matchedCategory}",\n  "subCategory": "${matchedSub}",\n  "title": "${title}",\n  "description": "${description}"\n}` : '';

    return `${explanationText}${reportBlock}`;
  }
}

/**
 * Helper to determine best matching subcategory in fallback mode
 */
function getFallbackSubCategory(category: string, text: string): string {
  const t = text.toLowerCase();
  switch (category) {
    case 'elektrik':
      if (t.includes('lamba') || t.includes('ampul') || t.includes('ışık') || t.includes('avize') || t.includes('aydınlatma') || t.includes('aydinlatma') || t.includes('led') || t.includes('şerit') || t.includes('spot')) return 'aydinlatma';
      if (t.includes('priz') || t.includes('anahtar')) return 'priz-anahtar';
      if (t.includes('şalter') || t.includes('sigorta') || t.includes('pano')) return 'elektrik-panosu';
      if (t.includes('kablo') || t.includes('hat') || t.includes('çek')) return 'kablo-cekimi';
      if (t.includes('uydu') || t.includes('çanak') || t.includes('anten')) return 'uydu-sistemleri';
      if (t.includes('proje') || t.includes('çizim')) return 'elektrik-proje';
      if (t.includes('kontrol') || t.includes('kaçak')) return 'elektrik-kontrol';
      return '';
    case 'tesisat':
      if (t.includes('musluk') || t.includes('batarya') || t.includes('çeşme')) return 'musluk-batarya';
      if (t.includes('tıkan') || t.includes('gitmiyor') || t.includes('lavabo gideri')) return 'tikaniklik';
      if (t.includes('sızıntı') || t.includes('kaçak') || t.includes('damla')) return 'su-kacagi';
      if (t.includes('kombi') || t.includes('petek') || t.includes('ısınma')) return 'petek-kombi';
      return '';
    case 'cilingir':
      if (t.includes('barel') || t.includes('göbek') || t.includes('değiş')) return 'kilit-degisimi';
      if (t.includes('kasa')) return 'kasa-acma';
      if (t.includes('oto') || t.includes('araba') || t.includes('araç')) return 'oto-cilingir';
      return '';
    case 'klima':
      if (t.includes('bakım') || t.includes('filtre')) return 'klima-bakim';
      if (t.includes('gaz')) return 'gaz-dolumu';
      if (t.includes('temizlik') || t.includes('yıkama')) return 'klima-temizlik';
      if (t.includes('soğut') || t.includes('sıcak') || t.includes('bozuk') || t.includes('tamir')) return 'klima-tamir';
      return '';
    case 'beyaz-esya':
      if (t.includes('çamaşır')) return 'camasir-makinesi';
      if (t.includes('bulaşık')) return 'bulasik-makinesi';
      if (t.includes('buzdolabı') || t.includes('dolap')) return 'buzdolabi';
      if (t.includes('fırın') || t.includes('ocak')) return 'firin-ocak';
      if (t.includes('kurutma')) return 'kurutma-makinesi';
      return '';
    case 'kombi-servis':
      if (t.includes('bakım')) return 'kombi-bakim';
      if (t.includes('montaj') || t.includes('kurma')) return 'kombi-montaj';
      return '';
    case 'nakliyat':
      if (t.includes('ofis') || t.includes('işyeri')) return 'ofis-tasima';
      if (t.includes('paket') || t.includes('koli')) return 'esya-paketleme';
      if (t.includes('depo')) return 'depolama';
      return '';
    case 'temizlik':
      if (t.includes('ofis') || t.includes('işyeri') || t.includes('büro')) return 'ofis-temizligi';
      if (t.includes('inşaat') || t.includes('tadilat sonrası')) return 'insaat-temizligi';
      return '';
    case 'boya-badana':
      if (t.includes('dış') || t.includes('apartman dışı')) return 'dis-cephe-boya';
      if (t.includes('kağıt') || t.includes('duvar kağıdı')) return 'duvar-kagidi';
      if (t.includes('dekorasyon') || t.includes('alçıpan')) return 'dekorasyon';
      return '';
    case 'koltuk-hali':
      if (t.includes('halı')) return 'hali-yikama';
      if (t.includes('perde')) return 'perde-yikama';
      return '';
    case 'mobilya-montaj':
      if (t.includes('demontaj') || t.includes('sök')) return 'mobilya-demontaj';
      if (t.includes('mutfak')) return 'mutfak-montaj';
      return '';
    case 'kucuk-nakliye':
      if (t.includes('market') || t.includes('alışveriş') || t.includes('koli')) return 'market-alisveris';
      return '';
    case 'asansor':
      if (t.includes('bakım')) return 'asansor-bakim';
      if (t.includes('montaj') || t.includes('kurulum')) return 'asansor-montaj';
      return '';
    case 'bocek-ilaclama':
      if (t.includes('işyeri') || t.includes('ofis') || t.includes('fabrika')) return 'isyeri-ilaclama';
      if (t.includes('bahçe') || t.includes('tarla') || t.includes('açık alan')) return 'bahce-ilaclama';
      return '';
    case 'guvenlik-kamera':
      if (t.includes('alarm')) return 'alarm-sistemi';
      if (t.includes('bakım') || t.includes('arıza') || t.includes('onarım')) return 'kamera-bakim';
      return 'kamera-kurulum';
    default:
      return '';
  }
}

/**
 * Helper to match category from text keywords
 */
function matchCategoryFromText(text: string): string | null {
  const t = text.toLowerCase();
  
  if (t.includes('priz') || t.includes('şalter') || t.includes('sigorta') || t.includes('kablo') || t.includes('elektrik') || t.includes('cızırtı') || t.includes('kıvılcım') || t.includes('lamba') || t.includes('ampul') || t.includes('ışık') || t.includes('avize') || t.includes('led') || t.includes('şerit') || t.includes('spot') || t.includes('aydınlatma') || t.includes('aydinlatma')) {
    return 'elektrik';
  }
  if (t.includes('musluk') || t.includes('su') || t.includes('tesisat') || t.includes('akıt') || t.includes('boru') || t.includes('tıkan') || t.includes('sızıntı') || t.includes('banyo') || t.includes('lavabo') || t.includes('batarya') || t.includes('çeşme') || t.includes('gider')) {
    return 'tesisat';
  }
  if (t.includes('kilit') || t.includes('anahtar') || t.includes('kapı') || t.includes('çilingir') || t.includes('barel') || t.includes('göbek')) {
    return 'cilingir';
  }
  if (t.includes('klima') || t.includes('soğut') || t.includes('sıcak') || t.includes('gaz')) {
    return 'klima';
  }
  if (t.includes('çamaşır') || t.includes('bulaşık') || t.includes('buzdolabı') || t.includes('fırın') || t.includes('makine') || t.includes('beyaz eşya')) {
    return 'beyaz-esya';
  }
  if (t.includes('kombi') || t.includes('petek') || t.includes('ısınma') || t.includes('petekler')) {
    return 'kombi-servis';
  }
  if (t.includes('nakliyat') || t.includes('taşı') || t.includes('taşımacı') || t.includes('nakliye') || t.includes('taşınma')) {
    return 'nakliyat';
  }
  if (t.includes('temizlik') || t.includes('temizle') || t.includes('gündelik') || t.includes('temizlikçi')) {
    return 'temizlik';
  }
  if (t.includes('boya') || t.includes('badana') || t.includes('duvar') || t.includes('alçı') || t.includes('boyacı')) {
    return 'boya-badana';
  }
  if (t.includes('koltuk') || t.includes('halı') || t.includes('yıkama') || t.includes('temizleme')) {
    return 'koltuk-hali';
  }
  if (t.includes('mobilya') || t.includes('montaj') || t.includes('kurulum') || t.includes('dolap') || t.includes('kurma')) {
    return 'mobilya-montaj';
  }
  if (t.includes('kurye') || t.includes('hafif') || t.includes('kamyonet') || t.includes('küçük nakliye')) {
    return 'kucuk-nakliye';
  }
  if (t.includes('asansör') || t.includes('asansor') || t.includes('revizyon') || t.includes('asansör arıza')) {
    return 'asansor';
  }
  if (t.includes('böcek') || t.includes('haşere') || t.includes('ilaçlama') || t.includes('fare') || t.includes('pire')) {
    return 'bocek-ilaclama';
  }
  if (t.includes('kamera') || t.includes('güvenlik') || t.includes('alarm') || t.includes('cctv')) {
    return 'guvenlik-kamera';
  }
  
  return null;
}
