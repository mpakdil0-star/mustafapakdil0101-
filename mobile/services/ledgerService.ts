import apiClient from './api';
import { API_ENDPOINTS } from '../constants/api';

export interface LedgerEntry {
  id: string;
  userId: string;
  personName: string;
  amount: number;
  type: 'receivable' | 'payable';
  status: 'pending' | 'paid';
  note?: string;
  dueDate?: string;
  paidAt?: string;
  calendarEventId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LedgerSummary {
  pendingReceivables: number;
  pendingPayables: number;
  totalReceived: number;
  totalPaid: number;
  netBalance: number;
}

export const ledgerService = {
  async getEntries(type?: string, status?: string): Promise<LedgerEntry[]> {
    try {
      const params: any = {};
      if (type) params.type = type;
      if (status) params.status = status;
      const response = await apiClient.get(API_ENDPOINTS.LEDGER, { params });
      return response.data.data || [];
    } catch (error) {
      console.error('Ledger getEntries error:', error);
      return [];
    }
  },

  async getSummary(): Promise<LedgerSummary> {
    try {
      const response = await apiClient.get(API_ENDPOINTS.LEDGER_SUMMARY);
      return response.data.data;
    } catch (error) {
      console.error('Ledger getSummary error:', error);
      return {
        pendingReceivables: 0,
        pendingPayables: 0,
        totalReceived: 0,
        totalPaid: 0,
        netBalance: 0,
      };
    }
  },

  async createEntry(data: {
    personName: string;
    amount: number;
    type: 'receivable' | 'payable';
    note?: string;
    dueDate?: string;
  }): Promise<LedgerEntry | null> {
    try {
      const response = await apiClient.post(API_ENDPOINTS.LEDGER, data);
      return response.data.data;
    } catch (error) {
      console.error('Ledger createEntry error:', error);
      throw error;
    }
  },

  async updateEntry(id: string, data: Partial<LedgerEntry>): Promise<LedgerEntry | null> {
    try {
      const response = await apiClient.put(API_ENDPOINTS.LEDGER_DETAIL(id), data);
      return response.data.data;
    } catch (error) {
      console.error('Ledger updateEntry error:', error);
      throw error;
    }
  },

  async togglePaid(id: string): Promise<LedgerEntry | null> {
    try {
      const response = await apiClient.put(API_ENDPOINTS.LEDGER_PAID(id));
      return response.data.data;
    } catch (error) {
      console.error('Ledger togglePaid error:', error);
      throw error;
    }
  },

  async deleteEntry(id: string): Promise<boolean> {
    try {
      await apiClient.delete(API_ENDPOINTS.LEDGER_DETAIL(id));
      return true;
    } catch (error) {
      console.error('Ledger deleteEntry error:', error);
      throw error;
    }
  },
};
