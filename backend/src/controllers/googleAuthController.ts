import { Request, Response, NextFunction } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { generateTokens } from '../services/authService';
import { mockStorage, getAllMockUsers } from '../utils/mockStorage';
import { ValidationError } from '../utils/errors';
import pushNotificationService from '../services/pushNotificationService';
import prisma, { isDatabaseAvailable } from '../config/database';

// Bu ID'yi daha sonra env veya config'den alabiliriz
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

const client = new OAuth2Client(CLIENT_ID);

export const googleLoginController = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { token, userType } = req.body;

        if (!token) {
            throw new ValidationError('Google ID token is required');
        }

        // 1. Verify Google Token
        let payload;
        try {
            const ticket = await client.verifyIdToken({
                idToken: token,
                audience: CLIENT_ID,
            });
            payload = ticket.getPayload();
        } catch (error) {
            console.error('Google verification failed:', error);
            throw new ValidationError('Invalid Google token');
        }

        if (!payload || !payload.email) {
            throw new ValidationError('Invalid Google token payload');
        }

        const { email, name, sub: googleId, picture } = payload;
        const normalizedEmail = email.toLowerCase();
        const requestedUserType = userType || 'CITIZEN'; 

        console.log(`🔌 Google Login attempt: ${normalizedEmail} as ${requestedUserType}`);

        let user: any = null;
        let userId: string | undefined;

        // 2. Check Database if available
        if (isDatabaseAvailable) {
            try {
                // Try to find by email (case-insensitive)
                user = await prisma.user.findFirst({
                    where: { 
                        email: { equals: normalizedEmail, mode: 'insensitive' }
                    },
                    include: { electricianProfile: true }
                });
                
                if (user) {
                    userId = user.id;
                    console.log(`✅ [GoogleAuth] Found DB user: ${user.email} (Type: ${user.userType})`);
                }
            } catch (dbError) {
                console.error('❌ [GoogleAuth] Prisma error during lookup:', dbError);
                // Even if DB fails, we will try MockStorage next
            }
        }

        // 3. Also check mockStorage (always, as fallback for users created during DB-down periods)
        if (!user) {
            const allUsers = mockStorage.getAllUsers();
            const mockUserFound = allUsers.find(u => u.email?.toLowerCase() === normalizedEmail);
            if (mockUserFound) {
                user = mockUserFound;
                userId = user.id;

                // 🌟 MIGRATION LOGIC: if DB is available but user is only in mock, migrate them!
                if (isDatabaseAvailable) {
                    console.log('🔄 Migrating mock user to Prisma DB:', email);
                    try {
                        const dbUser = await prisma.user.create({
                            data: {
                                email: mockUserFound.email,
                                fullName: mockUserFound.fullName || name || 'Google User',
                                phone: mockUserFound.phone || '',
                                isVerified: mockUserFound.isVerified || true,
                                userType: mockUserFound.userType || requestedUserType,
                                profileImageUrl: mockUserFound.profileImageUrl || picture,
                                passwordHash: mockUserFound.passwordHash || 'GOOGLE_AUTH_MIGRATED',
                                acceptedLegalVersion: mockUserFound.acceptedLegalVersion || '25 Mart 2026 Tarihli Sözleşme',
                                marketingAllowed: mockUserFound.marketingAllowed || false,
                                isActive: true,
                            }
                        });

                        if (mockUserFound.userType === 'ELECTRICIAN' || requestedUserType === 'ELECTRICIAN') {
                            const mockAny = mockUserFound as any;
                            const profileData = mockAny.electricianProfile || {};
                            await prisma.electricianProfile.create({
                                data: {
                                    userId: dbUser.id,
                                    creditBalance: mockAny.creditBalance || profileData.creditBalance || 5,
                                    isAvailable: true,
                                    experienceYears: mockAny.experienceYears || profileData.experienceYears || 0,
                                    totalReviews: profileData.totalReviews || 0,
                                    ratingAverage: profileData.ratingAverage || 0,
                                    completedJobsCount: profileData.completedJobsCount || 0,
                                    serviceCategory: mockAny.serviceCategory || profileData.serviceCategory || 'elektrik'
                                }
                            });
                        }

                        await prisma.userConsent.createMany({
                            data: [
                                { userId: dbUser.id, documentType: 'KVKK', documentVersion: mockUserFound.acceptedLegalVersion || '25 Mart 2026 Tarihli Sözleşme', action: 'ACCEPTED', ipAddress: req.ip || 'google_auth_migration' },
                                { userId: dbUser.id, documentType: 'TERMS', documentVersion: mockUserFound.acceptedLegalVersion || '25 Mart 2026 Tarihli Sözleşme', action: 'ACCEPTED', ipAddress: req.ip || 'google_auth_migration' }
                            ]
                        });

                        user = await prisma.user.findUnique({ where: { id: dbUser.id }, include: { electricianProfile: true } });
                        if (user) userId = user.id;
                        console.log('✅ Migration successful, new user ID:', userId);
                    } catch (migrationError) {
                        console.error('❌ Failed to migrate mock user to Prisma:', migrationError);
                    }
                }
            }
        }

        // 4. Register new user automatically if not found
        if (!user) {
            console.log(`🆕 User not found for ${normalizedEmail}, checking if registration is allowed...`);

            if (!userType) {
                console.log(`❌ Auto-registration denied: No userType provided for ${normalizedEmail}`);
                return res.status(404).json({
                    success: false,
                    error: {
                        message: 'Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı. Lütfen önce kayıt olun.',
                        code: 'USER_NOT_FOUND',
                        email: normalizedEmail
                    }
                });
            }

            console.log(`🆕 Registering new Google user: ${normalizedEmail} as ${requestedUserType}`);

            const { serviceCategory } = req.body;
            const acceptedLegalVersion = req.body.acceptedLegalVersion || '25 Mart 2026 Tarihli Sözleşme';
            const marketingAllowed = req.body.marketingAllowed || false;

            if (isDatabaseAvailable) {
                try {
                    const dbUser = await prisma.user.create({
                        data: {
                            email,
                            fullName: name || 'Google User',
                            phone: '',
                            isVerified: true,
                            userType: requestedUserType,
                            profileImageUrl: picture,
                            passwordHash: 'GOOGLE_AUTH_NO_PASSWORD',
                            acceptedLegalVersion,
                            marketingAllowed,
                        }
                    });

                    if (requestedUserType === 'ELECTRICIAN') {
                        await prisma.electricianProfile.create({
                            data: {
                                userId: dbUser.id,
                                creditBalance: 5,
                                isAvailable: true,
                                experienceYears: 0,
                                totalReviews: 0,
                                ratingAverage: 0,
                                completedJobsCount: 0,
                                serviceCategory: serviceCategory || 'elektrik'
                            }
                        });
                    }

                    await prisma.userConsent.createMany({
                        data: [
                            { userId: dbUser.id, documentType: 'KVKK', documentVersion: acceptedLegalVersion, action: 'ACCEPTED', ipAddress: req.ip || 'google_auth' },
                            { userId: dbUser.id, documentType: 'TERMS', documentVersion: acceptedLegalVersion, action: 'ACCEPTED', ipAddress: req.ip || 'google_auth' },
                            ...(marketingAllowed ? [{ userId: dbUser.id, documentType: 'MARKETING', documentVersion: acceptedLegalVersion, action: 'ACCEPTED', ipAddress: req.ip || 'google_auth' }] : [])
                        ]
                    });

                    user = await prisma.user.findUnique({ where: { id: dbUser.id }, include: { electricianProfile: true } });
                    if (user) userId = user.id;
                } catch (error) {
                    console.error('Error creating Google user in Prisma:', error);
                }
            }

            if (!userId) {
                const sanitizedEmail = email.replace(/[^a-zA-Z0-9]/g, '-');
                userId = `mock-user-${sanitizedEmail}-${requestedUserType}-google`;

                mockStorage.updateProfile(userId, {
                    fullName: name || 'Google User',
                    email,
                    phone: '',
                    isVerified: true,
                    userType: requestedUserType,
                    profileImageUrl: picture,
                    serviceCategory: requestedUserType === 'ELECTRICIAN' ? (serviceCategory || 'elektrik') : undefined
                });

                user = mockStorage.getFullUser(userId, requestedUserType);
            }

            // 🔔 Notify Admins
            (async () => {
              try {
                const userTypeLabel = requestedUserType === 'ELECTRICIAN' ? 'Usta' : 'Müşteri';
                const adminPushTokens: string[] = [];
                const allMockUsers = getAllMockUsers();
                for (const [id, u] of Object.entries(allMockUsers)) {
                  if ((u as any).userType === 'ADMIN' && (u as any).pushToken) {
                    adminPushTokens.push((u as any).pushToken);
                  }
                }
                if (isDatabaseAvailable) {
                  try {
                    const dbAdmins = await prisma.user.findMany({
                      where: { userType: 'ADMIN', isActive: true },
                      select: { pushToken: true }
                    });
                    dbAdmins.forEach(admin => {
                      if (admin.pushToken && !adminPushTokens.includes(admin.pushToken)) {
                        adminPushTokens.push(admin.pushToken);
                      }
                    });
                  } catch (e) {}
                }

                if (adminPushTokens.length > 0) {
                  await pushNotificationService.sendNotification({
                    to: adminPushTokens,
                    title: '🆕 Yeni Kullanıcı Katıldı!',
                    body: `${name || email} (${userTypeLabel} - Google) uygulamaya kaydoldu.`,
                    data: { type: 'NEW_USER_REGISTERED', userEmail: email, userType: requestedUserType },
                    sound: 'default',
                  });
                }
              } catch (err) {
                console.error('⚠️ Failed to notify admins about new Google user:', err);
              }
            })();
        }

        // 5. Update Profile if existing
        if (user) {
            if (!user.isActive || !user.isVerified) {
                if (isDatabaseAvailable && !user.id.startsWith('mock-')) {
                    try {
                        await prisma.user.update({
                            where: { id: user.id },
                            data: { isActive: true, isVerified: true, deletedAt: null }
                        });
                        user.isActive = true;
                        user.isVerified = true;
                    } catch (e) {}
                } else {
                    mockStorage.updateProfile(user.id, { isActive: true, isVerified: true });
                    user.isActive = true;
                    user.isVerified = true;
                }
            }
            if (!user.profileImageUrl && picture) {
                if (isDatabaseAvailable && !user.id.startsWith('mock-')) {
                    try {
                        await prisma.user.update({ where: { id: user.id }, data: { profileImageUrl: picture } });
                        user.profileImageUrl = picture;
                    } catch (e) {}
                } else {
                    mockStorage.updateProfile(user.id, { profileImageUrl: picture });
                }
            }
            userId = user.id;
        }

        const tokens = generateTokens({ id: userId!, email, userType: user?.userType || requestedUserType });
        let fullUser = user;
        if (!isDatabaseAvailable || userId!.startsWith('mock-')) {
            fullUser = mockStorage.getFullUser(userId!, user?.userType || requestedUserType);
        }

        console.log(`✅ Google Login successful for: ${normalizedEmail} (ID: ${userId})`);

        res.json({
            success: true,
            data: {
                user: fullUser,
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
            }
        });

    } catch (error) {
        next(error);
    }
};
