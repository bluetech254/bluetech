import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getOrderById } from '../api/orders';
import { Order } from '../types';
import { formatCurrency } from '../utils/formatters';
import { MPESA_PAYBILL } from '../utils/constants';
import Loading from '../components/common/Loading';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import { CheckCircle, Truck, Clipboard, ShieldCheck, CreditCard, ArrowRight, ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export const OrderSuccessPage = () => {
  const navigate = useNavigate();
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    const fetchOrder = async () => {
      try {
        const data = await getOrderById(orderId);
        setOrder(data);
      } catch (err) {
        console.error('Failed to load completed order:', err);
        toast.error('Failed to load completed order parameters.');
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId]);

  const copyOrderId = () => {
    if (!orderId) return;
    navigator.clipboard.writeText(orderId);
    toast.success('Purchase Order ID copied to clipboard!');
  };

  if (loading) {
    return <Loading fullScreen message="Retrieving order confirmations..." />;
  }

  if (!order) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-red-600">Order Not Resolved</h2>
        <p className="text-sm text-slate-500">We could not resolve your purchase order detail. Back out or contact custom care.</p>
        <Link to="/" className="text-sm font-semibold text-blue-600 hover:underline">Return Home</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-10 space-y-8 animate-fade-in text-left">
      {/* Centered Success Hero Card */}
      <div className="bg-white border border-slate-100 rounded-3xl p-8 text-center shadow-lg space-y-5">
        <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle className="w-11 h-11" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none">
            Purchase Placed Successfully!
          </h1>
          <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            Thank you for shopping at BlueTech. Your order has been registered and is being prepared for dispatch.
          </p>
        </div>

        {/* Copyable Order ID block */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 inline-flex flex-col sm:flex-row items-center justify-between gap-4 w-full max-w-md mx-auto text-left">
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Your Order Tracking ID</span>
            <span className="font-mono font-bold text-slate-800 text-sm">{orderId}</span>
          </div>
          <button
            onClick={copyOrderId}
            className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 cursor-pointer shadow-xs transition-colors flex items-center"
          >
            <Clipboard className="w-3.5 h-3.5 mr-1.5" />
            Copy ID
          </button>
        </div>
      </div>

      {/* Details breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Shipping summary */}
        <Card className="p-6 space-y-4">
          <h3 className="font-bold text-slate-900 border-b border-slate-50 pb-2.5 flex items-center text-sm uppercase tracking-wider text-slate-400">
            <Truck className="w-4 h-4 text-blue-600 mr-2" />
            Shipping Destination
          </h3>
          <div className="space-y-2 text-sm text-slate-600">
            <p><strong className="text-slate-800">Recipient:</strong> {order.customer_name}</p>
            <p><strong className="text-slate-800">Phone:</strong> {order.phone_number}</p>
            {order.email && <p><strong className="text-slate-800">Email:</strong> {order.email}</p>}
            <p><strong className="text-slate-800">Zone:</strong> {order.delivery_zone}</p>
            <p className="leading-relaxed"><strong className="text-slate-800">Address:</strong> {order.delivery_address}</p>
          </div>
        </Card>

        {/* Calculations / payment */}
        <Card className="p-6 space-y-4">
          <h3 className="font-bold text-slate-900 border-b border-slate-50 pb-2.5 flex items-center text-sm uppercase tracking-wider text-slate-400">
            <CreditCard className="w-4 h-4 text-blue-600 mr-2" />
            Receipt Totals
          </h3>
          <div className="space-y-3.5 text-sm text-slate-600">
            <div className="flex justify-between">
              <span>Items Subtotal:</span>
              <span className="font-bold text-slate-900">{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery Fee:</span>
              <span className="font-bold text-slate-900">{formatCurrency(order.delivery_fee)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-2.5 text-slate-950 font-black">
              <span>Total Paid:</span>
              <span className="text-blue-600 text-base">{formatCurrency(order.total_amount)}</span>
            </div>
            <div className="pt-1.5 flex items-center justify-between">
              <span className="font-bold">Payment Status:</span>
              <Badge variant={order.payment_status === 'paid' ? 'success' : 'warning'}>
                {order.payment_status === 'paid' ? 'Completed' : 'Pending Verification'}
              </Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* Conditional M-Pesa Instructions */}
      {order.payment_method === 'mpesa' && order.payment_status === 'pending' && (
        <Card className="p-6 bg-green-50 border-green-100 text-green-800 text-xs sm:text-sm space-y-2.5 font-medium">
          <h3 className="font-bold text-base flex items-center">
            <ShieldCheck className="w-5 h-5 text-green-600 mr-2" />
            Lipa Na M-Pesa Verification Reminder
          </h3>
          <p>
            Your order payment method is listed as M-Pesa. If you have not completed the mobile checkout already, please execute the Lipa Na M-Pesa Paybill payment matching the totals above:
          </p>
          <div className="p-3 bg-white/70 rounded-xl inline-block space-y-1 text-slate-800">
            <p>Paybill Business Number: <strong>{MPESA_PAYBILL}</strong></p>
            <p>Account Name/Number: <strong>{order.phone_number}</strong></p>
            <p>Amount to Pay: <strong>{formatCurrency(order.total_amount)}</strong></p>
          </div>
          <p className="text-[11px] text-green-600 font-bold">
            Once payment is detected, your order status will automatically transition from "Pending" to "Paid" and dispatch will trigger.
          </p>
        </Card>
      )}

      {/* Forward CTAs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-t border-slate-100 pt-6">
        <Link
          to="/"
          className="text-sm font-bold text-slate-500 hover:text-slate-800 flex items-center justify-center sm:justify-start"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Return to Storefront
        </Link>
        
        <Button
          variant="primary"
          onClick={() => navigate(`/track-order?type=order&id=${orderId}`)}
          rightIcon={<ArrowRight className="w-4 h-4" />}
          className="py-3 px-6 font-bold"
        >
          Track Shipment
        </Button>
      </div>
    </div>
  );
};

export default OrderSuccessPage;
