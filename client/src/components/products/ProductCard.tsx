import React, { useState } from 'react';
import { Heart, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Product } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useCart } from '../../hooks/useCart';

interface ProductCardProps {
  product: Product;
  key?: any;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const { addItem } = useCart();
  const [isWishlisted, setIsWishlisted] = useState(false);
  const { id, name, images, price, stock_quantity } = product;
  const hasImage = images && images.length > 0;
  const imageUrl = hasImage ? images[0] : 'https://placehold.co/400x400?text=Product';

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsWishlisted(!isWishlisted);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (stock_quantity > 0) {
      addItem(product, 1);
    }
  };

  return (
    <div className="flex flex-col">
      <Link to={`/products/${id}`} className="block overflow-hidden relative bg-slate-50 border border-slate-100 group mb-1 h-28 md:h-40 lg:h-52">
        <img
          src={imageUrl}
          alt={name}
          referrerPolicy="no-referrer"
          loading="lazy"
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
        />
        
        {/* Wishlist Button */}
        <button
          onClick={handleWishlist}
          className="absolute top-2 right-2 p-2 bg-white/90 hover:bg-white transition-all shadow-sm"
        >
          <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} />
        </button>
      </Link>
      
      {/* Price and Cart Below */}
      <div className="space-y-1.5 md:space-y-2">
        <div className="flex items-center justify-between gap-1">
          <h3 className="text-xs md:text-sm lg:text-base font-semibold text-slate-900 line-clamp-1 flex-1">
            <Link to={`/products/${id}`} className="hover:text-blue-600 transition-colors">
              {name.split(' ').slice(0, 4).join(' ')}
            </Link>
          </h3>
          <div className="text-xs md:text-sm lg:text-base font-bold text-blue-600 whitespace-nowrap">
            {formatCurrency(price)}
          </div>
        </div>
        
        <button
          type="button"
          disabled={stock_quantity === 0}
          onClick={handleAddToCart}
          className="w-full py-1.5 md:py-2 px-2 md:px-3 font-semibold text-[10px] md:text-xs lg:text-sm tracking-wider uppercase flex items-center justify-center transition-all bg-blue-600 hover:bg-blue-700 text-white disabled:bg-slate-100 disabled:text-slate-400"
        >
          <ShoppingCart className="w-3 md:w-3.5 h-3 md:h-3.5 mr-0.5" />
          <span>Add</span>
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
