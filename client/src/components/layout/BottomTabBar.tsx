import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, ShoppingBag, Wrench, Star, User } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const tabs = [
  { to: '/', icon: Home, label: 'Home', exact: true },
  { to: '/products', icon: ShoppingBag, label: 'Products' },
  { to: '/services', icon: Wrench, label: 'Services' },
  { to: '/points', icon: Star, label: 'Points', authRequired: true },
  { to: '/profile', icon: User, label: 'Profile', authRequired: true },
];

export const BottomTabBar = () => {
  const { isAuthenticated } = useAuth();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 flex items-stretch h-12 shadow-[0_-2px_12px_rgba(0,0,0,0.07)]">
      {tabs.map(({ to, icon: Icon, label, exact, authRequired }) => (
        <NavLink
          key={to}
          to={authRequired && !isAuthenticated ? '/login' : to}
          end={exact}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors ${
              isActive ? 'text-blue-600' : 'text-slate-400'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
};

export default BottomTabBar;
