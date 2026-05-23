import prisma from '../config/database';
import { AppError } from '../utils/errors';

export const marketplaceService = {
    /**
     * Get all marketplace products from database
     */
    async getProducts() {
        const products = await prisma.marketplaceProduct.findMany({
            orderBy: { createdAt: 'desc' },
        });
        return products;
    },

    /**
     * Add a new product to the database
     */
    async addProduct(productData: any) {
        if (!productData.title || !productData.price || !productData.desc) {
            throw new AppError('Eksik ürün bilgileri', 400);
        }

        const product = await prisma.marketplaceProduct.create({
            data: {
                id: productData.id || undefined, // use client id if provided, otherwise db autogenerates
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
            },
        });

        return product;
    },
};

export default marketplaceService;
