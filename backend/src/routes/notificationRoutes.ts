import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import prisma, { isDatabaseAvailable } from '../config/database';

// Mock bildirim verileri üreten yardımcı fonksiyon
const getMockNotifications = (userId: string, userType: string = 'CITIZEN') => {
  const commonNotifications = [
    {
      id: 'mock-notif-msg',
      userId,
      type: 'MESSAGE_RECEIVED',
      title: 'Yeni Mesaj',
      message: 'Size yeni bir mesaj gönderildi.',
      isRead: true,
      relatedType: 'CONVERSATION',
      relatedId: 'mock-conv-1',
      createdAt: new Date(Date.now() - 3600000).toISOString()
    }
  ];

  if (userType === 'ELECTRICIAN') {
    return [
      {
        id: 'mock-notif-job-avail',
        userId,
        type: 'new_job_available',
        title: 'Yeni İş Fırsatı',
        message: 'Bölgenizde yeni bir iş ilanı yayınlandı.',
        isRead: false,
        relatedId: 'mock-1',
        createdAt: new Date().toISOString()
      },
      {
        id: 'mock-notif-bid-acc',
        userId,
        type: 'BID_ACCEPTED',
        title: 'Teklifiniz Kabul Edildi',
        message: 'Mutfak tesisatı için verdiğiniz teklif kabul edildi.',
        isRead: false,
        relatedId: 'mock-2',
        createdAt: new Date(Date.now() - 1800000).toISOString()
      },
      ...commonNotifications
    ];
  }

  // Default for CITIZEN
  return [
    {
      id: 'mock-notif-bid-rec',
      userId,
      type: 'BID_RECEIVED',
      title: 'Yeni Teklif',
      message: 'İlanınıza yeni bir teklif geldi.',
      isRead: false,
      relatedId: 'mock-1',
      createdAt: new Date().toISOString()
    },
    {
      id: 'mock-notif-job-upd',
      userId,
      type: 'JOB_UPDATED',
      title: 'İlan Güncellendi',
      message: 'İlanınız onaylandı ve yayına alındı.',
      isRead: false,
      relatedId: 'mock-3',
      createdAt: new Date(Date.now() - 86400000).toISOString()
    },
    ...commonNotifications
  ];
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

// Mark notification as read
router.put('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    if (!isDatabaseAvailable || userId.startsWith('mock-') || id.startsWith('mock-')) {
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

