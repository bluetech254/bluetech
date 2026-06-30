import React, { useState } from 'react';
import { Plus, Edit, Trash2, Check, X, Wrench, Save, RefreshCw, Layers } from 'lucide-react';
import { RepairService } from '../types';
import { formatKES } from '../lib/utils';
import { databaseService } from '../lib/supabase';

interface RepairServicesViewProps {
  services: RepairService[];
  onServicesUpdated: () => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function RepairServicesView({ services, onServicesUpdated, onShowToast }: RepairServicesViewProps) {
  
  // Add modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newSrvName, setNewSrvName] = useState('');
  const [newSrvCategory, setNewSrvCategory] = useState('Smartphone');
  const [newSrvPrice, setNewSrvPrice] = useState<number>(0);
  const [newSrvDuration, setNewSrvDuration] = useState('1 hour');
  const [newSrvWarranty, setNewSrvWarranty] = useState('3 months');
  const [isSaving, setIsSaving] = useState(false);

  // Row inline edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editDuration, setEditDuration] = useState('');
  const [editWarranty, setEditWarranty] = useState('');

  // Trigger inline edit
  const startInlineEdit = (srv: RepairService) => {
    setEditingId(srv.id);
    setEditName(srv.service_name);
    setEditCategory(srv.service_category);
    setEditPrice(srv.base_price);
    setEditDuration(srv.duration);
    setEditWarranty(srv.warranty);
  };

  // Save inline edits
  const saveInlineEdit = async (id: string) => {
    if (!editName.trim() || !editCategory.trim()) {
      onShowToast('Service name and category are required.', 'error');
      return;
    }
    try {
      await databaseService.saveRepairService({
        id,
        service_name: editName.trim(),
        service_category: editCategory.trim(),
        base_price: Number(editPrice),
        duration: editDuration.trim() || '1 hour',
        warranty: editWarranty.trim() || '3 months'
      });
      setEditingId(null);
      onServicesUpdated();
      onShowToast('Repair service catalog updated!', 'success');
    } catch (e) {
      onShowToast('Failed to update service.', 'error');
    }
  };

  // Save new service
  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSrvName.trim()) {
      onShowToast('Service Name is required.', 'error');
      return;
    }
    setIsSaving(true);
    try {
      await databaseService.saveRepairService({
        service_name: newSrvName.trim(),
        service_category: newSrvCategory,
        base_price: Number(newSrvPrice),
        duration: newSrvDuration.trim() || '1 hour',
        warranty: newSrvWarranty.trim() || '3 months'
      });
      setIsAddOpen(false);
      setNewSrvName('');
      setNewSrvCategory('Smartphone');
      setNewSrvPrice(0);
      setNewSrvDuration('1 hour');
      setNewSrvWarranty('3 months');
      onServicesUpdated();
      onShowToast('New repair service category registered!', 'success');
    } catch (e) {
      onShowToast('Failed to add repair service.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete service
  const handleDeleteService = async (id: string, name: string) => {
    try {
      await databaseService.deleteRepairService(id);
      onServicesUpdated();
      onShowToast(`Service "${name}" removed.`, 'success');
    } catch (e) {
      onShowToast('Failed to delete service.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-5 rounded-xl">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Wrench className="h-5 w-5 text-indigo-600" />
            Repair Services Rate Sheet
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Publish standard repair jobs, base replacement prices, labor warranty durations, and ETA timelines.
          </p>
        </div>
        
        <button
          onClick={() => setIsAddOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-xs py-2.5 px-4 rounded shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          id="add-repair-service-btn"
        >
          <Plus className="h-4 w-4" />
          Add Standard Service
        </button>
      </div>

      {/* Main Table Editor */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          {services.length === 0 ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center">
              <Wrench className="h-12 w-12 text-slate-200 mb-3" />
              <p className="text-sm font-semibold text-slate-800">No repair services registered</p>
              <p className="text-xs text-slate-500 mt-1">Add repair catalogs to offer easy reference pricing during client intakes.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                  <th className="py-4 px-5">Standard Service Description</th>
                  <th className="py-4 px-5">Device Category</th>
                  <th className="py-4 px-5">Base Intake Price</th>
                  <th className="py-4 px-5">Duration ETA</th>
                  <th className="py-4 px-5">Parts Warranty</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {services.map((srv) => {
                  const isEditing = editingId === srv.id;
                  return (
                    <tr key={srv.id} className="hover:bg-slate-50 transition-colors group">
                      
                      {/* Service Name */}
                      <td className="py-4 px-5">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="bg-white border border-slate-200 focus:border-blue-500 text-xs text-slate-900 rounded p-1.5 outline-none font-semibold w-72 focus:bg-white"
                          />
                        ) : (
                          <span className="font-bold text-slate-900">{srv.service_name}</span>
                        )}
                      </td>

                      {/* Service Category */}
                      <td className="py-4 px-5">
                        {isEditing ? (
                          <select
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            className="bg-white border border-slate-200 focus:border-blue-500 text-xs text-slate-700 rounded p-1.5 outline-none cursor-pointer focus:bg-white"
                          >
                            <option value="Smartphone">Smartphone</option>
                            <option value="Laptop">Laptop</option>
                            <option value="Tablet">Tablet</option>
                            <option value="Gaming Console">Gaming Console</option>
                            <option value="Software">Software</option>
                          </select>
                        ) : (
                          <span className="px-2.5 py-1 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold uppercase text-[10px] tracking-wider">
                            {srv.service_category}
                          </span>
                        )}
                      </td>

                      {/* Base Price */}
                      <td className="py-4 px-5 font-mono">
                        {isEditing ? (
                          <div className="relative w-36">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px]">KES</span>
                            <input
                              type="number"
                              value={editPrice}
                              onChange={(e) => setEditPrice(Number(e.target.value))}
                              className="bg-white border border-slate-200 focus:border-blue-500 text-xs text-slate-900 rounded py-1.5 pl-10 pr-2 outline-none font-bold font-mono w-full focus:bg-white"
                            />
                          </div>
                        ) : (
                          <span className="font-bold text-slate-900 text-sm">{formatKES(srv.base_price)}</span>
                        )}
                      </td>

                      {/* Duration ETA */}
                      <td className="py-4 px-5">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editDuration}
                            onChange={(e) => setEditDuration(e.target.value)}
                            placeholder="e.g. 1 hour, 2 days"
                            className="bg-white border border-slate-200 focus:border-blue-500 text-xs text-slate-900 rounded p-1.5 outline-none w-32 focus:bg-white"
                          />
                        ) : (
                          <span className="text-slate-600">{srv.duration}</span>
                        )}
                      </td>

                      {/* Warranty */}
                      <td className="py-4 px-5">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editWarranty}
                            onChange={(e) => setEditWarranty(e.target.value)}
                            placeholder="e.g. 3 months"
                            className="bg-white border border-slate-200 focus:border-blue-500 text-xs text-slate-900 rounded p-1.5 outline-none w-32 focus:bg-white"
                          />
                        ) : (
                          <span className="text-emerald-700 font-semibold">{srv.warranty}</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => saveInlineEdit(srv.id)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white p-1.5 rounded transition-colors cursor-pointer"
                                title="Save Row Changes"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="bg-slate-200 hover:bg-slate-300 text-slate-600 p-1.5 rounded transition-colors cursor-pointer"
                                title="Cancel"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startInlineEdit(srv)}
                                className="bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800 p-1.5 rounded transition-colors cursor-pointer"
                                title="Edit Rate"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete repair service rate: "${srv.service_name}"?`)) {
                                    handleDeleteService(srv.id, srv.service_name);
                                  }
                                }}
                                className="bg-slate-50 border border-slate-200 hover:border-red-200 hover:bg-red-50 text-slate-500 hover:text-red-600 p-1.5 rounded transition-colors cursor-pointer"
                                title="Delete Rate"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
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

      {/* Add Service Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-white border border-slate-200 text-slate-900 flex flex-col rounded-xl shadow-xl animate-scale-in">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Add Repair Service Category</h3>
              </div>
              <button
                onClick={() => setIsAddOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-900 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddService} className="p-6 space-y-4 text-xs">
              
              <div className="space-y-1.5">
                <label className="text-slate-500 font-semibold uppercase">Standard Job Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Charging Port Repair (USB-C)"
                  value={newSrvName}
                  onChange={(e) => setNewSrvName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg p-2.5 text-slate-900 outline-none font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-slate-500 font-semibold uppercase">Device Category</label>
                  <select
                    value={newSrvCategory}
                    onChange={(e) => setNewSrvCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg p-2.5 text-slate-900 outline-none cursor-pointer"
                  >
                    <option value="Smartphone">Smartphone</option>
                    <option value="Laptop">Laptop</option>
                    <option value="Tablet">Tablet</option>
                    <option value="Gaming Console">Gaming Console</option>
                    <option value="Software">Software</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-500 font-semibold uppercase">Base Intake Rate *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold text-[10px]">KES</span>
                    <input
                      type="number"
                      required
                      min="0"
                      placeholder="3500"
                      value={newSrvPrice || ''}
                      onChange={(e) => setNewSrvPrice(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg py-2.5 pl-11 pr-3 text-slate-900 font-mono font-bold outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-slate-500 font-semibold uppercase">ETA Duration</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1 hour, 3 days"
                    value={newSrvDuration}
                    onChange={(e) => setNewSrvDuration(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg p-2.5 text-slate-900 outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-500 font-semibold uppercase">Labor Warranty Offered</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 3 months, Lifetime"
                    value={newSrvWarranty}
                    onChange={(e) => setNewSrvWarranty(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg p-2.5 text-slate-900 outline-none"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="border-t border-slate-100 pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="bg-white hover:bg-slate-100 text-slate-700 font-semibold py-2 px-4 rounded border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold py-2 px-5 rounded transition-all shadow-sm cursor-pointer"
                >
                  {isSaving ? 'Registering...' : 'Register Repair Service'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
