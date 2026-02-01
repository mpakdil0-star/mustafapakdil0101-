import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { fonts } from '../../constants/typography';
import { spacing } from '../../constants/spacing';
import { useAppColors } from '../../hooks/useAppColors';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import { Button } from '../../components/common/Button';
import api from '../../services/api';

interface ReportReason {
    value: string;
    label: string;
}

const REPORT_REASONS: ReportReason[] = [
    { value: 'FRAUD', label: 'Dolandırıcılık' },
    { value: 'HARASSMENT', label: 'Taciz / Rahatsız Edici Davranış' },
    { value: 'NO_SHOW', label: 'Randevuya Gelmedi' },
    { value: 'UNPROFESSIONAL', label: 'Profesyonel Olmayan Davranış' },
    { value: 'FAKE_PROFILE', label: 'Sahte Profil' },
    { value: 'SPAM', label: 'Spam / İstenmeyen Mesaj' },
    { value: 'INAPPROPRIATE_CONTENT', label: 'Uygunsuz İçerik' },
    { value: 'OTHER', label: 'Diğer' }
];

export default function ReportScreen() {
    const router = useRouter();
    const appColors = useAppColors();
    const { userId, userName, jobId } = useLocalSearchParams<{
        userId: string;
        userName?: string;
        jobId?: string
    }>();

    const [selectedReason, setSelectedReason] = useState<string | null>(null);
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!selectedReason) {
            Alert.alert('Uyarı', 'Lütfen bir şikayet sebebi seçin');
            return;
        }

        if (description.trim().length < 20) {
            Alert.alert('Uyarı', 'Lütfen en az 20 karakterlik bir açıklama yazın');
            return;
        }

        setIsSubmitting(true);

        try {
            await api.post('/reports', {
                reportedId: userId,
                jobId: jobId || null,
                reason: selectedReason,
                description: description.trim()
            });

            Alert.alert(
                'Başarılı',
                'Şikayetiniz başarıyla gönderildi. En kısa sürede incelenecektir.',
                [{ text: 'Tamam', onPress: () => router.back() }]
            );
        } catch (error: any) {
            console.error('🚨 Report Error:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            Alert.alert(
                'Hata',
                error.response?.data?.message || 'Şikayet gönderilemedi. Lütfen tekrar deneyin.'
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <View style={styles.container}>
            <PremiumHeader
                title="Kullanıcıyı Şikayet Et"
                subtitle={userName ? `${userName}` : 'Şikayet Formu'}
                showBackButton
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Info Card */}
                <View style={styles.infoCard}>
                    <Ionicons name="shield-checkmark-outline" size={24} color={appColors.primary} />
                    <Text style={styles.infoText}>
                        Şikayetleriniz gizli tutulur ve en kısa sürede ekibimiz tarafından incelenir.
                    </Text>
                </View>

                {/* Reason Selection */}
                <Text style={styles.sectionTitle}>Şikayet Sebebi</Text>
                <View style={styles.reasonContainer}>
                    {REPORT_REASONS.map((reason) => (
                        <TouchableOpacity
                            key={reason.value}
                            style={[
                                styles.reasonItem,
                                selectedReason === reason.value && {
                                    borderColor: appColors.primary,
                                    backgroundColor: appColors.primary + '10'
                                }
                            ]}
                            onPress={() => setSelectedReason(reason.value)}
                            activeOpacity={0.7}
                        >
                            <View style={[
                                styles.radioOuter,
                                selectedReason === reason.value && { borderColor: appColors.primary }
                            ]}>
                                {selectedReason === reason.value && (
                                    <View style={[styles.radioInner, { backgroundColor: appColors.primary }]} />
                                )}
                            </View>
                            <Text style={[
                                styles.reasonText,
                                selectedReason === reason.value && { color: appColors.primary, fontFamily: fonts.bold }
                            ]}>
                                {reason.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Description */}
                <Text style={styles.sectionTitle}>Açıklama</Text>
                <TextInput
                    style={styles.textArea}
                    placeholder="Şikayetinizi detaylı olarak açıklayın... (en az 20 karakter)"
                    placeholderTextColor={colors.textLight}
                    multiline
                    numberOfLines={5}
                    value={description}
                    onChangeText={setDescription}
                    textAlignVertical="top"
                />
                <Text style={styles.charCount}>{description.length}/500</Text>

                {/* Submit Button */}
                <Button
                    title={isSubmitting ? 'Gönderiliyor...' : 'Şikayeti Gönder'}
                    onPress={handleSubmit}
                    disabled={isSubmitting || !selectedReason || description.length < 20}
                    style={styles.submitButton}
                />

                {/* Disclaimer */}
                <Text style={styles.disclaimer}>
                    Yanlış veya kötü niyetli şikayetler hesap askıya alınmasına neden olabilir.
                </Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC'
    },
    scrollView: {
        flex: 1
    },
    content: {
        padding: spacing.lg,
        paddingBottom: 40
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        padding: 16,
        borderRadius: 16,
        gap: 12,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    infoText: {
        flex: 1,
        fontFamily: fonts.medium,
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 20
    },
    sectionTitle: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: colors.text,
        marginBottom: 12
    },
    reasonContainer: {
        gap: 8,
        marginBottom: 24
    },
    reasonItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        gap: 12
    },
    radioOuter: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: '#CBD5E1',
        alignItems: 'center',
        justifyContent: 'center'
    },
    radioInner: {
        width: 12,
        height: 12,
        borderRadius: 6
    },
    reasonText: {
        fontFamily: fonts.medium,
        fontSize: 15,
        color: colors.text,
        flex: 1
    },
    textArea: {
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: 16,
        fontFamily: fonts.regular,
        fontSize: 15,
        color: colors.text,
        minHeight: 120,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 8
    },
    charCount: {
        fontFamily: fonts.medium,
        fontSize: 12,
        color: colors.textLight,
        textAlign: 'right',
        marginBottom: 24
    },
    submitButton: {
        marginBottom: 16
    },
    disclaimer: {
        fontFamily: fonts.medium,
        fontSize: 12,
        color: colors.textLight,
        textAlign: 'center',
        lineHeight: 18
    }
});
