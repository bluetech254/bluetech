import React, { SelectHTMLAttributes, forwardRef } from 'react';
import { AlertCircle } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className = '', disabled, id, ...props }, ref) => {
    return (
      <div className="w-full text-left">
        {label && (
          <label htmlFor={id} className="block text-sm font-semibold text-slate-700 mb-1.5">
            {label}
          </label>
        )}
        
        <div className="relative">
          <select
            id={id}
            disabled={disabled}
            ref={ref}
            className={`
              w-full py-3 px-4 border-2 rounded-lg outline-none bg-white transition-all duration-200 cursor-pointer appearance-none
              ${disabled ? 'bg-slate-50 border-slate-100 cursor-not-allowed text-slate-400' : 'border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'}
              ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-100' : ''}
              ${className}
            `}
            {...props}
          >
            {placeholder && (
              <option value="">
                {placeholder}
              </option>
            )}
            
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          
          <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
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

Select.displayName = 'Select';

export default Select;
