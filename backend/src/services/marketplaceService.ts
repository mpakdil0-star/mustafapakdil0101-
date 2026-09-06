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
                isSold: false,
            },
        });

        return product;
    },

    /**
     * Delete a product from the database with ownership check
     */
    async deleteProduct(id: string, requesterUserId?: string, isAdmin?: boolean) {
        const product = await prisma.marketplaceProduct.findUnique({
            where: { id },
        });
        if (!product) {
            throw new AppError('Ürün bulunamadı', 404);
        }
        if (requesterUserId && !isAdmin && product.sellerId !== requesterUserId) {
            throw new AppError('Bu ilanı silme yetkiniz bulunmamaktadır', 403);
        }
        await prisma.marketplaceProduct.delete({
            where: { id },
        });
    },

    /**
     * Mark a product as sold in the database
     */
    async markAsSold(id: string) {
        const product = await prisma.marketplaceProduct.update({
            where: { id },
            data: { isSold: true },
        });
        return product;
    },
};

export default marketplaceService;
