import { Request, Response, NextFunction } from 'express';
import { generateTokens } from '../services/authService';
import { mockStorage, getAllMockUsers } from '../utils/mockStorage';
import { ValidationError } from '../utils/errors';
import pushNotificationService from '../services/pushNotificationService';
import prisma, { isDatabaseAvailable } from '../config/database';
import jwt from 'jsonwebtoken';

/**
 * Apple ile Giriş/Kayıt Controller
 * 
 * Apple Sign In, bir identityToken (JWT) döndürür.
 * Bu token'ı doğrulayıp kullanıcıyı giriş/kayıt yaptırırız.
 */
export const appleLoginController = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { identityToken, fullName, userType, serviceCategory } = req.body;

        if (!identityToken) {
            throw new ValidationError('Apple identity token is required');
        }

        // 1. Decode Apple's JWT (identityToken)
        // Apple tokens are JWTs signed by Apple. For production, you should verify
        // the signature with Apple's public keys. For now, we decode to get the payload.
        let decoded: any;
        try {
            // Decode without verification for the email claim
            // In production, verify with Apple's public keys from https://appleid.apple.com/auth/keys
            decoded = jwt.decode(identityToken);
        } catch (error) {
            console.error('Apple token decode failed:', error);
            throw new ValidationError('Invalid Apple token');
        }

        if (!decoded || !decoded.email) {
            throw new ValidationError('Invalid Apple token payload - no email found');
        }

        const email = decoded.email;
        const appleUserId = decoded.sub; // Apple's unique user identifier
        const requestedUserType = userType || 'CITIZEN';

        // Apple only sends the name on first sign-in, so we need fullName from the request
        const userName = fullName || email.split('@')[0];

        console.log(`🍎 Apple Login attempt: ${email} as ${requestedUserType}`);

        // 2. Check if user exists
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
                        email: email
                    }
                });
            }

            // 3. Register new user automatically (Register screen flow)
            console.log('🆕 New Apple user, registering...');

            const sanitizedEmail = email.replace(/[^a-zA-Z0-9]/g, '-');
            userId = `mock-user-${sanitizedEmail}-${requestedUserType}-apple`;

            mockStorage.updateProfile(userId, {
                fullName: userName,
                email,
                phone: '',
                isVerified: true, // Apple email is verified
                userType: requestedUserType,
                serviceCategory: requestedUserType === 'ELECTRICIAN' ? (serviceCategory || 'elektrik') : undefined
            });

            user = mockStorage.getFullUser(userId, requestedUserType);

            // 🔔 Admin'e yeni Apple kullanıcı bildirimi gönder
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
                  } catch (e) { /* ignore */ }
                }

                if (adminPushTokens.length > 0) {
                  await pushNotificationService.sendNotification({
                    to: adminPushTokens,
                    title: '🆕 Yeni Kullanıcı Katıldı!',
                    body: `${userName} (${userTypeLabel} - Apple) uygulamaya kaydoldu.`,
                    data: { type: 'NEW_USER_REGISTERED', userEmail: email, userType: requestedUserType },
                    sound: 'default',
                  });
                }
              } catch (err) {
                console.error('⚠️ Failed to notify admins about new Apple user:', err);
              }
            })();
        } else {
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
