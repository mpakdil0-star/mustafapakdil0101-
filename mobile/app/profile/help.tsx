import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { Card } from '../../components/common/Card';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';

const FAQItem = ({ question, answer }: { question: string; answer: string }) => (
    <View style={styles.faqContainer}>
        <Text style={styles.question}>{question}</Text>
        <Text style={styles.answer}>{answer}</Text>
    </View>
);

export default function HelpScreen() {
    const handleContactSupport = () => {
        Linking.openURL('mailto:destek@elektrikciler.com');
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
        >
            <Card style={styles.card}>
                <Text style={styles.sectionTitle}>Sıkça Sorulan Sorular</Text>

                <FAQItem
                    question="Nasıl elektrikçi çağırabilirim?"
                    answer="Ana sayfadaki 'Hemen Çağır' veya 'Randevu Al' butonlarını kullanarak size en yakın elektrikçiye ulaşabilirsiniz."
                />

                <View style={styles.divider} />

                <FAQItem
                    question="Ödemeyi nasıl yapabilirim?"
                    answer="Ödemelerinizi iş tamamlandıktan sonra nakit veya kredi kartı ile doğrudan ustaya yapabilirsiniz. Uygulama içi ödeme çok yakında hizmetinizde olacak."
                />

                <View style={styles.divider} />

                <FAQItem
                    question="Randevumu iptal edebilir miyim?"
                    answer="Evet, randevu saatinden en az 2 saat öncesine kadar 'İşlerim' sekmesinden iptal işlemini gerçekleştirebilirsiniz."
                />
            </Card>

            <Card style={styles.contactCard}>
                <Text style={styles.contactTitle}>Hala yardıma mı ihtiyacınız var?</Text>
                <Text style={styles.contactText}>
                    Ekibimiz haftanın 7 günü 09:00 - 18:00 saatleri arasında hizmetinizdedir.
                </Text>
                <TouchableOpacity
                    style={styles.contactButton}
                    onPress={handleContactSupport}
                >
                    <Text style={styles.contactButtonText}>Bize Ulaşın</Text>
                </TouchableOpacity>
            </Card>

            <Text style={styles.versionText}>Versiyon 1.0.0</Text>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.backgroundLight,
    },
    content: {
        padding: spacing.md,
    },
    card: {
        padding: spacing.lg,
        marginBottom: spacing.md,
    },
    sectionTitle: {
        ...typography.h5,
        color: colors.primary,
        marginBottom: spacing.lg,
        fontWeight: '600',
    },
    faqContainer: {
        marginBottom: spacing.md,
    },
    question: {
        ...typography.body1,
        fontWeight: '600',
        color: colors.text,
        marginBottom: spacing.xs,
    },
    answer: {
        ...typography.body2,
        color: colors.textSecondary,
        lineHeight: 20,
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: spacing.md,
    },
    contactCard: {
        padding: spacing.lg,
        alignItems: 'center',
        backgroundColor: colors.primaryLight + '10', // Light tint
        borderColor: colors.primaryLight,
        borderWidth: 1,
    },
    contactTitle: {
        ...typography.h5,
        color: colors.primary,
        marginBottom: spacing.xs,
        fontWeight: '600',
    },
    contactText: {
        ...typography.body2,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    contactButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.sm,
        borderRadius: spacing.radius.md,
    },
    contactButtonText: {
        color: colors.white,
        fontWeight: '600',
        fontSize: 16,
    },
    versionText: {
        ...typography.caption,
        textAlign: 'center',
        color: colors.textLight,
        marginTop: spacing.sm,
    },
});
