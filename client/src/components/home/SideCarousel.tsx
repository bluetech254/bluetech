import React, { useState, useEffect } from 'react';

export const SideCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const images = [
    '/posters/side-poster.png',
    '/posters/side-poster-2.png'
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 -mt-8 overflow-hidden bg-white flex items-stretch">
      <img 
        src={images[currentIndex]} 
        alt="Promotion" 
        className="w-full h-[600px] object-contain transition-opacity duration-1000"
      />
    </div>
  );
};

export default SideCarousel;
