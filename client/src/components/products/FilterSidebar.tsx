import React, { useState, useEffect } from 'react';
import { Search, Star } from 'lucide-react';
import { getProductCategories, ProductFilters } from '../../api/products';
import { useDebounce } from '../../hooks/useDebounce';

interface FilterSidebarProps {
  filters: ProductFilters;
  onChange: (f: Partial<ProductFilters>) => void;
  onReset: () => void;
  categories?: string[];
}
const CONDITIONS = ['new', 'refurbished', 'used'];

export const FilterSidebar = ({ filters, onChange, onReset, categories = [] }: FilterSidebarProps) => {
  const [search, setSearch] = useState(filters.search || '');
  const debouncedSearch = useDebounce(search, 300);

  // Auto-trigger search on debounced change — same as header search
  useEffect(() => {
    onChange({ search: debouncedSearch || undefined });
  }, [debouncedSearch]);
  const [minPrice, setMinPrice] = useState(filters.min_price ?? 0);
  const [maxPrice, setMaxPrice] = useState(filters.max_price ?? 3000);
  const [condition, setCondition] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [brands, setBrands] = useState<string[]>([]);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [minRating, setMinRating] = useState(0);

  useEffect(() => {
    getProductCategories().catch(() => {});
  }, []);

  const handleApply = () => {
    onChange({
      search: search || undefined,
      category: filters.category,
      min_price: minPrice > 0 ? minPrice : undefined,
      max_price: maxPrice < 3000 ? maxPrice : undefined,
    });
  };

  const handleClearAll = () => {
    setSearch('');
    setMinPrice(0);
    setMaxPrice(3000);
    setCondition('');
    setInStockOnly(false);
    setSelectedBrand('');
    setMinRating(0);
    onReset();
  };

  return (
    <aside className="w-[314px] shrink-0 sticky top-24 bg-white border border-slate-100 rounded-2xl shadow-sm p-5 space-y-6 text-left">

      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-base font-bold text-slate-900">Filters</span>
        <button onClick={handleClearAll} className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer">
          Clear All
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search products…"
          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 bg-slate-50"
        />
      </div>

      {/* Category */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Category</p>
        <div className="space-y-1">
          {categories.slice(0, 6).map(cat => (
            <label key={cat} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer hover:text-blue-600 py-0.5">
              <input
                type="radio"
                name="category"
                checked={filters.category === cat.toLowerCase()}
                onChange={() => onChange({ category: cat.toLowerCase() })}
                className="accent-blue-600"
              />
              {cat}
            </label>
          ))}
          <label className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer hover:text-blue-600 py-0.5">
            <input
              type="radio"
              name="category"
              checked={!filters.category}
              onChange={() => onChange({ category: undefined })}
              className="accent-blue-600"
            />
            All
          </label>
        </div>
      </div>

      {/* Price Range */}
      <div className="space-y-3">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Price Range</p>
        <input
          type="range"
          min={0}
          max={3000}
          value={maxPrice}
          onChange={e => setMaxPrice(Number(e.target.value))}
          className="w-full accent-blue-600"
        />
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <p className="text-[10px] text-slate-400 mb-1">Min</p>
            <input
              type="number"
              value={minPrice}
              onChange={e => setMinPrice(Number(e.target.value))}
              className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500"
            />
          </div>
          <span className="text-slate-400 mt-4">—</span>
          <div className="flex-1">
            <p className="text-[10px] text-slate-400 mb-1">Max</p>
            <input
              type="number"
              value={maxPrice}
              onChange={e => setMaxPrice(Number(e.target.value))}
              className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Condition */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Condition</p>
        <div className="space-y-1">
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer hover:text-blue-600 py-0.5">
            <input type="radio" name="condition" checked={condition === ''} onChange={() => setCondition('')} className="accent-blue-600" />
            All Conditions
          </label>
          {CONDITIONS.map(c => (
            <label key={c} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer hover:text-blue-600 py-0.5 capitalize">
              <input type="radio" name="condition" checked={condition === c} onChange={() => setCondition(c)} className="accent-blue-600" />
              {c}
            </label>
          ))}
        </div>
      </div>

      {/* Availability */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Availability</p>
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-xs text-slate-600">In Stock Only</span>
          <div
            onClick={() => setInStockOnly(!inStockOnly)}
            className={`w-9 h-5 rounded-full transition-colors cursor-pointer ${inStockOnly ? 'bg-blue-600' : 'bg-slate-200'}`}
          >
            <div className={`w-4 h-4 bg-white rounded-full shadow mt-0.5 transition-transform ${inStockOnly ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </div>
        </label>
      </div>

      {/* Brand */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Brand</p>
        <input
          type="text"
          value={selectedBrand}
          onChange={e => setSelectedBrand(e.target.value)}
          placeholder="e.g. Samsung, Apple…"
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 bg-slate-50"
        />
      </div>

      {/* Minimum Rating */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Minimum Rating</p>
        <div className="space-y-1">
          {[4, 3].map(r => (
            <label key={r} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer hover:text-blue-600 py-0.5">
              <input type="radio" name="rating" checked={minRating === r} onChange={() => setMinRating(r)} className="accent-blue-600" />
              <span className="flex items-center gap-0.5">
                {Array.from({ length: r }).map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                ))}
                <span className="text-slate-500 text-xs ml-1">& above</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Apply */}
      <button
        onClick={handleApply}
        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors cursor-pointer"
      >
        Apply Filters
      </button>

    </aside>
  );
};

export default FilterSidebar;
