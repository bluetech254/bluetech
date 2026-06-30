import React, { useState, useMemo } from 'react';
import { Search, Plus, Trash2, Edit, Check, X, Package, Shield, Settings, Eye, RefreshCw, Layers, Sparkles, Image as ImageIcon } from 'lucide-react';
import { Product } from '../types';
import { formatKES } from '../lib/utils';
import { databaseService } from '../lib/supabase';

interface ProductsViewProps {
  products: Product[];
  onProductsUpdated: () => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function ProductsView({ products, onProductsUpdated, onShowToast }: ProductsViewProps) {
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  // Modals
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteConfirmId, setIsDeleteConfirmId] = useState<string | null>(null);
  
  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPrice, setFormPrice] = useState<number>(0);
  const [formStock, setFormStock] = useState<number>(10);
  const [formCategory, setFormCategory] = useState('Smartphones');
  const [formBrand, setFormBrand] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  
  // Specifications State (as a dynamic list of key-value objects)
  const [formSpecs, setFormSpecs] = useState<Array<{ key: string; value: string }>>([]);
  const [newSpecKey, setNewSpecKey] = useState('');
  const [newSpecValue, setNewSpecValue] = useState('');

  const [isSavingProduct, setIsSavingProduct] = useState(false);

  // Auto-derived category list
  const categories = useMemo(() => {
    const cats = products.map(p => p.category || 'Other');
    return ['all', ...Array.from(new Set(cats))];
  }, [products]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = 
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.brand && p.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || (p.category || 'Other') === categoryFilter;
      
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, categoryFilter]);

  // Open Edit Modal
  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setFormTitle(p.title);
    setFormDescription(p.description);
    setFormPrice(p.price);
    setFormStock(p.stock_quantity);
    setFormCategory(p.category || 'Smartphones');
    setFormBrand(p.brand || '');
    setFormImageUrl(p.image_url);
    setFormIsActive(p.is_active);
    
    // Parse specs if JSON string, array, or object
    let parsedSpecs: Array<{ key: string; value: string }> = [];
    if (p.specifications) {
      if (Array.isArray(p.specifications)) {
        parsedSpecs = p.specifications as any[];
      } else if (typeof p.specifications === 'object') {
        parsedSpecs = Object.entries(p.specifications).map(([key, value]) => ({ key, value: String(value) }));
      } else if (typeof p.specifications === 'string') {
        try {
          const obj = JSON.parse(p.specifications);
          if (Array.isArray(obj)) {
            parsedSpecs = obj;
          } else {
            parsedSpecs = Object.entries(obj).map(([key, value]) => ({ key, value: String(value) }));
          }
        } catch (e) {
          parsedSpecs = [{ key: 'Info', value: p.specifications }];
        }
      }
    }
    setFormSpecs(parsedSpecs);
    setIsAddModalOpen(true);
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormTitle('');
    setFormDescription('');
    setFormPrice(0);
    setFormStock(10);
    setFormCategory('Smartphones');
    setFormBrand('');
    setFormImageUrl('https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80');
    setFormIsActive(true);
    setFormSpecs([
      { key: 'Brand', value: '' },
      { key: 'Model', value: '' },
      { key: 'Warranty', value: '1 Year' }
    ]);
    setIsAddModalOpen(true);
  };

  // Specs helper
  const handleAddSpec = () => {
    if (!newSpecKey.trim() || !newSpecValue.trim()) return;
    setFormSpecs([...formSpecs, { key: newSpecKey.trim(), value: newSpecValue.trim() }]);
    setNewSpecKey('');
    setNewSpecValue('');
  };

  const handleRemoveSpec = (idx: number) => {
    setFormSpecs(formSpecs.filter((_, i) => i !== idx));
  };

  // Smart Unsplash Image Suggester
  const handleSuggestImage = () => {
    const urls: Record<string, string> = {
      Smartphones: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80',
      Laptops: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=600&q=80',
      Audio: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=600&q=80',
      Tablets: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=600&q=80',
      Accessories: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=600&q=80'
    };
    const suggested = urls[formCategory] || 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=600&q=80';
    setFormImageUrl(suggested);
    onShowToast(`Applied high-res standard catalog image for category: ${formCategory}`, 'info');
  };

  // Form Submit (Save / Create)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDescription.trim()) {
      onShowToast('Please fill out all required fields.', 'error');
      return;
    }

    setIsSavingProduct(true);
    try {
      const payload: Partial<Product> = {
        title: formTitle.trim(),
        description: formDescription.trim(),
        price: Number(formPrice),
        stock_quantity: Number(formStock),
        category: formCategory,
        brand: formBrand.trim(),
        image_url: formImageUrl.trim() || 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?auto=format&fit=crop&w=600&q=80',
        specifications: formSpecs,
        is_active: formIsActive
      };

      if (editingProduct) {
        payload.id = editingProduct.id;
      }

      await databaseService.saveProduct(payload);
      onProductsUpdated();
      setIsAddModalOpen(false);
      onShowToast(editingProduct ? 'Product edited successfully!' : 'New product catalog added!', 'success');
    } catch (err) {
      onShowToast('Failed to save product.', 'error');
    } finally {
      setIsSavingProduct(false);
    }
  };

  // Toggle Is Active directly
  const handleToggleActive = async (product: Product) => {
    try {
      const updated = { ...product, is_active: !product.is_active };
      await databaseService.saveProduct(updated);
      onProductsUpdated();
      onShowToast(`Product "${product.title}" is now ${updated.is_active ? 'Active' : 'Inactive'}`, 'success');
    } catch (e) {
      onShowToast('Failed to change active status.', 'error');
    }
  };

  // Delete product
  const handleDeleteProduct = async (id: string) => {
    try {
      await databaseService.deleteProduct(id);
      setIsDeleteConfirmId(null);
      onProductsUpdated();
      onShowToast('Product deleted from e-commerce catalog.', 'success');
    } catch (e) {
      onShowToast('Failed to delete product.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-5 rounded-xl">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            E-Commerce Products Catalog
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Publish products to the e-commerce storefront, control live pricing, inventory count levels, and hardware specs.
          </p>
        </div>
        
        <button
          onClick={handleOpenAdd}
          className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs py-2.5 px-4 rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          id="add-new-product-btn"
        >
          <Plus className="h-4 w-4" />
          Add New Product
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-3">
        
        {/* Search */}
        <div className="relative col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search products by name, specifications, category, brand..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 text-xs text-slate-900 placeholder-slate-400 rounded-lg py-2.5 pl-9 pr-4 outline-none transition-colors focus:bg-white"
            id="product-search-input"
          />
        </div>

        {/* Category filter */}
        <div className="relative">
          <Layers className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 text-xs text-slate-700 rounded-lg py-2.5 pl-9 pr-3 outline-none transition-colors appearance-none cursor-pointer focus:bg-white"
            id="product-category-filter"
          >
            <option value="all">All Store Categories</option>
            {categories.filter(c => c !== 'all').map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

      </div>

      {/* Grid of Product Cards */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white border border-slate-200 py-16 text-center text-slate-400 flex flex-col items-center justify-center rounded-xl shadow-sm">
          <Package className="h-12 w-12 text-slate-200 mb-3" />
          <p className="text-sm font-semibold text-slate-800">No products matching filters</p>
          <p className="text-xs text-slate-500 mt-1">Add a new item to get started or adjust filter parameters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredProducts.map((p) => (
            <div 
              key={p.id} 
              className={`bg-white border rounded-xl overflow-hidden flex flex-col group transition-all duration-300 ${
                p.is_active 
                  ? 'border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md' 
                  : 'border-slate-200 opacity-65 grayscale hover:grayscale-0 transition-all'
              }`}
            >
              
              {/* Product Thumbnail Banner */}
              <div className="relative h-44 bg-slate-50 overflow-hidden shrink-0 flex items-center justify-center">
                <img 
                  src={p.image_url} 
                  alt={p.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                
                {/* Stock Tag Indicator */}
                <div className={`absolute top-3 left-3 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  p.stock_quantity <= 0 
                    ? 'bg-red-600 text-white' 
                    : p.stock_quantity <= 5 
                      ? 'bg-amber-500 text-slate-950' 
                      : 'bg-slate-900/80 backdrop-blur-md text-white border border-slate-800'
                }`}>
                  {p.stock_quantity <= 0 ? 'Out Of Stock' : `Stock: ${p.stock_quantity} units`}
                </div>

                {/* Brand watermark */}
                {p.brand && (
                  <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-blue-600/90 text-white text-[9px] font-bold uppercase tracking-wider font-mono">
                    {p.brand}
                  </div>
                )}
              </div>

              {/* Card content */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                
                {/* Info block */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-blue-600 font-bold uppercase tracking-widest font-mono">
                    {p.category || 'SMARTPHONES'}
                  </span>
                  <h3 className="text-sm font-semibold text-slate-900 leading-snug line-clamp-2 h-10 group-hover:text-blue-600 transition-colors">
                    {p.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                    {p.description}
                  </p>
                </div>

                {/* Pricing Block */}
                <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] text-slate-400 block">Unit Selling Price</span>
                    <span className="text-base font-bold text-slate-900 font-mono">{formatKES(p.price)}</span>
                  </div>
                  
                  {/* Status toggle inline switcher */}
                  <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(p)}
                      className={`px-2 py-1 rounded text-[9px] font-bold transition-all ${
                        p.is_active 
                          ? 'bg-emerald-600 text-white' 
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Active
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(p)}
                      className={`px-2 py-1 rounded text-[9px] font-bold transition-all ${
                        !p.is_active 
                          ? 'bg-red-50 text-red-700' 
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Draft
                    </button>
                  </div>
                </div>

                {/* Card controls */}
                <div className="border-t border-slate-100 pt-3 flex gap-2">
                  <button
                    onClick={() => handleOpenEdit(p)}
                    className="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 font-bold py-1.5 px-3 rounded text-[11px] transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Edit className="h-3 w-3" />
                    Edit Item
                  </button>
                  
                  {isDeleteConfirmId === p.id ? (
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => handleDeleteProduct(p.id)}
                        className="bg-red-600 text-white p-1.5 rounded text-[11px] font-bold hover:bg-red-500 cursor-pointer"
                        title="Confirm Delete"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setIsDeleteConfirmId(null)}
                        className="bg-slate-200 text-slate-600 p-1.5 rounded hover:bg-slate-300 cursor-pointer"
                        title="Cancel"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsDeleteConfirmId(p.id)}
                      className="bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-500 hover:text-red-600 p-2 rounded transition-colors shrink-0 cursor-pointer"
                      title="Delete Product"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

              </div>

            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Form Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-2xl bg-white border border-slate-200 text-slate-900 flex flex-col max-h-[90vh] rounded-xl shadow-xl animate-scale-in">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {editingProduct ? `Edit Product: ${editingProduct.title}` : 'Add New E-Commerce Product'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-900 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
              
              {/* Grid 1: Basic details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-500 font-semibold uppercase">Product Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Google Pixel 8 Pro"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg p-2.5 text-slate-900 outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-500 font-semibold uppercase">Retail Price (KES) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="95000"
                    value={formPrice || ''}
                    onChange={(e) => setFormPrice(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg p-2.5 text-slate-900 font-mono font-bold outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-slate-500 font-semibold uppercase">Product Description *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Provide deep product highlights, features, CPU specifications, bundle packs, and box contents..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg p-3 text-slate-900 outline-none transition-all resize-none"
                />
              </div>

              {/* Stock, Category, Brand */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-500 font-semibold uppercase">Stock Quantity *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formStock}
                    onChange={(e) => setFormStock(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg p-2.5 text-slate-900 font-mono outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-500 font-semibold uppercase">Store Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg p-2.5 text-slate-900 outline-none cursor-pointer"
                  >
                    <option value="Smartphones">Smartphones</option>
                    <option value="Laptops">Laptops</option>
                    <option value="Tablets">Tablets</option>
                    <option value="Audio">Audio</option>
                    <option value="Accessories">Accessories</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-500 font-semibold uppercase">Manufacturer Brand</label>
                  <input
                    type="text"
                    placeholder="e.g. Apple, Samsung, Sony"
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg p-2.5 text-slate-900 outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Image URL with smart selector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-slate-500 font-semibold uppercase">Product Image URL</label>
                  <button
                    type="button"
                    onClick={handleSuggestImage}
                    className="text-[10px] font-semibold text-blue-700 hover:text-blue-800 flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 py-1 px-2.5 rounded border border-blue-200 transition-all"
                  >
                    <Sparkles className="h-3 w-3 text-blue-600" />
                    Auto-Suggest Image
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/photo-..."
                    value={formImageUrl}
                    onChange={(e) => setFormImageUrl(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg p-2.5 text-slate-900 font-mono outline-none transition-colors"
                  />
                </div>
                {formImageUrl && (
                  <div className="mt-2 h-20 w-32 bg-slate-50 rounded-lg border border-slate-200 overflow-hidden flex items-center justify-center">
                    <img src={formImageUrl} alt="Preview" className="h-full w-full object-cover" />
                  </div>
                )}
              </div>

              {/* Dynamic Specifications Editor */}
              <div className="space-y-3 border-t border-slate-100 pt-4">
                <label className="text-slate-500 font-semibold uppercase block">Hardware & Product Specifications</label>
                
                {/* Spec List */}
                {formSpecs.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200 max-h-36 overflow-y-auto">
                    {formSpecs.map((spec, i) => (
                      <div key={i} className="flex items-center justify-between bg-white p-2 rounded border border-slate-100 text-[11px]">
                        <span className="font-semibold text-slate-500">{spec.key}: </span>
                        <div className="flex items-center gap-1.5 truncate pr-2">
                          <span className="text-slate-800 truncate">{spec.value}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSpec(i)}
                            className="text-slate-400 hover:text-red-600 p-0.5 cursor-pointer"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new spec */}
                <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <input
                    type="text"
                    placeholder="Spec Name (e.g. RAM)"
                    value={newSpecKey}
                    onChange={(e) => setNewSpecKey(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 text-[11px] rounded p-1.5 text-slate-900 outline-none focus:border-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Value (e.g. 16GB)"
                    value={newSpecValue}
                    onChange={(e) => setNewSpecValue(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 text-[11px] rounded p-1.5 text-slate-900 outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddSpec}
                    className="bg-blue-50 hover:bg-blue-600 border border-blue-200 hover:text-white text-blue-700 text-xs font-bold px-3 py-1.5 rounded transition-all cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Status active checkbox */}
              <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <input
                  type="checkbox"
                  id="form-is-active"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="form-is-active" className="text-slate-700 font-semibold cursor-pointer select-none">
                  Publish instantly to storefront (Active catalog item)
                </label>
              </div>

              {/* Footer */}
              <div className="border-t border-slate-100 pt-4 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="bg-white hover:bg-slate-50 text-slate-700 font-semibold py-2 px-4 rounded border border-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProduct}
                  className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold py-2 px-5 rounded transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {isSavingProduct ? 'Saving to Catalog...' : 'Save Catalog Item'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
