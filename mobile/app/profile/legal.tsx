import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors } from '../../constants/colors';
import { fonts } from '../../constants/typography';
import { spacing } from '../../constants/spacing';
import { useAppColors } from '../../hooks/useAppColors';
import { PremiumHeader } from '../../components/common/PremiumHeader';

type LegalType = 'terms' | 'kvkk';

const CONTENT = {
    terms: {
        title: 'Kullanım Koşulları',
        lastUpdate: '25 Mart 2026',
        text: `1. Taraflar ve Sözleşmenin Kabulü
İşbu Kullanım Koşulları, İş Bitir uygulamasını cihazına indiren veya kullanan tüm kullanıcılar (Hizmet Alan "Vatandaş" ve Hizmet Veren "Usta") ile İş Bitir yönetimi arasında akdedilmiştir. Uygulamayı kullanarak bu koşulları peşinen kabul etmiş olursunuz.

2. Yaş Sınırı
İş Bitir platformunu kullanarak bir iş ilanı açmak veya ustalık hizmeti verebilmek için en az 18 yaşında (reşit) olmanız gerekmektedir. 18 yaşından küçüklerin platformu kullandığının tespiti halinde hesapları derhal kapatılır.

3. Platformun "Aracı" Rolü ve Sorumluluk Sınırı
- İş Bitir; yalnızca hizmet almak isteyenler ile hizmet veren ustaları/uzmanları dijital ortamda bir araya getiren bağımsız bir aracı platformdur.
- Platform, uygulama üzerinden anlaşılan işlerin kalitesini, zamanında yapılmasını, ustaların yeterliliğini veya taraflar arasındaki fiziki/maddi anlaşmazlıkları garanti etmez.
- İşe ait maddi ve bedensel zararlardan, işçilik kusurlarından İş Bitir veya geliştiricileri hiçbir şekilde hukuki ve cezai olarak sorumlu tutulamaz. Tüm hukuki sorumluluk hizmeti veren Usta ile hizmeti alan Vatandaş arasındaki anlaşmaya dayanır.

4. Kullanıcı Yükümlülükleri
- Vatandaş (Müşteri): Platformda yanıltıcı bilgilerle veya ustaları oyalama amaçlı sahte iş ilanları oluşturamaz. Açtığı ilandaki iş tanımını ve adresini doğru belirtmek zorundadır.
- Usta (Hizmet Veren): Platforma ibraz ettiği tüm belgelerin (ustalık, diploma, kimlik vb.) gerçek ve kendine ait olduğunu taahhüt eder. Müşterilere karşı nezaket kurallarına ve mesleki standartlara uymakla yükümlüdür.

5. Krediler, Ödemeler ve İade Politikası
- Ustaların platform üzerinden yayımlanan işlere teklif verebilmesi için "Kredi" sistemini kullanması gerekmektedir.
- Satın alınan krediler sadece platform içinde kullanım (teklif verme vs.) içindir. Uygulama dışında başka bir para birimine, nakde dönüştürülemez ve başkasına devredilemez.
- Krediler teklif verme esnasında harcanır. Ancak, bir müşteri (Vatandaş) talebini/ilanını iptal ederse, o ilana teklif vermek için kredi harcamış olan tüm ustaların kredileri sistem tarafından otomatik olarak hesaplarına iade edilir.
- Bunun dışında (müşterinin ilanı iptal etmemesi durumu hariç), kullanılmış ve harcanmış kredilerin iadesi yapılmaz.
- Hiç harcanmamış dijital kredi paketleri, ilgili uygulama marketi itiraz süreçleri veya yerel tüketici hakları kapsamında iade talebine konu edilebilir.

6. Hesabın Kapatılması ve Askıya Alınması
Kullanıcılar platformu herhangi bir dolandırıcılık, istismar, spam veya topluluk kurallarına aykırı kullandıklarında İş Bitir, önceden haber vermeksizin kullanıcının hesabını kalıcı olarak bloke etme, ilanlarını silme ve kredilerini iptal etme hakkını saklı tutar.

7. Sözleşme Değişiklikleri
İş Bitir yönetimi işbu Kullanım Koşulları belgesinde zaman zaman değişiklik yapabilir. Yapılan düzenlemeler Uygulama içerisinde yayınlandığı andan itibaren tüm kullanıcılar için geçerli olur.

8. Uyuşmazlıkların Çözümü
İşbu sözleşmenin uygulanmasından ve yorumlanmasından doğacak her türlü ihtilaflarda Türkiye Cumhuriyeti yasaları uygulanacak olup, İstanbul Mahkemeleri ve İcra Daireleri yetkili olacaktır.`
    },
    kvkk: {
        title: 'KVKK ve Veri Politikası',
        lastUpdate: '25 Mart 2026',
        text: `1. Veri Sorumlusu
İş Bitir ("Uygulama" veya "Biz"), kullanıcıların ("Siz") kişisel verilerini 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") ve ilgili mevzuata uygun olarak işlemektedir. Bu metin, verilerinizin nasıl toplandığını, kullanıldığını ve korunduğunu açıklar.

2. Toplanan Kişisel Verileriniz
Size hizmet sunabilmek amacıyla aşağıdaki verileri toplamaktayız:
- Kimlik ve İletişim Verileri: Ad, soyad, telefon numarası, e-posta adresi.
- Hizmet Veren (Usta) Verileri: Ustalık belgesi, EMO/SMM numarası, uzmanlık alanları, iş geçmişi.
- Konum Verileri: Uygulama, iş ilanlarının doğru şekilde eşleşebilmesi (yakındaki ustaları veya işleri bulabilmeniz) amacıyla, izin vermeniz halinde anlık (foreground) GPS konum bilginizi toplar.
- Cihaz ve Kullanım Verileri: IP adresi, cihaz modeli, işletim sistemi sürümü, Push bildirim token'ları.

3. Verilerin İşlenme Amaçları
Kişisel verileriniz aşağıdaki amaçlarla işlenmektedir:
- Platform üzerinden hizmet alan ve hizmet vereni (usta) bir araya getirmek,
- Kullanıcı hesaplarının oluşturulması ve kimlik doğrulaması (güvenlik),
- Şikayetlerin yönetilmesi ve uygulamanın iyileştirilmesi,
- Anlık bildirimler (Push Notifications) yoluyla iş gelişmelerinden sizi haberdar etmek,
- Yasal mercilerden talep gelmesi halinde hukuki yükümlülüklerimizi yerine getirmek.

4. Konum Verilerinin Kullanımı (Önemli)
İş Bitir uygulamasının temel işlevi, belirli bir adresteki elektrik, tesisat vb. sorunlarını o bölgeye en yakın ustalarla buluşturmaktır.
- Konum veriniz sadece siz izin verdiğinizde ve uygulamayı aktif olarak kullandığınızda işlenir.
- Arka planda (background) gizli konum takibi yapılmaz.

5. Veri Paylaşımı ve Üçüncü Taraflar
Kişisel verileriniz hiçbir şekilde reklam, pazarlama veya ticari amaçlarla satılmaz. Sadece aşağıdaki durumlarda paylaşılır:
- İşin yapılabilmesi için; hizmet alan kişinin iletişim bilgileri ve adresi, sadece ilana onay verilen/anlaşılan Usta ile paylaşılır.
- Teknik servis sağlayıcıları (örn: Bulut sunucu sağlayıcıları, bildirim servisleri - Expo/Google FCM) ile verilerin güvenle barındırılması amaçlı paylaşım.

6. Veri Saklama ve Hesap Silme İşlemleri
Verileriniz, hesabınız aktif olduğu sürece ve yasal zamanaşımı süreleri boyunca saklanır. Uygulama içerisindeki "Profil > Hesabı Sil" butonunu kullanarak veya isbitir.destek@gmail.com adresine e-posta göndererek hesabınızın ve size ait tüm kayıtların sistemimizden tamamen silinmesini talep edebilirsiniz. Silme talebiniz 30 gün içinde yasal yükümlülükler dışındaki tüm verileri kapsayacak şekilde gerçekleştirilir.

7. Kullanıcı Haklarınız (KVKK Madde 11)
Kanun kapsamında; verilerinizin işlenip işlenmediğini öğrenme, işlenme amacını bilme, eksik/yanlışsa düzelttirme ve silinmesini talep etme hakkınız bulunmaktadır.`
    }
};

export default function LegalScreen() {
    const { type } = useLocalSearchParams<{ type: LegalType }>();
    const router = useRouter();
    const colors = useAppColors();
    const content = CONTENT[type || 'terms'];

    const handleBack = () => {
        // Force navigation to profile tab to ensure we don't drop to home
        router.navigate('/(tabs)/profile');
    };

    return (
        <View style={styles.container}>
            <PremiumHeader
                title={content.title}
                subtitle={`Son Güncelleme: ${content.lastUpdate}`}
                showBackButton
                onBackPress={handleBack}
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <View style={[styles.card, { shadowColor: colors.primary }]}>
                    <Text style={styles.text}>{content.text}</Text>
                </View>

                <TouchableOpacity
                    style={[styles.closeButton, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
                    onPress={handleBack}
                >
                    <Text style={styles.closeButtonText}>Okudum, Anladım</Text>
                    <Ionicons name="checkmark-circle" size={20} color={staticColors.white} style={{ marginLeft: 8 }} />
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: 12,
        paddingBottom: 20,
    },
    card: {
        backgroundColor: staticColors.white,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 16,
    },
    text: {
        fontFamily: fonts.medium,
        fontSize: 13,
        color: staticColors.textSecondary,
        lineHeight: 20,
    },
    closeButton: {
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
        marginBottom: 12
    },
    closeButtonText: {
        fontFamily: fonts.bold,
        fontSize: 14,
        color: staticColors.white,
    }
});
