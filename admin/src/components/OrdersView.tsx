import React, { useState, useMemo, useEffect } from 'react';
import { Search, Filter, Phone, MessageSquare, ExternalLink, RefreshCw, X, ShoppingBag, DollarSign, Calendar, Save, Trash2, ShieldCheck, CreditCard, ChevronLeft, ChevronRight } from 'lucide-react';
import { Order, OrderItem, OrderStatus, PaymentStatus } from '../types';
import { formatKES, formatDate, formatWhatsAppLink, formatTelLink } from '../lib/utils';
import { databaseService } from '../lib/supabase';

interface OrdersViewProps {
  orders: Order[];
  onOrdersUpdated: () => void;
  onShowToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function OrdersView({ orders, onOrdersUpdated, onShowToast }: OrdersViewProps) {
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Selected Order for Detail Modal
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedOrderItems, setSelectedOrderItems] = useState<OrderItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  // Edit fields in Modal
  const [modalStatus, setModalStatus] = useState<OrderStatus>('pending');
  const [modalPaymentStatus, setModalPaymentStatus] = useState<PaymentStatus>('unpaid');
  const [modalNotes, setModalNotes] = useState('');
  const [isSavingModal, setIsSavingModal] = useState(false);

  // Inline Loading states (per orderId)
  const [inlineLoadingId, setInlineLoadingId] = useState<string | null>(null);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, dateFrom, dateTo]);

  // Load Order Items when modal opens
  useEffect(() => {
    if (selectedOrder) {
      setModalStatus(selectedOrder.status);
      setModalPaymentStatus(selectedOrder.payment_status);
      setModalNotes(selectedOrder.notes || '');
      
      setIsLoadingItems(true);
      databaseService.getOrderItems(selectedOrder.id)
        .then(items => {
          setSelectedOrderItems(items);
        })
        .catch(err => {
          console.error(err);
          onShowToast('Failed to load order items.', 'error');
        })
        .finally(() => {
          setIsLoadingItems(false);
        });
    }
  }, [selectedOrder]);

  // Filter logic
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Search matches customer name or phone number
      const matchesSearch = 
        order.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.phone_number.includes(searchQuery);

      // Status matches
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

      // Date Range matches
      let matchesDate = true;
      if (order.created_at) {
        const orderDate = new Date(order.created_at);
        if (dateFrom) {
          const from = new Date(dateFrom);
          from.setHours(0, 0, 0, 0);
          if (orderDate < from) matchesDate = false;
        }
        if (dateTo) {
          const to = new Date(dateTo);
          to.setHours(23, 59, 59, 999);
          if (orderDate > to) matchesDate = false;
        }
      }

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [orders, searchQuery, statusFilter, dateFrom, dateTo]);

  // Paginated Orders
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredOrders, currentPage]);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

  // Reset Filters Handler
  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  // Inline Status Change
  const handleInlineStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    setInlineLoadingId(orderId);
    try {
      const success = await databaseService.updateOrderStatus(orderId, newStatus);
      if (success) {
        onOrdersUpdated();
        onShowToast(`Order #${orderId.substring(0, 8)} status updated to ${newStatus}`, 'success');
      } else {
        onShowToast('Failed to update status.', 'error');
      }
    } catch (e) {
      onShowToast('Error updating status.', 'error');
    } finally {
      setInlineLoadingId(null);
    }
  };

  // Save Modal Changes
  const handleSaveModalChanges = async () => {
    if (!selectedOrder) return;
    setIsSavingModal(true);
    try {
      const success = await databaseService.saveOrderDetails(selectedOrder.id, {
        status: modalStatus,
        payment_status: modalPaymentStatus,
        notes: modalNotes
      });
      if (success) {
        onOrdersUpdated();
        setSelectedOrder(prev => prev ? { ...prev, status: modalStatus, payment_status: modalPaymentStatus, notes: modalNotes } : null);
        onShowToast('Order details saved successfully.', 'success');
      } else {
        onShowToast('Failed to save order details.', 'error');
      }
    } catch (e) {
      onShowToast('Error saving changes.', 'error');
    } finally {
      setIsSavingModal(false);
    }
  };

  // Get color badges
  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'confirmed': return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'processing': return 'bg-indigo-50 text-indigo-800 border-indigo-200';
      case 'dispatched': return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'delivered': return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'cancelled': return 'bg-red-50 text-red-800 border-red-200';
      default: return 'bg-slate-50 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Page Title & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-5 rounded-xl">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-blue-600" />
            Orders Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor product shipments, dispatch updates, and track invoice statuses.
          </p>
        </div>
        
        {/* Quick Summary Badges */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs text-slate-600">
              Pending: <strong className="text-slate-900 font-bold">{orders.filter(o => o.status === 'pending').length}</strong>
            </span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-slate-600">
              Paid Total: <strong className="text-emerald-700 font-bold">{formatKES(orders.filter(o => o.payment_status === 'paid' && o.status !== 'cancelled').reduce((sum, o) => sum + o.total_amount, 0))}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Advanced Filter Bar */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by customer name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 text-xs text-slate-900 placeholder-slate-400 rounded-lg py-2.5 pl-9 pr-4 outline-none transition-colors"
              id="order-search-input"
            />
          </div>

          {/* Status Dropdown */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-blue-500 text-xs text-slate-700 rounded-lg py-2.5 pl-9 pr-3 outline-none transition-colors appearance-none cursor-pointer"
              id="order-status-filter"
            >
              <option value="all">All Order Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="processing">Processing</option>
              <option value="dispatched">Dispatched</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Date From */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">From</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="flex-1 bg-slate-50 border border-slate-200 focus:border-blue-500 text-xs text-slate-700 rounded-lg py-2 px-2.5 outline-none transition-colors"
              id="order-date-from"
            />
          </div>

          {/* Date To */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">To</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="flex-1 bg-slate-50 border border-slate-200 focus:border-blue-500 text-xs text-slate-700 rounded-lg py-2 px-2.5 outline-none transition-colors"
              id="order-date-to"
            />
          </div>

        </div>

        {/* Action triggers */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <div className="text-[11px] text-slate-500">
            Showing <strong className="text-slate-800">{filteredOrders.length}</strong> matches of <strong className="text-slate-800">{orders.length}</strong> total orders.
          </div>
          <button
            onClick={handleResetFilters}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 hover:underline transition-colors"
            id="order-reset-filters-btn"
          >
            <X className="h-3.5 w-3.5" />
            Reset Filters
          </button>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          {paginatedOrders.length === 0 ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center">
              <ShoppingBag className="h-12 w-12 text-slate-200 mb-3" />
              <p className="text-sm font-semibold text-slate-800">No matching orders found</p>
              <p className="text-xs text-slate-500 mt-1">Try relaxing your search terms or date range filters.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                  <th className="py-3 px-4 font-mono">Order ID</th>
                  <th className="py-3 px-4">Date Placed</th>
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Delivery Zone</th>
                  <th className="py-3 px-4 text-right">Invoice Total</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4">Fulfillment Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50 transition-colors group">
                    {/* Order ID */}
                    <td className="py-4 px-4 font-mono font-bold text-slate-500 group-hover:text-slate-900">
                      #{order.id.split('-')[1] || order.id.substring(0, 8)}
                    </td>

                    {/* Date */}
                    <td className="py-4 px-4 text-slate-600 font-mono">
                      {formatDate(order.created_at)}
                    </td>

                    {/* Customer */}
                    <td className="py-4 px-4">
                      <div className="font-semibold text-slate-800">{order.full_name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <a 
                          href={formatWhatsAppLink(order.phone_number, `Hello ${order.full_name}, regarding your order #${order.id}...`)}
                          target="_blank"
                          referrerPolicy="no-referrer"
                          className="text-[10px] text-emerald-600 hover:underline flex items-center gap-0.5"
                          title="Open WhatsApp"
                        >
                          <MessageSquare className="h-2.5 w-2.5 shrink-0" />
                          WhatsApp
                        </a>
                        <span className="text-slate-300 font-bold">•</span>
                        <a 
                          href={formatTelLink(order.phone_number)}
                          className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5"
                          title="Call Customer"
                        >
                          <Phone className="h-2.5 w-2.5 shrink-0" />
                          Call
                        </a>
                      </div>
                    </td>

                    {/* Delivery Zone */}
                    <td className="py-4 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-600 text-[10px]">
                        {order.delivery_zone}
                      </span>
                    </td>

                    {/* Total */}
                    <td className="py-4 px-4 text-right font-bold text-slate-900 font-mono">
                      {formatKES(order.total_amount)}
                    </td>

                    {/* Payment Badge */}
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        order.payment_status === 'paid' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        <span className={`w-1 h-1 rounded-full ${order.payment_status === 'paid' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                        {order.payment_status}
                      </span>
                    </td>

                    {/* Status Select Box */}
                    <td className="py-4 px-4">
                      <div className="relative">
                        {inlineLoadingId === order.id ? (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 font-semibold py-1">
                            <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-500" />
                            Saving...
                          </div>
                        ) : (
                          <select
                            value={order.status}
                            onChange={(e) => handleInlineStatusChange(order.id, e.target.value as OrderStatus)}
                            className={`text-[11px] font-semibold rounded-lg py-1 px-2.5 border outline-none appearance-none cursor-pointer pr-6 bg-white ${getStatusColor(order.status)}`}
                          >
                            <option value="pending">PENDING</option>
                            <option value="confirmed">CONFIRMED</option>
                            <option value="processing">PROCESSING</option>
                            <option value="dispatched">DISPATCHED</option>
                            <option value="delivered">DELIVERED</option>
                            <option value="cancelled">CANCELLED</option>
                          </select>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 font-bold py-1 px-3 rounded transition-all text-[11px] shadow-sm flex items-center gap-1 mx-auto"
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

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-mono">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1.5 bg-white border border-slate-200 rounded hover:bg-slate-50 text-slate-600 disabled:opacity-50 transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 bg-white border border-slate-200 rounded hover:bg-slate-50 text-slate-600 disabled:opacity-50 transition-colors cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-3xl bg-white border border-slate-200 text-slate-900 flex flex-col max-h-[90vh] rounded-xl shadow-xl animate-scale-in">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase font-semibold">E-Commerce Invoice Details</span>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5 mt-0.5 font-mono">
                  Order ID: <span className="text-blue-600">#{selectedOrder.id}</span>
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Grid Section 1: Customer Info & Delivery Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-slate-50 p-5 rounded-lg border border-slate-200">
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                    Customer Contact Info
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-slate-500 block">Full Name:</span>
                      <span className="text-slate-800 font-semibold">{selectedOrder.full_name}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Phone Number:</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-slate-800 font-semibold font-mono">{selectedOrder.phone_number}</span>
                        <a
                          href={formatWhatsAppLink(selectedOrder.phone_number, `Hello ${selectedOrder.full_name}, regarding your order #${selectedOrder.id}...`)}
                          target="_blank"
                          referrerPolicy="no-referrer"
                          className="bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 px-2 py-0.5 text-[10px] font-bold rounded flex items-center gap-0.5 transition-all"
                        >
                          <MessageSquare className="h-3 w-3 shrink-0" />
                          WhatsApp
                        </a>
                        <a
                          href={formatTelLink(selectedOrder.phone_number)}
                          className="bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 px-2 py-0.5 text-[10px] font-bold rounded flex items-center gap-0.5 transition-all"
                        >
                          <Phone className="h-3 w-3 shrink-0" />
                          Call Voice
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                    <CreditCard className="h-3.5 w-3.5 text-indigo-600" />
                    Shipping & Location Logistics
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-slate-500 block">Delivery Zone:</span>
                      <span className="text-slate-800 font-semibold">{selectedOrder.delivery_zone}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Destination Address:</span>
                      <span className="text-slate-700 font-semibold leading-relaxed block bg-white p-2 rounded border border-slate-200 mt-1">
                        {selectedOrder.delivery_address}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Items Table */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-1.5">
                  Line Items Purchased
                </h4>
                
                {isLoadingItems ? (
                  <div className="py-8 text-center text-slate-500 flex items-center justify-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                    Loading items catalog...
                  </div>
                ) : selectedOrderItems.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-xs">
                    No items found inside this order record.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                          <th className="py-2.5 px-3">Product Catalog Description</th>
                          <th className="py-2.5 px-3 text-center">Qty</th>
                          <th className="py-2.5 px-3 text-right">Unit Price</th>
                          <th className="py-2.5 px-3 text-right">Total (KES)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedOrderItems.map((item) => (
                          <tr key={item.id} className="text-slate-700">
                            <td className="py-3 px-3 font-semibold text-slate-900">
                              {item.product_title}
                            </td>
                            <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">
                              {item.quantity}
                            </td>
                            <td className="py-3 px-3 text-right font-mono">
                              {formatKES(item.unit_price)}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                              {formatKES(item.total_price)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Summary Math Block */}
                    <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end">
                      <div className="w-full max-w-xs space-y-2 text-xs">
                        <div className="flex justify-between text-slate-500">
                          <span>Items Subtotal:</span>
                          <span className="font-mono text-slate-700">{formatKES(selectedOrder.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Delivery Zone Fee:</span>
                          <span className="font-mono text-slate-700">{formatKES(selectedOrder.total_amount - selectedOrder.subtotal)}</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-200 pt-2 text-sm text-slate-900 font-bold">
                          <span>Total Amount:</span>
                          <span className="font-mono text-emerald-600">{formatKES(selectedOrder.total_amount)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 3: Admin Actions / Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-slate-50 p-5 rounded-lg border border-slate-200">
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-1.5">
                    Order Status Controls
                  </h4>
                  
                  {/* Status dropdown */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase">Fulfillment State</label>
                    <select
                      value={modalStatus}
                      onChange={(e) => setModalStatus(e.target.value as OrderStatus)}
                      className="w-full bg-white border border-slate-200 text-xs font-semibold p-2.5 rounded-lg text-slate-850 focus:border-blue-500 outline-none transition-colors"
                    >
                      <option value="pending">PENDING</option>
                      <option value="confirmed">CONFIRMED</option>
                      <option value="processing">PROCESSING</option>
                      <option value="dispatched">DISPATCHED</option>
                      <option value="delivered">DELIVERED</option>
                      <option value="cancelled">CANCELLED</option>
                    </select>
                  </div>

                  {/* Payment dropdown */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase">Payment Status Indicator</label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setModalPaymentStatus('paid')}
                        className={`flex-1 text-center py-2 text-xs rounded-lg font-bold border transition-all ${
                          modalPaymentStatus === 'paid'
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                            : 'bg-white border-slate-200 text-slate-400'
                        }`}
                      >
                        PAID
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalPaymentStatus('unpaid')}
                        className={`flex-1 text-center py-2 text-xs rounded-lg font-bold border transition-all ${
                          modalPaymentStatus === 'unpaid'
                            ? 'bg-red-50 border-red-500 text-red-700 shadow-sm'
                            : 'bg-white border-slate-200 text-slate-400'
                        }`}
                      >
                        UNPAID
                      </button>
                    </div>
                  </div>
                </div>

                {/* Notes Textarea */}
                <div className="space-y-4">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 pb-1.5">
                    Internal Operational Notes
                  </h4>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase">Customer request or diagnostic notes</label>
                    <textarea
                      value={modalNotes}
                      onChange={(e) => setModalNotes(e.target.value)}
                      placeholder="Add dispatch logs, tracking links, delivery instructions..."
                      className="w-full bg-white border border-slate-200 focus:border-blue-500 rounded-lg p-2.5 text-xs text-slate-900 placeholder-slate-400 h-24 outline-none transition-all resize-none"
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Footer with actions */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between rounded-b-xl">
              <span className="text-[10px] text-slate-400 font-mono">
                Placed: {formatDate(selectedOrder.created_at)}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs py-2 px-4 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveModalChanges}
                  disabled={isSavingModal}
                  className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs py-2 px-5 rounded-lg transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5" />
                  {isSavingModal ? 'Saving...' : 'Save Order Changes'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
