import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

const faqs: { category: string; items: { q: string; a: string }[] }[] = [
  {
    category: 'Orders & Delivery',
    items: [
      { q: 'How long does delivery take?', a: 'Nairobi CBD and nearby areas: same day or next day. Other Nairobi zones: 1–2 business days. Upcountry: 2–4 business days via courier.' },
      { q: 'How do I track my order?', a: 'Visit our Track Order page and enter your Order ID. You can also call us with your order number for a live update.' },
      { q: 'Can I change my delivery address after placing an order?', a: 'Yes, if the order hasn\'t been dispatched yet. Contact us immediately via phone or email and we\'ll update it.' },
      { q: 'Do you deliver outside Nairobi?', a: 'Yes. We ship upcountry via G4S and Fargo courier. Delivery fees vary by location and are shown at checkout.' },
    ],
  },
  {
    category: 'Payments',
    items: [
      { q: 'What payment methods do you accept?', a: 'We accept M-Pesa (Paybill) and Cash on Delivery for online orders. In-store we also accept card payments.' },
      { q: 'Is M-Pesa payment secure?', a: 'Yes. Payments go directly to our official M-Pesa Paybill. Always use the account number shown on your order confirmation.' },
      { q: 'Can I pay in installments?', a: 'We currently don\'t offer installment plans online, but corporate and bulk buyers can contact us to discuss credit terms.' },
    ],
  },
  {
    category: 'Repairs & Bookings',
    items: [
      { q: 'How do I book a repair?', a: 'Go to our Services page, select the repair type, and click "Book Repair". Fill in your device details and preferred appointment time.' },
      { q: 'How long does a repair take?', a: 'Most common repairs (screen, battery, charging port) are done same-day. Complex motherboard repairs may take 2–5 business days.' },
      { q: 'Do you charge for diagnostics?', a: 'No. Diagnostics are free when the repair is completed in our workshop. If you decline the repair after diagnosis, a small assessment fee may apply.' },
      { q: 'What if my device can\'t be repaired?', a: 'We\'ll inform you before any work begins. No labor fee is charged if we cannot fix the device.' },
      { q: 'Is my data safe during repair?', a: 'We do not access your personal data. We recommend backing up your device before dropping it off as a precaution.' },
    ],
  },
  {
    category: 'Products & Stock',
    items: [
      { q: 'Are your products genuine?', a: 'Yes. All products are sourced from authorized distributors. We do not sell counterfeit or grey-market goods.' },
      { q: 'Can I request a product that\'s out of stock?', a: 'Yes. Contact us with the product name and model. We can source most items within 3–7 business days.' },
      { q: 'Do you offer bulk/corporate pricing?', a: 'Yes. Businesses and institutions can contact us for volume pricing on devices, accessories, and service contracts.' },
    ],
  },
  {
    category: 'Returns & Warranty',
    items: [
      { q: 'What is your return policy?', a: 'Items can be returned within 7 days if defective, wrong, or significantly different from the listing. See our Returns & Refunds page for full details.' },
      { q: 'How long is the warranty on repairs?', a: '90 days on all repair work and parts replaced. New products carry a 12-month manufacturer warranty.' },
    ],
  },
];

const Item = ({ q, a }: { q: string; a: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between py-4 text-left gap-4 cursor-pointer"
      >
        <span className="text-sm font-semibold text-slate-800 pr-2">{q}</span>
        {open ? <ChevronUp className="w-4 h-4 text-blue-600 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
      </button>
      {open && <p className="text-xs text-slate-500 leading-relaxed pb-4">{a}</p>}
    </div>
  );
};

export const FAQsPage = () => (
  <div className="space-y-10 py-6 animate-fade-in text-left max-w-3xl mx-auto">
    <div>
      <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1.5 flex flex-wrap items-center gap-2">
        <HelpCircle className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600 flex-shrink-0" /> Frequently Asked Questions
      </h1>
      <p className="text-sm text-slate-500 mt-1">Quick answers to the most common questions about our products, repairs, and policies.</p>
    </div>

    <div className="space-y-6">
      {faqs.map(section => (
        <div key={section.category} className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-100 px-4 sm:px-6 py-3">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">{section.category}</h2>
          </div>
          <div className="px-4 sm:px-6">
            {section.items.map(item => <Item key={item.q} {...item} />)}
          </div>
        </div>
      ))}
    </div>

    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 text-center space-y-2">
      <p className="text-sm font-bold text-slate-900">Still have a question?</p>
      <p className="text-xs text-slate-500">Our team is available Mon–Sat, 8am–6:30pm.</p>
      <Link to="/contact" className="inline-block mt-2 bg-blue-600 text-white text-xs font-bold px-6 py-2.5 rounded-full hover:bg-blue-700 transition-colors">
        Contact Support
      </Link>
    </div>
  </div>
);

export default FAQsPage;
