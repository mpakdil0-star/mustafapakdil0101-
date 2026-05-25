import { Request, Response, NextFunction } from 'express';
import { isDatabaseAvailable } from '../config/database';
import fs from 'fs';
import path from 'path';

// Helper to save a base64 image to local uploads disk and return its static URL
const saveBase64Image = (base64Str: string, req: any): string => {
  if (!base64Str || !base64Str.startsWith('data:image')) {
    return base64Str; // Return as-is if already a URL
  }

  try {
    // Extract base64 content
    const matches = base64Str.match(/^data:image\/([A-Za-z+-]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return base64Str;
    }

    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const data = matches[2];
    const buffer = Buffer.from(data, 'base64');

    // Create marketplace upload directory if not exists
    const uploadDir = path.join(process.cwd(), 'uploads', 'marketplace');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = `marketplace-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const filePath = path.join(uploadDir, fileName);

    // Save file
    fs.writeFileSync(filePath, buffer);

    // Build absolute URL using host headers dynamically
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return `${baseUrl}/uploads/marketplace/${fileName}`;
  } catch (error) {
    console.error('Failed to save base64 image to disk:', error);
    return base64Str;
  }
};

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

        // Convert base64 images to file-based URLs
        if (productData.image) {
            productData.image = saveBase64Image(productData.image, req);
        }
        if (Array.isArray(productData.images)) {
            productData.images = productData.images.map((img: string) => saveBase64Image(img, req));
        }

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
