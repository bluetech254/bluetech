"use client";

import { useState, useEffect } from "react";
import Topbar from "@/components/layout/Topbar";
import { adminApi } from "@/lib/api";
import { ShieldCheck, ShieldOff, Plus, Loader2, X } from "lucide-react";
import clsx from "clsx";

function getSession() {
  try {
    const raw = document.cookie
      .split("; ")
      .find((c) => c.startsWith("admin_session="))
      ?.split("=")
      .slice(1)
      .join("=");
    return raw ? JSON.parse(decodeURIComponent(raw)) : null;
  } catch {
    return null;
  }
}

const EMPTY_FORM = { username: "", email: "", full_name: "", password: "", role: "admin" };

export default function AdminsPage() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const session = getSession();
    setIsSuperadmin(session?.role === "superadmin");

    adminApi
      .listAdmins()
      .then((d) => setAdmins(d.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await adminApi.createAdmin(form) as any;
      setAdmins((prev) => [res.admin, ...prev]);
      setShowForm(false);
      setForm(EMPTY_FORM);
    } catch (err: any) {
      setError(err.message ?? "Failed to create admin");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate(id: string) {
    await adminApi.deactivateAdmin(id);
    setAdmins((prev) => prev.map((a) => (a.id === id ? { ...a, is_active: false } : a)));
  }

  return (
    <div>
      <Topbar title="Admin Accounts" subtitle="Manage admin and superadmin access." />

      {!isSuperadmin && (
        <div className="card p-4 mb-5 text-sm text-ink-muted border-bad/30">
          <ShieldOff size={14} className="inline mr-1.5 text-bad" />
          Superadmin access required to manage admin accounts.
        </div>
      )}

      {isSuperadmin && (
        <div className="flex justify-end mb-5">
          <button onClick={() => setShowForm(true)} className="btn-primary gap-2">
            <Plus size={15} /> New Admin
          </button>
        </div>
      )}

      {showForm && (
        <div className="card p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm">Create Admin Account</h2>
            <button onClick={() => { setShowForm(false); setError(""); setForm(EMPTY_FORM); }}>
              <X size={16} className="text-ink-dim" />
            </button>
          </div>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-ink-dim mb-1 block">Full Name</label>
              <input required className="input-field w-full text-sm" value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-ink-dim mb-1 block">Username</label>
              <input required className="input-field w-full text-sm" value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-ink-dim mb-1 block">Email</label>
              <input required type="email" className="input-field w-full text-sm" value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-ink-dim mb-1 block">Password</label>
              <input required type="password" minLength={8} className="input-field w-full text-sm" value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-ink-dim mb-1 block">Role</label>
              <select className="input-field w-full text-sm" value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
                <option value="admin">Admin</option>
                <option value="superadmin">Superadmin</option>
              </select>
            </div>
            <div className="sm:col-span-2 flex items-center gap-3">
              {error && <p className="text-xs text-bad flex-1">{error}</p>}
              <button type="submit" disabled={submitting} className="btn-primary ml-auto gap-2">
                {submitting && <Loader2 size={14} className="animate-spin" />}
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-base-border">
              <tr>
                <th className="th">Name</th>
                <th className="th">Username</th>
                <th className="th">Email</th>
                <th className="th">Role</th>
                <th className="th">Last Login</th>
                <th className="th">Status</th>
                {isSuperadmin && <th className="th"></th>}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} className="td text-center text-ink-dim py-10">Loading…</td></tr>
              )}
              {!loading && admins.map((a) => (
                <tr key={a.id} className="border-b border-base-border/60 hover:bg-base-hover/50 transition-colors">
                  <td className="td font-medium">{a.full_name}</td>
                  <td className="td text-ink-muted">@{a.username}</td>
                  <td className="td text-ink-muted text-sm">{a.email}</td>
                  <td className="td">
                    <span className={clsx("pill text-[11px]", a.role === "superadmin" ? "bg-volt/15 text-volt" : "bg-lilac-tile/15 text-lilac-tile")}>
                      <ShieldCheck size={11} /> {a.role}
                    </span>
                  </td>
                  <td className="td text-xs text-ink-dim whitespace-nowrap">
                    {a.last_login ? new Date(a.last_login).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : "Never"}
                  </td>
                  <td className="td">
                    <span className={clsx("pill text-[11px]", a.is_active ? "bg-good/15 text-good" : "bg-bad/15 text-bad")}>
                      {a.is_active ? "Active" : "Deactivated"}
                    </span>
                  </td>
                  {isSuperadmin && (
                    <td className="td">
                      {a.is_active && (
                        <button
                          onClick={() => handleDeactivate(a.id)}
                          className="pill bg-bad/10 text-bad text-[11px] hover:bg-bad/20 transition-colors"
                        >
                          <ShieldOff size={11} /> Deactivate
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
