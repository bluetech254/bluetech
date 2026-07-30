"use client";

import Topbar from "@/components/layout/Topbar";
import {
  last30DaysRevenue, topProducts, totalRevenueAllTime, formatKES,
  orders, bookings, zones, orderTotal,
} from "@/lib/mock-data";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";

const PIE_COLORS = ["#2F6BFF", "#D3F26A"];
const ZONE_COLORS = ["#2F6BFF", "#B9A6FF", "#D3F26A", "#FDB44B", "#FF8C7A", "#3ECF8E", "#5F5D69", "#FF6B6B"];

export default function AnalyticsPage() {
  const trend = last30DaysRevenue();
  const products = topProducts(8);
  const allTime = totalRevenueAllTime();
  const revenueSplit = [
    { name: "Products", value: allTime.productRev },
    { name: "Repairs", value: allTime.repairRev },
  ];

  const ordersPerDay = trend.map((d) => ({ label: d.label, orders: d.orders }));

  const zonePerf = zones.map((z) => ({
    name: z.name,
    revenue: orders.filter((o) => o.zoneId === z.id && o.paymentStatus === "paid").reduce((s, o) => s + orderTotal(o), 0),
    orders: z.ordersFulfilled,
  })).sort((a, b) => b.revenue - a.revenue);

  const avgOrderValue = orders.length ? orders.reduce((s, o) => s + orderTotal(o), 0) / orders.length : 0;
  const avgRepairValue = (() => {
    const done = bookings.filter((b) => b.finalCost);
    return done.length ? done.reduce((s, b) => s + (b.finalCost ?? 0), 0) / done.length : 0;
  })();
  const conversionRate = orders.length ? (orders.filter((o) => o.status !== "cancelled").length / orders.length) * 100 : 0;

  return (
    <div>
      <Topbar title="Analytics" subtitle="Deep metrics across sales, repairs, and delivery zones." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <div className="card p-4">
          <div className="text-xs text-ink-dim mb-1">Avg. order value</div>
          <div className="text-xl font-bold tabular">{formatKES(avgOrderValue)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-ink-dim mb-1">Avg. repair ticket</div>
          <div className="text-xl font-bold tabular">{formatKES(avgRepairValue)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-ink-dim mb-1">Order completion rate</div>
          <div className="text-xl font-bold tabular">{conversionRate.toFixed(1)}%</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-ink-dim mb-1">All-time revenue</div>
          <div className="text-xl font-bold tabular">{formatKES(allTime.total)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
        <div className="xl:col-span-2 card p-5">
          <h3 className="font-semibold text-[15px] mb-4">Orders placed per day — last 30 days</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ordersPerDay} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#26252F" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "#5F5D69", fontSize: 11 }} axisLine={false} tickLine={false} interval={4} />
                <YAxis tick={{ fill: "#5F5D69", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#1A1922", border: "1px solid #26252F", borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="orders" fill="#2F6BFF" radius={[4, 4, 0, 0]} />
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

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="card p-5">
          <h3 className="font-semibold text-[15px] mb-4">Top products by revenue</h3>
          <div className="flex flex-col gap-3">
            {products.map((p, i) => {
              const revenue = p.unitsSold * p.price;
              const max = products[0].unitsSold * products[0].price;
              return (
                <div key={p.id}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-ink truncate max-w-[65%]">{i + 1}. {p.title}</span>
                    <span className="tabular text-ink-muted">{formatKES(revenue)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-base-hover overflow-hidden">
                    <div className="h-full bg-lime-tile rounded-full" style={{ width: `${(revenue / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-[15px] mb-4">Revenue by delivery zone</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={zonePerf} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#26252F" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#5F5D69", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <YAxis dataKey="name" type="category" tick={{ fill: "#96939F", fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                <Tooltip contentStyle={{ background: "#1A1922", border: "1px solid #26252F", borderRadius: 12, fontSize: 12 }} formatter={(v) => formatKES(Number(v))} />
                <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                  {zonePerf.map((_, i) => <Cell key={i} fill={ZONE_COLORS[i % ZONE_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
