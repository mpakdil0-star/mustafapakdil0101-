import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal,
  TextInput, Alert, ActivityIndicator, Platform, KeyboardAvoidingView,
} from 'react-native';
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
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [entryType, setEntryType] = useState<'receivable' | 'payable'>('receivable');
  const [entryNote, setEntryNote] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    const [entriesData, summaryData] = await Promise.all([
      ledgerService.getEntries(),
      ledgerService.getSummary(),
    ]);
    setEntries(entriesData);
    setSummary(summaryData);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const filteredEntries = entries.filter(e => e.type === activeTab);

  const openAddModal = () => {
    setPersonName(''); setAmount(''); setEntryType(activeTab); setEntryNote('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!personName.trim()) { Alert.alert('Uyarı', 'Kişi adı giriniz.'); return; }
    if (!amount.trim() || isNaN(Number(amount))) { Alert.alert('Uyarı', 'Geçerli bir tutar giriniz.'); return; }

    setSaving(true);
    try {
      await ledgerService.createEntry({
        personName: personName.trim(),
        amount: Number(amount),
        type: entryType,
        note: entryNote.trim() || undefined,
      });
      setShowModal(false);
      loadData();
    } catch { Alert.alert('Hata', 'Kayıt eklenemedi.'); }
    finally { setSaving(false); }
  };

  const handleTogglePaid = async (entry: LedgerEntry) => {
    try {
      await ledgerService.togglePaid(entry.id);
      loadData();
    } catch { Alert.alert('Hata', 'Güncellenemedi.'); }
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

  const formatCurrency = (n: number) => '₺' + n.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <View style={styles.container}>
      <PremiumHeader title="Hesap Defteri" showBackButton />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <LinearGradient colors={(colors as any).gradientPrimary || [colors.primary, colors.primaryDark]} style={styles.summaryCard}>
            <Ionicons name="arrow-down-circle" size={24} color="rgba(255,255,255,0.8)" />
            <Text style={styles.summaryLabel}>Toplam Alacak</Text>
            <Text style={styles.summaryValue}>{formatCurrency(summary.pendingReceivables)}</Text>
          </LinearGradient>
          <LinearGradient colors={(colors as any).gradientDark || ['#1E3A8A', '#0F172A']} style={styles.summaryCard}>
            <Ionicons name="arrow-up-circle" size={24} color="rgba(255,255,255,0.8)" />
            <Text style={styles.summaryLabel}>Toplam Borç</Text>
            <Text style={styles.summaryValue}>{formatCurrency(summary.pendingPayables)}</Text>
          </LinearGradient>
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'receivable' && { borderColor: colors.primary, backgroundColor: colors.primary + '10' }]}
            onPress={() => setActiveTab('receivable')}
          >
            <Ionicons name="arrow-down-circle" size={18} color={activeTab === 'receivable' ? colors.primary : staticColors.textLight} />
            <Text style={[styles.tabText, activeTab === 'receivable' && styles.tabTextActive]}>Alacaklarım</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'payable' && { borderColor: colors.primaryDark, backgroundColor: colors.primaryDark + '10' }]}
            onPress={() => setActiveTab('payable')}
          >
            <Ionicons name="arrow-up-circle" size={18} color={activeTab === 'payable' ? colors.primaryDark : staticColors.textLight} />
            <Text style={[styles.tabText, activeTab === 'payable' && styles.tabTextActive]}>Ödemelerim</Text>
          </TouchableOpacity>
        </View>

        {/* Entries List */}
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : filteredEntries.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="wallet-outline" size={40} color={staticColors.textLight} />
            <Text style={styles.emptyText}>{activeTab === 'receivable' ? 'Alacak kaydı yok' : 'Borç kaydı yok'}</Text>
            <Text style={styles.emptySubtext}>Aşağıdaki + butonuna dokunarak ekle</Text>
          </Card>
        ) : (
          filteredEntries.map(entry => (
            <Card key={entry.id} style={styles.entryCard}>
              <View style={styles.entryHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.entryName, { color: colors.text }]}>{entry.personName}</Text>
                  <Text style={styles.entryDate}>
                    {new Date(entry.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.entryAmount, { color: entry.type === 'receivable' ? '#D97706' : '#EF4444' }]}>
                    {entry.type === 'receivable' ? '+' : '-'}{formatCurrency(Number(entry.amount))}
                  </Text>
                  <TouchableOpacity onPress={() => handleTogglePaid(entry)} style={[styles.statusBadge, entry.status === 'paid' ? styles.statusPaid : styles.statusPending]}>
                    <Text style={[styles.statusText, { color: entry.status === 'paid' ? '#10B981' : '#F59E0B' }]}>
                      {entry.status === 'paid' ? 'Ödendi ✓' : 'Bekliyor'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              {entry.note && <Text style={styles.entryNote}>{entry.note}</Text>}
              <TouchableOpacity onPress={() => handleDelete(entry)} style={styles.deleteRow}>
                <Ionicons name="trash-outline" size={16} color="#EF4444" />
                <Text style={styles.deleteText}>Sil</Text>
              </TouchableOpacity>
            </Card>
          ))
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openAddModal} activeOpacity={0.85}>
        <LinearGradient colors={activeTab === 'receivable' ? ((colors as any).gradientPrimary || [colors.primary, colors.primaryDark]) : ((colors as any).gradientDark || ['#1E3A8A', '#0F172A'])} style={styles.fabGrad}>
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
              <Text style={styles.modalTitle}>Yeni Kayıt</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}><Ionicons name="close" size={24} color={staticColors.textSecondary} /></TouchableOpacity>
            </View>

            {/* Type Selector */}
            <View style={styles.typeRow}>
              <TouchableOpacity style={[styles.typeBtn, entryType === 'receivable' && { borderColor: colors.primary, backgroundColor: colors.primary + '10' }]} onPress={() => setEntryType('receivable')}>
                <Ionicons name="arrow-down-circle" size={20} color={entryType === 'receivable' ? colors.primary : staticColors.textLight} />
                <Text style={[styles.typeText, entryType === 'receivable' && { color: colors.primary, fontFamily: fonts.bold }]}>Alacak</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.typeBtn, entryType === 'payable' && { borderColor: colors.primaryDark, backgroundColor: colors.primaryDark + '10' }]} onPress={() => setEntryType('payable')}>
                <Ionicons name="arrow-up-circle" size={20} color={entryType === 'payable' ? colors.primaryDark : staticColors.textLight} />
                <Text style={[styles.typeText, entryType === 'payable' && { color: colors.primaryDark, fontFamily: fonts.bold }]}>Borç</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Kişi Adı *</Text>
            <TextInput style={styles.input} value={personName} onChangeText={setPersonName} placeholder="Müşteri veya tedarikçi adı" placeholderTextColor={staticColors.textLight} />

            <Text style={styles.label}>Tutar *</Text>
            <TextInput style={styles.input} value={amount} onChangeText={setAmount} placeholder="₺" placeholderTextColor={staticColors.textLight} keyboardType="decimal-pad" />

            <Text style={styles.label}>Not (İsteğe Bağlı)</Text>
            <TextInput style={[styles.input, { height: 70, textAlignVertical: 'top' }]} value={entryNote} onChangeText={setEntryNote} placeholder="Açıklama..." placeholderTextColor={staticColors.textLight} multiline />

            <TouchableOpacity onPress={handleSave} disabled={saving} activeOpacity={0.85}>
              <LinearGradient colors={entryType === 'receivable' ? ((colors as any).gradientPrimary || [colors.primary, colors.primaryDark]) : ((colors as any).gradientDark || ['#1E3A8A', '#0F172A'])} style={styles.saveBtn}>
                {saving ? <ActivityIndicator color="#FFF" /> : (
                  <><Ionicons name="checkmark" size={20} color="#FFF" /><Text style={styles.saveBtnText}>Kaydet</Text></>
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
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: spacing.md, paddingBottom: 100 },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: spacing.md },
  summaryCard: { flex: 1, borderRadius: 16, padding: 16, gap: 4 },
  summaryLabel: { fontFamily: fonts.medium, fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  summaryValue: { fontFamily: fonts.extraBold, fontSize: 22, color: '#FFF' },
  tabRow: { flexDirection: 'row', gap: 10, marginBottom: spacing.md },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, backgroundColor: '#FFF', borderWidth: 1.5, borderColor: '#E2E8F0' },
  tabActive: { borderColor: '#8B5CF6', backgroundColor: '#FAF5FF' },
  tabText: { fontFamily: fonts.medium, fontSize: 14, color: staticColors.textSecondary },
  tabTextActive: { fontFamily: fonts.bold, color: staticColors.text },
  emptyCard: { padding: 40, alignItems: 'center' },
  emptyText: { fontFamily: fonts.medium, fontSize: 15, color: staticColors.textSecondary, marginTop: 12 },
  emptySubtext: { fontFamily: fonts.regular, fontSize: 12, color: staticColors.textLight, marginTop: 4 },
  entryCard: { padding: spacing.md, marginBottom: 10 },
  entryHeader: { flexDirection: 'row', alignItems: 'center' },
  entryName: { fontFamily: fonts.bold, fontSize: 15 },
  entryDate: { fontFamily: fonts.regular, fontSize: 12, color: staticColors.textSecondary, marginTop: 2 },
  entryAmount: { fontFamily: fonts.extraBold, fontSize: 17 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, marginTop: 4 },
  statusPaid: { backgroundColor: '#D1FAE5' },
  statusPending: { backgroundColor: '#FEF3C7' },
  statusText: { fontFamily: fonts.semiBold, fontSize: 11 },
  entryNote: { fontFamily: fonts.regular, fontSize: 13, color: staticColors.textSecondary, marginTop: 8 },
  deleteRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  deleteText: { fontFamily: fonts.medium, fontSize: 13, color: '#EF4444' },
  fab: { position: 'absolute', bottom: 30, right: 20, borderRadius: 28, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  fabGrad: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'android' ? 32 : 34, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontFamily: fonts.bold, fontSize: 20, color: staticColors.text },
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#E2E8F0' },
  typeBtnActiveR: { borderColor: '#F59E0B', backgroundColor: '#FFFBEB' },
  typeBtnActiveP: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  typeText: { fontFamily: fonts.medium, fontSize: 14, color: staticColors.textSecondary },
  label: { fontFamily: fonts.semiBold, fontSize: 13, color: staticColors.textSecondary, marginBottom: 6, marginTop: 12 },
  input: { height: 50, borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 16, fontFamily: fonts.medium, fontSize: 15, backgroundColor: '#F8FAFC' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: 16, marginTop: 20 },
  saveBtnText: { fontFamily: fonts.bold, fontSize: 16, color: '#FFF' },
});
