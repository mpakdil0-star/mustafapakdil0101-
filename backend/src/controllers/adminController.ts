import { Request, Response, NextFunction } from 'express';
import prisma, { isDatabaseAvailable } from '../config/database';
import { mockStorage } from '../utils/mockStorage';
import { notifyUser } from '../server';
import pushNotificationService from '../services/pushNotificationService';

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
                .filter(u => u.userType === 'ELECTRICIAN' && u.verificationStatus === 'PENDING')
                .map(u => ({
                    userId: u.id,
                    verificationStatus: 'PENDING',
                    verificationDocuments: u.electricianProfile?.verificationDocuments,
                    user: {
                        id: u.id,
                        fullName: u.fullName,
                        email: u.email,
                        phone: u.phone
                    }
                }));

            // If no real pending mocks, AND the sample user is not already processed/verified in mockStorage
            if (pendingMocks.length === 0) {
                const sampleMockUser = mockStorage.get('mock-electrician-1');
                // Only add if it doesn't exist (fresh start) or if it exists and is explicitly PENDING
                const shouldAddSample = !sampleMockUser || (sampleMockUser.verificationStatus === 'PENDING');

                if (shouldAddSample) {
                    pendingMocks.push({
                        userId: 'mock-electrician-1',
                        verificationStatus: 'PENDING',
                        verificationDocuments: {
                            documentType: 'ELEKTRIK_USTASI',
                            documentUrl: undefined,
                            submittedAt: new Date().toISOString(),
                        },
                        user: {
                            id: 'mock-electrician-1',
                            fullName: 'Ahmet Yılmaz (Örnek)',
                            email: 'ahmet@test.com',
                            phone: '5551234455'
                        }
                    });
                }
            }

            return res.json({
                success: true,
                data: pendingMocks
            });
        }

        try {
            const pendingProfiles = await prisma.electricianProfile.findMany({
                where: {
                    verificationStatus: 'PENDING',
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
            // Fallback to same mock data if query fails
            res.json({
                success: true,
                data: [
                    {
                        userId: 'mock-electrician-1',
                        verificationStatus: 'PENDING',
                        verificationDocuments: {
                            documentType: 'ELEKTRIK_USTASI',
                            documentUrl: undefined,
                            submittedAt: new Date().toISOString(),
                        },
                        user: {
                            id: 'mock-electrician-1',
                            fullName: 'Ahmet Yılmaz (Mock - Fallback)',
                            email: 'ahmet@test.com',
                            phone: '5551234455'
                        }
                    }
                ]
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
