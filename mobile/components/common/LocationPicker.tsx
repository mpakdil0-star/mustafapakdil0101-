import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
    Modal,
} from 'react-native';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';
import locationService, { LocationData } from '../../services/locationService';

interface LocationPickerProps {
    onLocationSelected: (location: LocationData) => void;
    initialLocation?: { latitude: number; longitude: number };
}

const LocationPicker: React.FC<LocationPickerProps> = ({
    onLocationSelected,
    initialLocation,
}) => {
    const [selectedLocation, setSelectedLocation] = useState<LocationData>(
        initialLocation || { latitude: 41.0082, longitude: 28.9784 }
    );
    const [addressPreview, setAddressPreview] = useState<string>('Konum seçiliyor...');
    const [isLoading, setIsLoading] = useState(false);
    const [alertVisible, setAlertVisible] = useState(false);

    const updateLocation = async (lat: number, lng: number) => {
        setIsLoading(true);
        setSelectedLocation({ latitude: lat, longitude: lng });

        try {
            const data = await locationService.reverseGeocode(lat, lng);
            if (data) {
                // Sadece Şehir bilgisini göster ve gönder (Kullanıcı isteği: İlçe hatalı gelebiliyor)
                setAddressPreview(data.city || 'Şehir belirlenemedi');

                // Sadece şehri gönderiyoruz, ilçe temiz kalıyor ki kullanıcı seçsin
                onLocationSelected({
                    latitude: lat,
                    longitude: lng,
                    city: data.city,
                    address: '', // Adresi de temizliyoruz daha temiz bir başlangıç için
                });
            }
        } catch (error) {
            console.error('Reverse geocode error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const requestLocation = async () => {
        setIsLoading(true);
        try {
            const hasPermission = await locationService.requestPermissions();
            if (!hasPermission) {
                setAlertVisible(true);
                return;
            }

            const location = await locationService.getCurrentLocation();
            if (location) {
                updateLocation(location.latitude, location.longitude);
            }
        } catch (error) {
            console.error('Location request error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (initialLocation) {
            // Prevent infinite loop: only update if coordinates actually changed
            if (
                initialLocation.latitude !== selectedLocation.latitude ||
                initialLocation.longitude !== selectedLocation.longitude
            ) {
                updateLocation(initialLocation.latitude, initialLocation.longitude);
            }
        }
    }, [initialLocation]);

    return (
        <View style={styles.container}>
            <View style={styles.addressBox}>
                <View style={[styles.iconCircleSmall, { backgroundColor: colors.primary + '15' }]}>
                    <Ionicons name="location" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.addressLabel}>Belirlenen Konum</Text>
                    <Text style={styles.addressText} numberOfLines={2}>
                        {addressPreview}
                    </Text>
                </View>
                <TouchableOpacity
                    style={[styles.refreshButton, { backgroundColor: colors.primary + '10' }]}
                    onPress={requestLocation}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                        <Ionicons name="locate" size={20} color={colors.primary} />
                    )}
                </TouchableOpacity>
            </View>
            <Text style={styles.hintText}>Konumunuz profil bilgilerinizden veya GPS üzerinden otomatik alınır.</Text>

            {/* Custom Themed Permission Modal */}
            <Modal
                visible={alertVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setAlertVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <LinearGradient
                        colors={['rgba(30, 41, 59, 0.98)', 'rgba(15, 23, 42, 0.95)']}
                        style={styles.alertBox}
                    >
                        <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
                            <Ionicons name="location-outline" size={40} color={colors.primary} />
                        </View>

                        <Text style={styles.alertTitle}>Konum İzni Gerekli</Text>
                        <Text style={styles.alertMessage}>
                            Size en yakın elektrikçileri bulabilmemiz ve adresi otomatik doldurabilmemiz için konum izni vermeniz gerekiyor.
                        </Text>

                        <View style={styles.btnRow}>
                            <TouchableOpacity
                                style={[styles.alertBtn, styles.btnSecondary]}
                                onPress={() => setAlertVisible(false)}
                            >
                                <Text style={styles.btnTextSecondary}>İptal</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.alertBtn, { backgroundColor: colors.primary }]}
                                onPress={async () => {
                                    setAlertVisible(false);
                                    const success = await locationService.requestPermissions();
                                    if (success) {
                                        requestLocation();
                                    }
                                }}
                            >
                                <Text style={styles.btnTextPrimary}>İzin Ver</Text>
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: spacing.md,
    },
    addressBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.white,
        padding: spacing.md,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    iconCircleSmall: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    addressLabel: {
        fontFamily: fonts.bold,
        fontSize: 10,
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    addressText: {
        fontFamily: fonts.semiBold,
        fontSize: 13,
        color: colors.text,
    },
    refreshButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    hintText: {
        fontFamily: fonts.medium,
        fontSize: 11,
        color: colors.textSecondary,
        marginTop: 8,
        paddingHorizontal: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    alertBox: {
        width: '100%',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    alertTitle: {
        fontFamily: fonts.bold,
        fontSize: 20,
        color: '#fff',
        marginBottom: 8,
    },
    alertMessage: {
        fontFamily: fonts.regular,
        fontSize: 14,
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    btnRow: {
        flexDirection: 'row',
        gap: 12,
    },
    alertBtn: {
        flex: 1,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    btnSecondary: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    btnTextPrimary: {
        fontFamily: fonts.bold,
        fontSize: 15,
        color: '#fff',
    },
    btnTextSecondary: {
        fontFamily: fonts.bold,
        fontSize: 15,
        color: 'rgba(255,255,255,0.6)',
    },
});

export default LocationPicker;
