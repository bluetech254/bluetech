import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { getRepairServices, getRepairServiceCategories } from '../api/services';
import { RepairService } from '../types';
import ServiceGrid from '../components/services/ServiceGrid';
import { Shield, CheckCircle, Search, X } from 'lucide-react';

const DEBOUNCE_MS = 350;

export const ServicesPage = () => {
  const location = useLocation();

  const [services, setServices] = useState<RepairService[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);

  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [searchInput, setSearchInput] = useState('');   // raw input, not yet debounced
  const [searchQuery, setSearchQuery] = useState('');   // debounced value sent to API

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pick up ?category= from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const catParam = params.get('category');
    if (catParam) setSelectedCategory(catParam);
  }, [location]);

  // Load category list once
  useEffect(() => {
    getRepairServiceCategories()
      .then(cats => setCategories(Array.isArray(cats) ? cats : []))
      .catch(() => setCategories([]));
  }, []);

  // Debounce: update searchQuery 350 ms after user stops typing
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  // Fetch services when category or debounced search changes
  useEffect(() => {
    setLoading(true);
    getRepairServices({
      category: selectedCategory,
      search:   searchQuery || undefined,
    })
      .then(data => setServices(data || []))
      .catch(err => console.error('Failed to load repair services:', err))
      .finally(() => setLoading(false));
  }, [selectedCategory, searchQuery]);

  // When a category is selected, clear search so we show the full category
  const handleCategorySelect = useCallback((cat: string | undefined) => {
    setSelectedCategory(cat);
    setSearchInput('');
    setSearchQuery('');
  }, []);

  // Group services by category for the default (no-filter) view
  const groupedServices = useMemo<Record<string, RepairService[]>>(() => {
    if (selectedCategory || searchQuery) return {};  // not used in filtered views
    return services.reduce<Record<string, RepairService[]>>((acc, s) => {
      const key = s.category || 'Other';
      if (!acc[key]) acc[key] = [];
      acc[key].push(s);
      return acc;
    }, {});
  }, [services, selectedCategory, searchQuery]);

  const allCategories = ['All', ...categories];
  const ticker = [...allCategories, ...allCategories, ...allCategories];

  const isFiltering = !!selectedCategory || !!searchQuery;
  const resultLabel = selectedCategory
    ? `${selectedCategory} Repairs`
    : searchQuery
    ? `Results for "${searchQuery}"`
    : 'All Repair Services';

  return (
    <div className="space-y-8 animate-fade-in text-left">

      {/* Category ticker */}
      <div className="overflow-hidden bg-blue-600 py-2.5 -mx-4 sm:-mx-6 lg:-mx-[100px] whitespace-nowrap">
        <div className="animate-marquee ticker-pause-on-hover">
          {ticker.map((cat, i) => (
            <button
              key={i}
              onClick={() => handleCategorySelect(cat === 'All' ? undefined : cat)}
              className={`mx-4 text-sm font-semibold whitespace-nowrap px-4 py-1 rounded-full transition-colors cursor-pointer ${
                (cat === 'All' && !selectedCategory) || cat === selectedCategory
                  ? 'bg-white text-blue-600'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Search bar */}
      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="search"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          placeholder="Search repair services…"
          className="w-full pl-9 pr-9 py-2.5 text-sm rounded-xl border border-slate-200 bg-white shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
        />
        {searchInput && (
          <button
            type="button"
            onClick={() => { setSearchInput(''); setSearchQuery(''); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Listing */}
      <div className="space-y-4 pb-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight capitalize">
            {resultLabel}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Prices shown are estimated baselines inclusive of labor and standard spare parts.
          </p>
        </div>

        {isFiltering ? (
          // Flat list when a category is selected OR a search is active
          <ServiceGrid services={services} isLoading={loading} />
        ) : (
          // Grouped by category in default view
          <ServiceGrid grouped groupedServices={groupedServices} isLoading={loading} />
        )}
      </div>

      {/* Warranty Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 border border-slate-100 rounded-2xl p-6 sm:p-8 items-center">
        <div className="space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">The BlueTech Certified Repair Guarantee</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Clean workshop with anti-static safeguards. OEM-grade spare components on every job.
          </p>
        </div>
        <ul className="space-y-3 text-sm font-semibold text-slate-700">
          {[
            'Up to 90 Days post-repair warranty on parts',
            'Zero diagnostics fees if repair is executed',
            'Real-time booking and workflow timeline updates',
            'Secure data handling on all hardware interventions',
          ].map(item => (
            <li key={item} className="flex items-center space-x-2.5">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

    </div>
  );
};

export default ServicesPage;
