import { Router } from 'express';
import { handleAiChat, getCostEstimate } from '../controllers/aiController';
import { authenticate } from '../middleware/auth';

const router = Router();

// POST /api/v1/ai/chat
router.post('/chat', authenticate as any, handleAiChat as any);

// GET /api/v1/ai/cost-estimate?category=elektrik
router.get('/cost-estimate', authenticate as any, getCostEstimate as any);

export default router;
