import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
    id: 'ai-assistant',
    title: 'AI Teknik Kılavuz',
    subtitle: 'Arıza analizi ve çözüm önerileri',
    icon: 'sparkles' as keyof typeof Ionicons.glyphMap,
    color: '#0D9488',
    background: '#F0FDFA',
    route: '/ai-assistant',
  },
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

      <View style={[styles.toolsPanel, { backgroundColor: colors.surface || '#FFFFFF' }]}>
        <Text style={[styles.panelLabel, { color: colors.textSecondary }]} maxFontSizeMultiplier={1.1}>İŞ ARAÇLARI</Text>
        {WORK_TOOLS.map((tool, index) => (
          <React.Fragment key={tool.id}>
            <TouchableOpacity
              style={styles.toolRow}
              activeOpacity={0.78}
              onPress={() => handleActionWithAuth(tool.route, tool.id === 'ai-assistant' ? { role: 'ELECTRICIAN' } : undefined)}
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
  toolsPanel: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    borderRadius: 13,
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
