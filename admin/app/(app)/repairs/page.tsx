"use client";

import { Fragment, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Send } from "lucide-react";
import { adminApi, formatKES } from "@/lib/api";
import { Booking, BookingStatus } from "@/lib/types";
import StatusBadge from "@/components/ui/StatusBadge";

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

const STATUS_OPTIONS: BookingStatus[] = ["pending", "confirmed", "picked_up", "in_diagnosis", "in_repair", "ready", "completed", "cancelled"];

export default function RepairsPage() {
  const [tab, setTab] = useState<BookingStatus | "">("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [costDrafts, setCostDrafts] = useState<Record<string, { estimated_cost?: number; final_cost?: number }>>({});
  const [sendingPayment, setSendingPayment] = useState<string | null>(null);

  function load() {
    setLoading(true);
    adminApi.getBookings(tab || undefined).then((res: any) => setBookings(res.data ?? [])).finally(() => setLoading(false));
  }

  useEffect(load, [tab]);

  async function updateStatus(id: string, status: string) {
    await adminApi.updateBookingStatus(id, status);
    load();
  }

  async function saveCost(id: string) {
    const draft = costDrafts[id] ?? {};
    await adminApi.updateBookingCost(id, draft.estimated_cost, draft.final_cost);
    load();
  }

  async function requestFinalPayment(b: Booking) {
    if (!b.final_cost && !b.estimated_cost) {
      alert("Set a final cost before requesting payment.");
      return;
    }
    if (!confirm(`Mark as completed and send M-Pesa prompt to ${b.phone_number}?`)) return;
    setSendingPayment(b.id);
    try {
      const res: any = await adminApi.requestFinalPayment(b.id);
      alert(`✅ STK push sent: KES ${res.amount} → ${b.phone_number}`);
      load();
    } catch (err: any) {
      alert(`Failed: ${err.message}`);
    } finally {
      setSendingPayment(null);
    }
  }

  return (
    <div className="space-y-5">
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
                <tr className="hover:bg-base-hover/40 cursor-pointer" onClick={() => setExpanded(expanded === b.id ? null : b.id)}>
                  <td className="td tabular text-ink-muted">#{b.id.slice(0, 8)}</td>
                  <td className="td">{b.full_name}<br /><span className="text-xs text-ink-dim">{b.phone_number}</span></td>
                  <td className="td">{b.device_type} · {b.device_model}</td>
                  <td className="td capitalize">{b.fulfillment_type}</td>
                  <td className="td tabular">{b.final_cost ? formatKES(b.final_cost) : b.estimated_cost ? `~${formatKES(b.estimated_cost)}` : "—"}</td>
                  <td className="td" onClick={(e) => e.stopPropagation()}>
                    <select className="select-field text-xs !py-1 !px-2" value={b.status} onChange={(e) => updateStatus(b.id, e.target.value)}>
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
                        <div className="md:col-span-2 space-y-2">
                          <p className="text-xs text-ink-dim mb-1">Issue description</p>
                          <p className="text-sm text-ink-muted">{b.issue_description}</p>
                          {b.pickup_address && <p className="text-xs text-ink-dim mt-2">Pickup: {b.pickup_address}</p>}
                          {/* Payment status summary */}
                          <div className="flex gap-4 text-xs mt-2">
                            <span>
                              Commitment:{" "}
                              <span className={b.commitment_payment_status === "paid" ? "text-green-600 font-bold" : "text-amber-600 font-bold"}>
                                {b.commitment_payment_status ?? "unpaid"}
                                {b.commitment_fee ? ` (KES ${b.commitment_fee})` : ""}
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
                          {/* Complete & Request Final Payment */}
                          {b.status !== "completed" && b.final_payment_status !== "paid" && (
                            <button
                              onClick={() => requestFinalPayment(b)}
                              disabled={sendingPayment === b.id}
                              className="btn-primary !py-2.5 text-xs flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-60"
                            >
                              <Send size={13} />
                              {sendingPayment === b.id ? "Sending..." : "Complete & Request Payment"}
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
    </div>
  );
}
