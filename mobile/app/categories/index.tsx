import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import { fonts } from '../../constants/typography';
import { SERVICE_CATEGORIES } from '../../constants/serviceCategories';
import {
  ASANSOR_CATEGORIES,
  BEYAZ_ESYA_CATEGORIES,
  BOCEK_ILACLAMA_CATEGORIES,
  BOYA_BADANA_CATEGORIES,
  CILINGIR_CATEGORIES,
  ELEKTRIK_CATEGORIES,
  GUVENLIK_KAMERA_CATEGORIES,
  JobCategory,
  KLIMA_CATEGORIES,
  KOLTUK_HALI_CATEGORIES,
  KOMBI_SERVIS_CATEGORIES,
  KUCUK_NAKLIYE_CATEGORIES,
  MOBILYA_MONTAJ_CATEGORIES,
  NAKLIYAT_CATEGORIES,
  TEMIZLIK_CATEGORIES,
  TESISAT_CATEGORIES,
} from '../../constants/jobCategories';

interface CategoryGroup {
  id: string;
  title: string;
  categories: JobCategory[];
}

const CATEGORY_GROUPS: CategoryGroup[] = [
  { id: 'elektrik', title: 'Elektrik', categories: ELEKTRIK_CATEGORIES },
  { id: 'cilingir', title: 'Çilingir', categories: CILINGIR_CATEGORIES },
  { id: 'klima', title: 'Klima', categories: KLIMA_CATEGORIES },
  { id: 'beyaz-esya', title: 'Beyaz Eşya', categories: BEYAZ_ESYA_CATEGORIES },
  { id: 'tesisat', title: 'Su ve Tesisat', categories: TESISAT_CATEGORIES },
  { id: 'temizlik', title: 'Temizlik', categories: TEMIZLIK_CATEGORIES },
  { id: 'nakliyat', title: 'Evden Eve Nakliyat', categories: NAKLIYAT_CATEGORIES },
  { id: 'boya-badana', title: 'Boya ve Badana', categories: BOYA_BADANA_CATEGORIES },
  { id: 'koltuk-hali', title: 'Koltuk ve Halı Yıkama', categories: KOLTUK_HALI_CATEGORIES },
  { id: 'mobilya-montaj', title: 'Mobilya Montaj', categories: MOBILYA_MONTAJ_CATEGORIES },
  { id: 'kucuk-nakliye', title: 'Küçük Nakliye', categories: KUCUK_NAKLIYE_CATEGORIES },
  { id: 'kombi-servis', title: 'Kombi Servisi', categories: KOMBI_SERVIS_CATEGORIES },
  { id: 'asansor', title: 'Asansör Bakım', categories: ASANSOR_CATEGORIES },
  { id: 'bocek-ilaclama', title: 'Böcek İlaçlama', categories: BOCEK_ILACLAMA_CATEGORIES },
  { id: 'guvenlik-kamera', title: 'Güvenlik Sistemleri', categories: GUVENLIK_KAMERA_CATEGORIES },
];

const normalize = (value: string) => value.toLocaleLowerCase('tr-TR').trim();

export default function CategoriesScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>('elektrik');

  const filteredGroups = useMemo(() => {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) return CATEGORY_GROUPS;
    return CATEGORY_GROUPS
      .map((group) => {
        const groupMatches = normalize(group.title).includes(normalizedQuery);
        const matchingCategories = group.categories.filter((category) => normalize(category.name).includes(normalizedQuery));
        return groupMatches ? group : { ...group, categories: matchingCategories };
      })
      .filter((group) => group.categories.length > 0);
  }, [query]);

  const totalServices = CATEGORY_GROUPS.reduce((sum, group) => sum + group.categories.length, 0);

  const createJob = (group: CategoryGroup, category?: JobCategory) => {
    router.push({
      pathname: '/jobs/create',
      params: {
        serviceCategory: group.id,
        ...(category ? { category: category.name } : {}),
      },
    });
  };

  return (
    <View style={styles.container}>
      <PremiumHeader title="Hizmet Kategorileri" showBackButton onBackPress={() => router.back()} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
        <LinearGradient colors={['#073B39', '#0F766E', '#0D9488']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
          <View style={styles.heroGlow} />
          <View style={styles.heroBadge}>
            <Ionicons name="shield-checkmark" size={13} color="#99F6E4" />
            <Text style={styles.heroBadgeText}>DOĞRU HİZMETE HIZLI ULAŞIN</Text>
          </View>
          <Text style={styles.heroTitle}>İhtiyacınız için en uygun hizmeti seçin</Text>
          <Text style={styles.heroSubtitle}>Uzmanlık alanını seçin, ilanınızı birkaç adımda oluşturun ve bölgenizdeki ustalardan teklif alın.</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{CATEGORY_GROUPS.length}</Text>
              <Text style={styles.statLabel}>Ana kategori</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalServices}+</Text>
              <Text style={styles.statLabel}>Hizmet seçeneği</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="flash" size={18} color="#FDE68A" />
              <Text style={styles.statLabel}>Hızlı ilan</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#0F766E" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Hizmet ara: priz, klima, temizlik..."
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 ? (
            <TouchableOpacity style={styles.clearButton} onPress={() => setQuery('')}>
              <Ionicons name="close" size={16} color="#64748B" />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>{query ? 'ARAMA SONUÇLARI' : 'TÜM HİZMETLER'}</Text>
            <Text style={styles.sectionTitle}>{query ? `${filteredGroups.length} kategoride sonuç bulundu` : 'Kategori seçerek devam edin'}</Text>
          </View>
          <View style={styles.secureBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#0D9488" />
            <Text style={styles.secureBadgeText}>Ücretsiz ilan</Text>
          </View>
        </View>

        {filteredGroups.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}><Ionicons name="search-outline" size={28} color="#0D9488" /></View>
            <Text style={styles.emptyTitle}>Hizmet bulunamadı</Text>
            <Text style={styles.emptyText}>Farklı bir kelime deneyin veya kategorilerin tamamını görüntülemek için aramayı temizleyin.</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={() => setQuery('')}><Text style={styles.emptyButtonText}>Tüm kategorileri göster</Text></TouchableOpacity>
          </View>
        ) : (
          filteredGroups.map((group) => {
            const meta = SERVICE_CATEGORIES.find((category) => category.id === group.id);
            const primary = meta?.colors[0] || '#2DD4BF';
            const secondary = meta?.colors[1] || '#0D9488';
            const isExpanded = Boolean(query) || expandedId === group.id;
            return (
              <View key={group.id} style={styles.groupCard}>
                <TouchableOpacity
                  style={styles.groupHeader}
                  activeOpacity={0.82}
                  onPress={() => setExpandedId((current) => current === group.id ? null : group.id)}
                >
                  <LinearGradient colors={[primary, secondary]} style={styles.groupIcon}>
                    <Ionicons name={(meta?.icon || 'grid') as any} size={23} color="#FFFFFF" />
                  </LinearGradient>
                  <View style={styles.groupCopy}>
                    <Text style={styles.groupTitle}>{group.title}</Text>
                    <Text style={styles.groupDescription} numberOfLines={1}>{meta?.description || `${group.categories.length} farklı hizmet seçeneği`}</Text>
                    <View style={styles.groupMetaRow}>
                      <View style={[styles.countBadge, { backgroundColor: `${primary}12` }]}>
                        <Text style={[styles.countText, { color: secondary }]}>{group.categories.length} hizmet</Text>
                      </View>
                      <Text style={styles.tapHint}>{isExpanded ? 'Seçenekler açık' : 'Detayları görüntüle'}</Text>
                    </View>
                  </View>
                  <View style={[styles.expandButton, isExpanded && { backgroundColor: `${primary}12`, borderColor: `${primary}25` }]}>
                    <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={17} color={isExpanded ? secondary : '#64748B'} />
                  </View>
                </TouchableOpacity>

                {isExpanded ? (
                  <View style={styles.servicesArea}>
                    <TouchableOpacity style={styles.generalService} onPress={() => createJob(group)} activeOpacity={0.8}>
                      <View style={styles.serviceIcon}>
                        <Ionicons name="apps-outline" size={17} color="#0F766E" />
                      </View>
                      <View style={styles.serviceCopy}>
                        <Text style={styles.serviceName}>Genel {group.title} ilanı</Text>
                        <Text style={styles.serviceHint}>Alt hizmetten emin değilseniz buradan başlayın</Text>
                      </View>
                      <Ionicons name="arrow-forward" size={16} color="#0F766E" />
                    </TouchableOpacity>

                    <View style={styles.servicesGrid}>
                      {group.categories.map((category) => (
                        <TouchableOpacity key={category.id} style={styles.serviceCard} onPress={() => createJob(group, category)} activeOpacity={0.8}>
                          <View style={styles.smallServiceIcon}>
                            <Ionicons name={category.icon as any} size={16} color="#0F766E" />
                          </View>
                          <Text style={styles.smallServiceName} numberOfLines={2}>{category.name}</Text>
                          <Ionicons name="chevron-forward" size={13} color="#94A3B8" />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })
        )}

        <View style={styles.helpCard}>
          <View style={styles.helpIcon}><Ionicons name="sparkles" size={21} color="#0D9488" /></View>
          <View style={styles.helpCopy}>
            <Text style={styles.helpTitle}>Hangi kategoriyi seçeceğinizden emin değil misiniz?</Text>
            <Text style={styles.helpText}>AI asistana sorununuzu anlatın; doğru hizmet kategorisini birlikte belirleyin.</Text>
          </View>
          <TouchableOpacity style={styles.helpButton} onPress={() => router.push({ pathname: '/ai-assistant', params: { role: 'CITIZEN' } })}>
            <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F8FA' },
  content: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 36 },
  hero: { borderRadius: 22, padding: 18, overflow: 'hidden', shadowColor: '#0F766E', shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.2, shadowRadius: 14, elevation: 5 },
  heroGlow: { position: 'absolute', width: 170, height: 170, borderRadius: 85, backgroundColor: 'rgba(255,255,255,0.06)', top: -85, right: -35 },
  heroBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.09)', borderWidth: 1, borderColor: 'rgba(153,246,228,0.2)', gap: 5 },
  heroBadgeText: { color: '#CCFBF1', fontFamily: fonts.bold, fontSize: 8.5, letterSpacing: 0.8 },
  heroTitle: { color: '#FFFFFF', fontFamily: fonts.extraBold, fontSize: 21, lineHeight: 27, letterSpacing: -0.5, marginTop: 13, maxWidth: '90%' },
  heroSubtitle: { color: 'rgba(255,255,255,0.72)', fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, marginTop: 7 },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 17, paddingTop: 13, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)' },
  statItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statValue: { color: '#FFFFFF', fontFamily: fonts.extraBold, fontSize: 18 },
  statLabel: { color: 'rgba(255,255,255,0.62)', fontFamily: fonts.medium, fontSize: 9.5, marginTop: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.14)' },
  searchBox: { height: 54, borderRadius: 17, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', marginTop: 15, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  searchInput: { flex: 1, height: '100%', color: '#0F172A', fontFamily: fonts.medium, fontSize: 13.5, paddingHorizontal: 10 },
  clearButton: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9' },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 22, marginBottom: 11, paddingHorizontal: 2 },
  sectionEyebrow: { color: '#0D9488', fontFamily: fonts.extraBold, fontSize: 9, letterSpacing: 1 },
  sectionTitle: { color: '#0F172A', fontFamily: fonts.bold, fontSize: 16, marginTop: 3 },
  secureBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 9, backgroundColor: '#ECFDF5' },
  secureBadgeText: { color: '#0F766E', fontFamily: fonts.bold, fontSize: 9.5 },
  groupCard: { backgroundColor: '#FFFFFF', borderRadius: 19, marginBottom: 11, borderWidth: 1, borderColor: '#E5EAF0', overflow: 'hidden', shadowColor: '#0F172A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.045, shadowRadius: 8, elevation: 1 },
  groupHeader: { minHeight: 92, flexDirection: 'row', alignItems: 'center', padding: 13 },
  groupIcon: { width: 52, height: 52, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  groupCopy: { flex: 1, paddingRight: 8 },
  groupTitle: { color: '#0F172A', fontFamily: fonts.bold, fontSize: 15 },
  groupDescription: { color: '#64748B', fontFamily: fonts.regular, fontSize: 10.5, marginTop: 3 },
  groupMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 7 },
  countBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7 },
  countText: { fontFamily: fonts.bold, fontSize: 9.5 },
  tapHint: { color: '#94A3B8', fontFamily: fonts.medium, fontSize: 9, marginLeft: 7 },
  expandButton: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#EEF2F6' },
  servicesArea: { padding: 12, paddingTop: 0, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  generalService: { flexDirection: 'row', alignItems: 'center', minHeight: 57, borderRadius: 14, borderWidth: 1, borderColor: '#CCFBF1', backgroundColor: '#F0FDFA', paddingHorizontal: 11, marginTop: 11, marginBottom: 9 },
  serviceIcon: { width: 35, height: 35, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginRight: 9, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CCFBF1' },
  serviceCopy: { flex: 1 },
  serviceName: { color: '#0F172A', fontFamily: fonts.bold, fontSize: 11.5 },
  serviceHint: { color: '#64748B', fontFamily: fonts.regular, fontSize: 9.3, marginTop: 2 },
  servicesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  serviceCard: { width: '48.7%', minHeight: 58, borderRadius: 13, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 9, paddingVertical: 8, flexDirection: 'row', alignItems: 'center' },
  smallServiceIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginRight: 7, backgroundColor: '#F0FDFA', borderWidth: 1, borderColor: '#CCFBF1' },
  smallServiceName: { flex: 1, color: '#334155', fontFamily: fonts.bold, fontSize: 9.7, lineHeight: 12 },
  emptyState: { alignItems: 'center', padding: 28, borderRadius: 19, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5EAF0' },
  emptyIcon: { width: 54, height: 54, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ECFDF5' },
  emptyTitle: { color: '#0F172A', fontFamily: fonts.bold, fontSize: 16, marginTop: 12 },
  emptyText: { color: '#64748B', fontFamily: fonts.regular, fontSize: 11.5, lineHeight: 17, textAlign: 'center', marginTop: 5 },
  emptyButton: { marginTop: 13, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 10, backgroundColor: '#0D9488' },
  emptyButtonText: { color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 11 },
  helpCard: { flexDirection: 'row', alignItems: 'center', marginTop: 9, padding: 13, borderRadius: 17, backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#CCFBF1' },
  helpIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  helpCopy: { flex: 1, marginHorizontal: 10 },
  helpTitle: { color: '#134E4A', fontFamily: fonts.bold, fontSize: 11.5, lineHeight: 15 },
  helpText: { color: '#0F766E', fontFamily: fonts.regular, fontSize: 9.5, lineHeight: 13, marginTop: 2 },
  helpButton: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0D9488' },
});
