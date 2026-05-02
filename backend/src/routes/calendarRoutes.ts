import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getEvents,
  createEvent,
  updateEvent,
  completeEvent,
  deleteEvent,
} from '../controllers/calendarController';

const router = Router();

// Tüm route'lar authentication gerektiriyor
router.use(authenticate);

// GET /calendar — Takvim etkinliklerini listele
router.get('/', getEvents);

// POST /calendar — Yeni etkinlik oluştur
router.post('/', createEvent);

// PUT /calendar/:id — Etkinlik güncelle
router.put('/:id', updateEvent);

// PUT /calendar/:id/complete — Etkinliği tamamla
router.put('/:id/complete', completeEvent);

// DELETE /calendar/:id — Etkinlik sil
router.delete('/:id', deleteEvent);

export default router;
