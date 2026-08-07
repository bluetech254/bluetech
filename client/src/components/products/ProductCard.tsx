import React from 'react';
import { Link } from 'react-router-dom';
import { Product } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface ProductCardProps {
  product: Product;
  key?: any;
}

export const ProductCard = ({ product }: ProductCardProps) => {
  const { id, name, images, price } = product;
  const imageUrl = images && images.length > 0 ? images[0] : 'https://placehold.co/400x400?text=Product';

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
      </Link>

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
    </div>
  );
};

export default ProductCard;
