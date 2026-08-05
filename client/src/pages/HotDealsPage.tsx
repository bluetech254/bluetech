import React, { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';
import { getProducts } from '../api/products';
import { Product } from '../types';
import ProductCard from '../components/products/ProductCard';

export const HotDealsPage = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch all deal buckets in parallel using real backend flags
    Promise.all([
      getProducts({ is_flash_sale: true }),
      getProducts({ is_discounted: true }),
      getProducts({ is_clearance: true }),
      getProducts({ is_weekly_deal: true }),
    ]).then(([flash, discounted, clearance, weekly]) => {
      // Merge and deduplicate by id
      const seen = new Set<string>();
      const merged: Product[] = [];
      for (const p of [...flash.products, ...discounted.products, ...clearance.products, ...weekly.products]) {
        if (!seen.has(p.id)) { seen.add(p.id); merged.push(p); }
      }
      setProducts(merged);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
<h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Zap className="w-7 h-7 text-blue-600" /> Hot Deals
        </h1>
        <p className="text-sm text-slate-500 mt-1">Limited-time offers on top products — grab them before they're gone.</p>
      </div>

      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-100 p-4 space-y-3">
              <div className="bg-slate-100 aspect-square rounded-lg" />
              <div className="bg-slate-100 h-4 w-2/3 rounded" />
              <div className="bg-slate-100 h-4 w-1/3 rounded" />
              <div className="bg-slate-100 h-8 w-full rounded-lg" />
            </div>
          ))}
        </div>
      )}

      {!loading && products.length === 0 && (
        <div className="py-20 text-center text-slate-500">No active deals right now. Check back soon!</div>
      )}

      {!loading && products.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
};

export default HotDealsPage;
