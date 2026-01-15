import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import prisma, { isDatabaseAvailable } from '../config/database';

// In-memory mock notification storage: userId -> notifications[]
const mockNotifications = new Map<string, any[]>();

// Helper to add a notification for a user
export const addMockNotification = (userId: string, notification: any) => {
  if (!mockNotifications.has(userId)) {
    mockNotifications.set(userId, []);
  }
  const userNotifications = mockNotifications.get(userId) || [];
  userNotifications.unshift(notification); // Add to beginning
  mockNotifications.set(userId, userNotifications);
  console.log(`✅ Mock notification added for user ${userId}:`, notification.title);
};

export const clearMockNotificationsByRelatedId = (userId: string, type: string, relatedId: string) => {
  const userNotifications = mockNotifications.get(userId) || [];
  userNotifications.forEach(n => {
    if (n.type === type && n.relatedId === relatedId) {
      n.isRead = true;
    }
  });
  console.log(`🧹 Mock notifications cleared for user ${userId} (type: ${type}, relatedId: ${relatedId})`);
};

// Mock bildirim verileri üreten yardımcı fonksiyon
const getMockNotifications = (userId: string, userType: string = 'CITIZEN'): any[] => {
  // Return stored notifications for this user
  return mockNotifications.get(userId) || [];
};

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all notifications for the authenticated user
router.get('/', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const userType = (req as any).user.userType;

    // Veritabanı bağlantı hatası veya mock kullanıcı durumunda mock verileri dön
    if (!isDatabaseAvailable || userId.startsWith('mock-')) {
      console.warn('⚠️ Bildirimler için mock veriler dönülüyor');
      return res.json({
        success: true,
        data: {
          notifications: getMockNotifications(userId, userType),
        },
      });
    }

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.json({
      success: true,
      data: {
        notifications,
      },
    });
  } catch (error: any) {
    const isConnectionError =
      error.message?.includes('connect') ||
      error.message?.includes('database') ||
      error.code === 'P1001';

    if (isConnectionError) {
      const user = (req as any).user || { id: 'mock-user', userType: 'CITIZEN' };
      return res.json({
        success: true,
        data: {
          notifications: getMockNotifications(user.id, user.userType),
        },
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch notifications',
    });
  }
});

// Get unread count
router.get('/unread-count', async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const userType = (req as any).user.userType;

    if (!isDatabaseAvailable || userId.startsWith('mock-')) {
      const mockNotifs = getMockNotifications(userId, userType);
      const count = mockNotifs.filter(n => !n.isRead).length;
      return res.json({
        success: true,
        data: { count },
      });
    }

    const count = await prisma.notification.count({
      where: {
        userId,
        isRead: false
      }
    });

    res.json({
      success: true,
      data: {
        count,
      },
    });
  } catch (error: any) {
    const isConnectionError =
      error.message?.includes('connect') ||
      error.message?.includes('database') ||
      error.code === 'P1001';

    if (isConnectionError) {
      const user = (req as any).user || { id: 'mock-user', userType: 'CITIZEN' };
      const mockNotifs = getMockNotifications(user.id, user.userType);
      const count = mockNotifs.filter(n => !n.isRead).length;
      return res.json({
        success: true,
        data: { count },
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch unread count',
    });
  }
});

// Mark notifications for a specific related item as read (e.g. all messages for a conversation)
router.put('/related-read', async (req, res) => {
  try {
    const { type, relatedId } = req.body;
    const userId = (req as any).user.id;

    if (!type || !relatedId) {
      return res.status(400).json({
        success: false,
        error: 'Type and relatedId are required'
      });
    }

    if (!isDatabaseAvailable || userId.startsWith('mock-')) {
      clearMockNotificationsByRelatedId(userId, type, relatedId);
      return res.json({
        success: true,
        data: { message: 'Related notifications marked as read (Mock)' },
      });
    }

    await prisma.notification.updateMany({
      where: {
        userId,
        type,
        relatedId,
        isRead: false
      },
      data: { isRead: true }
    });

    res.json({
      success: true,
      data: { message: 'Related notifications marked as read' },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to mark related notifications as read',
    });
  }
});

// Mark notification as read
router.put('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    if (!isDatabaseAvailable || userId.startsWith('mock-') || id.startsWith('mock-')) {
      // Update mock notification in storage
      const userNotifications = mockNotifications.get(userId) || [];
      const notification = userNotifications.find(n => n.id === id);
      if (notification) {
        notification.isRead = true;
        console.log(`✅ Mock notification ${id} marked as read for user ${userId}`);
      }
      return res.json({
        success: true,
        data: { message: 'Marked as read (Mock)' },
      });
    }

    await prisma.notification.updateMany({
      where: {
        id,
        userId // Security check
      },
      data: { isRead: true }
    });

    res.json({
      success: true,
      data: { message: 'Marked as read' },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to mark as read',
    });
  }
});

// Mark all notifications as read
router.put('/read-all', async (req, res) => {
  try {
    const userId = (req as any).user.id;

    if (!isDatabaseAvailable || userId.startsWith('mock-')) {
      // Mark all mock notifications as read
      const userNotifications = mockNotifications.get(userId) || [];
      userNotifications.forEach(n => {
        n.isRead = true;
      });
      console.log(`✅ All mock notifications marked as read for user ${userId}`);
      return res.json({
        success: true,
        data: { message: 'All marked as read (Mock)' },
      });
    }

    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    });

    res.json({
      success: true,
      data: { message: 'All marked as read' },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to mark all as read',
    });
  }
});

// Delete notification
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    if (!isDatabaseAvailable || userId.startsWith('mock-') || id.startsWith('mock-')) {
      return res.json({
        success: true,
        data: { message: 'Notification deleted (Mock)' },
      });
    }

    await prisma.notification.deleteMany({
      where: { id, userId }
    });

    res.json({
      success: true,
      data: { message: 'Notification deleted' },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete notification',
    });
  }
});

export default router;

