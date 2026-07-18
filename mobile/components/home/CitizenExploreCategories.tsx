import React, { useEffect, useRef } from 'react';
import { Animated, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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

const CategoryCard = ({ category, index, onPress }: {
  category: ServiceCategory;
  index: number;
  onPress: () => void;
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
      <TouchableOpacity style={styles.categoryCard} onPress={onPress} activeOpacity={0.86}>
        <View style={styles.cardAccent}>
          <LinearGradient colors={category.colors} style={StyleSheet.absoluteFill} />
        </View>
        <View style={[styles.imageShell, { backgroundColor: `${category.colors[0]}12`, borderColor: `${category.colors[0]}25` }]}>
          {CATEGORY_IMAGES[category.id] ? (
            <Image source={CATEGORY_IMAGES[category.id]} style={styles.categoryImage} resizeMode="contain" />
          ) : (
            <Ionicons name={category.icon as any} size={25} color={category.colors[1]} />
          )}
        </View>
        <Text style={styles.categoryTitle} numberOfLines={1}>{PROFESSIONAL_NAMES[category.id] || category.name}</Text>
        <Text style={styles.categoryDescription} numberOfLines={2}>{SHORT_DESCRIPTIONS[category.id] || category.description}</Text>
        <View style={styles.cardFooter}>
          <Text style={[styles.exploreText, { color: category.colors[1] }]}>Hizmetleri gör</Text>
          <View style={[styles.arrowButton, { backgroundColor: `${category.colors[0]}14` }]}>
            <Ionicons name="arrow-forward" size={13} color={category.colors[1]} />
          </View>
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
  const firstRow = SERVICE_CATEGORIES.filter((_, index) => index % 2 === 0);
  const secondRow = SERVICE_CATEGORIES.filter((_, index) => index % 2 !== 0);

  const openCategory = (id: string) => handleActionWithAuth('/jobs/create', { serviceCategory: id });

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <View style={styles.eyebrowRow}>
            <View style={styles.eyebrowLine} />
            <Text style={styles.eyebrow}>HİZMETLER</Text>
          </View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>İhtiyacınıza uygun uzmanı bulun</Text>
          <Text style={styles.sectionSubtitle}>Kategoriyi seçin, ihtiyacınızı anlatın ve bölgenizdeki ustalardan teklif alın.</Text>
        </View>
        <TouchableOpacity style={styles.seeAllButton} onPress={() => router.push('/categories')} activeOpacity={0.8}>
          <Text style={styles.seeAllText}>Tümü</Text>
          <Ionicons name="grid-outline" size={14} color="#0F766E" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.guidedBanner} onPress={() => handleActionWithAuth('/ai-assistant', { role: 'CITIZEN' })} activeOpacity={0.9}>
        <LinearGradient colors={['#083C3A', '#0F766E', '#0D9488']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.guidedGradient}>
          <View style={styles.guidedIcon}>
            <Ionicons name="sparkles" size={20} color="#99F6E4" />
          </View>
          <View style={styles.guidedCopy}>
            <Text style={styles.guidedTitle}>Hangi hizmeti seçmeliyim?</Text>
            <Text style={styles.guidedSubtitle}>Sorunu anlatın, AI asistan doğru kategoriyi önersin.</Text>
          </View>
          <View style={styles.guidedArrow}>
            <Ionicons name="chevron-forward" size={17} color="#FFFFFF" />
          </View>
        </LinearGradient>
      </TouchableOpacity>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.rows}>
          <View style={styles.row}>
            {firstRow.map((category, index) => (
              <CategoryCard key={category.id} category={category} index={index} onPress={() => openCategory(category.id)} />
            ))}
          </View>
          <View style={styles.row}>
            {secondRow.map((category, index) => (
              <CategoryCard key={category.id} category={category} index={index + firstRow.length} onPress={() => openCategory(category.id)} />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%', marginTop: 18, marginBottom: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, marginBottom: 13 },
  headerCopy: { flex: 1, paddingRight: 12 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  eyebrowLine: { width: 18, height: 3, borderRadius: 2, backgroundColor: '#0D9488', marginRight: 7 },
  eyebrow: { color: '#0F766E', fontFamily: fonts.extraBold, fontSize: 9.5, letterSpacing: 1.2 },
  sectionTitle: { fontFamily: fonts.extraBold, fontSize: 18, lineHeight: 23, letterSpacing: -0.35 },
  sectionSubtitle: { color: '#64748B', fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 16, marginTop: 4 },
  seeAllButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, height: 34, borderRadius: 12, backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#CCFBF1', gap: 5, marginTop: 2 },
  seeAllText: { color: '#0F766E', fontFamily: fonts.bold, fontSize: 11.5 },
  guidedBanner: { marginHorizontal: 16, marginBottom: 13, borderRadius: 17, overflow: 'hidden', elevation: 3, shadowColor: '#0F766E', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.18, shadowRadius: 10 },
  guidedGradient: { minHeight: 76, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  guidedIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(153,246,228,0.22)' },
  guidedCopy: { flex: 1, marginHorizontal: 11 },
  guidedTitle: { color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 13.5 },
  guidedSubtitle: { color: 'rgba(255,255,255,0.7)', fontFamily: fonts.regular, fontSize: 10.5, lineHeight: 15, marginTop: 2 },
  guidedArrow: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)' },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 7 },
  rows: { gap: 10 },
  row: { flexDirection: 'row', gap: 10 },
  categoryCard: { width: 172, minHeight: 136, borderRadius: 18, backgroundColor: '#FFFFFF', padding: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#E8EEF3', shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 },
  cardAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, overflow: 'hidden' },
  imageShell: { width: 45, height: 45, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginBottom: 9 },
  categoryImage: { width: 35, height: 35 },
  categoryTitle: { color: '#0F172A', fontFamily: fonts.bold, fontSize: 13.5, lineHeight: 17 },
  categoryDescription: { color: '#64748B', fontFamily: fonts.regular, fontSize: 10.3, lineHeight: 14, marginTop: 3, minHeight: 28 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  exploreText: { fontFamily: fonts.bold, fontSize: 9.8 },
  arrowButton: { width: 25, height: 25, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
});
