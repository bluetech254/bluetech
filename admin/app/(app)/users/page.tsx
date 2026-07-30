"use client";

import { useState, useEffect } from "react";
import Topbar from "@/components/layout/Topbar";
import { adminApi } from "@/lib/api";
import { formatKES } from "@/lib/mock-data";
import { Search, BadgeCheck, ShieldOff } from "lucide-react";
import clsx from "clsx";

function mapUser(u: any) {
  return {
    id: u.id,
    name: u.full_name,
    email: u.email,
    phone: u.phone_number,
    verified: u.is_verified ?? u.verified ?? false,
    registeredAt: u.created_at,
    lastSignIn: u.last_login ?? u.updated_at ?? u.created_at,
    isActive: u.is_active ?? true,
    loyaltyPoints: u.points ?? 0,
    lifetimeSpend: u.lifetime_spend ?? 0,
  };
}

export default function UsersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    // Use supabase admin client via backend search — fetch all users
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/search?q=+`, {
      headers: {
        Authorization: `Bearer ${(() => { try { const r = document.cookie.split("; ").find((c) => c.startsWith("admin_session="))?.split("=").slice(1).join("="); return r ? JSON.parse(decodeURIComponent(r)).token : ""; } catch { return ""; } })()}`,
      },
    })
      .then((r) => r.json())
      .then((d) => { setCustomers((d.users ?? []).map(mapUser)); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = customers.filter((c) =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search)
  );

  async function toggleActive(id: string, current: boolean) {
    await adminApi.toggleUserActive(id, !current);
    setCustomers((prev) => prev.map((c) => c.id === id ? { ...c, isActive: !current } : c));
  }

  const activeCount = customers.filter((c) => c.isActive).length;
  const verifiedCount = customers.filter((c) => c.verified).length;

  return (
    <div>
      <Topbar title="Users" subtitle="Everyone with a BlueTech client account." />

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="pill bg-volt/15 text-volt text-sm px-4 py-2">Total users: <b className="ml-1 tabular">{customers.length}</b></div>
        <div className="pill bg-good/15 text-good text-sm px-4 py-2">Active: <b className="ml-1 tabular">{activeCount}</b></div>
        <div className="pill bg-lilac-tile/15 text-lilac-tile text-sm px-4 py-2">Verified: <b className="ml-1 tabular">{verifiedCount}</b></div>
      </div>

      <div className="card p-4 mb-5">
        <div className="flex items-center gap-2 input-field max-w-sm">
          <Search size={14} className="text-ink-dim" />
          <input className="bg-transparent outline-none w-full text-sm" placeholder="Search by name or phone…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-base-border">
              <tr>
                <th className="th">Name</th><th className="th">Contact</th><th className="th">Verified</th>
                <th className="th">Points</th><th className="th">Registered</th><th className="th"></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="td text-center text-ink-dim py-10">Loading…</td></tr>}
              {!loading && filtered.map((c) => (
                <tr key={c.id} className="border-b border-base-border/60 hover:bg-base-hover/50 transition-colors">
                  <td className="td font-medium">{c.name}</td>
                  <td className="td text-ink-muted"><div>{c.phone}</div><div className="text-xs text-ink-dim">{c.email}</div></td>
                  <td className="td">
                    {c.verified ? <span className="pill bg-good/15 text-good text-[11px]"><BadgeCheck size={11} /> Verified</span> : <span className="pill bg-ink-dim/20 text-ink-muted text-[11px]">Unverified</span>}
                  </td>
                  <td className="td tabular">{c.loyaltyPoints.toLocaleString()}</td>
                  <td className="td text-xs text-ink-dim whitespace-nowrap">{new Date(c.registeredAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}</td>
                  <td className="td">
                    <button onClick={() => toggleActive(c.id, c.isActive)} className={clsx("pill text-[11px]", c.isActive ? "bg-good/15 text-good" : "bg-bad/15 text-bad")}>
                      {c.isActive ? "Active" : <><ShieldOff size={11} /> Deactivated</>}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
