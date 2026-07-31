"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";

export default function SidebarShell({ role }: { role?: "admin" | "superadmin" }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 w-9 h-9 flex items-center justify-center rounded-xl bg-base-panel border border-base-border text-ink-muted hover:text-ink transition-colors"
        aria-label="Open navigation"
      >
        <Menu size={18} />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar — always visible lg+, drawer on mobile */}
      <div
        className={`fixed lg:sticky lg:top-0 lg:self-start inset-y-0 left-0 z-50 transition-transform duration-300 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="relative h-full">
          <button
            onClick={() => setOpen(false)}
            className="lg:hidden absolute top-4 right-3 z-10 w-7 h-7 flex items-center justify-center rounded-lg text-ink-muted hover:text-ink"
            aria-label="Close navigation"
          >
            <X size={16} />
          </button>
          <Sidebar role={role} />
        </div>
      </div>
    </>
  );
}
