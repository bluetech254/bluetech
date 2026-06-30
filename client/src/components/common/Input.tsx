import React, { InputHTMLAttributes, forwardRef } from 'react';
import { AlertCircle } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon, className = '', disabled, id, ...props }, ref) => {
    return (
      <div className="w-full text-left">
        {label && (
          <label htmlFor={id} className="block text-sm font-semibold text-slate-700 mb-1.5">
            {label}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              {leftIcon}
            </div>
          )}
          
          <input
            id={id}
            disabled={disabled}
            ref={ref}
            className={`
              w-full py-3 px-4 border-2 rounded-lg outline-none transition-all duration-200
              ${leftIcon ? 'pl-11' : 'pl-4'}
              ${disabled ? 'bg-slate-50 border-slate-100 cursor-not-allowed text-slate-400' : 'bg-white border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'}
              ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : ''}
              ${className}
            `}
            {...props}
          />
        </div>
        
        {error && (
          <div className="flex items-center text-red-600 text-sm mt-1.5 space-x-1" id={`${id}-error`} role="alert">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
