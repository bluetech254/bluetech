import React from 'react';
import Hero from '../components/home/Hero';
import FeaturedProducts from '../components/home/FeaturedProducts';
import ServiceCategories from '../components/home/ServiceCategories';
import Testimonials from '../components/home/Testimonials';
import { Truck, ShieldCheck, Headphones, MapPin, Star } from 'lucide-react';

export const HomePage = () => {
  return (
    <div className="space-y-16 py-8 animate-fade-in text-left">
      {/* 1. Hero Promo */}
      <Hero />

      {/* 2. Featured Products Grid */}
      <FeaturedProducts />

      {/* 3. Service Categories */}
      <ServiceCategories />

      {/* 4. Why Choose Us Section */}
      <div className="space-y-8">
        <div className="text-center sm:text-left">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Why BlueTech?
          </h2>
          <p className="text-sm text-slate-500 mt-1 max-w-xl">
            We provide specialized retail gadgets and expert technical support matching premium industry guidelines.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 flex flex-col items-start space-y-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-blue-50 border border-blue-100 text-blue-600 rounded-xl flex items-center justify-center shadow-inner">
              <Truck className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 text-base">Express Delivery</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                We coordinate dispatch within 12 hours of payment across Nairobi. Track shipping progress in real-time from our portal.
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 flex flex-col items-start space-y-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-blue-50 border border-blue-100 text-blue-600 rounded-xl flex items-center justify-center shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 text-base">Quality Guaranteed</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                All retail items are 100% genuine hardware. Every motherboard repair or component replacement carries up to 90 days warranty.
              </p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 flex flex-col items-start space-y-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-blue-50 border border-blue-100 text-blue-600 rounded-xl flex items-center justify-center shadow-inner">
              <Headphones className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 text-base">Certified Workshop Support</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Receive diagnostics and consultations directly from certified systems and micro-soldering hardware engineers.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Testimonials Review Loop */}
      <Testimonials />
    </div>
  );
};

export default HomePage;
