import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import conversationService from '../services/conversationService';
import messageService from '../services/messageService';

const router = Router();

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    userType: string;
  };
}

// Tüm route'lar authentication gerektiriyor
router.use(authenticate);

// GET /conversations - Kullanıcının tüm konuşmalarını getir
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Unauthorized' },
      });
    }

    try {
      const conversations = await conversationService.getConversations(req.user.id);
      res.json({
        success: true,
        data: { conversations },
      });
    } catch (dbError: any) {
      // Database bağlantısı yoksa boş liste döndür
      console.warn('Database error, returning empty conversations:', dbError.message);
      res.json({
        success: true,
        data: { conversations: [] },
      });
    }
  } catch (error: any) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        error: { message: error.message },
      });
    }
    next(error);
  }
});

// POST /conversations - Yeni konuşma başlat
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Unauthorized' },
      });
    }

    const { recipientId, jobPostId } = req.body;

    if (!recipientId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Alıcı ID gereklidir' },
      });
    }

    try {
      const conversation = await conversationService.getOrCreateConversation(
        req.user.id,
        recipientId,
        jobPostId
      );

      res.status(201).json({
        success: true,
        data: { conversation },
      });
    } catch (dbError: any) {
      // Database bağlantısı yoksa 503 döndür
      console.warn('Database error, cannot create conversation:', dbError.message);
      res.status(503).json({
        success: false,
        error: { message: 'Mesajlaşma için veritabanı bağlantısı gereklidir.' },
      });
    }
  } catch (error: any) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        error: { message: error.message },
      });
    }
    next(error);
  }
});

// GET /conversations/:id - Tek bir konuşmayı getir
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Unauthorized' },
      });
    }

    const { id } = req.params;
    const conversation = await conversationService.getConversation(id, req.user.id);

    res.json({
      success: true,
      data: { conversation },
    });
  } catch (error: any) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        error: { message: error.message },
      });
    }
    next(error);
  }
});

// GET /conversations/:id/messages - Konuşma mesajlarını getir
router.get('/:id/messages', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Unauthorized' },
      });
    }

    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const result = await conversationService.getMessages(
      id,
      req.user.id,
      parseInt(page as string),
      parseInt(limit as string)
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        error: { message: error.message },
      });
    }
    next(error);
  }
});

// POST /conversations/:id/messages - Mesaj gönder (HTTP fallback)
router.post('/:id/messages', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Unauthorized' },
      });
    }

    const { id } = req.params;
    const { content, messageType = 'TEXT' } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: { message: 'Mesaj içeriği gereklidir' },
      });
    }

    const message = await messageService.sendMessage(id, req.user.id, content, messageType);

    res.status(201).json({
      success: true,
      data: { message },
    });
  } catch (error: any) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        error: { message: error.message },
      });
    }
    next(error);
  }
});

// PUT /conversations/:id/read - Mesajları okundu olarak işaretle
router.put('/:id/read', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Unauthorized' },
      });
    }

    const { id } = req.params;
    await messageService.markAsRead(id, req.user.id);

    res.json({
      success: true,
      message: 'Mesajlar okundu olarak işaretlendi',
    });
  } catch (error: any) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        error: { message: error.message },
      });
    }
    next(error);
  }
});

export default router;
