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
Verileriniz, hesabınız aktif olduğu sürece saklanır. Uygulama içerisindeki "Profil > Hesabı Sil" butonunu kullanarak veya destek@isbitir.com üzerinden hesabınızın ve size ait tüm kayıtların tamamen silinmesini talep edebilirsiniz.

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
İşbu Kullanım Koşulları, İş Bitir uygulamasını kullanan tüm kullanıcılar ile İş Bitir yönetimi arasında akdedilmiştir. Uygulamayı kullanarak bu koşulları kabul etmiş sayılırsınız.

2. Yaş Sınırı
İş Bitir platformunu kullanabilmek için en az 18 yaşında olmanız gerekmektedir.

3. Platformun "Aracı" Rolü ve Sorumluluk Sınırı
- İş Bitir; yalnızca hizmet almak isteyenler ile hizmet veren ustaları bir araya getiren bağımsız bir aracı platformdur.
- Platform, uygulama üzerinden anlaşılan işlerin kalitesini, zamanında yapılmasını veya taraflar arasındaki maddi anlaşmazlıkları garanti etmez.
- İşe ait maddi ve bedensel zararlardan İş Bitir sorumlu tutulamaz. Tüm hukuki sorumluluk hizmeti veren ile alan arasındaki anlaşmaya dayanır.

4. Kullanıcı Yükümlülükleri
- Kullanıcılar platformda yanıltıcı bilgiler veremez. 
- Ustalar, ibraz ettikleri tüm dökümanların doğruluğunu taahhüt ederler.

5. Krediler ve İade Politikası
- Ustaların teklif verebilmesi için kredi sistemi kullanılmaktadır.
- Bir müşteri (Vatandaş) talebini/ilanını iptal ederse, o ilana teklif vermiş olan ustaların kredileri sistem tarafından otomatik olarak iade edilir.
- Bunun dışında, kullanılmış/harcanmış kredilerin iadesi yapılmaz. Hiç harcanmamış kredi paketleri için ilgili marketlerin (Google Play vb.) iade prosedürleri geçerlidir.

6. Hesabın Kapatılması
Kuralları ihlal eden veya güvenliği tehdit eden hesaplar önceden haber verilmeksizin kalıcı olarak kapatılabilir.

7. Sözleşme Değişiklikleri
İş Bitir yönetimi işbu koşulları dilediği zaman güncelleme hakkını saklı tutar.`;

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

