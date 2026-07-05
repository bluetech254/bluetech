import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Settings } from 'lucide-react';
import { getProducts } from '../../api/products';
import { Product } from '../../types';

const transitions = ['swipeLeft', 'swipeRight', 'slideUp', 'slideDown', 'fadeOut', 'zoomOut'];

export const Hero = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState(1);
  const [transition, setTransition] = useState('fadeOut');
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await getProducts({ limit: 10 });
        setProducts(response.products || []);
      } catch (err) {
        console.error('Failed to load products:', err);
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    if (products.length === 0) return;
    
    const interval = setInterval(() => {
      setTransition(transitions[Math.floor(Math.random() * transitions.length)]);
      setIsTransitioning(true);
      
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % products.length);
        setNextIndex((prev) => (prev + 1) % products.length);
        setIsTransitioning(false);
      }, 1000);
    }, 6000);

    return () => clearInterval(interval);
  }, [products.length]);

  const currentProduct = products[currentIndex];
  const imageUrl = currentProduct?.images?.[0] || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&h=400&fit=crop';

  return (
    <div className="relative overflow-hidden animate-fade-in w-full h-80 sm:h-[467px] md:h-[567px] lg:h-[667px] bg-slate-100 -mt-8">
      <img
        src={imageUrl}
        alt="BlueTech Hero"
        className={`w-full h-full object-cover transition-all duration-1000 ${
          isTransitioning ? (
            transition === 'swipeLeft' ? 'animate-swipe-left' :
            transition === 'swipeRight' ? 'animate-swipe-right' :
            transition === 'slideUp' ? 'animate-slide-up' :
            transition === 'slideDown' ? 'animate-slide-down' :
            transition === 'fadeOut' ? 'animate-fade-out' :
            'animate-zoom-out'
          ) : ''
        }`}
      />
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40" />
      
      {/* Content */}
      <div className="absolute inset-0 flex flex-col items-start justify-end px-4 sm:px-12 md:px-16 lg:px-20 pb-8 sm:pb-12 md:pb-16 lg:pb-20 text-white">
        <div className="max-w-2xl space-y-2 sm:space-y-4">
          <h1 className="text-xl sm:text-3xl md:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
            Latest Tech Gadgets & Accessories
          </h1>
          <p className="hidden sm:block text-sm sm:text-lg md:text-xl text-white/90 font-medium max-w-xl leading-relaxed">
            Discover premium electronics and expert repair services. Shop genuine products or book certified technicians for professional support.
          </p>
          
          {/* Buttons */}
          <div className="flex items-center gap-3 sm:gap-4 pt-4 w-full sm:w-auto">
            <button
              onClick={() => navigate('/products')}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white/95 hover:bg-white text-slate-900 font-semibold py-2.5 px-6 rounded-lg transition-all backdrop-blur-sm border border-white/20 cursor-pointer hover:cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" />
              Shop Now
            </button>
            <button
              onClick={() => navigate('/services')}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-300/40 hover:bg-slate-300/60 text-slate-700 font-semibold py-2.5 px-6 rounded-lg transition-all backdrop-blur-sm border border-slate-300/50 cursor-pointer hover:cursor-pointer"
            >
              <Settings className="w-4 h-4" />
              Book Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
