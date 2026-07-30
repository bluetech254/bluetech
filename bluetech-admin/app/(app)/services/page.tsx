"use client";

import { useState, useEffect } from "react";
import Topbar from "@/components/layout/Topbar";
import Drawer from "@/components/ui/Drawer";
import { adminApi } from "@/lib/api";
import { formatKES } from "@/lib/mock-data";
import { Plus, Clock, ShieldCheck } from "lucide-react";

function mapService(s: any) {
  return {
    id: s.id,
    name: s.service_name ?? s.name,
    category: s.service_category ?? s.category,
    basePrice: s.base_price ?? s.basePrice ?? 0,
    durationMins: s.duration_minutes ?? s.durationMins ?? 30,
    warrantyDays: s.warranty_days ?? s.warrantyDays ?? 0,
    jobsCompleted: s.jobs_completed ?? 0,
  };
}

export default function ServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | "new" | null>(null);

  useEffect(() => {
    adminApi.getServices().then((r) => {
      setServices((r.data ?? []).map(mapService));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <Topbar title="Repair Services" subtitle="The catalog technicians reference when quoting a job." />

      <div className="flex justify-end mb-5">
        <button className="btn-primary" onClick={() => setEditing("new")}><Plus size={15} /> Add service</button>
      </div>

      {loading && <p className="text-ink-dim text-sm">Loading…</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {services.map((s) => (
          <div key={s.id} className="card p-4 cursor-pointer hover:border-volt/50 transition-colors" onClick={() => setEditing(s)}>
            <div className="flex items-start justify-between mb-2">
              <span className="pill bg-volt/15 text-volt text-[11px]">{s.category}</span>
            </div>
            <div className="font-medium text-sm mb-2">{s.name}</div>
            <div className="font-semibold tabular mb-3">{formatKES(s.basePrice)}</div>
            <div className="flex items-center gap-4 text-xs text-ink-dim">
              <span className="flex items-center gap-1"><Clock size={12} /> {s.durationMins} min</span>
              <span className="flex items-center gap-1"><ShieldCheck size={12} /> {s.warrantyDays ? `${s.warrantyDays}d warranty` : "No warranty"}</span>
            </div>
            <div className="text-xs text-ink-muted mt-2">{s.jobsCompleted} jobs completed</div>
          </div>
        ))}
        {!loading && services.length === 0 && <p className="text-ink-dim text-sm col-span-full">No services found.</p>}
      </div>

      <Drawer open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "Add service" : editing?.name ?? ""} subtitle="Repair service">
        {editing && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink-muted">Service management is handled directly in the database. Contact a superadmin to add or modify services.</p>
            <button className="btn-ghost" onClick={() => setEditing(null)}>Close</button>
          </div>
        )}
      </Drawer>
    </div>
  );
}
