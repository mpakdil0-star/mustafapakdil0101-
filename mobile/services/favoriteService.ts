import api from './api';
import * as SecureStore from 'expo-secure-store';
import { MOCK_ELECTRICIANS } from '../data/mockElectricians';

const FAVORITES_STORAGE_KEY = 'elektrikciler_favorites';

export interface FavoriteElectrician {
    id: string;
    electricianId: string;
    createdAt: string;
    electrician: {
        id: string;
        fullName: string;
        profileImageUrl: string | null;
        rating: number;
        reviewCount: number;
        completedJobs: number;
        specialties: string[];
        isAvailable: boolean;
    };
}

// Local storage helpers using SecureStore
const getLocalFavorites = async (): Promise<string[]> => {
    try {
        const stored = await SecureStore.getItemAsync(FAVORITES_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

const setLocalFavorites = async (favorites: string[]): Promise<void> => {
    await SecureStore.setItemAsync(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
};

const getMockElectricianById = (id: string) => {
    // Direct ID match
    let mock = MOCK_ELECTRICIANS.find(e => e.id === id);

    // Fallback for local-mock- prefix
    if (!mock && id.startsWith('local-mock-')) {
        const index = parseInt(id.replace('local-mock-', ''));
        mock = MOCK_ELECTRICIANS[index % MOCK_ELECTRICIANS.length];
    }

    return mock;
};

const transformMockToFavorite = (electricianId: string): FavoriteElectrician | null => {
    const mock = getMockElectricianById(electricianId);
    if (!mock) return null;

    return {
        id: `fav-${electricianId}`,
        electricianId,
        createdAt: new Date().toISOString(),
        electrician: {
            id: electricianId,
            fullName: mock.name,
            profileImageUrl: mock.imageUrl || null,
            rating: mock.rating,
            reviewCount: mock.reviewCount,
            completedJobs: mock.completedJobs,
            specialties: mock.services || [],
            isAvailable: mock.isAvailable ?? true,
        },
    };
};

export const favoriteService = {
    /**
     * Kullanıcının favorilerini getir (API + Local Storage hybrid)
     */
    async getFavorites(): Promise<FavoriteElectrician[]> {
        try {
            const response = await api.get('/favorites');
            const apiFavorites = response.data.data.favorites || [];

            // Also get local favorites for mock electricians
            const localFavoriteIds = await getLocalFavorites();
            const localFavorites = localFavoriteIds
                .map(id => transformMockToFavorite(id))
                .filter((f): f is FavoriteElectrician => f !== null);

            // Merge, avoiding duplicates
            const allFavorites = [...apiFavorites];
            localFavorites.forEach(lf => {
                if (!allFavorites.find(af => af.electricianId === lf.electricianId)) {
                    allFavorites.push(lf);
                }
            });

            return allFavorites;
        } catch (error: any) {
            // If API fails, return only local favorites
            console.log('API favorites failed, using local storage only');
            const localFavoriteIds = await getLocalFavorites();
            return localFavoriteIds
                .map(id => transformMockToFavorite(id))
                .filter((f): f is FavoriteElectrician => f !== null);
        }
    },

    /**
     * Favorilere ekle (API with local fallback for mock IDs)
     */
    async addFavorite(electricianId: string): Promise<{ success: boolean }> {
        // Check if it's a mock electrician
        const isMock = electricianId.startsWith('local-mock-') || getMockElectricianById(electricianId);

        if (isMock) {
            // Store locally for mock electricians
            const current = await getLocalFavorites();
            if (!current.includes(electricianId)) {
                current.push(electricianId);
                await setLocalFavorites(current);
            }
            return { success: true };
        }

        // Try API for real electricians
        try {
            const response = await api.post(`/favorites/${electricianId}`);
            return response.data;
        } catch (error: any) {
            // If API fails (503), store locally as fallback
            if (error.response?.status === 503) {
                const current = await getLocalFavorites();
                if (!current.includes(electricianId)) {
                    current.push(electricianId);
                    await setLocalFavorites(current);
                }
                return { success: true };
            }
            throw error;
        }
    },

    /**
     * Favorilerden çıkar
     */
    async removeFavorite(electricianId: string): Promise<{ success: boolean }> {
        // Always remove from local storage
        const current = await getLocalFavorites();
        const updated = current.filter(id => id !== electricianId);
        await setLocalFavorites(updated);

        // Check if it's a mock electrician
        const isMock = electricianId.startsWith('local-mock-') || getMockElectricianById(electricianId);

        if (isMock) {
            return { success: true };
        }

        // Try API for real electricians
        try {
            const response = await api.delete(`/favorites/${electricianId}`);
            return response.data;
        } catch (error: any) {
            // If API fails, still return success since we removed from local
            if (error.response?.status === 503) {
                return { success: true };
            }
            throw error;
        }
    },

    /**
     * Favori mi kontrol et
     */
    async checkFavorite(electricianId: string): Promise<{ isFavorite: boolean }> {
        // Always check local storage first
        const localFavorites = await getLocalFavorites();
        if (localFavorites.includes(electricianId)) {
            return { isFavorite: true };
        }

        // Check if it's a mock electrician - if so, only use local storage
        const isMock = electricianId.startsWith('local-mock-') || getMockElectricianById(electricianId);
        if (isMock) {
            return { isFavorite: false };
        }

        // Try API for real electricians
        try {
            const response = await api.get(`/favorites/${electricianId}/check`);
            return response.data.data;
        } catch {
            return { isFavorite: false };
        }
    },
};

export default favoriteService;

