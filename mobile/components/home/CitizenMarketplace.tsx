import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts } from '../../constants/typography';
import { SAMPLE_MARKETPLACE_PRODUCTS } from '../../constants/sampleContent';

interface CitizenMarketplaceProps {
  marketplaceProducts: any[];
  colors: any;
  setIsAllProductsModalVisible: (visible: boolean) => void;
  setIsAddProductModalVisible: (visible: boolean) => void;
  setSelectedProduct: (prod: any) => void;
  setIsProductDetailModalVisible: (visible: boolean) => void;
  isAuthenticated: boolean;
  onAuthRequired: () => void;
  onSamplePress?: () => void;
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
  onSamplePress,
}) => {
  const hasRealProducts = Array.isArray(marketplaceProducts) && marketplaceProducts.length > 0;
  const displayProducts = hasRealProducts ? marketplaceProducts : SAMPLE_MARKETPLACE_PRODUCTS;

  return (
    <View style={styles.section}>
      <View style={styles.headerBlock}>
        <View style={styles.headingRow}>
          <View style={styles.headingCopy}>
            <Text style={[styles.sectionTitle, { color: colors.text }]} maxFontSizeMultiplier={1.2}>Pazar Yeri & İkinci El</Text>
            <Text style={styles.sectionSubtitle}>Yakınınızdaki uygun ekipman ve ikinci el ürünleri keşfedin.</Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              if (!isAuthenticated) {
                onAuthRequired();
                return;
              }
              setIsAllProductsModalVisible(true);
            }}
            style={styles.seeAllButton}
            activeOpacity={0.7}
          >
            <Text style={[styles.seeAllText, { color: colors.primary }]}>Tümü</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.headerActionsRow}>
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
              colors={colors.primaryGradient || ['#0D9488', '#2DD4BF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.addProductBtnGradient}
            >
              <Ionicons name="add-circle-outline" size={15} color="#FFF" />
              <Text style={styles.addProductBtnText}>Ürün ilanı ver</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
 
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={styles.marketScrollContainer}
      >
        {displayProducts.length === 0 && (
          <View style={styles.emptyCard}>
            <Ionicons name="cube-outline" size={26} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Henüz ürün ilanı yok</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>İlk malzeme ilanını siz yayınlayabilirsiniz.</Text>
          </View>
        )}
        {displayProducts.map((prod) => {
          const isUsta = prod.sellerType === 'ELECTRICIAN';
          const sellerDisplayName = prod.sellerName ? prod.sellerName.split(' (')[0] : (isUsta ? 'Usta' : 'Vatandaş');
          return (
            <TouchableOpacity
              key={prod.id}
              style={[
                styles.marketCard,
                {
                  backgroundColor: colors.surface,
                  shadowColor: colors.primary,
                  borderColor: 'rgba(0, 0, 0, 0.04)',
                }
              ]}
              activeOpacity={0.9}
              onPress={() => {
                if (prod.isSample) {
                  onSamplePress?.();
                  return;
                }
                if (!isAuthenticated) {
                  onAuthRequired();
                  return;
                }
                setSelectedProduct(prod);
                setIsProductDetailModalVisible(true);
              }}
            >
              {prod.isSample && (
                <View style={styles.sampleProductBadge}>
                  <Ionicons name="sparkles" size={10} color="#0F766E" />
                  <Text style={styles.sampleProductBadgeText}>ÖRNEK</Text>
                </View>
              )}
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

              {/* Thin Elegant Divider Line */}
              <View style={{ height: 1, backgroundColor: 'rgba(0, 0, 0, 0.05)' }} />

              {/* Lower Part: Descriptions & Info */}
              <View style={styles.marketDetailsContainer}>
                <View>
                  <Text style={[styles.marketProductTitle, { color: colors.text }]} numberOfLines={1} maxFontSizeMultiplier={1.15}>
                    {prod.title}
                  </Text>
                  <Text style={[styles.marketProductDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                    {prod.desc}
                  </Text>
                </View>

                <View style={styles.marketCardFooter}>
                  <View style={[styles.marketPricePill, { backgroundColor: 'rgba(16, 185, 129, 0.08)', borderColor: 'rgba(16, 185, 129, 0.18)' }]}>
                    <Text style={[styles.marketPriceValue, { color: '#059669' }]}>₺{Number(prod.price || 0).toLocaleString('tr-TR')}</Text>
                  </View>
                  
                  <View style={{ alignItems: 'flex-end', flex: 1, marginLeft: 8 }}>
                    <View style={styles.marketLocationRow}>
                      <Ionicons name="location-outline" size={10} color="#94A3B8" />
                      <Text style={styles.marketDateText} numberOfLines={1}>{prod.location || 'Konum yok'}</Text>
                    </View>
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
    marginTop: 18,
    marginBottom: 20,
    width: '100%',
  },
  headerBlock: {
    marginBottom: 12,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headingCopy: {
    flex: 1,
    paddingRight: 12,
  },
  eyebrow: {
    color: '#0F766E',
    fontFamily: fonts.extraBold,
    fontSize: 9,
    letterSpacing: 1,
    marginBottom: 5,
  },
  listingCountPill: {
    minWidth: 62,
    borderRadius: 14,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    paddingHorizontal: 9,
    paddingVertical: 7,
    alignItems: 'center',
  },
  listingCountValue: {
    color: '#047857',
    fontFamily: fonts.extraBold,
    fontSize: 15,
    lineHeight: 17,
  },
  listingCountLabel: {
    color: '#0F766E',
    fontFamily: fonts.medium,
    fontSize: 8.5,
  },
  headerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 9,
  },
  seeAllButton: {
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    backgroundColor: '#ECFDF5',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  seeAllText: {
    fontFamily: fonts.bold,
    fontSize: 10.5,
  },
  emptyCard: {
    width: 260,
    minHeight: 150,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    marginTop: 10,
  },
  emptyText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  sectionTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 18,
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontFamily: fonts.medium,
    fontSize: 11,
    lineHeight: 16,
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
    height: 34,
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
    width: 205,
    height: 232,
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
  sampleProductBadge: {
    position: 'absolute',
    left: 9,
    bottom: 9,
    zIndex: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  sampleProductBadgeText: {
    color: '#0F766E',
    fontFamily: fonts.extraBold,
    fontSize: 8,
    letterSpacing: 0.4,
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
    height: 112,
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
  marketPricePill: {
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marketPriceValue: {
    fontFamily: fonts.extraBold,
    fontSize: 13,
  },
  marketDateText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: '#94A3B8',
    maxWidth: 80,
  },
  marketLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
});
