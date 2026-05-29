import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Alert,
    KeyboardAvoidingView,
    Platform,
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

const QUICK_SUGGESTIONS = {
    material: [
        { name: '3x2.5 NYM Kablo (m)', price: '45' },
        { name: '3x1.5 NYM Kablo (m)', price: '32' },
        { name: '16A Sigorta', price: '120' },
        { name: '32A Sigorta', price: '140' },
        { name: '40A Kaçak Akım Rölesi', price: '450' },
        { name: 'Sıva Altı Priz', price: '60' },
        { name: 'Sıva Altı Anahtar', price: '55' },
        { name: '24W Panel LED', price: '180' }
    ],
    labor: [
        { name: 'Priz / Anahtar Montajı', price: '40' },
        { name: 'Sigorta Kutusu Montajı', price: '500' },
        { name: 'Avize / LED Montajı', price: '150' },
        { name: 'Kablo Çekim İşçiliği (m)', price: '20' },
        { name: 'Pano Kurulumu', price: '1500' },
        { name: 'Arıza Tespit ve Onarım', price: '400' }
    ]
};

export default function QuoteScreen() {
    const colors = useAppColors();
    const { user } = useAppSelector((state) => state.auth);

    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [items, setItems] = useState<QuoteItem[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);

    const addItem = (type: 'material' | 'labor') => {
        setItems([
            ...items,
            {
                id: Date.now().toString(),
                name: '',
                quantity: '1',
                price: '',
                type,
            },
        ]);
    };

    const updateItem = (id: string, field: keyof QuoteItem, value: string) => {
        setItems(items.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

    const removeItem = (id: string) => {
        setItems(items.filter(item => item.id !== id));
    };

    const calculateTotal = (type?: 'material' | 'labor') => {
        return items
            .filter(item => !type || item.type === type)
            .reduce((sum, item) => {
                const qty = parseFloat(item.quantity) || 0;
                const price = parseFloat(item.price) || 0;
                return sum + qty * price;
            }, 0);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY',
            minimumFractionDigits: 2,
        }).format(amount);
    };

    const generatePDFHtml = () => {
        const today = new Date().toLocaleDateString('tr-TR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });

        const materials = items.filter(i => i.type === 'material');
        const labor = items.filter(i => i.type === 'labor');

        const renderItems = (list: QuoteItem[]) =>
            list.map(item => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #E2E8F0;">${item.name || '-'}</td>
          <td style="padding: 10px; border-bottom: 1px solid #E2E8F0; text-align: center;">${item.quantity}</td>
          <td style="padding: 10px; border-bottom: 1px solid #E2E8F0; text-align: right;">${formatCurrency(parseFloat(item.price) || 0)}</td>
          <td style="padding: 10px; border-bottom: 1px solid #E2E8F0; text-align: right; font-weight: bold;">${formatCurrency((parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0))}</td>
        </tr>
      `).join('');

        return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Teklif</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 40px; color: #1E293B; }
          .header { text-align: center; margin-bottom: 40px; }
          .header h1 { color: #4682B4; margin: 0; font-size: 32px; }
          .header p { color: #64748B; margin: 5px 0 0 0; }
          .info-grid { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .info-box { background: #F8FAFC; padding: 20px; border-radius: 12px; flex: 1; margin: 0 10px; }
          .info-box:first-child { margin-left: 0; }
          .info-box:last-child { margin-right: 0; }
          .info-box h3 { margin: 0 0 10px 0; color: #4682B4; font-size: 14px; }
          .info-box p { margin: 5px 0; font-size: 14px; }
          .section { margin-bottom: 30px; }
          .section h2 { font-size: 16px; color: #4682B4; margin-bottom: 15px; border-bottom: 2px solid #4682B4; padding-bottom: 5px; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #4682B4; color: white; padding: 12px; text-align: left; }
          th:nth-child(2), th:nth-child(3), th:nth-child(4) { text-align: center; }
          .subtotal { text-align: right; padding: 10px; font-weight: bold; background: #F1F5F9; }
          .total { background: #4682B4; color: white; padding: 20px; border-radius: 12px; text-align: center; margin-top: 30px; }
          .total h2 { margin: 0; font-size: 28px; }
          .footer { text-align: center; margin-top: 40px; color: #94A3B8; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>TEKLİF</h1>
          <p>Tarih: ${today}</p>
        </div>

        <div class="info-grid">
          <div class="info-box">
            <h3>USTA BİLGİLERİ</h3>
            <p><strong>${user?.fullName || 'Usta'}</strong></p>
            <p>Tel: ${user?.phone || '-'}</p>
            <p>${user?.email || ''}</p>
          </div>
          <div class="info-box">
            <h3>MÜŞTERİ BİLGİLERİ</h3>
            <p><strong>${customerName || 'Belirtilmedi'}</strong></p>
            <p>Tel: ${customerPhone || '-'}</p>
          </div>
        </div>

        ${materials.length > 0 ? `
        <div class="section">
          <h2>📦 MALZEMELER</h2>
          <table>
            <thead>
              <tr>
                <th>Malzeme Adı</th>
                <th>Adet</th>
                <th>Birim Fiyat</th>
                <th>Toplam</th>
              </tr>
            </thead>
            <tbody>
              ${renderItems(materials)}
            </tbody>
          </table>
          <div class="subtotal">Malzeme Toplamı: ${formatCurrency(calculateTotal('material'))}</div>
        </div>
        ` : ''}

        ${labor.length > 0 ? `
        <div class="section">
          <h2>👷 İŞÇİLİK</h2>
          <table>
            <thead>
              <tr>
                <th>İş Tanımı</th>
                <th>Adet</th>
                <th>Birim Fiyat</th>
                <th>Toplam</th>
              </tr>
            </thead>
            <tbody>
              ${renderItems(labor)}
            </tbody>
          </table>
          <div class="subtotal">İşçilik Toplamı: ${formatCurrency(calculateTotal('labor'))}</div>
        </div>
        ` : ''}

        <div class="total">
          <h2>GENEL TOPLAM: ${formatCurrency(calculateTotal())}</h2>
        </div>

        <div class="footer">
          <p>Bu teklif bilgilendirme amaçlıdır. Fiyatlar değişiklik gösterebilir.</p>
          <p>Elektrikçiler Uygulaması ile oluşturuldu.</p>
        </div>
      </body>
      </html>
    `;
    };

    const handlePreviewPDF = async () => {
        if (items.length === 0) {
            Alert.alert('Uyarı', 'En az bir malzeme veya işçilik kalemi ekleyin.');
            return;
        }

        setIsGenerating(true);
        try {
            const html = generatePDFHtml();
            await Print.printAsync({ html });
        } catch (error) {
            console.error('PDF preview error:', error);
            Alert.alert('Hata', 'PDF önizleme sırasında bir hata oluştu.');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSharePDF = async () => {
        if (items.length === 0) {
            Alert.alert('Uyarı', 'En az bir malzeme veya işçilik kalemi ekleyin.');
            return;
        }

        setIsGenerating(true);
        try {
            const html = generatePDFHtml();
            const { uri } = await Print.printToFileAsync({ html });

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, {
                    mimeType: 'application/pdf',
                    dialogTitle: 'Teklifi Paylaş',
                    UTI: 'com.adobe.pdf',
                });
            } else {
                Alert.alert('Bilgi', 'Paylaşım bu cihazda desteklenmiyor.');
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
            <TextInput
                style={[styles.itemName, { borderColor: colors.primary + '25', color: colors.text, backgroundColor: colors.backgroundLight }]}
                value={item.name}
                onChangeText={(v) => updateItem(item.id, 'name', v)}
                placeholder={item.type === 'material' ? 'Malzeme adı' : 'İş tanımı'}
                placeholderTextColor={staticColors.textLight}
            />
            <TextInput
                style={[styles.itemQty, { borderColor: colors.primary + '25', color: colors.text, backgroundColor: colors.backgroundLight }]}
                value={item.quantity}
                onChangeText={(v) => updateItem(item.id, 'quantity', v)}
                keyboardType="decimal-pad"
                placeholder="Adet"
                placeholderTextColor={staticColors.textLight}
            />
            <TextInput
                style={[styles.itemPrice, { borderColor: colors.primary + '25', color: colors.text, backgroundColor: colors.backgroundLight }]}
                value={item.price}
                onChangeText={(v) => updateItem(item.id, 'price', v)}
                keyboardType="decimal-pad"
                placeholder="₺"
                placeholderTextColor={staticColors.textLight}
            />
            <TouchableOpacity onPress={() => removeItem(item.id)} style={[styles.removeBtn, { backgroundColor: colors.error + '10' }]} activeOpacity={0.7}>
                <Ionicons name="trash-outline" size={18} color={colors.error} />
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <PremiumHeader title="Teklif Hazırla" showBackButton />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Customer Info */}
                    <Card style={styles.card} variant="default" elevated>
                        <View style={styles.cardHeaderWithAvatar}>
                            <View style={[styles.avatarContainer, { backgroundColor: colors.primary + '15' }]}>
                                <Ionicons name="person" size={22} color={colors.primary} />
                            </View>
                            <View style={styles.cardHeaderTitleContainer}>
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>Müşteri Bilgileri</Text>
                                <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Müşteri iletişim bilgileri</Text>
                            </View>
                        </View>
                        
                        <View style={[styles.inputWrapper, { borderColor: colors.primary + '25', marginBottom: 12, backgroundColor: colors.backgroundLight }]}>
                            <Ionicons name="person-outline" size={18} color={colors.primary} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                value={customerName}
                                onChangeText={setCustomerName}
                                placeholder="Ad Soyad"
                                placeholderTextColor={staticColors.textLight}
                            />
                        </View>
                        
                        <View style={[styles.inputWrapper, { borderColor: colors.primary + '25', backgroundColor: colors.backgroundLight }]}>
                            <Ionicons name="call-outline" size={18} color={colors.primary} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, { color: colors.text }]}
                                value={customerPhone}
                                onChangeText={setCustomerPhone}
                                placeholder="Telefon Numarası"
                                keyboardType="phone-pad"
                                placeholderTextColor={staticColors.textLight}
                            />
                        </View>
                    </Card>

                    {/* Materials */}
                    <Card style={styles.card} variant="default" elevated>
                        <View style={styles.cardHeaderWithAvatar}>
                            <View style={[styles.avatarContainer, { backgroundColor: '#F59E0B15' }]}>
                                <Ionicons name="cube" size={22} color="#F59E0B" />
                            </View>
                            <View style={styles.cardHeaderTitleContainer}>
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>Malzemeler</Text>
                                <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Kullanılacak elektrik malzemeleri</Text>
                            </View>
                        </View>

                        {/* Quick-Add Suggestions */}
                        <Text style={[styles.suggestionHeader, { color: colors.textSecondary }]}>✨ Hızlı Malzeme Ekle</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionScroll} contentContainerStyle={styles.suggestionContent}>
                            {QUICK_SUGGESTIONS.material.map((item, idx) => (
                                <TouchableOpacity 
                                    key={idx} 
                                    activeOpacity={0.8}
                                    style={[styles.suggestionTag, { backgroundColor: '#F59E0B12', borderColor: '#F59E0B30' }]}
                                    onPress={() => {
                                        setItems([
                                            ...items,
                                            {
                                                id: Date.now().toString() + idx,
                                                name: item.name,
                                                quantity: '1',
                                                price: item.price,
                                                type: 'material'
                                            }
                                        ]);
                                    }}
                                >
                                    <Text style={[styles.suggestionTagText, { color: '#D97706' }]}>{item.name}</Text>
                                    <Ionicons name="add" size={14} color="#D97706" style={{ marginLeft: 2 }} />
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <View style={styles.itemsListContainer}>
                            {items.filter(i => i.type === 'material').map(renderItem)}
                        </View>

                        <TouchableOpacity
                            style={[styles.addBtn, { borderColor: '#F59E0B', backgroundColor: '#F59E0B08' }]}
                            onPress={() => addItem('material')}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="add" size={20} color="#F59E0B" />
                            <Text style={[styles.addBtnText, { color: '#F59E0B' }]}>Malzeme Satırı Ekle</Text>
                        </TouchableOpacity>
                        {items.filter(i => i.type === 'material').length > 0 && (
                            <Text style={[styles.subtotal, { color: colors.text }]}>
                                Malzeme Toplamı: <Text style={{ color: '#D97706' }}>{formatCurrency(calculateTotal('material'))}</Text>
                            </Text>
                        )}
                    </Card>

                    {/* Labor */}
                    <Card style={styles.card} variant="default" elevated>
                        <View style={styles.cardHeaderWithAvatar}>
                            <View style={[styles.avatarContainer, { backgroundColor: '#10B98115' }]}>
                                <Ionicons name="hammer" size={22} color="#10B981" />
                            </View>
                            <View style={styles.cardHeaderTitleContainer}>
                                <Text style={[styles.sectionTitle, { color: colors.text }]}>İşçilik</Text>
                                <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Yapılacak elektrik işçilikleri</Text>
                            </View>
                        </View>

                        {/* Quick-Add Suggestions */}
                        <Text style={[styles.suggestionHeader, { color: colors.textSecondary }]}>✨ Hızlı İşçilik Ekle</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionScroll} contentContainerStyle={styles.suggestionContent}>
                            {QUICK_SUGGESTIONS.labor.map((item, idx) => (
                                <TouchableOpacity 
                                    key={idx} 
                                    activeOpacity={0.8}
                                    style={[styles.suggestionTag, { backgroundColor: '#10B98112', borderColor: '#10B98130' }]}
                                    onPress={() => {
                                        setItems([
                                            ...items,
                                            {
                                                id: Date.now().toString() + idx,
                                                name: item.name,
                                                quantity: '1',
                                                price: item.price,
                                                type: 'labor'
                                            }
                                        ]);
                                    }}
                                >
                                    <Text style={[styles.suggestionTagText, { color: '#059669' }]}>{item.name}</Text>
                                    <Ionicons name="add" size={14} color="#059669" style={{ marginLeft: 2 }} />
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <View style={styles.itemsListContainer}>
                            {items.filter(i => i.type === 'labor').map(renderItem)}
                        </View>

                        <TouchableOpacity
                            style={[styles.addBtn, { borderColor: '#10B981', backgroundColor: '#10B98108' }]}
                            onPress={() => addItem('labor')}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="add" size={20} color="#10B981" />
                            <Text style={[styles.addBtnText, { color: '#10B981' }]}>İşçilik Satırı Ekle</Text>
                        </TouchableOpacity>
                        {items.filter(i => i.type === 'labor').length > 0 && (
                            <Text style={[styles.subtotal, { color: colors.text }]}>
                                İşçilik Toplamı: <Text style={{ color: '#059669' }}>{formatCurrency(calculateTotal('labor'))}</Text>
                            </Text>
                        )}
                    </Card>

                    {/* Total Card */}
                    <Card variant="glass" style={[styles.totalCard, { shadowColor: colors.primary, borderColor: colors.primary + '35', padding: 0 }]}>
                        <LinearGradient
                            colors={colors.gradientDark}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.totalCardGradient}
                        >
                            <Text style={[styles.totalLabel, { color: colors.textMuted || 'rgba(255, 255, 255, 0.7)' }]}>GENEL TEKLİF TOPLAMI</Text>
                            <Text style={[styles.totalValue, { color: colors.accentGold || '#E5C158' }]}>{formatCurrency(calculateTotal())}</Text>
                            
                            <View style={styles.breakdownRow}>
                                <View style={styles.breakdownCol}>
                                    <Text style={styles.breakdownLabel}>Malzeme</Text>
                                    <Text style={styles.breakdownValue}>{formatCurrency(calculateTotal('material'))}</Text>
                                </View>
                                <View style={styles.breakdownDivider} />
                                <View style={styles.breakdownCol}>
                                    <Text style={styles.breakdownLabel}>İşçilik</Text>
                                    <Text style={styles.breakdownValue}>{formatCurrency(calculateTotal('labor'))}</Text>
                                </View>
                            </View>
                        </LinearGradient>
                    </Card>

                    {/* Action Buttons */}
                    <View style={styles.actionsRow}>
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.previewBtn, { opacity: isGenerating ? 0.7 : 1 }]}
                            onPress={handlePreviewPDF}
                            disabled={isGenerating}
                            activeOpacity={0.85}
                        >
                            <LinearGradient
                                colors={['#6366F1', '#4F46E5']}
                                style={styles.actionBtnGradient}
                            >
                                <Ionicons name="eye-outline" size={20} color={staticColors.white} />
                                <Text style={styles.actionBtnText}>
                                    {isGenerating ? 'Hazırlanıyor...' : 'PDF Önizle'}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionBtn, styles.shareBtn, { opacity: isGenerating ? 0.7 : 1 }]}
                            onPress={handleSharePDF}
                            disabled={isGenerating}
                            activeOpacity={0.85}
                        >
                            <LinearGradient
                                colors={colors.gradientSuccess}
                                style={styles.actionBtnGradient}
                            >
                                <Ionicons name="share-social-outline" size={20} color={staticColors.white} />
                                <Text style={styles.actionBtnText}>Paylaş</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: spacing.md,
        paddingBottom: 120,
    },
    card: {
        padding: spacing.md,
        marginBottom: spacing.md,
    },
    cardHeaderWithAvatar: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    avatarContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    cardHeaderTitleContainer: {
        flex: 1,
    },
    sectionTitle: {
        fontFamily: fonts.bold,
        fontSize: 16,
        marginBottom: 2,
    },
    sectionSubtitle: {
        fontFamily: fonts.medium,
        fontSize: 11,
        opacity: 0.8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderRadius: 12,
        paddingLeft: 12,
        height: 48,
    },
    inputIcon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        height: '100%',
        fontFamily: fonts.medium,
        fontSize: 14,
    },
    suggestionHeader: {
        fontFamily: fonts.bold,
        fontSize: 12,
        marginBottom: 8,
        marginTop: 4,
    },
    suggestionScroll: {
        marginBottom: spacing.md,
    },
    suggestionContent: {
        flexDirection: 'row',
        gap: 6,
        paddingBottom: 2,
    },
    suggestionTag: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        borderWidth: 1,
    },
    suggestionTagText: {
        fontFamily: fonts.bold,
        fontSize: 11,
    },
    itemsListContainer: {
        marginVertical: 4,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    itemName: {
        flex: 2.8,
        height: 44,
        borderWidth: 1.5,
        borderRadius: 10,
        paddingHorizontal: 12,
        fontFamily: fonts.medium,
        fontSize: 13,
    },
    itemQty: {
        flex: 1,
        height: 44,
        borderWidth: 1.5,
        borderRadius: 10,
        paddingHorizontal: 6,
        textAlign: 'center',
        fontFamily: fonts.semiBold,
        fontSize: 13,
    },
    itemPrice: {
        flex: 1.3,
        height: 44,
        borderWidth: 1.5,
        borderRadius: 10,
        paddingHorizontal: 8,
        textAlign: 'right',
        fontFamily: fonts.semiBold,
        fontSize: 13,
    },
    removeBtn: {
        width: 38,
        height: 38,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 44,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderRadius: 12,
        marginTop: 6,
    },
    addBtnText: {
        fontFamily: fonts.bold,
        fontSize: 13,
    },
    subtotal: {
        fontFamily: fonts.bold,
        fontSize: 14,
        textAlign: 'right',
        marginTop: spacing.md,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
    },
    totalCard: {
        marginBottom: spacing.md,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1.5,
    },
    totalCardGradient: {
        padding: spacing.lg,
        alignItems: 'center',
        position: 'relative',
        borderRadius: 24,
    },
    totalLabel: {
        fontFamily: fonts.bold,
        fontSize: 12,
        letterSpacing: 1,
        marginBottom: 6,
    },
    totalValue: {
        fontFamily: fonts.extraBold,
        fontSize: 32,
        marginBottom: spacing.md,
        textShadowColor: 'rgba(0, 0, 0, 0.25)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    breakdownRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
    },
    breakdownCol: {
        flex: 1,
        alignItems: 'center',
    },
    breakdownLabel: {
        fontFamily: fonts.medium,
        fontSize: 11,
        color: 'rgba(255, 255, 255, 0.5)',
        marginBottom: 2,
    },
    breakdownValue: {
        fontFamily: fonts.bold,
        fontSize: 14,
        color: '#FFFFFF',
    },
    breakdownDivider: {
        width: 1,
        height: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 4,
    },
    actionBtn: {
        flex: 1,
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    previewBtn: {
        flex: 1.15,
    },
    shareBtn: {
        flex: 0.85,
    },
    actionBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 52,
        paddingHorizontal: 12,
    },
    actionBtnText: {
        fontFamily: fonts.bold,
        fontSize: 14,
        color: staticColors.white,
    },
});
