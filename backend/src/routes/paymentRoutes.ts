import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as paymentController from '../controllers/paymentController';

const router = Router();

// Tüm ödeme rotaları kimlik doğrulaması gerektirir
router.use(authenticate);

// Kredi Paketlerini Listele
router.get('/packages', paymentController.getCreditPackages);

// Kredi Satın Al (Eski yöntem - admin kredi ekleme vb.)
router.post('/purchase', paymentController.purchaseCredits);

// Google Play IAP Doğrulama ve Kredi Yükleme
router.post('/verify-purchase', paymentController.verifyAndGrantPurchase);

// İşlem Geçmişi
router.get('/history', paymentController.getTransactionHistory);

export default router;
