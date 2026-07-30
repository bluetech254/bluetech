"use client";

import { useMemo, useState } from "react";
import Topbar from "@/components/layout/Topbar";
import StatusBadge from "@/components/ui/StatusBadge";
import Drawer from "@/components/ui/Drawer";
import { orders as seedOrders, zones, formatKES, orderTotal } from "@/lib/mock-data";
import type { Order, OrderStatus, PaymentStatus } from "@/lib/types";
import { Search, MessageCircle, Phone, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import clsx from "clsx";

const STATUS_FLOW: OrderStatus[] = ["pending", "confirmed", "processing", "dispatched", "delivered", "cancelled"];
const PAGE_SIZE = 20;

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>(seedOrders);
  const [nameFilter, setNameFilter] = useState("");
  const [phoneFilter, setPhoneFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Order | null>(null);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (nameFilter && !o.customerName.toLowerCase().includes(nameFilter.toLowerCase())) return false;
      if (phoneFilter && !o.phone.includes(phoneFilter)) return false;
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      return true;
    });
  }, [orders, nameFilter, phoneFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const totalPaidRevenue = orders.filter((o) => o.paymentStatus === "paid").reduce((s, o) => s + orderTotal(o), 0);

  function updateOrder(id: string, patch: Partial<Order>) {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch, updatedAt: new Date().toISOString() } : o)));
    setSelected((prev) => (prev && prev.id === id ? { ...prev, ...patch } : prev));
  }

  return (
    <div>
      <Topbar title="Orders" subtitle="All e-commerce orders across every delivery zone." />

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="pill bg-warn/15 text-warn text-sm px-4 py-2">Pending orders: <b className="ml-1 tabular">{pendingCount}</b></div>
        <div className="pill bg-good/15 text-good text-sm px-4 py-2">Total paid revenue: <b className="ml-1 tabular">{formatKES(totalPaidRevenue)}</b></div>
        <div className="pill bg-volt/15 text-volt text-sm px-4 py-2">Total orders: <b className="ml-1 tabular">{orders.length}</b></div>
      </div>

      <div className="card p-4 mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 input-field flex-1 min-w-[200px]">
            <Search size={14} className="text-ink-dim" />
            <input className="bg-transparent outline-none w-full text-sm" placeholder="Search by customer name…" value={nameFilter} onChange={(e) => { setNameFilter(e.target.value); setPage(1); }} />
          </div>
          <input className="input-field min-w-[180px]" placeholder="Search by phone…" value={phoneFilter} onChange={(e) => { setPhoneFilter(e.target.value); setPage(1); }} />
          <select className="input-field min-w-[160px]" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="all">All statuses</option>
            {STATUS_FLOW.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="btn-ghost" onClick={() => { setNameFilter(""); setPhoneFilter(""); setStatusFilter("all"); setPage(1); }}>
            <Filter size={14} /> Reset
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-base-border">
              <tr>
                <th className="th">Order</th>
                <th className="th">Customer</th>
                <th className="th">Zone</th>
                <th className="th">Total</th>
                <th className="th">Payment</th>
                <th className="th">Status</th>
                <th className="th">Placed</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((o) => (
                <tr key={o.id} className="border-b border-base-border/60 hover:bg-base-hover/50 transition-colors">
                  <td className="td font-medium tabular">{o.id}</td>
                  <td className="td">
                    <div className="font-medium">{o.customerName}</div>
                    <div className="text-xs text-ink-dim">{o.phone}</div>
                  </td>
                  <td className="td text-ink-muted">{zones.find((z) => z.id === o.zoneId)?.name}</td>
                  <td className="td font-semibold tabular">{formatKES(orderTotal(o))}</td>
                  <td className="td">
                    <button
                      onClick={() => updateOrder(o.id, { paymentStatus: o.paymentStatus === "paid" ? "unpaid" as PaymentStatus : "paid" as PaymentStatus })}
                      className="cursor-pointer"
                      title="Toggle payment status"
                    >
                      <StatusBadge status={o.paymentStatus} />
                    </button>
                  </td>
                  <td className="td">
                    <select
                      className={clsx("input-field !py-1.5 !px-2.5 text-xs")}
                      value={o.status}
                      onChange={(e) => updateOrder(o.id, { status: e.target.value as OrderStatus })}
                    >
                      {STATUS_FLOW.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="td text-ink-dim text-xs whitespace-nowrap">{new Date(o.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}</td>
                  <td className="td">
                    <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setSelected(o)}>View</button>
                  </td>
                </tr>
              ))}
              {pageItems.length === 0 && (
                <tr><td colSpan={8} className="td text-center text-ink-dim py-10">No orders match these filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-base-border text-sm text-ink-muted">
          <span>Showing {pageItems.length ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
          <div className="flex items-center gap-2">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="btn-ghost !p-2 disabled:opacity-30"><ChevronLeft size={14} /></button>
            <span className="tabular">{page} / {totalPages}</span>
            <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="btn-ghost !p-2 disabled:opacity-30"><ChevronRight size={14} /></button>
          </div>
        </div>
      </div>

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected?.id ?? ""} subtitle="Order detail">
        {selected && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{selected.customerName}</div>
                <div className="text-xs text-ink-dim">{selected.phone}</div>
              </div>
              <div className="flex gap-2">
                <a href={`https://wa.me/254${selected.phone.slice(1)}`} target="_blank" className="btn-ghost !p-2.5"><MessageCircle size={15} /></a>
                <a href={`tel:${selected.phone}`} className="btn-ghost !p-2.5"><Phone size={15} /></a>
              </div>
            </div>

            <div className="card p-4">
              <div className="text-xs text-ink-dim mb-1">Delivery address</div>
              <div className="text-sm">{zones.find((z) => z.id === selected.zoneId)?.name} — {selected.address}</div>
            </div>

            <div>
              <div className="text-xs text-ink-dim mb-2 uppercase tracking-wider font-medium">Items</div>
              <table className="w-full text-sm">
                <thead><tr className="text-xs text-ink-dim border-b border-base-border"><th className="py-1.5 text-left">Product</th><th className="py-1.5 text-right">Qty</th><th className="py-1.5 text-right">Total</th></tr></thead>
                <tbody>
                  {selected.items.map((it) => (
                    <tr key={it.id} className="border-b border-base-border/50">
                      <td className="py-2">{it.title}</td>
                      <td className="py-2 text-right tabular">{it.qty}</td>
                      <td className="py-2 text-right tabular">{formatKES(it.qty * it.unitPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex flex-col gap-1 mt-3 text-sm">
                <div className="flex justify-between text-ink-muted"><span>Subtotal</span><span className="tabular">{formatKES(orderTotal(selected) - selected.deliveryFee)}</span></div>
                <div className="flex justify-between text-ink-muted"><span>Delivery fee</span><span className="tabular">{formatKES(selected.deliveryFee)}</span></div>
                <div className="flex justify-between font-semibold pt-1 border-t border-base-border"><span>Grand total</span><span className="tabular">{formatKES(orderTotal(selected))}</span></div>
                <div className="flex justify-between text-good text-xs pt-1"><span>Loyalty points earned</span><span className="tabular">+{selected.pointsEarned} pts</span></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-ink-dim mb-1.5 block">Fulfillment status</label>
                <select className="input-field w-full" value={selected.status} onChange={(e) => updateOrder(selected.id, { status: e.target.value as OrderStatus })}>
                  {STATUS_FLOW.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-ink-dim mb-1.5 block">Payment status</label>
                <select className="input-field w-full" value={selected.paymentStatus} onChange={(e) => updateOrder(selected.id, { paymentStatus: e.target.value as PaymentStatus })}>
                  <option value="paid">paid</option>
                  <option value="unpaid">unpaid</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-ink-dim mb-1.5 block">Internal notes</label>
              <textarea
                className="input-field w-full min-h-[90px]"
                defaultValue={selected.notes}
                placeholder="Add a note visible only to admins…"
                onBlur={(e) => updateOrder(selected.id, { notes: e.target.value })}
              />
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
