import prisma from '../config/database';
import bcrypt from 'bcryptjs';
import { AppError } from '../utils/errors';

export const userService = {
    /**
     * Kullanıcının şifresini değiştirir
     * @param userId - Kullanıcı ID
     * @param currentPassword - Mevcut şifre
     * @param newPassword - Yeni şifre
     */
    async changePassword(
        userId: string,
        currentPassword: string,
        newPassword: string
    ): Promise<void> {
        // Kullanıcıyı bul
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, passwordHash: true },
        });

        if (!user) {
            throw new AppError('Kullanıcı bulunamadı', 404);
        }

        // Mevcut şifreyi doğrula
        const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isPasswordValid) {
            throw new AppError('Mevcut şifre yanlış', 400);
        }

        // Yeni şifre hash'le
        const newPasswordHash = await bcrypt.hash(newPassword, 10);

        // Şifreyi güncelle
        await prisma.user.update({
            where: { id: userId },
            data: {
                passwordHash: newPasswordHash,
                updatedAt: new Date(),
            },
        });
    },

    /**
     * Kullanıcı profilini günceller
     * @param userId - Kullanıcı ID
     * @param data - Güncellenecek alanlar
     */
    async updateProfile(
        userId: string,
        data: {
            fullName?: string;
            phone?: string;
            email?: string;
            specialties?: string[];
        }
    ) {
        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                ...data,
                updatedAt: new Date(),
            },
            select: {
                id: true,
                email: true,
                fullName: true,
                phone: true,
                userType: true,
                profileImageUrl: true,
                isVerified: true,
            },
        });

        return user;
    },

    /**
     * Bildirim ayarlarını günceller
     * @param userId - Kullanıcı ID
     * @param settings - Bildirim ayarları
     */
    async updateNotificationSettings(
        userId: string,
        settings: {
            push?: boolean;
            email?: boolean;
            sms?: boolean;
            promo?: boolean;
        }
    ) {
        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                notificationSettings: settings,
                updatedAt: new Date(),
            },
            select: {
                id: true,
                notificationSettings: true,
            },
        });

        return user;
    },
};

export default userService;
