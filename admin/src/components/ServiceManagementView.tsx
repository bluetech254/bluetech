import React, { useState, useMemo } from 'react';
import { 
  Plus, Edit, Trash2, Search, Filter, Wrench, Tag, 
  DollarSign, Clock, Save, X, CheckCircle, AlertCircle,
  Eye, EyeOff, Grid, List, FolderPlus, Layers, Shield
} from 'lucide-react';
import { RepairService } from '../types';
import { formatKES } from '../lib/utils';
import { databaseService } from '../lib/supabase';

interface ServiceManagementViewProps {
  services: RepairService[];
  onServicesUpdated: () => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function ServiceManagementView({ 
  services, 
  onServicesUpdated, 
  onShowToast 
}: ServiceManagementViewProps) {
  
  // View states
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [activeTab, setActiveTab] = useState<'services' | 'categories'>('services');
  
  // Filter & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  
  // Service Modal
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<RepairService | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Service Form Fields
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formPrice, setFormPrice] = useState<number>(0);
  const [formDuration, setFormDuration] = useState('');
  const [formWarranty, setFormWarranty] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  
  // Category Modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryOld, setEditingCategoryOld] = useState('');
  const [editingCategoryNew, setEditingCategoryNew] = useState('');

  // Extract categories from services
  const categories = useMemo(() => {
    const cats = new Set<string>();
    services.forEach(s => {
      if (s.service_category) cats.add(s.service_category);
    });
    return Array.from(cats).sort();
  }, [services]);

  // Filtered services
  const filteredServices = useMemo(() => {
    return services.filter(s => {
      // Search filter
      if (searchTerm && !s.service_name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      // Category filter
      if (selectedCategory !== 'all' && s.service_category !== selectedCategory) {
        return false;
      }
      
      // Active filter
      if (showActiveOnly && !s.is_active) return false;
      
      return true;
    });
  }, [services, searchTerm, selectedCategory, showActiveOnly]);

  // Category Stats
  const categoryStats = useMemo(() => {
    const stats: Record<string, { count: number; avgPrice: number; totalPrice: number }> = {};
    services.forEach(s => {
      const cat = s.service_category || 'Uncategorized';
      if (!stats[cat]) stats[cat] = { count: 0, avgPrice: 0, totalPrice: 0 };
      stats[cat].count++;
      stats[cat].totalPrice += s.base_price;
    });
    // Calculate averages
    Object.keys(stats).forEach(cat => {
      stats[cat].avgPrice = stats[cat].totalPrice / stats[cat].count;
    });
    return stats;
  }, [services]);

  // Open add service modal
  const openAddService = () => {
    setEditingService(null);
    setFormName('');
    setFormCategory('');
    setFormPrice(0);
    setFormDuration('');
    setFormWarranty('');
    setFormIsActive(true);
    setIsServiceModalOpen(true);
  };

  // Open edit service modal
  const openEditService = (service: RepairService) => {
    setEditingService(service);
    setFormName(service.service_name);
    setFormCategory(service.service_category);
    setFormPrice(service.base_price);
    setFormDuration(service.duration);
    setFormWarranty(service.warranty);
    setFormIsActive(service.is_active);
    setIsServiceModalOpen(true);
  };

  // Save service
  const handleSaveService = async () => {
    if (!formName.trim()) {
      onShowToast('Service name is required', 'error');
      return;
    }
    
    if (formPrice <= 0) {
      onShowToast('Price must be greater than 0', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const serviceData: Partial<RepairService> = {
        service_name: formName,
        service_category: formCategory,
        base_price: formPrice,
        duration: formDuration,
        warranty: formWarranty,
        is_active: formIsActive
      };

      if (editingService) {
        serviceData.id = editingService.id;
      }

      await databaseService.saveRepairService(serviceData);
      onShowToast(
        editingService ? 'Service updated successfully' : 'Service added successfully',
        'success'
      );
      setIsServiceModalOpen(false);
      onServicesUpdated();
    } catch (error) {
      onShowToast('Failed to save service', 'error');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete service
  const handleDeleteService = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return;
    
    try {
      await databaseService.deleteRepairService(id);
      onShowToast('Service deleted successfully', 'success');
      onServicesUpdated();
    } catch (error) {
      onShowToast('Failed to delete service', 'error');
      console.error(error);
    }
  };

  // Toggle service active status
  const toggleServiceActive = async (service: RepairService) => {
    try {
      await databaseService.saveRepairService({
        id: service.id,
        is_active: !service.is_active
      });
      onShowToast(
        service.is_active ? 'Service deactivated' : 'Service activated',
        'success'
      );
      onServicesUpdated();
    } catch (error) {
      onShowToast('Failed to update service status', 'error');
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
    
    onShowToast('Category added! Create services with this category.', 'success');
    setNewCategoryName('');
    setIsCategoryModalOpen(false);
  };

  // Rename category
  const handleRenameCategory = async (oldName: string, newName: string) => {
    if (!newName.trim()) return;
    
    try {
      const servicesToUpdate = services.filter(s => s.service_category === oldName);

      for (const service of servicesToUpdate) {
        await databaseService.saveRepairService({
          id: service.id,
          service_category: newName
        });
      }

      onShowToast(`Category renamed: ${oldName} → ${newName}`, 'success');
      setEditingCategoryOld('');
      setEditingCategoryNew('');
      onServicesUpdated();
    } catch (error) {
      onShowToast('Failed to rename category', 'error');
    }
  };

  // Delete category
  const handleDeleteCategory = async (categoryName: string) => {
    const count = categoryStats[categoryName]?.count || 0;
    if (!confirm(`Delete category "${categoryName}"? ${count} service(s) will be uncategorized.`)) {
      return;
    }
    
    try {
      const servicesToUpdate = services.filter(s => s.service_category === categoryName);

      for (const service of servicesToUpdate) {
        await databaseService.saveRepairService({
          id: service.id,
          service_category: ''
        });
      }

      onShowToast(`Category "${categoryName}" deleted`, 'success');
      onServicesUpdated();
    } catch (error) {
      onShowToast('Failed to delete category', 'error');
    }
  };

  return (
    <div className="h-full bg-gradient-to-br from-slate-50 to-purple-50 p-6">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Wrench className="h-6 w-6 text-purple-600" />
            Service Management
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Manage repair services, categories, pricing, and warranties
          </p>
        </div>
        
        <button
          onClick={openAddService}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold shadow-lg transition-all"
        >
          <Plus className="h-4 w-4" />
          Add Service
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-semibold">Total Services</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{services.length}</p>
            </div>
            <Wrench className="h-8 w-8 text-purple-500 opacity-50" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-semibold">Active Services</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {services.filter(s => s.is_active).length}
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
              <p className="text-xs text-slate-500 font-semibold">Avg Service Price</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">
                {services.length > 0 
                  ? formatKES(services.reduce((sum, s) => sum + s.base_price, 0) / services.length)
                  : formatKES(0)
                }
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
            onClick={() => setActiveTab('services')}
            className={`flex-1 px-6 py-3 text-sm font-semibold transition-all ${
              activeTab === 'services'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Wrench className="h-4 w-4 inline mr-2" />
            Services ({filteredServices.length})
          </button>
          
          <button
            onClick={() => setActiveTab('categories')}
            className={`flex-1 px-6 py-3 text-sm font-semibold transition-all ${
              activeTab === 'categories'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Tag className="h-4 w-4 inline mr-2" />
            Categories ({categories.length})
          </button>
        </div>
      </div>

      {/* Services Tab */}
      {activeTab === 'services' && (
        <>
          {/* Filters */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search services..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Category Filter */}
              <div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <List className="h-4 w-4 inline" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    viewMode === 'grid'
                      ? 'bg-purple-600 text-white'
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
                {filteredServices.length === 0 ? (
                  <div className="py-16 text-center text-slate-400">
                    <Wrench className="h-12 w-12 mx-auto text-slate-200 mb-3" />
                    <p className="text-sm font-semibold text-slate-800">No services found</p>
                    <p className="text-xs text-slate-500 mt-1">Try adjusting your filters or add a new service</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                        <th className="py-4 px-4">Service Name</th>
                        <th className="py-4 px-4">Category</th>
                        <th className="py-4 px-4">Price</th>
                        <th className="py-4 px-4">Duration</th>
                        <th className="py-4 px-4">Warranty</th>
                        <th className="py-4 px-4">Status</th>
                        <th className="py-4 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredServices.map((service) => (
                        <tr key={service.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                                <Wrench className="h-5 w-5 text-purple-600" />
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900">{service.service_name}</p>
                                <p className="text-slate-500 text-[10px]">ID: {service.id.slice(0, 8)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-lg text-[10px] font-semibold">
                              {service.service_category || 'N/A'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900">{formatKES(service.base_price)}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-semibold flex items-center gap-1 w-fit">
                              <Clock className="h-3 w-3" />
                              {service.duration}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-lg text-[10px] font-semibold flex items-center gap-1 w-fit">
                              <Shield className="h-3 w-3" />
                              {service.warranty}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {service.is_active ? (
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
                                onClick={() => toggleServiceActive(service)}
                                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                                title={service.is_active ? 'Deactivate' : 'Activate'}
                              >
                                {service.is_active ? (
                                  <EyeOff className="h-4 w-4 text-slate-600" />
                                ) : (
                                  <Eye className="h-4 w-4 text-slate-600" />
                                )}
                              </button>
                              <button
                                onClick={() => openEditService(service)}
                                className="p-1.5 hover:bg-purple-50 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit className="h-4 w-4 text-purple-600" />
                              </button>
                              <button
                                onClick={() => handleDeleteService(service.id)}
                                className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* Grid View */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredServices.map((service) => (
                <div key={service.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 text-white">
                    <div className="flex items-start justify-between mb-2">
                      <Wrench className="h-8 w-8" />
                      {service.is_active ? (
                        <span className="px-2 py-1 bg-white bg-opacity-20 rounded-lg text-[10px] font-semibold">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-black bg-opacity-20 rounded-lg text-[10px] font-semibold">
                          Inactive
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-sm mb-1">{service.service_name}</h3>
                    <p className="text-xs opacity-90">{service.service_category || 'Uncategorized'}</p>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <div className="mb-3">
                      <span className="text-2xl font-bold text-purple-600">{formatKES(service.base_price)}</span>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-xs">
                        <Clock className="h-4 w-4 text-blue-500" />
                        <span className="text-slate-600">{service.duration}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <Shield className="h-4 w-4 text-orange-500" />
                        <span className="text-slate-600">{service.warranty}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditService(service)}
                        className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold transition-colors"
                      >
                        <Edit className="h-3 w-3 inline mr-1" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteService(service.id)}
                        className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          
          {/* Add Category Button */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900">Service Categories</h2>
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
              <p className="text-xs text-slate-500 mt-1">Add categories to organize your services</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => {
                const stats = categoryStats[category] || { count: 0, avgPrice: 0, totalPrice: 0 };
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
                            <p className="text-xs text-slate-600">{stats.count} service{stats.count !== 1 ? 's' : ''}</p>
                          </div>
                          <Tag className="h-5 w-5 text-purple-500" />
                        </div>

                        <div className="bg-white rounded-lg p-3 mb-3 space-y-2">
                          <div>
                            <p className="text-xs text-slate-500">Average Price</p>
                            <p className="text-lg font-bold text-purple-600">{formatKES(stats.avgPrice)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Total Revenue Potential</p>
                            <p className="text-sm font-semibold text-slate-700">{formatKES(stats.totalPrice)}</p>
                          </div>
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

      {/* Service Modal */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-xl font-bold text-white">
                {editingService ? 'Edit Service' : 'Add New Service'}
              </h2>
              <button
                onClick={() => setIsServiceModalOpen(false)}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              
              {/* Service Name */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Service Name *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., iPhone Screen Replacement"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Category
                </label>
                <input
                  type="text"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  placeholder="e.g., Phone Repair"
                  list="service-categories-list"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <datalist id="service-categories-list">
                  {categories.map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>

              {/* Price */}
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
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Duration and Warranty */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Duration
                  </label>
                  <input
                    type="text"
                    value={formDuration}
                    onChange={(e) => setFormDuration(e.target.value)}
                    placeholder="e.g., 2 Hours"
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Warranty
                  </label>
                  <input
                    type="text"
                    value={formWarranty}
                    onChange={(e) => setFormWarranty(e.target.value)}
                    placeholder="e.g., 90 Days"
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                    Service is active and available for booking
                  </span>
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3 rounded-b-2xl">
              <button
                onClick={() => setIsServiceModalOpen(false)}
                disabled={isSaving}
                className="px-6 py-3 bg-white border border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveService}
                disabled={isSaving}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-semibold shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {editingService ? 'Update Service' : 'Add Service'}
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
                placeholder="e.g., Laptop Repair, Tablet Service"
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') handleAddCategory();
                }}
                autoFocus
              />
              
              <p className="text-xs text-slate-500 mt-2">
                Categories help organize your services and make them easier to find
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
