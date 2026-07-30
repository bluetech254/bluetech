"use client";

import { useState, useEffect } from "react";
import Topbar from "@/components/layout/Topbar";
import { adminApi } from "@/lib/api";
import { formatKES } from "@/lib/mock-data";
import { Gift, Users2, TrendingUp, Award } from "lucide-react";

export default function LoyaltyPage() {
  const [data, setData] = useState<any>(null);
  const [awardUserId, setAwardUserId] = useState("");
  const [awardPoints, setAwardPoints] = useState("100");
  const [awardReason, setAwardReason] = useState("");
  const [awarding, setAwarding] = useState(false);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    adminApi.getReferrals().then(setData).catch(console.error);
    // Load users for award dropdown
    const token = (() => { try { const r = document.cookie.split("; ").find((c) => c.startsWith("admin_session="))?.split("=").slice(1).join("="); return r ? JSON.parse(decodeURIComponent(r)).token : ""; } catch { return ""; } })();
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/admin/search?q=+`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { const u = d.users ?? []; setUsers(u); if (u[0]) setAwardUserId(u[0].id); })
      .catch(console.error);
  }, []);

  async function awardManualPoints() {
    if (!awardUserId || !awardPoints) return;
    setAwarding(true);
    try {
      await adminApi.awardPoints(awardUserId, Number(awardPoints), awardReason || "Admin goodwill award");
      setAwardPoints("100"); setAwardReason("");
      adminApi.getReferrals().then(setData);
    } catch (e: any) { alert(e.message); }
    setAwarding(false);
  }

  const leaderboard: any[] = data?.leaderboard ?? [];
  const totalReferrals: number = data?.total_referrals ?? 0;

  return (
    <div>
      <Topbar title="Loyalty & Referrals" subtitle="Points balances, redemption history, and referral performance." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <div className="card p-4"><div className="text-xs text-ink-dim mb-1 flex items-center gap-1.5"><Users2 size={13} /> Total referrals</div><div className="text-xl font-bold tabular">{totalReferrals}</div></div>
        <div className="card p-4"><div className="text-xs text-ink-dim mb-1 flex items-center gap-1.5"><TrendingUp size={13} /> Top referrers</div><div className="text-xl font-bold tabular">{leaderboard.length}</div></div>
        <div className="card p-4"><div className="text-xs text-ink-dim mb-1 flex items-center gap-1.5"><Gift size={13} /> Users loaded</div><div className="text-xl font-bold tabular">{users.length}</div></div>
        <div className="card p-4"><div className="text-xs text-ink-dim mb-1 flex items-center gap-1.5"><Award size={13} /> Award points</div><div className="text-sm text-ink-muted mt-1">Use form below</div></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="card p-5">
          <h3 className="font-semibold text-[15px] mb-4">Referral leaderboard</h3>
          {!data && <p className="text-sm text-ink-dim">Loading…</p>}
          <div className="flex flex-col gap-2.5">
            {leaderboard.map((u: any, i: number) => (
              <div key={u.user_id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2.5">
                  <span className="w-5 text-ink-dim text-xs tabular">{i + 1}</span>
                  <div><div className="font-medium">{u.full_name}</div><div className="text-xs text-ink-dim">{u.referral_code}</div></div>
                </div>
                <span className="pill bg-lilac-tile/15 text-lilac-tile text-xs">{u.referrals} referred</span>
              </div>
            ))}
            {data && leaderboard.length === 0 && <p className="text-sm text-ink-dim">No referrals recorded yet.</p>}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-[15px] mb-4">Award points manually</h3>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs text-ink-dim mb-1.5 block">Customer</label>
              <select className="input-field w-full" value={awardUserId} onChange={(e) => setAwardUserId(e.target.value)}>
                {users.map((u: any) => <option key={u.id} value={u.id}>{u.full_name} ({u.phone_number})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-ink-dim mb-1.5 block">Points</label>
              <input type="number" className="input-field w-full tabular" value={awardPoints} onChange={(e) => setAwardPoints(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-ink-dim mb-1.5 block">Reason</label>
              <input className="input-field w-full" placeholder="e.g. Compensation for delayed order" value={awardReason} onChange={(e) => setAwardReason(e.target.value)} />
            </div>
            <button className="btn-primary" onClick={awardManualPoints} disabled={awarding}>
              <Gift size={15} /> {awarding ? "Awarding…" : "Award points"}
            </button>
            <p className="text-xs text-ink-dim">Customers earn 10% of every paid order automatically, and redeem from 1,000 points for a discount.</p>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-[15px] mb-4">Top point holders</h3>
          <div className="flex flex-col gap-2.5">
            {[...users].sort((a, b) => (b.points ?? 0) - (a.points ?? 0)).slice(0, 10).map((u: any, i: number) => (
              <div key={u.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2.5">
                  <span className="w-5 text-ink-dim text-xs tabular">{i + 1}</span>
                  <span className="font-medium">{u.full_name}</span>
                </div>
                <span className="tabular font-semibold">{(u.points ?? 0).toLocaleString()} pts</span>
              </div>
            ))}
            {users.length === 0 && <p className="text-sm text-ink-dim">Loading…</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
