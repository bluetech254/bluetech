import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingProps {
  fullScreen?: boolean;
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

export const Loading = ({ fullScreen = false, size = 'md', message }: LoadingProps) => {
  const spinnerSizes = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-slate-50 flex flex-col items-center justify-center z-50 animate-fade-in">
        <div className="flex flex-col items-center space-y-4">
          {/* Pulsing Text Logo */}
          <div className="flex items-center space-x-2 text-3xl font-extrabold tracking-tight text-blue-600 animate-pulse-custom">
            <span>Blue</span>
            <span className="text-purple-600">Tech</span>
          </div>
          <div className="flex items-center space-x-2 text-slate-500 font-medium">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span>{message || 'Connecting to service...'}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-2">
      <Loader2 className={`${spinnerSizes[size]} animate-spin text-blue-600`} />
      {message && <span className="text-sm text-slate-500 font-medium">{message}</span>}
    </div>
  );
};

export default Loading;
