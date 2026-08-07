import React from 'react';
import { Clock, Shield, Smartphone, Laptop, Tablet, Headphones, Gamepad, Watch, Wrench, ArrowRight } from 'lucide-react';
import { RepairService } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useNavigate } from 'react-router-dom';
import Card from '../common/Card';
import Badge from '../common/Badge';

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
    </Card>
  );
};

export default ServiceCard;
