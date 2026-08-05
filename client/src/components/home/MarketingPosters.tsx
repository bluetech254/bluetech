import React from 'react';
import { ShoppingCart, Wrench } from 'lucide-react';
import RotatingPosterCard from '../common/RotatingPosterCard';

const productImages = [
  'https://images.unsplash.com/photo-1511707267537-b85faf00021e?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=400&fit=crop',
];

const serviceImages = [
  'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1516321318423-f06f70504504?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&h=400&fit=crop',
];

export const MarketingPosters = () => (
  <>
    {/* Desktop: side by side */}
    <div className="hidden md:grid grid-cols-2 gap-6">
      <RotatingPosterCard images={productImages} title="Premium Products" description="Genuine electronics and accessories with guaranteed quality" ctaLabel="Shop Now" navigateTo="/products" icon={<ShoppingCart className="w-6 h-6" />} ctaClassName="bg-white hover:bg-slate-50 text-slate-900" className="h-80" />
      <RotatingPosterCard images={serviceImages} title="Expert Services" description="Professional repairs with certified technicians and warranty" ctaLabel="Book Now" navigateTo="/services" icon={<Wrench className="w-6 h-6" />} ctaClassName="bg-slate-300 hover:bg-slate-400 text-slate-700" className="h-80" />
    </div>

    {/* Mobile: stacked */}
    <div className="md:hidden space-y-4">
      <RotatingPosterCard images={productImages} title="Premium Products" description="Genuine electronics and accessories with guaranteed quality" ctaLabel="Shop Now" navigateTo="/products" icon={<ShoppingCart className="w-5 h-5" />} ctaClassName="bg-white hover:bg-slate-50 text-slate-900" className="h-64" />
      <RotatingPosterCard images={serviceImages} title="Expert Services" description="Professional repairs with certified technicians and warranty" ctaLabel="Book Now" navigateTo="/services" icon={<Wrench className="w-5 h-5" />} ctaClassName="bg-slate-300 hover:bg-slate-400 text-slate-700" className="h-64" />
    </div>
  </>
);

export default MarketingPosters;
