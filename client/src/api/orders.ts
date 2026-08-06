import api from './axios';
import { Order } from '../types';

export interface CreateOrderData {
  full_name: string;
  phone_number: string;
  email?: string;
  delivery_address: string;
  delivery_zone: string;
  items: Array<{
    product_id: string;
    quantity: number;
  }>;
  notes?: string;
  payment_method?: string;
  referral_code?: string;
  redeem_points?: number;
}

export const createOrder = async (orderData: CreateOrderData): Promise<Order> => {
  const response = await api.post('/orders', orderData);
  return response.data;
};

export const initiateMpesaPayment = async (orderId: string): Promise<{ checkout_request_id: string; message: string }> => {
  const response = await api.post(`/payments/mpesa/initiate?order_id=${orderId}`);
  return response.data;
};

export const getMpesaPaymentStatus = async (orderId: string): Promise<{ payment_status: string; mpesa_receipt?: string }> => {
  const response = await api.get(`/payments/mpesa/status/${orderId}`);
  return response.data;
};

export const getOrderById = async (id: string): Promise<Order> => {
  const response = await api.get(`/orders/${id}`);
  return response.data;
};

export const cancelOrder = async (id: string): Promise<void> => {
  await api.post(`/orders/${id}/cancel`);
};

export const trackOrdersByPhone = async (phoneNumber: string): Promise<Order[]> => {
  const response = await api.get(`/orders/track/${phoneNumber}`);
  if (response.data && response.data.data && Array.isArray(response.data.data)) {
    return response.data.data;
  }
  return Array.isArray(response.data) ? response.data : [];
};
