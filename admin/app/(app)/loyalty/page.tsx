"use client";

import { useEffect, useState } from "react";
import { Trophy, Gift, Search } from "lucide-react";
import { adminApi } from "@/lib/api";
import { ReferralEntry } from "@/lib/types";

export default function LoyaltyPage() {
  const [leaderboard, setLeaderboard] = useState<ReferralEntry[]>([]);
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [loading, setLoading] = useState(true);

  // Award form
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<{ id: string; full_name: string; phone_number: string } | null>(null);
  const [points, setPoints] = useState(0);
  const [reason, setReason] = useState("");
  const [awarding, setAwarding] = useState(false);
  const [awardMsg, setAwardMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    adminApi.referrals()
      .then((res: any) => {
        setLeaderboard(res.leaderboard ?? []);
        setTotalReferrals(res.total_referrals ?? 0);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (search.length < 2) { setUsers([]); return; }
    const t = setTimeout(() => {
      adminApi.getUsers(search).then((res: any) => setUsers(res.users ?? res.data ?? []));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  async function submitAward(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) return;
    setAwarding(true);
    setAwardMsg(null);
    try {
      await adminApi.awardPoints(selectedUser.id, points, reason);
      setAwardMsg({ ok: true, text: `✅ Awarded ${points} points to ${selectedUser.full_name}` });
      setSelectedUser(null); setSearch(""); setPoints(0); setReason("");
    } catch (err: any) {
      const detail = err.message ?? "Failed to award points";
      setAwardMsg({ ok: false, text: detail });
    } finally {
      setAwarding(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Leaderboard */}
      <div className="card p-5 lg:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-ink flex items-center gap-2">
            <Trophy size={17} className="text-warn" /> Referral Leaderboard
          </h3>
          <span className="text-xs text-ink-muted">{totalReferrals} total referrals</span>
        </div>
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">Customer</th>
              <th className="th">Referrals</th>
              <th className="th">Points earned</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td className="td text-ink-dim" colSpan={3}>Loading leaderboard…</td></tr>}
            {!loading && leaderboard.length === 0 && <tr><td className="td text-ink-dim" colSpan={3}>No referrals yet.</td></tr>}
            {leaderboard.map((r, i) => (
              <tr key={r.user_id} className="hover:bg-base-hover/40">
                <td className="td">#{i + 1} {r.full_name}</td>
                <td className="td tabular">{r.referral_count}</td>
                <td className="td tabular">{r.points_earned}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Award Points */}
      <form onSubmit={submitAward} className="card p-5 space-y-3 h-fit">
        <h3 className="font-display font-semibold text-ink flex items-center gap-2">
          <Gift size={17} className="text-lilac" /> Award Points
        </h3>

        {awardMsg && (
          <p className={`text-xs font-medium ${awardMsg.ok ? "text-green-500" : "text-red-400"}`}>
            {awardMsg.text}
          </p>
        )}

        {/* User search */}
        <div className="space-y-1">
          <label className="text-xs text-ink-dim">Search Customer</label>
          {selectedUser ? (
            <div className="flex items-center justify-between bg-base-hover rounded-lg px-3 py-2">
              <div>
                <p className="text-sm font-medium text-ink">{selectedUser.full_name}</p>
                <p className="text-xs text-ink-dim">{selectedUser.phone_number}</p>
              </div>
              <button type="button" onClick={() => setSelectedUser(null)}
                className="text-xs text-ink-dim hover:text-ink underline">Change</button>
            </div>
          ) : (
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-dim" />
              <input className="input-field !pl-8" value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Type name or phone…" />
              {users.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-base-panel border border-base-border rounded-xl shadow-xl overflow-hidden">
                  {users.slice(0, 6).map((u: any) => (
                    <button key={u.id} type="button"
                      onClick={() => { setSelectedUser(u); setSearch(""); setUsers([]); }}
                      className="w-full text-left px-3 py-2 hover:bg-base-hover text-sm">
                      <span className="font-medium text-ink">{u.full_name}</span>
                      <span className="text-xs text-ink-dim ml-2">{u.phone_number}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="text-xs text-ink-dim">Points</label>
          <input className="input-field" type="number" min={1} value={points || ""}
            onChange={(e) => setPoints(Number(e.target.value))} required />
        </div>
        <div>
          <label className="text-xs text-ink-dim">Reason</label>
          <input className="input-field" value={reason}
            onChange={(e) => setReason(e.target.value)} required placeholder="e.g. loyalty bonus" />
        </div>
        <button type="submit" disabled={awarding || !selectedUser}
          className="btn-primary w-full justify-center disabled:opacity-50">
          {awarding ? "Awarding…" : "Award Points"}
        </button>
      </form>
    </div>
  );
}
