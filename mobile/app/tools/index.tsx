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
    ];

    return (
        <View style={styles.container}>
            <PremiumHeader title="Araçlar" showBackButton />

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
                <Text style={[styles.subtitle, { color: staticColors.textSecondary }]}>
                    İşinizi kolaylaştıracak profesyonel araçlar
                </Text>

                {tools.map((tool) => (
                    <TouchableOpacity
                        key={tool.id}
                        activeOpacity={0.9}
                        onPress={() => router.push(tool.route as any)}
                    >
                        <Card style={styles.toolCard}>
                            <View style={styles.toolContent}>
                                <View style={[styles.iconBox, { backgroundColor: tool.color + '15' }]}>
                                    <Ionicons name={tool.icon as any} size={32} color={tool.color} />
                                </View>
                                <View style={styles.toolInfo}>
                                    <Text style={[styles.toolTitle, { color: colors.text }]}>{tool.title}</Text>
                                    <Text style={[styles.toolDesc, { color: staticColors.textSecondary }]}>
                                        {tool.description}
                                    </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={24} color={staticColors.textLight} />
                            </View>
                        </Card>
                    </TouchableOpacity>
                ))}
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
    toolCard: {
        marginBottom: spacing.md,
        padding: spacing.lg,
    },
    toolContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBox: {
        width: 64,
        height: 64,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    toolInfo: {
        flex: 1,
    },
    toolTitle: {
        fontFamily: fonts.bold,
        fontSize: 17,
        marginBottom: 4,
    },
    toolDesc: {
        fontFamily: fonts.regular,
        fontSize: 13,
        lineHeight: 19,
    },
});
