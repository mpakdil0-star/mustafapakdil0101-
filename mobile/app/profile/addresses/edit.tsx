import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { colors as staticColors } from '../../../constants/colors';
import { spacing } from '../../../constants/spacing';
import { useAppColors } from '../../../hooks/useAppColors';
import { PremiumHeader } from '../../../components/common/PremiumHeader';
import { PremiumAlert } from '../../../components/common/PremiumAlert';

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
    const colors = useAppColors();
    const [title, setTitle] = useState('');
    const [city, setCity] = useState('');
    const [district, setDistrict] = useState('');
    const [neighborhood, setNeighborhood] = useState('');
    const [details, setDetails] = useState('');

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

    useEffect(() => {
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
            showAlert('Hata', 'Lütfen zorunlu alanları doldurunuz.', 'error');
            return;
        }

        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            showAlert('Başarılı', 'Adres başarıyla güncellendi.', 'success', [
                { text: 'Tamam', onPress: () => router.back() }
            ]);
        }, 1000);
    };

    return (
        <View style={styles.container}>
            <PremiumHeader title="Adresi Düzenle" showBackButton />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <Card variant="default" style={[styles.card, { shadowColor: colors.primary }]}>
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
                        title="Değişiklikleri Kaydet"
                        onPress={handleSave}
                        loading={loading}
                        style={styles.button}
                        fullWidth
                    />
                </Card>
            </ScrollView>

            <PremiumAlert
                visible={alertConfig.visible}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                buttons={alertConfig.buttons}
                onClose={() => setAlertConfig((prev: any) => ({ ...prev, visible: false }))}
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
    },
    card: {
        borderRadius: 24,
        padding: 24,
        backgroundColor: staticColors.white,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 8,
    },
    input: {
        marginBottom: 16,
    },
    button: {
        marginTop: 8,
    },
});
