import React from 'react';
import Hero from '../components/home/Hero';
import SideCarousel from '../components/home/SideCarousel';
import PromotionalDealsCarousel from '../components/home/PromotionalDealsCarousel';
import FeaturedProducts from '../components/home/FeaturedProducts';
import ServiceCategories from '../components/home/ServiceCategories';
import FeaturedServices from '../components/home/FeaturedServices';
import ShopByCategory from '../components/home/ShopByCategory';
import ServiceCategoriesScroll from '../components/home/ServiceCategoriesScroll';
import MarketingPosters from '../components/home/MarketingPosters';
import NewArrivals from '../components/home/NewArrivals';
import HowItWorks from '../components/home/HowItWorks';

export const HomePage = () => {
  return (
    <div className="space-y-8 pt-0 pb-8 animate-fade-in text-left">
      {/* 1. Hero Promo - 66% width with side poster */}
      <div className="hidden lg:flex gap-[25px]">
        {/* Hero - 2/3 width */}
        <div className="flex-[2]">
          <div className="w-full">
            <Hero />
          </div>
        </div>
        
        {/* Side Poster Carousel */}
        <SideCarousel />
      </div>

      {/* Mobile Hero */}
      <div className="lg:hidden -mx-4 sm:-mx-6">
        <Hero />
      </div>

      {/* 2. Products & Services Balance Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 -mb-2">
        {/* Featured Products */}
        <FeaturedProducts />
        
        {/* Featured Services - Desktop Only */}
        <div className="hidden lg:block">
          <ServiceCategories />
        </div>
      </div>

      {/* Mobile: Marketing Posters */}
      <div className="lg:hidden -mx-4 sm:-mx-6">
        <MarketingPosters />
      </div>

      {/* Mobile: Featured Services */}
      <div className="lg:hidden mt-8">
        <FeaturedServices />
      </div>

      {/* 3. Services Carousel - Desktop Only */}
      <div className="hidden lg:block">
        <FeaturedServices />
      </div>

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
