import { Request, Response, NextFunction } from 'express';
import prisma, { isDatabaseAvailable } from '../config/database';
import { mockStorage, getAllMockUsers } from '../utils/mockStorage';
import { notifyUser } from '../server';
import pushNotificationService from '../services/pushNotificationService';
import { jobStoreById, deleteMockJob, loadMockJobs } from './jobController';
import { mockTransactionStorage } from '../utils/mockStorage';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';

// Master admin e-posta adresi — sadece bu hesap impersonate işlemi yapabilir
const MASTER_ADMIN_EMAIL = 'mpakdil0@gmail.com';

/**
 * Admin olarak başka bir kullanıcının hesabına geçici giriş yap (Impersonation)
 * SADECE master admin (mpakdil0@gmail.com) kullanabilir.
 */
export const impersonateUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const adminUser = (req as any).user;

        // Güvenlik: Sadece master admin bu işlemi yapabilir
        if (adminUser.email !== MASTER_ADMIN_EMAIL) {
            return res.status(403).json({
                success: false,
                error: { message: 'Bu işlem yalnızca baş yönetici tarafından kullanılabilir.' }
            });
        }

        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({
                success: false,
                error: { message: 'Kullanıcı ID gereklidir.' }
            });
        }

        let targetUser: any = null;

        // DB'den kullanıcıyı bul
        if (isDatabaseAvailable && !userId.startsWith('mock-')) {
            targetUser = await prisma.user.findUnique({
                where: { id: userId },
                include: {
                    electricianProfile: true,
                    locations: true
                }
            });
        } else {
            // Mock storage'dan bul
            const mockUser = mockStorage.get(userId);
            if (mockUser) {
                targetUser = { ...mockUser };
            }
        }

        if (!targetUser) {
            return res.status(404).json({
                success: false,
                error: { message: 'Kullanıcı bulunamadı.' }
            });
        }

        // Kendi hesabına bürünmeye çalışıyor mu?
        if (targetUser.id === adminUser.id) {
            return res.status(400).json({
                success: false,
                error: { message: 'Kendi hesabınıza bürünemezsiniz.' }
            });
        }

        // 4 saatlik geçici token üret (isImpersonated flag ile)
        const impersonatedToken = jwt.sign(
            {
                id: targetUser.id,
                email: targetUser.email,
                userType: targetUser.userType,
                isImpersonated: true,
                impersonatedBy: adminUser.email,
            },
            config.jwtSecret,
            { expiresIn: '4h' } as any
        );

        console.log(`🔐 [IMPERSONATION] Admin ${adminUser.email} → User ${targetUser.email} (${targetUser.userType})`);

        return res.json({
            success: true,
            data: {
                accessToken: impersonatedToken,
                user: {
                    id: targetUser.id,
                    email: targetUser.email,
                    fullName: targetUser.fullName,
                    userType: targetUser.userType,
                    isVerified: targetUser.isVerified || false,
                    phone: targetUser.phone,
                    city: targetUser.city,
                    district: targetUser.district,
                    profileImageUrl: targetUser.profileImageUrl,
                    electricianProfile: targetUser.electricianProfile,
                    locations: targetUser.locations
                },
                isImpersonated: true,
                impersonatedBy: adminUser.email,
                expiresIn: '4 saat'
            }
        });
    } catch (error) {
        console.error('Error in impersonateUser:', error);
        next(error);
    }
};

const hasValidDocument = (docs: any): boolean => {
    if (!docs) return false;
    
    const isValidUrl = (url: any): boolean => {
        if (typeof url !== 'string') return false;
        const trimmed = url.trim().toLowerCase();
        // Temel kontroller: Çok kısa olmayacak, 'null'/'undefined' metni olmayacak ve bir uzantısı (.jpg, .png vb.) olacak
        return trimmed.length > 5 && 
               !['null', 'undefined', 'none', '[object object]'].includes(trimmed) &&
               (trimmed.includes('.') || trimmed.startsWith('/uploads/'));
    };

    // Case 1: If docs is directly a string (sometimes JSON fields are strings)
    if (typeof docs === 'string') {
        return isValidUrl(docs);
    }

    // Case 2: Single object
    if (typeof docs === 'object' && !Array.isArray(docs)) {
        const url = docs.documentUrl || docs.url;
        return isValidUrl(url);
    }

    // Case 3: Array
    if (Array.isArray(docs) && docs.length > 0) {
        return docs.some((d: any) => isValidUrl(d?.documentUrl || d?.url));
    }
    return false;
};

/**
 * Get all pending verifications
 * Admin ONLY
 */
export const getAllVerifications = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = (req as any).user;
        if (user.userType !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                error: { message: 'Bu işlem için admin yetkisi gereklidir' },
            });
        }

        // Helper to map either mock or prisma profile to a standard VerificationRequest
        const mapToVerificationRequest = (u: any): any => {
            // Highly robust extraction for all naming conventions
            const emo = u.emoNumber || u.emo_number || u.electricianProfile?.emoNumber || u.electricianProfile?.emo_number;
            const smm = u.smmNumber || u.smm_number || u.electricianProfile?.smmNumber || u.electricianProfile?.smm_number;
            const license = u.licenseNumber || u.license_number || u.electricianProfile?.licenseNumber || u.electricianProfile?.license_number;
            
            // Normalize documents - prioritize nested verificationDocuments object
            const rawDocs = u.verificationDocuments || u.electricianProfile?.verificationDocuments;
            const docs = {
                documentType: rawDocs?.documentType || u.documentType || u.electricianProfile?.documentType || 'BELİRTİLMEMİŞ',
                documentUrl: rawDocs?.documentUrl || u.documentUrl || u.electricianProfile?.documentUrl || '',
                submittedAt: rawDocs?.submittedAt || u.submittedAt || u.electricianProfile?.submittedAt || new Date().toISOString()
            };

            // User mapping
            const userData = {
                id: u.user?.id || u.id || u.userId,
                fullName: u.user?.fullName || u.fullName || 'İsimsiz Kullanıcı',
                email: u.user?.email || u.email || 'Email yok',
                phone: u.user?.phone || u.phone || 'Telefon yok',
            };

            return {
                userId: u.userId || u.id,
                verificationStatus: u.verificationStatus || u.verification_status || 'PENDING',
                serviceCategory: u.serviceCategory || u.electricianProfile?.serviceCategory || 'elektrik',
                licenseNumber: license || 'Girilmemiş',
                emoNumber: emo || 'Girilmemiş',
                smmNumber: smm || 'Girilmemiş',
                verificationDocuments: docs,
                user: userData
            };
        };

        // Decision logic: Mock or Prisma
        if (!isDatabaseAvailable || user.id.startsWith('mock-')) {
            const allUsers = mockStorage.getAllUsers();
            const requests = allUsers
                .filter((u: any) => u.userType === 'ELECTRICIAN' && 
                       (u.verificationStatus === 'PENDING' || u.verificationStatus === 'NONE' || !u.verificationStatus))
                .map(mapToVerificationRequest)
                .filter((r: any) => hasValidDocument(r.verificationDocuments));

            return res.json({ success: true, data: requests });
        }

        // Real Database Path (Prisma)
        try {
            const pendingProfiles = await prisma.electricianProfile.findMany({
                where: { verificationStatus: 'PENDING' },
                include: { user: true },
                orderBy: { updatedAt: 'desc' }
            });

            const requests = pendingProfiles.map(mapToVerificationRequest)
                .filter((r: any) => hasValidDocument(r.verificationDocuments));

            return res.json({ success: true, data: requests });
        } catch (dbErr: any) {
            console.error('Database query error in getAllVerifications:', dbErr.message);
            // Fallback to mock in case of DB query failure
            const allUsers = mockStorage.getAllUsers();
            const requests = allUsers
                .filter((u: any) => u.userType === 'ELECTRICIAN' && u.verificationStatus === 'PENDING')
                .map(mapToVerificationRequest);
            
            return res.json({ success: true, data: requests });
        }
    } catch (error) {
        console.error('General error in getAllVerifications:', error);
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

            const userStore = mockStorage.get(targetUserId);
            const isEngineer = userStore?.documentType === 'YETKILI_MUHENDIS' && status === 'VERIFIED';

            let newSpecialties = [...(userStore?.specialties || [])];
            if (isEngineer) {
                if (!newSpecialties.includes('Yetkili Mühendis')) {
                    newSpecialties.unshift('Yetkili Mühendis');
                }
                if (!newSpecialties.includes('Elektrik Proje Çizimi')) {
                    newSpecialties.push('Elektrik Proje Çizimi');
                }
            }

            mockStorage.updateProfile(targetUserId, {
                verificationStatus: status,
                isVerified: status === 'VERIFIED',
                isAuthorizedEngineer: isEngineer,
                specialties: newSpecialties
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
            const isEngineer = verificationDocuments?.documentType === 'YETKILI_MUHENDIS' && status === 'VERIFIED';

            let newSpecialties = [...(currentProfile.specialties || [])];
            if (isEngineer) {
                if (!newSpecialties.includes('Yetkili Mühendis')) {
                    newSpecialties.unshift('Yetkili Mühendis');
                }
                if (!newSpecialties.includes('Elektrik Proje Çizimi')) {
                    newSpecialties.push('Elektrik Proje Çizimi');
                }
            }

            const updatedProfile = await prisma.electricianProfile.update({
                where: { userId: targetUserId },
                data: {
                    verificationStatus: status as any,
                    licenseVerified: status === 'VERIFIED',
                    isAuthorizedEngineer: isEngineer,
                    specialties: newSpecialties,
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
                const targetUserIdStr = String(targetUserId);
                if (isDatabaseAvailable && !targetUserIdStr.startsWith('mock-')) {
                    await prisma.notification.create({
                        data: {
                            userId: targetUserId,
                            type: (status === 'VERIFIED' ? 'VERIFICATION_SUCCESS' : 'VERIFICATION_FAILED') as any,
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

        // FAST PATH: Mock results if DB down
        if (!isDatabaseAvailable) {
            // ... Existing Mock Logic ...
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
            const totalRevenue = transactions.filter(t => t.transactionType === 'PURCHASE').reduce((sum, t) => sum + t.amount, 0);

            return res.json({
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
        }

        // REAL DB STATS
        const [
            totalUsers,
            totalElectricians,
            totalCitizens,
            activeJobs,
        ] = await Promise.all([
            prisma.user.count({ where: { deletedAt: null } }),
            prisma.user.count({ where: { userType: 'ELECTRICIAN' as any, deletedAt: null } }),
            prisma.user.count({ where: { userType: 'CITIZEN' as any, deletedAt: null } }),
            prisma.jobPost.count({ where: { status: 'OPEN' as any } }),
        ]);

        // Count pending verifications with documents
        const pendingWithDocsProfiles = await prisma.electricianProfile.findMany({
            where: {
                verificationStatus: 'PENDING' as any,
                user: { deletedAt: null },
                NOT: {
                    verificationDocuments: {
                        equals: null as any
                    }
                }
            }
        });

        const pendingVerifications = pendingWithDocsProfiles.filter(p => hasValidDocument(p.verificationDocuments)).length;

        // Revenue calculation (if you have a Transaction table, otherwise 0 or mock)
        // const totalRevenue = await prisma.transaction.aggregate({ _sum: { amount: true } });
        const totalRevenue = 0; // Placeholder until real transaction table matches

        res.json({
            success: true,
            data: {
                totalUsers,
                totalElectricians,
                totalCitizens,
                activeJobs,
                pendingVerifications,
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
            const [jobs, totalJobs] = await Promise.all([
                prisma.jobPost.findMany({
                    skip,
                    take: limit,
                    include: {
                        citizen: {
                            select: { fullName: true, email: true, phone: true }
                        },
                        _count: { select: { bids: true } }
                    },
                    orderBy: { createdAt: 'desc' }
                }),
                prisma.jobPost.count()
            ]);

            const totalPages = Math.ceil(totalJobs / limit);

            // Remap citizen to user for frontend compatibility
            const mappedJobs = jobs.map(j => ({
                ...j,
                user: j.citizen
            }));

            return res.json({
                success: true,
                data: mappedJobs,
                pagination: {
                    page,
                    limit,
                    totalJobs,
                    totalPages,
                    hasMore: page < totalPages
                }
            });
        }

        // Mock Implementation
        if (jobStoreById.size === 0) loadMockJobs();
        const jobs = Array.from(jobStoreById.values());
        jobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const paginatedJobs = jobs.slice(skip, skip + limit);
        const totalJobs = jobs.length;
        const totalPages = Math.ceil(totalJobs / limit);

        res.json({
            success: true,
            data: paginatedJobs,
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
 * Get All Users for Administration
 * Admin ONLY
 */
export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = (req as any).user;
        if (user.userType !== 'ADMIN') throw new Error('Unauthorized');

        const { 
            search, 
            userType: filterType, 
            city, 
            district, 
            serviceCategory,
            page = '1', 
            limit = '20' 
        } = req.query;
        const pageNum = parseInt(page as string, 10);
        const limitNum = parseInt(limit as string, 10);
        const skip = (pageNum - 1) * limitNum;

        // DB Implementation
        if (isDatabaseAvailable) {
            const whereClause: any = { deletedAt: null };

            if (filterType === 'ENGINEER') {
                whereClause.electricianProfile = { is: { isAuthorizedEngineer: true } };
            } else if (filterType && filterType !== 'ALL') {
                whereClause.userType = filterType;
            }

            if (search) {
                whereClause.OR = [
                    { fullName: { contains: search as string, mode: 'insensitive' } },
                    { email: { contains: search as string, mode: 'insensitive' } },
                    { phone: { contains: search as string } }
                ];
            }

            // Advanced filtering
            if (city) {
                const cityStr = String(city);
                whereClause.OR = whereClause.OR || [];
                whereClause.OR.push(
                    { city: { equals: cityStr, mode: 'insensitive' } },
                    { locations: { some: { city: { equals: cityStr, mode: 'insensitive' } } } }
                );
            }

            if (district) {
                whereClause.locations = {
                    some: {
                        district: { equals: String(district), mode: 'insensitive' }
                    }
                };
            }

            if (serviceCategory) {
                whereClause.electricianProfile = {
                    serviceCategory: { equals: String(serviceCategory), mode: 'insensitive' }
                };
            }

            const [users, totalUsers] = await Promise.all([
                prisma.user.findMany({
                    where: whereClause,
                    skip,
                    take: limitNum,
                    include: {
                        electricianProfile: true,
                        locations: true
                    },
                    orderBy: { createdAt: 'desc' }
                }),
                prisma.user.count({ where: whereClause })
            ]);

            // Transform to match frontend expectations
            const transformedUsers = users.map(u => {
                const ns = (u.notificationSettings as any) || {};
                const pushEnabled = ns?.push !== false;
                const isUninstalled = ns?.appUninstalled === true;
                const pushStatus = isUninstalled ? 'UNINSTALLED' : (!pushEnabled ? 'DISABLED' : (u.pushToken ? 'ACTIVE' : 'PENDING'));

                let mappedUserType = u.userType;
                let mappedFullName = u.fullName;
                if (u.email === 'mpakdil0@gmail.com') {
                    mappedUserType = 'ADMIN' as any;
                    mappedFullName = 'Yönetici';
                }

                return {
                    id: u.id,
                    fullName: mappedFullName,
                    email: u.email,
                    phone: u.phone,
                    userType: mappedUserType,
                    profileImageUrl: u.profileImageUrl,
                    creditBalance: Number(u.electricianProfile?.creditBalance || 0),
                    isVerified: u.isVerified,
                    isActive: u.isActive,
                    pushStatus: pushStatus,
                    verificationStatus: u.electricianProfile?.verificationStatus || null,
                    createdAt: u.createdAt,
                    experienceYears: u.electricianProfile?.experienceYears || 0,
                    serviceCategory: u.electricianProfile?.serviceCategory || null,
                    completedJobsCount: Number(u.electricianProfile?.completedJobsCount || 0),
                    isAuthorizedEngineer: u.electricianProfile?.isAuthorizedEngineer || false,
                    locations: u.locations || []
                };
            });

            return res.json({
                success: true,
                data: {
                    users: transformedUsers,
                    pagination: {
                        total: totalUsers,
                        page: pageNum,
                        limit: limitNum,
                        totalPages: Math.ceil(totalUsers / limitNum)
                    }
                }
            });
        }

        // Mock Implementation (Moved from routes)
        const allUsers = mockStorage.getAllUsers();
        let users = Object.entries(allUsers).map(([id, data]: [string, any]) => {
            // ... existing mock transformation ...
            let derivedUserType = data.userType;
            if (!derivedUserType) {
                if (id.endsWith('-ELECTRICIAN')) derivedUserType = 'ELECTRICIAN';
                else if (id.endsWith('-ADMIN')) derivedUserType = 'ADMIN';
                else derivedUserType = 'CITIZEN';
            }
            if (data.email === 'mpakdil0@gmail.com') {
                derivedUserType = 'ADMIN';
            }
            
            return {
                id,
                fullName: data.fullName || 'İsimsiz Kullanıcı',
                email: data.email || '',
                phone: data.phone || '',
                userType: derivedUserType,
                // ... other fields
                ...data
            };
        });

        if (filterType === 'ENGINEER') {
            users = users.filter((u: any) => u.isAuthorizedEngineer === true);
        } else if (filterType && filterType !== 'ALL') {
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

        const paginatedUsers = users.slice(skip, skip + limitNum);

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

        const idStr = String(req.params.id);

        if (isDatabaseAvailable && !idStr.startsWith('mock-')) {
            // DB Implementation
            try {
                await prisma.jobPost.delete({ where: { id: idStr } });
                console.log(`🗑️ Database job deleted: ${idStr}`);

                // Also remove from mock store if it exists there to keep sync
                if (jobStoreById.has(idStr)) {
                    deleteMockJob(idStr);
                }

                return res.json({ success: true, message: 'İlan veritabanından silindi' });
            } catch (dbError) {
                console.error('Database deletion error:', dbError);
                // Fallthrough to mock deletion or return error if confirmed DB ID
                return res.status(500).json({ success: false, message: 'İlan silinirken veritabanı hatası oluştu' });
            }
        }

        // Mock Implementation
        const success = deleteMockJob(idStr);

        if (success) {
            res.json({ success: true, message: 'İlan silindi' });
        } else {
            res.status(404).json({ success: false, message: 'İlan bulunamadı' });
        }
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

        const city = req.query.city === 'ALL' ? undefined : (req.query.city as string)?.trim();
        const serviceCategory = req.query.serviceCategory as string | undefined;

        let districtStats: Record<string, number> = {};
        let availableCities: string[] = ['Adana', 'Ankara', 'İstanbul', 'İzmir', 'Bursa']; // Defaults

        // ── Try real database first ─────────────────────────────────────
        if (isDatabaseAvailable) {
            try {
                // Fetch dynamic city list from both users and locations
                const [userCities, locationCities] = await Promise.all([
                    prisma.user.findMany({
                        where: { city: { not: null, notIn: ['ALL', 'All', 'all'] }, deletedAt: null },
                        select: { city: true },
                        distinct: ['city']
                    }),
                    prisma.location.findMany({
                        select: { city: true },
                        distinct: ['city']
                    })
                ]);
                
                const allCityNames = new Set([
                    ...userCities.map((c: any) => c.city?.trim()),
                    ...locationCities.map((l: any) => l.city?.trim())
                ]);

                availableCities = Array.from(allCityNames)
                    .filter(Boolean)
                    .map(c => c!.charAt(0).toUpperCase() + c!.slice(1).toLowerCase())
                    .sort();
                
                // If "Aksaray" is in list but user sent "aksaray", normalize
                const normalizedSearchCity = city ? (city.charAt(0).toUpperCase() + city.slice(1).toLowerCase()) : undefined;

                // City filter: check both user.city and user.locations
                const cityFilter = normalizedSearchCity ? {
                    OR: [
                        { city: { equals: normalizedSearchCity, mode: 'insensitive' } as any },
                        { locations: { some: { city: { equals: normalizedSearchCity, mode: 'insensitive' } as any } } }
                    ]
                } : {};

                // 1. KPI Cards
                const [totalCitizens, totalElectricians] = await Promise.all([
                    prisma.user.count({ where: { userType: 'CITIZEN' as any, ...cityFilter, deletedAt: null } }),
                    prisma.user.count({ where: { userType: 'ELECTRICIAN' as any, ...cityFilter, deletedAt: null } }),
                ]);

                // Pending verifications
                const pendingWithDocsProfiles = await prisma.electricianProfile.findMany({
                    where: {
                        verificationStatus: 'PENDING' as any,
                        user: { deletedAt: null, ...cityFilter },
                        NOT: {
                            verificationDocuments: { equals: null as any }
                        }
                    }
                });
                const pendingVerifications = pendingWithDocsProfiles.filter(p => hasValidDocument(p.verificationDocuments)).length;

                // 2. Service Distribution (Electricians)
                const categoryCounts = await prisma.electricianProfile.groupBy({
                    by: ['serviceCategory' as any],
                    _count: { _all: true },
                    where: normalizedSearchCity ? { user: { ...cityFilter } } : {}
                });

                // 3. District Distribution (Citizens only)
                const citizens = await prisma.user.findMany({
                    where: { userType: 'CITIZEN' as any, ...cityFilter, deletedAt: null },
                    include: { locations: true }
                });
                
                citizens.forEach((u: any) => {
                    // Check user's main city first
                    if (normalizedSearchCity && u.city?.toLowerCase().trim() === normalizedSearchCity.toLowerCase()) {
                        const district = u.district || 'Belirtilmemiş';
                        districtStats[district] = (districtStats[district] || 0) + 1;
                    }
                    
                    // Then check locations
                    const relevantLocs = u.locations.filter((l: any) => 
                        !normalizedSearchCity || l.city.toLowerCase().trim() === normalizedSearchCity.toLowerCase()
                    );
                    
                    if (relevantLocs.length > 0) {
                        relevantLocs.forEach((l: any) => {
                            const d = l.district || 'Belirtilmemiş';
                            districtStats[d] = (districtStats[d] || 0) + 1;
                        });
                    } else if (normalizedSearchCity && (!u.city || u.city.toLowerCase().trim() !== normalizedSearchCity.toLowerCase())) {
                        // This user was found via cityFilter but neither main city nor filtered locations matched?
                        // (Shouldn't happen with cityFilter logic, but safety first)
                    } else if (!normalizedSearchCity) {
                        // Global view
                        const d = u.district || 'Belirtilmemiş';
                        districtStats[d] = (districtStats[d] || 0) + 1;
                    }
                });

                // 4. Live Data (Last 24h)
                const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
                const [activeUstalar, activeCitizens] = await Promise.all([
                    prisma.user.count({ 
                        where: { userType: 'ELECTRICIAN' as any, ...cityFilter, deletedAt: null, lastSeenAt: { gte: last24h } } 
                    }),
                    prisma.user.count({ 
                        where: { userType: 'CITIZEN' as any, ...cityFilter, deletedAt: null, lastSeenAt: { gte: last24h } } 
                    }),
                ]);

                // 5. Heatmap: Jobs vs Masters per District
                const allOpenJobs = await prisma.jobPost.findMany({
                    where: { 
                        status: 'OPEN' as any, 
                        deletedAt: null,
                        ...(serviceCategory ? { serviceCategory } : {}) 
                    }
                });

                const jobsInCity = normalizedSearchCity 
                    ? allOpenJobs.filter((j: any) => (j.location as any).city?.trim().toLowerCase() === normalizedSearchCity.toLowerCase())
                    : allOpenJobs;

                const mastersInCity = await prisma.electricianProfile.findMany({
                    where: { 
                        user: { deletedAt: null, ...cityFilter },
                        ...(serviceCategory ? { serviceCategory } : {})
                    },
                    include: { user: { include: { locations: true } } }
                });

                const allDistricts = [...new Set([
                    ...jobsInCity.map((j: any) => (j.location as any).district?.trim()),
                    ...mastersInCity.flatMap((m: any) => m.user.locations
                        .filter((l: any) => !normalizedSearchCity || l.city.trim().toLowerCase() === normalizedSearchCity.toLowerCase())
                        .map((l: any) => l.district?.trim())
                    )
                ])].filter(Boolean);

                let heatmap = allDistricts.map(d => {
                    const jobCount = jobsInCity.filter((j: any) => (j.location as any).district?.trim() === d).length;
                    const masterCount = mastersInCity.filter((m: any) => m.user.locations.some((l: any) => 
                        l.district?.trim() === d && (!normalizedSearchCity || l.city.trim().toLowerCase() === normalizedSearchCity.toLowerCase())
                    )).length;

                    let status = 'GREEN';
                    if (jobCount > 0 && masterCount === 0) status = 'RED';
                    else if (jobCount > masterCount) status = 'YELLOW';

                    return { district: d, city: normalizedSearchCity || 'Bilinmiyor', jobCount, masterCount, status };
                });

                return res.json({
                    success: true,
                    data: {
                        kpis: { totalCitizens, totalElectricians, pendingVerifications },
                        serviceDistribution: categoryCounts.map((c: any) => ({ name: c.serviceCategory, count: c._count?._all || 0 })),
                        districtDistribution: Object.entries(districtStats).map(([name, count]) => ({ name, count })),
                        liveData: { activeUstalar, activeCitizens },
                        heatmap: heatmap.filter(h => h.jobCount > 0 || h.masterCount > 0).slice(0, 15),
                        availableCities
                    }
                });
            } catch (dbErr: any) {
                console.warn('⚠️ getDetailedStats DB failed, falling back to mock:', dbErr.message);
            }
        }

        // ── Fallback: Improved Mock Using mockStorage ──────────────
        const allUsers = mockStorage.getAllUsers();
        let filteredUsers = allUsers.filter(u => u.isActive !== false);

        if (city && city !== 'ALL') {
             filteredUsers = filteredUsers.filter((u: any) => 
                u.city?.toLowerCase() === city.toLowerCase() || 
                (u.locations as any[])?.some(l => l.city?.toLowerCase() === city.toLowerCase())
            );
        }

        const mTotalCitizens = filteredUsers.filter(u => u.userType === 'CITIZEN').length;
        const mTotalElectricians = filteredUsers.filter(u => u.userType === 'ELECTRICIAN').length;
        const mPending = filteredUsers.filter(u => u.userType === 'ELECTRICIAN' && u.verificationStatus === 'PENDING').length;

        const mDistrictStats: Record<string, number> = {};
        filteredUsers.filter(u => u.userType === 'CITIZEN').forEach((u: any) => {
            const d = u.district || 'Belirtilmemiş';
            mDistrictStats[d] = (mDistrictStats[d] || 0) + 1;
        });

        res.json({
            success: true,
            data: {
                kpis: { totalCitizens: mTotalCitizens, totalElectricians: mTotalElectricians, pendingVerifications: mPending },
                serviceDistribution: [],
                districtDistribution: Object.entries(mDistrictStats).map(([name, count]) => ({ name, count })),
                liveData: { activeUstalar: 0, activeCitizens: 0 },
                heatmap: [],
                availableCities
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get single user details
 * Admin ONLY
 */
export const getUserDetails = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const idStr = String(req.params.id);
        if (isDatabaseAvailable && !idStr.startsWith('mock-')) {
            const user = await prisma.user.findUnique({
                where: { id: idStr },
                include: { electricianProfile: true }
            });
            if (user) return res.json({ success: true, data: user });
        }
        
        const mockUser = mockStorage.getFullUser(idStr);
        if (mockUser) return res.json({ success: true, data: mockUser });
        
        res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    } catch (error) {
        next(error);
    }
};

/**
 * Update user details (Admin edit)
 * Admin ONLY
 */
export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const idStr = String(req.params.id);
        const updates = req.body;
        
        if (isDatabaseAvailable && !idStr.startsWith('mock-')) {
            const { creditBalance, ...userUpdates } = updates;
            
            // If updating credit balance, it belongs to ElectricianProfile
            if (creditBalance !== undefined) {
                await prisma.electricianProfile.update({
                    where: { userId: idStr },
                    data: { creditBalance: Number(creditBalance) }
                });
            }

            let updatedUser;
            if (Object.keys(userUpdates).length > 0) {
                updatedUser = await prisma.user.update({
                    where: { id: idStr },
                    data: userUpdates,
                    include: { electricianProfile: true }
                });
            } else {
                updatedUser = await prisma.user.findUnique({
                    where: { id: idStr },
                    include: { electricianProfile: true }
                });
            }
            
            return res.json({ success: true, data: updatedUser });
        }
        
        const updatedMock = mockStorage.updateProfile(idStr, updates);
        res.json({ success: true, data: updatedMock });
    } catch (error) {
        next(error);
    }
};

/**
 * Toplu Push Bildirimi Gönderme
 */
export const sendBulkPushNotifications = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { userIds, title, body } = req.body;

        if (!title || !body) {
            return res.status(400).json({ success: false, error: { message: 'Başlık ve içerik gereklidir.' } });
        }

        let targetTokens: string[] = [];

        if (isDatabaseAvailable) {
            let filter: any = {};
            if (userIds !== 'ALL' && Array.isArray(userIds) && userIds.length > 0) {
                filter = { id: { in: userIds } };
            }

            const users = await prisma.user.findMany({
                where: {
                    ...filter,
                    pushToken: { not: null },
                    pushStatus: { not: 'DISABLED' } // Sadece DISABLED olmayanlar
                },
                select: { pushToken: true }
            });

            targetTokens = users.map(u => u.pushToken).filter(Boolean) as string[];
        } else {
            // Mock mode
            const allUsers = Object.values(getAllMockUsers() as any);
            const filteredUsers = userIds === 'ALL' 
                ? allUsers 
                : allUsers.filter((u: any) => Array.isArray(userIds) && userIds.includes(u.id));

            targetTokens = filteredUsers.map((u: any) => u.pushToken).filter(Boolean) as string[];
        }

        if (targetTokens.length === 0) {
            return res.status(400).json({ success: false, error: { message: 'Bildirim gönderilecek geçerli kullanıcı bulunamadı (Cihaz bildirimi kapalı veya oturum açılmamış olabilir).' } });
        }

        for (const token of targetTokens) {
            await pushNotificationService.sendNotification({
                to: token,
                title: title,
                body: body,
                data: { type: 'bulk_admin_campaign' }
            }).catch(console.error);
        }

        return res.json({
            success: true,
            data: { message: `${targetTokens.length} cihaza bildirim gönderim işlemi başlatıldı.` }
        });

    } catch (error: any) {
        console.error('Bulk push error:', error);
        return res.status(500).json({ success: false, error: { message: 'Bildirimler gönderilirken sunucu hatası oluştu.' } });
    }
};


