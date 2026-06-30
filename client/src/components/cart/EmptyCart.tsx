import React from 'react';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../common/Button';

export const EmptyCart = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 bg-white rounded-2xl border border-slate-100 shadow-sm text-center max-w-lg mx-auto animate-fade-in">
      <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6 shadow-inner">
        <ShoppingBag className="w-10 h-10" />
      </div>
      <h2 className="text-xl font-extrabold text-slate-900 mb-2">Your Shopping Cart is Empty</h2>
      <p className="text-sm text-slate-500 mb-8 max-w-sm leading-relaxed">
        You haven't added any products to your checkout cart yet. Browse our electronic gadgets, parts, and computer accessories catalog!
      </p>
      <Button
        variant="primary"
        onClick={() => navigate('/products')}
        rightIcon={<ArrowRight className="w-4 h-4" />}
        className="px-8 py-3.5 font-bold"
      >
        Start Shopping
      </Button>
    </div>
  );
};

export default EmptyCart;
