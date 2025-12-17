import { Router } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Send a message
router.post('/', async (req, res) => {
  try {
    const { receiverId, content, jobId, bidId } = req.body;
    // TODO: Implement message service
    res.json({
      success: true,
      data: {
        message: {
          id: 'temp-id',
          receiverId,
          content,
          createdAt: new Date().toISOString(),
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send message',
    });
  }
});

export default router;

