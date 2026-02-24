import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform, Text, TouchableOpacity, Modal } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Card } from '../../../components/common/Card';
import { Button } from '../../../components/common/Button';
import { Picker } from '../../../components/common/Picker';
import { colors as staticColors } from '../../../constants/colors';
import { spacing } from '../../../constants/spacing';
import { fonts, typography } from '../../../constants/typography';
import { CITY_NAMES, getDistrictsByCity } from '../../../constants/locations';
import apiClient from '../../../services/api';
import { API_ENDPOINTS } from '../../../constants/api';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppColors } from '../../../hooks/useAppColors';

import { PremiumHeader } from '../../../components/common/PremiumHeader';

export default function AddAddressScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [city, setCity] = useState('');
    const [selectedDistricts, setSelectedDistricts] = useState<string[]>([]);
    const [availableDistricts, setAvailableDistricts] = useState<string[]>([]);
    const colors = useAppColors();

    // Modal states
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showWarningModal, setShowWarningModal] = useState(false);
    const [warningMessage, setWarningMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        if (city) {
            const districts = getDistrictsByCity(city);
            setAvailableDistricts(districts);
            setSelectedDistricts([]);
        } else {
            setAvailableDistricts([]);
            setSelectedDistricts([]);
        }
    }, [city]);

    const toggleDistrict = (district: string) => {
        setSelectedDistricts(prev => {
            if (prev.includes(district)) {
                return prev.filter(d => d !== district);
            } else {
                return [...prev, district];
            }
        });
    };

    const selectAllDistricts = () => {
        if (selectedDistricts.length === availableDistricts.length) {
            setSelectedDistricts([]);
        } else {
            setSelectedDistricts([...availableDistricts]);
        }
    };

    const showValidationError = (message: string) => {
        setWarningMessage(message);
        setShowWarningModal(true);
    };

    const handleSave = async () => {
        if (!city) {
            showValidationError('Lütfen bir şehir seçiniz.');
            return;
        }

        if (selectedDistricts.length === 0) {
            showValidationError('Lütfen en az bir ilçe seçiniz.');
            return;
        }

        setLoading(true);
        try {
            // Save each district as a separate location
            const promises = selectedDistricts.map(district =>
                apiClient.post(API_ENDPOINTS.LOCATIONS, {
                    city,
                    district,
                    neighborhood: '',
                    details: `${city} - ${district}`,
                    isDefault: false
                })
            );

            await Promise.all(promises);

            setSuccessMessage(`${selectedDistricts.length} bölge başarıyla kaydedildi.`);
            setShowSuccessModal(true);
        } catch (error: any) {
            console.error('Failed to add locations:', error);
            showValidationError(error.response?.data?.error?.message || 'Bölgeler kaydedilemedi. Lütfen tekrar deneyin.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <PremiumHeader title="Yeni Bölge Ekle" showBackButton />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <Card variant="default" style={[styles.card, { shadowColor: colors.primary }]}>
                    <View style={styles.headerInfo}>
                        <View style={[styles.iconCircle, { backgroundColor: colors.primary + '10' }]}>
                            <Ionicons name="location" size={24} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.headerTitle}>Hizmet Alanı Belirleyin</Text>
                            <Text style={styles.headerSubtitle}>Şehir seçin ve hizmet vereceğiniz ilçeleri işaretleyin.</Text>
                        </View>
                    </View>

                    <View style={styles.formSection}>
                        <Picker
                            label="İl"
                            value={city}
                            options={CITY_NAMES}
                            onValueChange={setCity}
                            placeholder="Şehir Seçiniz"
                            required
                        />

                        {city && (
                            <View style={styles.districtsSection}>
                                <View style={styles.districtsSectionHeader}>
                                    <Text style={styles.districtsSectionTitle}>İlçe Seçimi</Text>
                                    <TouchableOpacity
                                        onPress={selectAllDistricts}
                                        style={[styles.selectAllBtn, { backgroundColor: colors.primary + '10' }]}
                                    >
                                        <Text style={[styles.selectAllBtnText, { color: colors.primary }]}>
                                            {selectedDistricts.length === availableDistricts.length ? 'Tümünü Kaldır' : 'Tümünü Seç'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                {selectedDistricts.length > 0 && (
                                    <View style={[styles.selectedCountBadge, { backgroundColor: staticColors.success + '10' }]}>
                                        <Ionicons name="checkmark-circle" size={14} color={staticColors.success} />
                                        <Text style={[styles.selectedCountText, { color: staticColors.success }]}>{selectedDistricts.length} ilçe seçildi</Text>
                                    </View>
                                )}

                                <View style={styles.districtsGrid}>
                                    {availableDistricts.map((dist) => {
                                        const isSelected = selectedDistricts.includes(dist);
                                        return (
                                            <TouchableOpacity
                                                key={dist}
                                                style={[
                                                    styles.districtChip,
                                                    isSelected && [styles.districtChipSelected, { backgroundColor: colors.primary, borderColor: colors.primary, shadowColor: colors.primary }]
                                                ]}
                                                onPress={() => toggleDistrict(dist)}
                                                activeOpacity={0.7}
                                            >
                                                {isSelected && (
                                                    <Ionicons name="checkmark-circle" size={14} color={staticColors.white} style={{ marginRight: 4 }} />
                                                )}
                                                <Text style={[
                                                    styles.districtChipText,
                                                    isSelected && [styles.districtChipTextSelected, { color: staticColors.white }]
                                                ]}>{dist}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>
                        )}

                        {!city && (
                            <View style={styles.emptyStateContainer}>
                                <Ionicons name="map-outline" size={48} color={staticColors.textLight + '50'} />
                                <Text style={styles.emptyStateText}>Önce bir şehir seçin</Text>
                            </View>
                        )}
                    </View>

                    <Button
                        title={`${selectedDistricts.length > 0 ? `${selectedDistricts.length} Bölgeyi Kaydet` : 'Bölgeyi Kaydet'}`}
                        onPress={handleSave}
                        loading={loading}
                        style={styles.button}
                        fullWidth
                        disabled={!city || selectedDistricts.length === 0}
                    />
                </Card>
            </ScrollView>

            <Modal visible={showSuccessModal} transparent animationType="fade">
                <View style={[styles.modalOverlay, { backgroundColor: 'rgba(15, 23, 42, 0.85)' }]}>
                    <LinearGradient
                        colors={['rgba(30, 41, 59, 0.98)', 'rgba(15, 23, 42, 0.95)']}
                        style={[styles.modal, { borderColor: 'rgba(255,255,255,0.1)' }]}
                    >
                        <View style={styles.iconWrapper}>
                            <View style={[styles.iconGlow, { backgroundColor: staticColors.success }]} />
                            <LinearGradient
                                colors={[staticColors.success, staticColors.successDark || '#059669']}
                                style={styles.iconBox}
                            >
                                <Ionicons name="checkmark" size={32} color={staticColors.white} />
                            </LinearGradient>
                        </View>

                        <Text style={[styles.modalTitle, { color: staticColors.white }]}>Başarılı!</Text>
                        <Text style={[styles.modalMessage, { color: 'rgba(255,255,255,0.6)' }]}>{successMessage}</Text>

                        <TouchableOpacity
                            style={[styles.modalBtn, { shadowColor: colors.primary }]}
                            onPress={() => {
                                setShowSuccessModal(false);
                                router.back();
                            }}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={[colors.primary, colors.primaryDark]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.modalBtnGradient}
                            >
                                <Text style={[styles.modalBtnText, { color: staticColors.white }]}>Tamam</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </LinearGradient>
                </View>
            </Modal>

            {/* Warning Modal - Glass Glow Design */}
            <Modal visible={showWarningModal} transparent animationType="fade">
                <View style={[styles.modalOverlay, { backgroundColor: 'rgba(15, 23, 42, 0.85)' }]}>
                    <LinearGradient
                        colors={['rgba(30, 41, 59, 0.98)', 'rgba(15, 23, 42, 0.95)']}
                        style={[styles.modal, { borderColor: 'rgba(255,255,255,0.1)' }]}
                    >
                        <View style={styles.iconWrapper}>
                            <View style={[styles.iconGlow, { backgroundColor: staticColors.warning }]} />
                            <LinearGradient
                                colors={[staticColors.warning, staticColors.warningDark || '#D97706']}
                                style={styles.iconBox}
                            >
                                <Ionicons name="alert" size={32} color={staticColors.white} />
                            </LinearGradient>
                        </View>

                        <Text style={[styles.modalTitle, { color: staticColors.white }]}>Uyarı</Text>
                        <Text style={[styles.modalMessage, { color: 'rgba(255,255,255,0.6)' }]}>{warningMessage}</Text>

                        <TouchableOpacity
                            style={[styles.modalBtn, { shadowColor: colors.primary }]}
                            onPress={() => setShowWarningModal(false)}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={[colors.primary, colors.primaryDark]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.modalBtnGradient}
                            >
                                <Text style={[styles.modalBtnText, { color: staticColors.white }]}>Anladım</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </LinearGradient>
                </View>
            </Modal>
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
        shadowOpacity: 0.05,
        shadowRadius: 15,
        elevation: 4,
    },
    headerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    headerTitle: {
        fontFamily: fonts.bold,
        fontSize: 18,
        color: staticColors.text,
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontFamily: fonts.medium,
        fontSize: 12,
        color: staticColors.textSecondary,
        marginTop: 2,
    },
    formSection: {
        marginTop: 0,
    },
    iconCircle: {
        width: 52,
        height: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    districtsSection: {
        marginTop: 20,
    },
    districtsSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    districtsSectionTitle: {
        fontFamily: fonts.bold,
        fontSize: 15,
        color: staticColors.text,
    },
    selectAllBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    selectAllBtnText: {
        fontFamily: fonts.bold,
        fontSize: 12,
    },
    selectedCountBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 12,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        alignSelf: 'flex-start',
    },
    selectedCountText: {
        fontFamily: fonts.medium,
        fontSize: 13,
    },
    districtsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    districtChip: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 14,
        backgroundColor: '#F1F5F9',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        flexDirection: 'row',
        alignItems: 'center',
    },
    districtChipSelected: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 3,
    },
    districtChipText: {
        fontFamily: fonts.medium,
        fontSize: 13,
        color: staticColors.textSecondary,
    },
    districtChipTextSelected: {
        fontFamily: fonts.bold,
    },
    emptyStateContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        gap: 12,
    },
    emptyStateText: {
        fontFamily: fonts.medium,
        fontSize: 14,
        color: staticColors.textLight,
    },
    button: {
        marginTop: 24,
    },
    // Modal Styles - Glass Glow Design
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modal: {
        width: '100%',
        borderRadius: 32,
        padding: 32,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.5)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.2,
        shadowRadius: 30,
        elevation: 20,
    },
    iconWrapper: {
        width: 80,
        height: 80,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    iconGlow: {
        position: 'absolute',
        width: 60,
        height: 60,
        borderRadius: 30,
        opacity: 0.2,
        transform: [{ scale: 1.5 }],
    },
    iconBox: {
        width: 64,
        height: 64,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    modalTitle: {
        fontFamily: fonts.extraBold,
        fontSize: 24,
        color: staticColors.text,
        marginBottom: 8,
    },
    modalMessage: {
        fontFamily: fonts.medium,
        fontSize: 15,
        color: staticColors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
        paddingHorizontal: 10,
    },
    modalBtn: {
        width: '100%',
        height: 54,
        borderRadius: 16,
        overflow: 'hidden',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
    },
    modalBtnGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalBtnText: {
        fontFamily: fonts.bold,
        fontSize: 16,
    },
});
