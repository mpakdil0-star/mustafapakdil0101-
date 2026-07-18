import React, { useMemo, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { PremiumHeader } from '../../../components/common/PremiumHeader';
import { Card } from '../../../components/common/Card';
import { colors as staticColors } from '../../../constants/colors';
import { spacing } from '../../../constants/spacing';
import { fonts } from '../../../constants/typography';
import { useAppColors } from '../../../hooks/useAppColors';
import { useAppSelector } from '../../../hooks/redux';

interface QuoteItem {
    id: string;
    name: string;
    quantity: string;
    price: string;
    type: 'material' | 'labor';
}

const parseNumber = (value: string) => {
    const normalized = value.trim().replace(/\s/g, '').replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
};

const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
}[character] ?? character));

const createQuoteNumber = () => {
    const now = new Date();
    const date = [now.getFullYear(), now.getMonth() + 1, now.getDate()]
        .map((part, index) => index === 0 ? String(part) : String(part).padStart(2, '0'))
        .join('');
    return `IB-${date}-${String(now.getTime()).slice(-5)}`;
};

export default function QuoteScreen() {
    const colors = useAppColors();
    const { user } = useAppSelector((state) => state.auth);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [validityDays, setValidityDays] = useState('7');
    const [quoteNote, setQuoteNote] = useState('');
    const [quoteNumber] = useState(createQuoteNumber);
    const [items, setItems] = useState<QuoteItem[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);

    const addItem = (type: QuoteItem['type']) => {
        setItems(current => [...current, {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: '',
            quantity: '1',
            price: '',
            type,
        }]);
    };

    const updateItem = (id: string, field: keyof QuoteItem, value: string) => {
        setItems(current => current.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const removeItem = (id: string) => setItems(current => current.filter(item => item.id !== id));

    const calculateTotal = (type?: QuoteItem['type']) => items
        .filter(item => !type || item.type === type)
        .reduce((sum, item) => sum + parseNumber(item.quantity) * parseNumber(item.price), 0);

    const formatCurrency = (amount: number) => new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        minimumFractionDigits: 2,
    }).format(amount);

    const materialItems = useMemo(() => items.filter(item => item.type === 'material'), [items]);
    const laborItems = useMemo(() => items.filter(item => item.type === 'labor'), [items]);

    const validateQuote = () => {
        if (!customerName.trim()) {
            Alert.alert('Eksik Bilgi', 'Müşteri adını girin.');
            return false;
        }
        if (items.length === 0) {
            Alert.alert('Eksik Bilgi', 'En az bir malzeme veya işçilik kalemi ekleyin.');
            return false;
        }
        const invalidItem = items.find(item => !item.name.trim() || parseNumber(item.quantity) <= 0 || parseNumber(item.price) < 0);
        if (invalidItem) {
            Alert.alert('Kalemleri Kontrol Edin', 'Her satırda açıklama, sıfırdan büyük adet ve geçerli bir fiyat olmalıdır.');
            return false;
        }
        const days = Number(validityDays);
        if (!Number.isInteger(days) || days < 1 || days > 90) {
            Alert.alert('Geçerlilik Süresi', 'Geçerlilik süresi 1 ile 90 gün arasında olmalıdır.');
            return false;
        }
        return true;
    };

    const generatePDFHtml = () => {
        const today = new Date();
        const expiry = new Date(today);
        expiry.setDate(expiry.getDate() + Number(validityDays));
        const dateFormat: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
        const renderItems = (list: QuoteItem[]) => list.map(item => {
            const quantity = parseNumber(item.quantity);
            const price = parseNumber(item.price);
            return `<tr>
                <td>${escapeHtml(item.name.trim())}</td>
                <td class="center">${escapeHtml(item.quantity)}</td>
                <td class="right">${escapeHtml(formatCurrency(price))}</td>
                <td class="right strong">${escapeHtml(formatCurrency(quantity * price))}</td>
            </tr>`;
        }).join('');
        const renderSection = (title: string, list: QuoteItem[], subtotal: number) => list.length ? `
            <section>
                <h2>${escapeHtml(title)}</h2>
                <table>
                    <thead><tr><th>Açıklama</th><th class="center">Adet</th><th class="right">Birim Fiyat</th><th class="right">Toplam</th></tr></thead>
                    <tbody>${renderItems(list)}</tbody>
                </table>
                <div class="subtotal">Ara toplam: ${escapeHtml(formatCurrency(subtotal))}</div>
            </section>` : '';

        return `<!DOCTYPE html>
        <html lang="tr"><head><meta charset="utf-8"><title>${escapeHtml(quoteNumber)} Teklif</title>
        <style>
            @page { margin: 28px; }
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; color: #172033; margin: 0; padding: 12px; font-size: 13px; }
            .top { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 18px; border-bottom: 3px solid #0F9D8A; }
            h1 { margin: 0 0 6px; color: #0F766E; font-size: 30px; letter-spacing: 1px; }
            .meta { text-align: right; line-height: 1.65; color: #475569; }
            .info { display: flex; gap: 14px; margin: 20px 0; }
            .box { flex: 1; padding: 14px; border: 1px solid #DCE6E4; border-radius: 10px; background: #F7FBFA; line-height: 1.55; overflow-wrap: anywhere; }
            .box-title { color: #0F766E; font-weight: 700; font-size: 11px; letter-spacing: .7px; margin-bottom: 7px; }
            section { margin: 20px 0; page-break-inside: avoid; }
            h2 { color: #0F766E; font-size: 15px; margin: 0 0 8px; }
            table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            thead { display: table-header-group; }
            tr { page-break-inside: avoid; }
            th { background: #0F766E; color: white; padding: 9px; text-align: left; font-size: 11px; }
            td { padding: 9px; border-bottom: 1px solid #E2E8F0; overflow-wrap: anywhere; }
            th:first-child, td:first-child { width: 46%; }
            .center { text-align: center; }
            .right { text-align: right; }
            .strong { font-weight: 700; }
            .subtotal { text-align: right; padding: 9px; background: #F1F5F9; font-weight: 700; }
            .total { margin-top: 22px; padding: 17px; border-radius: 10px; background: #0F766E; color: white; text-align: right; font-size: 22px; font-weight: 700; }
            .note { margin-top: 18px; padding: 13px; border-left: 4px solid #D9A441; background: #FFF9E9; line-height: 1.5; white-space: pre-wrap; overflow-wrap: anywhere; }
            .terms { margin-top: 16px; color: #475569; line-height: 1.55; }
            .signatures { display: flex; justify-content: space-between; gap: 60px; margin-top: 58px; page-break-inside: avoid; }
            .signature { flex: 1; text-align: center; border-top: 1px solid #94A3B8; padding-top: 8px; color: #64748B; }
            .footer { margin-top: 28px; padding-top: 10px; border-top: 1px solid #E2E8F0; text-align: center; color: #94A3B8; font-size: 10px; }
        </style></head><body>
            <div class="top"><div><h1>TEKLİF</h1><div>İş Bitir profesyonel hizmet teklifi</div></div>
                <div class="meta"><strong>${escapeHtml(quoteNumber)}</strong><br>Tarih: ${escapeHtml(today.toLocaleDateString('tr-TR', dateFormat))}<br>Geçerlilik: ${escapeHtml(expiry.toLocaleDateString('tr-TR', dateFormat))}</div></div>
            <div class="info">
                <div class="box"><div class="box-title">HİZMET VEREN</div><strong>${escapeHtml(user?.fullName || 'Usta')}</strong><br>${escapeHtml(user?.phone || 'Telefon belirtilmedi')}<br>${escapeHtml(user?.email || '')}</div>
                <div class="box"><div class="box-title">MÜŞTERİ</div><strong>${escapeHtml(customerName.trim())}</strong><br>${escapeHtml(customerPhone.trim() || 'Telefon belirtilmedi')}</div>
            </div>
            ${renderSection('MALZEMELER', materialItems, calculateTotal('material'))}
            ${renderSection('İŞÇİLİK', laborItems, calculateTotal('labor'))}
            <div class="total">GENEL TOPLAM: ${escapeHtml(formatCurrency(calculateTotal()))}</div>
            ${quoteNote.trim() ? `<div class="note"><strong>Teklif Notu</strong><br>${escapeHtml(quoteNote.trim())}</div>` : ''}
            <div class="terms">Bu teklif ${escapeHtml(validityDays)} gün geçerlidir. İş kapsamı veya malzeme miktarı değişirse fiyatlar karşılıklı onayla güncellenebilir.</div>
            <div class="signatures"><div class="signature">Hizmet Veren</div><div class="signature">Müşteri Onayı</div></div>
            <div class="footer">Bu belge İş Bitir uygulamasıyla oluşturulmuştur · ${escapeHtml(quoteNumber)}</div>
        </body></html>`;
    };

    const handlePreviewPDF = async () => {
        if (!validateQuote()) return;
        setIsGenerating(true);
        try {
            await Print.printAsync({ html: generatePDFHtml() });
        } catch (error) {
            console.error('PDF preview error:', error);
            Alert.alert('Hata', 'PDF önizleme sırasında bir hata oluştu.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSharePDF = async () => {
        if (!validateQuote()) return;
        setIsGenerating(true);
        try {
            const { uri } = await Print.printToFileAsync({ html: generatePDFHtml() });
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, {
                    mimeType: 'application/pdf',
                    dialogTitle: `${customerName.trim()} - ${quoteNumber}`,
                    UTI: 'com.adobe.pdf',
                });
            } else {
                Alert.alert('Bilgi', 'PDF paylaşımı bu cihazda desteklenmiyor.');
            }
        } catch (error) {
            console.error('PDF share error:', error);
            Alert.alert('Hata', 'PDF paylaşılırken bir hata oluştu.');
        } finally {
            setIsGenerating(false);
        }
    };

    const renderItem = (item: QuoteItem) => (
        <View key={item.id} style={styles.itemRow}>
            <TextInput style={[styles.itemName, { borderColor: colors.primary + '25', color: colors.text, backgroundColor: colors.backgroundLight }]}
                value={item.name} onChangeText={value => updateItem(item.id, 'name', value)}
                placeholder={item.type === 'material' ? 'Malzeme adı' : 'İş tanımı'} placeholderTextColor={staticColors.textLight} />
            <TextInput style={[styles.itemQty, { borderColor: colors.primary + '25', color: colors.text, backgroundColor: colors.backgroundLight }]}
                value={item.quantity} onChangeText={value => updateItem(item.id, 'quantity', value)} keyboardType="decimal-pad"
                placeholder="Adet" placeholderTextColor={staticColors.textLight} />
            <TextInput style={[styles.itemPrice, { borderColor: colors.primary + '25', color: colors.text, backgroundColor: colors.backgroundLight }]}
                value={item.price} onChangeText={value => updateItem(item.id, 'price', value)} keyboardType="decimal-pad"
                placeholder="₺" placeholderTextColor={staticColors.textLight} />
            <TouchableOpacity onPress={() => removeItem(item.id)} style={[styles.removeBtn, { backgroundColor: colors.error + '10' }]}>
                <Ionicons name="trash-outline" size={18} color={colors.error} />
            </TouchableOpacity>
        </View>
    );

    const renderItemsCard = (type: QuoteItem['type'], title: string, subtitle: string, accent: string, icon: keyof typeof Ionicons.glyphMap) => {
        const list = type === 'material' ? materialItems : laborItems;
        return <Card style={styles.card} variant="default" elevated>
            <View style={styles.cardHeaderWithAvatar}>
                <View style={[styles.avatarContainer, { backgroundColor: accent + '15' }]}><Ionicons name={icon} size={22} color={accent} /></View>
                <View style={styles.cardHeaderTitleContainer}><Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text></View>
            </View>
            {list.length > 0 && <View style={styles.columnLabels}><Text style={styles.nameLabel}>Açıklama</Text><Text style={styles.qtyLabel}>Adet</Text><Text style={styles.priceLabel}>Birim ₺</Text><View style={styles.removeLabel} /></View>}
            <View style={styles.itemsListContainer}>{list.map(renderItem)}</View>
            <TouchableOpacity style={[styles.addBtn, { borderColor: accent, backgroundColor: accent + '08' }]} onPress={() => addItem(type)}>
                <Ionicons name="add" size={20} color={accent} /><Text style={[styles.addBtnText, { color: accent }]}>{title} Satırı Ekle</Text>
            </TouchableOpacity>
            {list.length > 0 && <Text style={[styles.subtotal, { color: colors.text }]}>{title} Toplamı: <Text style={{ color: accent }}>{formatCurrency(calculateTotal(type))}</Text></Text>}
        </Card>;
    };

    return <View style={[styles.container, { backgroundColor: colors.background }]}>
        <PremiumHeader title="Teklif Hazırla" showBackButton />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={[styles.quoteBadge, { backgroundColor: colors.primary + '12' }]}><Ionicons name="document-text-outline" size={18} color={colors.primary} /><Text style={[styles.quoteBadgeText, { color: colors.primary }]}>{quoteNumber}</Text></View>
                <Card style={styles.card} variant="default" elevated>
                    <View style={styles.cardHeaderWithAvatar}><View style={[styles.avatarContainer, { backgroundColor: colors.primary + '15' }]}><Ionicons name="person" size={22} color={colors.primary} /></View><View style={styles.cardHeaderTitleContainer}><Text style={[styles.sectionTitle, { color: colors.text }]}>Müşteri Bilgileri</Text><Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Teklifin gönderileceği kişi</Text></View></View>
                    <View style={[styles.inputWrapper, { borderColor: colors.primary + '25', marginBottom: 12, backgroundColor: colors.backgroundLight }]}><Ionicons name="person-outline" size={18} color={colors.primary} style={styles.inputIcon} /><TextInput style={[styles.input, { color: colors.text }]} value={customerName} onChangeText={setCustomerName} placeholder="Ad Soyad *" placeholderTextColor={staticColors.textLight} /></View>
                    <View style={[styles.inputWrapper, { borderColor: colors.primary + '25', backgroundColor: colors.backgroundLight }]}><Ionicons name="call-outline" size={18} color={colors.primary} style={styles.inputIcon} /><TextInput style={[styles.input, { color: colors.text }]} value={customerPhone} onChangeText={setCustomerPhone} placeholder="Telefon Numarası" keyboardType="phone-pad" placeholderTextColor={staticColors.textLight} /></View>
                </Card>
                {renderItemsCard('material', 'Malzeme', 'Kullanılacak malzemeler', '#D97706', 'cube')}
                {renderItemsCard('labor', 'İşçilik', 'Yapılacak işler ve hizmetler', '#059669', 'hammer')}
                <Card style={styles.card} variant="default" elevated>
                    <View style={styles.cardHeaderWithAvatar}><View style={[styles.avatarContainer, { backgroundColor: '#6366F115' }]}><Ionicons name="options-outline" size={22} color="#6366F1" /></View><View style={styles.cardHeaderTitleContainer}><Text style={[styles.sectionTitle, { color: colors.text }]}>Teklif Koşulları</Text><Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Geçerlilik ve müşteriye iletilecek not</Text></View></View>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Geçerlilik süresi (gün)</Text>
                    <View style={[styles.inputWrapper, styles.shortInput, { borderColor: colors.primary + '25', backgroundColor: colors.backgroundLight }]}><Ionicons name="calendar-outline" size={18} color={colors.primary} style={styles.inputIcon} /><TextInput style={[styles.input, { color: colors.text }]} value={validityDays} onChangeText={setValidityDays} keyboardType="number-pad" maxLength={2} placeholder="7" /></View>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Teklif notu (isteğe bağlı)</Text>
                    <TextInput style={[styles.noteInput, { borderColor: colors.primary + '25', color: colors.text, backgroundColor: colors.backgroundLight }]} value={quoteNote} onChangeText={setQuoteNote} multiline maxLength={600} placeholder="İş kapsamı, teslim süresi veya ödeme koşulları..." placeholderTextColor={staticColors.textLight} textAlignVertical="top" />
                    <Text style={[styles.counter, { color: colors.textSecondary }]}>{quoteNote.length}/600</Text>
                </Card>
                <Card variant="glass" style={[styles.totalCard, { shadowColor: colors.primary, borderColor: colors.primary + '35', padding: 0 }]}>
                    <LinearGradient colors={colors.gradientDark} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.totalCardGradient}>
                        <Text style={styles.totalLabel}>GENEL TEKLİF TOPLAMI</Text><Text style={[styles.totalValue, { color: colors.accentGold || '#E5C158' }]}>{formatCurrency(calculateTotal())}</Text>
                        <View style={styles.breakdownRow}><View style={styles.breakdownCol}><Text style={styles.breakdownLabel}>Malzeme</Text><Text style={styles.breakdownValue}>{formatCurrency(calculateTotal('material'))}</Text></View><View style={styles.breakdownDivider} /><View style={styles.breakdownCol}><Text style={styles.breakdownLabel}>İşçilik</Text><Text style={styles.breakdownValue}>{formatCurrency(calculateTotal('labor'))}</Text></View></View>
                    </LinearGradient>
                </Card>
                <View style={styles.actionsRow}>
                    <TouchableOpacity style={[styles.actionBtn, { opacity: isGenerating ? .65 : 1 }]} onPress={handlePreviewPDF} disabled={isGenerating}><LinearGradient colors={['#6366F1', '#4F46E5']} style={styles.actionBtnGradient}><Ionicons name="eye-outline" size={20} color={staticColors.white} /><Text style={styles.actionBtnText}>{isGenerating ? 'Hazırlanıyor...' : 'Önizle / Yazdır'}</Text></LinearGradient></TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { opacity: isGenerating ? .65 : 1 }]} onPress={handleSharePDF} disabled={isGenerating}><LinearGradient colors={colors.gradientSuccess} style={styles.actionBtnGradient}><Ionicons name="share-social-outline" size={20} color={staticColors.white} /><Text style={styles.actionBtnText}>PDF Paylaş</Text></LinearGradient></TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    </View>;
}

const styles = StyleSheet.create({
    container: { flex: 1 }, keyboardView: { flex: 1 }, scrollView: { flex: 1 }, content: { padding: spacing.md, paddingBottom: 120 },
    quoteBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, marginBottom: spacing.md },
    quoteBadgeText: { fontFamily: fonts.bold, fontSize: 12 }, card: { padding: spacing.md, marginBottom: spacing.md },
    cardHeaderWithAvatar: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }, avatarContainer: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 }, cardHeaderTitleContainer: { flex: 1 },
    sectionTitle: { fontFamily: fonts.bold, fontSize: 16, marginBottom: 2 }, sectionSubtitle: { fontFamily: fonts.medium, fontSize: 11, opacity: .8 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12, paddingLeft: 12, height: 48 }, inputIcon: { marginRight: 8 }, input: { flex: 1, height: '100%', fontFamily: fonts.medium, fontSize: 14 },
    columnLabels: { flexDirection: 'row', gap: 6, marginBottom: 5, paddingHorizontal: 4 }, nameLabel: { flex: 2.8, fontFamily: fonts.semiBold, fontSize: 10, color: '#64748B' }, qtyLabel: { flex: 1, textAlign: 'center', fontFamily: fonts.semiBold, fontSize: 10, color: '#64748B' }, priceLabel: { flex: 1.3, textAlign: 'right', fontFamily: fonts.semiBold, fontSize: 10, color: '#64748B' }, removeLabel: { width: 38 },
    itemsListContainer: { marginVertical: 4 }, itemRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    itemName: { flex: 2.8, height: 44, borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 10, fontFamily: fonts.medium, fontSize: 12 }, itemQty: { flex: 1, height: 44, borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 4, textAlign: 'center', fontFamily: fonts.semiBold, fontSize: 12 }, itemPrice: { flex: 1.3, height: 44, borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 7, textAlign: 'right', fontFamily: fonts.semiBold, fontSize: 12 },
    removeBtn: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' }, addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 12, marginTop: 6 }, addBtnText: { fontFamily: fonts.bold, fontSize: 13 }, subtotal: { fontFamily: fonts.bold, fontSize: 14, textAlign: 'right', marginTop: spacing.md, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
    fieldLabel: { fontFamily: fonts.semiBold, fontSize: 12, marginBottom: 7 }, shortInput: { width: 150, marginBottom: spacing.md }, noteInput: { minHeight: 94, borderWidth: 1.5, borderRadius: 12, padding: 12, fontFamily: fonts.medium, fontSize: 13 }, counter: { alignSelf: 'flex-end', fontFamily: fonts.medium, fontSize: 10, marginTop: 5 },
    totalCard: { marginBottom: spacing.md, borderRadius: 24, overflow: 'hidden', borderWidth: 1.5 }, totalCardGradient: { padding: spacing.lg, alignItems: 'center', borderRadius: 24 }, totalLabel: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, marginBottom: 6, color: 'rgba(255,255,255,.72)' }, totalValue: { fontFamily: fonts.extraBold, fontSize: 32, marginBottom: spacing.md }, breakdownRow: { flexDirection: 'row', alignItems: 'center', width: '100%', paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,.12)' }, breakdownCol: { flex: 1, alignItems: 'center' }, breakdownLabel: { fontFamily: fonts.medium, fontSize: 11, color: 'rgba(255,255,255,.6)', marginBottom: 2 }, breakdownValue: { fontFamily: fonts.bold, fontSize: 14, color: '#FFF' }, breakdownDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,.15)' },
    actionsRow: { flexDirection: 'row', gap: 10, marginTop: 4 }, actionBtn: { flex: 1, borderRadius: 16, overflow: 'hidden', elevation: 3 }, actionBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, minHeight: 54, paddingHorizontal: 8 }, actionBtnText: { fontFamily: fonts.bold, fontSize: 12, color: staticColors.white, textAlign: 'center' },
});
