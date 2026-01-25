import apiClient from './api';

export const userService = {
    /**
     * Fetch electricians with optional filters
     */
    async getElectricians(params?: { city?: string; specialty?: string; query?: string; lat?: number; lng?: number; radius?: number }) {
        try {
            const response = await apiClient.get('/users/electricians', { params });
            return response.data;
        } catch (error) {
            console.error('Error fetching electricians:', error);
            throw error;
        }
    },

    /**
     * Fetch a specific electrician by ID
     */
    async getElectricianById(id: string) {
        try {
            const response = await apiClient.get(`/users/electricians/${encodeURIComponent(id)}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching electrician detail:', error);
            throw error;
        }
    }
};

export default userService;
