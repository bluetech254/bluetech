import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getRepairServices, getRepairServiceCategories } from '../api/services';
import { RepairService } from '../types';
import ServiceGrid from '../components/services/ServiceGrid';
import { Shield, CheckCircle } from 'lucide-react';

export const ServicesPage = () => {
  const location = useLocation();
  const [services, setServices] = useState<RepairService[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const catParam = params.get('category');
    if (catParam) setSelectedCategory(catParam);
  }, [location]);

  useEffect(() => {
    getRepairServiceCategories()
      .then(cats => setCategories(Array.isArray(cats) ? cats : []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    getRepairServices({ category: selectedCategory })
      .then(data => setServices(data || []))
      .catch(err => console.error('Failed to load repair services:', err))
      .finally(() => setLoading(false));
  }, [selectedCategory]);

  const allCategories = ['All', ...categories];
  const ticker = [...allCategories, ...allCategories, ...allCategories];

  return (
    <div className="space-y-8 animate-fade-in text-left">

      {/* Category ticker — same style as ProductsPage */}
      <div className="overflow-hidden bg-blue-600 py-2.5 -mx-4 sm:-mx-6 lg:-mx-[100px] whitespace-nowrap">
        <div className="animate-marquee ticker-pause-on-hover">
          {ticker.map((cat, i) => (
            <button
              key={i}
              onClick={() => setSelectedCategory(cat === 'All' ? undefined : cat)}
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

      {/* Grid listing */}
      <div className="space-y-4 pb-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {selectedCategory ? <span className="capitalize">{selectedCategory} Repairs</span> : 'All Repair Services'}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Prices shown are estimated baselines inclusive of labor and standard spare parts.
          </p>
        </div>
        <ServiceGrid services={services} isLoading={loading} />
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
