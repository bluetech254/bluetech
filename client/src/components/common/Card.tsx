import React, { HTMLAttributes } from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'base' | 'hover' | 'interactive';
  className?: string;
  children?: React.ReactNode;
  key?: any;
}

export const Card = ({ variant = 'base', children, className = '', ...props }: CardProps) => {
  const baseClasses = 'bg-white rounded-xl shadow-sm border border-slate-100 text-left';
  
  const variantClasses = {
    base: '',
    hover: 'hover:shadow-md hover:-translate-y-1 transition-all duration-300',
    interactive: 'cursor-pointer hover:border-blue-500 border-2 border-transparent transition-all duration-300',
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </div>
  );
};

export default Card;
