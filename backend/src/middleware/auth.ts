import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import prisma, { isDatabaseAvailable } from '../config/database';
import { validateSupabaseAccessToken, SupabaseAuthUser } from '../services/supabaseAuth';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    userType: string;
    isImpersonated?: boolean;
  };
}

const toAuthUser = (user: SupabaseAuthUser) => ({
  id: user.id,
  email: user.email,
  userType: user.userType,
  isImpersonated: user.isImpersonated,
});

const enrichUserFromDatabase = async (decoded: SupabaseAuthUser) => {
  if (!isDatabaseAvailable || decoded.id.startsWith('mock-')) {
    return {
      id: decoded.id,
      email: decoded.email,
      userType: decoded.userType,
      isImpersonated: decoded.isImpersonated,
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    select: {
      id: true,
      email: true,
      userType: true,
      isActive: true,
      isBanned: true,
      banUntil: true,
    },
  });

  if (!user) {
    console.warn(`auth.ts: User ${decoded.id} not found in Prisma, falling back to Supabase token info`);
    return toAuthUser(decoded);
  }

  if (!user.isActive) {
    throw new UnauthorizedError('User account is inactive');
  }

  if (user.isBanned) {
    if (user.banUntil && user.banUntil > new Date()) {
      throw new ForbiddenError('User is banned');
    }

    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { isBanned: false, banUntil: null, banReason: null },
      });
    } catch (updateError) {
      console.warn('Failed to update user ban status:', updateError);
    }
  }

  prisma.user.update({
    where: { id: user.id },
    data: { lastSeenAt: new Date() },
  }).catch(err => console.error('Failed to update lastSeenAt:', err));

  return {
    id: user.id,
    email: user.email,
    userType: user.userType,
    isImpersonated: decoded.isImpersonated,
  };
};

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.substring(7);
    const decoded = await validateSupabaseAccessToken(token);
    req.user = await enrichUserFromDatabase(decoded);
    return next();
  } catch (error: any) {
    if (error?.message?.includes('Invalid or expired Supabase session')) {
      return next(new UnauthorizedError('Invalid or expired session'));
    }
    next(error);
  }
};

export const optionalAuthenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);

    try {
      const decoded = await validateSupabaseAccessToken(token);

      if (!isDatabaseAvailable || decoded.id.startsWith('mock-')) {
        req.user = toAuthUser(decoded);
        return next();
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
            banUntil: true,
          },
        });

        if (user && user.isActive && (!user.isBanned || (user.banUntil && user.banUntil < new Date()))) {
          req.user = {
            id: user.id,
            email: user.email,
            userType: user.userType,
            isImpersonated: decoded.isImpersonated,
          };
        }
      } catch {
        // Optional auth: ignore database errors
      }
    } catch {
      // Optional auth: ignore invalid token
    }

    next();
  } catch {
    next();
  }
};

export const authorize = (...allowedTypes: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!allowedTypes.includes(req.user.userType)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }

    next();
  };
};

