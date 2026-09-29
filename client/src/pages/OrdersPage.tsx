import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { trackOrdersByPhone } from '../api/orders';
import { trackBookingsByPhone } from '../api/bookings';
import { Order, Booking } from '../types';
import { formatCurrency } from '../utils/formatters';
import Loading from '../components/common/Loading';
import { Package, Wrench, ChevronRight, ShoppingBag, Clock } from 'lucide-react';

const STATUS_COLOR: Record<string, { bg: string; text: string; dot: string }> = {
  pending:     { bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-400' },
  confirmed:   { bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-400' },
  processing:  { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-400' },
  shipped:     { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-400' },
  delivered:   { bg: 'bg-emerald-50',text: 'text-emerald-700',dot: 'bg-emerald-400' },
  completed:   { bg: 'bg-emerald-50',text: 'text-emerald-700',dot: 'bg-emerald-400' },
  in_progress: { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-400' },
  cancelled:   { bg: 'bg-red-50',    text: 'text-red-600',    dot: 'bg-red-400' },
};

const StatusBadge = ({ status }: { status: string }) => {
  const s = STATUS_COLOR[status] ?? { bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status.replace(/_/g, ' ')}
    </span>
  );
};

type Tab = 'orders' | 'repairs';

export const OrdersPage = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate('/login', { state: { from: { pathname: '/orders' } } });
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    if (!user?.phone_number) return;
    Promise.all([
      trackOrdersByPhone(user.phone_number).catch(() => []),
      trackBookingsByPhone(user.phone_number).catch(() => []),
    ]).then(([o, b]) => { setOrders(o); setBookings(b); }).finally(() => setLoading(false));
  }, [user]);

  if (isLoading || loading) return <Loading fullScreen message="Loading your orders…" />;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-8 pb-28" style={{ marginTop: '-50px' }}>

        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-black text-slate-900">My Orders</h1>
          <p className="text-sm text-slate-500 mt-0.5">Track your purchases and repair bookings</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['orders', 'repairs'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                tab === t
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                  : 'bg-white text-slate-500 border border-slate-200 hover:border-blue-200 hover:text-blue-600'
              }`}>
              {t === 'orders' ? <Package className="w-4 h-4" /> : <Wrench className="w-4 h-4" />}
              {t === 'orders' ? 'Orders' : 'Repairs'}
              <span className={`text-[11px] font-black px-1.5 py-0.5 rounded-md ${
                tab === t ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {t === 'orders' ? orders.length : bookings.length}
              </span>
            </button>
          ))}
        </div>

        {/* Orders list */}
        {tab === 'orders' && (
          <div className="space-y-3">
            {orders.length === 0 ? (
              <div className="bg-white border border-slate-100 rounded-2xl py-16 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <ShoppingBag className="w-7 h-7 text-slate-300" />
                </div>
                <p className="font-bold text-slate-700 mb-1">No orders yet</p>
                <p className="text-sm text-slate-400 mb-5">Your order history will appear here</p>
                <Link to="/products"
                  className="inline-flex items-center gap-2 bg-blue-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors">
                  Browse Products
                </Link>
              </div>
            ) : orders.map(order => (
              <Link key={order.id} to={`/orders/${order.id}`}
                className="group flex items-center gap-4 bg-white border border-slate-100 rounded-2xl px-4 py-4 hover:border-blue-200 hover:shadow-md hover:shadow-blue-50 transition-all">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-black text-slate-900">
                      #{(order.order_number || order.id).slice(0, 8).toUpperCase()}
                    </p>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="text-xs text-slate-400">
                    {new Date(order.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {order.delivery_address && (
                      <span className="ml-1">· 📍 {order.delivery_address}</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${
                      order.payment_status === 'paid'
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-amber-50 text-amber-600'
                    }`}>
                      {order.payment_status ?? 'unpaid'}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-black text-slate-900">{formatCurrency(order.total_amount)}</span>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Repairs list */}
        {tab === 'repairs' && (
          <div className="space-y-3">
            {bookings.length === 0 ? (
              <div className="bg-white border border-slate-100 rounded-2xl py-16 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Wrench className="w-7 h-7 text-slate-300" />
                </div>
                <p className="font-bold text-slate-700 mb-1">No repair bookings</p>
                <p className="text-sm text-slate-400 mb-5">Book a repair and track it here</p>
                <Link to="/services"
                  className="inline-flex items-center gap-2 bg-violet-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-violet-700 transition-colors">
                  Book a Repair
                </Link>
              </div>
            ) : bookings.map(booking => (
              <Link key={booking.id} to={`/bookings/${booking.id}`}
                className="group flex items-center gap-4 bg-white border border-slate-100 rounded-2xl px-4 py-4 hover:border-violet-200 hover:shadow-md hover:shadow-violet-50 transition-all">
                <div className="w-10 h-10 bg-violet-50 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-violet-100 transition-colors">
                  <Wrench className="w-5 h-5 text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-black text-slate-900 truncate">
                      {(booking as any).device_brand} {booking.device_model}
                    </p>
                    <StatusBadge status={booking.status} />
                  </div>
                  <p className="text-xs text-slate-400 truncate">{booking.issue_description}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Clock className="w-3.5 h-3.5 text-slate-300" />
                  <span className="text-xs text-slate-400">
                    {new Date(booking.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all ml-1" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersPage;
