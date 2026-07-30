"use client";

import { useState, useEffect } from "react";
import Topbar from "@/components/layout/Topbar";
import StatTile from "@/components/ui/StatTile";
import StatusBadge from "@/components/ui/StatusBadge";
import { adminApi } from "@/lib/api";
import { formatKES } from "@/lib/mock-data";
import { ShoppingBag, Wrench, Wallet, Layers, ArrowUpRight, AlertTriangle } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import Link from "next/link";

export default function DashboardPage() {
  const [firstName, setFirstName] = useState("Admin");
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    try {
      const raw = document.cookie.split("; ").find((c) => c.startsWith("admin_session="))?.split("=").slice(1).join("=");
      if (raw) {
        const s = JSON.parse(decodeURIComponent(raw));
        const name = s.full_name?.split(" ")[0] ?? s.username;
        if (name) setFirstName(name);
      }
    } catch { /* keep default */ }

    adminApi.dashboard().then(setData).catch(console.error);
  }, []);

  const today = data?.today ?? {};
  const totals = data?.totals ?? {};
  const orderStatusMap: Record<string, number> = data?.order_status_breakdown ?? {};
  const lowStock: any[] = data?.low_stock_alerts ?? [];
  const trend = (data?.revenue_chart ?? []).map((d: any) => ({
    label: new Date(d.date).toLocaleDateString("en-KE", { month: "short", day: "numeric" }),
    productRevenue: d.revenue,
    repairRevenue: 0,
  }));
  const recentOrders: any[] = data?.recent_orders ?? [];
  const recentBookings: any[] = data?.recent_bookings ?? [];
  const feed = [
    ...recentOrders.map((o: any) => ({ kind: "order" as const, id: o.id, name: o.full_name, status: o.status, amount: o.total_amount, createdAt: o.created_at })),
    ...recentBookings.map((b: any) => ({ kind: "booking" as const, id: b.id, name: b.full_name, status: b.status, amount: b.final_cost ?? b.estimated_cost ?? 0, createdAt: b.created_at })),
  ].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, 8);

  const maxOrderStatus = Math.max(1, ...Object.values(orderStatusMap));

  return (
    <div>
      <Topbar title={`Hello, ${firstName} 👋`} subtitle="Here's how BlueTech Kenya is performing today." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatTile tone="amber" icon={ShoppingBag} label="Orders today" value={String(today.orders ?? 0)} sub={`${orderStatusMap.pending ?? 0} pending overall`} />
        <StatTile tone="lilac" icon={Wrench} label="Repair bookings today" value={String(today.bookings ?? 0)} sub={`${data?.active_repair_queue ?? 0} currently active`} />
        <StatTile tone="lime" icon={Wallet} label="Revenue today" value={formatKES(today.revenue ?? 0)} sub="Paid orders + completed repairs" />
        <StatTile tone="coral" icon={Layers} label="Active queue" value={String(data?.active_repair_queue ?? 0)} sub="Open repair jobs" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h3 className="font-semibold text-[15px]">Revenue Trend — Last 30 Days</h3>
              <p className="text-xs text-ink-dim mt-0.5">Paid orders revenue</p>
            </div>
          </div>
          <div className="h-72 -ml-3 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="productGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2F6BFF" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#2F6BFF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#26252F" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "#5F5D69", fontSize: 11 }} axisLine={false} tickLine={false} interval={4} />
                <YAxis tick={{ fill: "#5F5D69", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} width={40} />
                <Tooltip contentStyle={{ background: "#1A1922", border: "1px solid #26252F", borderRadius: 12, fontSize: 12 }} labelStyle={{ color: "#F3F2F7" }} formatter={(v) => [formatKES(Number(v)), "Revenue"]} />
                <Area type="monotone" dataKey="productRevenue" stroke="#2F6BFF" fill="url(#productGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-2 pt-4 border-t border-base-border">
            <div><div className="text-xs text-ink-dim">All-time revenue</div><div className="font-semibold tabular mt-0.5">{formatKES(totals.total_revenue ?? 0)}</div></div>
            <div><div className="text-xs text-ink-dim">From products</div><div className="font-semibold tabular mt-0.5">{formatKES(totals.order_revenue ?? 0)}</div></div>
            <div><div className="text-xs text-ink-dim">From repairs</div><div className="font-semibold tabular mt-0.5">{formatKES(totals.booking_revenue ?? 0)}</div></div>
          </div>
        </div>

        <div className="card p-5 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-[15px]">Recent activity</h3>
            <Link href="/orders" className="text-xs text-volt font-medium flex items-center gap-1 hover:underline">View all <ArrowUpRight size={12} /></Link>
          </div>
          <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[520px] pr-1">
            {!data && <p className="text-sm text-ink-dim">Loading…</p>}
            {feed.map((item) => (
              <div key={item.kind + item.id} className="rounded-xl border border-base-border p-3.5 hover:bg-base-hover transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-semibold">{item.name}</span>
                  <span className="text-xs text-ink-dim tabular">{item.id?.slice(0, 8)}</span>
                </div>
                <div className="pill bg-volt/10 text-volt mb-2 text-[11px]">{item.kind === "order" ? "Online order" : "Repair booking"}</div>
                <div className="flex items-center justify-between">
                  <StatusBadge status={item.status} />
                  <span className="text-sm font-semibold tabular">{formatKES(item.amount)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-5">
        <div className="card p-5">
          <h3 className="font-semibold text-[15px] mb-4">Order pipeline</h3>
          <div className="flex flex-col gap-3">
            {Object.entries(orderStatusMap).map(([status, count]) => (
              <div key={status}>
                <div className="flex items-center justify-between text-xs mb-1"><StatusBadge status={status} /><span className="text-ink-muted tabular">{count}</span></div>
                <div className="h-1.5 rounded-full bg-base-hover overflow-hidden"><div className="h-full bg-volt rounded-full" style={{ width: `${(count / maxOrderStatus) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5 col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[15px] flex items-center gap-2"><AlertTriangle size={15} className="text-warn" /> Stock alerts</h3>
            <Link href="/products" className="text-xs text-volt font-medium hover:underline">Manage</Link>
          </div>
          {lowStock.length === 0 ? (
            <p className="text-sm text-ink-muted">{data ? "All stock levels look healthy." : "Loading…"}</p>
          ) : (
            <div className="flex flex-col gap-2.5 max-h-[220px] overflow-y-auto pr-1">
              {lowStock.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <div className="min-w-0"><div className="truncate font-medium">{p.title}</div></div>
                  <span className={`pill ${p.stock === 0 ? "bg-bad/15 text-bad" : "bg-warn/15 text-warn"} shrink-0`}>{p.stock === 0 ? "Out of stock" : `${p.stock} left`}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-[15px] mb-4">Totals</h3>
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between"><span className="text-ink-muted">Total orders</span><span className="tabular font-semibold">{totals.orders ?? 0}</span></div>
            <div className="flex justify-between"><span className="text-ink-muted">Total bookings</span><span className="tabular font-semibold">{totals.bookings ?? 0}</span></div>
            <div className="flex justify-between"><span className="text-ink-muted">Total products</span><span className="tabular font-semibold">{totals.products ?? 0}</span></div>
            <div className="flex justify-between"><span className="text-ink-muted">Total users</span><span className="tabular font-semibold">{totals.users ?? 0}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
