import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { mockStorage, getAllMockUsers } from '../utils/mockStorage';
import prisma from '../config/database';
import * as adminController from '../controllers/adminController';

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
        const { search, userType: filterType, page = '1', limit = '20' } = req.query;
        const pageNum = parseInt(page as string, 10);
        const limitNum = parseInt(limit as string, 10);
        const skip = (pageNum - 1) * limitNum;

        // ── Try real database first ──────────────────────────────────────
        let dbAvailable = false;
        try {
            const count = await prisma.user.count();
            dbAvailable = true;
        } catch (_) { /* DB not reachable */ }

        if (dbAvailable) {
            const where: any = {
                isActive: true,
                userType: { not: 'ADMIN' as any },
            };
            if (filterType && filterType !== 'ALL') {
                where.userType = filterType;
            }
            if (search) {
                const s = (search as string).toLowerCase();
                where.OR = [
                    { fullName: { contains: s, mode: 'insensitive' } },
                    { email: { contains: s, mode: 'insensitive' } },
                    { phone: { contains: s } },
                ];
            }

            const [dbUsers, total] = await Promise.all([
                prisma.user.findMany({
                    where,
                    skip,
                    take: limitNum,
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        phone: true,
                        userType: true,
                        profileImageUrl: true,
                        isVerified: true,
                        isActive: true,
                        createdAt: true,
                        notificationSettings: true,
                        pushToken: true,
                        electricianProfile: { select: { creditBalance: true, completedJobsCount: true, serviceCategory: true, verificationStatus: true } },
                        locations: true,
                    }
                }),
                prisma.user.count({ where })
            ]);

            const mapped = dbUsers.map((u: any) => {
                // Determine pushEnabled - more robust check
                let isPushEnabled = true; // default
                if (u.notificationSettings && typeof u.notificationSettings === 'object') {
                    const settings = u.notificationSettings as any;
                    if (settings.pushEnabled === false) {
                        isPushEnabled = false;
                    }
                }

                // Determine final status
                let calculatedPushStatus = 'DISABLED';
                if (isPushEnabled) {
                    calculatedPushStatus = u.pushToken ? 'ACTIVE' : 'PENDING';
                }

                console.log(`User: ${u.fullName}, Token: ${!!u.pushToken}, Enabled: ${isPushEnabled}, Result: ${calculatedPushStatus}`);

                return {
                    id: u.id,
                    fullName: u.fullName,
                    email: u.email,
                    phone: u.phone || '',
                    userType: u.userType,
                    profileImageUrl: u.profileImageUrl,
                    creditBalance: Number(u.electricianProfile?.creditBalance ?? 0),
                    isVerified: u.isVerified,
                    isActive: u.isActive,
                    verificationStatus: u.electricianProfile?.verificationStatus ?? null,
                    completedJobsCount: u.electricianProfile?.completedJobsCount ?? 0,
                    serviceCategory: u.electricianProfile?.serviceCategory ?? null,
                    locations: u.locations || [],
                    pushStatus: calculatedPushStatus,
                    createdAt: u.createdAt,
                };
            });

            return res.json({
                success: true,
                data: {
                    users: mapped,
                    pagination: {
                        total,
                        page: pageNum,
                        limit: limitNum,
                        totalPages: Math.ceil(total / limitNum),
                    }
                }
            });
        }

        // ── Fallback: mock storage ───────────────────────────────────────
        const allUsers = getAllMockUsers();

        let users = Object.entries(allUsers).map(([id, data]: [string, any]) => {
            let derivedUserType = data.userType;
            if (!derivedUserType) {
                if (id.endsWith('-ELECTRICIAN')) derivedUserType = 'ELECTRICIAN';
                else if (id.endsWith('-ADMIN')) derivedUserType = 'ADMIN';
                else derivedUserType = 'CITIZEN';
            }
            let pushStatus = 'DISABLED';
            const ns = data.notificationSettings || { pushEnabled: true };
            const pushEnabled = ns?.pushEnabled !== undefined ? ns.pushEnabled : true;

            if (pushEnabled) {
                pushStatus = data.pushToken ? 'ACTIVE' : 'PENDING';
            }

            return {
                id,
                fullName: data.fullName || 'İsimsiz Kullanıcı',
                email: data.email || '',
                phone: data.phone || '',
                userType: derivedUserType,
                profileImageUrl: data.profileImageUrl,
                creditBalance: data.creditBalance || 0,
                isVerified: data.isVerified || false,
                isActive: data.isActive !== false,
                verificationStatus: data.verificationStatus,
                createdAt: data.createdAt || new Date().toISOString(),
                experienceYears: data.experienceYears,
                specialties: data.specialties || [],
                completedJobsCount: data.completedJobsCount || 0,
                serviceCategory: data.serviceCategory,
                locations: data.locations || [],
                pushStatus
            };
        });

        if (filterType && filterType !== 'ALL') {
            users = users.filter(u => u.userType === filterType);
        }
        if (search) {
            const searchLower = (search as string).toLowerCase();
            users = users.filter(u =>
                u.fullName.toLowerCase().includes(searchLower) ||
                u.phone.includes(searchLower) ||
                u.email.toLowerCase().includes(searchLower)
            );
        }

        const startIndex = (pageNum - 1) * limitNum;
        const paginatedUsers = users.slice(startIndex, startIndex + limitNum);

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

        // Try real database first
        let dbAvailable = false;
        try { await prisma.user.count(); dbAvailable = true; } catch (_) { }

        if (dbAvailable && id && !(id as string).startsWith('mock-')) {
            try {
                const dbUser = await prisma.user.findUnique({
                    where: { id: id as string },
                    include: {
                        electricianProfile: true,
                        locations: true
                    }
                });
                if (dbUser) {
                    return res.json({ success: true, data: dbUser });
                }
            } catch (dbErr) {
                console.warn('Admin get user/:id DB error, falling back to mock');
            }
        }

        // Fallback: mock storage
        const userData = mockStorage.get(id as string);
        if (!userData) {
            return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
        }
        res.json({ success: true, data: { ...userData } });
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

        const userUpdates: any = {};
        const profileUpdates: any = {};

        if (isActive !== undefined) userUpdates.isActive = isActive;
        if (isVerified !== undefined) userUpdates.isVerified = isVerified;
        if (creditBalance !== undefined) profileUpdates.creditBalance = creditBalance;
        if (isVerified !== undefined && isVerified !== null) {
            profileUpdates.verificationStatus = isVerified ? 'VERIFIED' : 'PENDING';
        }

        let databaseUpdated = false;

        // Try real database first if not a mock ID
        if (id && !(id as string).startsWith('mock-')) {
            try {
                // Check if database is reachable
                await prisma.user.count({ take: 1 });

                // Update User table
                if (Object.keys(userUpdates).length > 0) {
                    await prisma.user.update({
                        where: { id: id as string },
                        data: userUpdates
                    });
                }

                // Update ElectricianProfile if it exists and we have profile updates
                if (Object.keys(profileUpdates).length > 0) {
                    const profile = await prisma.electricianProfile.findUnique({
                        where: { userId: id as string }
                    });

                    if (profile) {
                        await prisma.electricianProfile.update({
                            where: { userId: id as string },
                            data: profileUpdates
                        });
                    }
                }
                databaseUpdated = true;
                console.log(`✅ Database updated for user ${id}`);
            } catch (dbError) {
                console.error('Admin update user DB error:', dbError);
                // Will fall back to mock storage below
            }
        }

        // Fallback or additional update: mock storage
        // Essential for testing & demo accounts
        if (creditBalance !== undefined) {
            mockStorage.updateBalance(id as string, creditBalance);
        }

        const combinedUpdates = { ...userUpdates, ...profileUpdates };
        if (Object.keys(combinedUpdates).length > 0) {
            mockStorage.updateProfile(id as string, combinedUpdates);
        }

        res.json({
            success: true,
            message: databaseUpdated ? 'Kullanıcı güncellendi' : 'Kullanıcı güncellendi (Test Modu)',
            data: { id, ...userUpdates, ...profileUpdates }
        });
    } catch (error) {
        console.error('Admin update user error:', error);
        res.status(500).json({ success: false, message: 'Kullanıcı güncellenirken hata oluştu' });
    }
});

// GET /admin/stats - Get comprehensive platform statistics
router.get('/stats', authenticate, adminMiddleware, async (req: Request, res: Response) => {
    try {
        // ── Try real database first ────────────────────────────────────────
        let dbAvailable = false;
        try { await prisma.user.count(); dbAvailable = true; } catch (_) { }

        if (dbAvailable) {
            const [totalUsers, totalCitizens, totalElectricians, totalAdmins,
                verifiedElectricians, pendingVerifications, suspendedUsers,
                totalJobs, openJobs, completedJobs, cancelledJobs, totalBids, acceptedBids,
                categoryGroups] = await Promise.all([
                    prisma.user.count(),
                    prisma.user.count({ where: { userType: 'CITIZEN' as any } }),
                    prisma.user.count({ where: { userType: 'ELECTRICIAN' as any } }),
                    prisma.user.count({ where: { userType: 'ADMIN' as any } }),
                    prisma.electricianProfile.count({ where: { verificationStatus: 'VERIFIED' as any } }),
                    prisma.electricianProfile.count({ where: { verificationStatus: 'PENDING' as any } }),
                    prisma.user.count({ where: { isActive: false } }),
                    prisma.jobPost.count(),
                    prisma.jobPost.count({ where: { status: 'OPEN' as any } }),
                    prisma.jobPost.count({ where: { status: 'COMPLETED' as any } }),
                    prisma.jobPost.count({ where: { status: 'CANCELLED' as any } }),
                    prisma.bid.count(),
                    prisma.bid.count({ where: { status: 'ACCEPTED' as any } }),
                    prisma.electricianProfile.groupBy({ by: ['serviceCategory' as any], _count: { _all: true } }),
                ]);

            // City distribution from DB users
            const dbUsers = await prisma.user.findMany({
                where: { userType: { not: 'ADMIN' as any } },
                select: { userType: true, city: true }
            });
            const regionStats: { [city: string]: { electricians: number; citizens: number } } = {};
            dbUsers.forEach((u: any) => {
                const city = u.city || 'Belirtilmemiş';
                if (!regionStats[city]) regionStats[city] = { electricians: 0, citizens: 0 };
                if (u.userType === 'ELECTRICIAN') regionStats[city].electricians++;
                else if (u.userType === 'CITIZEN') regionStats[city].citizens++;
            });
            const topRegions = Object.entries(regionStats)
                .map(([city, c]) => ({ city, ...c, total: c.electricians + c.citizens }))
                .sort((a, b) => b.total - a.total).slice(0, 10);

            // Service categories from groupBy result
            const serviceCategories: Record<string, number> = { elektrik: 0, cilingir: 0, klima: 0, 'beyaz-esya': 0, tesisat: 0 };
            categoryGroups.forEach((g: any) => {
                const cat = g.serviceCategory || 'elektrik';
                if (cat in serviceCategories) serviceCategories[cat] = g._count._all;
            });

            return res.json({
                success: true,
                data: {
                    users: { total: totalUsers, citizens: totalCitizens, electricians: totalElectricians, admins: totalAdmins },
                    serviceCategories,
                    status: { verified: verifiedElectricians, pending: pendingVerifications, suspended: suspendedUsers },
                    activity: {
                        jobs: { total: totalJobs, open: openJobs, completed: completedJobs, cancelled: cancelledJobs },
                        bids: { total: totalBids, accepted: acceptedBids },
                        totalCredits: 0
                    },
                    regions: topRegions
                }
            });
        }

        // ── Fallback: mock storage ─────────────────────────────────────────
        const allUsers = getAllMockUsers();
        const usersWithType = Object.entries(allUsers).map(([id, data]: [string, any]) => {
            let userType = data.userType;
            if (!userType) {
                if (id.endsWith('-ELECTRICIAN')) userType = 'ELECTRICIAN';
                else if (id.endsWith('-ADMIN')) userType = 'ADMIN';
                else userType = 'CITIZEN';
            }
            return { ...data, id, userType };
        });
        const citizens = usersWithType.filter((u: any) => u.userType === 'CITIZEN');
        const electricians = usersWithType.filter((u: any) => u.userType === 'ELECTRICIAN');
        const serviceCategories = {
            elektrik: electricians.filter((u: any) => u.serviceCategory === 'elektrik' || !u.serviceCategory).length,
            cilingir: electricians.filter((u: any) => u.serviceCategory === 'cilingir').length,
            klima: electricians.filter((u: any) => u.serviceCategory === 'klima').length,
            'beyaz-esya': electricians.filter((u: any) => u.serviceCategory === 'beyaz-esya').length,
            tesisat: electricians.filter((u: any) => u.serviceCategory === 'tesisat').length
        };
        const regionStats: { [city: string]: { electricians: number; citizens: number } } = {};
        usersWithType.forEach((user: any) => {
            const city = user.locations?.[0]?.city || user.city || 'Belirtilmemiş';
            if (!regionStats[city]) regionStats[city] = { electricians: 0, citizens: 0 };
            if (user.userType === 'ELECTRICIAN') regionStats[city].electricians++;
            else if (user.userType === 'CITIZEN') regionStats[city].citizens++;
        });
        const topRegions = Object.entries(regionStats)
            .map(([city, c]) => ({ city, ...c, total: c.electricians + c.citizens }))
            .sort((a, b) => b.total - a.total).slice(0, 10);

        let jobStats = { total: 0, open: 0, completed: 0, cancelled: 0 };
        let bidStats = { total: 0, accepted: 0 };
        let totalCredits = 0;
        electricians.forEach((u: any) => { totalCredits += Number(u.creditBalance) || 0; });

        res.json({
            success: true,
            data: {
                users: { total: usersWithType.length, citizens: citizens.length, electricians: electricians.length, admins: usersWithType.filter((u: any) => u.userType === 'ADMIN').length },
                serviceCategories,
                status: { verified: electricians.filter((u: any) => u.isVerified).length, pending: usersWithType.filter((u: any) => u.verificationStatus === 'PENDING').length, suspended: usersWithType.filter((u: any) => u.isActive === false).length },
                activity: { jobs: jobStats, bids: bidStats, totalCredits: Math.round(totalCredits) },
                regions: topRegions
            }
        });
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ success: false, message: 'İstatistikler yüklenirken hata oluştu' });
    }
});



// GET /admin/verifications - Get all pending verifications
router.get('/verifications', authenticate, adminMiddleware, adminController.getAllVerifications);

// POST /admin/verifications/process - Approve/Reject verification
router.post('/verifications/process', authenticate, adminMiddleware, adminController.processVerification);

// GET /admin/dashboard-stats - Fast lookup for dashboard cards
router.get('/dashboard-stats', authenticate, adminMiddleware, adminController.getDashboardStats);

// GET /admin/jobs - Get all jobs for management
router.get('/jobs', authenticate, adminMiddleware, adminController.getAllJobs);

// DELETE /admin/jobs/:id - Force delete a job
router.delete('/jobs/:id', authenticate, adminMiddleware, adminController.deleteJob);

export default router;
