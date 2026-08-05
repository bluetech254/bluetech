import React from 'react';
import { Minus, Plus } from 'lucide-react';

interface QuantityStepperProps {
  quantity: number;
  max: number;
  onDecrement: () => void;
  onIncrement: () => void;
  size?: 'sm' | 'md';
}

const QuantityStepper = ({ quantity, max, onDecrement, onIncrement, size = 'md' }: QuantityStepperProps) => {
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const btnPad = size === 'sm' ? 'p-1 px-2' : 'p-1.5';
  const border = size === 'sm' ? 'border border-slate-200' : 'border-2 border-slate-200';

  return (
    <div className={`flex items-center ${border} rounded-lg bg-white`}>
      <button type="button" onClick={onDecrement} disabled={quantity <= 1}
        className={`${btnPad} text-slate-500 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer rounded-md hover:bg-slate-50`}>
        <Minus className={iconSize} />
      </button>
      <span className="px-2 text-sm font-bold text-slate-900 min-w-6 text-center select-none">{quantity}</span>
      <button type="button" onClick={onIncrement} disabled={quantity >= max}
        className={`${btnPad} text-slate-500 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer rounded-md hover:bg-slate-50`}>
        <Plus className={iconSize} />
      </button>
    </div>
  );
};

export default QuantityStepper;
