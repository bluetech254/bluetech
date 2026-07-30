"use client";

import { useMemo, useState, useEffect } from "react";
import Topbar from "@/components/layout/Topbar";
import Drawer from "@/components/ui/Drawer";
import { adminApi } from "@/lib/api";
import { formatKES } from "@/lib/mock-data";
import type { BookingStatus } from "@/lib/types";
import { Search, MessageCircle, Phone, ChevronLeft, ChevronRight, Filter } from "lucide-react";

const STATUS_FLOW: BookingStatus[] = ["pending", "confirmed", "picked_up", "in_diagnosis", "in_repair", "ready", "completed", "cancelled"];
const PAGE_SIZE = 20;

function mapBooking(b: any) {
  return {
    id: b.id,
    customerName: b.full_name,
    phone: b.phone_number,
    deviceType: b.device_type,
    deviceModel: b.device_model,
    issue: b.issue_description,
    fulfillmentType: b.fulfillment_type,
    pickupAddress: b.pickup_address,
    status: b.status,
    estimatedCost: b.estimated_cost,
    finalCost: b.final_cost,
    technicianNotes: b.internal_notes,
    createdAt: b.created_at,
  };
}

export default function RepairsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [nameFilter, setNameFilter] = useState("");
  const [phoneFilter, setPhoneFilter] = useState("");
  const [deviceFilter, setDeviceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<any | null>(null);

  useEffect(() => {
    adminApi.getBookings().then((r) => {
      setBookings((r.data ?? []).map(mapBooking));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => bookings.filter((b) => {
    if (nameFilter && !b.customerName?.toLowerCase().includes(nameFilter.toLowerCase())) return false;
    if (phoneFilter && !b.phone?.includes(phoneFilter)) return false;
    if (deviceFilter !== "all" && b.deviceType !== deviceFilter) return false;
    if (statusFilter !== "all" && b.status !== statusFilter) return false;
    return true;
  }), [bookings, nameFilter, phoneFilter, deviceFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const activeJobs = bookings.filter((b) => !["completed", "cancelled"].includes(b.status)).length;
  const completedRevenue = bookings.filter((b) => b.status === "completed" && b.finalCost).reduce((s, b) => s + (b.finalCost ?? 0), 0);

  async function updateStatus(id: string, status: string) {
    await adminApi.updateBookingStatus(id, status);
    setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status } : b));
    setSelected((prev: any) => prev?.id === id ? { ...prev, status } : prev);
  }

  async function updateCost(id: string, estimated: number | null, final: number | null) {
    await adminApi.updateBookingCost(id, estimated, final);
    setBookings((prev) => prev.map((b) => b.id === id ? { ...b, estimatedCost: estimated, finalCost: final } : b));
    setSelected((prev: any) => prev?.id === id ? { ...prev, estimatedCost: estimated, finalCost: final } : prev);
  }

  return (
    <div>
      <Topbar title="Repairs & Bookings" subtitle="Track every device from drop-off to collection." />

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="pill bg-coral-tile/15 text-coral-tile text-sm px-4 py-2">Active jobs: <b className="ml-1 tabular">{activeJobs}</b></div>
        <div className="pill bg-good/15 text-good text-sm px-4 py-2">Completed revenue: <b className="ml-1 tabular">{formatKES(completedRevenue)}</b></div>
        <div className="pill bg-volt/15 text-volt text-sm px-4 py-2">Total bookings: <b className="ml-1 tabular">{bookings.length}</b></div>
      </div>

      <div className="card p-4 mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 input-field flex-1 min-w-[200px]">
            <Search size={14} className="text-ink-dim" />
            <input className="bg-transparent outline-none w-full text-sm" placeholder="Search by customer name…" value={nameFilter} onChange={(e) => { setNameFilter(e.target.value); setPage(1); }} />
          </div>
          <input className="input-field min-w-[160px]" placeholder="Search by phone…" value={phoneFilter} onChange={(e) => { setPhoneFilter(e.target.value); setPage(1); }} />
          <select className="input-field min-w-[140px]" value={deviceFilter} onChange={(e) => { setDeviceFilter(e.target.value); setPage(1); }}>
            <option value="all">All devices</option>
            <option value="phone">Phone</option><option value="laptop">Laptop</option>
            <option value="tablet">Tablet</option><option value="other">Other</option>
          </select>
          <select className="input-field min-w-[160px]" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="all">All statuses</option>
            {STATUS_FLOW.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="btn-ghost" onClick={() => { setNameFilter(""); setPhoneFilter(""); setDeviceFilter("all"); setStatusFilter("all"); setPage(1); }}>
            <Filter size={14} /> Reset
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-base-border">
              <tr>
                <th className="th">Job</th><th className="th">Customer</th><th className="th">Device</th>
                <th className="th">Issue</th><th className="th">Est. cost</th><th className="th">Status</th><th className="th"></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="td text-center text-ink-dim py-10">Loading…</td></tr>}
              {!loading && pageItems.map((b) => (
                <tr key={b.id} className="border-b border-base-border/60 hover:bg-base-hover/50 transition-colors">
                  <td className="td font-medium tabular text-xs">{b.id?.slice(0, 8)}</td>
                  <td className="td"><div className="font-medium">{b.customerName}</div><div className="text-xs text-ink-dim">{b.phone}</div></td>
                  <td className="td"><div className="font-medium capitalize">{b.deviceType}</div><div className="text-xs text-ink-dim">{b.deviceModel}</div></td>
                  <td className="td text-ink-muted max-w-[180px] truncate">{b.issue}</td>
                  <td className="td tabular">{b.estimatedCost ? formatKES(b.estimatedCost) : "—"}</td>
                  <td className="td">
                    <select className="input-field !py-1.5 !px-2.5 text-xs" value={b.status} onChange={(e) => updateStatus(b.id, e.target.value)}>
                      {STATUS_FLOW.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="td"><button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setSelected(b)}>View</button></td>
                </tr>
              ))}
              {!loading && pageItems.length === 0 && <tr><td colSpan={7} className="td text-center text-ink-dim py-10">No repair bookings match these filters.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-base-border text-sm text-ink-muted">
          <span>Showing {pageItems.length ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
          <div className="flex items-center gap-2">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="btn-ghost !p-2 disabled:opacity-30"><ChevronLeft size={14} /></button>
            <span className="tabular">{page} / {totalPages}</span>
            <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="btn-ghost !p-2 disabled:opacity-30"><ChevronRight size={14} /></button>
          </div>
        </div>
      </div>

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected?.id?.slice(0, 8) ?? ""} subtitle="Repair job detail">
        {selected && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div><div className="font-semibold">{selected.customerName}</div><div className="text-xs text-ink-dim">{selected.phone}</div></div>
              <div className="flex gap-2">
                <a href={`https://wa.me/254${selected.phone?.slice(1)}`} target="_blank" className="btn-ghost !p-2.5"><MessageCircle size={15} /></a>
                <a href={`tel:${selected.phone}`} className="btn-ghost !p-2.5"><Phone size={15} /></a>
              </div>
            </div>
            <div className="card p-4 flex flex-col gap-2 text-sm">
              <div className="flex justify-between"><span className="text-ink-dim">Device</span><span className="capitalize font-medium">{selected.deviceType} — {selected.deviceModel}</span></div>
              <div className="flex justify-between"><span className="text-ink-dim">Issue</span><span className="font-medium text-right max-w-[60%]">{selected.issue}</span></div>
              <div className="flex justify-between"><span className="text-ink-dim">Fulfillment</span><span className="font-medium capitalize">{selected.fulfillmentType}</span></div>
              {selected.pickupAddress && <div className="flex justify-between"><span className="text-ink-dim">Pickup address</span><span className="font-medium text-right max-w-[60%]">{selected.pickupAddress}</span></div>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-ink-dim mb-1.5 block">Estimated cost (KES)</label>
                <input type="number" className="input-field w-full tabular" defaultValue={selected.estimatedCost}
                  onBlur={(e) => updateCost(selected.id, Number(e.target.value), selected.finalCost)} />
              </div>
              <div>
                <label className="text-xs text-ink-dim mb-1.5 block">Final cost (KES)</label>
                <input type="number" className="input-field w-full tabular" defaultValue={selected.finalCost}
                  onBlur={(e) => updateCost(selected.id, selected.estimatedCost, Number(e.target.value))} />
              </div>
            </div>
            <div>
              <label className="text-xs text-ink-dim mb-1.5 block">Repair stage</label>
              <select className="input-field w-full" value={selected.status} onChange={(e) => updateStatus(selected.id, e.target.value)}>
                {STATUS_FLOW.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {selected.technicianNotes && (
              <div>
                <div className="text-xs text-ink-dim mb-1.5">Technician notes</div>
                <p className="text-sm text-ink-muted">{selected.technicianNotes}</p>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
