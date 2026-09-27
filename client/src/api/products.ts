/**
 * api/products.ts — Product catalog API calls.
 * Normalization delegated to utils/normalizers.ts.
 */
import api from './axios';
import { Product } from '../types';
import { normalizeProduct, unwrapList } from '../utils/normalizers';

export interface ProductFilters {
  search?: string;
  is_flash_sale?: boolean;
  is_discounted?: boolean;
  is_clearance?: boolean;
  is_weekly_deal?: boolean;
  is_featured?: boolean;
  is_new_arrival?: boolean;
  is_best_seller?: boolean;
  is_trending?: boolean;
  limit?: number;
  offset?: number;
}

export interface ProductsResponse {
  products: Product[];
  total: number;
  page: number;
  pages: number;
}

export const getProducts = async (filters: ProductFilters = {}): Promise<ProductsResponse> => {
  const response = await api.get('/products', { params: filters });
  const raw      = unwrapList<any>(response.data);
  const products = raw.map(normalizeProduct);
  const total    = response.data?.count ?? products.length;
  const limit    = filters.limit || 200;
  return {
    products,
    total,
    page:  Math.floor((filters.offset || 0) / limit) + 1,
    pages: Math.ceil(total / limit),
  };
};

export const getProductById = async (id: string): Promise<Product> => {
  const response = await api.get(`/products/${id}`);
  return normalizeProduct(response.data);
};

export const getProductCategories = async (): Promise<string[]> => {
  const response = await api.get('/products/categories');
  return Array.isArray(response.data) ? response.data : [];
};
