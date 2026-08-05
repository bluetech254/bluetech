import React from 'react';
import { Wrench } from 'lucide-react';
import RotatingPosterCard from '../common/RotatingPosterCard';

const images = [
  'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1516321318423-f06f70504504?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=600&h=400&fit=crop',
];

export const ExpertServicesPoster = () => (
  <RotatingPosterCard
    images={images}
    title="Expert Services"
    description="Professional repairs with certified technicians and warranty"
    ctaLabel="Book Now"
    navigateTo="/services"
    icon={<Wrench className="w-6 h-6" />}
    ctaClassName="bg-slate-300 hover:bg-slate-400 text-slate-700"
    className="h-80 md:h-64"
  />
);

export default ExpertServicesPoster;
