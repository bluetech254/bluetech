"use client";

import { useState } from "react";
import Topbar from "@/components/layout/Topbar";
import Drawer from "@/components/ui/Drawer";
import { services as seedServices, formatKES } from "@/lib/mock-data";
import type { Service } from "@/lib/types";
import { Plus, Clock, ShieldCheck, Trash2 } from "lucide-react";

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>(seedServices);
  const [editing, setEditing] = useState<Service | "new" | null>(null);

  function save(s: Service) {
    setServices((prev) => (prev.find((x) => x.id === s.id) ? prev.map((x) => (x.id === s.id ? s : x)) : [s, ...prev]));
    setEditing(null);
  }
  function remove(id: string) {
    setServices((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div>
      <Topbar title="Repair Services" subtitle="The catalog technicians reference when quoting a job." />

      <div className="flex justify-end mb-5">
        <button className="btn-primary" onClick={() => setEditing("new")}><Plus size={15} /> Add service</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {services.map((s) => (
          <div key={s.id} className="card p-4 cursor-pointer hover:border-volt/50 transition-colors" onClick={() => setEditing(s)}>
            <div className="flex items-start justify-between mb-2">
              <span className="pill bg-volt/15 text-volt text-[11px]">{s.category}</span>
              <button onClick={(e) => { e.stopPropagation(); remove(s.id); }} className="text-ink-dim hover:text-bad transition-colors"><Trash2 size={14} /></button>
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
      </div>

      <Drawer open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "Add service" : editing?.name ?? ""} subtitle="Repair service">
        {editing && <ServiceForm service={editing === "new" ? null : editing} onSave={save} />}
      </Drawer>
    </div>
  );
}

function ServiceForm({ service, onSave }: { service: Service | null; onSave: (s: Service) => void }) {
  const [form, setForm] = useState<Service>(
    service ?? { id: `s${Date.now()}`, name: "", category: "Phones", basePrice: 0, durationMins: 30, warrantyDays: 30, jobsCompleted: 0 }
  );
  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="text-xs text-ink-dim mb-1.5 block">Service name</label>
        <input className="input-field w-full" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
      <div>
        <label className="text-xs text-ink-dim mb-1.5 block">Category</label>
        <select className="input-field w-full" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
          <option>Phones</option><option>Laptops</option><option>Tablets</option>
        </select>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-ink-dim mb-1.5 block">Base price</label>
          <input type="number" className="input-field w-full tabular" value={form.basePrice} onChange={(e) => setForm({ ...form, basePrice: Number(e.target.value) })} />
        </div>
        <div>
          <label className="text-xs text-ink-dim mb-1.5 block">Duration (min)</label>
          <input type="number" className="input-field w-full tabular" value={form.durationMins} onChange={(e) => setForm({ ...form, durationMins: Number(e.target.value) })} />
        </div>
        <div>
          <label className="text-xs text-ink-dim mb-1.5 block">Warranty (days)</label>
          <input type="number" className="input-field w-full tabular" value={form.warrantyDays} onChange={(e) => setForm({ ...form, warrantyDays: Number(e.target.value) })} />
        </div>
      </div>
      <button className="btn-primary" onClick={() => onSave(form)}>Save service</button>
    </div>
  );
}
