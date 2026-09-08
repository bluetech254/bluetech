"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SidebarShell from "@/components/layout/SidebarShell";
import Topbar from "@/components/layout/Topbar";
import { getSession } from "@/lib/api";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<{ full_name?: string; role?: "admin" | "superadmin" } | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const s = getSession();
    if (!s?.token || !s?.exp || Date.now() > s.exp) {
      router.replace("/login");
      return;
    }
    setSession(s);
    setChecked(true);
  }, [router]);

  // Don't render anything until auth check is done — prevents flash of protected content
  if (!checked) return null;

  return (
    <div className="flex min-h-screen">
      <SidebarShell role={session?.role} />
      <main className="flex-1 min-w-0 overflow-x-hidden p-4 lg:p-6 lg:pl-6 pl-16 max-w-[1600px] mx-auto w-full">
        <Topbar fullName={session?.full_name} />
        {children}
      </main>
    </div>
  );
}
