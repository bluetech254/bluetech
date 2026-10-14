import React from 'react';
import { Clock, Shield, Smartphone, Laptop, Tablet, Headphones, Gamepad, Watch, Wrench, ArrowRight } from 'lucide-react';
import { RepairService } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useNavigate } from 'react-router-dom';
import Card from '../common/Card';
import Badge from '../common/Badge';
import { buildBookingMessage, openWhatsApp } from '../../utils/whatsapp';

interface ServiceCardProps {
  service: RepairService;
  key?: any;
}

export const ServiceCard = ({ service }: ServiceCardProps) => {
  const navigate = useNavigate();
  const { id, name, category, price, estimated_duration, warranty_period } = service;

  // Dynamically select an icon based on category keywords
  const getCategoryIcon = (cat: string) => {
    const check = cat.toLowerCase();
    if (check.includes('phone') || check.includes('mobile')) return <Smartphone className="w-4 h-4 text-blue-600" />;
    if (check.includes('laptop') || check.includes('computer')) return <Laptop className="w-4 h-4 text-blue-600" />;
    if (check.includes('tablet') || check.includes('ipad')) return <Tablet className="w-4 h-4 text-blue-600" />;
    if (check.includes('audio') || check.includes('headphone') || check.includes('speaker')) return <Headphones className="w-4 h-4 text-blue-600" />;
    if (check.includes('game') || check.includes('gaming') || check.includes('console')) return <Gamepad className="w-4 h-4 text-blue-600" />;
    if (check.includes('watch') || check.includes('wearable') || check.includes('smartwatch')) return <Watch className="w-4 h-4 text-blue-600" />;
    return <Wrench className="w-4 h-4 text-blue-600" />;
  };

  const handleBookNow = () => {
    navigate(`/book-repair/${id}`);
  };

  return (
    <Card variant="hover" className="flex flex-col h-full justify-between p-2 md:p-3 lg:p-4 text-center border border-slate-100 bg-white">
      {/* Icon / Brand Circle */}
      <div className="flex justify-center mb-1.5 md:mb-2">
        <div className="w-8 md:w-9 lg:w-10 h-8 md:h-9 lg:h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
          {getCategoryIcon(category)}
        </div>
      </div>

      {/* Title & Badge */}
      <div className="space-y-1 md:space-y-1.5">
        <h3 className="text-xs md:text-sm lg:text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
          {name}
        </h3>
        <span className="inline-block">
          <Badge variant="info" className="capitalize text-[10px] md:text-xs lg:text-sm px-1.5 md:px-2 py-0.5 md:py-1">
            {category}
          </Badge>
        </span>
      </div>

      {/* Badges / metadata */}
      <div className="border-t border-b border-slate-50 py-1.5 md:py-2 my-0.5 grid grid-cols-2 gap-1 md:gap-1.5 text-xs text-slate-500 text-left font-medium">
        <div className="flex items-center space-x-0.5">
          <Clock className="w-2.5 md:w-3 h-2.5 md:h-3 text-slate-400 flex-shrink-0" />
          <span className="truncate">{estimated_duration}</span>
        </div>
        <div className="flex items-center space-x-0.5">
          <Shield className="w-2.5 md:w-3 h-2.5 md:h-3 text-slate-400 flex-shrink-0" />
          <span className="truncate">{warranty_period || '30 Days'}</span>
        </div>
      </div>

      {/* Book CTA Button */}
      <button
        type="button"
        onClick={handleBookNow}
        className="w-full mt-1.5 md:mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 md:py-2 lg:py-2.5 px-2 md:px-3 rounded-md flex items-center justify-center space-x-1 text-[10px] md:text-xs lg:text-sm uppercase tracking-wider cursor-pointer shadow-sm hover:shadow-md transition-all"
      >
        <span>Book</span>
        <ArrowRight className="w-3 md:w-3.5 h-3 md:h-3.5" />
      </button>

      {/* Book via WhatsApp */}
      <button
        type="button"
        onClick={() => openWhatsApp(buildBookingMessage({ serviceName: name, deviceType: category }))}
        className="w-full mt-1 md:mt-1.5 flex items-center justify-center gap-1 py-1.5 md:py-2 px-2 rounded-md border border-green-500 text-green-600 bg-white hover:bg-green-50 font-bold text-[9px] md:text-[10px] lg:text-xs transition-colors cursor-pointer"
        title="Book this service via WhatsApp"
      >
        <svg viewBox="0 0 24 24" className="w-2.5 md:w-3 h-2.5 md:h-3 fill-current flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        <span>WhatsApp</span>
      </button>
    </Card>
  );
};

export default ServiceCard;
