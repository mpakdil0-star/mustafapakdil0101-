import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ImageBackground, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts } from '../../constants/typography';
import { spacing } from '../../constants/spacing';
import { getFileUrl } from '../../constants/api';
import { SAMPLE_SHOWCASE_ITEMS } from '../../constants/sampleContent';

interface CitizenReelsShowcaseProps {
  homeShowcaseItems: any[];
  colors: any;
  setSelectedShowcaseItem: (item: any) => void;
  setShowcaseActiveImageIndex: (index: number) => void;
  setIsShowcaseDetailModalVisible: (visible: boolean) => void;
  isAuthenticated: boolean;
  onAuthRequired: () => void;
}

export const CitizenReelsShowcase: React.FC<CitizenReelsShowcaseProps> = ({
  homeShowcaseItems,
  colors,
  setSelectedShowcaseItem,
  setShowcaseActiveImageIndex,
  setIsShowcaseDetailModalVisible,
  isAuthenticated,
  onAuthRequired,
}) => {
  const [activeReelsIndex, setActiveReelsIndex] = useState(0);
  const hasRealItems = Array.isArray(homeShowcaseItems) && homeShowcaseItems.length > 0;
  const displayItems = hasRealItems ? homeShowcaseItems : SAMPLE_SHOWCASE_ITEMS;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionTitleContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>USTA VİTRİNİ</Text>
        </View>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={styles.vitrinScroller}
        snapToInterval={262} // vitrinCardSmall width (250) + gap (12)
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={(e) => {
          const scrollPosition = e.nativeEvent.contentOffset.x;
          const index = Math.max(0, Math.min(2, Math.round(scrollPosition / 262)));
          if (activeReelsIndex !== index) {
            setActiveReelsIndex(index);
          }
        }}
      >
        {Array.from({ length: 3 }).map((_, colIndex) => {
          const colItems = displayItems.slice(colIndex * 2, colIndex * 2 + 2);
          if (colItems.length === 0) return null;
          return (
            <View key={colIndex} style={styles.vitrinColumn}>
              {colItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.85}
                  onPress={() => {
                    if (item.isSample) return;
                    if (!isAuthenticated) {
                      onAuthRequired();
                      return;
                    }
                    setSelectedShowcaseItem(item);
                    setShowcaseActiveImageIndex(0);
                    setIsShowcaseDetailModalVisible(true);
                  }}
                  style={styles.vitrinCardSmall}
                  >
                  {item.isSample && (
                    <View style={styles.sampleCardBadge}>
                      <Text style={styles.sampleCardBadgeText}>ÖRNEK ÇALIŞMA</Text>
                    </View>
                  )}
                  <ImageBackground 
                    source={typeof item.image === 'string' ? { uri: getFileUrl(item.image) || '' } : item.image} 
                    style={styles.vitrinCardBg} 
                    imageStyle={styles.vitrinCardBgImage}
                  >
                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={styles.vitrinCardGradient}>
                      <View style={styles.vitrinCardContentRow}>
                        <View style={styles.vitrinIconCircleSm}>
                          {item.ustaAvatar ? (
                            <Image 
                              source={{ uri: getFileUrl(item.ustaAvatar) || '' }} 
                              style={{ width: 38, height: 38, borderRadius: 19 }} 
                              resizeMode="cover"
                            />
                          ) : (
                            <Ionicons name="person" size={16} color="#FFF" />
                          )}
                        </View>
                        <View style={styles.vitrinCardTextCol}>
                          <Text style={styles.vitrinCardTitle} numberOfLines={1}>{item.title}</Text>
                          <Text style={styles.vitrinCardDesc} numberOfLines={1}>@{item.ustaName ? item.ustaName.split(' ')[0] : 'Usta'}</Text>
                        </View>
                      </View>
                    </LinearGradient>
                  </ImageBackground>
                </TouchableOpacity>
              ))}
            </View>
          );
        })}
      </ScrollView>

      {/* Pagination Indicators */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 12, gap: 6 }}>
        {[0, 1, 2].map((i) => (
          <View 
            key={i} 
            style={{
              width: activeReelsIndex === i ? 20 : 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: activeReelsIndex === i ? colors.primary : colors.primary + '30',
            }}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginVertical: spacing.md,
    paddingHorizontal: spacing.screenPadding,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    justifyContent: 'space-between',
  },
  sectionTitleContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fonts.bold,
    letterSpacing: 0.5,
  },
  reelsSectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginLeft: 8,
    gap: 3,
  },
  reelsSectionBadgeText: {
    fontFamily: fonts.extraBold,
    fontSize: 10,
    color: '#EF4444',
    letterSpacing: 0.5,
  },
  vitrinScroller: {
    paddingRight: 16,
    gap: 12,
  },
  vitrinColumn: {
    gap: 12,
  },
  vitrinCardSmall: {
    width: 250,
    height: 125,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  sampleCardBadge: {
    position: 'absolute',
    top: 9,
    left: 9,
    zIndex: 5,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  sampleCardBadgeText: {
    color: '#0F766E',
    fontFamily: fonts.extraBold,
    fontSize: 8,
    letterSpacing: 0.35,
  },
  vitrinCardBg: {
    flex: 1,
  },
  vitrinCardBgImage: {
    borderRadius: 20,
  },
  vitrinCardGradient: {
    flex: 1,
    padding: 12,
    justifyContent: 'flex-end',
  },
  vitrinCardContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  vitrinIconCircleSm: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  vitrinCardTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  vitrinCardTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: '#FFF',
    marginBottom: 2,
  },
  vitrinCardDesc: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
  },
});
