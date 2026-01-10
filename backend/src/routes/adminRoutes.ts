import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { mockStorage, getAllMockUsers } from '../utils/mockStorage';

const router = Router();

// Middleware: Check if user is admin
const adminMiddleware = (req: Request, res: Response, next: any) => {
    const user = (req as any).user;
    // Allow if userType is ADMIN or if email indicates admin (for testing)
    if (!user || (user.userType !== 'ADMIN' && !user.email.startsWith('admin'))) {
        return res.status(403).json({
            success: false,
            message: 'Bu işlem için yönetici yetkisi gereklidir.'
        });
    }
    next();
};

// GET /admin/users - Get all users
router.get('/users', authenticate, adminMiddleware, async (req: Request, res: Response) => {
    try {
        const { search, userType, page = '1', limit = '20' } = req.query;

        // Get all users from mock storage
        const allUsers = getAllMockUsers();

        let users = Object.entries(allUsers).map(([id, data]: [string, any]) => ({
            id,
            fullName: data.fullName || 'İsimsiz Kullanıcı',
            email: data.email || '',
            phone: data.phone || '',
            userType: data.userType || 'CITIZEN',
            profileImageUrl: data.profileImageUrl,
            creditBalance: data.creditBalance || 0,
            isVerified: data.isVerified || false,
            isActive: data.isActive !== false,
            verificationStatus: data.verificationStatus,
            createdAt: data.createdAt || new Date().toISOString(),
            experienceYears: data.experienceYears,
            specialties: data.specialties || [],
            completedJobsCount: data.completedJobsCount || 0,
            serviceCategory: data.serviceCategory
        }));

        // Filter by userType
        if (userType && userType !== 'ALL') {
            users = users.filter(u => u.userType === userType);
        }

        // Search filter
        if (search) {
            const searchLower = (search as string).toLowerCase();
            users = users.filter(u =>
                u.fullName.toLowerCase().includes(searchLower) ||
                u.phone.includes(searchLower) ||
                u.email.toLowerCase().includes(searchLower)
            );
        }

        // Pagination
        const pageNum = parseInt(page as string, 10);
        const limitNum = parseInt(limit as string, 10);
        const startIndex = (pageNum - 1) * limitNum;
        const endIndex = startIndex + limitNum;
        const paginatedUsers = users.slice(startIndex, endIndex);

        res.json({
            success: true,
            data: {
                users: paginatedUsers,
                pagination: {
                    total: users.length,
                    page: pageNum,
                    limit: limitNum,
                    totalPages: Math.ceil(users.length / limitNum)
                }
            }
        });
    } catch (error) {
        console.error('Admin get users error:', error);
        res.status(500).json({ success: false, message: 'Kullanıcılar yüklenirken hata oluştu' });
    }
});

// GET /admin/users/:id - Get single user details
router.get('/users/:id', authenticate, adminMiddleware, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const userData = mockStorage.get(id);

        if (!userData) {
            return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
        }

        res.json({
            success: true,
            data: {
                ...userData
            }
        });
    } catch (error) {
        console.error('Admin get user error:', error);
        res.status(500).json({ success: false, message: 'Kullanıcı bilgileri yüklenirken hata oluştu' });
    }
});

// PUT /admin/users/:id - Update user (suspend, add credits, etc.)
router.put('/users/:id', authenticate, adminMiddleware, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { isActive, creditBalance, isVerified } = req.body;

        const userData = mockStorage.get(id);
        if (!userData) {
            return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
        }

        const updates: any = {};

        if (isActive !== undefined) {
            updates.isActive = isActive;
        }

        if (creditBalance !== undefined) {
            updates.creditBalance = creditBalance;
            mockStorage.updateBalance(id, creditBalance);
        }

        if (isVerified !== undefined) {
            updates.isVerified = isVerified;
        }

        if (Object.keys(updates).length > 0) {
            mockStorage.updateProfile(id, updates);
        }

        res.json({
            success: true,
            message: 'Kullanıcı güncellendi',
            data: { id, ...updates }
        });
    } catch (error) {
        console.error('Admin update user error:', error);
        res.status(500).json({ success: false, message: 'Kullanıcı güncellenirken hata oluştu' });
    }
});

// GET /admin/stats - Get platform statistics
router.get('/stats', authenticate, adminMiddleware, async (req: Request, res: Response) => {
    try {
        const allUsers = getAllMockUsers();
        const usersArray = Object.values(allUsers);

        const stats = {
            totalUsers: usersArray.length,
            totalCitizens: usersArray.filter((u: any) => u.userType === 'CITIZEN').length,
            totalElectricians: usersArray.filter((u: any) => u.userType === 'ELECTRICIAN').length,
            verifiedElectricians: usersArray.filter((u: any) => u.isVerified && u.userType === 'ELECTRICIAN').length,
            pendingVerifications: usersArray.filter((u: any) => u.verificationStatus === 'PENDING').length,
            suspendedUsers: usersArray.filter((u: any) => u.isActive === false).length
        };

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ success: false, message: 'İstatistikler yüklenirken hata oluştu' });
    }
});

export default router;
