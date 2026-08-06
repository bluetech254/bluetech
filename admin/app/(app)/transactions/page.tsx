"use client";

import { useEffect, useState } from "react";
import { X, Receipt, ShoppingBag, Wrench, CheckCircle2, Clock, XCircle, Printer } from "lucide-react";
import { adminApi, formatKES } from "@/lib/api";

type TxType = "order" | "booking_commitment" | "booking_final";

interface Transaction {
  id: string;
  type: TxType;
  ref: string;
  customer: string;
  phone: string;
  amount: number;
  payment_status: string;
  mpesa_receipt?: string;
  status: string;
  payment_method?: string;
  created_at: string;
  detail: any;
}

const TYPE_LABELS: Record<TxType, string> = {
  order: "Product Order",
  booking_commitment: "Repair Commitment",
  booking_final: "Repair Final Payment",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  paid:    <CheckCircle2 size={14} className="text-green-500" />,
  pending: <Clock size={14} className="text-amber-500" />,
  failed:  <XCircle size={14} className="text-red-500" />,
  unpaid:  <Clock size={14} className="text-ink-dim" />,
};

export default function TransactionsPage() {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | TxType>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "pending" | "failed">("all");
  const [selected, setSelected] = useState<Transaction | null>(null);

  useEffect(() => {
    adminApi.getTransactions()
      .then((res) => setTxns(res.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    document.body.style.overflow = selected ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [selected]);

  const filtered = txns.filter(t =>
    (filter === "all" || t.type === filter) &&
    (statusFilter === "all" || t.payment_status === statusFilter)
  );

  const totalPaid = filtered.filter(t => t.payment_status === "paid").reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {(["all", "order", "booking_commitment", "booking_final"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f ? "bg-volt text-white" : "bg-base-panel text-ink-muted hover:text-ink border border-base-border"
            }`}>
            {f === "all" ? "All" : TYPE_LABELS[f as TxType]}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          {(["all", "paid", "pending", "failed"] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                statusFilter === s ? "bg-volt text-white" : "bg-base-panel text-ink-muted hover:text-ink border border-base-border"
              }`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="card p-4 flex items-center justify-between">
        <span className="text-sm text-ink-muted">{filtered.length} transactions</span>
        <span className="text-sm font-bold text-green-500">Paid total: {formatKES(totalPaid)}</span>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">Ref</th>
              <th className="th">Type</th>
              <th className="th">Customer</th>
              <th className="th">Amount</th>
              <th className="th">Status</th>
              <th className="th">Receipt</th>
              <th className="th">Date</th>
              <th className="th w-8"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td className="td text-ink-dim" colSpan={8}>Loading…</td></tr>}
            {!loading && filtered.length === 0 && <tr><td className="td text-ink-dim" colSpan={8}>No transactions found.</td></tr>}
            {filtered.map(t => (
              <tr key={t.id} className="hover:bg-base-hover/40 cursor-pointer" onClick={() => setSelected(t)}>
                <td className="td font-mono text-xs text-ink-muted">{t.ref}</td>
                <td className="td">
                  <span className="flex items-center gap-1.5 text-xs">
                    {t.type === "order" ? <ShoppingBag size={12} /> : <Wrench size={12} />}
                    {TYPE_LABELS[t.type]}
                  </span>
                </td>
                <td className="td">
                  <span className="text-sm">{t.customer}</span><br />
                  <span className="text-xs text-ink-dim">{t.phone}</span>
                </td>
                <td className="td tabular font-bold">{formatKES(t.amount)}</td>
                <td className="td">
                  <span className="flex items-center gap-1 text-xs capitalize font-medium">
                    {STATUS_ICON[t.payment_status] ?? STATUS_ICON.unpaid}
                    {t.payment_status}
                  </span>
                </td>
                <td className="td font-mono text-xs text-ink-muted">{t.mpesa_receipt ?? "—"}</td>
                <td className="td text-xs text-ink-muted">{new Date(t.created_at).toLocaleDateString()}</td>
                <td className="td"><Receipt size={14} className="text-ink-dim" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Receipt Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}>
          <div className="bg-base-panel border border-base-border rounded-2xl shadow-2xl w-full max-w-sm flex flex-col"
            style={{ maxHeight: "90vh" }}>

            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-base-border">
              <div className="flex items-center gap-2">
                <Receipt size={16} className="text-volt" />
                <h2 className="font-bold text-ink">Transaction Receipt</h2>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-base-hover text-ink-muted">
                <X size={18} />
              </button>
            </div>

            {/* Receipt body */}
            <div className="overflow-y-auto flex-1 p-5 space-y-4 font-mono text-sm" id="receipt-body">
              {/* Logo / header */}
              <div className="text-center space-y-0.5 pb-3 border-b border-dashed border-base-border">
                <p className="font-bold text-ink text-base not-italic">BLUE TECHNOLOGY</p>
                <p className="text-xs text-ink-dim not-italic">1KM behind Kenyatta University, Nairobi</p>
                <p className="text-xs text-ink-dim not-italic">bluetechnology58@gmail.com · 0707 454 182</p>
              </div>

              {/* Ref + date */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-ink-dim">Ref</span><span className="font-bold">{selected.ref}</span></div>
                <div className="flex justify-between"><span className="text-ink-dim">Date</span><span>{new Date(selected.created_at).toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-ink-dim">Type</span><span>{TYPE_LABELS[selected.type]}</span></div>
                <div className="flex justify-between"><span className="text-ink-dim">Method</span><span className="capitalize">{selected.payment_method ?? "M-Pesa"}</span></div>
                {selected.mpesa_receipt && (
                  <div className="flex justify-between"><span className="text-ink-dim">M-Pesa Receipt</span><span className="text-green-500">{selected.mpesa_receipt}</span></div>
                )}
              </div>

              {/* Customer */}
              <div className="space-y-1 text-xs border-t border-dashed border-base-border pt-3">
                <div className="flex justify-between"><span className="text-ink-dim">Customer</span><span>{selected.customer}</span></div>
                <div className="flex justify-between"><span className="text-ink-dim">Phone</span><span>{selected.phone}</span></div>
              </div>

              {/* Order items or booking detail */}
              <div className="border-t border-dashed border-base-border pt-3 space-y-1.5 text-xs">
                {selected.type === "order" && (
                  <>
                    {(selected.detail.items ?? []).map((it: any, i: number) => (
                      <div key={i} className="flex justify-between">
                        <span>{it.quantity}× {it.product_title || it.title}</span>
                        <span>{formatKES((it.total_price || it.unit_price * it.quantity) ?? 0)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-ink-muted pt-1"><span>Subtotal</span><span>{formatKES(selected.detail.subtotal)}</span></div>
                    <div className="flex justify-between text-ink-muted"><span>Delivery</span><span>{formatKES(selected.detail.delivery_fee)}</span></div>
                    {selected.detail.points_discount > 0 && (
                      <div className="flex justify-between text-green-500"><span>Points discount</span><span>− {formatKES(selected.detail.points_discount)}</span></div>
                    )}
                    {selected.detail.delivery_zone && (
                      <div className="flex justify-between text-ink-muted"><span>Zone</span><span>{selected.detail.delivery_zone}</span></div>
                    )}
                  </>
                )}
                {(selected.type === "booking_commitment" || selected.type === "booking_final") && (
                  <>
                    <div className="flex justify-between"><span className="text-ink-dim">Device</span><span>{selected.detail.device || "—"}</span></div>
                    <div className="flex justify-between"><span className="text-ink-dim">Issue</span><span className="text-right max-w-[180px] truncate">{selected.detail.issue}</span></div>
                    <div className="flex justify-between"><span className="text-ink-dim">Estimated cost</span><span>{formatKES(selected.detail.estimated_cost)}</span></div>
                    {selected.detail.final_cost > 0 && (
                      <div className="flex justify-between"><span className="text-ink-dim">Final cost</span><span>{formatKES(selected.detail.final_cost)}</span></div>
                    )}
                    <div className="flex justify-between text-ink-muted text-[10px] pt-1">
                      <span>Booking ID</span><span className="font-mono">{selected.detail.booking_id?.slice(0, 16)}…</span>
                    </div>
                  </>
                )}
              </div>

              {/* Total */}
              <div className="border-t-2 border-base-border pt-3 flex justify-between font-bold text-base">
                <span>TOTAL PAID</span>
                <span className="text-green-500">{formatKES(selected.amount)}</span>
              </div>

              {/* Status */}
              <div className="text-center pt-2 pb-1">
                <span className={`text-xs font-bold uppercase tracking-widest ${
                  selected.payment_status === "paid" ? "text-green-500" :
                  selected.payment_status === "pending" ? "text-amber-500" : "text-red-500"
                }`}>
                  ● {selected.payment_status}
                </span>
              </div>

              <p className="text-center text-[10px] text-ink-dim border-t border-dashed border-base-border pt-3">
                Thank you for choosing Blue Technology.<br />
                Let's build the future together, one device at a time.
              </p>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-base-border flex gap-2">
              <button onClick={() => setSelected(null)}
                className="flex-1 py-2 rounded-lg border border-base-border text-sm text-ink-muted hover:text-ink">
                Close
              </button>
              <button onClick={() => window.print()}
                className="flex-1 py-2 rounded-lg bg-volt text-white text-sm font-bold flex items-center justify-center gap-1.5">
                <Printer size={14} /> Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
