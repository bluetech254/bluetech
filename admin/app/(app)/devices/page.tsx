"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Loader2, ChevronDown } from "lucide-react";
import { adminApi, formatKES } from "@/lib/api";

type Tab = "brands" | "models" | "pricing";

const DEVICE_TYPES = ["multi", "smartphone", "laptop", "tv", "sound_system", "camera", "small_gadget"];

export default function DevicesPage() {
  const [tab, setTab] = useState<Tab>("brands");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">Device Management</h1>
      </div>

      <div className="flex gap-1.5">
        {(["brands", "models", "pricing"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
              tab === t ? "bg-volt text-white" : "bg-base-panel border border-base-border text-ink-muted hover:text-ink"
            }`}>
            {t === "pricing" ? "Service Pricing" : t}
          </button>
        ))}
      </div>

      {tab === "brands" && <BrandsTab />}
      {tab === "models" && <ModelsTab />}
      {tab === "pricing" && <PricingTab />}
    </div>
  );
}

/* ─── BRANDS ─────────────────────────────────────────────────────────────── */
function BrandsTab() {
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<any | null>(null); // null=closed, {}=new, {...}=edit
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({});

  const load = () => {
    setLoading(true);
    adminApi.getBrands().then((r) => setBrands(r.data)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  function openNew() { setForm({ name: "", device_type: "multi", is_popular: false, is_active: true }); setModal({}); }
  function openEdit(b: any) { setForm({ ...b }); setModal(b); }

  async function save() {
    setSaving(true);
    try {
      if (modal?.id) await adminApi.updateBrand(modal.id, form);
      else await adminApi.createBrand(form);
      setModal(null); load();
    } finally { setSaving(false); }
  }

  async function del(id: string) {
    if (!confirm("Delete this brand? All its models will also be deleted.")) return;
    await adminApi.deleteBrand(id); load();
  }

  return (
    <>
      <div className="flex justify-end">
        <button onClick={openNew} className="btn-primary flex items-center gap-1.5 text-sm">
          <Plus size={15} /> Add Brand
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">Name</th>
              <th className="th">Type</th>
              <th className="th">Origin</th>
              <th className="th">Popular</th>
              <th className="th">Active</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td className="td text-ink-dim" colSpan={6}>Loading…</td></tr>}
            {brands.map((b) => (
              <tr key={b.id} className="hover:bg-base-hover/40">
                <td className="td font-medium">{b.name}</td>
                <td className="td text-xs text-ink-muted capitalize">{b.device_type}</td>
                <td className="td text-xs text-ink-muted">{b.country_of_origin ?? "—"}</td>
                <td className="td">{b.is_popular ? "⭐" : "—"}</td>
                <td className="td">
                  <span className={`text-xs font-semibold ${b.is_active ? "text-green-500" : "text-red-400"}`}>
                    {b.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="td">
                  <div className="flex gap-1.5">
                    <button onClick={() => openEdit(b)} className="p-1.5 rounded hover:bg-base-hover text-ink-muted hover:text-ink"><Pencil size={13} /></button>
                    <button onClick={() => del(b.id)} className="p-1.5 rounded hover:bg-red-500/10 text-ink-muted hover:text-red-500"><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal !== null && (
        <Modal title={modal?.id ? "Edit Brand" : "Add Brand"} onClose={() => setModal(null)}>
          <Field label="Name"><input className="input-field" value={form.name ?? ""} onChange={(e) => setForm((p: any) => ({ ...p, name: e.target.value }))} /></Field>
          <Field label="Device Type">
            <select className="select-field" value={form.device_type ?? "multi"} onChange={(e) => setForm((p: any) => ({ ...p, device_type: e.target.value }))}>
              {DEVICE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Country of Origin"><input className="input-field" value={form.country_of_origin ?? ""} onChange={(e) => setForm((p: any) => ({ ...p, country_of_origin: e.target.value }))} /></Field>
          <Field label="Logo URL"><input className="input-field" value={form.logo_url ?? ""} onChange={(e) => setForm((p: any) => ({ ...p, logo_url: e.target.value }))} /></Field>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-ink-muted cursor-pointer">
              <input type="checkbox" checked={!!form.is_popular} onChange={(e) => setForm((p: any) => ({ ...p, is_popular: e.target.checked }))} /> Popular
            </label>
            <label className="flex items-center gap-2 text-sm text-ink-muted cursor-pointer">
              <input type="checkbox" checked={!!form.is_active} onChange={(e) => setForm((p: any) => ({ ...p, is_active: e.target.checked }))} /> Active
            </label>
          </div>
          <ModalFooter onClose={() => setModal(null)} onSave={save} saving={saving} />
        </Modal>
      )}
    </>
  );
}

/* ─── MODELS ─────────────────────────────────────────────────────────────── */
function ModelsTab() {
  const [brands, setBrands] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [filterBrand, setFilterBrand] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({});

  useEffect(() => { adminApi.getBrands().then((r) => setBrands(r.data)); }, []);

  const load = () => {
    setLoading(true);
    adminApi.getModels(filterBrand || undefined).then((r) => setModels(r.data)).finally(() => setLoading(false));
  };
  useEffect(load, [filterBrand]);

  function openNew() { setForm({ brand_id: filterBrand || brands[0]?.id || "", name: "", device_type: "smartphone", is_active: true }); setModal({}); }
  function openEdit(m: any) { setForm({ ...m }); setModal(m); }

  async function save() {
    setSaving(true);
    try {
      if (modal?.id) await adminApi.updateModel(modal.id, form);
      else await adminApi.createModel(form);
      setModal(null); load();
    } finally { setSaving(false); }
  }

  async function del(id: string) {
    if (!confirm("Delete this model?")) return;
    await adminApi.deleteModel(id); load();
  }

  const brandName = (id: string) => brands.find((b) => b.id === id)?.name ?? "—";

  return (
    <>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <select className="select-field w-48" value={filterBrand} onChange={(e) => setFilterBrand(e.target.value)}>
          <option value="">All Brands</option>
          {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <button onClick={openNew} className="btn-primary flex items-center gap-1.5 text-sm">
          <Plus size={15} /> Add Model
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">Model</th>
              <th className="th">Brand</th>
              <th className="th">Type</th>
              <th className="th">Year</th>
              <th className="th">Active</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td className="td text-ink-dim" colSpan={6}>Loading…</td></tr>}
            {models.map((m) => (
              <tr key={m.id} className="hover:bg-base-hover/40">
                <td className="td font-medium">{m.name}</td>
                <td className="td text-xs text-ink-muted">{m.device_brands?.name ?? brandName(m.brand_id)}</td>
                <td className="td text-xs text-ink-muted capitalize">{m.device_type}</td>
                <td className="td text-xs text-ink-muted">{m.release_year ?? "—"}</td>
                <td className="td">
                  <span className={`text-xs font-semibold ${m.is_active ? "text-green-500" : "text-red-400"}`}>
                    {m.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="td">
                  <div className="flex gap-1.5">
                    <button onClick={() => openEdit(m)} className="p-1.5 rounded hover:bg-base-hover text-ink-muted hover:text-ink"><Pencil size={13} /></button>
                    <button onClick={() => del(m.id)} className="p-1.5 rounded hover:bg-red-500/10 text-ink-muted hover:text-red-500"><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && models.length === 0 && <tr><td className="td text-ink-dim" colSpan={6}>No models found.</td></tr>}
          </tbody>
        </table>
      </div>

      {modal !== null && (
        <Modal title={modal?.id ? "Edit Model" : "Add Model"} onClose={() => setModal(null)}>
          <Field label="Brand">
            <select className="select-field" value={form.brand_id ?? ""} onChange={(e) => setForm((p: any) => ({ ...p, brand_id: e.target.value }))}>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </Field>
          <Field label="Model Name"><input className="input-field" value={form.name ?? ""} onChange={(e) => setForm((p: any) => ({ ...p, name: e.target.value }))} /></Field>
          <Field label="Device Type">
            <select className="select-field" value={form.device_type ?? "smartphone"} onChange={(e) => setForm((p: any) => ({ ...p, device_type: e.target.value }))}>
              {DEVICE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Release Year"><input className="input-field" type="number" value={form.release_year ?? ""} onChange={(e) => setForm((p: any) => ({ ...p, release_year: Number(e.target.value) || undefined }))} /></Field>
          <label className="flex items-center gap-2 text-sm text-ink-muted cursor-pointer">
            <input type="checkbox" checked={!!form.is_active} onChange={(e) => setForm((p: any) => ({ ...p, is_active: e.target.checked }))} /> Active
          </label>
          <ModalFooter onClose={() => setModal(null)} onSave={save} saving={saving} />
        </Modal>
      )}
    </>
  );
}

/* ─── SERVICE PRICING ────────────────────────────────────────────────────── */
function PricingTab() {
  const [pricing, setPricing] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({ service_id: "", brand_id: "", model_id: "", price: "" });

  const load = () => {
    setLoading(true);
    adminApi.getServicePricing().then((r) => setPricing(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    adminApi.getBrands().then((r) => setBrands(r.data));
    adminApi.getServices().then((r: any) => setServices(r.data ?? []));
  }, []);

  useEffect(() => {
    if (form.brand_id) adminApi.getModels(form.brand_id).then((r) => setModels(r.data));
    else setModels([]);
  }, [form.brand_id]);

  async function save() {
    setSaving(true);
    try {
      await adminApi.upsertServicePricing({
        service_id: form.service_id,
        brand_id: form.brand_id || null,
        model_id: form.model_id || null,
        price: Number(form.price),
      });
      setModal(false); load();
    } finally { setSaving(false); }
  }

  async function del(id: string) {
    if (!confirm("Delete this pricing rule?")) return;
    await adminApi.deleteServicePricing(id); load();
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink-dim">Pricing fallback: Model → Brand → Service default</p>
        <button onClick={() => { setForm({ service_id: "", brand_id: "", model_id: "", price: "" }); setModal(true); }}
          className="btn-primary flex items-center gap-1.5 text-sm">
          <Plus size={15} /> Add Pricing Rule
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">Service</th>
              <th className="th">Brand</th>
              <th className="th">Model</th>
              <th className="th">Price</th>
              <th className="th">Level</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td className="td text-ink-dim" colSpan={6}>Loading…</td></tr>}
            {pricing.map((p) => {
              const level = p.model_id ? "model" : p.brand_id ? "brand" : "default";
              return (
                <tr key={p.id} className="hover:bg-base-hover/40">
                  <td className="td text-sm">{p.repair_services?.service_name ?? "—"}</td>
                  <td className="td text-xs text-ink-muted">{p.device_brands?.name ?? "Any"}</td>
                  <td className="td text-xs text-ink-muted">{p.device_models?.name ?? "Any"}</td>
                  <td className="td font-bold tabular">{formatKES(p.price)}</td>
                  <td className="td">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      level === "model" ? "bg-blue-500/10 text-blue-400" :
                      level === "brand" ? "bg-purple-500/10 text-purple-400" :
                      "bg-slate-500/10 text-ink-muted"
                    }`}>{level}</span>
                  </td>
                  <td className="td">
                    <button onClick={() => del(p.id)} className="p-1.5 rounded hover:bg-red-500/10 text-ink-muted hover:text-red-500"><Trash2 size={13} /></button>
                  </td>
                </tr>
              );
            })}
            {!loading && pricing.length === 0 && <tr><td className="td text-ink-dim" colSpan={6}>No pricing rules yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title="Add Pricing Rule" onClose={() => setModal(false)}>
          <Field label="Service">
            <select className="select-field" value={form.service_id} onChange={(e) => setForm((p: any) => ({ ...p, service_id: e.target.value }))}>
              <option value="">Select service…</option>
              {services.map((s: any) => <option key={s.id} value={s.id}>{s.service_name}</option>)}
            </select>
          </Field>
          <Field label="Brand (optional — leave blank for default)">
            <select className="select-field" value={form.brand_id} onChange={(e) => setForm((p: any) => ({ ...p, brand_id: e.target.value, model_id: "" }))}>
              <option value="">Any brand (default)</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </Field>
          {form.brand_id && (
            <Field label="Model (optional)">
              <select className="select-field" value={form.model_id} onChange={(e) => setForm((p: any) => ({ ...p, model_id: e.target.value }))}>
                <option value="">Any model</option>
                {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </Field>
          )}
          <Field label="Price (KES)"><input className="input-field" type="number" value={form.price} onChange={(e) => setForm((p: any) => ({ ...p, price: e.target.value }))} /></Field>
          <ModalFooter onClose={() => setModal(false)} onSave={save} saving={saving} />
        </Modal>
      )}
    </>
  );
}

/* ─── SHARED UI ──────────────────────────────────────────────────────────── */
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-base-panel border border-base-border rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-base-border">
          <h2 className="font-bold text-ink">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-base-hover text-ink-muted"><X size={16} /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-4">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-ink-dim font-medium">{label}</label>
      {children}
    </div>
  );
}

function ModalFooter({ onClose, onSave, saving }: { onClose: () => void; onSave: () => void; saving: boolean }) {
  return (
    <div className="flex gap-2 pt-2">
      <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-base-border text-sm text-ink-muted hover:text-ink">Cancel</button>
      <button onClick={onSave} disabled={saving} className="flex-1 btn-primary text-sm disabled:opacity-50 flex items-center justify-center gap-1.5">
        {saving ? <Loader2 size={14} className="animate-spin" /> : "Save"}
      </button>
    </div>
  );
}
