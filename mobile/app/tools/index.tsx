import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import { Card } from '../../components/common/Card';
import { colors as staticColors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';
import { useAppColors } from '../../hooks/useAppColors';

export default function ToolsScreen() {
    const router = useRouter();
    const colors = useAppColors();

    const tools = [
        {
            id: 'calculator',
            title: 'Elektrik Hesaplayıcı',
            description: 'Kablo kesiti, gerilim düşümü, Ohm kanunu ve güç hesaplamaları',
            icon: 'calculator',
            color: '#3B82F6',
            route: '/tools/calculator',
        },
        {
            id: 'quote',
            title: 'Teklif Hazırla',
            description: 'Malzeme ve işçilik listesi oluştur, PDF olarak paylaş',
            icon: 'document-text',
            color: '#10B981',
            route: '/tools/quote',
        },
        {
            id: 'calendar',
            title: 'İş Takvimim',
            description: 'Randevularını planla, hatırlatıcı kur',
            icon: 'calendar',
            color: '#8B5CF6',
            route: '/tools/calendar',
        },
        {
            id: 'ledger',
            title: 'Hesap Defteri',
            description: 'Alacak ve vereceklerini takip et',
            icon: 'wallet',
            color: '#F59E0B',
            route: '/tools/ledger',
        },
    ];

    return (
        <View style={styles.container}>
            <PremiumHeader title="Araçlar" showBackButton />

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
                <Text style={[styles.subtitle, { color: staticColors.textSecondary }]}>
                    İşinizi kolaylaştıracak profesyonel araçlar
                </Text>

                <View style={styles.gridContainer}>
                    {tools.map((tool) => (
                        <TouchableOpacity
                            key={tool.id}
                            style={styles.gridItem}
                            activeOpacity={0.9}
                            onPress={() => router.push(tool.route as any)}
                        >
                            <Card style={styles.gridCard}>
                                <View style={[styles.gridIconBox, { backgroundColor: tool.color + '15' }]}>
                                    <Ionicons name={tool.icon as any} size={28} color={tool.color} />
                                </View>
                                <Text style={[styles.gridTitle, { color: colors.text }]}>{tool.title}</Text>
                                <Text style={[styles.gridDesc, { color: staticColors.textSecondary }]} numberOfLines={2}>
                                    {tool.description}
                                </Text>
                            </Card>
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
    scrollView: {
        flex: 1,
    },
    content: {
        padding: spacing.md,
        paddingBottom: 100,
    },
    subtitle: {
        fontFamily: fonts.medium,
        fontSize: 15,
        marginBottom: spacing.lg,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    gridItem: {
        width: '48%',
        marginBottom: spacing.md,
    },
    gridCard: {
        padding: spacing.md,
        alignItems: 'center',
    },
    gridIconBox: {
        width: 56,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    gridTitle: {
        fontFamily: fonts.bold,
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 4,
    },
    gridDesc: {
        fontFamily: fonts.regular,
        fontSize: 11,
        textAlign: 'center',
        lineHeight: 16,
    },
});
