import React, { useEffect, useState } from 'react';
import { Search, RotateCcw, Filter } from 'lucide-react';
import { getProductCategories } from '../../api/products';
import { ProductFilters as IProductFilters } from '../../api/products';
import Button from '../common/Button';

interface ProductFiltersProps {
  filters: IProductFilters;
  onChange: (newFilters: Partial<IProductFilters>) => void;
  onReset: () => void;
}

export const ProductFilters = ({ filters, onChange, onReset }: ProductFiltersProps) => {
  const [categories, setCategories] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState(filters.min_price?.toString() || '');
  const [maxPrice, setMaxPrice] = useState(filters.max_price?.toString() || '');
  const [searchTerm, setSearchTerm] = useState(filters.search || '');

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const cats = await getProductCategories();
        setCategories(cats || []);
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    };
    fetchCats();
  }, []);

  // Update input fields if filters are reset from parent
  useEffect(() => {
    setSearchTerm(filters.search || '');
    setMinPrice(filters.min_price?.toString() || '');
    setMaxPrice(filters.max_price?.toString() || '');
  }, [filters]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onChange({ search: searchTerm });
  };

  const handlePriceApply = () => {
    onChange({
      min_price: minPrice ? parseFloat(minPrice) : undefined,
      max_price: maxPrice ? parseFloat(maxPrice) : undefined,
    });
  };

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 space-y-6 text-left">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-50 pb-3">
        <h3 className="font-bold text-slate-900 flex items-center">
          <Filter className="w-4 h-4 mr-1.5 text-blue-600" />
          Filters Catalog
        </h3>
        <button
          onClick={onReset}
          className="text-xs font-semibold text-slate-500 hover:text-blue-600 inline-flex items-center space-x-1 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset All</span>
        </button>
      </div>

      {/* Search Input (Submit based or realtime) */}
      <form onSubmit={handleSearchSubmit} className="space-y-2">
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Search Keyword</label>
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border-2 border-slate-100 rounded-lg outline-none focus:border-blue-500 text-sm"
            placeholder="Search products..."
          />
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
        </div>
      </form>

      {/* Category Filter */}
      <div className="space-y-2.5">
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Categories</label>
        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
          <label className="flex items-center text-sm font-medium text-slate-700 hover:text-blue-600 cursor-pointer p-1 rounded hover:bg-slate-50">
            <input
              type="radio"
              name="category"
              checked={!filters.category}
              onChange={() => onChange({ category: undefined })}
              className="w-4 h-4 text-blue-600 border-slate-200 mr-2.5"
            />
            <span>All Categories</span>
          </label>
          
          {categories.map((cat) => (
            <label key={cat} className="flex items-center text-sm font-medium text-slate-700 hover:text-blue-600 cursor-pointer p-1 rounded hover:bg-slate-50 capitalize">
              <input
                type="radio"
                name="category"
                checked={filters.category === cat}
                onChange={() => onChange({ category: cat })}
                className="w-4 h-4 text-blue-600 border-slate-200 mr-2.5"
              />
              <span>{cat}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Price Range Filter */}
      <div className="space-y-2.5">
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Price Bounds (KES)</label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="w-full px-3 py-2 border-2 border-slate-100 rounded-lg outline-none focus:border-blue-500 text-sm"
            placeholder="Min"
          />
          <input
            type="number"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="w-full px-3 py-2 border-2 border-slate-100 rounded-lg outline-none focus:border-blue-500 text-sm"
            placeholder="Max"
          />
        </div>
        <Button
          variant="secondary"
          className="w-full py-2 px-4 rounded-lg text-xs font-bold border border-slate-200"
          onClick={handlePriceApply}
        >
          Apply Price Filter
        </Button>
      </div>

      {/* Sort Options */}
      <div className="space-y-2.5">
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Sort Selection</label>
        <select
          value={`${filters.sort_by || 'created_at'}-${filters.order || 'desc'}`}
          onChange={(e) => {
            const [sort_by, order] = e.target.value.split('-');
            onChange({ 
              sort_by: sort_by as any, 
              order: order as any 
            });
          }}
          className="w-full py-2.5 px-3 border-2 border-slate-150 rounded-lg bg-white text-sm text-slate-700 outline-none focus:border-blue-500"
        >
          <option value="created_at-desc">Newest First</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="name-asc">Name: A-Z</option>
          <option value="name-desc">Name: Z-A</option>
        </select>
      </div>
    </div>
  );
};

export default ProductFilters;
