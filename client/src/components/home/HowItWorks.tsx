import React from 'react';
import { ShoppingCart, Truck, CheckCircle, Wrench, Calendar, Phone } from 'lucide-react';

export const HowItWorks = () => {
  const productSteps = [
    {
      icon: <ShoppingCart className="w-8 h-8 text-blue-600" />,
      title: 'Browse & Select',
      description: 'Explore our wide range of products and add items to your cart'
    },
    {
      icon: <CheckCircle className="w-8 h-8 text-blue-600" />,
      title: 'Checkout',
      description: 'Review your order and complete payment securely'
    },
    {
      icon: <Truck className="w-8 h-8 text-blue-600" />,
      title: 'Delivery',
      description: 'Receive your order at your doorstep with tracking'
    }
  ];

  const serviceSteps = [
    {
      icon: <Phone className="w-8 h-8 text-green-600" />,
      title: 'Book Service',
      description: 'Select your device type and describe the issue'
    },
    {
      icon: <Calendar className="w-8 h-8 text-green-600" />,
      title: 'Schedule',
      description: 'Choose a convenient date and time for repair'
    },
    {
      icon: <Wrench className="w-8 h-8 text-green-600" />,
      title: 'Expert Repair',
      description: 'Our certified technicians fix your device professionally'
    }
  ];

  const StepCard = ({ icon, title, description }: any) => (
    <div className="flex flex-col items-center text-center space-y-2">
      <div className="p-2 bg-slate-100 rounded-lg">
        {icon}
      </div>
      <h3 className="font-bold text-slate-900 text-sm">{title}</h3>
      <p className="text-xs text-slate-600">{description}</p>
    </div>
  );

  return (
    <div className="hidden lg:block space-y-8">
      {/* Product Ordering */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            How to Order Products
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
          {productSteps.map((step, idx) => (
            <div key={idx} className="relative">
              <StepCard {...step} />
              {idx < productSteps.length - 1 && (
                <div className="hidden md:block absolute top-12 -right-4 w-8 h-0.5 bg-blue-300" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Service Booking */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            How to Book a Service
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
          {serviceSteps.map((step, idx) => (
            <div key={idx} className="relative">
              <StepCard {...step} />
              {idx < serviceSteps.length - 1 && (
                <div className="hidden md:block absolute top-12 -right-4 w-8 h-0.5 bg-green-300" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;
