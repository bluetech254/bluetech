import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRepairServices } from '../../api/services';
import { ArrowRight, Smartphone, Laptop, Tablet, Headphones, Gamepad, Watch, Wrench, Monitor, Camera, Speaker } from 'lucide-react';

const iconMap: { [key: string]: React.ReactNode } = {
  'Phone': <Smartphone className="w-6 h-6 text-blue-600" />,
  'Phones': <Smartphone className="w-6 h-6 text-blue-600" />,
  'Laptop': <Laptop className="w-6 h-6 text-blue-600" />,
  'Laptops': <Laptop className="w-6 h-6 text-blue-600" />,
  'Tablet': <Tablet className="w-6 h-6 text-blue-600" />,
  'Tablets': <Tablet className="w-6 h-6 text-blue-600" />,
  'Audio': <Headphones className="w-6 h-6 text-blue-600" />,
  'Headphones': <Headphones className="w-6 h-6 text-blue-600" />,
  'Gaming': <Gamepad className="w-6 h-6 text-blue-600" />,
  'Wearables': <Watch className="w-6 h-6 text-blue-600" />,
  'Monitor': <Monitor className="w-6 h-6 text-blue-600" />,
  'Camera': <Camera className="w-6 h-6 text-blue-600" />,
  'Speaker': <Speaker className="w-6 h-6 text-blue-600" />,
};

const getIcon = (category: string) => {
  const key = Object.keys(iconMap).find(k => category.toLowerCase().includes(k.toLowerCase()));
  return key ? iconMap[key] : <Wrench className="w-6 h-6 text-blue-600" />;
};

export const ServiceCategories = () => {
  const navigate = useNavigate();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getRepairServices({ limit: 50 });
        const servicesByCategory: { [key: string]: any } = {};
        (data || []).forEach((s: any) => {
          if (s.category && !servicesByCategory[s.category]) {
            servicesByCategory[s.category] = s;
          }
        });
        setServices(Object.values(servicesByCategory));
      } catch (err) {
        console.error('Failed to load services:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading || services.length === 0) return null;

  const Card = ({ service, id }: { service: any; id: string }) => (
    <div
      key={id}
      className={`flex-shrink-0 w-44 bg-white border border-slate-200 p-4 flex flex-col items-start justify-between h-32 transition-all duration-300 ${hoveredIdx === parseInt(id) ? 'scale-125 -translate-y-8 animate-shake' : ''}`}
      onMouseEnter={() => setHoveredIdx(parseInt(id))}
      onMouseLeave={() => setHoveredIdx(null)}
    >
      <div className="space-y-1">
        {getIcon(service.category)}
        <h3 className="text-sm font-bold text-slate-900">{service.category}</h3>
      </div>
      <button
        onClick={() => navigate(`/services?category=${service.category}`)}
        className="flex items-center gap-1 text-slate-600 hover:text-black font-semibold text-xs cursor-pointer"
      >
        Explore
        <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Our Service Categories
        </h2>
      </div>

      <div className="overflow-hidden">
        <div className={`flex gap-4 ${hoveredIdx === null ? 'animate-scroll-reverse' : ''}`}>
          {services.map((s, i) => <Card key={i} service={s} id={`${i}`} />)}
          {services.map((s, i) => <Card key={`dup-${i}`} service={s} id={`dup-${i}`} />)}
        </div>
      </div>
    </div>
  );
};

export default ServiceCategories;
