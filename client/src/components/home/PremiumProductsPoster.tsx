import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';

export const PremiumProductsPoster = () => {
  const navigate = useNavigate();
  const [productIndex, setProductIndex] = useState(0);

  const productImages = [
    'https://images.unsplash.com/photo-1511707267537-b85faf00021e?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=400&fit=crop',
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setProductIndex((prev) => (prev + 1) % productImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [productImages.length]);

  return (
    <div
      className="relative overflow-hidden rounded-lg h-80 md:h-64 group cursor-pointer"
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
  );
};

export default PremiumProductsPoster;
