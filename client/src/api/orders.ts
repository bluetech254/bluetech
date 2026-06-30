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
}

export const createOrder = async (orderData: CreateOrderData): Promise<Order> => {
  const response = await api.post('/orders', orderData);
  return response.data;
};

export const getOrderById = async (id: string): Promise<Order> => {
  const response = await api.get(`/orders/${id}`);
  return response.data;
};

export const trackOrdersByPhone = async (phoneNumber: string): Promise<Order[]> => {
  const response = await api.get(`/orders/track/${phoneNumber}`);
  // Backend returns {data: [...], count: number}
  if (response.data && response.data.data && Array.isArray(response.data.data)) {
    return response.data.data;
  }
  return Array.isArray(response.data) ? response.data : [];
};
