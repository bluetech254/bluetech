import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

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
import ContactPage from './pages/ContactPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import AboutPage from './pages/AboutPage';
import ReturnsPage from './pages/ReturnsPage';
import WarrantyPage from './pages/WarrantyPage';
import FAQsPage from './pages/FAQsPage';

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/products" element={<ProductsPage />} />
      <Route path="/products/:id" element={<ProductDetailPage />} />
      <Route path="/services" element={<ServicesPage />} />
      <Route path="/book-repair/:serviceId" element={<BookRepairPage />} />
      <Route path="/cart" element={<CartPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/order-success/:orderId" element={<OrderSuccessPage />} />
      <Route path="/booking-success/:bookingId" element={<BookingSuccessPage />} />
      <Route path="/track-order" element={<TrackOrderPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/returns" element={<ReturnsPage />} />
      <Route path="/warranty" element={<WarrantyPage />} />
      <Route path="/faqs" element={<FAQsPage />} />
      
      {/* Catch-all fallback redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
