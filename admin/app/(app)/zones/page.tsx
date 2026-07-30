"use client";

import { useEffect, useState } from "react";
import { adminApi, formatKES } from "@/lib/api";
import { DeliveryZone } from "@/lib/types";

export default function ZonesPage() {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getZones().then((res: any) => setZones(res.data ?? [])).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      <p className="text-sm text-ink-muted">Delivery zones are managed by the backend. This view is read-only.</p>
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">Zone</th>
              <th className="th">Delivery Fee</th>
              <th className="th">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td className="td text-ink-dim" colSpan={3}>Loading zones…</td></tr>}
            {!loading && zones.length === 0 && <tr><td className="td text-ink-dim" colSpan={3}>No zones found.</td></tr>}
            {zones.map((z) => (
              <tr key={z.id} className="hover:bg-base-hover/40">
                <td className="td">{z.zone_name}</td>
                <td className="td tabular">{formatKES(z.delivery_fee)}</td>
                <td className="td">
                  <span className={`pill ${z.is_active ? "bg-good/15 text-good" : "bg-ink-dim/15 text-ink-dim"}`}>
                    {z.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
