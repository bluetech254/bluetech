import { cookies } from "next/headers";
import SidebarShell from "@/components/layout/SidebarShell";
import Topbar from "@/components/layout/Topbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const raw = cookies().get("admin_session")?.value;
  let session: { full_name?: string; role?: "admin" | "superadmin" } = {};
  try {
    session = raw ? JSON.parse(raw) : {};
  } catch {
    session = {};
  }

  return (
    <div className="flex min-h-screen">
      <SidebarShell role={session.role} />
      <main className="flex-1 min-w-0 overflow-x-hidden p-4 lg:p-6 lg:pl-6 pl-16 max-w-[1600px] mx-auto w-full">
        <Topbar fullName={session.full_name} />
        {children}
      </main>
    </div>
  );
}
