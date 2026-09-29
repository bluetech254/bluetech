"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SidebarShell from "@/components/layout/SidebarShell";
import Topbar from "@/components/layout/Topbar";
import { getSession } from "@/lib/api";

/** Clears the admin_session cookie and redirects to /login */
function clearSessionAndRedirect(router: ReturnType<typeof useRouter>) {
  document.cookie = "admin_session=; path=/; max-age=0";
  router.replace("/login");
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<{ full_name?: string; role?: "admin" | "superadmin" } | null>(null);
  const [checked, setChecked] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function checkSession() {
    const s = getSession();
    // Not logged in or token is expired
    if (!s?.token || !s?.exp || Date.now() > s.exp) {
      clearSessionAndRedirect(router);
      return false;
    }
    return s;
  }

  useEffect(() => {
    const s = checkSession();
    if (!s) return;
    setSession(s);
    setChecked(true);

    // Poll every 30s for expiry — catches the case where the tab stays open
    // longer than the 8h session. Also intercepts any 401 returned by the API
    // (see the api.ts request() function which rejects with "401 …").
    intervalRef.current = setInterval(() => {
      checkSession();
    }, 30_000);

    // Global handler: if any API call throws "401 …" redirect immediately
    function onUnhandledRejection(ev: PromiseRejectionEvent) {
      const msg: string = ev.reason?.message ?? String(ev.reason ?? "");
      if (msg.startsWith("401")) {
        clearSessionAndRedirect(router);
      }
    }
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Don't render anything until auth check is done — prevents flash of protected content
  if (!checked) return null;

  return (
    <div className="flex min-h-screen">
      <SidebarShell role={session?.role} />
      <main className="flex-1 min-w-0 overflow-x-hidden p-4 lg:p-6 lg:pl-6 pl-16 max-w-[1600px] mx-auto w-full">
        <Topbar fullName={session?.full_name} role={session?.role} />
        {children}
      </main>
    </div>
  );
}
