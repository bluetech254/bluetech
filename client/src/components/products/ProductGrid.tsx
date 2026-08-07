import React from 'react';
import ProductCard from './ProductCard';
import { Product } from '../../types';
import { ShoppingBag } from 'lucide-react';

interface ProductGridProps {
  products: Product[];
  isLoading: boolean;
  emptyMessage?: string;
}

export const ProductGrid = ({ products, isLoading, emptyMessage }: ProductGridProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-pulse">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-100 p-4 space-y-4">
            <div className="bg-slate-100 aspect-square w-full rounded-lg" />
            <div className="space-y-2">
              <div className="bg-slate-100 h-4 w-1/3 rounded" />
              <div className="bg-slate-100 h-4 w-full rounded" />
              <div className="bg-slate-100 h-4 w-1/2 rounded" />
            </div>
            <div className="pt-2">
              <div className="bg-slate-100 h-9 w-full rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 bg-white rounded-2xl border border-slate-100 shadow-sm text-center">
        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">No products found</h3>
        <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
          {emptyMessage || "We couldn't find any products matching your active filter criteria. Try adjusting your search query or filters."}
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile: Horizontal Scroll */}
      <div className="md:hidden overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory">
        <div className="flex gap-3 w-max">
          {products.map((product) => (
            <div key={product.id} className="w-[100px] flex-shrink-0 snap-start">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>

      {/* Desktop: Grid 3 columns */}
      <div className="hidden md:grid grid-cols-3 xl:grid-cols-4 gap-4 animate-fade-in">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </>
  );
};

export default ProductGrid;
