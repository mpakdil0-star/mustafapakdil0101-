import { Request, Response, NextFunction } from 'express';
import prisma, { isDatabaseAvailable } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { mockBlockStorage } from '../utils/mockStorage';

/**
 * Toggle block status for a user
 */
export const toggleBlockUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const blockerId = req.user?.id;
        const { blockedId } = req.body;

        if (!blockerId) {
            return res.status(401).json({ success: false, message: 'Giriş yapmanız gerekiyor' });
        }

        if (blockerId === blockedId) {
            return res.status(400).json({ success: false, message: 'Kendinizi engelleyemezsiniz' });
        }

        if (isDatabaseAvailable) {
            try {
                // Check if already blocked
                const existingBlock = await prisma.block.findUnique({
                    where: {
                        blockerId_blockedId: {
                            blockerId,
                            blockedId
                        }
                    }
                });

                if (existingBlock) {
                    // Unblock
                    await prisma.block.delete({
                        where: { id: existingBlock.id }
                    });
                    return res.json({
                        success: true,
                        message: 'Kullanıcı engeli kaldırıldı',
                        isBlocked: false
                    });
                } else {
                    // Block
                    await prisma.block.create({
                        data: {
                            blockerId,
                            blockedId
                        }
                    });
                    return res.json({
                        success: true,
                        message: 'Kullanıcı engellendi',
                        isBlocked: true
                    });
                }
            } catch (error: any) {
                console.warn('⚠️ [BLOCKS] Prisma toggleBlockUser failed, falling back to mock:', error.message);
            }
        }

        // Mock Fallback
        const result = mockBlockStorage.toggle(blockerId, blockedId);
        return res.json({
            success: true,
            message: result.isBlocked ? 'Kullanıcı engellendi' : 'Kullanıcı engeli kaldırıldı',
            isBlocked: result.isBlocked
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get list of blocked users
 */
export const getBlockedUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Giriş yapmanız gerekiyor' });
        }

        if (isDatabaseAvailable) {
            try {
                const blockedUsers = await prisma.block.findMany({
                    where: { blockerId: userId },
                    include: {
                        blocked: {
                            select: {
                                id: true,
                                fullName: true,
                                profileImageUrl: true,
                                userType: true
                            }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                });

                return res.json({
                    success: true,
                    data: blockedUsers.map((b: any) => b.blocked)
                });
            } catch (error: any) {
                console.warn('⚠️ [BLOCKS] Prisma getBlockedUsers failed, falling back to mock:', error.message);
            }
        }

        // Mock Fallback
        const blockedUsers = mockBlockStorage.getByBlocker(userId);
        return res.json({
            success: true,
            data: blockedUsers
        });
    } catch (error) {
        next(error);
    }
};
