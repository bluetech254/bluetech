"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, ShoppingBag, Wrench, X } from "lucide-react";
import { useNotifications, timeAgo } from "@/lib/useNotifications";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { notifs, markRead, markAllRead } = useNotifications();
  const ref = useRef<HTMLDivElement>(null);
  const unread = notifs.filter((n) => !n.read).length;

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-10 h-10 rounded-xl bg-base-panel border border-base-border flex items-center justify-center hover:bg-base-hover transition-colors shrink-0"
        aria-label="Notifications"
      >
        <Bell size={17} className="text-ink-muted" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-bad text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 card shadow-xl z-50 flex flex-col max-h-[480px]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-base-border shrink-0">
            <span className="font-display font-semibold text-sm text-ink">Notifications</span>
            <div className="flex items-center gap-3">
              {unread > 0 && (
                <button onClick={markAllRead} className="text-xs text-volt hover:underline">Mark all read</button>
              )}
              <button onClick={() => setOpen(false)} className="text-ink-dim hover:text-ink"><X size={15} /></button>
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {notifs.length === 0 && (
              <p className="text-sm text-ink-dim text-center py-10">No notifications</p>
            )}
            {notifs.slice(0, 20).map((n) => (
              <button
                key={n.id}
                onClick={() => markRead(n.id)}
                className={`w-full text-left flex items-start gap-3 px-4 py-3 border-b border-base-border/50 hover:bg-base-hover transition-colors ${!n.read ? "bg-volt/5" : ""}`}
              >
                <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${n.type === "order" ? "bg-volt/15 text-volt" : "bg-teal/15 text-teal"}`}>
                  {n.type === "order" ? <ShoppingBag size={14} /> : <Wrench size={14} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug truncate ${!n.read ? "text-ink font-medium" : "text-ink-muted"}`}>{n.title}</p>
                  <p className="text-xs text-ink-dim mt-0.5 truncate">{n.sub}</p>
                </div>
                <span className="text-[10px] text-ink-dim shrink-0 mt-1">{timeAgo(n.time)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
