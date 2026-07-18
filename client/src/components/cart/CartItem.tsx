import React from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { CartItem as ICartItem } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { useCart } from '../../hooks/useCart';
import { Link } from 'react-router-dom';

interface CartItemProps {
  item: ICartItem;
  key?: any;
}

export const CartItem = ({ item }: CartItemProps) => {
  const { updateQuantity, removeItem } = useCart();
  const { product, quantity } = item;
  const hasImage = product.images && product.images.length > 0;
  const imageUrl = hasImage ? product.images[0] : 'https://placehold.co/100x100?text=Product';

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white rounded-xl border border-slate-100 shadow-xs space-y-4 sm:space-y-0 text-left">
      {/* Product Image & Details */}
      <div className="flex items-center space-x-4 flex-1 min-w-0">
        <div className="w-20 h-20 bg-slate-50 border border-slate-100 rounded-lg overflow-hidden flex-shrink-0">
          <img
            src={imageUrl}
            alt={product.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-slate-900 break-words hover:text-blue-600 transition-colors">
            <Link to={`/products/${product.id}`}>
              {product.name}
            </Link>
          </h3>
          <p className="text-xs text-slate-400 capitalize mb-1">{product.category}</p>
          <div className="text-sm font-semibold text-slate-500">
            Unit Price: {formatCurrency(product.price)}
          </div>
        </div>
      </div>

      {/* Action panel (Quantity picker & Subtotal / Remove) */}
      <div className="flex items-center justify-between sm:justify-end space-x-6 w-full sm:w-auto">
        {/* Quantity control */}
        <div className="flex items-center border-2 border-slate-100 rounded-lg bg-white p-1">
          <button
            type="button"
            disabled={quantity <= 1}
            onClick={() => updateQuantity(product.id, quantity - 1)}
            className="p-1 px-2.5 text-slate-500 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="px-2 font-bold text-slate-900 text-sm select-none min-w-6 text-center">
            {quantity}
          </span>
          <button
            type="button"
            disabled={quantity >= product.stock_quantity}
            onClick={() => updateQuantity(product.id, quantity + 1)}
            className="p-1 px-2.5 text-slate-500 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Pricing Subtotal & Trash */}
        <div className="text-right flex items-center space-x-4">
          <div className="hidden sm:block">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-0.5">Total</p>
            <div className="font-extrabold text-blue-600 text-base">
              {formatCurrency(product.price * quantity)}
            </div>
          </div>
          
          <button
            type="button"
            onClick={() => removeItem(product.id)}
            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            title="Remove item"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CartItem;
