import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const ServiceCategories = () => {
  const navigate = useNavigate();
  
  const services = [
    {
      image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800&h=443&fit=crop',
      title: 'Phone Repair',
      description: 'Screen replacements, battery retrofits, and charging solutions',
      category: 'Phones'
    },
    {
      image: 'https://images.unsplash.com/photo-1516321318423-f06f70504504?w=800&h=443&fit=crop',
      title: 'Laptop Repair',
      description: 'Keyboard fixes, motherboard repairs, and diagnostics',
      category: 'Laptops'
    },
    {
      image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=800&h=443&fit=crop',
      title: 'Tablet Repair',
      description: 'Screen replacement, battery upgrades, and charging fixes',
      category: 'Tablets'
    },
    {
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&h=443&fit=crop',
      title: 'Audio Devices',
      description: 'Speaker replacement, Bluetooth fixes, and audio restoration',
      category: 'Audio'
    },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % services.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [services.length]);

  const current = services[currentIndex];

  return (
    <div className="space-y-8 text-left">
      <div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Repair Services
        </h2>
      </div>

      <div className="relative overflow-hidden border border-slate-100 h-[493px] group">
        <img
          key={currentIndex}
          src={current.image}
          alt={current.title}
          className="w-full h-full object-cover transition-all duration-1000 animate-fade-in"
        />
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/40" />
        
        {/* Content */}
        <div className="absolute inset-0 flex flex-col items-start justify-center px-6 sm:px-12 text-white">
          <div className="max-w-md space-y-4">
            <h3 className="text-3xl sm:text-4xl font-bold">
              {current.title}
            </h3>
            <p className="text-base sm:text-lg text-white/90">
              {current.description}
            </p>
            <button
              onClick={() => navigate(`/services?category=${current.category}`)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg transition-all inline-block"
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
