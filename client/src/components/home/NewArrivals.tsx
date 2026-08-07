import React, { useEffect, useState } from 'react';
import { getProducts } from '../../api/products';
import { Product } from '../../types';
import ProductCard from '../products/ProductCard';

export const NewArrivals = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await getProducts({ limit: 8, sort_by: 'created_at', order: 'desc' });
        setProducts((response.products || []).slice(0, 8));
      } catch (err) {
        console.error('Failed to load products:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  if (loading || products.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          New Arrivals
        </h2>
      </div>

      {/* Mobile: Horizontal Scroll */}
      <div className="md:hidden overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory">
        <div className="flex gap-3 w-max">
          {products.map((product) => (
            <div key={product.id} className="w-[140px] flex-shrink-0 snap-start">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>

      {/* Desktop: Staggered Grid with Animation */}
      <div className="hidden md:grid grid-cols-4 gap-4">
        {products.map((product, idx) => (
          <div
            key={product.id}
            style={{
              animation: `fadeInUp 0.6s ease-out ${idx * 0.1}s both`,
            }}
          >
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default NewArrivals;
