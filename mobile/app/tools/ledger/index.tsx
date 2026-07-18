import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
  TextInput, Alert, ActivityIndicator, Platform, Switch, KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { PremiumHeader } from '../../../components/common/PremiumHeader';
import { Card } from '../../../components/common/Card';
import { colors as staticColors } from '../../../constants/colors';
import { spacing } from '../../../constants/spacing';
import { fonts } from '../../../constants/typography';
import { useAppColors } from '../../../hooks/useAppColors';
import { ledgerService, LedgerEntry, LedgerSummary } from '../../../services/ledgerService';

export default function LedgerScreen() {
  const colors = useAppColors();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [summary, setSummary] = useState<LedgerSummary>({ pendingReceivables: 0, pendingPayables: 0, totalReceived: 0, totalPaid: 0, netBalance: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'receivable' | 'payable'>('receivable');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingEntry, setEditingEntry] = useState<LedgerEntry | null>(null);

  // Form
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [entryType, setEntryType] = useState<'receivable' | 'payable'>('receivable');
  const [entryNote, setEntryNote] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [hasReminder, setHasReminder] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTime, setSelectedTime] = useState<Date>(new Date());
  
  // Date picker states
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const onTimePickerChange = (event: any, date?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (event.type === 'dismissed') return;
    
    if (date) {
      setSelectedTime(date);
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const newTimeStr = `${hours}:${minutes}`;
      
      if (newTimeStr !== eventTime) {
        setEventTime(newTimeStr);
        if (!hasReminder) {
          Alert.alert(
            'Hatırlatıcı',
            `Saat ${newTimeStr} için hatırlatıcı kurmak ister misiniz?`,
            [
              { text: 'Hayır', style: 'cancel' },
              { text: 'Evet, Kur', onPress: () => setHasReminder(true) }
            ]
          );
        }
      }
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [entriesData, summaryData] = await Promise.all([
        ledgerService.getEntries(),
        ledgerService.getSummary(),
      ]);
      setEntries(entriesData);
      setSummary(summaryData);
    } catch {
      Alert.alert('Bağlantı Hatası', 'Hesap defteri kayıtları alınamadı. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const filteredEntries = entries.filter(entry => (
    entry.type === activeTab && (statusFilter === 'all' || entry.status === statusFilter)
  ));

  const openAddModal = () => {
    setEditingEntry(null);
    setPersonName(''); setAmount(''); setEntryType(activeTab); setEntryNote('');
    setEventTime(''); setHasReminder(false);
    setSelectedDate(new Date());
    setShowModal(true);
  };

  const openEditModal = (entry: LedgerEntry) => {
    setEditingEntry(entry);
    setPersonName(entry.personName);
    setAmount(String(entry.amount));
    setEntryType(entry.type);
    setEntryNote(entry.note || '');
    const date = entry.dueDate ? new Date(entry.dueDate) : new Date();
    setSelectedDate(date);
    setEventTime(entry.eventTime || '');
    setHasReminder(Boolean(entry.hasReminder));
    if (entry.eventTime) {
      const [hours, minutes] = entry.eventTime.split(':').map(Number);
      const time = new Date();
      time.setHours(hours, minutes, 0, 0);
      setSelectedTime(time);
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!personName.trim()) { Alert.alert('Uyarı', 'Kişi adı giriniz.'); return; }
    const parsedAmount = Number(amount.replace(',', '.'));
    if (!amount.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Uyarı', 'Sıfırdan büyük geçerli bir tutar giriniz.');
      return;
    }
    if (hasReminder && !eventTime) { Alert.alert('Uyarı', 'Hatırlatıcı için saat seçiniz.'); return; }

    setSaving(true);
    try {
      let reminderAt: string | undefined;
      if (hasReminder && eventTime) {
        const [h, m] = eventTime.split(':').map(Number);
        const rd = new Date(selectedDate);
        rd.setHours(h, m, 0, 0);
        if (rd.getTime() <= Date.now()) {
          Alert.alert('Geçmiş Tarih', 'Hatırlatıcı tarihi ve saati gelecekte olmalıdır.');
          setSaving(false);
          return;
        }
        reminderAt = rd.toISOString();
      }

      const values = {
        personName: personName.trim(),
        amount: parsedAmount,
        type: entryType,
        note: entryNote.trim() || undefined,
        eventTime: eventTime || undefined,
        dueDate: selectedDate.toISOString(),
        hasReminder,
        reminderAt: reminderAt ?? null,
      };

      if (editingEntry) await ledgerService.updateEntry(editingEntry.id, values);
      else await ledgerService.createEntry(values);

      setShowModal(false);
      await loadData();
    } catch { Alert.alert('Hata', editingEntry ? 'Kayıt güncellenemedi.' : 'Kayıt eklenemedi.'); }
    finally { setSaving(false); }
  };

  const handleTogglePaid = async (entry: LedgerEntry) => {
    const nextLabel = entry.status === 'paid' ? 'bekliyor' : 'ödendi';
    Alert.alert(
      'Durumu Güncelle',
      `Bu kayıt “${nextLabel}” olarak işaretlensin mi?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Güncelle', onPress: async () => {
          try {
            await ledgerService.togglePaid(entry.id);
            await loadData();
          } catch { Alert.alert('Hata', 'Kayıt güncellenemedi.'); }
        } },
      ],
    );
  };

  const handleDelete = (entry: LedgerEntry) => {
    Alert.alert('Sil', `"${entry.personName}" kaydı silinsin mi?`, [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => {
        try { await ledgerService.deleteEntry(entry.id); loadData(); }
        catch { Alert.alert('Hata', 'Silinemedi.'); }
      }},
    ]);
  };

  const formatCurrency = (n: number) => '₺' + n.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PremiumHeader title="Hesap Defteri" showBackButton />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <LinearGradient colors={['#10B981', '#059669']} style={[styles.summaryCard, { shadowColor: '#10B981' }]}>
            <View style={styles.summaryCardHeader}>
              <Ionicons name="arrow-down-circle-outline" size={20} color="rgba(255,255,255,0.85)" />
              <Text style={styles.summaryLabel}>Bekleyen Alacak</Text>
            </View>
            <Text style={styles.summaryValue}>{formatCurrency(summary.pendingReceivables)}</Text>
          </LinearGradient>
          
          <LinearGradient colors={['#EF4444', '#B91C1C']} style={[styles.summaryCard, { shadowColor: '#EF4444' }]}>
            <View style={styles.summaryCardHeader}>
              <Ionicons name="arrow-up-circle-outline" size={20} color="rgba(255,255,255,0.85)" />
              <Text style={styles.summaryLabel}>Bekleyen Borç</Text>
            </View>
            <Text style={styles.summaryValue}>{formatCurrency(summary.pendingPayables)}</Text>
          </LinearGradient>
        </View>

        <Card style={styles.balanceCard} variant="outlined">
          <View style={styles.balanceItem}>
            <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Bekleyen Net</Text>
            <Text style={[styles.balanceValue, { color: summary.netBalance >= 0 ? '#059669' : '#DC2626' }]}>{formatCurrency(summary.netBalance)}</Text>
          </View>
          <View style={[styles.balanceDivider, { backgroundColor: colors.border }]} />
          <View style={styles.balanceItem}>
            <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Tahsil Edilen</Text>
            <Text style={[styles.balanceValue, { color: '#059669' }]}>{formatCurrency(summary.totalReceived)}</Text>
          </View>
          <View style={[styles.balanceDivider, { backgroundColor: colors.border }]} />
          <View style={styles.balanceItem}>
            <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Ödenen</Text>
            <Text style={[styles.balanceValue, { color: '#DC2626' }]}>{formatCurrency(summary.totalPaid)}</Text>
          </View>
        </Card>

        {/* Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.tab, 
              activeTab === 'receivable' 
                ? { borderColor: colors.primary, backgroundColor: colors.primary + '10' } 
                : { borderColor: colors.border, backgroundColor: colors.surface }
            ]}
            onPress={() => setActiveTab('receivable')}
          >
            <Ionicons name="arrow-down-circle" size={18} color={activeTab === 'receivable' ? colors.primary : staticColors.textLight} />
            <Text style={[styles.tabText, activeTab === 'receivable' && [styles.tabTextActive, { color: colors.primary }]]}>Alacaklarım</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[
              styles.tab, 
              activeTab === 'payable' 
                ? { borderColor: colors.primaryDark, backgroundColor: colors.primaryDark + '10' } 
                : { borderColor: colors.border, backgroundColor: colors.surface }
            ]}
            onPress={() => setActiveTab('payable')}
          >
            <Ionicons name="arrow-up-circle" size={18} color={activeTab === 'payable' ? colors.primaryDark : staticColors.textLight} />
            <Text style={[styles.tabText, activeTab === 'payable' && [styles.tabTextActive, { color: colors.primaryDark }]]}>Ödemelerim</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.filterRow}>
          {(['all', 'pending', 'paid'] as const).map(filterValue => (
            <TouchableOpacity
              key={filterValue}
              onPress={() => setStatusFilter(filterValue)}
              style={[
                styles.filterChip,
                { borderColor: statusFilter === filterValue ? colors.primary : colors.border },
                statusFilter === filterValue && { backgroundColor: colors.primary + '12' },
              ]}
            >
              <Text style={[styles.filterChipText, { color: statusFilter === filterValue ? colors.primary : colors.textSecondary }]}>
                {filterValue === 'all' ? 'Tümü' : filterValue === 'pending' ? 'Bekleyen' : 'Ödendi'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Entries List */}
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : filteredEntries.length === 0 ? (
          <Card style={styles.emptyCard} variant="outlined">
            <View style={[styles.emptyIconContainer, { backgroundColor: colors.primary + '08' }]}>
              <Ionicons name="wallet-outline" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.emptyText, { color: colors.text }]}>{activeTab === 'receivable' ? 'Alacak kaydı bulunmuyor' : 'Borç kaydı bulunmuyor'}</Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Sağ alttaki + butonuna dokunarak yeni bir finansal kayıt ekleyebilirsiniz</Text>
          </Card>
        ) : (
          filteredEntries.map(entry => {
            const initial = entry.personName.trim().charAt(0).toUpperCase() || '?';
            const isReceivable = entry.type === 'receivable';
            const isPaid = entry.status === 'paid';
            
            return (
              <Card key={entry.id} style={styles.entryCard} variant="default" elevated>
                <View style={styles.entryHeader}>
                  {/* Left Initial Avatar Badge */}
                  <View style={[styles.avatarBadge, { backgroundColor: isReceivable ? '#10B98115' : '#EF444415' }]}>
                    <Text style={[styles.avatarBadgeText, { color: isReceivable ? '#059669' : '#B91C1C' }]}>{initial}</Text>
                  </View>
                  
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.entryName, { color: colors.text }]}>{entry.personName}</Text>
                    <Text style={[styles.entryDate, { color: colors.textSecondary }]}>
                      {new Date(entry.dueDate || entry.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      {entry.eventTime ? ` • ${entry.eventTime}` : ''}
                    </Text>
                  </View>
                  
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.entryAmount, { color: isReceivable ? '#059669' : '#EF4444' }]}>
                      {isReceivable ? '+' : '-'}{formatCurrency(Number(entry.amount))}
                    </Text>
                    <TouchableOpacity 
                      activeOpacity={0.7}
                      onPress={() => handleTogglePaid(entry)} 
                      style={[styles.statusBadge, isPaid ? styles.statusPaid : styles.statusPending]}
                    >
                      <Text style={[styles.statusText, { color: isPaid ? '#10B981' : '#F59E0B' }]}>
                        {isPaid ? 'Ödendi ✓' : 'Bekliyor'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {entry.note && (
                  <View style={[styles.noteContainer, { backgroundColor: colors.backgroundLight, borderColor: colors.border }]}>
                    <Text style={[styles.entryNote, { color: colors.textSecondary }]}>{entry.note}</Text>
                  </View>
                )}
                <View style={styles.entryActions}>
                  <TouchableOpacity onPress={() => openEditModal(entry)} style={styles.entryActionButton} activeOpacity={0.7}>
                    <Ionicons name="create-outline" size={16} color={colors.primary} />
                    <Text style={[styles.entryActionText, { color: colors.primary }]}>Düzenle</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(entry)} style={styles.entryActionButton} activeOpacity={0.7}>
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    <Text style={[styles.entryActionText, { color: '#EF4444' }]}>Sil</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openAddModal} activeOpacity={0.85}>
        <LinearGradient 
          colors={activeTab === 'receivable' ? colors.gradientPrimary : ['#1E293B', '#0F172A']} 
          style={[styles.fabGrad, { shadowColor: activeTab === 'receivable' ? colors.primary : '#000' }]}
        >
          <Ionicons name="add" size={28} color="#FFF" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Add Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{editingEntry ? 'Kaydı Düzenle' : 'Yeni Kayıt'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              {/* Type Selector */}
              <View style={styles.typeRow}>
                <TouchableOpacity 
                  activeOpacity={0.8}
                  style={[styles.typeBtn, entryType === 'receivable' && { borderColor: '#10B981', backgroundColor: '#10B98110' }]} 
                  onPress={() => setEntryType('receivable')}
                >
                  <Ionicons name="arrow-down-circle" size={20} color={entryType === 'receivable' ? '#10B981' : staticColors.textLight} />
                  <Text style={[styles.typeText, entryType === 'receivable' && { color: '#059669', fontFamily: fonts.bold }]}>Alacak</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  activeOpacity={0.8}
                  style={[styles.typeBtn, entryType === 'payable' && { borderColor: '#EF4444', backgroundColor: '#EF444410' }]} 
                  onPress={() => setEntryType('payable')}
                >
                  <Ionicons name="arrow-up-circle" size={20} color={entryType === 'payable' ? '#EF4444' : staticColors.textLight} />
                  <Text style={[styles.typeText, entryType === 'payable' && { color: '#B91C1C', fontFamily: fonts.bold }]}>Borç</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.label, { color: colors.textSecondary }]}>Kişi Adı *</Text>
              <View style={[styles.modalInputWrapper, { borderColor: colors.primary + '25', backgroundColor: colors.backgroundLight }]}>
                <Ionicons name="person-outline" size={18} color={colors.primary} style={styles.modalInputIcon} />
                <TextInput 
                  style={[styles.modalInput, { color: colors.text }]} 
                  value={personName} 
                  onChangeText={setPersonName} 
                  placeholder="Müşteri veya tedarikçi adı" 
                  placeholderTextColor={staticColors.textLight} 
                />
              </View>

              <Text style={[styles.label, { color: colors.textSecondary }]}>Tutar *</Text>
              <View style={[styles.modalInputWrapper, { borderColor: colors.primary + '25', backgroundColor: colors.backgroundLight }]}>
                <Ionicons name="cash-outline" size={18} color={colors.primary} style={styles.modalInputIcon} />
                <TextInput 
                  style={[styles.modalInput, { color: colors.text }]} 
                  value={amount} 
                  onChangeText={setAmount} 
                  placeholder="İşlem tutarı ₺" 
                  placeholderTextColor={staticColors.textLight} 
                  keyboardType="decimal-pad" 
                />
              </View>

              <Text style={[styles.label, { color: colors.textSecondary }]}>Not (İsteğe Bağlı)</Text>
              <View style={[styles.modalInputWrapper, { borderColor: colors.primary + '25', height: 74, alignItems: 'flex-start', paddingTop: 12, backgroundColor: colors.backgroundLight }]}>
                <Ionicons name="document-text-outline" size={18} color={colors.primary} style={[styles.modalInputIcon, { marginTop: 2 }]} />
                <TextInput 
                  style={[styles.modalInput, { color: colors.text, height: '100%', textAlignVertical: 'top' }]} 
                  value={entryNote} 
                  onChangeText={setEntryNote} 
                  placeholder="Açıklama veya detay yazın..." 
                  placeholderTextColor={staticColors.textLight} 
                  multiline 
                />
              </View>

              <Text style={[styles.label, { color: colors.textSecondary }]}>Tarih *</Text>
              <TouchableOpacity
                style={[styles.modalInputWrapper, styles.timePickerButton, { borderColor: colors.primary + '25', backgroundColor: colors.backgroundLight }]}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="calendar-outline" size={20} color={colors.primary} style={styles.modalInputIcon} />
                <Text style={[styles.timePickerText, { color: colors.text }]}>
                  {selectedDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </Text>
                <Ionicons name="chevron-down" size={16} color={staticColors.textLight} />
              </TouchableOpacity>

              {showDatePicker && (
                <View style={[styles.timePickerContainer, { marginBottom: 12 }]}>
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display="spinner"
                    onChange={(event: any, date?: Date) => {
                      setShowDatePicker(Platform.OS === 'ios');
                      if (date) {
                        setSelectedDate(date);
                      }
                    }}
                    locale="tr-TR"
                  />
                  {Platform.OS === 'ios' && (
                    <TouchableOpacity onPress={() => setShowDatePicker(false)} style={styles.timePickerDoneBtn}>
                      <Text style={styles.timePickerDoneText}>Tamam</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <Text style={[styles.label, { color: colors.textSecondary, marginTop: 12 }]}>Saat (İsteğe Bağlı)</Text>
              <TouchableOpacity
                style={[styles.modalInputWrapper, styles.timePickerButton, { borderColor: colors.primary + '25', backgroundColor: colors.backgroundLight }]}
                onPress={() => setShowTimePicker(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="time-outline" size={20} color={eventTime ? colors.primary : staticColors.textLight} style={styles.modalInputIcon} />
                <Text style={[styles.timePickerText, eventTime ? { color: colors.text } : { color: staticColors.textLight }]}>
                  {eventTime || 'Saat seçmek için dokun'}
                </Text>
                {eventTime ? (
                  <TouchableOpacity onPress={() => { setEventTime(''); setHasReminder(false); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="close-circle" size={18} color={staticColors.textLight} />
                  </TouchableOpacity>
                ) : (
                  <Ionicons name="chevron-down" size={16} color={staticColors.textLight} />
                )}
              </TouchableOpacity>

              {showTimePicker && (
                <View style={styles.timePickerContainer}>
                  <DateTimePicker
                    value={selectedTime}
                    mode="time"
                    is24Hour={true}
                    display="spinner"
                    onChange={onTimePickerChange}
                    locale="tr-TR"
                  />
                  {Platform.OS === 'ios' && (
                    <TouchableOpacity onPress={() => setShowTimePicker(false)} style={styles.timePickerDoneBtn}>
                      <Text style={styles.timePickerDoneText}>Tamam</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {eventTime.length > 0 && (
                <View style={styles.switchRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.switchLabel, { color: colors.text }]}>Hatırlatıcı Kur</Text>
                    <Text style={[styles.switchDesc, { color: colors.textSecondary }]}>Belirlenen saatte bildirim gönder</Text>
                  </View>
                  <Switch 
                    value={hasReminder} 
                    onValueChange={setHasReminder} 
                    trackColor={{ true: colors.primary }} 
                    thumbColor={hasReminder ? '#FFF' : '#F1F5F9'} 
                  />
                </View>
              )}
            </ScrollView>

            <TouchableOpacity onPress={handleSave} disabled={saving} activeOpacity={0.85}>
              <LinearGradient 
                colors={entryType === 'receivable' ? colors.gradientPrimary : ['#1E293B', '#0F172A']} 
                style={styles.saveBtn}
              >
                {saving ? <ActivityIndicator color="#FFF" /> : (
                  <>
                    <Ionicons name="checkmark" size={20} color="#FFF" />
                    <Text style={styles.saveBtnText}>{editingEntry ? 'Güncelle' : 'Kaydet'}</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: 120 },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: spacing.md },
  summaryCard: { 
    flex: 1, 
    borderRadius: 20, 
    padding: 16, 
    gap: 6,
    elevation: 4,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  summaryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryLabel: { fontFamily: fonts.bold, fontSize: 11, color: 'rgba(255,255,255,0.85)' },
  summaryValue: { fontFamily: fonts.extraBold, fontSize: 20, color: '#FFF' },
  balanceCard: { flexDirection: 'row', padding: 14, marginBottom: spacing.md, alignItems: 'center' },
  balanceItem: { flex: 1, alignItems: 'center', gap: 4 },
  balanceLabel: { fontFamily: fonts.medium, fontSize: 10, textAlign: 'center' },
  balanceValue: { fontFamily: fonts.extraBold, fontSize: 13 },
  balanceDivider: { width: 1, height: 32 },
  tabRow: { flexDirection: 'row', gap: 10, marginBottom: spacing.md },
  tab: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 6, 
    paddingVertical: 12, 
    borderRadius: 14, 
    borderWidth: 1.5,
  },
  tabText: { fontFamily: fonts.bold, fontSize: 13, color: staticColors.textSecondary },
  tabTextActive: { fontFamily: fonts.bold },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: spacing.md },
  filterChip: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 8, alignItems: 'center' },
  filterChipText: { fontFamily: fonts.bold, fontSize: 11 },
  emptyCard: { padding: 40, alignItems: 'center', backgroundColor: 'transparent' },
  emptyIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyText: { fontFamily: fonts.bold, fontSize: 14, marginTop: 4 },
  emptySubtext: { fontFamily: fonts.medium, fontSize: 11, textAlign: 'center', opacity: 0.8, marginTop: 6, lineHeight: 16 },
  entryCard: { padding: spacing.md, marginBottom: 10 },
  entryHeader: { flexDirection: 'row', alignItems: 'center' },
  avatarBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarBadgeText: {
    fontFamily: fonts.bold,
    fontSize: 16,
  },
  entryName: { fontFamily: fonts.bold, fontSize: 15 },
  entryDate: { fontFamily: fonts.medium, fontSize: 12, marginTop: 2 },
  entryAmount: { fontFamily: fonts.extraBold, fontSize: 16 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, marginTop: 4 },
  statusPaid: { backgroundColor: '#D1FAE5' },
  statusPending: { backgroundColor: '#FEF3C7' },
  statusText: { fontFamily: fonts.bold, fontSize: 10 },
  noteContainer: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: spacing.md,
  },
  entryNote: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 18 },
  entryActions: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'flex-end',
    gap: 16,
    marginTop: 12, 
    paddingTop: 10, 
    borderTopWidth: 1.5, 
    borderTopColor: '#F1F5F9' 
  },
  entryActionButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2 },
  entryActionText: { fontFamily: fonts.bold, fontSize: 12 },
  fab: { 
    position: 'absolute', 
    bottom: 90, 
    right: 20, 
    borderRadius: 28, 
    elevation: 8, 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 8 
  },
  fabGrad: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'android' ? 60 : 40, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontFamily: fonts.bold, fontSize: 18, letterSpacing: -0.5 },
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 14, borderWidth: 1.5, borderColor: '#E2E8F0' },
  typeText: { fontFamily: fonts.bold, fontSize: 13, color: staticColors.textSecondary },
  label: { fontFamily: fonts.semiBold, fontSize: 12, marginBottom: 6, marginTop: 12 },
  modalInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingLeft: 12,
    height: 48,
  },
  modalInputIcon: {
    marginRight: 8,
  },
  modalInput: {
    flex: 1,
    height: '100%',
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  timePickerButton: { flexDirection: 'row', alignItems: 'center' },
  timePickerText: { flex: 1, fontFamily: fonts.medium, fontSize: 14 },
  timePickerContainer: { backgroundColor: '#F1F5F9', borderRadius: 14, marginTop: 8, padding: 8, alignItems: 'center', width: '100%' },
  timePickerDoneBtn: { paddingVertical: 8, paddingHorizontal: 24, backgroundColor: '#8B5CF6', borderRadius: 10, marginTop: 4 },
  timePickerDoneText: { fontFamily: fonts.bold, fontSize: 14, color: '#FFF' },
  switchRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingVertical: 8 },
  switchLabel: { fontFamily: fonts.semiBold, fontSize: 13 },
  switchDesc: { fontFamily: fonts.medium, fontSize: 11, marginTop: 2, opacity: 0.8 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, borderRadius: 16, marginTop: 20 },
  saveBtnText: { fontFamily: fonts.bold, fontSize: 15, color: '#FFF' },
});
