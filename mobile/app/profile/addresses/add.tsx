import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { colors } from '../../../constants/colors';
import { spacing } from '../../../constants/spacing';

export default function AddAddressScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState('');
    const [city, setCity] = useState('');
    const [district, setDistrict] = useState('');
    const [neighborhood, setNeighborhood] = useState('');
    const [details, setDetails] = useState('');

    const handleSave = () => {
        if (!title || !city || !district || !details) {
            Alert.alert('Hata', 'Lütfen zorunlu alanları doldurunuz.');
            return;
        }

        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            setLoading(false);
            Alert.alert('Başarılı', 'Adres başarıyla kaydedildi.', [
                { text: 'Tamam', onPress: () => router.back() }
            ]);
        }, 1000);
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
        >
            <Card style={styles.card}>
                <Input
                    label="Adres Başlığı (Örn: Ev, İş)"
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Adres başlığı giriniz"
                    containerStyle={styles.input}
                />

                <Input
                    label="İl"
                    value={city}
                    onChangeText={setCity}
                    placeholder="İstanbul"
                    containerStyle={styles.input}
                />

                <Input
                    label="İlçe"
                    value={district}
                    onChangeText={setDistrict}
                    placeholder="Kadıköy"
                    containerStyle={styles.input}
                />

                <Input
                    label="Mahalle"
                    value={neighborhood}
                    onChangeText={setNeighborhood}
                    placeholder="Caferağa"
                    containerStyle={styles.input}
                />

                <Input
                    label="Açık Adres"
                    value={details}
                    onChangeText={setDetails}
                    placeholder="Cadde, sokak, bina no..."
                    multiline
                    numberOfLines={3}
                    containerStyle={styles.input}
                />

                <Button
                    title="Kaydet"
                    onPress={handleSave}
                    loading={loading}
                    style={styles.button}
                />
            </Card>
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
    },
    input: {
        marginBottom: spacing.md,
    },
    button: {
        marginTop: spacing.sm,
    },
});
