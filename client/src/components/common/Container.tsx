import React from 'react';

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
}

const Container = ({ children, className = '' }: ContainerProps) => (
  <div className={`px-4 sm:px-6 lg:px-[100px] max-w-[1600px] mx-auto ${className}`}>
    {children}
  </div>
);

export default Container;
