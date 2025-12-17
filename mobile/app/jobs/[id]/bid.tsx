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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppDispatch, useAppSelector } from '../../../hooks/redux';
import { fetchJobById } from '../../../store/slices/jobSlice';
import { createBid, clearError, fetchMyBids } from '../../../store/slices/bidSlice';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { colors } from '../../../constants/colors';
import { spacing } from '../../../constants/spacing';
import { typography } from '../../../constants/typography';

export default function CreateBidScreen() {
  const router = useRouter();
  const { id: jobId } = useLocalSearchParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const { currentJob } = useAppSelector((state) => state.jobs);
  const { isLoading, error } = useAppSelector((state) => state.bids);
  const { user } = useAppSelector((state) => state.auth);

  const [amount, setAmount] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');
  const [estimatedStartDate, setEstimatedStartDate] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (jobId) {
      dispatch(fetchJobById(jobId));
    }
  }, [jobId, dispatch]);

  useEffect(() => {
    if (error) {
      Alert.alert('Hata', error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = 'Geçerli bir tutar giriniz';
    }

    if (!estimatedDuration || parseFloat(estimatedDuration) <= 0) {
      newErrors.estimatedDuration = 'Geçerli bir süre giriniz (saat)';
    }

    if (!message.trim()) {
      newErrors.message = 'Mesaj alanı zorunludur';
    } else if (message.trim().length < 10) {
      newErrors.message = 'Mesaj en az 10 karakter olmalıdır';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !jobId) return;

    try {
      await dispatch(
        createBid({
          jobPostId: jobId,
          amount: parseFloat(amount),
          estimatedDuration: parseFloat(estimatedDuration),
          estimatedStartDate: estimatedStartDate || undefined,
          message: message.trim(),
        })
      ).unwrap();

      Alert.alert('Başarılı', 'Teklifiniz başarıyla gönderildi!', [
        {
          text: 'Tamam',
          onPress: () => {
            // Refresh job bids and my bids
            dispatch(fetchMyBids());
            dispatch(fetchJobById(jobId));
            router.back();
          },
        },
      ]);
    } catch (err: any) {
      Alert.alert('Hata', err.message || 'Teklif gönderilirken bir hata oluştu');
    }
  };

  if (!currentJob) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>İlan yükleniyor...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Job Info Card */}
        <Card style={styles.jobCard}>
          <Text style={styles.jobTitle}>{currentJob.title}</Text>
          <Text style={styles.jobDescription} numberOfLines={3}>
            {currentJob.description}
          </Text>
          {currentJob.estimatedBudget && (
            <View style={styles.budgetInfo}>
              <Text style={styles.budgetLabel}>Tahmini Bütçe:</Text>
              <Text style={styles.budgetValue}>
                {typeof currentJob.estimatedBudget === 'string'
                  ? parseFloat(currentJob.estimatedBudget).toFixed(0)
                  : currentJob.estimatedBudget}{' '}
                ₺
              </Text>
            </View>
          )}
        </Card>

        {/* Form Card */}
        <Card style={styles.formCard}>
          <Text style={styles.formTitle}>Teklif Bilgileri</Text>

          {/* Amount Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Teklif Tutarı (₺) <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.amount && styles.inputError]}
              placeholder="Örn: 2500"
              value={amount}
              onChangeText={(text) => {
                setAmount(text.replace(/[^0-9.]/g, ''));
                if (errors.amount) setErrors({ ...errors, amount: '' });
              }}
              keyboardType="numeric"
              placeholderTextColor={colors.textLight}
            />
            {errors.amount && <Text style={styles.errorText}>{errors.amount}</Text>}
          </View>

          {/* Duration Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Tahmini Süre (Saat) <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.estimatedDuration && styles.inputError]}
              placeholder="Örn: 4"
              value={estimatedDuration}
              onChangeText={(text) => {
                setEstimatedDuration(text.replace(/[^0-9.]/g, ''));
                if (errors.estimatedDuration)
                  setErrors({ ...errors, estimatedDuration: '' });
              }}
              keyboardType="numeric"
              placeholderTextColor={colors.textLight}
            />
            {errors.estimatedDuration && (
              <Text style={styles.errorText}>{errors.estimatedDuration}</Text>
            )}
          </View>

          {/* Start Date Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tahmini Başlangıç Tarihi</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD (Opsiyonel)"
              value={estimatedStartDate}
              onChangeText={setEstimatedStartDate}
              placeholderTextColor={colors.textLight}
            />
            <Text style={styles.hintText}>
              İsteğe bağlı: İşe başlayabileceğiniz tarihi belirtin
            </Text>
          </View>

          {/* Message Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Mesajınız <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.textArea,
                errors.message && styles.inputError,
              ]}
              placeholder="Teklifiniz hakkında detaylı bilgi verin..."
              value={message}
              onChangeText={(text) => {
                setMessage(text);
                if (errors.message) setErrors({ ...errors, message: '' });
              }}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              placeholderTextColor={colors.textLight}
            />
            {errors.message && <Text style={styles.errorText}>{errors.message}</Text>}
            <Text style={styles.hintText}>
              {message.length}/500 karakter (Minimum 10 karakter)
            </Text>
          </View>
        </Card>

        {/* Submit Button */}
        <Button
          title={isLoading ? 'Gönderiliyor...' : 'Teklifi Gönder'}
          onPress={handleSubmit}
          variant="primary"
          fullWidth
          disabled={isLoading}
          style={styles.submitButton}
        />

        {/* Info Card */}
        <Card style={styles.infoCard}>
          <Text style={styles.infoTitle}>💡 İpucu</Text>
          <Text style={styles.infoText}>
            • Rekabetçi ama gerçekçi bir fiyat belirleyin{'\n'}
            • İşi tamamlamak için gereken süreyi doğru tahmin edin{'\n'}
            • Mesajınızda deneyiminizi ve yaklaşımınızı belirtin
          </Text>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundLight,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.screenPadding,
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.backgroundLight,
  },
  loadingText: {
    ...typography.body2,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  jobCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  jobTitle: {
    ...typography.h5,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  jobDescription: {
    ...typography.body2,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  budgetInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  budgetLabel: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  budgetValue: {
    ...typography.h6,
    color: colors.primary,
    fontWeight: '700',
  },
  formCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  formTitle: {
    ...typography.h5,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.body2,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  required: {
    color: colors.error,
  },
  input: {
    ...typography.body1,
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48,
  },
  textArea: {
    ...typography.body1,
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: spacing.radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 120,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
  hintText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  submitButton: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  infoCard: {
    padding: spacing.md,
    backgroundColor: colors.infoLight + '20',
    borderLeftWidth: 4,
    borderLeftColor: colors.info,
  },
  infoTitle: {
    ...typography.h6,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  infoText: {
    ...typography.body2,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});

