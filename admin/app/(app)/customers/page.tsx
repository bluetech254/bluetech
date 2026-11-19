"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Loader2, X, Phone, Mail, Calendar, ShoppingBag, Wrench, MessageCircle, Users as UsersIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { adminApi, formatKES } from "@/lib/api";

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminApi.customersList(search.trim() || undefined, page);
      setData(r);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  async function openCustomer(id: string) {
    setLoadingDetail(true);
    setDetail(null);
    try {
      const r = await adminApi.customerDetail(id);
      setDetail(r);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoadingDetail(false);
    }
  }

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pageSize = data?.page_size ?? 25;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="p-6 space-y-5 max-w-6xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-xl font-bold text-ink flex items-center gap-2"><UsersIcon size={20} /> Customers</h1>
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); load(); }} className="flex gap-2">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-dim" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, phone, email…" className="input-sm pl-9 w-72" />
          </div>
          <button className="btn-primary text-xs !py-2">Search</button>
        </form>
      </div>

      <div className="text-xs text-ink-dim">{total} customer{total === 1 ? "" : "s"} · auto-captured from orders, bookings, contacts & leads</div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-ink-dim border-b border-base-border">
              <th className="px-4 py-2.5 text-left font-medium">Name</th>
              <th className="px-4 py-2.5 text-left font-medium">Phone</th>
              <th className="px-4 py-2.5 text-left font-medium hidden md:table-cell">Email</th>
              <th className="px-4 py-2.5 text-right font-medium">Orders</th>
              <th className="px-4 py-2.5 text-right font-medium hidden sm:table-cell">Repairs</th>
              <th className="px-4 py-2.5 text-right font-medium hidden sm:table-cell">Leads</th>
              <th className="px-4 py-2.5 text-right font-medium">Spend</th>
              <th className="px-4 py-2.5 text-left font-medium hidden lg:table-cell">Last seen</th>
            </tr>
          </thead>
          <tbody>
            {loading && !items.length ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-ink-dim"><Loader2 size={18} className="animate-spin inline-block" /></td></tr>
            ) : !items.length ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-ink-dim">No customers found.</td></tr>
            ) : items.map((c: any) => (
              <tr key={c.id} onClick={() => openCustomer(c.id)} className="border-b border-base-border last:border-0 hover:bg-base-hover/40 cursor-pointer transition-colors">
                <td className="px-4 py-2.5 text-ink">{c.full_name || <span className="text-ink-dim italic">unknown</span>}</td>
                <td className="px-4 py-2.5 text-ink-dim text-xs">{c.phone}</td>
                <td className="px-4 py-2.5 text-ink-dim text-xs hidden md:table-cell">{c.email || "—"}</td>
                <td className="px-4 py-2.5 text-right text-ink text-xs">{c.orders_count ?? 0}</td>
                <td className="px-4 py-2.5 text-right text-ink-dim text-xs hidden sm:table-cell">{c.bookings_count ?? 0}</td>
                <td className="px-4 py-2.5 text-right text-ink-dim text-xs hidden sm:table-cell">{c.leads_count ?? 0}</td>
                <td className="px-4 py-2.5 text-right text-ink text-xs font-medium">{formatKES(c.total_spend ?? 0)}</td>
                <td className="px-4 py-2.5 text-ink-dim text-xs hidden lg:table-cell">{c.last_seen ? new Date(c.last_seen).toLocaleDateString() : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="btn-ghost text-xs !py-1.5 disabled:opacity-40"><ChevronLeft size={14} /></button>
          <span className="text-xs text-ink-dim">Page {page} of {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="btn-ghost text-xs !py-1.5 disabled:opacity-40"><ChevronRight size={14} /></button>
        </div>
      )}

      {/* Detail modal */}
      {detail !== null && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDetail(null)}>
          <div className="bg-base-panel border border-base-border rounded-2xl max-w-3xl w-full max-h-[88vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-base-panel border-b border-base-border px-5 py-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-ink">{detail.profile?.full_name || detail.profile?.phone || "Customer"}</h2>
              <button onClick={() => setDetail(null)} className="text-ink-dim hover:text-ink"><X size={18} /></button>
            </div>

            {loadingDetail ? (
              <div className="p-10 text-center text-ink-dim"><Loader2 size={20} className="animate-spin inline-block" /></div>
            ) : (
              <div className="p-5 space-y-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <Field icon={Phone} label="Phone" value={detail.profile?.phone} />
                  <Field icon={Mail} label="Email" value={detail.profile?.email} />
                  <Field icon={Calendar} label="First seen" value={detail.profile?.first_seen ? new Date(detail.profile.first_seen).toLocaleDateString() : "—"} />
                  <Field icon={Calendar} label="Last seen" value={detail.profile?.last_seen ? new Date(detail.profile.last_seen).toLocaleDateString() : "—"} />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Stat label="Orders" value={detail.stats?.orders_count ?? 0} icon={ShoppingBag} color="text-green-400" />
                  <Stat label="Repairs" value={detail.stats?.bookings_count ?? 0} icon={Wrench} color="text-blue-400" />
                  <Stat label="Leads" value={detail.stats?.leads_count ?? 0} icon={UsersIcon} color="text-violet-400" />
                  <Stat label="Total Spend" value={formatKES(detail.stats?.total_spend ?? 0)} icon={ShoppingBag} color="text-amber-400" />
                </div>

                <Timeline title="Orders" icon={ShoppingBag} rows={detail.orders} render={(o: any) => (
                  <div className="flex justify-between gap-2">
                    <span className="text-ink-dim">{new Date(o.created_at).toLocaleDateString()} · {o.payment_status} · {o.payment_method}</span>
                    <span className="text-ink font-medium">{formatKES(parseFloat(o.total_amount || 0))}</span>
                  </div>
                )} />
                <Timeline title="Repair Bookings" icon={Wrench} rows={detail.bookings} render={(b: any) => (
                  <div className="flex justify-between gap-2">
                    <span className="text-ink-dim">{new Date(b.created_at).toLocaleDateString()} · {b.booking_status || b.status || ""}</span>
                    <span className="text-ink font-medium">{b.final_cost ? formatKES(parseFloat(b.final_cost)) : ""}</span>
                  </div>
                )} />
                <Timeline title="Contact Messages" icon={MessageCircle} rows={detail.contacts} render={(c: any) => (
                  <div><span className="text-ink-dim">{new Date(c.created_at).toLocaleDateString()}</span><div className="text-ink text-xs">{c.subject}: {c.message?.slice(0, 80)}</div></div>
                )} />
                <Timeline title="Leads" icon={UsersIcon} rows={detail.leads} render={(l: any) => (
                  <div className="flex justify-between gap-2">
                    <span className="text-ink-dim">{new Date(l.created_at).toLocaleDateString()} · {l.channel} · {l.source || ""}</span>
                    <span className="text-ink">{l.status}</span>
                  </div>
                )} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ icon: Icon, label, value }: any) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-ink-dim flex items-center gap-1"><Icon size={12} /> {label}</span>
      <span className="text-ink">{value || "—"}</span>
    </div>
  );
}

function Stat({ icon: Icon, label, value, color }: any) {
  return (
    <div className="card p-3">
      <div className={`flex items-center gap-1.5 text-xs ${color}`}><Icon size={13} /> {label}</div>
      <div className="text-lg font-bold text-ink mt-1">{value}</div>
    </div>
  );
}

function Timeline({ title, icon: Icon, rows, render }: any) {
  if (!rows || !rows.length) return null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className="text-ink-dim" />
        <span className="text-sm font-semibold text-ink">{title}</span>
        <span className="text-xs text-ink-dim">({rows.length})</span>
      </div>
      <div className="card divide-y divide-base-border">
        {rows.map((r: any, i: number) => <div key={r.id || i} className="px-4 py-2 text-xs">{render(r)}</div>)}
      </div>
    </div>
  );
}
