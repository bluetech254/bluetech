import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface RotatingPosterCardProps {
  images: string[];
  title: string;
  description: string;
  ctaLabel: string;
  navigateTo: string;
  icon: React.ReactNode;
  ctaClassName?: string;
  className?: string;
}

const RotatingPosterCard = ({
  images, title, description, ctaLabel, navigateTo, icon, ctaClassName = '', className = '',
}: RotatingPosterCardProps) => {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex(i => (i + 1) % images.length), 5000);
    return () => clearInterval(id);
  }, [images.length]);

  return (
    <div
      className={`relative overflow-hidden rounded-lg group cursor-pointer ${className}`}
      onClick={() => navigate(navigateTo)}
    >
      <img
        key={index}
        src={images[index]}
        alt={title}
        className="w-full h-full object-cover transition-all duration-1000 animate-fade-in group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-all duration-300" />
      <div className="absolute inset-0 flex flex-col items-start justify-end p-6 sm:p-8 text-white">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {icon}
            <h3 className="text-2xl sm:text-3xl font-bold">{title}</h3>
          </div>
          <p className="text-sm sm:text-base text-white/90 max-w-xs">{description}</p>
          <button className={`font-bold py-2 px-4 rounded-lg transition-all text-sm ${ctaClassName}`}>
            {ctaLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RotatingPosterCard;
