"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  LayoutDashboard,
  ShoppingBag,
  Wrench,
  Package,
  MapPin,
  ClipboardList,
  Gift,
  BarChart3,
  Users,
  Settings,
  LogOut,
  Zap,
} from "lucide-react";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/orders", label: "Orders", icon: ShoppingBag },
  { href: "/repairs", label: "Repairs", icon: Wrench },
  { href: "/products", label: "Products", icon: Package },
  { href: "/zones", label: "Delivery Zones", icon: MapPin },
  { href: "/services", label: "Services", icon: ClipboardList },
  { href: "/loyalty", label: "Loyalty & Referrals", icon: Gift },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/users", label: "Users", icon: Users },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 h-screen sticky top-0 bg-base-panel border-r border-base-border px-4 py-6">
      <div className="flex items-center gap-2.5 px-2 mb-8">
        <div className="w-9 h-9 rounded-xl bg-volt flex items-center justify-center">
          <Zap size={18} className="text-white" fill="white" />
        </div>
        <div className="leading-tight">
          <div className="font-bold text-[15px] tracking-tight">BlueTech</div>
          <div className="text-[11px] text-ink-dim -mt-0.5">Kenya Admin</div>
        </div>
      </div>

      <nav className="flex-1 flex flex-col gap-1">
        {nav.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                active
                  ? "bg-volt/15 text-white"
                  : "text-ink-muted hover:text-ink hover:bg-base-hover"
              )}
            >
              <Icon size={17} strokeWidth={2} className={active ? "text-volt" : ""} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col gap-1 pt-4 border-t border-base-border">
        <Link href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-ink-muted hover:text-ink hover:bg-base-hover transition-colors">
          <Settings size={17} strokeWidth={2} />
          Settings
        </Link>
        <button
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            window.location.href = "/login";
          }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-ink-muted hover:text-bad hover:bg-base-hover transition-colors w-full text-left"
        >
          <LogOut size={17} strokeWidth={2} />
          Log out
        </button>
      </div>
    </aside>
  );
}
