"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Bell } from "lucide-react";

export default function Topbar({ fullName }: { fullName?: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim()) router.push(`/?q=${encodeURIComponent(q.trim())}`);
  }

  const firstName = fullName?.split(" ")[0] ?? "there";

  return (
    <header className="flex items-center justify-between gap-6 mb-6">
      <div>
        <h1 className="font-display font-semibold text-xl text-ink">
          Hello, {firstName} <span aria-hidden>👋</span>
        </h1>
        <p className="text-sm text-ink-muted mt-0.5">Welcome to the BlueTech Kenya admin panel</p>
      </div>

      <form onSubmit={handleSearch} className="flex-1 max-w-md">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-dim" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="input-field pl-10"
            placeholder="Search orders, bookings, customers…"
          />
        </div>
      </form>

      <button className="relative w-10 h-10 rounded-xl bg-base-panel border border-base-border flex items-center justify-center hover:bg-base-hover transition-colors shrink-0">
        <Bell size={17} className="text-ink-muted" />
        <span className="absolute top-2 right-2.5 w-1.5 h-1.5 rounded-full bg-coral" />
      </button>
    </header>
  );
}
