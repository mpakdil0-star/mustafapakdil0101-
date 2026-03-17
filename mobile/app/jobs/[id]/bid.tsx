import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Dimensions,
  Modal,
} from 'react-native';
import { PremiumAlert } from '../../../components/common/PremiumAlert';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../../hooks/redux';
import { fetchJobById } from '../../../store/slices/jobSlice';
import { createBid, clearError, fetchMyBids } from '../../../store/slices/bidSlice';
import { getMe, updateCreditBalance } from '../../../store/slices/authSlice';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { colors as staticColors } from '../../../constants/colors';
import { spacing } from '../../../constants/spacing';
import { Picker } from '../../../components/common/Picker';
import { format, addDays } from 'date-fns';
import { tr } from 'date-fns/locale';
import { PremiumHeader } from '../../../components/common/PremiumHeader';
import { fonts } from '../../../constants/typography';
import { useAppColors } from '../../../hooks/useAppColors';
import { containsPhoneNumber } from '../../../utils/validation';

const { width } = Dimensions.get('window');

export default function CreateBidScreen() {
  const router = useRouter();
  const { id: jobId } = useLocalSearchParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const { currentJob } = useAppSelector((state) => state.jobs);
  const { user } = useAppSelector((state) => state.auth);
  const { isLoading, error } = useAppSelector((state) => state.bids);
  const colors = useAppColors();

  const [amount, setAmount] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('2');
  const [estimatedStartDate, setEstimatedStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [message, setMessage] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [costItems, setCostItems] = useState<{ id: string; description: string; amount: string }[]>([]);

  // Maliyet kalemleri değiştiğinde toplam tutarı güncelle
  useEffect(() => {
    if (costItems.length > 0) {
      const total = costItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
      setAmount(total.toString());
    }
  }, [costItems]);

  const addCostItem = () => {
    setCostItems([...costItems, { id: Math.random().toString(), description: '', amount: '' }]);
  };

  const removeCostItem = (id: string) => {
    setCostItems(costItems.filter(item => item.id !== id));
  };

  const updateCostItem = (id: string, field: 'description' | 'amount', value: string) => {
    setCostItems(costItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info' | 'confirm';
    buttons?: { text: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }[];
  }>({ visible: false, title: '', message: '' });

  const showAlert = (title: string, message: string, type: any = 'info', buttons?: any[]) => {
    setAlertConfig({ visible: true, title, message, type, buttons });
  };

  const DURATION_OPTIONS = [
    { label: '1s', value: '1' },
    { label: '2s', value: '2' },
    { label: '4s', value: '4' },
    { label: '8s', value: '8' },
    { label: '1G', value: '16' },
  ];

  const detailedDateOptions = Array.from({ length: 15 }, (_, i) => {
    const date = addDays(new Date(), i);
    return {
      label: format(date, 'd MMMM EEEE', { locale: tr }),
      value: format(date, 'yyyy-MM-dd'),
    };
  });

  const [selectedDateLabel, setSelectedDateLabel] = useState(detailedDateOptions[0].label);

  useEffect(() => {
    if (jobId) dispatch(fetchJobById(jobId));
  }, [jobId, dispatch]);

  // Error handling is managed manually in handleSubmit to show custom popups for credit issues.
  // The generic listener below caused duplicate alerts.
  /*
  useEffect(() => {
    if (error) {
      showAlert('Hata', error, 'error');
      dispatch(clearError());
    }
  }, [error, dispatch]);
  */

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      showAlert('Hata', 'Lütfen geçerli bir tutar giriniz.', 'error');
      return;
    }
    if (message.length < 10) {
      showAlert('Hata', 'Mesaj en az 10 karakter olmalıdır.', 'error');
      return;
    }
    if (containsPhoneNumber(message)) {
      showAlert('Güvenlik Uyarısı', 'Güvenlik nedeniyle mesajınızda telefon numarası veya iletişim bilgisi paylaşamazsınız. Platform dışı işlemler her iki taraf için de risk oluşturur.', 'warning');
      return;
    }

    // Optimistic update: Immediately update UI before backend call
    const currentBalance = Number(user?.electricianProfile?.creditBalance || 0);

    if (currentBalance > 0) {
      const newBalance = currentBalance - 1;
      dispatch(updateCreditBalance(newBalance));
    }

    try {
      await dispatch(createBid({
        jobPostId: jobId as string,
        amount: parseFloat(amount),
        estimatedDuration: parseFloat(estimatedDuration),
        estimatedStartDate: estimatedStartDate ? new Date(estimatedStartDate).toISOString() : undefined,
        message: message.trim(),
        costItems: costItems.length > 0 ? costItems.map(item => ({
          description: item.description,
          amount: parseFloat(item.amount)
        })) : undefined,
      })).unwrap();

      setShowSuccessModal(true);
      dispatch(fetchMyBids());
      dispatch(getMe()); // Sync with server to verify balance
    } catch (err: any) {
      // Rollback optimistic update on error
      dispatch(updateCreditBalance(currentBalance));

      let errorMessage = 'Bir hata oluştu';

      // 1. Check if err is the direct backend response object { error: { message: "..." } }
      if (err?.error?.message) {
        errorMessage = err.error.message;
      }
      // 2. Check standard Error object
      else if (err?.message) {
        errorMessage = err.message;
      }
      // 3. Fallback to string handling
      else if (typeof err === 'string') {
        errorMessage = err;
      }
      else {
        try { errorMessage = JSON.stringify(err); } catch (e) { }
      }

      console.log('Processed Error Message:', errorMessage);

      // JSON parse denemesi (String içindeki JSON'ı bul - eğer hala string ise)
      if (typeof errorMessage === 'string') {
        try {
          const firstBrace = errorMessage.indexOf('{');
          const lastBrace = errorMessage.lastIndexOf('}');

          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            const jsonPart = errorMessage.substring(firstBrace, lastBrace + 1);
            const parsed = JSON.parse(jsonPart);
            if (parsed.error && parsed.error.message) {
              errorMessage = parsed.error.message;
            } else if (parsed.message) {
              errorMessage = parsed.message;
            }
          }
        } catch (e) {
          // ignore
        }
      }

      // Kredi hatası kontrolü
      if (errorMessage.toLowerCase().includes('yetersiz kredi') || errorMessage.toLowerCase().includes('kredi')) {
        showAlert(
          'Krediniz Tükendi! 💳',
          'Teklif verebilmek için cüzdanınıza kredi yüklemeniz gerekmektedir. Yeni üyelere verilen 5 ücretsiz kredinizi kullandınız.',
          'warning',
          [
            {
              text: 'Cüzdana Git',
              onPress: () => {
                setAlertConfig(prev => ({ ...prev, visible: false }));
                // Wallet sayfasına yönlendir
                setTimeout(() => router.push('/profile/wallet'), 300);
              },
              variant: 'primary'
            },
            {
              text: 'Daha Sonra',
              onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })),
              variant: 'ghost'
            }
          ]
        );
      } else {
        showAlert('Hata', errorMessage, 'error');
      }
    }
  };

  if (!currentJob) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.backgroundDark }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 80}
      style={[styles.container, { backgroundColor: colors.backgroundDark }]}
    >
      <PremiumHeader title="Teklif Ver" subtitle={currentJob.category} showBackButton />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Job Info Summary Card */}
        <Card style={[styles.infoCard, { backgroundColor: colors.surface }]}>
          <View style={styles.jobInfoContainer}>
            <View style={[styles.iconBox, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="construct" size={24} color={colors.primary} />
            </View>
            <View style={styles.jobTextInfo}>
              <Text style={[styles.jobTitle, { color: colors.text }]} numberOfLines={2}>{currentJob.title}</Text>
              <View style={styles.locationBadge}>
                <Ionicons name="location" size={14} color={staticColors.textSecondary} />
                <Text style={styles.locationText}>{currentJob.location?.district || 'Belirtilmemiş'}</Text>
              </View>
            </View>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.budgetOverview}>
            <View>
              <Text style={styles.infoLabel}>Tahmini Bütçe</Text>
              <Text style={[styles.infoValue, { color: colors.primary }]}>
                {currentJob.estimatedBudget
                  ? (parseFloat(currentJob.estimatedBudget.toString()) || 0).toFixed(0)
                  : '—'} ₺
              </Text>
            </View>
            <View style={styles.urgencyBadge}>
              <Text style={[styles.urgencyText, { color: currentJob.urgencyLevel === 'HIGH' ? '#EF4444' : (currentJob.urgencyLevel === 'MEDIUM' ? '#F59E0B' : '#10B981') }]}>
                {currentJob.urgencyLevel === 'HIGH' ? 'Acil' : (currentJob.urgencyLevel === 'MEDIUM' ? 'Normal' : 'Düşük')}
              </Text>
            </View>
          </View>
        </Card>

        <View style={styles.formSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Teklif Detayları</Text>

          {/* Cost Items Section */}
          <View style={styles.inputGroup}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Maliyet Kalemleri (Opsiyonel)</Text>
              <TouchableOpacity onPress={addCostItem} style={styles.addBtn}>
                <Ionicons name="add-circle" size={20} color={colors.primary} />
                <Text style={[styles.addBtnText, { color: colors.primary }]}>Ekle</Text>
              </TouchableOpacity>
            </View>
            
            {costItems.map((item, index) => (
              <View key={item.id} style={styles.costItemRow}>
                <View style={[styles.costFieldWrapper, styles.costDescWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.costDescInput, { color: colors.text }]}
                    placeholder={`${index + 1}. Kalem (Örn: İşçilik)`}
                    value={item.description}
                    onChangeText={(val) => updateCostItem(item.id, 'description', val)}
                    placeholderTextColor={staticColors.textLight}
                  />
                </View>
                
                <View style={[styles.costFieldWrapper, styles.costAmountWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.costAmountInput, { color: colors.text }]}
                    placeholder="0"
                    keyboardType="numeric"
                    value={item.amount}
                    onChangeText={(val) => updateCostItem(item.id, 'amount', val)}
                    placeholderTextColor={staticColors.textLight}
                  />
                  <Text style={[styles.costCurrency, { color: colors.primary }]}>₺</Text>
                </View>

                <TouchableOpacity onPress={() => removeCostItem(item.id)} style={[styles.removeBtn, { backgroundColor: '#FEE2E2' }]}>
                  <Ionicons name="trash" size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Amount Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Sizin Teklifiniz (Genel Toplam ₺)</Text>
            <View style={[
              styles.inputWrapper, 
              { backgroundColor: colors.surface, borderColor: colors.border },
              costItems.length > 0 && { backgroundColor: colors.surface + '50', opacity: 0.8 }
            ]}>
              <Ionicons name="cash-outline" size={20} color={colors.primary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="0.00"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
                editable={costItems.length === 0}
                placeholderTextColor={staticColors.textLight}
              />
            </View>
            {costItems.length > 0 && (
              <Text style={styles.infoText}>* Toplam tutar maliyet kalemlerine göre hesaplanmıştır.</Text>
            )}
          </View>

          {/* Duration Pills */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Tahmini Süre</Text>
            <View style={styles.pillContainer}>
              {DURATION_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  activeOpacity={0.7}
                  style={[
                    styles.pill,
                    { borderColor: colors.border },
                    estimatedDuration === opt.value && { backgroundColor: colors.primary, borderColor: colors.primary }
                  ]}
                  onPress={() => setEstimatedDuration(opt.value)}
                >
                  <Text style={[
                    styles.pillText,
                    { color: colors.textSecondary },
                    estimatedDuration === opt.value && { color: staticColors.white }
                  ]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Date Picker */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Başlangıç Tarihi</Text>
            <Picker
              value={selectedDateLabel}
              options={detailedDateOptions.map(o => o.label)}
              onValueChange={(val) => {
                setSelectedDateLabel(val);
                const opt = detailedDateOptions.find(o => o.label === val);
                if (opt) setEstimatedStartDate(opt.value);
              }}
              icon={<Ionicons name="calendar-outline" size={20} color={colors.primary} style={styles.inputIcon} />}
              containerStyle={{ marginBottom: 0 }}
              pickerStyle={[styles.pickerWrapper, { backgroundColor: colors.surface, borderColor: colors.border, height: 44, minHeight: 44 }]}
            />
          </View>

          {/* Message Textarea */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Mesajınız (En az 10 karakter)</Text>
            <View style={[styles.textAreaWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TextInput
                style={[styles.textArea, { color: colors.text }]}
                placeholder="İşle ilgili detayları, nasıl yapacağınızı veya neden sizi seçmeleri gerektiğini buraya yazabilirsiniz..."
                multiline
                numberOfLines={5}
                value={message}
                onChangeText={setMessage}
                placeholderTextColor={staticColors.textLight}
              />
            </View>
          </View>

          <Button
            title={isLoading ? "Gönderiliyor..." : "Teklifi Gönder"}
            onPress={handleSubmit}
            variant="primary"
            fullWidth
            style={styles.submitBtn}
            loading={isLoading}
            icon={<Ionicons name="send" size={18} color={staticColors.white} />}
          />

          <Text style={styles.disclaimer}>
            Teklifiniz iş sahibine anında iletilecek ve kabul edilirse sizinle iletişime geçebilecektir.
          </Text>
        </View>
      </ScrollView>

      {/* Success Modal - Premium Glass Glow Design */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <LinearGradient
            colors={['rgba(255,255,255,0.98)', 'rgba(248, 250, 252, 0.95)']}
            style={styles.successModal}
          >
            <View style={styles.successIconWrapper}>
              <View style={styles.successIconGlow} />
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={styles.successIconBox}
              >
                <Ionicons name="checkmark-done" size={36} color={staticColors.white} />
              </LinearGradient>
            </View>

            <Text style={styles.successTitle}>Teklif Gönderildi! 🚀</Text>
            <Text style={styles.successMessage}>
              Teklifiniz iş sahibine başarıyla iletildi. Müşteri teklifinizi kabul ettiğinde size bildirim göndereceğiz.
            </Text>

            <View style={styles.successBtnGroup}>
              <TouchableOpacity
                style={[styles.successPrimaryBtn, { shadowColor: colors.primary }]}
                onPress={() => {
                  setShowSuccessModal(false);
                  router.back();
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.successPrimaryBtnText}>Tamam</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </Modal>

      <PremiumAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        buttons={alertConfig.buttons}
        onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 12, paddingBottom: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Info Card
  infoCard: {
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3
  },
  jobInfoContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  jobTextInfo: { flex: 1 },
  jobTitle: { fontSize: 14, fontFamily: fonts.extraBold, marginBottom: 2 },
  locationBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontSize: 11, fontFamily: fonts.medium, color: staticColors.textSecondary },
  infoDivider: { height: 1.5, backgroundColor: 'rgba(0,0,0,0.03)', marginVertical: 10 },
  budgetOverview: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { fontSize: 10, fontFamily: fonts.bold, color: staticColors.textLight, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 16, fontFamily: fonts.extraBold, marginTop: 1 },
  urgencyBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.03)' },
  urgencyText: { fontSize: 11, fontFamily: fonts.bold },

  // Form Section
  formSection: { gap: 10 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sectionTitle: { fontSize: 14, fontFamily: fonts.extraBold, marginBottom: 0, marginLeft: 2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addBtnText: { fontSize: 12, fontFamily: fonts.bold },
  costItemRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    marginBottom: 8,
  },
  costFieldWrapper: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  costDescWrapper: { flex: 2 },
  costAmountWrapper: { flex: 0.9, paddingHorizontal: 8 },
  costDescInput: { flex: 1, fontSize: 13, fontFamily: fonts.semiBold, height: '100%' },
  costAmountInput: { flex: 1, fontSize: 14, fontFamily: fonts.extraBold, textAlign: 'right', height: '100%' },
  costCurrency: { fontSize: 13, fontFamily: fonts.extraBold, marginLeft: 2 },
  removeBtn: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  infoText: { fontSize: 10, fontFamily: fonts.bold, color: '#6366F1', marginTop: 4, marginLeft: 4 },
  inputGroup: { gap: 4 },
  label: { fontSize: 12, fontFamily: fonts.bold, marginLeft: 2 },

  // Custom Inputs
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    height: 44,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, fontFamily: fonts.extraBold, height: '100%' },

  pickerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    height: 44,
  },
  flex1: { flex: 1 },

  pillContainer: { flexDirection: 'row', gap: 4 },
  pill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center'
  },
  pillText: { fontSize: 12, fontFamily: fonts.bold },

  textAreaWrapper: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 10,
    minHeight: 80,
  },
  textArea: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.medium,
    textAlignVertical: 'top'
  },

  submitBtn: { height: 48, borderRadius: 12, marginTop: 0 },
  disclaimer: {
    textAlign: 'center',
    fontSize: 10,
    fontFamily: fonts.medium,
    color: staticColors.textLight,
    paddingHorizontal: 10,
    lineHeight: 14,
  },

  // Success Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successModal: {
    width: '100%',
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  successIconWrapper: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successIconGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10B981',
    opacity: 0.2,
    transform: [{ scale: 1.2 }],
  },
  successIconBox: {
    width: 72,
    height: 72,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  successTitle: {
    fontSize: 24,
    fontFamily: fonts.extraBold,
    textAlign: 'center',
    marginBottom: 12,
    color: '#0F172A',
  },
  successMessage: {
    fontSize: 15,
    fontFamily: fonts.medium,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 10,
  },
  successBtnGroup: {
    width: '100%',
  },
  successPrimaryBtn: {
    width: '100%',
    height: 56,
    borderRadius: 18,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  successPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: fonts.bold,
  },
});
