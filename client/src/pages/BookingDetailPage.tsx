import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getBookingById } from '../api/bookings';
import { formatCurrency } from '../utils/formatters';
import Loading from '../components/common/Loading';
import { ChevronLeft, Smartphone, Calendar, Clock, Phone, Wrench } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_STEPS = ['pending', 'confirmed', 'picked_up', 'in_diagnosis', 'in_repair', 'completed'];
const STATUS_COLOR: Record<string, string> = {
  pending:     'bg-amber-100 text-amber-700',
  confirmed:   'bg-blue-100 text-blue-700',
  picked_up:   'bg-indigo-100 text-indigo-700',
  in_diagnosis:'bg-purple-100 text-purple-700',
  in_repair:   'bg-orange-100 text-orange-700',
  completed:   'bg-green-100 text-green-700',
  cancelled:   'bg-red-100 text-red-700',
};

export const BookingDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getBookingById(id)
      .then((r: any) => setBooking(r.data ?? r))
      .catch(() => toast.error('Booking not found'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Loading fullScreen message="Loading booking..." />;
  if (!booking) return (
    <div className="text-center py-20">
      <p className="text-slate-500 font-bold">Booking not found</p>
      <Link to="/orders" className="text-blue-600 text-sm font-bold hover:underline mt-2 inline-block">← Back</Link>
    </div>
  );

  const stepIdx = STATUS_STEPS.indexOf(booking.status);

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24 space-y-4">
      <button onClick={() => navigate('/orders')} className="flex items-center gap-1 text-sm font-bold text-blue-600 hover:underline">
        <ChevronLeft className="w-4 h-4" /> Back to Orders
      </button>

      {/* Header */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5">
        <div className="flex items-start justify-between mb-1">
          <div>
            <p className="text-xs text-slate-400 font-mono">#{booking.id.slice(0, 8).toUpperCase()}</p>
            <h1 className="text-lg font-black text-slate-900">Repair Booking</h1>
          </div>
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full capitalize ${STATUS_COLOR[booking.status] ?? 'bg-slate-100 text-slate-600'}`}>
            {booking.status.replace(/_/g, ' ')}
          </span>
        </div>
        <p className="text-xs text-slate-400">{new Date(booking.created_at).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })}</p>

        {booking.status !== 'cancelled' && (
          <div className="mt-4">
            <div className="flex items-center gap-1 mb-2">
              {STATUS_STEPS.map((s, i) => (
                <div key={s} className={`flex-1 h-2 rounded-full transition-all ${i <= stepIdx ? 'bg-purple-500' : 'bg-slate-100'}`} />
              ))}
            </div>
            <div className="flex justify-between text-[9px] text-slate-400 font-medium">
              {STATUS_STEPS.map(s => <span key={s} className="capitalize">{s.replace(/_/g, ' ')}</span>)}
            </div>
          </div>
        )}
      </div>

      {/* Device */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-3">
        <p className="text-xs font-black text-slate-500 uppercase tracking-wide">Device & Issue</p>
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-50 rounded-xl"><Smartphone className="w-5 h-5 text-purple-600" /></div>
          <div>
            <p className="font-black text-slate-900">{booking.device_brand} {booking.device_model}</p>
            <p className="text-xs text-slate-500 capitalize">{booking.device_type}</p>
          </div>
        </div>
        <div className="bg-slate-50 rounded-xl p-3">
          <p className="text-xs font-bold text-slate-500 mb-1">Issue</p>
          <p className="text-sm text-slate-700">"{booking.issue_description}"</p>
        </div>
        {booking.fulfillment_type && (
          <p className="text-xs text-slate-500 flex items-center gap-2">
            <Wrench className="w-3.5 h-3.5" />
            <span className="font-bold capitalize">{booking.fulfillment_type.replace(/_/g, ' ')}</span>
          </p>
        )}
      </div>

      {/* Schedule */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-2 text-sm text-slate-600">
        <p className="text-xs font-black text-slate-500 uppercase tracking-wide mb-2">Schedule</p>
        {booking.preferred_date && <p className="flex items-center gap-2"><Calendar className="w-4 h-4 text-slate-400" />{new Date(booking.preferred_date).toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>}
        {booking.preferred_time && <p className="flex items-center gap-2"><Clock className="w-4 h-4 text-slate-400" />{booking.preferred_time}</p>}
        <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-slate-400" />{booking.phone_number}</p>
      </div>

      {/* Costs */}
      {(booking.commitment_fee || booking.estimated_cost || booking.final_cost) && (
        <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-2 text-sm">
          <p className="text-xs font-black text-slate-500 uppercase tracking-wide mb-2">Cost Summary</p>
          {booking.commitment_fee > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>Commitment fee</span>
              <span className="flex items-center gap-2">{formatCurrency(booking.commitment_fee)}
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${booking.commitment_payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{booking.commitment_payment_status ?? 'unpaid'}</span>
              </span>
            </div>
          )}
          {booking.estimated_cost > 0 && <div className="flex justify-between text-slate-600"><span>Estimated</span><span>{formatCurrency(booking.estimated_cost)}</span></div>}
          {booking.final_cost > 0 && (
            <div className="flex justify-between font-black text-slate-900 pt-2 border-t border-slate-100">
              <span>Final cost</span>
              <span className="flex items-center gap-2">{formatCurrency(booking.final_cost)}
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${booking.final_payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{booking.final_payment_status ?? 'unpaid'}</span>
              </span>
            </div>
          )}
        </div>
      )}

      {booking.internal_notes && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <p className="text-xs font-black text-blue-700 mb-1">Technician Notes</p>
          <p className="text-sm text-blue-800">{booking.internal_notes}</p>
        </div>
      )}
    </div>
  );
};

export default BookingDetailPage;
