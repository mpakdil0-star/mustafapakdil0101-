import React, { useState } from 'react';
import { StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { apiService } from '../../services/api';

export default function SecurityScreen() {
    const router = useRouter();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            Alert.alert('Hata', 'Lütfen tüm alanları doldurunuz.');
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert('Hata', 'Yeni şifreler birbiriyle eşleşmiyor.');
            return;
        }

        if (newPassword.length < 6) {
            Alert.alert('Hata', 'Yeni şifreniz en az 6 karakter olmalıdır.');
            return;
        }

        setLoading(true);
        try {
            await apiService.changePassword(currentPassword, newPassword);
            Alert.alert('Başarılı', 'Şifreniz başarıyla değiştirildi.', [
                { text: 'Tamam', onPress: () => router.back() }
            ]);
            // Clear fields
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            const message = error.response?.data?.error?.message || 'Şifre değiştirilemedi.';
            Alert.alert('Hata', message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
        >
            <Card style={styles.card}>
                <Input
                    label="Mevcut Şifre"
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder="******"
                    secureTextEntry
                    containerStyle={styles.input}
                />

                <Input
                    label="Yeni Şifre"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="******"
                    secureTextEntry
                    containerStyle={styles.input}
                />

                <Input
                    label="Yeni Şifre (Tekrar)"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="******"
                    secureTextEntry
                    containerStyle={styles.input}
                />

                <Button
                    title="Şifreyi Güncelle"
                    onPress={handleChangePassword}
                    loading={loading}
                    style={styles.button}
                />
            </Card>

            <Button
                title="İki Faktörlü Doğrulama (Yakında)"
                variant="outline"
                disabled
                onPress={() => { }}
                style={styles.featureButton}
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.backgroundLight,
    },
    content: {
        padding: spacing.md,
    },
    card: {
        padding: spacing.lg,
        marginBottom: spacing.md,
    },
    input: {
        marginBottom: spacing.md,
    },
    button: {
        marginTop: spacing.sm,
    },
    featureButton: {
        marginTop: spacing.sm,
        opacity: 0.7,
    },
});
