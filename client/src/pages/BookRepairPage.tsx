import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getRepairServiceById } from '../api/services';
import { createBooking, initiatePaystackCommitmentPayment, verifyPaystackCommitment } from '../api/bookings';
import { RepairService } from '../types';
import { bookingSchema } from '../utils/validation';
import { formatCurrency } from '../utils/formatters';
import Loading from '../components/common/Loading';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import PaystackModal from '../components/cart/PaystackModal';
import { ChevronLeft, Calendar, User, Smartphone, Laptop, Tv, Camera, Speaker, Cpu, AlertCircle, FileText, CheckCircle, ShieldAlert, Loader2, Tag, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

const DEVICE_CATEGORIES = [
  { type: 'phone',   label: 'Phone',   icon: Smartphone },
  { type: 'laptop',  label: 'Laptop',  icon: Laptop },
  { type: 'tv',      label: 'TV',      icon: Tv },
  { type: 'camera',  label: 'Camera',  icon: Camera },
  { type: 'speaker', label: 'Speaker', icon: Speaker },
  { type: 'gadget',  label: 'Gadget',  icon: Cpu },
];

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

export const BookRepairPage = () => {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const [service, setService] = useState<RepairService | null>(null);
  const [loadingService, setLoadingService] = useState(!!serviceId); // only show loading if there's a serviceId to fetch
  const [submitting, setSubmitting] = useState(false);

  // Device selection state — progressive: category → brand → model
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [brands, setBrands] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<any>(null);
  const [selectedModel, setSelectedModel] = useState<any>(null);
  const [estimatedPrice, setEstimatedPrice] = useState<number | null>(null);
  const [priceLevel, setPriceLevel] = useState<'model' | 'brand' | 'default' | null>(null);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingPrice, setLoadingPrice] = useState(false);

  const [paymentModal, setPaymentModal] = useState<{
    bookingId: string; amount: number; email: string; reference: string; servicePrice: number;
  } | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'verifying' | 'paid' | 'failed'>('idle');

  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  useEffect(() => {
    if (!serviceId) return;
    getRepairServiceById(serviceId)
      .then(setService)
      .catch(() => { toast.error('Service not found.'); navigate('/services'); })
      .finally(() => setLoadingService(false));

    // brands loaded on category select, not here
  }, [serviceId, navigate]);

  const handleCategorySelect = async (type: string) => {
    setSelectedCategory(type);
    setSelectedBrand(null);
    setSelectedModel(null);
    setEstimatedPrice(null);
    setPriceLevel(null);
    setBrands([]);
    setModels([]);
    setLoadingBrands(true);
    try {
      const r = await fetch(`${API_BASE}/devices/brands?device_type=${type}`);
      const d = await r.json();
      setBrands(d.data ?? []);
    } catch {}
    finally { setLoadingBrands(false); }
  };

  const handleBrandSelect = async (brand: any, category: string | null) => {
    setSelectedBrand(brand);
    setSelectedModel(null);
    setEstimatedPrice(null);
    setPriceLevel(null);
    setModels([]);
    setLoadingModels(true);
    setLoadingPrice(true);
    try {
      const categoryParam = category ? `?device_type=${category}` : '';
      const [modelsRes, priceRes] = await Promise.all([
        fetch(`${API_BASE}/devices/brands/${brand.id}/models${categoryParam}`).then(r => r.json()),
        fetch(`${API_BASE}/devices/services/${serviceId}/price?brand_id=${brand.id}`).then(r => r.json()),
      ]);
      setModels(modelsRes.data ?? []);
      setEstimatedPrice(priceRes.price ?? null);
      setPriceLevel(priceRes.level ?? null);
    } catch (e) { console.error('Brand select error:', e); }
    finally { setLoadingModels(false); setLoadingPrice(false); }
  };

  const handleModelSelect = async (model: any) => {
    setSelectedModel(model);
    if (!serviceId) return;
    setLoadingPrice(true);
    try {
      const r = await fetch(`${API_BASE}/devices/services/${serviceId}/price?brand_id=${selectedBrand.id}&model_id=${model.id}`);
      const d = await r.json();
      setEstimatedPrice(d.price ?? null);
      setPriceLevel(d.level ?? null);
    } catch {}
    finally { setLoadingPrice(false); }
  };

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      customer_name: '', customer_phone: '', customer_email: '',
      device_brand: '', device_model: '', issue_description: '',
      preferred_date: tomorrowStr, preferred_time: '', notes: '', terms_accepted: false,
    }
  });

  const onSubmit = async (formData: any) => {
    setSubmitting(true);
    const toastId = toast.loading('Submitting your repair booking...');
    try {
      let phoneNumber = formData.customer_phone.trim();
      if (phoneNumber.startsWith('0')) phoneNumber = phoneNumber.substring(1);
      if (!phoneNumber.startsWith('254')) phoneNumber = '254' + phoneNumber;

      const response = await createBooking({
        full_name: formData.customer_name,
        phone_number: phoneNumber,
        device_type: selectedBrand?.name ?? formData.device_brand,
        device_model: (selectedModel?.name ?? formData.device_model) || undefined,
        issue_description: formData.issue_description,
        fulfillment_type: 'dropoff',
        pickup_address: undefined,
      });

      toast.success('Booking created! Initialising payment...', { id: toastId });
      const servicePrice = estimatedPrice ?? service?.price ?? 0;
      const commitmentAmount = Math.max(1, Math.round(servicePrice * 0.20));

      try {
        const { reference } = await initiatePaystackCommitmentPayment(response.id, servicePrice);
        const email = `${phoneNumber}@paystack.placeholder`;
        setPaymentModal({ bookingId: response.id, amount: commitmentAmount, email, reference, servicePrice });
      } catch {
        // Payment init failed — still navigate, they can pay from booking detail
        toast.success('Booking created! You can pay the commitment fee from your bookings page.', { id: toastId });
        navigate(`/booking-success/${response.id}`);
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      let msg = 'Failed to submit booking.';
      if (typeof detail === 'string') {
        msg = detail;
      } else if (Array.isArray(detail) && detail.length > 0) {
        const first = detail[0];
        const field = first.loc?.slice(-1)[0] ?? '';
        msg = field ? `${field}: ${first.msg}` : first.msg;
      } else if (err.response?.data?.message) {
        msg = err.response.data.message;
      }
      toast.error(msg, { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    document.body.style.overflow = paymentModal ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [paymentModal]);

  if (loadingService) return <Loading fullScreen message="Loading service details..." />;

  const displayPrice = estimatedPrice ?? service?.price ?? 0;

  return (
    <div className="space-y-6 py-4 sm:py-6 animate-fade-in text-left">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
        <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 mt-1">Book Tech Repair</h1>
        <Link to="/services" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center">
          <ChevronLeft className="w-4 h-4 mr-1" />Back to Services
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* Service Summary */}
        <div className="lg:col-span-1 lg:order-2 lg:sticky lg:top-24">
          <Card className="p-4 sm:p-6 border border-slate-100 bg-white space-y-4">
            <h3 className="font-bold text-slate-400 text-xs border-b border-slate-100 pb-3">Repair Summary</h3>
            <div className="space-y-1">
              <h4 className="font-extrabold text-slate-900 text-base leading-tight">
                {service?.name ?? 'General Repair Booking'}
              </h4>
              {service?.category && (
                <span className="inline-block bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-md capitalize">{service.category}</span>
              )}
            </div>
            <div className="border-t border-b border-slate-100 py-3 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="font-semibold text-slate-500">
                  {priceLevel === 'model' ? 'Model Price' : priceLevel === 'brand' ? 'Brand Price' : 'Base Price'}
                </span>
                <div className="text-right">
                  {loadingPrice ? (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-400 ml-auto" />
                  ) : (
                    <span className={`font-black text-lg ${priceLevel && priceLevel !== 'default' ? 'text-emerald-600' : 'text-blue-600'}`}>
                      {formatCurrency(displayPrice)}
                    </span>
                  )}
                  {priceLevel === 'model' && selectedModel && (
                    <p className="text-[10px] text-emerald-600 font-semibold">for {selectedModel.name}</p>
                  )}
                  {priceLevel === 'brand' && selectedBrand && (
                    <p className="text-[10px] text-amber-600 font-semibold">{selectedBrand.name} · pick model for exact price</p>
                  )}
                  {(!priceLevel || priceLevel === 'default') && !selectedBrand && (
                    <p className="text-[10px] text-slate-400 font-semibold">select device for exact price</p>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-500">Duration</span>
                <span className="font-bold text-slate-800">{service?.estimated_duration || '1–3 Hours'}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-500">Warranty</span>
                <span className="font-bold text-slate-800">{service?.warranty_period || '90 Days'}</span>
              </div>
            </div>
            {selectedBrand && (
              <div className="bg-slate-50 rounded-xl p-3 text-xs space-y-1">
                <p className="font-bold text-slate-600">Selected Device</p>
                <p className="text-slate-800">{selectedBrand.name} {selectedModel ? `· ${selectedModel.name}` : ''}</p>
              </div>
            )}
            <ul className="space-y-2 text-xs text-slate-600">
              {['Free full diagnostics','Genuine OEM-grade parts','Certified inspection & test'].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />{item}
                </li>
              ))}
            </ul>
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-2 text-[11px] text-blue-800 leading-relaxed">
              <ShieldAlert className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              No diagnostics fees if repair is completed in our workshop.
            </div>
          </Card>
        </div>

        {/* Form */}
        <div className="lg:col-span-2 lg:order-1 space-y-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            {/* Step 1: Device */}
            <Card className="p-4 sm:p-6 space-y-4">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-blue-600" />Step 1: Select Your Device
              </h2>

              {/* Selected device breadcrumb */}
              {(selectedCategory || selectedBrand) && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500 flex-wrap">
                  {selectedCategory && (
                    <button type="button" onClick={() => { setSelectedCategory(null); setSelectedBrand(null); setSelectedModel(null); setEstimatedPrice(null); setBrands([]); setModels([]); }}
                      className="text-blue-600 font-semibold hover:underline">
                      {DEVICE_CATEGORIES.find(c => c.type === selectedCategory)?.label}
                    </button>
                  )}
                  {selectedBrand && (
                    <>
                      <ChevronRight className="w-3 h-3" />
                      <button type="button" onClick={() => { setSelectedBrand(null); setSelectedModel(null); setEstimatedPrice(null); setModels([]); }}
                        className="text-blue-600 font-semibold hover:underline">
                        {selectedBrand.name}
                      </button>
                    </>
                  )}
                  {selectedModel && (
                    <>
                      <ChevronRight className="w-3 h-3" />
                      <span className="font-semibold text-slate-700">{selectedModel.name}</span>
                    </>
                  )}
                </div>
              )}

              {/* Step A: Device category */}
              {!selectedCategory && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-3">What type of device? <span className="text-red-500">*</span></p>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {DEVICE_CATEGORIES.map(({ type, label, icon: Icon }) => (
                      <button key={type} type="button" onClick={() => handleCategorySelect(type)}
                        className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 border-slate-100 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all">
                        <Icon className="w-5 h-5" />
                        <span className="text-[11px] font-bold">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step B: Brand picker */}
              {selectedCategory && !selectedBrand && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-3">Select Brand <span className="text-red-500">*</span></p>
                  {loadingBrands ? (
                    <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" />Loading brands...</div>
                  ) : brands.length === 0 ? (
                    <p className="text-sm text-slate-400">No brands found for this category.</p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                      {brands.map(brand => (
                        <button key={brand.id} type="button" onClick={() => handleBrandSelect(brand, selectedCategory)}
                          className="px-2 py-2.5 rounded-xl border-2 border-slate-100 bg-white text-xs font-bold text-slate-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all truncate text-center">
                          {brand.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step C: Model dropdown */}
              {selectedBrand && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-2">
                    {selectedBrand.name} Model <span className="text-red-500">*</span>
                  </p>
                  {loadingModels ? (
                    <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 className="w-4 h-4 animate-spin" />Loading models...</div>
                  ) : (
                    <select
                      className="w-full py-3 px-4 border-2 border-slate-200 focus:border-blue-500 rounded-lg outline-none text-sm bg-white"
                      value={selectedModel?.id ?? ''}
                      onChange={e => {
                        const m = models.find(m => m.id === e.target.value);
                        if (m) handleModelSelect(m);
                        else { setSelectedModel(null); setEstimatedPrice(null); }
                      }}>
                      <option value="">-- Select Model --</option>
                      {models.map(m => (
                        <option key={m.id} value={m.id}>{m.name} {m.release_year ? `(${m.release_year})` : ''}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Price estimate banner */}
              {estimatedPrice !== null && !loadingPrice && (
                <div className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${priceLevel === 'model' ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                  <Tag className={`w-4 h-4 shrink-0 ${priceLevel === 'model' ? 'text-emerald-600' : 'text-amber-600'}`} />
                  <div>
                    <p className={`text-sm font-black ${priceLevel === 'model' ? 'text-emerald-800' : 'text-amber-800'}`}>
                      {priceLevel === 'model' ? 'Exact Price' : 'Estimated Price'}: {formatCurrency(estimatedPrice)}
                    </p>
                    <p className={`text-xs ${priceLevel === 'model' ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {priceLevel === 'model'
                        ? `For ${service?.name ?? 'this service'} on ${selectedBrand?.name} ${selectedModel?.name}`
                        : `For ${selectedBrand?.name} devices · select a model for exact price`}
                    </p>
                  </div>
                </div>
              )}

              {/* Issue description */}
              <div>
                <label htmlFor="issue_description" className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Issue Description <span className="text-red-500">*</span>
                </label>
                <textarea id="issue_description" rows={3}
                  placeholder="Describe the problem — cracked screen, won't charge, water damage..."
                  className={`w-full py-3 px-4 border-2 rounded-lg outline-none transition-all text-sm bg-white ${
                    errors.issue_description ? 'border-red-500' : 'border-slate-200 focus:border-blue-500'
                  }`}
                  {...register('issue_description')}
                />
                {errors.issue_description && (
                  <div className="flex items-center text-red-600 text-xs mt-1 gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />{String(errors.issue_description.message)}
                  </div>
                )}
              </div>
            </Card>

            {/* Step 2: Contact */}
            <Card className="p-4 sm:p-6 space-y-4">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />Step 2: Contact Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input id="customer_name" label="Full Name (required)" placeholder="e.g. Dennis Mutua"
                  error={errors.customer_name?.message} {...register('customer_name')} />
                <Input id="customer_phone" label="Phone Number (required)" placeholder="07XXXXXXXX"
                  error={errors.customer_phone?.message} {...register('customer_phone')} />
              </div>
              <Input id="customer_email" label="Email Address (optional)" type="email"
                placeholder="e.g. dennis@example.com"
                error={errors.customer_email?.message} {...register('customer_email')} />
            </Card>

            {/* Step 3: Appointment */}
            <Card className="p-4 sm:p-6 space-y-4">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />Step 3: Appointment
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input id="preferred_date" type="date" min={tomorrowStr} label="Preferred Date (required)"
                  error={errors.preferred_date?.message} {...register('preferred_date')} />
                <Select id="preferred_time" label="Time Slot (required)" placeholder="-- Choose Time --"
                  error={errors.preferred_time?.message}
                  options={[
                    { value: 'Morning', label: 'Morning (08:00 AM – 12:00 PM)' },
                    { value: 'Afternoon', label: 'Afternoon (12:00 PM – 04:00 PM)' },
                    { value: 'Evening', label: 'Evening (04:00 PM – 08:00 PM)' },
                  ]}
                  {...register('preferred_time')}
                />
              </div>
              <div>
                <label htmlFor="notes" className="block text-sm font-semibold text-slate-700 mb-1.5">Additional Notes (optional)</label>
                <textarea id="notes" rows={2}
                  placeholder="E.g. Call before coming, urgent, prefer home pickup..."
                  className="w-full py-3 px-4 border-2 border-slate-200 focus:border-blue-500 rounded-lg outline-none text-sm bg-white"
                  {...register('notes')}
                />
              </div>
            </Card>

            {/* Step 4: Submit */}
            <Card className="p-4 sm:p-6 space-y-4">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />Step 4: Confirm Booking
              </h2>
              <div className="flex items-start gap-3">
                <input type="checkbox" id="terms_accepted"
                  className="w-4 h-4 text-blue-600 border-slate-200 rounded mt-0.5 cursor-pointer flex-shrink-0"
                  {...register('terms_accepted')}
                />
                <label htmlFor="terms_accepted" className="text-xs text-slate-600 select-none leading-relaxed">
                  I agree to the BlueTech terms of service and authorize technicians to inspect and handle my device.
                </label>
              </div>
              {errors.terms_accepted && (
                <div className="flex items-center text-red-600 text-xs gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />{String(errors.terms_accepted.message)}
                </div>
              )}
              <Button type="submit" variant="primary" disabled={submitting}
                className="w-full py-3.5 text-sm font-bold tracking-wide uppercase flex items-center justify-center gap-2">
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitting ? 'Submitting...' : 'Schedule Repair Booking'}
              </Button>
            </Card>

          </form>
        </div>
      </div>

      {paymentModal && (
        <PaystackModal
          amountKes={paymentModal.amount}
          email={paymentModal.email}
          reference={paymentModal.reference}
          label="Repair Commitment Fee (20%)"
          verifyStatus={verifyStatus}
          onSuccess={async (ref) => {
            setVerifyStatus('verifying');
            try {
              const result = await verifyPaystackCommitment(ref);
              if (result.status === 'success') {
                setVerifyStatus('paid');
                setTimeout(() => navigate(`/booking-success/${paymentModal.bookingId}`), 1500);
              } else {
                setVerifyStatus('failed');
              }
            } catch {
              setVerifyStatus('failed');
            }
          }}
          onDismiss={() => setVerifyStatus('idle')}
          onCancel={() => {
            setPaymentModal(null);
            setVerifyStatus('idle');
            navigate(`/booking-success/${paymentModal.bookingId}`);
          }}
        />
      )}
    </div>
  );
};

export default BookRepairPage;
