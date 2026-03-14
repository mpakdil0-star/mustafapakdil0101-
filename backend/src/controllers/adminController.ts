import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import prisma, { isDatabaseAvailable } from '../config/database';
import { mockStorage } from '../utils/mockStorage';
import { notifyUser } from '../server';
import pushNotificationService from '../services/pushNotificationService';
import { jobStoreById, deleteMockJob, getAllMockJobs, loadMockJobs } from './jobController';
import { mockTransactionStorage } from '../utils/mockStorage';

/**
 * Get all pending verifications
 * Admin ONLY
 */
export const getAllVerifications = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = (req as any).user;

        // Extra check just in case, though middleware handles it
        if (user.userType !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                error: { message: 'Bu işlem için admin yetkisi gereklidir' },
            });
        }

        // FAST PATH: Mock results for testing if DB is down
        if (!isDatabaseAvailable || user.id.startsWith('mock-')) {
            const allUsers = mockStorage.getAllUsers();
            const pendingMocks = allUsers
                .filter(u =>
                    u.userType === 'ELECTRICIAN' &&
                    u.verificationStatus === 'PENDING' &&
                    u.electricianProfile?.verificationDocuments &&
                    (u.electricianProfile.verificationDocuments as any).documentUrl // Only show if they uploaded a document
                )
                .map(u => ({
                    userId: u.id,
                    verificationStatus: 'PENDING',
                    verificationDocuments: u.electricianProfile?.verificationDocuments,
                    serviceCategory: u.electricianProfile?.serviceCategory,
                    user: {
                        id: u.id,
                        fullName: u.fullName,
                        email: u.email,
                        phone: u.phone
                    }
                }));

            // NOTE: We don't auto-add the sample mock user anymore unless they'd have a document
            // This satisfies the user request: "don't show every registered master"

            return res.json({
                success: true,
                data: pendingMocks
            });
        }

        try {
            const pendingProfiles = await prisma.electricianProfile.findMany({
                where: {
                    verificationStatus: 'PENDING',
                    verificationDocuments: { not: null as any }
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            fullName: true,
                            email: true,
                            phone: true,
                        }
                    }
                },
                orderBy: {
                    updatedAt: 'desc'
                }
            });

            res.json({
                success: true,
                data: pendingProfiles,
            });
        } catch (dbErr: any) {
            console.error('Database error in getAllVerifications:', dbErr.message);
            // Fallback to mock storage instead of hardcoded sample
            const allUsers = mockStorage.getAllUsers();
            const pendingMocks = allUsers
                .filter(u =>
                    u.userType === 'ELECTRICIAN' &&
                    u.verificationStatus === 'PENDING' &&
                    u.electricianProfile?.verificationDocuments &&
                    (u.electricianProfile.verificationDocuments as any).documentUrl
                )
                .map(u => ({
                    userId: u.id,
                    verificationStatus: 'PENDING',
                    verificationDocuments: u.electricianProfile?.verificationDocuments,
                    serviceCategory: u.electricianProfile?.serviceCategory,
                    user: {
                        id: u.id,
                        fullName: u.fullName,
                        email: u.email,
                        phone: u.phone
                    }
                }));

            res.json({
                success: true,
                data: pendingMocks
            });
        }
    } catch (error) {
        console.error('Error in getAllVerifications:', error);
        next(error);
    }
};

/**
 * Process a verification request (Approve or Reject)
 * Admin ONLY
 */
export const processVerification = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const adminUser = (req as any).user;
        const { targetUserId, status, reason } = req.body;

        if (adminUser.userType !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                error: { message: 'Bu işlem için admin yetkisi gereklidir' },
            });
        }

        if (!['VERIFIED', 'REJECTED'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: { message: 'Geçersiz durum. VERIFIED veya REJECTED olmalı.' },
            });
        }

        // FAST PATH: Mock processing for test users
        if (!isDatabaseAvailable || adminUser.id.startsWith('mock-')) {
            console.warn('⚠️ processVerification: DB down, updating mockStorage');

            mockStorage.updateProfile(targetUserId, {
                verificationStatus: status,
                isVerified: status === 'VERIFIED'
            });

            // Award 5 bonus credits for first-time verification as promised
            if (status === 'VERIFIED') {
                mockStorage.addCredits(targetUserId, 5);
                console.log(`🎁 5 credits awarded to ${targetUserId} upon verification`);
            }

            return res.json({
                success: true,
                message: `Başvuru ${status === 'VERIFIED' ? 'onaylandı' : 'reddedildi'} (Test Modu).`,
                data: { userId: targetUserId, verificationStatus: status }
            });
        }

        try {
            const currentProfile = await prisma.electricianProfile.findUnique({
                where: { userId: targetUserId }
            });

            if (!currentProfile) {
                return res.status(404).json({
                    success: false,
                    error: { message: 'Kullanıcı profili bulunamadı' },
                });
            }

            const verificationDocuments: any = currentProfile.verificationDocuments || {};

            const updatedProfile = await prisma.electricianProfile.update({
                where: { userId: targetUserId },
                data: {
                    verificationStatus: status,
                    licenseVerified: status === 'VERIFIED',
                    verificationDocuments: {
                        ...verificationDocuments,
                        reviewedAt: new Date().toISOString(),
                        reviewedBy: adminUser.id,
                        rejectionReason: status === 'REJECTED' ? reason : undefined,
                    },
                },
            });

            // Also update the main User table isVerified field if approved
            if (status === 'VERIFIED') {
                await prisma.user.update({
                    where: { id: targetUserId },
                    data: { isVerified: true }
                });
            }

            // --- NOTIFICATION LOGIC ---
            const notificationTitle = status === 'VERIFIED' ? 'Üyeliğiniz Onaylandı! 🎉' : 'Belge Onay Hatası ❌';
            const notificationMessage = status === 'VERIFIED'
                ? 'Tebrikler, belgeleriniz onaylandı! Artık "Onaylı Usta" rozeti ile daha fazla iş alabilirsiniz.'
                : (reason || 'Yüklediğiniz belgeler uygun görülmedi. Lütfen eksiklikleri giderip tekrar yükleyin.');

            try {
                // 1. In-App Socket Notification
                notifyUser(targetUserId, 'notification', {
                    type: status === 'VERIFIED' ? 'verification_approved' : 'verification_rejected',
                    title: notificationTitle,
                    message: notificationMessage,
                });

                // 2. Database Notification (If DB is available)
                if (isDatabaseAvailable && !targetUserId.startsWith('mock-')) {
                    await prisma.notification.create({
                        data: {
                            userId: targetUserId,
                            type: status === 'VERIFIED' ? 'VERIFICATION_SUCCESS' : 'VERIFICATION_FAILED',
                            title: notificationTitle,
                            message: notificationMessage,
                            relatedType: 'USER_PROFILE',
                            relatedId: targetUserId,
                        }
                    });

                    // 3. Push Notification (If token exists)
                    const targetUser = await prisma.user.findUnique({
                        where: { id: targetUserId },
                        select: { pushToken: true }
                    });

                    if (targetUser?.pushToken) {
                        await pushNotificationService.sendNotification({
                            to: targetUser.pushToken,
                            title: notificationTitle,
                            body: notificationMessage,
                            data: { type: 'verification_status', status }
                        });
                    }
                } else {
                    console.log(`📡 Mock notification triggered for user ${targetUserId}: ${notificationTitle}`);
                }
            } catch (notifErr) {
                console.error('Notification trigger error in processVerification:', notifErr);
            }

            res.json({
                success: true,
                message: `Başvuru ${status === 'VERIFIED' ? 'onaylandı' : 'reddedildi'}.`,
                data: updatedProfile,
            });
        } catch (dbErr: any) {
            console.error('Database error in processVerification:', dbErr.message);
            res.json({
                success: true,
                message: `Başvuru ${status === 'VERIFIED' ? 'onaylandı' : 'reddedildi'} (Simüle Edildi).`,
                data: { userId: targetUserId, verificationStatus: status }
            });
        }
    } catch (error) {
        console.error('Error in processVerification:', error);
        next(error);
    }
};

// Imports moved to top
// Imports moved to top
export const getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
    console.log('📊 getDashboardStats called');
    try {
        const user = (req as any).user;
        if (user.userType !== 'ADMIN') throw new Error('Unauthorized');

        // ── Try real database first ─────────────────────────────────────
        if (isDatabaseAvailable) {
            try {
                const [totalUsers, totalElectricians, totalCitizens, activeJobs, pendingVerifications] = await Promise.all([
                    prisma.user.count({ where: { userType: { not: 'ADMIN' as any } } }),
                    prisma.user.count({ where: { userType: 'ELECTRICIAN' as any } }),
                    prisma.user.count({ where: { userType: 'CITIZEN' as any } }),
                    prisma.jobPost.count({ where: { status: 'OPEN' as any } }),
                    prisma.electricianProfile.count({ where: { verificationStatus: 'PENDING' as any } }),
                ]);

                // Revenue: sum of credit purchase transactions (still from mock for now)
                const transactions = mockTransactionStorage.getAllTransactions();
                const totalRevenue = transactions
                    .filter(t => t.transactionType === 'PURCHASE')
                    .reduce((sum, t) => sum + t.amount, 0);

                return res.json({
                    success: true,
                    data: { totalUsers, totalElectricians, totalCitizens, activeJobs, pendingVerifications, totalRevenue }
                });
            } catch (dbErr: any) {
                console.warn('⚠️ getDashboardStats DB failed, falling back to mock:', dbErr.message);
            }
        }

        // ── Fallback: mockStorage ────────────────────────────────────────
        const allUsers = mockStorage.getAllUsers();
        const users = Object.values(allUsers);
        const totalUsers = users.length;
        const totalElectricians = users.filter((u: any) => u.userType === 'ELECTRICIAN').length;
        const totalCitizens = users.filter((u: any) => u.userType === 'CITIZEN').length;

        if (jobStoreById.size === 0) loadMockJobs();
        let activeJobsCount = 0;
        jobStoreById.forEach((job) => { if (job.status === 'OPEN') activeJobsCount++; });

        const pendingCount = users.filter((u: any) => u.verificationStatus === 'PENDING').length;

        const transactions = mockTransactionStorage.getAllTransactions();
        const totalRevenue = transactions
            .filter(t => t.transactionType === 'PURCHASE')
            .reduce((sum, t) => sum + t.amount, 0);

        res.json({
            success: true,
            data: {
                totalUsers,
                totalElectricians,
                totalCitizens,
                activeJobs: activeJobsCount,
                pendingVerifications: pendingCount,
                totalRevenue
            }
        });
    } catch (error) {
        next(error);
    }
};


/**
 * Get All Jobs for Administration
 * Admin ONLY
 * Supports Pagination: ?page=1&limit=20
 */
export const getAllJobs = async (req: Request, res: Response, next: NextFunction) => {
    console.log('📋 getAllJobs called');
    try {
        const user = (req as any).user;
        if (user.userType !== 'ADMIN') throw new Error('Unauthorized');

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        if (isDatabaseAvailable) {
            try {
                const jobs = await prisma.jobPost.findMany({
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        citizen: {
                            select: {
                                fullName: true,
                                email: true,
                                phone: true
                            }
                        }
                    }
                });

                const totalJobs = await prisma.jobPost.count();
                const totalPages = Math.ceil(totalJobs / limit);

                return res.json({
                    success: true,
                    data: jobs,
                    pagination: {
                        page,
                        limit,
                        totalJobs,
                        totalPages,
                        hasMore: page < totalPages
                    }
                });
            } catch (dbError) {
                console.warn('⚠️ [ADMIN] DB getAllJobs failed, falling back to mock');
            }
        }

        // Mock Fallback
        const mockJobsData = getAllMockJobs();
        const allMockJobs = mockJobsData.jobs;
        const totalJobs = allMockJobs.length;
        const totalPages = Math.ceil(totalJobs / limit);
        const pagedJobs = allMockJobs.slice(skip, skip + limit);

        res.json({
            success: true,
            data: pagedJobs,
            pagination: {
                page,
                limit,
                totalJobs,
                totalPages,
                hasMore: page < totalPages
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete a Job (Admin Force Delete)
 * Admin ONLY
 */
export const deleteJob = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = (req as any).user;
        if (user.userType !== 'ADMIN') throw new Error('Unauthorized');

        const { id } = req.params;

        if (isDatabaseAvailable && !((id as string).startsWith('mock-'))) {
            try {
                await prisma.jobPost.delete({ where: { id: id as string } });
                console.log(`🗑️ Database job deleted: ${id}`);
                return res.json({ success: true, message: 'İlan veritabanından silindi' });
            } catch (dbError) {
                console.error('Database deletion error:', dbError);
                // Fallback to mock delete if ID looks mock or DB fails
            }
        }

        // Mock Fallback
        const deleted = deleteMockJob(id as string);
        if (deleted) {
            return res.json({ success: true, message: 'İlan (MOCK) silindi' });
        }

        res.status(404).json({
            success: false,
            error: { message: 'İlan bulunamadı' }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Detailed statistics for the strategic dashboard
 * Admin ONLY
 */
export const getDetailedStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = (req as any).user;
        if (user.userType !== 'ADMIN') throw new Error('Unauthorized');

        const city = req.query.city as string | undefined;
        const district = req.query.district as string | undefined;
        const serviceCategory = req.query.serviceCategory as string | undefined;

        // ── Try real database first ─────────────────────────────────────
        if (isDatabaseAvailable) {
            try {
                // Filters
                const ustaWhere: any = { verificationStatus: 'VERIFIED' as any };
                if (serviceCategory) ustaWhere.serviceCategory = serviceCategory;

                const jobWhere: any = { status: 'OPEN' as any };
                if (serviceCategory) jobWhere.serviceCategory = serviceCategory;

                // 1. KPI Cards
                const [totalCitizens, totalElectricians, pendingVerifications] = await Promise.all([
                    prisma.user.count({ where: { userType: 'CITIZEN' as any, ...(city ? { city } : {}) } }),
                    prisma.user.count({ where: { userType: 'ELECTRICIAN' as any, ...(city ? { city } : {}) } }),
                    prisma.electricianProfile.count({ where: { verificationStatus: 'PENDING' as any } }),
                ]);

                // 2. Service Distribution (Top 5 + Other)
                const categoryCounts = await prisma.electricianProfile.groupBy({
                    by: ['serviceCategory' as any],
                    _count: { _all: true },
                    where: city ? { user: { city } } : {}
                });

                // 3. District Distribution (Citizens)
                let districtStats: Record<string, number> = {};
                const usersWithLocations = await prisma.user.findMany({
                    where: { userType: 'CITIZEN' as any, ...(city ? { city } : {}) },
                    include: { locations: { where: { isDefault: true } } }
                });
                
                usersWithLocations.forEach((u: any) => {
                    const d = u.locations?.[0]?.district || 'Diğer';
                    if (district && d !== district) return;
                    districtStats[d] = (districtStats[d] || 0) + 1;
                });

                // 4. Live Data (Last 24h)
                const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
                const [activeUstalar, activeCitizens] = await Promise.all([
                    prisma.user.count({ where: { userType: 'ELECTRICIAN' as any, lastSeenAt: { gte: last24h } } }),
                    prisma.user.count({ where: { userType: 'CITIZEN' as any, lastSeenAt: { gte: last24h } } }),
                ]);

                // 5. Heatmap: Jobs vs Masters per District
                let heatmap: any[] = [];
                if (city) {
                    const jobs = await prisma.jobPost.findMany({
                        where: { ...jobWhere }
                    });
                    const masters = await prisma.electricianProfile.findMany({
                        where: { ...ustaWhere, user: { city: city } },
                        include: { user: { include: { locations: true } } }
                    });

                    const allDistricts = [...new Set([
                        ...jobs.map((j: any) => (j.location as any).district),
                        ...masters.flatMap((m: any) => m.user.locations.map((l: any) => l.district))
                    ])].filter(Boolean);

                    heatmap = allDistricts.map(d => {
                        const jobCount = jobs.filter((j: any) => (j.location as any).district === d).length;
                        const masterCount = masters.filter((m: any) => 
                            m.user.locations.some((l: any) => l.district === d)
                        ).length;
                        return { 
                            district: d, 
                            jobCount, 
                            masterCount, 
                            status: masterCount >= jobCount ? 'GREEN' : (masterCount === 0 && jobCount > 0 ? 'RED' : 'YELLOW')
                        };
                    }).sort((a, b) => b.jobCount - a.jobCount);
                }

                return res.json({
                    success: true,
                    data: {
                        kpis: { totalCitizens, totalElectricians, pendingVerifications },
                        serviceDistribution: categoryCounts.map((c: any) => ({ name: c.serviceCategory, count: c._count?._all || 0 })),
                        districtDistribution: Object.entries(districtStats).map(([name, count]) => ({ name, count })),
                        liveData: { activeUstalar, activeCitizens },
                        heatmap: heatmap.slice(0, 10)
                    }
                });
            } catch (dbErr: any) {
                console.warn('⚠️ getDetailedStats DB failed, falling back to mock:', dbErr.message);
            }
        }

        // ── Fallback: mockStorage ────────────────────────────────────────
        const allUsers = Object.values(mockStorage.getAllUsers());
        const last24hTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        
        const kpis = {
            totalCitizens: allUsers.filter((u: any) => u.userType === 'CITIZEN' && (!city || u.city === city)).length,
            totalElectricians: allUsers.filter((u: any) => u.userType === 'ELECTRICIAN' && (!city || u.city === city)).length,
            pendingVerifications: allUsers.filter((u: any) => u.verificationStatus === 'PENDING').length
        };

        const serviceDistribution: Record<string, number> = {};
        allUsers.filter((u: any) => u.userType === 'ELECTRICIAN' && (!city || u.city === city)).forEach((u: any) => {
            const cat = u.serviceCategory || u.electricianProfile?.serviceCategory || 'Diğer';
            serviceDistribution[cat] = (serviceDistribution[cat] || 0) + 1;
        });

        const districtDistribution: Record<string, number> = {};
        allUsers.filter((u: any) => u.userType === 'CITIZEN' && (!city || u.city === city)).forEach((u: any) => {
            const d = u.locations?.[0]?.district || 'Diğer';
            districtDistribution[d] = (districtDistribution[d] || 0) + 1;
        });

        const liveData = {
            activeUstalar: allUsers.filter((u: any) => u.userType === 'ELECTRICIAN' && (u.lastSeenAt || u.updatedAt) >= last24hTime).length,
            activeCitizens: allUsers.filter((u: any) => u.userType === 'CITIZEN' && (u.lastSeenAt || u.updatedAt) >= last24hTime).length
        };

        let heatmap: any[] = [];
        if (city === 'Adana' || !city) {
            heatmap = [
                { district: 'Çukurova', jobCount: 12, masterCount: 15, status: 'GREEN' },
                { district: 'Sarıçam', jobCount: 8, masterCount: 2, status: 'RED' },
                { district: 'Seyhan', jobCount: 20, masterCount: 18, status: 'YELLOW' },
                { district: 'Yüreğir', jobCount: 15, masterCount: 5, status: 'RED' },
                { district: 'Karaisalı', jobCount: 3, masterCount: 4, status: 'GREEN' }
            ];
        }

        res.json({
            success: true,
            data: {
                kpis,
                serviceDistribution: Object.entries(serviceDistribution).map(([name, count]) => ({ name, count })),
                districtDistribution: Object.entries(districtDistribution).map(([name, count]) => ({ name, count })),
                liveData,
                heatmap
            }
        });
    } catch (error) {
        next(error);
    }
};

