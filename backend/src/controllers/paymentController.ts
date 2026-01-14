import { Response, NextFunction } from 'express';
import prisma, { isDatabaseAvailable } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { ValidationError, NotFoundError } from '../utils/errors';
import { mockStorage, mockTransactionStorage } from '../utils/mockStorage';

export const getCreditPackages = async (req: AuthRequest, res: Response) => {
    // Sabit kredi paketleri
    const packages = [
        { id: 'pkg-10', name: 'Hızlı Başlangıç', credits: 10, price: 189, color: '#3B82F6' },
        { id: 'pkg-35', name: 'Gelişim Paketi', credits: 35, price: 489, color: '#94A3B8' },
        { id: 'pkg-75', name: 'Eko-Avantaj', credits: 75, price: 889, color: '#F59E0B', isPopular: true },
        { id: 'pkg-175', name: 'Usta Paketi', credits: 175, price: 1489, color: '#8B5CF6' },
    ];

    res.json({ success: true, data: packages });
};

export const purchaseCredits = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) throw new ValidationError('Oturum açmanız gerekiyor');

        const { packageId } = req.body;
        if (!packageId) throw new ValidationError('Paket seçimi yapılmadı');

        const packages: any = {
            'pkg-10': { credits: 10, price: 189 },
            'pkg-35': { credits: 35, price: 489 },
            'pkg-75': { credits: 75, price: 889 },
            'pkg-175': { credits: 175, price: 1489 },
        };

        const selectedPackage = packages[packageId];
        if (!selectedPackage) throw new ValidationError('Geçersiz paket');

        // MOCK PAYMENT PROCESS: Her zaman başarılı sayıyoruz (Geliştirme aşaması)
        if (isDatabaseAvailable) {
            const userId = req.user.id;

            // 1. Kullanıcının bakiye bilgisini al (ElectricianProfile)
            const profile = await prisma.electricianProfile.findUnique({
                where: { userId }
            });

            if (!profile) throw new NotFoundError('Usta profili bulunamadı');

            const currentBalance = Number(profile.creditBalance || 0);
            const newBalance = currentBalance + selectedPackage.credits;

            // 2. Bakiyeyi güncelle
            const updatedProfile = await prisma.electricianProfile.update({
                where: { userId },
                data: { creditBalance: newBalance }
            });

            // 3. Kredi işlem kaydı oluştur
            await prisma.credit.create({
                data: {
                    userId,
                    amount: selectedPackage.credits,
                    transactionType: 'PURCHASE',
                    description: `${selectedPackage.credits} kredi satın alındı (Test Ödeme)`,
                    balanceAfter: newBalance
                }
            });

            // 4. Ödeme kaydı oluştur (Payment tablosu)
            // Not: Payment tablosu jobPostId bekliyor olabilir şemada, 
            // ama bağımsız ödemeler için opsiyonel olmalı. Şemayı kontrol etmiştik.
            await prisma.payment.create({
                data: {
                    jobPostId: '', // Opsiyonel veya dummy
                    payerId: userId,
                    payeeId: 'SYSTEM',
                    amount: selectedPackage.price,
                    platformFee: 0,
                    netAmount: selectedPackage.price,
                    paymentMethod: 'CREDIT_CARD_MOCK',
                    paymentStatus: 'COMPLETED',
                    completedAt: new Date()
                }
            }).catch(e => console.warn('Payment record failed (non-critical):', e.message));

            return res.json({
                success: true,
                message: 'Ödeme başarılı! Kredileriniz hesabınıza tanımlandı.',
                data: {
                    creditsAdded: selectedPackage.credits,
                    newBalance
                }
            });
        } else {
            // Database yoksa mock depoyu güncelle
            const userId = req.user.id;
            const mockData = mockStorage.addCredits(userId, selectedPackage.credits);

            // Create transaction record in mock storage
            mockTransactionStorage.addTransaction({
                userId,
                amount: selectedPackage.credits,
                transactionType: 'PURCHASE',
                description: `Kredi Yükleme`,
                balanceAfter: mockData.creditBalance
            });

            return res.json({
                success: true,
                message: 'İşlem başarılı (Test Modu - Geçici Bakiye Güncellendi)',
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
            // Get real transaction history from mock storage
            const mockHistory = mockTransactionStorage.getTransactions(req.user.id, 50);
            return res.json({ success: true, data: mockHistory });
        }
    } catch (error) {
        next(error);
    }
};
