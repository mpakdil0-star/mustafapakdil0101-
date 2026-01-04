import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Platform, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch } from '../../hooks/redux';
import { logout } from '../../store/slices/authSlice';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { colors as staticColors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';
import { useAppColors } from '../../hooks/useAppColors';
import api from '../../services/api';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import { PremiumAlert } from '../../components/common/PremiumAlert';

export default function SecurityScreen() {
    const router = useRouter();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const colors = useAppColors();
    const dispatch = useAppDispatch();

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

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            showAlert('Hata', 'Lütfen tüm alanları doldurunuz.', 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            showAlert('Hata', 'Yeni şifreler birbiriyle eşleşmiyor.', 'error');
            return;
        }

        if (newPassword.length < 6) {
            showAlert('Hata', 'Yeni şifreniz en az 6 karakter olmalıdır.', 'error');
            return;
        }

        setLoading(true);
        try {
            await api.put('/users/password', {
                currentPassword,
                newPassword
            });

            showAlert('Başarılı', 'Şifreniz başarıyla değiştirildi.', 'success', [
                { text: 'Tamam', onPress: () => router.back() }
            ]);
            // Clear fields
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            // Error is handled via UI alert below
            const message = error.response?.data?.error?.message || 'Şifre değiştirilemedi.';

            // Handle 401 Unauthorized inside Security Screen specifically
            if (error.response?.status === 401) {
                showAlert('Oturum Süresi Doldu', 'Güvenliğiniz için lütfen tekrar giriş yapın.', 'error', [
                    {
                        text: 'Giriş Yap', onPress: () => {
                            dispatch(logout());
                            router.replace('/(auth)/login');
                        }
                    }
                ]);
            } else {
                showAlert('Hata', message, 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <PremiumHeader title="Güvenlik Ayarları" showBackButton />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <View style={[styles.infoBox, { backgroundColor: colors.primary + '08', borderColor: colors.primary + '15' }]}>
                    <View style={[styles.infoIconWrapper, { backgroundColor: colors.primary + '15' }]}>
                        <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.infoTitle}>Hesap Güvenliği</Text>
                        <Text style={styles.description}>
                            Hesabınızı güvende tutmak için şifrenizi düzenli olarak güncelleyin ve güçlü bir şifre kullanın.
                        </Text>
                    </View>
                </View>

                <Card variant="default" style={styles.formCard}>
                    <Text style={styles.sectionTitle}>Şifre Değiştir</Text>

                    <Input
                        label="Mevcut Şifre"
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        placeholder="••••••••"
                        secureTextEntry
                        containerStyle={styles.input}
                        leftIcon={<Ionicons name="lock-closed-outline" size={20} color={staticColors.textLight} />}
                    />

                    <Input
                        label="Yeni Şifre"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        placeholder="••••••••"
                        secureTextEntry
                        containerStyle={styles.input}
                        leftIcon={<Ionicons name="key-outline" size={20} color={staticColors.textLight} />}
                    />

                    <Input
                        label="Yeni Şifre (Tekrar)"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder="••••••••"
                        secureTextEntry
                        containerStyle={styles.input}
                        leftIcon={<Ionicons name="checkmark-circle-outline" size={20} color={staticColors.textLight} />}
                    />

                    <Button
                        title="Şifreyi Güncelle"
                        onPress={handleChangePassword}
                        loading={loading}
                        variant="primary"
                        fullWidth
                        style={styles.saveButton}
                    />
                </Card>



                <Card variant="default" style={[styles.featureCard, { marginTop: 12 }]}>
                    <TouchableOpacity style={styles.featureRow} onPress={() => {
                        showAlert(
                            'Hesabı Sil',
                            'Hesabınızı silmek istediğinize emin misiniz? Bu işlem geri alınamaz ve tüm verileriniz silinir.',
                            'confirm',
                            [
                                { text: 'Vazgeç', onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })), variant: 'ghost' },
                                {
                                    text: 'Sil',
                                    variant: 'danger',
                                    onPress: async () => {
                                        try {
                                            setAlertConfig(prev => ({ ...prev, visible: false }));
                                            setLoading(true);
                                            await api.delete('/users');
                                            showAlert('Başarılı', 'Hesabınız silindi.', 'success');
                                            setTimeout(() => {
                                                dispatch(logout());
                                                router.replace('/(auth)/login');
                                            }, 1500);
                                        } catch (err) {
                                            console.error('Delete account error:', err);
                                            dispatch(logout());
                                            router.replace('/(auth)/login');
                                        } finally {
                                            setLoading(false);
                                        }
                                    }
                                }
                            ]
                        );
                    }}>
                        <View style={[styles.featureIconWrapper, { backgroundColor: staticColors.error + '10' }]}>
                            <Ionicons name="trash-outline" size={22} color={staticColors.error} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.featureTitle, { color: staticColors.error }]}>Hesabımı Sil</Text>
                            <Text style={styles.featureDesc}>Tüm verileriniz kalıcı olarak silinir.</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color={staticColors.textLight} />
                    </TouchableOpacity>
                </Card>
            </ScrollView>

            <PremiumAlert
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                buttons={alertConfig.buttons}
                onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: spacing.lg,
        paddingBottom: 40,
    },
    infoBox: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 20,
        marginBottom: 24,
        gap: 12,
        borderWidth: 1,
    },
    infoIconWrapper: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoTitle: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: staticColors.text,
        marginBottom: 4,
    },
    description: {
        fontFamily: fonts.medium,
        fontSize: 13,
        color: staticColors.textSecondary,
        lineHeight: 18,
    },
    formCard: {
        padding: 20,
        borderRadius: 24,
        backgroundColor: staticColors.white,
        marginBottom: 20,
    },
    sectionTitle: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: staticColors.text,
        marginBottom: 20,
    },
    input: {
        marginBottom: 16,
    },
    saveButton: {
        marginTop: 8,
    },
    featureCard: {
        padding: 16,
        borderRadius: 20,
        backgroundColor: staticColors.white,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    featureIconWrapper: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    featureTitle: {
        fontFamily: fonts.bold,
        fontSize: 15,
        color: staticColors.textSecondary,
    },
    featureDesc: {
        fontFamily: fonts.medium,
        fontSize: 12,
        color: staticColors.textLight,
    },
});
