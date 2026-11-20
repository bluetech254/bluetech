"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import clsx from "clsx";
import Image from "next/image";
import {
  LayoutGrid, ShoppingBag, Wrench, Package, MapPin,
  Users, Gift, BarChart3, ShieldCheck, LogOut,
  Cpu, Sun, Moon, ScrollText, ClipboardList, Contact,
} from "lucide-react";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutGrid },
  { href: "/daily", label: "Daily Ops", icon: ClipboardList },
  { href: "/customers", label: "Customers", icon: Contact },
  { href: "/orders", label: "Orders", icon: ShoppingBag },
  { href: "/repairs", label: "Repair Bookings", icon: Wrench },
  { href: "/catalogue", label: "Catalogue", icon: Package },
  { href: "/devices", label: "Devices & Pricing", icon: Cpu },
  { href: "/zones", label: "Delivery Zones", icon: MapPin },
  { href: "/users", label: "User Accounts", icon: Users },
  { href: "/loyalty", label: "Loyalty & Referrals", icon: Gift },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
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

  function handleLogout() {
    setLoggingOut(true);
    // Clear the admin session cookie directly — no server route needed
    document.cookie = "admin_session=; path=/; max-age=0; SameSite=Lax; Secure";
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-[260px] shrink-0 h-screen flex flex-col p-4 border-r border-base-border bg-base-panel">
      <div className="flex items-center gap-2.5 px-2 py-3 mb-4">
        <Image src="/logo.png" alt="Fixit Blue Technology" width={36} height={36} className="rounded-lg" />
        <span className="font-display font-bold text-[15px] tracking-tight text-ink">Fixit Blue Technology</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto">
        {NAV.map((item) => {
          // /catalogue is also active when on the old /products or /services paths (redirects)
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href) ||
                (item.href === "/catalogue" && (pathname.startsWith("/products") || pathname.startsWith("/services"))) ||
                (item.href === "/analytics" && (pathname.startsWith("/revenue") || pathname.startsWith("/transactions")));
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
          <>
            <Link
              href="/admins"
              className={clsx("nav-item", pathname.startsWith("/admins") && "nav-item-active")}
            >
              <ShieldCheck size={17} strokeWidth={2} />
              Admin Accounts
            </Link>
            <Link
              href="/audit-log"
              className={clsx("nav-item", pathname.startsWith("/audit-log") && "nav-item-active")}
            >
              <ScrollText size={17} strokeWidth={2} />
              Audit Log
            </Link>
          </>
        )}
      </nav>

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
