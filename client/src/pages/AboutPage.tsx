import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Wrench, Users, Award, MapPin, Phone, Mail, ArrowRight, CheckCircle } from 'lucide-react';
import Card from '../components/common/Card';

const stats = [
  { value: '15+', label: 'Years in Business' },
  { value: '20,000+', label: 'Devices Repaired' },
  { value: '50,000+', label: 'Happy Customers' },
  { value: '98%', label: 'Satisfaction Rate' },
];

const values = [
  { icon: Shield, title: 'Integrity', desc: 'Transparent pricing with no hidden fees. What we quote is what you pay.' },
  { icon: Wrench, title: 'Expertise', desc: 'Certified engineers with hands-on training on all major device brands.' },
  { icon: Award, title: 'Quality', desc: 'OEM-grade parts only. Every repair is bench-tested before handover.' },
  { icon: Users, title: 'Community', desc: 'Proudly Kenyan. We invest in local tech talent and affordable access.' },
];

const team = [
  { name: 'James Kariuki', role: 'Founder & Lead Engineer', since: '2010' },
  { name: 'Amina Hassan', role: 'Head of Customer Experience', since: '2013' },
  { name: 'Brian Otieno', role: 'Senior Hardware Technician', since: '2015' },
  { name: 'Grace Wanjiku', role: 'Sales & Procurement Lead', since: '2017' },
];

export const AboutPage = () => {
  return (
    <div className="space-y-8 md:space-y-10 lg:space-y-14 py-0 md:py-0 animate-fade-in text-left">

      {/* Hero */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white rounded-none sm:rounded-3xl p-7 sm:p-10 md:p-16 relative overflow-hidden -mx-4 sm:mx-0 md:rounded-2xl">
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-72 h-72 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-4 md:space-y-6">
          <p className="text-xs md:text-sm font-bold uppercase tracking-widest text-yellow-300">Est. 2010 · Nairobi, Kenya</p>
          <h1 className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
            Nairobi's Most Trusted<br />Electronics Workshop
          </h1>
          <p className="text-sm md:text-base text-white/90 leading-relaxed max-w-lg">
            BlueTech Electronics was founded with one mission — make premium tech accessible and keep devices running longer. From a single repair bench in 2010 to a full-service electronics hub, we've grown by earning trust one device at a time.
          </p>
          <div className="flex flex-wrap gap-2 sm:gap-3 pt-2 md:pt-4 w-full sm:w-auto">
            <Link to="/services" className="flex-1 sm:flex-none inline-flex items-center justify-center bg-white text-blue-700 font-bold text-[10px] sm:text-xs md:text-sm px-2 sm:px-5 md:px-6 py-1.5 sm:py-2.5 md:py-3 rounded-full hover:bg-blue-50 transition-colors">
              Our Services <ArrowRight className="w-2.5 sm:w-3.5 md:w-4 h-2.5 sm:h-3.5 md:h-4 ml-0.5 sm:ml-1" />
            </Link>
            <Link to="/products" className="flex-1 sm:flex-none inline-flex items-center justify-center bg-white text-blue-700 font-bold text-[10px] sm:text-xs md:text-sm px-2 sm:px-5 md:px-6 py-1.5 sm:py-2.5 md:py-3 rounded-full hover:bg-blue-50 transition-colors">
              Shop Products <ArrowRight className="w-2.5 sm:w-3.5 md:w-4 h-2.5 sm:h-3.5 md:h-4 ml-0.5 sm:ml-1" />
            </Link>
            <Link to="/contact" className="flex-1 sm:flex-none inline-flex items-center justify-center border border-white/40 text-white font-bold text-[10px] sm:text-xs md:text-sm px-2 sm:px-5 md:px-6 py-1.5 sm:py-2.5 md:py-3 rounded-full hover:bg-white/10 transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(s => (
          <Card key={s.label} className="p-6 text-center space-y-1">
            <p className="text-3xl font-black text-blue-600">{s.value}</p>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Story */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10 lg:gap-12 items-stretch">
        <div className="space-y-4 md:space-y-5">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">Our Story</h2>
          <p className="text-sm md:text-base text-slate-600 leading-relaxed">
            BlueTech started as a two-person repair shop on Moi Avenue in 2010. James Kariuki, a self-taught electronics engineer, saw that most Nairobians were discarding repairable devices simply because quality repair services were hard to find and trust.
          </p>
          <p className="text-sm md:text-base text-slate-600 leading-relaxed">
            Over the years we expanded — adding a retail floor for premium electronics, building a certified spare parts supply chain, and training a team of specialist engineers. Today we serve thousands of customers monthly across walk-in, online ordering, and corporate accounts.
          </p>
          <p className="text-sm md:text-base text-slate-600 leading-relaxed">
            We remain proudly independent, Kenyan-owned, and committed to the same principle that started it all: honest work, fair prices, and devices that last.
          </p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl sm:rounded-3xl p-4 md:p-6 lg:p-8 relative overflow-hidden h-full min-h-[300px] sm:min-h-[350px] md:min-h-[400px]">
          {/* Logo Top-Left */}
          <div className="absolute top-4 left-4 z-10">
            <img src="/logo.png" alt="BlueTech" className="h-10 md:h-12 w-auto object-contain" />
          </div>
          
          {/* Map */}
          <iframe
            width="100%"
            height="100%"
            style={{ border: 'none', borderRadius: '12px' }}
            src="https://www.openstreetmap.org/export/embed.html?bbox=36.8189,-1.2873,36.8249,-1.2854&layer=mapnik&marker=-1.28639,36.82194"
            allowFullScreen
          />
        </div>
      </div>

      {/* Values */}
      <div className="space-y-6 md:space-y-8">
        <div>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">What We Stand For</h2>
          <p className="text-sm md:text-base text-slate-500 mt-1 md:mt-2">The principles that guide every repair, every sale, every interaction.</p>
        </div>
        {/* Mobile: 2x2 Grid */}
        <div className="md:hidden grid grid-cols-2 gap-4 max-w-2xl">
          {values.map(v => (
            <Card key={v.title} className="p-4 space-y-3 flex flex-col items-center justify-center text-center w-44 h-44">
              <div className="w-12 h-12 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                <v.icon className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">{v.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{v.desc}</p>
            </Card>
          ))}
        </div>
        {/* Tablet+: Original 4 Column Layout */}
        <div className="hidden md:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 lg:gap-6">
          {values.map(v => (
            <Card key={v.title} className="p-5 md:p-6 lg:p-7 space-y-3 md:space-y-4">
              <div className="w-10 md:w-11 h-10 md:h-11 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <v.icon className="w-5 md:w-6 h-5 md:h-6" />
              </div>
              <h3 className="font-bold md:text-lg text-slate-900">{v.title}</h3>
              <p className="text-xs md:text-sm text-slate-500 leading-relaxed">{v.desc}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Why Choose Us */}
      <div className="bg-slate-50 border border-slate-100 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 lg:p-16 space-y-6 md:space-y-8">
        <h2 className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">Why Choose BlueTech?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 lg:gap-5 text-sm md:text-base">
          {[
            'Free diagnostics when repair is completed in-store',
            'Up to 90-day warranty on all repair work',
            'Genuine OEM-grade spare parts only',
            'Same-day repair on most common issues',
            'Secure data handling — your files stay private',
            'Corporate & bulk device servicing available',
            'Online booking with real-time status updates',
            'Transparent itemized invoicing on every job',
          ].map(item => (
            <div key={item} className="flex items-start space-x-2.5 md:space-x-3">
              <CheckCircle className="w-4 md:w-5 h-4 md:h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-slate-600 font-medium">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-blue-600 text-white rounded-2xl sm:rounded-3xl p-7 sm:p-8 md:p-12 lg:p-16 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8 text-center md:text-left">
        <div className="space-y-1 md:space-y-2">
          <h2 className="text-xl md:text-2xl lg:text-3xl font-black tracking-tight">Ready to work with us?</h2>
          <p className="text-sm md:text-base text-blue-100">Book a repair, browse our catalog, or just say hello.</p>
        </div>
        <div className="flex flex-wrap justify-center md:justify-end gap-3 flex-shrink-0">
          <Link to="/services" className="bg-white text-blue-700 font-bold text-xs md:text-sm px-6 md:px-7 py-3 md:py-3.5 rounded-full hover:bg-blue-50 transition-colors">
            Book a Repair
          </Link>
          <Link to="/products" className="border border-white/40 text-white font-bold text-xs md:text-sm px-6 md:px-7 py-3 md:py-3.5 rounded-full hover:bg-white/10 transition-colors">
            Shop Products
          </Link>
          <Link to="/contact" className="border border-white/40 text-white font-bold text-xs md:text-sm px-6 md:px-7 py-3 md:py-3.5 rounded-full hover:bg-white/10 transition-colors">
            Contact Us
          </Link>
        </div>
      </div>

    </div>
  );
};

export default AboutPage;
