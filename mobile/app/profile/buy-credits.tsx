import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    ActivityIndicator,
    Dimensions,
    Platform,
    Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors as staticColors } from '../../constants/colors';
import { fonts } from '../../constants/typography';
import { useAppColors } from '../../hooks/useAppColors';
import { PremiumHeader } from '../../components/common/PremiumHeader';
import { PremiumAlert } from '../../components/common/PremiumAlert';
import api from '../../services/api';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { getMe, updateCreditBalance } from '../../store/slices/authSlice';

const { width } = Dimensions.get('window');

interface CreditPackage {
    id: string;
    name: string;
    credits: number;
    price: number;
    color: string;
    isPopular?: boolean;
}

const PACKAGE_ICONS: Record<string, string> = {
    'pkg-10': 'rocket-outline',
    'pkg-35': 'trending-up-outline',
    'pkg-75': 'diamond-outline',
    'pkg-175': 'trophy-outline',
};

const PACKAGE_DESCRIPTIONS: Record<string, string> = {
    'pkg-10': 'İlk adım için ideal',
    'pkg-35': 'Düzenli iş yapanlar için',
    'pkg-75': 'En çok tercih edilen',
    'pkg-175': 'Maksimum tasarruf',
};

const getPerCredit = (pkg: CreditPackage) => {
    return (pkg.price / pkg.credits).toFixed(1);
};

export default function BuyCreditsScreen() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { user } = useAppSelector((state) => state.auth);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [packages, setPackages] = useState<CreditPackage[]>([]);
    const [selectedPkg, setSelectedPkg] = useState<string | null>(null);
    const colors = useAppColors();
    const insets = useSafeAreaInsets();
    const currentBalance = user?.electricianProfile?.creditBalance || 0;

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;
    const selectedScale = useRef(new Animated.Value(1)).current;

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

    useEffect(() => {
        Animated.spring(selectedScale, {
            toValue: 1,
            tension: 100,
            friction: 8,
            useNativeDriver: true,
        }).start();
    }, [selectedPkg]);

    const fetchPackages = async () => {
        try {
            setLoading(true);
            const response = await api.get('/payments/packages');
            if (response.data.success) {
                setPackages(response.data.data);
                const popular = response.data.data.find((p: any) => p.isPopular);
                if (popular) setSelectedPkg(popular.id);
            }

            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 500,
                    useNativeDriver: true,
                }),
            ]).start();
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

    const selectedPackage = packages.find(p => p.id === selectedPkg);

    return (
        <View style={[styles.container, { backgroundColor: colors.backgroundDark }]}>
            <StatusBar barStyle="dark-content" />

            {/* Premium Header - Reduced height for more space */}
            <View style={{ height: 60 + insets.top }}>
                <PremiumHeader
                    title="Kredi Yükle"
                    subtitle="Paketinizi Seçin"
                    showBackButton
                    variant="transparent"
                />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: 110 + insets.bottom }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Current Balance Mini Card */}
                <Animated.View style={[styles.balanceMini, { opacity: fadeAnim, backgroundColor: colors.surface || '#FFF' }]}>
                    <View style={styles.balanceMiniLeft}>
                        <View style={styles.balanceMiniIcon}>
                            <Ionicons name="wallet" size={18} color="#7C3AED" />
                        </View>
                        <View>
                            <Text style={[styles.balanceMiniLabel, { color: colors.textSecondary }]}>Mevcut Bakiye</Text>
                            <Text style={[styles.balanceMiniValue, { color: colors.text }]}>{currentBalance} <Text style={styles.balanceMiniUnit}>Kredi</Text></Text>
                        </View>
                    </View>
                    <View style={styles.balanceMiniDivider} />
                    <View style={styles.balanceMiniRight}>
                        <Text style={[styles.balanceMiniLabel, { color: colors.textSecondary }]}>Yüklenecek</Text>
                        <Text style={[styles.balanceMiniValue, { color: '#10B981' }]}>
                            +{selectedPackage?.credits || 0} <Text style={[styles.balanceMiniUnit, { color: '#10B981' }]}>Kredi</Text>
                        </Text>
                    </View>
                </Animated.View>

                {/* Header Text */}
                <View style={styles.headerBox}>
                    <Text style={[styles.title, { color: colors.text }]}>Paket Seçin</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        Size uygun paketi seçerek iş tekliflerinizi artırın.
                    </Text>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
                ) : (
                    <View style={styles.packagesContainer}>
                        {packages.map((pkg, index) => {
                            const isSelected = selectedPkg === pkg.id;
                            const iconName = PACKAGE_ICONS[pkg.id] || 'flash-outline';
                            const desc = PACKAGE_DESCRIPTIONS[pkg.id] || '';

                            return (
                                <Animated.View
                                    key={pkg.id}
                                    style={{
                                        opacity: fadeAnim,
                                        transform: [{ translateY: Animated.multiply(slideAnim, (index + 1) * 0.3) }],
                                    }}
                                >
                                    <TouchableOpacity
                                        activeOpacity={0.85}
                                        onPress={() => setSelectedPkg(pkg.id)}
                                        style={[
                                            styles.packageCard,
                                            {
                                                backgroundColor: colors.surface || '#FFF',
                                                borderColor: isSelected ? pkg.color : 'transparent',
                                                borderWidth: isSelected ? 2 : 0,
                                            }
                                        ]}
                                    >
                                        {/* Popular Tag */}
                                        {pkg.isPopular && (
                                            <View style={styles.popularTagContainer}>
                                                <LinearGradient
                                                    colors={[pkg.color, pkg.color + 'DD']}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 0 }}
                                                    style={styles.popularTag}
                                                >
                                                    <Ionicons name="star" size={10} color="#FFF" />
                                                    <Text style={styles.popularText}>EN POPÜLER</Text>
                                                </LinearGradient>
                                            </View>
                                        )}

                                        {/* Selected Glow */}
                                        {isSelected && (
                                            <View style={[styles.selectedGlow, { backgroundColor: pkg.color }]} />
                                        )}

                                        <View style={styles.cardContent}>
                                            {/* Left: Icon + Info */}
                                            <View style={[styles.cardIconBox, { backgroundColor: pkg.color + '12' }]}>
                                                <Ionicons name={iconName as any} size={26} color={pkg.color} />
                                            </View>

                                            <View style={styles.cardInfo}>
                                                <Text style={[styles.packageName, { color: colors.text }]}>{pkg.name}</Text>
                                                <View style={styles.creditsRow}>
                                                    <Text style={[styles.creditValue, { color: pkg.color }]}>{pkg.credits}</Text>
                                                    <Text style={[styles.creditLabel, { color: pkg.color }]}>KREDİ</Text>
                                                </View>
                                                <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>{desc}</Text>
                                            </View>

                                            {/* Right: Price + Selector */}
                                            <View style={styles.cardRight}>
                                                <Text style={[styles.priceValue, { color: colors.text }]}>{pkg.price}</Text>
                                                <Text style={[styles.priceCurrency, { color: colors.textSecondary }]}>TL</Text>
                                                <Text style={[styles.perCredit, { color: colors.textSecondary }]}>
                                                    {getPerCredit(pkg)} ₺/kr
                                                </Text>

                                                <View style={[
                                                    styles.selector,
                                                    isSelected && { backgroundColor: pkg.color, borderColor: pkg.color }
                                                ]}>
                                                    {isSelected && <Ionicons name="checkmark" size={14} color="#FFF" />}
                                                </View>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                </Animated.View>
                            );
                        })}
                    </View>
                )}

                {/* Security Note */}
                <View style={styles.securityNote}>
                    <View style={styles.securityIconBox}>
                        <Ionicons name="shield-checkmark" size={18} color="#10B981" />
                    </View>
                    <Text style={[styles.securityText, { color: colors.textSecondary }]}>
                        Geliştirme aşamasında test ödemesi simüle edilir. Gerçek bir tahsilat yapılmaz.
                    </Text>
                </View>

                {/* Bottom spacer for fixed button */}
                <View style={{ height: 80 }} />
            </ScrollView>

            {/* Fixed Bottom Button - Adjusted for Safe Area */}
            <View style={[
                styles.footer,
                {
                    backgroundColor: colors.backgroundDark,
                    paddingBottom: Math.max(insets.bottom, 16),
                    height: 100 + insets.bottom
                }
            ]}>
                {selectedPackage && (
                    <View style={styles.footerSummary}>
                        <Text style={[styles.footerSummaryText, { color: colors.textSecondary }]}>
                            Toplam: <Text style={[styles.footerSummaryBold, { color: colors.text }]}>{selectedPackage.price} TL</Text> → <Text style={{ color: '#10B981', fontFamily: fonts.bold }}>{selectedPackage.credits} Kredi</Text>
                        </Text>
                    </View>
                )}
                <TouchableOpacity
                    style={[styles.payButton, processing && { opacity: 0.7 }]}
                    onPress={handlePurchase}
                    disabled={processing || !selectedPkg}
                    activeOpacity={0.85}
                >
                    <LinearGradient
                        colors={selectedPkg ? ['#7C3AED', '#6D28D9'] : ['#94A3B8', '#94A3B8']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.payGradient}
                    >
                        {processing ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <>
                                <Ionicons name="lock-closed" size={18} color="rgba(255,255,255,0.8)" />
                                <Text style={styles.payText}>Güvenli Ödeme Yap</Text>
                                <Ionicons name="arrow-forward" size={20} color="#FFF" />
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
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 14,
        paddingBottom: 16,
    },

    // ── Balance Mini Card ──
    balanceMini: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 14,
        padding: 12,
        marginBottom: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    balanceMiniLeft: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    balanceMiniIcon: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: '#F5F3FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    balanceMiniLabel: {
        fontSize: 10,
        fontFamily: fonts.medium,
    },
    balanceMiniValue: {
        fontSize: 16,
        fontFamily: fonts.black,
    },
    balanceMiniUnit: {
        fontSize: 12,
        fontFamily: fonts.bold,
        color: '#7C3AED',
    },
    balanceMiniDivider: {
        width: 1,
        height: 32,
        backgroundColor: '#E2E8F0',
        marginHorizontal: 10,
    },
    balanceMiniRight: {
        alignItems: 'flex-end',
    },

    // ── Header ──
    headerBox: {
        marginBottom: 14,
    },
    title: {
        fontFamily: fonts.black,
        fontSize: 20,
        marginBottom: 3,
    },
    subtitle: {
        fontFamily: fonts.medium,
        fontSize: 13,
        lineHeight: 18,
    },

    // ── Package Cards ──
    packagesContainer: {
        gap: 10,
    },
    packageCard: {
        borderRadius: 16,
        overflow: 'hidden',
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 2,
    },
    popularTagContainer: {
        position: 'absolute',
        top: 10,
        left: 10,
        zIndex: 10,
    },
    popularTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    popularText: {
        fontFamily: fonts.bold,
        fontSize: 9,
        color: '#FFF',
        letterSpacing: 0.8,
    },
    selectedGlow: {
        position: 'absolute',
        top: -60,
        right: -60,
        width: 160,
        height: 160,
        borderRadius: 80,
        opacity: 0.06,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        gap: 12,
    },
    cardIconBox: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardInfo: {
        flex: 1,
    },
    packageName: {
        fontFamily: fonts.semiBold,
        fontSize: 13,
        marginBottom: 1,
    },
    creditsRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
    },
    creditValue: {
        fontFamily: fonts.black,
        fontSize: 20,
    },
    creditLabel: {
        fontFamily: fonts.bold,
        fontSize: 10,
        letterSpacing: 1,
    },
    cardDesc: {
        fontFamily: fonts.medium,
        fontSize: 10,
        marginTop: 1,
    },
    cardRight: {
        alignItems: 'center',
        minWidth: 55,
    },
    priceValue: {
        fontFamily: fonts.black,
        fontSize: 16,
    },
    priceCurrency: {
        fontFamily: fonts.bold,
        fontSize: 11,
        marginTop: -2,
    },
    perCredit: {
        fontFamily: fonts.medium,
        fontSize: 9,
        marginTop: 2,
    },
    selector: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#D1D5DB',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 6,
    },

    // ── Security Note ──
    securityNote: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 18,
        gap: 8,
        paddingHorizontal: 16,
    },
    securityIconBox: {
        width: 26,
        height: 26,
        borderRadius: 8,
        backgroundColor: '#ECFDF5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    securityText: {
        fontFamily: fonts.medium,
        fontSize: 11,
        flex: 1,
        lineHeight: 16,
    },

    // ── Footer ──
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 14,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    footerSummary: {
        alignItems: 'center',
        marginBottom: 8,
    },
    footerSummaryText: {
        fontSize: 12,
        fontFamily: fonts.medium,
    },
    footerSummaryBold: {
        fontFamily: fonts.bold,
    },
    payButton: {
        borderRadius: 14,
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
    },
    payGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 13,
        gap: 8,
    },
    payText: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: '#FFF',
    },
});
