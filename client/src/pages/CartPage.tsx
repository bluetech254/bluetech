import React from 'react';
import { useCart } from '../hooks/useCart';
import CartItem from '../components/cart/CartItem';
import CartSummary from '../components/cart/CartSummary';
import EmptyCart from '../components/cart/EmptyCart';
import { ChevronLeft, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';

export const CartPage = () => {
  const { items } = useCart();

  return (
    <div className="space-y-8 py-6 animate-fade-in text-left">
      {/* Breadcrumbs & Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="text-xs text-slate-400 font-bold uppercase tracking-wider space-x-1">
            <Link to="/" className="hover:text-blue-600">Home</Link>
            <span>/</span>
            <span className="text-blue-600">Shopping Cart</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1.5 flex items-center">
            <ShoppingBag className="w-7 h-7 mr-2 text-blue-600" />
            Your Shopping Cart
          </h1>
        </div>
        <Link to="/products" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center">
          <ChevronLeft className="w-4 h-4 mr-1" />
          Continue Shopping
        </Link>
      </div>

      {/* Cart Content */}
      {items.length === 0 ? (
        <EmptyCart />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left Panel: Items List (70%) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="space-y-4">
              {items.map((item) => (
                <CartItem key={item.product.id} item={item} />
              ))}
            </div>
            
            <div className="pt-4 text-left">
              <Link
                to="/products"
                className="inline-flex items-center text-sm font-bold text-blue-600 hover:text-blue-700 group cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
                Add More Items
              </Link>
            </div>
          </div>

          {/* Right Panel: Cart Summary (30%) */}
          <div className="lg:col-span-1">
            <CartSummary />
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;
