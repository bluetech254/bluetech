"use client";

import { useEffect, useRef, useState } from "react";
import {
  Send, Loader2, CheckCircle2, XCircle, Smartphone, X, Phone,
  Wrench, MapPin, FileText, AlertTriangle, Banknote, ChevronRight,
  Clock, Package, Search, Hammer, CheckCheck, Ban,
} from "lucide-react";
import { adminApi, formatKES } from "@/lib/api";
import { initiateFinalPayment, verifyFinalPayment } from "@/lib/payments";
import StkModal from "@/components/payments/StkModal";
import { Booking, BookingStatus } from "@/lib/types";

// ── Status chain ──────────────────────────────────────────────────────────────

const STATUS_CHAIN: BookingStatus[] = [
  "pending", "confirmed", "picked_up", "in_diagnosis",
  "in_repair", "ready", "completed",
];
const TERMINAL: BookingStatus[] = ["completed", "cancelled"];

function nextStatus(current: BookingStatus): BookingStatus | null {
  const idx = STATUS_CHAIN.indexOf(current);
  if (TERMINAL.includes(current) || idx < 0 || idx + 1 >= STATUS_CHAIN.length) return null;
  return STATUS_CHAIN[idx + 1];
}

const STATUS_META: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  pending:      { label: "Pending",      icon: Clock,       color: "text-amber-400",  bg: "bg-amber-400" },
  confirmed:    { label: "Confirmed",    icon: CheckCircle2,color: "text-blue-400",   bg: "bg-blue-400" },
  picked_up:    { label: "Picked Up",    icon: Package,     color: "text-indigo-400", bg: "bg-indigo-400" },
  in_diagnosis: { label: "Diagnosis",   icon: Search,      color: "text-purple-400", bg: "bg-purple-400" },
  in_repair:    { label: "In Repair",    icon: Hammer,      color: "text-orange-400", bg: "bg-orange-400" },
  ready:        { label: "Ready",        icon: CheckCheck,  color: "text-cyan-400",   bg: "bg-cyan-400" },
  completed:    { label: "Completed",    icon: CheckCircle2,color: "text-green-500",  bg: "bg-green-500" },
  cancelled:    { label: "Cancelled",    icon: Ban,         color: "text-red-500",    bg: "bg-red-500" },
};

const TABS: { label: string; value: BookingStatus | "" }[] = [
  { label: "All",          value: "" },
  { label: "Pending",      value: "pending" },
  { label: "Confirmed",    value: "confirmed" },
  { label: "Picked Up",    value: "picked_up" },
  { label: "In Diagnosis", value: "in_diagnosis" },
  { label: "In Repair",    value: "in_repair" },
  { label: "Ready",        value: "ready" },
  { label: "Completed",    value: "completed" },
  { label: "Cancelled",    value: "cancelled" },
];

// ── Types ─────────────────────────────────────────────────────────────────────

type PayMode = "mpesa" | "cash";
type PayState = "choose" | "mpesa_loading" | "mpesa_paid" | "mpesa_failed" | "cash_confirm" | "cash_loading" | "cash_paid";
interface PaySession { booking: Booking; amount: number; mode: PayMode | null; state: PayState; receipt?: string; error?: string; }

// ── Component ─────────────────────────────────────────────────────────────────

export default function RepairsPage() {
  const [tab, setTab]           = useState<BookingStatus | "">("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading]   = useState(true);
  const [detail, setDetail]     = useState<Booking | null>(null);

  // cost draft
  const [costDraft, setCostDraft]   = useState<{ estimated_cost?: number; final_cost?: number; pickup_fee?: number }>({});
  const [savingCost, setSavingCost] = useState(false);

  // notes
  const [notesDraft, setNotesDraft]     = useState("");
  const [savingNotes, setSavingNotes]   = useState(false);

  // status
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [cancelling, setCancelling]         = useState(false);

  // payment
  const [paySession, setPaySession] = useState<PaySession | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── data ──────────────────────────────────────────────────────────────────

  function load() {
    setLoading(true);
    adminApi.getBookings(tab || undefined)
      .then((res: any) => setBookings(res.data ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(load, [tab]);

  useEffect(() => {
    document.body.style.overflow = (detail || paySession) ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [detail, paySession]);

  function openDetail(b: Booking) {
    setDetail(b);
    setCostDraft({ estimated_cost: b.estimated_cost, final_cost: b.final_cost, pickup_fee: b.pickup_fee });
    setNotesDraft(b.internal_notes ?? "");
  }

  async function refreshDetail(id: string) {
    const b = await adminApi.getBooking(id) as Booking;
    setDetail(b);
    setCostDraft({ estimated_cost: b.estimated_cost, final_cost: b.final_cost, pickup_fee: b.pickup_fee });
    load();
  }

  function closeDetail() { setDetail(null); load(); }

  // ── actions ───────────────────────────────────────────────────────────────

  async function handleAdvanceStatus() {
    if (!detail) return;
    const nxt = nextStatus(detail.status);
    if (!nxt) return;

    // Guard: must have estimated cost before leaving in_diagnosis
    if (detail.status === "in_diagnosis" && !costDraft.estimated_cost && !detail.estimated_cost) {
      alert("Set an estimated cost before moving to In Repair.");
      return;
    }
    // Guard: must have final cost before leaving ready (unless going via payment)
    if (detail.status === "ready" && nxt === "completed" && !costDraft.final_cost && !detail.final_cost) {
      alert("Set a final cost and collect payment before completing.");
      return;
    }

    setUpdatingStatus(true);
    try {
      await adminApi.updateBookingStatus(detail.id, nxt);
      await refreshDetail(detail.id);
    } finally { setUpdatingStatus(false); }
  }

  async function handleCancel() {
    if (!detail) return;
    if (!confirm(`Cancel booking #${detail.id.slice(0, 8).toUpperCase()}? This cannot be undone.`)) return;
    setCancelling(true);
    try {
      await adminApi.updateBookingStatus(detail.id, "cancelled");
      await refreshDetail(detail.id);
    } finally { setCancelling(false); }
  }

  async function handleSaveCost() {
    if (!detail) return;
    setSavingCost(true);
    try {
      await adminApi.updateBookingCost(detail.id, costDraft.estimated_cost, costDraft.final_cost, costDraft.pickup_fee);
      await refreshDetail(detail.id);
    } finally { setSavingCost(false); }
  }

  function openPayment() {
    if (!detail) return;
    const service = detail.final_cost ?? detail.estimated_cost ?? 0;
    const pickup  = detail.pickup_fee ?? 0;
    const commitment = detail.commitment_fee ?? 0;
    const amount  = Math.max(1, service + pickup - commitment);
    setPaySession({ booking: detail, amount, mode: "mpesa", state: "mpesa_loading" });
  }

  function openCash() {
    if (!detail) return;
    const service = detail.final_cost ?? detail.estimated_cost ?? 0;
    const pickup  = detail.pickup_fee ?? 0;
    const commitment = detail.commitment_fee ?? 0;
    const amount  = Math.max(1, service + pickup - commitment);
    setPaySession({ booking: detail, amount, mode: "cash", state: "cash_confirm" });
  }

  async function handleCashPayment() {
    if (!paySession) return;
    setPaySession(s => s && { ...s, state: "cash_loading" });
    try {
      const res = await adminApi.recordCashPayment(paySession.booking.id);
      setPaySession(s => s && { ...s, state: "cash_paid", receipt: res.receipt });
      await refreshDetail(paySession.booking.id);
    } catch (e: any) {
      setPaySession(s => s && { ...s, state: "choose", error: e.message });
    }
  }

  function closePaySession() {
    if (pollRef.current) clearInterval(pollRef.current);
    setPaySession(null);
    if (detail) refreshDetail(detail.id);
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button key={t.label} onClick={() => setTab(t.value)}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t.value
                ? "bg-volt text-white"
                : "bg-base-panel text-ink-muted hover:text-ink border border-base-border"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">Booking</th>
              <th className="th">Customer</th>
              <th className="th">Device</th>
              <th className="th">Cost</th>
              <th className="th">Payment</th>
              <th className="th">Status</th>
              <th className="th">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td className="td text-ink-dim" colSpan={7}>Loading…</td></tr>
            )}
            {!loading && bookings.length === 0 && (
              <tr><td className="td text-ink-dim" colSpan={7}>No bookings found.</td></tr>
            )}
            {bookings.map((b) => {
              const meta = STATUS_META[b.status];
              const Icon = meta?.icon ?? Clock;
              return (
                <tr key={b.id}
                  className="hover:bg-base-hover/40 cursor-pointer transition-colors"
                  onClick={() => openDetail(b)}>
                  <td className="td font-mono text-xs text-ink-muted">#{b.id.slice(0, 8).toUpperCase()}</td>
                  <td className="td">
                    <p className="text-sm font-medium text-ink">{b.full_name}</p>
                    <p className="text-xs text-ink-dim">{b.phone_number}</p>
                  </td>
                  <td className="td text-sm">{b.device_type} · {b.device_model}</td>
                  <td className="td tabular text-sm">
                    {b.final_cost
                      ? formatKES(b.final_cost + (b.pickup_fee ?? 0))
                      : b.estimated_cost
                        ? <span className="text-ink-muted">~{formatKES(b.estimated_cost + (b.pickup_fee ?? 0))}</span>
                        : <span className="text-ink-dim">—</span>}
                  </td>
                  <td className="td">
                    <span className={`text-xs font-semibold capitalize ${b.final_payment_status === "paid" ? "text-green-500" : "text-ink-dim"}`}>
                      {b.final_payment_status === "paid" ? "✓ Paid" : "Unpaid"}
                    </span>
                  </td>
                  <td className="td">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold capitalize ${meta?.color ?? "text-ink-muted"}`}>
                      <Icon size={11} />
                      {meta?.label ?? b.status}
                    </span>
                  </td>
                  <td className="td text-xs text-ink-muted">
                    {new Date(b.created_at).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Booking Detail Modal ── */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-base-panel border border-base-border rounded-2xl shadow-2xl w-full max-w-xl flex flex-col"
            style={{ maxHeight: "92vh" }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-base-border flex-shrink-0">
              <div>
                <p className="text-xs text-ink-dim font-mono">#{detail.id.slice(0, 8).toUpperCase()}</p>
                <h2 className="font-bold text-ink text-base mt-0.5">Repair Booking</h2>
              </div>
              <div className="flex items-center gap-2">
                <a href={`/receipt?type=booking&id=${detail.id}`} target="_blank" rel="noreferrer"
                  className="btn-ghost !py-1 !px-2.5 text-xs">🧾 Receipt</a>
                <button onClick={closeDetail}
                  className="p-1.5 rounded-lg hover:bg-base-hover text-ink-muted hover:text-ink">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

              {/* ── Status stepper ── */}
              <StatusStepper status={detail.status} />

              {/* ── Customer & Device ── */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-base-hover rounded-xl p-3.5 space-y-1.5">
                  <p className="text-[10px] text-ink-dim font-bold uppercase tracking-wider flex items-center gap-1">
                    <Phone size={10} /> Customer
                  </p>
                  <p className="text-sm font-semibold text-ink">{detail.full_name}</p>
                  <p className="text-xs text-ink-muted">{detail.phone_number}</p>
                  {detail.pickup_address && (
                    <p className="text-xs text-ink-dim flex items-start gap-1">
                      <MapPin size={10} className="mt-0.5 flex-shrink-0" />{detail.pickup_address}
                    </p>
                  )}
                </div>
                <div className="bg-base-hover rounded-xl p-3.5 space-y-1.5">
                  <p className="text-[10px] text-ink-dim font-bold uppercase tracking-wider flex items-center gap-1">
                    <Wrench size={10} /> Device
                  </p>
                  <p className="text-sm font-semibold text-ink capitalize">{detail.device_type}</p>
                  <p className="text-xs text-ink-muted">{detail.device_model}</p>
                  <p className="text-xs text-ink-dim capitalize">{detail.fulfillment_type}</p>
                </div>
              </div>

              {/* Issue */}
              <div className="bg-base-hover rounded-xl px-4 py-3 flex gap-2.5">
                <FileText size={13} className="text-ink-dim mt-0.5 flex-shrink-0" />
                <p className="text-sm text-ink-muted leading-relaxed">{detail.issue_description}</p>
              </div>

              {/* ── Context panel: cost + payment based on status ── */}
              <CostPaymentPanel
                detail={detail}
                costDraft={costDraft}
                setCostDraft={setCostDraft}
                savingCost={savingCost}
                onSaveCost={handleSaveCost}
                onOpenPayment={openPayment}
                onOpenCash={openCash}
              />

              {/* ── Advance status button ── */}
              <AdvanceStatusSection
                detail={detail}
                updatingStatus={updatingStatus}
                onAdvance={handleAdvanceStatus}
              />

              {/* ── Internal notes ── */}
              <div className="space-y-2">
                <p className="text-[10px] text-ink-dim font-bold uppercase tracking-wider">Internal Notes</p>
                <div className="flex gap-2 items-end">
                  <textarea
                    className="input-field text-sm flex-1 resize-none"
                    rows={2}
                    placeholder="Staff-only notes…"
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                  />
                  <button
                    onClick={async () => {
                      setSavingNotes(true);
                      try {
                        await adminApi.updateBookingNotes(detail.id, notesDraft || null);
                        setDetail({ ...detail, internal_notes: notesDraft || undefined });
                      } finally { setSavingNotes(false); }
                    }}
                    disabled={savingNotes}
                    className="btn-primary !py-2.5 text-xs self-end shrink-0 disabled:opacity-50"
                  >
                    {savingNotes ? <Loader2 size={12} className="animate-spin" /> : "Save"}
                  </button>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 border-t border-base-border flex items-center justify-between gap-3 flex-shrink-0">
              <button onClick={closeDetail}
                className="px-4 py-2 rounded-lg border border-base-border text-sm text-ink-muted hover:text-ink transition-colors">
                Close
              </button>
              {!TERMINAL.includes(detail.status) && (
                <button onClick={handleCancel} disabled={cancelling}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 text-sm font-semibold disabled:opacity-50 transition-colors">
                  {cancelling ? <Loader2 size={14} className="animate-spin" /> : <AlertTriangle size={14} />}
                  Cancel Booking
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Payment Modal ── */}
      {paySession && (
        <PaymentModal
          session={paySession}
          setSession={setPaySession}
          onCash={handleCashPayment}
          onClose={closePaySession}
          pollRef={pollRef}
          onMpesaSuccess={async (ref) => {
            setPaySession(s => s && { ...s, state: "mpesa_paid", receipt: ref });
            if (detail) await refreshDetail(detail.id);
            load();
          }}
        />
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusStepper({ status }: { status: BookingStatus }) {
  const chain = STATUS_CHAIN;
  const currentIdx = chain.indexOf(status);
  const isCancelled = status === "cancelled";

  return (
    <div className="bg-base-hover rounded-xl px-4 py-3.5">
      <p className="text-[10px] text-ink-dim font-bold uppercase tracking-wider mb-3">Repair Progress</p>
      <div className="flex items-center">
        {chain.map((s, i) => {
          const meta   = STATUS_META[s];
          const Icon   = meta.icon;
          const done   = isCancelled ? false : i < currentIdx;
          const active = !isCancelled && i === currentIdx;
          const future = isCancelled ? true : i > currentIdx;

          return (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              {/* Node */}
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
              {/* Connector */}
              {i < chain.length - 1 && (
                <div className={`flex-1 h-0.5 mx-0.5 ${
                  done ? "bg-green-500/40" : "bg-base-border"
                }`} />
              )}
            </div>
          );
        })}
      </div>
      {isCancelled && (
        <p className="text-xs text-red-400 font-semibold mt-6">✕ Booking cancelled</p>
      )}
      {!isCancelled && (
        <div style={{ marginTop: "1.75rem" }} />
      )}
    </div>
  );
}

function CostPaymentPanel({
  detail, costDraft, setCostDraft, savingCost, onSaveCost, onOpenPayment, onOpenCash,
}: {
  detail: Booking;
  costDraft: { estimated_cost?: number; final_cost?: number; pickup_fee?: number };
  setCostDraft: React.Dispatch<React.SetStateAction<{ estimated_cost?: number; final_cost?: number; pickup_fee?: number }>>;
  savingCost: boolean;
  onSaveCost: () => void;
  onOpenPayment: () => void;
  onOpenCash: () => void;
}) {
  const s = detail.status;
  const paid = detail.final_payment_status === "paid";

  // Not relevant before diagnosis
  if (["pending", "confirmed", "picked_up", "cancelled"].includes(s)) {
    return null;
  }

  return (
    <div className="rounded-xl border border-base-border overflow-hidden">

      {/* ── Estimated cost — shown at diagnosis stage ── */}
      {(s === "in_diagnosis") && (
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-ink uppercase tracking-wide">💡 Diagnosis — Set Estimated Cost</p>
          </div>
          <p className="text-xs text-ink-dim">After diagnosing the device, enter what you estimate the repair will cost. This is shown to the customer before proceeding.</p>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-xs text-ink-dim mb-1 block">Estimated repair cost (KES)</label>
              <input className="input-field text-sm" type="number" placeholder="e.g. 3500"
                value={costDraft.estimated_cost ?? ""}
                onChange={(e) => setCostDraft(p => ({ ...p, estimated_cost: Number(e.target.value) || undefined }))} />
            </div>
            {detail.fulfillment_type === "pickup" && (
              <div className="w-28">
                <label className="text-xs text-ink-dim mb-1 block">Pickup fee (KES)</label>
                <input className="input-field text-sm" type="number" placeholder="200"
                  value={costDraft.pickup_fee ?? ""}
                  onChange={(e) => setCostDraft(p => ({ ...p, pickup_fee: Number(e.target.value) || undefined }))} />
              </div>
            )}
            <button onClick={onSaveCost} disabled={savingCost}
              className="btn-primary !py-2.5 text-xs shrink-0 disabled:opacity-50">
              {savingCost ? <Loader2 size={12} className="animate-spin" /> : "Save"}
            </button>
          </div>
          {detail.estimated_cost && (
            <div className="flex items-center gap-2 text-xs text-green-500 bg-green-500/10 rounded-lg px-3 py-2">
              <CheckCircle2 size={12} /> Saved estimate: <strong>{formatKES(detail.estimated_cost)}</strong>
              {detail.pickup_fee ? ` + ${formatKES(detail.pickup_fee)} pickup` : ""}
            </div>
          )}
        </div>
      )}

      {/* ── In repair: show estimate, no editing ── */}
      {s === "in_repair" && (
        <div className="p-4 space-y-2">
          <p className="text-xs font-bold text-ink uppercase tracking-wide">🔧 In Repair</p>
          <div className="flex justify-between items-center text-sm">
            <span className="text-ink-muted">Estimated cost</span>
            <span className="font-semibold text-ink">{detail.estimated_cost ? formatKES(detail.estimated_cost) : "—"}</span>
          </div>
          {detail.pickup_fee ? (
            <div className="flex justify-between items-center text-sm">
              <span className="text-ink-muted">Pickup fee</span>
              <span className="font-semibold text-ink">{formatKES(detail.pickup_fee)}</span>
            </div>
          ) : null}
          <p className="text-xs text-ink-dim pt-1">Set the final cost once repair is complete and device is ready.</p>
        </div>
      )}

      {/* ── Ready: set final cost + payment ── */}
      {(s === "ready" || s === "completed") && (
        <div className="divide-y divide-base-border">

          {/* Final cost input */}
          <div className="p-4 space-y-3">
            <p className="text-xs font-bold text-ink uppercase tracking-wide">✅ Device Ready — Final Cost</p>

            {/* Estimate vs final comparison */}
            {detail.estimated_cost && (
              <div className="flex items-center gap-3 text-xs bg-base-hover rounded-lg px-3 py-2">
                <span className="text-ink-dim">Estimate was</span>
                <span className="font-semibold text-ink-muted line-through">{formatKES(detail.estimated_cost)}</span>
                <ChevronRight size={12} className="text-ink-dim" />
                <span className="text-ink-dim">Final</span>
                <span className={`font-bold ${detail.final_cost ? "text-cyan-400" : "text-ink-dim"}`}>
                  {detail.final_cost ? formatKES(detail.final_cost) : "not set"}
                </span>
              </div>
            )}

            {!paid && s === "ready" && (
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-xs text-ink-dim mb-1 block">Final repair cost (KES)</label>
                  <input className="input-field text-sm" type="number" placeholder="e.g. 3800"
                    value={costDraft.final_cost ?? ""}
                    onChange={(e) => setCostDraft(p => ({ ...p, final_cost: Number(e.target.value) || undefined }))} />
                </div>
                {detail.fulfillment_type === "pickup" && (
                  <div className="w-28">
                    <label className="text-xs text-ink-dim mb-1 block">Pickup fee (KES)</label>
                    <input className="input-field text-sm" type="number"
                      value={costDraft.pickup_fee ?? ""}
                      onChange={(e) => setCostDraft(p => ({ ...p, pickup_fee: Number(e.target.value) || undefined }))} />
                  </div>
                )}
                <button onClick={onSaveCost} disabled={savingCost}
                  className="btn-primary !py-2.5 text-xs shrink-0 disabled:opacity-50">
                  {savingCost ? <Loader2 size={12} className="animate-spin" /> : "Save"}
                </button>
              </div>
            )}
          </div>

          {/* Payment section */}
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
                  <span>Receipt</span>
                  <span className="font-mono text-green-500">{detail.final_receipt}</span>
                </div>
                <div className="flex justify-between text-ink-muted">
                  <span>Total collected</span>
                  <span className="font-semibold text-ink">
                    {formatKES((detail.final_cost ?? detail.estimated_cost ?? 0) + (detail.pickup_fee ?? 0))}
                  </span>
                </div>
              </div>
            ) : s === "ready" ? (
              <>
                {/* Total breakdown */}
                <div className="bg-base-hover rounded-lg p-3 space-y-1.5 text-xs">
                  <div className="flex justify-between text-ink-muted">
                    <span>Repair cost</span>
                    <span>{detail.final_cost ? formatKES(detail.final_cost) : detail.estimated_cost ? `~${formatKES(detail.estimated_cost)}` : "—"}</span>
                  </div>
                  {detail.pickup_fee ? (
                    <div className="flex justify-between text-ink-muted">
                      <span>Pickup fee</span><span>{formatKES(detail.pickup_fee)}</span>
                    </div>
                  ) : null}
                  {detail.commitment_fee ? (
                    <div className="flex justify-between text-ink-muted">
                      <span>Commitment fee (paid)</span><span className="text-green-500">−{formatKES(detail.commitment_fee)}</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between font-bold text-ink border-t border-base-border pt-1.5">
                    <span>Balance due</span>
                    <span className="text-cyan-400">
                      {formatKES(Math.max(0,
                        (detail.final_cost ?? detail.estimated_cost ?? 0)
                        + (detail.pickup_fee ?? 0)
                        - (detail.commitment_fee ?? 0)
                      ))}
                    </span>
                  </div>
                </div>

                {!(detail.final_cost ?? detail.estimated_cost) && (
                  <p className="text-xs text-amber-400">⚠ Set a final cost above before collecting payment.</p>
                )}

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={onOpenPayment}
                    disabled={!(detail.final_cost ?? detail.estimated_cost)}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold disabled:opacity-40 transition-colors">
                    <Send size={13} /> M-Pesa Prompt
                  </button>
                  <button
                    onClick={onOpenCash}
                    disabled={!(detail.final_cost ?? detail.estimated_cost)}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-40 transition-colors">
                    <Banknote size={13} /> Cash Payment
                  </button>
                </div>
              </>
            ) : (
              <p className="text-xs text-ink-dim">Payment collection is available once the booking is in <strong>Ready</strong> state.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AdvanceStatusSection({
  detail, updatingStatus, onAdvance,
}: {
  detail: Booking;
  updatingStatus: boolean;
  onAdvance: () => void;
}) {
  if (TERMINAL.includes(detail.status)) return null;

  const nxt = nextStatus(detail.status);
  if (!nxt) return null;

  // Hide "advance to completed" button — that's handled by payment flow
  if (nxt === "completed") return null;

  const meta = STATUS_META[nxt];
  const Icon = meta.icon;

  const needsEstimate = detail.status === "in_diagnosis" && !detail.estimated_cost;

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] text-ink-dim font-bold uppercase tracking-wider">Next Step</p>
      <button
        onClick={onAdvance}
        disabled={updatingStatus || needsEstimate}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all group
          ${needsEstimate
            ? "border-base-border opacity-50 cursor-not-allowed"
            : "border-base-border hover:border-volt/60 hover:bg-volt/5"
          }`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full ${meta.bg}/20 flex items-center justify-center`}>
            <Icon size={14} className={meta.color} />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-ink">Move to {meta.label}</p>
            {needsEstimate && (
              <p className="text-xs text-amber-400">Set an estimated cost first</p>
            )}
          </div>
        </div>
        {updatingStatus
          ? <Loader2 size={16} className="animate-spin text-ink-dim" />
          : <ChevronRight size={16} className="text-ink-dim group-hover:text-volt transition-colors" />
        }
      </button>
    </div>
  );
}

function PaymentModal({
  session, setSession, onCash, onClose, pollRef, onMpesaSuccess,
}: {
  session: PaySession;
  setSession: React.Dispatch<React.SetStateAction<PaySession | null>>;
  onCash: () => void;
  onClose: () => void;
  pollRef: React.MutableRefObject<ReturnType<typeof setInterval> | null>;
  onMpesaSuccess: (ref: string) => Promise<void>;
}) {
  const b = session.booking;
  const choosing = session.state === "choose";
  const cashConfirm = session.state === "cash_confirm";
  const cashLoading = session.state === "cash_loading";
  const cashPaid    = session.state === "cash_paid";
  const mpesaLoading= session.state === "mpesa_loading";
  const mpesaPaid   = session.state === "mpesa_paid";
  const mpesaFailed = session.state === "mpesa_failed";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-base-panel border border-base-border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-base-border">
          <div>
            <h2 className="font-bold text-ink text-sm">Collect Payment</h2>
            <p className="text-xs text-ink-dim">{b.full_name} · {b.phone_number}</p>
          </div>
          {!mpesaLoading && !cashLoading && (
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-base-hover text-ink-muted hover:text-ink">
              <X size={16} />
            </button>
          )}
        </div>

        <div className="p-5 space-y-4">

          {/* Amount summary */}
          <div className="bg-base-hover rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex justify-between text-ink-muted">
              <span>Repair cost</span>
              <span>{formatKES(b.final_cost ?? b.estimated_cost ?? 0)}</span>
            </div>
            {(b.pickup_fee ?? 0) > 0 && (
              <div className="flex justify-between text-ink-muted">
                <span>Pickup fee</span><span>{formatKES(b.pickup_fee ?? 0)}</span>
              </div>
            )}
            {(b.commitment_fee ?? 0) > 0 && (
              <div className="flex justify-between text-ink-muted">
                <span>Commitment paid</span><span className="text-green-500">−{formatKES(b.commitment_fee ?? 0)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-ink border-t border-base-border pt-2">
              <span>Balance due</span>
              <span className="text-cyan-400 text-sm">{formatKES(session.amount)}</span>
            </div>
          </div>

          {/* Error from previous attempt */}
          {session.error && choosing && (
            <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{session.error}</p>
          )}

          {/* ── Choose mode ── */}
          {choosing && (
            <div className="space-y-2.5">
              <p className="text-xs text-ink-dim text-center">Choose how the customer is paying</p>
              <button
                onClick={() => setSession(s => s && { ...s, mode: "mpesa", state: "mpesa_loading" })}
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
                onClick={() => setSession(s => s && { ...s, mode: "cash", state: "cash_confirm" })}
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

          {/* ── M-Pesa STK flow ── */}
          {mpesaLoading && (
            <StkModal
              amountKes={session.amount}
              target={{
                initiate: () => initiateFinalPayment(b.id),
                verify: (ref: string) => verifyFinalPayment(ref),
              }}
              onSuccess={(ref) => onMpesaSuccess(ref)}
              onCancel={onClose}
            />
          )}

          {mpesaPaid && (
            <div className="flex flex-col items-center gap-3 py-2">
              <CheckCircle2 size={44} className="text-green-500" />
              <div className="text-center">
                <p className="text-sm font-bold text-green-500">M-Pesa Payment Confirmed!</p>
                {session.receipt && <p className="text-xs text-ink-dim mt-1 font-mono">{session.receipt}</p>}
              </div>
              <button onClick={onClose} className="btn-primary text-xs !py-2 !px-8">Done</button>
            </div>
          )}

          {mpesaFailed && (
            <div className="flex flex-col items-center gap-3 py-2">
              <XCircle size={40} className="text-red-500" />
              <div className="text-center">
                <p className="text-sm font-bold text-red-500">Payment Failed</p>
                <p className="text-xs text-ink-dim mt-1">{session.error}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setSession(s => s && { ...s, state: "choose", error: undefined })} className="btn-primary text-xs !py-2 !px-4">Try Again</button>
                <button onClick={onClose} className="py-2 px-4 rounded-lg border border-base-border text-xs text-ink-muted">Close</button>
              </div>
            </div>
          )}

          {/* ── Cash confirm ── */}
          {cashConfirm && (
            <div className="space-y-3">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3.5 text-center space-y-1">
                <Banknote size={28} className="text-blue-400 mx-auto" />
                <p className="text-sm font-bold text-ink">Confirm Cash Receipt</p>
                <p className="text-xs text-ink-dim">Confirm you have received <strong className="text-ink">{formatKES(session.amount)}</strong> in cash from the customer.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setSession(s => s && { ...s, state: "choose" })}
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

          {cashLoading && (
            <div className="flex flex-col items-center gap-3 py-4">
              <Loader2 size={32} className="text-blue-400 animate-spin" />
              <p className="text-sm text-ink-muted">Recording cash payment…</p>
            </div>
          )}

          {cashPaid && (
            <div className="flex flex-col items-center gap-3 py-2">
              <CheckCircle2 size={44} className="text-green-500" />
              <div className="text-center">
                <p className="text-sm font-bold text-green-500">Cash Payment Recorded!</p>
                {session.receipt && <p className="text-xs text-ink-dim mt-1 font-mono">{session.receipt}</p>}
                <p className="text-xs text-ink-dim mt-1">Booking marked as completed.</p>
              </div>
              <button onClick={onClose} className="btn-primary text-xs !py-2 !px-8">Done</button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
