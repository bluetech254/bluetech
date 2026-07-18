import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { updateProfile, changePassword } from '../api/users';
import { trackOrdersByPhone } from '../api/orders';
import { trackBookingsByPhone } from '../api/bookings';
import { Order, Booking } from '../types';
import { formatCurrency } from '../utils/formatters';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { profileSchema, passwordSchema } from '../utils/validation';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Loading from '../components/common/Loading';
import {
  User, Lock, ClipboardList, Wrench, LogOut, ArrowRight,
  Phone, Mail, Calendar, Smartphone, ShieldCheck, ShieldAlert,
  Package, CheckCircle2, Clock, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';

type Tab = 'overview' | 'orders' | 'bookings' | 'settings';

const statusColor: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
  processing: 'bg-purple-50 text-purple-700 border-purple-200',
  shipped: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  delivered: 'bg-green-50 text-green-700 border-green-200',
  completed: 'bg-green-50 text-green-700 border-green-200',
  in_progress: 'bg-purple-50 text-purple-700 border-purple-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
  paid: 'bg-green-50 text-green-700 border-green-200',
  unpaid: 'bg-slate-50 text-slate-600 border-slate-200',
};

export const ProfilePage = () => {
  const { user, isAuthenticated, logout, refreshUser, isLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [orders, setOrders] = useState<Order[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate('/login', { state: { from: { pathname: '/profile' } } });
  }, [isAuthenticated, isLoading, navigate]);

  const { register: regProfile, handleSubmit: handleProfileSubmit, formState: { errors: profileErrors }, reset: resetProfileForm } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { full_name: user?.full_name || '', phone_number: user?.phone_number || '' }
  });

  const { register: regPassword, handleSubmit: handlePasswordSubmit, formState: { errors: passwordErrors }, reset: resetPasswordForm } = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current_password: '', new_password: '', new_password_confirm: '' }
  });

  useEffect(() => {
    if (user) resetProfileForm({ full_name: user.full_name, phone_number: user.phone_number });
  }, [user, resetProfileForm]);

  useEffect(() => {
    if (!isAuthenticated || !user?.phone_number) return;
    if (activeTab === 'orders' || activeTab === 'overview') {
      setLoadingHistory(true);
      trackOrdersByPhone(user.phone_number).then(r => setOrders(r || [])).catch(() => {}).finally(() => setLoadingHistory(false));
    }
    if (activeTab === 'bookings' || activeTab === 'overview') {
      trackBookingsByPhone(user.phone_number).then(r => setBookings(r || [])).catch(() => {});
    }
  }, [activeTab, isAuthenticated, user]);

  const onUpdateProfile = async (formData: any) => {
    setUpdatingProfile(true);
    const id = toast.loading('Saving changes...');
    try {
      await updateProfile(formData);
      await refreshUser();
      toast.success('Profile updated!', { id });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save.', { id });
    } finally { setUpdatingProfile(false); }
  };

  const onUpdatePassword = async (formData: any) => {
    setUpdatingPassword(true);
    const id = toast.loading('Updating password...');
    try {
      await changePassword({ current_password: formData.current_password, new_password: formData.new_password });
      resetPasswordForm();
      toast.success('Password updated!', { id });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Current password incorrect.', { id });
    } finally { setUpdatingPassword(false); }
  };

  if (isLoading || !user) return <Loading fullScreen message="Loading profile..." />;

  const initials = user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const memberSince = new Date(user.created_at).toLocaleDateString('en-KE', { month: 'long', year: 'numeric' });

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <User className="w-4 h-4" /> },
    { id: 'orders', label: 'Orders', icon: <Package className="w-4 h-4" /> },
    { id: 'bookings', label: 'Repairs', icon: <Wrench className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Lock className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-5xl mx-auto animate-fade-in pb-20 lg:pb-8">

      {/* Hero Banner */}
      <div className="relative bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 rounded-2xl overflow-hidden mb-6 p-6 sm:p-8">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #3b82f6 0%, transparent 50%), radial-gradient(circle at 80% 20%, #1d4ed8 0%, transparent 40%)' }} />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Avatar */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-2xl sm:text-3xl font-black shadow-lg flex-shrink-0">
            {initials}
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-black text-white truncate">{user.full_name}</h1>
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${(user as any).is_verified ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'}`}>
                {(user as any).is_verified ? <CheckCircle2 className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                {(user as any).is_verified ? 'Verified' : 'Unverified'}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
              <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{user.phone_number}</span>
              {user.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{user.email}</span>}
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Member since {memberSince}</span>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="relative grid grid-cols-3 gap-3 mt-6">
          {[
            { label: 'Total Orders', value: orders.length, icon: <Package className="w-4 h-4" /> },
            { label: 'Repair Jobs', value: bookings.length, icon: <Wrench className="w-4 h-4" /> },
            { label: 'Account Status', value: (user as any).is_verified ? 'Active' : 'Pending', icon: <ShieldCheck className="w-4 h-4" /> },
          ].map(s => (
            <div key={s.label} className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-xl p-3 text-center">
              <div className="text-blue-300 flex justify-center mb-1">{s.icon}</div>
              <div className="text-white font-black text-lg leading-none">{s.value}</div>
              <div className="text-slate-400 text-[10px] mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 sm:px-4 rounded-lg text-xs sm:text-sm font-bold transition-all ${activeTab === t.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {t.icon}<span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Quick action cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Browse Products', to: '/products', icon: <Package className="w-5 h-5" />, color: 'text-blue-600 bg-blue-50' },
              { label: 'Book Repair', to: '/services', icon: <Wrench className="w-5 h-5" />, color: 'text-purple-600 bg-purple-50' },
              { label: 'Track Order', to: '/track-order', icon: <ClipboardList className="w-5 h-5" />, color: 'text-green-600 bg-green-50' },
              { label: 'Edit Profile', onClick: () => setActiveTab('settings'), icon: <User className="w-5 h-5" />, color: 'text-slate-600 bg-slate-100' },
            ].map(a => (
              a.to
                ? <Link key={a.label} to={a.to} className="bg-white border border-slate-100 rounded-xl p-4 flex flex-col items-center gap-2 hover:shadow-md transition-shadow text-center">
                    <div className={`p-2.5 rounded-xl ${a.color}`}>{a.icon}</div>
                    <span className="text-xs font-bold text-slate-700">{a.label}</span>
                  </Link>
                : <button key={a.label} onClick={a.onClick} className="bg-white border border-slate-100 rounded-xl p-4 flex flex-col items-center gap-2 hover:shadow-md transition-shadow text-center w-full">
                    <div className={`p-2.5 rounded-xl ${a.color}`}>{a.icon}</div>
                    <span className="text-xs font-bold text-slate-700">{a.label}</span>
                  </button>
            ))}
          </div>

          {/* Recent orders */}
          <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
              <h3 className="font-black text-slate-900 text-sm">Recent Orders</h3>
              <button onClick={() => setActiveTab('orders')} className="text-xs text-blue-600 font-bold flex items-center gap-1 hover:underline">View all <ChevronRight className="w-3.5 h-3.5" /></button>
            </div>
            {loadingHistory ? (
              <div className="py-8 flex justify-center"><Loading message="" /></div>
            ) : orders.length === 0 ? (
              <div className="py-10 text-center">
                <Package className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-400">No orders yet</p>
                <Link to="/products" className="text-xs text-blue-600 font-bold hover:underline mt-1 inline-block">Shop now</Link>
              </div>
            ) : orders.slice(0, 3).map(ord => (
              <div key={ord.id} className="flex items-center justify-between px-5 py-3.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                <div>
                  <p className="text-xs font-black text-slate-800">{ord.order_number || ord.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{new Date(ord.created_at).toLocaleDateString()} · {ord.items?.length || 0} item(s)</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${statusColor[ord.status] || statusColor.pending}`}>{ord.status}</span>
                  <span className="text-sm font-black text-blue-600">{formatCurrency(ord.total_amount)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Recent bookings */}
          <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
              <h3 className="font-black text-slate-900 text-sm">Recent Repairs</h3>
              <button onClick={() => setActiveTab('bookings')} className="text-xs text-blue-600 font-bold flex items-center gap-1 hover:underline">View all <ChevronRight className="w-3.5 h-3.5" /></button>
            </div>
            {bookings.length === 0 ? (
              <div className="py-10 text-center">
                <Wrench className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-400">No repair bookings</p>
                <Link to="/services" className="text-xs text-blue-600 font-bold hover:underline mt-1 inline-block">Book a repair</Link>
              </div>
            ) : bookings.slice(0, 3).map(bk => (
              <div key={bk.id} className="flex items-center justify-between px-5 py-3.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                <div>
                  <p className="text-xs font-black text-slate-800 flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5 text-slate-400" />{bk.device_brand} {bk.device_model}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{bk.issue_description}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${statusColor[bk.status] || statusColor.pending}`}>{bk.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ORDERS TAB */}
      {activeTab === 'orders' && (
        <div className="space-y-3">
          {loadingHistory ? <div className="py-16 flex justify-center"><Loading message="Loading orders..." /></div>
          : orders.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-xl py-16 text-center">
              <Package className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="font-black text-slate-500">No orders found</p>
              <Link to="/products" className="text-xs text-blue-600 font-bold hover:underline mt-2 inline-block">Start shopping</Link>
            </div>
          ) : orders.map(ord => (
            <div key={ord.id} className="bg-white border border-slate-100 rounded-xl p-5 hover:shadow-md transition-shadow">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-slate-900 text-sm">{ord.order_number || ord.id.slice(0, 8).toUpperCase()}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${statusColor[ord.status] || statusColor.pending}`}>{ord.status}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${statusColor[(ord as any).payment_status] || statusColor.unpaid}`}>{(ord as any).payment_status || 'unpaid'}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{new Date(ord.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })} · {ord.items?.length || 0} item(s) · {ord.delivery_zone}</p>
                  <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">📍 {ord.delivery_address}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-blue-600">{formatCurrency(ord.total_amount)}</p>
                  <Link to={`/track-order?type=order&id=${ord.id}`} className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1 justify-end mt-1">
                    Track <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
              {ord.items?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-50 flex flex-wrap gap-2">
                  {ord.items.map(item => (
                    <span key={item.id} className="text-[11px] bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 text-slate-600 font-medium">
                      {item.product_name} ×{item.quantity}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* BOOKINGS TAB */}
      {activeTab === 'bookings' && (
        <div className="space-y-3">
          {bookings.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-200 rounded-xl py-16 text-center">
              <Wrench className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="font-black text-slate-500">No repair bookings</p>
              <Link to="/services" className="text-xs text-blue-600 font-bold hover:underline mt-2 inline-block">Book a repair</Link>
            </div>
          ) : bookings.map(bk => (
            <div key={bk.id} className="bg-white border border-slate-100 rounded-xl p-5 hover:shadow-md transition-shadow">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-blue-500" />{bk.device_brand} {bk.device_model}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${statusColor[bk.status] || statusColor.pending}`}>{bk.status.replace('_', ' ')}</span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-1">"{bk.issue_description}"</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(bk.preferred_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{bk.preferred_time}</span>
                  </div>
                </div>
                <Link to={`/track-order?type=repair&id=${bk.id}`} className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg transition-colors flex-shrink-0">
                  Track <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SETTINGS TAB */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Profile form */}
          <div className="bg-white border border-slate-100 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-50">
              <div className="p-2 bg-blue-50 rounded-lg"><User className="w-4 h-4 text-blue-600" /></div>
              <div>
                <h3 className="font-black text-slate-900 text-sm">Personal Details</h3>
                <p className="text-[11px] text-slate-400">Update your name and phone number</p>
              </div>
            </div>
            <form onSubmit={handleProfileSubmit(onUpdateProfile)} className="space-y-3">
              <Input id="full_name" label="Full Name" error={profileErrors.full_name?.message} {...regProfile('full_name')} />
              <Input id="phone_number" label="Phone Number" error={profileErrors.phone_number?.message} {...regProfile('phone_number')} />
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Email (read-only)</label>
                <input disabled value={user.email} className="w-full py-2 px-3 border-2 border-slate-100 bg-slate-50 rounded-lg text-sm text-slate-400 outline-none cursor-not-allowed" />
              </div>
              <Button type="submit" variant="primary" disabled={updatingProfile} className="w-full py-2.5 text-xs font-bold uppercase tracking-wider">
                {updatingProfile ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </div>

          {/* Password form */}
          <div className="bg-white border border-slate-100 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-50">
              <div className="p-2 bg-slate-100 rounded-lg"><Lock className="w-4 h-4 text-slate-600" /></div>
              <div>
                <h3 className="font-black text-slate-900 text-sm">Change Password</h3>
                <p className="text-[11px] text-slate-400">Keep your account secure</p>
              </div>
            </div>
            <form onSubmit={handlePasswordSubmit(onUpdatePassword)} className="space-y-3">
              <Input id="current_password" label="Current Password" type={showCurrentPw ? 'text' : 'password'} placeholder="••••••••" error={passwordErrors.current_password?.message} {...regPassword('current_password')} />
              <Input id="new_password" label="New Password" type={showNewPw ? 'text' : 'password'} placeholder="Min 6 characters" error={passwordErrors.new_password?.message} {...regPassword('new_password')} />
              <Input id="new_password_confirm" label="Confirm New Password" type="password" placeholder="••••••••" error={passwordErrors.new_password_confirm?.message} {...regPassword('new_password_confirm')} />
              <Button type="submit" variant="secondary" disabled={updatingPassword} className="w-full py-2.5 text-xs font-bold uppercase tracking-wider border border-slate-200">
                {updatingPassword ? 'Updating...' : 'Update Password'}
              </Button>
            </form>
          </div>

          {/* Danger zone */}
          <div className="md:col-span-2 bg-red-50 border border-red-100 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-black text-red-700 text-sm">Sign Out</h3>
              <p className="text-xs text-red-500 mt-0.5">You will be logged out of your BlueTech account on this device.</p>
            </div>
            <button onClick={logout} className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors flex-shrink-0">
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default ProfilePage;
