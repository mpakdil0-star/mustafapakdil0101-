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

    // Find or create conversation between sender and receiver
    const { mockStore } = require('../utils/mockStore');
    let conversation = mockStore.findConversationByParticipants(userId, receiverId);

    if (!conversation) {
      // Create new conversation
      const conversationId = jobId ? `mock-conv-${jobId}` : `mock-conv-${userId}-${receiverId}`;
      conversation = {
        id: conversationId,
        participant1Id: userId,
        participant2Id: receiverId,
        jobPostId: jobId || null,
        bidId: bidId || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastMessage: null,
        lastMessageAt: null,
      };
      mockStore.saveConversation(conversation);
      console.log(`💬 [MESSAGE] Created new conversation: ${conversationId}`);
    }

    // Create and save message
    const messageData = {
      id: `mock-msg-${Date.now()}`,
      conversationId: conversation.id,
      senderId: userId,
      receiverId: receiverId,
      recipientId: receiverId,
      content: content || '',
      createdAt: new Date().toISOString(),
      isRead: false,
      messageType: 'TEXT'
    };

    mockStore.saveMessage(messageData);
    console.log(`✅ [MESSAGE] Message saved to mockStore`);

    // Send real-time notification
    const { notifyUser } = require('../server');
    notifyUser(receiverId, 'new_message', {
      ...messageData,
      title: 'Yeni Mesaj 💬',
      message: content?.substring(0, 50) + (content?.length > 50 ? '...' : '')
    });

    // Create notification in notification center
    const { addMockNotification } = require('./notificationRoutes');
    const notification = {
      id: `mock-notif-${Date.now()}-msg`,
      userId: receiverId,
      type: 'MESSAGE_RECEIVED',
      title: 'Yeni Mesaj 💬',
      message: content?.substring(0, 80) + (content?.length > 80 ? '...' : ''),
      isRead: false,
      relatedId: conversation.id,
      relatedType: 'CONVERSATION',
      createdAt: new Date().toISOString()
    };
    addMockNotification(receiverId, notification);

    res.json({
      success: true,
      data: {
        message: messageData,
        conversationId: conversation.id
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

