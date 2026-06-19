import { Router } from 'express';
import { handleAiChat } from '../controllers/aiController';
import { authenticate } from '../middleware/auth';

const router = Router();

// POST /api/v1/ai/chat
router.post('/chat', authenticate as any, handleAiChat as any);

export default router;
