import LegalPage from '@/components/LegalPage';
import { legalIdentity } from '@/constants/legal';

export const metadata = { title: 'Tahminler ve Platformun Rolü', description: 'İşBitir üzerindeki süre, mesafe, teklif ve hizmet bilgilerinin niteliği.', robots: legalIdentity.ready ? undefined : { index: false, follow: false } };

export default function DisclaimerPage() {
  return <LegalPage title="Tahminler ve Platformun Rolü" description="Süre, mesafe, bildirim, teklif ve bağımsız usta hizmetleri hakkındaki önemli sınırlar.">
    <section><h2>1. Süre ve mesafe bilgileri</h2><p>Usta tarafından belirtilen tahmini süre ile sistemde gösterilebilen konum veya mesafe bilgileri bilgilendirme amaçlıdır. Trafik, hava, yol, cihaz konumu, bağlantı, mevcut iş yükü ve diğer koşullar nedeniyle değişebilir. İşBitir belirli dakikada varış veya hizmetin belirli sürede tamamlanacağı taahhüdünü vermez.</p></section>
    <section><h2>2. Bildirim ve eşleşme</h2><p>Yeni talep için bildirim kaydı oluşturulması, her cihazda bildirimin teslim edildiği veya bir ustanın teklif vereceği anlamına gelmez. Ustanın aktifliği, profil onayı, hizmet kategorisi, hizmet bölgesi, uygulama izinleri ve bağlantısı sonucu etkileyebilir.</p></section>
    <section><h2>3. Teklif ve nihai bedel</h2><p>Teklif, ilandaki bilgilere göre usta tarafından girilir. Yerinde inceleme, ek iş ve malzeme ihtiyacı ortaya çıkabilir. Taraflar hizmet başlamadan önce kapsam, toplam bedel, ödeme, süre ve fatura koşullarını netleştirmelidir.</p></section>
    <section><h2>4. Bağımsız hizmet sağlayıcı</h2><p>Ustalar, aksi açıkça belirtilmedikçe bağımsız hizmet sağlayıcılardır. Platformdaki profil veya belge kontrolü, her hizmetin kalitesi, mevzuata uygunluğu veya sonucu için garanti değildir. Kullanıcı, işin niteliğine göre gerekli yetki ve belgeleri ustadan istemelidir.</p></section>
    <section><h2>5. Zorunlu haklar</h2><p>Bu bilgilendirme; İşBitir’in kendi teknik işletimi ve mevzuattan doğan zorunlu sorumluluklarını, tüketicinin emredici haklarını veya hizmeti sunan ustanın kendi fiillerinden doğan sorumluluğunu ortadan kaldırmaz.</p></section>
  </LegalPage>;
}
