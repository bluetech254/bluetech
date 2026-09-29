"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ShoppingBag, Wrench, Users, X, Loader2 } from "lucide-react";
import NotificationBell from "@/components/ui/NotificationBell";
import { adminApi } from "@/lib/api";

interface SearchResults {
  users: any[];
  orders: any[];
  bookings: any[];
}

export default function Topbar({ fullName, role }: { fullName?: string; role?: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) {
      setResults(null);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await adminApi.globalSearch(q.trim()) as any;
        setResults({ users: res.users ?? [], orders: res.orders ?? [], bookings: res.bookings ?? [] });
        setOpen(true);
      } catch {
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [q]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasResults = results && (
    results.users.length + results.orders.length + results.bookings.length > 0
  );

  function navigate(path: string) {
    setOpen(false);
    setQ("");
    router.push(path);
  }

  return (
    <header className="flex items-center justify-between gap-4 mb-6">
      {/* Global search */}
      <div className="relative flex-1 max-w-md" ref={containerRef}>
        <div className="relative">
          {loading
            ? <Loader2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-dim animate-spin" />
            : <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-dim" />}
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => results && setOpen(true)}
            className="input-field pl-10 pr-8"
            placeholder="Search users, orders, bookings…"
          />
          {q && (
            <button
              onClick={() => { setQ(""); setResults(null); setOpen(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-dim hover:text-ink"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Results dropdown */}
        {open && (
          <div className="absolute z-50 w-full mt-1.5 bg-base-panel border border-base-border rounded-2xl shadow-2xl overflow-hidden">
            {!hasResults && (
              <p className="text-sm text-ink-dim text-center py-4 px-4">
                No results for &ldquo;{q}&rdquo;
              </p>
            )}

            {results && results.users.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-ink-dim uppercase tracking-widest px-4 pt-3 pb-1 flex items-center gap-1.5">
                  <Users size={10} /> Users
                </p>
                {results.users.slice(0, 4).map((u) => (
                  <button
                    key={u.id}
                    onClick={() => navigate("/users")}
                    className="w-full text-left px-4 py-2.5 hover:bg-base-hover text-sm border-b border-base-border/30 last:border-0 transition-colors"
                  >
                    <span className="font-medium text-ink">{u.full_name}</span>
                    <span className="text-xs text-ink-dim ml-2">{u.phone_number}</span>
                  </button>
                ))}
              </div>
            )}

            {results && results.orders.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-ink-dim uppercase tracking-widest px-4 pt-3 pb-1 flex items-center gap-1.5">
                  <ShoppingBag size={10} /> Orders
                </p>
                {results.orders.slice(0, 4).map((o) => (
                  <button
                    key={o.id}
                    onClick={() => navigate("/orders")}
                    className="w-full text-left px-4 py-2.5 hover:bg-base-hover text-sm border-b border-base-border/30 last:border-0 transition-colors"
                  >
                    <span className="font-mono text-xs text-ink-dim">#{o.id.slice(0, 8)}</span>
                    <span className="text-ink ml-2">{o.full_name}</span>
                    <span className="text-ink-dim ml-2 capitalize text-xs">{o.status}</span>
                  </button>
                ))}
              </div>
            )}

            {results && results.bookings.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-ink-dim uppercase tracking-widest px-4 pt-3 pb-1 flex items-center gap-1.5">
                  <Wrench size={10} /> Bookings
                </p>
                {results.bookings.slice(0, 4).map((b) => (
                  <button
                    key={b.id}
                    onClick={() => navigate("/repairs")}
                    className="w-full text-left px-4 py-2.5 hover:bg-base-hover text-sm border-b border-base-border/30 last:border-0 transition-colors"
                  >
                    <span className="font-mono text-xs text-ink-dim">#{b.id.slice(0, 8)}</span>
                    <span className="text-ink ml-2">{b.full_name}</span>
                    <span className="text-ink-dim ml-2 capitalize text-xs">
                      {b.device_type} {b.device_model}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        <NotificationBell />
        {fullName && (
          <div className="hidden md:flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-volt/20 flex items-center justify-center text-volt font-bold text-sm">
              {fullName.charAt(0).toUpperCase()}
            </div>
            <div className="text-xs">
              <p className="text-ink font-medium leading-none">{fullName}</p>
              <p className="text-ink-dim mt-0.5 capitalize">{role ?? "admin"}</p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
