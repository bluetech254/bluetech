"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  ChevronLeft, ChevronRight, Lock, Unlock, Loader2, AlertTriangle,
  ClipboardList, Users, Truck, Wallet, FileText, BarChart2,
  TrendingUp, ShoppingBag, CreditCard, Smartphone, Banknote,
  CheckCircle2, XCircle, Clock, Ban, Plus, Trash2, RefreshCw,
  Phone, MessageCircle, User, Globe, Instagram, Search,
  Package, ArrowDownToLine, ArrowUpFromLine, ChevronDown,
  Receipt, Download, Share2, MousePointerClick,
} from "lucide-react";
import { adminApi, formatKES, getSession } from "@/lib/api";
import TrafficTab from "./TrafficTab";

// ── Types ──────────────────────────────────────────────────────────────────
type Tab = "operations" | "leads" | "logistics" | "cash" | "eod" | "traffic";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "operations", label: "Operations",  icon: ClipboardList },
  { id: "leads",      label: "Leads",       icon: Users },
  { id: "logistics",  label: "Logistics",   icon: Truck },
  { id: "cash",       label: "Cash",        icon: Wallet },
  { id: "eod",        label: "EOD Report",  icon: FileText },
  { id: "traffic",    label: "Traffic",     icon: BarChart2 },
];

const toDateStr = (d: Date) => d.toISOString().slice(0, 10);
const today = () => toDateStr(new Date());
const fmtDate = (s: string) =>
  new Date(s + "T00:00:00").toLocaleDateString("en-KE", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

// ── Main page ──────────────────────────────────────────────────────────────
export default function DailyOpsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("operations");
  const [dateStr, setDateStr]     = useState(today());
  const [report, setReport]       = useState<any>(null);
  const [eod, setEod]             = useState<any>(null);
  const [leads, setLeads]         = useState<any[]>([]);
  const [logistics, setLogistics] = useState<any[]>([]);
  const [expenses, setExpenses]   = useState<any[]>([]);
  const [zones, setZones]         = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [locking, setLocking]     = useState(false);
  const [error, setError]         = useState("");
  const session = getSession();

  // ── Load all data ─────────────────────────────────────────────────────
  const load = useCallback(async (date: string) => {
    setLoading(true); setError("");
    try {
      const [r, l, lg, ex, z] = await Promise.all([
        adminApi.dailyGetReport(date),
        adminApi.dailyGetLeads(date),
        adminApi.dailyGetLogistics(date),
        adminApi.dailyGetExpenses(date),
        adminApi.getZones(),
      ]);
      setReport(r);
      setLeads(Array.isArray(l) ? l : []);
      setLogistics(Array.isArray(lg) ? lg : []);
      setExpenses(Array.isArray(ex) ? ex : []);
      setZones((z as any)?.data ?? []);
    } catch (e: any) {
      setError(e.message ?? "Failed to load daily report");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadEod = useCallback(async (date: string) => {
    try {
      const e = await adminApi.dailyEod(date);
      setEod(e);
    } catch {}
  }, []);

  useEffect(() => { load(dateStr); }, [dateStr, load]);
  useEffect(() => {
    if (activeTab === "eod") loadEod(dateStr);
  }, [activeTab, dateStr, loadEod]);

  // ── Date nav ──────────────────────────────────────────────────────────
  function changeDate(delta: number) {
    const d = new Date(dateStr + "T00:00:00");
    d.setDate(d.getDate() + delta);
    setDateStr(toDateStr(d));
  }

  // ── Lock ──────────────────────────────────────────────────────────────
  async function handleLock() {
    if (!confirm(`Lock ${fmtDate(dateStr)}? No further edits will be allowed.`)) return;
    setLocking(true);
    try {
      const r = await adminApi.dailyLockReport(dateStr);
      setReport(r);
    } catch (e: any) {
      alert(e.message);
    } finally { setLocking(false); }
  }

  const locked = report?.status === "closed";

  // ── Live KPIs (from leads + expenses; full from EOD when loaded) ──────
  const totalLeads    = leads.length;
  const closedLeads   = leads.filter(l => l.status === "closed").length;
  const convPct       = totalLeads ? Math.round(closedLeads / totalLeads * 100) : 0;
  const totalExpenses = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);

  return (
    <div className="flex flex-col h-full">
      {/* ── Header bar ─────────────────────────────────────────────── */}
      <div className="shrink-0 px-6 pt-5 pb-0 border-b border-base-border bg-base-panel">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          {/* Date navigation */}
          <div className="flex items-center gap-2">
            <button onClick={() => changeDate(-1)} className="p-1.5 rounded-lg hover:bg-base-hover transition-colors">
              <ChevronLeft size={18} className="text-ink-dim" />
            </button>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateStr}
                onChange={e => setDateStr(e.target.value)}
                className="bg-transparent border border-base-border rounded-lg px-3 py-1.5 text-sm font-medium text-ink focus:outline-none focus:border-volt"
              />
              <span className="text-sm text-ink-dim hidden sm:block">{fmtDate(dateStr)}</span>
            </div>
            <button onClick={() => changeDate(1)} disabled={dateStr >= today()} className="p-1.5 rounded-lg hover:bg-base-hover transition-colors disabled:opacity-30">
              <ChevronRight size={18} className="text-ink-dim" />
            </button>
            <button onClick={() => { setDateStr(today()); }} className="text-xs px-2 py-1 rounded bg-base-hover text-ink-dim hover:text-ink transition-colors">
              Today
            </button>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <button onClick={() => load(dateStr)} className="p-1.5 rounded-lg hover:bg-base-hover transition-colors" title="Refresh">
              <RefreshCw size={16} className="text-ink-dim" />
            </button>
            {locked ? (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1.5 rounded-lg">
                <Lock size={13} /> Locked
              </span>
            ) : (
              <button onClick={handleLock} disabled={locking} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-base-hover hover:bg-bad/10 hover:text-bad border border-base-border transition-colors disabled:opacity-50">
                {locking ? <Loader2 size={13} className="animate-spin" /> : <Lock size={13} />}
                Lock Day
              </button>
            )}
          </div>
        </div>

        {/* KPI strip */}
        {!loading && report && (
          <div className="flex gap-4 pb-3 overflow-x-auto text-nowrap">
            <KpiChip label="Leads" value={totalLeads} color="blue" />
            <KpiChip label="Closed" value={closedLeads} color="green" />
            <KpiChip label="Conv %" value={`${convPct}%`} color="cyan" />
            <KpiChip label="Expenses" value={formatKES(totalExpenses)} color="amber" />
            {eod && <>
              <KpiChip label="Total Sales" value={formatKES(eod.total_sales)} color="green" />
              <KpiChip label="Bills" value={eod.bill_count} color="violet" />
              <KpiChip label="Grand Total" value={formatKES(eod.grand_total)} color="green" />
            </>}
          </div>
        )}

        {/* Tab bar */}
        <div className="flex gap-1 -mb-px">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === t.id
                    ? "border-volt text-volt"
                    : "border-transparent text-ink-dim hover:text-ink"
                }`}
              >
                <Icon size={15} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab content ────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64 gap-2 text-ink-dim">
            <Loader2 size={20} className="animate-spin" /> Loading…
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64 gap-2 text-bad">
            <AlertTriangle size={18} /> {error}
          </div>
        ) : (
          <>
            {activeTab === "operations" && (
              <OperationsTab report={report} eod={eod} leads={leads} logistics={logistics} expenses={expenses} dateStr={dateStr} onViewEod={() => setActiveTab("eod")} loadEod={() => loadEod(dateStr)} />
            )}
            {activeTab === "leads" && (
              <LeadsTab leads={leads} setLeads={setLeads} dateStr={dateStr} locked={locked} />
            )}
            {activeTab === "logistics" && (
              <LogisticsTab logistics={logistics} setLogistics={setLogistics} zones={zones} dateStr={dateStr} locked={locked} />
            )}
            {activeTab === "cash" && (
              <CashTab report={report} setReport={setReport} expenses={expenses} setExpenses={setExpenses} dateStr={dateStr} locked={locked} />
            )}
            {activeTab === "eod" && (
              <EodTab eod={eod} dateStr={dateStr} loading={!eod} onLoad={() => loadEod(dateStr)} session={session} />
            )}
            {activeTab === "traffic" && (
              <TrafficTab />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── KPI chip ──────────────────────────────────────────────────────────────
function KpiChip({ label, value, color }: { label: string; value: string | number; color: string }) {
  const colors: Record<string, string> = {
    green:  "bg-green-500/10 text-green-400 border-green-500/20",
    blue:   "bg-blue-500/10 text-blue-400 border-blue-500/20",
    cyan:   "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    amber:  "bg-amber-500/10 text-amber-400 border-amber-500/20",
    violet: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  };
  return (
    <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${colors[color] ?? colors.blue}`}>
      <span className="text-current/60">{label}</span>
      <span>{value}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 1 — Operations Overview
// ═══════════════════════════════════════════════════════════════════════════
function OperationsTab({ report, eod, leads, logistics, expenses, dateStr, onViewEod, loadEod }: any) {
  useEffect(() => { loadEod(); }, []);
  const [clicks, setClicks] = useState<any[]>([]);
  useEffect(() => {
    let done = false;
    adminApi.dailyGetClicks(dateStr).then((r: any) => { if (!done) setClicks(Array.isArray(r) ? r : []); }).catch(() => {});
    return () => { done = true; };
  }, [dateStr]);

  const totalLeads   = leads.length;
  const closedLeads  = leads.filter((l: any) => l.status === "closed").length;
  const convPct      = totalLeads ? Math.round(closedLeads / totalLeads * 100) : 0;
  const pickups      = logistics.filter((l: any) => l.movement_type === "pickup").reduce((s: number, l: any) => s + (l.quantity || 1), 0);
  const deliveries   = logistics.filter((l: any) => l.movement_type === "delivery").reduce((s: number, l: any) => s + (l.quantity || 1), 0);
  const totalExp     = expenses.reduce((s: number, e: any) => s + parseFloat(e.amount || 0), 0);
  const cashExp      = expenses.filter((e: any) => e.payment_method === "cash").reduce((s: number, e: any) => s + parseFloat(e.amount || 0), 0);
  const opening      = parseFloat(report?.opening_cash ?? 0);
  const cashIn       = eod?.cash_in ?? 0;
  const expected     = opening + cashIn - cashExp;

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Financial cards */}
      {eod ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Today's Sales" value={formatKES(eod.total_sales)} sub={`${eod.bill_count} bills`} icon={ShoppingBag} color="green" />
          <StatCard label="Cash Collected" value={formatKES(eod.cash_in)} icon={Banknote} color="amber" />
          <StatCard label="Card Collected" value={formatKES(eod.card_in)} icon={CreditCard} color="blue" />
          <StatCard label="Online Collected" value={formatKES(eod.online_in)} icon={Smartphone} color="violet" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card animate-pulse h-24 bg-base-hover" />
          ))}
        </div>
      )}

      {/* Summary row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Leads mini */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users size={15} className="text-ink-dim" />
            <span className="text-sm font-semibold text-ink">Leads</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Pill label="Total" value={totalLeads} color="blue" />
            <Pill label="Closed" value={closedLeads} color="green" />
            <Pill label={`${convPct}%`} value="conv." color="cyan" swap />
          </div>
        </div>

        {/* Logistics mini */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Truck size={15} className="text-ink-dim" />
            <span className="text-sm font-semibold text-ink">Logistics</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Pill label="Pickups" value={pickups} color="blue" />
            <Pill label="Deliveries" value={deliveries} color="violet" />
          </div>
        </div>

        {/* Cash drawer mini */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Wallet size={15} className="text-ink-dim" />
            <span className="text-sm font-semibold text-ink">Cash Drawer</span>
          </div>
          <div className="text-xs text-ink-dim space-y-1">
            <div className="flex justify-between"><span>Opening</span><span className="text-ink font-medium">{formatKES(opening)}</span></div>
            <div className="flex justify-between"><span>Cash In</span><span className="text-green-400 font-medium">+{formatKES(cashIn)}</span></div>
            <div className="flex justify-between"><span>Expenses</span><span className="text-bad font-medium">−{formatKES(cashExp)}</span></div>
            <div className="flex justify-between pt-1 border-t border-base-border"><span className="font-semibold text-ink">Expected</span><span className="text-ink font-bold">{formatKES(expected)}</span></div>
          </div>
        </div>
      </div>

      {/* Link clicks today (Phase 2) */}
      {clicks.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <MousePointerClick size={15} className="text-ink-dim" />
            <span className="text-sm font-semibold text-ink">Link Clicks Today</span>
            <span className="text-xs text-ink-dim ml-auto">{clicks.reduce((s: number, c: any) => s + (c.clicks || 0), 0)} total</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {clicks.map((c: any) => (
              <div key={c.slug} className="flex items-center justify-between rounded-lg bg-base-hover px-3 py-2 text-xs">
                <span className="text-ink-dim">{c.label}</span>
                <span className="text-ink font-bold">{c.clicks}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expenses quick view */}
      {expenses.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-ink flex items-center gap-2"><Receipt size={15} className="text-ink-dim" /> Expenses Today</span>
            <span className="text-sm font-bold text-bad">{formatKES(totalExp)}</span>
          </div>
          <div className="space-y-1">
            {expenses.slice(0, 5).map((e: any) => (
              <div key={e.id} className="flex justify-between text-xs text-ink-dim">
                <span>{e.vendor} — {e.reason}</span>
                <span className="text-ink">{formatKES(parseFloat(e.amount))}</span>
              </div>
            ))}
            {expenses.length > 5 && <div className="text-xs text-ink-dim">+{expenses.length - 5} more…</div>}
          </div>
        </div>
      )}

      <button onClick={onViewEod} className="btn-primary flex items-center gap-2 text-sm">
        <FileText size={15} /> View Full EOD Report
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 2 — Leads
// ═══════════════════════════════════════════════════════════════════════════
function LeadsTab({ leads, setLeads, dateStr, locked }: any) {
  const [channel, setChannel] = useState("whatsapp");
  const [source, setSource]   = useState("unknown");
  const [qty, setQty]         = useState(1);
  const [name, setName]       = useState("");
  const [phone, setPhone]     = useState("");
  const [adding, setAdding]   = useState(false);

  const totalLeads   = leads.length;
  const closedLeads  = leads.filter((l: any) => l.status === "closed").length;
  const pendingLeads = leads.filter((l: any) => l.status === "pending").length;
  const nogoLeads    = leads.filter((l: any) => l.status === "no_go").length;
  const schedLeads   = leads.filter((l: any) => l.status === "scheduled").length;
  const convPct      = totalLeads ? Math.round(closedLeads / totalLeads * 100) : 0;

  async function handleAdd() {
    if (locked) return;
    setAdding(true);
    try {
      const rows = await adminApi.dailyAddLeads(dateStr, {
        channel, source, quantity: qty,
        customer_name: name || undefined, phone: phone || undefined,
      });
      setLeads((prev: any[]) => [...prev, ...(Array.isArray(rows) ? rows : [rows])]);
      setName(""); setPhone(""); setQty(1);
    } catch (e: any) { alert(e.message); }
    finally { setAdding(false); }
  }

  async function handleStatus(id: string, status: string) {
    if (locked) return;
    try {
      const updated = await adminApi.dailyUpdateLead(id, dateStr, { status });
      setLeads((prev: any[]) => prev.map(l => l.id === id ? updated : l));
    } catch (e: any) { alert(e.message); }
  }

  async function handleDelete(id: string) {
    if (locked) return;
    if (!confirm("Remove this lead?")) return;
    try {
      await adminApi.dailyDeleteLead(id, dateStr);
      setLeads((prev: any[]) => prev.filter(l => l.id !== id));
    } catch (e: any) { alert(e.message); }
  }

  // Group by channel
  const groups: Record<string, any[]> = {};
  for (const l of leads) {
    const key = l.channel;
    if (!groups[key]) groups[key] = [];
    groups[key].push(l);
  }

  const channelLabel: Record<string, string> = { call: "Calls", whatsapp: "WhatsApp", walk_in: "Walk-in" };
  const channelIcon: Record<string, React.ElementType> = { call: Phone, whatsapp: MessageCircle, walk_in: User };

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      {/* Quick-add bar */}
      {!locked && (
        <div className="card p-4">
          <p className="text-xs font-semibold text-ink-dim uppercase tracking-wide mb-3">Log Inquiry</p>
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-ink-dim">Channel</label>
              <select value={channel} onChange={e => setChannel(e.target.value)} className="select-sm">
                <option value="call">Call</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="walk_in">Walk-in</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-ink-dim">Source</label>
              <select value={source} onChange={e => setSource(e.target.value)} className="select-sm">
                <option value="unknown">Unknown</option>
                <option value="google">Google</option>
                <option value="google_maps">Google Maps</option>
                <option value="website">Website</option>
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
                <option value="tiktok">TikTok</option>
                <option value="youtube">YouTube</option>
                <option value="threads">Threads</option>
                <option value="referral">Referral</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-ink-dim">Qty</label>
              <select value={qty} onChange={e => setQty(Number(e.target.value))} className="select-sm w-16">
                {[...Array(10)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-ink-dim">Name (opt.)</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Customer name" className="input-sm w-36" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-ink-dim">Phone (opt.)</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="07…" className="input-sm w-32" />
            </div>
            <button onClick={handleAdd} disabled={adding} className="btn-primary flex items-center gap-1.5 text-xs !py-2 self-end">
              {adding ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Add Lead{qty > 1 ? `s (${qty})` : ""}
            </button>
          </div>
        </div>
      )}

      {/* KPI strip */}
      <div className="flex flex-wrap gap-2">
        <KpiChip label="Total" value={totalLeads} color="blue" />
        <KpiChip label="Closed" value={closedLeads} color="green" />
        <KpiChip label="Pending" value={pendingLeads} color="amber" />
        <KpiChip label="No-Go" value={nogoLeads} color="violet" />
        {schedLeads > 0 && <KpiChip label="Scheduled" value={schedLeads} color="cyan" />}
        <KpiChip label={`${convPct}% Conv.`} value="" color="cyan" />
      </div>

      {/* Lead table grouped by channel */}
      {totalLeads === 0 ? (
        <div className="card p-8 text-center text-ink-dim text-sm">No leads logged yet today.</div>
      ) : (
        Object.entries(groups).map(([ch, rows]) => {
          const Icon = channelIcon[ch] ?? User;
          return (
            <div key={ch} className="card overflow-hidden">
              <div className="px-4 py-2.5 bg-base-hover border-b border-base-border flex items-center gap-2">
                <Icon size={14} className="text-ink-dim" />
                <span className="text-sm font-semibold text-ink">{channelLabel[ch] ?? ch}</span>
                <span className="text-xs text-ink-dim ml-auto">{rows.length} entr{rows.length === 1 ? "y" : "ies"}</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-ink-dim border-b border-base-border">
                    <th className="px-4 py-2 text-left font-medium">#</th>
                    <th className="px-4 py-2 text-left font-medium">Channel · Source</th>
                    <th className="px-4 py-2 text-left font-medium">Customer</th>
                    <th className="px-4 py-2 text-left font-medium">Status</th>
                    {!locked && <th className="px-4 py-2" />}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((lead: any, i: number) => (
                    <LeadRow key={lead.id} lead={lead} idx={i + 1} locked={locked}
                      onStatus={(s: string) => handleStatus(lead.id, s)}
                      onDelete={() => handleDelete(lead.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          );
        })
      )}
    </div>
  );
}

function LeadRow({ lead, idx, locked, onStatus, onDelete }: any) {
  const srcLabel: Record<string, string> = {
    google: "Google", google_maps: "Google Maps", website: "Website",
    instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok",
    youtube: "YouTube", threads: "Threads", referral: "Referral",
    other: "Other", unknown: "Unknown",
  };
  const chLabel:  Record<string, string> = { call: "Call", whatsapp: "WhatsApp", walk_in: "Walk-in" };
  const label = lead.source ? `${chLabel[lead.channel] ?? lead.channel} · ${srcLabel[lead.source] ?? lead.source}` : chLabel[lead.channel] ?? lead.channel;

  return (
    <tr className="border-b border-base-border last:border-0 hover:bg-base-hover/40 transition-colors">
      <td className="px-4 py-2.5 text-ink-dim text-xs">{idx}</td>
      <td className="px-4 py-2.5 text-xs text-ink">{label}</td>
      <td className="px-4 py-2.5 text-xs text-ink-dim">
        {lead.customer_name || lead.phone ? (
          <span>{lead.customer_name ?? ""}{lead.customer_name && lead.phone ? " · " : ""}{lead.phone ?? ""}</span>
        ) : "—"}
      </td>
      <td className="px-4 py-2.5">
        <div className="flex gap-1">
          {(["pending", "closed", "no_go"] as const).map(s => (
            <button key={s} disabled={locked}
              onClick={() => onStatus(s)}
              className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                lead.status === s
                  ? s === "closed"   ? "bg-green-500/20 text-green-400 border-green-500/30"
                  : s === "no_go"    ? "bg-red-500/20 text-red-400 border-red-500/30"
                                     : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                  : "border-base-border text-ink-dim hover:border-ink-dim"
              } disabled:cursor-default`}
            >
              {s === "no_go" ? "No-Go" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </td>
      {!locked && (
        <td className="px-4 py-2.5">
          <button onClick={onDelete} className="p-1 rounded hover:text-bad transition-colors">
            <Trash2 size={13} className="text-ink-dim" />
          </button>
        </td>
      )}
    </tr>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 3 — Logistics
// ═══════════════════════════════════════════════════════════════════════════
function LogisticsTab({ logistics, setLogistics, zones, dateStr, locked }: any) {
  const [movType, setMovType]     = useState("pickup");
  const [fulfill, setFulfill]     = useState("us");
  const [zoneId, setZoneId]       = useState("");
  const [qty, setQty]             = useState(1);
  const [adding, setAdding]       = useState(false);

  useEffect(() => {
    if (zones.length > 0 && !zoneId) setZoneId(zones[0].id);
  }, [zones, zoneId]);

  const pickups    = logistics.filter((l: any) => l.movement_type === "pickup");
  const deliveries = logistics.filter((l: any) => l.movement_type === "delivery");
  const pUs    = pickups.filter((l: any) => l.fulfillment_by === "us").reduce((s: number, l: any) => s + (l.quantity || 1), 0);
  const pNotUs = pickups.filter((l: any) => l.fulfillment_by === "not_us").reduce((s: number, l: any) => s + (l.quantity || 1), 0);
  const dUs    = deliveries.filter((l: any) => l.fulfillment_by === "us").reduce((s: number, l: any) => s + (l.quantity || 1), 0);
  const dNotUs = deliveries.filter((l: any) => l.fulfillment_by === "not_us").reduce((s: number, l: any) => s + (l.quantity || 1), 0);

  async function handleAdd() {
    if (locked || !zoneId) return;
    setAdding(true);
    try {
      const row = await adminApi.dailyAddLogistics(dateStr, { movement_type: movType, fulfillment_by: fulfill, zone_id: zoneId, quantity: qty });
      setLogistics((prev: any[]) => [...prev, row]);
      setQty(1);
    } catch (e: any) { alert(e.message); }
    finally { setAdding(false); }
  }

  async function handleDelete(id: string) {
    if (locked) return;
    if (!confirm("Remove this entry?")) return;
    try {
      await adminApi.dailyDeleteLogistics(id, dateStr);
      setLogistics((prev: any[]) => prev.filter(l => l.id !== id));
    } catch (e: any) { alert(e.message); }
  }

  // Group by movement type then zone
  const groups: Record<string, Record<string, any[]>> = { pickup: {}, delivery: {} };
  for (const l of logistics) {
    const mt = l.movement_type as "pickup" | "delivery";
    const z  = l.zone_name ?? "Unknown";
    if (!groups[mt][z]) groups[mt][z] = [];
    groups[mt][z].push(l);
  }

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      {/* Quick-add */}
      {!locked && (
        <div className="card p-4">
          <p className="text-xs font-semibold text-ink-dim uppercase tracking-wide mb-3">Log Movement</p>
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-ink-dim">Type</label>
              <select value={movType} onChange={e => setMovType(e.target.value)} className="select-sm">
                <option value="pickup">Pickup</option>
                <option value="delivery">Delivery</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-ink-dim">Driver</label>
              <select value={fulfill} onChange={e => setFulfill(e.target.value)} className="select-sm">
                <option value="us">Us</option>
                <option value="not_us">Not Us</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-ink-dim">Zone</label>
              <select value={zoneId} onChange={e => setZoneId(e.target.value)} className="select-sm w-48">
                {zones.map((z: any) => <option key={z.id} value={z.id}>{z.zone_name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-ink-dim">Qty</label>
              <select value={qty} onChange={e => setQty(Number(e.target.value))} className="select-sm w-16">
                {[...Array(20)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
              </select>
            </div>
            <button onClick={handleAdd} disabled={adding || !zoneId} className="btn-primary flex items-center gap-1.5 text-xs !py-2 self-end">
              {adding ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Add
            </button>
          </div>
        </div>
      )}

      {/* Summary strip */}
      <div className="flex flex-wrap gap-2">
        <KpiChip label={`Pickups ${pUs + pNotUs}`} value={`Us ${pUs} / Not-Us ${pNotUs}`} color="blue" />
        <KpiChip label={`Deliveries ${dUs + dNotUs}`} value={`Us ${dUs} / Not-Us ${dNotUs}`} color="violet" />
      </div>

      {/* Tables */}
      {logistics.length === 0 ? (
        <div className="card p-8 text-center text-ink-dim text-sm">No movements logged yet today.</div>
      ) : (
        (["pickup", "delivery"] as const).map(mt => {
          const zoneMap = groups[mt];
          if (Object.keys(zoneMap).length === 0) return null;
          return (
            <div key={mt} className="card overflow-hidden">
              <div className="px-4 py-2.5 bg-base-hover border-b border-base-border flex items-center gap-2">
                {mt === "pickup" ? <ArrowDownToLine size={14} className="text-blue-400" /> : <ArrowUpFromLine size={14} className="text-violet-400" />}
                <span className="text-sm font-semibold text-ink capitalize">{mt === "pickup" ? "Pickups" : "Deliveries"}</span>
              </div>
              {Object.entries(zoneMap).map(([zone, rows]) => (
                <div key={zone}>
                  <div className="px-4 py-1.5 bg-base-hover/50 border-b border-base-border text-xs text-ink-dim font-medium">
                    {zone} — {rows.reduce((s: number, r: any) => s + (r.quantity || 1), 0)} item{rows.reduce((s: number, r: any) => s + (r.quantity || 1), 0) !== 1 ? "s" : ""}
                  </div>
                  {rows.map((row: any, i: number) => (
                    <div key={row.id} className="flex items-center gap-4 px-4 py-2.5 border-b border-base-border last:border-0 hover:bg-base-hover/30 text-sm">
                      <span className="text-ink-dim text-xs w-5">{i + 1}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${row.fulfillment_by === "us" ? "bg-green-500/15 text-green-400" : "bg-amber-500/15 text-amber-400"}`}>
                        {row.fulfillment_by === "us" ? "Us" : "Not Us"}
                      </span>
                      <span className="text-xs text-ink-dim">Qty: {row.quantity ?? 1}</span>
                      {row.notes && <span className="text-xs text-ink-dim italic truncate max-w-xs">{row.notes}</span>}
                      {!locked && (
                        <button onClick={() => handleDelete(row.id)} className="ml-auto p-1 rounded hover:text-bad transition-colors">
                          <Trash2 size={13} className="text-ink-dim" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          );
        })
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 4 — Cash
// ═══════════════════════════════════════════════════════════════════════════
function CashTab({ report, setReport, expenses, setExpenses, dateStr, locked }: any) {
  const [opening, setOpening] = useState(parseFloat(report?.opening_cash ?? 0));
  const [counted, setCounted] = useState(parseFloat(report?.counted_cash ?? 0));
  const [saving, setSaving]   = useState(false);

  // Expense form
  const [vendor, setVendor]   = useState("");
  const [reason, setReason]   = useState("");
  const [billRef, setBillRef] = useState("");
  const [method, setMethod]   = useState("cash");
  const [amount, setAmount]   = useState("");
  const [addingExp, setAddingExp] = useState(false);

  const cashExpenses = expenses.filter((e: any) => e.payment_method === "cash").reduce((s: number, e: any) => s + parseFloat(e.amount || 0), 0);
  const totalExpenses = expenses.reduce((s: number, e: any) => s + parseFloat(e.amount || 0), 0);

  // Cash in needs EOD — approximate from report or show placeholder
  const cashIn      = 0; // Will be populated from EOD endpoint when viewing EOD tab
  const expected    = opening + cashIn - cashExpenses;
  const difference  = counted - expected;
  const diffColor   = difference === 0 ? "text-green-400" : difference < 0 ? "text-red-400" : "text-amber-400";

  async function saveDrawer() {
    setSaving(true);
    try {
      const r = await adminApi.dailyUpdateReport(dateStr, { opening_cash: opening, counted_cash: counted });
      setReport(r);
    } catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  }

  async function addExpense() {
    if (!vendor || !reason || !amount) return;
    setAddingExp(true);
    try {
      const row = await adminApi.dailyAddExpense(dateStr, { vendor, reason, bill_ref: billRef || undefined, payment_method: method, amount: parseFloat(amount) });
      setExpenses((prev: any[]) => [...prev, row]);
      setVendor(""); setReason(""); setBillRef(""); setAmount("");
    } catch (e: any) { alert(e.message); }
    finally { setAddingExp(false); }
  }

  async function deleteExpense(id: string) {
    if (!confirm("Remove this expense?")) return;
    try {
      await adminApi.dailyDeleteExpense(id, dateStr);
      setExpenses((prev: any[]) => prev.filter(e => e.id !== id));
    } catch (e: any) { alert(e.message); }
  }

  // Group expenses by payment method for footer
  const byMethod: Record<string, number> = {};
  for (const e of expenses) {
    byMethod[e.payment_method] = (byMethod[e.payment_method] ?? 0) + parseFloat(e.amount || 0);
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Cash drawer */}
      <div className="card p-5">
        <h3 className="text-sm font-bold text-ink mb-4 flex items-center gap-2"><Wallet size={15} /> Cash Drawer Reconciliation</h3>
        <div className="space-y-3">
          <DrawerRow label="Opening Cash" note="Float at shift start">
            <input type="number" disabled={locked} value={opening} onChange={e => setOpening(parseFloat(e.target.value) || 0)}
              className="input-sm w-36 text-right" placeholder="0" />
          </DrawerRow>
          <DrawerRow label="+ Cash In" note="From cash payments today (auto)">
            <span className="text-green-400 font-semibold text-sm">{formatKES(cashIn)}</span>
          </DrawerRow>
          <DrawerRow label="− Cash Expenses" note="Cash payments from expenses">
            <span className="text-bad font-semibold text-sm">{formatKES(cashExpenses)}</span>
          </DrawerRow>
          <div className="border-t border-base-border pt-3">
            <DrawerRow label="= Expected in Drawer" bold>
              <span className="font-bold text-ink text-sm">{formatKES(expected)}</span>
            </DrawerRow>
          </div>
          <DrawerRow label="Counted Cash" note="Physical count at close">
            <input type="number" disabled={locked} value={counted} onChange={e => setCounted(parseFloat(e.target.value) || 0)}
              className="input-sm w-36 text-right" placeholder="0" />
          </DrawerRow>
          <div className="border-t border-base-border pt-3">
            <DrawerRow label="Difference" bold>
              <span className={`font-bold text-sm ${diffColor}`}>
                {difference >= 0 ? "+" : ""}{formatKES(difference)}
                {difference === 0 && " ✓"}
              </span>
            </DrawerRow>
          </div>
        </div>
        {!locked && (
          <button onClick={saveDrawer} disabled={saving} className="btn-primary flex items-center gap-2 text-xs mt-4">
            {saving ? <Loader2 size={13} className="animate-spin" /> : null}
            Save Drawer
          </button>
        )}
        <p className="text-xs text-ink-dim mt-2">Note: Cash In auto-populates from today&apos;s paid cash orders. View the EOD Report tab for the live figure.</p>
      </div>

      {/* Add expense */}
      {!locked && (
        <div className="card p-4">
          <h3 className="text-sm font-bold text-ink mb-3 flex items-center gap-2"><Receipt size={15} /> Log Expense</h3>
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-ink-dim">Vendor</label>
              <input value={vendor} onChange={e => setVendor(e.target.value)} placeholder="e.g. Supplier" className="input-sm w-32" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-ink-dim">Reason</label>
              <input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Transport" className="input-sm w-32" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-ink-dim">Bill Ref</label>
              <input value={billRef} onChange={e => setBillRef(e.target.value)} placeholder="optional" className="input-sm w-24" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-ink-dim">Method</label>
              <select value={method} onChange={e => setMethod(e.target.value)} className="select-sm">
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="transfer">Transfer</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-ink-dim">Amount (KES)</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" className="input-sm w-24" />
            </div>
            <button onClick={addExpense} disabled={addingExp || !vendor || !reason || !amount} className="btn-primary flex items-center gap-1.5 text-xs !py-2 self-end">
              {addingExp ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Add
            </button>
          </div>
        </div>
      )}

      {/* Expenses table */}
      {expenses.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-2.5 bg-base-hover border-b border-base-border flex items-center justify-between">
            <span className="text-sm font-semibold text-ink">Expenses</span>
            <span className="text-sm font-bold text-bad">{formatKES(totalExpenses)}</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-ink-dim border-b border-base-border">
                <th className="px-4 py-2 text-left font-medium">Vendor</th>
                <th className="px-4 py-2 text-left font-medium">Reason</th>
                <th className="px-4 py-2 text-left font-medium">Bill #</th>
                <th className="px-4 py-2 text-left font-medium">Method</th>
                <th className="px-4 py-2 text-right font-medium">Amount</th>
                {!locked && <th className="px-4 py-2" />}
              </tr>
            </thead>
            <tbody>
              {expenses.map((exp: any) => (
                <tr key={exp.id} className="border-b border-base-border last:border-0 hover:bg-base-hover/40">
                  <td className="px-4 py-2.5 text-xs text-ink">{exp.vendor}</td>
                  <td className="px-4 py-2.5 text-xs text-ink-dim">{exp.reason}</td>
                  <td className="px-4 py-2.5 text-xs text-ink-dim">{exp.bill_ref ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      exp.payment_method === "cash"     ? "bg-amber-500/15 text-amber-400"
                    : exp.payment_method === "card"     ? "bg-blue-500/15 text-blue-400"
                                                        : "bg-violet-500/15 text-violet-400"}`}>
                      {exp.payment_method}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-ink text-right font-medium">{formatKES(parseFloat(exp.amount))}</td>
                  {!locked && (
                    <td className="px-4 py-2.5">
                      <button onClick={() => deleteExpense(exp.id)} className="p-1 rounded hover:text-bad transition-colors">
                        <Trash2 size={13} className="text-ink-dim" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {/* Footer by method */}
          <div className="px-4 py-3 bg-base-hover border-t border-base-border flex flex-wrap gap-4 text-xs">
            {Object.entries(byMethod).map(([m, v]) => (
              <span key={m} className="text-ink-dim">
                {m.charAt(0).toUpperCase() + m.slice(1)}: <span className="text-ink font-semibold">{formatKES(v)}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DrawerRow({ label, note, children, bold }: any) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <span className={`text-sm ${bold ? "font-semibold text-ink" : "text-ink-dim"}`}>{label}</span>
        {note && <span className="text-xs text-ink-dim/60 ml-2">({note})</span>}
      </div>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 5 — EOD Report
// ═══════════════════════════════════════════════════════════════════════════
function EodTab({ eod, dateStr, loading, onLoad, session }: any) {
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!eod) onLoad(); }, []);

  if (loading || !eod) return (
    <div className="flex items-center justify-center h-64 gap-2 text-ink-dim">
      <Loader2 size={20} className="animate-spin" /> Building EOD report…
    </div>
  );

  const report  = eod.report ?? {};
  const locked  = report.status === "closed";
  const diff    = eod.variance ?? 0;
  const diffColor = diff === 0 ? "text-green-400" : diff < 0 ? "text-red-400" : "text-amber-400";

  function handlePrint() {
    if (!printRef.current) return;
    const html = printRef.current.innerHTML;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>EOD Report ${dateStr}</title>
      <style>body{font-family:system-ui,sans-serif;padding:20px;color:#0f172a}
      table{width:100%;border-collapse:collapse}th,td{border:1px solid #e2e8f0;padding:6px 10px;font-size:12px}
      th{background:#f8fafc;font-weight:600}.card{border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:12px}
      .green{color:#16a34a}.red{color:#dc2626}.amber{color:#d97706}h2{margin:0 0 8px}h3{margin:0 0 6px;font-size:14px}
      </style></head><body>${html}</body></html>`);
    w.document.close();
    w.print();
  }

  function handleWhatsApp() {
    const leads = eod.leads ?? {};
    const lines = [
      `📋 *EOD Report — ${dateStr}*`,
      `📅 ${new Date(dateStr + "T00:00:00").toLocaleDateString("en-KE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`,
      "",
      `💰 *Sales*`,
      `  Total: ${formatKES(eod.total_sales)} (${eod.bill_count} bills)`,
      `  Cash: ${formatKES(eod.cash_in)} | Card: ${formatKES(eod.card_in)} | Online: ${formatKES(eod.online_in)}`,
      "",
      `🧾 *Expenses*`,
      `  Total: ${formatKES(eod.total_expenses)}`,
      "",
      `💵 *Cash Drawer*`,
      `  Opening: ${formatKES(eod.opening_cash)}`,
      `  Cash In: ${formatKES(eod.cash_in)}`,
      `  Expenses: ${formatKES(eod.cash_expenses)}`,
      `  Expected: ${formatKES(eod.expected_cash)}`,
      `  Counted: ${formatKES(eod.counted_cash)}`,
      `  Variance: ${diff >= 0 ? "+" : ""}${formatKES(diff)}`,
      "",
      `📞 *Leads*`,
      `  Total: ${leads.total} | Closed: ${leads.closed} | Conversion: ${leads.conversion}%`,
      "",
      `🚚 *Logistics*`,
      `  Pickups: ${eod.logistics?.pickups_total ?? 0} | Deliveries: ${eod.logistics?.deliveries_total ?? 0}`,
      "",
      `🔒 ${locked ? "Day Locked" : "Day Open"}`,
    ].join("\n");
    window.open(`https://wa.me/?text=${encodeURIComponent(lines)}`, "_blank");
  }

  return (
    <div className="p-6 max-w-4xl">
      {/* Actions */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <button onClick={onLoad} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-base-hover border border-base-border hover:border-ink-dim transition-colors">
          <RefreshCw size={13} /> Refresh
        </button>
        <button onClick={handlePrint} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-base-hover border border-base-border hover:border-ink-dim transition-colors">
          <Download size={13} /> Print / PDF
        </button>
        <button onClick={handleWhatsApp} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-green-600/20 border border-green-600/30 text-green-400 hover:bg-green-600/30 transition-colors">
          <Share2 size={13} /> Share via WhatsApp
        </button>
      </div>

      {/* Report */}
      <div ref={printRef} className="space-y-5">
        {/* Header */}
        <div className="card p-5">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-bold text-ink">Daily Report</h2>
              <p className="text-sm text-ink-dim mt-0.5">
                {new Date(dateStr + "T00:00:00").toLocaleDateString("en-KE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </p>
              <p className="text-xs text-ink-dim mt-1">Fixit Blue Technology · Nairobi</p>
            </div>
            <div className="text-right">
              {locked ? (
                <div className="text-xs text-amber-400 flex items-center gap-1 justify-end">
                  <Lock size={12} /> Locked
                </div>
              ) : (
                <div className="text-xs text-green-400 flex items-center gap-1 justify-end">
                  <Unlock size={12} /> Open
                </div>
              )}
              {report.closed_at && (
                <p className="text-xs text-ink-dim mt-1">
                  Saved · {new Date(report.closed_at).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Financial cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Today's Sales" value={formatKES(eod.total_sales)} sub={`${eod.bill_count} bills`} icon={ShoppingBag} color="green" />
          <StatCard label="Cash" value={formatKES(eod.cash_in)} icon={Banknote} color="amber" />
          <StatCard label="Card" value={formatKES(eod.card_in)} icon={CreditCard} color="blue" />
          <StatCard label="Online" value={formatKES(eod.online_in)} icon={Smartphone} color="violet" />
        </div>

        {/* Summary totals */}
        <div className="card p-4 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-ink-dim mb-1">Grand Total</p>
            <p className="text-lg font-bold text-ink">{formatKES(eod.grand_total)}</p>
          </div>
          <div>
            <p className="text-xs text-ink-dim mb-1">Expected Cash</p>
            <p className="text-lg font-bold text-ink">{formatKES(eod.expected_cash)}</p>
          </div>
          <div>
            <p className="text-xs text-ink-dim mb-1">Total Expenses</p>
            <p className="text-lg font-bold text-bad">{formatKES(eod.total_expenses)}</p>
          </div>
        </div>

        {/* Payments ledger */}
        {(eod.paid_orders?.length > 0 || eod.paid_bookings?.length > 0) && (
          <EodTable title="Payments" columns={["Invoice/Order", "Client", "Method", "Amount"]}>
            {eod.paid_orders?.map((o: any) => (
              <tr key={o.id} className="border-b border-base-border last:border-0 text-xs">
                <td className="px-4 py-2 font-mono text-ink-dim">{String(o.id).slice(0, 8).toUpperCase()}</td>
                <td className="px-4 py-2 text-ink">{o.full_name}</td>
                <td className="px-4 py-2 text-ink-dim capitalize">{o.payment_method}</td>
                <td className="px-4 py-2 text-right font-medium text-ink">{formatKES(parseFloat(o.total_amount))}</td>
              </tr>
            ))}
            {eod.paid_bookings?.map((b: any) => (
              <tr key={b.id} className="border-b border-base-border last:border-0 text-xs">
                <td className="px-4 py-2 font-mono text-ink-dim">{String(b.id).slice(0, 8).toUpperCase()}</td>
                <td className="px-4 py-2 text-ink">{b.customer_name}</td>
                <td className="px-4 py-2 text-ink-dim capitalize">{b.final_payment_method ?? "—"}</td>
                <td className="px-4 py-2 text-right font-medium text-ink">{formatKES(parseFloat(b.final_cost ?? b.estimated_cost ?? 0))}</td>
              </tr>
            ))}
          </EodTable>
        )}

        {/* Expenses ledger */}
        {eod.expenses?.length > 0 && (
          <EodTable title="Expenses" columns={["Vendor", "Reason", "Bill #", "Method", "Amount"]}>
            {eod.expenses.map((e: any) => (
              <tr key={e.id} className="border-b border-base-border last:border-0 text-xs">
                <td className="px-4 py-2 text-ink">{e.vendor}</td>
                <td className="px-4 py-2 text-ink-dim">{e.reason}</td>
                <td className="px-4 py-2 text-ink-dim">{e.bill_ref ?? "—"}</td>
                <td className="px-4 py-2 text-ink-dim capitalize">{e.payment_method}</td>
                <td className="px-4 py-2 text-right font-medium text-bad">{formatKES(parseFloat(e.amount))}</td>
              </tr>
            ))}
          </EodTable>
        )}

        {/* Cash drawer block */}
        <div className="card p-5">
          <h3 className="text-sm font-bold text-ink mb-4 flex items-center gap-2"><Wallet size={14} /> Cash Drawer Reconciliation</h3>
          <div className="space-y-2 text-sm">
            {[
              ["Opening Cash",       formatKES(eod.opening_cash), "text-ink"],
              ["+ Cash In",          `+${formatKES(eod.cash_in)}`, "text-green-400"],
              ["− Cash Expenses",    `−${formatKES(eod.cash_expenses)}`, "text-bad"],
              ["= Expected",         formatKES(eod.expected_cash), "text-ink font-bold"],
              ["Counted Cash",       formatKES(eod.counted_cash), "text-ink"],
              ["Difference",         `${diff >= 0 ? "+" : ""}${formatKES(diff)}`, diffColor + " font-bold"],
            ].map(([label, val, cls]) => (
              <div key={label as string} className="flex justify-between border-b border-base-border/50 pb-1 last:border-0">
                <span className="text-ink-dim">{label}</span>
                <span className={cls as string}>{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Unpaid bills */}
        {eod.unpaid_orders?.length > 0 && (
          <EodTable title={`Unpaid Bills (${eod.unpaid_orders.length})`} columns={["Order ID", "Client", "Status", "Amount"]}>
            {eod.unpaid_orders.map((o: any) => (
              <tr key={o.id} className="border-b border-base-border last:border-0 text-xs">
                <td className="px-4 py-2 font-mono text-ink-dim">{String(o.id).slice(0, 8).toUpperCase()}</td>
                <td className="px-4 py-2 text-ink">{o.full_name}</td>
                <td className="px-4 py-2 text-ink-dim capitalize">{o.payment_status}</td>
                <td className="px-4 py-2 text-right font-medium text-amber-400">{formatKES(parseFloat(o.total_amount))}</td>
              </tr>
            ))}
          </EodTable>
        )}

        {/* Leads snapshot */}
        <div className="card p-4">
          <h3 className="text-sm font-bold text-ink mb-3 flex items-center gap-2"><Users size={14} /> Leads Snapshot</h3>
          <div className="flex flex-wrap gap-2 mb-3">
            <KpiChip label="Total" value={eod.leads?.total ?? 0} color="blue" />
            <KpiChip label="Closed" value={eod.leads?.closed ?? 0} color="green" />
            <KpiChip label="Pending" value={eod.leads?.pending ?? 0} color="amber" />
            <KpiChip label="No-Go" value={eod.leads?.no_go ?? 0} color="violet" />
            <KpiChip label={`${eod.leads?.conversion ?? 0}% Conv.`} value="" color="cyan" />
          </div>
          {eod.leads?.by_channel && Object.entries(eod.leads.by_channel).map(([ch, data]: any) => (
            <div key={ch} className="text-xs text-ink-dim">
              <span className="capitalize font-medium text-ink">{ch.replace("_", " ")}</span>: {data.total}
              {data.sources && Object.keys(data.sources).length > 0 && (
                <span className="ml-1">({Object.entries(data.sources).map(([s, c]) => `${s}: ${c}`).join(", ")})</span>
              )}
            </div>
          ))}
          {(!eod.leads?.total) && <p className="text-xs text-ink-dim">No leads logged.</p>}
        </div>

        {/* Logistics snapshot */}
        <div className="card p-4">
          <h3 className="text-sm font-bold text-ink mb-3 flex items-center gap-2"><Truck size={14} /> Logistics Snapshot</h3>
          {(eod.logistics?.pickups_total ?? 0) + (eod.logistics?.deliveries_total ?? 0) === 0 ? (
            <p className="text-xs text-ink-dim">None.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <KpiChip label={`Pickups ${eod.logistics?.pickups_total}`} value={`Us ${eod.logistics?.pickups_us} / Not-Us ${eod.logistics?.pickups_not_us}`} color="blue" />
              <KpiChip label={`Deliveries ${eod.logistics?.deliveries_total}`} value={`Us ${eod.logistics?.deliveries_us} / Not-Us ${eod.logistics?.deliveries_not_us}`} color="violet" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Shared small components ───────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, color }: any) {
  const colors: Record<string, string> = {
    green:  "bg-green-500/10 text-green-400",
    amber:  "bg-amber-500/10 text-amber-400",
    blue:   "bg-blue-500/10 text-blue-400",
    violet: "bg-violet-500/10 text-violet-400",
  };
  return (
    <div className="card p-4">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${colors[color]}`}>
        <Icon size={16} />
      </div>
      <p className="text-xs text-ink-dim">{label}</p>
      <p className="text-lg font-bold text-ink mt-0.5">{value}</p>
      {sub && <p className="text-xs text-ink-dim mt-0.5">{sub}</p>}
    </div>
  );
}

function Pill({ label, value, color, swap }: any) {
  const colors: Record<string, string> = {
    green:  "bg-green-500/15 text-green-400",
    blue:   "bg-blue-500/15 text-blue-400",
    cyan:   "bg-cyan-500/15 text-cyan-400",
    amber:  "bg-amber-500/15 text-amber-400",
    violet: "bg-violet-500/15 text-violet-400",
  };
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${colors[color]}`}>
      {swap ? `${label} ${value}` : `${label} ${value}`}
    </span>
  );
}

function EodTable({ title, columns, children }: any) {
  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-2.5 bg-base-hover border-b border-base-border">
        <span className="text-sm font-semibold text-ink">{title}</span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-ink-dim border-b border-base-border">
            {columns.map((c: string) => (
              <th key={c} className={`px-4 py-2 text-left font-medium ${c === "Amount" ? "text-right" : ""}`}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
