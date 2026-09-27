/**
 * api/services.ts — Repair services catalog API calls.
 * Normalization delegated to utils/normalizers.ts.
 */
import api from './axios';
import { RepairService } from '../types';
import { normalizeService, unwrapList } from '../utils/normalizers';

export interface ServiceFilters {
  category?: string;
  search?: string;
  limit?: number;
}

export const getRepairServices = async (filters: ServiceFilters = {}): Promise<RepairService[]> => {
  const response = await api.get('/repair-services', { params: filters });
  return unwrapList<any>(response.data).map(normalizeService);
};

export const getRepairServiceById = async (id: string): Promise<RepairService> => {
  const response = await api.get(`/repair-services/${id}`);
  return normalizeService(response.data);
};

export const getRepairServiceCategories = async (): Promise<string[]> => {
  const response = await api.get('/repair-services/categories');
  return unwrapList<string>(response.data);
};
