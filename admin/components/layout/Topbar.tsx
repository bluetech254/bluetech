"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import NotificationBell from "@/components/ui/NotificationBell";

export default function Topbar({ fullName }: { fullName?: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim()) router.push(`/?q=${encodeURIComponent(q.trim())}`);
  }

  return (
    <header className="flex items-center justify-between gap-4 mb-6">
      <form onSubmit={handleSearch} className="flex-1 max-w-md">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-dim" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="input-field pl-10"
            placeholder="Search…"
          />
        </div>
      </form>

      <NotificationBell />
    </header>
  );
}
