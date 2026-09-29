"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Search, ScrollText, ShieldAlert } from "lucide-react";
import { adminApi } from "@/lib/api";
import { getSession } from "@/lib/api";

interface AuditEntry {
  id: string;
  admin_id: string;
  admin_name?: string;
  action: string;
  target?: string;
  detail?: Record<string, unknown>;
  created_at: string;
}

// Colour-code action categories
function actionColor(action: string) {
  if (action.includes("delete") || action.includes("cancel") || action.includes("deactivate"))
    return "text-red-400";
  if (action.includes("create") || action.includes("award") || action.includes("export"))
    return "text-green-400";
  if (action.includes("update") || action.includes("status") || action.includes("cost") || action.includes("notes"))
    return "text-blue-400";
  if (action.includes("login") || action.includes("logout") || action.includes("password"))
    return "text-amber-400";
  return "text-ink-muted";
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [filter, setFilter] = useState("");
  const [limit, setLimit] = useState(100);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const s = getSession();
    setIsSuperadmin(s?.role === "superadmin");
  }, []);

  function load() {
    setLoading(true);
    adminApi
      .auditLog(limit)
      .then((res: any) => setEntries(res.data ?? []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (isSuperadmin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperadmin, limit]);

  // Guard: only superadmins can view this page
  if (!isSuperadmin) {
    return (
      <div className="card p-8 flex flex-col items-center gap-4 max-w-md mx-auto mt-12 text-center">
        <ShieldAlert size={36} className="text-amber-400" />
        <h2 className="font-bold text-ink text-lg">Superadmin Access Only</h2>
        <p className="text-sm text-ink-muted">
          The audit log is restricted to superadmins. Contact a superadmin if you need to review activity logs.
        </p>
      </div>
    );
  }

  const filtered = entries.filter((e) => {
    if (!filter.trim()) return true;
    const q = filter.toLowerCase();
    return (
      e.action.toLowerCase().includes(q) ||
      (e.admin_name ?? "").toLowerCase().includes(q) ||
      (e.target ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <ScrollText size={20} className="text-volt" />
          <div>
            <h2 className="font-display font-semibold text-lg text-ink">Audit Log</h2>
            <p className="text-xs text-ink-muted mt-0.5">
              All admin actions — {entries.length} entries
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="select-field text-xs w-32"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
          >
            <option value={50}>Last 50</option>
            <option value={100}>Last 100</option>
            <option value={200}>Last 200</option>
          </select>
          <button
            onClick={load}
            className="btn-ghost px-3 py-2"
            title="Refresh"
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Search filter */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-dim" />
        <input
          className="input-field pl-9 text-sm"
          placeholder="Filter by action, admin, or target…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {/* Stats row */}
      {!loading && entries.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total actions", value: entries.length },
            { label: "Unique admins", value: new Set(entries.map((e) => e.admin_id)).size },
            {
              label: "Updates",
              value: entries.filter((e) => e.action.includes("update") || e.action.includes("status")).length,
            },
            {
              label: "Deletions",
              value: entries.filter((e) => e.action.includes("delete") || e.action.includes("cancel")).length,
            },
          ].map((s) => (
            <div key={s.label} className="card p-4">
              <p className="text-2xl font-black text-ink tabular-nums">{s.value}</p>
              <p className="text-xs text-ink-muted mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">Time</th>
              <th className="th">Admin</th>
              <th className="th">Action</th>
              <th className="th">Target</th>
              <th className="th w-8"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="td text-ink-dim" colSpan={5}>
                  Loading audit log…
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td className="td text-ink-dim" colSpan={5}>
                  {filter ? `No entries matching "${filter}"` : "No audit entries yet."}
                </td>
              </tr>
            )}
            {filtered.map((e) => (
              <>
                <tr
                  key={e.id}
                  className="hover:bg-base-hover/40 cursor-pointer"
                  onClick={() => setExpanded(expanded === e.id ? null : e.id)}
                >
                  <td className="td text-xs text-ink-muted whitespace-nowrap">
                    <span title={new Date(e.created_at).toLocaleString()}>
                      {timeAgo(e.created_at)}
                    </span>
                    <br />
                    <span className="text-ink-dim text-[10px]">
                      {new Date(e.created_at).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="td">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-volt/20 flex items-center justify-center text-volt font-bold text-[10px] shrink-0">
                        {(e.admin_name ?? "?").charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm text-ink">{e.admin_name ?? "Unknown"}</span>
                    </div>
                  </td>
                  <td className="td">
                    <code className={`text-xs font-mono font-bold ${actionColor(e.action)}`}>
                      {e.action}
                    </code>
                  </td>
                  <td className="td">
                    <span className="text-xs text-ink-muted font-mono">{e.target ?? "—"}</span>
                  </td>
                  <td className="td text-ink-dim text-xs">
                    {e.detail && Object.keys(e.detail).length > 0 ? "▾" : ""}
                  </td>
                </tr>

                {/* Expanded detail row */}
                {expanded === e.id && e.detail && Object.keys(e.detail).length > 0 && (
                  <tr key={`${e.id}-detail`}>
                    <td colSpan={5} className="px-4 pb-3 pt-0">
                      <div className="bg-base-hover rounded-xl p-3 font-mono text-xs text-ink-muted space-y-1">
                        {Object.entries(e.detail).map(([k, v]) => (
                          <div key={k} className="flex gap-2">
                            <span className="text-ink-dim shrink-0">{k}:</span>
                            <span className="text-ink break-all">{JSON.stringify(v)}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
