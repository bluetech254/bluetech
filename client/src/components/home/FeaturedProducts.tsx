import React, { useEffect, useState } from 'react';
import { ArrowRight, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getProducts } from '../../api/products';
import { Product } from '../../types';
import ProductGrid from '../products/ProductGrid';

export const FeaturedProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const response = await getProducts({ featured: true, limit: 8 });
        setProducts(response.products || []);
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
    <div className="space-y-8 text-left">
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Featured Products
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Top-rated electronics and quality parts handpicked by our engineering staff.
          </p>
        </div>
        <Link
          to="/products"
          className="text-sm font-bold text-blue-600 hover:text-blue-700 inline-flex items-center space-x-1.5 transition-colors cursor-pointer group"
        >
          <span>Explore Full Catalog</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      <ProductGrid 
        products={products} 
        isLoading={loading} 
        emptyMessage="Our featured products catalog is temporarily empty."
      />
    </div>
  );
};

export default FeaturedProducts;
