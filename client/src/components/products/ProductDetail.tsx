import React, { useState } from 'react';
import { ShoppingCart, Check, Loader2, ShieldCheck, Truck, RefreshCw, ZoomIn, X } from 'lucide-react';
import { Product } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useCart } from '../../hooks/useCart';
import Button from '../common/Button';
import Badge from '../common/Badge';
import QuantityStepper from '../common/QuantityStepper';
import { buildOrderMessage, openWhatsApp } from '../../utils/whatsapp';

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
            <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
              {name}
            </h1>

            {/* ID / SKU */}
            <p className="text-xs text-slate-400 font-mono">
              Product ID: {id}
            </p>

            {/* Price */}
            <div className="text-2xl font-black text-blue-600 pt-1">
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
              <div className="flex items-center gap-3">
                {/* Picker */}
                <QuantityStepper
                  quantity={quantity}
                  max={stock_quantity}
                  onDecrement={handleDecrement}
                  onIncrement={handleIncrement}
                />

                {/* Add to Cart */}
                <Button
                  variant={added ? 'secondary' : 'primary'}
                  onClick={handleAddToCart}
                  disabled={isAdding}
                  leftIcon={added ? <Check className="w-4 h-4 text-green-600" /> : <ShoppingCart className="w-4 h-4" />}
                  className="flex-1 py-2 sm:py-2.5 text-xs sm:text-sm font-bold"
                >
                  <span className="hidden sm:inline">{isAdding ? 'Adding...' : added ? 'Added to Cart' : 'Add to Cart'}</span>
                  <span className="sm:hidden">{isAdding ? '...' : added ? 'Added!' : 'Add'}</span>
                </Button>

                {/* Order via WhatsApp */}
                <button
                  type="button"
                  onClick={() =>
                    openWhatsApp(
                      buildOrderMessage({
                        items: [{ name: name || 'Product', quantity, price }],
                        subtotal: price * quantity,
                        total: price * quantity,
                      })
                    )
                  }
                  className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border-2 border-green-500 text-green-600 bg-white hover:bg-green-50 font-bold text-xs sm:text-sm transition-colors cursor-pointer flex-shrink-0"
                  title="Order via WhatsApp"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  <span className="hidden sm:inline">WhatsApp</span>
                </button>
              </div>
            )}

            {/* Out of Stock CTA */}
            {stock_quantity <= 0 && (
              <div className="space-y-3">
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-800 text-sm font-medium">
                  We're sorry! This product is currently out of stock. Contact our workshop if you need to place a custom order or inquiry.
                </div>
                <button
                  type="button"
                  onClick={() =>
                    openWhatsApp(
                      buildOrderMessage({
                        items: [{ name: name || 'Product', quantity: 1, price }],
                        subtotal: price,
                        total: price,
                      })
                    )
                  }
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-green-500 text-green-600 bg-white hover:bg-green-50 font-bold text-sm transition-colors cursor-pointer"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  Enquire via WhatsApp
                </button>
              </div>
            )}

            {/* Values / Benefits list */}
            <div className="grid grid-cols-3 gap-2 pt-2 text-left">
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
      {(() => {
        let specs: Record<string, any> = {};
        try {
          specs = typeof specifications === 'string' ? JSON.parse(specifications) : (specifications || {});
        } catch { specs = {}; }
        const entries = Object.entries(specs).filter(([key]) => !['brand', 'category'].includes(key));
        if (!entries.length) return null;
        return (
          <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6 md:p-8 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2.5">
              Technical Specifications
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-0 text-sm">
              {entries.map(([key, val]) => (
                <div key={key} className="flex justify-between py-2.5 border-b border-slate-200 last:border-0">
                  <span className="font-semibold text-slate-500 capitalize">{key.replace(/_/g, ' ')}</span>
                  <span className="font-bold text-slate-900 text-right ml-4">{String(val)}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

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
