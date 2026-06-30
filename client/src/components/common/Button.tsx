import React, { ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: any;
  type?: 'submit' | 'reset' | 'button';
}

export const Button = ({
  variant = 'primary',
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) => {
  const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 cursor-pointer';

  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 shadow-md hover:shadow-lg disabled:bg-blue-400 disabled:cursor-not-allowed',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-900 py-3 px-6 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed',
    outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50 py-[10px] px-6 disabled:border-blue-300 disabled:text-blue-300 disabled:cursor-not-allowed',
    danger: 'bg-red-600 hover:bg-red-700 text-white py-3 px-6 shadow-md hover:shadow-lg disabled:bg-red-400 disabled:cursor-not-allowed',
    icon: 'w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-100 text-slate-700 hover:text-slate-950 disabled:opacity-50 disabled:cursor-not-allowed',
  };

  const isBtnDisabled = disabled || isLoading;

  return (
    <button
      className={`${variant === 'icon' ? '' : baseClasses} ${variantClasses[variant]} ${isLoading ? 'opacity-75 cursor-wait' : ''} ${className}`}
      disabled={isBtnDisabled}
      {...props}
    >
      {isLoading && variant !== 'icon' && (
        <Loader2 className="w-5 h-5 animate-spin mr-2 text-current" />
      )}
      
      {!isLoading && leftIcon && (
        <span className="mr-2 inline-flex">{leftIcon}</span>
      )}
      
      {isLoading && variant === 'icon' ? (
        <Loader2 className="w-5 h-5 animate-spin text-current" />
      ) : (
        children
      )}
      
      {!isLoading && rightIcon && (
        <span className="ml-2 inline-flex">{rightIcon}</span>
      )}
    </button>
  );
};

export default Button;
