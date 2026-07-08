import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, CheckCircle, XCircle, Wrench } from 'lucide-react';
import Card from '../components/common/Card';

const tiers = [
  {
    label: 'Repair Warranty',
    duration: '90 Days',
    color: 'bg-blue-600',
    covers: [
      'Same fault recurrence after repair',
      'Parts replaced during the repair job',
      'Labor defects from our technicians',
    ],
    excludes: [
      'New physical damage after handover',
      'Liquid damage after repair',
      'Software issues unrelated to repair',
    ],
  },
  {
    label: 'New Products',
    duration: '12 Months',
    color: 'bg-indigo-600',
    covers: [
      'Manufacturing defects',
      'Hardware failure under normal use',
      'Dead-on-arrival (DOA) replacements',
    ],
    excludes: [
      'Physical or accidental damage',
      'Unauthorized modifications',
      'Normal wear and tear',
    ],
  },
  {
    label: 'Refurbished Products',
    duration: '3 Months',
    color: 'bg-slate-600',
    covers: [
      'Hardware defects present at time of sale',
      'Battery below rated capacity on arrival',
    ],
    excludes: [
      'Cosmetic wear (scratches, dents)',
      'Damage caused after purchase',
      'Software or OS issues',
    ],
  },
];

const claimSteps = [
  { n: '1', t: 'Identify your warranty', d: 'Check your receipt or order confirmation for the warranty period and type.' },
  { n: '2', t: 'Contact us', d: 'Call or email us with your order/booking ID and a description of the issue.' },
  { n: '3', t: 'Drop off the device', d: 'Bring the device to our Moi Avenue store. We\'ll inspect it within 1 business day.' },
  { n: '4', t: 'Repair or replacement', d: 'If covered, we repair or replace at no cost. You\'ll be notified when ready for pickup.' },
];

export const WarrantyPage = () => (
  <div className="space-y-10 py-6 animate-fade-in text-left max-w-3xl mx-auto">
    <div>
      <div className="text-xs text-slate-400 font-bold uppercase tracking-wider space-x-1">
        <Link to="/" className="hover:text-blue-600">Home</Link>
        <span>/</span>
        <span className="text-blue-600">Warranty</span>
      </div>
      <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1.5 flex flex-wrap items-center gap-2">
        <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600 flex-shrink-0" /> Warranty Policy
      </h1>
      <p className="text-sm text-slate-500 mt-1">We stand behind every product we sell and every repair we perform.</p>
    </div>

    {/* Tiers */}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {tiers.map(t => (
        <Card key={t.label} className="p-6 space-y-4">
          <div className={`${t.color} text-white text-center rounded-xl py-3 space-y-0.5`}>
            <p className="text-xs font-bold uppercase tracking-widest opacity-80">{t.label}</p>
            <p className="text-2xl font-black">{t.duration}</p>
          </div>
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Covers</p>
            {t.covers.map(c => (
              <div key={c} className="flex items-start gap-1.5 text-xs text-slate-600">
                <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />{c}
              </div>
            ))}
          </div>
          <div className="space-y-2 border-t border-slate-100 pt-3">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Excludes</p>
            {t.excludes.map(e => (
              <div key={e} className="flex items-start gap-1.5 text-xs text-slate-500">
                <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />{e}
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>

    {/* Claim process */}
    <div className="space-y-4">
      <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
        <Wrench className="w-4 h-4 text-blue-600" /> How to Claim Warranty
      </h2>
      <div className="space-y-3">
        {claimSteps.map(s => (
          <Card key={s.n} className="p-4 flex gap-4 items-start">
            <span className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center flex-shrink-0">{s.n}</span>
            <div>
              <p className="font-bold text-slate-900 text-sm">{s.t}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.d}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>

    <p className="text-xs text-slate-400 text-center">
      Need help? <Link to="/contact" className="text-blue-600 hover:underline font-semibold">Contact our support team</Link>
    </p>
  </div>
);

export default WarrantyPage;
