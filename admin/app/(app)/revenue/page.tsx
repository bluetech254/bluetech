"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Wallet, ShoppingBag, Wrench, TrendingUp, Download,
} from "lucide-react";
import { adminApi, formatKES } from "@/lib/api";
import { DashboardData, Order, Booking } from "@/lib/types";
import StatCard from "@/components/ui/StatCard";

const COLORS = ["#1a3fd4", "#00d4d4", "#f5a623", "#f4506b"];

function pct(a: number, b: number) {
  if (!b) return 0;
  return Math.round(((a - b) / b) * 1000) / 10;
}

export default function RevenuePage() {
  const [dash, setDash] = useState<DashboardData | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      adminApi.dashboard(),
      adminApi.getOrders() as Promise<{ data: Order[] }>,
      adminApi.getBookings() as Promise<{ data: Booking[] }>,
    ]).then(([d, o, b]) => {
      if (d.status === "fulfilled") setDash(d.value as DashboardData);
      if (o.status === "fulfilled") setOrders((o.value as any).data ?? []);
      if (b.status === "fulfilled") setBookings((b.value as any).data ?? []);
    }).finally(() => setLoading(false));
  }, []);

  // Revenue by payment method
  const byPayment = useMemo(() => {
    const map: Record<string, number> = {};
    for (const o of orders) {
      const m = o.payment_method || "unknown";
      map[m] = (map[m] ?? 0) + (Number(o.total_amount) || 0);
    }
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [orders]);

  // Revenue by day from chart
  const chartData = dash?.revenue_chart ?? [];

  const topProducts = useMemo(() => {
    // Deduplicate orders by ID (orders list is the authoritative source with items)
    const seen = new Set<string>();
    const allOrders = [...orders, ...(dash?.recent_orders ?? [])].filter((o) => {
      if (seen.has(o.id)) return false;
      seen.add(o.id);
      return true;
    });
    const map: Record<string, { title: string; revenue: number; units: number }> = {};
    for (const o of allOrders) {
      for (const item of (o as any).order_items ?? []) {
        // Supabase returns: product_title, unit_price, total_price, quantity
        const title = item.product_title || item.title || "Unknown";
        const revenue = Number(item.total_price) || (Number(item.unit_price) * Number(item.quantity)) || 0;
        const qty = Number(item.quantity) || 0;
        if (!revenue) continue;
        if (!map[title]) map[title] = { title, revenue: 0, units: 0 };
        map[title].revenue += revenue;
        map[title].units += qty;
      }
    }
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  }, [orders, dash]);

  // Booking revenue by status
  const bookingRevenue = useMemo(() => {
    const completed = bookings.filter((b) => b.final_cost).reduce((s, b) => s + (Number(b.final_cost) || 0), 0);
    const estimated = bookings.filter((b) => !b.final_cost && b.estimated_cost).reduce((s, b) => s + (Number(b.estimated_cost) || 0), 0);
    return { completed, estimated };
  }, [bookings]);

  // Daily revenue split: orders vs bookings
  const splitChart = useMemo(() => {
    const map: Record<string, { date: string; orders: number; bookings: number }> = {};
    for (const o of orders) {
      const d = o.created_at.slice(0, 10);
      if (!map[d]) map[d] = { date: d, orders: 0, bookings: 0 };
      map[d].orders += Number(o.total_amount) || 0;
    }
    for (const b of bookings) {
      const d = b.created_at.slice(0, 10);
      if (!map[d]) map[d] = { date: d, orders: 0, bookings: 0 };
      map[d].bookings += Number(b.final_cost) || Number(b.estimated_cost) || 0;
    }
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date)).slice(-30);
  }, [orders, bookings]);

  const revenueChange = useMemo(() => {
    if (chartData.length < 2) return 0;
    return pct(chartData[chartData.length - 1].revenue, chartData[chartData.length - 2].revenue);
  }, [chartData]);

  const totalOrderRevenue = dash?.totals.order_revenue ?? 0;
  const totalBookingRevenue = dash?.totals.booking_revenue ?? 0;
  const totalRevenue = dash?.totals.total_revenue ?? 0;
  const todayRevenue = dash?.today.revenue ?? 0;

  const tooltipStyle = {
    contentStyle: { background: "#0e1225", border: "1px solid #232b4a", borderRadius: 12, fontSize: 12 },
  };

  if (loading) return <div className="text-ink-muted text-sm py-20 text-center">Loading revenue data…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display font-semibold text-lg text-ink">Revenue</h2>
          <p className="text-sm text-ink-muted mt-0.5">Full revenue overview across orders and repair bookings</p>
        </div>
        <a href={adminApi.exportOrdersUrl({})} className="btn-ghost text-sm">
          <Download size={14} /> Export orders CSV
        </a>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Revenue" value={formatKES(totalRevenue)} icon={Wallet} gradient />
        <StatCard label="Order Revenue" value={formatKES(totalOrderRevenue)} icon={ShoppingBag} />
        <StatCard label="Repair Revenue" value={formatKES(totalBookingRevenue)} icon={Wrench} />
        <StatCard label="Today's Revenue" value={formatKES(todayRevenue)} icon={TrendingUp} change={revenueChange} />
      </div>

      {/* Revenue trend */}
      <div className="card p-5">
        <h3 className="font-display font-semibold text-ink mb-4">Revenue Trend (last 30 days)</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1a3fd4" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#1a3fd4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#232b4a" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "#4e5880", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#4e5880", fontSize: 11 }} axisLine={false} tickLine={false} width={70}
                tickFormatter={(v) => `KES ${(v / 1000).toFixed(0)}k`} />
              <Tooltip {...tooltipStyle} formatter={(v: number) => [formatKES(v), "Revenue"]} />
              <Area type="monotone" dataKey="revenue" stroke="#1a3fd4" strokeWidth={2.5} fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Orders vs Bookings split */}
      <div className="card p-5">
        <h3 className="font-display font-semibold text-ink mb-4">Orders vs Repair Revenue (daily)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={splitChart} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#232b4a" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "#4e5880", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#4e5880", fontSize: 11 }} axisLine={false} tickLine={false} width={70}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip {...tooltipStyle} formatter={(v: number) => formatKES(v)} />
              <Legend wrapperStyle={{ fontSize: 12, color: "#8a96c0" }} />
              <Bar dataKey="orders" name="Orders" fill="#1a3fd4" radius={[4, 4, 0, 0]} />
              <Bar dataKey="bookings" name="Repairs" fill="#00d4d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Payment method breakdown */}
        <div className="card p-5">
          <h3 className="font-display font-semibold text-ink mb-4">Revenue by Payment Method</h3>
          {byPayment.length === 0
            ? <p className="text-sm text-ink-dim">No data</p>
            : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={byPayment} dataKey="value" nameKey="name" cx="50%" cy="50%"
                      innerRadius={55} outerRadius={85} paddingAngle={3}>
                      {byPayment.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip {...tooltipStyle} formatter={(v: number) => formatKES(v)} />
                    <Legend wrapperStyle={{ fontSize: 12, color: "#8a96c0" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
        </div>

        {/* Repair revenue summary */}
        <div className="card p-5 space-y-4">
          <h3 className="font-display font-semibold text-ink">Repair Revenue Breakdown</h3>
          <div className="space-y-3">
            {[
              { label: "Confirmed (final cost)", value: bookingRevenue.completed, color: "bg-good" },
              { label: "Estimated (in progress)", value: bookingRevenue.estimated, color: "bg-warn" },
              { label: "Total bookings", value: bookings.length, isCount: true },
              { label: "Completed bookings", value: bookings.filter((b) => b.status === "completed").length, isCount: true },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between py-2 border-b border-base-border/50 last:border-0">
                <div className="flex items-center gap-2">
                  {row.color && <span className={`w-2 h-2 rounded-full ${row.color}`} />}
                  <span className="text-sm text-ink-muted">{row.label}</span>
                </div>
                <span className="text-sm font-semibold text-ink tabular-nums">
                  {row.isCount ? row.value : formatKES(row.value as number)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top products by revenue */}
      <div className="card overflow-x-auto">
        <div className="px-5 py-4 border-b border-base-border">
          <h3 className="font-display font-semibold text-ink">Top Products by Revenue</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">#</th>
              <th className="th">Product</th>
              <th className="th">Units Sold</th>
              <th className="th">Revenue</th>
              <th className="th">Share</th>
            </tr>
          </thead>
          <tbody>
            {topProducts.length === 0 && (
              <tr><td className="td text-ink-dim" colSpan={5}>No order data available.</td></tr>
            )}
            {topProducts.map((p, i) => {
              const share = totalOrderRevenue ? Math.round((p.revenue / totalOrderRevenue) * 100) : 0;
              return (
                <tr key={p.title} className="hover:bg-base-hover/40">
                  <td className="td text-ink-dim">{i + 1}</td>
                  <td className="td font-medium text-ink">{p.title}</td>
                  <td className="td tabular-nums">{p.units}</td>
                  <td className="td tabular-nums">{formatKES(p.revenue)}</td>
                  <td className="td">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-base-hover rounded-full overflow-hidden max-w-[80px]">
                        <div className="h-full bg-volt rounded-full" style={{ width: `${share}%` }} />
                      </div>
                      <span className="text-xs text-ink-dim tabular-nums">{share}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
