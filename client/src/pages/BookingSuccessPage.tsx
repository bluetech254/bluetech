import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getBookingById } from '../api/bookings';
import { Booking } from '../types';
import { formatCurrency } from '../utils/formatters';
import Loading from '../components/common/Loading';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import { CheckCircle, Calendar, Clipboard, ShieldCheck, Smartphone, Settings, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export const BookingSuccessPage = () => {
  const navigate = useNavigate();
  const { bookingId } = useParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookingId) return;
    const fetchBooking = async () => {
      try {
        const data = await getBookingById(bookingId);
        setBooking(data);
      } catch (err) {
        console.error('Failed to load completed booking:', err);
        toast.error('Failed to load completed booking specifications.');
      } finally {
        setLoading(false);
      }
    };
    fetchBooking();
  }, [bookingId]);

  const copyBookingId = () => {
    if (!bookingId) return;
    navigator.clipboard.writeText(bookingId);
    toast.success('Repair Booking Reference copied to clipboard!');
  };

  if (loading) {
    return <Loading fullScreen message="Retrieving booking confirmations..." />;
  }

  if (!booking) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-red-600">Booking Not Resolved</h2>
        <p className="text-sm text-slate-500">We could not resolve your workshop appointment details.</p>
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
            Repair Appointment Scheduled!
          </h1>
          <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            Your technical repair booking has been submitted. Our master mechanic will inspect your device according to scheduling specifications.
          </p>
        </div>

        {/* Copyable Booking ID block */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 inline-flex flex-col sm:flex-row items-center justify-between gap-4 w-full max-w-md mx-auto text-left">
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Your Booking Reference Number</span>
            <span className="font-mono font-bold text-slate-800 text-sm">{bookingId}</span>
          </div>
          <button
            onClick={copyBookingId}
            className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 cursor-pointer shadow-xs transition-colors flex items-center"
          >
            <Clipboard className="w-3.5 h-3.5 mr-1.5" />
            Copy Reference
          </button>
        </div>
      </div>

      {/* Details breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Device Information */}
        <Card className="p-6 space-y-4">
          <h3 className="font-bold text-slate-900 border-b border-slate-50 pb-2.5 flex items-center text-sm uppercase tracking-wider text-slate-400">
            <Smartphone className="w-4 h-4 text-blue-600 mr-2" />
            Device Details
          </h3>
          <div className="space-y-2 text-sm text-slate-600">
            <p><strong className="text-slate-800">Brand:</strong> <span className="capitalize">{booking.device_brand}</span></p>
            <p><strong className="text-slate-800">Model:</strong> {booking.device_model}</p>
            <p className="leading-relaxed min-h-12"><strong className="text-slate-800">Reported Problem:</strong> "{booking.issue_description}"</p>
          </div>
        </Card>

        {/* Appointment Slot */}
        <Card className="p-6 space-y-4 text-left">
          <h3 className="font-bold text-slate-900 border-b border-slate-50 pb-2.5 flex items-center text-sm uppercase tracking-wider text-slate-400">
            <Calendar className="w-4 h-4 text-blue-600 mr-2" />
            Appointment Slot
          </h3>
          <div className="space-y-3.5 text-sm text-slate-600">
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Scheduled Date</p>
              <p className="font-extrabold text-slate-800 text-sm">{new Date(booking.preferred_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Scheduled Hour block</p>
              <p className="font-extrabold text-blue-600 text-sm capitalize">{booking.preferred_time} Session</p>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-50">
              <span className="font-bold text-xs text-slate-400 uppercase tracking-wider">Status:</span>
              <Badge variant="info" className="capitalize">
                {booking.status}
              </Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* Booking Next Steps */}
      <Card className="p-6 space-y-4 text-left">
        <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider text-slate-400 border-b border-slate-50 pb-2 flex items-center">
          <Settings className="w-4.5 h-4.5 text-blue-600 mr-2" />
          What Happens Next?
        </h3>
        <ol className="relative border-l border-slate-200 ml-4 space-y-6 text-sm text-slate-600">
          <li className="pl-6 relative">
            <span className="absolute left-0 top-0.5 -ml-[29px] w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center">
              1
            </span>
            <p className="font-bold text-slate-900">Receive SMS / Email Confirmation</p>
            <p className="text-xs text-slate-500 mt-0.5">Our reception agent will cross-check workshop schedules and confirm your slots via SMS or Email notification.</p>
          </li>
          <li className="pl-6 relative">
            <span className="absolute left-0 top-0.5 -ml-[29px] w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center">
              2
            </span>
            <p className="font-bold text-slate-900">Ship or Drop off your Device</p>
            <p className="text-xs text-slate-500 mt-0.5">You can drop off your device at our central Nairobi retail workshop, or package and dispatch it via courier/delivery riders to our physical storefront address.</p>
          </li>
          <li className="pl-6 relative">
            <span className="absolute left-0 top-0.5 -ml-[29px] w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center">
              3
            </span>
            <p className="font-bold text-slate-900">Diagnostics & Repair Execution</p>
            <p className="text-xs text-slate-500 mt-0.5">Our mechanical hardware engineers execute structural diagnostics, solder spares, run stress benchmark checks, and update repair progress timelines instantly.</p>
          </li>
        </ol>
      </Card>

      {/* Forward CTAs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-t border-slate-100 pt-6">
        <Link
          to="/"
          className="text-sm font-bold text-slate-500 hover:text-slate-800 flex items-center justify-center sm:justify-start"
        >
          Return to Storefront
        </Link>
        
        <Button
          variant="primary"
          onClick={() => navigate(`/track-order?type=repair&id=${bookingId}`)}
          rightIcon={<ArrowRight className="w-4 h-4" />}
          className="py-3 px-6 font-bold animate-pulse-custom"
        >
          Track Work progress
        </Button>
      </div>
    </div>
  );
};

export default BookingSuccessPage;
