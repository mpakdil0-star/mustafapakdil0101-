import { Response, NextFunction } from 'express';
import prisma, { isDatabaseAvailable } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { ValidationError, NotFoundError } from '../utils/errors';
import { mockStorage, mockTransactionStorage } from '../utils/mockStorage';
import { google } from 'googleapis';

// Google Play product ID → kredi eşlemesi
const PRODUCT_CREDIT_MAP: Record<string, { credits: number; price: number; name: string }> = {
    'pkg_10': { credits: 10, price: 189, name: 'Hızlı Başlangıç' },
    'pkg_35': { credits: 35, price: 489, name: 'Gelişim Paketi' },
    'pkg_75': { credits: 75, price: 889, name: 'Eko-Avantaj' },
    'pkg_175': { credits: 175, price: 1489, name: 'Usta Paketi' },
};

// Google Play Developer API client (lazy init)
let androidPublisher: any = null;

const getAndroidPublisher = () => {
    if (androidPublisher) return androidPublisher;

    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
        console.warn('⚠️ GOOGLE_SERVICE_ACCOUNT_KEY not set — purchase verification will be skipped');
        return null;
    }

    try {
        const credentials = JSON.parse(serviceAccountKey);
        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/androidpublisher'],
        });

        androidPublisher = google.androidpublisher({ version: 'v3', auth });
        return androidPublisher;
    } catch (error) {
        console.error('❌ Failed to initialize Google Play API:', error);
        return null;
    }
};

export const getCreditPackages = async (req: AuthRequest, res: Response) => {
    // Backend'deki paket bilgilerini döndür (Google Play fiyatları frontend'den gelecek)
    const packages = [
        { id: 'pkg_10', name: 'Hızlı Başlangıç', credits: 10, price: 189, color: '#3B82F6' },
        { id: 'pkg_35', name: 'Gelişim Paketi', credits: 35, price: 489, color: '#94A3B8' },
        { id: 'pkg_75', name: 'Eko-Avantaj', credits: 75, price: 889, color: '#F59E0B', isPopular: true },
        { id: 'pkg_175', name: 'Usta Paketi', credits: 175, price: 1489, color: '#8B5CF6' },
    ];

    res.json({ success: true, data: packages });
};

/**
 * Google Play IAP satın alma doğrulama
 * Frontend purchaseToken ve productId gönderir, backend doğrular ve kredi yükler
 * 
 * KRİTİK DÜZELTMELER (v1.0.30):
 * 1. Race condition engellemek için Prisma $transaction kullanılıyor
 * 2. Decimal hassasiyet hataları Math.round ile düzeltildi
 * 3. "Already owned" döngüsünü kırmak için her durumda Google consume yapılıyor
 * 4. Mükerrer ödeme kontrolü token+userId bazlı yapılıyor
 */
export const verifyAndGrantPurchase = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) throw new ValidationError('Oturum açmanız gerekiyor');

        const { productId, purchaseToken, packageName } = req.body;

        if (!productId || !purchaseToken) {
            throw new ValidationError('productId ve purchaseToken gerekli');
        }

        const creditInfo = PRODUCT_CREDIT_MAP[productId];
        if (!creditInfo) {
            throw new ValidationError(`Geçersiz ürün: ${productId}`);
        }

        const userId = req.user.id;
        const appPackageName = packageName || 'com.isbitir.app';
        const publisher = getAndroidPublisher();

        // 🔧 YARDIMCI: Google Play'de ürünü tüket (consume) — her durumda çağrılır
        const consumeOnGooglePlay = async () => {
            if (!publisher) return;
            try {
                console.log(`🔄 [CONSUME] Google Play tüketme: ${productId}...`);
                await publisher.purchases.products.consume({
                    packageName: appPackageName,
                    productId: productId,
                    token: purchaseToken,
                });
                console.log(`✅ [CONSUME] Başarılı: ${productId} for user ${userId}`);
            } catch (consumeError: any) {
                // "already consumed" veya benzer hatalar önemsiz — ürün zaten tüketilmiş
                console.warn(`⚠️ [CONSUME] Hata (önemsiz): ${consumeError.message}`);
            }
        };

        // 🛡️ MÜKERRER ÖDEME KONTROLÜ
        if (isDatabaseAvailable) {
            const existingPurchase = await prisma.credit.findFirst({
                where: { relatedId: purchaseToken }
            });

            if (existingPurchase) {
                console.log(`⚠️ Mükerrer ödeme engellendi: token=${purchaseToken.substring(0, 15)}... user=${userId}`);
                
                // KRİTİK: Mükerrer olsa bile Google Play'de tüketmeyi dene
                // Bu, "already owned" hatasını kıran en önemli adım
                await consumeOnGooglePlay();

                const profile = await prisma.electricianProfile.findUnique({ where: { userId } });
                const safeBalance = Math.round(Number(profile?.creditBalance || 0));
                
                return res.json({
                    success: true,
                    message: 'Bu satın alma daha önce hesabınıza tanımlanmış.',
                    data: { 
                        alreadyProcessed: true,
                        creditsAdded: 0,
                        newBalance: safeBalance
                    }
                });
            }
        } else {
            if (mockStorage.isTokenProcessed(purchaseToken)) {
                console.log(`⚠️ Mükerrer ödeme engellendi (MOCK): ${purchaseToken.substring(0, 15)}...`);
                const mockProfile = mockStorage.get(userId);
                return res.json({
                    success: true,
                    message: 'Bu satın alma daha önce hesabınıza tanımlanmış.',
                    data: { 
                        alreadyProcessed: true,
                        creditsAdded: 0,
                        newBalance: mockProfile?.creditBalance || 0
                    }
                });
            }
        }

        // 📡 GOOGLE PLAY API DOĞRULAMA
        if (publisher) {
            try {
                console.log(`📡 Google Play Doğrulama: [${productId}] Token: ${purchaseToken.substring(0, 20)}...`);

                const result = await publisher.purchases.products.get({
                    packageName: appPackageName,
                    productId: productId,
                    token: purchaseToken,
                });

                const purchase = result.data;
                console.log(`📦 Google Play Yanıtı: purchaseState=${purchase.purchaseState}, consumptionState=${purchase.consumptionState}, acknowledgementState=${purchase.acknowledgementState}`);

                // purchaseState: 0 = Purchased, 1 = Canceled, 2 = Pending
                if (purchase.purchaseState !== 0) {
                    console.error(`❌ Geçersiz Satın Alma Durumu: ${purchase.purchaseState}`);
                    // Geçersiz durumda bile consume deneyelim ki ürün serbest bırakılsın
                    await consumeOnGooglePlay();
                    throw new ValidationError('Bu satın alma tamamlanmamış veya iptal edilmiş');
                }

            } catch (verifyError: any) {
                if (verifyError instanceof ValidationError) throw verifyError;
                
                const googleErrorMsg = verifyError.response?.data?.error?.message || verifyError.message;
                console.error(`❌ Google Play API Hatası: "${googleErrorMsg}" [ID: ${productId}]`);
                throw new ValidationError(`Google Play doğrulama hatası: ${googleErrorMsg}`);
            }
        } else {
            console.log(`⚠️ Test modu: ${productId} doğrulaması atlandı (GOOGLE_SERVICE_ACCOUNT_KEY yok)`);
        }

        // 💰 KREDİ YÜKLEME (Prisma Transaction ile race condition engelleme)
        let newBalanceResponse = 0;

        if (isDatabaseAvailable) {
            const result = await prisma.$transaction(async (tx) => {
                // Transaction içinde tekrar kontrol et (race condition kalkanı)
                const duplicateCheck = await tx.credit.findFirst({
                    where: { relatedId: purchaseToken }
                });
                if (duplicateCheck) {
                    console.log(`🛡️ [TRANSACTION] Race condition yakalandı! Token zaten işlenmiş: ${purchaseToken.substring(0, 15)}...`);
                    return { alreadyProcessed: true, newBalance: 0 };
                }

                const profile = await tx.electricianProfile.findUnique({
                    where: { userId }
                });

                if (!profile) {
                    throw new ValidationError('Bu işlem sadece usta hesapları için geçerlidir.');
                }

                // Decimal → Number dönüşümünde Math.round kullanarak hassasiyet hatalarını önle
                const currentBalance = Math.round(Number(profile.creditBalance || 0));
                const creditsToAdd = creditInfo.credits; // Tam sayı, hassasiyet sorunu yok
                const newBalance = currentBalance + creditsToAdd;

                console.log(`💰 Kredi yükleme: ${currentBalance} + ${creditsToAdd} = ${newBalance} (user: ${userId})`);

                await tx.electricianProfile.update({
                    where: { userId },
                    data: { creditBalance: newBalance }
                });

                await tx.credit.create({
                    data: {
                        userId,
                        amount: creditsToAdd,
                        transactionType: 'PURCHASE',
                        description: `${creditsToAdd} kredi satın alındı (${creditInfo.name})`,
                        balanceAfter: newBalance,
                        relatedId: purchaseToken
                    }
                });

                return { alreadyProcessed: false, newBalance };
            });

            if (result.alreadyProcessed) {
                // Race condition yakalandı — consume yap ve dön
                await consumeOnGooglePlay();
                const profile = await prisma.electricianProfile.findUnique({ where: { userId } });
                return res.json({
                    success: true,
                    message: 'Bu satın alma daha önce hesabınıza tanımlanmış.',
                    data: { 
                        alreadyProcessed: true,
                        creditsAdded: 0,
                        newBalance: Math.round(Number(profile?.creditBalance || 0))
                    }
                });
            }

            newBalanceResponse = result.newBalance;
        } else {
            // Mock mod
            const mockData = mockStorage.addCredits(userId, creditInfo.credits);
            newBalanceResponse = mockData.creditBalance;
            mockStorage.markTokenProcessed(purchaseToken);

            mockTransactionStorage.addTransaction({
                userId,
                amount: creditInfo.credits,
                transactionType: 'PURCHASE',
                description: `${creditInfo.credits} kredi satın alındı (${creditInfo.name})`,
                balanceAfter: mockData.creditBalance,
                relatedId: purchaseToken
            });
        }
        
        // 🔄 KREDİ BAŞARILI → Google Play'de ürünü tüket (kullanıcı tekrar satın alabilsin)
        await consumeOnGooglePlay();

        console.log(`🎉 Satın alma tamamlandı: ${creditInfo.credits} kredi → user ${userId}, yeni bakiye: ${newBalanceResponse}`);

        return res.json({
            success: true,
            message: 'Ödeme başarılı! Kredileriniz hesabınıza tanımlandı.',
            data: {
                creditsAdded: creditInfo.credits,
                newBalance: newBalanceResponse
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Eski purchaseCredits - geriye dönük uyumluluk için korunuyor
 * Admin paneli "Kredi Ekle" hala bunu kullanabilir
 */
export const purchaseCredits = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) throw new ValidationError('Oturum açmanız gerekiyor');

        const { packageId } = req.body;
        if (!packageId) throw new ValidationError('Paket seçimi yapılmadı');

        // Tüm ID formatlarını destekle (tire ve alt çizgi)
        const packageMap: Record<string, { credits: number; price: number }> = {
            'pkg-10': { credits: 10, price: 189 },
            'pkg_10': { credits: 10, price: 189 },
            'pkg-35': { credits: 35, price: 489 },
            'pkg_35': { credits: 35, price: 489 },
            'pkg-75': { credits: 75, price: 889 },
            'pkg_75': { credits: 75, price: 889 },
            'pkg-175': { credits: 175, price: 1489 },
            'pkg_175': { credits: 175, price: 1489 },
        };

        const selectedPackage = packageMap[packageId];
        if (!selectedPackage) throw new ValidationError('Geçersiz paket');

        if (isDatabaseAvailable) {
            const userId = req.user.id;
            const profile = await prisma.electricianProfile.findUnique({
                where: { userId }
            });

            if (!profile) {
                throw new ValidationError('Bu işlem sadece usta hesapları için geçerlidir.');
            }

            const currentBalance = Number(profile.creditBalance || 0);
            const newBalance = currentBalance + selectedPackage.credits;

            await prisma.electricianProfile.update({
                where: { userId },
                data: { creditBalance: newBalance }
            });

            await prisma.credit.create({
                data: {
                    userId,
                    amount: selectedPackage.credits,
                    transactionType: 'PURCHASE',
                    description: `${selectedPackage.credits} kredi satın alındı`,
                    balanceAfter: newBalance
                }
            });

            return res.json({
                success: true,
                message: 'Ödeme başarılı! Kredileriniz hesabınıza tanımlandı.',
                data: {
                    creditsAdded: selectedPackage.credits,
                    newBalance
                }
            });
        } else {
            const userId = req.user.id;
            const mockData = mockStorage.addCredits(userId, selectedPackage.credits);

            mockTransactionStorage.addTransaction({
                userId,
                amount: selectedPackage.credits,
                transactionType: 'PURCHASE',
                description: `Kredi Yükleme`,
                balanceAfter: mockData.creditBalance
            });

            return res.json({
                success: true,
                message: 'İşlem başarılı',
                data: {
                    creditsAdded: selectedPackage.credits,
                    newBalance: mockData.creditBalance
                }
            });
        }
    } catch (error) {
        next(error);
    }
};

export const getTransactionHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) throw new ValidationError('Yetkisiz erişim');

        if (isDatabaseAvailable) {
            const history = await prisma.credit.findMany({
                where: { userId: req.user.id },
                orderBy: { createdAt: 'desc' },
                take: 50
            });

            return res.json({ success: true, data: history });
        } else {
            const mockHistory = mockTransactionStorage.getTransactions(req.user.id, 50);
            return res.json({ success: true, data: mockHistory });
        }
    } catch (error) {
        next(error);
    }
};
