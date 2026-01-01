import { Request, Response, NextFunction } from 'express';
import prisma, { isDatabaseAvailable } from '../config/database';

// In-memory store for locations if database is not available
const mockLocationsStore = new Map<string, any[]>();

export const getLocations = async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user?.id;

    try {
        if (!userId) {
            return res.status(200).json({ success: true, data: [] });
        }

        if (!isDatabaseAvailable || userId.startsWith('mock-')) {
            const mockLocs = mockLocationsStore.get(userId) || [];
            return res.status(200).json({ success: true, data: mockLocs });
        }

        // 2. DATABASE QUERY: Veritabanından çekmeyi dene
        try {
            const locations = await prisma.location.findMany({
                where: { userId, isActive: true },
                orderBy: { createdAt: 'desc' }
            });
            return res.status(200).json({ success: true, data: locations });
        } catch (dbError: any) {
            console.error('⚠️ Location DB Error (Falling back to mock):', dbError.message);
            const mockLocs = mockLocationsStore.get(userId) || [];
            return res.status(200).json({ success: true, data: mockLocs });
        }
    } catch (error: any) {
        console.error('🔥 Critical Location Controller Error:', error.message);
        return res.status(200).json({ success: true, data: [] });
    }
};

export const addLocation = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = (req as any).user.id;
        const { title, city, district, neighborhood, details, isDefault } = req.body;

        if (!isDatabaseAvailable || userId.startsWith('mock-')) {
            const newLocation = {
                id: `mock-loc-${Date.now()}`,
                userId,
                city,
                district,
                neighborhood: neighborhood || '',
                address: details,
                isDefault: isDefault || false,
                isActive: true,
                createdAt: new Date().toISOString(),
                latitude: 0,
                longitude: 0
            };

            const userLocations = mockLocationsStore.get(userId) || [];
            if (isDefault) {
                userLocations.forEach(l => l.isDefault = false);
            }
            userLocations.unshift(newLocation);
            mockLocationsStore.set(userId, userLocations);

            return res.status(201).json({
                success: true,
                data: newLocation
            });
        }

        const location = await prisma.location.create({
            data: {
                userId,
                address: details, // Database 'address' field maps to 'details' from UI
                city,
                district,
                neighborhood: neighborhood || '',
                isDefault: isDefault || false,
                latitude: 41.0082, // İstanbul varsayılan
                longitude: 28.9784 // İstanbul varsayılan
            }
        });

        res.status(201).json({
            success: true,
            data: location
        });
    } catch (error) {
        next(error);
    }
};

export const updateLocation = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user.id;
        const { title, city, district, neighborhood, details, isDefault } = req.body;

        if (!isDatabaseAvailable || id.startsWith('mock-') || userId.startsWith('mock-')) {
            const userLocations = mockLocationsStore.get(userId) || [];
            const index = userLocations.findIndex(l => l.id === id);

            if (index !== -1) {
                if (isDefault) {
                    userLocations.forEach(l => l.isDefault = false);
                }

                userLocations[index] = {
                    ...userLocations[index],
                    address: details,
                    city,
                    district,
                    neighborhood: neighborhood || '',
                    isDefault: isDefault || false
                };

                mockLocationsStore.set(userId, userLocations);

                return res.status(200).json({
                    success: true,
                    data: userLocations[index]
                });
            }
        }

        const location = await prisma.location.updateMany({
            where: {
                id,
                userId
            },
            data: {
                address: details,
                city,
                district,
                neighborhood: neighborhood || '',
                isDefault: isDefault || false
            }
        });

        res.status(200).json({
            success: true,
            data: location
        });
    } catch (error) {
        next(error);
    }
};

export const deleteLocation = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const userId = (req as any).user.id;

        if (!isDatabaseAvailable || id.startsWith('mock-') || userId.startsWith('mock-')) {
            const userLocations = mockLocationsStore.get(userId) || [];
            const index = userLocations.findIndex(l => l.id === id);

            if (index !== -1) {
                userLocations.splice(index, 1);
                mockLocationsStore.set(userId, userLocations);
            }

            return res.status(200).json({
                success: true,
                message: 'Konum başarıyla silindi'
            });
        }

        await prisma.location.updateMany({
            where: {
                id,
                userId
            },
            data: {
                isActive: false
            }
        });

        res.status(200).json({
            success: true,
            message: 'Konum başarıyla silindi'
        });
    } catch (error) {
        next(error);
    }
};
