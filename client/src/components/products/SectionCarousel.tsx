import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Product } from '../../types';
import ProductCard from './ProductCard';

interface SectionCarouselProps {
  title: string;
  emoji: string;
  products: Product[];
  badgeLabel?: string;
  badgeColor?: string;
}

export const SectionCarousel = ({ title, emoji, products, badgeLabel, badgeColor = 'bg-blue-600' }: SectionCarouselProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (products.length === 0) return null;

  const scroll = (dir: 'left' | 'right') => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir === 'left' ? -320 : 320, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <span>{emoji}</span>
          {title}
          <span className="text-sm font-normal text-slate-400">({products.length})</span>
        </h2>
        <div className="flex gap-1">
          <button onClick={() => scroll('left')}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer transition-colors">
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
          <button onClick={() => scroll('right')}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer transition-colors">
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Scrollable row */}
      <div ref={scrollRef} className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide scroll-smooth">
        {products.map(product => (
          <div key={product.id} className="w-[112px] lg:w-[174px] shrink-0 relative">
            {badgeLabel && (
              <span className={`absolute top-2 left-2 z-10 text-[10px] font-bold text-white px-2 py-0.5 rounded-full ${badgeColor}`}>
                {badgeLabel}{product.discount_percent ? ` ${product.discount_percent}% OFF` : ''}
              </span>
            )}
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default SectionCarousel;
