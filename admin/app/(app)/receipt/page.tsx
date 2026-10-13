"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { adminApi, formatKES } from "@/lib/api";
import { Printer, CheckCircle, Clock } from "lucide-react";

export default function ReceiptPage() {
  const params = useSearchParams();
  const type = params.get("type");
  const id = params.get("id");
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id || !type) return;
    const fn = type === "booking" ? adminApi.getBooking : adminApi.getOrder;
    fn(id)
      .then((r: any) => setData(r.data ?? r))
      .catch((e: any) => setError(e.message ?? "Failed to load"));
  }, [id, type]);

  if (error) return <p className="p-8 text-red-400 text-sm">{error}</p>;
  if (!data) return <p className="p-8 text-ink-muted text-sm">Loading receipt…</p>;

  const isOrder = type === "order";
  const isPaid = isOrder ? data.payment_status === "paid" : data.commitment_payment_status === "paid";
  const date = new Date(data.created_at).toLocaleString("en-KE", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="max-w-[480px] mx-auto py-8 px-4">
      <div className="flex justify-end mb-5 print:hidden">
        <button onClick={() => window.print()} className="btn-primary flex items-center gap-2 text-sm">
          <Printer size={14} /> Print / Save PDF
        </button>
      </div>

      <div className="bg-white text-gray-900 rounded-2xl overflow-hidden shadow-2xl print:shadow-none print:rounded-none">
        {/* accent bar */}
        <div className="h-1.5 bg-gradient-to-r from-blue-600 to-blue-400" />

        {/* Header */}
        <div className="px-8 pt-7 pb-5 flex items-start justify-between border-b border-gray-100">
          <div>
            <Image src="/logo.png" alt="Bluetech" width={110} height={36} className="object-contain mb-2" />
            <p className="text-xs text-gray-400">{process.env.NEXT_PUBLIC_BUSINESS_NAME ?? "Blue Technology"}</p>
            <p className="text-xs text-gray-400">{process.env.NEXT_PUBLIC_BUSINESS_ADDRESS ?? "Nairobi, Kenya"}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Receipt</p>
            <p className="text-lg font-black text-gray-800 font-mono">#{data.id?.slice(0, 8).toUpperCase()}</p>
            <p className="text-xs text-gray-400 mt-1">{date}</p>
            <div className={`inline-flex items-center gap-1 mt-2 text-xs font-bold px-2.5 py-1 rounded-full ${
              isPaid ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"
            }`}>
              {isPaid ? <CheckCircle size={11} /> : <Clock size={11} />}
              {isPaid ? "PAID" : "PENDING"}
            </div>
          </div>
        </div>

        {/* Customer */}
        <div className="px-8 py-5 border-b border-gray-100">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Bill To</p>
          <p className="font-bold text-gray-800 text-sm">{data.full_name}</p>
          <p className="text-xs text-gray-500 mt-0.5">{data.phone_number}</p>
          {data.email && <p className="text-xs text-gray-500">{data.email}</p>}
          {isOrder && data.delivery_address && (
            <p className="text-xs text-gray-500 mt-0.5">{data.delivery_address}{data.delivery_zone ? ` · ${data.delivery_zone}` : ""}</p>
          )}
        </div>

        {/* Order items */}
        {isOrder && (
          <div className="px-8 py-5 border-b border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Items</p>
            <div className="space-y-2.5">
              {(data.order_items ?? []).map((item: any, i: number) => (
                <div key={i} className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm text-gray-700 font-medium leading-snug">{item.product_title ?? item.title ?? "Item"}</p>
                    <p className="text-xs text-gray-400">Qty {item.quantity} × {formatKES(item.unit_price)}</p>
                  </div>
                  <p className="text-sm font-bold text-gray-800 tabular-nums">{formatKES(item.unit_price * item.quantity)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Repair details */}
        {!isOrder && (
          <div className="px-8 py-5 border-b border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Repair Details</p>
            <div className="space-y-1.5 text-sm">
              <Row label="Device" value={`${data.device_type}${data.device_model ? ` — ${data.device_model}` : ""}`} />
              {data.issue_description && <Row label="Issue" value={data.issue_description} />}
              {data.fulfillment_type && <Row label="Service type" value={data.fulfillment_type.replace(/_/g, " ")} capitalize />}
              <Row label="Status" value={data.status?.replace(/_/g, " ")} capitalize />
            </div>
          </div>
        )}

        {/* Totals */}
        <div className="px-8 py-5">
          <div className="space-y-2 text-sm">
            {isOrder ? (
              <>
                {data.subtotal != null && <SummaryRow label="Subtotal" value={formatKES(data.subtotal)} />}
                {data.delivery_fee > 0 && <SummaryRow label="Delivery fee" value={formatKES(data.delivery_fee)} />}
                {data.points_discount > 0 && <SummaryRow label="Points discount" value={`-${formatKES(data.points_discount)}`} green />}
                <div className="border-t border-gray-200 pt-3 mt-1 flex justify-between items-center">
                  <span className="font-bold text-gray-800 text-base">Total</span>
                  <span className="font-black text-gray-900 text-xl tabular-nums">{formatKES(data.total_amount)}</span>
                </div>
                {data.payment_method && (
                  <p className="text-xs text-gray-400 pt-1">
                    Paid via <span className="font-semibold capitalize">{data.payment_method.replace(/_/g, " ")}</span>
                    {data.mpesa_receipt && <span className="font-mono ml-1 text-green-600"> · {data.mpesa_receipt}</span>}
                  </p>
                )}
              </>
            ) : (
              <>
                {(data.commitment_fee ?? 0) > 0 && <SummaryRow label="Commitment fee" value={formatKES(data.commitment_fee)} />}
                {(data.estimated_cost ?? 0) > 0 && <SummaryRow label="Estimated cost" value={formatKES(data.estimated_cost)} />}
                {(data.final_cost ?? 0) > 0 && (
                  <div className="border-t border-gray-200 pt-3 mt-1 flex justify-between items-center">
                    <span className="font-bold text-gray-800 text-base">Final cost</span>
                    <span className="font-black text-gray-900 text-xl tabular-nums">{formatKES(data.final_cost)}</span>
                  </div>
                )}
                {data.commitment_receipt && (
                  <p className="text-xs text-gray-400 pt-1">Commitment receipt: <span className="font-mono text-green-600">{data.commitment_receipt}</span></p>
                )}
                {data.final_receipt && (
                  <p className="text-xs text-gray-400">Final receipt: <span className="font-mono text-green-600">{data.final_receipt}</span></p>
                )}
              </>
            )}
          </div>
        </div>

        {data.notes && (
          <div className="px-8 pb-5">
            <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">📝 {data.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="px-8 py-5 bg-gray-50 border-t border-gray-100 text-center">
          <p className="text-xs font-semibold text-gray-600">Thank you for choosing {process.env.NEXT_PUBLIC_BUSINESS_NAME ?? "Blue Technology"}! 🙏</p>
          <p className="text-xs text-gray-400 mt-1">{process.env.NEXT_PUBLIC_BUSINESS_TAGLINE ?? "For support, WhatsApp us or visit our shop."}</p>
          <div className="flex items-center justify-center gap-1 mt-3">
            {Array.from({ length: 32 }).map((_, i) => (
              <div key={i} className={`h-0.5 w-1 rounded-full ${i % 2 === 0 ? "bg-blue-200" : "bg-transparent"}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-400 shrink-0">{label}</span>
      <span className={`text-gray-700 text-right ${capitalize ? "capitalize" : ""}`}>{value}</span>
    </div>
  );
}

function SummaryRow({ label, value, green }: { label: string; value: string; green?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={`tabular-nums ${green ? "text-green-600 font-semibold" : "text-gray-700"}`}>{value}</span>
    </div>
  );
}
