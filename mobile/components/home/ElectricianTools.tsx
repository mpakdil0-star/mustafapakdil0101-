import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { fonts } from '../../constants/typography';
import { spacing } from '../../constants/spacing';

interface ElectricianToolsProps {
  handleActionWithAuth: (route: string, params?: any) => void;
  colors: any;
}

const WORK_TOOLS: {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  background: string;
  route: string;
}[] = [
  {
    id: 'calendar',
    title: 'Takvim',
    subtitle: 'Randevu ve hatırlatıcılarınızı yönetin',
    icon: 'calendar-outline',
    color: '#2563EB',
    background: '#EFF6FF',
    route: '/tools/calendar',
  },
  {
    id: 'ledger',
    title: 'Defter',
    subtitle: 'Gelir ve giderlerinizi takip edin',
    icon: 'journal-outline',
    color: '#059669',
    background: '#ECFDF5',
    route: '/tools/ledger',
  },
  {
    id: 'quote',
    title: 'PDF Teklif',
    subtitle: 'Kurumsal fiyat teklifleri hazırlayın',
    icon: 'document-text-outline',
    color: '#EA580C',
    background: '#FFF7ED',
    route: '/tools/quote',
  },
];

export const ElectricianTools: React.FC<ElectricianToolsProps> = ({
  handleActionWithAuth,
  colors,
}) => {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]} maxFontSizeMultiplier={1.2}>Profesyonel araçlar</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]} maxFontSizeMultiplier={1.15}>
          Teknik destek ve iş yönetimi araçları
        </Text>
      </View>

      <TouchableOpacity
        style={styles.aiCard}
        activeOpacity={0.86}
        onPress={() => handleActionWithAuth('/ai-assistant', { role: 'ELECTRICIAN' })}
      >
        <LinearGradient
          colors={['#172033', '#243B5A', '#245B68']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.aiGradient}
        >
          <View style={styles.aiGlow} />
          <View style={styles.aiTopRow}>
            <View style={styles.aiIcon}>
              <Ionicons name="sparkles" size={18} color="#FDE68A" />
            </View>
            <View style={styles.aiBadge}>
              <View style={styles.aiBadgeDot} />
              <Text style={styles.aiBadgeText}>AI DESTEKLİ</Text>
            </View>
          </View>

          <View style={styles.aiContentRow}>
            <View style={styles.aiCopy}>
              <Text style={styles.aiTitle} numberOfLines={1} maxFontSizeMultiplier={1.15}>AI Teknik Kılavuz</Text>
              <Text style={styles.aiSubtitle} numberOfLines={1} maxFontSizeMultiplier={1.1}>
                Arıza analizi, hata kodları ve çözüm önerileri alın.
              </Text>
            </View>
            <View style={styles.aiAction}>
              <Ionicons name="arrow-forward" size={16} color="#172033" />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>

      <View style={[styles.toolsPanel, { backgroundColor: colors.surface || '#FFFFFF' }]}>
        <Text style={[styles.panelLabel, { color: colors.textSecondary }]} maxFontSizeMultiplier={1.1}>İŞ ARAÇLARI</Text>
        {WORK_TOOLS.map((tool, index) => (
          <React.Fragment key={tool.id}>
            <TouchableOpacity
              style={styles.toolRow}
              activeOpacity={0.78}
              onPress={() => handleActionWithAuth(tool.route)}
            >
              <View style={[styles.toolIcon, { backgroundColor: tool.background }]}>
                <Ionicons name={tool.icon} size={20} color={tool.color} />
              </View>
              <View style={styles.toolCopy}>
                <Text style={[styles.toolTitle, { color: colors.text }]} numberOfLines={1} maxFontSizeMultiplier={1.15}>
                  {tool.title}
                </Text>
                <Text style={[styles.toolSubtitle, { color: colors.textSecondary }]} numberOfLines={1} maxFontSizeMultiplier={1.1}>
                  {tool.subtitle}
                </Text>
              </View>
              <View style={styles.toolArrow}>
                <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
              </View>
            </TouchableOpacity>
            {index < WORK_TOOLS.length - 1 && <View style={styles.divider} />}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginTop: 10,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.screenPadding,
  },
  sectionHeader: {
    marginBottom: 7,
  },
  sectionTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 17,
    letterSpacing: -0.25,
  },
  sectionSubtitle: {
    fontFamily: fonts.medium,
    fontSize: 10.5,
    lineHeight: 15,
    marginTop: 2,
  },
  aiCard: {
    borderRadius: 17,
    overflow: 'hidden',
    marginBottom: 9,
    shadowColor: '#172033',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 9,
    elevation: 3,
  },
  aiGradient: {
    minHeight: 98,
    padding: 11,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  aiGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    right: -45,
    top: -55,
    backgroundColor: 'rgba(45,212,191,0.08)',
  },
  aiTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aiIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(253,230,138,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(253,230,138,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBadge: {
    minHeight: 22,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  aiBadgeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#5EEAD4',
  },
  aiBadgeText: {
    color: '#CCFBF1',
    fontFamily: fonts.bold,
    fontSize: 7.5,
    letterSpacing: 0.55,
  },
  aiContentRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  aiCopy: {
    flex: 1,
    paddingRight: 11,
  },
  aiTitle: {
    color: '#FFFFFF',
    fontFamily: fonts.extraBold,
    fontSize: 15,
    letterSpacing: -0.2,
  },
  aiSubtitle: {
    color: 'rgba(255,255,255,0.68)',
    fontFamily: fonts.medium,
    fontSize: 9.5,
    lineHeight: 13,
    marginTop: 2,
  },
  aiAction: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolsPanel: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E4EAEE',
    paddingHorizontal: 13,
    paddingTop: 12,
    paddingBottom: 5,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.035,
    shadowRadius: 8,
    elevation: 1,
  },
  panelLabel: {
    fontFamily: fonts.bold,
    fontSize: 8.5,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  toolRow: {
    minHeight: 61,
    flexDirection: 'row',
    alignItems: 'center',
  },
  toolIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolCopy: {
    flex: 1,
    paddingHorizontal: 11,
  },
  toolTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
  },
  toolSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 10,
    marginTop: 2,
  },
  toolArrow: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    marginLeft: 51,
    backgroundColor: '#EEF2F5',
  },
});
