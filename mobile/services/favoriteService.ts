import api from './api';

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

export const favoriteService = {
    /**
     * Kullanıcının favorilerini getir
     */
    async getFavorites(): Promise<FavoriteElectrician[]> {
        const response = await api.get('/favorites');
        return response.data.data.favorites;
    },

    /**
     * Favorilere ekle
     */
    async addFavorite(electricianId: string): Promise<{ success: boolean }> {
        const response = await api.post(`/favorites/${electricianId}`);
        return response.data;
    },

    /**
     * Favorilerden çıkar
     */
    async removeFavorite(electricianId: string): Promise<{ success: boolean }> {
        const response = await api.delete(`/favorites/${electricianId}`);
        return response.data;
    },

    /**
     * Favori mi kontrol et
     */
    async checkFavorite(electricianId: string): Promise<{ isFavorite: boolean }> {
        const response = await api.get(`/favorites/${electricianId}/check`);
        return response.data.data;
    },
};

export default favoriteService;
