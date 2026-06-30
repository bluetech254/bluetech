import React, { useState, useMemo } from 'react';
import { 
  Plus, Edit, Trash2, Search, Filter, Package, Tag, 
  DollarSign, ImageIcon, Save, X, CheckCircle, AlertCircle,
  Eye, EyeOff, Grid, List, FolderPlus, Layers
} from 'lucide-react';
import { Product } from '../types';
import { formatKES } from '../lib/utils';
import { databaseService } from '../lib/supabase';
import ImageUpload from './ImageUpload';

interface ProductManagementViewProps {
  products: Product[];
  onProductsUpdated: () => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function ProductManagementView({ 
  products, 
  onProductsUpdated, 
  onShowToast 
}: ProductManagementViewProps) {
  
  // View states
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [activeTab, setActiveTab] = useState<'products' | 'categories'>('products');
  
  // Filter & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  
  // Product Modal
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Product Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPrice, setFormPrice] = useState<number>(0);
  const [formStock, setFormStock] = useState<number>(0);
  const [formCategory, setFormCategory] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  
  // Category Modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryOld, setEditingCategoryOld] = useState('');
  const [editingCategoryNew, setEditingCategoryNew] = useState('');

  // Extract categories from products
  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => {
      try {
        const specs = typeof p.specifications === 'string' 
          ? JSON.parse(p.specifications) 
          : p.specifications;
        if (specs?.category) cats.add(specs.category);
      } catch (e) {
        // Skip invalid specs
      }
    });
    return Array.from(cats).sort();
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Search filter
      if (searchTerm && !p.title.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      // Category filter
      if (selectedCategory !== 'all') {
        try {
          const specs = typeof p.specifications === 'string' 
            ? JSON.parse(p.specifications) 
            : p.specifications;
          if (specs?.category !== selectedCategory) return false;
        } catch (e) {
          return false;
        }
      }
      
      // Active filter
      if (showActiveOnly && !p.is_active) return false;
      
      return true;
    });
  }, [products, searchTerm, selectedCategory, showActiveOnly]);

  // Category Stats
  const categoryStats = useMemo(() => {
    const stats: Record<string, { count: number; totalValue: number }> = {};
    products.forEach(p => {
      try {
        const specs = typeof p.specifications === 'string' 
          ? JSON.parse(p.specifications) 
          : p.specifications;
        const cat = specs?.category || 'Uncategorized';
        if (!stats[cat]) stats[cat] = { count: 0, totalValue: 0 };
        stats[cat].count++;
        stats[cat].totalValue += (p.price * p.stock_quantity);
      } catch (e) {
        // Skip
      }
    });
    return stats;
  }, [products]);

  // Open add product modal
  const openAddProduct = () => {
    setEditingProduct(null);
    setFormTitle('');
    setFormDescription('');
    setFormPrice(0);
    setFormStock(0);
    setFormCategory('');
    setFormBrand('');
    setFormImageUrl('');
    setFormIsActive(true);
    setIsProductModalOpen(true);
  };

  // Open edit product modal
  const openEditProduct = (product: Product) => {
    setEditingProduct(product);
    setFormTitle(product.title);
    setFormDescription(product.description || '');
    setFormPrice(product.price);
    setFormStock(product.stock_quantity);
    
    try {
      const specs = typeof product.specifications === 'string' 
        ? JSON.parse(product.specifications) 
        : product.specifications;
      setFormCategory(specs?.category || '');
      setFormBrand(specs?.brand || '');
    } catch (e) {
      setFormCategory('');
      setFormBrand('');
    }
    
    setFormImageUrl(product.image_url || '');
    setFormIsActive(product.is_active);
    setIsProductModalOpen(true);
  };

  // Save product
  const handleSaveProduct = async () => {
    if (!formTitle.trim()) {
      onShowToast('Product title is required', 'error');
      return;
    }
    
    if (formPrice <= 0) {
      onShowToast('Price must be greater than 0', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const productData: Partial<Product> = {
        title: formTitle,
        description: formDescription,
        price: formPrice,
        stock_quantity: formStock,
        specifications: JSON.stringify({
          category: formCategory,
          brand: formBrand
        }),
        image_url: formImageUrl,
        is_active: formIsActive
      };

      if (editingProduct) {
        productData.id = editingProduct.id;
      }

      await databaseService.saveProduct(productData);
      onShowToast(
        editingProduct ? 'Product updated successfully' : 'Product added successfully',
        'success'
      );
      setIsProductModalOpen(false);
      onProductsUpdated();
    } catch (error) {
      onShowToast('Failed to save product', 'error');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete product
  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
      await databaseService.deleteProduct(id);
      onShowToast('Product deleted successfully', 'success');
      onProductsUpdated();
    } catch (error) {
      onShowToast('Failed to delete product', 'error');
      console.error(error);
    }
  };

  // Toggle product active status
  const toggleProductActive = async (product: Product) => {
    try {
      await databaseService.saveProduct({
        id: product.id,
        is_active: !product.is_active
      });
      onShowToast(
        product.is_active ? 'Product deactivated' : 'Product activated',
        'success'
      );
      onProductsUpdated();
    } catch (error) {
      onShowToast('Failed to update product status', 'error');
    }
  };

  // Add new category
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      onShowToast('Category name is required', 'error');
      return;
    }
    
    if (categories.includes(newCategoryName)) {
      onShowToast('Category already exists', 'error');
      return;
    }
    
    onShowToast('Category added! Create products with this category.', 'success');
    setNewCategoryName('');
    setIsCategoryModalOpen(false);
  };

  // Rename category
  const handleRenameCategory = async (oldName: string, newName: string) => {
    if (!newName.trim()) return;
    
    try {
      // Update all products with this category
      const productsToUpdate = products.filter(p => {
        try {
          const specs = typeof p.specifications === 'string' 
            ? JSON.parse(p.specifications) 
            : p.specifications;
          return specs?.category === oldName;
        } catch {
          return false;
        }
      });

      for (const product of productsToUpdate) {
        const specs = typeof product.specifications === 'string' 
          ? JSON.parse(product.specifications) 
          : product.specifications;
        specs.category = newName;
        
        await databaseService.saveProduct({
          id: product.id,
          specifications: JSON.stringify(specs)
        });
      }

      onShowToast(`Category renamed: ${oldName} → ${newName}`, 'success');
      setEditingCategoryOld('');
      setEditingCategoryNew('');
      onProductsUpdated();
    } catch (error) {
      onShowToast('Failed to rename category', 'error');
    }
  };

  // Delete category
  const handleDeleteCategory = async (categoryName: string) => {
    const count = categoryStats[categoryName]?.count || 0;
    if (!confirm(`Delete category "${categoryName}"? ${count} product(s) will be uncategorized.`)) {
      return;
    }
    
    try {
      // Remove category from all products
      const productsToUpdate = products.filter(p => {
        try {
          const specs = typeof p.specifications === 'string' 
            ? JSON.parse(p.specifications) 
            : p.specifications;
          return specs?.category === categoryName;
        } catch {
          return false;
        }
      });

      for (const product of productsToUpdate) {
        const specs = typeof product.specifications === 'string' 
          ? JSON.parse(product.specifications) 
          : product.specifications;
        delete specs.category;
        
        await databaseService.saveProduct({
          id: product.id,
          specifications: JSON.stringify(specs)
        });
      }

      onShowToast(`Category "${categoryName}" deleted`, 'success');
      onProductsUpdated();
    } catch (error) {
      onShowToast('Failed to delete category', 'error');
    }
  };

  return (
    <div className="h-full bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="h-6 w-6 text-blue-600" />
            Product Management
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Manage products, categories, inventory, and pricing
          </p>
        </div>
        
        <button
          onClick={openAddProduct}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold shadow-lg transition-all"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-semibold">Total Products</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{products.length}</p>
            </div>
            <Package className="h-8 w-8 text-blue-500 opacity-50" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-semibold">Active Products</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {products.filter(p => p.is_active).length}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500 opacity-50" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-semibold">Categories</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">{categories.length}</p>
            </div>
            <Layers className="h-8 w-8 text-purple-500 opacity-50" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-semibold">Total Stock Value</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">
                {formatKES(products.reduce((sum, p) => sum + (p.price * p.stock_quantity), 0))}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-orange-500 opacity-50" />
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl border border-slate-200 mb-6 overflow-hidden shadow-sm">
        <div className="flex">
          <button
            onClick={() => setActiveTab('products')}
            className={`flex-1 px-6 py-3 text-sm font-semibold transition-all ${
              activeTab === 'products'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Package className="h-4 w-4 inline mr-2" />
            Products ({filteredProducts.length})
          </button>
          
          <button
            onClick={() => setActiveTab('categories')}
            className={`flex-1 px-6 py-3 text-sm font-semibold transition-all ${
              activeTab === 'categories'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Tag className="h-4 w-4 inline mr-2" />
            Categories ({categories.length})
          </button>
        </div>
      </div>

      {/* Products Tab */}
      {activeTab === 'products' && (
        <>
          {/* Filters */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Category Filter */}
              <div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Active Filter */}
              <div>
                <label className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={showActiveOnly}
                    onChange={(e) => setShowActiveOnly(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-slate-600">Show active only</span>
                </label>
              </div>

              {/* View Mode Toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('table')}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    viewMode === 'table'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <List className="h-4 w-4 inline" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    viewMode === 'grid'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Grid className="h-4 w-4 inline" />
                </button>
              </div>
            </div>
          </div>

          {/* Table View */}
          {viewMode === 'table' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                {filteredProducts.length === 0 ? (
                  <div className="py-16 text-center text-slate-400">
                    <Package className="h-12 w-12 mx-auto text-slate-200 mb-3" />
                    <p className="text-sm font-semibold text-slate-800">No products found</p>
                    <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or add a new product</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                        <th className="py-4 px-4">Product</th>
                        <th className="py-4 px-4">Category</th>
                        <th className="py-4 px-4">Brand</th>
                        <th className="py-4 px-4">Price</th>
                        <th className="py-4 px-4">Stock</th>
                        <th className="py-4 px-4">Value</th>
                        <th className="py-4 px-4">Status</th>
                        <th className="py-4 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((product) => {
                        let specs: any = {};
                        try {
                          specs = typeof product.specifications === 'string' 
                            ? JSON.parse(product.specifications) 
                            : product.specifications;
                        } catch (e) {}

                        return (
                          <tr key={product.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                {product.image_url ? (
                                  <img 
                                    src={product.image_url} 
                                    alt={product.title}
                                    className="w-12 h-12 rounded-lg object-cover border border-slate-200"
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center">
                                    <ImageIcon className="h-6 w-6 text-slate-400" />
                                  </div>
                                )}
                                <div className="max-w-xs">
                                  <p className="font-semibold text-slate-900 truncate">{product.title}</p>
                                  <p className="text-slate-500 text-[10px] truncate">{product.description}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-lg text-[10px] font-semibold">
                                {specs?.category || 'N/A'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-600">{specs?.brand || 'N/A'}</td>
                            <td className="py-3 px-4 font-semibold text-slate-900">{formatKES(product.price)}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-lg text-[10px] font-semibold ${
                                product.stock_quantity === 0 
                                  ? 'bg-red-100 text-red-700'
                                  : product.stock_quantity < 5
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-green-100 text-green-700'
                              }`}>
                                {product.stock_quantity} units
                              </span>
                            </td>
                            <td className="py-3 px-4 font-semibold text-blue-600">
                              {formatKES(product.price * product.stock_quantity)}
                            </td>
                            <td className="py-3 px-4">
                              {product.is_active ? (
                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-[10px] font-semibold flex items-center gap-1 w-fit">
                                  <CheckCircle className="h-3 w-3" />
                                  Active
                                </span>
                              ) : (
                                <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-semibold flex items-center gap-1 w-fit">
                                  <AlertCircle className="h-3 w-3" />
                                  Inactive
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => toggleProductActive(product)}
                                  className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                                  title={product.is_active ? 'Deactivate' : 'Activate'}
                                >
                                  {product.is_active ? (
                                    <EyeOff className="h-4 w-4 text-slate-600" />
                                  ) : (
                                    <Eye className="h-4 w-4 text-slate-600" />
                                  )}
                                </button>
                                <button
                                  onClick={() => openEditProduct(product)}
                                  className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Edit"
                                >
                                  <Edit className="h-4 w-4 text-blue-600" />
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(product.id)}
                                  className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* Grid View */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map((product) => {
                let specs: any = {};
                try {
                  specs = typeof product.specifications === 'string' 
                    ? JSON.parse(product.specifications) 
                    : product.specifications;
                } catch (e) {}

                return (
                  <div key={product.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    {/* Image */}
                    <div className="relative">
                      {product.image_url ? (
                        <img 
                          src={product.image_url} 
                          alt={product.title}
                          className="w-full h-48 object-cover"
                        />
                      ) : (
                        <div className="w-full h-48 bg-slate-100 flex items-center justify-center">
                          <ImageIcon className="h-12 w-12 text-slate-400" />
                        </div>
                      )}
                      
                      {/* Status Badge */}
                      <div className="absolute top-2 right-2">
                        {product.is_active ? (
                          <span className="px-2 py-1 bg-green-500 text-white rounded-lg text-[10px] font-semibold">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-slate-500 text-white rounded-lg text-[10px] font-semibold">
                            Inactive
                          </span>
                        )}
                      </div>

                      {/* Category Badge */}
                      <div className="absolute top-2 left-2">
                        <span className="px-2 py-1 bg-purple-500 text-white rounded-lg text-[10px] font-semibold">
                          {specs?.category || 'N/A'}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <h3 className="font-semibold text-slate-900 text-sm mb-1 truncate" title={product.title}>
                        {product.title}
                      </h3>
                      <p className="text-xs text-slate-500 mb-2 line-clamp-2">
                        {product.description}
                      </p>
                      
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-lg font-bold text-blue-600">{formatKES(product.price)}</span>
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-semibold ${
                          product.stock_quantity === 0 
                            ? 'bg-red-100 text-red-700'
                            : product.stock_quantity < 5
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {product.stock_quantity} in stock
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditProduct(product)}
                          className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors"
                        >
                          <Edit className="h-3 w-3 inline mr-1" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          
          {/* Add Category Button */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900">Product Categories</h2>
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-semibold shadow-lg transition-all"
            >
              <FolderPlus className="h-4 w-4" />
              Add Category
            </button>
          </div>

          {/* Categories List */}
          {categories.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Tag className="h-12 w-12 mx-auto text-slate-200 mb-3" />
              <p className="text-sm font-semibold text-slate-800">No categories yet</p>
              <p className="text-xs text-slate-500 mt-1">Add categories to organize your products</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => {
                const stats = categoryStats[category] || { count: 0, totalValue: 0 };
                const isEditing = editingCategoryOld === category;

                return (
                  <div key={category} className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200 p-4">
                    {isEditing ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editingCategoryNew}
                          onChange={(e) => setEditingCategoryNew(e.target.value)}
                          className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="New category name"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRenameCategory(category, editingCategoryNew)}
                            className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold transition-colors"
                          >
                            <Save className="h-3 w-3 inline mr-1" />
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingCategoryOld('');
                              setEditingCategoryNew('');
                            }}
                            className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-bold text-slate-900 text-sm mb-1">{category}</h3>
                            <p className="text-xs text-slate-600">{stats.count} product{stats.count !== 1 ? 's' : ''}</p>
                          </div>
                          <Tag className="h-5 w-5 text-purple-500" />
                        </div>

                        <div className="bg-white rounded-lg p-3 mb-3">
                          <p className="text-xs text-slate-500 mb-1">Total Inventory Value</p>
                          <p className="text-lg font-bold text-purple-600">{formatKES(stats.totalValue)}</p>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingCategoryOld(category);
                              setEditingCategoryNew(category);
                            }}
                            className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold transition-colors"
                          >
                            <Edit className="h-3 w-3 inline mr-1" />
                            Rename
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category)}
                            className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Product Modal */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-slate-600" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              
              {/* Product Title */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Product Title *
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g., iPhone 15 Pro Max"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Product description..."
                  rows={4}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Price and Stock */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Price (KES) *
                  </label>
                  <input
                    type="number"
                    value={formPrice}
                    onChange={(e) => setFormPrice(parseFloat(e.target.value) || 0)}
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    value={formStock}
                    onChange={(e) => setFormStock(parseInt(e.target.value) || 0)}
                    min="0"
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Category and Brand */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Category
                  </label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="e.g., Smartphones"
                    list="categories-list"
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <datalist id="categories-list">
                    {categories.map(cat => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Brand
                  </label>
                  <input
                    type="text"
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    placeholder="e.g., Apple"
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Product Image
                </label>
                <ImageUpload
                  currentImageUrl={formImageUrl}
                  onImageUploaded={(url) => setFormImageUrl(url)}
                  onShowToast={onShowToast}
                />
                
                {/* Manual URL Input (fallback) */}
                <div className="mt-3">
                  <input
                    type="url"
                    value={formImageUrl}
                    onChange={(e) => setFormImageUrl(e.target.value)}
                    placeholder="Or paste image URL here"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Active Status */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="w-5 h-5 rounded"
                  />
                  <span className="text-sm font-semibold text-slate-700">
                    Product is active and visible to customers
                  </span>
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsProductModalOpen(false)}
                disabled={isSaving}
                className="px-6 py-3 bg-white border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProduct}
                disabled={isSaving}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {editingProduct ? 'Update Product' : 'Add Product'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-xl font-bold text-white">Add New Category</h2>
              <button
                onClick={() => {
                  setIsCategoryModalOpen(false);
                  setNewCategoryName('');
                }}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Category Name
              </label>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g., Laptops, Accessories"
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') handleAddCategory();
                }}
                autoFocus
              />
              
              <p className="text-xs text-slate-500 mt-2">
                Categories help organize your products and make them easier to find
              </p>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3 rounded-b-2xl">
              <button
                onClick={() => {
                  setIsCategoryModalOpen(false);
                  setNewCategoryName('');
                }}
                className="px-6 py-3 bg-white border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCategory}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-semibold shadow-lg transition-all flex items-center gap-2"
              >
                <FolderPlus className="h-4 w-4" />
                Add Category
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
