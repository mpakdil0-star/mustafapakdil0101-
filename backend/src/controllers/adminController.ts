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

        if (isDatabaseAvailable && !id.startsWith('mock-')) {
            try {
                await prisma.jobPost.delete({ where: { id } });
                console.log(`🗑️ Database job deleted: ${id}`);
                return res.json({ success: true, message: 'İlan veritabanından silindi' });
            } catch (dbError) {
                console.error('Database deletion error:', dbError);
                // Fallback to mock delete if ID looks mock or DB fails
            }
        }

        // Mock Fallback
        const deleted = deleteMockJob(id);
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
