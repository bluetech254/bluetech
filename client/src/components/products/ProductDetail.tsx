import React, { useState } from 'react';
import { ShoppingCart, Check, Loader2, Plus, Minus, ShieldCheck, Truck, RefreshCw, ZoomIn, X } from 'lucide-react';
import { Product } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useCart } from '../../hooks/useCart';
import Button from '../common/Button';
import Badge from '../common/Badge';

interface ProductDetailProps {
  product: Product;
}

export const ProductDetail = ({ product }: ProductDetailProps) => {
  const { addItem } = useCart();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  const { name, brand, category, price, stock_quantity, description, specifications, images, id } = product;
  const hasImages = images && images.length > 0;
  const activeImage = hasImages ? images[selectedImageIndex] : 'https://placehold.co/600x600?text=Product';

  const handleIncrement = () => {
    if (quantity < stock_quantity) {
      setQuantity(prev => prev + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  const handleAddToCart = () => {
    if (stock_quantity <= 0) return;
    
    setIsAdding(true);
    setTimeout(() => {
      addItem(product, quantity);
      setIsAdding(false);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    }, 600);
  };

  return (
    <div className="space-y-12 text-left">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Left Side: Image Gallery */}
        <div className="space-y-4">
          <div className="relative aspect-square rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-sm group">
            <img
              src={activeImage}
              alt={name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center transition-all"
            />
            
            {/* Click to Zoom Overlay */}
            <button
              onClick={() => setIsZoomOpen(true)}
              className="absolute bottom-4 right-4 p-2.5 bg-white/90 backdrop-blur-xs rounded-full shadow-md text-slate-700 hover:text-blue-600 hover:bg-white transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
              title="Zoom Image"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
          </div>

          {/* Thumbnails */}
          {hasImages && images.length > 1 && (
            <div className="flex space-x-3 overflow-x-auto pb-1">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`
                    w-20 h-20 lg:w-24 lg:h-24 rounded-xl border-2 overflow-hidden bg-white flex-shrink-0 transition-all cursor-pointer
                    ${selectedImageIndex === idx ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-100 hover:border-slate-300'}
                  `}
                >
                  <img
                    src={img}
                    alt={`${name} thumbnail ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Product Info */}
        <div className="flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            {/* Category / Brand / Stock */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs font-semibold">
              <span className="bg-slate-100 text-slate-800 px-2.5 py-1 rounded-md uppercase tracking-wider">
                {brand || 'BlueTech'}
              </span>
              <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md uppercase tracking-wider capitalize">
                {category}
              </span>
              
              {stock_quantity === 0 ? (
                <Badge variant="error">Out of Stock</Badge>
              ) : stock_quantity < 5 ? (
                <Badge variant="warning">Only {stock_quantity} Left</Badge>
              ) : (
                <Badge variant="success">In Stock</Badge>
              )}
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
              {name}
            </h1>

            {/* ID / SKU */}
            <p className="text-xs text-slate-400 font-mono">
              Product ID: {id}
            </p>

            {/* Price */}
            <div className="text-3xl font-black text-blue-600 pt-1">
              {formatCurrency(price)}
            </div>

            {/* Divider */}
            <div className="border-t border-slate-100 pt-4" />

            {/* Description */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Product Overview</h3>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {description}
              </p>
            </div>
          </div>

          <div className="space-y-5 pt-4 border-t border-slate-100">
            {/* Quantity Picker & Add to Cart */}
            {stock_quantity > 0 && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                {/* Picker */}
                <div className="flex items-center justify-between border-2 border-slate-200 rounded-lg p-1.5 bg-white sm:w-36">
                  <button
                    type="button"
                    onClick={handleDecrement}
                    disabled={quantity <= 1}
                    className="p-1.5 rounded-md hover:bg-slate-50 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-bold text-slate-900 min-w-8 text-center select-none">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={handleIncrement}
                    disabled={quantity >= stock_quantity}
                    className="p-1.5 rounded-md hover:bg-slate-50 text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Button */}
                <Button
                  variant={added ? 'secondary' : 'primary'}
                  onClick={handleAddToCart}
                  disabled={isAdding}
                  leftIcon={added ? <Check className="w-5 h-5 text-green-600" /> : <ShoppingCart className="w-5 h-5" />}
                  className="flex-1 py-4 font-bold text-sm tracking-wider uppercase"
                >
                  {isAdding ? 'Processing...' : added ? 'Added to Cart' : 'Add to Cart'}
                </Button>
              </div>
            )}

            {/* Out of Stock CTA */}
            {stock_quantity <= 0 && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-800 text-sm font-medium">
                We're sorry! This product is currently out of stock. Contact our workshop if you need to place a custom order or inquiry.
              </div>
            )}

            {/* Values / Benefits list */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 text-left">
              <div className="flex items-center space-x-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <span className="text-xs font-bold text-slate-700">100% Genuine</span>
              </div>
              <div className="flex items-center space-x-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <Truck className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <span className="text-xs font-bold text-slate-700">Fast Delivery</span>
              </div>
              <div className="flex items-center space-x-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <RefreshCw className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <span className="text-xs font-bold text-slate-700">Easy Returns</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Specifications Grid */}
      {specifications && Object.keys(specifications).length > 0 && (
        <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6 md:p-8 space-y-4">
          <h3 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2.5">
            Technical Specifications
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-3 text-sm">
            {Object.entries(specifications).map(([key, val]) => (
              <div key={key} className="flex justify-between py-2 border-b border-slate-150 last:border-0 md:last:border-b">
                <span className="font-semibold text-slate-500 capitalize">{key.replace(/_/g, ' ')}</span>
                <span className="font-bold text-slate-900">{String(val)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Zoom Image Modal */}
      {isZoomOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <button
            onClick={() => setIsZoomOpen(false)}
            className="absolute top-6 right-6 p-2 bg-white/15 hover:bg-white/20 text-white rounded-full transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={activeImage}
            alt={name}
            referrerPolicy="no-referrer"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl transition-all"
          />
        </div>
      )}
    </div>
  );
};

export default ProductDetail;
