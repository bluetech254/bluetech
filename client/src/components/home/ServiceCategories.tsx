import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRepairServices } from '../../api/services';

interface Service {
  id: string;
  service_name: string;
  long_description: string;
  short_description: string;
  service_category: string;
  image_url: string;
}

export const ServiceCategories = () => {
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const data = await getRepairServices({ limit: 10 });
        setServices(data.map((s: any) => ({
          id: s.id,
          service_name: s.name,
          long_description: s.description,
          short_description: s.description,
          service_category: s.category,
          image_url: s.image,
        })));
      } catch {
        // silent fail
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

  useEffect(() => {
    if (services.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % services.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [services.length]);

  if (loading || services.length === 0) return null;

  const current = services[currentIndex];

  return (
    <div className="space-y-6 text-left">
      <div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Repair Services
        </h2>
      </div>

      <div className="relative overflow-hidden border border-slate-100 p-8 sm:p-12 rounded-lg group min-h-[453px] flex items-center" style={{backgroundImage: 'url(/posters/service-carousel-bg.png)', backgroundSize: 'cover', backgroundPosition: 'center'}}>
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative max-w-2xl space-y-6">
          <h3 className="text-3xl sm:text-4xl font-bold text-white">
            {current.service_name}
          </h3>
          <p className="text-base sm:text-lg text-white/90">
            {current.long_description || current.short_description}
          </p>
          <div className="flex items-center gap-4">
            <span className="inline-block bg-white/20 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur">
              {current.service_category}
            </span>
            <button
              onClick={() => navigate(`/services?category=${current.service_category}`)}
              className="bg-slate-300 hover:bg-slate-400 text-slate-700 font-bold py-2.5 px-6 rounded-lg transition-all inline-block"
            >
              Book Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceCategories;
