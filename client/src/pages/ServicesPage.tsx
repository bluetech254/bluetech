import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getRepairServices } from '../api/services';
import { RepairService } from '../types';
import ServiceGrid from '../components/services/ServiceGrid';
import WishlistTray from '../components/wishlist/WishlistTray';
import { Shield, CheckCircle, Smartphone, Laptop, Tablet, Headphones, Gamepad, Watch, Wrench, ChevronRight, RotateCcw } from 'lucide-react';

const getDeviceIcon = (device: string) => {
  const d = device.toLowerCase();
  if (d.includes('phone') || d.includes('mobile')) return <Smartphone className="w-7 h-7 text-blue-600" />;
  if (d.includes('laptop') || d.includes('computer')) return <Laptop className="w-7 h-7 text-blue-600" />;
  if (d.includes('tablet') || d.includes('ipad')) return <Tablet className="w-7 h-7 text-blue-600" />;
  if (d.includes('audio') || d.includes('headphone') || d.includes('speaker')) return <Headphones className="w-7 h-7 text-blue-600" />;
  if (d.includes('game') || d.includes('console')) return <Gamepad className="w-7 h-7 text-blue-600" />;
  if (d.includes('watch') || d.includes('wearable')) return <Watch className="w-7 h-7 text-blue-600" />;
  return <Wrench className="w-7 h-7 text-blue-600" />;
};

/** Device = the leading word of the category, e.g. "Phone Screen & Display" → "Phone". */
const deviceOf = (category: string) => (category || '').trim().split(/\s+/)[0] ?? '';

/** Everything after the device word, e.g. "Screen & Display". */
const subOf = (category: string) => {
  const parts = (category || '').trim().split(/\s+/);
  return parts.slice(1).join(' ') || category;
};

export const ServicesPage = () => {
  const location = useLocation();
  const [services, setServices] = useState<RepairService[]>([]);
  const [loading, setLoading] = useState(true);
  const [device, setDevice] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const trimmedQuery = query.trim().toLowerCase();
  const searching = trimmedQuery.length > 0;
  const searchResults = searching
    ? services.filter((s) =>
        [s.name, s.description, s.category].join(' ').toLowerCase().includes(trimmedQuery))
    : [];

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const cat = params.get('category');
    if (cat) setDevice(deviceOf(cat));
  }, [location]);

  useEffect(() => {
    setLoading(true);
    getRepairServices({})
      .then(data => setServices(data || []))
      .catch(err => console.error('Failed to load repair services:', err))
      .finally(() => setLoading(false));
  }, []);

  /** Group by device → subcategory → services. */
  const grouped = useMemo(() => {
    const byDevice: Record<string, Record<string, RepairService[]>> = {};
    for (const s of services) {
      const d = deviceOf(s.category);
      const sub = subOf(s.category);
      if (!byDevice[d]) byDevice[d] = {};
      if (!byDevice[d][sub]) byDevice[d][sub] = [];
      byDevice[d][sub].push(s);
    }
    return byDevice;
  }, [services]);

  const deviceCounts = useMemo(() =>
    Object.entries(grouped).map(([d, subs]) => ({
      device: d,
      count: Object.values(subs).reduce((n, list) => n + list.length, 0),
      subs: Object.keys(subs).sort(),
    })).sort((a, b) => a.count - b.count),
  [grouped]);


  // Nicer display name for a device
  const deviceLabel = (d: string) => {
    const low = d.toLowerCase();
    if (low === 'phone') return 'Smartphones';
    if (low === 'laptop') return 'Laptops';
    if (low === 'tablet') return 'Tablets';
    return d + 's';
  };

  return (
    <div className="space-y-8 animate-fade-in text-left">

      {/* Search — very first */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="relative">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search repairs… (e.g. screen, battery, charging)"
            className="w-full pl-10 pr-10 py-3 border-2 border-slate-200 focus:border-blue-500 rounded-xl outline-none transition-all text-sm"
          />
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" /></svg>
          </span>
          {searching && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-700"
            >
              Clear
            </button>
          )}
        </div>
        {searching && (
          <p className="mt-2 text-xs text-slate-500">
            {searchResults.length} result{searchResults.length === 1 ? '' : 's'} for “{query.trim()}”
          </p>
        )}
      </div>

      {/* Device selection */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Choose Your Device
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {device
              ? `Services for ${deviceLabel(device).toLowerCase()} — pick the service you need.`
              : 'Start with a device, then choose the service you need.'}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {deviceCounts.map(({ device: d, count, subs }) => (
            <button
              key={d}
              type="button"
              onClick={() => setDevice(d)}
              className={`rounded-2xl border-2 p-4 sm:p-5 flex flex-col items-center gap-2 transition-all cursor-pointer ${
                device === d
                  ? 'border-blue-600 bg-blue-50/60 shadow-sm'
                  : 'border-slate-100 bg-white hover:border-blue-200 hover:shadow-sm'
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                {getDeviceIcon(d)}
              </div>
              <span className="font-bold text-slate-900 text-sm sm:text-base">{deviceLabel(d)}</span>
              <span className="text-xs text-slate-500">{count} services · {subs.length} types</span>
              <span className={`flex items-center gap-1 text-xs font-semibold ${device === d ? 'text-blue-600' : 'text-slate-400'}`}>
                {device === d ? 'Selected' : 'View services'}
                <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setDevice(null)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Show all devices
        </button>
      </div>

      {/* Services under the selected device */}
      <div className="space-y-8 pb-8">
        {loading ? (
          <ServiceGrid services={[]} isLoading />
        ) : searching ? (
          searchResults.length === 0 ? (
            <div className="rounded-2xl border border-slate-100 bg-white p-6 text-center text-sm text-slate-500">
              No services match “{query.trim()}”. Try another term.
            </div>
          ) : (
            <ServiceGrid services={searchResults} isLoading={false} />
          )
        ) : (
          (device ? [device] : Object.keys(grouped).sort()).map((d) => {
            const subs = grouped[d] ?? {};
            const subKeys = Object.keys(subs).sort();
            return (
              <div key={d} className="space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
                    {getDeviceIcon(d)}
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900">{deviceLabel(d)}</h3>
                  <span className="text-xs font-semibold text-slate-400">
                    {Object.values(subs).reduce((n: number, l: RepairService[]) => n + l.length, 0)} services
                  </span>
                </div>
                {subKeys.map((sub) => (
                  <div key={`${d}-${sub}`} className="space-y-3">
                    <h4 className="text-base font-bold text-slate-800">
                      {sub}
                      <span className="ml-2 text-xs font-semibold text-slate-400">{subs[sub].length} services</span>
                    </h4>
                    <ServiceGrid services={subs[sub]} isLoading={false} />
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>

      {/* Warranty Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 border border-slate-100 rounded-2xl p-6 sm:p-8 items-center">
        <div className="space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">The BlueTech Certified Repair Guarantee</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Clean workshop with anti-static safeguards. OEM-grade spare components on every job.
          </p>
        </div>
        <ul className="space-y-3 text-sm font-semibold text-slate-700">
          {[
            'Up to 90 Days post-repair warranty on parts',
            'Zero diagnostics fees if repair is executed',
            'Real-time booking and workflow timeline updates',
            'Secure data handling on all hardware interventions',
          ].map(item => (
            <li key={item} className="flex items-center space-x-2.5">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <WishlistTray />

    </div>
  );
};

export default ServicesPage;
