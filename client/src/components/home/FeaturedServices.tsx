import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getRepairServices } from '../../api/services';
import { RepairService } from '../../types';
import { formatCurrency } from '../../utils/formatters';

export const FeaturedServices = () => {
  const [services, setServices] = useState<RepairService[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const data = await getRepairServices({ limit: 10 });
        setServices(data || []);
      } catch (err) {
        console.error('Failed to load services:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + services.length) % services.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % services.length);
  };

  if (loading || services.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Featured Services
        </h3>
        <div className="hidden md:flex gap-2">
          <button onClick={handlePrev} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <button onClick={handleNext} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Mobile: Horizontal Scroll */}
      <div className="md:hidden overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory">
        <div className="flex gap-3 w-max">
          {services.map((service, idx) => (
            <div key={idx} className="w-48 flex-shrink-0 snap-start">
              <ServiceCard service={service} />
            </div>
          ))}
        </div>
      </div>

      {/* Desktop: Grid */}
      <div className="hidden md:grid grid-cols-5 gap-4">
        {services.map((service, idx) => (
          <div key={idx}>
            <ServiceCard service={service} />
          </div>
        ))}
      </div>
    </div>
  );
};

const ServiceCard = ({ service }: { service: RepairService }) => {
  const navigate = useNavigate();

  const getCategoryIcon = (cat: string) => {
    const c = cat.toLowerCase();
    if (c.includes('phone') || c.includes('mobile')) return '📱';
    if (c.includes('laptop') || c.includes('computer')) return '💻';
    if (c.includes('tablet') || c.includes('ipad')) return '🖥️';
    if (c.includes('audio') || c.includes('speaker')) return '🎧';
    if (c.includes('watch') || c.includes('wearable')) return '⌚';
    return '🔧';
  };

  return (
    <div className="bg-white border border-slate-100 rounded-lg p-4 hover:shadow-md transition-shadow h-full flex flex-col">
      {/* Icon instead of image */}
      <div className="flex justify-center mb-3">
        <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-lg">
          {getCategoryIcon(service.category || '')}
        </div>
      </div>
      <h4 className="font-semibold text-slate-900 text-sm line-clamp-2 mb-2 text-center">
        {service.name}
      </h4>
      <p className="text-xs text-slate-500 line-clamp-2 mb-3 flex-1 text-center">
        {service.category}
      </p>
      <button
        onClick={() => navigate('/book-repair')}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-2 rounded-lg transition-all"
      >
        Book Now
      </button>
    </div>
  );
};

export default FeaturedServices;
