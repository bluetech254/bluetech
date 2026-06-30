import React from 'react';
import { X, ShoppingBag, Trash2, Plus, Minus, ArrowRight } from 'lucide-react';
import { useCart } from '../../hooks/useCart';
import { formatCurrency } from '../../utils/formatters';
import Button from '../common/Button';
import { Link, useNavigate } from 'react-router-dom';

export const CartDrawer = () => {
  const { 
    items, 
    subtotal, 
    isCartOpen, 
    closeCart, 
    updateQuantity, 
    removeItem 
  } = useCart();
  
  const navigate = useNavigate();

  if (!isCartOpen) return null;

  const handleCheckoutClick = () => {
    closeCart();
    navigate('/cart');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
      <div className="absolute inset-0 overflow-hidden">
        {/* Backdrop overlay */}
        <div 
          className="absolute inset-0 bg-slate-900/55 backdrop-blur-xs transition-opacity duration-300" 
          onClick={closeCart}
        />

        <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
          <div className="pointer-events-auto w-screen max-w-md transform transition-all duration-300 ease-in-out animate-slide-in">
            <div className="flex h-full flex-col bg-white shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                <div className="flex items-center space-x-2">
                  <ShoppingBag className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-bold text-slate-900" id="slide-over-title">
                    Shopping Cart
                  </h2>
                  <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                    {items.reduce((total, item) => total + item.quantity, 0)}
                  </span>
                </div>
                <button
                  type="button"
                  className="rounded-md text-slate-400 hover:text-slate-500 hover:bg-slate-50 p-1.5 focus:outline-none"
                  onClick={closeCart}
                >
                  <span className="sr-only">Close panel</span>
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <ShoppingBag className="h-16 w-16 text-slate-200 mb-4" />
                    <h3 className="text-base font-semibold text-slate-900 mb-1">Your cart is empty</h3>
                    <p className="text-sm text-slate-500 mb-6 max-w-xs">
                      Explore our products page to find the best tech gadgets and accessories!
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => { closeCart(); navigate('/products'); }}
                    >
                      Start Shopping
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {items.map((item) => {
                      const { product, quantity } = item;
                      const hasImage = product.images && product.images.length > 0;
                      return (
                        <div key={product.id} className="flex py-4 border-b border-slate-100 last:border-0">
                          {/* Thumbnail */}
                          <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                            <img
                              src={hasImage ? product.images[0] : 'https://placehold.co/100x100?text=Product'}
                              alt={product.name}
                              referrerPolicy="no-referrer"
                              className="h-full w-full object-cover object-center"
                            />
                          </div>

                          {/* Details */}
                          <div className="ml-4 flex flex-1 flex-col justify-between">
                            <div>
                              <div className="flex justify-between text-base font-semibold text-slate-900">
                                <h3 className="line-clamp-1">
                                  <Link to={`/products/${product.id}`} onClick={closeCart} className="hover:text-blue-600 transition-colors">
                                    {product.name}
                                  </Link>
                                </h3>
                                <p className="ml-4 text-blue-600 font-bold whitespace-nowrap">
                                  {formatCurrency(product.price * quantity)}
                                </p>
                              </div>
                              <p className="mt-1 text-xs text-slate-400 capitalize">{product.category}</p>
                            </div>
                            
                            <div className="flex items-center justify-between mt-2">
                              {/* Quantity Picker */}
                              <div className="flex items-center border border-slate-200 rounded-lg">
                                <button
                                  type="button"
                                  disabled={quantity <= 1}
                                  onClick={() => updateQuantity(product.id, quantity - 1)}
                                  className="p-1 px-2 text-slate-500 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </button>
                                <span className="px-2 text-sm font-semibold text-slate-900 min-w-6 text-center select-none">
                                  {quantity}
                                </span>
                                <button
                                  type="button"
                                  disabled={quantity >= product.stock_quantity}
                                  onClick={() => updateQuantity(product.id, quantity + 1)}
                                  className="p-1 px-2 text-slate-500 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>

                              {/* Remove Button */}
                              <button
                                type="button"
                                onClick={() => removeItem(product.id)}
                                className="text-red-500 hover:text-red-600 p-1 rounded-md hover:bg-red-50 transition-colors inline-flex items-center text-xs font-semibold"
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Summary Block */}
              {items.length > 0 && (
                <div className="border-t border-slate-100 px-6 py-6 bg-slate-50">
                  <div className="flex justify-between text-base font-bold text-slate-900 mb-1">
                    <span>Subtotal</span>
                    <span className="text-lg text-blue-600">{formatCurrency(subtotal)}</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-5">
                    Delivery fees will be calculated at checkout based on your selected delivery zone.
                  </p>
                  
                  <div className="space-y-3">
                    <Button
                      variant="primary"
                      className="w-full text-base font-bold"
                      onClick={handleCheckoutClick}
                      rightIcon={<ArrowRight className="h-4 w-4" />}
                    >
                      View Cart & Checkout
                    </Button>
                    <Button
                      variant="secondary"
                      className="w-full text-sm font-semibold text-slate-600"
                      onClick={closeCart}
                    >
                      Continue Shopping
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartDrawer;
