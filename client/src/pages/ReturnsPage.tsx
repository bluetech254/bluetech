import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { RotateCcw, CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import Card from '../components/common/Card';

const steps = [
  { step: '01', title: 'Contact Us Within 7 Days', desc: 'Reach out via phone, email, or our contact form within 7 days of receiving your order. Have your order ID ready.' },
  { step: '02', title: 'Return Authorization', desc: 'Our team will review your request and issue a Return Authorization (RA) number within 24 hours if eligible.' },
  { step: '03', title: 'Ship the Item Back', desc: 'Pack the item securely in its original packaging and drop it off at our Moi Avenue store or arrange a courier pickup.' },
  { step: '04', title: 'Inspection & Refund', desc: 'Once received, we inspect the item within 2 business days. Approved refunds are processed within 5–7 business days.' },
];

const eligible = [
  'Item received damaged or defective',
  'Wrong item delivered',
  'Item significantly different from description',
  'Sealed item unopened (within 7 days)',
];

const notEligible = [
  'Opened software, digital downloads, or SIM cards',
  'Items damaged by misuse, liquid, or physical impact after delivery',
  'Items returned after 7 days without prior authorization',
  'Custom-ordered or special-import items',
  'Consumables (batteries, cables) showing signs of use',
];

export const ReturnsPage = () => (
  <div className="space-y-10 py-6 animate-fade-in text-left max-w-3xl mx-auto px-0">
    <div>
      <div className="text-xs text-slate-400 font-bold uppercase tracking-wider space-x-1">
        <Link to="/" className="hover:text-blue-600">Home</Link>
        <span>/</span>
        <span className="text-blue-600">Returns & Refunds</span>
      </div>
      <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1.5 flex flex-wrap items-center gap-2">
        <RotateCcw className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600 flex-shrink-0" /> Returns & Refunds
      </h1>
      <p className="text-sm text-slate-500 mt-1">We want you to be completely satisfied. Here's how our return process works.</p>
    </div>

    {/* Steps */}
    <div className="space-y-4">
      <h2 className="text-base font-bold text-slate-900">How to Return an Item</h2>
      <div className="space-y-3">
        {steps.map(s => (
          <Card key={s.step} className="p-5 flex gap-4 items-start">
            <span className="text-2xl font-black text-blue-100 w-10 flex-shrink-0">{s.step}</span>
            <div>
              <p className="font-bold text-slate-900 text-sm">{s.title}</p>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{s.desc}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>

    {/* Eligible / Not Eligible */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      <Card className="p-6 space-y-3">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-500" /> Eligible for Return
        </h3>
        <ul className="space-y-2">
          {eligible.map(i => (
            <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
              <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />{i}
            </li>
          ))}
        </ul>
      </Card>
      <Card className="p-6 space-y-3">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <XCircle className="w-4 h-4 text-red-500" /> Not Eligible
        </h3>
        <ul className="space-y-2">
          {notEligible.map(i => (
            <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
              <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />{i}
            </li>
          ))}
        </ul>
      </Card>
    </div>

    {/* Note */}
    <Card className="p-5 bg-amber-50 border-amber-100 flex gap-3 items-start">
      <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
      <div className="text-xs text-amber-800 leading-relaxed">
        <p className="font-bold mb-0.5">Repair Services</p>
        Repair bookings are non-refundable once the device has been opened and diagnosed. If we cannot fix the issue, no labor fee is charged.
      </div>
    </Card>

    <p className="text-xs text-slate-400 text-center">
      Questions? <Link to="/contact" className="text-blue-600 hover:underline font-semibold">Contact our support team</Link>
    </p>
  </div>
);

export default ReturnsPage;
