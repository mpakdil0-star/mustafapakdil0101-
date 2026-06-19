import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';

const CITIZEN_SYSTEM_PROMPT = `Sen "İşBitir" platformunun yapay zekalı arıza teşhis sihirbazısın. Vatandaş kullanıcılara evlerindeki veya iş yerlerindeki arızaları teşhis etmede yardımcı oluyorsun.
Görevin:
1. Kullanıcıdan gelen sorunu dinle ve arızanın ne olduğunu anlamak için kısa sorular sor (örn. prizden ses geliyor mu, su sızıntısı ne boyutta vb.).
2. Sorunla ilgili her zaman TÜRKÇE cevap ver. Net, kısa ve samimi ol.
3. KULLANICI GÜVENLİĞİ BİRİNCİ ÖNCELİKTİR. Eğer durum elektrik çarpması riski, gaz kaçağı veya yapısal çökme gibi tehlikeli durumlar içeriyorsa, KESİNLİKLE kalın harflerle GÜVENLİK UYARISI yap (Örn: "⚠️ UYARI: Elektrik sigortasını kapatın ve kendiniz müdahale etmeyin!").
4. Güvenli durumlarda basit, tehlikesiz kontrol adımları (DIY) öner (örn: bataryanın altındaki vanayı kapatmak, şalteri kontrol etmek).
5. Desteklediğimiz 15 hizmet kategorisi şunlardır: elektrik, cilingir, klima, beyaz-esya, tesisat, temizlik, nakliyat, boya-badana, koltuk-hali, mobilya-montaj, kucuk-nakliye, kombi-servis, asansor, bocek-ilaclama, guvenlik-kamera.
6. Sorunu ve hangi kategoriye girdiğini anladığında, cevabının en sonunda KESİNLİKLE aşağıdaki özel formatta teşhis raporu bloğu oluştur. Bu blok mobil uygulama tarafından otomatik okunup kullanıcının tek tıkla ilan açmasını sağlayacaktır.
Format:
[TEŞHİS RAPORU]
{
  "category": "kategori_id",
  "title": "Kısa ve açıklayıcı ilan başlığı",
  "description": "Sorunun kısa ve anlaşılır özeti. Ustanın anlayacağı detayda olmalı."
}
Kategori ID'si yukarıda listelenen 15 kategori id'sinden biri olmak zorundadır. Örneğin: elektrik, tesisat, cilingir vb.`;

const USTA_SYSTEM_PROMPT = `Sen "İşBitir" platformunun profesyonel teknik destek ve teklif hazırlama asistanısın. Hizmet veren ustalara (elektrikçi, tesisatçı vb.) teknik konularda ve teklif yazmada yardımcı oluyorsun.
Görevin:
1. Ustaların sorduğu teknik terimleri, standartları, hata kodlarını (örn. kombi hata kodları, elektrik tesisatı yönetmeliği kablo kesitleri vb.) açıkla.
2. Malzeme hesabı yapmada yardımcı ol.
3. Ustanın müşteriye gönderebileceği profesyonel teklif şablonları veya mesaj şablonları oluştur.
4. Cevaplarını her zaman TÜRKÇE ver. Net, teknik ve profesyonel bir üslup kullan.`;

export const handleAiChat = async (req: AuthRequest, res: Response) => {
  try {
    const { message, history } = req.body;
    const userType = req.user?.userType || 'CITIZEN';

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'Message is required' }
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.log('💡 GEMINI_API_KEY not found in environment. Using smart Turkish fallback.');
      const responseText = getFallbackResponse(message, userType);
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
    contents.push({
      role: 'user',
      parts: [{ text: message }]
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
    const responseText = getFallbackResponse(message, userType);

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
 * Intelligent Keyword-based Fallback System in Turkish
 */
function getFallbackResponse(message: string, userType: string): string {
  const msgLower = message.toLowerCase();

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
    let matchedCategory = 'elektrik';
    let title = 'Elektrik Tesisatı Kontrolü';
    let description = 'Evin elektrik tesisatındaki sorunların giderilmesi için usta desteği.';
    let explanationText = '';

    if (msgLower.includes('priz') || msgLower.includes('şalter') || msgLower.includes('sigorta') || msgLower.includes('kablo') || msgLower.includes('elektrik') || msgLower.includes('cızırtı') || msgLower.includes('kıvılcım')) {
      matchedCategory = 'elektrik';
      title = 'Priz veya Sigorta Arızası Onarımı';
      description = 'Prizde temassızlık/kıvılcım sorunu var veya şalter sürekli atıyor. Tesisatın kontrol edilip arızalı elemanların değiştirilmesi gerekiyor.';
      explanationText = `Elektrik tesisatı arızaları çok hassas ve risklidir.

⚠️ **ÖNEMLİ GÜVENLİK UYARISI:** Lütfen arızalı prizin bağlı olduğu veya tüm dairenin ana sigortasını kapatın! Prizleri sökmeye veya kabloları kurcalamaya çalışmayın.

**Önerilen İlk Yardım Adımları:**
1. Arızalı prize takılı olan tüm fişleri çıkartın.
2. Evde yanık veya plastik kokusu varsa hemen ana şalteri kapatın.
3. Kendi başınıza müdahale etmeyin.

Sizin için bir elektrik arıza talebi hazırladım. Aşağıdaki **"Tek Tıkla İlan Oluştur"** butonuna basarak ilaninizi hemen yayinlayabilir ve bölgenizdeki en iyi elektrikçi ustalardan teklif alabilirsiniz.`;
    } else if (msgLower.includes('musluk') || msgLower.includes('su') || msgLower.includes('tesisat') || msgLower.includes('akıt') || msgLower.includes('boru') || msgLower.includes('tıkan') || msgLower.includes('sızıntı') || msgLower.includes('banyo') || msgLower.includes('lavabo')) {
      matchedCategory = 'tesisat';
      title = 'Su Tesisatı Sızıntısı & Musluk Tamiri';
      description = 'Musluk dipten su damlatıyor veya giderde tıkanıklık var. Su sızıntısının tespiti ve arızalı parçanın onarımı/değişimi gerekiyor.';
      explanationText = `Su tesisatı sızıntısı evinize ve alt kata zarar verebilir.

⚠️ **UYARI:** Eğer sızıntı büyükse, daire girişindeki (saatin yanındaki) ana vanayı çevirerek suyu tamamen kapatın.

**Önerilen Adımlar:**
1. Su sayacının yanındaki vanadan su akışını durdurun.
2. Tıkanıklık durumunda kimyasal açıcıları aşırı kullanmaktan kaçının, plastik borulara zarar verebilirsiniz.
3. Sızıntı yerinin etrafındaki elektrikli aletleri uzaklaştırın.

Sizin için bir su tesisatı ilanı hazırladım. Aşağıdaki buton yardımıyla hemen teklif almaya başlayabilirsiniz.`;
    } else if (msgLower.includes('kilit') || msgLower.includes('anahtar') || msgLower.includes('kapı') || msgLower.includes('çilingir') || msgLower.includes('barel') || msgLower.includes('göbek')) {
      matchedCategory = 'cilingir';
      title = 'Acil Çilingir & Kilit Değişimi';
      description = 'Anahtar kapının arkasında kaldı veya kilit göbeği bozuldu. Kapının zarar verilmeden açılması ve kilit barelinin değiştirilmesi gerekiyor.';
      explanationText = `Kapıda kalma durumlarında kilidi zorlamamak en doğrusudur.

**Önerilen Adımlar:**
1. Anahtarı yuvasında zorla çevirmeye çalışmayın, kırılması halinde işi daha da zorlaştırır.
2. Çelik kapılarda kartla açma gibi amatör yöntemler kapı kasasına zarar verebilir.

Sizin için acil bir çilingir hizmet talebi hazırladım. Aşağıdaki butona tıklayarak en yakın güvenilir çilingir ustasını çağırabilirsiniz.`;
    } else if (msgLower.includes('klima') || msgLower.includes('soğut') || msgLower.includes('sıcak') || msgLower.includes('gaz')) {
      matchedCategory = 'klima';
      title = 'Klima Bakım ve Gaz Dolumu';
      description = 'Klima açılıyor fakat soğuk/sıcak hava üflemiyor. Gaz seviyesinin kontrol edilmesi, gerekiyorsa gaz dolumu ve filtre temizliği yapılması lazım.';
      explanationText = `Klima performans sorunları genellikle gaz eksilmesi veya filtre tıkanıklığından kaynaklanır.

**Önerilen Adımlar:**
1. Klimanın ön kapak mandallarını açıp toz filtrelerini çıkartın, sabunlu suyla yıkayıp tamamen kurutarak yerine takın.
2. Dış ünitenin önünde hava akışını engelleyen nesneler varsa kaldırın.
3. Klimanın kumanda modunun (Kar tanesi veya Güneş simgesi) doğru ayarlandığından emin olun.

Sizin için bir klima servisi ilanı hazırladım. Aşağıdaki butondan hemen usta bulabilirsiniz.`;
    } else if (msgLower.includes('çamaşır') || msgLower.includes('bulaşık') || msgLower.includes('buzdolabı') || msgLower.includes('fırın') || msgLower.includes('makine') || msgLower.includes('beyaz eşya')) {
      matchedCategory = 'beyaz-esya';
      title = 'Beyaz Eşya Onarımı';
      description = 'Beyaz eşya çalışırken su boşaltmıyor veya soğutmuyor. Arıza tespiti yapılması ve arızalı parçanın değiştirilmesi gerekiyor.';
      explanationText = `Beyaz eşya arızalarında elektrik ve su beslemelerini kontrol etmek ilk adımdır.

**Önerilen Adımlar:**
1. Çamaşır veya bulaşık makineniz su boşaltmıyorsa, alt kısımdaki pompa filtresini yavaşça açarak yabancı cisim (düğme, bozuk para vb.) olup olmadığını kontrol edin (Dikkat: su akacaktır, altına kap koyun).
2. Buzdolabınız soğutmuyorsa, arkasındaki tozlu ızgaraların hava almasını engelleyen duvar mesafesini kontrol edin.

Sizin için bir beyaz eşya teknik servis talebi hazırladım. Ustalardan teklif almak için aşağıdaki butona tıklayın.`;
    } else if (msgLower.includes('kombi') || msgLower.includes('petek') || msgLower.includes('ısınma') || msgLower.includes('petekler')) {
      matchedCategory = 'kombi-servis';
      title = 'Kombi Arızası ve Petek Temizliği';
      description = 'Kombi sıcak su vermiyor veya petekler ısınmıyor. Bar basıncının ayarlanması, kombi arıza giderme veya petek temizliği gerekiyor.';
      explanationText = `Kombi sistemlerindeki arızalarda gaz ve su basınçları çok önemlidir.

⚠️ **GÜVENLİK UYARISI:** Evde doğalgaz veya çürük yumurta kokusu alıyorsanız, derhal kombiyi kapatın, ana gaz vanasını kapatın, pencereleri açın ve 187 Doğalgaz Acil hattını arayın! Elektrik düğmelerine basmayın.

**Önerilen Adımlar:**
1. Kombi su basınç göstergesini (manometre) kontrol edin. Basınç 1.0 barın altındaysa kombi altındaki küçük vanayı açarak 1.5 bar olana kadar su ekleyin.
2. Kombinizi resetleyin (kapatıp 1 dakika bekledikten sonra tekrar açın).

Sizin için kombi ve petek servisi ilanı oluşturdum. Aşağıdaki butondan hızlıca ilan verebilirsiniz.`;
    } else if (msgLower.includes('nakliyat') || msgLower.includes('taşı') || msgLower.includes('taşımacı') || msgLower.includes('nakliye') || msgLower.includes('taşınma')) {
      matchedCategory = 'nakliyat';
      title = 'Evden Eve Nakliyat & Taşıma Hizmeti';
      description = 'Ev veya iş yeri eşyalarının yeni adrese güvenle taşınması ve nakliye aracı desteği talep ediliyor.';
      explanationText = `Ev taşıma ve nakliyat süreçlerinde planlama en önemli adımdır.

**Önerilen Adımlar:**
1. Kırılacak hassas eşyalarınızı önceden kolileyip üzerine mutlaka uyarı yazısı yazın.
2. Beyaz eşyaların sabitleme vidalarını takın ve taşımadan önce boşaltıp buzlarını çözdürün.
3. Yeni evdeki yerleşim planını önceden belirleyin.

Sizin için evden eve nakliyat ilanı hazırladım. Aşağıdaki butona tıklayarak profesyonel nakliyeci ustalardan teklif alabilirsiniz.`;
    } else if (msgLower.includes('temizlik') || msgLower.includes('temizle') || msgLower.includes('gündelik') || msgLower.includes('temizlikçi')) {
      matchedCategory = 'temizlik';
      title = 'Detaylı Ev & Ofis Temizliği';
      description = 'Ev veya ofis temizliği için deneyimli yardımcı desteği talep ediliyor.';
      explanationText = `Profesyonel temizlik hizmeti alırken ihtiyaçlarınızı netleştirmeniz önemlidir.

**Önerilen Adımlar:**
1. İnşaat sonrası temizlik veya standart ev temizliği gibi detayları ustaya belirtin.
2. Temizlik malzemelerinin usta tarafından mı yoksa sizin tarafınızdan mı sağlanacağını netleştirin.

Sizin için temizlik hizmeti ilanı hazırladım. Aşağıdaki butondan hızlıca ilan verebilirsiniz.`;
    } else if (msgLower.includes('boya') || msgLower.includes('badana') || msgLower.includes('duvar') || msgLower.includes('alçı') || msgLower.includes('boyacı')) {
      matchedCategory = 'boya-badana';
      title = 'Boya Badana & Duvar Boyama Hizmeti';
      description = 'Ev veya ofis odalarının alçı, sıva ve boya badana işlemlerinin yapılması gerekiyor.';
      explanationText = `Boya badana işlerinde renk seçimi ve yüzey hazırlığı çok önemlidir.

**Önerilen Adımlar:**
1. Boyanacak alanlardaki priz kapaklarını sökün ve süpürgelikleri maskeleme bandıyla kapatın.
2. Eşyaları odanın ortasına toplayıp üzerlerini koruyucu örtüyle örtün.

Sizin için boya badana ilanı hazırladım. Aşağıdaki butondan hemen teklif almaya başlayabilirsiniz.`;
    } else if (msgLower.includes('koltuk') || msgLower.includes('halı') || msgLower.includes('yıkama') || msgLower.includes('temizleme')) {
      matchedCategory = 'koltuk-hali';
      title = 'Koltuk ve Halı Yıkama Hizmeti';
      description = 'Koltukların ve halıların profesyonel makinelerle yerinde veya fabrikada yıkanması.';
      explanationText = `Koltuk ve halı yıkama işlemleri kumaş türüne göre özel deterjanlar gerektirir.

**Önerilen Adımlar:**
1. Yıkanacak ürünlerin kumaş türünü ve varsa lekelerin kaynağını ustaya önceden bildirin.
2. Yıkama sonrası kuruma süresi için ortamın havalandırılmasını sağlayın.

Sizin için yıkama hizmeti ilanı hazırladım. Aşağıdaki butondan teklif toplayabilirsiniz.`;
    } else if (msgLower.includes('mobilya') || msgLower.includes('montaj') || msgLower.includes('kurulum') || msgLower.includes('dolap') || msgLower.includes('kurma')) {
      matchedCategory = 'mobilya-montaj';
      title = 'Mobilya Kurulum & Montaj Hizmeti';
      description = 'Demonte mobilyaların (gardırop, dolap, masa vb.) montajının yapılması gerekiyor.';
      explanationText = `Mobilya montajında doğru kılavuz takibi ve hizalama önemlidir.

**Önerilen Adımlar:**
1. Mobilya paketlerini montajın yapılacağı odada açın.
2. Eksik vida veya parça olup olmadığını paket içeriğinden kontrol edin.

Sizin için mobilya montaj ilanı hazırladım. Aşağıdaki butondan usta bulabilirsiniz.`;
    } else if (msgLower.includes('kurye') || msgLower.includes('hafif') || msgLower.includes('kamyonet') || msgLower.includes('küçük nakliye')) {
      matchedCategory = 'kucuk-nakliye';
      title = 'Küçük Nakliye & Parça Eşya Taşıma';
      description = 'Birkaç parça eşyanın kamyonet veya hafif ticari araçla hızlıca taşınması.';
      explanationText = `Küçük nakliye işlerinde eşyaların boyutlarını ve ağırlığını net belirtmek uygun araç seçimi için kritiktir.

**Önerilen Adımlar:**
1. Taşınacak parça eşyaların ölçülerini önceden kaydedin.
2. Taşıma esnasında paketleme gerekip gerekmediğini ustaya bildirin.

Sizin için küçük nakliye ilanı hazırladım. Aşağıdaki butondan hemen ilan oluşturabilirsiniz.`;
    } else if (msgLower.includes('asansör') || msgLower.includes('asansor') || msgLower.includes('revizyon') || msgLower.includes('asansör arıza')) {
      matchedCategory = 'asansor';
      title = 'Asansör Bakım & Onarım Hizmeti';
      description = 'Asansörün periyodik bakımı veya arıza onarım işlemlerinin yapılması.';
      explanationText = `Asansör sistemleri can güvenliği açısından sadece yetkili firmalarca kontrol edilmelidir.

⚠️ **GÜVENLİK UYARISI:** Arızalı asansörü kesinlikle kullanıma kapatın ve üzerine uyarı levhası asın. Yetkisiz kişilerin müdahale etmesine izin vermeyin.

Sizin için asansör servis ilanı hazırladım. Aşağıdaki butondan yetkili ustalara ulaşabilirsiniz.`;
    } else if (msgLower.includes('böcek') || msgLower.includes('haşere') || msgLower.includes('ilaçlama') || msgLower.includes('fare') || msgLower.includes('pire')) {
      matchedCategory = 'bocek-ilaclama';
      title = 'Böcek ve Haşere İlaçlama Hizmeti';
      description = 'Ev veya iş yerindeki haşere, böcek ve kemirgenlere karşı profesyonel ilaçlama.';
      explanationText = `İlaçlama işlemlerinde kullanılan kimyasalların sağlık bakanlığı onaylı olması gerekir.

⚠️ **GÜVENLİK UYARISI:** İlaçlama esnasında ortamda evcil hayvan veya gıda maddesi bulundurmayın. İlaçlama sonrası alanı belirtilen süre boyunca havalandırın.

Sizin için ilaçlama ilanı hazırladım. Aşağıdaki butondan teklif alabilirsiniz.`;
    } else if (msgLower.includes('kamera') || msgLower.includes('güvenlik') || msgLower.includes('alarm') || msgLower.includes('cctv')) {
      matchedCategory = 'guvenlik-kamera';
      title = 'Güvenlik Kamerası & Alarm Kurulumu';
      description = 'Kamera sistemlerinin montajı, kablolama ve alarm kurulumu işlemleri.';
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
    const hasDiagnostic = explanationText.includes('İlan Oluştur') || explanationText.includes('ilanı hazırladım') || explanationText.includes('ilan hazırlığı');
    const reportBlock = hasDiagnostic ? `\n\n[TEŞHİS RAPORU]\n{\n  "category": "${matchedCategory}",\n  "title": "${title}",\n  "description": "${description}"\n}` : '';

    return `${explanationText}${reportBlock}`;
  }
}
