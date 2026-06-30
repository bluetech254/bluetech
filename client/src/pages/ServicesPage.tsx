import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getRepairServices } from '../api/services';
import { RepairService } from '../types';
import ServiceGrid from '../components/services/ServiceGrid';
import ServiceFilters from '../components/services/ServiceFilters';
import { Wrench, Shield, CheckCircle } from 'lucide-react';

export const ServicesPage = () => {
  const location = useLocation();
  const [services, setServices] = useState<RepairService[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');

  // Extract initial category or search from URL if navigated from Home/Footer
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const catParam = params.get('category');
    const searchParam = params.get('search');
    
    if (catParam) {
      setSelectedCategory(catParam);
    }
    if (searchParam) {
      setSearchQuery(searchParam);
    }
  }, [location]);

  // Fetch Services on filter change
  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true);
      try {
        const data = await getRepairServices({
          category: selectedCategory,
          search: searchQuery || undefined,
        });
        setServices(data || []);
      } catch (err) {
        console.error('Failed to load repair services:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, [selectedCategory, searchQuery]);

  return (
    <div className="space-y-12 py-6 animate-fade-in text-left">
      {/* Hero Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-10 md:p-14 rounded-3xl shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/5 rounded-full blur-2xl" />
        <div className="relative z-10 max-w-xl space-y-4">
          <div className="text-xs text-yellow-300 font-bold uppercase tracking-widest flex items-center space-x-1.5">
            <Wrench className="w-4 h-4 text-current" />
            <span>Certified Diagnostic Engineers</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-none">
            Professional Repair Services
          </h1>
          <p className="text-sm sm:text-base text-white/95 leading-relaxed max-w-lg font-medium">
            Certified expert technicians, premium genuine parts, and quick turnaround. Select a repair category to check baseline pricing or schedule an inspection.
          </p>
        </div>
      </div>

      {/* Filter panel */}
      <ServiceFilters
        selectedCategory={selectedCategory}
        searchQuery={searchQuery}
        onCategoryChange={setSelectedCategory}
        onSearchChange={setSearchQuery}
      />

      {/* Grid listing */}
      <div className="space-y-6 pt-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Available Repair Packages
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Prices shown are estimated baselines inclusive of certified engineering labor and standard spare parts.
          </p>
        </div>
        
        <ServiceGrid services={services} isLoading={loading} />
      </div>

      {/* Warranty Value Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 border border-slate-100 rounded-3xl p-8 items-center">
        <div className="space-y-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
            <Shield className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">
            The BlueTech Certified Repair Guarantee
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed max-w-md">
            We operate a clean workshop with anti-static safeguards. We use strict original-equipment manufacturer (OEM) grade spare components to ensure your device performs seamlessly.
          </p>
        </div>

        <ul className="space-y-3.5 text-sm font-semibold text-slate-700">
          <li className="flex items-center space-x-2.5">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <span>Up to 90 Days post-repair warranty on parts</span>
          </li>
          <li className="flex items-center space-x-2.5">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <span>Zero diagnostics fees if repair is executed</span>
          </li>
          <li className="flex items-center space-x-2.5">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <span>Real-time booking and workflow timeline updates</span>
          </li>
          <li className="flex items-center space-x-2.5">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <span>Secure backup safety on hardware interventions</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default ServicesPage;
