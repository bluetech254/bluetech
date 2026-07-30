"use client";

import { useState } from "react";
import Topbar from "@/components/layout/Topbar";
import { zones as seedZones } from "@/lib/mock-data";
import type { DeliveryZone } from "@/lib/types";
import { Plus, Trash2, MapPin } from "lucide-react";
import clsx from "clsx";

export default function ZonesPage() {
  const [zones, setZones] = useState<DeliveryZone[]>(seedZones);
  const [newName, setNewName] = useState("");
  const [newFee, setNewFee] = useState("");

  function update(id: string, patch: Partial<DeliveryZone>) {
    setZones((prev) => prev.map((z) => (z.id === id ? { ...z, ...patch } : z)));
  }
  function remove(id: string) {
    setZones((prev) => prev.filter((z) => z.id !== id));
  }
  function addZone() {
    if (!newName || !newFee) return;
    setZones((prev) => [...prev, { id: `z${Date.now()}`, name: newName, fee: Number(newFee), isActive: true, ordersFulfilled: 0 }]);
    setNewName(""); setNewFee("");
  }

  return (
    <div>
      <Topbar title="Delivery Zones" subtitle="Set delivery fees for every area BlueTech serves." />

      <div className="card p-4 mb-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <label className="text-xs text-ink-dim mb-1.5 block">Zone name</label>
            <input className="input-field w-full" placeholder="e.g. Lang'ata" value={newName} onChange={(e) => setNewName(e.target.value)} />
          </div>
          <div className="min-w-[140px]">
            <label className="text-xs text-ink-dim mb-1.5 block">Delivery fee (KES)</label>
            <input type="number" className="input-field w-full tabular" placeholder="250" value={newFee} onChange={(e) => setNewFee(e.target.value)} />
          </div>
          <button className="btn-primary" onClick={addZone}><Plus size={15} /> Add zone</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {zones.map((z) => (
          <div key={z.id} className="card p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-volt/15 flex items-center justify-center text-volt"><MapPin size={16} /></div>
              <button onClick={() => remove(z.id)} className="text-ink-dim hover:text-bad transition-colors"><Trash2 size={15} /></button>
            </div>
            <input
              className="bg-transparent text-sm font-semibold outline-none w-full mb-2 focus:underline"
              value={z.name}
              onChange={(e) => update(z.id, { name: e.target.value })}
            />
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-ink-dim">KES</span>
              <input
                type="number"
                className="input-field !py-1.5 tabular w-24"
                value={z.fee}
                onChange={(e) => update(z.id, { fee: Number(e.target.value) })}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-ink-muted">
              <span>{z.ordersFulfilled} orders fulfilled</span>
              <button
                onClick={() => update(z.id, { isActive: !z.isActive })}
                className={clsx("pill", z.isActive ? "bg-good/15 text-good" : "bg-ink-dim/20 text-ink-muted")}
              >
                {z.isActive ? "Active" : "Inactive"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
