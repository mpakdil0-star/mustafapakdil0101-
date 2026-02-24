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
          .header h1 { color: #3B82F6; margin: 0; font-size: 32px; }
          .header p { color: #64748B; margin: 5px 0 0 0; }
          .info-grid { display: flex; justify-content: space-between; margin-bottom: 30px; }
          .info-box { background: #F8FAFC; padding: 20px; border-radius: 12px; flex: 1; margin: 0 10px; }
          .info-box:first-child { margin-left: 0; }
          .info-box:last-child { margin-right: 0; }
          .info-box h3 { margin: 0 0 10px 0; color: #3B82F6; font-size: 14px; }
          .info-box p { margin: 5px 0; font-size: 14px; }
          .section { margin-bottom: 30px; }
          .section h2 { font-size: 16px; color: #3B82F6; margin-bottom: 15px; border-bottom: 2px solid #3B82F6; padding-bottom: 5px; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #3B82F6; color: white; padding: 12px; text-align: left; }
          th:nth-child(2), th:nth-child(3), th:nth-child(4) { text-align: center; }
          .subtotal { text-align: right; padding: 10px; font-weight: bold; background: #F1F5F9; }
          .total { background: #3B82F6; color: white; padding: 20px; border-radius: 12px; text-align: center; margin-top: 30px; }
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
          <p>Ustalar Uygulaması ile oluşturuldu.</p>
        </div>
      </body>
      </html>
    `;
    };

    const [pdfUri, setPdfUri] = useState<string | null>(null);

    // Preview PDF - shows in print dialog where user can view
    const handlePreviewPDF = async () => {
        if (items.length === 0) {
            Alert.alert('Uyarı', 'En az bir malzeme veya işçilik kalemi ekleyin.');
            return;
        }

        setIsGenerating(true);
        try {
            const html = generatePDFHtml();
            // Print.printAsync shows a print preview where user can see the PDF
            await Print.printAsync({ html });

            // Also generate and save the URI for later sharing
            const { uri } = await Print.printToFileAsync({ html });
            setPdfUri(uri);
        } catch (error) {
            console.error('PDF preview error:', error);
            Alert.alert('Hata', 'PDF önizleme sırasında bir hata oluştu.');
        } finally {
            setIsGenerating(false);
        }
    };

    // Share PDF - creates file and opens share dialog
    const handleSharePDF = async () => {
        if (items.length === 0) {
            Alert.alert('Uyarı', 'En az bir malzeme veya işçilik kalemi ekleyin.');
            return;
        }

        setIsGenerating(true);
        try {
            const html = generatePDFHtml();
            const { uri } = await Print.printToFileAsync({ html });
            setPdfUri(uri);

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
                style={[styles.itemName, { borderColor: colors.primary + '30' }]}
                value={item.name}
                onChangeText={(v) => updateItem(item.id, 'name', v)}
                placeholder={item.type === 'material' ? 'Malzeme adı' : 'İş tanımı'}
                placeholderTextColor={staticColors.textLight}
            />
            <TextInput
                style={[styles.itemQty, { borderColor: colors.primary + '30' }]}
                value={item.quantity}
                onChangeText={(v) => updateItem(item.id, 'quantity', v)}
                keyboardType="decimal-pad"
                placeholder="1"
                placeholderTextColor={staticColors.textLight}
            />
            <TextInput
                style={[styles.itemPrice, { borderColor: colors.primary + '30' }]}
                value={item.price}
                onChangeText={(v) => updateItem(item.id, 'price', v)}
                keyboardType="decimal-pad"
                placeholder="₺"
                placeholderTextColor={staticColors.textLight}
            />
            <TouchableOpacity onPress={() => removeItem(item.id)} style={styles.removeBtn}>
                <Ionicons name="trash-outline" size={20} color={staticColors.error} />
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <PremiumHeader title="Teklif Hazırla" showBackButton />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
                    {/* Customer Info */}
                    <Card style={styles.card}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>
                            <Ionicons name="person" size={18} color={colors.primary} /> Müşteri Bilgileri
                        </Text>
                        <TextInput
                            style={[styles.input, { borderColor: colors.primary + '30' }]}
                            value={customerName}
                            onChangeText={setCustomerName}
                            placeholder="Ad Soyad"
                            placeholderTextColor={staticColors.textLight}
                        />
                        <TextInput
                            style={[styles.input, { borderColor: colors.primary + '30' }]}
                            value={customerPhone}
                            onChangeText={setCustomerPhone}
                            placeholder="Telefon"
                            keyboardType="phone-pad"
                            placeholderTextColor={staticColors.textLight}
                        />
                    </Card>

                    {/* Materials */}
                    <Card style={styles.card}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>
                            <Ionicons name="cube" size={18} color="#F59E0B" /> Malzemeler
                        </Text>
                        {items.filter(i => i.type === 'material').map(renderItem)}
                        <TouchableOpacity
                            style={[styles.addBtn, { borderColor: '#F59E0B' }]}
                            onPress={() => addItem('material')}
                        >
                            <Ionicons name="add" size={20} color="#F59E0B" />
                            <Text style={[styles.addBtnText, { color: '#F59E0B' }]}>Malzeme Ekle</Text>
                        </TouchableOpacity>
                        {items.filter(i => i.type === 'material').length > 0 && (
                            <Text style={[styles.subtotal, { color: colors.text }]}>
                                Ara Toplam: {formatCurrency(calculateTotal('material'))}
                            </Text>
                        )}
                    </Card>

                    {/* Labor */}
                    <Card style={styles.card}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>
                            <Ionicons name="hammer" size={18} color="#10B981" /> İşçilik
                        </Text>
                        {items.filter(i => i.type === 'labor').map(renderItem)}
                        <TouchableOpacity
                            style={[styles.addBtn, { borderColor: '#10B981' }]}
                            onPress={() => addItem('labor')}
                        >
                            <Ionicons name="add" size={20} color="#10B981" />
                            <Text style={[styles.addBtnText, { color: '#10B981' }]}>İşçilik Ekle</Text>
                        </TouchableOpacity>
                        {items.filter(i => i.type === 'labor').length > 0 && (
                            <Text style={[styles.subtotal, { color: colors.text }]}>
                                Ara Toplam: {formatCurrency(calculateTotal('labor'))}
                            </Text>
                        )}
                    </Card>

                    {/* Total */}
                    <Card style={[styles.totalCard, { backgroundColor: colors.primary }]}>
                        <Text style={styles.totalLabel}>GENEL TOPLAM</Text>
                        <Text style={styles.totalValue}>{formatCurrency(calculateTotal())}</Text>
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
                                <Ionicons name="eye" size={22} color={staticColors.white} />
                                <Text style={styles.actionBtnText}>
                                    {isGenerating ? 'Yükleniyor...' : 'PDF Önizle'}
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
                                colors={['#10B981', '#059669']}
                                style={styles.actionBtnGradient}
                            >
                                <Ionicons name="share-social" size={22} color={staticColors.white} />
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
        backgroundColor: '#F8FAFC',
    },
    keyboardView: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: spacing.md,
        paddingBottom: 100,
    },
    card: {
        padding: spacing.md,
        marginBottom: spacing.md,
    },
    sectionTitle: {
        fontFamily: fonts.bold,
        fontSize: 16,
        marginBottom: spacing.md,
    },
    input: {
        height: 50,
        borderWidth: 1.5,
        borderRadius: 12,
        paddingHorizontal: 16,
        fontFamily: fonts.medium,
        fontSize: 15,
        backgroundColor: staticColors.white,
        marginBottom: spacing.sm,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    itemName: {
        flex: 3,
        height: 46,
        borderWidth: 1.5,
        borderRadius: 10,
        paddingHorizontal: 12,
        fontFamily: fonts.medium,
        fontSize: 14,
        backgroundColor: staticColors.white,
    },
    itemQty: {
        flex: 1,
        height: 46,
        borderWidth: 1.5,
        borderRadius: 10,
        paddingHorizontal: 8,
        textAlign: 'center',
        fontFamily: fonts.semiBold,
        fontSize: 14,
        backgroundColor: staticColors.white,
    },
    itemPrice: {
        flex: 1.5,
        height: 46,
        borderWidth: 1.5,
        borderRadius: 10,
        paddingHorizontal: 8,
        textAlign: 'right',
        fontFamily: fonts.semiBold,
        fontSize: 14,
        backgroundColor: staticColors.white,
    },
    removeBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 46,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderRadius: 12,
        marginTop: 8,
    },
    addBtnText: {
        fontFamily: fonts.bold,
        fontSize: 14,
    },
    subtotal: {
        fontFamily: fonts.bold,
        fontSize: 15,
        textAlign: 'right',
        marginTop: spacing.sm,
        paddingTop: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
    },
    totalCard: {
        padding: spacing.lg,
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    totalLabel: {
        fontFamily: fonts.bold,
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        marginBottom: 4,
    },
    totalValue: {
        fontFamily: fonts.extraBold,
        fontSize: 32,
        color: staticColors.white,
    },
    actionsRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: spacing.sm,
    },
    actionBtn: {
        flex: 1,
        borderRadius: 16,
        overflow: 'hidden',
    },
    previewBtn: {
        flex: 1.2,
    },
    shareBtn: {
        flex: 0.8,
    },
    actionBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: 56,
        paddingHorizontal: 16,
    },
    actionBtnText: {
        fontFamily: fonts.bold,
        fontSize: 15,
        color: staticColors.white,
    },
});
