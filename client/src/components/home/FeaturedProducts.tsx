import React, { useEffect, useState } from 'react';
import { getProducts } from '../../api/products';
import { Product } from '../../types';
import ProductGrid from '../products/ProductGrid';

export const FeaturedProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const response = await getProducts({ featured: true });
        setProducts((response.products || []).slice(0, 6));
      } catch (err) {
        console.error('Failed to load featured products:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFeatured();
  }, []);

  if (!loading && products.length === 0) {
    return null; // Don't show featured products if none exist
  }

  return (
    <div className="space-y-6 text-left">
      <div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Featured Products
        </h2>
      </div>

      <div className="-mt-2.5">
        <ProductGrid 
          products={products} 
          isLoading={loading} 
          emptyMessage="Our featured products catalog is temporarily empty."
        />
      </div>
    </div>
  );
};

export default FeaturedProducts;
