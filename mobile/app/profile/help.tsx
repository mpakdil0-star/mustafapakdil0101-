import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Platform, LayoutAnimation, UIManager } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { colors as staticColors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';
import { useAppColors } from '../../hooks/useAppColors';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import { LinearGradient } from 'expo-linear-gradient';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const FAQItem = ({ question, answer, colors, icon = 'help-circle-outline' }: { question: string; answer: string; colors: any; icon?: any }) => {
    const [isOpen, setIsOpen] = useState(false);

    const toggleOpen = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setIsOpen(!isOpen);
    };

    return (
        <TouchableOpacity
            style={[styles.faqWrapper, isOpen && [styles.faqWrapperOpen, { borderColor: colors.primary + '30', shadowColor: colors.primary }]]}
            onPress={toggleOpen}
            activeOpacity={0.7}
        >
            <View style={styles.faqHeader}>
                <View style={[styles.faqIconContainer, { backgroundColor: isOpen ? colors.primary + '15' : '#F1F5F9' }]}>
                    <Ionicons name={icon} size={20} color={isOpen ? colors.primary : staticColors.textSecondary} />
                </View>
                <Text style={[styles.question, isOpen && { color: colors.primary }]}>{question}</Text>
                <Ionicons
                    name={isOpen ? "chevron-up" : "chevron-down"}
                    size={18}
                    color={isOpen ? colors.primary : staticColors.textLight}
                />
            </View>
            {isOpen && (
                <View style={styles.answerContainer}>
                    <View style={[styles.answerLine, { backgroundColor: colors.primary + '20' }]} />
                    <Text style={styles.answer}>{answer}</Text>
                </View>
            )}
        </TouchableOpacity>
    );
};

export default function HelpScreen() {
    const router = useRouter();
    const colors = useAppColors();
    const handleContactSupport = () => {
        Linking.openURL('mailto:destek@isbitir.com');
    };

    return (
        <View style={styles.container}>
            <PremiumHeader
                title="Yardım ve Destek"
                subtitle="Size nasıl yardımcı olabiliriz?"
                showBackButton
                backgroundImage={require('../../assets/images/header_bg.png')}
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Search / Hero Section */}
                <View style={styles.heroSection}>
                    <LinearGradient
                        colors={[colors.primary + '10', 'transparent']}
                        style={styles.heroGlow}
                    />
                    <Text style={styles.heroTitle}>Sıkça Sorulan Sorular</Text>
                    <Text style={styles.heroSubtitle}>Uygulamayı kullanırken aklınıza takılan tüm soruların cevapları burada.</Text>
                </View>

                {/* FAQ list */}
                <View style={styles.faqSection}>
                    <FAQItem
                        question="Nasıl ilan oluşturabilirim?"
                        answer="Ana sayfadaki 'Hemen İlan Ver' butonuna tıklayarak kategorinizi seçebilir, arızanın detaylarını ve fotoğraflarını ekleyerek ilanınızı yayınlayabilirsiniz. Yakınınızdaki tüm ustalara bildirim gidecektir."
                        icon="add-circle-outline"
                        colors={colors}
                    />
                    <FAQItem
                        question="Gelen teklifleri nasıl görürüm?"
                        answer="'İlanlarım' sekmesinden aktif ilanınıza tıklayarak ustaların verdiği fiyat tekliflerini, mesajlarını ve tahmini tamamlanma sürelerini karşılaştırabilirsiniz."
                        icon="list-outline"
                        colors={colors}
                    />
                    <FAQItem
                        question="Usta ile ne zaman iletişime geçebilirim?"
                        answer="Gizliliğiniz ve güvenliğiniz için iletişim (mesaj/arama) butonları ancak siz bir ustanın teklifini 'Kabul Et' butonuna basarak onayladığınızda aktif hale gelir."
                        icon="chatbubbles-outline"
                        colors={colors}
                    />
                    <FAQItem
                        question="İşin tamamlandığını nasıl bildirebilirim?"
                        answer="Usta işi bitirdiğinde ilan detay sayfasında 'İşi Onayla' butonu belirecektir. Bu butona basarak süreci başarılı şekilde sonlandırabilir ve ustaya puan/yorum bırakabilirsiniz."
                        icon="checkmark-done-circle-outline"
                        colors={colors}
                    />
                    <FAQItem
                        question="Ödeme sistemi nasıl çalışıyor?"
                        answer="Şu an için ödemeler iş bitiminde doğrudan ustaya (nakit/IBAN/kart) yapılmaktadır. İş Bitir olarak ileride uygulama içi güvenli ödeme sistemini devreye alacağız."
                        icon="card-outline"
                        colors={colors}
                    />
                    <FAQItem
                        question="Nasıl onaylı usta olabilirim?"
                        answer="Hizmet veren iseniz, profil sayfanızdaki 'Doğrula' sekmesinden ustalık belgenizi veya kimliğinizi yükleyerek 'Onaylı Usta' rozeti alabilir, müşterilerin güvenini kazanabilirsiniz."
                        icon="shield-checkmark-outline"
                        colors={colors}
                    />
                </View>

                {/* Support Channels */}
                <Text style={styles.sectionTitle}>Bize Ulaşın</Text>

                {/* New Ticket System */}
                <TouchableOpacity
                    style={[styles.mainSupportCard, { borderColor: colors.primary + '30', backgroundColor: colors.primary + '05' }]}
                    onPress={() => router.push('/profile/support')}
                >
                    <View style={[styles.mainSupportIcon, { backgroundColor: colors.primary }]}>
                        <Ionicons name="chatbox-ellipses" size={24} color="#fff" />
                    </View>
                    <View style={styles.mainSupportContent}>
                        <Text style={[styles.mainSupportTitle, { color: colors.primary }]}>Canlı Destek Talebi</Text>
                        <Text style={styles.mainSupportDesc}>Sorunlarınızı bildirip durumunu takip edin.</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={colors.primary} />
                </TouchableOpacity>

                <View style={styles.supportGrid}>
                    <TouchableOpacity style={styles.supportCard} onPress={handleContactSupport}>
                        <LinearGradient colors={['#3B82F610', '#3B82F605']} style={styles.supportCardGrad} />
                        <View style={[styles.contactIconBox, { backgroundColor: '#3B82F615' }]}>
                            <Ionicons name="mail" size={24} color="#3B82F6" />
                        </View>
                        <Text style={styles.supportCardTitle}>E-Posta</Text>
                        <Text style={styles.supportCardValue}>destek@isbitir.com</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.supportCard} onPress={() => Linking.openURL('tel:08500000000')}>
                        <LinearGradient colors={['#10B98110', '#10B98105']} style={styles.supportCardGrad} />
                        <View style={[styles.contactIconBox, { backgroundColor: '#10B98115' }]}>
                            <Ionicons name="call" size={24} color="#10B981" />
                        </View>
                        <Text style={styles.supportCardTitle}>Müşteri Hizmetleri</Text>
                        <Text style={styles.supportCardValue}>0850 000 00 00</Text>
                    </TouchableOpacity>
                </View>

                {/* Policy Links */}
                <View style={styles.linksCard}>
                    <TouchableOpacity
                        style={styles.linkRow}
                        onPress={() => router.push({ pathname: '/profile/legal', params: { type: 'terms' } })}
                    >
                        <View style={styles.linkIconBox}>
                            <Ionicons name="document-text-outline" size={20} color={staticColors.textSecondary} />
                        </View>
                        <Text style={styles.linkText}>Kullanım Koşulları</Text>
                        <Ionicons name="chevron-forward" size={16} color={staticColors.textLight} />
                    </TouchableOpacity>
                    <View style={styles.linkDivider} />
                    <TouchableOpacity
                        style={styles.linkRow}
                        onPress={() => router.push({ pathname: '/profile/legal', params: { type: 'kvkk' } })}
                    >
                        <View style={styles.linkIconBox}>
                            <Ionicons name="shield-checkmark-outline" size={20} color={staticColors.textSecondary} />
                        </View>
                        <Text style={styles.linkText}>Gizlilik Politikası (KVKK)</Text>
                        <Ionicons name="chevron-forward" size={16} color={staticColors.textLight} />
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <View style={[styles.logoPlaceholder, { backgroundColor: colors.primary + '10' }]}>
                        <Ionicons name="flash" size={24} color={colors.primaryLight} />
                    </View>
                    <Text style={styles.versionText}>Versiyon 1.2.0 • Build 202412</Text>
                    <Text style={styles.copyrightText}>© 2024 İş Bitir. Tüm Hakları Saklıdır.</Text>
                </View>
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
        paddingHorizontal: spacing.lg,
        paddingBottom: 60,
    },
    heroSection: {
        marginTop: spacing.xl,
        marginBottom: spacing.lg,
        paddingHorizontal: 4,
    },
    heroGlow: {
        position: 'absolute',
        top: -20,
        left: -20,
        right: -20,
        height: 150,
        borderRadius: 100,
        zIndex: -1,
    },
    heroTitle: {
        fontFamily: fonts.extraBold,
        fontSize: 22,
        color: staticColors.text,
        marginBottom: 8,
    },
    heroSubtitle: {
        fontFamily: fonts.medium,
        fontSize: 14,
        color: staticColors.textSecondary,
        lineHeight: 20,
    },
    faqSection: {
        gap: 12,
        marginBottom: 32,
    },
    faqWrapper: {
        backgroundColor: staticColors.white,
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        overflow: 'hidden',
    },
    faqWrapperOpen: {
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 3,
    },
    faqHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    faqIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    question: {
        fontFamily: fonts.bold,
        fontSize: 15,
        color: staticColors.text,
        flex: 1,
    },
    answerContainer: {
        marginTop: 12,
        flexDirection: 'row',
        paddingRight: 12,
    },
    answerLine: {
        width: 2,
        marginRight: 14,
        borderRadius: 1,
        marginLeft: 19,
    },
    answer: {
        fontFamily: fonts.medium,
        fontSize: 14,
        color: staticColors.textSecondary,
        lineHeight: 22,
        flex: 1,
    },
    sectionTitle: {
        fontFamily: fonts.bold,
        fontSize: 18,
        color: staticColors.text,
        marginBottom: 16,
        marginLeft: 4,
    },
    supportGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 32,
    },
    supportCard: {
        flex: 1,
        backgroundColor: staticColors.white,
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        overflow: 'hidden',
    },
    supportCardGrad: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 60,
    },
    contactIconBox: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    supportCardTitle: {
        fontFamily: fonts.bold,
        fontSize: 13,
        color: staticColors.textSecondary,
        marginBottom: 4,
    },
    supportCardValue: {
        fontFamily: fonts.bold,
        fontSize: 12,
        color: staticColors.text,
    },
    linksCard: {
        backgroundColor: staticColors.white,
        borderRadius: 24,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 40,
    },
    linkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 16,
    },
    linkIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#F8FAFC',
        justifyContent: 'center',
        alignItems: 'center',
    },
    linkText: {
        fontFamily: fonts.bold,
        fontSize: 15,
        color: staticColors.text,
        flex: 1,
    },
    linkDivider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginHorizontal: 16,
    },
    footer: {
        alignItems: 'center',
    },
    logoPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    versionText: {
        fontFamily: fonts.bold,
        fontSize: 12,
        color: staticColors.textLight,
        marginBottom: 4,
    },
    copyrightText: {
        fontFamily: fonts.medium,
        fontSize: 11,
        color: staticColors.textLight,
    },
    mainSupportCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 16,
    },
    mainSupportIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    mainSupportContent: {
        flex: 1,
    },
    mainSupportTitle: {
        fontFamily: fonts.bold,
        fontSize: 16,
        marginBottom: 4,
    },
    mainSupportDesc: {
        fontFamily: fonts.medium,
        fontSize: 13,
        color: staticColors.textSecondary,
    },
});
