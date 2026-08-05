import React from 'react';
import { ShoppingCart } from 'lucide-react';
import RotatingPosterCard from '../common/RotatingPosterCard';

const images = [
  'https://images.unsplash.com/photo-1511707267537-b85faf00021e?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=400&fit=crop',
];

export const PremiumProductsPoster = () => (
  <RotatingPosterCard
    images={images}
    title="Premium Products"
    description="Genuine electronics and accessories with guaranteed quality"
    ctaLabel="Shop Now"
    navigateTo="/products"
    icon={<ShoppingCart className="w-6 h-6" />}
    ctaClassName="bg-white hover:bg-slate-50 text-slate-900"
    className="h-80 md:h-64"
  />
);

export default PremiumProductsPoster;
