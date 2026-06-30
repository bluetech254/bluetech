import api from './axios';
import { Product } from '../types';

export interface ProductFilters {
  category?: string;
  search?: string;
  min_price?: number;
  max_price?: number;
  featured?: boolean;
  sort_by?: 'price' | 'name' | 'created_at';
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface ProductsResponse {
  products: Product[];
  total: number;
  page: number;
  pages: number;
}

export const getProducts = async (filters: ProductFilters = {}): Promise<ProductsResponse> => {
  const response = await api.get('/products', { params: filters });
  
  // Backend returns {data: [...], count: number}
  if (response.data.data && Array.isArray(response.data.data)) {
    // Normalize backend products to match frontend expectations
    const products = response.data.data.map((product: any) => ({
      ...product,
      name: product.title || product.name,  // Backend uses 'title'
      images: product.image_url ? [product.image_url] : []  // Convert image_url to images array
    }));
    
    return {
      products,
      total: response.data.count || products.length,
      page: filters.page || 1,
      pages: Math.ceil((response.data.count || products.length) / (filters.limit || 12))
    };
  }
  
  // If the backend returns products array directly, normalize it
  if (Array.isArray(response.data)) {
    const products = response.data.map((product: any) => ({
      ...product,
      name: product.title || product.name,
      images: product.image_url ? [product.image_url] : []
    }));
    
    return {
      products,
      total: products.length,
      page: 1,
      pages: 1
    };
  }
  
  return response.data;
};

export const getProductById = async (id: string): Promise<Product> => {
  const response = await api.get(`/products/${id}`);
  const product = response.data;
  
  // Normalize backend response
  return {
    ...product,
    name: product.title || product.name,
    images: product.image_url ? [product.image_url] : []
  };
};

export const getProductCategories = async (): Promise<string[]> => {
  const response = await api.get('/products/categories');
  return response.data;
};
