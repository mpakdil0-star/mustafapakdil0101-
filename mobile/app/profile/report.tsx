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
    const [blockUser, setBlockUser] = useState(false);

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

            // Eğer engelleme seçilmişse engelle
            if (blockUser) {
                try {
                    await api.post('/blocks/toggle', { blockedId: userId });
                } catch (blockErr) {
                    console.error('⚠️ Block failed during report:', blockErr);
                    // Ana rapor başarılı olduğu için blok hatası kritik değil, sadece logla
                }
            }

            Alert.alert(
                'Başarılı',
                blockUser
                    ? 'Şikayetiniz gönderildi ve kullanıcı engellendi.'
                    : 'Şikayetiniz başarıyla gönderildi. En kısa sürede incelenecektir.',
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
                    numberOfLines={4}
                    value={description}
                    onChangeText={setDescription}
                    textAlignVertical="top"
                />
                <Text style={styles.charCount}>{description.length}/500</Text>

                {/* Block Option */}
                <TouchableOpacity
                    style={[
                        styles.blockOption,
                        blockUser && { backgroundColor: '#EF444408', borderColor: '#EF444440' }
                    ]}
                    onPress={() => setBlockUser(!blockUser)}
                    activeOpacity={0.7}
                >
                    <View style={[
                        styles.checkbox,
                        blockUser && { backgroundColor: '#EF4444', borderColor: '#EF4444' }
                    ]}>
                        {blockUser && <Ionicons name="checkmark" size={14} color={colors.white} />}
                    </View>
                    <View style={styles.blockOptionTextContainer}>
                        <Text style={[styles.blockOptionTitle, blockUser && { color: '#EF4444' }]}>Bu kullanıcıyı engelle</Text>
                        <Text style={styles.blockOptionSub}>Bu kullanıcıyı engellediğinizde birbirinizin ilanlarını ve mesajlarını görmezsiniz.</Text>
                    </View>
                </TouchableOpacity>

                {/* Submit Button */}
                <View style={styles.actionContainer}>
                    <Button
                        title={isSubmitting ? 'Gönderiliyor...' : 'Şikayeti Gönder'}
                        onPress={handleSubmit}
                        disabled={isSubmitting || !selectedReason || description.length < 20}
                        style={styles.submitButton}
                        variant="primary"
                    />

                    {/* Disclaimer */}
                    <Text style={styles.disclaimer}>
                        Yanlış veya kötü niyetli şikayetler hesaba işlem yapılmasına neden olabilir.
                    </Text>
                </View>
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
        padding: 16,
        paddingBottom: 40
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        padding: 12,
        borderRadius: 12,
        gap: 10,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    infoText: {
        flex: 1,
        fontFamily: fonts.medium,
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 18
    },
    sectionTitle: {
        fontFamily: fonts.bold,
        fontSize: 14,
        color: colors.text,
        marginBottom: 8
    },
    reasonContainer: {
        gap: 6,
        marginBottom: 16
    },
    reasonItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 10
    },
    radioOuter: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 1.5,
        borderColor: '#CBD5E1',
        alignItems: 'center',
        justifyContent: 'center'
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5
    },
    reasonText: {
        fontFamily: fonts.medium,
        fontSize: 14,
        color: colors.text,
        flex: 1
    },
    textArea: {
        backgroundColor: colors.white,
        borderRadius: 12,
        padding: 12,
        fontFamily: fonts.regular,
        fontSize: 14,
        color: colors.text,
        height: 80,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 4
    },
    charCount: {
        fontFamily: fonts.medium,
        fontSize: 11,
        color: colors.textLight,
        textAlign: 'right',
        marginBottom: 16
    },
    blockOption: {
        flexDirection: 'row',
        backgroundColor: colors.white,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 16,
        gap: 10,
        alignItems: 'flex-start'
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 6,
        borderWidth: 1.5,
        borderColor: '#CBD5E1',
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 2
    },
    blockOptionTextContainer: {
        flex: 1
    },
    blockOptionTitle: {
        fontFamily: fonts.bold,
        fontSize: 14,
        color: colors.text,
        marginBottom: 2
    },
    blockOptionSub: {
        fontFamily: fonts.medium,
        fontSize: 11,
        color: colors.textSecondary,
        lineHeight: 16
    },
    actionContainer: {
        marginTop: 4
    },
    submitButton: {
        marginBottom: 12
    },
    disclaimer: {
        fontFamily: fonts.medium,
        fontSize: 11,
        color: colors.textLight,
        textAlign: 'center',
        lineHeight: 16
    }
});
