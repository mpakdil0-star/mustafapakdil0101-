import { Response, NextFunction } from 'express';
import prisma, { isDatabaseAvailable } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { ValidationError, NotFoundError } from '../utils/errors';
import { mockStorage, mockTransactionStorage } from '../utils/mockStorage';
import { google } from 'googleapis';

// Google Play product ID → kredi eşlemesi
const PRODUCT_CREDIT_MAP: Record<string, { credits: number; price: number; name: string }> = {
    'credit_pack_10': { credits: 10, price: 189, name: 'Hızlı Başlangıç' },
    'credit_pack_35': { credits: 35, price: 489, name: 'Gelişim Paketi' },
    'credit_pack_75': { credits: 75, price: 889, name: 'Eko-Avantaj' },
    'credit_pack_175': { credits: 175, price: 1489, name: 'Usta Paketi' },
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
        { id: 'credit_pack_10', name: 'Hızlı Başlangıç', credits: 10, price: 189, color: '#3B82F6' },
        { id: 'credit_pack_35', name: 'Gelişim Paketi', credits: 35, price: 489, color: '#94A3B8' },
        { id: 'credit_pack_75', name: 'Eko-Avantaj', credits: 75, price: 889, color: '#F59E0B', isPopular: true },
        { id: 'credit_pack_175', name: 'Usta Paketi', credits: 175, price: 1489, color: '#8B5CF6' },
    ];

    res.json({ success: true, data: packages });
};

/**
 * Google Play IAP satın alma doğrulama
 * Frontend purchaseToken ve productId gönderir, backend doğrular ve kredi yükler
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

        // Google Play API ile doğrulama
        const publisher = getAndroidPublisher();

        if (publisher) {
            try {
                const result = await publisher.purchases.products.get({
                    packageName: appPackageName,
                    productId: productId,
                    token: purchaseToken,
                });

                const purchase = result.data;

                // purchaseState: 0 = Purchased, 1 = Canceled, 2 = Pending
                if (purchase.purchaseState !== 0) {
                    throw new ValidationError('Bu satın alma tamamlanmamış veya iptal edilmiş');
                }

                // Daha önce işlenmiş mi kontrol et (duplicate prevention)
                // acknowledgementState: 0 = Not acknowledged, 1 = Acknowledged
                if (purchase.acknowledgementState === 1) {
                    // Zaten işlenmiş bir satın alma - tekrar kredi vermemek için
                    return res.json({
                        success: true,
                        message: 'Bu satın alma daha önce işlenmiş.',
                        data: { alreadyProcessed: true }
                    });
                }

                // Satın almayı tüket (consumable product)
                await publisher.purchases.products.consume({
                    packageName: appPackageName,
                    productId: productId,
                    token: purchaseToken,
                });

                console.log(`✅ Google Play doğrulama başarılı: ${productId} for user ${userId}`);
            } catch (verifyError: any) {
                console.error('❌ Google Play doğrulama hatası:', verifyError.message);
                throw new ValidationError('Satın alma doğrulanamadı. Lütfen tekrar deneyin.');
            }
        } else {
            // Service account yoksa test modunda çalış
            console.log(`⚠️ Test modu: ${productId} doğrulaması atlandı (GOOGLE_SERVICE_ACCOUNT_KEY yok)`);
        }

        // Krediyi kullanıcıya ekle
        if (isDatabaseAvailable) {
            const profile = await prisma.electricianProfile.findUnique({
                where: { userId }
            });

            if (!profile) {
                throw new ValidationError('Bu işlem sadece usta hesapları için geçerlidir.');
            }

            const currentBalance = Number(profile.creditBalance || 0);
            const newBalance = currentBalance + creditInfo.credits;

            await prisma.electricianProfile.update({
                where: { userId },
                data: { creditBalance: newBalance }
            });

            await prisma.credit.create({
                data: {
                    userId,
                    amount: creditInfo.credits,
                    transactionType: 'PURCHASE',
                    description: `${creditInfo.credits} kredi satın alındı (${creditInfo.name})`,
                    balanceAfter: newBalance
                }
            });

            return res.json({
                success: true,
                message: 'Ödeme başarılı! Kredileriniz hesabınıza tanımlandı.',
                data: {
                    creditsAdded: creditInfo.credits,
                    newBalance
                }
            });
        } else {
            // Mock mod
            const mockData = mockStorage.addCredits(userId, creditInfo.credits);

            mockTransactionStorage.addTransaction({
                userId,
                amount: creditInfo.credits,
                transactionType: 'PURCHASE',
                description: `${creditInfo.credits} kredi satın alındı (${creditInfo.name})`,
                balanceAfter: mockData.creditBalance
            });

            return res.json({
                success: true,
                message: 'Ödeme başarılı! Kredileriniz hesabınıza tanımlandı.',
                data: {
                    creditsAdded: creditInfo.credits,
                    newBalance: mockData.creditBalance
                }
            });
        }
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

        // Eski paket ID formatını da destekle
        const packageMap: Record<string, { credits: number; price: number }> = {
            'pkg-10': { credits: 10, price: 189 },
            'pkg-35': { credits: 35, price: 489 },
            'pkg-75': { credits: 75, price: 889 },
            'pkg-175': { credits: 175, price: 1489 },
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
