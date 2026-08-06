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
  if (response.data && response.data.data && Array.isArray(response.data.data)) {
    return response.data.data;
  }
  return Array.isArray(response.data) ? response.data : [];
};

export const initiateCommitmentPayment = async (bookingId: string, servicePrice: number): Promise<{ checkout_request_id: string; amount: number }> => {
  const response = await api.post(`/payments/mpesa/booking/${bookingId}/commitment?service_price=${servicePrice}`);
  return response.data;
};

export const getCommitmentPaymentStatus = async (bookingId: string): Promise<{ commitment_payment_status: string; commitment_receipt?: string; commitment_fee?: number }> => {
  const response = await api.get(`/payments/mpesa/booking/${bookingId}/commitment/status`);
  return response.data;
};
