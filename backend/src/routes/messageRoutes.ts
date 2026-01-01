import { Router } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Send a message
router.post('/', async (req, res) => {
  try {
    const { receiverId, content, jobId, bidId } = req.body;
    const userId = (req as any).user?.id;

    console.log(`✉️ [MESSAGE] From ${userId} to ${receiverId} - Content: ${content?.substring(0, 20)}...`);

    // Her zaman bir conversationId dön ki mobil uygulama yönlendirme yapabilsin
    // jobId varsa o işe özel konuşma ID'si oluştur, yoksa alıcıya özel
    const conversationId = jobId ? `mock-conv-${jobId}` : `mock-conv-u-${receiverId}`;

    const messageData = {
      id: `mock-msg-${Date.now()}`,
      conversationId: conversationId,
      senderId: userId,
      receiverId: receiverId,
      recipientId: receiverId,
      content: content || '',
      createdAt: new Date().toISOString(),
      isRead: false
    };

    // Bildirim gönder (Arka planda çalışsın)
    const { notifyUser } = require('../server');
    notifyUser(receiverId, 'new_message', {
      ...messageData,
      title: 'Yeni Mesaj 💬',
      message: content?.substring(0, 50) + (content?.length > 50 ? '...' : '')
    });

    res.json({
      success: true,
      data: {
        message: messageData,
      },
    });
  } catch (error: any) {
    console.error('❌ Failed to send message:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send message',
    });
  }
});

export default router;

