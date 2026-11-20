"use client";

import { useEffect, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar,
} from "recharts";
import {
  Globe, Smartphone, Monitor, Tablet, RefreshCw,
  MousePointerClick, TrendingUp, Eye, Layers, ShoppingCart, CreditCard, CheckCircle2,
} from "lucide-react";
import { adminApi } from "@/lib/api";

const REFERRER_COLORS: Record<string, string> = {
  direct:    "bg-slate-400",
  google:    "bg-blue-500",
  instagram: "bg-pink-500",
  facebook:  "bg-blue-700",
  tiktok:    "bg-slate-900 dark:bg-white",
  whatsapp:  "bg-green-500",
  youtube:   "bg-red-500",
  other:     "bg-violet-400",
};

function StatCard({ label, value, icon: Icon, sub }: any) {
  return (
    <div className="card p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-ink-muted font-medium">{label}</span>
        <Icon size={15} className="text-ink-dim" />
      </div>
      <span className="text-2xl font-black text-ink tabular-nums">{value}</span>
      {sub && <span className="text-xs text-ink-dim">{sub}</span>}
    </div>
  );
}

const POLL_SECONDS = 60;

export default function TrafficTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [linkClicks, setLinkClicks] = useState<any[]>([]);
  const [countdown, setCountdown] = useState(POLL_SECONDS);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  async function load(silent = false) {
    if (!silent) setLoading(true);
    try {
      const [visitor, clicks] = await Promise.allSettled([
        adminApi.getVisitorSummary(),
        adminApi.getLinkClicksToday(),
      ]);
      if (visitor.status === "fulfilled") setData(visitor.value);
      if (clicks.status  === "fulfilled") setLinkClicks((clicks.value as any)?.data ?? []);
      setLastUpdated(new Date());
      setCountdown(POLL_SECONDS);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  // Initial load
  useEffect(() => { load(); }, []);

  // 1-minute auto-refresh
  useEffect(() => {
    const tick = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          load(true);   // silent — no spinner, data updates in place
          return POLL_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  const totalLinkClicks = linkClicks.reduce((s: number, c: any) => s + (c.clicks ?? 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw size={20} className="animate-spin text-ink-dim" />
      </div>
    );
  }

  const hourly: any[] = data?.hourly_sessions ?? [];
  const topPages: any[] = data?.top_pages ?? [];
  const referrers: Record<string, number> = data?.referrer_breakdown ?? {};
  const devices: Record<string, number> = data?.device_breakdown ?? {};
  const totalReferrers = Object.values(referrers).reduce((a, b) => a + b, 0);
  const funnel = data?.funnel ?? { visitors: 0, cart_adds: 0, cart_sessions: 0, checkouts_started: 0, checkouts_completed: 0, conversion_rate: 0 };
  const topCartProducts: any[] = data?.top_cart_products ?? [];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-xs text-ink-muted">Website traffic · today</p>
          {lastUpdated && (
            <span className="text-xs text-ink-dim">
              Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-dim tabular-nums">
            Refreshing in {countdown}s
          </span>
          <button onClick={() => load()} className="btn-ghost px-2.5 py-1.5 text-xs flex items-center gap-1">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh now
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Unique Visitors"
          value={data?.unique_sessions ?? 0}
          icon={Globe}
          sub="browser sessions today"
        />
        <StatCard
          label="Page Views"
          value={data?.total_page_views ?? 0}
          icon={Eye}
          sub={`avg ${data?.avg_pages_per_session ?? 0} pages/visit`}
        />
        <StatCard
          label="Social Clicks"
          value={totalLinkClicks}
          icon={MousePointerClick}
          sub="footer link clicks today"
        />
        <StatCard
          label="Top Page"
          value={topPages[0]?.path ?? "—"}
          icon={TrendingUp}
          sub={topPages[0] ? `${topPages[0].views} views` : "no data yet"}
        />
      </div>

      {/* Purchase funnel */}
      <div className="card p-5">
        <h3 className="font-semibold text-sm text-ink mb-4">Purchase funnel · today</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Visitors",           value: funnel.visitors,             icon: Globe,          color: "text-sky-400" },
            { label: "Added to cart",       value: funnel.cart_sessions,        icon: ShoppingCart,   color: "text-amber-400" },
            { label: "Checkout started",    value: funnel.checkouts_started,    icon: CreditCard,     color: "text-violet-400" },
            { label: "Orders placed",       value: funnel.checkouts_completed,  icon: CheckCircle2,   color: "text-volt" },
          ].map(({ label, value, icon: Icon, color }, i, arr) => {
            const prev = i === 0 ? null : arr[i - 1].value;
            const dropPct = prev != null && prev > 0 ? Math.round(((prev - value) / prev) * 100) : null;
            return (
              <div key={label} className="relative bg-base-hover rounded-xl p-3 flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <Icon size={13} className={color} />
                  <span className="text-xs text-ink-muted">{label}</span>
                </div>
                <span className={`text-2xl font-black tabular-nums ${color}`}>{value}</span>
                {dropPct !== null && (
                  <span className="text-xs text-ink-dim">
                    {dropPct > 0 ? `↓ ${dropPct}% drop` : "→ all converted"}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-ink-muted">
          <span>Conversion rate:</span>
          <span className="font-bold text-volt tabular-nums">{funnel.conversion_rate.toFixed(1)}%</span>
          <span className="text-ink-dim">(orders / visitors)</span>
        </div>
        {topCartProducts.length > 0 && (
          <div className="mt-4 border-t border-base-border pt-4">
            <p className="text-xs font-medium text-ink-muted mb-2">Most added to cart</p>
            <div className="space-y-1.5">
              {topCartProducts.map((p: any) => (
                <div key={p.title} className="flex items-center gap-2 text-sm">
                  <ShoppingCart size={12} className="text-ink-dim shrink-0" />
                  <span className="text-ink flex-1 truncate">{p.title}</span>
                  <span className="text-ink-dim tabular-nums text-xs">{p.adds}×</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Hourly chart */}
      <div className="card p-5">
        <h3 className="font-display font-semibold text-ink mb-4">Visitors by hour</h3>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={hourly} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="visitorGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7c5cfc" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#7c5cfc" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2547" vertical={false} />
              <XAxis
                dataKey="hour"
                tick={{ fill: "#5b5480", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(h) => `${h}:00`}
                interval={2}
              />
              <YAxis
                tick={{ fill: "#5b5480", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{ background: "#161329", border: "1px solid #2a2547", borderRadius: 10, fontSize: 12 }}
                formatter={(v: number) => [v, "sessions"]}
                labelFormatter={(h) => `${h}:00`}
              />
              <Area
                type="monotone"
                dataKey="sessions"
                stroke="#7c5cfc"
                strokeWidth={2}
                fill="url(#visitorGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top pages */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-base-border flex items-center gap-2">
            <Layers size={14} className="text-ink-dim" />
            <h3 className="font-semibold text-sm text-ink">Top pages today</h3>
          </div>
          {topPages.length === 0 ? (
            <p className="px-4 py-6 text-xs text-ink-dim">No page views recorded yet.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {topPages.map((p: any, i: number) => {
                  const maxViews = topPages[0]?.views ?? 1;
                  const pct = Math.round((p.views / maxViews) * 100);
                  return (
                    <tr key={p.path} className="border-b border-base-border/50 last:border-0">
                      <td className="px-4 py-2.5 text-ink-dim text-xs w-6">{i + 1}</td>
                      <td className="px-2 py-2.5 font-mono text-xs text-ink">{p.path}</td>
                      <td className="px-4 py-2.5 w-32">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-base-hover rounded-full overflow-hidden">
                            <div className="h-full bg-volt rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs tabular-nums text-ink-dim w-8 text-right">{p.views}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Referrers */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-base-border flex items-center gap-2">
            <Globe size={14} className="text-ink-dim" />
            <h3 className="font-semibold text-sm text-ink">Traffic sources</h3>
          </div>
          {Object.keys(referrers).length === 0 ? (
            <p className="px-4 py-6 text-xs text-ink-dim">No referrer data yet.</p>
          ) : (
            <div className="p-4 space-y-3">
              {Object.entries(referrers).map(([source, count]) => {
                const pct = totalReferrers ? Math.round((count / totalReferrers) * 100) : 0;
                const dot = REFERRER_COLORS[source] ?? "bg-ink-dim";
                return (
                  <div key={source} className="flex items-center gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dot}`} />
                    <span className="text-sm text-ink capitalize flex-1">{source}</span>
                    <div className="flex items-center gap-2 w-28">
                      <div className="flex-1 h-1.5 bg-base-hover rounded-full overflow-hidden">
                        <div className="h-full bg-volt rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs tabular-nums text-ink-dim w-6 text-right">{pct}%</span>
                    </div>
                    <span className="text-xs tabular-nums text-ink-dim w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Device breakdown */}
      <div className="card p-4">
        <h3 className="font-semibold text-sm text-ink mb-3">Devices</h3>
        <div className="flex gap-6">
          {[
            { key: "mobile",  icon: Smartphone, label: "Mobile" },
            { key: "desktop", icon: Monitor,    label: "Desktop" },
            { key: "tablet",  icon: Tablet,     label: "Tablet" },
          ].map(({ key, icon: Icon, label }) => {
            const count = devices[key] ?? 0;
            const total = Object.values(devices).reduce((a, b) => a + b, 0);
            const pct = total ? Math.round((count / total) * 100) : 0;
            return (
              <div key={key} className="flex items-center gap-2 text-sm">
                <Icon size={16} className="text-ink-dim" />
                <span className="text-ink-muted">{label}</span>
                <span className="font-bold text-ink tabular-nums">{count}</span>
                <span className="text-xs text-ink-dim">({pct}%)</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Social link clicks */}
      {linkClicks.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-base-border flex items-center gap-2">
            <MousePointerClick size={14} className="text-ink-dim" />
            <h3 className="font-semibold text-sm text-ink">Social link clicks today</h3>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {linkClicks.map((c: any) => (
                <tr key={c.slug} className="border-b border-base-border/50 last:border-0">
                  <td className="px-4 py-2.5 font-medium text-ink capitalize">{c.label}</td>
                  <td className="px-4 py-2.5 text-ink-dim text-xs font-mono truncate max-w-[200px]">{c.destination}</td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={`font-bold tabular-nums text-sm ${c.clicks > 0 ? "text-volt" : "text-ink-dim"}`}>
                      {c.clicks}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
