import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getEntries,
  getSummary,
  createEntry,
  updateEntry,
  markPaid,
  deleteEntry,
} from '../controllers/ledgerController';

const router = Router();

// Tüm route'lar authentication gerektiriyor
router.use(authenticate);

// GET /ledger/summary — Toplam alacak/verecek özeti (must be before /:id)
router.get('/summary', getSummary);

// GET /ledger — Kayıtları listele
router.get('/', getEntries);

// POST /ledger — Yeni kayıt ekle
router.post('/', createEntry);

// PUT /ledger/:id — Kayıt güncelle
router.put('/:id', updateEntry);

// PUT /ledger/:id/paid — Ödendi olarak işaretle
router.put('/:id/paid', markPaid);

// DELETE /ledger/:id — Kayıt sil
router.delete('/:id', deleteEntry);

export default router;
