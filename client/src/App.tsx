/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import CartDrawer from './components/layout/CartDrawer';
import AppRoutes from './router';

// Scroll to Top helper on route changes
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as any });
  }, [pathname]);

  return null;
};

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <NotificationProvider>
          <AuthProvider>
            <CartProvider>
              <ScrollToTop />
              <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 font-sans">
                {/* Header Navigation */}
                <Header />

                {/* Main page stage */}
                <main className="flex-1 w-full py-8 md:py-12">
                  <div className="px-4 sm:px-6 lg:px-[100px]">
                    <AppRoutes />
                  </div>
                </main>

                {/* Main Footer */}
                <Footer />

                {/* Cart Drawer */}
                <CartDrawer />
              </div>
            </CartProvider>
          </AuthProvider>
        </NotificationProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

