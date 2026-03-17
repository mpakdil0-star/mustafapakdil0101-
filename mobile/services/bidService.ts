import apiClient from './api';
import { API_ENDPOINTS } from '../constants/api';

export interface CreateBidData {
  jobPostId: string;
  amount: number;
  estimatedDuration: number; // in hours
  estimatedStartDate?: string;
  message: string;
  costItems?: any[];
}

export interface Bid {
  id: string;
  jobPostId: string;
  electricianId: string;
  amount: number | string;
  estimatedDuration: number;
  estimatedStartDate?: string | null;
  message: string;
  costItems?: any;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN' | 'EXPIRED';
  createdAt: string;
  updatedAt: string;
  electrician?: {
    id: string;
    fullName: string;
    profileImageUrl?: string | null;
    electricianProfile?: {
      verificationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
      licenseVerified?: boolean;
      licenseNumber?: string;
    };
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
    console.log('📤 Creating bid...');
    console.log('   Endpoint:', API_ENDPOINTS.BIDS);
    console.log('   Data:', JSON.stringify(data, null, 2));
    try {
      const response = await apiClient.post(API_ENDPOINTS.BIDS, data);
      console.log('✅ Bid created successfully:', response.data);
      return response.data.data.bid;
    } catch (error: any) {
      // Sadece geliştirme ortamında ve kritik hatalarda log basalım
      // Kullanıcı hataları (400 Bad Request gibi) zaten frontend'de handle ediliyor.
      /*
      console.error('❌ Bid creation failed!');
      console.error('   Status:', error.response?.status);
      console.error('   URL:', error.config?.url);
      console.error('   Base URL:', error.config?.baseURL);
      console.error('   Full URL:', `${error.config?.baseURL}${error.config?.url}`);
      console.error('   Error:', error.response?.data || error.message);
      */
      throw error;
    }
  },

  async getBidById(id: string) {
    const response = await apiClient.get(API_ENDPOINTS.BID_DETAIL(id));
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
    const response = await apiClient.put(API_ENDPOINTS.BID_DETAIL(id), data);
    return response.data.data.bid;
  },

  async acceptBid(id: string) {
    console.log(`📤 Accepting bid: ${id}...`);
    try {
      const response = await apiClient.post(API_ENDPOINTS.ACCEPT_BID(id));
      console.log('✅ Bid accepted successfully:', response.data);
      return response.data.data.bid;
    } catch (error: any) {
      console.error('❌ Bid acceptance failed!');
      console.error('   Error Message:', error.message);
      if (error.response) {
        console.error('   Response Status:', error.response.status);
        console.error('   Response Data:', JSON.stringify(error.response.data));
      } else if (error.request) {
        console.error('   Request made but no response received');
      }
      throw error;
    }
  },

  async rejectBid(id: string) {
    const response = await apiClient.post(API_ENDPOINTS.REJECT_BID(id));
    return response.data.data.bid;
  },

  async withdrawBid(id: string) {
    const response = await apiClient.post(API_ENDPOINTS.WITHDRAW_BID(id));
    return response.data.data.bid;
  },

  async deleteBid(id: string) {
    const response = await apiClient.delete(API_ENDPOINTS.BID_DETAIL(id));
    return response.data.data;
  },
};

