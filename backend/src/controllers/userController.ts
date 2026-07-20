import { Request, Response, NextFunction } from 'express';
import prisma, { isDatabaseAvailable } from '../config/database';
import { AppError } from '../utils/errors';
import userService from '../services/userService';
import fs from 'fs';
import path from 'path';
import { UserType } from '@prisma/client';
import { notifyUser } from '../server';
import pushNotificationService from '../services/pushNotificationService';
import { calculateDistance, getBoundingBox } from '../utils/geo';
import { mockStorage, mockReviewStorage } from '../utils/mockStorage';

// Helper to serve mock electricians
function serveMockResponse(req: Request, res: Response, city: any, latNum: any, lngNum: any) {
    // Static mock electricians for fallback
    let mockElectricians: any[] = [
        {
            id: 'mock-elec-1',
            fullName: 'Ahmet YÄ±lmaz',
            profileImageUrl: null,
            isVerified: true,
            electricianProfile: {
                specialties: ['Tesisat', 'ArÄ±za'],
                ratingAverage: 4.8,
                totalReviews: 124,
                experienceYears: 20,
                isAvailable: true
            },
            locations: [{ city: 'Ä°stanbul', district: 'KadÄ±kÃ¶y', latitude: 40.9901, longitude: 29.0234, isDefault: true }]
        },
        {
            id: 'mock-elec-2',
            fullName: 'Mehmet Demir',
            profileImageUrl: null,
            isVerified: true,
            electricianProfile: {
                specialties: ['AydÄ±nlatma'],
                ratingAverage: 4.5,
                totalReviews: 89,
                experienceYears: 12,
                isAvailable: true
            },
            locations: [{ city: 'Ä°stanbul', district: 'BeÅŸiktaÅŸ', latitude: 41.0422, longitude: 29.0083, isDefault: true }]
        },
        {
            id: 'mock-elec-adana-1',
            fullName: 'Mustafa YÄ±ldÄ±z',
            profileImageUrl: null,
            isVerified: true,
            electricianProfile: {
                specialties: ['Tesisat', 'Klima ElektriÄŸi'],
                ratingAverage: 4.9,
                totalReviews: 42,
                experienceYears: 15,
                isAvailable: true
            },
            locations: [{ city: 'Adana', district: 'Seyhan', latitude: 36.9914, longitude: 35.3308, isDefault: true }]
        }
    ];


    // Include all registered electricians from mockStorage
    const allMockUsers = mockStorage.getAllUsers();
    console.log(`ğŸ“‹ Found ${allMockUsers.length} users in mockStorage`);

    for (const user of allMockUsers) {
        // Skip if already in static mocks, not an electrician, or suspended (inactive)
        if (user.id.startsWith('mock-elec-') || user.userType !== 'ELECTRICIAN' || user.isActive === false) {
            continue;
        }

        console.log(`âœ… Adding electrician from mockStorage: ${user.fullName} (${user.id})`);

        // Get raw data from mockStorage for location info
        const rawData = mockStorage.get(user.id);

        // Get specialties from electricianProfile if available
        const specialties = user.electricianProfile?.specialties || [];
        const experienceYears = user.electricianProfile?.experienceYears || 0;

        // Build locations from raw mockStorage data
        let userLocations = [{ city: 'TÃ¼rkiye', district: 'Merkez', latitude: 41.0, longitude: 29.0, isDefault: true }];

        if (rawData.locations && rawData.locations.length > 0) {
            userLocations = rawData.locations.map((loc: any) => ({
                city: loc.city || 'TÃ¼rkiye',
                district: loc.district || 'Merkez',
                latitude: loc.latitude || 41.0,
                longitude: loc.longitude || 29.0,
                isDefault: loc.isDefault ?? true
            }));
        } else if (rawData.city) {
            userLocations = [{
                city: rawData.city,
                district: rawData.district || 'Merkez',
                latitude: 41.0,
                longitude: 29.0,
                isDefault: true
            }];
        }

        mockElectricians.push({
            id: user.id,
            fullName: user.fullName || 'ElektrikÃ§i',
            profileImageUrl: user.profileImageUrl || null,
            isVerified: user.isVerified || false,
            electricianProfile: {
                specialties: specialties.length > 0 ? specialties : ['Genel Elektrik'],
                // Get real rating stats from mockReviewStorage
                ratingAverage: mockReviewStorage.getRatingStats(user.id).ratingAverage || 0,
                totalReviews: mockReviewStorage.getRatingStats(user.id).totalReviews || 0,
                experienceYears: experienceYears,
                bio: rawData.bio || '',
                verificationStatus: user.isVerified ? 'VERIFIED' : 'PENDING',
                isAvailable: true,
                isAuthorizedEngineer: rawData.isAuthorizedEngineer || false
            },
            locations: userLocations
        });
    }

    // Filter mocks by city if requested
    if (city) {
        mockElectricians = mockElectricians.filter(e =>
            e.locations.some((l: any) => l.city.toLowerCase().includes(String(city).toLowerCase()) ||
                String(city).toLowerCase().includes(l.city.toLowerCase()))
        );
    }

    return res.status(200).json({
        success: true,
        data: mockElectricians
    });
}

// Change Password
export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.id;
        const { currentPassword, newPassword } = req.body;

        // Validation
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                error: { message: 'Mevcut ÅŸifre ve yeni ÅŸifre gereklidir' },
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                error: { message: 'Yeni ÅŸifre en az 6 karakter olmalÄ±dÄ±r' },
            });
        }

        try {
            await userService.changePassword(userId, currentPassword, newPassword);

            res.status(200).json({
                success: true,
                message: 'Åifre baÅŸarÄ±yla gÃ¼ncellendi',
            });
        } catch (dbError: any) {
            console.warn('changePassword error:', dbError.message || dbError);

            // AppError (kullanÄ±cÄ± hatasÄ±) ise fÄ±rlat
            if (dbError.statusCode) {
                throw dbError;
            }

            // Database baÄŸlantÄ± hatasÄ± - mock mode'da ÅŸifre kontrolÃ¼ yap
            console.warn('Database not connected, checking password in mock mode');

            const bcrypt = require('bcryptjs'); // TutarlÄ±lÄ±k iÃ§in bcryptjs kullan
            const { mockStorage } = require('../utils/mockStorage');
            const mockUser = mockStorage.get(userId);

            // Debug log
            console.log('ğŸ” Mock Password Change Debug:', {
                userId,
                hasPasswordHash: !!mockUser.passwordHash,
                passwordHashType: typeof mockUser.passwordHash,
                passwordHashLength: mockUser.passwordHash?.length
            });

            if (!mockUser) {
                return res.status(404).json({
                    success: false,
                    error: { message: 'KullanÄ±cÄ± bulunamadÄ±' },
                });
            }

            // Check if password hash exists
            if (!mockUser.passwordHash) {
                return res.status(400).json({
                    success: false,
                    error: { message: 'Hesap ÅŸifresi tanÄ±mlÄ± deÄŸil. LÃ¼tfen yeniden kayÄ±t olun.' },
                });
            }

            // Verify current password
            let isPasswordValid = false;
            if (mockUser.passwordHash) {
                // Try direct comparison first (for simple passwords)
                isPasswordValid = mockUser.passwordHash === currentPassword;

                // If failed, try bcrypt comparison
                if (!isPasswordValid) {
                    try {
                        isPasswordValid = await bcrypt.compare(currentPassword, mockUser.passwordHash);
                    } catch (e) {
                        // Hash format invalid, already checked equality above
                    }
                }
            }

            if (!isPasswordValid) {
                return res.status(400).json({
                    success: false,
                    error: { message: 'Mevcut ÅŸifre yanlÄ±ÅŸ' },
                });
            }

            // Hash new password and save
            // IMPORTANT: Also reactivate account if it was marked as deleted
            // User changing password = account should be active
            const newPasswordHash = await bcrypt.hash(newPassword, 10);
            mockStorage.updateProfile(userId, {
                passwordHash: newPasswordHash,
                isActive: true // Reactivate account on password change
            });

            res.status(200).json({
                success: true,
                message: 'Åifre baÅŸarÄ±yla gÃ¼ncellendi',
            });
        }
    } catch (error: any) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({
                success: false,
                error: { message: error.message },
            });
        }
        next(error);
    }
};


// Update Profile
export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.id;
        const { fullName, phone, email, specialties, experienceYears } = req.body;

        try {
            const updatedUser = await userService.updateProfile(userId, {
                fullName,
                phone,
                email,
                specialties,
                experienceYears
            });

            // Refresh socket rooms (in case city/location changed)
            const { refreshUserRooms } = require('../services/socketHandler');
            refreshUserRooms(userId);

            res.status(200).json({
                success: true,
                data: { user: updatedUser },
                message: 'Profil gÃ¼ncellendi',
            });
        } catch (dbError: any) {
            // Database baÄŸlantÄ±sÄ± yoksa mock baÅŸarÄ± dÃ¶ndÃ¼r
            console.warn('Database error, simulating profile update:', dbError.message);

            const user = (req as any).user;
            const currentMock = mockStorage.get(userId);
            const isElectrician = user.userType === 'ELECTRICIAN';

            // Mock Bonus Logic: If electrician and entering phone for first time
            // Or if they have a phone but were not verified yet
            const isAlreadyVerified = currentMock.isVerified || (user as any).isVerified;
            const willVerify = isElectrician && phone && !isAlreadyVerified;

            // First time phone entry bonus for electricians
            if (willVerify) {
                mockStorage.addCredits(userId, 5);
            }

            // Save to mock storage for session persistence
            const mockData = mockStorage.updateProfile(userId, {
                experienceYears: (experienceYears !== undefined && experienceYears !== null) ? Number(experienceYears) : undefined,
                specialties,
                fullName,
                phone,
                email,
                isVerified: (willVerify || isAlreadyVerified) ? true : false
            });

            // Refresh socket rooms (Mock mode city change)
            const { refreshUserRooms } = require('../services/socketHandler');
            refreshUserRooms(userId);

            res.status(200).json({
                success: true,
                data: {
                    user: mockStorage.getFullUser(userId, user.userType)
                },
                message: 'Profil gÃ¼ncellendi (test modu)',
            });
        }
    } catch (error: any) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({
                success: false,
                error: { message: error.message },
            });
        }
        next(error);
    }
};

// Get Verification Status
export const getVerificationStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = (req as any).user;
        const userId = user.id;

        // Only electricians can have verification
        if (user.userType !== 'ELECTRICIAN') {
            return res.status(403).json({
                success: false,
                error: { message: 'Sadece elektrikÃ§iler belge onayÄ± yapabilir' },
            });
        }

        try {
            if (!isDatabaseAvailable) {
                // Skip Prisma if DB is not available to avoid error logs
                throw new Error('Database not connected');
            }

            const profile = await prisma.electricianProfile.findUnique({
                where: { userId },
                select: {
                    verificationStatus: true,
                    verificationDocuments: true,
                    licenseNumber: true,
                    licenseVerified: true,
                    emoNumber: true,
                    smmNumber: true,
                },
            });

            if (!profile) {
                return res.json({
                    success: true,
                    data: { status: null },
                });
            }

            const documents = profile.verificationDocuments as any;
            const hasUploadedDocument = !!(documents?.documentUrl);

            // EÄŸer belge yÃ¼klenmemiÅŸse status null dÃ¶ndÃ¼r (form gÃ¶sterilsin)
            const effectiveStatus = hasUploadedDocument ? profile.verificationStatus : null;

            res.json({
                success: true,
                data: {
                    status: effectiveStatus,
                    licenseNumber: profile.licenseNumber,
                    licenseVerified: profile.licenseVerified,
                    emoNumber: (profile as any).emoNumber || null,
                    smmNumber: (profile as any).smmNumber || null,
                    documentType: documents?.documentType || null,
                    documentUrl: documents?.documentUrl || null,
                    submittedAt: documents?.submittedAt || null,
                    reviewedAt: documents?.reviewedAt || null,
                    rejectionReason: documents?.rejectionReason || null,
                },
            });
        } catch (dbError: any) {
            const isConnectionError =
                dbError.message?.includes('connect') ||
                dbError.message?.includes('database') ||
                dbError.message?.includes("Can't reach database") ||
                dbError.code === 'P1001';

            if (isConnectionError) {
                console.warn('âš ï¸ Database not connected, returning mock verification status');
            } else {
                console.warn('Database error, returning mock verification status:', dbError.message);
            }
            // Mock response for testing
            const mockData = mockStorage.get(userId);
            res.json({
                success: true,
                data: {
                    status: mockData.verificationStatus || null,
                    documentType: mockData.documentType || null,
                    submittedAt: mockData.submittedAt || null,
                    licenseNumber: mockData.licenseNumber || null,
                    emoNumber: mockData.emoNumber || null,
                    smmNumber: mockData.smmNumber || null
                },
            });
        }
    } catch (error) {
        next(error);
    }
};

// Submit Verification Documents
export const submitVerification = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = (req as any).user;
        const userId = user.id;
        const { documentType, licenseNumber, emoNumber, smmNumber, documentImage } = req.body;

        console.log('ğŸ” VERIFICATION SUBMIT DEBUG:', {
            userId,
            documentType,
            licenseNumber,
            emoNumber,
            smmNumber,
            hasImage: !!documentImage
        });

        // Only electricians can submit verification
        if (user.userType !== 'ELECTRICIAN') {
            return res.status(403).json({
                success: false,
                error: { message: 'Sadece elektrikÃ§iler belge onayÄ± yapabilir' },
            });
        }

        // Validation
        if (!documentType || (!licenseNumber && documentType !== 'YETKILI_MUHENDIS')) {
            return res.status(400).json({
                success: false,
                error: { message: 'Belge tÃ¼rÃ¼ ve lisans numarasÄ± gereklidir' },
            });
        }

        let documentUrl = null;
        try {
            // Save document image if provided
            if (documentImage) {
                // Extract base64 data
                let base64Data: string;
                let ext = 'jpg';

                if (documentImage.startsWith('data:')) {
                    const matches = documentImage.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
                    if (matches) {
                        ext = matches[1];
                        base64Data = matches[2];
                    } else {
                        base64Data = documentImage;
                    }
                } else {
                    base64Data = documentImage;
                }

                const buffer = Buffer.from(base64Data, 'base64');

                // Create uploads directory
                const uploadDir = path.join(process.cwd(), 'uploads', 'verifications');
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }

                // Generate unique filename
                const filename = `verification-${userId}-${Date.now()}.${ext}`;
                const filePath = path.join(uploadDir, filename);

                // Write file
                fs.writeFileSync(filePath, buffer);
                documentUrl = `/uploads/verifications/${filename}`;
            }

            // Update electrician profile
            const updatedProfile = await prisma.electricianProfile.update({
                where: { userId },
                data: {
                    licenseNumber: licenseNumber,
                    emoNumber: emoNumber,
                    smmNumber: smmNumber,
                    verificationStatus: 'PENDING',
                    verificationDocuments: {
                        documentType,
                        documentUrl,
                        submittedAt: new Date().toISOString(),
                    },
                },
            });

            res.json({
                success: true,
                data: {
                    status: 'PENDING',
                    message: 'Belgeniz onay iÃ§in gÃ¶nderildi',
                },
            });
        } catch (dbError: any) {
            console.warn('Database error, simulating verification submit:', dbError.message);
            // Persistence in mock storage
            mockStorage.updateProfile(userId, {
                verificationStatus: 'PENDING',
                documentType,
                submittedAt: new Date().toISOString(),
                documentUrl: documentUrl || 'mock-doc-url',
                licenseNumber: licenseNumber || null,
                emoNumber: emoNumber || null,
                smmNumber: smmNumber || null
            });

            // Mock success for testing
            res.json({
                success: true,
                data: {
                    status: 'PENDING',
                    message: 'Belgeniz onay iÃ§in gÃ¶nderildi (test modu)',
                },
            });
        }
    } catch (error) {
        next(error);
    }
};
// Update Push Token
export const updatePushToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = (req as any).user;
        const userId = user.id;
        const { pushToken } = req.body;

        // ğŸ›¡ï¸ SECURITY: Admin impersonate modundaysa, kullanÄ±cÄ±nÄ±n gerÃ§ek push token'Ä±nÄ± bozma
        if (user.isImpersonated) {
            console.log(`ğŸ›¡ï¸ [IMPERSONATION] Skipping push token update for user ${userId}`);
            return res.status(200).json({
                success: true,
                message: 'Push token update skipped (Impersonation Mode)',
            });
        }

        // Allow null/empty to CLEAR the push token (user disabled notifications)
        if (pushToken === null || pushToken === undefined || pushToken === '') {
            console.log(`\nğŸ”• CLEARING PUSH TOKEN for user ${userId} (notifications disabled)\n`);
            try {
                await prisma.user.update({
                    where: { id: userId },
                    data: { pushToken: null },
                });
                return res.status(200).json({
                    success: true,
                    message: 'Push token cleared - notifications disabled',
                });
            } catch (dbError: any) {
                const { mockStorage } = require('../utils/mockStorage');
                mockStorage.updateProfile(userId, { pushToken: undefined } as any);
                return res.status(200).json({
                    success: true,
                    message: 'Push token cleared (test mode)',
                });
            }
        }

        console.log(`\nğŸ”” PUSH TOKEN RECEIVED for user ${userId}:`);
        console.log(`   Token: ${pushToken}\n`);

        try {
            // 1. Bu token'Ä± baÅŸka hesaplardan temizle (aynÄ± telefon, farklÄ± hesap senaryosu)
            const cleared = await prisma.user.updateMany({
                where: {
                    pushToken: pushToken,
                    id: { not: userId }
                },
                data: { pushToken: null }
            });

            if (cleared.count > 0) {
                console.log(`ğŸ§¹ Cleared duplicate push token from ${cleared.count} other account(s) - same device login detected`);
            }

            // 2. Åimdiki kullanÄ±cÄ±ya token'Ä± ata ve uninstalled flagini kaldÄ±r
            const currentUser = await prisma.user.findUnique({ where: { id: userId } });
            const userNs = (currentUser?.notificationSettings as any) || {};
            delete userNs.appUninstalled;
            delete userNs.uninstalledAt;

            await prisma.user.update({
                where: { id: userId },
                data: { pushToken, notificationSettings: userNs },
            });

            res.status(200).json({
                success: true,
                message: 'Push token updated successfully',
            });
        } catch (dbError: any) {
            console.warn('Database error updating push token, saving to mockStorage:', dbError.message);

            // Save to mock storage so push notifications work in mock mode
            const { mockStorage } = require('../utils/mockStorage');

            // ğŸ§¹ Mock modda da token'Ä± diÄŸer hesaplardan temizle
            mockStorage.clearPushTokenFromOthers(pushToken, userId);

            const mockUser = mockStorage.getUser(userId);
            if (mockUser) {
                 const ns = (mockUser.notificationSettings as any) || {};
                 delete ns.appUninstalled;
                 delete ns.uninstalledAt;
                 mockStorage.updateProfile(userId, { pushToken, notificationSettings: ns } as any);
            }
            console.log(`âœ… PushToken saved to mockStorage for user ${userId} (cleared from other accounts)`);

            res.status(200).json({
                success: true,
                message: 'Push token updated (test mode)',
            });
        }
    } catch (error) {
        next(error);
    }
};

/**
 * Get Electricians for Map/List with filters
 */
export const getElectricians = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { city, specialty, query, lat, lng, radius } = req.query;

        console.log(`ğŸ” Fetching electricians with filters: city=${city}, specialty=${specialty}, query=${query}, lat=${lat}, lng=${lng}, radius=${radius}`);

        const latNum = lat ? parseFloat(lat as string) : undefined;
        const lngNum = lng ? parseFloat(lng as string) : undefined;
        const radiusNum = radius ? parseFloat(radius as string) : 10; // Default 10km

        let locationFilter: any = undefined;

        if (latNum && lngNum) {
            const bbox = getBoundingBox(latNum, lngNum, radiusNum);
            locationFilter = {
                some: {
                    latitude: { gte: bbox.minLat, lte: bbox.maxLat },
                    longitude: { gte: bbox.minLon, lte: bbox.maxLon }
                }
            };
        } else if (city) {
            locationFilter = { some: { city: String(city) } };
        }

        if (!isDatabaseAvailable) {
            // Serve mock data
            return serveMockResponse(req, res, city, latNum, lngNum);
        }

        let results;
        try {
            results = await prisma.user.findMany({
                where: {
                    userType: 'ELECTRICIAN',
                    isActive: true, // List only active electricians
                    fullName: query ? { contains: String(query), mode: 'insensitive' } : undefined,
                    electricianProfile: {
                        specialties: specialty ? { has: String(specialty) } : undefined
                    },
                    locations: locationFilter
                },
                select: {
                    id: true,
                    fullName: true,
                    profileImageUrl: true,
                    phone: true,
                    isVerified: true,
                    electricianProfile: {
                        select: {
                            specialties: true,
                            serviceCategory: true,
                            ratingAverage: true,
                            totalReviews: true,
                            experienceYears: true,
                            bio: true,
                            verificationStatus: true,
                            isAvailable: true,
                            isAuthorizedEngineer: true,
                            emoNumber: true,
                            smmNumber: true
                        }
                    },
                    locations: {
                        select: {
                            id: true,
                            city: true,
                            district: true,
                            latitude: true,
                            longitude: true,
                            isDefault: true
                        }
                    },
                    reviewsReceived: {
                        take: 1,
                        orderBy: { createdAt: 'desc' },
                        select: {
                            comment: true,
                            reviewer: {
                                select: {
                                    fullName: true
                                }
                            }
                        }
                    }
                }
            });
        } catch (dbError: any) {
            console.warn('Database error in getElectricians, falling back to mock:', dbError.message);
            return serveMockResponse(req, res, city, latNum, lngNum);
        }

        // Add distance calculation if coordinates were provided
        if (latNum && lngNum) {
            results = (results as any[]).map(elec => {
                const loc = elec.locations.find((l: any) => l.isDefault) || elec.locations[0];
                let distance = null;
                if (loc) {
                    distance = calculateDistance(latNum, lngNum, Number(loc.latitude), Number(loc.longitude));
                }
                return { ...elec, distance: distance ? parseFloat(distance.toFixed(2)) : null };
            });

            // Filter by exact radius after bbox optimization
            results = results.filter((elec: any) => elec.distance === null || elec.distance <= radiusNum);

            // Sort by distance
            results.sort((a: any, b: any) => (a.distance || 999) - (b.distance || 999));
        }

        // â”€â”€ Merge mock storage electricians that are missing from DB â”€â”€
        // Users registered during DB outages live only in mock storage.
        // We merge them so they appear in the public electrician listing too.
        try {
            const allMockUsers = mockStorage.getAllUsers();
            const dbEmails = new Set((results as any[]).map((u: any) => u.email?.toLowerCase()).filter(Boolean));
            const dbIds = new Set((results as any[]).map((u: any) => u.id));

            const mockElectricians = allMockUsers
                .filter((mu: any) => {
                    if (!mu.email) return false;
                    if (mu.isActive === false) return false;
                    if (mu.userType !== 'ELECTRICIAN') return false;
                    // Skip placeholder/test mock IDs
                    if (mu.id?.startsWith('mock-elec-') || mu.id === 'electricians' || mu.id === 'verification') return false;
                    // Skip if already in DB results
                    if (dbEmails.has(mu.email.toLowerCase())) return false;
                    if (dbIds.has(mu.id)) return false;
                    return true;
                })
                .filter((mu: any) => {
                    // Apply same filters that DB query uses
                    if (query && !mu.fullName?.toLowerCase().includes(String(query).toLowerCase())) return false;
                    if (specialty && !(mu.specialties || []).includes(String(specialty))) return false;
                    if (city) {
                        const cityStr = String(city).toLowerCase();
                        const hasCity = (mu.locations || []).some((l: any) => l.city?.toLowerCase() === cityStr);
                        if (!hasCity) return false;
                    }
                    if (latNum && lngNum) {
                        const loc = (mu.locations || []).find((l: any) => l.isDefault) || (mu.locations || [])[0];
                        if (!loc || !loc.latitude || !loc.longitude) return false;
                        const dist = calculateDistance(latNum, lngNum, Number(loc.latitude), Number(loc.longitude));
                        if (dist > radiusNum) return false;
                    }
                    return true;
                })
                .map((mu: any) => {
                    const loc = (mu.locations || []).find((l: any) => l.isDefault) || (mu.locations || [])[0];
                    let distance = null;
                    if (latNum && lngNum && loc) {
                        distance = parseFloat(calculateDistance(latNum, lngNum, Number(loc.latitude), Number(loc.longitude)).toFixed(2));
                    }
                    return {
                        id: mu.id,
                        fullName: mu.fullName || 'Ä°simsiz Usta',
                        profileImageUrl: mu.profileImageUrl || null,
                        phone: mu.phone || '',
                        isVerified: mu.isVerified || false,
                        electricianProfile: {
                            specialties: mu.specialties || [],
                            serviceCategory: mu.serviceCategory || 'elektrik',
                            ratingAverage: mu.ratingAverage || 0,
                            totalReviews: mu.totalReviews || 0,
                            experienceYears: mu.experienceYears || 0,
                            bio: mu.bio || '',
                            verificationStatus: mu.verificationStatus || null,
                            isAvailable: true,
                            isAuthorizedEngineer: mu.isAuthorizedEngineer || false,
                            emoNumber: mu.emoNumber || null,
                            smmNumber: mu.smmNumber || null
                        },
                        locations: (mu.locations || []).map((l: any) => ({
                            id: l.id,
                            city: l.city,
                            district: l.district,
                            latitude: l.latitude,
                            longitude: l.longitude,
                            isDefault: l.isDefault || false
                        })),
                        reviewsReceived: [],
                        distance,
                        _source: 'mock' // Debug marker
                    };
                });

            if (mockElectricians.length > 0) {
                console.log(`ğŸ“ getElectricians: Merged ${mockElectricians.length} mock electrician(s) not found in DB`);
                results = [...(results as any[]), ...mockElectricians];

                // Re-sort by distance if coordinates were provided
                if (latNum && lngNum) {
                    (results as any[]).sort((a: any, b: any) => (a.distance || 999) - (b.distance || 999));
                }
            }
        } catch (mergeErr) {
            console.warn('âš ï¸ Failed to merge mock electricians:', mergeErr);
        }

        res.status(200).json({
            success: true,
            data: results
        });
    } catch (error) {
        console.error('Error in getElectricians:', error);
        next(error);
    }
};

/**
 * Get Specific Electrician Profile by ID
 */
export const getElectricianById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const id = req.params.id as string;

        if (!isDatabaseAvailable || (id as string).startsWith('mock-')) {
            // Check if this is a known mock user from our session storage
            const mockData = mockStorage.get(id);
            const isKnownMockUser = !!mockData.fullName || mockData.specialties.length > 0;

            // Build locations from mockStorage data
            let userLocations = [{ city: 'Ä°stanbul', district: 'Merkez', isDefault: true }];

            if (mockData.locations && mockData.locations.length > 0) {
                userLocations = mockData.locations.map((loc: any) => ({
                    city: loc.city || 'TÃ¼rkiye',
                    district: loc.district || 'Merkez',
                    isDefault: loc.isDefault ?? true
                }));
            } else if (mockData.city) {
                userLocations = [{
                    city: mockData.city,
                    district: mockData.district || 'Merkez',
                    isDefault: true
                }];
            }

            // Get city from first location
            const primaryCity = userLocations[0]?.city || 'TÃ¼rkiye';

            // Get real rating stats from mock reviews
            const reviewStats = mockReviewStorage.getRatingStats(id);
            const rawMock = mockStorage.get(id);
            const mockReviews = mockReviewStorage.getReviewsForElectrician(id).slice(0, 5);

            // Mock data fallback or dynamic mock data
            return res.status(200).json({
                success: true,
                data: {
                    id: id,
                    fullName: mockData.fullName || 'Ahmet YÄ±lmaz',
                    profileImageUrl: mockData.profileImageUrl || null,
                    phone: mockData.phone || null,
                    city: primaryCity,
                    isVerified: mockData.isVerified ?? true,
                    electricianProfile: {
                        specialties: mockData.specialties.length > 0 ? mockData.specialties : ['Tesisat', 'ArÄ±za', 'AydÄ±nlatma', 'Pano'],
                        ratingAverage: reviewStats.ratingAverage || (isKnownMockUser ? 0 : 4.8),
                        totalReviews: reviewStats.totalReviews || (isKnownMockUser ? 0 : 124),
                        experienceYears: mockData.experienceYears || (isKnownMockUser ? 0 : 12),
                        bio: mockData.bio || null,
                        verificationStatus: (mockData.isVerified === true) ? 'VERIFIED' : 'PENDING',
                        completedJobsCount: mockData.completedJobsCount || 0,
                        responseTimeAvg: 2,
                        isAuthorizedEngineer: mockData.isAuthorizedEngineer || false,
                        serviceCategory: mockData.serviceCategory || (mockData.specialties.some((s: string) => s.toLowerCase().includes('klima')) ? 'klima' : 'elektrik')
                    },
                    locations: userLocations,
                    reviewsReceived: mockReviews.map(r => {
                        // Get current reviewer info from mockStorage (for dynamic updates)
                        const reviewerData = mockStorage.get(r.reviewerId);
                        // Check if this is a known user in mockStorage (has fullName set)
                        const isKnownUser = reviewerData && reviewerData.fullName && reviewerData.fullName !== 'Test KullanÄ±cÄ±sÄ±';

                        return {
                            id: r.id,
                            rating: r.rating,
                            comment: r.comment,
                            createdAt: r.createdAt,
                            reviewer: {
                                // If user exists in mockStorage, use their current data (even if null)
                                fullName: isKnownUser ? reviewerData.fullName : (r.reviewerName || 'MÃ¼ÅŸteri'),
                                profileImageUrl: isKnownUser ? (reviewerData.profileImageUrl || null) : (r.reviewerImageUrl || null)
                            }
                        };
                    })
                }
            });
        }

        const electrician = await prisma.user.findUnique({
            where: {
                id: id as string,
                userType: 'ELECTRICIAN'
            },
            select: {
                id: true,
                fullName: true,
                profileImageUrl: true,
                phone: true,
                isVerified: true,
                electricianProfile: {
                    select: {
                        specialties: true,
                        ratingAverage: true,
                        totalReviews: true,
                        experienceYears: true,
                        bio: true,
                        verificationStatus: true,
                        completedJobsCount: true,
                        responseTimeAvg: true,
                        serviceCategory: true,
                        emoNumber: true,
                        smmNumber: true,
                        isAuthorizedEngineer: true
                    }
                },
                locations: {
                    where: { isActive: true },
                    select: {
                        city: true,
                        district: true
                    }
                },
                reviewsReceived: {
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        reviewer: {
                            select: {
                                fullName: true,
                                profileImageUrl: true
                            }
                        }
                    }
                }
            }
        });

        if (!electrician) {
            return res.status(404).json({
                success: false,
                error: { message: 'Usta bulunamadÄ±' }
            });
        }

        res.status(200).json({
            success: true,
            data: electrician
        });
    } catch (error) {
        console.error('Error in getElectricianById:', error);
        next(error);
    }
};

// --- ADMIN FUNCTIONS ---



// Delete Account
export const deleteAccount = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.id;

        try {
            await userService.deleteAccount(userId);

            res.status(200).json({
                success: true,
                message: 'HesabÄ±nÄ±z baÅŸarÄ±yla silindi (askÄ±ya alÄ±ndÄ±).',
            });
        } catch (dbError: any) {
            console.warn('deleteAccount error:', dbError.message || dbError);

            // Database baÄŸlantÄ± hatasÄ± - mock baÅŸarÄ± dÃ¶ndÃ¼r (ve isActive=false yap)
            console.warn('Database not connected, deactivating account in mock mode');

            const { mockStorage } = require('../utils/mockStorage');
            // Mock veride isActive=false olarak iÅŸaretle
            mockStorage.updateProfile(userId, { isActive: false });

            res.status(200).json({
                success: true,
                message: 'HesabÄ±nÄ±z baÅŸarÄ±yla silindi (test modu).',
            });
        }
    } catch (error: any) {
        next(error);
    }
};
