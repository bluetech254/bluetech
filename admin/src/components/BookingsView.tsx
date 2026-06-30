import React, { useState, useMemo, useEffect } from 'react';
import { Search, Filter, Phone, MessageSquare, ExternalLink, RefreshCw, X, Wrench, Calendar, Save, Badge, Layers, ChevronLeft, ChevronRight, CheckCircle2, DollarSign, Clock, HelpCircle, ArrowRight } from 'lucide-react';
import { Booking, BookingStatus, RepairService, FulfillmentType } from '../types';
import { formatKES, formatDate, formatWhatsAppLink, formatTelLink } from '../lib/utils';
import { databaseService } from '../lib/supabase';

interface BookingsViewProps {
  bookings: Booking[];
  onBookingsUpdated: () => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function BookingsView({ bookings, onBookingsUpdated, onShowToast }: BookingsViewProps) {
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deviceFilter, setDeviceFilter] = useState<string>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Selected Booking
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [repairServices, setRepairServices] = useState<RepairService[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(false);

  // Edit fields inside modal
  const [modalStatus, setModalStatus] = useState<BookingStatus>('pending');
  const [modalEstimatedCost, setModalEstimatedCost] = useState<number>(0);
  const [modalFinalCost, setModalFinalCost] = useState<number>(0);
  const [modalNotes, setModalNotes] = useState('');
  const [isSavingModal, setIsSavingModal] = useState(false);

  // Inline loading status
  const [inlineLoadingId, setInlineLoadingId] = useState<string | null>(null);

  // Auto-derived Device categories list
  const deviceCategories = useMemo(() => {
    const types = bookings.map(b => b.device_type);
    return ['all', ...Array.from(new Set(types))];
  }, [bookings]);

  // Load Repair Services Catalog for Suggestions
  useEffect(() => {
    if (selectedBooking) {
      setModalStatus(selectedBooking.status);
      setModalEstimatedCost(selectedBooking.estimated_cost);
      setModalFinalCost(selectedBooking.final_cost);
      setModalNotes(selectedBooking.internal_notes || '');

      setIsLoadingServices(true);
      databaseService.getRepairServices()
        .then(srvs => setRepairServices(srvs))
        .catch(err => console.error('Failed to load repair services:', err))
        .finally(() => setIsLoadingServices(false));
    }
  }, [selectedBooking]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, deviceFilter]);

  // Filter Bookings logic
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const matchesSearch = 
        b.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.phone_number.includes(searchQuery) ||
        b.device_model.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
      const matchesDevice = deviceFilter === 'all' || b.device_type === deviceFilter;

      return matchesSearch && matchesStatus && matchesDevice;
    });
  }, [bookings, searchQuery, statusFilter, deviceFilter]);

  // Paginated bookings
  const paginatedBookings = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredBookings.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredBookings, currentPage]);

  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);

  // Inline cost change
  const handleInlineStatusChange = async (bookingId: string, status: BookingStatus) => {
    setInlineLoadingId(bookingId);
    try {
      const success = await databaseService.updateBookingStatus(bookingId, status);
      if (success) {
        onBookingsUpdated();
        onShowToast(`Booking #${bookingId.substring(0, 8)} status changed to ${status}`, 'success');
      } else {
        onShowToast('Failed to update booking status.', 'error');
      }
    } catch (e) {
      onShowToast('Error updating status.', 'error');
    } finally {
      setInlineLoadingId(null);
    }
  };

  // Save Modal changes
  const handleSaveModal = async () => {
    if (!selectedBooking) return;
    setIsSavingModal(true);
    try {
      const success = await databaseService.updateBookingDetails(selectedBooking.id, {
        status: modalStatus,
        estimated_cost: Number(modalEstimatedCost),
        final_cost: Number(modalFinalCost),
        internal_notes: modalNotes
      });
      if (success) {
        onBookingsUpdated();
        setSelectedBooking(prev => prev ? { 
          ...prev, 
          status: modalStatus, 
          estimated_cost: Number(modalEstimatedCost), 
          final_cost: Number(modalFinalCost), 
          internal_notes: modalNotes 
        } : null);
        onShowToast('Repair details updated successfully.', 'success');
      } else {
        onShowToast('Failed to save repair details.', 'error');
      }
    } catch (e) {
      onShowToast('Error saving changes.', 'error');
    } finally {
      setIsSavingModal(false);
    }
  };

  // Quick mark completed
  const handleMarkAsCompleted = async () => {
    if (!selectedBooking) return;
    setIsSavingModal(true);
    try {
      const success = await databaseService.updateBookingDetails(selectedBooking.id, {
        status: 'completed',
        final_cost: modalFinalCost || modalEstimatedCost // default final cost to estimated if not set
      });
      if (success) {
        onBookingsUpdated();
        setSelectedBooking(null);
        onShowToast('Repair marked as fully completed!', 'success');
      } else {
        onShowToast('Failed to mark as completed.', 'error');
      }
    } catch (e) {
      onShowToast('Error marking completed.', 'error');
    } finally {
      setIsSavingModal(false);
    }
  };

  // Filter suggested services
  const suggestedServices = useMemo(() => {
    if (!selectedBooking) return [];
    const cat = selectedBooking.device_type.toLowerCase();
    return repairServices.filter(s => 
      s.service_category.toLowerCase().includes(cat) || 
      cat.includes(s.service_category.toLowerCase()) ||
      s.service_name.toLowerCase().includes(cat)
    );
  }, [selectedBooking, repairServices]);

  // Style colors for booking badges
  const getBookingStatusColor = (status: BookingStatus) => {
    switch (status) {
      case 'pending': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'confirmed': return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'picked_up': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'in_diagnosis': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'in_repair': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'ready': return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'completed': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'cancelled': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  // Timeline Step Definitions
  const timelineSteps: { key: BookingStatus; label: string }[] = [
    { key: 'pending', label: 'Pending Request' },
    { key: 'confirmed', label: 'Booking Confirmed' },
    { key: 'picked_up', label: 'Picked Up / Received' },
    { key: 'in_diagnosis', label: 'In Diagnosis' },
    { key: 'in_repair', label: 'In Repair Unit' },
    { key: 'ready', label: 'Ready for Collection' },
    { key: 'completed', label: 'Completed' }
  ];

  const currentStepIndex = timelineSteps.findIndex(s => s.key === modalStatus);

  return (
    <div className="space-y-6">
      
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-5 rounded-xl">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Wrench className="h-5 w-5 text-indigo-600" />
            Repairs & Bookings Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Track hardware diagnostics, parts updates, labor estimations, and device collection statuses.
          </p>
        </div>

        {/* Counter Indicators */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 animate-pulse" />
            <span className="text-xs text-slate-500">
              In Diagnosis: <strong className="text-slate-800 font-bold">{bookings.filter(b => b.status === 'in_diagnosis').length}</strong>
            </span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
            <span className="text-xs text-slate-500">
              In Repair: <strong className="text-slate-800 font-bold">{bookings.filter(b => b.status === 'in_repair').length}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Filter Row */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by customer name, phone, device model..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 text-xs text-slate-900 placeholder-slate-400 rounded-lg py-2.5 pl-9 pr-4 outline-none transition-colors focus:bg-white"
              id="booking-search-input"
            />
          </div>

          {/* Status filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 text-xs text-slate-700 rounded-lg py-2.5 pl-9 pr-3 outline-none transition-colors appearance-none cursor-pointer focus:bg-white"
              id="booking-status-filter"
            >
              <option value="all">All Repair Statuses</option>
              <option value="pending">Pending Request</option>
              <option value="confirmed">Confirmed</option>
              <option value="picked_up">Picked Up</option>
              <option value="in_diagnosis">In Diagnosis</option>
              <option value="in_repair">In Repair</option>
              <option value="ready">Ready for Collection</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Device filter */}
          <div className="relative">
            <Layers className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <select
              value={deviceFilter}
              onChange={(e) => setDeviceFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 text-xs text-slate-700 rounded-lg py-2.5 pl-9 pr-3 outline-none transition-colors appearance-none cursor-pointer focus:bg-white"
              id="booking-device-filter"
            >
              <option value="all">All Device Categories</option>
              {deviceCategories.filter(d => d !== 'all').map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

        </div>

        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <div className="text-[11px] text-slate-500">
            Showing <strong className="text-slate-800">{filteredBookings.length}</strong> matching repair requests of <strong className="text-slate-800">{bookings.length}</strong> total bookings.
          </div>
          <button
            onClick={() => { setSearchQuery(''); setStatusFilter('all'); setDeviceFilter('all'); }}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 hover:underline transition-colors animate-fade-in cursor-pointer"
            id="booking-reset-filters"
          >
            <X className="h-3.5 w-3.5" />
            Reset Filters
          </button>
        </div>
      </div>

      {/* Main Table Grid */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          {paginatedBookings.length === 0 ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center">
              <Wrench className="h-12 w-12 text-slate-200 mb-3" />
              <p className="text-sm font-semibold text-slate-800">No repair bookings matched your parameters</p>
              <p className="text-xs text-slate-500 mt-1">Try resetting the status or device filters.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                  <th className="py-4 px-4 font-mono">Booking ID</th>
                  <th className="py-4 px-4">Date Logged</th>
                  <th className="py-4 px-4">Customer Name</th>
                  <th className="py-4 px-4">Device Details</th>
                  <th className="py-4 px-4">Fulfillment Type</th>
                  <th className="py-4 px-4">Reported Issue Description</th>
                  <th className="py-4 px-4">Repair Price</th>
                  <th className="py-4 px-4">Diagnostic Status</th>
                  <th className="py-4 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 transition-colors group">
                    {/* Booking ID */}
                    <td className="py-4 px-4 font-mono font-bold text-slate-500">
                      #{b.id.split('-')[1] || b.id.substring(0, 8)}
                    </td>

                    {/* Date */}
                    <td className="py-4 px-4 text-slate-500 font-mono">
                      {formatDate(b.created_at)}
                    </td>

                    {/* Customer */}
                    <td className="py-4 px-4">
                      <div className="font-semibold text-slate-900">{b.full_name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <a 
                          href={formatWhatsAppLink(b.phone_number, `Hello ${b.full_name}, regarding your device repair #${b.id}...`)}
                          target="_blank"
                          referrerPolicy="no-referrer"
                          className="text-[10px] text-emerald-600 hover:underline flex items-center gap-0.5"
                        >
                          <MessageSquare className="h-2.5 w-2.5 shrink-0" />
                          WhatsApp
                        </a>
                        <span className="text-slate-300 font-bold">•</span>
                        <a 
                          href={formatTelLink(b.phone_number)}
                          className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5"
                        >
                          <Phone className="h-2.5 w-2.5 shrink-0" />
                          Call
                        </a>
                      </div>
                    </td>

                    {/* Device */}
                    <td className="py-4 px-4">
                      <span className="font-semibold text-slate-800 block">{b.device_type}</span>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5">{b.device_model}</span>
                    </td>

                    {/* Fulfillment */}
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        b.fulfillment_type === 'pickup' 
                          ? 'bg-purple-50 text-purple-700 border border-purple-200' 
                          : 'bg-teal-50 text-teal-700 border border-teal-200'
                      }`}>
                        {b.fulfillment_type}
                      </span>
                    </td>

                    {/* Issue Description Preview */}
                    <td className="py-4 px-4 max-w-xs truncate text-slate-500" title={b.issue_description}>
                      {b.issue_description}
                    </td>

                    {/* Cost */}
                    <td className="py-4 px-4 font-bold text-slate-900 font-mono">
                      {b.status === 'completed' || b.final_cost > 0 ? (
                        <div className="text-emerald-600">{formatKES(b.final_cost)}</div>
                      ) : b.estimated_cost > 0 ? (
                        <div className="text-amber-600 font-medium text-[11px]">Est: {formatKES(b.estimated_cost)}</div>
                      ) : (
                        <div className="text-slate-400 text-[10px]">TBD</div>
                      )}
                    </td>

                    {/* Status inline */}
                    <td className="py-4 px-4">
                      {inlineLoadingId === b.id ? (
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 font-semibold py-1">
                          <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-500" />
                          Updating...
                        </div>
                      ) : (
                        <select
                          value={b.status}
                          onChange={(e) => handleInlineStatusChange(b.id, e.target.value as BookingStatus)}
                          className={`text-[11px] font-semibold rounded-lg py-1 px-2 border outline-none appearance-none cursor-pointer pr-5 bg-white ${getBookingStatusColor(b.status)}`}
                        >
                          <option value="pending">PENDING</option>
                          <option value="confirmed">CONFIRMED</option>
                          <option value="picked_up">PICKED UP</option>
                          <option value="in_diagnosis">IN DIAGNOSIS</option>
                          <option value="in_repair">IN REPAIR</option>
                          <option value="ready">READY</option>
                          <option value="completed">COMPLETED</option>
                          <option value="cancelled">CANCELLED</option>
                        </select>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() => setSelectedBooking(b)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1 px-3 rounded text-[11px] transition-all shadow-sm flex items-center gap-1 mx-auto cursor-pointer"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View Details
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-mono">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 bg-white border border-slate-200 rounded hover:bg-slate-50 text-slate-700 disabled:opacity-50 transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-2 bg-white border border-slate-200 rounded hover:bg-slate-50 text-slate-700 disabled:opacity-50 transition-colors cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Repair Booking Details Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-4xl bg-white border border-slate-200 text-slate-900 flex flex-col max-h-[92vh] rounded-xl shadow-xl animate-scale-in">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-indigo-600 uppercase font-bold">Hardware Diagnosis & Repairs</span>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5 mt-0.5 font-mono">
                  Booking ID: <span className="text-indigo-600">#{selectedBooking.id}</span>
                </h3>
              </div>
              <button
                onClick={() => setSelectedBooking(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Timeline Status Tracker (Visual Step Progress) */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 text-center">
                  Repair Status Timeline Tracker
                </h4>
                
                <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-2">
                  {/* Visual connector line for Desktop */}
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 -translate-y-1/2 hidden md:block z-0" />
                  
                  {timelineSteps.map((step, idx) => {
                    const isCompleted = idx <= currentStepIndex;
                    const isCurrent = idx === currentStepIndex;
                    return (
                      <div 
                        key={step.key} 
                        className="flex md:flex-col items-center gap-3 md:gap-2 z-10 relative flex-1"
                      >
                        {/* Circle Indicator */}
                        <button
                          type="button"
                          onClick={() => setModalStatus(step.key)}
                          className={`h-7 w-7 rounded-full flex items-center justify-center border font-semibold text-xs transition-all ${
                            isCurrent 
                              ? 'bg-indigo-600 border-indigo-400 text-white shadow-md shadow-indigo-500/20 scale-110' 
                              : isCompleted 
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                                : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                          }`}
                        >
                          {isCompleted && !isCurrent ? '✓' : idx + 1}
                        </button>
                        {/* Text Label */}
                        <span className={`text-[10px] font-semibold text-center leading-tight ${
                          isCurrent ? 'text-slate-900 font-bold' : isCompleted ? 'text-slate-700' : 'text-slate-400'
                        }`}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Grid Layout: Customer Info & Fulfillment */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Left Side: Device & Client Details */}
                <div className="bg-slate-50/50 p-5 rounded-xl border border-slate-200 space-y-4">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">
                    Client & Hardware Specifications
                  </h4>
                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-400 block">Customer:</span>
                        <span className="text-slate-900 font-bold">{selectedBooking.full_name}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Phone:</span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <a 
                            href={formatWhatsAppLink(selectedBooking.phone_number, `Hello ${selectedBooking.full_name}, regarding your ${selectedBooking.device_type} repair...`)}
                            target="_blank"
                            referrerPolicy="no-referrer"
                            className="text-emerald-600 font-bold hover:underline"
                          >
                            {selectedBooking.phone_number}
                          </a>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-2">
                      <div>
                        <span className="text-slate-400 block">Device Type:</span>
                        <span className="text-slate-900 font-semibold">{selectedBooking.device_type}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Device Model:</span>
                        <span className="text-slate-900 font-mono font-semibold">{selectedBooking.device_model}</span>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-2">
                      <span className="text-slate-400 block font-semibold mb-1">Reported Technical Issue:</span>
                      <p className="text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed font-mono text-[11px] whitespace-pre-line">
                        {selectedBooking.issue_description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Side: Fulfillment & Cost Config */}
                <div className="bg-slate-50/50 p-5 rounded-xl border border-slate-200 space-y-4">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">
                    Fulfillment & Financial Management
                  </h4>
                  
                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-slate-400 block">Fulfillment Type:</span>
                      <span className="inline-flex items-center px-2 py-0.5 bg-white border border-slate-200 text-slate-600 rounded font-semibold uppercase text-[10px] mt-1">
                        {selectedBooking.fulfillment_type}
                      </span>
                    </div>

                    {/* Cost Config Inputs */}
                    <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Estimated Cost (KES)</label>
                        <div className="relative">
                           <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">KES</span>
                          <input
                            type="number"
                            value={modalEstimatedCost}
                            onChange={(e) => setModalEstimatedCost(Number(e.target.value))}
                            className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg py-2 pl-12 pr-2.5 text-xs text-slate-900 font-mono font-bold outline-none focus:bg-white"
                          />
                        </div>
                        <span className="text-[9px] text-slate-400 block">Shown to client on intake</span>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Final Price (KES)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">KES</span>
                          <input
                            type="number"
                            value={modalFinalCost}
                            onChange={(e) => setModalFinalCost(Number(e.target.value))}
                            className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg py-2 pl-12 pr-2.5 text-xs text-slate-900 font-mono font-bold outline-none focus:bg-white"
                          />
                        </div>
                        <span className="text-[9px] text-slate-400 block">Total charged at pickup</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Section 4: Diagnostics Internal Notes */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-2">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">
                  Internal Diagnostics Findings & Labor Notes
                </h4>
                <textarea
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="Record diagnostic findings, required replacement parts, specific engineer assignments, testing loops..."
                  className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg p-3 text-xs text-slate-900 placeholder-slate-400 h-24 outline-none resize-none transition-all focus:bg-white"
                />
              </div>

              {/* Section 5: suggested Repair Service lookup */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <Layers className="h-4 w-4 text-indigo-500" />
                  Suggested Service Catalog Price References
                </h4>

                {isLoadingServices ? (
                  <p className="text-xs text-slate-400 italic">Querying standard repair rates...</p>
                ) : suggestedServices.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No specific services matching category "{selectedBooking.device_type}" in catalog.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {suggestedServices.map((srv) => (
                      <div 
                        key={srv.id} 
                        className="bg-white border border-slate-200 p-3 rounded-lg flex items-center justify-between group hover:border-indigo-400 transition-colors"
                      >
                        <div className="space-y-1">
                          <span className="text-[11px] font-bold text-slate-900 block">{srv.service_name}</span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-2">
                            <span>Duration: {srv.duration}</span>
                            <span>•</span>
                            <span>Warranty: {srv.warranty}</span>
                          </span>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1 shrink-0">
                          <span className="text-xs font-bold text-indigo-600 font-mono">{formatKES(srv.base_price)}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setModalEstimatedCost(srv.base_price);
                              onShowToast(`Applied ${srv.service_name} base price to Estimated Cost!`, 'info');
                            }}
                            className="text-[9px] font-bold text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 rounded px-1.5 py-0.5 transition-colors flex items-center gap-0.5 cursor-pointer"
                          >
                            Apply Cost
                            <ArrowRight className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between rounded-b-xl">
              <span className="text-[10px] text-slate-400 font-mono">
                Intake logged: {formatDate(selectedBooking.created_at)}
              </span>
              
              <div className="flex gap-2.5">
                {/* Quick Done button */}
                {modalStatus === 'ready' && (
                  <button
                    type="button"
                    onClick={handleMarkAsCompleted}
                    disabled={isSavingModal}
                    className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs py-2 px-4 rounded flex items-center gap-1 transition-all shadow-sm cursor-pointer"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Mark as Completed
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedBooking(null)}
                  className="bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs py-2 px-4 rounded border border-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                
                <button
                  type="button"
                  onClick={handleSaveModal}
                  disabled={isSavingModal}
                  className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-xs py-2 px-5 rounded transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5" />
                  {isSavingModal ? 'Saving...' : 'Save Repair Details'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
