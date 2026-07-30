"use client";

import { useMemo, useState, useEffect } from "react";
import Topbar from "@/components/layout/Topbar";
import StatusBadge from "@/components/ui/StatusBadge";
import Drawer from "@/components/ui/Drawer";
import { adminApi } from "@/lib/api";
import { formatKES } from "@/lib/mock-data";
import type { OrderStatus, PaymentStatus } from "@/lib/types";
import { Search, MessageCircle, Phone, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import clsx from "clsx";

const STATUS_FLOW: OrderStatus[] = ["pending", "confirmed", "processing", "dispatched", "delivered", "cancelled"];
const PAGE_SIZE = 20;

// Map backend snake_case → frontend camelCase
function mapOrder(o: any) {
  return {
    id: o.id,
    customerName: o.full_name,
    phone: o.phone_number,
    email: o.email,
    zoneId: o.delivery_zone,
    address: o.delivery_address,
    items: (o.order_items ?? []).map((i: any) => ({
      id: i.id, productId: i.product_id, title: i.product_name ?? i.title,
      qty: i.quantity, unitPrice: i.unit_price,
    })),
    deliveryFee: o.delivery_fee ?? 0,
    status: o.status,
    paymentStatus: o.payment_status,
    paymentMethod: o.payment_method,
    notes: o.notes,
    createdAt: o.created_at,
    updatedAt: o.updated_at,
    pointsEarned: o.points_earned ?? 0,
    totalAmount: o.total_amount ?? 0,
  };
}

const PAGE_SIZE_VAL = PAGE_SIZE;

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [nameFilter, setNameFilter] = useState("");
  const [phoneFilter, setPhoneFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<any | null>(null);

  useEffect(() => {
    adminApi.getOrders().then((r) => {
      setOrders((r.data ?? []).map(mapOrder));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => orders.filter((o) => {
    if (nameFilter && !o.customerName?.toLowerCase().includes(nameFilter.toLowerCase())) return false;
    if (phoneFilter && !o.phone?.includes(phoneFilter)) return false;
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    return true;
  }), [orders, nameFilter, phoneFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE_VAL));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE_VAL, page * PAGE_SIZE_VAL);
  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const totalPaidRevenue = orders.filter((o) => o.paymentStatus === "paid").reduce((s, o) => s + o.totalAmount, 0);

  async function updateStatus(id: string, status: string) {
    await adminApi.updateOrderStatus(id, status);
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status } : o));
    setSelected((prev: any) => prev?.id === id ? { ...prev, status } : prev);
  }

  return (
    <div>
      <Topbar title="Orders" subtitle="All e-commerce orders across every delivery zone." />

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="pill bg-warn/15 text-warn text-sm px-4 py-2">Pending: <b className="ml-1 tabular">{pendingCount}</b></div>
        <div className="pill bg-good/15 text-good text-sm px-4 py-2">Total paid: <b className="ml-1 tabular">{formatKES(totalPaidRevenue)}</b></div>
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
                <th className="th">Order</th><th className="th">Customer</th><th className="th">Zone</th>
                <th className="th">Total</th><th className="th">Payment</th><th className="th">Status</th>
                <th className="th">Placed</th><th className="th"></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="td text-center text-ink-dim py-10">Loading…</td></tr>}
              {!loading && pageItems.map((o) => (
                <tr key={o.id} className="border-b border-base-border/60 hover:bg-base-hover/50 transition-colors">
                  <td className="td font-medium tabular text-xs">{o.id?.slice(0, 8)}</td>
                  <td className="td"><div className="font-medium">{o.customerName}</div><div className="text-xs text-ink-dim">{o.phone}</div></td>
                  <td className="td text-ink-muted">{o.zoneId}</td>
                  <td className="td font-semibold tabular">{formatKES(o.totalAmount)}</td>
                  <td className="td"><StatusBadge status={o.paymentStatus} /></td>
                  <td className="td">
                    <select className={clsx("input-field !py-1.5 !px-2.5 text-xs")} value={o.status} onChange={(e) => updateStatus(o.id, e.target.value)}>
                      {STATUS_FLOW.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="td text-ink-dim text-xs whitespace-nowrap">{new Date(o.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}</td>
                  <td className="td"><button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setSelected(o)}>View</button></td>
                </tr>
              ))}
              {!loading && pageItems.length === 0 && <tr><td colSpan={8} className="td text-center text-ink-dim py-10">No orders match these filters.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-base-border text-sm text-ink-muted">
          <span>Showing {pageItems.length ? (page - 1) * PAGE_SIZE_VAL + 1 : 0}–{Math.min(page * PAGE_SIZE_VAL, filtered.length)} of {filtered.length}</span>
          <div className="flex items-center gap-2">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="btn-ghost !p-2 disabled:opacity-30"><ChevronLeft size={14} /></button>
            <span className="tabular">{page} / {totalPages}</span>
            <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="btn-ghost !p-2 disabled:opacity-30"><ChevronRight size={14} /></button>
          </div>
        </div>
      </div>

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected?.id?.slice(0, 8) ?? ""} subtitle="Order detail">
        {selected && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div><div className="font-semibold">{selected.customerName}</div><div className="text-xs text-ink-dim">{selected.phone}</div></div>
              <div className="flex gap-2">
                <a href={`https://wa.me/254${selected.phone?.slice(1)}`} target="_blank" className="btn-ghost !p-2.5"><MessageCircle size={15} /></a>
                <a href={`tel:${selected.phone}`} className="btn-ghost !p-2.5"><Phone size={15} /></a>
              </div>
            </div>
            <div className="card p-4"><div className="text-xs text-ink-dim mb-1">Delivery address</div><div className="text-sm">{selected.zoneId} — {selected.address}</div></div>
            <div>
              <div className="text-xs text-ink-dim mb-2 uppercase tracking-wider font-medium">Items</div>
              <table className="w-full text-sm">
                <thead><tr className="text-xs text-ink-dim border-b border-base-border"><th className="py-1.5 text-left">Product</th><th className="py-1.5 text-right">Qty</th><th className="py-1.5 text-right">Total</th></tr></thead>
                <tbody>
                  {selected.items.map((it: any) => (
                    <tr key={it.id} className="border-b border-base-border/50">
                      <td className="py-2">{it.title}</td>
                      <td className="py-2 text-right tabular">{it.qty}</td>
                      <td className="py-2 text-right tabular">{formatKES(it.qty * it.unitPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex flex-col gap-1 mt-3 text-sm">
                <div className="flex justify-between text-ink-muted"><span>Delivery fee</span><span className="tabular">{formatKES(selected.deliveryFee)}</span></div>
                <div className="flex justify-between font-semibold pt-1 border-t border-base-border"><span>Grand total</span><span className="tabular">{formatKES(selected.totalAmount)}</span></div>
              </div>
            </div>
            <div>
              <label className="text-xs text-ink-dim mb-1.5 block">Fulfillment status</label>
              <select className="input-field w-full" value={selected.status} onChange={(e) => updateStatus(selected.id, e.target.value)}>
                {STATUS_FLOW.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
