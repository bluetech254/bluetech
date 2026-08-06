import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import { trackOrdersByPhone, cancelOrder } from '../api/orders';
import { Order } from '../types';
import { formatCurrency } from '../utils/formatters';
import Loading from '../components/common/Loading';
import { Package, ChevronRight, X, RotateCcw, MapPin, Phone, CreditCard, Star, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_STEPS = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

const STATUS_COLOR: Record<string, string> = {
  pending:    'bg-amber-100 text-amber-700',
  confirmed:  'bg-blue-100 text-blue-700',
  processing: 'bg-purple-100 text-purple-700',
  shipped:    'bg-indigo-100 text-indigo-700',
  delivered:  'bg-green-100 text-green-700',
  cancelled:  'bg-red-100 text-red-700',
};

export const OrdersPage = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { addItem } = useCart();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate('/login', { state: { from: { pathname: '/orders' } } });
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    if (!user?.phone_number) return;
    trackOrdersByPhone(user.phone_number)
      .then(data => setOrders(data))
      .catch(() => toast.error('Failed to load orders'))
      .finally(() => setLoading(false));
  }, [user]);

  const handleCancel = async (orderId: string) => {
    if (!confirm('Cancel this order?')) return;
    setCancelling(orderId);
    try {
      await cancelOrder(orderId);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' as any } : o));
      toast.success('Order cancelled');
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? 'Cannot cancel this order');
    } finally {
      setCancelling(null);
    }
  };

  const handleReorder = (order: Order) => {
    (order.items ?? []).forEach((item: any) => {
      if (item.product_id) addItem({ id: item.product_id, title: item.product_name, price: item.price } as any, item.quantity);
    });
    toast.success('Items added to cart');
    navigate('/cart');
  };

  if (isLoading || loading) return <Loading fullScreen message="Loading your orders..." />;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-black text-slate-900">My Orders</h1>
        <Link to="/products" className="text-xs font-bold text-blue-600 hover:underline">+ Shop more</Link>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20">
          <Package className="w-14 h-14 text-slate-200 mx-auto mb-3" />
          <p className="font-black text-slate-500 mb-2">No orders yet</p>
          <Link to="/products" className="text-sm font-bold text-blue-600 hover:underline">Start shopping</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => {
            const isOpen = expanded === order.id;
            const stepIdx = STATUS_STEPS.indexOf(order.status);
            return (
              <div key={order.id} className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                {/* Header row */}
                <button
                  className="w-full flex items-center justify-between px-4 py-4 hover:bg-slate-50 transition-colors text-left"
                  onClick={() => setExpanded(isOpen ? null : order.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-xl"><Package className="w-4 h-4 text-blue-600" /></div>
                    <div>
                      <p className="text-sm font-black text-slate-900">#{(order.order_number || order.id).slice(0, 8).toUpperCase()}</p>
                      <p className="text-xs text-slate-400">{new Date(order.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full capitalize ${STATUS_COLOR[order.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {order.status}
                    </span>
                    <span className="text-sm font-black text-blue-600">{formatCurrency(order.total_amount)}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  </div>
                </button>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="border-t border-slate-100 px-4 py-4 space-y-4">
                    {/* Progress tracker */}
                    {order.status !== 'cancelled' && (
                      <div className="flex items-center gap-1">
                        {STATUS_STEPS.map((s, i) => (
                          <React.Fragment key={s}>
                            <div className={`flex-1 h-1.5 rounded-full ${i <= stepIdx ? 'bg-blue-500' : 'bg-slate-100'}`} />
                            {i < STATUS_STEPS.length - 1 && null}
                          </React.Fragment>
                        ))}
                      </div>
                    )}
                    {order.status !== 'cancelled' && (
                      <p className="text-xs text-slate-500 capitalize">
                        Status: <span className="font-bold text-slate-800">{order.status}</span>
                        {order.status === 'shipped' && ' — your order is on the way!'}
                        {order.status === 'delivered' && ' — enjoy your purchase!'}
                      </p>
                    )}

                    {/* Items */}
                    <div>
                      <p className="text-xs font-black text-slate-500 uppercase tracking-wide mb-2">Items</p>
                      <div className="space-y-1.5">
                        {(order.items ?? []).map((item: any, i: number) => (
                          <div key={i} className="flex justify-between text-sm">
                            <span className="text-slate-700">{item.product_name ?? item.product_title} <span className="text-slate-400">×{item.quantity}</span></span>
                            <span className="font-bold text-slate-800">{formatCurrency((item.price ?? item.unit_price) * item.quantity)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Totals */}
                    <div className="bg-slate-50 rounded-xl p-3 space-y-1 text-xs">
                      <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
                      <div className="flex justify-between text-slate-600"><span>Delivery</span><span>{formatCurrency(order.delivery_fee)}</span></div>
                      {(order as any).points_discount > 0 && (
                        <div className="flex justify-between text-green-600"><span>Points discount</span><span>-{formatCurrency((order as any).points_discount)}</span></div>
                      )}
                      <div className="flex justify-between font-black text-slate-900 pt-1 border-t border-slate-200"><span>Total</span><span>{formatCurrency(order.total_amount)}</span></div>
                    </div>

                    {/* Delivery info */}
                    <div className="space-y-1 text-xs text-slate-500">
                      <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 shrink-0" />{order.delivery_address} · {order.delivery_zone}</p>
                      <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 shrink-0" />{order.phone_number}</p>
                      <p className="flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5 shrink-0" />
                        {(order as any).payment_method === 'points_only' ? '⚡ Points Wallet' : (order as any).payment_method?.replace(/_/g, ' ')}
                        {' · '}
                        <span className={`font-bold ${(order as any).payment_status === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>
                          {(order as any).payment_status ?? 'unpaid'}
                        </span>
                      </p>
                      {(order as any).points_redeemed > 0 && (
                        <p className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-yellow-500" />{(order as any).points_redeemed} pts redeemed</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                      {order.status === 'pending' && (
                        <button
                          onClick={() => handleCancel(order.id)}
                          disabled={cancelling === order.id}
                          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" />
                          {cancelling === order.id ? 'Cancelling…' : 'Cancel Order'}
                        </button>
                      )}
                      {(order.items ?? []).length > 0 && (
                        <button
                          onClick={() => handleReorder(order)}
                          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-50 transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Reorder
                        </button>
                      )}
                      <Link
                        to={`/track-order?type=order&id=${order.id}`}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors ml-auto"
                      >
                        Track <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
