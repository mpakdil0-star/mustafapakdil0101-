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

// Kategori grupları için veri yapısı
const CATEGORY_GROUPS = [
    {
        title: '⚡ Elektrik',
        id: 'elektrik',
        color: '#A78BFA',
        categories: ELEKTRIK_CATEGORIES
    },
    {
        title: '🔑 Çilingir',
        id: 'cilingir',
        color: '#FBBF24',
        categories: CILINGIR_CATEGORIES
    },
    {
        title: '❄️ Klima',
        id: 'klima',
        color: '#60A5FA',
        categories: KLIMA_CATEGORIES
    },
    {
        title: '🔧 Beyaz Eşya',
        id: 'beyaz-esya',
        color: '#4ADE80',
        categories: BEYAZ_ESYA_CATEGORIES
    },
    {
        title: '💧 Tesisat',
        id: 'tesisat',
        color: '#38BDF8',
        categories: TESISAT_CATEGORIES
    },
];

export default function CategoriesScreen() {
    const router = useRouter();
    const colors = useAppColors();

    const handleCategoryPress = (cat: JobCategory) => {
        router.push({
            pathname: '/jobs/create',
            params: {
                category: cat.name,
                serviceCategory: cat.parentCategory
            }
        });
    };

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
                <Text style={styles.subtitle}>
                    İhtiyacın olan hizmet kategorisini seçerek hemen ilanını oluştur.
                </Text>

                {CATEGORY_GROUPS.map((group) => (
                    <View key={group.id} style={styles.section}>
                        {/* Bölüm Başlığı */}
                        <View style={styles.sectionHeader}>
                            <View style={[styles.sectionIndicator, { backgroundColor: group.color }]} />
                            <Text style={styles.sectionTitle}>{group.title}</Text>
                        </View>

                        {/* Kategori Grid */}
                        <View style={styles.grid}>
                            {group.categories.map((cat) => (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={styles.cardWrapper}
                                    onPress={() => handleCategoryPress(cat)}
                                    activeOpacity={0.8}
                                >
                                    <LinearGradient
                                        colors={['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.85)']}
                                        style={styles.categoryCard}
                                    >
                                        <LinearGradient
                                            colors={cat.colors as [string, string, ...string[]]}
                                            style={styles.iconCircle}
                                        >
                                            <Ionicons name={cat.icon as any} size={20} color="#FFF" />
                                        </LinearGradient>
                                        <Text style={styles.categoryName} numberOfLines={2}>
                                            {cat.name}
                                        </Text>
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
        marginBottom: 20,
        lineHeight: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionIndicator: {
        width: 4,
        height: 20,
        borderRadius: 2,
        marginRight: 10,
    },
    sectionTitle: {
        fontFamily: fonts.bold,
        fontSize: 18,
        color: '#E2E8F0',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    cardWrapper: {
        width: '31%',
    },
    categoryCard: {
        borderRadius: 16,
        padding: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.5)',
        height: 90,
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
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    categoryName: {
        fontFamily: fonts.semiBold,
        fontSize: 10,
        color: staticColors.text,
        textAlign: 'center',
        lineHeight: 13,
    },
});
