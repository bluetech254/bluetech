import React from 'react';
import { Smartphone, Laptop, Tablet, Headphones, Gamepad, Watch, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Card from '../common/Card';

export const ServiceCategories = () => {
  const categories = [
    {
      title: 'Phone Repair',
      description: 'Screen replacements, battery retrofits, and charging terminal solutions for iOS & Android smartphones.',
      icon: <Smartphone className="w-10 h-10 text-blue-600" />,
      categoryName: 'Phones',
    },
    {
      title: 'Laptop Repair',
      description: 'Keyboard fixes, motherboard chip repairs, operating system diagnostics, and hardware performance tune-ups.',
      icon: <Laptop className="w-10 h-10 text-blue-600" />,
      categoryName: 'Laptops',
    },
    {
      title: 'Tablet Repair',
      description: 'Certified digitizer and glass replacement, battery upgrades, and charging system diagnostics.',
      icon: <Tablet className="w-10 h-10 text-blue-600" />,
      categoryName: 'Tablets',
    },
    {
      title: 'Audio Devices',
      description: 'Headphone speaker replacement, Bluetooth circuit debugging, and dynamic audio transducer fixes.',
      icon: <Headphones className="w-10 h-10 text-blue-600" />,
      categoryName: 'Audio',
    },
    {
      title: 'Gaming Systems',
      description: 'Console disk drive solutions, heat dissipation fan upgrades, controller analog drift repairs, and software flashes.',
      icon: <Gamepad className="w-10 h-10 text-blue-600" />,
      categoryName: 'Gaming',
    },
    {
      title: 'Smart Wearables',
      description: 'Smartwatch sensor screen fixes, battery modifications, and housing water resistance restorations.',
      icon: <Watch className="w-10 h-10 text-blue-600" />,
      categoryName: 'Wearables',
    },
  ];

  return (
    <div className="space-y-8 text-left">
      <div className="text-center sm:text-left">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Repair Services by Device
        </h2>
        <p className="text-sm text-slate-500 mt-1 max-w-xl">
          We provide specialist hardware restorations, micro-soldering, and technical diagnosis for a wide range of devices.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((cat, idx) => (
          <Card key={idx} variant="hover" className="p-6 flex flex-col justify-between space-y-4 border border-slate-100 bg-white">
            <div className="space-y-3.5">
              <div className="w-14 h-14 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center shadow-inner">
                {cat.icon}
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {cat.title}
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed min-h-15">
                {cat.description}
              </p>
            </div>

            <div className="pt-2">
              <Link
                to={`/services?category=${encodeURIComponent(cat.categoryName)}`}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center space-x-1 uppercase tracking-wider"
              >
                <span>View {cat.title}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ServiceCategories;
