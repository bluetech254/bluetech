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
    <div className="space-y-14 py-6 animate-fade-in text-left">

      {/* Breadcrumb */}
      <div>
        <div className="text-xs text-slate-400 font-bold uppercase tracking-wider space-x-1">
          <Link to="/" className="hover:text-blue-600">Home</Link>
          <span>/</span>
          <span className="text-blue-600">About Us</span>
        </div>
      </div>

      {/* Hero */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white rounded-2xl sm:rounded-3xl p-7 sm:p-10 md:p-16 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-72 h-72 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-yellow-300">Est. 2010 · Nairobi, Kenya</p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight leading-tight">
            Nairobi's Most Trusted<br />Electronics Workshop
          </h1>
          <p className="text-sm text-white/90 leading-relaxed max-w-lg">
            BlueTech Electronics was founded with one mission — make premium tech accessible and keep devices running longer. From a single repair bench in 2010 to a full-service electronics hub, we've grown by earning trust one device at a time.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link to="/services" className="inline-flex items-center bg-white text-blue-700 font-bold text-xs px-5 py-2.5 rounded-full hover:bg-blue-50 transition-colors">
              Our Services <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Link>
            <Link to="/contact" className="inline-flex items-center border border-white/40 text-white font-bold text-xs px-5 py-2.5 rounded-full hover:bg-white/10 transition-colors">
              Contact Us
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        <div className="space-y-4">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Our Story</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            BlueTech started as a two-person repair shop on Moi Avenue in 2010. James Kariuki, a self-taught electronics engineer, saw that most Nairobians were discarding repairable devices simply because quality repair services were hard to find and trust.
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            Over the years we expanded — adding a retail floor for premium electronics, building a certified spare parts supply chain, and training a team of specialist engineers. Today we serve thousands of customers monthly across walk-in, online ordering, and corporate accounts.
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            We remain proudly independent, Kenyan-owned, and committed to the same principle that started it all: honest work, fair prices, and devices that last.
          </p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl sm:rounded-3xl p-8 flex flex-col items-center justify-center space-y-3 min-h-[200px] sm:min-h-[260px]">
          <span className="text-4xl sm:text-6xl font-black text-blue-700 tracking-tighter">Blue<span className="text-indigo-500">Tech</span></span>
          <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">Electronics · Nairobi</span>
          <div className="flex items-center text-xs text-slate-400 space-x-1.5 mt-2">
            <MapPin className="w-3.5 h-3.5" />
            <span>Moi Avenue, CBD · Est. 2010</span>
          </div>
        </div>
      </div>

      {/* Values */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">What We Stand For</h2>
          <p className="text-sm text-slate-500 mt-1">The principles that guide every repair, every sale, every interaction.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {values.map(v => (
            <Card key={v.title} className="p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <v.icon className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900">{v.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{v.desc}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Team */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">The Team</h2>
          <p className="text-sm text-slate-500 mt-1">The people behind every diagnosis, every sale, and every satisfied customer.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {team.map(m => (
            <Card key={m.name} className="p-6 space-y-2">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg">
                {m.name.split(' ').map(n => n[0]).join('')}
              </div>
              <p className="font-bold text-slate-900 text-sm">{m.name}</p>
              <p className="text-xs text-blue-600 font-semibold">{m.role}</p>
              <p className="text-[11px] text-slate-400">With BlueTech since {m.since}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Why Choose Us */}
      <div className="bg-slate-50 border border-slate-100 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 space-y-6">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Why Choose BlueTech?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
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
            <div key={item} className="flex items-start space-x-2.5">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-slate-600 font-medium">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-blue-600 text-white rounded-2xl sm:rounded-3xl p-7 sm:p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
        <div className="space-y-1">
          <h2 className="text-xl font-black tracking-tight">Ready to work with us?</h2>
          <p className="text-sm text-blue-100">Book a repair, browse our catalog, or just say hello.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3 flex-shrink-0">
          <Link to="/services" className="bg-white text-blue-700 font-bold text-xs px-6 py-3 rounded-full hover:bg-blue-50 transition-colors">
            Book a Repair
          </Link>
          <Link to="/products" className="border border-white/40 text-white font-bold text-xs px-6 py-3 rounded-full hover:bg-white/10 transition-colors">
            Shop Products
          </Link>
          <Link to="/contact" className="border border-white/40 text-white font-bold text-xs px-6 py-3 rounded-full hover:bg-white/10 transition-colors">
            Contact Us
          </Link>
        </div>
      </div>

    </div>
  );
};

export default AboutPage;
