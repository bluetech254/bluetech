"use client";

import { useEffect, useState } from "react";
import {
  Search, CheckCircle2, XCircle, X, Phone, Mail, Star,
  ShoppingBag, Wrench, Gift, Loader2, UserCheck, UserX, ChevronRight,
} from "lucide-react";
import { adminApi, formatKES } from "@/lib/api";

interface ClientUser {
  id: string;
  full_name: string;
  phone_number: string;
  email?: string;
  is_verified?: boolean;
  points?: number;
  loyalty_points?: number;
  created_at?: string;
  is_active?: boolean;
}

interface UserHistory {
  user: {
    id: string;
    full_name: string;
    phone_number: string;
    email?: string;
    is_active: boolean;
    is_verified: boolean;
    points_balance: number;
  };
  orders: any[];
  bookings: any[];
  points_history: any[];
}

const DEFAULT_QUERY = "a";

export default function UsersPage() {
  const [users, setUsers] = useState<ClientUser[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  // Detail modal
  const [selectedUser, setSelectedUser] = useState<ClientUser | null>(null);
  const [history, setHistory] = useState<UserHistory | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyTab, setHistoryTab] = useState<"orders" | "bookings" | "points">("orders");

  // Award points inline
  const [awardPts, setAwardPts] = useState(0);
  const [awardReason, setAwardReason] = useState("");
  const [awarding, setAwarding] = useState(false);
  const [awardMsg, setAwardMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function load(query = q) {
    setLoading(true);
    // Use at least 2 chars to satisfy backend min_length=2
    const effectiveQ = query.trim().length >= 2 ? query.trim() : DEFAULT_QUERY;
    adminApi
      .getUsers(effectiveQ)
      .then((res: any) => setUsers(res.users ?? res.data ?? []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }

  // Initial load — broad search
  useEffect(() => { load(DEFAULT_QUERY); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function toggleActive(u: ClientUser) {
    setToggling(u.id);
    try {
      await adminApi.toggleUserActive(u.id, !u.is_active);
      setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, is_active: !u.is_active } : x));
      if (selectedUser?.id === u.id) {
        setSelectedUser({ ...selectedUser, is_active: !u.is_active });
      }
    } finally {
      setToggling(null);
    }
  }

  async function openDetail(u: ClientUser) {
    setSelectedUser(u);
    setHistory(null);
    setHistoryLoading(true);
    setHistoryTab("orders");
    setAwardMsg(null);
    setAwardPts(0);
    setAwardReason("");
    try {
      const res = await adminApi.customerHistory(u.id) as any;
      setHistory(res.data ?? res);
    } catch {
      setHistory(null);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function submitAward(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser || awardPts < 1) return;
    setAwarding(true);
    setAwardMsg(null);
    try {
      await adminApi.awardPoints(selectedUser.id, awardPts, awardReason);
      setAwardMsg({ ok: true, text: `✅ Awarded ${awardPts} pts to ${selectedUser.full_name}` });
      setAwardPts(0);
      setAwardReason("");
      // Refresh history to show updated points
      const res = await adminApi.customerHistory(selectedUser.id) as any;
      setHistory(res.data ?? res);
    } catch (err: any) {
      setAwardMsg({ ok: false, text: err.message ?? "Failed to award points" });
    } finally {
      setAwarding(false);
    }
  }

  const points = (u: ClientUser) => u.points ?? u.loyalty_points ?? 0;

  return (
    <div className="space-y-5">
      {/* Search */}
      <form
        onSubmit={(e) => { e.preventDefault(); load(q); }}
        className="flex items-center gap-2 max-w-sm"
      >
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-dim" />
          <input
            className="input-field pl-9"
            placeholder="Search by name or phone…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <button type="submit" className="btn-primary !py-2">Search</button>
      </form>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">Name</th>
              <th className="th">Phone</th>
              <th className="th">Email</th>
              <th className="th">Verified</th>
              <th className="th">Points</th>
              <th className="th">Registered</th>
              <th className="th">Status</th>
              <th className="th w-8"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td className="td text-ink-dim" colSpan={8}>Loading users…</td></tr>}
            {!loading && users.length === 0 && (
              <tr><td className="td text-ink-dim" colSpan={8}>No users found. Try a different search.</td></tr>
            )}
            {users.map((u) => (
              <tr
                key={u.id}
                className="hover:bg-base-hover/40 cursor-pointer"
                onClick={() => openDetail(u)}
              >
                <td className="td font-medium">{u.full_name}</td>
                <td className="td tabular">{u.phone_number}</td>
                <td className="td text-ink-muted">{u.email ?? "—"}</td>
                <td className="td">
                  {u.is_verified
                    ? <CheckCircle2 size={15} className="text-good" />
                    : <XCircle size={15} className="text-ink-dim" />}
                </td>
                <td className="td tabular font-medium">{points(u)}</td>
                <td className="td text-ink-muted text-xs">
                  {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                </td>
                <td className="td" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => toggleActive(u)}
                    disabled={toggling === u.id}
                    className={`pill transition-colors ${
                      u.is_active
                        ? "bg-good/15 text-good hover:bg-red-500/10 hover:text-red-400"
                        : "bg-ink-dim/15 text-ink-dim hover:bg-good/10 hover:text-good"
                    } disabled:opacity-50`}
                  >
                    {toggling === u.id
                      ? <Loader2 size={11} className="animate-spin" />
                      : u.is_active ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="td">
                  <ChevronRight size={14} className="text-ink-dim" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <div
            className="bg-base-panel border border-base-border rounded-2xl shadow-2xl w-full max-w-xl flex flex-col"
            style={{ maxHeight: "90vh" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-base-border flex-shrink-0">
              <div>
                <h2 className="font-bold text-ink text-base">{selectedUser.full_name}</h2>
                <p className="text-xs text-ink-dim mt-0.5">{selectedUser.phone_number}</p>
              </div>
              <div className="flex items-center gap-2">
                {/* Toggle active from modal */}
                <button
                  onClick={() => toggleActive(selectedUser)}
                  disabled={toggling === selectedUser.id}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${
                    selectedUser.is_active
                      ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                      : "bg-good/10 text-good hover:bg-good/20"
                  }`}
                >
                  {toggling === selectedUser.id
                    ? <Loader2 size={12} className="animate-spin" />
                    : selectedUser.is_active ? <UserX size={13} /> : <UserCheck size={13} />}
                  {selectedUser.is_active ? "Deactivate" : "Activate"}
                </button>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="p-1.5 rounded-lg hover:bg-base-hover text-ink-muted hover:text-ink"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 p-5 space-y-5">
              {/* User summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-base-hover rounded-xl p-3 space-y-0.5">
                  <p className="text-[10px] text-ink-dim uppercase tracking-wider font-bold">Email</p>
                  <p className="text-sm text-ink flex items-center gap-1.5">
                    <Mail size={12} className="text-ink-dim shrink-0" />
                    {selectedUser.email ?? "—"}
                  </p>
                </div>
                <div className="bg-base-hover rounded-xl p-3 space-y-0.5">
                  <p className="text-[10px] text-ink-dim uppercase tracking-wider font-bold">Points Balance</p>
                  <p className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
                    <Star size={12} className="shrink-0" />
                    {history?.user?.points_balance ?? points(selectedUser)}
                  </p>
                </div>
                <div className="bg-base-hover rounded-xl p-3 space-y-0.5">
                  <p className="text-[10px] text-ink-dim uppercase tracking-wider font-bold">Orders</p>
                  <p className="text-sm font-bold text-ink flex items-center gap-1.5">
                    <ShoppingBag size={12} className="text-ink-dim shrink-0" />
                    {historyLoading ? "…" : (history?.orders?.length ?? 0)}
                  </p>
                </div>
                <div className="bg-base-hover rounded-xl p-3 space-y-0.5">
                  <p className="text-[10px] text-ink-dim uppercase tracking-wider font-bold">Repair Bookings</p>
                  <p className="text-sm font-bold text-ink flex items-center gap-1.5">
                    <Wrench size={12} className="text-ink-dim shrink-0" />
                    {historyLoading ? "…" : (history?.bookings?.length ?? 0)}
                  </p>
                </div>
              </div>

              {/* Award Points form */}
              <form onSubmit={submitAward} className="bg-base-hover rounded-xl p-4 space-y-3">
                <p className="text-xs text-ink-dim font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Gift size={12} />
                  Award Points
                </p>
                {awardMsg && (
                  <p className={`text-xs font-medium ${awardMsg.ok ? "text-green-500" : "text-red-400"}`}>
                    {awardMsg.text}
                  </p>
                )}
                <div className="flex gap-2">
                  <input
                    className="input-field text-sm"
                    type="number"
                    min={1}
                    placeholder="Points"
                    value={awardPts || ""}
                    onChange={(e) => setAwardPts(Number(e.target.value))}
                    required
                  />
                  <input
                    className="input-field text-sm flex-1"
                    placeholder="Reason"
                    value={awardReason}
                    onChange={(e) => setAwardReason(e.target.value)}
                    required
                  />
                  <button
                    type="submit"
                    disabled={awarding || awardPts < 1}
                    className="btn-primary !py-2 text-xs shrink-0 disabled:opacity-50"
                  >
                    {awarding ? <Loader2 size={12} className="animate-spin" /> : "Award"}
                  </button>
                </div>
              </form>

              {/* History tabs */}
              {historyLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={20} className="animate-spin text-ink-dim" />
                </div>
              )}

              {!historyLoading && history && (
                <div className="space-y-3">
                  <div className="flex gap-1">
                    {(["orders", "bookings", "points"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setHistoryTab(t)}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                          historyTab === t
                            ? "bg-volt text-white"
                            : "bg-base-hover text-ink-muted hover:text-ink border border-base-border"
                        }`}
                      >
                        {t === "points" ? "Points History" : t.charAt(0).toUpperCase() + t.slice(1)}
                        {" "}
                        <span className="opacity-70">
                          ({t === "points" ? history.points_history.length : history[t].length})
                        </span>
                      </button>
                    ))}
                  </div>

                  {historyTab === "orders" && (
                    <div className="space-y-2">
                      {history.orders.length === 0 && (
                        <p className="text-sm text-ink-dim text-center py-4">No orders yet.</p>
                      )}
                      {history.orders.map((o: any) => (
                        <div key={o.id} className="flex items-center justify-between bg-base-hover rounded-xl px-4 py-3 text-sm">
                          <div>
                            <p className="text-ink font-medium font-mono text-xs">#{o.id.slice(0, 8)}</p>
                            <p className="text-ink-dim text-xs mt-0.5 capitalize">{o.status}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-ink tabular-nums">{formatKES(o.total_amount)}</p>
                            <p className="text-ink-dim text-xs">{new Date(o.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {historyTab === "bookings" && (
                    <div className="space-y-2">
                      {history.bookings.length === 0 && (
                        <p className="text-sm text-ink-dim text-center py-4">No bookings yet.</p>
                      )}
                      {history.bookings.map((b: any) => (
                        <div key={b.id} className="flex items-center justify-between bg-base-hover rounded-xl px-4 py-3 text-sm">
                          <div>
                            <p className="text-ink font-medium">{b.device_type} {b.device_model && `· ${b.device_model}`}</p>
                            <p className="text-ink-dim text-xs mt-0.5 capitalize">{b.status?.replace(/_/g, " ")}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-ink tabular-nums">
                              {b.final_cost ? formatKES(b.final_cost) : b.estimated_cost ? `~${formatKES(b.estimated_cost)}` : "—"}
                            </p>
                            <p className="text-ink-dim text-xs">{new Date(b.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {historyTab === "points" && (
                    <div className="space-y-2">
                      {history.points_history.length === 0 && (
                        <p className="text-sm text-ink-dim text-center py-4">No points activity yet.</p>
                      )}
                      {history.points_history.map((p: any, i: number) => (
                        <div key={i} className="flex items-center justify-between bg-base-hover rounded-xl px-4 py-3 text-sm">
                          <div>
                            <p className="text-ink font-medium capitalize">
                              {p.reason?.replace(/_/g, " ") ?? "Points"}
                            </p>
                            <p className="text-ink-dim text-xs mt-0.5">{new Date(p.created_at).toLocaleDateString()}</p>
                          </div>
                          <span className={`font-bold tabular-nums ${p.delta > 0 ? "text-good" : "text-bad"}`}>
                            {p.delta > 0 ? "+" : ""}{p.delta}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-base-border flex-shrink-0">
              <button
                onClick={() => setSelectedUser(null)}
                className="w-full py-2 rounded-lg border border-base-border text-sm text-ink-muted hover:text-ink transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
