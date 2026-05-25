import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts } from '../../constants/typography';
import { colors as staticColors } from '../../constants/colors';
import { SERVICE_CATEGORIES } from '../../constants/serviceCategories';

// --- Category Item Sub-Component ---
const ServiceCategoryItem: React.FC<{
  cat: any;
  index: number;
  onPress: (id: string) => void;
  colors: any;
}> = ({ cat, index, onPress, colors }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(index * 40),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 45,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const getProfessionalName = (id: string, defaultName: string) => {
    if (id === 'elektrik') return 'Elektrik Ustası';
    if (id === 'cilingir') return 'Çilingir Hizmeti';
    if (id === 'klima') return 'Klima Servisi';
    if (id === 'beyaz-esya') return 'Beyaz Eşya Ustası';
    if (id === 'tesisat') return 'Tesisat Ustası';
    return defaultName;
  };

  const getCategorySubtext = (id: string) => {
    if (id === 'elektrik') return 'Arıza, Tesisat & Montaj';
    if (id === 'cilingir') return '7/24 Kilit & Kapı Açma';
    if (id === 'klima') return 'Bakım, Montaj & Onarım';
    if (id === 'beyaz-esya') return 'Cihaz Tamir & Onarım';
    if (id === 'tesisat') return 'Tesisat, Kaçak & Montaj';
    return 'Güvenilir Hizmetler';
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          styles.serviceCategoryHorizontalCard,
          { 
            shadowColor: '#0F172A',
            borderColor: 'rgba(13, 148, 136, 0.05)',
          }
        ]}
        onPress={() => onPress(cat.id)}
        activeOpacity={0.88}
      >
        {/* Modern Circular Lens Icon Container */}
        <View style={styles.serviceCategoryIconContainer}>
          <LinearGradient
            colors={['rgba(13, 148, 136, 0.06)', 'rgba(6, 182, 212, 0.12)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Ionicons name={cat.icon} size={20} color={colors.primary} />
        </View>

        {/* Text Content */}
        <View style={styles.serviceCategoryTextContainer}>
          <Text style={[styles.serviceCategoryTitleText, { color: colors.text }]} numberOfLines={1}>
            {getProfessionalName(cat.id, cat.name)}
          </Text>
          <Text style={styles.serviceCategorySubtextText} numberOfLines={1}>
            {getCategorySubtext(cat.id)}
          </Text>
        </View>

        {/* Interactive Chevron Indicator */}
        <View style={styles.categoryCardChevron}>
          <Ionicons name="chevron-forward" size={12} color="#94A3B8" />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// --- Main Category Explore Component ---
interface CitizenExploreCategoriesProps {
  colors: any;
  handleActionWithAuth: (route: string, params?: any) => void;
}

export const CitizenExploreCategories: React.FC<CitizenExploreCategoriesProps> = ({
  colors,
  handleActionWithAuth,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionTitleContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>KEŞFET</Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.headerProjectAction}
          onPress={() => handleActionWithAuth('/jobs/create', { category: 'Elektrik Proje Çizimi', serviceCategory: 'elektrik' })}
        >
          <LinearGradient
            colors={[colors.secondary, colors.accent || '#06B6D4']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.headerProjectGradient}
          >
            <View style={styles.headerProjectIconWrapper}>
              <Ionicons name="flash" size={10} color="#FBBF24" />
            </View>
            <Text style={styles.headerProjectText}>Elektrik Proje Çizimi</Text>
            <Ionicons name="chevron-forward" size={12} color="rgba(255,255,255,0.7)" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        <View style={styles.carouselGridCol}>
          <View style={styles.carouselRow}>
            {SERVICE_CATEGORIES.filter((_, idx) => idx % 2 === 0).map((cat, index) => (
              <ServiceCategoryItem
                key={cat.id}
                cat={cat}
                index={index}
                onPress={(id: string) => handleActionWithAuth('/jobs/create', { serviceCategory: id })}
                colors={colors}
              />
            ))}
          </View>
          <View style={styles.carouselRow}>
            {SERVICE_CATEGORIES.filter((_, idx) => idx % 2 !== 0).map((cat, index) => (
              <ServiceCategoryItem
                key={cat.id}
                cat={cat}
                index={index + 10}
                onPress={(id: string) => handleActionWithAuth('/jobs/create', { serviceCategory: id })}
                colors={colors}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    width: '100%',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
    width: '100%',
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    letterSpacing: 1,
  },
  headerProjectAction: {
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  headerProjectGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 5,
  },
  headerProjectIconWrapper: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  headerProjectText: {
    color: '#FFF',
    fontSize: 10.5,
    fontFamily: fonts.extraBold,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  carouselGridCol: {
    flexDirection: 'column',
    gap: 8,
  },
  carouselRow: {
    flexDirection: 'row',
    gap: 8,
  },
  serviceCategoryHorizontalCard: {
    width: 230,
    height: 72,
    backgroundColor: staticColors.white,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  serviceCategoryIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.15)',
  },
  serviceCategoryTextContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  serviceCategoryTitleText: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    lineHeight: 17,
    letterSpacing: 0.1,
  },
  serviceCategorySubtextText: {
    fontFamily: fonts.medium,
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 2,
  },
  categoryCardChevron: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
});
