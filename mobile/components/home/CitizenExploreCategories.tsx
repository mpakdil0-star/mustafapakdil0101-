import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { fonts } from '../../constants/typography';
import { SERVICE_CATEGORIES, ServiceCategory } from '../../constants/serviceCategories';

const CATEGORY_IMAGES: Record<string, any> = {
  elektrik: require('../../assets/images/categories/electric_3d_clean_v3.png'),
  cilingir: require('../../assets/images/categories/locksmith_3d_clean_v2.png'),
  klima: require('../../assets/images/categories/ac_3d_clean_v2.png'),
  'beyaz-esya': require('../../assets/images/categories/appliances_3d_clean_v2.png'),
  tesisat: require('../../assets/images/categories/plumbing_3d_clean_v3.png'),
  temizlik: require('../../assets/images/categories/cleaning_3d_clean_v2.png'),
  nakliyat: require('../../assets/images/categories/moving_3d_clean_v2.png'),
  'boya-badana': require('../../assets/images/categories/painting_3d_clean_v2.png'),
  'koltuk-hali': require('../../assets/images/categories/sofacl_3d_clean_v2.png'),
  'mobilya-montaj': require('../../assets/images/categories/furniture_3d_clean_v2.png'),
  'kucuk-nakliye': require('../../assets/images/categories/smallcg_3d_clean_v2.png'),
  'kombi-servis': require('../../assets/images/categories/boiler_3d_clean_v2.png'),
  asansor: require('../../assets/images/categories/elevator_3d_clean_v2.png'),
  'bocek-ilaclama': require('../../assets/images/categories/pest_3d_clean_v2.png'),
  'guvenlik-kamera': require('../../assets/images/categories/seccam_3d_clean_v2.png'),
};

const PROFESSIONAL_NAMES: Record<string, string> = {
  elektrik: 'Elektrik',
  cilingir: 'Çilingir',
  klima: 'Klima Servisi',
  'beyaz-esya': 'Beyaz Eşya',
  tesisat: 'Su & Tesisat',
  temizlik: 'Temizlik',
  nakliyat: 'Evden Eve Nakliyat',
  'boya-badana': 'Boya & Badana',
  'koltuk-hali': 'Koltuk & Halı',
  'mobilya-montaj': 'Mobilya Montaj',
  'kucuk-nakliye': 'Küçük Nakliye',
  'kombi-servis': 'Kombi Servisi',
  asansor: 'Asansör Bakım',
  'bocek-ilaclama': 'İlaçlama',
  'guvenlik-kamera': 'Güvenlik Sistemleri',
};

const SHORT_DESCRIPTIONS: Record<string, string> = {
  elektrik: 'Arıza, tesisat ve montaj',
  cilingir: 'Kilit ve kapı çözümleri',
  klima: 'Bakım, montaj ve onarım',
  'beyaz-esya': 'Cihaz bakım ve tamiri',
  tesisat: 'Kaçak, tıkanıklık ve montaj',
  temizlik: 'Ev, ofis ve detaylı temizlik',
  nakliyat: 'Güvenli ev ve ofis taşıma',
  'boya-badana': 'Boya ve dekorasyon işleri',
  'koltuk-hali': 'Yerinde profesyonel yıkama',
  'mobilya-montaj': 'Kurulum ve demontaj',
  'kucuk-nakliye': 'Tek parça ve küçük taşıma',
  'kombi-servis': 'Bakım, arıza ve montaj',
  asansor: 'Bakım ve periyodik kontrol',
  'bocek-ilaclama': 'Haşere kontrol hizmetleri',
  'guvenlik-kamera': 'Kamera ve alarm kurulumu',
};

const CategoryCard = ({ category, index, onPress, width }: {
  category: ServiceCategory;
  index: number;
  onPress: () => void;
  width: number;
}) => {
  const entrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 280,
      delay: Math.min(index * 35, 280),
      useNativeDriver: true,
    }).start();
  }, [entrance, index]);

  return (
    <Animated.View style={{ opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}>
      <TouchableOpacity style={[styles.categoryCard, { width }]} onPress={onPress} activeOpacity={0.86}>
        <View style={[styles.imageShell, { backgroundColor: `${category.colors[0]}12`, borderColor: `${category.colors[0]}25` }]}>
          {CATEGORY_IMAGES[category.id] ? (
            <Image source={CATEGORY_IMAGES[category.id]} style={styles.categoryImage} resizeMode="contain" />
          ) : (
            <Ionicons name={category.icon as any} size={25} color={category.colors[1]} />
          )}
        </View>
        <View style={styles.cardCopy}>
          <Text style={styles.categoryTitle} numberOfLines={1} maxFontSizeMultiplier={1.2}>{PROFESSIONAL_NAMES[category.id] || category.name}</Text>
          <Text style={styles.categoryDescription} numberOfLines={1} maxFontSizeMultiplier={1.15}>{SHORT_DESCRIPTIONS[category.id] || category.description}</Text>
        </View>
        <View style={styles.arrowButton}>
          <Ionicons name="chevron-forward" size={13} color="#94A3B8" />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

interface CitizenExploreCategoriesProps {
  colors: any;
  handleActionWithAuth: (route: string, params?: any) => void;
}

export const CitizenExploreCategories = ({ colors, handleActionWithAuth }: CitizenExploreCategoriesProps) => {
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const [activePage, setActivePage] = useState(0);
  const categoryPages = Array.from(
    { length: Math.ceil(SERVICE_CATEGORIES.length / 4) },
    (_, pageIndex) => SERVICE_CATEGORIES.slice(pageIndex * 4, pageIndex * 4 + 4),
  );
  const cardWidth = Math.max(148, (screenWidth - 40) / 2);

  const openCategory = (id: string) => handleActionWithAuth('/jobs/create', { serviceCategory: id });

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={[styles.sectionTitle, { color: colors.text }]} maxFontSizeMultiplier={1.2}>Hizmetler</Text>
          <Text style={styles.sectionSubtitle}>İhtiyacınıza uygun hizmeti seçin.</Text>
        </View>
        <TouchableOpacity style={styles.viewAllButton} onPress={() => router.push('/categories')} activeOpacity={0.75}>
          <Text style={[styles.viewAllText, { color: colors.primary }]}>Tümü</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        pagingEnabled
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const nextPage = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
          setActivePage(Math.max(0, Math.min(categoryPages.length - 1, nextPage)));
        }}
      >
        {categoryPages.map((page, pageIndex) => (
          <View key={`service-page-${pageIndex}`} style={[styles.page, { width: screenWidth }]}>
            <View style={styles.grid}>
              {page.map((category, index) => (
                <CategoryCard
                  key={category.id}
                  category={category}
                  index={(pageIndex * 4) + index}
                  width={cardWidth}
                  onPress={() => openCategory(category.id)}
                />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      {categoryPages.length > 1 && (
        <View style={styles.pagination}>
          {categoryPages.map((_, index) => (
            <View
              key={`service-dot-${index}`}
              style={[
                styles.paginationDot,
                index === activePage && [styles.paginationDotActive, { backgroundColor: colors.primary }],
              ]}
            />
          ))}
        </View>
      )}

    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%', marginTop: 14, marginBottom: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 9 },
  headerCopy: { flex: 1, paddingRight: 12 },
  sectionTitle: { fontFamily: fonts.extraBold, fontSize: 16.5, lineHeight: 21, letterSpacing: -0.25 },
  sectionSubtitle: { color: '#64748B', fontFamily: fonts.regular, fontSize: 10.5, lineHeight: 14, marginTop: 1 },
  viewAllButton: { height: 32, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 2 },
  viewAllText: { fontFamily: fonts.bold, fontSize: 11 },
  page: { paddingBottom: 1 },
  grid: { paddingHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pagination: { height: 18, marginTop: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  paginationDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#CBD5E1' },
  paginationDotActive: { width: 17 },
  categoryCard: { height: 64, borderRadius: 15, backgroundColor: '#FFFFFF', paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E8EEF3', shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 7, elevation: 1 },
  imageShell: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginRight: 8, overflow: 'hidden' },
  categoryImage: { width: 26, height: 26 },
  cardCopy: { flex: 1, justifyContent: 'center' },
  categoryTitle: { color: '#0F172A', fontFamily: fonts.bold, fontSize: 12.5, lineHeight: 16 },
  categoryDescription: { color: '#64748B', fontFamily: fonts.regular, fontSize: 9.5, lineHeight: 13, marginTop: 1 },
  arrowButton: { width: 20, height: 20, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#F1F5F9' },
});
