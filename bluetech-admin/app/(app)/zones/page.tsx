"use client";

import { useState, useEffect } from "react";
import Topbar from "@/components/layout/Topbar";
import { adminApi } from "@/lib/api";
import { formatKES } from "@/lib/mock-data";
import { MapPin } from "lucide-react";
import clsx from "clsx";

function mapZone(z: any) {
  return {
    id: z.id,
    name: z.zone_name ?? z.name,
    fee: z.delivery_fee ?? z.fee ?? 0,
    isActive: z.is_active ?? true,
    ordersFulfilled: z.orders_fulfilled ?? 0,
  };
}

export default function ZonesPage() {
  const [zones, setZones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getZones().then((r) => {
      setZones((r.data ?? []).map(mapZone));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <Topbar title="Delivery Zones" subtitle="Delivery areas and fees configured in the database." />

      {loading && <p className="text-ink-dim text-sm">Loading…</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {zones.map((z) => (
          <div key={z.id} className="card p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-volt/15 flex items-center justify-center text-volt"><MapPin size={16} /></div>
              <span className={clsx("pill text-[11px]", z.isActive ? "bg-good/15 text-good" : "bg-ink-dim/20 text-ink-muted")}>{z.isActive ? "Active" : "Inactive"}</span>
            </div>
            <div className="font-semibold text-sm mb-1">{z.name}</div>
            <div className="text-sm text-ink-muted mb-3">{formatKES(z.fee)} delivery fee</div>
            <div className="text-xs text-ink-dim">{z.ordersFulfilled} orders fulfilled</div>
          </div>
        ))}
        {!loading && zones.length === 0 && <p className="text-ink-dim text-sm col-span-full">No delivery zones found.</p>}
      </div>
    </div>
  );
}
