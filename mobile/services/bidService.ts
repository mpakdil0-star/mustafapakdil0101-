import apiClient from './api';
import { API_ENDPOINTS } from '../constants/api';

export interface CreateBidData {
  jobPostId: string;
  amount: number;
  estimatedDuration: number; // in hours
  estimatedStartDate?: string;
  message: string;
}

export interface Bid {
  id: string;
  jobPostId: string;
  electricianId: string;
  amount: number | string;
  estimatedDuration: number;
  estimatedStartDate?: string | null;
  message: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN' | 'EXPIRED';
  createdAt: string;
  updatedAt: string;
  electrician?: {
    id: string;
    fullName: string;
    profileImageUrl?: string | null;
  };
  jobPost?: {
    id: string;
    title: string;
    description: string;
    status: string;
    location?: {
      city: string;
      district: string;
      neighborhood?: string;
      address?: string;
    };
    citizen?: {
      id: string;
      fullName: string;
      profileImageUrl?: string | null;
    };
  };
}

export const bidService = {
  async createBid(data: CreateBidData) {
    const response = await apiClient.post(API_ENDPOINTS.BIDS, data);
    return response.data.data.bid;
  },

  async getBidById(id: string) {
    const response = await apiClient.get(`${API_ENDPOINTS.BIDS}/${id}`);
    return response.data.data.bid;
  },

  async getJobBids(jobId: string) {
    const response = await apiClient.get(API_ENDPOINTS.JOB_BIDS(jobId));
    return response.data.data.bids;
  },

  async getMyBids() {
    const response = await apiClient.get(API_ENDPOINTS.MY_BIDS);
    return response.data.data.bids;
  },

  async updateBid(id: string, data: Partial<CreateBidData>) {
    const response = await apiClient.put(`${API_ENDPOINTS.BIDS}/${id}`, data);
    return response.data.data.bid;
  },

  async acceptBid(id: string) {
    const response = await apiClient.post(`${API_ENDPOINTS.BIDS}/${id}/accept`);
    return response.data.data.bid;
  },

  async rejectBid(id: string) {
    const response = await apiClient.post(`${API_ENDPOINTS.BIDS}/${id}/reject`);
    return response.data.data.bid;
  },

  async withdrawBid(id: string) {
    const response = await apiClient.post(`${API_ENDPOINTS.BIDS}/${id}/withdraw`);
    return response.data.data.bid;
  },

  async deleteBid(id: string) {
    const response = await apiClient.delete(`${API_ENDPOINTS.BIDS}/${id}`);
    return response.data.data;
  },
};

