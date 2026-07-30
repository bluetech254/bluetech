"use client";

import { useMemo, useState } from "react";
import Topbar from "@/components/layout/Topbar";
import Drawer from "@/components/ui/Drawer";
import { bookings as seedBookings, services, formatKES } from "@/lib/mock-data";
import type { Booking, BookingStatus } from "@/lib/types";
import { Search, MessageCircle, Phone, ChevronLeft, ChevronRight, Filter, Wrench } from "lucide-react";

const STATUS_FLOW: BookingStatus[] = ["pending", "confirmed", "picked_up", "in_diagnosis", "in_repair", "ready", "completed", "cancelled"];
const SMS_STAGES: BookingStatus[] = ["confirmed", "in_diagnosis", "ready", "completed"];
const PAGE_SIZE = 20;

export default function RepairsPage() {
  const [bookings, setBookings] = useState<Booking[]>(seedBookings);
  const [nameFilter, setNameFilter] = useState("");
  const [phoneFilter, setPhoneFilter] = useState("");
  const [deviceFilter, setDeviceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Booking | null>(null);

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      if (nameFilter && !b.customerName.toLowerCase().includes(nameFilter.toLowerCase())) return false;
      if (phoneFilter && !b.phone.includes(phoneFilter)) return false;
      if (deviceFilter !== "all" && b.deviceType !== deviceFilter) return false;
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      return true;
    });
  }, [bookings, nameFilter, phoneFilter, deviceFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const activeJobs = bookings.filter((b) => !["completed", "cancelled"].includes(b.status)).length;
  const completedRevenue = bookings.filter((b) => b.status === "completed" && b.finalCost).reduce((s, b) => s + (b.finalCost ?? 0), 0);

  function updateBooking(id: string, patch: Partial<Booking>) {
    setBookings((prev) => prev.map((b) => {
      if (b.id !== id) return b;
      const updated = { ...b, ...patch, updatedAt: new Date().toISOString() };
      if (patch.status && SMS_STAGES.includes(patch.status) && !b.smsLog.find((s) => s.stage === patch.status)) {
        updated.smsLog = [...b.smsLog, { stage: patch.status, sentAt: new Date().toISOString() }];
      }
      return updated;
    }));
    setSelected((prev) => (prev && prev.id === id ? { ...prev, ...patch } : prev));
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
            <option value="phone">Phone</option>
            <option value="laptop">Laptop</option>
            <option value="tablet">Tablet</option>
            <option value="other">Other</option>
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
                <th className="th">Job</th>
                <th className="th">Customer</th>
                <th className="th">Device</th>
                <th className="th">Issue</th>
                <th className="th">Est. cost</th>
                <th className="th">Status</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((b) => (
                <tr key={b.id} className="border-b border-base-border/60 hover:bg-base-hover/50 transition-colors">
                  <td className="td font-medium tabular">{b.id}</td>
                  <td className="td">
                    <div className="font-medium">{b.customerName}</div>
                    <div className="text-xs text-ink-dim">{b.phone}</div>
                  </td>
                  <td className="td">
                    <div className="font-medium capitalize">{b.deviceType}</div>
                    <div className="text-xs text-ink-dim">{b.deviceModel}</div>
                  </td>
                  <td className="td text-ink-muted max-w-[180px] truncate">{b.issue}</td>
                  <td className="td tabular">{b.estimatedCost ? formatKES(b.estimatedCost) : "—"}</td>
                  <td className="td">
                    <select
                      className="input-field !py-1.5 !px-2.5 text-xs"
                      value={b.status}
                      onChange={(e) => updateBooking(b.id, { status: e.target.value as BookingStatus })}
                    >
                      {STATUS_FLOW.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="td">
                    <button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setSelected(b)}>View</button>
                  </td>
                </tr>
              ))}
              {pageItems.length === 0 && (
                <tr><td colSpan={7} className="td text-center text-ink-dim py-10">No repair bookings match these filters.</td></tr>
              )}
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

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected?.id ?? ""} subtitle="Repair job detail">
        {selected && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{selected.customerName}</div>
                <div className="text-xs text-ink-dim">{selected.phone}</div>
              </div>
              <div className="flex gap-2">
                <a href={`https://wa.me/254${selected.phone.slice(1)}`} target="_blank" className="btn-ghost !p-2.5"><MessageCircle size={15} /></a>
                <a href={`tel:${selected.phone}`} className="btn-ghost !p-2.5"><Phone size={15} /></a>
              </div>
            </div>

            <div className="card p-4 flex flex-col gap-2 text-sm">
              <div className="flex justify-between"><span className="text-ink-dim">Device</span><span className="capitalize font-medium">{selected.deviceType} — {selected.deviceModel}</span></div>
              <div className="flex justify-between"><span className="text-ink-dim">Issue</span><span className="font-medium text-right max-w-[60%]">{selected.issue}</span></div>
              <div className="flex justify-between"><span className="text-ink-dim">Fulfillment</span><span className="font-medium capitalize">{selected.fulfillmentType}</span></div>
              {selected.pickupAddress && <div className="flex justify-between"><span className="text-ink-dim">Pickup address</span><span className="font-medium text-right max-w-[60%]">{selected.pickupAddress}</span></div>}
            </div>

            <div>
              <div className="text-xs text-ink-dim mb-2 uppercase tracking-wider font-medium flex items-center gap-1.5"><Wrench size={12} /> Service catalog reference</div>
              <div className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto">
                {services.filter((s) => s.category.toLowerCase().startsWith(selected.deviceType) || selected.deviceType === "other").map((s) => (
                  <div key={s.id} className="flex justify-between text-xs bg-base-hover rounded-lg px-3 py-2">
                    <span>{s.name}</span>
                    <span className="tabular font-medium">{formatKES(s.basePrice)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-ink-dim mb-1.5 block">Estimated cost (KES)</label>
                <input type="number" className="input-field w-full tabular" defaultValue={selected.estimatedCost}
                  onBlur={(e) => updateBooking(selected.id, { estimatedCost: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-xs text-ink-dim mb-1.5 block">Final cost (KES)</label>
                <input type="number" className="input-field w-full tabular" defaultValue={selected.finalCost}
                  onBlur={(e) => updateBooking(selected.id, { finalCost: Number(e.target.value) })} />
              </div>
            </div>

            <div>
              <label className="text-xs text-ink-dim mb-1.5 block">Repair stage (8-stage pipeline)</label>
              <select className="input-field w-full" value={selected.status} onChange={(e) => updateBooking(selected.id, { status: e.target.value as BookingStatus })}>
                {STATUS_FLOW.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs text-ink-dim mb-1.5 block">Technician notes</label>
              <textarea className="input-field w-full min-h-[80px]" defaultValue={selected.technicianNotes}
                placeholder="Diagnosis, parts ordered, etc." onBlur={(e) => updateBooking(selected.id, { technicianNotes: e.target.value })} />
            </div>

            <div>
              <div className="text-xs text-ink-dim mb-2 uppercase tracking-wider font-medium">SMS notifications sent</div>
              {selected.smsLog.length === 0 ? (
                <p className="text-xs text-ink-dim">No SMS sent yet.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {selected.smsLog.map((s, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="capitalize text-ink-muted">{s.stage.replace("_", " ")}</span>
                      <span className="text-ink-dim">{new Date(s.sentAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
