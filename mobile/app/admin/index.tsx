import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';
import { useAppColors } from '../../hooks/useAppColors';
import { LinearGradient } from 'expo-linear-gradient';

export default function AdminDashboardScreen() {
    const router = useRouter();
    const colors = useAppColors();

    const menuItems = [
        {
            title: 'Doğrulama Havuzu',
            subtitle: 'Onay bekleyen belgeler',
            icon: 'shield-checkmark',
            color: '#10B981',
            route: '/profile/admin_verifications'
        },
        {
            title: 'Kullanıcı Yönetimi',
            subtitle: 'Tüm kullanıcıları listele',
            icon: 'people',
            color: '#3B82F6',
            route: '/admin/users' // Placeholder
        },
        {
            title: 'Sistem Raporları',
            subtitle: 'Platform istatistikleri',
            icon: 'bar-chart',
            color: '#8B5CF6',
            route: '/admin/reports' // Placeholder
        }
    ];

    return (
        <View style={styles.container}>
            <PremiumHeader title="Yönetici Paneli" showBackButton />

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.headerSection}>
                    <Text style={styles.welcomeText}>Hoş Geldiniz,</Text>
                    <Text style={[styles.roleText, { color: colors.primary }]}>Admin</Text>
                </View>

                <View style={styles.grid}>
                    {menuItems.map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            style={[styles.card, { shadowColor: item.color }]}
                            onPress={() => router.push(item.route as any)}
                            activeOpacity={0.9}
                        >
                            <LinearGradient
                                colors={[staticColors.white, '#F8FAFC']}
                                style={styles.cardGradient}
                            >
                                <View style={[styles.iconContainer, { backgroundColor: item.color + '15' }]}>
                                    <Ionicons name={item.icon as any} size={28} color={item.color} />
                                </View>
                                <View style={styles.textContainer}>
                                    <Text style={styles.cardTitle}>{item.title}</Text>
                                    <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color={staticColors.textLight} />
                            </LinearGradient>
                        </TouchableOpacity>
                    ))}
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
    content: {
        padding: spacing.lg,
    },
    headerSection: {
        marginBottom: 24,
    },
    welcomeText: {
        fontFamily: fonts.medium,
        fontSize: 16,
        color: staticColors.textSecondary,
    },
    roleText: {
        fontFamily: fonts.extraBold,
        fontSize: 28,
        marginTop: 4,
    },
    grid: {
        gap: 16,
    },
    card: {
        borderRadius: 20,
        backgroundColor: staticColors.white,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
        overflow: 'hidden',
    },
    cardGradient: {
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
    },
    cardTitle: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: staticColors.text,
        marginBottom: 4,
    },
    cardSubtitle: {
        fontFamily: fonts.medium,
        fontSize: 13,
        color: staticColors.textSecondary,
    },
});
