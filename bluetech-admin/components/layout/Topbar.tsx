"use client";

import { Search, Bell } from "lucide-react";
import { useState, useEffect } from "react";

export default function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const [initials, setInitials] = useState("AD");

  useEffect(() => {
    try {
      const raw = document.cookie
        .split("; ")
        .find((c) => c.startsWith("admin_session="))
        ?.split("=")
        .slice(1)
        .join("=");
      if (!raw) return;
      const session = JSON.parse(decodeURIComponent(raw));
      const name: string = session.full_name ?? session.username ?? "";
      const computed = name.split(" ").slice(0, 2).map((w: string) => w[0]?.toUpperCase() ?? "").join("");
      if (computed) setInitials(computed);
    } catch { /* keep default */ }
  }, []);

  return (
    <div className="flex items-center justify-between gap-4 mb-7">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-ink-muted mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center gap-2 bg-base-panel border border-base-border rounded-xl px-3 py-2 w-64">
          <Search size={15} className="text-ink-dim" />
          <input
            placeholder="Search orders, repairs, customers…"
            className="bg-transparent text-sm outline-none placeholder:text-ink-dim w-full"
          />
        </div>
        <button className="relative w-10 h-10 rounded-xl border border-base-border bg-base-panel flex items-center justify-center hover:bg-base-hover transition-colors">
          <Bell size={16} className="text-ink-muted" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-coral-tile" />
        </button>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-volt to-lilac-tile flex items-center justify-center text-sm font-bold text-white">
          {initials}
        </div>
      </div>
    </div>
  );
}
