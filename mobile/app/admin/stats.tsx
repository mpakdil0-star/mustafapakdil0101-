import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';
import { useAppColors } from '../../hooks/useAppColors';
import api from '../../services/api';

const { width } = Dimensions.get('window');

interface KPIData {
  totalCitizens: number;
  totalElectricians: number;
  pendingVerifications: number;
}

interface DistributionItem {
  name: string;
  count: number;
}

interface HeatmapItem {
  district: string;
  jobCount: number;
  masterCount: number;
  status: 'GREEN' | 'RED' | 'YELLOW';
}

interface StatsData {
  kpis: KPIData;
  serviceDistribution: DistributionItem[];
  districtDistribution: DistributionItem[];
  liveData: {
    activeUstalar: number;
    activeCitizens: number;
  };
  heatmap: HeatmapItem[];
  availableCities: string[];
}

export default function AdminStatsScreen() {
  const router = useRouter();
  const colors = useAppColors();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StatsData | null>(null);
  const [selectedCity, setSelectedCity] = useState('ALL'); // ALL = Tüm Türkiye
  const [showAllServices, setShowAllServices] = useState(false);
  const [showAllDistricts, setShowAllDistricts] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);

  useEffect(() => {
    fetchStats();
  }, [selectedCity]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/detailed-stats?city=${selectedCity}`);
      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (error) {
      console.error('Fetch detailed stats error:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateToUsers = (filters: { 
    initialFilter?: string, 
    initialSearch?: string, 
    initialCity?: string, 
    initialDistrict?: string,
    initialCategory?: string 
  }) => {
    // Clean undefined params
    const cleanFilters: any = {};
    Object.keys(filters).forEach(key => {
      const val = (filters as any)[key];
      if (val !== undefined && val !== null && val !== '') {
        cleanFilters[key] = val;
      }
    });

    router.push({
      pathname: '/admin/users',
      params: cleanFilters
    });
  };

  if (loading && !data) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={styles.loadingText}>Veriler Hazırlanıyor...</Text>
      </View>
    );
  }

  const renderDistributionList = (items: DistributionItem[], showAll: boolean, setShowAll: (v: boolean) => void, color: string, type: 'CATEGORY' | 'DISTRICT') => {
    const sorted = [...items].sort((a, b) => b.count - a.count);
    const top5 = sorted.slice(0, 5);
    const rest = sorted.slice(5);
    const total = sorted.reduce((acc, curr) => acc + curr.count, 0);

    const renderItem = (item: DistributionItem, index: number) => (
      <TouchableOpacity 
        key={index} 
        style={styles.listItem}
        onPress={() => {
          if (type === 'CATEGORY') {
            navigateToUsers({ initialFilter: 'ELECTRICIAN', initialCategory: item.name, initialCity: selectedCity !== 'ALL' ? selectedCity : undefined });
          } else {
            navigateToUsers({ initialFilter: 'CITIZEN', initialDistrict: item.name, initialCity: selectedCity !== 'ALL' ? selectedCity : undefined });
          }
        }}
      >
        <View style={styles.listTextRow}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemCount}>{item.count}</Text>
        </View>
        <View style={styles.progressBarBg}>
          <View 
            style={[
              styles.progressBarFill, 
              { backgroundColor: color, width: `${(item.count / total) * 100}%` }
            ]} 
          />
        </View>
      </TouchableOpacity>
    );

    return (
      <View style={styles.listContainer}>
        {top5.map((item, index) => renderItem(item, index))}

        {rest.length > 0 && (
          <>
            <TouchableOpacity 
              style={styles.showMoreBtn} 
              onPress={() => setShowAll(!showAll)}
            >
              <Text style={[styles.showMoreText, { color }]}>
                {showAll ? 'Gizle' : `Tümünü Gör (${rest.length}+)`}
              </Text>
              <Ionicons 
                name={showAll ? 'chevron-up' : 'chevron-down'} 
                size={16} 
                color={color} 
              />
            </TouchableOpacity>

            {showAll && rest.map((item, index) => renderItem(item, index))}
          </>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <PremiumHeader title="Stratejik İstatistikler" showBackButton />

      <ScrollView contentContainerStyle={styles.content}>
        {/* City Filter Selection */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Bölge Seçimi:</Text>
          <TouchableOpacity 
            style={styles.cityBadge}
            onPress={() => setShowCityPicker(true)}
          >
            <Text style={styles.cityName}>
              {selectedCity === 'ALL' ? 'Tüm Türkiye' : selectedCity}
            </Text>
            <Ionicons name="chevron-down" size={14} color="#7C3AED" />
          </TouchableOpacity>
        </View>

        {/* City Picker Modal */}
        {showCityPicker && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>İl Seçiniz</Text>
                <TouchableOpacity onPress={() => setShowCityPicker(false)}>
                  <Ionicons name="close" size={24} color="#64748B" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.cityList}>
                <TouchableOpacity 
                  style={[styles.cityItem, selectedCity === 'ALL' && styles.selectedCityItem]}
                  onPress={() => {
                    setSelectedCity('ALL');
                    setShowCityPicker(false);
                  }}
                >
                  <Text style={[styles.cityItemText, selectedCity === 'ALL' && styles.selectedCityText]}>Tüm Türkiye</Text>
                  {selectedCity === 'ALL' && <Ionicons name="checkmark" size={20} color="#7C3AED" />}
                </TouchableOpacity>

                {data?.availableCities.map((city) => (
                  <TouchableOpacity 
                    key={city}
                    style={[styles.cityItem, selectedCity === city && styles.selectedCityItem]}
                    onPress={() => {
                      setSelectedCity(city);
                      setShowCityPicker(false);
                    }}
                  >
                    <Text style={[styles.cityItemText, selectedCity === city && styles.selectedCityText]}>{city}</Text>
                    {selectedCity === city && <Ionicons name="checkmark" size={20} color="#7C3AED" />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        )}

        {/* Global KPI Cards */}
        <View style={styles.kpiContainer}>
          <View style={[styles.kpiCard, { borderLeftColor: '#7C3AED', borderLeftWidth: 4 }]}>
            <Text style={styles.kpiValue}>{data?.kpis.totalElectricians}</Text>
            <Text style={styles.kpiLabel}>Toplam Usta</Text>
          </View>
          <View style={[styles.kpiCard, { borderLeftColor: '#3B82F6', borderLeftWidth: 4 }]}>
            <Text style={styles.kpiValue}>{data?.kpis.totalCitizens}</Text>
            <Text style={styles.kpiLabel}>Toplam Vatandaş</Text>
          </View>
          <View style={[styles.kpiCard, { borderLeftColor: '#F59E0B', borderLeftWidth: 4 }]}>
            <Text style={styles.kpiValue}>{data?.kpis.pendingVerifications}</Text>
            <Text style={styles.kpiLabel}>Bekleyen Onay</Text>
          </View>
        </View>

        {/* Live Activity Widgets */}
        <View style={styles.sectionHeader}>
          <View style={styles.liveIndicator} />
          <Text style={styles.sectionTitle}>Son 24 Saat Aktiflik</Text>
        </View>
        <View style={styles.liveContainer}>
          <View style={styles.liveCard}>
            <Ionicons name="flash" size={20} color="#7C3AED" />
            <Text style={styles.liveValue}>{data?.liveData.activeUstalar}</Text>
            <Text style={styles.liveLabel}>Aktif Usta</Text>
          </View>
          <View style={styles.liveCard}>
            <Ionicons name="people" size={20} color="#3B82F6" />
            <Text style={styles.liveValue}>{data?.liveData.activeCitizens}</Text>
            <Text style={styles.liveLabel}>Aktif Vatandaş</Text>
          </View>
        </View>

        {/* Main Distribution Sections */}
        <View style={styles.mainGrid}>
          {/* Usta Side (Purple) */}
          <View style={styles.gridColumn}>
            <View style={[styles.columnHeader, { backgroundColor: '#F5F3FF' }]}>
              <Ionicons name="hammer" size={18} color="#7C3AED" />
              <Text style={[styles.columnTitle, { color: '#7C3AED' }]}>Usta Dağılımı</Text>
            </View>
            <View style={styles.columnContent}>
              <Text style={styles.subLabel}>Meslek Branşları</Text>
              {data && renderDistributionList(data.serviceDistribution, showAllServices, setShowAllServices, '#7C3AED', 'CATEGORY')}
            </View>
          </View>

          {/* Citizen Side (Blue) */}
          <View style={styles.gridColumn}>
            <View style={[styles.columnHeader, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="person" size={18} color="#3B82F6" />
              <Text style={[styles.columnTitle, { color: '#3B82F6' }]}>Müşteri Dağılımı</Text>
            </View>
            <View style={styles.columnContent}>
              <Text style={styles.subLabel}>İlçe Dağılımı</Text>
              {data && renderDistributionList(data.districtDistribution, showAllDistricts, setShowAllDistricts, '#3B82F6', 'DISTRICT')}
            </View>
          </View>
        </View>

        {/* Demand vs Master Heatmap */}
        <View style={styles.heatmapSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="map" size={20} color="#1E1B4B" />
            <Text style={styles.sectionTitle}>Talep & Arz Dengesi (İlçe Bazlı)</Text>
          </View>
          
          <View style={styles.heatmapCard}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 2 }]}>İlçe</Text>
              <Text style={styles.tableHeaderText}>İlan</Text>
              <Text style={styles.tableHeaderText}>Usta</Text>
              <Text style={styles.tableHeaderText}>Durum</Text>
            </View>
            
            {data?.heatmap.map((item, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.tableRow}
                onPress={() => navigateToUsers({ initialCity: selectedCity !== 'ALL' ? selectedCity : undefined, initialDistrict: item.district })}
              >
                <Text style={[styles.tableCell, { flex: 2, fontFamily: fonts.bold }]}>{item.district}</Text>
                <Text style={styles.tableCell}>{item.jobCount}</Text>
                <Text style={styles.tableCell}>{item.masterCount}</Text>
                <View style={styles.statusCell}>
                  <View 
                    style={[
                      styles.statusDot, 
                      { backgroundColor: item.status === 'GREEN' ? '#10B981' : item.status === 'RED' ? '#EF4444' : '#F59E0B' }
                    ]} 
                  />
                  <Text style={[
                    styles.statusText, 
                    { color: item.status === 'GREEN' ? '#10B981' : item.status === 'RED' ? '#EF4444' : '#F59E0B' }
                  ]}>
                    {item.status === 'GREEN' ? 'Dengeli' : item.status === 'RED' ? 'Eksik' : 'Kritik'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.footerSpace} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: 20
  },
  modalContent: {
    width: '100%',
    maxHeight: '70%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: '#1E1B4B',
  },
  cityList: {
    padding: 10,
  },
  cityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 4,
  },
  selectedCityItem: {
    backgroundColor: '#F5F3FF',
  },
  cityItemText: {
    fontFamily: fonts.medium,
    fontSize: 16,
    color: '#64748B',
  },
  selectedCityText: {
    color: '#7C3AED',
    fontFamily: fonts.bold,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontFamily: fonts.medium,
    color: '#64748B',
  },
  content: {
    padding: spacing.md,
  },
  filterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  filterLabel: {
    fontFamily: fonts.bold,
    color: '#1E1B4B',
    marginRight: 8,
  },
  cityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#C4B5FD',
  },
  cityName: {
    fontFamily: fonts.extraBold,
    color: '#7C3AED',
    marginRight: 4,
  },
  kpiContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 8,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  kpiValue: {
    fontFamily: fonts.extraBold,
    fontSize: 20,
    color: '#1E1B4B',
  },
  kpiLabel: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: '#1E1B4B',
  },
  liveIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  liveContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  liveCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    gap: 12,
    elevation: 2,
  },
  liveValue: {
    fontFamily: fonts.extraBold,
    fontSize: 18,
    color: '#1E1B4B',
  },
  liveLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: '#64748B',
  },
  mainGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  gridColumn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  columnTitle: {
    fontFamily: fonts.extraBold,
    fontSize: 14,
  },
  columnContent: {
    padding: 12,
  },
  subLabel: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  listContainer: {
    gap: 16,
  },
  listItem: {
    marginBottom: 4,
  },
  listTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemName: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: '#1E1B4B',
    flex: 1,
  },
  itemCount: {
    fontFamily: fonts.extraBold,
    fontSize: 12,
    color: '#1E1B4B',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    width: '100%',
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
  },
  showMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  showMoreText: {
    fontFamily: fonts.bold,
    fontSize: 12,
  },
  heatmapSection: {
    marginTop: 8,
  },
  heatmapCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 8,
  },
  tableHeaderText: {
    flex: 1,
    fontFamily: fonts.bold,
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  tableCell: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 13,
    color: '#1E1B4B',
    textAlign: 'center',
  },
  statusCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontFamily: fonts.bold,
    fontSize: 11,
  },
  footerSpace: {
    height: 40,
  },
});
