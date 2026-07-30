"use client";

import { X } from "lucide-react";
import { ReactNode, useEffect } from "react";

export default function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg h-full bg-base-panel border-l border-base-border shadow-2xl overflow-y-auto animate-[slideIn_0.2s_ease-out]">
        <div className="sticky top-0 bg-base-panel border-b border-base-border px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="font-semibold text-[15px]">{title}</h2>
            {subtitle && <p className="text-xs text-ink-dim mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-lg border border-base-border flex items-center justify-center hover:bg-base-hover transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
