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
import { paymentService } from '../../services/paymentService';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { getMe, updateCreditBalance } from '../../store/slices/authSlice';

import Constants, { AppOwnership } from 'expo-constants';

// Google Play IAP - dinamik import (Expo Go'da native modül yok)
let ExpoIap: any = null;
const isExpoGo = Constants.appOwnership === AppOwnership.Expo;

if (!isExpoGo) {
    try {
        ExpoIap = require('expo-iap');
    } catch (e) {
        console.warn('⚠️ expo-iap native modülü bulunamadı. Mock mod kullanılacak.');
    }
} else {
    console.log('ℹ️ Expo Go tespit edildi. IAP devre dışı bırakıldı (Mock mod aktif).');
}

const { width } = Dimensions.get('window');

// Google Play Console'da tanımlanan ürün ID'leri
const PRODUCT_IDS = [
    'pkg_10',
    'pkg_35',
    'pkg_75',
    'pkg_175',
];

interface CreditPackage {
    id: string;
    name: string;
    credits: number;
    price: number;
    displayPrice: string;
    color: string;
    isPopular?: boolean;
}

const PACKAGE_ICONS: Record<string, string> = {
    'pkg_10': 'rocket-outline',
    'pkg_35': 'trending-up-outline',
    'pkg_75': 'diamond-outline',
    'pkg_175': 'trophy-outline',
};

const PACKAGE_DESCRIPTIONS: Record<string, string> = {
    'pkg_10': 'İlk adım için ideal',
    'pkg_35': 'Düzenli iş yapanlar için',
    'pkg_75': 'En çok tercih edilen',
    'pkg_175': 'Maksimum tasarruf',
};

const PACKAGE_INFO: Record<string, { name: string; credits: number; color: string; isPopular?: boolean }> = {
    'pkg_10': { name: 'Hızlı Başlangıç', credits: 10, color: '#3B82F6' },
    'pkg_35': { name: 'Gelişim Paketi', credits: 35, color: '#94A3B8' },
    'pkg_75': { name: 'Eko-Avantaj', credits: 75, color: '#F59E0B', isPopular: true },
    'pkg_175': { name: 'Usta Paketi', credits: 175, color: '#8B5CF6' },
};

const getPerCredit = (pkg: CreditPackage) => {
    return (pkg.price / pkg.credits).toFixed(1);
};

const getPurchaseIdentity = (purchase: any) => {
    const productId = String(
        purchase?.productId
        ?? purchase?.productIdentifier
        ?? purchase?.sku
        ?? ''
    ).trim();

    let purchaseToken = purchase?.purchaseToken
        ?? purchase?.purchaseTokenAndroid
        ?? purchase?.token
        ?? null;

    // Some Android/OpenIAP bridges expose the native BillingClient payload
    // before the unified purchaseToken field is populated.
    if (!purchaseToken && typeof purchase?.dataAndroid === 'string') {
        try {
            const nativePurchase = JSON.parse(purchase.dataAndroid);
            purchaseToken = nativePurchase?.purchaseToken ?? nativePurchase?.token ?? null;
        } catch {
            // Ignore malformed optional native payload and report the missing
            // token through the normal recoverable purchase flow below.
        }
    }

    return {
        productId,
        purchaseToken: typeof purchaseToken === 'string' ? purchaseToken.trim() : '',
    };
};

export default function BuyCreditsScreen() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { user } = useAppSelector((state) => state.auth);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [packages, setPackages] = useState<CreditPackage[]>([]);
    const [selectedPkg, setSelectedPkg] = useState<string | null>(null);
    const [iapConnected, setIapConnected] = useState(false);
    const colors = useAppColors();
    const insets = useSafeAreaInsets();
    const currentBalance = user?.electricianProfile?.creditBalance || 0;

    // Animations
    const fadeAnim = useRef(new Animated.Value(1)).current; // Başlangıçta 1 yaptık
    const slideAnim = useRef(new Animated.Value(0)).current; // Başlangıçta 0 yaptık

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

    // IAP bağlantısı ve hata yönetimi için abonelikler
    const purchaseUpdateSubscription = useRef<any>(null);
    const purchaseErrorSubscription = useRef<any>(null);
    // 🛡️ Race condition engelleme: Aynı anda birden fazla işlem yapılmasını önler
    const isProcessingRef = useRef(false);

    const setupIAP = async () => {
        try {
            setLoading(true);

            if (isExpoGo || !ExpoIap) {
                console.log('IAP modülü pasif (Expo Go veya Modül bulunamadı), fallback paketler yükleniyor');
                await loadFallbackPackages();
                setLoading(false);
                // Animasyonları başlat
                Animated.parallel([
                    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
                    Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
                ]).start();
                return;
            }

            // Google Play Billing bağlantısı
            const connected = await ExpoIap.initConnection();
            setIapConnected(connected);

            if (connected) {
                const products = await ExpoIap.getProducts({ skus: Object.keys(PACKAGE_INFO) });

                if (products && products.length > 0) {
                    const mappedPackages: CreditPackage[] = products.map((product: any) => {
                        const info = PACKAGE_INFO[product.id] || { name: product.id, credits: 0, color: '#94A3B8' };
                        return {
                            id: product.id,
                            name: info.name,
                            credits: info.credits,
                            price: product.price || 0,
                            displayPrice: product.displayPrice || `${product.price || 0} ₺`,
                            color: info.color,
                            isPopular: info.isPopular,
                        };
                    });

                    mappedPackages.sort((a, b) => a.credits - b.credits);
                    setPackages(mappedPackages);
                    const popular = mappedPackages.find(p => p.isPopular);
                    if (popular) setSelectedPkg(popular.id);

                    // 🔍 KRİTİK: Askıda kalan (tüketilmemiş) ödemeleri kurtar
                    await recoverPendingPurchases();

                } else {
                    await loadFallbackPackages();
                }
            } else {
                await loadFallbackPackages();
            }

            // Animasyonları başlat
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
                Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
            ]).start();

        } catch (error) {
            console.error('IAP kurulum hatası:', error);
            await loadFallbackPackages();
        } finally {
            setLoading(false);
            // Animasyon güvenliği için burada tekrar dene
            Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
        }
    };

    /**
     * 🔄 KURTARMA FONKSİYONU: Askıda kalan (tüketilmemiş) ödemeleri temizler
     * Bu fonksiyon setupIAP'tan bağımsızdır — sonsuz döngü riski YOKTUR.
     * Sunucu krediyi doğrulamadıkça işlem tüketilmez; daha sonra yeniden denenebilir.
     */
    const recoverPendingPurchases = async () => {
        if (!ExpoIap || isExpoGo) return;
        // Zaten bir kurtarma/satın alma devam ediyorsa tekrar girmeyi engelle
        if (isProcessingRef.current) {
            console.log('⏳ [RECOVERY] Zaten bir işlem devam ediyor, atlanıyor.');
            return;
        }
        isProcessingRef.current = true;
        try {
            const available = await ExpoIap.getAvailablePurchases();
            console.log(`🔍 [RECOVERY] getAvailablePurchases: ${available?.length || 0} adet öğe.`);

            if (!available || available.length === 0) return;

            console.log(`✅ [RECOVERY] Bekleyen ürünler:`, available.map((a: any) => a.productId).join(', '));
            let recoveredAny = false;

            for (const p of available) {
                try {
                    const { productId, purchaseToken } = getPurchaseIdentity(p);
                    let verifiedByServer = false;
                    console.log(`🔄 [RECOVERY] Kurtarma: ${productId || 'unknown-product'}`);
                    
                    // Backend'e doğrulat (kredi ekleyecek veya mükerrer diyecek)
                    try {
                        const response = await paymentService.verifyPurchase(productId, purchaseToken);
                        verifiedByServer = response?.success === true;
                        console.log(`✨ [RECOVERY] Sunucu onayladı: ${productId}`);
                    } catch (verifyError: any) {
                        console.warn(`⚠️ [RECOVERY] Sunucu doğrulaması bekliyor: ${verifyError.code || verifyError.response?.data?.error || verifyError.message}`);
                    }

                    // Tüketim güvenli sunucu tarafından yapılır. Sunucu tüketimi geçici
                    // olarak başaramazsa satın alma Google Play'de kalır ve sonraki
                    // açılışta tekrar doğrulanır.
                    if (!verifiedByServer) continue;
                    recoveredAny = true;
                } catch (error: any) {
                    console.error(`❌ [RECOVERY] Kurtarma hatası (${getPurchaseIdentity(p).productId}):`, error.message);
                }
            }

            if (recoveredAny) {
                dispatch(getMe());
                setAlertConfig({
                    visible: true,
                    type: 'success',
                    title: 'İşlem Tamamlandı ✅',
                    message: 'Bekleyen ödemeleriniz başarıyla işlendi ve krediniz hesabınıza tanımlandı.',
                    buttons: [{ text: 'Tamam', onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })) }]
                });
            }
        } catch (error: any) {
            console.error('❌ [RECOVERY] Genel hata:', error.message);
        } finally {
            isProcessingRef.current = false;
        }
    };

    // IAP listener'larını kur
    useEffect(() => {
        setupIAP();

        // Başarılı Satın Alma Dinleyicisi
        purchaseUpdateSubscription.current = ExpoIap?.purchaseUpdatedListener(async (purchase: any) => {
            const { productId, purchaseToken } = getPurchaseIdentity(purchase);
            console.log('🎉 Satın alma işlemi güncellendi:', productId || 'unknown-product');
            if (isProcessingRef.current) {
                console.log('⏳ Zaten bir işlem devam ediyor, listener atlanıyor.');
                return;
            }
            isProcessingRef.current = true;
            try {
                setProcessing(true);
                
                let backendSuccess = false;
                let newBalance: number | null = null;
                let alreadyProcessed = false;

                // 1. Backend'e doğrulat
                try {
                    const response = await paymentService.verifyPurchase(productId, purchaseToken);

                    if (response.success) {
                        backendSuccess = true;
                        newBalance = response.data?.newBalance ?? null;
                        alreadyProcessed = response.data?.alreadyProcessed === true;
                    }
                } catch (verifyError: any) {
                    const errorMsg = verifyError.response?.data?.message || verifyError.message || '';
                    console.error('Backend doğrulama hatası:', errorMsg);
                    
                    // Mükerrer veya zaten işlenmiş durumlarında sessizce geç
                    if (errorMsg.includes('already') || errorMsg.includes('işlenmiş') || errorMsg.includes('tanımlanmış')) {
                        alreadyProcessed = true;
                    }
                }

                // 2. Sunucu onayı yoksa ürünü tüketme; token kurtarma için kalsın.
                if (!backendSuccess) {
                    const missingPurchaseData = !productId || !purchaseToken;
                    setAlertConfig({
                        visible: true,
                        type: 'error',
                        title: 'İşlem Beklemede',
                        message: missingPurchaseData
                            ? 'Google Play işlem bilgisi henüz uygulamaya tam ulaşmadı. Satın alma tüketilmedi; bu sayfaya tekrar girdiğinizde sistem işlemi otomatik olarak yeniden kontrol edecek.'
                            : 'Ödemeniz Google Play tarafından alındı ancak henüz sunucu tarafından doğrulanamadı. Satın alma tüketilmedi; bağlantı veya sunucu düzeldiğinde bu sayfaya tekrar girerek güvenle tamamlayabilirsiniz.'
                    });
                    return;
                }

                // 3. UI güncelle. Google Play tüketimi sunucu tarafından yapılır.
                if (typeof newBalance === 'number') {
                    dispatch(updateCreditBalance(newBalance));
                }
                await dispatch(getMe());

                // Mükerrer bildirimse sessizce bitir
                if (alreadyProcessed) {
                    return;
                }

                if (backendSuccess) {
                    setAlertConfig({
                        visible: true,
                        type: 'success',
                        title: 'Harika! 🚀',
                        message: 'Kredileriniz cüzdanınıza başarıyla eklendi.',
                        buttons: [{ text: 'Tamam', onPress: () => { setAlertConfig(prev => ({ ...prev, visible: false })); router.back(); } }]
                    });
                } else {
                    setAlertConfig({
                        visible: true,
                        type: 'error',
                        title: 'Sistem Hatası',
                        message: 'Ödeme başarılı oldu ancak krediler yüklenirken bir sorun çıktı. Lütfen birazdan tekrar "Kredi Yükle" sayfasına girin, işleminiz otomatik tamamlanacaktır.'
                    });
                }
            } finally {
                setProcessing(false);
                isProcessingRef.current = false;
            }
        });

        // Hata Dinleyicisi
        purchaseErrorSubscription.current = ExpoIap?.purchaseErrorListener((error: any) => {
            console.warn('IAP Hatası:', error);
            setProcessing(false);
            isProcessingRef.current = false;
            if (error.code === 'user-cancelled') return;
            
            // 'Already owned' hatası için → setupIAP DEĞİL, recoverPendingPurchases çağır (döngü yok!)
            if (error?.message?.includes('already owned') || error?.code === 7) {
                setAlertConfig({
                    visible: true,
                    type: 'info',
                    title: 'Bekleyen İşlem',
                    message: 'Bu paket için bekleyen bir ödemeniz var. Şimdi sistem bunu kontrol edip kredinizi tanımlayacak.',
                    buttons: [{ 
                        text: 'Kredimi Yükle', 
                        onPress: async () => { 
                            setAlertConfig(prev => ({ ...prev, visible: false })); 
                            setProcessing(true); 
                            try {
                                // ✅ setupIAP yerine recoverPendingPurchases kullan — sonsuz döngü riski YOK
                                await recoverPendingPurchases(); 
                            } finally {
                                setProcessing(false);
                            }
                        } 
                    }]
                });
                return;
            }

            setAlertConfig({
                visible: true,
                type: 'error',
                title: 'Ödeme Başarısız',
                message: error.message || 'İşlem sırasında bir hata oluştu.'
            });
        });

        return () => {
            purchaseUpdateSubscription.current?.remove();
            purchaseErrorSubscription.current?.remove();
            if (ExpoIap) ExpoIap.endConnection();
        };
    }, []);

    // Backend'den fallback paketleri yükle (Google Play bağlantısı yoksa)
    const loadFallbackPackages = async () => {
        try {
            const response = { data: { success: true, data: paymentService.packages() } };
            if (response.data.success) {
                const pkgs = response.data.data.map((p: any) => {
                    const info = PACKAGE_INFO[p.id] || { color: '#94A3B8' };
                    return {
                        id: p.id,
                        name: p.name || info.name || p.id,
                        credits: p.credits,
                        price: p.price,
                        displayPrice: `${p.price} ₺`,
                        color: p.color || info.color,
                        isPopular: p.isPopular,
                    };
                });
                setPackages(pkgs);
                const popular = pkgs.find((p: any) => p.isPopular);
                if (popular) setSelectedPkg(popular.id);
                else if (pkgs.length > 0) setSelectedPkg(pkgs[0].id);
                
                // Fallback yüklemesi sonrası animasyonu tetikle
                Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
            }
        } catch (error) {
            console.error('Fallback paketleri yükleme hatası:', error);
        }
    };

    // Satın alma işlemini başlat
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
            message: `${pkg?.name} (${pkg?.credits} Kredi) satın almak istiyor musunuz?\n\nÖdeme Google Play üzerinden güvenli şekilde gerçekleştirilecektir.`,
            buttons: [
                {
                    text: 'Vazgeç',
                    onPress: () => setAlertConfig(prev => ({ ...prev, visible: false })),
                    variant: 'ghost'
                },
                {
                    text: 'Satın Al',
                    onPress: () => {
                        setAlertConfig(prev => ({ ...prev, visible: false }));
                        processPurchase();
                    },
                    variant: 'primary'
                }
            ]
        });
    };

    const processPurchase = async () => {
        if (!selectedPkg) return;

        try {
            setProcessing(true);

            if (iapConnected && ExpoIap) {
                // Google Play üzerinden satın alma
                await ExpoIap.requestPurchase({
                    request: {
                        google: { skus: [selectedPkg] },
                        apple: { sku: selectedPkg },
                    },
                    type: 'in-app',
                });
                // Sonuç purchaseUpdatedListener'da işlenecek
            } else {
                // Fallback: eski yöntem (test modu)
                throw new Error('Google Play bağlantısı kurulamadı; doğrulanmamış kredi yükleme kapalıdır.');
                // Unreachable compatibility value; legacy UI block below will be removed after store QA.
                const response = { data: { success: false, data: { newBalance: 0 } } };

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
                        message: 'Kredileriniz cüzdanınıza başarıyla eklendi.',
                        buttons: [{
                            text: 'Tamam',
                            onPress: () => {
                                setAlertConfig(prev => ({ ...prev, visible: false }));
                                router.back();
                            }
                        }]
                    });
                }
                setProcessing(false);
            }
        } catch (error: any) {
            console.error('Satın alma hatası:', error);
            setProcessing(false);

            // 🛠️ 'Item already owned' Hatası Kurtarma (Google Play)
            const isAlreadyOwned = error?.message?.includes('already owned') || 
                                 error?.code === 7 || 
                                 error?.code === 'E_USER_CANCELLED_WITH_PENDING_PURCHASE';

            if (isAlreadyOwned) {
                setAlertConfig({
                    visible: true,
                    type: 'info',
                    title: 'İşlem Kontrolü',
                    message: 'Bu paket için bekleyen bir ödemeniz bulundu. Şimdi krediniz kontrol edilip hesabınıza tanımlanacak.',
                    buttons: [{
                        text: 'Kredimi Yükle',
                        onPress: async () => {
                            setAlertConfig(prev => ({ ...prev, visible: false }));
                            setProcessing(true);
                            try {
                                // ✅ setupIAP yerine recoverPendingPurchases — sonsuz döngü riski YOK
                                await recoverPendingPurchases();
                            } finally {
                                setProcessing(false);
                            }
                        }
                    }]
                });
                return;
            }

            // Kullanıcı iptal ettiğinde hata gösterme
            if (error?.code === 'user-cancelled' || error?.message?.includes('cancel')) return;

            setAlertConfig({
                visible: true,
                type: 'error',
                title: 'Ödeme Başarısız',
                message: error.response?.data?.error?.message || 'İşlem sırasında bir hata oluştu. Lütfen tekrar deneyin.'
            });
        }
    };

    const selectedPackage = packages.find(p => p.id === selectedPkg);

    return (
        <View style={[styles.container, { backgroundColor: colors.backgroundDark }]}>
            <StatusBar barStyle="dark-content" />

            {/* Premium Header */}
            <View style={{ height: 60 + insets.top }}>
                <PremiumHeader
                    title="Kredi Yükle"
                    subtitle="Paketinizi Seçin"
                    showBackButton
                    variant="transparent"
                />
            </View>

            {/* Main Content Area (Full Flex) */}
            <View style={{ flex: 1, paddingHorizontal: 14, paddingTop: 6 }}>
                {/* Current Balance Mini Card */}
                <Animated.View style={[styles.balanceMini, { opacity: fadeAnim, backgroundColor: colors.surface || '#FFF', paddingVertical: 10, marginBottom: 10 }]}>
                    <View style={styles.balanceMiniLeft}>
                        <View style={[styles.balanceMiniIcon, { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.primary + '10' }]}>
                            <Ionicons name="wallet" size={16} color={colors.primary} />
                        </View>
                        <View>
                            <Text style={[styles.balanceMiniLabel, { color: colors.textSecondary }]}>Mevcut Bakiye</Text>
                            <Text style={[styles.balanceMiniValue, { color: colors.text, fontSize: 16 }]}>{currentBalance} <Text style={[styles.balanceMiniUnit, { color: colors.primary, fontSize: 11 }]}>Kredi</Text></Text>
                        </View>
                    </View>
                    <View style={styles.balanceMiniDivider} />
                    <View style={styles.balanceMiniRight}>
                        <Text style={[styles.balanceMiniLabel, { color: colors.textSecondary }]}>Yüklenecek</Text>
                        <Text style={[styles.balanceMiniValue, { color: '#10B981', fontSize: 16 }]}>
                            +{selectedPackage?.credits || 0} <Text style={[styles.balanceMiniUnit, { color: '#10B981', fontSize: 11 }]}>Kredi</Text>
                        </Text>
                    </View>
                </Animated.View>

                {/* Header Text */}
                <View style={[styles.headerBox, { marginBottom: 10 }]}>
                    <Text style={[styles.title, { color: colors.text, fontSize: 18 }]}>Paket Seçin</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: 12, lineHeight: 16 }]}>
                        Size uygun paketi seçerek iş tekliflerinizi artırın.
                    </Text>
                </View>

                {loading && (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                )}

                {!loading && packages.length === 0 && (
                    <View style={{ flex: 1, padding: 20, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: colors.textSecondary }}>Paketler yüklenemedi. Lütfen tekrar deneyin.</Text>
                        <TouchableOpacity onPress={setupIAP} style={{ marginTop: 10, padding: 8, backgroundColor: colors.primary + '20', borderRadius: 8 }}>
                            <Text style={{ color: colors.primary }}>Tekrar Dene</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {!loading && (
                    <View style={[styles.packagesContainer, { gap: 10 }]}>
                        {packages.map((pkg, index) => {
                            const isSelected = selectedPkg === pkg.id;
                            const iconName = PACKAGE_ICONS[pkg.id] || 'flash-outline';
                            const desc = PACKAGE_DESCRIPTIONS[pkg.id] || '';

                            return (
                                <Animated.View
                                    key={pkg.id}
                                    style={{
                                        opacity: fadeAnim,
                                        transform: [{ 
                                            translateY: slideAnim.interpolate({
                                                inputRange: [0, 100],
                                                outputRange: [0, (index + 1) * 5]
                                            }) 
                                        }],
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
                                        {/* Clipping container for internal decorations */}
                                        <View style={styles.clippingContainer}>
                                            {isSelected && (
                                                <View style={[styles.selectedGlow, { backgroundColor: pkg.color }]} />
                                            )}
                                        </View>

                                        <View style={[styles.cardContent, { paddingVertical: 10, paddingHorizontal: 12, gap: 10 }, pkg.isPopular && { paddingTop: 14, paddingBottom: 8 }]}>
                                            {/* Left: Icon + Info */}
                                            <View style={[styles.cardIconBox, { width: 38, height: 38, borderRadius: 10, backgroundColor: pkg.color + '12' }]}>
                                                <Ionicons name={iconName as any} size={20} color={pkg.color} />
                                            </View>

                                            <View style={styles.cardInfo}>
                                                <Text style={[styles.packageName, { color: colors.text, fontSize: 13.5 }]}>{pkg.name}</Text>
                                                <View style={styles.creditsRow}>
                                                    <Text style={[styles.creditValue, { color: pkg.color, fontSize: 19 }]}>{pkg.credits}</Text>
                                                    <Text style={[styles.creditLabel, { color: pkg.color, fontSize: 10 }]}>KREDİ</Text>
                                                </View>
                                                <Text style={[styles.cardDesc, { color: colors.textSecondary, fontSize: 10.5 }]}>{desc}</Text>
                                            </View>

                                            {/* Right: Price + Selector */}
                                            <View style={styles.cardRight}>
                                                <Text style={[styles.priceValue, { color: colors.text, fontSize: 15 }]}>{pkg.displayPrice}</Text>
                                                <Text style={[styles.perCredit, { color: colors.textSecondary, fontSize: 10 }]}>
                                                    {getPerCredit(pkg)} ₺/kr
                                                </Text>

                                                <View style={[
                                                    styles.selector,
                                                    { marginTop: 4, width: 20, height: 20, borderRadius: 10 },
                                                    isSelected && { backgroundColor: pkg.color, borderColor: pkg.color }
                                                ]}>
                                                    {isSelected && <Ionicons name="checkmark" size={12} color="#FFF" />}
                                                </View>
                                            </View>
                                        </View>

                                        {/* Popular Tag */}
                                        {pkg.isPopular && (
                                            <View style={[styles.popularTagContainer, { top: -10 }]}>
                                                <LinearGradient
                                                    colors={[pkg.color, pkg.color + 'DD']}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 0 }}
                                                    style={[styles.popularTag, { paddingVertical: 2, paddingHorizontal: 8 }]}
                                                >
                                                    <Ionicons name="star" size={8} color="#FFF" />
                                                    <Text style={[styles.popularText, { fontSize: 8 }]}>EN POPÜLER</Text>
                                                </LinearGradient>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                </Animated.View>
                            );
                        })}
                    </View>
                )}

                {/* Security Note */}
                <View style={[styles.securityNote, { marginTop: 12 }]}>
                    <View style={[styles.securityIconBox, { width: 22, height: 22, borderRadius: 6 }]}>
                        <Ionicons name="shield-checkmark" size={14} color="#10B981" />
                    </View>
                    <Text style={[styles.securityText, { color: colors.textSecondary, fontSize: 11.5 }]}>
                        Ödeme Google Play üzerinden güvenli şekilde gerçekleştirilir. Kart bilgileriniz paylaşılmaz.
                    </Text>
                </View>
            </View>

            {/* Bottom Footer Button */}
            <View style={[
                styles.footer,
                {
                    backgroundColor: colors.backgroundDark,
                    borderTopWidth: 1,
                    borderTopColor: colors.border || 'rgba(0,0,0,0.06)',
                    paddingBottom: Math.max(insets.bottom, 12),
                    height: 85 + insets.bottom
                }
            ]}>
                {selectedPackage && (
                    <View style={[styles.footerSummary, { marginBottom: 6 }]}>
                        <Text style={[styles.footerSummaryText, { color: colors.textSecondary, fontSize: 13.5 }]}>
                            Toplam: <Text style={[styles.footerSummaryBold, { color: colors.text }]}>{selectedPackage.displayPrice}</Text> → <Text style={{ color: '#10B981', fontFamily: fonts.bold }}>{selectedPackage.credits} Kredi</Text>
                        </Text>
                    </View>
                )}
                <TouchableOpacity
                    style={[styles.payButton, { shadowColor: colors.primary }, processing && { opacity: 0.7 }]}
                    onPress={handlePurchase}
                    disabled={processing || !selectedPkg}
                    activeOpacity={0.85}
                >
                    <LinearGradient
                        colors={selectedPkg ? (colors.primaryGradient || ['#0D9488', '#2DD4BF']) : ['#94A3B8', '#94A3B8']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.payGradient, { paddingVertical: 12 }]}
                    >
                        {processing ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <>
                                <Ionicons name="lock-closed" size={16} color="rgba(255,255,255,0.8)" />
                                <Text style={[styles.payText, { fontSize: 16 }]}>Güvenli Ödeme Yap</Text>
                                <Ionicons name="arrow-forward" size={18} color="#FFF" />
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
    container: { flex: 1 },
    scrollView: { flex: 1 },
    scrollContent: { padding: 14, paddingBottom: 16 },

    // Balance Mini Card
    balanceMini: {
        flexDirection: 'row', alignItems: 'center', borderRadius: 14,
        padding: 12, marginBottom: 14,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    },
    balanceMiniLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
    balanceMiniIcon: {
        width: 34, height: 34, borderRadius: 10,
        backgroundColor: '#F5F3FF', justifyContent: 'center', alignItems: 'center',
    },
    balanceMiniLabel: { fontSize: 11, fontFamily: fonts.medium },
    balanceMiniValue: { fontSize: 18, fontFamily: fonts.black },
    balanceMiniUnit: { fontSize: 12, fontFamily: fonts.bold, color: '#7C3AED' },
    balanceMiniDivider: { width: 1, height: 32, backgroundColor: '#E2E8F0', marginHorizontal: 10 },
    balanceMiniRight: { alignItems: 'flex-end' },

    // Header
    headerBox: { marginBottom: 14 },
    title: { fontFamily: fonts.black, fontSize: 20, marginBottom: 3 },
    subtitle: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },

    // Package Cards
    packagesContainer: { gap: 16 },
    clippingContainer: { ...StyleSheet.absoluteFillObject, borderRadius: 16, overflow: 'hidden' },
    packageCard: {
        borderRadius: 16, position: 'relative',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
    },
    popularTagContainer: { position: 'absolute', top: -12, left: 12, zIndex: 10 },
    popularTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    popularText: { fontFamily: fonts.bold, fontSize: 9, color: '#FFF', letterSpacing: 0.8 },
    selectedGlow: { position: 'absolute', top: -60, right: -60, width: 160, height: 160, borderRadius: 80, opacity: 0.06 },
    cardContent: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
    cardIconBox: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    cardInfo: { flex: 1 },
    packageName: { fontFamily: fonts.semiBold, fontSize: 14.5, marginBottom: 1 },
    creditsRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
    creditValue: { fontFamily: fonts.black, fontSize: 22 },
    creditLabel: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1 },
    cardDesc: { fontFamily: fonts.medium, fontSize: 11.5, marginTop: 1 },
    cardRight: { alignItems: 'center', minWidth: 55 },
    priceValue: { fontFamily: fonts.black, fontSize: 17 },
    perCredit: { fontFamily: fonts.medium, fontSize: 10.5, marginTop: 2 },
    selector: {
        width: 24, height: 24, borderRadius: 12, borderWidth: 2,
        borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center', marginTop: 6,
    },

    // Security Note
    securityNote: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        marginTop: 18, gap: 8, paddingHorizontal: 16,
    },
    securityIconBox: {
        width: 26, height: 26, borderRadius: 8,
        backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center',
    },
    securityText: { fontFamily: fonts.medium, fontSize: 12, flex: 1, lineHeight: 16 },

    // Footer
    footer: {
        paddingHorizontal: 14, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9',
    },
    footerSummary: { alignItems: 'center', marginBottom: 8 },
    footerSummaryText: { fontSize: 14, fontFamily: fonts.medium },
    footerSummaryBold: { fontFamily: fonts.bold },
    payButton: {
        borderRadius: 14, overflow: 'hidden', elevation: 8,
        shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25, shadowRadius: 12,
    },
    payGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, gap: 8 },
    payText: { fontFamily: fonts.bold, fontSize: 17, color: '#FFF' },
});
