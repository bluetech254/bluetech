import { cookies } from "next/headers";
import Sidebar from "@/components/layout/Sidebar";
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
    <div className="flex">
      <Sidebar role={session.role} />
      <main className="flex-1 min-w-0 p-6 max-w-[1600px]">
        <Topbar fullName={session.full_name} />
        {children}
      </main>
    </div>
  );
}
