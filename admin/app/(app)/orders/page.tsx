"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { Download, ChevronDown, ChevronRight } from "lucide-react";
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

export default function OrdersPage() {
  const [tab, setTab] = useState<OrderStatus | "">("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<OrderStatus>("confirmed");

  function load() {
    setLoading(true);
    adminApi
      .getOrders(tab || undefined)
      .then((res: any) => setOrders(res.data ?? []))
      .catch((e) => setError(e.message ?? "Failed to load orders"))
      .finally(() => setLoading(false));
  }

  useEffect(load, [tab]);

  const allSelected = orders.length > 0 && selected.size === orders.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(orders.map((o) => o.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
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

  const exportUrl = useMemo(() => adminApi.exportOrdersUrl({ status: tab || undefined }), [tab]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {TABS.map((t) => (
            <button
              key={t.label}
              onClick={() => setTab(t.value)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === t.value ? "bg-volt text-white" : "bg-base-panel text-ink-muted hover:text-ink border border-base-border"
              }`}
            >
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
              <th className="th w-8"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td className="td text-ink-dim" colSpan={9}>Loading orders…</td></tr>}
            {error && <tr><td className="td text-bad" colSpan={9}>{error}</td></tr>}
            {!loading && orders.length === 0 && <tr><td className="td text-ink-dim" colSpan={9}>No orders found.</td></tr>}
            {orders.map((o) => (
              <Fragment key={o.id}>
                <tr className="hover:bg-base-hover/40 cursor-pointer" onClick={() => setExpanded(expanded === o.id ? null : o.id)}>
                  <td className="td" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(o.id)} onChange={() => toggleOne(o.id)} />
                  </td>
                  <td className="td tabular text-ink-muted">#{o.id.slice(0, 8)}</td>
                  <td className="td">{o.full_name}</td>
                  <td className="td tabular">{o.phone_number}</td>
                  <td className="td tabular">{formatKES(o.total_amount)}</td>
                  <td className="td capitalize">{o.payment_status}</td>
                  <td className="td" onClick={(e) => e.stopPropagation()}>
                    <select
                      className="select-field text-xs !py-1 !px-2"
                      value={o.status}
                      onChange={(e) => updateStatus(o.id, e.target.value)}
                    >
                      {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="td text-ink-muted">{new Date(o.created_at).toLocaleDateString()}</td>
                  <td className="td">{expanded === o.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</td>
                </tr>
                {expanded === o.id && (
                  <tr>
                    <td colSpan={9} className="td bg-base-hover/30">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-2">
                        <div>
                          <p className="text-xs text-ink-dim mb-1">Delivery</p>
                          <p className="text-sm">{o.delivery_zone ?? "—"}</p>
                          <p className="text-sm text-ink-muted">{o.delivery_address ?? "No address on file"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-ink-dim mb-1">Items</p>
                          {(o.order_items ?? []).map((it) => (
                            <p key={it.id} className="text-sm">{it.quantity}× {it.title} — {formatKES(it.price)}</p>
                          ))}
                        </div>
                        <div>
                          <p className="text-xs text-ink-dim mb-1">Notes</p>
                          <p className="text-sm text-ink-muted">{o.notes || "No notes"}</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
