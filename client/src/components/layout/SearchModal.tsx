import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ShoppingBag, Wrench, Loader2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '../../hooks/useDebounce';
import { getProducts } from '../../api/products';
import { getRepairServices } from '../../api/services';
import { Product, RepairService } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchModal = ({ isOpen, onClose }: SearchModalProps) => {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<RepairService[]>([]);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      setQuery('');
      setProducts([]);
      setServices([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setProducts([]);
      setServices([]);
      return;
    }

    const performSearch = async () => {
      setLoading(true);
      try {
        const [productRes, serviceRes] = await Promise.all([
          getProducts({ search: debouncedQuery, limit: 5 }),
          getRepairServices({ search: debouncedQuery, limit: 5 })
        ]);
        
        setProducts(productRes.products || []);
        // Get all repair services and filter if API doesn't support query directly, or let API do it
        setServices(serviceRes || []);
      } catch (error) {
        console.error('Search query failed:', error);
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [debouncedQuery]);

  if (!isOpen) return null;

  const handleProductClick = (id: string) => {
    onClose();
    navigate(`/products/${id}`);
  };

  const handleServiceClick = (id: string) => {
    onClose();
    navigate(`/book-repair/${id}`);
  };

  const handleViewAllProducts = () => {
    onClose();
    navigate(`/products?search=${encodeURIComponent(query)}`);
  };

  const handleViewAllServices = () => {
    onClose();
    navigate(`/services?search=${encodeURIComponent(query)}`);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300 animate-fade-in" 
        onClick={onClose}
      />

      <div className="flex min-h-screen items-start justify-center p-4 pt-10 sm:p-6 md:pt-20">
        <div className="relative w-full max-w-sm sm:max-w-2xl transform overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 transition-all animate-scale-in">
          {/* Input Bar */}
          <div className="relative flex items-center border-b border-slate-100 p-4">
            <Search className="h-6 w-6 text-slate-400 mr-3.5 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-lg text-slate-900 placeholder-slate-400 outline-none border-none py-1"
              placeholder="Search products, repairs, brands..."
            />
            {query && (
              <button 
                onClick={() => setQuery('')} 
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full mr-2"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-md transition-colors"
            >
              ESC
            </button>
          </div>

          {/* Results Area */}
          <div className="max-h-[70vh] overflow-y-auto p-4 sm:p-6">
            {loading && (
              <div className="flex items-center justify-center py-10 space-x-2 text-slate-500 text-sm font-medium">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <span>Searching catalog...</span>
              </div>
            )}

            {!loading && !query && (
              <div className="text-center py-10">
                <p className="text-sm text-slate-500">
                  Type at least one character to search our full selection of items and repair operations.
                </p>
              </div>
            )}

            {!loading && query && products.length === 0 && services.length === 0 && (
              <div className="text-center py-10">
                <p className="text-slate-800 font-medium mb-1">No results matching "{query}"</p>
                <p className="text-xs text-slate-400">
                  Please refine your query or check spelling.
                </p>
              </div>
            )}

            {!loading && query && (products.length > 0 || services.length > 0) && (
              <div className="space-y-6">
                {/* Products Segment */}
                {products.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                      <div className="flex items-center text-xs font-bold text-slate-400 tracking-wider uppercase space-x-1.5">
                        <ShoppingBag className="w-4 h-4 text-blue-600" />
                        <span>Products ({products.length})</span>
                      </div>
                      <button 
                        onClick={handleViewAllProducts}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center space-x-1"
                      >
                        <span>View all</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    
                    <div className="space-y-2">
                      {products.map((product) => (
                        <div
                          key={product.id}
                          onClick={() => handleProductClick(product.id)}
                          className="flex items-center p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors border border-transparent hover:border-slate-100 text-left"
                        >
                          <div className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-100 overflow-hidden flex-shrink-0">
                            <img 
                              src={product.images?.[0] || 'https://placehold.co/100x100?text=Prod'} 
                              alt={product.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="ml-3.5 flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-slate-900 truncate">{product.name}</h4>
                            <p className="text-xs text-slate-400 capitalize">{product.brand || 'BlueTech'} • {product.category}</p>
                          </div>
                          <div className="ml-4 font-bold text-sm text-blue-600 whitespace-nowrap">
                            {formatCurrency(product.price)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Services Segment */}
                {services.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                      <div className="flex items-center text-xs font-bold text-slate-400 tracking-wider uppercase space-x-1.5">
                        <Wrench className="w-4 h-4 text-purple-600" />
                        <span>Repair Services ({services.length})</span>
                      </div>
                      <button 
                        onClick={handleViewAllServices}
                        className="text-xs font-bold text-purple-600 hover:text-purple-700 hover:underline flex items-center space-x-1"
                      >
                        <span>View all</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    
                    <div className="space-y-2">
                      {services.map((service) => (
                        <div
                          key={service.id}
                          onClick={() => handleServiceClick(service.id)}
                          className="flex items-center p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors border border-transparent hover:border-slate-100 text-left"
                        >
                          <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 flex-shrink-0">
                            <Wrench className="w-5 h-5" />
                          </div>
                          <div className="ml-3.5 flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-slate-900 truncate">{service.name}</h4>
                            <p className="text-xs text-slate-400 capitalize">
                              Duration: {service.estimated_duration} • Warranty: {service.warranty_period || 'None'}
                            </p>
                          </div>
                          <div className="ml-4 text-xs text-slate-400 whitespace-nowrap">
                            {service.estimated_duration}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchModal;
