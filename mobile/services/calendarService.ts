import apiClient from './api';
import { API_ENDPOINTS } from '../constants/api';

export interface CalendarEvent {
  id: string;
  userId: string;
  title: string;
  note?: string;
  eventDate: string;
  eventTime?: string;
  hasReminder: boolean;
  reminderAt?: string;
  amount?: number;
  isPaid: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export const calendarService = {
  async getEvents(month?: number, year?: number): Promise<CalendarEvent[]> {
    try {
      const params: any = {};
      if (month) params.month = month;
      if (year) params.year = year;
      const response = await apiClient.get(API_ENDPOINTS.CALENDAR, { params });
      return response.data.data || [];
    } catch (error) {
      console.error('Calendar getEvents error:', error);
      return [];
    }
  },

  async createEvent(data: {
    title: string;
    note?: string;
    eventDate: string;
    eventTime?: string;
    hasReminder?: boolean;
    reminderAt?: string;
    amount?: number;
    addToLedger?: boolean;
  }): Promise<CalendarEvent | null> {
    try {
      const response = await apiClient.post(API_ENDPOINTS.CALENDAR, data);
      return response.data.data;
    } catch (error) {
      console.error('Calendar createEvent error:', error);
      throw error;
    }
  },

  async updateEvent(id: string, data: Partial<CalendarEvent>): Promise<CalendarEvent | null> {
    try {
      const response = await apiClient.put(API_ENDPOINTS.CALENDAR_DETAIL(id), data);
      return response.data.data;
    } catch (error) {
      console.error('Calendar updateEvent error:', error);
      throw error;
    }
  },

  async completeEvent(id: string, addToLedger?: boolean): Promise<CalendarEvent | null> {
    try {
      const response = await apiClient.put(API_ENDPOINTS.CALENDAR_COMPLETE(id), { addToLedger });
      return response.data.data;
    } catch (error) {
      console.error('Calendar completeEvent error:', error);
      throw error;
    }
  },

  async deleteEvent(id: string): Promise<boolean> {
    try {
      await apiClient.delete(API_ENDPOINTS.CALENDAR_DETAIL(id));
      return true;
    } catch (error) {
      console.error('Calendar deleteEvent error:', error);
      throw error;
    }
  },
};
