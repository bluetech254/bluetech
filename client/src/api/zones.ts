import api from './axios';
import { DeliveryZone } from '../types';

export const getDeliveryZones = async (): Promise<DeliveryZone[]> => {
  const response = await api.get('/delivery-zones');
  // Backend may return {data: [...], count: number} format
  if (response.data && response.data.data && Array.isArray(response.data.data)) {
    return response.data.data;
  }
  return Array.isArray(response.data) ? response.data : [];
};
