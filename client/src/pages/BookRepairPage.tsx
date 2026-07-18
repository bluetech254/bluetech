import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getRepairServiceById } from '../api/services';
import { createBooking } from '../api/bookings';
import { RepairService } from '../types';
import { bookingSchema } from '../utils/validation';
import { formatCurrency } from '../utils/formatters';
import Loading from '../components/common/Loading';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import { ChevronLeft, Calendar, User, Smartphone, AlertCircle, FileText, CheckCircle, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';

export const BookRepairPage = () => {
  const { serviceId } = useParams<{ serviceId: string }>();
  const navigate = useNavigate();
  const [service, setService] = useState<RepairService | null>(null);
  const [loadingService, setLoadingService] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Tomorrow's date for date-picker min boundary
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  useEffect(() => {
    if (!serviceId) return;
    const fetchService = async () => {
      try {
        const data = await getRepairServiceById(serviceId);
        setService(data);
      } catch (err) {
        console.error('Failed to load service specs:', err);
        toast.error('The selected repair package is unavailable or was not found.');
        navigate('/services');
      } finally {
        setLoadingService(false);
      }
    };
    fetchService();
  }, [serviceId, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      customer_name: '',
      customer_phone: '',
      customer_email: '',
      device_brand: '',
      device_model: '',
      issue_description: '',
      preferred_date: tomorrowStr,
      preferred_time: '',
      notes: '',
      terms_accepted: false,
    }
  });

  const onSubmit = async (formData: any) => {
    if (!serviceId) return;
    setSubmitting(true);
    const toastId = toast.loading('Submitting your repair booking request...');
    try {
      // Normalize phone number: remove leading 0 if present, add 254 prefix
      let phoneNumber = formData.customer_phone.trim();
      if (phoneNumber.startsWith('0')) {
        phoneNumber = phoneNumber.substring(1);
      }
      if (!phoneNumber.startsWith('254')) {
        phoneNumber = '254' + phoneNumber;
      }

      const response = await createBooking({
        full_name: formData.customer_name,
        phone_number: phoneNumber,
        device_type: formData.device_brand,
        device_model: formData.device_model || undefined,
        issue_description: formData.issue_description,
        fulfillment_type: 'dropoff', // Default to dropoff for now
        pickup_address: undefined,
      });

      toast.success('Repair booking placed successfully!', { id: toastId });
      navigate(`/booking-success/${response.id}`);
    } catch (err: any) {
      console.error('Failed to create repair booking:', err);
      const msg = err.response?.data?.message || 'Failed to submit repair booking. Please try again.';
      toast.error(msg, { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingService) {
    return <Loading fullScreen message="Loading diagnostic package details..." />;
  }

  if (!service) return null;

  return (
    <div className="space-y-6 py-4 sm:py-6 animate-fade-in text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
        <div>
          <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            Book Tech Repair
          </h1>
        </div>
        <Link to="/services" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center flex-shrink-0">
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Services
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* Service Summary — top on mobile, sticky right on desktop */}
        <div className="lg:col-span-1 lg:order-2 lg:sticky lg:top-24">
          <Card className="p-4 sm:p-6 border border-slate-100 bg-white space-y-4">
            <h3 className="font-bold text-slate-400 text-xs border-b border-slate-100 pb-3">
              Repair Summary
            </h3>
            <div className="space-y-1">
              <h4 className="font-extrabold text-slate-900 text-base leading-tight">{service.name}</h4>
              <span className="inline-block bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-md capitalize">
                {service.category}
              </span>
            </div>
            <div className="border-t border-b border-slate-100 py-3 space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="font-semibold text-slate-500">Service Fee</span>
                <span className="font-black text-blue-600 text-lg">{formatCurrency(service.price)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-500">Duration</span>
                <span className="font-bold text-slate-800">{service.estimated_duration}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-500">Warranty</span>
                <span className="font-bold text-slate-800">{service.warranty_period || '90 Days'}</span>
              </div>
            </div>
            <ul className="space-y-2 text-xs text-slate-600">
              {[
                'Free full logic board diagnostics',
                'Genuine OEM-grade replacement spares',
                'Thermal paste reapplication if needed',
                'Certified inspection & benchmark test',
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-2 text-[11px] text-blue-800 leading-relaxed">
              <ShieldAlert className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <span>No diagnostics fees if repair is completed in our workshop.</span>
            </div>
          </Card>
        </div>

        {/* Form — left on desktop */}
        <div className="lg:col-span-2 lg:order-1 space-y-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            {/* Step 1 */}
            <Card className="p-4 sm:p-6 space-y-4">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600 flex-shrink-0" />
                Step 1: Contact Information
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

            {/* Step 2 */}
            <Card className="p-4 sm:p-6 space-y-4">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-blue-600 flex-shrink-0" />
                Step 2: Device & Issue Details
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input id="device_brand" label="Device Brand (required)" placeholder="e.g. Apple, Samsung"
                  error={errors.device_brand?.message} {...register('device_brand')} />
                <Input id="device_model" label="Device Model (required)" placeholder="e.g. iPhone 13 Pro"
                  error={errors.device_model?.message} {...register('device_model')} />
              </div>
              <div>
                <label htmlFor="issue_description" className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Issue Description (required)
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
                    <AlertCircle className="w-3.5 h-3.5" />{errors.issue_description.message}
                  </div>
                )}
              </div>
            </Card>

            {/* Step 3 */}
            <Card className="p-4 sm:p-6 space-y-4">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600 flex-shrink-0" />
                Step 3: Appointment
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
                <label htmlFor="notes" className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Additional Notes (optional)
                </label>
                <textarea id="notes" rows={2}
                  placeholder="E.g. Call before coming, urgent, prefer home pickup..."
                  className="w-full py-3 px-4 border-2 border-slate-200 focus:border-blue-500 rounded-lg outline-none text-sm bg-white"
                  {...register('notes')}
                />
              </div>
            </Card>

            {/* Step 4 */}
            <Card className="p-4 sm:p-6 space-y-4">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                Step 4: Terms & Conditions
              </h2>
              <div className="flex items-start gap-3">
                <input type="checkbox" id="terms_accepted"
                  className="w-4 h-4 text-blue-600 border-slate-200 rounded mt-0.5 cursor-pointer flex-shrink-0"
                  {...register('terms_accepted')}
                />
                <label htmlFor="terms_accepted" className="text-xs text-slate-600 select-none leading-relaxed">
                  I agree to the BlueTech terms of service and authorize technicians to inspect and handle my device according to safety guidelines.
                </label>
              </div>
              {errors.terms_accepted && (
                <div className="flex items-center text-red-600 text-xs gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />{errors.terms_accepted.message}
                </div>
              )}
              <Button type="submit" variant="primary" disabled={submitting}
                className="w-full py-3.5 text-sm font-bold tracking-wide uppercase">
                {submitting ? 'Submitting...' : 'Schedule Repair Booking'}
              </Button>
            </Card>

          </form>
        </div>
      </div>
    </div>
  );
};

export default BookRepairPage;
