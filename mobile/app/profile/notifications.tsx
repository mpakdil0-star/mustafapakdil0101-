import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView } from 'react-native';
import { Card } from '../../components/common/Card';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';

const NotificationItem = ({
    title,
    description,
    value,
    onValueChange
}: {
    title: string;
    description?: string;
    value: boolean;
    onValueChange: (val: boolean) => void;
}) => (
    <View style={styles.itemContainer}>
        <View style={styles.textContainer}>
            <Text style={styles.itemTitle}>{title}</Text>
            {description && <Text style={styles.itemDescription}>{description}</Text>}
        </View>
        <Switch
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.white}
            ios_backgroundColor={colors.border}
            onValueChange={onValueChange}
            value={value}
        />
    </View>
);

export default function NotificationsScreen() {
    const [pushEnabled, setPushEnabled] = useState(true);
    const [emailEnabled, setEmailEnabled] = useState(true);
    const [promoEnabled, setPromoEnabled] = useState(false);
    const [securityEnabled, setSecurityEnabled] = useState(true);

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
        >
            <Card style={styles.card}>
                <Text style={styles.sectionTitle}>Genel Bildirimler</Text>

                <NotificationItem
                    title="Anlık Bildirimler"
                    description="Uygulama içi önemli güncellemelerden haberdar olun."
                    value={pushEnabled}
                    onValueChange={setPushEnabled}
                />

                <View style={styles.divider} />

                <NotificationItem
                    title="E-posta Bildirimleri"
                    description="Özet bilgi ve faturalar e-posta adresinize gönderilsin."
                    value={emailEnabled}
                    onValueChange={setEmailEnabled}
                />
            </Card>

            <Card style={styles.card}>
                <Text style={styles.sectionTitle}>Diğer</Text>

                <NotificationItem
                    title="Kampanya ve Fırsatlar"
                    description="Size özel tekliflerden haberdar olmak ister misiniz?"
                    value={promoEnabled}
                    onValueChange={setPromoEnabled}
                />

                <View style={styles.divider} />

                <NotificationItem
                    title="Güvenlik Uyarıları"
                    description="Hesabınızla ilgili şüpheli durumlarda bildirim alın."
                    value={securityEnabled}
                    onValueChange={setSecurityEnabled}
                />
            </Card>
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
        marginBottom: spacing.md,
        fontWeight: '600',
    },
    itemContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.sm,
    },
    textContainer: {
        flex: 1,
        paddingRight: spacing.md,
    },
    itemTitle: {
        ...typography.body1,
        fontWeight: '500',
        color: colors.text,
        marginBottom: 4,
    },
    itemDescription: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: spacing.md,
    },
});
