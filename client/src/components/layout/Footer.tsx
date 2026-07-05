import React from 'react';
import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800">
      <div className="px-4 sm:px-6 lg:max-w-none lg:px-[100px] lg:mx-0 py-12">
        {/* Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Brand */}
          <div className="space-y-3">
            <Link to="/" className="flex items-center space-x-2">
              <span className="text-2xl font-black tracking-tight text-white">
                Blue<span className="text-blue-500">Tech</span>
              </span>
            </Link>
            <h3 className="text-white font-bold">Electronics</h3>
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              Your trusted destination for premium electronics, expert repairs, and professional tech services since 2010.
            </p>
          </div>

          {/* Links */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="text-white font-bold text-sm mb-3">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/" className="hover:text-blue-400">About Us</Link></li>
                <li><Link to="/products" className="hover:text-blue-400">Products</Link></li>
                <li><Link to="/services" className="hover:text-blue-400">Services</Link></li>
                <li><a href="#" className="hover:text-blue-400">Hot Deals</a></li>
                <li><a href="#" className="hover:text-blue-400">Blog</a></li>
                <li><a href="#" className="hover:text-blue-400">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold text-sm mb-3">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/track-order" className="hover:text-blue-400">Track Order</Link></li>
                <li><a href="#" className="hover:text-blue-400">Returns & Refunds</a></li>
                <li><a href="#" className="hover:text-blue-400">Warranty</a></li>
                <li><a href="#" className="hover:text-blue-400">FAQs</a></li>
                <li><Link to="/contact" className="hover:text-blue-400">Contact Us</Link></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 space-y-3 sm:space-y-0">
          <p>© 2024 BlueTech Electronics. All rights reserved.</p>
          <div className="flex space-x-6">
            <a href="#" className="hover:text-slate-300">Privacy Policy</a>
            <a href="#" className="hover:text-slate-300">Terms of Service</a>
            <a href="#" className="hover:text-slate-300">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
