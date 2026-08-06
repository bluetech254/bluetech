import React, { useState } from 'react';
import { Search, ShoppingBag, User as UserIcon, LogOut, ChevronDown, Heart } from 'lucide-react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useCart } from '../../hooks/useCart';
import SearchModal from './SearchModal';

export const Header = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { itemCount, openCart } = useCart();
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const showSearch = ['/', '/products', '/services'].includes(location.pathname);

  const handleLogout = () => {
    logout();
    setIsUserDropdownOpen(false);
    navigate('/');
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-100 shadow-sm h-14">
      <div className="h-full px-4 sm:px-6 lg:px-[100px] max-w-[1600px] mx-auto flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2">
          <img src="/logo.png" alt="BlueTech" className="h-8 lg:h-10 w-auto object-contain logo-wobble" />
          <span className="text-lg lg:text-2xl font-black tracking-tight text-slate-900">
            Blue<span className="text-blue-600">Tech</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center space-x-8">
          {[['/', 'Home'], ['/products', 'Products'], ['/services', 'Services'], ['/about', 'About'], ['/contact', 'Contact']].map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `text-sm font-semibold tracking-wide transition-colors duration-200 ${isActive ? 'text-blue-600' : 'text-slate-600 hover:text-blue-600'}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Right side icons */}
        <div className="flex items-center space-x-1 sm:space-x-2">
          {/* Search - desktop */}
          {showSearch && (
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="hidden lg:flex p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded-full transition-colors"
            >
              <Search className="h-5 w-5" />
            </button>
          )}

          {/* Wishlist */}
          <Link
            to="/profile"
            className="p-2 text-slate-500 hover:text-rose-500 hover:bg-slate-50 rounded-full transition-colors"
            aria-label="Wishlist"
          >
            <Heart className="h-5 w-5" />
          </Link>

          {/* Cart */}
          <button
            type="button"
            onClick={openCart}
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-50 rounded-full transition-colors relative"
            aria-label="Cart"
          >
            <ShoppingBag className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white ring-2 ring-white">
                {itemCount}
              </span>
            )}
          </button>

          {/* Auth - desktop only */}
          {isAuthenticated && user ? (
            <div className="hidden lg:block relative">
              <button
                type="button"
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                className="flex items-center space-x-1.5 p-1 text-slate-700 hover:text-blue-600 rounded-lg"
              >
                <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center font-bold text-sm text-blue-600">
                  {getInitials(user.full_name)}
                </div>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>

              {isUserDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsUserDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2.5 w-48 rounded-xl bg-white py-1 shadow-lg ring-1 ring-black/5 z-50 border border-slate-50">
                    <div className="px-4 py-2.5 border-b border-slate-50">
                      <p className="text-xs text-slate-400">Signed in as</p>
                      <p className="text-sm font-bold text-slate-900 truncate">{user.full_name}</p>
                    </div>
                    <Link to="/profile" onClick={() => setIsUserDropdownOpen(false)} className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 font-medium">My Profile</Link>
                    <Link to="/orders" onClick={() => setIsUserDropdownOpen(false)} className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 font-medium">My Orders & Repairs</Link>
                    <Link to="/track-order" onClick={() => setIsUserDropdownOpen(false)} className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 font-medium">Track Orders</Link>
                    <button type="button" onClick={handleLogout} className="w-full flex items-center px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 font-medium border-t border-slate-50">
                      <LogOut className="h-4 w-4 mr-2" />Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link to="/login" className="hidden lg:inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2 px-4 rounded-lg shadow-sm transition-all">
              Sign In
            </Link>
          )}
        </div>
      </div>

      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {/* Mobile search bar */}
      {showSearch && (
        <div className="lg:hidden w-full bg-white border-b border-slate-100 px-1 py-1 -mt-1">
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="w-full flex items-center gap-3 bg-slate-200 hover:bg-slate-300 text-slate-600 px-2 py-1.5 rounded-lg transition-colors"
          >
            <Search className="h-5 w-5" />
            <span className="text-sm">Search products, repairs...</span>
          </button>
        </div>
      )}
    </header>
  );
};

export default Header;
