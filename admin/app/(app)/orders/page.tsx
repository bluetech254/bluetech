"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Download, X, Package, MapPin, Phone, Mail, FileText,
  Loader2, AlertTriangle, ChevronRight, Clock, CheckCircle2,
  Cog, Truck, CheckCheck, Ban, Send, Banknote, Smartphone, XCircle,
} from "lucide-react";
import { adminApi, formatKES } from "@/lib/api";
import StkModal from "@/components/payments/StkModal";
import { initiateOrderPayment, verifyOrderPayment } from "@/lib/payments";
import { Order, OrderStatus } from "@/lib/types";

// ── Status chain ──────────────────────────────────────────────────────────────

const ORDER_CHAIN: OrderStatus[] = ["pending", "confirmed", "processing", "dispatched", "delivered"];
const ORDER_TERMINAL: OrderStatus[] = ["delivered", "cancelled"];

function nextOrderStatus(current: OrderStatus): OrderStatus | null {
  const idx = ORDER_CHAIN.indexOf(current);
  if (ORDER_TERMINAL.includes(current) || idx < 0 || idx + 1 >= ORDER_CHAIN.length) return null;
  return ORDER_CHAIN[idx + 1];
}

const STATUS_META: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  pending:    { label: "Pending",    icon: Clock,        color: "text-amber-400",  bg: "bg-amber-400" },
  confirmed:  { label: "Confirmed",  icon: CheckCircle2, color: "text-blue-400",   bg: "bg-blue-400" },
  processing: { label: "Processing", icon: Cog,          color: "text-indigo-400", bg: "bg-indigo-400" },
  dispatched: { label: "Dispatched", icon: Truck,        color: "text-purple-400", bg: "bg-purple-400" },
  delivered:  { label: "Delivered",  icon: CheckCheck,   color: "text-green-500",  bg: "bg-green-500" },
  cancelled:  { label: "Cancelled",  icon: Ban,          color: "text-red-500",    bg: "bg-red-500" },
};

const TABS: { label: string; value: OrderStatus | "" }[] = [
  { label: "All",        value: "" },
  { label: "Pending",    value: "pending" },
  { label: "Confirmed",  value: "confirmed" },
  { label: "Processing", value: "processing" },
  { label: "Dispatched", value: "dispatched" },
  { label: "Delivered",  value: "delivered" },
  { label: "Cancelled",  value: "cancelled" },
];

const ALL_STATUSES: OrderStatus[] = ["pending", "confirmed", "processing", "dispatched", "delivered", "cancelled"];

// ── Payment modal types ───────────────────────────────────────────────────────

type PayState = "choose" | "mpesa_loading" | "mpesa_paid" | "mpesa_failed" | "cash_confirm" | "cash_loading" | "cash_paid";
interface PaySession { order: Order; state: PayState; receipt?: string; error?: string; }

// ── Component ─────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const [tab, setTab]           = useState<OrderStatus | "">("");
  const [orders, setOrders]     = useState<Order[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<OrderStatus>("confirmed");
  const [detail, setDetail]     = useState<Order | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [cancelling, setCancelling]         = useState(false);
  const [paySession, setPaySession]         = useState<PaySession | null>(null);

  // ── data ──────────────────────────────────────────────────────────────────

  function load() {
    setLoading(true);
    adminApi.getOrders(tab || undefined)
      .then((res: any) => setOrders(res.data ?? []))
      .catch((e: any) => setError(e.message ?? "Failed to load orders"))
      .finally(() => setLoading(false));
  }

  useEffect(load, [tab]);

  useEffect(() => {
    document.body.style.overflow = (detail || paySession) ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [detail, paySession]);

  async function refreshDetail(id: string) {
    const o = await adminApi.getOrder(id) as Order;
    setDetail(o);
    load();
  }

  // ── selection & bulk ──────────────────────────────────────────────────────

  const allSelected = orders.length > 0 && selected.size === orders.length;
  function toggleAll() { setSelected(allSelected ? new Set() : new Set(orders.map((o) => o.id))); }
  function toggleOne(id: string) {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function applyBulk() {
    if (selected.size === 0) return;
    try {
      const res: any = await adminApi.bulkOrderStatus(Array.from(selected), bulkStatus);
      const failed = (res?.failed ?? []) as any[];
      if (failed.length) alert(`${res?.message}\nFailed: ${failed.map((f: any) => `${String(f.id).slice(0, 8)}: ${f.error}`).join("; ")}`);
      setSelected(new Set());
      load();
    } catch (e: any) { alert(e.message ?? "Bulk update failed"); }
  }

  // ── status ────────────────────────────────────────────────────────────────

  async function handleAdvance() {
    if (!detail) return;
    const nxt = nextOrderStatus(detail.status);
    if (!nxt) return;
    setUpdatingStatus(true);
    try {
      await adminApi.updateOrderStatus(detail.id, nxt);
      await refreshDetail(detail.id);
    } catch (e: any) {
      alert(e.message ?? "Invalid transition");
    } finally { setUpdatingStatus(false); }
  }

  async function handleCancel() {
    if (!detail) return;
    if (!confirm(`Cancel order #${detail.id.slice(0, 8).toUpperCase()}? This cannot be undone.`)) return;
    setCancelling(true);
    try {
      await adminApi.cancelOrder(detail.id);
      await refreshDetail(detail.id);
    } catch (e: any) { alert(e.message); }
    finally { setCancelling(false); }
  }

  // ── payment ───────────────────────────────────────────────────────────────

  async function handleCashPayment() {
    if (!paySession) return;
    setPaySession(s => s && { ...s, state: "cash_loading" });
    try {
      const res = await adminApi.recordOrderCashPayment(paySession.order.id);
      setPaySession(s => s && { ...s, state: "cash_paid", receipt: res.receipt });
      await refreshDetail(paySession.order.id);
    } catch (e: any) {
      setPaySession(s => s && { ...s, state: "choose", error: e.message });
    }
  }

  function closePaySession() {
    setPaySession(null);
    if (detail) refreshDetail(detail.id);
  }

  const exportUrl = useMemo(() => adminApi.exportOrdersUrl({ status: tab || undefined }), [tab]);

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* Tabs + export */}
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

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="card p-3 flex items-center gap-3">
          <span className="text-sm text-ink-muted">{selected.size} selected</span>
          <select className="select-field text-sm" value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value as OrderStatus)}>
            {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={applyBulk} className="btn-primary !py-1.5 text-sm">Apply</button>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th w-10">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} />
              </th>
              <th className="th">Order</th>
              <th className="th">Customer</th>
              <th className="th">Total</th>
              <th className="th">Payment</th>
              <th className="th">Status</th>
              <th className="th">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td className="td text-ink-dim" colSpan={7}>Loading orders…</td></tr>}
            {error   && <tr><td className="td text-bad"    colSpan={7}>{error}</td></tr>}
            {!loading && orders.length === 0 && (
              <tr><td className="td text-ink-dim" colSpan={7}>No orders found.</td></tr>
            )}
            {orders.map((o) => {
              const meta = STATUS_META[o.status];
              const Icon = meta?.icon ?? Clock;
              return (
                <tr key={o.id}
                  className="hover:bg-base-hover/40 cursor-pointer transition-colors"
                  onClick={() => setDetail(o)}>
                  <td className="td" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(o.id)} onChange={() => toggleOne(o.id)} />
                  </td>
                  <td className="td font-mono text-xs text-ink-muted">#{o.id.slice(0, 8).toUpperCase()}</td>
                  <td className="td">
                    <p className="text-sm font-medium text-ink">{o.full_name}</p>
                    <p className="text-xs text-ink-dim">{o.phone_number}</p>
                  </td>
                  <td className="td tabular font-bold text-sm">{formatKES(o.total_amount)}</td>
                  <td className="td">
                    <span className={`text-xs font-semibold capitalize ${o.payment_status === "paid" ? "text-green-500" : "text-amber-400"}`}>
                      {o.payment_status === "paid" ? "✓ Paid" : "Unpaid"}
                    </span>
                  </td>
                  <td className="td">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold capitalize ${meta?.color ?? "text-ink-muted"}`}>
                      <Icon size={11} />{meta?.label ?? o.status}
                    </span>
                  </td>
                  <td className="td text-xs text-ink-muted">
                    {new Date(o.created_at).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Order Detail Modal ── */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-base-panel border border-base-border rounded-2xl shadow-2xl w-full max-w-xl flex flex-col"
            style={{ maxHeight: "92vh" }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-base-border flex-shrink-0">
              <div>
                <p className="text-xs text-ink-dim font-mono">#{detail.id.slice(0, 8).toUpperCase()}</p>
                <h2 className="font-bold text-ink text-base mt-0.5">Order Details</h2>
              </div>
              <div className="flex items-center gap-2">
                <a href={`/receipt?type=order&id=${detail.id}`} target="_blank" rel="noreferrer"
                  className="btn-ghost !py-1 !px-2.5 text-xs">🧾 Receipt</a>
                <button onClick={() => { setDetail(null); load(); }}
                  className="p-1.5 rounded-lg hover:bg-base-hover text-ink-muted hover:text-ink transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

              {/* ── Status stepper ── */}
              <OrderStepper status={detail.status} />

              {/* ── Customer & delivery ── */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-base-hover rounded-xl p-3.5 space-y-1.5">
                  <p className="text-[10px] text-ink-dim font-bold uppercase tracking-wider flex items-center gap-1">
                    <Phone size={10} /> Customer
                  </p>
                  <p className="text-sm font-semibold text-ink">{detail.full_name}</p>
                  <p className="text-xs text-ink-muted">{detail.phone_number}</p>
                  {detail.email && <p className="text-xs text-ink-dim">{detail.email}</p>}
                </div>
                <div className="bg-base-hover rounded-xl p-3.5 space-y-1.5">
                  <p className="text-[10px] text-ink-dim font-bold uppercase tracking-wider flex items-center gap-1">
                    <MapPin size={10} /> Delivery
                  </p>
                  <p className="text-sm font-semibold text-ink">{detail.delivery_zone ?? "—"}</p>
                  {detail.delivery_address && (
                    <p className="text-xs text-ink-muted">{detail.delivery_address}</p>
                  )}
                </div>
              </div>

              {/* ── Items ── */}
              <div className="space-y-2">
                <p className="text-[10px] text-ink-dim font-bold uppercase tracking-wider flex items-center gap-1">
                  <Package size={10} /> Items
                </p>
                <div className="divide-y divide-base-border rounded-xl border border-base-border overflow-hidden">
                  {(detail.order_items ?? []).map((it) => {
                    const label     = it.product_title ?? it.title ?? "Item";
                    const unitPrice = it.unit_price ?? it.price ?? 0;
                    const lineTotal = it.total_price ?? unitPrice * it.quantity;
                    return (
                      <div key={it.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                        <div>
                          <span className="text-ink font-medium">{label}</span>
                          <span className="text-ink-dim ml-2 text-xs">×{it.quantity}</span>
                        </div>
                        <span className="font-bold tabular-nums">{formatKES(lineTotal)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Totals ── */}
              <div className="bg-base-hover rounded-xl p-4 space-y-1.5 text-sm">
                <div className="flex justify-between text-ink-muted">
                  <span>Subtotal</span><span>{formatKES(detail.subtotal)}</span>
                </div>
                <div className="flex justify-between text-ink-muted">
                  <span>Delivery</span><span>{formatKES(detail.delivery_fee)}</span>
                </div>
                {detail.points_discount > 0 && (
                  <div className="flex justify-between text-green-500">
                    <span>Points discount</span><span>− {formatKES(detail.points_discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-ink border-t border-base-border pt-1.5 mt-1">
                  <span>Total</span><span>{formatKES(detail.total_amount)}</span>
                </div>
              </div>

              {/* Notes */}
              {detail.notes && (
                <div className="flex items-start gap-2 text-sm text-ink-muted bg-base-hover rounded-xl px-4 py-3">
                  <FileText size={13} className="mt-0.5 flex-shrink-0 text-ink-dim" />
                  <span>{detail.notes}</span>
                </div>
              )}

              {/* ── Payment panel ── */}
              <PaymentPanel
                order={detail}
                onOpenMpesa={() => setPaySession({ order: detail, state: "mpesa_loading" })}
                onOpenCash={() => setPaySession({ order: detail, state: "cash_confirm" })}
              />

              {/* ── Advance status ── */}
              <AdvanceStatusSection
                order={detail}
                updatingStatus={updatingStatus}
                onAdvance={handleAdvance}
              />

            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 border-t border-base-border flex items-center justify-between gap-3 flex-shrink-0">
              <button onClick={() => { setDetail(null); load(); }}
                className="px-4 py-2 rounded-lg border border-base-border text-sm text-ink-muted hover:text-ink transition-colors">
                Close
              </button>
              {!ORDER_TERMINAL.includes(detail.status) && (
                <button onClick={handleCancel} disabled={cancelling}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 text-sm font-semibold disabled:opacity-50 transition-colors">
                  {cancelling ? <Loader2 size={14} className="animate-spin" /> : <AlertTriangle size={14} />}
                  Cancel Order
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Payment modal ── */}
      {paySession && (
        <OrderPaymentModal
          session={paySession}
          setSession={setPaySession}
          onCash={handleCashPayment}
          onClose={closePaySession}
          onMpesaSuccess={async (ref) => {
            setPaySession(s => s && { ...s, state: "mpesa_paid", receipt: ref });
            if (detail) await refreshDetail(detail.id);
          }}
        />
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function OrderStepper({ status }: { status: OrderStatus }) {
  const chain = ORDER_CHAIN;
  const currentIdx  = chain.indexOf(status);
  const isCancelled = status === "cancelled";

  return (
    <div className="bg-base-hover rounded-xl px-4 py-3.5">
      <p className="text-[10px] text-ink-dim font-bold uppercase tracking-wider mb-3">Order Progress</p>
      <div className="flex items-center">
        {chain.map((s, i) => {
          const meta   = STATUS_META[s];
          const Icon   = meta.icon;
          const done   = !isCancelled && i < currentIdx;
          const active = !isCancelled && i === currentIdx;

          return (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1 relative">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                  done   ? `${meta.bg} shadow-sm` :
                  active ? `${meta.bg} ring-2 ring-offset-2 ring-offset-base-hover shadow-md` :
                           "bg-base-panel border-2 border-base-border"
                }`}>
                  <Icon size={12} className={done || active ? "text-white" : "text-ink-dim"} />
                </div>
                <span className={`text-[9px] font-medium whitespace-nowrap absolute -bottom-4 ${
                  active ? `${meta.color} font-bold` : done ? "text-ink-muted" : "text-ink-dim"
                }`}>
                  {meta.label}
                </span>
              </div>
              {i < chain.length - 1 && (
                <div className={`flex-1 h-0.5 mx-0.5 ${done ? "bg-green-500/40" : "bg-base-border"}`} />
              )}
            </div>
          );
        })}
      </div>
      {isCancelled ? (
        <p className="text-xs text-red-400 font-semibold mt-6">✕ Order cancelled</p>
      ) : (
        <div style={{ marginTop: "1.75rem" }} />
      )}
    </div>
  );
}

function PaymentPanel({
  order, onOpenMpesa, onOpenCash,
}: {
  order: Order;
  onOpenMpesa: () => void;
  onOpenCash: () => void;
}) {
  const paid = order.payment_status === "paid";

  return (
    <div className="rounded-xl border border-base-border overflow-hidden">
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-ink uppercase tracking-wide">💳 Payment</p>
          {paid
            ? <span className="text-xs text-green-500 font-bold bg-green-500/10 px-2.5 py-1 rounded-full">✓ PAID</span>
            : <span className="text-xs text-amber-400 font-bold bg-amber-400/10 px-2.5 py-1 rounded-full">UNPAID</span>
          }
        </div>

        {paid ? (
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-ink-muted">
              <span>Amount</span>
              <span className="font-semibold text-ink">{formatKES(order.total_amount)}</span>
            </div>
            {order.mpesa_receipt && (
              <div className="flex justify-between text-ink-muted">
                <span>Receipt</span>
                <span className="font-mono text-green-500">{order.mpesa_receipt}</span>
              </div>
            )}
            <div className="flex justify-between text-ink-muted">
              <span>Method</span>
              <span className="capitalize">{order.payment_method ?? "—"}</span>
            </div>
          </div>
        ) : order.status !== "cancelled" ? (
          <>
            <div className="bg-base-hover rounded-lg p-3 text-xs">
              <div className="flex justify-between font-bold text-ink">
                <span>Amount due</span>
                <span className="text-cyan-400">{formatKES(order.total_amount)}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onOpenMpesa}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold transition-colors">
                <Send size={13} /> M-Pesa Prompt
              </button>
              <button
                onClick={onOpenCash}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors">
                <Banknote size={13} /> Cash Payment
              </button>
            </div>
          </>
        ) : (
          <p className="text-xs text-ink-dim">Order was cancelled.</p>
        )}
      </div>
    </div>
  );
}

function AdvanceStatusSection({
  order, updatingStatus, onAdvance,
}: {
  order: Order;
  updatingStatus: boolean;
  onAdvance: () => void;
}) {
  if (ORDER_TERMINAL.includes(order.status)) return null;
  const nxt = nextOrderStatus(order.status);
  if (!nxt) return null;

  const meta = STATUS_META[nxt];
  const Icon = meta.icon;

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] text-ink-dim font-bold uppercase tracking-wider">Next Step</p>
      <button
        onClick={onAdvance}
        disabled={updatingStatus}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 border-base-border hover:border-volt/60 hover:bg-volt/5 transition-all group disabled:opacity-50"
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full ${meta.bg}/20 flex items-center justify-center`}>
            <Icon size={14} className={meta.color} />
          </div>
          <p className="text-sm font-semibold text-ink">Move to {meta.label}</p>
        </div>
        {updatingStatus
          ? <Loader2 size={16} className="animate-spin text-ink-dim" />
          : <ChevronRight size={16} className="text-ink-dim group-hover:text-volt transition-colors" />
        }
      </button>
    </div>
  );
}

function OrderPaymentModal({
  session, setSession, onCash, onClose, onMpesaSuccess,
}: {
  session: PaySession;
  setSession: React.Dispatch<React.SetStateAction<PaySession | null>>;
  onCash: () => void;
  onClose: () => void;
  onMpesaSuccess: (ref: string) => Promise<void>;
}) {
  const o = session.order;
  const s = session.state;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-base-panel border border-base-border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-base-border">
          <div>
            <h2 className="font-bold text-ink text-sm">Collect Payment</h2>
            <p className="text-xs text-ink-dim">{o.full_name} · {o.phone_number}</p>
          </div>
          {s !== "mpesa_loading" && s !== "cash_loading" && (
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-base-hover text-ink-muted hover:text-ink">
              <X size={16} />
            </button>
          )}
        </div>

        <div className="p-5 space-y-4">

          {/* Amount summary */}
          <div className="bg-base-hover rounded-xl p-3.5 space-y-1.5 text-xs">
            <div className="flex justify-between text-ink-muted">
              <span>Subtotal</span><span>{formatKES(o.subtotal)}</span>
            </div>
            <div className="flex justify-between text-ink-muted">
              <span>Delivery</span><span>{formatKES(o.delivery_fee)}</span>
            </div>
            {o.points_discount > 0 && (
              <div className="flex justify-between text-green-500">
                <span>Points discount</span><span>−{formatKES(o.points_discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-ink border-t border-base-border pt-2">
              <span>Total</span>
              <span className="text-cyan-400 text-sm">{formatKES(o.total_amount)}</span>
            </div>
          </div>

          {/* Error */}
          {session.error && s === "choose" && (
            <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{session.error}</p>
          )}

          {/* Choose mode */}
          {s === "choose" && (
            <div className="space-y-2.5">
              <p className="text-xs text-ink-dim text-center">Choose payment method</p>
              <button
                onClick={() => setSession(ss => ss && { ...ss, state: "mpesa_loading" })}
                className="w-full flex items-center gap-3 p-3.5 rounded-xl border-2 border-base-border hover:border-green-500/50 hover:bg-green-500/5 transition-all group">
                <div className="w-9 h-9 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                  <Smartphone size={16} className="text-green-500" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-semibold text-ink">M-Pesa STK Push</p>
                  <p className="text-xs text-ink-dim">Send prompt to customer's phone</p>
                </div>
                <ChevronRight size={15} className="text-ink-dim group-hover:text-green-500 transition-colors" />
              </button>
              <button
                onClick={() => setSession(ss => ss && { ...ss, state: "cash_confirm" })}
                className="w-full flex items-center gap-3 p-3.5 rounded-xl border-2 border-base-border hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group">
                <div className="w-9 h-9 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                  <Banknote size={16} className="text-blue-400" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-semibold text-ink">Cash Payment</p>
                  <p className="text-xs text-ink-dim">Client paid in cash — record it</p>
                </div>
                <ChevronRight size={15} className="text-ink-dim group-hover:text-blue-400 transition-colors" />
              </button>
            </div>
          )}

          {/* M-Pesa STK */}
          {s === "mpesa_loading" && (
            <StkModal
              amountKes={Number(o.total_amount)}
              target={{
                initiate: () => initiateOrderPayment(o.id),
                verify: (ref: string) => verifyOrderPayment(ref),
              }}
              onSuccess={(ref) => onMpesaSuccess(ref)}
              onCancel={onClose}
            />
          )}

          {s === "mpesa_paid" && (
            <div className="flex flex-col items-center gap-3 py-2">
              <CheckCircle2 size={44} className="text-green-500" />
              <div className="text-center">
                <p className="text-sm font-bold text-green-500">M-Pesa Payment Confirmed!</p>
                {session.receipt && <p className="text-xs text-ink-dim mt-1 font-mono">{session.receipt}</p>}
              </div>
              <button onClick={onClose} className="btn-primary text-xs !py-2 !px-8">Done</button>
            </div>
          )}

          {s === "mpesa_failed" && (
            <div className="flex flex-col items-center gap-3 py-2">
              <XCircle size={40} className="text-red-500" />
              <div className="text-center">
                <p className="text-sm font-bold text-red-500">Payment Failed</p>
                <p className="text-xs text-ink-dim mt-1">{session.error}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setSession(ss => ss && { ...ss, state: "choose", error: undefined })}
                  className="btn-primary text-xs !py-2 !px-4">Try Again</button>
                <button onClick={onClose}
                  className="py-2 px-4 rounded-lg border border-base-border text-xs text-ink-muted">Close</button>
              </div>
            </div>
          )}

          {/* Cash confirm */}
          {s === "cash_confirm" && (
            <div className="space-y-3">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3.5 text-center space-y-1">
                <Banknote size={28} className="text-blue-400 mx-auto" />
                <p className="text-sm font-bold text-ink">Confirm Cash Receipt</p>
                <p className="text-xs text-ink-dim">
                  Confirm you have received <strong className="text-ink">{formatKES(o.total_amount)}</strong> in cash.
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setSession(ss => ss && { ...ss, state: "choose" })}
                  className="flex-1 py-2.5 rounded-xl border border-base-border text-xs text-ink-muted hover:text-ink transition-colors">
                  Back
                </button>
                <button onClick={onCash}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors">
                  Yes, Cash Received
                </button>
              </div>
            </div>
          )}

          {s === "cash_loading" && (
            <div className="flex flex-col items-center gap-3 py-4">
              <Loader2 size={32} className="text-blue-400 animate-spin" />
              <p className="text-sm text-ink-muted">Recording cash payment…</p>
            </div>
          )}

          {s === "cash_paid" && (
            <div className="flex flex-col items-center gap-3 py-2">
              <CheckCircle2 size={44} className="text-green-500" />
              <div className="text-center">
                <p className="text-sm font-bold text-green-500">Cash Payment Recorded!</p>
                {session.receipt && <p className="text-xs text-ink-dim mt-1 font-mono">{session.receipt}</p>}
              </div>
              <button onClick={onClose} className="btn-primary text-xs !py-2 !px-8">Done</button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
