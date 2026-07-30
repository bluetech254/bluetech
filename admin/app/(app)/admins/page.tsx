"use client";

import { useEffect, useState } from "react";
import { Plus, ShieldOff } from "lucide-react";
import { adminApi } from "@/lib/api";
import { getSession } from "@/lib/api";
import { AdminAccount, AdminRole } from "@/lib/types";

export default function AdminsPage() {
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({ username: "", email: "", full_name: "", password: "", role: "admin" as AdminRole });
  const [selfId, setSelfId] = useState("");

  function load() {
    setLoading(true);
    adminApi.listAdmins().then((res: any) => setAdmins(res.data ?? [])).finally(() => setLoading(false));
  }

  useEffect(() => {
    const session = getSession();
    setIsSuperadmin(session?.role === "superadmin");
    setSelfId(session?.id ?? "");
    load();
  }, []);

  async function createAdmin(e: React.FormEvent) {
    e.preventDefault();
    await adminApi.createAdmin(draft);
    setShowForm(false);
    setDraft({ username: "", email: "", full_name: "", password: "", role: "admin" });
    load();
  }

  async function deactivate(id: string) {
    await adminApi.deactivateAdmin(id);
    load();
  }

  if (!isSuperadmin) {
    return (
      <div className="card p-6 text-sm text-ink-muted">
        Admin account management is restricted to superadmins. Contact a superadmin if you need changes made here.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button onClick={() => setShowForm((s) => !s)} className="btn-primary"><Plus size={15} /> New admin</button>
      </div>

      {showForm && (
        <form onSubmit={createAdmin} className="card p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          <input className="input-field" placeholder="Username" value={draft.username} onChange={(e) => setDraft((d) => ({ ...d, username: e.target.value }))} required />
          <input className="input-field" placeholder="Full name" value={draft.full_name} onChange={(e) => setDraft((d) => ({ ...d, full_name: e.target.value }))} required />
          <input className="input-field" type="email" placeholder="Email" value={draft.email} onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))} required />
          <input className="input-field" type="password" placeholder="Temporary password" value={draft.password} onChange={(e) => setDraft((d) => ({ ...d, password: e.target.value }))} required />
          <select className="select-field" value={draft.role} onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value as AdminRole }))}>
            <option value="admin">Admin</option>
            <option value="superadmin">Superadmin</option>
          </select>
          <button type="submit" className="btn-primary md:col-start-2">Create admin</button>
        </form>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">Name</th>
              <th className="th">Username</th>
              <th className="th">Email</th>
              <th className="th">Role</th>
              <th className="th">Last login</th>
              <th className="th">Status</th>
              <th className="th w-16"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td className="td text-ink-dim" colSpan={7}>Loading admins…</td></tr>}
            {admins.map((a) => (
              <tr key={a.id} className="hover:bg-base-hover/40">
                <td className="td">{a.full_name}</td>
                <td className="td">{a.username}</td>
                <td className="td">{a.email}</td>
                <td className="td">
                  <span className={`pill ${a.role === "superadmin" ? "bg-lilac/15 text-lilac" : "bg-volt/15 text-volt"}`}>{a.role}</span>
                </td>
                <td className="td text-ink-muted">{a.last_login ? new Date(a.last_login).toLocaleString() : "Never"}</td>
                <td className="td">
                  <span className={`pill ${a.is_active ? "bg-good/15 text-good" : "bg-ink-dim/15 text-ink-dim"}`}>{a.is_active ? "Active" : "Inactive"}</span>
                </td>
                <td className="td">
                  {a.id !== selfId && a.is_active && (
                    <button onClick={() => deactivate(a.id)} className="text-ink-muted hover:text-bad"><ShieldOff size={15} /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
