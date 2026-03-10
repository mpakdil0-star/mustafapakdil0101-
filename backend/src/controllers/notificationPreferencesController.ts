import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        userType: string;
    };
}

// Default preferences
const defaultPreferences = {
    pushEnabled: true,
    emailEnabled: true,
    promoEnabled: false,
    securityEnabled: true,
};

/**
 * GET /users/notification-preferences
 * Kullanıcının bildirim tercihlerini getir
 */
export const getNotificationPreferences = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: { message: 'Unauthorized' },
            });
        }

        const userId = req.user.id;
        let preferences: any = { ...defaultPreferences };
        let hasPushToken = false;

        try {
            const dbUser = await prisma.user.findUnique({
                where: { id: userId },
                select: { notificationSettings: true, pushToken: true }
            });

            if (dbUser?.notificationSettings && typeof dbUser.notificationSettings === 'object') {
                preferences = { ...defaultPreferences, ...(dbUser.notificationSettings as any) };
            }
            hasPushToken = !!dbUser?.pushToken;
        } catch (dbError) {
            // Fallback to mockStorage if DB fails
            const { mockStorage } = require('../utils/mockStorage');
            const mockUser = mockStorage.get(userId);
            if (mockUser?.notificationSettings) {
                preferences = { ...defaultPreferences, ...mockUser.notificationSettings };
            }
            hasPushToken = !!mockUser?.pushToken;
        }

        res.json({
            success: true,
            data: {
                ...preferences,
                hasPushToken
            },
        });
    } catch (error: any) {
        console.error('Error getting notification preferences:', error);
        res.json({
            success: true,
            data: { ...defaultPreferences, hasPushToken: false },
        });
    }
};

/**
 * PUT /users/notification-preferences
 * Kullanıcının bildirim tercihlerini güncelle
 */
export const updateNotificationPreferences = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: { message: 'Unauthorized' },
            });
        }

        const userId = req.user.id;
        const { pushEnabled, emailEnabled, promoEnabled, securityEnabled } = req.body;

        const updatedPreferences = {
            pushEnabled: pushEnabled ?? true,
            emailEnabled: emailEnabled ?? true,
            promoEnabled: promoEnabled ?? false,
            securityEnabled: securityEnabled ?? true,
        };

        try {
            await prisma.user.update({
                where: { id: userId },
                data: {
                    notificationSettings: updatedPreferences as any
                }
            });
        } catch (dbError) {
            const { mockStorage } = require('../utils/mockStorage');
            mockStorage.updateProfile(userId, { notificationSettings: updatedPreferences } as any);
        }

        res.json({
            success: true,
            data: updatedPreferences,
            message: 'Bildirim tercihleri güncellendi',
        });
    } catch (error: any) {
        console.error('Error updating notification preferences:', error);
        res.status(500).json({
            success: false,
            error: { message: 'Tercihler güncellenemedi' },
        });
    }
};

