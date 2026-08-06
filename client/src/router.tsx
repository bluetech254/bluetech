import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/common/ProtectedRoute';

// Import Pages
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import ServicesPage from './pages/ServicesPage';
import BookRepairPage from './pages/BookRepairPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderSuccessPage from './pages/OrderSuccessPage';
import BookingSuccessPage from './pages/BookingSuccessPage';
import TrackOrderPage from './pages/TrackOrderPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import VerifyPhonePage from './pages/VerifyPhonePage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import PointsPage from './pages/PointsPage';
import OrdersPage from './pages/OrdersPage';
import OrderDetailPage from './pages/OrderDetailPage';
import BookingDetailPage from './pages/BookingDetailPage';
import ContactPage from './pages/ContactPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import CookiePolicyPage from './pages/CookiePolicyPage';
import AboutPage from './pages/AboutPage';
import ReturnsPage from './pages/ReturnsPage';
import WarrantyPage from './pages/WarrantyPage';
import FAQsPage from './pages/FAQsPage';
import HotDealsPage from './pages/HotDealsPage';
import BlogPage from './pages/BlogPage';
import CareersPage from './pages/CareersPage';

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/products" element={<ProductsPage />} />
      <Route path="/products/:id" element={<ProductDetailPage />} />
      <Route path="/services" element={<ServicesPage />} />
      <Route path="/book-repair/:serviceId" element={<ProtectedRoute><BookRepairPage /></ProtectedRoute>} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
      <Route path="/order-success/:orderId" element={<ProtectedRoute><OrderSuccessPage /></ProtectedRoute>} />
      <Route path="/booking-success/:bookingId" element={<ProtectedRoute><BookingSuccessPage /></ProtectedRoute>} />
      <Route path="/track-order" element={<ProtectedRoute><TrackOrderPage /></ProtectedRoute>} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-phone" element={<VerifyPhonePage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/points" element={<ProtectedRoute><PointsPage /></ProtectedRoute>} />
      <Route path="/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
      <Route path="/orders/:id" element={<ProtectedRoute><OrderDetailPage /></ProtectedRoute>} />
      <Route path="/bookings/:id" element={<ProtectedRoute><BookingDetailPage /></ProtectedRoute>} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
      <Route path="/terms-of-service" element={<TermsOfServicePage />} />
      <Route path="/cookie-policy" element={<CookiePolicyPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/returns" element={<ReturnsPage />} />
      <Route path="/warranty" element={<WarrantyPage />} />
      <Route path="/faqs" element={<FAQsPage />} />
      <Route path="/hot-deals" element={<HotDealsPage />} />
      <Route path="/blog" element={<BlogPage />} />
      <Route path="/careers" element={<CareersPage />} />
      
      {/* Catch-all fallback redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
