import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Zap, Heart, Star, Users, Award, CheckCircle, ArrowRight, Quote } from 'lucide-react';
import Card from '../components/common/Card';

const stats = [
  { value: '5+', label: 'Years in Business' },
  { value: '2,000+', label: 'Laptops Repaired' },
  { value: '3,000+', label: 'Phones Repaired' },
  { value: '7,000+', label: 'Satisfied Customers' },
];

const values = [
  { icon: Shield, title: 'Integrity', desc: 'We uphold honesty, transparency, and ethical practices in every interaction with our clients, partners, and team members.' },
  { icon: Zap, title: 'Innovation', desc: 'We embrace change and continuously seek new ideas and technologies to provide modern, efficient solutions.' },
  { icon: Heart, title: 'Customer Focus', desc: 'Our clients are at the heart of everything we do. We listen, understand, and go the extra mile to exceed expectations.' },
  { icon: Star, title: 'Quality Service', desc: 'We are committed to delivering reliable, high-quality services in sales, marketing, and repairs, every time.' },
  { icon: Users, title: 'Teamwork', desc: 'We believe in the power of collaboration, mutual respect, and shared goals to drive success.' },
  { icon: Award, title: 'Accountability', desc: 'We take responsibility for our actions and deliver on our promises with professionalism and dedication.' },
];

export const AboutPage = () => {
  return (
    <div className="space-y-8 md:space-y-12 py-0 animate-fade-in text-left">

      {/* Hero */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white rounded-none sm:rounded-3xl p-7 sm:p-10 md:p-16 relative overflow-hidden -mx-4 sm:mx-0">
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-72 h-72 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-2xl space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-yellow-300">Founded in Nairobi, Kenya</p>
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-black tracking-tight leading-tight">
            Where Innovation<br />Meets Reliability
          </h1>
          <p className="text-sm md:text-base text-white/90 leading-relaxed max-w-lg">
            Blue Technology is a dynamic, customer-driven company specializing in sales, marketing, and professional repair services for electronics such as phones and laptops. Founded with a vision to bridge the gap between people and technology.
          </p>
          <div className="flex flex-wrap gap-2 sm:gap-3 pt-2">
            <Link to="/services" className="flex-1 sm:flex-none inline-flex items-center justify-center bg-white text-blue-700 font-bold text-xs sm:text-sm px-4 sm:px-6 py-2 sm:py-3 rounded-full hover:bg-blue-50 transition-colors">
              Our Services <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
            <Link to="/contact" className="flex-1 sm:flex-none inline-flex items-center justify-center border border-white/40 text-white font-bold text-xs sm:text-sm px-4 sm:px-6 py-2 sm:py-3 rounded-full hover:bg-white/10 transition-colors">
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

      {/* About Us */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        <div className="space-y-4">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">About Us</h2>
          <p className="text-sm md:text-base text-slate-600 leading-relaxed">
            At Blue Technology, we are passionate about transforming lives through cutting-edge tech solutions. Founded in Nairobi, we specialize in sales, marketing, and repair services for phones, laptops, and a wide range of consumer electronics.
          </p>
          <p className="text-sm md:text-base text-slate-600 leading-relaxed">
            Our mission is to provide innovative, reliable, and affordable technology solutions that empower individuals and businesses alike. Whether you're purchasing a new device, boosting your brand visibility through marketing, or getting your gadget back to top shape, we're here to deliver excellence.
          </p>
          <p className="text-sm md:text-base text-slate-600 leading-relaxed">
            With a customer-first approach and a skilled team, we ensure professional service, fast turnaround times, and transparent communication every step of the way.
          </p>
          <p className="text-sm font-bold text-blue-600 italic">Let's build the future together, one device at a time.</p>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-8 space-y-4">
          <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Why Choose Us</h3>
          <div className="space-y-3">
            {[
              'Free diagnostics when repair is completed in-store',
              'Up to 90-day warranty on all repair work',
              'Genuine OEM-grade spare parts only',
              'Same-day repair on most common issues',
              'Secure data handling — your files stay private',
              'Transparent pricing, no hidden fees',
              'Online booking with real-time status updates',
            ].map(item => (
              <div key={item} className="flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-slate-600 font-medium">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mission & Vision */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 md:p-8 space-y-3 border-l-4 border-blue-600">
          <h2 className="text-xl font-black text-slate-900">Our Mission</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            To deliver innovative, reliable, and customer-focused technology solutions that enhance everyday life. We are committed to providing exceptional sales, marketing, and repair services that meet the evolving needs of individuals and businesses in a fast-paced digital world. We strive to build lasting relationships through integrity, quality, and professionalism, ensuring that every client experience is seamless, supportive, and satisfying.
          </p>
        </Card>
        <Card className="p-6 md:p-8 space-y-3 border-l-4 border-indigo-600">
          <h2 className="text-xl font-black text-slate-900">Our Vision</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            To become a leading tech solutions provider in Africa, recognized for our innovation, trustworthiness, and commitment to excellence. We aim to bridge the gap between people and technology by making high-quality digital products and services accessible, affordable, and impactful. We envision a future where every individual and business thrives through smart, sustainable, and cutting-edge technology solutions.
          </p>
        </Card>
      </div>

      {/* Core Values */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Our Core Values</h2>
          <p className="text-sm text-slate-500 mt-1">The principles that guide every repair, every sale, every interaction.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {values.map(v => (
            <Card key={v.title} className="p-5 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <v.icon className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900">{v.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{v.desc}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Founder */}
      <div className="bg-slate-50 border border-slate-100 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12">
        <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-6">Meet Our Founder</h2>
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 overflow-hidden border-4 border-blue-200">
            <Users className="w-12 h-12 text-blue-400" />
          </div>
          <div className="space-y-3 flex-1">
            <div>
              <h3 className="text-lg font-black text-slate-900">Steve Rabare</h3>
              <p className="text-sm font-bold text-blue-600">Founder & CEO</p>
            </div>
            <blockquote className="flex items-start gap-2 text-sm text-slate-600 italic leading-relaxed">
              <Quote className="w-4 h-4 text-blue-300 flex-shrink-0 mt-0.5" />
              "It takes 20 years to build a reputation and 5 minutes to ruin it. If you think about that, you'll do things differently."
            </blockquote>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-1">
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Awarded Best Group Leader at ICT LAB</p>
              <p className="text-xs text-slate-600 leading-relaxed">
                "I got a chance to be awarded as the best group leader after successfully leading my team to become the best in the circuit board analysis contest organised by ICT LAB in Nairobi."
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-blue-600 text-white rounded-2xl sm:rounded-3xl p-7 sm:p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
        <div className="space-y-1">
          <h2 className="text-xl md:text-2xl font-black tracking-tight">Ready to work with us?</h2>
          <p className="text-sm text-blue-100">Book a repair, browse our catalog, or just say hello.</p>
        </div>
        <div className="flex flex-wrap justify-center md:justify-end gap-3 flex-shrink-0">
          <Link to="/services" className="bg-white text-blue-700 font-bold text-xs md:text-sm px-6 py-3 rounded-full hover:bg-blue-50 transition-colors">
            Book a Repair
          </Link>
          <Link to="/contact" className="border border-white/40 text-white font-bold text-xs md:text-sm px-6 py-3 rounded-full hover:bg-white/10 transition-colors">
            Contact Us
          </Link>
        </div>
      </div>

    </div>
  );
};

export default AboutPage;
