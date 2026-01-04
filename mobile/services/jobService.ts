import apiClient from './api';
import { API_ENDPOINTS } from '../constants/api';

export interface JobLocation {
  address: string;
  city: string;
  district: string;
  neighborhood?: string;
  latitude: number;
  longitude: number;
}

export interface CreateJobData {
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  location: JobLocation;
  urgencyLevel?: 'LOW' | 'MEDIUM' | 'HIGH';
  estimatedBudget?: number;
  budgetRange?: {
    min: number;
    max: number;
  };
  preferredTime?: string;
  images?: string[];
}

export interface Job {
  id: string;
  citizenId: string;
  title: string;
  description: string;
  category: string;
  subcategory?: string | null;
  location: JobLocation;
  urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  estimatedBudget?: number | string | null;
  budgetRange?: {
    min: number;
    max: number;
  } | null;
  preferredTime?: string | null;
  status: 'DRAFT' | 'OPEN' | 'BIDDING' | 'IN_PROGRESS' | 'PENDING_CONFIRMATION' | 'COMPLETED' | 'CANCELLED';
  images: string[];
  assignedElectricianId?: string | null;
  acceptedBidId?: string | null;
  cancellationReason?: string | null;
  cancelledAt?: string | null;
  viewCount: number;
  bidCount: number;
  createdAt: string;
  updatedAt: string;
  hasReview?: boolean;
  citizen?: {
    id: string;
    fullName: string;
    profileImageUrl?: string | null;
    phone?: string | null;
  };
}

export const jobService = {
  async createJob(data: CreateJobData) {
    const response = await apiClient.post(API_ENDPOINTS.JOBS, data);
    return response.data.data.job;
  },

  async getJobs(filters?: {
    status?: string;
    category?: string;
    city?: string;
    district?: string;
    districts?: string[];
    lat?: number;
    lng?: number;
    radius?: number;
    page?: number;
    limit?: number;
  }) {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.city) params.append('city', filters.city);
    if (filters?.district) params.append('district', filters.district);
    // Support for multiple districts
    if (filters?.districts && filters.districts.length > 0) {
      params.append('districts', filters.districts.join(','));
    }
    if (filters?.lat) params.append('lat', filters.lat.toString());
    if (filters?.lng) params.append('lng', filters.lng.toString());
    if (filters?.radius) params.append('radius', filters.radius.toString());
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const response = await apiClient.get(`${API_ENDPOINTS.JOBS}?${params.toString()}`);
    return response.data.data;
  },

  async getJobById(id: string) {
    const response = await apiClient.get(API_ENDPOINTS.JOB_DETAIL(id));
    return response.data.data.job;
  },

  async getMyJobs() {
    const response = await apiClient.get(API_ENDPOINTS.MY_JOBS);
    return response.data.data.jobs;
  },

  async updateJob(id: string, data: Partial<CreateJobData>) {
    const response = await apiClient.put(API_ENDPOINTS.JOB_DETAIL(id), data);
    return response.data.data.job;
  },

  async deleteJob(id: string) {
    const response = await apiClient.delete(API_ENDPOINTS.JOB_DETAIL(id));
    return response.data.data;
  },

  async completeJob(id: string, review?: { rating: number, comment: string }) {
    const response = await apiClient.post(`${API_ENDPOINTS.JOB_DETAIL(id)}/complete`, review);
    return response.data.data;
  },

  async createReview(id: string, data: { rating: number, comment?: string }) {
    const response = await apiClient.post(`${API_ENDPOINTS.JOB_DETAIL(id)}/review`, data);
    return response.data.data;
  },

  async cancelJob(id: string, reason?: string) {
    const response = await apiClient.post(`${API_ENDPOINTS.JOB_DETAIL(id)}/cancel`, { reason });
    return response.data.data;
  },
};

