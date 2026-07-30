import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { getDeliveryZones } from '../api/zones';
import { createOrder, initiateMpesaPayment } from '../api/orders';
import { getMyPoints } from '../api/points';
import { DeliveryZone } from '../types';
import { orderSchema } from '../utils/validation';
import { formatCurrency } from '../utils/formatters';
import { MPESA_PAYBILL } from '../utils/constants';
import Loading from '../components/common/Loading';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import MpesaWaitingModal from '../components/cart/MpesaWaitingModal';
import { ChevronLeft, CreditCard, DollarSign, Loader2, ClipboardCheck, AlertCircle, Phone, MapPin, Sparkles, CheckCircle, FileText, Star } from 'lucide-react';
import toast from 'react-hot-toast';

export const CheckoutPage = () => {
  const { items, subtotal, clearCart } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loadingZones, setLoadingZones] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mpesaOrder, setMpesaOrder] = useState<{ orderId: string; phone: string; amount: string } | null>(null);
  const [pointsBalance, setPointsBalance] = useState(0);
  const [redeemPoints, setRedeemPoints] = useState(false);

  // Restore pre-selected zone from sessionStorage
  const defaultZoneId = sessionStorage.getItem('bluetech_delivery_zone_id') || '';

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      customer_name: '',
      phone_number: '',
      email: '',
      delivery_address: '',
      delivery_zone: defaultZoneId,
      payment_method: 'mpesa' as 'mpesa' | 'cash_on_delivery',
      notes: '',
      referral_code: '',
      redeem_points: 0,
      terms_accepted: false,
    }
  });

  const watchedZoneId = watch('delivery_zone');
  const watchedPaymentMethod = watch('payment_method');

  // Load Zones
  useEffect(() => {
    const fetchZones = async () => {
      try {
        const data = await getDeliveryZones();
        setZones(data || []);
      } catch (err) {
        console.error('Failed to load zones:', err);
      } finally {
        setLoadingZones(false);
      }
    };
    fetchZones();
  }, []);

  // Load points balance for authenticated users
  useEffect(() => {
    if (isAuthenticated) {
      getMyPoints().then(d => setPointsBalance(d.points_balance)).catch(() => {});
    }
  }, [isAuthenticated]);

  const orderPlaced = useRef(false);

  // Guard Clause: No items in cart -> go back to cart
  useEffect(() => {
    if (!loadingZones && items.length === 0 && !orderPlaced.current) {
      toast.error('Your cart is empty. Please add items before checking out.');
      navigate('/cart');
    }
  }, [items, loadingZones, navigate]);

  const selectedZone = zones.find(z => z.id === watchedZoneId);
  const deliveryFee = selectedZone ? selectedZone.delivery_fee : 0;
  const pointsDiscount = redeemPoints && pointsBalance >= 1000 ? pointsBalance : 0;
  const grandTotal = subtotal - pointsDiscount + deliveryFee;

  const onSubmit = async (formData: any) => {
    if (items.length === 0) return;
    const finalZone = zones.find(z => z.id === formData.delivery_zone);
    if (!finalZone) {
      toast.error('Please select a valid delivery zone');
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading('Processing your purchase order...');

    try {
      // Normalize phone number: remove leading 0 if present, add 254 prefix
      let phoneNumber = formData.phone_number.trim();
      if (phoneNumber.startsWith('0')) {
        phoneNumber = phoneNumber.substring(1);
      }
      if (!phoneNumber.startsWith('254')) {
        phoneNumber = '254' + phoneNumber;
      }

      const orderItems = items.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
      }));

      const orderPayload = {
        full_name: formData.customer_name,
        phone_number: phoneNumber,
        email: formData.email || undefined,
        delivery_address: formData.delivery_address,
        delivery_zone: finalZone.zone_name,
        items: orderItems,
        notes: formData.notes || undefined,
        payment_method: formData.payment_method,
        referral_code: formData.referral_code || undefined,
        redeem_points: redeemPoints && pointsBalance >= 1000 ? pointsBalance : undefined,
      };

      console.log('Sending order:', orderPayload);

      const response = await createOrder(orderPayload);

      if (formData.payment_method === 'mpesa') {
        // Initiate STK push then show waiting modal
        try {
          await initiateMpesaPayment(response.id);
          orderPlaced.current = true;
          clearCart();
          sessionStorage.removeItem('bluetech_delivery_zone_id');
          toast.dismiss(toastId);
          setMpesaOrder({ orderId: response.id, phone: phoneNumber, amount: formatCurrency(grandTotal) });
        } catch {
          toast.error('Order created but M-Pesa prompt failed. Please retry payment.', { id: toastId });
        }
      } else {
        toast.success('Order placed successfully!', { id: toastId });
        orderPlaced.current = true;
        clearCart();
        sessionStorage.removeItem('bluetech_delivery_zone_id');
        navigate(`/order-success/${response.id}`);
      }
    } catch (err: any) {
      console.error('Failed to place order:', err);
      console.error('Error response:', err.response?.data);
      const msg = err.response?.data?.detail || err.response?.data?.message || 'Failed to submit order. Check stock availability or connection.';
      toast.error(msg, { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingZones) {
    return <Loading fullScreen message="Setting up secure checkout..." />;
  }

  return (
    <div className="space-y-8 py-6 animate-fade-in text-left">
      {mpesaOrder && (
        <MpesaWaitingModal
          orderId={mpesaOrder.orderId}
          phone={mpesaOrder.phone}
          amount={mpesaOrder.amount}
          onCancel={() => setMpesaOrder(null)}
        />
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1.5 flex items-center">
            Secure Checkout
          </h1>
        </div>
        <Link to="/cart" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center">
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Shopping Cart
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Columns: Forms (65%) */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Customer Information */}
            <Card className="p-6 space-y-4">
              <h2 className="text-lg font-bold text-slate-900 border-b border-slate-50 pb-2.5 flex items-center">
                <ClipboardCheck className="w-5 h-5 text-blue-600 mr-2" />
                Step 1: Contact Details
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  id="customer_name"
                  label="Full Name (required)"
                  placeholder="e.g. Sarah Wangari"
                  error={errors.customer_name?.message}
                  {...register('customer_name')}
                />
                
                <Input
                  id="phone_number"
                  label="Phone Number (required)"
                  placeholder="Format: 2547XXXXXXXX"
                  error={errors.phone_number?.message}
                  {...register('phone_number')}
                />
              </div>

              <div className="pt-1">
                <Input
                  id="email"
                  label="Email Address (optional)"
                  type="email"
                  placeholder="e.g. sarah@example.com"
                  error={errors.email?.message}
                  {...register('email')}
                />
              </div>
            </Card>

            {/* Delivery Details */}
            <Card className="p-6 space-y-4">
              <h2 className="text-lg font-bold text-slate-900 border-b border-slate-50 pb-2.5 flex items-center">
                <MapPin className="w-5 h-5 text-blue-600 mr-2" />
                Step 2: Shipping Destination
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  id="delivery_zone"
                  label="Delivery Region (required)"
                  placeholder="-- Choose Shipping Zone --"
                  options={zones.map(z => ({ value: z.id, label: `${z.zone_name} (${formatCurrency(z.delivery_fee)})` }))}
                  error={errors.delivery_zone?.message}
                  {...register('delivery_zone')}
                />
              </div>

              <div className="text-left pt-1">
                <label htmlFor="delivery_address" className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Delivery Address / Location (required)
                </label>
                <textarea
                  id="delivery_address"
                  rows={3}
                  placeholder="Provide precise details (apartment building, house number, floor, or crossroad landmark)..."
                  className={`
                    w-full py-3 px-4 border-2 rounded-lg outline-none transition-all duration-200 text-sm bg-white
                    ${errors.delivery_address ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'}
                  `}
                  {...register('delivery_address')}
                />
                {errors.delivery_address && (
                  <div className="flex items-center text-red-600 text-xs mt-1.5 space-x-1">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.delivery_address.message}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Payment Method Selector */}
            <Card className="p-6 space-y-4 text-left">
              <h2 className="text-lg font-bold text-slate-900 border-b border-slate-50 pb-2.5 flex items-center">
                <CreditCard className="w-5 h-5 text-blue-600 mr-2" />
                Step 3: Payment Method
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* M-Pesa Option */}
                <label
                  className={`
                    border-2 rounded-xl p-4 flex items-start space-x-3 cursor-pointer transition-all
                    ${watchedPaymentMethod === 'mpesa' 
                      ? 'border-blue-500 bg-blue-50/40' 
                      : 'border-slate-100 hover:border-slate-200 bg-white'
                    }
                  `}
                >
                  <input
                    type="radio"
                    value="mpesa"
                    checked={watchedPaymentMethod === 'mpesa'}
                    className="w-4 h-4 text-blue-600 border-slate-200 mt-1 cursor-pointer"
                    {...register('payment_method')}
                  />
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 text-sm flex items-center">
                      M-Pesa Mobile Money
                      <span className="ml-1.5 bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-sm">
                        Popular
                      </span>
                    </p>
                    <p className="text-xs text-slate-500 leading-normal mt-1">
                      Pay instantly using Lipa Na M-Pesa Paybill #{MPESA_PAYBILL}. Secure transaction reference checked on dispatch.
                    </p>
                  </div>
                </label>

                {/* Cash on Delivery Option */}
                <label
                  className={`
                    border-2 rounded-xl p-4 flex items-start space-x-3 cursor-pointer transition-all
                    ${watchedPaymentMethod === 'cash_on_delivery' 
                      ? 'border-blue-500 bg-blue-50/40' 
                      : 'border-slate-100 hover:border-slate-200 bg-white'
                    }
                  `}
                >
                  <input
                    type="radio"
                    value="cash_on_delivery"
                    checked={watchedPaymentMethod === 'cash_on_delivery'}
                    className="w-4 h-4 text-blue-600 border-slate-200 mt-1 cursor-pointer"
                    {...register('payment_method')}
                  />
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 text-sm">
                      Cash/Card on Delivery
                    </p>
                    <p className="text-xs text-slate-500 leading-normal mt-1">
                      Pay using Cash, Credit Card, or Mobile money when the courier hands over the packaged catalog item at your address.
                    </p>
                  </div>
                </label>
              </div>

              {watchedPaymentMethod === 'mpesa' && (
                <div className="p-4 bg-green-50 border border-green-100 rounded-xl space-y-2 text-xs text-green-800 leading-relaxed font-medium">
                  <p className="font-bold">M-Pesa Checkout Guide:</p>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Go to your M-Pesa Menu & select <strong>Lipa Na M-Pesa</strong></li>
                    <li>Select <strong>Paybill</strong></li>
                    <li>Enter Business Number: <strong>{MPESA_PAYBILL}</strong></li>
                    <li>Enter Account Number: <strong>Your Phone Number</strong></li>
                    <li>Enter Amount: <strong>{formatCurrency(grandTotal)}</strong></li>
                    <li>Enter your M-Pesa PIN and confirm the transaction.</li>
                  </ol>
                  <p className="text-[10px] text-green-600 pt-1 font-bold">Your payment receipt will be crosschecked instantly upon checkout submission.</p>
                </div>
              )}
            </Card>

            {/* Additional Notes & Confirmation */}
            <Card className="p-6 space-y-4">
              <h2 className="text-lg font-bold text-slate-900 border-b border-slate-50 pb-2.5 flex items-center">
                <FileText className="w-5 h-5 text-blue-600 mr-2" />
                Step 4: Place Order
              </h2>

              {/* Points redemption */}
              {isAuthenticated && pointsBalance >= 1000 && (
                <div className={`rounded-xl border-2 p-4 transition-colors ${redeemPoints ? 'border-yellow-400 bg-yellow-50' : 'border-slate-100 bg-slate-50'}`}>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={redeemPoints}
                      onChange={e => setRedeemPoints(e.target.checked)}
                      className="w-4 h-4 text-yellow-500 rounded"
                    />
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-400" />
                      <span className="text-sm font-bold text-slate-800">
                        Redeem {pointsBalance.toLocaleString()} points — save {formatCurrency(pointsBalance)}
                      </span>
                    </div>
                  </label>
                  {redeemPoints && (
                    <p className="text-xs text-yellow-700 mt-2 ml-7">Delivery fee still applies. Discount applied to subtotal.</p>
                  )}
                </div>
              )}

              {/* Referral code */}
              <Input
                id="referral_code"
                label="Referral Code (optional)"
                placeholder="e.g. BLUE-XXXX"
                {...register('referral_code')}
              />

              <div className="text-left pt-1">
                <label htmlFor="notes" className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Order Instruction Notes (optional)
                </label>
                <textarea
                  id="notes"
                  rows={2}
                  placeholder="Special courier instructions, gate passcode, preferred delivery hour slot..."
                  className="w-full py-3 px-4 border-2 border-slate-200 focus:border-blue-500 rounded-lg outline-none transition-all duration-200 text-sm bg-white"
                  {...register('notes')}
                />
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-start text-sm text-left">
                  <input
                    type="checkbox"
                    id="terms_accepted"
                    className="w-4.5 h-4.5 text-blue-600 border-slate-200 rounded-sm mt-0.5 mr-3 cursor-pointer"
                    {...register('terms_accepted')}
                  />
                  <label htmlFor="terms_accepted" className="text-slate-600 text-xs sm:text-sm select-none">
                    I agree to the terms of sale, privacy guidelines, and return parameters. I verify that the shopping catalog items listed are exactly correct.
                  </label>
                </div>
                {errors.terms_accepted && (
                  <div className="flex items-center text-red-600 text-xs space-x-1">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.terms_accepted.message}</span>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={submitting}
                className="w-full py-4 text-base font-bold uppercase tracking-wider mt-4 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 border-none"
              >
                {submitting ? 'Placing Secure Purchase...' : `Place Purchase Order - ${formatCurrency(grandTotal)}`}
              </Button>
            </Card>

          </form>
        </div>

        {/* Right Sticky Order Summary Card (35%) */}
        <div className="lg:col-span-1 lg:sticky lg:top-24">
          <Card className="p-6 border border-slate-100 bg-white space-y-6">
            <h3 className="font-extrabold text-slate-950 text-base border-b border-slate-100 pb-3 uppercase tracking-wider text-xs text-slate-400">
              Your Purchase items
            </h3>

            {/* Readonly Items List */}
            <div className="space-y-3.5 max-h-64 overflow-y-auto pr-1">
              {items.map((item) => (
                <div key={item.product.id} className="flex items-center justify-between text-sm py-1 border-b border-slate-50 last:border-none">
                  <div className="min-w-0 flex-1 pr-4 text-left">
                    <p className="font-bold text-slate-800 truncate leading-tight">
                      {item.product.name}
                    </p>
                    <p className="text-xs text-slate-400 font-medium">
                      Qty: {item.quantity} × {formatCurrency(item.product.price)}
                    </p>
                  </div>
                  <div className="font-bold text-slate-900 whitespace-nowrap">
                    {formatCurrency(item.product.price * item.quantity)}
                  </div>
                </div>
              ))}
            </div>

            {/* Pricing calculations */}
            <div className="border-t border-slate-100 pt-4 space-y-3 text-sm">
              <div className="flex justify-between font-semibold text-slate-500">
                <span>Items Subtotal</span>
                <span className="text-slate-900">{formatCurrency(subtotal)}</span>
              </div>
              
              <div className="flex justify-between font-semibold text-slate-500">
                <span>Shipping Zone Charges</span>
                <span className="text-slate-900">
                  {selectedZone ? formatCurrency(deliveryFee) : <span className="text-xs text-red-500 font-normal">Pending zone Choice</span>}
                </span>
              </div>

              {pointsDiscount > 0 && (
                <div className="flex justify-between font-semibold text-yellow-600">
                  <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-yellow-400" /> Points Discount</span>
                  <span>-{formatCurrency(pointsDiscount)}</span>
                </div>
              )}

              {selectedZone && (
                <div className="text-[11px] text-slate-400 bg-slate-50 p-2 rounded-lg flex items-center text-left">
                  <span>Shipping with <strong>{selectedZone.name}</strong> standard rates.</span>
                </div>
              )}

              <div className="flex justify-between border-t-2 border-slate-150 pt-4 text-base font-black text-slate-950">
                <span>Total Amount Due</span>
                <span className="text-lg text-blue-600 font-extrabold">{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            {/* Payment badge */}
            <div className="pt-2 flex justify-center">
              <Badge variant={watchedPaymentMethod === 'mpesa' ? 'success' : 'info'} className="w-full py-2 font-bold uppercase text-xs">
                Paying via: {watchedPaymentMethod === 'mpesa' ? 'Lipa Na M-Pesa' : 'Cash on Delivery'}
              </Badge>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
