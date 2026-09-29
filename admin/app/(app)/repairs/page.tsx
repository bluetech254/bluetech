"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Loader2, CheckCircle2, XCircle, Smartphone, X, Phone, Wrench, MapPin, FileText, AlertTriangle } from "lucide-react";
import { adminApi, formatKES } from "@/lib/api";
import { Booking, BookingStatus } from "@/lib/types";

const TABS: { label: string; value: BookingStatus | "" }[] = [
  { label: "All", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Picked Up", value: "picked_up" },
  { label: "In Diagnosis", value: "in_diagnosis" },
  { label: "In Repair", value: "in_repair" },
  { label: "Ready", value: "ready" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

const STATUS_OPTIONS: BookingStatus[] = [
  "pending", "confirmed", "picked_up", "in_diagnosis", "in_repair", "ready", "completed", "cancelled",
];

const STATUS_COLORS: Record<string, string> = {
  pending: "text-amber-500", confirmed: "text-blue-500", picked_up: "text-indigo-400",
  in_diagnosis: "text-purple-400", in_repair: "text-orange-400", ready: "text-cyan-500",
  completed: "text-green-500", cancelled: "text-red-500",
};

type PaymentModalState = "confirm" | "sending" | "polling" | "paid" | "failed";
interface PaymentModal { booking: Booking; amount: number; state: PaymentModalState; receipt?: string; error?: string; }

export default function RepairsPage() {
  const [tab, setTab] = useState<BookingStatus | "">("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Booking | null>(null);
  const [costDraft, setCostDraft] = useState<{ estimated_cost?: number; final_cost?: number }>({});
  const [savingCost, setSavingCost] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [payModal, setPayModal] = useState<PaymentModal | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function load() {
    setLoading(true);
    adminApi.getBookings(tab || undefined)
      .then((res: any) => setBookings(res.data ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(load, [tab]);

  // Lock scroll when any modal open
  useEffect(() => {
    document.body.style.overflow = (detail || payModal) ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [detail, payModal]);

  function openDetail(b: Booking) {
    setDetail(b);
    setCostDraft({ estimated_cost: b.estimated_cost, final_cost: b.final_cost });
    setNotesDraft(b.internal_notes ?? "");
  }

  function closeDetail() { setDetail(null); load(); }

  async function handleStatusChange(status: string) {
    if (!detail) return;
    setUpdatingStatus(true);
    try {
      await adminApi.updateBookingStatus(detail.id, status);
      setDetail({ ...detail, status: status as BookingStatus });
      load();
    } finally { setUpdatingStatus(false); }
  }

  async function handleSaveCost() {
    if (!detail) return;
    setSavingCost(true);
    try {
      await adminApi.updateBookingCost(detail.id, costDraft.estimated_cost, costDraft.final_cost);
      setDetail({ ...detail, estimated_cost: costDraft.estimated_cost, final_cost: costDraft.final_cost });
      load();
    } finally { setSavingCost(false); }
  }

  async function handleCancel() {
    if (!detail) return;
    if (!confirm(`Cancel booking #${detail.id.slice(0, 8)}?`)) return;
    setCancelling(true);
    try {
      await adminApi.updateBookingStatus(detail.id, "cancelled");
      setDetail({ ...detail, status: "cancelled" });
      load();
    } finally { setCancelling(false); }
  }

  function openPaymentModal(b: Booking) {
    const total = b.final_cost ?? b.estimated_cost ?? 0;
    const remaining = Math.max(1, total - (b.commitment_fee ?? 0));
    setPayModal({ booking: b, amount: remaining, state: "confirm" });
  }

  function closePayModal() {
    if (pollRef.current) clearInterval(pollRef.current);
    setPayModal(null);
    load();
    // refresh detail if open
    if (detail) adminApi.getBooking(detail.id).then((b: any) => setDetail(b));
  }

  async function sendPaymentPrompt() {
    if (!payModal) return;
    setPayModal(m => m && { ...m, state: "sending" });
    try {
      await adminApi.requestFinalPayment(payModal.booking.id);
      setPayModal(m => m && { ...m, state: "polling" });
      let attempts = 0;
      pollRef.current = setInterval(async () => {
        attempts++;
        try {
          const res = await adminApi.getFinalPaymentStatus(payModal.booking.id);
          if (res.final_payment_status === "paid") {
            clearInterval(pollRef.current!);
            setPayModal(m => m && { ...m, state: "paid", receipt: res.final_receipt });
          } else if (res.final_payment_status === "failed" || attempts >= 24) {
            clearInterval(pollRef.current!);
            setPayModal(m => m && { ...m, state: "failed", error: "Payment failed or timed out." });
          }
        } catch { /* keep polling */ }
      }, 5000);
    } catch (err: any) {
      setPayModal(m => m && { ...m, state: "failed", error: err.message });
    }
  }

  return (
    <div className="space-y-5">
      {/* Tabs */}
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

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">Booking</th>
              <th className="th">Customer</th>
              <th className="th">Device</th>
              <th className="th">Fulfillment</th>
              <th className="th">Cost</th>
              <th className="th">Status</th>
              <th className="th">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td className="td text-ink-dim" colSpan={7}>Loading bookings…</td></tr>}
            {!loading && bookings.length === 0 && <tr><td className="td text-ink-dim" colSpan={7}>No bookings found.</td></tr>}
            {bookings.map((b) => (
              <tr key={b.id} className="hover:bg-base-hover/40 cursor-pointer" onClick={() => openDetail(b)}>
                <td className="td font-mono text-xs text-ink-muted">#{b.id.slice(0, 8)}</td>
                <td className="td">{b.full_name}<br /><span className="text-xs text-ink-dim">{b.phone_number}</span></td>
                <td className="td">{b.device_type} · {b.device_model}</td>
                <td className="td capitalize text-xs">{b.fulfillment_type}</td>
                <td className="td tabular">{b.final_cost ? formatKES(b.final_cost) : b.estimated_cost ? `~${formatKES(b.estimated_cost)}` : "—"}</td>
                <td className="td" onClick={(e) => e.stopPropagation()}>
                  <select className="select-field text-xs !py-1 !px-2" value={b.status}
                    onChange={(e) => adminApi.updateBookingStatus(b.id, e.target.value).then(load)}>
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="td text-xs text-ink-muted">{new Date(b.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Booking Detail Modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}>
          <div className="bg-base-panel border border-base-border rounded-2xl shadow-2xl w-full max-w-lg flex flex-col"
            style={{ maxHeight: "90vh" }}>

            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-base-border flex-shrink-0">
              <div>
                <p className="text-xs text-ink-dim font-mono">#{detail.id}</p>
                <h2 className="font-bold text-ink text-base mt-0.5">Booking Details</h2>
              </div>
              <div className="flex items-center gap-2">
                <a href={`/receipt?type=booking&id=${detail.id}`} target="_blank" rel="noreferrer"
                  className="btn-ghost !py-1 !px-2.5 text-xs">🧾 Receipt</a>
                <button onClick={closeDetail} className="p-1.5 rounded-lg hover:bg-base-hover text-ink-muted hover:text-ink">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 p-5 space-y-5">

              {/* Status */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`text-sm font-bold capitalize ${STATUS_COLORS[detail.status] ?? "text-ink"}`}>
                  ● {detail.status.replace(/_/g, " ")}
                </span>
                <span className="text-xs text-ink-dim">{new Date(detail.created_at).toLocaleString()}</span>
              </div>

              {/* Customer */}
              <div className="bg-base-hover rounded-xl p-4 space-y-2">
                <p className="text-xs text-ink-dim font-bold uppercase tracking-wider">Customer</p>
                <div className="flex items-center gap-2 text-sm"><Phone size={13} className="text-ink-dim" />{detail.full_name} · {detail.phone_number}</div>
                {detail.pickup_address && <div className="flex items-start gap-2 text-sm"><MapPin size={13} className="text-ink-dim mt-0.5" />{detail.pickup_address}</div>}
              </div>

              {/* Device & Issue */}
              <div className="bg-base-hover rounded-xl p-4 space-y-2">
                <p className="text-xs text-ink-dim font-bold uppercase tracking-wider flex items-center gap-1.5"><Wrench size={12} />Device & Issue</p>
                <p className="text-sm font-medium text-ink">{detail.device_type} {detail.device_model && `· ${detail.device_model}`}</p>
                <p className="text-xs text-ink-dim capitalize">Fulfillment: {detail.fulfillment_type}</p>
                <div className="flex items-start gap-2 text-sm text-ink-muted"><FileText size={13} className="mt-0.5 flex-shrink-0" />{detail.issue_description}</div>
              </div>

              {/* Payments */}
              <div className="bg-base-hover rounded-xl p-4 space-y-2">
                <p className="text-xs text-ink-dim font-bold uppercase tracking-wider">Payments</p>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Commitment fee</span>
                    <span className={`font-bold capitalize ${detail.commitment_payment_status === "paid" ? "text-green-500" : "text-amber-500"}`}>
                      {detail.commitment_payment_status ?? "unpaid"} {detail.commitment_fee ? `· ${formatKES(detail.commitment_fee)}` : ""}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-muted">Final payment</span>
                    <span className={`font-bold capitalize ${detail.final_payment_status === "paid" ? "text-green-500" : "text-ink-dim"}`}>
                      {detail.final_payment_status ?? "unpaid"}
                    </span>
                  </div>
                  {detail.commitment_receipt && <div className="flex justify-between"><span className="text-ink-dim">Commitment receipt</span><span className="text-green-500 font-mono">{detail.commitment_receipt}</span></div>}
                  {detail.final_receipt && <div className="flex justify-between"><span className="text-ink-dim">Final receipt</span><span className="text-green-500 font-mono">{detail.final_receipt}</span></div>}
                </div>
              </div>

              {/* Cost inputs */}
              <div className="space-y-2">
                <p className="text-xs text-ink-dim font-bold uppercase tracking-wider">Set Cost</p>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-ink-dim">Estimated (KES)</label>
                    <input className="input-field text-sm" type="number"
                      value={costDraft.estimated_cost ?? ""}
                      onChange={(e) => setCostDraft(p => ({ ...p, estimated_cost: Number(e.target.value) || undefined }))} />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-ink-dim">Final (KES)</label>
                    <input className="input-field text-sm" type="number"
                      value={costDraft.final_cost ?? ""}
                      onChange={(e) => setCostDraft(p => ({ ...p, final_cost: Number(e.target.value) || undefined }))} />
                  </div>
                  <button onClick={handleSaveCost} disabled={savingCost}
                    className="btn-primary !py-2.5 text-xs self-end disabled:opacity-50">
                    {savingCost ? <Loader2 size={12} className="animate-spin" /> : "Save"}
                  </button>
                </div>
              </div>

              {/* Internal notes */}
              <div className="space-y-2">
                <p className="text-xs text-ink-dim font-bold uppercase tracking-wider">Internal Notes</p>
                <div className="flex gap-2 items-end">
                  <textarea
                    className="input-field text-sm flex-1 resize-none"
                    rows={3}
                    placeholder="Staff-only notes (not visible to customer)…"
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

              {/* Status update */}
              <div className="space-y-2">
                <p className="text-xs text-ink-dim font-bold uppercase tracking-wider">Update Status</p>
                <div className="flex gap-2 flex-wrap">
                  {STATUS_OPTIONS.filter(s => s !== detail.status && s !== "cancelled").map(s => (
                    <button key={s} onClick={() => handleStatusChange(s)} disabled={updatingStatus}
                      className="px-3 py-1.5 rounded-lg border border-base-border text-xs font-medium text-ink-muted hover:text-ink hover:bg-base-hover transition-colors disabled:opacity-50 capitalize">
                      {s.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Complete & Request Payment */}
              {detail.status !== "completed" && detail.status !== "cancelled" && detail.final_payment_status !== "paid" && (
                <button onClick={() => openPaymentModal(detail)}
                  disabled={!detail.final_cost && !detail.estimated_cost}
                  className="w-full py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40 transition-colors">
                  <Send size={14} /> Complete & Request Final Payment
                </button>
              )}
              {detail.final_payment_status === "paid" && (
                <p className="text-center text-sm text-green-500 font-bold">✅ Fully paid</p>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-base-border flex items-center justify-between gap-3 flex-shrink-0">
              <button onClick={closeDetail} className="px-4 py-2 rounded-lg border border-base-border text-sm text-ink-muted hover:text-ink">
                Close
              </button>
              {detail.status !== "cancelled" && detail.status !== "completed" && (
                <button onClick={handleCancel} disabled={cancelling}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 text-sm font-bold disabled:opacity-50">
                  {cancelling ? <Loader2 size={14} className="animate-spin" /> : <AlertTriangle size={14} />}
                  Cancel Booking
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {payModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
          style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}>
          <div className="bg-base-panel border border-base-border rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <Smartphone size={18} className="text-green-500" />
              </div>
              <div>
                <h2 className="font-bold text-ink text-sm">Request Final Payment</h2>
                <p className="text-xs text-ink-dim">{payModal.booking.full_name} · {payModal.booking.phone_number}</p>
              </div>
            </div>

            <div className="bg-base-hover rounded-xl p-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-ink-muted"><span>Total repair cost</span><span>{formatKES(payModal.booking.final_cost ?? payModal.booking.estimated_cost ?? 0)}</span></div>
              {(payModal.booking.commitment_fee ?? 0) > 0 && (
                <div className="flex justify-between text-ink-muted"><span>Commitment paid</span><span className="text-green-500">− {formatKES(payModal.booking.commitment_fee!)}</span></div>
              )}
              <div className="flex justify-between font-bold text-ink border-t border-base-border pt-1.5 mt-1"><span>Amount to send</span><span className="text-green-500">{formatKES(payModal.amount)}</span></div>
            </div>

            {payModal.state === "confirm" && (
              <div className="space-y-2">
                <p className="text-xs text-ink-muted">Marks booking as <strong>completed</strong> and sends M-Pesa STK push of <strong>{formatKES(payModal.amount)}</strong>.</p>
                <div className="flex gap-2 pt-1">
                  <button onClick={closePayModal} className="flex-1 py-2 rounded-lg border border-base-border text-xs text-ink-muted hover:text-ink">Cancel</button>
                  <button onClick={sendPaymentPrompt} className="flex-1 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-bold flex items-center justify-center gap-1.5">
                    <Send size={13} /> Send Prompt
                  </button>
                </div>
              </div>
            )}
            {payModal.state === "sending" && (
              <div className="flex flex-col items-center gap-2 py-3">
                <Loader2 size={28} className="text-green-500 animate-spin" />
                <p className="text-xs text-ink-muted">Sending M-Pesa prompt…</p>
              </div>
            )}
            {payModal.state === "polling" && (
              <div className="flex flex-col items-center gap-3 py-3">
                <Loader2 size={28} className="text-green-500 animate-spin" />
                <div className="text-center">
                  <p className="text-sm font-bold text-ink">Waiting for payment</p>
                  <p className="text-xs text-ink-dim mt-0.5">STK push sent to <strong>{payModal.booking.phone_number}</strong>.<br />Client should enter M-Pesa PIN.</p>
                </div>
                <button onClick={closePayModal} className="text-xs text-ink-dim hover:text-ink underline">Dismiss (check later)</button>
              </div>
            )}
            {payModal.state === "paid" && (
              <div className="flex flex-col items-center gap-3 py-3">
                <CheckCircle2 size={40} className="text-green-500" />
                <div className="text-center">
                  <p className="text-sm font-bold text-green-500">Payment Confirmed!</p>
                  {payModal.receipt && <p className="text-xs text-ink-dim mt-0.5">Receipt: {payModal.receipt}</p>}
                </div>
                <button onClick={closePayModal} className="btn-primary text-xs !py-2 !px-6">Done</button>
              </div>
            )}
            {payModal.state === "failed" && (
              <div className="flex flex-col items-center gap-3 py-3">
                <XCircle size={36} className="text-red-500" />
                <div className="text-center">
                  <p className="text-sm font-bold text-red-500">Payment Failed</p>
                  <p className="text-xs text-ink-dim mt-0.5">{payModal.error}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setPayModal(m => m && { ...m, state: "confirm", error: undefined })} className="btn-primary text-xs !py-2 !px-4">Retry</button>
                  <button onClick={closePayModal} className="py-2 px-4 rounded-lg border border-base-border text-xs text-ink-muted hover:text-ink">Close</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
