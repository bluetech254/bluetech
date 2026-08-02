import api from './axios';
import { Product } from '../types';

export interface ProductFilters {
  category?: string;
  search?: string;
  min_price?: number;
  max_price?: number;
  condition?: string;
  brand?: string;
  in_stock?: boolean;
  min_rating?: number;
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

  const normalize = (product: any) => {
    let specs: any = {};
    try { specs = typeof product.specifications === 'string' ? JSON.parse(product.specifications) : (product.specifications || {}); } catch {}
    return {
      ...product,
      name: product.title || product.name,
      images: product.image_url ? [product.image_url] : [],
      category: product.category || specs.category || '',
      brand: product.brand || specs.brand || '',
      specifications: specs,
    };
  };

  if (response.data.data && Array.isArray(response.data.data)) {
    const products = response.data.data.map(normalize);
    return {
      products,
      total: response.data.count || products.length,
      page: filters.page || 1,
      pages: Math.ceil((response.data.count || products.length) / (filters.limit || 12))
    };
  }

  if (Array.isArray(response.data)) {
    const products = response.data.map(normalize);
    return { products, total: products.length, page: 1, pages: 1 };
  }

  return response.data;
};

export const getProductById = async (id: string): Promise<Product> => {
  const response = await api.get(`/products/${id}`);
  const product = response.data;
  let specs: any = {};
  try { specs = typeof product.specifications === 'string' ? JSON.parse(product.specifications) : (product.specifications || {}); } catch {}
  return {
    ...product,
    name: product.title || product.name,
    images: product.image_url ? [product.image_url] : [],
    category: product.category || specs.category || '',
    brand: product.brand || specs.brand || '',
    specifications: specs,
  };
};

export const getProductCategories = async (): Promise<string[]> => {
  const response = await api.get('/products/categories');
  return response.data;
};
