import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { mockStorage, getAllMockUsers } from '../utils/mockStorage';
import * as adminController from '../controllers/adminController';

const router = Router();

// Middleware: Check if user is admin
const adminMiddleware = (req: Request, res: Response, next: any) => {
    const user = (req as any).user;
    if (!user || (user.userType !== 'ADMIN' && !user.email.startsWith('admin'))) {
        return res.status(403).json({
            success: false,
            message: 'Bu işlem için yönetici yetkisi gereklidir.'
        });
    }
    next();
};

// GET /admin/users - Get all users
router.get('/users', authenticate, adminMiddleware, adminController.getAllUsers);

// GET /admin/stats - Get statistics
router.get('/stats', authenticate, adminMiddleware, async (req: Request, res: Response) => {
    try {
        const allUsers = getAllMockUsers();
        const usersWithType = Object.entries(allUsers).map(([id, data]: [string, any]) => {
            let userType = data.userType || (id.endsWith('-ELECTRICIAN') ? 'ELECTRICIAN' : id.endsWith('-ADMIN') ? 'ADMIN' : 'CITIZEN');
            return { ...data, id, userType };
        });

        const citizens = usersWithType.filter((u: any) => u.userType === 'CITIZEN');
        const electricians = usersWithType.filter((u: any) => u.userType === 'ELECTRICIAN');

        const stats = {
            users: {
                total: usersWithType.length,
                citizens: citizens.length,
                electricians: electricians.length,
                admins: usersWithType.filter((u: any) => u.userType === 'ADMIN').length
            },
            activity: {
                totalCredits: electricians.reduce((acc, u) => acc + Number(u.creditBalance || 0), 0)
            }
        };

        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, message: 'İstatistikler yüklenirken hata oluştu' });
    }
});

router.get('/users/:id', authenticate, adminMiddleware, adminController.getUserDetails);
router.put('/users/:id', authenticate, adminMiddleware, adminController.updateUser);
router.get('/verifications', authenticate, adminMiddleware, adminController.getAllVerifications);
router.post('/verifications/process', authenticate, adminMiddleware, adminController.processVerification);
router.get('/dashboard-stats', authenticate, adminMiddleware, adminController.getDashboardStats);

// GET /admin/detailed-stats - Comprehensive strategic statistics
router.get('/detailed-stats', authenticate, adminMiddleware, adminController.getDetailedStats);

router.get('/jobs', authenticate, adminMiddleware, adminController.getAllJobs);

router.delete('/jobs/:id', authenticate, adminMiddleware, adminController.deleteJob);

// POST /admin/impersonate/:userId - Admin olarak başka bir hesaba geçici giriş yap
router.post('/impersonate/:userId', authenticate, adminMiddleware, adminController.impersonateUser);

// POST /admin/notifications/bulk - Bulk Push Notifications
router.post('/notifications/bulk', authenticate, adminMiddleware, adminController.sendBulkPushNotifications);

// DELETE /admin/users/:id - Delete User
router.delete('/users/:id', authenticate, adminMiddleware, adminController.deleteUser);

export default router;

