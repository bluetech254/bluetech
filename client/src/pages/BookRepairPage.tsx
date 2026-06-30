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
    <div className="space-y-8 py-6 animate-fade-in text-left">
      {/* Header and Back Link */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="text-xs text-slate-400 font-bold uppercase tracking-wider space-x-1">
            <Link to="/" className="hover:text-blue-600">Home</Link>
            <span>/</span>
            <Link to="/services" className="hover:text-blue-600">Services</Link>
            <span>/</span>
            <span className="text-slate-600">Schedule Repair</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1.5">
            Book Tech Repair
          </h1>
        </div>
        <Link to="/services" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center">
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Services
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left/Center Columns: Booking Form */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Section 1: Customer Info */}
            <Card className="p-6 space-y-4">
              <h2 className="text-lg font-bold text-slate-900 border-b border-slate-50 pb-2.5 flex items-center">
                <User className="w-5 h-5 text-blue-600 mr-2" />
                Step 1: Contact Information
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  id="customer_name"
                  label="Full Name (required)"
                  placeholder="e.g. Dennis Mutua"
                  error={errors.customer_name?.message}
                  {...register('customer_name')}
                />
                
                <Input
                  id="customer_phone"
                  label="Phone Number (required)"
                  placeholder="Format: 2547XXXXXXXX"
                  error={errors.customer_phone?.message}
                  {...register('customer_phone')}
                />
              </div>

              <div className="pt-1">
                <Input
                  id="customer_email"
                  label="Email Address (optional)"
                  type="email"
                  placeholder="e.g. dennis@example.com"
                  error={errors.customer_email?.message}
                  {...register('customer_email')}
                />
              </div>
            </Card>

            {/* Section 2: Device Info */}
            <Card className="p-6 space-y-4">
              <h2 className="text-lg font-bold text-slate-900 border-b border-slate-50 pb-2.5 flex items-center">
                <Smartphone className="w-5 h-5 text-blue-600 mr-2" />
                Step 2: Device & Issue Details
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  id="device_brand"
                  label="Device Brand (required)"
                  placeholder="e.g. Apple, Samsung, Lenovo"
                  error={errors.device_brand?.message}
                  {...register('device_brand')}
                />
                
                <Input
                  id="device_model"
                  label="Device Model (required)"
                  placeholder="e.g. iPhone 13 Pro, ThinkPad T14"
                  error={errors.device_model?.message}
                  {...register('device_model')}
                />
              </div>

              <div className="text-left pt-1">
                <label htmlFor="issue_description" className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Issue Description (required)
                </label>
                <textarea
                  id="issue_description"
                  rows={4}
                  placeholder="Provide a detailed description of the problem (cracked screen, water damage, device does not charge, system crashes)..."
                  className={`
                    w-full py-3 px-4 border-2 rounded-lg outline-none transition-all duration-200 text-sm bg-white
                    ${errors.issue_description ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'}
                  `}
                  {...register('issue_description')}
                />
                {errors.issue_description && (
                  <div className="flex items-center text-red-600 text-xs mt-1.5 space-x-1">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.issue_description.message}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Section 3: Appointment details */}
            <Card className="p-6 space-y-4">
              <h2 className="text-lg font-bold text-slate-900 border-b border-slate-50 pb-2.5 flex items-center">
                <Calendar className="w-5 h-5 text-blue-600 mr-2" />
                Step 3: Appointment Scheduling
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  id="preferred_date"
                  type="date"
                  min={tomorrowStr}
                  label="Preferred Date (required)"
                  error={errors.preferred_date?.message}
                  {...register('preferred_date')}
                />
                
                <Select
                  id="preferred_time"
                  label="Preferred Time Slot (required)"
                  placeholder="-- Choose Time --"
                  error={errors.preferred_time?.message}
                  options={[
                    { value: 'Morning', label: 'Morning (08:00 AM - 12:00 PM)' },
                    { value: 'Afternoon', label: 'Afternoon (12:00 PM - 04:00 PM)' },
                    { value: 'Evening', label: 'Evening (04:00 PM - 08:00 PM)' },
                  ]}
                  {...register('preferred_time')}
                />
              </div>

              <div className="text-left pt-1">
                <label htmlFor="notes" className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Additional Notes (optional)
                </label>
                <textarea
                  id="notes"
                  rows={2}
                  placeholder="E.g. Call me before coming, I prefer home pickup, urgent diagnostic..."
                  className="w-full py-3 px-4 border-2 border-slate-200 focus:border-blue-500 rounded-lg outline-none transition-all duration-200 text-sm bg-white"
                  {...register('notes')}
                />
              </div>
            </Card>

            {/* Section 4: Submission */}
            <Card className="p-6 space-y-4">
              <h2 className="text-lg font-bold text-slate-900 border-b border-slate-50 pb-2.5 flex items-center">
                <FileText className="w-5 h-5 text-blue-600 mr-2" />
                Step 4: Terms & Conditions
              </h2>
              
              <div className="space-y-3">
                <div className="flex items-start text-sm">
                  <input
                    type="checkbox"
                    id="terms_accepted"
                    className="w-4.5 h-4.5 text-blue-600 border-slate-200 rounded-sm mt-0.5 mr-3 cursor-pointer"
                    {...register('terms_accepted')}
                  />
                  <label htmlFor="terms_accepted" className="text-slate-600 text-xs sm:text-sm select-none">
                    I agree to the BlueTech terms of service. I authorize the workshop technicians to inspect and handle my electronic hardware according to safety guidelines.
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
                className="w-full py-4 text-sm font-bold tracking-wider uppercase mt-4"
              >
                {submitting ? 'Submitting booking...' : 'Schedule Repair Booking'}
              </Button>
            </Card>

          </form>
        </div>

        {/* Right Sticky Column: Service Summary */}
        <div className="lg:col-span-1 lg:sticky lg:top-24">
          <Card className="p-6 border border-slate-100 bg-white space-y-5">
            <h3 className="font-extrabold text-slate-950 text-base border-b border-slate-100 pb-3 uppercase tracking-wider text-xs text-slate-400">
              Repair Summary
            </h3>
            
            <div className="space-y-1.5 text-left">
              <h4 className="font-extrabold text-slate-900 text-lg leading-tight">
                {service.name}
              </h4>
              <span className="inline-block bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider capitalize">
                {service.category}
              </span>
            </div>

            <div className="border-t border-b border-slate-50 py-4 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="font-semibold text-slate-500">Service Fee</span>
                <span className="font-black text-blue-600 text-lg">{formatCurrency(service.price)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-500">Duration</span>
                <span className="font-bold text-slate-800">{service.estimated_duration}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-500">Warranty Protection</span>
                <span className="font-bold text-slate-800">{service.warranty_period || '90 Days'}</span>
              </div>
            </div>

            {/* Inclusions */}
            <div className="space-y-3 text-xs text-slate-600">
              <p className="font-bold text-slate-800">What's included in this package:</p>
              <ul className="space-y-2 text-left">
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Free full logic board electrical diagnostics</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Genuine OEM-grade replacement spares</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Thermal paste reapplication if internal cleanup</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Certified engineering inspection and benchmark test</span>
                </li>
              </ul>
            </div>

            {/* Note */}
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-start space-x-2.5 text-[11px] text-blue-800 leading-normal">
              <ShieldAlert className="w-4.5 h-4.5 text-blue-600 flex-shrink-0" />
              <span>No diagnostics fees are charged if parts replacements are completed in our workshop.</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BookRepairPage;
