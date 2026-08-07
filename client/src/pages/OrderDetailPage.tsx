import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { getOrderById, cancelOrder } from '../api/orders';
import { formatCurrency } from '../utils/formatters';
import Loading from '../components/common/Loading';
import {
  ChevronLeft, MapPin, Phone, CreditCard, Star,
  RotateCcw, X, Package, CheckCircle2, Circle, Truck, Box, Clock
} from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_STEPS = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

const STATUS_COLOR: Record<string, { bg: string; text: string; dot: string }> = {
  pending:    { bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-400' },
  confirmed:  { bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-400' },
  processing: { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-400' },
  shipped:    { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-400' },
  delivered:  { bg: 'bg-emerald-50',text: 'text-emerald-700',dot: 'bg-emerald-400' },
  cancelled:  { bg: 'bg-red-50',    text: 'text-red-600',    dot: 'bg-red-400' },
};

const STEP_ICONS = [Clock, CheckCircle2, Box, Truck, CheckCircle2];

const StatusBadge = ({ status }: { status: string }) => {
  const s = STATUS_COLOR[status] ?? { bg: 'bg-slate-50', text: 'text-slate-600', dot: 'bg-slate-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full capitalize ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status.replace(/_/g, ' ')}
    </span>
  );
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

  if (loading) return <Loading fullScreen message="Loading order…" />;
  if (!order) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3">
      <Package className="w-12 h-12 text-slate-200" />
      <p className="font-bold text-slate-500">Order not found</p>
      <Link to="/orders" className="text-sm font-bold text-blue-600 hover:underline">← Back to orders</Link>
    </div>
  );

  const stepIdx = STATUS_STEPS.indexOf(order.status);
  const items = order.order_items ?? order.items ?? [];
  const isCancelled = order.status === 'cancelled';

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-lg mx-auto px-4 pb-28 space-y-4" style={{ paddingTop: 0, marginTop: '-50px' }}>

        {/* Back nav */}
        <button onClick={() => navigate('/orders')}
          className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-blue-600 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back to Orders
        </button>

        {/* Header card */}
        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
          <div className="px-5 pt-5 pb-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs text-slate-400 font-mono mb-0.5">
                  #{(order.order_number || order.id).slice(0, 8).toUpperCase()}
                </p>
                <h1 className="text-xl font-black text-slate-900">Order Details</h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  {new Date(order.created_at).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              </div>
              <StatusBadge status={order.status} />
            </div>
          </div>

          {/* Progress tracker */}
          {!isCancelled && (
            <div className="px-5 pb-5 border-t border-slate-50 pt-4">
              <div className="relative flex items-center justify-between">
                {/* connecting line */}
                <div className="absolute left-0 right-0 top-4 h-0.5 bg-slate-100 z-0" />
                <div
                  className="absolute left-0 top-4 h-0.5 bg-blue-500 z-0 transition-all duration-500"
                  style={{ width: stepIdx >= 0 ? `${(stepIdx / (STATUS_STEPS.length - 1)) * 100}%` : '0%' }}
                />
                {STATUS_STEPS.map((step, i) => {
                  const Icon = STEP_ICONS[i];
                  const done = i < stepIdx;
                  const active = i === stepIdx;
                  return (
                    <div key={step} className="relative z-10 flex flex-col items-center gap-1.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        done    ? 'bg-blue-500 text-white' :
                        active  ? 'bg-blue-600 text-white ring-4 ring-blue-100' :
                                  'bg-white border-2 border-slate-200 text-slate-300'
                      }`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className={`text-[9px] font-bold capitalize text-center leading-tight ${
                        active ? 'text-blue-600' : done ? 'text-slate-500' : 'text-slate-300'
                      }`}>{step}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {isCancelled && (
            <div className="mx-5 mb-5 bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-center gap-3">
              <X className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-sm font-semibold text-red-600">This order has been cancelled</p>
            </div>
          )}
        </div>

        {/* Items */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Order Items</p>
          <div className="divide-y divide-slate-50">
            {items.map((item: any, i: number) => (
              <div key={i} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center shrink-0">
                  <Package className="w-4 h-4 text-slate-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{item.product_title ?? item.product_name}</p>
                  <p className="text-xs text-slate-400">Qty {item.quantity} × {formatCurrency(item.unit_price ?? item.price)}</p>
                </div>
                <p className="text-sm font-black text-slate-900 shrink-0">
                  {formatCurrency((item.unit_price ?? item.price) * item.quantity)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Payment summary */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Payment Summary</p>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="font-semibold">{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Delivery fee</span>
              <span className="font-semibold">{formatCurrency(order.delivery_fee)}</span>
            </div>
            {order.points_discount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5" />Points discount</span>
                <span className="font-semibold">−{formatCurrency(order.points_discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-black text-slate-900 text-base pt-3 border-t border-slate-100">
              <span>Total</span>
              <span>{formatCurrency(order.total_amount)}</span>
            </div>
          </div>

          {/* Payment method row */}
          <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <CreditCard className="w-4 h-4 text-slate-400" />
              <span className="capitalize">
                {order.payment_method === 'points_only' ? 'Points Wallet' : (order.payment_method ?? '').replace(/_/g, ' ')}
              </span>
              {order.points_redeemed > 0 && (
                <span className="text-xs text-amber-600 font-semibold">· {order.points_redeemed} pts used</span>
              )}
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${
              order.payment_status === 'paid'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-amber-50 text-amber-700'
            }`}>
              {order.payment_status ?? 'unpaid'}
            </span>
          </div>
        </div>

        {/* Delivery info */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Delivery Info</p>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{order.delivery_address}</p>
                <p className="text-xs text-slate-400">{order.delivery_zone}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-800">{order.phone_number}</p>
            </div>
            {order.notes && (
              <div className="bg-slate-50 rounded-xl px-4 py-3">
                <p className="text-xs text-slate-500 italic">"{order.notes}"</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {(order.status === 'pending' || items.length > 0) && (
          <div className="flex gap-3">
            {order.status === 'pending' && (
              <button onClick={handleCancel} disabled={cancelling}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-bold text-red-600 bg-white border-2 border-red-100 rounded-xl hover:bg-red-50 hover:border-red-200 transition-all disabled:opacity-50">
                <X className="w-4 h-4" />
                {cancelling ? 'Cancelling…' : 'Cancel Order'}
              </button>
            )}
            {items.length > 0 && (
              <button onClick={handleReorder}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200">
                <RotateCcw className="w-4 h-4" />
                Reorder
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderDetailPage;
