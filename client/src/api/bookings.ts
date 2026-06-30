import api from './axios';
import { Booking } from '../types';

export interface CreateBookingData {
  full_name: string;
  phone_number: string;
  device_type: string;
  device_model?: string;
  issue_description: string;
  fulfillment_type: 'dropoff' | 'pickup';
  pickup_address?: string;
}

export const createBooking = async (bookingData: CreateBookingData): Promise<Booking> => {
  const response = await api.post('/bookings', bookingData);
  return response.data;
};

export const getBookingById = async (id: string): Promise<Booking> => {
  const response = await api.get(`/bookings/${id}`);
  return response.data;
};

export const trackBookingsByPhone = async (phoneNumber: string): Promise<Booking[]> => {
  const response = await api.get(`/bookings/track/${phoneNumber}`);
  // Backend returns {data: [...], count: number}
  if (response.data && response.data.data && Array.isArray(response.data.data)) {
    return response.data.data;
  }
  return Array.isArray(response.data) ? response.data : [];
};
