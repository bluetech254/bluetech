import { useState, useEffect, useCallback } from 'react';
import { Product } from '../types';
import { getProducts, ProductFilters } from '../api/products';

export function useProducts(initialFilters: ProductFilters = {}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [filters, setFilters] = useState<ProductFilters>(initialFilters);

  const fetchProducts = useCallback(async (currentFilters: ProductFilters) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getProducts(currentFilters);
      setProducts(data.products || []);
      setTotal(data.total || 0);
      setPage(data.page || 1);
      setPages(data.pages || 1);
    } catch (err: any) {
      console.error('Error fetching products:', err);
      setError(err.response?.data?.message || 'Failed to fetch products. Check backend connectivity.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts(filters);
  }, [filters, fetchProducts]);

  const updateFilters = useCallback((newFilters: Partial<ProductFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const resetFilters = useCallback((defaultFilters: ProductFilters = {}) => {
    setFilters(defaultFilters);
  }, []);

  return {
    products,
    loading,
    error,
    total,
    page,
    pages,
    filters,
    updateFilters,
    resetFilters,
    refetch: () => fetchProducts(filters)
  };
}
