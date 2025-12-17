import { Router } from 'express';
import {
  createBidController,
  getBidByIdController,
  getJobBidsController,
  getMyBidsController,
  updateBidController,
  acceptBidController,
  rejectBidController,
  withdrawBidController,
  deleteBidController,
} from '../controllers/bidController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Bid routes
router.post('/', createBidController);
router.get('/my-bids', getMyBidsController);
router.get('/:id', getBidByIdController);
router.put('/:id', updateBidController);
router.post('/:id/accept', acceptBidController);
router.post('/:id/reject', rejectBidController);
router.post('/:id/withdraw', withdrawBidController);
router.delete('/:id', deleteBidController);

export default router;

