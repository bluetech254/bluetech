import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { trackOrdersByPhone } from '../api/orders';
import { trackBookingsByPhone } from '../api/bookings';
import { Order, Booking } from '../types';
import { formatCurrency } from '../utils/formatters';
import Loading from '../components/common/Loading';
import { Package, Wrench, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_COLOR: Record<string, string> = {
  pending:    'bg-amber-100 text-amber-700',
  confirmed:  'bg-blue-100 text-blue-700',
  processing: 'bg-purple-100 text-purple-700',
  shipped:    'bg-indigo-100 text-indigo-700',
  delivered:  'bg-green-100 text-green-700',
  completed:  'bg-green-100 text-green-700',
  in_progress:'bg-purple-100 text-purple-700',
  cancelled:  'bg-red-100 text-red-700',
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

  if (isLoading || loading) return <Loading fullScreen message="Loading..." />;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
      <h1 className="text-xl font-black text-slate-900 mb-4">My Orders & Repairs</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-5">
        {(['orders', 'repairs'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all capitalize ${tab === t ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>
            {t === 'orders' ? `Orders (${orders.length})` : `Repairs (${bookings.length})`}
          </button>
        ))}
      </div>

      {tab === 'orders' && (
        <div className="space-y-3">
          {orders.length === 0 ? (
            <div className="text-center py-20">
              <Package className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="font-bold text-slate-400 mb-2">No orders yet</p>
              <Link to="/products" className="text-sm font-bold text-blue-600 hover:underline">Start shopping</Link>
            </div>
          ) : orders.map(order => (
            <Link key={order.id} to={`/orders/${order.id}`}
              className="flex items-center justify-between bg-white border border-slate-100 rounded-2xl px-4 py-4 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition-colors">
                  <Package className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900">#{(order.order_number || order.id).slice(0, 8).toUpperCase()}</p>
                  <p className="text-xs text-slate-400">{new Date(order.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })} · {(order.items ?? []).length} item(s)</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full capitalize ${STATUS_COLOR[order.status] ?? 'bg-slate-100 text-slate-600'}`}>{order.status}</span>
                <span className="text-sm font-black text-blue-600">{formatCurrency(order.total_amount)}</span>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {tab === 'repairs' && (
        <div className="space-y-3">
          {bookings.length === 0 ? (
            <div className="text-center py-20">
              <Wrench className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="font-bold text-slate-400 mb-2">No repair bookings</p>
              <Link to="/services" className="text-sm font-bold text-blue-600 hover:underline">Book a repair</Link>
            </div>
          ) : bookings.map(booking => (
            <Link key={booking.id} to={`/bookings/${booking.id}`}
              className="flex items-center justify-between bg-white border border-slate-100 rounded-2xl px-4 py-4 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-xl group-hover:bg-purple-100 transition-colors">
                  <Wrench className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900">{(booking as any).device_brand} {booking.device_model}</p>
                  <p className="text-xs text-slate-400 line-clamp-1">{booking.issue_description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full capitalize ${STATUS_COLOR[booking.status] ?? 'bg-slate-100 text-slate-600'}`}>{booking.status.replace(/_/g, ' ')}</span>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
