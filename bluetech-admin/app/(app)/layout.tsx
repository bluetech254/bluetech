import Sidebar from "@/components/layout/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 px-5 lg:px-8 py-6 max-w-[1600px] w-full mx-auto">{children}</main>
    </div>
  );
}
