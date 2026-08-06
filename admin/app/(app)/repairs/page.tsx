"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Send, Loader2, CheckCircle2, XCircle, Smartphone } from "lucide-react";
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

type ModalState = "confirm" | "sending" | "polling" | "paid" | "failed";

interface PaymentModal {
  booking: Booking;
  amount: number;
  state: ModalState;
  receipt?: string;
  error?: string;
}

export default function RepairsPage() {
  const [tab, setTab] = useState<BookingStatus | "">("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [costDrafts, setCostDrafts] = useState<Record<string, { estimated_cost?: number; final_cost?: number }>>({});
  const [modal, setModal] = useState<PaymentModal | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function load() {
    setLoading(true);
    adminApi.getBookings(tab || undefined)
      .then((res: any) => setBookings(res.data ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(load, [tab]);

  function closeModal() {
    if (pollRef.current) clearInterval(pollRef.current);
    setModal(null);
    load();
  }

  async function updateStatus(id: string, status: string) {
    await adminApi.updateBookingStatus(id, status);
    load();
  }

  async function saveCost(id: string) {
    const draft = costDrafts[id] ?? {};
    await adminApi.updateBookingCost(id, draft.estimated_cost, draft.final_cost);
    load();
  }

  function openPaymentModal(b: Booking) {
    if (!b.final_cost && !b.estimated_cost) return;
    const total = b.final_cost ?? b.estimated_cost ?? 0;
    const commitment = b.commitment_fee ?? 0;
    const remaining = Math.max(1, total - commitment);
    setModal({ booking: b, amount: remaining, state: "confirm" });
  }

  async function sendPaymentPrompt() {
    if (!modal) return;
    setModal((m) => m && { ...m, state: "sending" });
    try {
      await adminApi.requestFinalPayment(modal.booking.id);
      setModal((m) => m && { ...m, state: "polling" });

      let attempts = 0;
      pollRef.current = setInterval(async () => {
        attempts++;
        try {
          const res = await adminApi.getFinalPaymentStatus(modal.booking.id);
          if (res.final_payment_status === "paid") {
            clearInterval(pollRef.current!);
            setModal((m) => m && { ...m, state: "paid", receipt: res.final_receipt });
          } else if (res.final_payment_status === "failed" || attempts >= 24) {
            clearInterval(pollRef.current!);
            setModal((m) => m && { ...m, state: "failed", error: "Payment failed or timed out." });
          }
        } catch { /* keep polling */ }
      }, 5000);
    } catch (err: any) {
      setModal((m) => m && { ...m, state: "failed", error: err.message });
    }
  }

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.label}
            onClick={() => setTab(t.value)}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t.value
                ? "bg-volt text-white"
                : "bg-base-panel text-ink-muted hover:text-ink border border-base-border"
            }`}
          >
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
              <th className="th w-8"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td className="td text-ink-dim" colSpan={8}>Loading bookings…</td></tr>}
            {!loading && bookings.length === 0 && <tr><td className="td text-ink-dim" colSpan={8}>No bookings found.</td></tr>}
            {bookings.map((b) => (
              <Fragment key={b.id}>
                <tr
                  className="hover:bg-base-hover/40 cursor-pointer"
                  onClick={() => setExpanded(expanded === b.id ? null : b.id)}
                >
                  <td className="td tabular text-ink-muted">#{b.id.slice(0, 8)}</td>
                  <td className="td">
                    {b.full_name}<br />
                    <span className="text-xs text-ink-dim">{b.phone_number}</span>
                  </td>
                  <td className="td">{b.device_type} · {b.device_model}</td>
                  <td className="td capitalize">{b.fulfillment_type}</td>
                  <td className="td tabular">
                    {b.final_cost ? formatKES(b.final_cost) : b.estimated_cost ? `~${formatKES(b.estimated_cost)}` : "—"}
                  </td>
                  <td className="td" onClick={(e) => e.stopPropagation()}>
                    <select
                      className="select-field text-xs !py-1 !px-2"
                      value={b.status}
                      onChange={(e) => updateStatus(b.id, e.target.value)}
                    >
                      {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="td text-ink-muted">{new Date(b.created_at).toLocaleDateString()}</td>
                  <td className="td">{expanded === b.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</td>
                </tr>

                {expanded === b.id && (
                  <tr>
                    <td colSpan={8} className="td bg-base-hover/30">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-2">
                        {/* Left: details */}
                        <div className="md:col-span-2 space-y-2">
                          <p className="text-xs text-ink-dim">Issue description</p>
                          <p className="text-sm text-ink-muted">{b.issue_description}</p>
                          {b.pickup_address && <p className="text-xs text-ink-dim">Pickup: {b.pickup_address}</p>}
                          <div className="flex gap-4 text-xs pt-1">
                            <span>
                              Commitment:{" "}
                              <span className={b.commitment_payment_status === "paid" ? "text-green-600 font-bold" : "text-amber-600 font-bold"}>
                                {b.commitment_payment_status ?? "unpaid"}
                                {b.commitment_fee ? ` (${formatKES(b.commitment_fee)})` : ""}
                              </span>
                            </span>
                            <span>
                              Final:{" "}
                              <span className={b.final_payment_status === "paid" ? "text-green-600 font-bold" : "text-ink-dim"}>
                                {b.final_payment_status ?? "unpaid"}
                              </span>
                            </span>
                          </div>
                        </div>

                        {/* Right: cost inputs + action */}
                        <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-end gap-2">
                            <div className="flex-1">
                              <label className="text-xs text-ink-dim">Estimated (KES)</label>
                              <input
                                className="input-field text-sm"
                                type="number"
                                defaultValue={b.estimated_cost}
                                onChange={(e) => setCostDrafts((p) => ({ ...p, [b.id]: { ...p[b.id], estimated_cost: Number(e.target.value) } }))}
                              />
                            </div>
                            <div className="flex-1">
                              <label className="text-xs text-ink-dim">Final (KES)</label>
                              <input
                                className="input-field text-sm"
                                type="number"
                                defaultValue={b.final_cost}
                                onChange={(e) => setCostDrafts((p) => ({ ...p, [b.id]: { ...p[b.id], final_cost: Number(e.target.value) } }))}
                              />
                            </div>
                            <button onClick={() => saveCost(b.id)} className="btn-primary !py-2.5 text-xs">Save</button>
                          </div>

                          {b.final_payment_status !== "paid" && b.status !== "completed" && (
                            <button
                              onClick={() => openPaymentModal(b)}
                              disabled={!b.final_cost && !b.estimated_cost}
                              className="btn-primary !py-2.5 text-xs flex items-center justify-center gap-1.5 !bg-green-600 hover:!bg-green-700 disabled:opacity-40"
                            >
                              <Send size={13} />
                              Complete & Request Payment
                            </button>
                          )}
                          {b.final_payment_status === "paid" && (
                            <p className="text-xs text-green-600 font-bold text-center">✅ Final payment received</p>
                          )}
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

      {/* Payment Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-base-panel border border-base-border rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <Smartphone size={18} className="text-green-500" />
              </div>
              <div>
                <h2 className="font-bold text-ink text-sm">Request Final Payment</h2>
                <p className="text-xs text-ink-dim">{modal.booking.full_name} · {modal.booking.phone_number}</p>
              </div>
            </div>

            {/* Amount breakdown */}
            <div className="bg-base-hover rounded-xl p-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-ink-muted">
                <span>Total repair cost</span>
                <span>{formatKES(modal.booking.final_cost ?? modal.booking.estimated_cost ?? 0)}</span>
              </div>
              {(modal.booking.commitment_fee ?? 0) > 0 && (
                <div className="flex justify-between text-ink-muted">
                  <span>Commitment paid</span>
                  <span className="text-green-500">− {formatKES(modal.booking.commitment_fee!)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-ink border-t border-base-border pt-1.5 mt-1">
                <span>Amount to send</span>
                <span className="text-green-500">{formatKES(modal.amount)}</span>
              </div>
            </div>

            {/* States */}
            {modal.state === "confirm" && (
              <div className="space-y-2">
                <p className="text-xs text-ink-muted">
                  This will mark the booking as <strong>completed</strong> and send an M-Pesa STK push of{" "}
                  <strong>{formatKES(modal.amount)}</strong> to the client's phone.
                </p>
                <div className="flex gap-2 pt-1">
                  <button onClick={closeModal} className="flex-1 py-2 rounded-lg border border-base-border text-xs text-ink-muted hover:text-ink transition-colors">
                    Cancel
                  </button>
                  <button onClick={sendPaymentPrompt} className="flex-1 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5">
                    <Send size={13} /> Send Prompt
                  </button>
                </div>
              </div>
            )}

            {modal.state === "sending" && (
              <div className="flex flex-col items-center gap-2 py-3">
                <Loader2 size={28} className="text-green-500 animate-spin" />
                <p className="text-xs text-ink-muted">Sending M-Pesa prompt…</p>
              </div>
            )}

            {modal.state === "polling" && (
              <div className="flex flex-col items-center gap-3 py-3">
                <Loader2 size={28} className="text-green-500 animate-spin" />
                <div className="text-center">
                  <p className="text-sm font-bold text-ink">Waiting for payment</p>
                  <p className="text-xs text-ink-dim mt-0.5">
                    STK push sent to <strong>{modal.booking.phone_number}</strong>.<br />
                    Client should enter their M-Pesa PIN.
                  </p>
                </div>
                <button onClick={closeModal} className="text-xs text-ink-dim hover:text-ink underline">
                  Dismiss (check later)
                </button>
              </div>
            )}

            {modal.state === "paid" && (
              <div className="flex flex-col items-center gap-3 py-3">
                <CheckCircle2 size={40} className="text-green-500" />
                <div className="text-center">
                  <p className="text-sm font-bold text-green-500">Payment Confirmed!</p>
                  {modal.receipt && <p className="text-xs text-ink-dim mt-0.5">Receipt: {modal.receipt}</p>}
                  <p className="text-xs text-ink-dim mt-0.5">Booking marked as completed.</p>
                </div>
                <button onClick={closeModal} className="btn-primary text-xs !py-2 !px-6">Done</button>
              </div>
            )}

            {modal.state === "failed" && (
              <div className="flex flex-col items-center gap-3 py-3">
                <XCircle size={36} className="text-red-500" />
                <div className="text-center">
                  <p className="text-sm font-bold text-red-500">Payment Failed</p>
                  <p className="text-xs text-ink-dim mt-0.5">{modal.error}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setModal((m) => m && { ...m, state: "confirm", error: undefined })} className="btn-primary text-xs !py-2 !px-4">Retry</button>
                  <button onClick={closeModal} className="py-2 px-4 rounded-lg border border-base-border text-xs text-ink-muted hover:text-ink">Close</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
