import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { getOrderById, cancelOrder } from '../api/orders';
import { formatCurrency } from '../utils/formatters';
import Loading from '../components/common/Loading';
import { ChevronLeft, MapPin, Phone, CreditCard, Star, RotateCcw, X, Package } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_STEPS = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];
const STATUS_COLOR: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  processing:'bg-purple-100 text-purple-700',
  shipped:   'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export const OrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!id) return;
    getOrderById(id)
      .then(setOrder)
      .catch(() => toast.error('Order not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleCancel = async () => {
    if (!confirm('Cancel this order?')) return;
    setCancelling(true);
    try {
      await cancelOrder(id!);
      setOrder((o: any) => ({ ...o, status: 'cancelled' }));
      toast.success('Order cancelled');
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? 'Cannot cancel this order');
    } finally {
      setCancelling(false);
    }
  };

  const handleReorder = () => {
    (order.order_items ?? order.items ?? []).forEach((item: any) => {
      addItem({ id: item.product_id, title: item.product_title ?? item.product_name, price: item.unit_price ?? item.price } as any, item.quantity);
    });
    toast.success('Items added to cart');
    navigate('/cart');
  };

  if (loading) return <Loading fullScreen message="Loading order..." />;
  if (!order) return (
    <div className="text-center py-20">
      <p className="text-slate-500 font-bold">Order not found</p>
      <Link to="/orders" className="text-blue-600 text-sm font-bold hover:underline mt-2 inline-block">← Back to orders</Link>
    </div>
  );

  const stepIdx = STATUS_STEPS.indexOf(order.status);
  const items = order.order_items ?? order.items ?? [];

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24 space-y-4">
      {/* Back */}
      <button onClick={() => navigate('/orders')} className="flex items-center gap-1 text-sm font-bold text-blue-600 hover:underline">
        <ChevronLeft className="w-4 h-4" /> Back to Orders
      </button>

      {/* Header */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5">
        <div className="flex items-start justify-between mb-1">
          <div>
            <p className="text-xs text-slate-400 font-mono">#{(order.order_number || order.id).slice(0, 8).toUpperCase()}</p>
            <h1 className="text-lg font-black text-slate-900">Order Details</h1>
          </div>
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full capitalize ${STATUS_COLOR[order.status] ?? 'bg-slate-100 text-slate-600'}`}>
            {order.status}
          </span>
        </div>
        <p className="text-xs text-slate-400">{new Date(order.created_at).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}</p>

        {/* Progress bar */}
        {order.status !== 'cancelled' && (
          <div className="mt-4">
            <div className="flex items-center gap-1 mb-2">
              {STATUS_STEPS.map((s, i) => (
                <div key={s} className={`flex-1 h-2 rounded-full transition-all ${i <= stepIdx ? 'bg-blue-500' : 'bg-slate-100'}`} />
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-medium">
              {STATUS_STEPS.map(s => <span key={s} className="capitalize">{s}</span>)}
            </div>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5">
        <p className="text-xs font-black text-slate-500 uppercase tracking-wide mb-3">Items</p>
        <div className="space-y-3">
          {items.map((item: any, i: number) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Package className="w-4 h-4 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">{item.product_title ?? item.product_name}</p>
                  <p className="text-xs text-slate-400">Qty: {item.quantity}</p>
                </div>
              </div>
              <p className="text-sm font-black text-slate-900">{formatCurrency((item.unit_price ?? item.price) * item.quantity)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-2 text-sm">
        <p className="text-xs font-black text-slate-500 uppercase tracking-wide mb-3">Payment Summary</p>
        <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{formatCurrency(order.subtotal)}</span></div>
        <div className="flex justify-between text-slate-600"><span>Delivery</span><span>{formatCurrency(order.delivery_fee)}</span></div>
        {order.points_discount > 0 && (
          <div className="flex justify-between text-green-600"><span>Points discount</span><span>-{formatCurrency(order.points_discount)}</span></div>
        )}
        <div className="flex justify-between font-black text-slate-900 text-base pt-2 border-t border-slate-100">
          <span>Total</span><span>{formatCurrency(order.total_amount)}</span>
        </div>
        <div className="pt-2 space-y-1 text-xs text-slate-500">
          <p className="flex items-center gap-2">
            <CreditCard className="w-3.5 h-3.5" />
            {order.payment_method === 'points_only' ? '⚡ Points Wallet' : order.payment_method?.replace(/_/g, ' ')}
            <span className={`font-bold ml-auto ${order.payment_status === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>
              {order.payment_status ?? 'unpaid'}
            </span>
          </p>
          {order.points_redeemed > 0 && (
            <p className="flex items-center gap-2"><Star className="w-3.5 h-3.5 text-yellow-500" />{order.points_redeemed} pts redeemed</p>
          )}
        </div>
      </div>

      {/* Delivery info */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-2 text-sm text-slate-600">
        <p className="text-xs font-black text-slate-500 uppercase tracking-wide mb-3">Delivery Info</p>
        <p className="flex items-start gap-2"><MapPin className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />{order.delivery_address} · {order.delivery_zone}</p>
        <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-slate-400" />{order.phone_number}</p>
        {order.notes && <p className="text-xs text-slate-400 italic">"{order.notes}"</p>}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {order.status === 'pending' && (
          <button onClick={handleCancel} disabled={cancelling}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold text-red-600 border-2 border-red-200 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-50">
            <X className="w-4 h-4" />{cancelling ? 'Cancelling…' : 'Cancel Order'}
          </button>
        )}
        {items.length > 0 && (
          <button onClick={handleReorder}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold text-blue-600 border-2 border-blue-200 rounded-xl hover:bg-blue-50 transition-colors">
            <RotateCcw className="w-4 h-4" />Reorder
          </button>
        )}
      </div>
    </div>
  );
};

export default OrderDetailPage;
