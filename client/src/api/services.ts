import api from './axios';
import { RepairService } from '../types';

export interface ServiceFilters {
  category?: string;
  search?: string;
  limit?: number;
}

export const getRepairServices = async (filters: ServiceFilters = {}): Promise<RepairService[]> => {
  const response = await api.get('/repair-services', { params: filters });
  // Backend returns {data: [...], count: number}
  if (response.data.data && Array.isArray(response.data.data)) {
    // Normalize backend services to match frontend expectations
    return response.data.data.map((service: any) => ({
      id: service.id,
      name: service.service_name,
      description: service.long_description || service.short_description,
      category: service.service_category,
      price: service.base_price,
      estimated_duration: service.duration,
      warranty_period: service.warranty,
      image: service.image_url,
      created_at: service.created_at
    }));
  }
  return Array.isArray(response.data) ? response.data : [];
};

export const getRepairServiceById = async (id: string): Promise<RepairService> => {
  const response = await api.get(`/repair-services/${id}`);
  const service = response.data;
  
  // Normalize backend response
  return {
    id: service.id,
    name: service.service_name,
    description: service.long_description || service.short_description,
    category: service.service_category,
    price: service.base_price,
    estimated_duration: service.duration,
    warranty_period: service.warranty,
    image: service.image_url,
    created_at: service.created_at
  };
};

export const getRepairServiceCategories = async (): Promise<string[]> => {
  const response = await api.get('/repair-services/categories');
  // Backend returns {data: [...], count: number}
  if (response.data.data && Array.isArray(response.data.data)) {
    return response.data.data;
  }
  return Array.isArray(response.data) ? response.data : [];
};
