"use client";

import { useEffect, useState } from "react";
import { Search, CheckCircle2, XCircle } from "lucide-react";
import { adminApi } from "@/lib/api";

interface ClientUser {
  id: string;
  full_name: string;
  phone_number: string;
  email?: string;
  is_verified?: boolean;
  loyalty_points?: number;
  created_at?: string;
  is_active?: boolean;
}

export default function UsersPage() {
  const [users, setUsers] = useState<ClientUser[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    adminApi.getUsers(q || "+").then((res: any) => setUsers(res.data ?? res.users ?? [])).finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function toggleActive(u: ClientUser) {
    await adminApi.toggleUserActive(u.id, !u.is_active);
    load();
  }

  return (
    <div className="space-y-5">
      <form onSubmit={(e) => { e.preventDefault(); load(); }} className="relative max-w-xs">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-dim" />
        <input className="input-field pl-9" placeholder="Search customers…" value={q} onChange={(e) => setQ(e.target.value)} />
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">Name</th>
              <th className="th">Phone</th>
              <th className="th">Email</th>
              <th className="th">Verified</th>
              <th className="th">Points</th>
              <th className="th">Registered</th>
              <th className="th">Active</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td className="td text-ink-dim" colSpan={7}>Loading users…</td></tr>}
            {!loading && users.length === 0 && <tr><td className="td text-ink-dim" colSpan={7}>No users found.</td></tr>}
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-base-hover/40">
                <td className="td">{u.full_name}</td>
                <td className="td tabular">{u.phone_number}</td>
                <td className="td">{u.email ?? "—"}</td>
                <td className="td">{u.is_verified ? <CheckCircle2 size={15} className="text-good" /> : <XCircle size={15} className="text-ink-dim" />}</td>
                <td className="td tabular">{u.loyalty_points ?? 0}</td>
                <td className="td text-ink-muted">{u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}</td>
                <td className="td">
                  <button onClick={() => toggleActive(u)} className={`pill ${u.is_active ? "bg-good/15 text-good" : "bg-ink-dim/15 text-ink-dim"}`}>
                    {u.is_active ? "Active" : "Inactive"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
