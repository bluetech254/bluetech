"use client";

import { useMemo, useState, useEffect } from "react";
import Topbar from "@/components/layout/Topbar";
import Drawer from "@/components/ui/Drawer";
import { adminApi } from "@/lib/api";
import { formatKES } from "@/lib/mock-data";
import { Search, LayoutGrid, List, Plus, Package } from "lucide-react";
import clsx from "clsx";

const CATEGORIES = ["Phones", "Laptops", "Tablets", "Accessories", "Audio"];

function mapProduct(p: any) {
  return {
    id: p.id,
    title: p.title ?? p.name,
    description: p.description,
    price: p.price,
    stock: p.stock_quantity ?? p.stock ?? 0,
    lowStockThreshold: p.low_stock_threshold ?? 5,
    category: p.category,
    brand: p.brand,
    imageUrl: p.image_url ?? p.imageUrl ?? "",
    isActive: p.is_active ?? true,
    unitsSold: p.units_sold ?? 0,
    createdAt: p.created_at,
  };
}

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"grid" | "table">("grid");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState<any | "new" | null>(null);

  function load() {
    adminApi.getProducts(undefined, false).then((r) => {
      setProducts((r.data ?? []).map(mapProduct));
      setLoading(false);
    }).catch(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => products.filter((p) => {
    if (!showInactive && !p.isActive) return false;
    if (category !== "all" && p.category !== category) return false;
    if (search && !p.title?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [products, search, category, showInactive]);

  async function saveProduct(form: any) {
    const body = {
      title: form.title, description: form.description, price: form.price,
      stock_quantity: form.stock, low_stock_threshold: form.lowStockThreshold,
      category: form.category, brand: form.brand, is_active: form.isActive,
    };
    if (form.id && editing !== "new") {
      await adminApi.updateProduct(form.id, body);
    } else {
      await adminApi.createProduct(body);
    }
    load();
    setEditing(null);
  }

  async function deactivate(id: string) {
    await adminApi.deleteProduct(id);
    load();
    setEditing(null);
  }

  return (
    <div>
      <Topbar title="Products" subtitle="Catalog of everything for sale in the shop." />

      <div className="card p-4 mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 input-field flex-1 min-w-[200px]">
            <Search size={14} className="text-ink-dim" />
            <input className="bg-transparent outline-none w-full text-sm" placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="input-field min-w-[150px]" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm text-ink-muted select-none cursor-pointer">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="accent-volt" />
            Show inactive
          </label>
          <div className="flex items-center gap-1 bg-base-panel border border-base-border rounded-xl p-1">
            <button onClick={() => setView("grid")} className={clsx("p-1.5 rounded-lg", view === "grid" ? "bg-volt text-white" : "text-ink-muted")}><LayoutGrid size={15} /></button>
            <button onClick={() => setView("table")} className={clsx("p-1.5 rounded-lg", view === "table" ? "bg-volt text-white" : "text-ink-muted")}><List size={15} /></button>
          </div>
          <button className="btn-primary" onClick={() => setEditing("new")}><Plus size={15} /> Add product</button>
        </div>
      </div>

      {loading && <p className="text-ink-dim text-sm">Loading…</p>}

      {!loading && view === "grid" ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((p) => (
            <div key={p.id} onClick={() => setEditing(p)} className="card p-4 cursor-pointer hover:border-volt/50 transition-colors">
              {p.imageUrl ? (
                <img src={p.imageUrl} alt={p.title} className="w-full aspect-square rounded-xl object-cover mb-3" />
              ) : (
                <div className="w-full aspect-square rounded-xl bg-base-hover flex items-center justify-center mb-3 text-ink-dim"><Package size={22} /></div>
              )}
              <div className="text-xs text-ink-dim mb-1">{p.brand} · {p.category}</div>
              <div className="font-medium text-sm truncate mb-1">{p.title}</div>
              <div className="flex items-center justify-between">
                <span className="font-semibold tabular text-sm">{formatKES(p.price)}</span>
                <span className={clsx("pill text-[11px]", p.stock === 0 ? "bg-bad/15 text-bad" : p.stock <= p.lowStockThreshold ? "bg-warn/15 text-warn" : "bg-good/15 text-good")}>{p.stock} in stock</span>
              </div>
              {!p.isActive && <div className="pill bg-ink-dim/20 text-ink-muted mt-2 text-[11px]">Inactive</div>}
            </div>
          ))}
          {filtered.length === 0 && <div className="col-span-full text-center text-ink-dim py-16">No products match these filters.</div>}
        </div>
      ) : !loading ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-base-border">
                <tr><th className="th">Product</th><th className="th">Category</th><th className="th">Price</th><th className="th">Stock</th><th className="th">Status</th><th className="th"></th></tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-base-border/60 hover:bg-base-hover/50 transition-colors">
                    <td className="td"><div className="font-medium">{p.title}</div><div className="text-xs text-ink-dim">{p.brand}</div></td>
                    <td className="td text-ink-muted">{p.category}</td>
                    <td className="td tabular font-semibold">{formatKES(p.price)}</td>
                    <td className="td tabular">{p.stock}</td>
                    <td className="td"><span className={clsx("pill text-[11px]", p.isActive ? "bg-good/15 text-good" : "bg-ink-dim/20 text-ink-muted")}>{p.isActive ? "Active" : "Inactive"}</span></td>
                    <td className="td"><button className="btn-ghost !px-3 !py-1.5 text-xs" onClick={() => setEditing(p)}>Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <Drawer open={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "Add product" : editing?.title ?? ""} subtitle={editing === "new" ? "Create a new catalog item" : "Edit product"}>
        {editing && <ProductForm product={editing === "new" ? null : editing} onSave={saveProduct} onDelete={editing !== "new" ? () => deactivate(editing.id) : undefined} />}
      </Drawer>
    </div>
  );
}

function ProductForm({ product, onSave, onDelete }: { product: any | null; onSave: (p: any) => void; onDelete?: () => void }) {
  const [form, setForm] = useState(product ?? {
    title: "", description: "", price: 0, stock: 0, lowStockThreshold: 5,
    category: "Phones", brand: "", isActive: true,
  });
  return (
    <div className="flex flex-col gap-4">
      <div><label className="text-xs text-ink-dim mb-1.5 block">Title</label><input className="input-field w-full" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
      <div><label className="text-xs text-ink-dim mb-1.5 block">Description</label><textarea className="input-field w-full min-h-[70px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs text-ink-dim mb-1.5 block">Price (KES)</label><input type="number" className="input-field w-full tabular" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></div>
        <div><label className="text-xs text-ink-dim mb-1.5 block">Stock</label><input type="number" className="input-field w-full tabular" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs text-ink-dim mb-1.5 block">Category</label><select className="input-field w-full" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
        <div><label className="text-xs text-ink-dim mb-1.5 block">Brand</label><input className="input-field w-full" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></div>
      </div>
      <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" className="accent-volt" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />Active (visible to customers)</label>
      <div className="flex gap-3 pt-2">
        <button className="btn-primary flex-1" onClick={() => onSave(form)}>Save product</button>
        {onDelete && <button className="btn-ghost !text-bad" onClick={onDelete}>Deactivate</button>}
      </div>
    </div>
  );
}
