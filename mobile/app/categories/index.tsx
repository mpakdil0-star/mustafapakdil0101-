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
                                            <Ionicons name={cat.icon as any} size={22} color="#FFF" />
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
        padding: spacing.lg,
        paddingBottom: 40,
    },
    subtitle: {
        fontFamily: fonts.medium,
        fontSize: 14,
        color: '#94A3B8',
        marginBottom: 28,
        lineHeight: 20,
    },
    groupSection: {
        marginBottom: 32,
    },
    groupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        paddingLeft: 4,
    },
    groupEmoji: {
        fontSize: 20,
        marginRight: 10,
    },
    groupTitle: {
        fontFamily: fonts.bold,
        fontSize: 18,
        letterSpacing: 0.3,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    cardWrapper: {
        width: '31%',
        marginBottom: 4,
    },
    categoryCard: {
        borderRadius: 20,
        padding: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.4)',
        height: 100,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 4,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    categoryName: {
        fontFamily: fonts.bold,
        fontSize: 11,
        color: staticColors.text,
        textAlign: 'center',
        lineHeight: 14,
    },
});
