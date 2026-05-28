import React from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts } from '../../constants/typography';
import { colors as staticColors } from '../../constants/colors';
import HesKabloImage from '../../assets/images/mock_hes_kablo.jpg';
import SiemensSigortaImage from '../../assets/images/mock_siemens_sigorta.jpg';

interface CitizenMarketplaceProps {
  marketplaceProducts: any[];
  colors: any;
  setIsAllProductsModalVisible: (visible: boolean) => void;
  setIsAddProductModalVisible: (visible: boolean) => void;
  setSelectedProduct: (prod: any) => void;
  setIsProductDetailModalVisible: (visible: boolean) => void;
  isAuthenticated: boolean;
  onAuthRequired: () => void;
}

export const CitizenMarketplace: React.FC<CitizenMarketplaceProps> = ({
  marketplaceProducts,
  colors,
  setIsAllProductsModalVisible,
  setIsAddProductModalVisible,
  setSelectedProduct,
  setIsProductDetailModalVisible,
  isAuthenticated,
  onAuthRequired,
}) => {
  const displayProducts = marketplaceProducts.length > 0 ? marketplaceProducts : [
    {
      id: 'mock-market-1',
      title: '3x2.5 HES NYM Kablo (50 Metre)',
      desc: 'İnşaat fazlası rulo, hiç açılmamış ve kullanılmamıştır. Orijinal rulo paketindedir.',
      price: 1200,
      category: 'Kablo',
      sellerName: 'Ahmet Kaya (Vatandaş)',
      sellerId: 'mock-citizen-1',
      sellerType: 'CITIZEN',
      location: 'Kadıköy, İstanbul',
      date: 'Bugün',
      image: HesKabloImage,
    },
    {
      id: 'mock-market-2',
      title: 'Siemens 3 Faz Sigorta Grubu (25A)',
      desc: 'Sistem panosundan sökülen, çok temiz durumdaki 3 kutuplu Siemens sigortalar.',
      price: 450,
      category: 'Şalt Malzemesi',
      sellerName: 'Mustafa Yılmaz (Usta)',
      sellerId: 'mock-electrician-1',
      sellerType: 'ELECTRICIAN',
      location: 'Üsküdar, İstanbul',
      date: 'Dün',
      image: SiemensSigortaImage,
    }
  ];

  return (
    <View style={styles.section}>
      {/* Header Container */}
      <View style={{ marginBottom: 16 }}>
        {/* Row 1: Title and Tümünü Gör */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 17, marginBottom: 0 }]} numberOfLines={1}>
            PAZAR YERİ & İKİNCİ EL
          </Text>
          <TouchableOpacity 
            onPress={() => {
              if (!isAuthenticated) {
                onAuthRequired();
                return;
              }
              setIsAllProductsModalVisible(true);
            }}
            style={{ paddingVertical: 2, paddingLeft: 10 }}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 11, fontFamily: fonts.bold, color: colors.primary }}>Tümünü Gör &gt;</Text>
          </TouchableOpacity>
        </View>
 
        {/* Row 2: Subtitle and İlan Ekle */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={[styles.sectionSubtitle, { flex: 1, marginRight: 12, marginBottom: 0 }]}>Ustalar ve vatandaşlar arası malzeme satışı</Text>
          <TouchableOpacity
            style={styles.addProductBtn}
            activeOpacity={0.8}
            onPress={() => {
              if (!isAuthenticated) {
                onAuthRequired();
                return;
              }
              setIsAddProductModalVisible(true);
            }}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark || '#B91C1C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.addProductBtnGradient}
            >
              <Ionicons name="add-circle" size={14} color="#FFF" style={{ marginRight: 2 }} />
              <Text style={styles.addProductBtnText}>İlan Ekle</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
 
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={styles.marketScrollContainer}
      >
        {displayProducts.map((prod) => {
          const isUsta = prod.sellerType === 'ELECTRICIAN';
          const sellerDisplayName = prod.sellerName ? prod.sellerName.split(' (')[0] : (isUsta ? 'Usta' : 'Vatandaş');
          return (
            <TouchableOpacity
              key={prod.id}
              style={[styles.marketCard, { backgroundColor: colors.surface }]}
              activeOpacity={0.9}
              onPress={() => {
                if (!isAuthenticated) {
                  onAuthRequired();
                  return;
                }
                setSelectedProduct(prod);
                setIsProductDetailModalVisible(true);
              }}
            >
              {prod.isSold && (
                <View style={styles.soldOverlay}>
                  <View style={styles.soldBadge}>
                    <Text style={styles.soldBadgeText}>SATILDI</Text>
                  </View>
                </View>
              )}
              
              {/* Upper Part: Photo / Image */}
              {prod.image ? (
                <View style={styles.marketImageContainer}>
                  <Image
                    source={typeof prod.image === 'string' ? { uri: prod.image } : prod.image}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                  
                  {/* Floating Badge (Category) */}
                  <View style={{ position: 'absolute', top: 8, left: 8, zIndex: 2 }}>
                    <View style={[styles.marketCategoryBadge, { backgroundColor: colors.primary }]}>
                      <Text style={[styles.marketCategoryText, { color: '#FFF' }]}>{prod.category}</Text>
                    </View>
                  </View>

                  {/* Floating Badge (Seller Type) */}
                  <View style={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}>
                    <View style={styles.sellerTypeBadge}>
                      <Ionicons name={isUsta ? "build" : "person"} size={10} color="#FFF" style={{ marginRight: 3 }} />
                      <Text style={{ fontFamily: fonts.bold, fontSize: 8.5, color: '#FFF' }}>
                        {isUsta ? 'Usta' : 'Vatandaş'}
                      </Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.marketImageContainer}>
                  <LinearGradient
                    colors={['#F8FAFC', '#E2E8F0']}
                    style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}
                  >
                    <Ionicons name="cube-outline" size={32} color="#94A3B8" />
                  </LinearGradient>
                  
                  {/* Floating Badge (Category) */}
                  <View style={{ position: 'absolute', top: 8, left: 8, zIndex: 2 }}>
                    <View style={[styles.marketCategoryBadge, { backgroundColor: colors.primary }]}>
                      <Text style={[styles.marketCategoryText, { color: '#FFF' }]}>{prod.category}</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Lower Part: Descriptions & Info */}
              <View style={styles.marketDetailsContainer}>
                <View>
                  <Text style={[styles.marketProductTitle, { color: colors.text }]} numberOfLines={1}>
                    {prod.title}
                  </Text>
                  <Text style={[styles.marketProductDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                    {prod.desc}
                  </Text>
                </View>

                <View style={styles.marketCardFooter}>
                  <View style={styles.marketPriceWrapper}>
                    <Text style={styles.marketPriceLabel}>Fiyat</Text>
                    <Text style={[styles.marketPriceValue, { color: colors.primary }]}>₺{prod.price}</Text>
                  </View>
                  
                  <View style={{ alignItems: 'flex-end', flex: 1, marginLeft: 8 }}>
                    <Text style={styles.marketDateText}>{prod.date}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 2 }}>
                      <Ionicons name="person-circle-outline" size={11} color="#94A3B8" />
                      <Text 
                        style={{ fontFamily: fonts.semiBold, fontSize: 9.5, color: colors.textSecondary, maxWidth: 90 }} 
                        numberOfLines={1}
                      >
                        {sellerDisplayName}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    marginVertical: 12,
    width: '100%',
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: '#64748B',
  },
  addProductBtn: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  addProductBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 4,
  },
  addProductBtnText: {
    color: '#FFF',
    fontFamily: fonts.bold,
    fontSize: 11.5,
  },
  marketScrollContainer: {
    paddingVertical: 8,
    gap: 12,
  },
  marketCard: {
    width: 215,
    height: 245,
    borderRadius: 18,
    overflow: 'hidden',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  soldOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  soldBadge: {
    borderWidth: 2,
    borderColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    transform: [{ rotate: '-10deg' }],
  },
  soldBadgeText: {
    color: '#10B981',
    fontSize: 15,
    fontFamily: fonts.extraBold,
    letterSpacing: 1.5,
  },
  marketImageContainer: {
    width: '100%',
    height: 120,
    position: 'relative',
    overflow: 'hidden',
  },
  sellerTypeBadge: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  marketCategoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  marketCategoryText: {
    fontFamily: fonts.bold,
    fontSize: 9,
    textTransform: 'uppercase',
  },
  marketDetailsContainer: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  marketProductTitle: {
    fontFamily: fonts.bold,
    fontSize: 13.5,
    marginTop: 0,
  },
  marketProductDesc: {
    fontFamily: fonts.medium,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 4,
  },
  marketCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
    paddingTop: 8,
    marginTop: 6,
  },
  marketPriceWrapper: {
    flexDirection: 'column',
  },
  marketPriceLabel: {
    fontFamily: fonts.medium,
    fontSize: 8.5,
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  marketPriceValue: {
    fontFamily: fonts.extraBold,
    fontSize: 14,
  },
  marketDateText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: '#94A3B8',
  },
});
