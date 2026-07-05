import React, { useState } from 'react';
import { Search, ShoppingBag, User as UserIcon, Menu, LogOut, ChevronDown, Wrench } from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import SearchModal from './SearchModal';
import MobileNav from './MobileNav';

export const Header = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { itemCount, openCart } = useCart();
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    setIsUserDropdownOpen(false);
    navigate('/');
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-100 shadow-sm h-14">
      <div className="h-full px-4 sm:px-6 lg:max-w-none lg:px-[100px] lg:mx-0 flex items-center justify-between">
        {/* Mobile: Left Side - Logo Icon & BlueTech Name */}
        <Link to="/" className="lg:hidden flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black shadow-md">
            <Wrench className="w-4 h-4" />
          </div>
          <span className="text-lg font-black tracking-tight text-slate-900">
            Blue<span className="text-blue-600">Tech</span>
          </span>
        </Link>

        {/* Desktop: Left Side - Brand */}
        <div className="hidden lg:flex items-center space-x-6">
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black shadow-md shadow-blue-200">
              <Wrench className="w-5 h-5" />
            </div>
            <span className="text-2xl font-black tracking-tight text-slate-900">
              Blue<span className="text-blue-600">Tech</span>
            </span>
          </Link>
        </div>

        {/* Center: Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center space-x-8">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `text-sm font-semibold tracking-wide transition-colors duration-200 ${
                isActive ? 'text-blue-600' : 'text-slate-600 hover:text-blue-600'
              }`
            }
          >
            Home
          </NavLink>
          <NavLink
            to="/products"
            className={({ isActive }) =>
              `text-sm font-semibold tracking-wide transition-colors duration-200 ${
                isActive ? 'text-blue-600' : 'text-slate-600 hover:text-blue-600'
              }`
            }
          >
            Products
          </NavLink>
          <NavLink
            to="/services"
            className={({ isActive }) =>
              `text-sm font-semibold tracking-wide transition-colors duration-200 ${
                isActive ? 'text-blue-600' : 'text-slate-600 hover:text-blue-600'
              }`
            }
          >
            Services
          </NavLink>
          <NavLink
            to="/contact"
            className={({ isActive }) =>
              `text-sm font-semibold tracking-wide transition-colors duration-200 ${
                isActive ? 'text-blue-600' : 'text-slate-600 hover:text-blue-600'
              }`
            }
          >
            Contact
          </NavLink>
        </nav>

        {/* Right Side: Cart, Auth Dropdown */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          {/* Search Trigger - Desktop Only */}
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="hidden lg:block p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded-full transition-colors cursor-pointer"
            aria-label="Search"
          >
            <Search className="h-5.5 w-5.5" />
          </button>

          {/* Cart Trigger */}
          <button
            type="button"
            onClick={openCart}
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded-full transition-colors relative cursor-pointer"
            aria-label="Shopping Cart"
          >
            <ShoppingBag className="h-5.5 w-5.5" />
            {itemCount > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white ring-2 ring-white">
                {itemCount}
              </span>
            )}
          </button>

          {/* Mobile Hamburger Menu */}
          <button
            type="button"
            className="lg:hidden p-2 text-slate-500 hover:text-slate-900 rounded-md focus:outline-none cursor-pointer"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* Auth Controls - Desktop Only */}
          {isAuthenticated && user ? (
            <div className="hidden lg:block relative">
              <button
                type="button"
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                className="flex items-center space-x-2 p-1 text-slate-700 hover:text-blue-600 rounded-lg focus:outline-none cursor-pointer"
              >
                <div className="w-8.5 h-8.5 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center font-bold text-sm text-blue-600 shadow-inner">
                  {getInitials(user.full_name)}
                </div>
                <ChevronDown className="h-4 w-4 hidden sm:block text-slate-400" />
              </button>

              {isUserDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsUserDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2.5 w-48 rounded-xl bg-white py-1 shadow-lg ring-1 ring-black/5 z-50 text-left border border-slate-50">
                    <div className="px-4 py-2.5 border-b border-slate-50">
                      <p className="text-xs text-slate-400 font-medium">Signed in as</p>
                      <p className="text-sm font-bold text-slate-900 truncate">{user.full_name}</p>
                    </div>
                    <Link
                      to="/profile"
                      onClick={() => setIsUserDropdownOpen(false)}
                      className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 font-medium"
                    >
                      My Profile
                    </Link>
                    <Link
                      to="/track-order"
                      onClick={() => setIsUserDropdownOpen(false)}
                      className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 font-medium"
                    >
                      Track Bookings
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 font-medium text-left border-t border-slate-50 cursor-pointer"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="hidden lg:inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2 px-4 rounded-lg shadow-sm transition-all"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>

      {/* Global Search Modal */}
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {/* Mobile Search Bar */}
      <div className="lg:hidden w-full bg-white border-b border-slate-100 px-1 py-1 -mt-1">
        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          className="w-full flex items-center gap-3 bg-slate-200 hover:bg-slate-300 text-slate-600 px-2 lg:px-4 py-1.5 rounded-lg transition-colors cursor-pointer"
        >
          <Search className="h-5 w-5" />
          <span className="text-sm">Search products, repairs...</span>
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      <MobileNav isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
    </header>
  );
};

export default Header;
