import React, { useEffect } from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import CartDrawer from './components/layout/CartDrawer';
import BottomTabBar from './components/layout/BottomTabBar';
import AppRoutes from './router';

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as any });
  }, [pathname]);
  return null;
};

const Layout = () => {
  const { pathname } = useLocation();
  const isAuthPage = ['/login', '/register', '/verify-phone', '/forgot-password'].includes(pathname);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Header />
      <main className={`flex-1 w-full ${isAuthPage ? 'flex items-center justify-center overflow-hidden' : 'py-8 md:py-12 pb-20 lg:pb-12'}`}>
        <div className={isAuthPage ? 'w-full px-4' : 'px-4 sm:px-6 lg:px-[100px]'}>
          <AppRoutes />
        </div>
      </main>
      {!isAuthPage && <Footer />}
      <CartDrawer />
      <BottomTabBar />
    </div>
  );
};
export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <NotificationProvider>
          <AuthProvider>
            <CartProvider>
              <ScrollToTop />
              <Layout />
            </CartProvider>
          </AuthProvider>
        </NotificationProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

