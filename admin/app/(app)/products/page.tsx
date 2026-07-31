"use client";

import { useEffect, useState } from "react";
import { Search, Plus, Pencil, Trash2, ImageOff } from "lucide-react";
import { adminApi, formatKES } from "@/lib/api";
import { Product } from "@/lib/types";

const emptyDraft: Partial<Product> = {
  title: "", price: 0, stock_quantity: 0, low_stock_threshold: 5, category: "", brand: "",
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Product>>(emptyDraft);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  const totalPages = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
  const visible = products.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function load() {
    setLoading(true);
    adminApi.getProducts(search || undefined, activeOnly).then((res: any) => { setProducts(res.data ?? []); setPage(1); }).finally(() => setLoading(false));
  }

  useEffect(load, [activeOnly]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    load();
  }

  function startCreate() {
    setDraft(emptyDraft);
    setEditing(null);
    setShowForm(true);
  }

  function startEdit(p: Product) {
    setDraft(p);
    setEditing(p.id);
    setShowForm(true);
  }

  async function saveDraft() {
    if (editing) {
      await adminApi.updateProduct(editing, draft);
    } else {
      await adminApi.createProduct(draft);
    }
    setShowForm(false);
    load();
  }

  async function remove(id: string) {
    await adminApi.deleteProduct(id);
    load();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <form onSubmit={handleSearch} className="relative max-w-xs w-full">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-dim" />
          <input className="input-field pl-9" placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </form>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-ink-muted cursor-pointer">
            <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} />
            Active only
          </label>
          <button onClick={startCreate} className="btn-primary"><Plus size={15} /> Add product</button>
        </div>
      </div>

      {showForm && (
        <div className="card p-5 space-y-4">
          <h3 className="font-display font-semibold text-ink">{editing ? "Edit product" : "New product"}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input className="input-field" placeholder="Title" value={draft.title ?? ""} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} />
            <input className="input-field" placeholder="Brand" value={draft.brand ?? ""} onChange={(e) => setDraft((d) => ({ ...d, brand: e.target.value }))} />
            <input className="input-field" placeholder="Category" value={draft.category ?? ""} onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))} />
            <input className="input-field" type="number" placeholder="Price (KES)" value={draft.price ?? ""} onChange={(e) => setDraft((d) => ({ ...d, price: Number(e.target.value) }))} />
            <input className="input-field" type="number" placeholder="Stock quantity" value={draft.stock_quantity ?? ""} onChange={(e) => setDraft((d) => ({ ...d, stock_quantity: Number(e.target.value) }))} />
            <input className="input-field" type="number" placeholder="Low stock threshold" value={draft.low_stock_threshold ?? ""} onChange={(e) => setDraft((d) => ({ ...d, low_stock_threshold: Number(e.target.value) }))} />
            <input className="input-field md:col-span-3" placeholder="Image URL" value={draft.image_url ?? ""} onChange={(e) => setDraft((d) => ({ ...d, image_url: e.target.value }))} />
            <textarea className="input-field md:col-span-3" placeholder="Description" rows={3} value={draft.description ?? ""} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} />
          </div>
          <div className="flex gap-2">
            <button onClick={saveDraft} className="btn-primary">Save product</button>
            <button onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
          </div>
        </div>
      )}

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
            {!loading && products.length === 0 && <tr><td className="td text-ink-dim" colSpan={7}>No products found.</td></tr>}
            {visible.map((p) => (
              <tr key={p.id} className="hover:bg-base-hover/40">
                <td className="td">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-base-hover flex items-center justify-center overflow-hidden shrink-0">
                      {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : <ImageOff size={14} className="text-ink-dim" />}
                    </div>
                    {p.title}
                  </div>
                </td>
                <td className="td">{p.brand}</td>
                <td className="td">{p.category}</td>
                <td className="td tabular">{formatKES(p.price)}</td>
                <td className={`td tabular ${p.stock_quantity <= p.low_stock_threshold ? "text-bad font-medium" : ""}`}>{p.stock_quantity}</td>
                <td className="td">
                  <span className={`pill ${p.is_active ? "bg-good/15 text-good" : "bg-ink-dim/15 text-ink-dim"}`}>
                    {p.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="td">
                  <div className="flex items-center gap-2">
                    <button onClick={() => startEdit(p)} className="text-ink-muted hover:text-volt"><Pencil size={15} /></button>
                    <button onClick={() => remove(p.id)} className="text-ink-muted hover:text-bad"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-ink-muted">
          <span>{products.length} products · page {page} of {totalPages}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((p) => p - 1)} disabled={page === 1} className="btn-ghost px-3 py-1.5 disabled:opacity-40">Prev</button>
            <button onClick={() => setPage((p) => p + 1)} disabled={page === totalPages} className="btn-ghost px-3 py-1.5 disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
