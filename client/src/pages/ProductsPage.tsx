import React, { useState } from 'react';
import { useProducts } from '../hooks/useProducts';
import ProductGrid from '../components/products/ProductGrid';
import ProductFilters from '../components/products/ProductFilters';
import { SlidersHorizontal, ChevronLeft, ChevronRight, X } from 'lucide-react';
import Button from '../components/common/Button';

export const ProductsPage = () => {
  const {
    products,
    loading,
    error,
    page,
    pages,
    filters,
    updateFilters,
    resetFilters
  } = useProducts({ limit: 12 });

  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pages) {
      updateFilters({ page: newPage });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-8 py-6 animate-fade-in text-left">
      {/* Breadcrumbs & Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="text-xs text-slate-400 font-bold uppercase tracking-wider space-x-1">
            <span>Home</span>
            <span>/</span>
            <span className="text-blue-600">Products Catalog</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1.5">
            Gadgets & Spare Parts
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Browse our wide selection of certified hardware, electronics, and accessories.
          </p>
        </div>
        
        {/* Mobile Filter Button */}
        <Button
          variant="outline"
          leftIcon={<SlidersHorizontal className="w-4 h-4" />}
          className="lg:hidden w-full sm:w-auto"
          onClick={() => setIsMobileFiltersOpen(true)}
        >
          Filter Catalog
        </Button>
      </div>

      <div className="flex gap-8 items-start">
        {/* Left: Filter Sidebar (Desktop only) */}
        <aside className="hidden lg:block w-64 shrink-0 sticky top-24">
          <ProductFilters
            filters={filters}
            onChange={updateFilters}
            onReset={() => resetFilters({ limit: 12 })}
          />
        </aside>

        {/* Right: Products List */}
        <div className="flex-1 space-y-8 min-w-0">
          {error ? (
            <div className="p-6 bg-red-50 border border-red-100 rounded-2xl text-center">
              <p className="text-red-800 font-bold mb-1">Could not fetch catalog</p>
              <p className="text-xs text-red-500 mb-4">{error}</p>
              <Button variant="outline" onClick={() => updateFilters({})} className="py-2.5">
                Retry Query
              </Button>
            </div>
          ) : (
            <ProductGrid products={products} isLoading={loading} />
          )}

          {/* Pagination controls */}
          {!loading && pages > 1 && (
            <div className="flex items-center justify-center space-x-2 border-t border-slate-100 pt-6">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
                className="p-2.5 border border-slate-200 bg-white text-slate-600 rounded-lg hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                aria-label="Previous Page"
              >
                <ChevronLeft className="w-4.5 h-4.5" />
              </button>

              {Array.from({ length: pages }).map((_, idx) => {
                const currentPageNum = idx + 1;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handlePageChange(currentPageNum)}
                    className={`
                      w-10 h-10 font-bold text-sm rounded-lg transition-all cursor-pointer
                      ${page === currentPageNum
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-100'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }
                    `}
                  >
                    {currentPageNum}
                  </button>
                );
              })}

              <button
                type="button"
                disabled={page >= pages}
                onClick={() => handlePageChange(page + 1)}
                className="p-2.5 border border-slate-200 bg-white text-slate-600 rounded-lg hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                aria-label="Next Page"
              >
                <ChevronRight className="w-4.5 h-4.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filter Sheet Drawer */}
      {isMobileFiltersOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 overflow-hidden">
            {/* Backdrop overlay */}
            <div 
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300" 
              onClick={() => setIsMobileFiltersOpen(false)}
            />

            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <div className="pointer-events-auto w-screen max-w-md transform transition-all duration-300 ease-in-out">
                <div className="flex h-full flex-col bg-white shadow-2xl">
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                    <h2 className="text-lg font-bold text-slate-900">
                      Filters Catalog
                    </h2>
                    <button
                      type="button"
                      className="rounded-md text-slate-400 hover:text-slate-500 hover:bg-slate-50 p-1.5 focus:outline-none cursor-pointer"
                      onClick={() => setIsMobileFiltersOpen(false)}
                    >
                      <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </div>

                  {/* Sidebar inside list */}
                  <div className="flex-1 overflow-y-auto px-6 py-4">
                    <ProductFilters
                      filters={filters}
                      onChange={(newFilters) => {
                        updateFilters(newFilters);
                      }}
                      onReset={() => resetFilters({ limit: 12 })}
                    />
                  </div>

                  {/* Summary Block */}
                  <div className="border-t border-slate-100 px-6 py-6 bg-slate-50">
                    <Button
                      variant="primary"
                      className="w-full text-base font-bold"
                      onClick={() => setIsMobileFiltersOpen(false)}
                    >
                      Apply Filters
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsPage;
