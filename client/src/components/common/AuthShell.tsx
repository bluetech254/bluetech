import React from 'react';

interface AuthShellProps {
  children: React.ReactNode;
}

const AuthShell = ({ children }: AuthShellProps) => (
  <div className="min-h-[60vh] flex items-start justify-center pt-12 px-4 animate-fade-in">
    <div className="w-full max-w-md">
      {children}
    </div>
  </div>
);

export default AuthShell;
