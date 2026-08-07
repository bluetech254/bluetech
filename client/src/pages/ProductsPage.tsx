import React, { useEffect, useState, useMemo } from 'react';
import FilterSidebar from '../components/products/FilterSidebar';
import ProductCard from '../components/products/ProductCard';
import SectionCarousel from '../components/products/SectionCarousel';
import { ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react';
import { getProducts } from '../api/products';
import { Product } from '../types';

const PAGE_SIZE = 12;

const parseSpecs = (p: Product) => {
  try {
    return typeof p.specifications === 'string' ? JSON.parse(p.specifications) : p.specifications || {};
  } catch { return {}; }
};

export const ProductsPage = () => {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [minPrice, setMinPrice] = useState<number | undefined>();
  const [maxPrice, setMaxPrice] = useState<number | undefined>();
  const [condition, setCondition] = useState('');
  const [brand, setBrand] = useState('');
  const [inStock, setInStock] = useState(false);
  const [minRating, setMinRating] = useState(0);

  // Fetch all products once
  useEffect(() => {
    setLoading(true);
    getProducts({ limit: 200 })
      .then(res => setAllProducts(res.products))
      .catch(e => setError(e.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  // Extract categories from specs
  const categories = useMemo(() => {
    const cats = Array.from(new Set(allProducts.map(p => parseSpecs(p).category).filter(Boolean))) as string[];
    return ['All', ...cats.sort()];
  }, [allProducts]);

  // Client-side filtering
  const filtered = useMemo(() => {
    return allProducts.filter(p => {
      const specs = parseSpecs(p);
      const name = (p.name || '').toLowerCase();
      if (search && !name.includes(search.toLowerCase())) return false;
      if (category && category !== 'All' && (specs.category || '').toLowerCase() !== category) return false;
      if (minPrice !== undefined && p.price < minPrice) return false;
      if (maxPrice !== undefined && p.price > maxPrice) return false;
      if (condition && (p as any).condition?.toLowerCase() !== condition) return false;
      if (brand && !(p.name || '').toLowerCase().includes(brand.toLowerCase()) && !(specs.brand || '').toLowerCase().includes(brand.toLowerCase())) return false;
      if (inStock && (p as any).stock_quantity <= 0) return false;
      if (minRating > 0 && ((p as any).rating || 0) < minRating) return false;
      return true;
    });
  }, [allProducts, search, category, minPrice, maxPrice, condition, brand, inStock, minRating]);

  const pages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleCategoryClick = (cat: string) => {
    setCategory(cat === 'All' ? '' : cat.toLowerCase());
    setPage(1);
    if (cat !== 'All') setTimeout(() => document.getElementById('products-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  // Memoize all section buckets in one pass
  const sections = useMemo(() => ({
    featured:    allProducts.filter(p => p.is_featured),
    flashSale:   allProducts.filter(p => p.is_flash_sale),
    hotDeals:    allProducts.filter(p => p.is_discounted && !p.is_flash_sale),
    newArrivals: allProducts.filter(p => p.is_new_arrival),
    bestSellers: allProducts.filter(p => p.is_best_seller),
    trending:    allProducts.filter(p => p.is_trending),
    editors:     allProducts.filter(p => p.is_editors_choice),
    weekly:      allProducts.filter(p => p.is_weekly_deal),
    backInStock: allProducts.filter(p => p.is_back_in_stock),
    clearance:   allProducts.filter(p => p.is_clearance),
    refurbished: allProducts.filter(p => p.is_refurbished),
    preOrder:    allProducts.filter(p => p.is_pre_order),
    comingSoon:  allProducts.filter(p => p.is_coming_soon),
  }), [allProducts]);
  const filters = { search, category: category.toLowerCase() || undefined, min_price: minPrice, max_price: maxPrice };
  const updateFilters = (f: any) => {
    if ('search' in f) { setSearch(f.search || ''); setPage(1); }
    if ('category' in f) { setCategory(f.category || ''); setPage(1); }
    if ('min_price' in f) { setMinPrice(f.min_price); setPage(1); }
    if ('max_price' in f) { setMaxPrice(f.max_price); setPage(1); }
    if ('condition' in f) { setCondition(f.condition || ''); setPage(1); }
    if ('brand' in f) { setBrand(f.brand || ''); setPage(1); }
    if ('in_stock' in f) { setInStock(!!f.in_stock); setPage(1); }
    if ('min_rating' in f) { setMinRating(f.min_rating || 0); setPage(1); }
  };
  const resetFilters = () => { setSearch(''); setCategory(''); setMinPrice(undefined); setMaxPrice(undefined); setCondition(''); setBrand(''); setInStock(false); setMinRating(0); setPage(1); };

  return (
    <div className="animate-fade-in">

      {/* Category ticker — full width */}
      <div className="overflow-hidden bg-blue-600 py-2.5 -mx-4 sm:-mx-6 lg:-mx-[100px] mb-6 whitespace-nowrap">
        <div className="animate-marquee ticker-pause-on-hover">
          {[...categories, ...categories, ...categories].map((cat, i) => (
            <button
              key={i}
              onClick={() => handleCategoryClick(cat)}
              className={`mx-4 text-sm font-semibold whitespace-nowrap px-4 py-1 rounded-full transition-colors cursor-pointer ${
                (cat === 'All' && !category) || cat.toLowerCase() === category
                  ? 'bg-white text-blue-600'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main layout */}
      <div className="flex gap-8 items-start">

        <div className="hidden lg:block">
          <FilterSidebar filters={filters} onChange={updateFilters} onReset={resetFilters} categories={categories.filter(c => c !== 'All')} />
        </div>

        <div className="flex-1 min-w-0 space-y-6 pb-8 max-w-[calc(100%-20px)] md:max-w-full">

          {/* Section Carousels */}
          {!loading && allProducts.length > 0 && !category && (
            <div className="space-y-8 border-b border-slate-100 pb-8">
              <SectionCarousel title="Featured Products" emoji="⭐" products={sections.featured} />
              <SectionCarousel title="Flash Sale" emoji="⚡" products={sections.flashSale} badgeLabel="FLASH" badgeColor="bg-red-500" />
              <SectionCarousel title="Hot Deals" emoji="🔥" products={sections.hotDeals} badgeLabel="SALE" badgeColor="bg-orange-500" />
              <SectionCarousel title="New Arrivals" emoji="🆕" products={sections.newArrivals} badgeLabel="NEW" badgeColor="bg-green-500" />
              <SectionCarousel title="Best Sellers" emoji="🏆" products={sections.bestSellers} />
              <SectionCarousel title="Trending Now" emoji="📈" products={sections.trending} />
              <SectionCarousel title="Editor's Choice" emoji="🎖️" products={sections.editors} />
              <SectionCarousel title="Weekly Deals" emoji="🗓️" products={sections.weekly} badgeLabel="DEAL" badgeColor="bg-purple-500" />
              <SectionCarousel title="Back in Stock" emoji="✅" products={sections.backInStock} badgeLabel="BACK" badgeColor="bg-teal-500" />
              <SectionCarousel title="Clearance" emoji="🏷️" products={sections.clearance} badgeLabel="CLEARANCE" badgeColor="bg-slate-600" />
              <SectionCarousel title="Refurbished" emoji="♻️" products={sections.refurbished} badgeLabel="REFURB" badgeColor="bg-amber-500" />
              <SectionCarousel title="Pre-Order" emoji="🔔" products={sections.preOrder} badgeLabel="PRE-ORDER" badgeColor="bg-indigo-500" />
              <SectionCarousel title="Coming Soon" emoji="🚀" products={sections.comingSoon} badgeLabel="SOON" badgeColor="bg-pink-500" />
            </div>
          )}

          {loading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-2 md:gap-4 animate-pulse">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-100 p-4 space-y-3">
                  <div className="bg-slate-100 aspect-square w-full rounded-lg" />
                  <div className="bg-slate-100 h-4 w-2/3 rounded" />
                  <div className="bg-slate-100 h-4 w-1/3 rounded" />
                </div>
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="p-6 bg-red-50 border border-red-100 rounded-2xl text-center">
              <p className="text-red-800 font-bold">{error}</p>
            </div>
          )}

          {!loading && !error && paginated.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                <ShoppingBag className="w-7 h-7 text-blue-600" />
              </div>
              <p className="font-bold text-slate-900">No products found</p>
              <p className="text-sm text-slate-500 mt-1">Try adjusting your filters.</p>
            </div>
          )}

          {!loading && !error && paginated.length > 0 && (
            <div id="products-grid">
              {/* Mobile: horizontal scroll */}
              <div className="sm:hidden overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory">
                <div className="flex gap-3 w-max">
                  {paginated.map(product => (
                    <div key={product.id} className="w-40 flex-shrink-0 snap-start">
                      <ProductCard product={product} />
                    </div>
                  ))}
                </div>
              </div>
              {/* Tablet+: grid */}
              <div className="hidden sm:grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4 animate-fade-in">
                {paginated.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          )}

          {!loading && pages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4 border-t border-slate-100">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="p-2 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer">
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: pages }).map((_, i) => (
                <button key={i} onClick={() => setPage(i + 1)}
                  className={`w-9 h-9 text-sm font-bold rounded-lg cursor-pointer transition-all ${
                    page === i + 1 ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}>
                  {i + 1}
                </button>
              ))}
              <button disabled={page >= pages} onClick={() => setPage(p => p + 1)}
                className="p-2 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ProductsPage;
