import React, { useState } from 'react';
import { Plus, Edit, Trash2, Check, X, MapPin, Save, RefreshCw } from 'lucide-react';
import { DeliveryZone } from '../types';
import { formatKES } from '../lib/utils';
import { databaseService } from '../lib/supabase';

interface DeliveryZonesViewProps {
  zones: DeliveryZone[];
  onZonesUpdated: () => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function DeliveryZonesView({ zones, onZonesUpdated, onShowToast }: DeliveryZonesViewProps) {
  
  // Add modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newZoneName, setNewZoneName] = useState('');
  const [newDeliveryFee, setNewDeliveryFee] = useState<number>(0);
  const [newIsActive, setNewIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Row inline edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editFee, setEditFee] = useState<number>(0);

  // Toggle active status instantly
  const handleToggleActive = async (zone: DeliveryZone) => {
    try {
      await databaseService.saveDeliveryZone({
        ...zone,
        is_active: !zone.is_active
      });
      onZonesUpdated();
      onShowToast(`Delivery zone "${zone.zone_name}" is now ${!zone.is_active ? 'Active' : 'Inactive'}`, 'success');
    } catch (e) {
      onShowToast('Failed to update active status.', 'error');
    }
  };

  // Trigger inline edit
  const startInlineEdit = (zone: DeliveryZone) => {
    setEditingId(zone.id);
    setEditName(zone.zone_name);
    setEditFee(zone.delivery_fee);
  };

  // Save inline edits
  const saveInlineEdit = async (id: string) => {
    if (!editName.trim()) {
      onShowToast('Zone name is required.', 'error');
      return;
    }
    try {
      await databaseService.saveDeliveryZone({
        id,
        zone_name: editName.trim(),
        delivery_fee: Number(editFee),
        is_active: zones.find(z => z.id === id)?.is_active ?? true
      });
      setEditingId(null);
      onZonesUpdated();
      onShowToast('Delivery zone updated!', 'success');
    } catch (e) {
      onShowToast('Failed to update zone.', 'error');
    }
  };

  // Save new zone
  const handleAddZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newZoneName.trim()) {
      onShowToast('Zone Name is required.', 'error');
      return;
    }
    setIsSaving(true);
    try {
      await databaseService.saveDeliveryZone({
        zone_name: newZoneName.trim(),
        delivery_fee: Number(newDeliveryFee),
        is_active: newIsActive
      });
      setIsAddOpen(false);
      setNewZoneName('');
      setNewDeliveryFee(0);
      setNewIsActive(true);
      onZonesUpdated();
      onShowToast('New delivery zone saved successfully!', 'success');
    } catch (e) {
      onShowToast('Failed to add delivery zone.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete zone
  const handleDeleteZone = async (id: string, name: string) => {
    try {
      await databaseService.deleteDeliveryZone(id);
      onZonesUpdated();
      onShowToast(`Delivery zone "${name}" deleted.`, 'success');
    } catch (e) {
      onShowToast('Failed to delete delivery zone.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-5 rounded-xl">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-emerald-600" />
            Delivery Zones & Logistics
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure geographic zones, shipping fees, and active routes across Kenya.
          </p>
        </div>
        
        <button
          onClick={() => setIsAddOpen(true)}
          className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs py-2.5 px-4 rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          id="add-delivery-zone-btn"
        >
          <Plus className="h-4 w-4" />
          Add Delivery Zone
        </button>
      </div>

      {/* Main Table Editor */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          {zones.length === 0 ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center">
              <MapPin className="h-12 w-12 text-slate-200 mb-3" />
              <p className="text-sm font-semibold text-slate-800">No delivery zones found</p>
              <p className="text-xs text-slate-500 mt-1">Add geographic sectors to configure shipping fees.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                  <th className="py-4 px-5">Geographic Zone Name</th>
                  <th className="py-4 px-5">Delivery Fee (KES)</th>
                  <th className="py-4 px-5">Active Status</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {zones.map((zone) => {
                  const isEditing = editingId === zone.id;
                  return (
                    <tr key={zone.id} className="hover:bg-slate-50 transition-colors group">
                      
                      {/* Zone Name */}
                      <td className="py-4 px-5">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="bg-white border border-slate-200 focus:border-blue-500 text-xs text-slate-900 rounded p-1.5 outline-none font-semibold w-64 focus:bg-white"
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{zone.zone_name}</span>
                            <span className="text-[9px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">(double click to edit)</span>
                          </div>
                        )}
                      </td>

                      {/* Delivery Fee */}
                      <td className="py-4 px-5 font-mono">
                        {isEditing ? (
                          <div className="relative w-40">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px]">KES</span>
                            <input
                              type="number"
                              value={editFee}
                              onChange={(e) => setEditFee(Number(e.target.value))}
                              className="bg-white border border-slate-200 focus:border-blue-500 text-xs text-slate-900 rounded py-1.5 pl-10 pr-2 outline-none font-bold font-mono w-full focus:bg-white"
                            />
                          </div>
                        ) : (
                          <span className="font-bold text-slate-900 text-sm">{formatKES(zone.delivery_fee)}</span>
                        )}
                      </td>

                      {/* Active Toggle */}
                      <td className="py-4 px-5">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(zone)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all border cursor-pointer ${
                            zone.is_active 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : 'bg-red-50 text-red-700 border-red-200'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${zone.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                          {zone.is_active ? 'Active Route' : 'Suspended'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => saveInlineEdit(zone.id)}
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
                                onClick={() => startInlineEdit(zone)}
                                className="bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800 p-1.5 rounded transition-colors cursor-pointer"
                                title="Edit Row"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete delivery zone: "${zone.zone_name}"?`)) {
                                    handleDeleteZone(zone.id, zone.zone_name);
                                  }
                                }}
                                className="bg-slate-50 border border-slate-200 hover:border-red-200 hover:bg-red-50 text-slate-500 hover:text-red-600 p-1.5 rounded transition-colors cursor-pointer"
                                title="Delete Zone"
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

      {/* Add Zone Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-white border border-slate-200 text-slate-900 flex flex-col rounded-xl shadow-xl animate-scale-in">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Add Geographic Delivery Zone</h3>
              </div>
              <button
                onClick={() => setIsAddOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-900 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddZone} className="p-6 space-y-5 text-xs">
              
              <div className="space-y-1.5">
                <label className="text-slate-500 font-semibold uppercase">Zone Location Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Westlands, Kilimani, Karen"
                  value={newZoneName}
                  onChange={(e) => setNewZoneName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg p-2.5 text-slate-900 outline-none font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-500 font-semibold uppercase">Delivery Fee (KES) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold font-mono">KES</span>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="350"
                    value={newDeliveryFee || ''}
                    onChange={(e) => setNewDeliveryFee(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white rounded-lg py-2.5 pl-12 pr-4 text-slate-900 font-mono font-bold outline-none"
                  />
                </div>
              </div>

              {/* Toggle Route Active */}
              <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <input
                  type="checkbox"
                  id="new-zone-active"
                  checked={newIsActive}
                  onChange={(e) => setNewIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="new-zone-active" className="text-slate-700 font-semibold cursor-pointer select-none">
                  Route active (Enable in checkout zone selections)
                </label>
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
                  className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold py-2 px-5 rounded transition-all shadow-sm cursor-pointer"
                >
                  {isSaving ? 'Saving Zone...' : 'Save Delivery Zone'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
