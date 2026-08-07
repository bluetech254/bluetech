import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProductCategories } from '../../api/products';

export const ProductCategoriesGrid = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    getProductCategories().then(setCategories).catch(() => {});
  }, []);

  if (categories.length === 0) return null;

  const go = (cat: string) => navigate(`/products?category=${encodeURIComponent(cat)}`);

  return (
    <div className="space-y-2">
      {/* 4×2 grid — desktop */}
      <div className="hidden sm:grid grid-cols-4 gap-2">
        {categories.slice(0, 8).map(cat => (
          <button key={cat} onClick={() => go(cat)}
            className="bg-white border border-slate-200 rounded-xl py-3 px-2 text-sm font-semibold text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all truncate">
            {cat}
          </button>
        ))}
      </div>

      {/* 8×1 horizontal scroll — mobile */}
      <div className="sm:hidden overflow-x-auto pb-1 -mx-4 px-4">
        <div className="flex gap-2 w-max">
          {categories.slice(0, 8).map(cat => (
            <button key={cat} onClick={() => go(cat)}
              className="bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all whitespace-nowrap flex-shrink-0">
              {cat}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductCategoriesGrid;
