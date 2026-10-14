import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { X, Home, ShoppingBag, ShieldAlert, Phone, User, Settings, ArrowRight, Info } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileNav = ({ isOpen, onClose }: MobileNavProps) => {
  const { user, isAuthenticated, logout } = useAuth();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300" 
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-xs bg-white shadow-2xl flex flex-col justify-between animate-slide-in-right transition-all">
        <div>
          {/* Top Header */}
          <div className="flex items-center justify-between px-5 py-5 border-b border-slate-100">
            <Link to="/" onClick={onClose} className="flex items-center space-x-2">
              <img src="/logo.png" alt="Fixit Blue Technology" className="h-8 w-auto object-contain logo-wobble" />
              <span className="flex flex-col leading-none">
                <span className="brand-fixit text-xl">Fixit</span>
                <span className="text-[10px] font-black tracking-widest text-blue-600 uppercase mt-0.5">Blue Technology</span>
              </span>
            </Link>
            <button
              type="button"
              className="rounded-md text-slate-400 hover:text-slate-500 hover:bg-slate-50 p-1.5 focus:outline-none"
              onClick={onClose}
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {/* Nav Links Stacking */}
          <nav className="px-3 py-6 space-y-1.5">
            <NavLink
              to="/"
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center justify-between px-4 py-3 text-base font-semibold rounded-xl transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'
                }`
              }
            >
              <div className="flex items-center">
                <Home className="w-5 h-5 mr-3 text-current" />
                <span>Home</span>
              </div>
              <ArrowRight className="w-4 h-4" />
            </NavLink>
            
            <NavLink
              to="/products"
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center justify-between px-4 py-3 text-base font-semibold rounded-xl transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'
                }`
              }
            >
              <div className="flex items-center">
                <ShoppingBag className="w-5 h-5 mr-3 text-current" />
                <span>Products Catalog</span>
              </div>
              <ArrowRight className="w-4 h-4" />
            </NavLink>
            
            <NavLink
              to="/services"
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center justify-between px-4 py-3 text-base font-semibold rounded-xl transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'
                }`
              }
            >
              <div className="flex items-center">
                <Settings className="w-5 h-5 mr-3 text-current" />
                <span>Repair Services</span>
              </div>
              <ArrowRight className="w-4 h-4" />
            </NavLink>

            <NavLink
              to="/about"
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center justify-between px-4 py-3 text-base font-semibold rounded-xl transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'
                }`
              }
            >
              <div className="flex items-center">
                <Info className="w-5 h-5 mr-3 text-current" />
                <span>About Us</span>
              </div>
              <ArrowRight className="w-4 h-4" />
            </NavLink>

            <NavLink
              to="/contact"
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center justify-between px-4 py-3 text-base font-semibold rounded-xl transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'
                }`
              }
            >
              <div className="flex items-center">
                <Phone className="w-5 h-5 mr-3 text-current" />
                <span>Contact Us</span>
              </div>
              <ArrowRight className="w-4 h-4" />
            </NavLink>

            <NavLink
              to="/track-order"
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center justify-between px-4 py-3 text-base font-semibold rounded-xl transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'
                }`
              }
            >
              <div className="flex items-center">
                <ShieldAlert className="w-5 h-5 mr-3 text-current" />
                <span>Track Orders & Repairs</span>
              </div>
              <ArrowRight className="w-4 h-4" />
            </NavLink>
          </nav>
        </div>

        {/* Bottom Drawer Controls */}
        <div className="p-5 border-t border-slate-100 bg-slate-50">
          {isAuthenticated && user ? (
            <div className="space-y-3.5">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center font-bold text-blue-700 text-sm">
                  {user.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-sm font-bold text-slate-900 truncate">{user.full_name}</p>
                  <p className="text-xs text-slate-500 truncate">{user.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/profile"
                  onClick={onClose}
                  className="flex items-center justify-center bg-white border border-slate-200 rounded-lg text-xs font-semibold py-2.5 text-slate-700"
                >
                  My Profile
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    onClose();
                  }}
                  className="flex items-center justify-center bg-red-50 hover:bg-red-100 rounded-lg text-xs font-semibold py-2.5 text-red-600 border border-red-100 cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              <p className="text-xs text-slate-500 text-center mb-2">Sign in to sync your purchase history & book services faster</p>
              <Link
                to="/login"
                onClick={onClose}
                className="w-full inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl shadow-sm text-sm"
              >
                Sign In
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Link>
              <Link
                to="/register"
                onClick={onClose}
                className="w-full inline-flex items-center justify-center bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold py-3 px-4 rounded-xl text-sm"
              >
                Create Account
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileNav;
