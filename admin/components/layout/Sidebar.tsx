"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import clsx from "clsx";
import Image from "next/image";
import {
  LayoutGrid, ShoppingBag, Wrench, Package, MapPin, ListChecks,
  Users, Gift, BarChart3, ShieldCheck, LogOut, Sparkles, Bell,
  DollarSign, Receipt, Cpu, Sun, Moon,
} from "lucide-react";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutGrid },
  { href: "/orders", label: "Orders", icon: ShoppingBag },
  { href: "/repairs", label: "Repair Bookings", icon: Wrench },
  { href: "/transactions", label: "Transactions", icon: Receipt },
  { href: "/products", label: "Products", icon: Package },
  { href: "/devices", label: "Devices & Pricing", icon: Cpu },
  { href: "/zones", label: "Delivery Zones", icon: MapPin },
  { href: "/services", label: "Repair Services", icon: ListChecks },
  { href: "/users", label: "Users", icon: Users },
  { href: "/loyalty", label: "Loyalty & Referrals", icon: Gift },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/revenue", label: "Revenue", icon: DollarSign },
  { href: "/notifications", label: "Notifications", icon: Bell },
];

export default function Sidebar({ role }: { role?: "admin" | "superadmin" }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [light, setLight] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme") === "light";
    setLight(saved);
    document.documentElement.classList.toggle("light", saved);
  }, []);

  function toggleTheme() {
    const next = !light;
    setLight(next);
    document.documentElement.classList.toggle("light", next);
    localStorage.setItem("theme", next ? "light" : "dark");
  }

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-[260px] shrink-0 h-screen flex flex-col p-4 border-r border-base-border bg-base-panel">
      <div className="flex items-center gap-2.5 px-2 py-3 mb-4">
        <Image src="/logo.png" alt="BlueTech" width={36} height={36} className="rounded-lg" />
        <span className="font-display font-bold text-[15px] tracking-tight text-ink">BlueTech</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto">
        {NAV.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx("nav-item", active && "nav-item-active")}
            >
              <Icon size={17} strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}

        {role === "superadmin" && (
          <Link
            href="/admins"
            className={clsx("nav-item", pathname.startsWith("/admins") && "nav-item-active")}
          >
            <ShieldCheck size={17} strokeWidth={2} />
            Admin Accounts
          </Link>
        )}
      </nav>

      <div className="card-gradient p-4 mt-3 mb-3">
        <Sparkles size={18} className="mb-2 opacity-90" />
        <p className="text-sm font-semibold leading-snug">Track stock &amp; repairs in real time</p>
        <p className="text-xs text-white/75 mt-1">Low-stock alerts keep your shelves stocked automatically.</p>
        <Link
          href="/products"
          className="inline-block mt-3 bg-white text-volt-dark text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-white/90 transition-colors"
        >
          View products
        </Link>
      </div>

      <button onClick={toggleTheme} className="nav-item w-full mb-1">
        {light ? <Moon size={17} strokeWidth={2} /> : <Sun size={17} strokeWidth={2} />}
        {light ? "Dark Mode" : "Light Mode"}
      </button>

      <button
        onClick={handleLogout}
        disabled={loggingOut}
        className="nav-item text-bad hover:text-bad hover:bg-bad/10 w-full disabled:opacity-50"
      >
        <LogOut size={17} strokeWidth={2} />
        {loggingOut ? "Logging out…" : "Log Out"}
      </button>
    </aside>
  );
}
