"use client";

import { useEffect, useState } from "react";
import { Trophy, Gift } from "lucide-react";
import { adminApi } from "@/lib/api";
import { ReferralEntry } from "@/lib/types";

export default function LoyaltyPage() {
  const [leaderboard, setLeaderboard] = useState<ReferralEntry[]>([]);
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [loading, setLoading] = useState(true);

  const [userId, setUserId] = useState("");
  const [points, setPoints] = useState(0);
  const [reason, setReason] = useState("");
  const [awarding, setAwarding] = useState(false);
  const [awardMsg, setAwardMsg] = useState("");

  useEffect(() => {
    adminApi.referrals()
      .then((res: any) => {
        setLeaderboard(res.leaderboard ?? []);
        setTotalReferrals(res.total_referrals ?? 0);
      })
      .finally(() => setLoading(false));
  }, []);

  async function submitAward(e: React.FormEvent) {
    e.preventDefault();
    setAwarding(true);
    setAwardMsg("");
    try {
      await adminApi.awardPoints(userId, points, reason);
      setAwardMsg("Points awarded successfully.");
      setUserId(""); setPoints(0); setReason("");
    } catch (err: any) {
      setAwardMsg(err.message ?? "Failed to award points");
    } finally {
      setAwarding(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="card p-5 lg:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-ink flex items-center gap-2"><Trophy size={17} className="text-warn" /> Referral Leaderboard</h3>
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

      <form onSubmit={submitAward} className="card p-5 space-y-3 h-fit">
        <h3 className="font-display font-semibold text-ink flex items-center gap-2"><Gift size={17} className="text-lilac" /> Award Points</h3>
        {awardMsg && <p className="text-xs text-ink-muted">{awardMsg}</p>}
        <div>
          <label className="text-xs text-ink-dim">User ID</label>
          <input className="input-field" value={userId} onChange={(e) => setUserId(e.target.value)} required placeholder="Customer user ID" />
        </div>
        <div>
          <label className="text-xs text-ink-dim">Points</label>
          <input className="input-field" type="number" value={points} onChange={(e) => setPoints(Number(e.target.value))} required />
        </div>
        <div>
          <label className="text-xs text-ink-dim">Reason</label>
          <input className="input-field" value={reason} onChange={(e) => setReason(e.target.value)} required placeholder="e.g. loyalty bonus" />
        </div>
        <button type="submit" disabled={awarding} className="btn-primary w-full justify-center">
          {awarding ? "Awarding…" : "Award points"}
        </button>
      </form>
    </div>
  );
}
