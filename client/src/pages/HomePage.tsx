import React from 'react';
import Hero from '../components/home/Hero';
import PromotionalDealsCarousel from '../components/home/PromotionalDealsCarousel';
import FeaturedProducts from '../components/home/FeaturedProducts';
import ServiceCategories from '../components/home/ServiceCategories';
import FeaturedServices from '../components/home/FeaturedServices';
import ShopByCategory from '../components/home/ShopByCategory';
import ServiceCategoriesScroll from '../components/home/ServiceCategoriesScroll';
import MarketingPosters from '../components/home/MarketingPosters';
import PremiumProductsPoster from '../components/home/PremiumProductsPoster';
import ExpertServicesPoster from '../components/home/ExpertServicesPoster';
import NewArrivals from '../components/home/NewArrivals';
import HowItWorks from '../components/home/HowItWorks';

import ProductCategoriesGrid from '../components/home/ProductCategoriesGrid';

export const HomePage = () => {
  return (
    <div className="space-y-8 pt-0 pb-8 animate-fade-in text-left">
      {/* Hero - full width */}
      <div className="-mx-4 sm:-mx-6">
        <Hero />
      </div>

      {/* Product Categories */}
      <ProductCategoriesGrid />

      {/* 2. Products & Services Balance Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 -mb-2">
        {/* Featured Products */}
        <FeaturedProducts />
        
        {/* Featured Services - Desktop Only */}
        <div className="hidden lg:block">
          <ServiceCategories />
        </div>
      </div>

      {/* Mobile: Premium Products Poster */}
      <div className="md:hidden -mx-4 sm:-mx-6">
        <PremiumProductsPoster />
      </div>

      {/* Mobile: Expert Services Poster */}
      <div className="md:hidden -mx-4 sm:-mx-6">
        <ExpertServicesPoster />
      </div>

      {/* 3. Services Carousel — single mount, internally responsive */}
      <FeaturedServices />

      {/* 4. Promotional Deals Carousel */}
      <PromotionalDealsCarousel />

      {/* 4. Shop by Category */}
      <ShopByCategory />

      {/* 5. Service Categories Scroll */}
      <ServiceCategoriesScroll />

      {/* 6. Marketing Posters - Desktop Only */}
      <div className="hidden lg:block">
        <MarketingPosters />
      </div>

      {/* 7. New Arrivals */}
      <NewArrivals />

      {/* 8. How It Works */}
      <HowItWorks />
    </div>
  );
};

export default HomePage;
