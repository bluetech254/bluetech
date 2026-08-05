import React from 'react';

interface LegalShellProps {
  icon: React.ReactNode;
  title: string;
  lastUpdated?: string;
  children: React.ReactNode;
}

const LegalShell = ({ icon, title, lastUpdated = 'July 2026', children }: LegalShellProps) => (
  <div className="max-w-3xl mx-auto py-8 animate-fade-in text-left">
    <div className="mb-6">
      <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1.5">
        / <span className="text-blue-600">{title}</span>
      </div>
      <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex flex-wrap items-center gap-2">
        {icon} {title}
      </h1>
      <p className="text-sm text-slate-500 mt-1">Last updated: {lastUpdated}</p>
    </div>
    <div className="bg-white border border-slate-100 rounded-xl p-6 space-y-6">
      {children}
    </div>
  </div>
);

export default LegalShell;
