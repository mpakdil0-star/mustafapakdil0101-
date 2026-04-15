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

        // 2. Check if user exists in mockStorage (since DB is down/mocked)
        const allUsers = mockStorage.getAllUsers();
        let user = allUsers.find(u => u.email === email);
        let userId = user?.id;

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

            // 3. Register new user automatically (Register screen flow)
            console.log('🆕 New Google user, registering...');

            // Retrieve serviceCategory from request body (sent from Register screen)
            const { serviceCategory } = req.body;

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
                mockStorage.updateProfile(user.id, { profileImageUrl: picture });
            }
            // Ensure userType matches or handle multi-role (currently simplified)
            userId = user.id;
        }

        // 4. Generate Tokens
        const tokens = generateTokens({ id: userId!, email, userType: user?.userType || requestedUserType });
        const fullUser = mockStorage.getFullUser(userId!, user?.userType || requestedUserType);

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
