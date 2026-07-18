import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { colors as staticColors } from '../../../constants/colors';
import { spacing } from '../../../constants/spacing';
import { useAppColors } from '../../../hooks/useAppColors';
import { PremiumHeader } from '../../../components/common/PremiumHeader';
import { PremiumAlert } from '../../../components/common/PremiumAlert';
import locationService from '../../../services/locationService';

export default function EditAddressScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const colors = useAppColors();
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
        let cancelled = false;
        const loadAddress = async () => {
            if (!id) {
                showAlert('Hata', 'Düzenlenecek adres bulunamadı.', 'error');
                setInitialLoading(false);
                return;
            }
            try {
                const locations = await locationService.getSavedLocations();
                const selected = locations.find((location: any) => location.id === id);
                if (!selected) throw new Error('Adres bulunamadı veya silinmiş olabilir.');
                if (cancelled) return;
                setCity(selected.city || '');
                setDistrict(selected.district || '');
                setNeighborhood(selected.neighborhood || '');
                setDetails(selected.address || '');
            } catch (error: any) {
                if (!cancelled) showAlert('Hata', error?.message || 'Adres bilgileri yüklenemedi.', 'error');
            } finally {
                if (!cancelled) setInitialLoading(false);
            }
        };
        void loadAddress();
        return () => { cancelled = true; };
    }, [id]);

    const handleSave = async () => {
        if (!id || !city.trim() || !district.trim() || !details.trim()) {
            showAlert('Hata', 'Lütfen zorunlu alanları doldurunuz.', 'error');
            return;
        }

        setLoading(true);
        try {
            await locationService.updateSavedLocation(id, {
                city: city.trim(),
                district: district.trim(),
                neighborhood: neighborhood.trim(),
                address: details.trim(),
            });
            showAlert('Başarılı', 'Adres başarıyla güncellendi.', 'success', [
                { text: 'Tamam', onPress: () => router.back() }
            ]);
        } catch (error: any) {
            showAlert('Hata', error?.message || 'Adres güncellenemedi. Lütfen tekrar deneyin.', 'error');
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) {
        return (
            <View style={styles.container}>
                <PremiumHeader title="Adresi Düzenle" showBackButton />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </View>
        );
    }

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
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
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
