import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { colors } from '../../../constants/colors';
import { spacing } from '../../../constants/spacing';

// Mock adres verisi (gerçek uygulamada API'den gelecek)
const MOCK_ADDRESS = {
    id: '1',
    title: 'Ev Adresim',
    city: 'İstanbul',
    district: 'Kadıköy',
    neighborhood: 'Caferağa',
    details: 'Moda Caddesi No:123 D:4',
};

export default function EditAddressScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState('');
    const [city, setCity] = useState('');
    const [district, setDistrict] = useState('');
    const [neighborhood, setNeighborhood] = useState('');
    const [details, setDetails] = useState('');

    // Mevcut adresi yükle
    useEffect(() => {
        // Gerçek uygulamada API'den çekilecek
        if (id) {
            setTitle(MOCK_ADDRESS.title);
            setCity(MOCK_ADDRESS.city);
            setDistrict(MOCK_ADDRESS.district);
            setNeighborhood(MOCK_ADDRESS.neighborhood);
            setDetails(MOCK_ADDRESS.details);
        }
    }, [id]);

    const handleSave = () => {
        if (!title || !city || !district || !details) {
            Alert.alert('Hata', 'Lütfen zorunlu alanları doldurunuz.');
            return;
        }

        setLoading(true);
        // Simulate API call
        setTimeout(() => {
            setLoading(false);
            Alert.alert('Başarılı', 'Adres başarıyla güncellendi.', [
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
                    label="Adres Başlığı"
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Örn: Ev, İş"
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
