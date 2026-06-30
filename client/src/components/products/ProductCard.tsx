import React, { useState } from 'react';
import { ShoppingCart, Check, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Product } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useCart } from '../../hooks/useCart';
import Card from '../common/Card';
import Badge from '../common/Badge';

interface ProductCardProps {
  product: Product;
  key?: any;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const { addItem } = useCart();
  const [isAdding, setIsAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const { id, name, category, price, stock_quantity, images, brand } = product;
  const hasImage = images && images.length > 0;
  const imageUrl = hasImage ? images[0] : 'https://placehold.co/400x400?text=Product';

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (stock_quantity <= 0) return;
    
    setIsAdding(true);
    setTimeout(() => {
      addItem(product, 1);
      setIsAdding(false);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    }, 600);
  };

  // Stock status text & color
  const getStockStatus = () => {
    if (stock_quantity === 0) {
      return <span className="text-red-600 text-xs font-semibold">Out of Stock</span>;
    } else if (stock_quantity < 5) {
      return <span className="text-orange-600 text-xs font-semibold">Only {stock_quantity} left</span>;
    } else {
      return <span className="text-green-600 text-xs font-semibold">In Stock</span>;
    }
  };

  return (
    <Card variant="hover" className="flex flex-col h-full group relative">
      {/* Out of Stock Floating Badge */}
      {stock_quantity === 0 && (
        <div className="absolute top-3 right-3 z-10">
          <Badge variant="error">Out of Stock</Badge>
        </div>
      )}

      {/* Product Image Link */}
      <Link to={`/products/${id}`} className="block overflow-hidden relative aspect-square bg-slate-50 border-b border-slate-100">
        <img
          src={imageUrl}
          alt={name}
          referrerPolicy="no-referrer"
          loading="lazy"
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
        />
      </Link>

      {/* Card Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Category & Brand */}
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1 font-medium capitalize">
            <span>{brand || 'BlueTech'}</span>
            <span>{category}</span>
          </div>

          {/* Title */}
          <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 min-h-10 text-left">
            <Link to={`/products/${id}`}>
              {name}
            </Link>
          </h3>
        </div>

        {/* Pricing, Stock Status & Button */}
        <div className="mt-4 pt-3 border-t border-slate-50 space-y-3">
          <div className="flex items-end justify-between">
            <div className="text-lg font-black text-blue-600">
              {formatCurrency(price)}
            </div>
            <div>
              {getStockStatus()}
            </div>
          </div>

          {/* Add to Cart button */}
          <button
            type="button"
            disabled={stock_quantity === 0 || isAdding}
            onClick={handleAddToCart}
            className={`
              w-full py-2.5 px-4 rounded-lg font-semibold text-xs tracking-wider uppercase flex items-center justify-center transition-all cursor-pointer
              ${stock_quantity === 0 
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' 
                : added 
                  ? 'bg-green-500 hover:bg-green-600 text-white shadow-sm' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
              }
            `}
          >
            {isAdding ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                <span>Adding...</span>
              </>
            ) : added ? (
              <>
                <Check className="w-4 h-4 mr-1.5 text-white" />
                <span>Added</span>
              </>
            ) : (
              <>
                <ShoppingCart className="w-4 h-4 mr-1.5" />
                <span>Add to Cart</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Card>
  );
};

export default ProductCard;
