import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';

interface Deal {
  id: string;
  title: string;
  type: 'product' | 'service';
  price: number;
  image: string;
  cta: string;
}

export const PromotionalDealsCarousel = () => {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDeals = async () => {
      try {
        const [productsRes, servicesRes] = await Promise.all([
          api.get('/products'),
          api.get('/repair-services'),
        ]);
        const products = (productsRes.data.data || []).map((p: any) => ({
          id: p.id, title: p.title, type: 'product' as const,
          price: p.price, image: p.image_url, cta: 'Shop Now',
        }));
        const services = (servicesRes.data.data || []).map((s: any) => ({
          id: s.id, title: s.service_name, type: 'service' as const,
          price: s.base_price, image: s.image_url, cta: 'Book Now',
        }));
        const merged: Deal[] = [];
        for (let i = 0; i < 10; i++) {
          if (i < products.length) merged.push(products[i]);
          if (i < services.length) merged.push(services[i]);
        }
        setDeals(merged);
      } catch (error) {
        console.error('Failed to fetch deals:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDeals();
  }, []);

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -176 : 176, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="w-full py-8">
        <h2 className="text-3xl font-bold mb-6 text-slate-900">Limited Time Deals</h2>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  if (deals.length === 0) return null;

  return (
    <div className="w-full py-8">
      <h2 className="text-3xl font-bold mb-6 text-slate-900">Limited Time Deals</h2>

      <div className="relative group">
        <div
          ref={scrollRef}
          className="overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide"
          style={{ scrollbarWidth: 'none' }}
        >
          <div className="flex gap-4 w-max">
            {deals.map((deal) => (
              <div key={deal.id} className="flex-shrink-0 w-[130px] snap-start group/card">
                <div className="relative h-40 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow">
                  <img src={deal.image} alt={deal.title} className="w-full h-full object-cover" />
                  <div className="absolute top-3 right-3 bg-blue-600 text-white px-2 py-0.5 rounded-full text-xs font-bold">
                    {deal.type === 'product' ? 'Deal' : 'Service'}
                  </div>
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/card:opacity-100 transition-opacity" />
                </div>
                <div className="mt-3 bg-white p-3 rounded-lg shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-slate-900 text-sm truncate flex-1">{deal.title}</h3>
                    <span className={`text-xs px-2 py-1 rounded ${deal.type === 'product' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                      {deal.type === 'product' ? 'Product' : 'Service'}
                    </span>
                  </div>
                  <span className="text-lg font-bold text-blue-600">KSH {deal.price.toFixed(0)}</span>
                  <button
                    onClick={() => navigate(deal.type === 'service' ? `/book-repair/${deal.id}` : `/products/${deal.id}`)}
                    className={`w-full mt-3 py-2 rounded text-sm font-medium transition-colors ${
                      deal.type === 'service'
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-slate-300 hover:bg-slate-400 text-slate-700'
                    }`}
                  >
                    {deal.cta}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button onClick={() => scroll('left')}
          className="absolute left-0 top-1/3 -translate-y-1/2 -translate-x-4 bg-white hover:bg-blue-600 hover:text-white text-slate-900 p-2 rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100">
          <ChevronLeft size={20} />
        </button>
        <button onClick={() => scroll('right')}
          className="absolute right-0 top-1/3 -translate-y-1/2 translate-x-4 bg-white hover:bg-blue-600 hover:text-white text-slate-900 p-2 rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100">
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
};

export default PromotionalDealsCarousel;
