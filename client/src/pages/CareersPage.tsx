import React from 'react';
import { Briefcase, MapPin, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

const openings = [
  {
    id: 1,
    title: 'Senior Hardware Technician',
    department: 'Repairs',
    location: 'Nairobi, Kenya',
    type: 'Full-time',
    description: 'Diagnose and repair smartphones, tablets, and laptops. Minimum 3 years hands-on experience with major brands required.',
  },
  {
    id: 2,
    title: 'Sales Associate',
    department: 'Retail',
    location: 'Nairobi, Kenya',
    type: 'Full-time',
    description: 'Assist walk-in customers with product selection, process sales, and maintain showroom standards.',
  },
  {
    id: 3,
    title: 'Customer Support Agent',
    department: 'Support',
    location: 'Remote / Nairobi',
    type: 'Full-time',
    description: 'Handle customer inquiries via phone, email, and chat. Resolve order and repair status queries efficiently.',
  },
  {
    id: 4,
    title: 'Frontend Developer (React)',
    department: 'Engineering',
    location: 'Remote',
    type: 'Contract',
    description: 'Build and maintain our customer-facing web platform. Strong TypeScript and React skills required.',
  },
];

const typeColors: Record<string, string> = {
  'Full-time': 'bg-green-100 text-green-700',
  'Contract': 'bg-blue-100 text-blue-700',
  'Part-time': 'bg-orange-100 text-orange-700',
};

export const CareersPage = () => (
  <div className="space-y-8 animate-fade-in">
    <div>
      <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1.5">
        / <span className="text-blue-600">Careers</span>
      </div>
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
      <h2 className="font-bold text-slate-900 mb-4">Open Positions ({openings.length})</h2>
      <div className="space-y-4">
        {openings.map(job => (
          <div key={job.id} className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-900">{job.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{job.department}</p>
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${typeColors[job.type] || 'bg-slate-100 text-slate-600'}`}>
                {job.type}
              </span>
            </div>
            <p className="text-sm text-slate-600 mt-3 leading-relaxed">{job.description}</p>
            <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-slate-400">
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{job.location}</span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{job.type}</span>
            </div>
            <Link
              to="/contact"
              className="inline-block mt-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
            >
              Apply via Contact Form
            </Link>
          </div>
        ))}
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
