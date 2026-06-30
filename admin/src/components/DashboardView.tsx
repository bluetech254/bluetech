import React, { useMemo } from 'react';
import { ShoppingBag, Wrench, DollarSign, AlertCircle, Phone, ArrowUpRight, CheckCircle2, Clock } from 'lucide-react';
import { Order, Booking } from '../types';
import { formatKES, formatDate, formatWhatsAppLink, formatTelLink } from '../lib/utils';

interface DashboardViewProps {
  orders: Order[];
  bookings: Booking[];
  onNavigate: (tab: string) => void;
  onViewOrder: (order: Order) => void;
  onViewBooking: (booking: Booking) => void;
}

export default function DashboardView({ orders, bookings, onNavigate, onViewOrder, onViewBooking }: DashboardViewProps) {
  
  // Calculate real-time stats from actual data
  const stats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    
    // Filter orders and bookings from today
    const ordersToday = orders.filter(o => o.created_at && new Date(o.created_at) >= new Date(todayStart));
    const bookingsToday = bookings.filter(b => b.created_at && new Date(b.created_at) >= new Date(todayStart));
    
    // Calculate revenue from paid orders and completed bookings
    const orderRevenueToday = ordersToday
      .filter(o => o.payment_status === 'paid' && o.status !== 'cancelled')
      .reduce((sum, o) => sum + o.total_amount, 0);
      
    const bookingRevenueToday = bookingsToday
      .filter(b => b.status === 'completed')
      .reduce((sum, b) => sum + b.final_cost, 0);

    const totalRevenueToday = orderRevenueToday + bookingRevenueToday;
    
    // Count pending actions
    const pendingOrders = orders.filter(o => ['pending', 'confirmed', 'processing'].includes(o.status)).length;
    const pendingBookings = bookings.filter(b => ['pending', 'confirmed', 'in_diagnosis', 'in_repair'].includes(b.status)).length;
    const totalPendingActions = pendingOrders + pendingBookings;

    return {
      ordersTodayCount: ordersToday.length,
      bookingsTodayCount: bookingsToday.length,
      revenueToday: totalRevenueToday,
      pendingActions: totalPendingActions
    };
  }, [orders, bookings]);

  // Last 10 orders
  const recentOrders = useMemo(() => {
    return orders.slice(0, 10);
  }, [orders]);

  // Last 10 bookings
  const recentBookings = useMemo(() => {
    return bookings.slice(0, 10);
  }, [bookings]);

  // Helper styles for order status badges
  const getOrderStatusBadge = (status: Order['status']) => {
    const styles = {
      pending: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50',
      confirmed: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/50',
      processing: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900/50',
      dispatched: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/50',
      delivered: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50',
      cancelled: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50'
    };
    return (
      <span className={`px-2 py-0.5 text-[11px] font-medium rounded-full border ${styles[status] || styles.pending}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  // Helper styles for booking status badges
  const getBookingStatusBadge = (status: Booking['status']) => {
    const styles = {
      pending: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50',
      confirmed: 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-900/50',
      picked_up: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/50',
      in_diagnosis: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-400 dark:border-yellow-900/50',
      in_repair: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/50',
      ready: 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-950/40 dark:text-teal-400 dark:border-teal-900/50',
      completed: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50',
      cancelled: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50'
    };
    return (
      <span className={`px-2 py-0.5 text-[11px] font-medium rounded-full border ${styles[status] || styles.pending}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: Orders Today */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl flex items-center justify-between shadow-sm relative overflow-hidden group hover:border-slate-300 transition-colors">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Orders Today</span>
            <span className="text-2xl font-bold text-slate-900 tracking-tight block">{stats.ordersTodayCount}</span>
            <span className="text-[11px] text-slate-400 font-mono">June 29, 2026</span>
          </div>
          <div className="h-11 w-11 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
            <ShoppingBag className="h-5.5 w-5.5" />
          </div>
        </div>

        {/* Card 2: Bookings Today */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl flex items-center justify-between shadow-sm relative overflow-hidden group hover:border-slate-300 transition-colors">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Repairs Booked</span>
            <span className="text-2xl font-bold text-slate-900 tracking-tight block">{stats.bookingsTodayCount}</span>
            <span className="text-[11px] text-slate-400 font-mono">June 29, 2026</span>
          </div>
          <div className="h-11 w-11 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Wrench className="h-5.5 w-5.5" />
          </div>
        </div>

        {/* Card 3: Today's Revenue */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl flex items-center justify-between shadow-sm relative overflow-hidden group hover:border-slate-300 transition-colors">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Revenue Today</span>
            <span className="text-2xl font-bold text-emerald-600 tracking-tight block">{formatKES(stats.revenueToday)}</span>
            <span className="text-[11px] text-slate-400 font-mono">Orders & Completed Repairs</span>
          </div>
          <div className="h-11 w-11 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
            <DollarSign className="h-5.5 w-5.5" />
          </div>
        </div>

        {/* Card 4: Pending Actions */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl flex items-center justify-between shadow-sm relative overflow-hidden group hover:border-slate-300 transition-colors">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Active Queue</span>
            <span className="text-2xl font-bold text-amber-600 tracking-tight block">{stats.pendingActions}</span>
            <span className="text-[11px] text-slate-400 font-mono">Needs Operational Attention</span>
          </div>
          <div className="h-11 w-11 rounded-lg bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
            <AlertCircle className="h-5.5 w-5.5" />
          </div>
        </div>

      </div>

      {/* Two Column Layout: Recent Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* Left Column: Recent Orders */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col min-h-[480px]">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-blue-600" />
                Recent Orders
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">E-commerce transactions placed on the shop</p>
            </div>
            <button
              onClick={() => onNavigate('orders')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-0.5 hover:underline transition-all"
            >
              View All
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-x-auto">
            {recentOrders.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                <ShoppingBag className="h-8 w-8 text-slate-300 mb-2" />
                <p className="text-sm">No recent orders found</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/50">
                    <th className="py-2.5 px-3">Order ID</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Total</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="py-3 px-3 font-mono font-bold text-slate-500 group-hover:text-slate-900 transition-colors">
                        #{order.id.split('-')[1] || order.id.substring(0, 8)}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">{order.full_name}</div>
                        <a 
                          href={formatWhatsAppLink(order.phone_number, `Hello ${order.full_name}, regarding your order #${order.id}...`)}
                          target="_blank" 
                          referrerPolicy="no-referrer"
                          className="text-[10px] text-emerald-600 hover:underline flex items-center gap-0.5 mt-0.5"
                        >
                          <Phone className="h-2.5 w-2.5 shrink-0" />
                          {order.phone_number}
                        </a>
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-900">
                        {formatKES(order.total_amount)}
                      </td>
                      <td className="py-3 px-3">
                        {getOrderStatusBadge(order.status)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => onViewOrder(order)}
                          className="bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 text-[10px] font-bold py-1 px-2.5 rounded transition-all inline-block"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Column: Recent Bookings */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col min-h-[480px]">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Wrench className="h-4 w-4 text-indigo-600" />
                Recent Repair Bookings
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Electronics diagnosis & repair jobs</p>
            </div>
            <button
              onClick={() => onNavigate('repairs')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 hover:underline transition-all"
            >
              View All
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-x-auto">
            {recentBookings.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                <Wrench className="h-8 w-8 text-slate-300 mb-2" />
                <p className="text-sm">No recent bookings found</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold bg-slate-50/50">
                    <th className="py-2.5 px-3">Booking ID</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Device</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentBookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="py-3 px-3 font-mono font-bold text-slate-500 group-hover:text-slate-900 transition-colors">
                        #{booking.id.split('-')[1] || booking.id.substring(0, 8)}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">{booking.full_name}</div>
                        <a 
                          href={formatWhatsAppLink(booking.phone_number, `Hello ${booking.full_name}, regarding your repair booking #${booking.id}...`)}
                          target="_blank" 
                          referrerPolicy="no-referrer"
                          className="text-[10px] text-emerald-600 hover:underline flex items-center gap-0.5 mt-0.5"
                        >
                          <Phone className="h-2.5 w-2.5 shrink-0" />
                          {booking.phone_number}
                        </a>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-700">{booking.device_type}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{booking.device_model}</div>
                      </td>
                      <td className="py-3 px-3">
                        {getBookingStatusBadge(booking.status)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => onViewBooking(booking)}
                          className="bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-600 text-[10px] font-bold py-1 px-2.5 rounded transition-all inline-block"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
