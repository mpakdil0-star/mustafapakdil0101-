import { Request, Response, NextFunction } from 'express';
import { register, login, refreshToken, generateTokens, forgotPassword, resetPassword } from '../services/authService';
import { ValidationError, UnauthorizedError } from '../utils/errors';
import prisma, { isDatabaseAvailable } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { mockStorage, getAllMockUsers } from '../utils/mockStorage';
import { sendEmailVerificationCode, verifyEmailCode } from '../services/emailVerificationService';
import pushNotificationService from '../services/pushNotificationService';

/**
 * Yeni kullanıcı kaydolduğunda tüm admin hesaplarına push bildirim gönder
 */
const notifyAdminsNewUser = async (newUserName: string, newUserEmail: string, newUserType: string) => {
  try {
    const userTypeLabel = newUserType === 'ELECTRICIAN' ? 'Usta' : (newUserType === 'ADMIN' ? 'Admin' : 'Müşteri');

    // Collect admin push tokens from both DB and mock storage
    const adminPushTokens: string[] = [];

    // 1. Check mock storage for admin users
    const allMockUsers = getAllMockUsers();
    for (const [id, user] of Object.entries(allMockUsers)) {
      if (user.userType === 'ADMIN' && user.pushToken) {
        adminPushTokens.push(user.pushToken);
      }
    }

    // 2. Check real DB for admin users (if available)
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
      } catch (e) {
        // DB unavailable, mock tokens already collected
      }
    }

    if (adminPushTokens.length === 0) {
      console.log('ℹ️ No admin push tokens found, skipping new user notification');
      return;
    }

    console.log(`📢 Sending new user notification to ${adminPushTokens.length} admin(s)`);

    await pushNotificationService.sendNotification({
      to: adminPushTokens,
      title: '🆕 Yeni Kullanıcı Katıldı!',
      body: `${newUserName} (${userTypeLabel}) uygulamaya kaydoldu.`,
      data: {
        type: 'NEW_USER_REGISTERED',
        userEmail: newUserEmail,
        userType: newUserType,
      },
      sound: 'default',
    });
  } catch (error) {
    // Bildirim gönderilemezse kayıt akışını bozma
    console.error('⚠️ Failed to notify admins about new user:', error);
  }
};

export const logoutController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;

    if (userId) {
      if (!isDatabaseAvailable || userId.startsWith('mock-')) {
        mockStorage.updateProfile(userId, { pushToken: null });
      } else {
        await prisma.user.update({
          where: { id: userId },
          data: { pushToken: null },
        });
      }
      console.log(`📡 User ${userId} logged out, pushToken cleared.`);
    }

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const registerController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password, fullName, phone, userType, serviceCategory, acceptedLegalVersion, marketingAllowed } = req.body;
    const ipAddress = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || 'unknown') as string;

    if (!email || !password || !fullName || !userType || !phone) {
      throw new ValidationError('Missing required fields');
    }

    try {
      const result = await register({
        email,
        password,
        fullName,
        phone,
        userType,
        serviceCategory, // Pass serviceCategory to register service
        acceptedLegalVersion,
        marketingAllowed,
        ipAddress,
      });

      // 🔔 Admin'e yeni kullanıcı bildirimi gönder (arka planda, response'u beklemesin)
      notifyAdminsNewUser(fullName, email, userType);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (dbError: any) {
      const isConnectionError =
        dbError.message?.includes('connect') ||
        dbError.message?.includes('database') ||
        dbError.message?.includes('Can\'t reach database') ||
        dbError.code === 'P1001' ||
        dbError.code === 'P1017' ||
        dbError.name === 'PrismaClientInitializationError' ||
        dbError.constructor.name === 'PrismaClientInitializationError';

      if (isConnectionError) {
        console.warn('⚠️ Database connection failed, saving to persistent mock storage');
        // Make ID deterministic based on email AND userType
        const sanitizedEmail = email.replace(/[^a-zA-Z0-9]/g, '-');
        const mockUserId = `mock-user-${sanitizedEmail}-${userType}`;

        const allUsers = mockStorage.getAllUsers();

        // Email check
        if (allUsers.find(u => u.email === email)) {
          return res.status(409).json({
            success: false,
            error: {
              message: 'Bu e-posta adresi ile kayıtlı bir kullanıcı zaten mevcut.',
              code: 'EMAIL_ALREADY_EXISTS'
            },
          });
        }

        // Phone check
        if (phone && allUsers.find(u => u.phone === phone)) {
          return res.status(409).json({
            success: false,
            error: {
              message: 'Bu telefon numarası ile kayıtlı bir kullanıcı zaten mevcut.',
              code: 'PHONE_ALREADY_EXISTS'
            },
          });
        }

        // Save user data to persistent mockStorage
        const userData = mockStorage.updateProfile(mockUserId, {
          fullName, email,
          phone: phone || '',
          passwordHash: password, // Store password in mock mode
          isVerified: userType === 'ELECTRICIAN' && !!phone,
          serviceCategory: userType === 'ELECTRICIAN' ? (serviceCategory || 'elektrik') : undefined, // Save profession
          userType: userType, // Explicitly save userType
          acceptedLegalVersion,
          marketingAllowed: !!marketingAllowed,
          specialties: userType === 'ELECTRICIAN' ? ['Arıza Onarım'] : [], // Default specialty for new electricians
        });

        const tokens = generateTokens({ id: mockUserId, email, userType });

        // 🔔 Admin'e yeni kullanıcı bildirimi gönder (mock fallback path)
        notifyAdminsNewUser(fullName, email, userType);

        return res.status(201).json({
          success: true,
          data: {
            user: mockStorage.getFullUser(mockUserId, userType),
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
          },
        });
      }
      throw dbError;
    }
  } catch (error) {
    next(error);
  }
};

export const loginController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    try {
      const result = await login({ email, password });

      res.json({
        success: true,
        data: result,
      });
    } catch (dbError: any) {
      const isConnectionError =
        dbError.message?.includes('connect') ||
        dbError.message?.includes('database') ||
        dbError.message?.includes('Can\'t reach database') ||
        dbError.code === 'P1001' ||
        dbError.code === 'P1017' ||
        dbError.name === 'PrismaClientInitializationError' ||
        dbError.constructor.name === 'PrismaClientInitializationError';

      if (isConnectionError) {
        console.warn('⚠️ Database connection failed, checking mock storage for login');

        // Check if user exists in mockStorage
        const allMockUsers = mockStorage.getAllUsers();
        const existingUser = allMockUsers.find(u => u.email === email);

        if (!existingUser) {
          // User not found - they need to register first
          return res.status(401).json({
            success: false,
            error: {
              message: 'Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı. Lütfen önce kayıt olun.',
              code: 'USER_NOT_FOUND'
            },
          });
        }

        // Validate password in mock mode
        if (existingUser.passwordHash && existingUser.passwordHash !== password) {
          return res.status(401).json({
            success: false,
            error: {
              message: 'Girdiğiniz şifre hatalı. Lütfen kontrol edip tekrar deneyin.',
              code: 'INVALID_CREDENTIALS'
            },
          });
        }

        // User exists - use their ACTUAL id and userType from mockStorage
        const mockUserId = existingUser.id;
        const mockUserType = existingUser.userType;

        console.log(`✅ Mock login successful: ${mockUserId} as ${mockUserType}`);

        // Generate tokens with correct user data
        const tokens = generateTokens({ id: mockUserId, email, userType: mockUserType });

        // IMPORTANT: Use getFullUser to get complete user data INCLUDING electricianProfile
        const fullUser = mockStorage.getFullUser(mockUserId, mockUserType);

        // DEBUG: Log what we're sending back
        console.log('📦 LOGIN RESPONSE DEBUG:', {
          userId: mockUserId,
          userType: mockUserType,
          hasElectricianProfile: !!fullUser.electricianProfile,
          experienceYears: fullUser.electricianProfile?.experienceYears,
          specialtiesCount: fullUser.electricianProfile?.specialties?.length,
          specialties: fullUser.electricianProfile?.specialties,
        });

        return res.json({
          success: true,
          data: {
            user: fullUser,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            currentLegalVersion: 'v1.0', // Latest version in mock mode
          },
        });
      }
      throw dbError;
    }
  } catch (error) {
    next(error);
  }
};

export const refreshTokenController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      throw new ValidationError('Refresh token is required');
    }

    try {
      const tokens = await refreshToken(token);

      res.json({
        success: true,
        data: tokens,
      });
    } catch (error: any) {
      // Hata loglama
      console.error('❌ Refresh token error:', error.message);
      if (error instanceof UnauthorizedError) {
        console.error('   Reason: UnauthorizedError - token invalid or expired');
      } else {
        console.error('   Error type:', error.constructor?.name);
        console.error('   Error details:', error);
      }

      // UnauthorizedError ise (token geçersiz), olduğu gibi döndür
      if (error instanceof UnauthorizedError || (error instanceof Error && error.message.includes('Invalid refresh token'))) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Invalid or expired refresh token',
          },
        });
      }

      // Diğer hataları next'e gönder
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

export const meController = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { message: 'Unauthorized' },
      });
    }

    // FAST PATH: Skip Prisma if database is not available or user is mock
    if (!isDatabaseAvailable || req.user.id.startsWith('mock-')) {
      const userData = mockStorage.getFullUser(req.user.id, req.user.userType);
      return res.json({
        success: true,
        data: {
          user: userData,
          currentLegalVersion: 'v1.0'
        },
      });
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          fullName: true,
          city: true,
          phone: true,
          userType: true,
          profileImageUrl: true,
          isVerified: true,
          createdAt: true,
          updatedAt: true,
          electricianProfile: true, // Profile ve bakiye bilgisini ekle
        },
      });

      // 🛡️ Master Admin Identity Protection
      if (user && (user.email === 'mpakdil0@gmail.com' || user.userType === 'ADMIN')) {
        (user as any).fullName = 'Yönetici';
      }

      res.json({
        success: true,
        data: { user },
      });
    } catch (dbError: any) {
      const isConnectionError =
        dbError.message?.includes('connect') ||
        dbError.message?.includes('database') ||
        dbError.message?.includes('Can\'t reach database') ||
        dbError.code === 'P1001' ||
        dbError.code === 'P1017' ||
        dbError.name === 'PrismaClientInitializationError' ||
        dbError.constructor.name === 'PrismaClientInitializationError';

      if (isConnectionError || req.user.id.startsWith('mock-')) {
        console.warn('⚠️ Database connection failed, returning mock user data for /auth/me');
        return res.json({
          success: true,
          data: {
            user: mockStorage.getFullUser(req.user.id, req.user.userType),
            currentLegalVersion: 'v1.0'
          },
        });
      }
      throw dbError;
    }
  } catch (error) {
    next(error);
  }
};

export const forgotPasswordController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body;
    if (!email) throw new ValidationError('Email is required');

    const result = await forgotPassword(email);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const resetPasswordController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      throw new ValidationError('Missing required fields');
    }

    const result = await resetPassword({ email, code, newPassword });
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * E-posta doğrulama kodu gönder (kayıt sonrası)
 */
export const sendEmailVerificationController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, fullName } = req.body;
    if (!email) throw new ValidationError('Email is required');

    const result = await sendEmailVerificationCode(email, fullName || 'Kullanıcı');
    res.json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * E-posta doğrulama kodunu kontrol et
 */
export const verifyEmailController = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) throw new ValidationError('Email and code are required');

    const result = verifyEmailCode(email, code);

    if (!result.valid) {
      return res.status(400).json({
        success: false,
        error: { message: result.message },
      });
    }

    // Veritabanında emailVerified flag'ini güncelle (varsa)
    if (isDatabaseAvailable) {
      try {
        await prisma.user.update({
          where: { email },
          data: { isVerified: true },
        });
      } catch (dbErr) {
        // DB hatası olursa sessizce geç — doğrulama yine de başarılı
        console.warn('⚠️ Could not update isVerified in DB:', dbErr);
      }
    }

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};
