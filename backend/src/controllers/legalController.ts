import { Request, Response, NextFunction } from 'express';
import { mockStorage } from '../utils/mockStorage';
import { AuthRequest } from '../middleware/auth';

/**
 * Get all active legal documents/policies (JSON for app)
 */
export const getLegalDocuments = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const docs = mockStorage.getLegalDocs();
        res.json({
            success: true,
            data: docs
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Helper to render a consistent HTML template for legal pages
 */
const renderLegalHtml = (title: string, content: string, lastUpdate: string) => `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} | İş Bitir</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            line-height: 1.6;
            color: #1e293b;
            background-color: #f8fafc;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 800px;
            margin: 40px auto;
            background: #ffffff;
            padding: 40px;
            border-radius: 16px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        .header {
            border-bottom: 2px solid #f1f5f9;
            margin-bottom: 30px;
            padding-bottom: 20px;
        }
        h1 {
            color: #0f172a;
            font-size: 28px;
            margin: 0 0 10px 0;
        }
        .last-update {
            color: #64748b;
            font-size: 14px;
        }
        .content {
            white-space: pre-line;
            font-size: 16px;
        }
        .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #f1f5f9;
            text-align: center;
            color: #94a3b8;
            font-size: 14px;
        }
        @media (max-width: 640px) {
            .container {
                margin: 0;
                border-radius: 0;
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${title}</h1>
            <div class="last-update">Son Güncelleme: ${lastUpdate}</div>
        </div>
        <div class="content">${content}</div>
        <div class="footer">
            &copy; 2026 İş Bitir - Tüm Hakları Saklıdır.
        </div>
    </div>
</body>
</html>
`;

/**
 * View KVKK Policy as HTML (Public URL for Google Play)
 */
export const viewKvkkHtml = async (req: Request, res: Response) => {
    const title = 'KVKK ve Gizlilik Politikası';
    const lastUpdate = '25 Mart 2026';
    const content = `1. Veri Sorumlusu
6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca, İş Bitir ("Uygulama") veri sorumlusu sıfatıyla hareket etmektedir. Kişisel verileriniz, bu metinde belirtilen çerçevede ve yasal mevzuata uygun olarak işlenmektedir.

2. Toplanan Kişisel Verileriniz
Size hizmet sunabilmek amacıyla aşağıdaki verileri toplamaktayız:
- Kimlik ve İletişim Verileri: Ad, soyad, telefon numarası, e-posta adresi.
- Hizmet Veren (Usta) Verileri: Ustalık belgesi, mesleki belgeler, uzmanlık alanları.
- Konum Verileri: Uygulama, iş ilanlarının doğru şekilde eşleşebilmesi amacıyla, aktif kullanım sırasında konum bilginizi toplar.
- Cihaz Verileri: IP adresi, cihaz modeli, bildirim token'ları.

3. Verilerin İşlenme Amaçları
- Platform üzerinden hizmet alan ve hizmet vereni bir araya getirmek,
- Güvenlik ve kimlik doğrulaması sağlamak,
- Uygulama içi iyileştirmelerin yapılması ve teknik desteğin sağlanması,
- Yasal yükümlülüklerin yerine getirilmesi.

4. Konum Verilerinin Kullanımı
İş Bitir, adres bazlı bir hizmet platformudur. Konum veriniz sadece siz izin verdiğinizde ve uygulamayı aktif olarak kullandığınızda işlenir. Arka planda gizli konum takibi yapılmaz.

5. Veri Paylaşımı
Kişisel verileriniz, yasal zorunluluklar hariç, üçüncü taraflarla reklam veya pazarlama amacıyla paylaşılmaz. Sadece onayladığınız iş süreçlerinde, ilgili usta veya müşteri ile sınırlı bilgiler paylaşılır.

6. Veri Saklama ve Hesap Silme
Verileriniz, hesabınız aktif olduğu sürece saklanır. Uygulama içerisindeki "Profil > Güvenlik > Hesabı Sil" butonunu kullanarak veya isbitir.destek@gmail.com üzerinden hesabınızın ve size ait tüm kayıtların tamamen silinmesini talep edebilirsiniz. Hesap silme talepleri 30 gün içinde sonuçlandırılır. Bu süre zarfında veriler, yasal saklama yükümlülükleri hariç olmak üzere anonim hale getirilerek sistemden temizlenir.

7. Haklarınız
KVKK Madde 11 uyarınca; verilerinizin işlenip işlenmediğini öğrenme, düzeltme veya silinmesini talep etme hakkınız bulunmaktadır.`;

    res.send(renderLegalHtml(title, content, lastUpdate));
};

/**
 * View Terms of Use as HTML (Public URL for Google Play)
 */
export const viewTermsHtml = async (req: Request, res: Response) => {
    const title = 'Kullanım Koşulları';
    const lastUpdate = '25 Mart 2026';
    const content = `1. Taraflar ve Sözleşmenin Kabulü
İşbu Kullanım Koşulları, İş Bitir uygulamasını cihazına indiren veya kullanan tüm kullanıcılar (Hizmet Alan "Vatandaş" ve Hizmet Veren "Usta") ile İş Bitir yönetimi arasında akdedilmiştir. Uygulamayı kullanarak bu koşulları peşinen kabul etmiş olursunuz.

2. Yaş Sınırı
İş Bitir platformunu kullanarak bir iş ilanı açmak veya ustalık hizmeti verebilmek için en az 18 yaşında (reşit) olmanız gerekmektedir. 18 yaşından küçüklerin platformu kullandığının tespiti halinde hesapları derhal kapatılır.

3. Platformun "Aracı" Rolü ve Sorumluluk Sınırı
- İş Bitir; yalnızca hizmet almak isteyenler ile hizmet veren ustaları/uzmanları dijital ortamda bir araya getiren bağımsız bir aracı platformdur.
- Platform, uygulama üzerinden anlaşılan işlerin kalitesini, zamanında yapılmasını, ustaların yeterliliğini veya taraflar arasındaki fiziki/maddi anlaşmazlıkları garanti etmez.
- İşe ait maddi ve bedensel zararlardan, işçilik kusurlarından İş Bitir veya geliştiricileri hiçbir şekilde hukuki ve cezai olarak sorumlu tutulamaz. Tüm hukuki sorumluluk hizmeti veren Usta ile hizmeti alan Vatandaş arasındaki anlaşmaya dayanır.
- Tarafların birbirlerine karşı işlediği hakaret, tehdit, taciz, hırsızlık veya mala zarar verme gibi Türk Ceza Kanunu kapsamındaki eylemlerden İş Bitir sorumlu değildir. Platform, yalnızca adli makamların resmi talebi doğrultusunda elindeki kayıtları paylaşmakla yükümlüdür.

4. Kullanıcı Yükümlülükleri
- Vatandaş (Müşteri): Platformda yanıltıcı bilgilerle veya ustaları oyalama amaçlı sahte iş ilanları oluşturamaz. Açtığı ilandaki iş tanımını ve adresini doğru belirtmek zorundadır.
- Usta (Hizmet Veren): Platforma ibraz ettiği tüm belgelerin (ustalık, diploma, kimlik vb.) gerçek ve kendine ait olduğunu taahhüt eder. Müşterilere karşı nezaket kurallarına ve mesleki standartlara uymakla yükümlüdür.

5. Krediler, Ödemeler ve İade Politikası
- Ustaların platform üzerinden yayımlanan işlere teklif verebilmesi için "Kredi" sistemini kullanması gerekmektedir.
- Satın alınan krediler sadece platform içinde kullanım içindir. Uygulama dışında başka bir para birimine, nakde dönüştürülemez.
- Bir müşteri ilanı iptal ederse, o ilana teklif vermiş olan tüm ustaların kredileri sistem tarafından otomatik olarak hesaplarına iade edilir.
- Bunun dışında iade yapılmaz. Harcanmamış paketler market kurallarına tabidir.

6. Hesabın Kapatılması ve Askıya Alınması
Kullanıcılar platformu herhangi bir dolandırıcılık veya topluluk kurallarına aykırı kullandıklarında İş Bitir, önceden haber vermeksizin hesabı bloke etme hakkını saklı tutar.

7. Sözleşme Değişiklikleri
İş Bitir yönetimi bu metni dilediği zaman güncelleyebilir. Yayınlandığı andan itibaren tüm kullanıcılar için geçerli olur.

8. Uyuşmazlıkların Çözümü
İhtilaflarda Türkiye Cumhuriyeti yasaları uygulanacak olup, İstanbul Mahkemeleri ve İcra Daireleri yetkili olacaktır.

9. Mali Sorumluluk ve Vergi
İş Bitir, taraflar arasındaki hizmet bedeli tahsilatına veya ödeme süreçlerine aracılık etmez. Sunulan hizmete dair fatura/fiş düzenleme yükümlülüğü tamamen Hizmet Veren'e (Usta) aittir. Platform, doğabilecek vergi mükellefiyetlerinden sorumlu tutulamaz.

10. Pazarlama ve Bildirim İzni
Kullanıcı, işbu sözleşmeyi onaylayarak uygulama içindeki gelişmeler, yeni hizmetler ve avantajlı teklifler hakkında tarafına Push bildirim ve ticari elektronik ileti gönderilmesine açık rıza göstermiş sayılır.`;


    res.send(renderLegalHtml(title, content, lastUpdate));
};

/**
 * Record a user consent
 */
export const recordConsent = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { documentType, documentVersion, action, marketingAllowed } = req.body;
        const userId = req.user?.id;

        if (!documentType || !documentVersion || !action) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        // Extract IP and User-Agent
        const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];

        const consent = mockStorage.addConsent({
            userId: userId || 'guest',
            documentType,
            documentVersion,
            ipAddress,
            userAgent,
            action: action as 'ACCEPTED' | 'REJECTED'
        });

        // If user is logged in and marketingAllowed is provided, update profile
        if (userId && marketingAllowed !== undefined) {
            mockStorage.updateProfile(userId, { marketingAllowed });
        }

        res.json({
            success: true,
            data: consent
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Audit View - List all recorded consents (Admin only or for debugging/verification)
 */
export const viewConsentsHtml = async (req: Request, res: Response) => {
    const consents = mockStorage.getAllConsents();
    const sortedConsents = [...consents].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const tableRows = sortedConsents.map(c => `
        <tr>
            <td style="padding: 12px; border: 1px solid #e2e8f0;">${new Date(c.createdAt).toLocaleString('tr-TR')}</td>
            <td style="padding: 12px; border: 1px solid #e2e8f0;">${c.userId}</td>
            <td style="padding: 12px; border: 1px solid #e2e8f0;">${c.documentType} (${c.documentVersion})</td>
            <td style="padding: 12px; border: 1px solid #e2e8f0; font-weight: 600; color: ${c.action === 'ACCEPTED' ? '#10b981' : '#ef4444'}">${c.action}</td>
            <td style="padding: 12px; border: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">${c.ipAddress || '-'}</td>
        </tr>
    `).join('');

    const html = `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>İş Bitir - Rıza Denetim Günlüğü (Audit Log)</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Inter', sans-serif; background: #f8fafc; padding: 40px; color: #1e293b; }
            .container { max-width: 1000px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
            h1 { font-size: 24px; color: #0f172a; margin-bottom: 20px; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { text-align: left; background: #f1f5f9; padding: 12px; border: 1px solid #e2e8f0; font-weight: 600; }
            tr:hover { background: #f8fafc; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>📄 KVKK & Rıza Kayıtları (Audit Log)</h1>
            <p style="color: #64748b; margin-bottom: 20px;">Sistem üzerinden alınan tüm yasal sözleşme onayları aşağıda listelenmiştir.</p>
            <table>
                <thead>
                    <tr>
                        <th>Tarih</th>
                        <th>Kullanıcı (ID)</th>
                        <th>Döküman</th>
                        <th>Eylem</th>
                        <th>IP Adresi</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows || '<tr><td colspan="5" style="text-align:center; padding: 20px;">Henüz kayıtlı rıza bulunmamaktadır.</td></tr>'}
                </tbody>
            </table>
        </div>
    </body>
    </html>
    `;

    res.send(html);
};
