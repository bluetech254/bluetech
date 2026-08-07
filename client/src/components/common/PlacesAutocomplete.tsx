import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';

interface Props {
  value: string;
  onChange: (address: string) => void;
  error?: string;
}

declare global {
  interface Window {
    google: any;
    initGoogleMaps: () => void;
  }
}

let scriptLoaded = false;
let scriptLoading = false;
const callbacks: (() => void)[] = [];

function loadGoogleMaps(apiKey: string): Promise<void> {
  return new Promise((resolve) => {
    if (scriptLoaded) { resolve(); return; }
    callbacks.push(resolve);
    if (scriptLoading) return;
    scriptLoading = true;
    window.initGoogleMaps = () => {
      scriptLoaded = true;
      callbacks.forEach(cb => cb());
      callbacks.length = 0;
    };
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  });
}

const PlacesAutocomplete = ({ value, onChange, error }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [loading, setLoading] = useState(false);
  const [mapsReady, setMapsReady] = useState(false);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return;

    if (scriptLoaded) { setMapsReady(true); return; }

    setLoading(true);
    loadGoogleMaps(apiKey).then(() => {
      setLoading(false);
      setMapsReady(true);
    });
  }, []);

  useEffect(() => {
    if (!mapsReady || !inputRef.current || !window.google) return;

    autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: 'ke' },
      fields: ['formatted_address', 'geometry', 'name'],
      types: ['geocode', 'establishment'],
    });

    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current.getPlace();
      const address = place.formatted_address || place.name || inputRef.current?.value || '';
      onChange(address);
    });

    return () => {
      if (window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [mapsReady, onChange]);

  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
        Delivery Address / Location <span className="text-red-500">*</span>
      </label>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none z-10" />
        <input
          ref={inputRef}
          type="text"
          defaultValue={value}
          onChange={e => onChange(e.target.value)}
          placeholder={loading ? 'Loading location search…' : 'Start typing your location…'}
          autoComplete="off"
          disabled={loading}
          className={`w-full pl-9 pr-10 py-3 border-2 rounded-lg outline-none transition-all text-sm bg-white disabled:bg-slate-50 disabled:text-slate-400
            ${error ? 'border-red-400 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'}`}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 animate-spin" />
        )}
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      <p className="text-[11px] text-slate-400 mt-1">
        {mapsReady ? '📍 Powered by Google Maps — select a suggestion for accuracy' : 'Type your full delivery address'}
      </p>
    </div>
  );
};

export default PlacesAutocomplete;
