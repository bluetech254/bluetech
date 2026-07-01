import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function WelcomeOverlay() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('bluetech_welcome_seen');
    if (hasSeenWelcome) {
      setIsVisible(false);
    }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem('bluetech_welcome_seen', 'true');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Translucent background blur */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Welcome card */}
      <div className="relative z-10 animate-scale-in">
        <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-8 md:p-12 max-w-2xl w-full border border-white/20">
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-slate-600" />
          </button>

          {/* Content */}
          <div className="text-center space-y-6 animate-slide-in-up">
            {/* Logo */}
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-4xl font-bold text-white">BT</span>
              </div>
            </div>

            {/* Main heading */}
            <div className="space-y-3">
              <h1 className="text-4xl md:text-5xl font-bold gradient-text">
                Welcome to BlueTech
              </h1>
              <p className="text-xl text-slate-600">
                Your trusted electronics shop & repair center
              </p>
            </div>

            {/* Description */}
            <p className="text-slate-500 text-lg leading-relaxed max-w-lg mx-auto">
              Discover premium gadgets, expert repair services, and unmatched customer support. 
              We're here to keep your devices running perfectly.
            </p>

            {/* CTA Button */}
            <div className="pt-4">
              <button
                onClick={handleClose}
                className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg hover-scale transition-smooth"
              >
                Explore Now
              </button>
            </div>

            {/* Features */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-200">
              <div className="space-y-1">
                <div className="text-2xl font-bold text-blue-600">100%</div>
                <div className="text-xs text-slate-500">Genuine Products</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-blue-600">24/7</div>
                <div className="text-xs text-slate-500">Customer Support</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-blue-600">90 Days</div>
                <div className="text-xs text-slate-500">Warranty</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
