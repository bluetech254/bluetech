import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Settings, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import Button from '../common/Button';

export const Hero = () => {
  const navigate = useNavigate();

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-blue-700 via-blue-600 to-purple-600 text-white py-16 sm:py-24 lg:py-32 rounded-3xl shadow-xl shadow-blue-100 animate-fade-in text-left px-6 sm:px-12 md:px-16 lg:px-20">
      {/* Decorative radial gradients */}
      <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-2xl space-y-6 sm:space-y-8">
        <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-xs px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase border border-white/10">
          <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-pulse-custom" />
          <span>Professional Tech Hub in Kenya</span>
        </div>

        <div className="space-y-3 sm:space-y-4">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
            Welcome to <span className="text-yellow-300">BlueTech</span>
          </h1>
          <p className="text-lg sm:text-xl text-white/90 font-medium max-w-xl leading-relaxed">
            Your Premium Technology Partner. Explore high-performance hardware or book certified expert repair services with full warranties.
          </p>
        </div>

        {/* Action CTAs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
          <Button
            variant="secondary"
            onClick={() => navigate('/products')}
            leftIcon={<ShoppingCart className="w-5 h-5" />}
            className="bg-white hover:bg-slate-50 text-blue-700 hover:shadow-lg py-4 font-bold rounded-xl transition-all"
          >
            Shop Products
          </Button>
          <Button
            variant="primary"
            onClick={() => navigate('/services')}
            leftIcon={<Settings className="w-5 h-5 text-current" />}
            className="bg-blue-800/80 hover:bg-blue-900 text-white border border-white/10 py-4 font-bold rounded-xl transition-all"
          >
            Book Repair Service
          </Button>
        </div>

        {/* Short bullet values */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-6 border-t border-white/10 text-xs sm:text-sm font-semibold text-white/80">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4.5 h-4.5 text-yellow-300 flex-shrink-0" />
            <span>Certified Mechanics</span>
          </div>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4.5 h-4.5 text-yellow-300 flex-shrink-0" />
            <span>Genuine Spares Only</span>
          </div>
          <div className="flex items-center space-x-2 col-span-2 sm:col-span-1">
            <ShieldCheck className="w-4.5 h-4.5 text-yellow-300 flex-shrink-0" />
            <span>Up to 90 Days Warranty</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
