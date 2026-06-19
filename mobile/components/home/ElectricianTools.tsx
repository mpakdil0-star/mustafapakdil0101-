import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts } from '../../constants/typography';
import { colors as staticColors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';

interface ElectricianToolsProps {
  handleActionWithAuth: (route: string, params?: any) => void;
  colors: any;
}

export const ElectricianTools: React.FC<ElectricianToolsProps> = ({
  handleActionWithAuth,
  colors,
}) => {
  return (
    <View style={styles.section}>
      {/* Professional Tools Section */}
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionTitleContainer}>
          <Text style={styles.sectionTitle}>PROFESYONEL ARAÇLAR</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
      </View>

      {/* AI TECHNICAL ASSISTANT CARD */}
      <View style={{ marginBottom: 12 }}>
        <TouchableOpacity
          onPress={() => handleActionWithAuth('/ai-assistant', { role: 'ELECTRICIAN' })}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#1E293B', '#2E5C8A']}
            style={{
              borderRadius: 16,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              shadowColor: '#1E293B',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 4,
              position: 'relative',
              overflow: 'hidden'
            }}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {/* Giant watermark icon */}
            <View style={{ position: 'absolute', bottom: -10, right: -10, opacity: 0.8, transform: [{ rotate: '-10deg' }] }}>
              <Ionicons name="sparkles-outline" size={76} color="rgba(255, 255, 255, 0.04)" />
            </View>

            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255, 255, 255, 0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.25)', marginRight: 12 }}>
              <Ionicons name="sparkles" size={18} color="#E5C158" />
            </View>

            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 14, color: '#FFF', marginRight: 6 }}>AI Teknik Kılavuz</Text>
                <View style={{ backgroundColor: 'rgba(229, 193, 88, 0.2)', paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 6 }}>
                  <Text style={{ color: '#E5C158', fontSize: 8, fontFamily: fonts.bold }}>YENİ</Text>
                </View>
              </View>
              <Text style={{ fontFamily: fonts.medium, fontSize: 11, color: '#CBD5E1' }} numberOfLines={1}>
                Hata kodları, teklif şablonları ve teknik yardım al
              </Text>
            </View>

            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Asymmetrical Premium Tools Grid */}
      <View style={styles.toolsGridContainer}>
        {/* Left Column - Large Calendar Card */}
        <TouchableOpacity
          style={styles.toolGridLeftCard}
          onPress={() => handleActionWithAuth('/tools/calendar')}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#4682B4', '#2E5C8A']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Giant Watermark Icon */}
            <View style={styles.watermarkIconContainerLeft}>
              <Ionicons name="calendar-outline" size={120} color="rgba(255, 255, 255, 0.08)" />
            </View>

            <View style={styles.toolLeftCardContent}>
              <View style={styles.toolIconBadgeCircle}>
                <Ionicons name="calendar" size={18} color="#FFF" />
              </View>
              <View>
                <Text style={styles.toolLeftCardTitle}>Takvim</Text>
                <Text style={styles.toolLeftCardSubtitle}>Randevu & Zaman Planı</Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Right Column - Defter & PDF Stacked */}
        <View style={styles.toolGridRightColumn}>
          {/* Defter Card */}
          <TouchableOpacity
            style={styles.toolGridRightCard}
            onPress={() => handleActionWithAuth('/tools/ledger')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#16A34A', '#15803D']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {/* Giant Watermark Icon */}
              <View style={styles.watermarkIconContainerRight}>
                <Ionicons name="journal-outline" size={76} color="rgba(255, 255, 255, 0.08)" />
              </View>

              <View style={styles.toolRightCardContent}>
                <View style={styles.toolIconBadgeCircleSmall}>
                  <Ionicons name="journal" size={14} color="#FFF" />
                </View>
                <View style={{ marginLeft: 8, flex: 1 }}>
                  <Text style={styles.toolRightCardTitle}>Defter</Text>
                  <Text style={styles.toolRightCardSubtitle} numberOfLines={1}>Gelir & Gider Takibi</Text>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* PDF Quote Card */}
          <TouchableOpacity
            style={styles.toolGridRightCard}
            onPress={() => handleActionWithAuth('/tools/quote')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#EA580C', '#C2410C']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {/* Giant Watermark Icon */}
              <View style={styles.watermarkIconContainerRight}>
                <Ionicons name="document-text-outline" size={76} color="rgba(255, 255, 255, 0.08)" />
              </View>

              <View style={styles.toolRightCardContent}>
                <View style={styles.toolIconBadgeCircleSmall}>
                  <Ionicons name="document-text" size={14} color="#FFF" />
                </View>
                <View style={{ marginLeft: 8, flex: 1 }}>
                  <Text style={styles.toolRightCardTitle}>PDF Teklifler</Text>
                  <Text style={styles.toolRightCardSubtitle} numberOfLines={1}>Fiyat Teklifi Hazırla</Text>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
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
  toolsGridContainer: {
    flexDirection: 'row',
    height: 160,
    gap: 10,
    marginTop: 2,
    marginBottom: 4,
  },
  toolGridLeftCard: {
    flex: 1.1,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  watermarkIconContainerLeft: {
    position: 'absolute',
    bottom: -22,
    right: -22,
    opacity: 0.8,
    transform: [{ rotate: '-15deg' }],
  },
  toolLeftCardContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  toolIconBadgeCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  toolLeftCardTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: '#FFF',
    marginBottom: 2,
  },
  toolLeftCardSubtitle: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  toolGridRightColumn: {
    flex: 1,
    gap: 10,
  },
  toolGridRightCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  watermarkIconContainerRight: {
    position: 'absolute',
    bottom: -10,
    right: -10,
    opacity: 0.8,
    transform: [{ rotate: '-10deg' }],
  },
  toolRightCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  toolIconBadgeCircleSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  toolRightCardTitle: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: '#FFF',
    marginBottom: 1,
  },
  toolRightCardSubtitle: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.75)',
  },
});
