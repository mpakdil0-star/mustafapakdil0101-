import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppSelector } from '../../hooks/redux';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';

export default function EditProfileScreen() {
    const router = useRouter();
    const { user } = useAppSelector((state) => state.auth);

    const [fullName, setFullName] = useState(user?.fullName || '');
    const [email, setEmail] = useState(user?.email || '');
    const [phoneNumber, setPhoneNumber] = useState(user?.phone || '');
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!fullName || !email) {
            Alert.alert('Hata', 'Lütfen gerekli alanları doldurunuz.');
            return;
        }

        setLoading(true);
        // Simulating API call
        setTimeout(() => {
            setLoading(false);
            Alert.alert('Başarılı', 'Profil bilgileriniz güncellendi.', [
                { text: 'Tamam', onPress: () => router.back() }
            ]);
        }, 1500);
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            <Card style={styles.card}>
                <Input
                    label="Ad Soyad"
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Adınız ve Soyadınız"
                    autoCapitalize="words"
                    containerStyle={styles.input}
                />

                <Input
                    label="E-posta"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="ornek@email.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    containerStyle={styles.input}
                />

                <Input
                    label="Telefon Numarası"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    placeholder="0555 555 55 55"
                    keyboardType="phone-pad"
                    containerStyle={styles.input}
                />

                <Button
                    title="Kaydet"
                    onPress={handleSave}
                    loading={loading}
                    style={styles.button}
                />
            </Card>

            {user?.userType === 'ELECTRICIAN' && (
                <Card style={styles.infoCard}>
                    <Input
                        label="Uzmanlık Alanları"
                        value={(user as any)?.specialties?.length > 0
                            ? (user as any).specialties.join(', ')
                            : 'Henüz uzmanlık alanı seçilmedi'}
                        editable={false}
                        multiline
                        numberOfLines={3}
                    />
                    <Button
                        title="Uzmanlık Bilgilerini Düzenle"
                        variant="outline"
                        onPress={() => router.push('/profile/expertise')}
                        style={styles.button}
                    />
                </Card>
            )}
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
    infoCard: {
        padding: spacing.lg,
        marginBottom: spacing.md,
        backgroundColor: colors.background, // Slightly different 
    },
    input: {
        marginBottom: spacing.md,
    },
    button: {
        marginTop: spacing.sm,
    },
});
