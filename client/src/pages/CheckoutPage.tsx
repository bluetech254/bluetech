import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { getDeliveryZones } from '../api/zones';
import { createOrder, initiatePaystackOrderPayment, verifyPaystackOrderPayment } from '../api/orders';
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
import PaystackModal from '../components/cart/PaystackModal';
import { ChevronLeft, CreditCard, DollarSign, Loader2, ClipboardCheck, AlertCircle, Phone, MapPin, Sparkles, CheckCircle, FileText, Star, Zap } from 'lucide-react';
import PlacesAutocomplete from '../components/common/PlacesAutocomplete';
import toast from 'react-hot-toast';
import { buildOrderMessage, openWhatsApp } from '../utils/whatsapp';

export const CheckoutPage = () => {
  const { items, subtotal, clearCart } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loadingZones, setLoadingZones] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paystackModal, setPaystackModal] = useState<{
    orderId: string; reference: string; email: string; amount: number;
  } | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'verifying' | 'paid' | 'failed'>('idle');
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
      payment_method: 'paystack' as 'paystack' | 'cash_on_delivery' | 'points_only',
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
  const POINTS_TO_KES = 0.1;
  const pointsKesValue = Math.round(pointsBalance * POINTS_TO_KES * 100) / 100; // KES value of balance
  const isPointsOnly = watchedPaymentMethod === 'points_only';
  // How many points needed to cover subtotal: ceil(subtotal / 0.1)
  const pointsNeededForSubtotal = Math.ceil(subtotal / POINTS_TO_KES);
  const canPayWithPoints = isAuthenticated && pointsBalance >= pointsNeededForSubtotal && subtotal > 0;
  // Discount in KES: use all points but cap at subtotal
  const pointsDiscountKes = isPointsOnly
    ? Math.min(pointsKesValue, subtotal)
    : (redeemPoints && pointsBalance > 0 ? Math.min(pointsKesValue, subtotal) : 0);
  // Points actually consumed (reverse: KES discount / rate)
  const pointsToRedeem = pointsDiscountKes > 0 ? Math.ceil(pointsDiscountKes / POINTS_TO_KES) : 0;
  const grandTotal = Math.max(0, subtotal - pointsDiscountKes + deliveryFee);

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
        redeem_points: (isPointsOnly || redeemPoints) && pointsToRedeem > 0 ? pointsToRedeem : undefined,
      };

      const response = await createOrder(orderPayload);

      // points_only = subtotal paid by points, but delivery fee still needs payment
      if (formData.payment_method === 'points_only') {
        if (deliveryFee > 0) {
          // Trigger Paystack popup for delivery fee only
          try {
            const { reference } = await initiatePaystackOrderPayment(response.id);
            orderPlaced.current = true;
            clearCart();
            sessionStorage.removeItem('bluetech_delivery_zone_id');
            toast.dismiss(toastId);
            setPaystackModal({
              orderId: response.id,
              reference,
              email: formData.email || `${phoneNumber}@paystack.placeholder`,
              amount: deliveryFee,
            });
          } catch {
            toast.error('Order created but payment init failed. Please retry payment.', { id: toastId });
          }
        } else {
          toast.success('Order placed & paid with points! 🎉', { id: toastId });
          orderPlaced.current = true;
          clearCart();
          sessionStorage.removeItem('bluetech_delivery_zone_id');
          navigate(`/order-success/${response.id}`);
        }
      } else if (formData.payment_method === 'paystack' || formData.payment_method === 'mpesa') {
        // Initiate Paystack inline popup
        try {
          const { reference } = await initiatePaystackOrderPayment(response.id);
          orderPlaced.current = true;
          clearCart();
          sessionStorage.removeItem('bluetech_delivery_zone_id');
          toast.dismiss(toastId);
          setPaystackModal({
            orderId: response.id,
            reference,
            email: formData.email || `${phoneNumber}@paystack.placeholder`,
            amount: grandTotal,
          });
        } catch {
          toast.error('Order created but payment init failed. Please retry payment.', { id: toastId });
        }
      } else {
        toast.success('Order placed successfully!', { id: toastId });
        orderPlaced.current = true;
        clearCart();
        sessionStorage.removeItem('bluetech_delivery_zone_id');
        navigate(`/order-success/${response.id}`);
      }
    } catch (err: any) {
      // Pydantic 422 returns detail as an array of {loc, msg, type} objects
      // We must extract a string — never pass the raw object to toast
      let msg = 'Failed to submit order. Check your details and try again.';
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        msg = detail;
      } else if (Array.isArray(detail) && detail.length > 0) {
        // Extract field name + message from first validation error
        const first = detail[0];
        const field = first.loc?.slice(-1)[0] ?? '';
        msg = field ? `${field}: ${first.msg}` : first.msg;
      } else if (err.response?.data?.message) {
        msg = err.response.data.message;
      } else if (err.message) {
        msg = err.message;
      }
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
      {paystackModal && (
        <PaystackModal
          amountKes={paystackModal.amount}
          email={paystackModal.email}
          reference={paystackModal.reference}
          label="Order Payment"
          verifyStatus={verifyStatus}
          onSuccess={async (ref) => {
            setVerifyStatus('verifying');
            try {
              const result = await verifyPaystackOrderPayment(ref);
              if (result.status === 'success') {
                setVerifyStatus('paid');
                setTimeout(() => navigate(`/order-success/${paystackModal.orderId}`), 1500);
              } else {
                setVerifyStatus('failed');
              }
            } catch {
              setVerifyStatus('failed');
            }
          }}
          onDismiss={() => {
            // popup closed without paying — keep modal open so they can retry
            setVerifyStatus('idle');
          }}
          onCancel={() => {
            setPaystackModal(null);
            setVerifyStatus('idle');
            navigate(`/order-success/${paystackModal.orderId}`);
          }}
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
                  error={errors.customer_name?.message ? String(errors.customer_name.message) : undefined}
                  {...register('customer_name')}
                />
                
                <Input
                  id="phone_number"
                  label="Phone Number (required)"
                  placeholder="Format: 2547XXXXXXXX"
                  error={errors.phone_number?.message ? String(errors.phone_number.message) : undefined}
                  {...register('phone_number')}
                />
              </div>

              <div className="pt-1">
                <Input
                  id="email"
                  label="Email Address (optional)"
                  type="email"
                  placeholder="e.g. sarah@example.com"
                  error={errors.email?.message ? String(errors.email.message) : undefined}
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
                  error={errors.delivery_zone?.message ? String(errors.delivery_zone.message) : undefined}
                  {...register('delivery_zone')}
                />
              </div>

              <div className="text-left pt-1">
                <PlacesAutocomplete
                  value={watch('delivery_address') ?? ''}
                  onChange={val => setValue('delivery_address', val, { shouldValidate: true })}
                  error={errors.delivery_address?.message ? String(errors.delivery_address.message) : undefined}
                />
              </div>
            </Card>

            {/* Payment Method Selector */}
            <Card className="p-6 space-y-4 text-left">
              <h2 className="text-lg font-bold text-slate-900 border-b border-slate-50 pb-2.5 flex items-center">
                <CreditCard className="w-5 h-5 text-blue-600 mr-2" />
                Step 3: Payment Method
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Paystack Option */}
                <label
                  className={`
                    border-2 rounded-xl p-4 flex items-start space-x-3 cursor-pointer transition-all
                    ${watchedPaymentMethod === 'paystack'
                      ? 'border-blue-500 bg-blue-50/40'
                      : 'border-slate-100 hover:border-slate-200 bg-white'
                    }
                  `}
                >
                  <input
                    type="radio"
                    value="paystack"
                    checked={watchedPaymentMethod === 'paystack'}
                    className="w-4 h-4 text-blue-600 border-slate-200 mt-1 cursor-pointer"
                    {...register('payment_method')}
                  />
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 text-sm flex items-center">
                      Pay Online (M-Pesa / Card)
                      <span className="ml-1.5 bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-sm">
                        Popular
                      </span>
                    </p>
                    <p className="text-xs text-slate-500 leading-normal mt-1">
                      Pay instantly via Paystack — supports M-Pesa STK push, Visa, and Mastercard. Secure popup on this page.
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

                {/* Pay with Points — only shown when balance covers subtotal */}
                {canPayWithPoints && (
                  <label className={`sm:col-span-2 border-2 rounded-xl p-4 flex items-start space-x-3 cursor-pointer transition-all ${watchedPaymentMethod === 'points_only' ? 'border-yellow-400 bg-yellow-50' : 'border-slate-100 hover:border-yellow-200 bg-white'}`}>
                    <input type="radio" value="points_only" checked={watchedPaymentMethod === 'points_only'} className="w-4 h-4 text-yellow-500 border-slate-200 mt-1 cursor-pointer" {...register('payment_method')} />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <Zap className="w-4 h-4 text-yellow-500" />
                        Pay with Points Wallet
                        <span className="bg-yellow-400 text-slate-900 text-[9px] font-black px-1.5 py-0.5 rounded-sm">INSTANT</span>
                      </p>
                      <p className="text-xs text-slate-500 leading-normal mt-1">
                        Use <span className="font-bold text-yellow-600">{pointsNeededForSubtotal.toLocaleString()} pts</span> (= {formatCurrency(subtotal)}) from your wallet of <span className="font-bold">{pointsBalance.toLocaleString()} pts</span>.{deliveryFee > 0 ? ` Delivery fee ${formatCurrency(deliveryFee)} paid via M-Pesa.` : ' Free delivery!'}
                      </p>
                      {watchedPaymentMethod === 'points_only' && (
                        <div className="mt-2 flex items-center gap-2 text-xs font-bold text-yellow-700">
                          <CheckCircle className="w-3.5 h-3.5" />
                          {pointsNeededForSubtotal.toLocaleString()} pts deducted · saves {formatCurrency(pointsDiscountKes)} · you pay only delivery {formatCurrency(deliveryFee)}
                        </div>
                      )}
                    </div>
                  </label>
                )}
              </div>

              {watchedPaymentMethod === 'paystack' && (
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-2 text-xs text-blue-800 leading-relaxed font-medium">
                  <p className="font-bold flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5" /> Secure Inline Payment
                  </p>
                  <p>After placing your order, a Paystack popup will appear on this page. You can pay with <strong>M-Pesa</strong>, <strong>Visa</strong>, or <strong>Mastercard</strong> — no redirect needed.</p>
                </div>
              )}
            </Card>

            {/* Additional Notes & Confirmation */}
            <Card className="p-6 space-y-4">
              <h2 className="text-lg font-bold text-slate-900 border-b border-slate-50 pb-2.5 flex items-center">
                <FileText className="w-5 h-5 text-blue-600 mr-2" />
                Step 4: Place Order
              </h2>

              {/* Points partial redemption — shown when not using points_only and has any points */}
              {isAuthenticated && pointsBalance > 0 && !isPointsOnly && (
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
                        Use {pointsBalance.toLocaleString()} pts — save {formatCurrency(Math.min(pointsKesValue, subtotal))}
                      </span>
                    </div>
                  </label>
                  {redeemPoints && (
                    <p className="text-xs text-yellow-700 mt-2 ml-7">10 pts = KES 1. Delivery fee still applies.</p>
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
                    <span>{errors.terms_accepted?.message ? String(errors.terms_accepted.message) : ""}</span>
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

              {/* Order via WhatsApp — alternative path */}
              <div className="relative flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-slate-100" />
                <span className="text-xs font-semibold text-slate-400">or</span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>
              <button
                type="button"
                onClick={() => {
                  const vals = watch();
                  const zone = zones.find(z => z.id === vals.delivery_zone);
                  const msg = buildOrderMessage({
                    items: items.map(i => ({
                      name:     i.product.name,
                      quantity: i.quantity,
                      price:    i.product.price,
                    })),
                    subtotal,
                    deliveryZone: zone?.zone_name,
                    deliveryFee:  zone?.delivery_fee,
                    total:        grandTotal,
                    customerName:    vals.customer_name     || undefined,
                    customerPhone:   vals.phone_number      || undefined,
                    deliveryAddress: vals.delivery_address  || undefined,
                    notes:           vals.notes             || undefined,
                  });
                  openWhatsApp(msg);
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-green-500 text-green-600 bg-white hover:bg-green-50 font-bold text-sm transition-colors cursor-pointer"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Order via WhatsApp
              </button>
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

              {pointsDiscountKes > 0 && (
                <div className="flex justify-between font-semibold text-yellow-600">
                  <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-yellow-400" /> Points Discount</span>
                  <span>-{formatCurrency(pointsDiscountKes)}</span>
                </div>
              )}

              {selectedZone && (
                <div className="text-[11px] text-slate-400 bg-slate-50 p-2 rounded-lg flex items-center text-left">
                  <span>Shipping with <strong>{selectedZone.zone_name}</strong> standard rates.</span>
                </div>
              )}

              <div className="flex justify-between border-t-2 border-slate-150 pt-4 text-base font-black text-slate-950">
                <span>Total Amount Due</span>
                <span className="text-lg text-blue-600 font-extrabold">{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            {/* Payment badge */}
            <div className="pt-2 flex justify-center">
              <Badge variant={watchedPaymentMethod === 'paystack' ? 'success' : watchedPaymentMethod === 'points_only' ? 'warning' : 'info'} className="w-full py-2 font-bold uppercase text-xs">
                Paying via: {watchedPaymentMethod === 'paystack' ? 'Paystack (M-Pesa / Card)' : watchedPaymentMethod === 'points_only' ? '⚡ Points Wallet' : 'Cash on Delivery'}
              </Badge>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
