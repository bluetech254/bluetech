"use client";

import { useEffect, useState } from "react";
import { adminApi, formatKES } from "@/lib/api";
import { RepairService } from "@/lib/types";

export default function ServicesPage() {
  const [services, setServices] = useState<RepairService[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    adminApi.getServiceCategories().then((res: any) => setCategories(res.data ?? res ?? []));
  }, []);

  useEffect(() => {
    setLoading(true);
    adminApi.getServices(category || undefined).then((res: any) => setServices(res.data ?? [])).finally(() => setLoading(false));
  }, [category]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-muted">Repair services are managed by the backend. This view is read-only.</p>
        <select className="select-field" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">Service</th>
              <th className="th">Category</th>
              <th className="th">Base Price</th>
              <th className="th">Duration</th>
              <th className="th">Warranty</th>
              <th className="th">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td className="td text-ink-dim" colSpan={6}>Loading services…</td></tr>}
            {!loading && services.length === 0 && <tr><td className="td text-ink-dim" colSpan={6}>No services found.</td></tr>}
            {services.map((s) => (
              <tr key={s.id} className="hover:bg-base-hover/40">
                <td className="td">{s.service_name}</td>
                <td className="td">{s.service_category}</td>
                <td className="td tabular">{formatKES(s.base_price)}</td>
                <td className="td">{s.duration_minutes} min</td>
                <td className="td">{s.warranty_days} days</td>
                <td className="td">
                  <span className={`pill ${s.is_active ? "bg-good/15 text-good" : "bg-ink-dim/15 text-ink-dim"}`}>
                    {s.is_active ? "Active" : "Inactive"}
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
