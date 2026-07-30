"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  ShoppingBag, Wrench, Users as UsersIcon, Wallet, ChevronDown, ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { adminApi, formatKES } from "@/lib/api";
import { DashboardData } from "@/lib/types";
import StatusBadge from "@/components/ui/StatusBadge";
import StatCard from "@/components/ui/StatCard";

const DONUT_COLORS = ["#7c5cfc", "#3ecfd0", "#f5a623", "#ff8a5c", "#b794f6", "#f4506b"];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [range, setRange] = useState("This Month");

  useEffect(() => {
    adminApi
      .dashboard()
      .then((d: any) => setData(d))
      .catch((e) => setError(e.message ?? "Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  const revenueChange = useMemo(() => {
    const chart = data?.revenue_chart ?? [];
    if (chart.length < 2) return undefined;
    const prev = chart[chart.length - 2].revenue;
    const curr = chart[chart.length - 1].revenue;
    if (!prev) return undefined;
    return Math.round(((curr - prev) / prev) * 1000) / 10;
  }, [data]);

  const statusDonut = useMemo(() => {
    if (!data?.order_status_breakdown) return [];
    return Object.entries(data.order_status_breakdown)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name: name.replace(/_/g, " "), value }));
  }, [data]);

  if (loading) {
    return <div className="text-ink-muted text-sm py-20 text-center">Loading dashboard…</div>;
  }

  if (error) {
    return (
      <div className="card p-6 text-sm text-bad">
        Couldn't load dashboard data: {error}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-3">
        <FilterSelect label="Auto Date Range" value={range} onChange={setRange} options={["Today", "This Week", "This Month", "This Year"]} />
        <FilterSelect label="Order Status" value="All" options={["All", "Pending", "Confirmed", "Delivered"]} />
        <FilterSelect label="Zone" value="All" options={["All", "Nairobi CBD", "Westlands", "Karen"]} />
        <FilterSelect label="Fulfillment" value="All" options={["All", "Pickup", "Delivery"]} />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Today's Revenue" value={formatKES(data.today.revenue)} icon={Wallet} change={revenueChange} gradient />
        <StatCard label="Today's Orders" value={String(data.today.orders)} icon={ShoppingBag} gradient />
        <StatCard label="New Users Today" value={String(data.today.new_users)} icon={UsersIcon} />
        <StatCard label="Active Repair Queue" value={String(data.active_repair_queue)} icon={Wrench} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h3 className="font-display font-semibold text-ink">Revenue Analytics</h3>
              <p className="text-xs text-ink-muted mt-0.5">Total revenue · {formatKES(data.totals.total_revenue)}</p>
            </div>
            <FilterSelect value={range} onChange={setRange} options={["This Week", "This Month", "This Year"]} compact />
          </div>
          <div className="h-64 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.revenue_chart} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c5cfc" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#7c5cfc" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2547" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "#5b5480", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#5b5480", fontSize: 11 }} axisLine={false} tickLine={false} width={60} />
                <Tooltip
                  contentStyle={{ background: "#161329", border: "1px solid #2a2547", borderRadius: 12, fontSize: 12 }}
                  labelStyle={{ color: "#9d97c2" }}
                  formatter={(v: number) => [formatKES(v), "Revenue"]}
                />
                <Area type="monotone" dataKey="revenue" stroke="#7c5cfc" strokeWidth={2.5} fill="url(#revFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-display font-semibold text-ink">Order Status</h3>
            <Link href="/orders" className="text-xs text-volt font-medium flex items-center gap-1 hover:underline">
              View details <ArrowRight size={12} />
            </Link>
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDonut}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={45}
                  outerRadius={68}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {statusDonut.map((_, i) => (
                    <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#161329", border: "1px solid #2a2547", borderRadius: 12, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-1">
            {statusDonut.map((s, i) => (
              <div key={s.name} className="flex items-center gap-1.5 text-xs text-ink-muted capitalize">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                {s.name} · {s.value}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Low stock + recent orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold text-ink">Low Stock Alerts</h3>
            <Link href="/products" className="text-xs text-volt font-medium hover:underline">Manage</Link>
          </div>
          <div className="space-y-4">
            {data.low_stock_alerts.length === 0 && (
              <p className="text-sm text-ink-dim py-6 text-center">All products are well stocked.</p>
            )}
            {data.low_stock_alerts.map((p) => {
              const pct = Math.min(100, Math.round((p.stock / Math.max(p.threshold, 1)) * 100));
              return (
                <div key={p.id}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-ink truncate pr-2">{p.title}</span>
                    <span className="text-bad text-xs font-medium tabular shrink-0">{p.stock} left</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-base-hover overflow-hidden">
                    <div className="h-full bg-bad rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-semibold text-ink">Recent Orders</h3>
            <Link href="/orders" className="text-xs text-volt font-medium hover:underline">View all</Link>
          </div>
          <div className="overflow-x-auto -mx-5">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">Customer</th>
                  <th className="th">Total</th>
                  <th className="th">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_orders.map((o) => (
                  <tr key={o.id}>
                    <td className="td">{o.full_name}</td>
                    <td className="td tabular">{formatKES(o.total_amount)}</td>
                    <td className="td"><StatusBadge status={o.status} /></td>
                  </tr>
                ))}
                {data.recent_orders.length === 0 && (
                  <tr><td className="td text-ink-dim" colSpan={3}>No recent orders.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent bookings */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-semibold text-ink">Recent Repair Bookings</h3>
          <Link href="/repairs" className="text-xs text-volt font-medium hover:underline">View all</Link>
        </div>
        <div className="overflow-x-auto -mx-5">
          <table className="w-full">
            <thead>
              <tr>
                <th className="th">Customer</th>
                <th className="th">Device</th>
                <th className="th">Fulfillment</th>
                <th className="th">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.recent_bookings.map((b) => (
                <tr key={b.id}>
                  <td className="td">{b.full_name}</td>
                  <td className="td">{b.device_type} · {b.device_model}</td>
                  <td className="td capitalize">{b.fulfillment_type}</td>
                  <td className="td"><StatusBadge status={b.status} /></td>
                </tr>
              ))}
              {data.recent_bookings.length === 0 && (
                <tr><td className="td text-ink-dim" colSpan={4}>No recent bookings.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({
  label, value, onChange, options, compact = false,
}: {
  label?: string; value: string; onChange?: (v: string) => void; options: string[]; compact?: boolean;
}) {
  return (
    <div className="relative">
      {label && <label className="block text-[11px] text-ink-dim mb-1">{label}</label>}
      <div className="relative">
        <select
          className={clsxSelect(compact)}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
        >
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-dim pointer-events-none" />
      </div>
    </div>
  );
}

function clsxSelect(compact: boolean) {
  return `select-field pr-8 ${compact ? "text-xs py-1.5 !w-auto" : "min-w-[150px]"}`;
}
