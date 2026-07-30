"use client";

import { useState } from "react";
import Topbar from "@/components/layout/Topbar";
import { customers as seedCustomers, loyaltyTransactions as seedTx, formatKES } from "@/lib/mock-data";
import type { Customer, LoyaltyTransaction } from "@/lib/types";
import { Gift, Users2, TrendingUp, Award } from "lucide-react";
import clsx from "clsx";

const txStyle: Record<string, string> = {
  earn: "bg-good/15 text-good",
  redeem: "bg-bad/15 text-bad",
  referral_bonus: "bg-lilac-tile/15 text-lilac-tile",
  manual_award: "bg-volt/15 text-volt",
  expiry: "bg-ink-dim/20 text-ink-muted",
};

export default function LoyaltyPage() {
  const [customers, setCustomers] = useState<Customer[]>(seedCustomers);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>(seedTx);
  const [awardCustomerId, setAwardCustomerId] = useState(customers[0]?.id ?? "");
  const [awardPoints, setAwardPoints] = useState("100");
  const [awardReason, setAwardReason] = useState("");

  const totalPointsOutstanding = customers.reduce((s, c) => s + c.loyaltyPoints, 0);
  const totalReferrals = customers.reduce((s, c) => s + c.referralCount, 0);
  const referredCustomers = customers.filter((c) => c.referredBy).length;
  const topHolders = [...customers].sort((a, b) => b.loyaltyPoints - a.loyaltyPoints).slice(0, 10);
  const topReferrers = [...customers].filter((c) => c.referralCount > 0).sort((a, b) => b.referralCount - a.referralCount).slice(0, 8);

  function awardManualPoints() {
    const pts = Number(awardPoints);
    if (!awardCustomerId || !pts) return;
    const customer = customers.find((c) => c.id === awardCustomerId);
    if (!customer) return;
    setCustomers((prev) => prev.map((c) => (c.id === awardCustomerId ? { ...c, loyaltyPoints: c.loyaltyPoints + pts } : c)));
    setTransactions((prev) => [
      { id: `LT-manual-${Date.now()}`, customerId: customer.id, customerName: customer.name, type: "manual_award", points: pts, reason: awardReason || "Admin goodwill award", createdAt: new Date().toISOString() },
      ...prev,
    ]);
    setAwardPoints("100");
    setAwardReason("");
  }

  return (
    <div>
      <Topbar title="Loyalty & Referrals" subtitle="Points balances, redemption history, and referral performance." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <div className="card p-4">
          <div className="text-xs text-ink-dim mb-1 flex items-center gap-1.5"><Gift size={13} /> Points outstanding</div>
          <div className="text-xl font-bold tabular">{totalPointsOutstanding.toLocaleString()}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-ink-dim mb-1 flex items-center gap-1.5"><Award size={13} /> Points liability (KES equiv.)</div>
          <div className="text-xl font-bold tabular">{formatKES(totalPointsOutstanding)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-ink-dim mb-1 flex items-center gap-1.5"><Users2 size={13} /> Total referrals</div>
          <div className="text-xl font-bold tabular">{totalReferrals}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-ink-dim mb-1 flex items-center gap-1.5"><TrendingUp size={13} /> Customers from referral</div>
          <div className="text-xl font-bold tabular">{referredCustomers} <span className="text-xs font-normal text-ink-dim">/ {customers.length}</span></div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="card p-5">
          <h3 className="font-semibold text-[15px] mb-4">Top point holders</h3>
          <div className="flex flex-col gap-2.5">
            {topHolders.map((c, i) => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2.5">
                  <span className="w-5 text-ink-dim text-xs tabular">{i + 1}</span>
                  <span className="font-medium">{c.name}</span>
                </div>
                <span className="tabular font-semibold">{c.loyaltyPoints.toLocaleString()} pts</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-[15px] mb-4">Award points manually</h3>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs text-ink-dim mb-1.5 block">Customer</label>
              <select className="input-field w-full" value={awardCustomerId} onChange={(e) => setAwardCustomerId(e.target.value)}>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.loyaltyPoints} pts</option>)}
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
            <button className="btn-primary" onClick={awardManualPoints}><Gift size={15} /> Award points</button>
            <p className="text-xs text-ink-dim">Customers earn 10% of every paid order automatically, and redeem from 1,000 points for a discount.</p>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-[15px] mb-4">Top referrers</h3>
          <div className="flex flex-col gap-2.5">
            {topReferrers.length === 0 && <p className="text-sm text-ink-dim">No referrals recorded yet.</p>}
            {topReferrers.map((c) => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-ink-dim">Code: {c.referralCode}</div>
                </div>
                <span className="pill bg-lilac-tile/15 text-lilac-tile text-xs">{c.referralCount} referred</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card mt-5 overflow-hidden">
        <div className="px-5 py-4 border-b border-base-border">
          <h3 className="font-semibold text-[15px]">Points transaction history</h3>
        </div>
        <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
          <table className="w-full">
            <thead className="border-b border-base-border sticky top-0 bg-base-card">
              <tr>
                <th className="th">Customer</th>
                <th className="th">Type</th>
                <th className="th">Reason</th>
                <th className="th">Points</th>
                <th className="th">Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions.slice(0, 60).map((t) => (
                <tr key={t.id} className="border-b border-base-border/60">
                  <td className="td font-medium">{t.customerName}</td>
                  <td className="td"><span className={clsx("pill text-[11px]", txStyle[t.type])}>{t.type.replace("_", " ")}</span></td>
                  <td className="td text-ink-muted">{t.reason}</td>
                  <td className={clsx("td tabular font-semibold", t.points >= 0 ? "text-good" : "text-bad")}>{t.points >= 0 ? "+" : ""}{t.points}</td>
                  <td className="td text-xs text-ink-dim whitespace-nowrap">{new Date(t.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
