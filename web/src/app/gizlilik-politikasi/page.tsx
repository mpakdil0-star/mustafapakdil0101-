import Link from 'next/link';
import LegalPage from '@/components/LegalPage';
import { legalIdentity } from '@/constants/legal';

export const metadata = { title: 'Gizlilik Politikası', description: 'İşBitir web ve mobil hizmetlerinin gizlilik ve veri güvenliği yaklaşımı.', robots: legalIdentity.ready ? undefined : { index: false, follow: false } };

export default function PrivacyPolicyPage() {
  return <LegalPage title="Gizlilik Politikası" description="Verilerinizi hangi ürün ilkeleriyle koruduğumuzu ve web oturumunun nasıl çalıştığını açıklıyoruz.">
    <section><h2>1. Kapsam</h2><p>Bu politika İşBitir web sitesi, vatandaş talep akışı ve usta mobil uygulamasındaki gizlilik uygulamalarını açıklar. Kişisel verilerin işlenmesine ilişkin zorunlu bilgiler için ayrıca <Link href="/kvkk">KVKK Aydınlatma Metni</Link>’ni inceleyin.</p></section>
    <section><h2>2. Veri minimizasyonu</h2><p>Talep oluşturmak için hizmetin yürütülmesi bakımından gerekli ad, telefon, kategori ve bölge bilgileri alınır. Pazarlama izni talep oluşturmanın şartı değildir. Açıklama ve açık adres alanlarına gereksiz özel nitelikli kişisel veri, kimlik numarası, kart bilgisi veya üçüncü kişilere ait bilgi yazılmamalıdır.</p></section>
    <section><h2>3. Telefon ve konum</h2><p>Telefon numarası teklif veren ustalara açık listelenmez; yalnızca kabul edilen usta için hizmet iletişimi amacıyla erişilebilir olur. Cihaz koordinatı tarayıcı iznine bağlı ve isteğe bağlıdır. Kullanıcı il, ilçe ve mahalleyi elle girerek de devam edebilir.</p></section>
    <section><h2>4. Oturum teknolojileri</h2><p>Web talebinin güvenli biçimde aynı kullanıcıya bağlanabilmesi için tarayıcıda zorunlu oturum verisi saklanır. Bu veri reklam profillemesi amacıyla kullanılmaz. Tarayıcı verilerinin silinmesi, üyelik gerektirmeyen takip bağlantısına erişimin kaybolmasına neden olabilir.</p></section>
    <section><h2>5. Güvenlik</h2><p>Yetkilendirme, satır düzeyi erişim kuralları, sınırlı veri paylaşımı, işlem kayıtları ve kötüye kullanım sınırları gibi teknik/idari tedbirler uygulanır. Hiçbir internet aktarımının mutlak güvenlik garantisi yoktur; şüpheli bir durum fark ederseniz <a href={`mailto:${legalIdentity.supportEmail}`}>{legalIdentity.supportEmail}</a> adresine bildirin.</p></section>
    <section><h2>6. Analitik ve pazarlama</h2><p>Mevcut web akışında isteğe bağlı reklam veya davranışsal analiz çerezi etkinleştirilmemiştir. Gelecekte zorunlu olmayan bir teknoloji eklenirse, çalıştırılmadan önce ayrı tercih mekanizması ve gerekli bilgilendirme sunulmalıdır.</p></section>
    <section><h2>7. Değişiklikler ve iletişim</h2><p>Politika ürün veya mevzuat değişikliklerine göre güncellenebilir; önemli değişiklikler güncel tarih ile yayımlanır. Gizlilik soruları için <a href={`mailto:${legalIdentity.legalEmail}`}>{legalIdentity.legalEmail}</a> adresine başvurabilirsiniz.</p></section>
  </LegalPage>;
}
