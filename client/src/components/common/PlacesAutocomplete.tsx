import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';

interface Props {
  value: string;
  onChange: (address: string) => void;
  error?: string;
}

interface Prediction {
  description: string;
  place_id: string;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

const PlacesAutocomplete = ({ value, onChange, error }: Props) => {
  const [inputVal, setInputVal] = useState(value);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchPredictions = async (input: string) => {
    if (input.length < 2) { setPredictions([]); setSearching(false); return; }
    setSearching(true);
    try {
      const res = await fetch(`${API_BASE}/places/autocomplete?input=${encodeURIComponent(input)}`);
      const data = await res.json();
      setPredictions(data.predictions ?? []);
      setShowDropdown(true);
    } catch {
      setPredictions([]);
    } finally {
      setSearching(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputVal(val);
    onChange(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fetchPredictions(val), 350);
  };

  const handleSelect = (description: string) => {
    setInputVal(description);
    onChange(description);
    setPredictions([]);
    setShowDropdown(false);
  };

  return (
    <div ref={wrapperRef} className="relative" style={{ zIndex: 100 }}>
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
        Delivery Address / Location <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
        <input
          type="text"
          value={inputVal}
          onChange={handleChange}
          onFocus={() => predictions.length > 0 && setShowDropdown(true)}
          placeholder="Start typing your location…"
          autoComplete="off"
          className={`w-full pl-9 pr-10 py-3 border-2 rounded-lg outline-none transition-all text-sm bg-white
            ${error ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'}`}
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 animate-spin" />
        )}
      </div>

      {/* Dropdown — rendered in portal to escape overflow:hidden parents */}
      {showDropdown && predictions.length > 0 && (
        <ul className="absolute z-[9999] w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
          style={{ top: '100%', left: 0 }}>
          {predictions.map((p) => (
            <li key={p.place_id}
              onMouseDown={() => handleSelect(p.description)}
              className="flex items-start gap-2.5 px-4 py-3 text-sm text-slate-700 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-none">
              <MapPin className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              {p.description}
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      <p className="text-[11px] text-slate-400 mt-1">📍 Powered by Google Maps — select a suggestion for accuracy</p>
    </div>
  );
};

export default PlacesAutocomplete;
