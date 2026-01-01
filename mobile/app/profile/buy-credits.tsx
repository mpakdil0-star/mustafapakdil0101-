import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    StatusBar,
    ActivityIndicator,
    Dimensions,
    Platform,
    Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors as staticColors } from '../../constants/colors';
import { fonts } from '../../constants/typography';
import { spacing } from '../../constants/spacing';
import { useAppColors } from '../../hooks/useAppColors';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import { Button } from '../../components/common/Button';
import { PremiumAlert } from '../../components/common/PremiumAlert';
import api from '../../services/api';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { getMe, updateCreditBalance } from '../../store/slices/authSlice';

const { width, height } = Dimensions.get('window');

interface CreditPackage {
    id: string;
    name: string;
    credits: number;
    price: number;
    color: string;
    isPopular?: boolean;
}

export default function BuyCreditsScreen() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [packages, setPackages] = useState<CreditPackage[]>([]);
    const [selectedPkg, setSelectedPkg] = useState<string | null>(null);
    const colors = useAppColors();

    // Alert State
    const [alertConfig, setAlertConfig] = useState<{
        visible: boolean;
        type: 'success' | 'error' | 'warning' | 'info' | 'confirm';
        title: string;
        message: string;
        buttons?: any[];
    }>({
        visible: false,
        type: 'info',
        title: '',
        message: ''
    });

    useEffect(() => {
        fetchPackages();
    }, []);

    const fetchPackages = async () => {
        try {
            setLoading(true);
            const response = await api.get('/payments/packages');
            if (response.data.success) {
                setPackages(response.data.data);
                const popular = response.data.data.find((p: any) => p.isPopular);
                if (popular) setSelectedPkg(popular.id);
            }
        } catch (error) {
            console.error('Packages fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePurchase = async () => {
        if (!selectedPkg) {
            setAlertConfig({
                visible: true,
                type: 'error',
                title: 'Hata',
                message: 'Lütfen önce bir kredi paketi seçin.'
            });
            return;
        }

        const pkg = packages.find(p => p.id === selectedPkg);

        setAlertConfig({
            visible: true,
            type: 'confirm',
            title: 'Satın Almayı Onayla',
            message: `${pkg?.name} (${pkg?.credits} Kredi) hesabınıza tanımlanacaktır. İşleme devam etmek istiyor musunuz?`,
            buttons: [
                {
                    text: 'Vazgeç',
                    onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })),
                    variant: 'ghost'
                },
                {
                    text: 'Öde & Yükle',
                    onPress: async () => {
                        setAlertConfig(prev => ({ ...prev, visible: false }));
                        processPurchase();
                    },
                    variant: 'primary'
                }
            ]
        });
    };

    const processPurchase = async () => {
        try {
            setProcessing(true);
            const response = await api.post('/payments/purchase', { packageId: selectedPkg });

            if (response.data.success) {
                const newBalance = response.data.data.newBalance;
                if (typeof newBalance === 'number') {
                    dispatch(updateCreditBalance(newBalance));
                }
                await dispatch(getMe());

                setAlertConfig({
                    visible: true,
                    type: 'success',
                    title: 'Harika! 🚀',
                    message: 'Kredileriniz cüzdanınıza başarıyla eklendi. Şimdi yeni işlere teklif verebilirsiniz.',
                    buttons: [
                        {
                            text: 'Tamam', onPress: () => {
                                setAlertConfig(prev => ({ ...prev, visible: false }));
                                router.back();
                            }
                        }
                    ]
                });
            }
        } catch (error: any) {
            setAlertConfig({
                visible: true,
                type: 'error',
                title: 'Ödeme Başarısız',
                message: error.response?.data?.error?.message || 'İşlem sırasında bir teknik hata oluştu. Lütfen tekrar deneyin.'
            });
        } finally {
            setProcessing(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.backgroundDark }]}>
            <StatusBar barStyle="dark-content" />

            {/* Background Glow */}
            <View style={[styles.mainGlow, { backgroundColor: colors.primary + '10' }]} />

            <PremiumHeader
                title="Kredi Yükle"
                subtitle="Paketinizi Seçin"
                showBackButton
                variant="transparent"
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.headerBox}>
                    <Text style={[styles.title, { color: colors.text }]}>İşinizi Büyütün</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Eksik kredilerinizi tamamlayarak yeni ilanlara teklif vermeye hemen başlayın.</Text>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
                ) : (
                    <View style={styles.packagesContainer}>
                        {packages.map((pkg) => {
                            const isSelected = selectedPkg === pkg.id;
                            return (
                                <TouchableOpacity
                                    key={pkg.id}
                                    activeOpacity={0.9}
                                    onPress={() => setSelectedPkg(pkg.id)}
                                    style={[
                                        styles.packageCard,
                                        { backgroundColor: staticColors.white, borderColor: isSelected ? pkg.color : staticColors.borderLight }
                                    ]}
                                >
                                    {isSelected && <View style={[styles.cardGlow, { backgroundColor: pkg.color }]} />}

                                    <View style={styles.cardMain}>
                                        <View style={[styles.iconBox, { backgroundColor: pkg.color + '15' }]}>
                                            <Ionicons name="flash" size={26} color={pkg.color} />
                                        </View>

                                        <View style={styles.infoBox}>
                                            {pkg.isPopular && (
                                                <View style={[styles.popularTag, { backgroundColor: pkg.color }]}>
                                                    <Text style={styles.popularText}>EN POPÜLER</Text>
                                                </View>
                                            )}
                                            <Text style={[styles.packageName, { color: colors.textSecondary }]}>{pkg.name}</Text>
                                            <View style={styles.creditRow}>
                                                <Text style={[styles.creditValue, { color: colors.text }]}>{pkg.credits}</Text>
                                                <Text style={[styles.creditLabel, { color: colors.primary }]}>KREDİ</Text>
                                            </View>
                                        </View>

                                        <View style={styles.priceBox}>
                                            <Text style={[styles.priceValue, { color: colors.text }]}>{pkg.price} TL</Text>
                                            <View style={[styles.selector, isSelected && { backgroundColor: pkg.color, borderColor: pkg.color }]}>
                                                {isSelected && <Ionicons name="checkmark" size={14} color={staticColors.white} />}
                                            </View>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}

                <View style={styles.footerNote}>
                    <Ionicons name="lock-closed" size={16} color={colors.textSecondary + '40'} />
                    <Text style={[styles.footerNoteText, { color: colors.textSecondary }]}>
                        Geliştirme aşamasında test ödemesi simüle edilir. Gerçek bir tahsilat yapılmaz.
                    </Text>
                </View>
            </ScrollView>

            <View style={[styles.footer, { backgroundColor: colors.backgroundDark }]}>
                <TouchableOpacity
                    style={[styles.payButton, processing && { opacity: 0.7 }, { shadowColor: colors.primary }]}
                    onPress={handlePurchase}
                    disabled={processing}
                >
                    <LinearGradient
                        colors={[colors.primary, colors.primaryDark]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.payGradient}
                    >
                        {processing ? (
                            <ActivityIndicator color={staticColors.white} />
                        ) : (
                            <>
                                <Text style={styles.payText}>Güvenli Ödeme Yap</Text>
                                <Ionicons name="arrow-forward" size={20} color={staticColors.white} />
                            </>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </View>

            <PremiumAlert
                visible={alertConfig.visible}
                type={alertConfig.type}
                title={alertConfig.title}
                message={alertConfig.message}
                buttons={alertConfig.buttons}
                onClose={() => setAlertConfig(prev => ({ ...prev, visible: false }))}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    mainGlow: {
        position: 'absolute',
        top: height * 0.3,
        left: -width * 0.2,
        width: width * 1.5,
        height: width * 1.5,
        borderRadius: width,
        opacity: 0.08,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 120,
    },
    headerBox: {
        marginBottom: 30,
    },
    title: {
        fontFamily: fonts.black,
        fontSize: 28,
        marginBottom: 8,
    },
    subtitle: {
        fontFamily: fonts.medium,
        fontSize: 15,
        lineHeight: 22,
    },
    packagesContainer: {
        gap: 16,
    },
    packageCard: {
        borderRadius: 28,
        borderWidth: 1.5,
        overflow: 'hidden',
        position: 'relative',
    },
    cardGlow: {
        position: 'absolute',
        top: -50,
        right: -50,
        width: 150,
        height: 150,
        borderRadius: 75,
        opacity: 0.1,
    },
    cardMain: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        gap: 16,
    },
    iconBox: {
        width: 60,
        height: 60,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoBox: {
        flex: 1,
    },
    popularTag: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        marginBottom: 6,
    },
    popularText: {
        fontFamily: fonts.bold,
        fontSize: 8,
        color: '#fff',
        letterSpacing: 0.5,
    },
    packageName: {
        fontFamily: fonts.medium,
        fontSize: 13,
        marginBottom: 2,
    },
    creditRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
    },
    creditValue: {
        fontFamily: fonts.black,
        fontSize: 24,
    },
    creditLabel: {
        fontFamily: fonts.bold,
        fontSize: 12,
    },
    priceBox: {
        alignItems: 'center',
        gap: 8,
    },
    priceValue: {
        fontFamily: fonts.black,
        fontSize: 18,
    },
    selector: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: staticColors.borderLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    footerNote: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 30,
        gap: 10,
        paddingHorizontal: 20,
    },
    footerNoteText: {
        fontFamily: fonts.medium,
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 18,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
        backgroundColor: staticColors.backgroundDark,
    },
    payButton: {
        borderRadius: 20,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
    },
    payGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        gap: 10,
    },
    payText: {
        fontFamily: fonts.bold,
        fontSize: 18,
        color: '#fff',
    }
});
