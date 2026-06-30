import React, { useEffect, useState } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { getRepairServiceCategories } from '../../api/services';

interface ServiceFiltersProps {
  selectedCategory?: string;
  searchQuery: string;
  onCategoryChange: (category?: string) => void;
  onSearchChange: (query: string) => void;
}

export const ServiceFilters = ({
  selectedCategory,
  searchQuery,
  onCategoryChange,
  onSearchChange,
}: ServiceFiltersProps) => {
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const cats = await getRepairServiceCategories();
        // Ensure we always set an array
        setCategories(Array.isArray(cats) ? cats : []);
      } catch (err) {
        console.error('Failed to load repair categories:', err);
        setCategories([]); // Set empty array on error
      }
    };
    fetchCats();
  }, []);

  return (
    <div className="space-y-6 text-left">
      {/* Search Input */}
      <div className="relative max-w-md mx-auto">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search repair operations (e.g. screen replacement, battery, charging port)..."
          className="w-full pl-11 pr-4 py-3.5 border-2 border-slate-200 rounded-2xl outline-none bg-white text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm"
        />
        <Search className="w-5 h-5 absolute left-4 top-4 text-slate-400" />
      </div>

      {/* Category Tabs */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block text-center sm:text-left">
          Filter by Device Type
        </label>
        
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
          {/* All Repairs option */}
          <button
            type="button"
            onClick={() => onCategoryChange(undefined)}
            className={`
              px-5 py-2.5 rounded-xl font-bold text-sm tracking-wide transition-all border-2 cursor-pointer
              ${!selectedCategory 
                ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100' 
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }
            `}
          >
            All Repair Services
          </button>
          
          {Array.isArray(categories) && categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => onCategoryChange(cat)}
              className={`
                px-5 py-2.5 rounded-xl font-bold text-sm tracking-wide transition-all border-2 cursor-pointer capitalize
                ${selectedCategory === cat 
                  ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100' 
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                }
              `}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ServiceFilters;
