import React from 'react';
import { Briefcase } from 'lucide-react';

export const CareersPage = () => (
  <div className="space-y-8 animate-fade-in">
    <div>
<h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
        <Briefcase className="w-7 h-7 text-blue-600" /> Careers at BlueTech
      </h1>
      <p className="text-sm text-slate-500 mt-1">Join our team and help shape the future of tech repair and retail in Kenya.</p>
    </div>

    {/* Culture blurb */}
    <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
      <h2 className="font-bold text-slate-900 mb-2">Why BlueTech?</h2>
      <p className="text-sm text-slate-600 leading-relaxed">
        We're a fast-growing Kenyan tech company with a passion for quality and customer service. We offer competitive salaries, continuous learning opportunities, and a collaborative work environment where your ideas matter.
      </p>
    </div>

    {/* Open roles */}
    <div>
      <h2 className="font-bold text-slate-900 mb-4">Open Positions</h2>
      <div className="bg-white border border-slate-100 rounded-xl p-10 text-center text-slate-500">
        <Briefcase className="w-10 h-10 mx-auto mb-3 text-slate-300" />
        <p className="font-semibold text-slate-700">No open positions right now</p>
        <p className="text-sm mt-1">We're not actively hiring at the moment, but we'd love to hear from you.</p>
      </div>
    </div>

    <div className="bg-slate-50 border border-slate-100 rounded-xl p-6 text-center">
      <p className="text-sm text-slate-600">Don't see a role that fits? Send your CV to{' '}
        <a href="mailto:careers@bluetech.co.ke" className="text-blue-600 font-semibold hover:underline">careers@bluetech.co.ke</a>
      </p>
    </div>
  </div>
);

export default CareersPage;
