import { Request, Response, NextFunction } from 'express';
import { isDatabaseAvailable } from '../config/database';

interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        userType: string;
    };
}

// Default mock products matching the initial mobile marketplace products
let inMemoryProducts: any[] = [
    {
      id: 'prod-1',
      title: 'Siemens 3x25A Otomat Sigorta (Kutu)',
      price: 320,
      category: 'Şalt / Malzeme',
      sellerName: 'Ahmet Yılmaz (Usta)',
      sellerId: 'mock-electrician-1',
      sellerType: 'ELECTRICIAN',
      location: 'Kadıköy, İstanbul',
      desc: 'Şantiyeden kalan sıfır kutusunda otomatik sigortalar. Toptan fiyatına verilecektir.',
      date: 'Bugün',
      image: null,
      images: []
    },
    {
      id: 'prod-2',
      title: 'Hes Kablo 3x2.5 NYM Kablo 100m Rulo',
      price: 1850,
      category: 'Kablo',
      sellerName: 'Mustafa Kaya (Usta)',
      sellerId: 'mock-electrician-2',
      sellerType: 'ELECTRICIAN',
      location: 'Şişli, İstanbul',
      desc: 'Sıfır ambalajında Hes marka antigron kablo. Projeden arttığı için satılık.',
      date: '2 gün önce',
      image: null,
      images: []
    },
    {
      id: 'prod-3',
      title: 'Siemens 16A Sigorta Kutusu (10 Adet)',
      price: 450,
      category: 'Şalt / Malzeme',
      sellerName: 'Bülent Tan (Usta)',
      sellerId: 'mock-electrician-3',
      sellerType: 'ELECTRICIAN',
      location: 'Beşiktaş, İstanbul',
      desc: 'Şantiyeden kalan sıfır kutusunda otomatik sigortalar. Toptan fiyatına verilecektir.',
      date: 'Dün',
      image: null,
      images: []
    }
];

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
