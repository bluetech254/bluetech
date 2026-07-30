"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from "recharts";
import { adminApi, formatKES } from "@/lib/api";
import { DashboardData } from "@/lib/types";
import StatCard from "@/components/ui/StatCard";
import { ShoppingBag, Wrench, Users as UsersIcon, Wallet } from "lucide-react";

export default function AnalyticsPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.dashboard().then((d: any) => setData(d)).finally(() => setLoading(false));
  }, []);

  const statusBars = useMemo(() => {
    if (!data?.order_status_breakdown) return [];
    return Object.entries(data.order_status_breakdown).map(([status, count]) => ({ status: status.replace(/_/g, " "), count }));
  }, [data]);

  if (loading) return <div className="text-ink-muted text-sm py-20 text-center">Loading analytics…</div>;
  if (!data) return null;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Orders" value={String(data.totals.orders)} icon={ShoppingBag} />
        <StatCard label="Total Bookings" value={String(data.totals.bookings)} icon={Wrench} />
        <StatCard label="Total Users" value={String(data.totals.users)} icon={UsersIcon} />
        <StatCard label="Total Revenue" value={formatKES(data.totals.total_revenue)} icon={Wallet} gradient />
      </div>

      <div className="card p-5">
        <h3 className="font-display font-semibold text-ink mb-3">Revenue (last 30 days)</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.revenue_chart} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="revFill2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7c5cfc" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#7c5cfc" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2547" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "#5b5480", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#5b5480", fontSize: 11 }} axisLine={false} tickLine={false} width={60} />
              <Tooltip
                contentStyle={{ background: "#161329", border: "1px solid #2a2547", borderRadius: 12, fontSize: 12 }}
                formatter={(v: number) => [formatKES(v), "Revenue"]}
              />
              <Area type="monotone" dataKey="revenue" stroke="#7c5cfc" strokeWidth={2.5} fill="url(#revFill2)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-display font-semibold text-ink mb-3">Order Status Breakdown</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={statusBars} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2547" vertical={false} />
              <XAxis dataKey="status" tick={{ fill: "#5b5480", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#5b5480", fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={{ background: "#161329", border: "1px solid #2a2547", borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="count" fill="#7c5cfc" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
