import { Router } from 'express';
import {
  createJobController,
  getJobByIdController,
  getJobsController,
  getMyJobsController,
  updateJobController,
  deleteJobController,
  cancelJobController,
  markJobCompleteController,
  confirmJobCompleteController,
  createReviewController,
} from '../controllers/jobController';
import { getJobBidsController } from '../controllers/bidController';
import { authenticate, optionalAuthenticate } from '../middleware/auth';

const router = Router();

// Public routes - authentication optional (herkes açık ilanları görebilir)
router.get('/', optionalAuthenticate, getJobsController);
// Bids route'u daha spesifik olduğu için önce tanımlanmalı
router.get('/:jobId/bids', optionalAuthenticate, getJobBidsController); // Bids listesi public
// IMPORTANT: /my-jobs must come BEFORE /:id to avoid route conflict
router.get('/my-jobs', authenticate, getMyJobsController);
router.get('/:id', optionalAuthenticate, getJobByIdController);

// Protected routes - authentication required
router.use(authenticate);

router.post('/', createJobController);
router.put('/:id', updateJobController);
router.delete('/:id', deleteJobController);

// Yeni endpoint'ler - İlan İptali, Tamamlama, Değerlendirme
router.post('/:id/cancel', cancelJobController);
router.post('/:id/mark-complete', markJobCompleteController);
router.post('/:id/confirm-complete', confirmJobCompleteController);
router.post('/:id/review', createReviewController);

console.log('✅ Job routes loaded: cancel, mark-complete, confirm-complete, review');

export default router;
