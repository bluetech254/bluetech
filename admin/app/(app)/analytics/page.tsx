"use client";

import { useState, useEffect } from "react";
import Topbar from "@/components/layout/Topbar";
import { adminApi } from "@/lib/api";
import { formatKES } from "@/lib/mock-data";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";

const PIE_COLORS = ["#2F6BFF", "#D3F26A"];

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    adminApi.dashboard().then(setData).catch(console.error);
  }, []);

  const totals = data?.totals ?? {};
  const today = data?.today ?? {};
  const orderStatusMap: Record<string, number> = data?.order_status_breakdown ?? {};

  const trend = (data?.revenue_chart ?? []).map((d: any) => ({
    label: new Date(d.date).toLocaleDateString("en-KE", { month: "short", day: "numeric" }),
    revenue: d.revenue,
  }));

  const revenueSplit = [
    { name: "Products", value: totals.order_revenue ?? 0 },
    { name: "Repairs", value: totals.booking_revenue ?? 0 },
  ];

  const orderStatusData = Object.entries(orderStatusMap).map(([status, count]) => ({ status, count }));

  const avgOrderValue = totals.orders ? (totals.order_revenue ?? 0) / totals.orders : 0;
  const conversionRate = totals.orders
    ? (((totals.orders ?? 0) - (orderStatusMap.cancelled ?? 0)) / totals.orders) * 100
    : 0;

  return (
    <div>
      <Topbar title="Analytics" subtitle="Deep metrics across sales, repairs, and delivery zones." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <div className="card p-4"><div className="text-xs text-ink-dim mb-1">Avg. order value</div><div className="text-xl font-bold tabular">{formatKES(avgOrderValue)}</div></div>
        <div className="card p-4"><div className="text-xs text-ink-dim mb-1">Order completion rate</div><div className="text-xl font-bold tabular">{conversionRate.toFixed(1)}%</div></div>
        <div className="card p-4"><div className="text-xs text-ink-dim mb-1">All-time revenue</div><div className="text-xl font-bold tabular">{formatKES(totals.total_revenue ?? 0)}</div></div>
        <div className="card p-4"><div className="text-xs text-ink-dim mb-1">New users today</div><div className="text-xl font-bold tabular">{today.new_users ?? 0}</div></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
        <div className="xl:col-span-2 card p-5">
          <h3 className="font-semibold text-[15px] mb-4">Revenue — last 30 days</h3>
          <div className="h-64">
            {!data && <p className="text-ink-dim text-sm">Loading…</p>}
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#26252F" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "#5F5D69", fontSize: 11 }} axisLine={false} tickLine={false} interval={4} />
                <YAxis tick={{ fill: "#5F5D69", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip contentStyle={{ background: "#1A1922", border: "1px solid #26252F", borderRadius: 12, fontSize: 12 }} formatter={(v) => [formatKES(Number(v)), "Revenue"]} />
                <Bar dataKey="revenue" fill="#2F6BFF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-[15px] mb-4">Revenue split</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={revenueSplit} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={3}>
                  {revenueSplit.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} stroke="none" />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#1A1922", border: "1px solid #26252F", borderRadius: 12, fontSize: 12 }} formatter={(v) => formatKES(Number(v))} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold text-[15px] mb-4">Order status breakdown</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={orderStatusData} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#26252F" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#5F5D69", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="status" type="category" tick={{ fill: "#96939F", fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
              <Tooltip contentStyle={{ background: "#1A1922", border: "1px solid #26252F", borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="count" fill="#B9A6FF" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
