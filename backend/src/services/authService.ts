import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import prisma, { isDatabaseAvailable } from '../config/database';
import { config } from '../config/env';
import { ValidationError, UnauthorizedError, ConflictError } from '../utils/errors';
import { UserType } from '@prisma/client';

export interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  userType: UserType;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface TokenPayload {
  id: string;
  email: string;
  userType: string;
}

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const generateTokens = (payload: TokenPayload) => {
  const accessToken = jwt.sign(
    payload as object,
    config.jwtSecret,
    {
      expiresIn: config.jwtExpiresIn,
    } as jwt.SignOptions
  );

  const refreshToken = jwt.sign(
    payload as object,
    config.jwtRefreshSecret,
    {
      expiresIn: config.jwtRefreshExpiresIn,
    } as jwt.SignOptions
  );

  return { accessToken, refreshToken };
};

export const register = async (data: RegisterData) => {
  const { email, password, fullName, phone, userType } = data;

  // Check if user exists
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email },
        ...(phone ? [{ phone }] : []),
      ],
    },
  });

  if (existingUser) {
    throw new ConflictError('User with this email or phone already exists');
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName,
      phone,
      userType,
      isVerified: userType === UserType.ELECTRICIAN && !!phone,
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      userType: true,
      profileImageUrl: true,
      isVerified: true,
      createdAt: true,
    },
  });

  // Create electrician profile if user is electrician
  if (userType === UserType.ELECTRICIAN) {
    await prisma.electricianProfile.create({
      data: {
        userId: user.id,
        creditBalance: 5, // Bonus for phone verification (which is now mandatory)
        isAvailable: true,
        experienceYears: 0,
        totalReviews: 0,
        ratingAverage: 0,
        completedJobsCount: 0
      },
    });
  }

  // Generate tokens
  const tokens = generateTokens({
    id: user.id,
    email: user.email,
    userType: user.userType,
  });

  return {
    user,
    ...tokens,
  };
};

export const login = async (data: LoginData) => {
  const { email, password } = data;

  // Find user
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  if (!user.isActive) {
    throw new UnauthorizedError('Account is deactivated');
  }

  if (user.isBanned) {
    if (user.banUntil && user.banUntil > new Date()) {
      throw new UnauthorizedError('Account is banned');
    }
    // Ban expired, update
    await prisma.user.update({
      where: { id: user.id },
      data: { isBanned: false, banUntil: null, banReason: null },
    });
  }

  // Verify password
  const isPasswordValid = await comparePassword(password, user.passwordHash);

  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // Generate tokens
  const tokens = generateTokens({
    id: user.id,
    email: user.email,
    userType: user.userType,
  });

  // Get user profile
  const userProfile = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      userType: true,
      profileImageUrl: true,
      isVerified: true,
      createdAt: true,
    },
  });

  return {
    user: userProfile,
    ...tokens,
  };
};

export const refreshToken = async (refreshToken: string) => {
  try {
    let decoded: TokenPayload;
    try {
      decoded = jwt.verify(refreshToken, config.jwtRefreshSecret) as TokenPayload;
      console.log('✅ Refresh token verified successfully for user:', decoded.id);
    } catch (jwtError: any) {
      console.error('❌ JWT verification failed:', jwtError.name, jwtError.message);
      if (jwtError.name === 'TokenExpiredError') {
        console.error('   Token expired at:', jwtError.expiredAt);
      }
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Veritabanı yoksa direkt mock moduna geç, Prisma timeout'unu bekleme
    if (!isDatabaseAvailable) {
      console.warn('⚠️ Database not connected, skipping DB check for refresh');
      const tokens = generateTokens({
        id: decoded.id,
        email: decoded.email,
        userType: decoded.userType,
      });
      return tokens;
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          userType: true,
          isActive: true,
          isBanned: true,
        },
      });

      if (!user || !user.isActive || user.isBanned) {
        throw new UnauthorizedError('Invalid refresh token');
      }

      const tokens = generateTokens({
        id: user.id,
        email: user.email,
        userType: user.userType,
      });

      return tokens;
    } catch (dbError: any) {
      const isConnectionError =
        dbError.message?.includes('connect') ||
        dbError.message?.includes('database') ||
        dbError.message?.includes('Can\'t reach database') ||
        dbError.code === 'P1001' ||
        dbError.code === 'P1017' ||
        dbError.name === 'PrismaClientInitializationError' ||
        dbError.constructor.name === 'PrismaClientInitializationError';

      // Database bağlantı hatası varsa, token'dan user bilgisini kullan (mock mode)
      if (isConnectionError || decoded.id.startsWith('mock-')) {
        console.warn('⚠️ Database connection failed, using token user info for refresh');
        const tokens = generateTokens({
          id: decoded.id,
          email: decoded.email,
          userType: decoded.userType,
        });
        return tokens;
      }

      // Diğer hatalar için orijinal hatayı fırlat
      throw dbError;
    }
  } catch (error: any) {
    // UnauthorizedError'ları olduğu gibi fırlat
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    throw new UnauthorizedError('Invalid refresh token');
  }
};

