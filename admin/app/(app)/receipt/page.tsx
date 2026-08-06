"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { adminApi, formatKES } from "@/lib/api";
import { Printer } from "lucide-react";

export default function ReceiptPage() {
  const params = useSearchParams();
  const type = params.get("type"); // "order" | "booking"
  const id = params.get("id");
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const printRef = useRef<HTMLDivElement>(null);

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
  const date = new Date(data.created_at).toLocaleString("en-KE", {
    dateStyle: "medium", timeStyle: "short",
  });

  return (
    <div className="max-w-lg mx-auto py-8 px-4">
      <div className="flex justify-end mb-4 print:hidden">
        <button onClick={() => window.print()}
          className="btn-primary flex items-center gap-2">
          <Printer size={15} /> Print / Save PDF
        </button>
      </div>

      <div ref={printRef} className="bg-white text-gray-900 rounded-2xl shadow-xl p-8 print:shadow-none print:rounded-none">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-5 mb-5">
          <div>
            <Image src="/logo.png" alt="Bluetech" width={120} height={40} className="object-contain" />
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Receipt #{data.id?.slice(0, 8).toUpperCase()}</p>
            <p className="text-xs text-gray-500">{date}</p>
            <span className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
              (data.payment_status === "paid" || data.commitment_payment_status === "paid")
                ? "bg-green-100 text-green-700"
                : "bg-yellow-100 text-yellow-700"
            }`}>
              {isOrder ? (data.payment_status ?? "pending") : (data.commitment_payment_status ?? "pending")}
            </span>
          </div>
        </div>

        {/* Customer */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Customer</p>
          <p className="font-semibold text-gray-800">{data.full_name}</p>
          <p className="text-sm text-gray-500">{data.phone_number}</p>
          {data.email && <p className="text-sm text-gray-500">{data.email}</p>}
          {isOrder && data.delivery_address && (
            <p className="text-sm text-gray-500 mt-0.5">{data.delivery_address}{data.delivery_zone ? ` · ${data.delivery_zone}` : ""}</p>
          )}
        </div>

        {/* Items — Order */}
        {isOrder && (
          <div className="mb-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Items</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-1 font-medium text-gray-500">Product</th>
                  <th className="text-center py-1 font-medium text-gray-500">Qty</th>
                  <th className="text-right py-1 font-medium text-gray-500">Price</th>
                </tr>
              </thead>
              <tbody>
                {(data.order_items ?? []).map((item: any, i: number) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-1.5 text-gray-700">{item.product_title ?? item.title ?? "Item"}</td>
                    <td className="py-1.5 text-center text-gray-600">{item.quantity}</td>
                    <td className="py-1.5 text-right text-gray-700">{formatKES(item.unit_price * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Repair details — Booking */}
        {!isOrder && (
          <div className="mb-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Repair Details</p>
            <div className="space-y-1 text-sm text-gray-700">
              <div className="flex justify-between"><span className="text-gray-500">Device</span><span>{data.device_type} — {data.device_model}</span></div>
              {data.issue_description && <div className="flex justify-between gap-4"><span className="text-gray-500 shrink-0">Issue</span><span className="text-right">{data.issue_description}</span></div>}
              {data.fulfillment_type && <div className="flex justify-between"><span className="text-gray-500">Service type</span><span className="capitalize">{data.fulfillment_type.replace(/_/g, " ")}</span></div>}
              <div className="flex justify-between"><span className="text-gray-500">Status</span><span className="capitalize">{data.status?.replace(/_/g, " ")}</span></div>
            </div>
          </div>
        )}

        {/* Totals */}
        <div className="border-t border-gray-200 pt-4 space-y-1 text-sm">
          {isOrder ? (
            <>
              {data.subtotal != null && <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{formatKES(data.subtotal)}</span></div>}
              {data.delivery_fee > 0 && <div className="flex justify-between text-gray-600"><span>Delivery</span><span>{formatKES(data.delivery_fee)}</span></div>}
              {data.points_discount > 0 && <div className="flex justify-between text-green-600"><span>Points discount</span><span>-{formatKES(data.points_discount)}</span></div>}
              <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-gray-200">
                <span>Total</span><span>{formatKES(data.total_amount)}</span>
              </div>
              {data.payment_method && <p className="text-xs text-gray-400 mt-1">Paid via {data.payment_method.replace(/_/g, " ")}</p>}
            </>
          ) : (
            <>
              {data.commitment_fee > 0 && <div className="flex justify-between text-gray-600"><span>Commitment fee</span><span>{formatKES(data.commitment_fee)}</span></div>}
              {data.estimated_cost > 0 && <div className="flex justify-between text-gray-600"><span>Estimated cost</span><span>{formatKES(data.estimated_cost)}</span></div>}
              {data.final_cost > 0 && (
                <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t border-gray-200">
                  <span>Final cost</span><span>{formatKES(data.final_cost)}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Notes */}
        {data.notes && (
          <p className="mt-4 text-xs text-gray-400 border-t border-gray-100 pt-3">Note: {data.notes}</p>
        )}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-100 text-center text-xs text-gray-400">
          <p>Thank you for choosing Bluetech!</p>
          <p className="mt-0.5">For support, contact us via WhatsApp or visit our shop.</p>
        </div>
      </div>
    </div>
  );
}
