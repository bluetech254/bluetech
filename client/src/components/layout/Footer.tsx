import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Facebook, Twitter, Instagram, Send, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

export const Footer = () => {
  const [email, setEmail] = useState('');

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    toast.success('Successfully subscribed to our newsletter!');
    setEmail('');
  };

  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Column 1: About */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center space-x-2">
              <span className="text-2xl font-black tracking-tight text-white">
                Blue<span className="text-blue-500">Tech</span>
              </span>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed">
              Kenya's premier technology retailer and professional repair services provider. We deliver premium hardware and certified engineering support under one roof.
            </p>
            <div className="flex space-x-4 pt-2">
              <a href="#" className="p-2 bg-slate-800 hover:bg-blue-600 hover:text-white rounded-full transition-all duration-200" aria-label="Facebook">
                <Facebook className="w-4.5 h-4.5" />
              </a>
              <a href="#" className="p-2 bg-slate-800 hover:bg-blue-400 hover:text-white rounded-full transition-all duration-200" aria-label="Twitter">
                <Twitter className="w-4.5 h-4.5" />
              </a>
              <a href="#" className="p-2 bg-slate-800 hover:bg-pink-600 hover:text-white rounded-full transition-all duration-200" aria-label="Instagram">
                <Instagram className="w-4.5 h-4.5" />
              </a>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h3 className="text-white text-base font-bold mb-4 tracking-wide">Quick Navigation</h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/products" className="hover:text-blue-400 transition-colors">Products Catalog</Link>
              </li>
              <li>
                <Link to="/services" className="hover:text-blue-400 transition-colors">Repair Services</Link>
              </li>
              <li>
                <Link to="/track-order" className="hover:text-blue-400 transition-colors">Track Order & Bookings</Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-blue-400 transition-colors">Contact Support</Link>
              </li>
              <li>
                <Link to="/profile" className="hover:text-blue-400 transition-colors">My Account</Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Contact */}
          <div className="space-y-3.5">
            <h3 className="text-white text-base font-bold mb-4 tracking-wide">Get in Touch</h3>
            <div className="flex items-start text-sm space-x-3">
              <Phone className="w-4.5 h-4.5 text-blue-500 mt-1 flex-shrink-0" />
              <div>
                <p className="text-slate-400 text-xs">Phone Line</p>
                <a href="tel:+254700000000" className="text-slate-200 hover:text-blue-400 font-medium">+254 700 000 000</a>
              </div>
            </div>
            
            <div className="flex items-start text-sm space-x-3">
              <Mail className="w-4.5 h-4.5 text-blue-500 mt-1 flex-shrink-0" />
              <div>
                <p className="text-slate-400 text-xs">Email Address</p>
                <a href="mailto:info@bluetech.co.ke" className="text-slate-200 hover:text-blue-400 font-medium">info@bluetech.co.ke</a>
              </div>
            </div>

            <div className="flex items-start text-sm space-x-3">
              <MapPin className="w-4.5 h-4.5 text-blue-500 mt-1 flex-shrink-0" />
              <div>
                <p className="text-slate-400 text-xs">Main Workshop</p>
                <p className="text-slate-200 font-medium">Nairobi, Kenya</p>
              </div>
            </div>
          </div>

          {/* Column 4: Newsletter */}
          <div className="space-y-4">
            <h3 className="text-white text-base font-bold mb-1 tracking-wide flex items-center">
              <Sparkles className="w-4 h-4 text-blue-500 mr-1.5" />
              Join the Tech Club
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Subscribe to receive latest stock alerts, discount campaign vouchers, and repair guides.
            </p>
            <form onSubmit={handleSubscribe} className="space-y-2">
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1.5 p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors cursor-pointer"
                  aria-label="Subscribe"
                >
                  <Send className="w-4.5 h-4.5" />
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-800 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 space-y-4 sm:space-y-0">
          <p>© {new Date().getFullYear()} BlueTech. All rights reserved.</p>
          <div className="flex space-x-6">
            <a href="#" className="hover:text-slate-300">Terms of Service</a>
            <a href="#" className="hover:text-slate-300">Privacy Policy</a>
            <a href="#" className="hover:text-slate-300">Cookie Preferences</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
