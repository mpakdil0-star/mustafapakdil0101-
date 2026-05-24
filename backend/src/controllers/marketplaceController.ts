import { Request, Response, NextFunction } from 'express';
import { isDatabaseAvailable } from '../config/database';

interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        userType: string;
    };
}

let inMemoryProducts: any[] = [];

export const getProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (isDatabaseAvailable) {
            try {
                const marketplaceService = (await import('../services/marketplaceService')).default;
                const products = await marketplaceService.getProducts();
                return res.json({
                    success: true,
                    data: products,
                });
            } catch (dbError: any) {
                console.warn('Database error fetching products, falling back to mock:', dbError.message);
            }
        }

        // MOCK/IN-MEMORY MODE
        return res.json({
            success: true,
            data: inMemoryProducts,
        });

    } catch (error: any) {
        next(error);
    }
};

export const addProduct = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const productData = req.body;

        if (isDatabaseAvailable) {
            try {
                const marketplaceService = (await import('../services/marketplaceService')).default;
                await marketplaceService.addProduct(productData);
                
                // Get all products to return updated list
                const products = await marketplaceService.getProducts();
                
                return res.status(201).json({
                    success: true,
                    data: products,
                    message: 'İlan başarıyla eklendi',
                });
            } catch (dbError: any) {
                console.warn('Database error adding product, falling back to mock:', dbError.message);
            }
        }

        // MOCK/IN-MEMORY MODE
        const newProduct = {
            id: productData.id || `prod-${Date.now()}`,
            title: productData.title,
            price: parseFloat(productData.price),
            category: productData.category || 'Diğer',
            sellerName: productData.sellerName || 'Anonim',
            sellerId: productData.sellerId || 'unknown',
            sellerType: productData.sellerType || 'CITIZEN',
            location: productData.location || 'İstanbul',
            desc: productData.desc,
            date: productData.date || 'Bugün',
            image: productData.image || null,
            images: productData.images || [],
            createdAt: new Date().toISOString()
        };

        inMemoryProducts = [newProduct, ...inMemoryProducts];

        return res.status(201).json({
            success: true,
            data: inMemoryProducts,
            message: 'İlan başarıyla eklendi (Mock)',
        });

    } catch (error: any) {
        next(error);
    }
};

export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        if (isDatabaseAvailable) {
            try {
                const marketplaceService = (await import('../services/marketplaceService')).default;
                await marketplaceService.deleteProduct(id);
                return res.json({
                    success: true,
                    message: 'İlan başarıyla silindi',
                });
            } catch (dbError: any) {
                console.warn('Database error deleting product, falling back to mock:', dbError.message);
            }
        }

        // MOCK/IN-MEMORY MODE
        inMemoryProducts = inMemoryProducts.filter(p => p.id !== id);
        return res.json({
            success: true,
            data: inMemoryProducts,
            message: 'İlan başarıyla silindi (Mock)',
        });

    } catch (error: any) {
        next(error);
    }
};

export const markAsSold = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        if (isDatabaseAvailable) {
            try {
                const marketplaceService = (await import('../services/marketplaceService')).default;
                const updated = await marketplaceService.markAsSold(id);
                return res.json({
                    success: true,
                    data: updated,
                    message: 'İlan satıldı olarak işaretlendi',
                });
            } catch (dbError: any) {
                console.warn('Database error updating product, falling back to mock:', dbError.message);
            }
        }

        // MOCK/IN-MEMORY MODE
        inMemoryProducts = inMemoryProducts.map(p => {
            if (p.id === id) {
                return { ...p, isSold: true };
            }
            return p;
        });
        return res.json({
            success: true,
            data: inMemoryProducts,
            message: 'İlan satıldı olarak işaretlendi (Mock)',
        });

    } catch (error: any) {
        next(error);
    }
};
