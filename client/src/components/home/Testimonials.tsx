import React, { useState, useEffect } from 'react';
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import Card from '../common/Card';

export const Testimonials = () => {
  const reviews = [
    {
      name: 'John Kinyua',
      role: 'Business Owner',
      rating: 5,
      comment: 'BlueTech repaired my cracked MacBook Pro screen in under 3 hours! Outstanding speed and professional service. The display is absolutely genuine and bright.',
      date: 'Jun 20, 2026',
    },
    {
      name: 'Mercy Achieng',
      role: 'Creative Designer',
      rating: 5,
      comment: 'I bought my secondary monitor and high-end headphones from their online catalog. The dispatch was same-day and delivery fee was super fair. Highly recommend them!',
      date: 'Jun 15, 2026',
    },
    {
      name: 'Dennis Mutua',
      role: 'Software Engineer',
      rating: 5,
      comment: 'Their micro-soldering team fixed a dead charging controller circuit on my gaming console mother board. I had been told it was beyond repair elsewhere. They saved me a fortune!',
      date: 'Jun 02, 2026',
    },
    {
      name: 'Sarah Wangari',
      role: 'Welfare Director',
      rating: 5,
      comment: 'Extremely professional customer care and clear booking timelines. Their phone tracking updates let me know exactly when my phone was being worked on. Top drawer standard!',
      date: 'May 28, 2026',
    },
  ];

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % reviews.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [reviews.length]);

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + reviews.length) % reviews.length);
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % reviews.length);
  };

  return (
    <div className="space-y-8 text-left bg-slate-50 rounded-3xl border border-slate-100 p-8 md:p-12 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-8 text-slate-100 pointer-events-none">
        <Quote className="w-24 h-24 stroke-[1.5]" />
      </div>

      <div className="max-w-xl relative z-10">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          What Our Clients Say
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Read raw feedback and performance ratings from electronic device buyers and workshop booking clients across Nairobi.
        </p>
      </div>

      {/* Carousel Wrapper */}
      <div className="relative min-h-56 flex flex-col justify-between z-10">
        <div className="animate-fade-in" key={activeIndex}>
          <div className="flex space-x-1 text-amber-400 mb-4">
            {Array.from({ length: reviews[activeIndex].rating }).map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-current" />
            ))}
          </div>
          
          <blockquote className="text-base sm:text-lg text-slate-700 font-medium leading-relaxed italic mb-6">
            "{reviews[activeIndex].comment}"
          </blockquote>

          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 text-sm">
              {reviews[activeIndex].name.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">{reviews[activeIndex].name}</p>
              <p className="text-xs text-slate-400">{reviews[activeIndex].role} • {reviews[activeIndex].date}</p>
            </div>
          </div>
        </div>

        {/* Navigation buttons & indicators */}
        <div className="flex items-center justify-between mt-8 border-t border-slate-200/60 pt-4">
          {/* Indicators */}
          <div className="flex space-x-2">
            {reviews.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveIndex(idx)}
                className={`
                  h-2 rounded-full transition-all cursor-pointer
                  ${activeIndex === idx ? 'w-6 bg-blue-600' : 'w-2 bg-slate-300 hover:bg-slate-400'}
                `}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex space-x-2">
            <button
              onClick={handlePrev}
              className="p-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-lg shadow-sm transition-colors cursor-pointer"
              aria-label="Previous testimonial"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              className="p-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-lg shadow-sm transition-colors cursor-pointer"
              aria-label="Next testimonial"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Testimonials;
