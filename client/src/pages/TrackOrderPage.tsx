import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getOrderById } from '../api/orders';
import { getBookingById } from '../api/bookings';
import { Order, Booking } from '../types';
import { formatCurrency } from '../utils/formatters';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import { Search, MapPin, Truck, CheckCircle2, ShieldCheck, Settings, AlertCircle, Wrench, Smartphone, User, Calendar, CreditCard, Phone, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

type TrackType = 'order' | 'repair';

export const TrackOrderPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TrackType>('order');
  const [searchId, setSearchId] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Loaded models
  const [order, setOrder] = useState<Order | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);

  // Trigger search on mount if parameters present
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const typeParam = params.get('type') as TrackType;
    const idParam = params.get('id');

    if (idParam) {
      setSearchId(idParam);
      if (typeParam === 'order' || typeParam === 'repair') {
        setActiveTab(typeParam);
        fetchTrackingData(typeParam, idParam);
      }
    }
  }, [location.search]);

  const fetchTrackingData = async (type: TrackType, id: string) => {
    if (!id.trim()) return;
    setLoading(true);
    setOrder(null);
    setBooking(null);

    const toastId = toast.loading(`Searching ${type === 'order' ? 'shipment' : 'repair status'} registry...`);

    try {
      if (type === 'order') {
        const data = await getOrderById(id);
        setOrder(data);
        toast.success('Purchase order found!', { id: toastId });
      } else {
        const data = await getBookingById(id);
        setBooking(data);
        toast.success('Workshop repair record found!', { id: toastId });
      }
    } catch (err: any) {
      console.error('Failed to resolve tracking ID:', err);
      const msg = err.response?.data?.message || `No active record found matching the provided ${type === 'order' ? 'Order' : 'Booking'} Reference ID.`;
      toast.error(msg, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchId.trim()) {
      toast.error('Please input a valid tracking reference ID');
      return;
    }
    // Update URL to match current search state for shareable links
    navigate(`/track-order?type=${activeTab}&id=${searchId.trim()}`, { replace: true });
  };

  // -------------------------------------------------------------
  // Timeline Generators
  // -------------------------------------------------------------
  
  // 1. Order Timeline
  const renderOrderTimeline = (ord: Order) => {
    const orderStatuses: { key: Order['status']; title: string; desc: string }[] = [
      { key: 'pending', title: 'Order Placed', desc: 'Order logged and awaiting payment authorization.' },
      { key: 'processing', title: 'Preparing Dispatch', desc: 'Catalog items are being picked, checked, and securely wrapped.' },
      { key: 'shipped', title: 'In Transit', desc: 'Package dispatched to shipping courier, heading to your location.' },
      { key: 'delivered', title: 'Delivered', desc: 'Courier handoff complete and verified.' },
    ];

    // Find active step index
    const activeIndex = orderStatuses.findIndex(step => step.key === ord.status);

    return (
      <Card className="p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-50 pb-4 text-left">
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Shipment Order ID</span>
            <span className="font-mono font-bold text-slate-900 text-sm">{ord.id}</span>
          </div>
          <div className="flex items-center space-x-2.5">
            <Badge variant="info" className="capitalize">
              {ord.status}
            </Badge>
          </div>
        </div>

        {/* Timeline Visualization */}
        <div className="relative border-l-2 border-slate-200 pl-6 ml-4 space-y-8 py-2 text-left">
          {orderStatuses.map((step, idx) => {
            const isCompleted = idx < activeIndex;
            const isActive = idx === activeIndex;
            const isFuture = idx > activeIndex;

            return (
              <div key={idx} className="relative">
                {/* Visual Circle Indicator */}
                <span className={`
                  absolute -left-10 top-0.5 w-6 h-6 rounded-full flex items-center justify-center transition-all z-10 font-bold text-xs
                  ${isCompleted 
                    ? 'bg-green-500 text-white shadow-sm ring-4 ring-green-50' 
                    : isActive 
                      ? 'bg-blue-600 text-white shadow-sm ring-4 ring-blue-100 animate-pulse-custom' 
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }
                `}>
                  {isCompleted ? '✓' : idx + 1}
                </span>

                <div className="space-y-1">
                  <h4 className={`font-bold text-sm ${isActive ? 'text-blue-600 text-base font-extrabold' : isFuture ? 'text-slate-400' : 'text-slate-800'}`}>
                    {step.title}
                  </h4>
                  <p className={`text-xs ${isFuture ? 'text-slate-300' : 'text-slate-500'} leading-relaxed`}>
                    {step.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Shipment Details list */}
        <div className="border-t border-slate-150 pt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600 text-left">
          <div className="space-y-1.5">
            <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Shipping Destination</p>
            <p className="font-bold text-slate-800 text-sm">{ord.customer_name}</p>
            <p className="flex items-center"><MapPin className="w-3.5 h-3.5 mr-1 text-slate-400 flex-shrink-0" /> {ord.delivery_address} ({ord.delivery_zone})</p>
            <p className="flex items-center"><Phone className="w-3.5 h-3.5 mr-1 text-slate-400 flex-shrink-0" /> {ord.phone_number}</p>
          </div>
          <div className="space-y-1.5 sm:text-right">
            <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px] sm:text-right">Totals Due</p>
            <p className="font-black text-blue-600 text-lg">{formatCurrency(ord.total_amount)}</p>
            <p className="font-semibold text-slate-500 capitalize">Method: {ord.payment_method.replace(/_/g, ' ')}</p>
            <p className="text-slate-400 text-[10px]">Registered on: {new Date(ord.created_at).toLocaleString()}</p>
          </div>
        </div>
      </Card>
    );
  };

  // 2. Booking Timeline
  const renderBookingTimeline = (bk: Booking) => {
    const bookingStatuses: { key: Booking['status']; title: string; desc: string }[] = [
      { key: 'pending', title: 'Booking Logged', desc: 'Repair appointment scheduled. Awaiting device dropoff or courier pickup.' },
      { key: 'confirmed', title: 'Appointment Confirmed', desc: 'Hardware received and registered into our diagnostics intake lab.' },
      { key: 'in_repair', title: 'Repairs Active', desc: 'Diagnostics complete. Technician active in micro-soldering and spares replacement.' },
      { key: 'completed', title: 'Device Ready & Returned', desc: 'Post-repair benchmark stress tests passed. Device returned to client with active warranty.' },
    ];

    const activeIndex = bookingStatuses.findIndex(step => step.key === bk.status);

    return (
      <Card className="p-6 md:p-8 space-y-6 text-left">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-50 pb-4 text-left">
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Workshop Repair Reference</span>
            <span className="font-mono font-bold text-slate-900 text-sm">{bk.id}</span>
          </div>
          <div className="flex items-center space-x-2.5">
            <span className="text-xs bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded uppercase font-mono capitalize">
              {bk.device_type}
            </span>
            <Badge variant="info" className="capitalize">
              {bk.status}
            </Badge>
          </div>
        </div>

        {/* Timeline visualization */}
        <div className="relative border-l-2 border-slate-200 pl-6 ml-4 space-y-8 py-2 text-left">
          {bookingStatuses.map((step, idx) => {
            const isCompleted = idx < activeIndex;
            const isActive = idx === activeIndex;
            const isFuture = idx > activeIndex;

            return (
              <div key={idx} className="relative">
                {/* Circle Indicator */}
                <span className={`
                  absolute -left-10 top-0.5 w-6 h-6 rounded-full flex items-center justify-center transition-all z-10 font-bold text-xs
                  ${isCompleted 
                    ? 'bg-green-500 text-white shadow-sm ring-4 ring-green-50' 
                    : isActive 
                      ? 'bg-blue-600 text-white shadow-sm ring-4 ring-blue-100 animate-pulse-custom' 
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }
                `}>
                  {isCompleted ? '✓' : idx + 1}
                </span>

                <div className="space-y-1">
                  <h4 className={`font-bold text-sm ${isActive ? 'text-blue-600 text-base font-extrabold' : isFuture ? 'text-slate-400' : 'text-slate-800'}`}>
                    {step.title}
                  </h4>
                  <p className={`text-xs ${isFuture ? 'text-slate-300' : 'text-slate-500'} leading-relaxed`}>
                    {step.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Appointment Metadata */}
        <div className="border-t border-slate-150 pt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600 text-left">
          <div className="space-y-1.5">
            <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Device & Issue Summary</p>
            <p className="font-bold text-slate-800 text-sm capitalize">{bk.device_type} {bk.device_model}</p>
            <p className="leading-relaxed"><strong className="text-slate-700">Problem:</strong> "{bk.issue_description}"</p>
            {bk.notes && <p className="leading-relaxed italic text-slate-500"><strong className="text-slate-700">Client Note:</strong> {bk.notes}</p>}
          </div>
          <div className="space-y-1.5 sm:text-right">
            <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px] sm:text-right">Fulfillment</p>
            <p className="font-extrabold text-slate-900 capitalize">{bk.fulfillment_type?.replace('_', ' ')}</p>
            {bk.pickup_address && <p className="text-slate-500 text-xs">{bk.pickup_address}</p>}
            <p className="text-slate-400 text-[10px]">Booked on: {new Date(bk.created_at).toLocaleString()}</p>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-8 animate-fade-in text-left">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Track Deliveries & Repairs
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Monitor shipment dispatches or check real-time workshop engineering progress timelines instantly.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => {
            setActiveTab('order');
            setOrder(null);
            setBooking(null);
          }}
          className={`
            flex-1 py-3 text-center font-extrabold text-sm border-b-2 transition-all cursor-pointer flex items-center justify-center space-x-2
            ${activeTab === 'order' 
              ? 'border-blue-600 text-blue-600 bg-blue-50/10' 
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }
          `}
        >
          <Truck className="w-4 h-4 text-current" />
          <span>Track Purchase Shipment</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('repair');
            setOrder(null);
            setBooking(null);
          }}
          className={`
            flex-1 py-3 text-center font-extrabold text-sm border-b-2 transition-all cursor-pointer flex items-center justify-center space-x-2
            ${activeTab === 'repair' 
              ? 'border-blue-600 text-blue-600 bg-blue-50/10' 
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }
          `}
        >
          <Wrench className="w-4 h-4 text-current" />
          <span>Track Workshop Repairs</span>
        </button>
      </div>

      {/* Query search form */}
      <Card className="p-5">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 min-w-0">
            <Input
              id="searchId"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder={activeTab === 'order' ? 'Enter Order Tracking ID (e.g. ord_xxx)' : 'Enter Booking Reference ID (e.g. bkg_xxx)'}
              className="py-3 px-4 font-mono text-sm uppercase"
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            leftIcon={loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            className="sm:w-36 py-3 px-5 font-bold"
          >
            {loading ? 'Searching...' : 'Search ID'}
          </Button>
        </form>
      </Card>

      {/* Loading Skeleton */}
      {loading && (
        <Card className="p-8 space-y-4 animate-pulse">
          <div className="h-6 bg-slate-100 rounded w-1/3" />
          <div className="h-4 bg-slate-100 rounded w-1/4" />
          <div className="space-y-2 pt-6">
            <div className="h-10 bg-slate-50 rounded" />
            <div className="h-10 bg-slate-50 rounded" />
            <div className="h-10 bg-slate-50 rounded" />
          </div>
        </Card>
      )}

      {/* Main Results Display */}
      {!loading && order && renderOrderTimeline(order)}
      {!loading && booking && renderBookingTimeline(booking)}

      {/* No results placeholder state */}
      {!loading && !order && !booking && (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-slate-150 rounded-2xl bg-slate-50/40 p-4">
          <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-3">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-slate-700 text-base">Awaiting Tracking Reference ID</h3>
          <p className="text-xs text-slate-400 mt-0.5 max-w-sm leading-normal">
            Select a category above, paste your Order ID or Booking Reference from your confirmation screen, and click search to plot the technical timeline.
          </p>
        </div>
      )}
    </div>
  );
};

export default TrackOrderPage;
