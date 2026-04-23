import { Request, Response, NextFunction } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { generateTokens } from '../services/authService';
import { mockStorage, getAllMockUsers } from '../utils/mockStorage';
import { ValidationError } from '../utils/errors';
import pushNotificationService from '../services/pushNotificationService';
import prisma, { isDatabaseAvailable } from '../config/database';

// Bu ID'yi daha sonra env veya config'den alabiliriz
// Şimdilik boş bırakıyoruz, verifyIdToken içinde audience kontrolünü esnek tutacağız veya client'tan gelen ID'yi kullanacağız
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
                audience: CLIENT_ID, // Specify the CLIENT_ID of the app that accesses the backend
            });
            payload = ticket.getPayload();
        } catch (error) {
            // Fallback for development/testing if strict verification fails or setup isn't complete
            // In production, this should always fail. For now, we allow if payload is decoded locally if network fails
            console.error('Google verification failed:', error);
            throw new ValidationError('Invalid Google token');
        }

        if (!payload || !payload.email) {
            throw new ValidationError('Invalid Google token payload');
        }

        const { email, name, sub: googleId, picture } = payload;
        const requestedUserType = userType || 'CITIZEN'; // Default to CITIZEN if not specified

        console.log(`🔌 Google Login attempt: ${email} as ${requestedUserType}`);

        let user: any = null;
        let userId: string | undefined;

        // 2. Check Database if available
        if (isDatabaseAvailable) {
            try {
                user = await prisma.user.findFirst({
                    where: { email },
                    include: { electricianProfile: true }
                });
                if (user) userId = user.id;
            } catch (error) {
                console.warn('⚠️ Prisma query failed in google auth fallback to mock', error);
            }
        }

        // 3. Also check mockStorage (always, as fallback for users created during DB-down periods)
        if (!user) {
            const allUsers = mockStorage.getAllUsers();
            user = allUsers.find(u => u.email === email);
            if (user) userId = user.id;
        }

        if (!user) {
            // If userType was NOT explicitly provided (Login screen flow),
            // do not auto-register. Return error so frontend can redirect to registration.
            if (!userType) {
                return res.status(404).json({
                    success: false,
                    error: {
                        message: 'Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı. Lütfen önce kayıt olun.',
                        code: 'USER_NOT_FOUND',
                        email: email // Return email so frontend can pre-fill
                    }
                });
            }

            // 4. Register new user automatically (Register screen flow)
            console.log('🆕 New Google user, registering...');

            // Retrieve serviceCategory from request body (sent from Register screen)
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
                    userId = user.id;
                } catch (error) {
                    console.error('Error creating Google user in Prisma:', error);
                }
            }

            // Fallback or double save to mock storage for safety
            if (!userId) {
                // Sanitize email for ID
                const sanitizedEmail = email.replace(/[^a-zA-Z0-9]/g, '-');
                userId = `mock-user-${sanitizedEmail}-${requestedUserType}-google`;

                mockStorage.updateProfile(userId, {
                    fullName: name || 'Google User',
                    email,
                    phone: '', // Google doesn't provide phone by default
                    isVerified: true, // Google email is verified
                    userType: requestedUserType,
                    profileImageUrl: picture,
                    serviceCategory: requestedUserType === 'ELECTRICIAN' ? (serviceCategory || 'elektrik') : undefined
                });

                // Fetch the newly created user
                user = mockStorage.getFullUser(userId, requestedUserType);
            }

            // 🔔 Admin'e yeni Google kullanıcı bildirimi gönder
            (async () => {
              try {
                const userTypeLabel = requestedUserType === 'ELECTRICIAN' ? 'Usta' : 'Müşteri';
                const adminPushTokens: string[] = [];

                // Mock storage admin tokens
                const allMockUsers = getAllMockUsers();
                for (const [id, u] of Object.entries(allMockUsers)) {
                  if ((u as any).userType === 'ADMIN' && (u as any).pushToken) {
                    adminPushTokens.push((u as any).pushToken);
                  }
                }

                // DB admin tokens
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
                  } catch (e) { /* ignore */ }
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
        } else {
            // Update existing user's photo if missing
            if (!user.profileImageUrl && picture) {
                if (isDatabaseAvailable && !user.id.startsWith('mock-')) {
                    try {
                        await prisma.user.update({
                            where: { id: user.id },
                            data: { profileImageUrl: picture }
                        });
                        user.profileImageUrl = picture;
                    } catch (e) {}
                } else {
                    mockStorage.updateProfile(user.id, { profileImageUrl: picture });
                }
            }
            // Ensure userType matches or handle multi-role (currently simplified)
            userId = user.id;
        }

        // 5. Generate Tokens
        const tokens = generateTokens({ id: userId!, email, userType: user?.userType || requestedUserType });
        let fullUser = user;
        if (!isDatabaseAvailable || userId!.startsWith('mock-')) {
            fullUser = mockStorage.getFullUser(userId!, user?.userType || requestedUserType);
        }

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
