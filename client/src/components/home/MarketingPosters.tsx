import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Wrench } from 'lucide-react';

export const MarketingPosters = () => {
  const navigate = useNavigate();
  const [productIndex, setProductIndex] = useState(0);
  const [serviceIndex, setServiceIndex] = useState(0);

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

  useEffect(() => {
    const interval = setInterval(() => {
      setProductIndex((prev) => (prev + 1) % productImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [productImages.length]);

  useEffect(() => {
    const interval = setInterval(() => {
      setServiceIndex((prev) => (prev + 1) % serviceImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [serviceImages.length]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Products Poster */}
      <div
        className="relative overflow-hidden rounded-lg h-64 group cursor-pointer"
        onClick={() => navigate('/products')}
      >
        <img
          key={productIndex}
          src={productImages[productIndex]}
          alt="Premium Products"
          className="w-full h-full object-cover transition-all duration-1000 animate-fade-in group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-all duration-300" />
        
        <div className="absolute inset-0 flex flex-col items-start justify-end p-6 sm:p-8 text-white">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-6 h-6" />
              <h3 className="text-2xl sm:text-3xl font-bold">Premium Products</h3>
            </div>
            <p className="text-sm sm:text-base text-white/90 max-w-xs">
              Genuine electronics and accessories with guaranteed quality
            </p>
            <button className="bg-white hover:bg-slate-50 text-slate-900 font-bold py-2 px-4 rounded-lg transition-all text-sm">
              Shop Now
            </button>
          </div>
        </div>
      </div>

      {/* Services Poster */}
      <div
        className="relative overflow-hidden rounded-lg h-64 group cursor-pointer"
        onClick={() => navigate('/services')}
      >
        <img
          key={serviceIndex}
          src={serviceImages[serviceIndex]}
          alt="Expert Services"
          className="w-full h-full object-cover transition-all duration-1000 animate-fade-in group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-all duration-300" />
        
        <div className="absolute inset-0 flex flex-col items-start justify-end p-6 sm:p-8 text-white">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Wrench className="w-6 h-6" />
              <h3 className="text-2xl sm:text-3xl font-bold">Expert Services</h3>
            </div>
            <p className="text-sm sm:text-base text-white/90 max-w-xs">
              Professional repairs with certified technicians and warranty
            </p>
            <button className="bg-slate-300 hover:bg-slate-400 text-slate-700 font-bold py-2 px-4 rounded-lg transition-all text-sm">
              Book Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketingPosters;
