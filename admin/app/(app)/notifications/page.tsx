"use client";

import { useState } from "react";
import { ShoppingBag, Wrench, RefreshCw } from "lucide-react";
import { useNotifications, timeAgo, Notif } from "@/lib/useNotifications";

const FILTERS = ["all", "order", "booking", "unread"] as const;
type Filter = typeof FILTERS[number];

export default function NotificationsPage() {
  const { notifs, loading, markRead, markAllRead, reload } = useNotifications();
  const [filter, setFilter] = useState<Filter>("all");

  const visible = notifs.filter((n) => {
    if (filter === "unread") return !n.read;
    if (filter === "order") return n.type === "order";
    if (filter === "booking") return n.type === "booking";
    return true;
  });

  const unread = notifs.filter((n) => !n.read).length;

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display font-semibold text-lg text-ink">Notifications</h2>
          <p className="text-sm text-ink-muted mt-0.5">{notifs.length} total · {unread} unread</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={reload} className="btn-ghost px-3 py-2" aria-label="Refresh">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          {unread > 0 && (
            <button onClick={markAllRead} className="btn-ghost px-3 py-2 text-sm">Mark all read</button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 border-b border-base-border">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              filter === f
                ? "border-volt text-volt"
                : "border-transparent text-ink-muted hover:text-ink"
            }`}
          >
            {f === "unread" ? `Unread (${unread})` : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="card divide-y divide-base-border/50">
        {loading && (
          <p className="text-sm text-ink-dim text-center py-12">Loading notifications…</p>
        )}
        {!loading && visible.length === 0 && (
          <p className="text-sm text-ink-dim text-center py-12">No notifications</p>
        )}
        {visible.map((n: Notif) => (
          <button
            key={n.id}
            onClick={() => markRead(n.id)}
            className={`w-full text-left flex items-start gap-4 px-5 py-4 hover:bg-base-hover transition-colors ${!n.read ? "bg-volt/5" : ""}`}
          >
            {!n.read && <span className="mt-2 w-2 h-2 rounded-full bg-volt shrink-0" />}
            {n.read && <span className="mt-2 w-2 h-2 shrink-0" />}
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${n.type === "order" ? "bg-volt/15 text-volt" : "bg-teal/15 text-teal"}`}>
              {n.type === "order" ? <ShoppingBag size={16} /> : <Wrench size={16} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm leading-snug ${!n.read ? "text-ink font-medium" : "text-ink-muted"}`}>
                {n.title}
              </p>
              <p className="text-xs text-ink-dim mt-1">{n.sub}</p>
            </div>
            <span className="text-xs text-ink-dim shrink-0 mt-0.5">{timeAgo(n.time)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
