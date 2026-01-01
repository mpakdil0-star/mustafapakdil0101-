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
        lastUpdate: '25 Aralık 2024',
        text: `1. Hizmet Şartları
Elektrikçiler uygulamasını kullanarak, bu sayfada yer alan tüm şartları kabul etmiş sayılırsınız. Uygulamamız üzerinden verilen hizmetler, elektrikçiler ile müşterileri bir araya getiren bir platformdur.

2. Hizmet Kapsamı
Elektrikçiler, usta ve müşteri arasındaki anlaşmazlıklardan, iş kalitesinden veya ödeme süreçlerinden doğrudan sorumlu değildir. Platformumuz sadece bir "buluşturma" hizmeti sunar.

3. Kullanıcı Sorumlulukları
Kullanıcılar, kayıt sırasında verdikleri bilgilerin doğruluğundan sorumludur. Yanıltıcı bilgi veren veya platformu kötüye kullanan hesaplar askıya alınabilir.

4. Ödemeler ve Krediler
Elektrikçiler, teklif verebilmek için uygulama içi kredi satın almalıdır. Satın alınan krediler, platform içi kullanım içindir ve nakde çevrilemez.

5. Değişiklik Hakları
Elektrikçiler A.Ş., bu kullanım koşullarını dilediği zaman güncelleme hakkını saklı tutar.`
    },
    kvkk: {
        title: 'KVKK ve Veri Politikası',
        lastUpdate: '25 Aralık 2024',
        text: `1. Veri Sorumlusu
6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca, verileriniz Elektrikçiler A.Ş. tarafından işlenmektedir.

2. İşlenen Veriler
Uygulamayı kullanırken paylaştığınız ad-soyad, telefon numarası, konum bilgisi ve ustalık belgeleri, size hizmet sunabilmek adına güvenli sunucularımızda saklanır.

3. Veri İşleme Amaçları
Verileriniz şu amaçlarla kullanılır:
- İlanların doğru bölgedeki ustalara ulaştırılması.
- Güvenli bir iletişim ortamı sağlanması.
- Uygulama içi iyileştirmelerin yapılması.

4. Veri Paylaşımı
Kişisel verileriniz, yasal zorunluluklar hariç, üçüncü taraflarla reklam veya pazarlama amacıyla paylaşılmaz. Sadece onayladığınız iş süreçlerinde, ilgili usta veya müşteri ile sınırlı bilgiler paylaşılır.

5. Haklarınız
KVKK kapsamında, verilerinizin silinmesini, güncellenmesini veya işlenip işlenmediğini öğrenme hakkına sahipsiniz. Bunun için destek@elektrikciler.com üzerinden bize ulaşabilirsiniz.`
    }
};

export default function LegalScreen() {
    const { type } = useLocalSearchParams<{ type: LegalType }>();
    const router = useRouter();
    const colors = useAppColors();
    const content = CONTENT[type || 'terms'];

    return (
        <View style={styles.container}>
            <PremiumHeader
                title={content.title}
                subtitle={`Son Güncelleme: ${content.lastUpdate}`}
                showBackButton
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
                    onPress={() => router.back()}
                >
                    <Text style={styles.closeButtonText}>Okudum, Anladım</Text>
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
        padding: spacing.lg,
        paddingBottom: 40,
    },
    card: {
        backgroundColor: staticColors.white,
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 32,
    },
    text: {
        fontFamily: fonts.medium,
        fontSize: 15,
        color: staticColors.textSecondary,
        lineHeight: 26,
    },
    closeButton: {
        borderRadius: 16,
        paddingVertical: 18,
        alignItems: 'center',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    closeButtonText: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: staticColors.white,
    }
});
