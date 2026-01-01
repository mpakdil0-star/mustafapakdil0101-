import { Request, Response, NextFunction } from 'express';

interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        userType: string;
    };
}

// Get user's favorites
export const getFavorites = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: { message: 'Unauthorized' },
            });
        }

        try {
            const favoriteService = (await import('../services/favoriteService')).default;
            const favorites = await favoriteService.getFavorites(req.user.id);
            res.json({
                success: true,
                data: { favorites },
            });
        } catch (dbError: any) {
            // Database bağlantısı yoksa boş liste döndür
            console.warn('Database error, returning empty favorites:', dbError.message);
            res.json({
                success: true,
                data: { favorites: [] },
            });
        }
    } catch (error: any) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({
                success: false,
                error: { message: error.message },
            });
        }
        next(error);
    }
};

// Add to favorites
export const addFavorite = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: { message: 'Unauthorized' },
            });
        }

        const { electricianId } = req.params;

        try {
            const favoriteService = (await import('../services/favoriteService')).default;
            const favorite = await favoriteService.addFavorite(req.user.id, electricianId);

            res.status(201).json({
                success: true,
                data: { favorite },
                message: 'Favorilere eklendi',
            });
        } catch (dbError: any) {
            console.warn('Database error:', dbError.message);
            res.status(503).json({
                success: false,
                error: { message: 'Veritabanı bağlantısı yok. Lütfen daha sonra tekrar deneyin.' },
            });
        }
    } catch (error: any) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({
                success: false,
                error: { message: error.message },
            });
        }
        next(error);
    }
};

// Remove from favorites
export const removeFavorite = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: { message: 'Unauthorized' },
            });
        }

        const { electricianId } = req.params;

        try {
            const favoriteService = (await import('../services/favoriteService')).default;
            await favoriteService.removeFavorite(req.user.id, electricianId);

            res.json({
                success: true,
                message: 'Favorilerden çıkarıldı',
            });
        } catch (dbError: any) {
            console.warn('Database error:', dbError.message);
            res.status(503).json({
                success: false,
                error: { message: 'Veritabanı bağlantısı yok.' },
            });
        }
    } catch (error: any) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({
                success: false,
                error: { message: error.message },
            });
        }
        next(error);
    }
};

// Check if electrician is in favorites
export const checkFavorite = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: { message: 'Unauthorized' },
            });
        }

        const { electricianId } = req.params;

        try {
            const favoriteService = (await import('../services/favoriteService')).default;
            const result = await favoriteService.checkFavorite(req.user.id, electricianId);

            res.json({
                success: true,
                data: result,
            });
        } catch (dbError: any) {
            // Database yoksa favoride değil olarak döndür
            res.json({
                success: true,
                data: { isFavorite: false },
            });
        }
    } catch (error: any) {
        next(error);
    }
};
