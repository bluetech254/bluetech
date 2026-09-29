"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, X, Package, MapPin, Phone, Mail, FileText, Loader2, AlertTriangle } from "lucide-react";
import { adminApi, formatKES } from "@/lib/api";
import { Order, OrderStatus } from "@/lib/types";
import StatusBadge from "@/components/ui/StatusBadge";

const TABS: { label: string; value: OrderStatus | "" }[] = [
  { label: "All", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Processing", value: "processing" },
  { label: "Dispatched", value: "dispatched" },
  { label: "Delivered", value: "delivered" },
  { label: "Cancelled", value: "cancelled" },
];

const STATUS_OPTIONS: OrderStatus[] = ["pending", "confirmed", "processing", "dispatched", "delivered", "cancelled"];

const STATUS_COLORS: Record<string, string> = {
  pending: "text-amber-500",
  confirmed: "text-blue-500",
  processing: "text-indigo-500",
  dispatched: "text-purple-500",
  delivered: "text-green-500",
  cancelled: "text-red-500",
};

export default function OrdersPage() {
  const [tab, setTab] = useState<OrderStatus | "">("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<OrderStatus>("confirmed");
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  function load() {
    setLoading(true);
    adminApi
      .getOrders(tab || undefined)
      .then((res: any) => setOrders(res.data ?? []))
      .catch((e) => setError(e.message ?? "Failed to load orders"))
      .finally(() => setLoading(false));
  }

  useEffect(load, [tab]);

  // Lock body scroll when modal open
  useEffect(() => {
    document.body.style.overflow = detailOrder ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [detailOrder]);

  const allSelected = orders.length > 0 && selected.size === orders.length;
  function toggleAll() { setSelected(allSelected ? new Set() : new Set(orders.map((o) => o.id))); }
  function toggleOne(id: string) {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function updateStatus(id: string, status: string) {
    await adminApi.updateOrderStatus(id, status);
    load();
  }

  async function applyBulk() {
    if (selected.size === 0) return;
    await adminApi.bulkOrderStatus(Array.from(selected), bulkStatus);
    setSelected(new Set());
    load();
  }

  async function handleModalStatusChange(status: string) {
    if (!detailOrder) return;
    setUpdatingStatus(true);
    try {
      await adminApi.updateOrderStatus(detailOrder.id, status);
      setDetailOrder({ ...detailOrder, status: status as OrderStatus });
      load();
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleCancel() {
    if (!detailOrder) return;
    if (!confirm(`Cancel order #${detailOrder.id.slice(0, 8)}?`)) return;
    setCancelling(true);
    try {
      await adminApi.cancelOrder(detailOrder.id);
      setDetailOrder({ ...detailOrder, status: "cancelled" });
      load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setCancelling(false);
    }
  }

  const exportUrl = useMemo(() => adminApi.exportOrdersUrl({ status: tab || undefined }), [tab]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {TABS.map((t) => (
            <button key={t.label} onClick={() => setTab(t.value)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === t.value ? "bg-volt text-white" : "bg-base-panel text-ink-muted hover:text-ink border border-base-border"
              }`}>
              {t.label}
            </button>
          ))}
        </div>
        <a href={exportUrl} target="_blank" rel="noreferrer" className="btn-ghost">
          <Download size={15} /> Export CSV
        </a>
      </div>

      {selected.size > 0 && (
        <div className="card p-3 flex items-center gap-3">
          <span className="text-sm text-ink-muted">{selected.size} selected</span>
          <select className="select-field text-sm" value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value as OrderStatus)}>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={applyBulk} className="btn-primary !py-1.5 text-sm">Apply to selected</button>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th w-10"><input type="checkbox" checked={allSelected} onChange={toggleAll} /></th>
              <th className="th">Order</th>
              <th className="th">Customer</th>
              <th className="th">Phone</th>
              <th className="th">Total</th>
              <th className="th">Payment</th>
              <th className="th">Status</th>
              <th className="th">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td className="td text-ink-dim" colSpan={8}>Loading orders…</td></tr>}
            {error && <tr><td className="td text-bad" colSpan={8}>{error}</td></tr>}
            {!loading && orders.length === 0 && <tr><td className="td text-ink-dim" colSpan={8}>No orders found.</td></tr>}
            {orders.map((o) => (
              <tr key={o.id}
                className="hover:bg-base-hover/40 cursor-pointer"
                onClick={() => setDetailOrder(o)}>
                <td className="td" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={selected.has(o.id)} onChange={() => toggleOne(o.id)} />
                </td>
                <td className="td tabular text-ink-muted font-mono">#{o.id.slice(0, 8)}</td>
                <td className="td font-medium">{o.full_name}</td>
                <td className="td tabular text-ink-muted">{o.phone_number}</td>
                <td className="td tabular font-bold">{formatKES(o.total_amount)}</td>
                <td className="td">
                  <span className={`text-xs font-bold capitalize ${o.payment_status === "paid" ? "text-green-500" : "text-amber-500"}`}>
                    {o.payment_status}
                  </span>
                </td>
                <td className="td" onClick={(e) => e.stopPropagation()}>
                  <select className="select-field text-xs !py-1 !px-2" value={o.status}
                    onChange={(e) => updateStatus(o.id, e.target.value)}>
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="td text-ink-muted text-xs">{new Date(o.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Order Detail Modal */}
      {detailOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}>
          <div className="bg-base-panel border border-base-border rounded-2xl shadow-2xl w-full max-w-lg flex flex-col"
            style={{ maxHeight: "90vh" }}>

            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-base-border flex-shrink-0">
              <div>
                <p className="text-xs text-ink-dim font-mono">#{detailOrder.id}</p>
                <h2 className="font-bold text-ink text-base mt-0.5">Order Details</h2>
              </div>
              <div className="flex items-center gap-2">
                <a href={`/receipt?type=order&id=${detailOrder.id}`} target="_blank" rel="noreferrer"
                  className="btn-ghost !py-1 !px-2.5 text-xs">🧾 Receipt</a>
                <button onClick={() => setDetailOrder(null)} className="p-1.5 rounded-lg hover:bg-base-hover text-ink-muted hover:text-ink transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 p-5 space-y-5">

              {/* Status + Payment */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`text-sm font-bold capitalize ${STATUS_COLORS[detailOrder.status] ?? "text-ink"}`}>
                  ● {detailOrder.status}
                </span>
                <span className={`text-xs font-bold capitalize px-2 py-0.5 rounded-full ${
                  detailOrder.payment_status === "paid" ? "bg-green-500/10 text-green-500" : "bg-amber-500/10 text-amber-500"
                }`}>
                  {detailOrder.payment_status}
                </span>
                {detailOrder.mpesa_receipt && (
                  <span className="text-xs text-ink-dim font-mono">Receipt: {detailOrder.mpesa_receipt}</span>
                )}
              </div>

              {/* Customer */}
              <div className="bg-base-hover rounded-xl p-4 space-y-2">
                <p className="text-xs text-ink-dim font-bold uppercase tracking-wider">Customer</p>
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2"><Phone size={13} className="text-ink-dim" /><span>{detailOrder.full_name} · {detailOrder.phone_number}</span></div>
                  {detailOrder.email && <div className="flex items-center gap-2"><Mail size={13} className="text-ink-dim" /><span>{detailOrder.email}</span></div>}
                  {detailOrder.delivery_address && <div className="flex items-start gap-2"><MapPin size={13} className="text-ink-dim mt-0.5" /><span>{detailOrder.delivery_zone} — {detailOrder.delivery_address}</span></div>}
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2">
                <p className="text-xs text-ink-dim font-bold uppercase tracking-wider flex items-center gap-1.5"><Package size={12} />Items</p>
                <div className="divide-y divide-base-border rounded-xl border border-base-border overflow-hidden">
                  {(detailOrder.order_items ?? []).map((it) => {
                    const label = it.product_title ?? it.title ?? "Item";
                    const unitPrice = it.unit_price ?? it.price ?? 0;
                    const lineTotal = it.total_price ?? unitPrice * it.quantity;
                    return (
                      <div key={it.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                        <span className="text-ink">{it.quantity}× {label}</span>
                        <span className="font-bold tabular-nums">{formatKES(lineTotal)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Totals */}
              <div className="bg-base-hover rounded-xl p-4 space-y-1.5 text-sm">
                <div className="flex justify-between text-ink-muted"><span>Subtotal</span><span>{formatKES(detailOrder.subtotal)}</span></div>
                <div className="flex justify-between text-ink-muted"><span>Delivery</span><span>{formatKES(detailOrder.delivery_fee)}</span></div>
                {detailOrder.points_discount > 0 && (
                  <div className="flex justify-between text-green-500"><span>Points discount</span><span>− {formatKES(detailOrder.points_discount)}</span></div>
                )}
                <div className="flex justify-between font-bold text-ink border-t border-base-border pt-1.5 mt-1"><span>Total</span><span>{formatKES(detailOrder.total_amount)}</span></div>
              </div>

              {/* Notes */}
              {detailOrder.notes && (
                <div className="flex items-start gap-2 text-sm text-ink-muted">
                  <FileText size={13} className="mt-0.5 flex-shrink-0" />
                  <span>{detailOrder.notes}</span>
                </div>
              )}

              {/* Update Status */}
              <div className="space-y-2">
                <p className="text-xs text-ink-dim font-bold uppercase tracking-wider">Update Status</p>
                <div className="flex gap-2 flex-wrap">
                  {STATUS_OPTIONS.filter(s => s !== detailOrder.status && s !== "cancelled").map(s => (
                    <button key={s} onClick={() => handleModalStatusChange(s)}
                      disabled={updatingStatus}
                      className="px-3 py-1.5 rounded-lg border border-base-border text-xs font-medium text-ink-muted hover:text-ink hover:bg-base-hover transition-colors disabled:opacity-50 capitalize">
                      {updatingStatus ? <Loader2 size={12} className="animate-spin" /> : s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer actions */}
            <div className="p-4 border-t border-base-border flex items-center justify-between gap-3 flex-shrink-0">
              <button onClick={() => setDetailOrder(null)}
                className="px-4 py-2 rounded-lg border border-base-border text-sm text-ink-muted hover:text-ink transition-colors">
                Close
              </button>
              {detailOrder.status !== "cancelled" && detailOrder.status !== "delivered" && (
                <button onClick={handleCancel} disabled={cancelling}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 text-sm font-bold transition-colors disabled:opacity-50">
                  {cancelling ? <Loader2 size={14} className="animate-spin" /> : <AlertTriangle size={14} />}
                  Cancel Order
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
