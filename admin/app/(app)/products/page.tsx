"use client";

import { useEffect, useState } from "react";
import { Search, Plus, Pencil, Trash2, ImageOff, X, Loader2 } from "lucide-react";
import { adminApi, formatKES } from "@/lib/api";
import { Product } from "@/lib/types";

const emptyDraft: Partial<Product> = {
  title: "",
  price: 0,
  stock_quantity: 0,
  low_stock_threshold: 5,
  category: "",
  brand: "",
  image_url: "",
  description: "",
  is_active: true,
};

function specsToText(specs?: Record<string, string> | null): string {
  if (!specs) return "";
  return Object.entries(specs)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
}

function textToSpecs(text: string): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const idx = line.indexOf(":");
    if (idx < 1) continue;
    const k = line.slice(0, idx).trim();
    const v = line.slice(idx + 1).trim();
    if (k && v) obj[k] = v;
  }
  return obj;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Product>>(emptyDraft);
  const [specsText, setSpecsText] = useState("");
  const [saving, setSaving] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const totalPages = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
  const visible = products.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function load() {
    setLoading(true);
    adminApi
      .getProducts(search || undefined, activeOnly)
      .then((res: any) => { setProducts(res.data ?? []); setPage(1); })
      .finally(() => setLoading(false));
  }

  useEffect(load, [activeOnly]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    load();
  }

  function startCreate() {
    setDraft(emptyDraft);
    setSpecsText("");
    setEditing(null);
    setShowForm(true);
  }

  function startEdit(p: Product) {
    setDraft({ ...p });
    setSpecsText(specsToText(p.specs));
    setEditing(p.id);
    setShowForm(true);
  }

  async function saveDraft() {
    setSaving(true);
    try {
      const payload: Partial<Product> = {
        ...draft,
        specs: specsText.trim() ? textToSpecs(specsText) : undefined,
      };
      if (editing) {
        await adminApi.updateProduct(editing, payload);
      } else {
        await adminApi.createProduct(payload);
      }
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(p: Product) {
    if (!confirm(`Delete "${p.title}"? This cannot be undone.`)) return;
    await adminApi.deleteProduct(p.id);
    load();
  }

  function set(key: keyof Product, value: unknown) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <form onSubmit={handleSearch} className="relative max-w-xs w-full">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-dim" />
          <input
            className="input-field pl-9"
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-ink-muted cursor-pointer select-none">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
            />
            Active only
          </label>
          <button onClick={startCreate} className="btn-primary">
            <Plus size={15} /> Add product
          </button>
        </div>
      </div>

      {/* Inline form */}
      {showForm && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-semibold text-ink">
              {editing ? "Edit product" : "New product"}
            </h3>
            <button onClick={() => setShowForm(false)} className="p-1 text-ink-muted hover:text-ink">
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Title */}
            <div className="md:col-span-2">
              <label className="text-xs text-ink-dim mb-1 block">Title *</label>
              <input
                className="input-field"
                placeholder="Product title"
                value={draft.title ?? ""}
                onChange={(e) => set("title", e.target.value)}
              />
            </div>

            {/* is_active toggle */}
            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 text-sm text-ink-muted cursor-pointer select-none pb-2.5">
                <input
                  type="checkbox"
                  checked={!!draft.is_active}
                  onChange={(e) => set("is_active", e.target.checked)}
                  className="w-4 h-4"
                />
                <span className={draft.is_active ? "text-good font-medium" : "text-ink-dim"}>
                  {draft.is_active ? "Active (visible in store)" : "Inactive (hidden)"}
                </span>
              </label>
            </div>

            <div>
              <label className="text-xs text-ink-dim mb-1 block">Brand</label>
              <input
                className="input-field"
                placeholder="e.g. Samsung"
                value={draft.brand ?? ""}
                onChange={(e) => set("brand", e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-ink-dim mb-1 block">Category</label>
              <input
                className="input-field"
                placeholder="e.g. Smartphones"
                value={draft.category ?? ""}
                onChange={(e) => set("category", e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-ink-dim mb-1 block">Price (KES) *</label>
              <input
                className="input-field"
                type="number"
                min={0}
                placeholder="0"
                value={draft.price ?? ""}
                onChange={(e) => set("price", Number(e.target.value))}
              />
            </div>
            <div>
              <label className="text-xs text-ink-dim mb-1 block">Stock quantity</label>
              <input
                className="input-field"
                type="number"
                min={0}
                placeholder="0"
                value={draft.stock_quantity ?? ""}
                onChange={(e) => set("stock_quantity", Number(e.target.value))}
              />
            </div>
            <div>
              <label className="text-xs text-ink-dim mb-1 block">Low stock threshold</label>
              <input
                className="input-field"
                type="number"
                min={0}
                placeholder="5"
                value={draft.low_stock_threshold ?? ""}
                onChange={(e) => set("low_stock_threshold", Number(e.target.value))}
              />
            </div>

            {/* Image URL — full width */}
            <div className="md:col-span-3">
              <label className="text-xs text-ink-dim mb-1 block">Image URL</label>
              <input
                className="input-field"
                placeholder="https://…"
                value={draft.image_url ?? ""}
                onChange={(e) => set("image_url", e.target.value)}
              />
            </div>

            {/* Description — full width */}
            <div className="md:col-span-3">
              <label className="text-xs text-ink-dim mb-1 block">Description</label>
              <textarea
                className="input-field"
                placeholder="Product description…"
                rows={3}
                value={draft.description ?? ""}
                onChange={(e) => set("description", e.target.value)}
              />
            </div>

            {/* Specs — full width, key: value per line */}
            <div className="md:col-span-3">
              <label className="text-xs text-ink-dim mb-1 block">
                Specs{" "}
                <span className="text-ink-dim/60 font-normal">(one per line, format: Key: Value)</span>
              </label>
              <textarea
                className="input-field font-mono text-xs"
                placeholder={"RAM: 8GB\nStorage: 256GB\nProcessor: Snapdragon 8 Gen 3"}
                rows={4}
                value={specsText}
                onChange={(e) => setSpecsText(e.target.value)}
              />
            </div>
          </div>

          {/* Image preview */}
          {draft.image_url && (
            <div className="flex items-center gap-3">
              <img
                src={draft.image_url}
                alt="preview"
                className="w-16 h-16 rounded-xl object-cover border border-base-border"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <p className="text-xs text-ink-dim">Image preview</p>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={saveDraft} disabled={saving} className="btn-primary disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              {saving ? "Saving…" : "Save product"}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="th">Product</th>
              <th className="th">Brand</th>
              <th className="th">Category</th>
              <th className="th">Price</th>
              <th className="th">Stock</th>
              <th className="th">Status</th>
              <th className="th w-20"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td className="td text-ink-dim" colSpan={7}>Loading products…</td></tr>}
            {!loading && products.length === 0 && (
              <tr><td className="td text-ink-dim" colSpan={7}>No products found.</td></tr>
            )}
            {visible.map((p) => (
              <tr key={p.id} className="hover:bg-base-hover/40">
                <td className="td">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-base-hover flex items-center justify-center overflow-hidden shrink-0">
                      {p.image_url
                        ? <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                        : <ImageOff size={14} className="text-ink-dim" />}
                    </div>
                    <span className="font-medium">{p.title}</span>
                  </div>
                </td>
                <td className="td text-ink-muted">{p.brand}</td>
                <td className="td text-ink-muted">{p.category}</td>
                <td className="td tabular font-bold">{formatKES(p.price)}</td>
                <td className={`td tabular ${p.stock_quantity <= p.low_stock_threshold ? "text-bad font-bold" : ""}`}>
                  {p.stock_quantity}
                  {p.stock_quantity <= p.low_stock_threshold && (
                    <span className="text-[10px] ml-1 text-bad opacity-70">low</span>
                  )}
                </td>
                <td className="td">
                  <span className={`pill ${p.is_active ? "bg-good/15 text-good" : "bg-ink-dim/15 text-ink-dim"}`}>
                    {p.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="td">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEdit(p)}
                      className="p-1.5 rounded hover:bg-base-hover text-ink-muted hover:text-volt transition-colors"
                      title="Edit"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => remove(p)}
                      className="p-1.5 rounded hover:bg-red-500/10 text-ink-muted hover:text-bad transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-ink-muted">
          <span>{products.length} products · page {page} of {totalPages}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 1}
              className="btn-ghost px-3 py-1.5 disabled:opacity-40"
            >
              Prev
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page === totalPages}
              className="btn-ghost px-3 py-1.5 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
