import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors as staticColors } from '../../constants/colors';
import { useAppColors } from '../../hooks/useAppColors';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';
import {
    ELEKTRIK_CATEGORIES,
    CILINGIR_CATEGORIES,
    KLIMA_CATEGORIES,
    BEYAZ_ESYA_CATEGORIES,
    TESISAT_CATEGORIES,
    JobCategory
} from '../../constants/jobCategories';
import { PremiumHeader } from '../../components/common/PremiumHeader';

interface CategoryGroup {
    id: string;
    title: string;
    emoji: string;
    categories: JobCategory[];
}

const CATEGORY_GROUPS: CategoryGroup[] = [
    { id: 'elektrik', title: 'Elektrik', emoji: '⚡', categories: ELEKTRIK_CATEGORIES },
    { id: 'cilingir', title: 'Çilingir', emoji: '🔧', categories: CILINGIR_CATEGORIES },
    { id: 'klima', title: 'Klima', emoji: '❄️', categories: KLIMA_CATEGORIES },
    { id: 'beyaz-esya', title: 'Beyaz Eşya', emoji: '🏠', categories: BEYAZ_ESYA_CATEGORIES },
    { id: 'tesisat', title: 'Tesisat', emoji: '💧', categories: TESISAT_CATEGORIES },
];

export default function CategoriesScreen() {
    const router = useRouter();
    const colors = useAppColors();

    return (
        <View style={[styles.container, { backgroundColor: colors.backgroundDark }]}>
            <PremiumHeader
                title="Tüm Kategoriler"
                showBackButton
                onBackPress={() => router.back()}
            />

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <Text style={styles.subtitle}>İhtiyacın olan hizmet kategorisini seçerek hemen ilanını oluştur.</Text>

                {CATEGORY_GROUPS.map((group) => (
                    <View key={group.id} style={styles.groupSection}>
                        <View style={styles.groupHeader}>
                            <Text style={styles.groupEmoji}>{group.emoji}</Text>
                            <Text style={[styles.groupTitle, { color: colors.text }]}>{group.title}</Text>
                        </View>

                        <View style={styles.grid}>
                            {group.categories.map((cat, idx) => (
                                <TouchableOpacity
                                    key={idx}
                                    style={styles.cardWrapper}
                                    onPress={() => router.push({
                                        pathname: '/jobs/create',
                                        params: { category: cat.name }
                                    })}
                                    activeOpacity={0.8}
                                >
                                    <LinearGradient
                                        colors={['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)']}
                                        style={styles.categoryCard}
                                    >
                                        <LinearGradient
                                            colors={cat.colors as [string, string, ...string[]]}
                                            style={styles.iconCircle}
                                        >
                                            <Ionicons name={cat.icon as any} size={20} color="#FFF" />
                                        </LinearGradient>
                                        <Text style={styles.categoryName} numberOfLines={2}>{cat.name}</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: spacing.md,
        paddingBottom: 30,
    },
    subtitle: {
        fontFamily: fonts.medium,
        fontSize: 13,
        color: '#94A3B8',
        marginBottom: 16,
        lineHeight: 18,
    },
    groupSection: {
        marginBottom: 20,
    },
    groupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        paddingLeft: 4,
    },
    groupEmoji: {
        fontSize: 18,
        marginRight: 8,
    },
    groupTitle: {
        fontFamily: fonts.bold,
        fontSize: 16,
        letterSpacing: 0.2,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    cardWrapper: {
        width: '31%',
        marginBottom: 4,
    },
    categoryCard: {
        borderRadius: 16,
        padding: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.4)',
        height: 85,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 4,
            },
            android: {
                elevation: 1,
            },
        }),
    },
    iconCircle: {
        width: 38,
        height: 38,
        borderRadius: 19,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    categoryName: {
        fontFamily: fonts.bold,
        fontSize: 10,
        color: staticColors.text,
        textAlign: 'center',
        lineHeight: 12,
    },
});
