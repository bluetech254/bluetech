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
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Loading from '../components/common/Loading';
import { User, ShieldAlert, Key, ClipboardList, Settings, Lock, MapPin, Phone, LogOut, ArrowRight, CheckCircle, Smartphone, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

export const ProfilePage = () => {
  const { user, isAuthenticated, logout, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'profile' | 'orders' | 'bookings'>('profile');
  const [orders, setOrders] = useState<Order[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // Guards
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/profile' } } });
    }
  }, [isAuthenticated, navigate]);

  // Form setups
  const {
    register: regProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
    reset: resetProfileForm,
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: user?.full_name || '',
      phone_number: user?.phone_number || '',
    }
  });

  const {
    register: regPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPasswordForm,
  } = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      current_password: '',
      new_password: '',
      new_password_confirm: '',
    }
  });

  // Re-sync forms if user profile changes
  useEffect(() => {
    if (user) {
      resetProfileForm({
        full_name: user.full_name,
        phone_number: user.phone_number,
      });
    }
  }, [user, resetProfileForm]);

  // Load history based on tab selection
  useEffect(() => {
    if (!isAuthenticated || !user?.phone_number) return;
    if (activeTab === 'orders') {
      const fetchOrders = async () => {
        setLoadingHistory(true);
        try {
          const list = await trackOrdersByPhone(user.phone_number);
          setOrders(list || []);
        } catch (err) {
          console.error('Failed to load user orders:', err);
        } finally {
          setLoadingHistory(false);
        }
      };
      fetchOrders();
    } else if (activeTab === 'bookings') {
      const fetchBookings = async () => {
        setLoadingHistory(true);
        try {
          const list = await trackBookingsByPhone(user.phone_number);
          setBookings(list || []);
        } catch (err) {
          console.error('Failed to load user repair bookings:', err);
        } finally {
          setLoadingHistory(false);
        }
      };
      fetchBookings();
    }
  }, [activeTab, isAuthenticated, user]);

  const onUpdateProfile = async (formData: any) => {
    setUpdatingProfile(true);
    const toastId = toast.loading('Saving your profile changes...');
    try {
      await updateProfile(formData);
      await refreshUser();
      toast.success('Profile details saved successfully!', { id: toastId });
    } catch (err: any) {
      console.error('Failed profile update:', err);
      const msg = err.response?.data?.message || 'Failed to save changes. Verify inputs.';
      toast.error(msg, { id: toastId });
    } finally {
      setUpdatingProfile(false);
    }
  };

  const onUpdatePassword = async (formData: any) => {
    setUpdatingPassword(true);
    const toastId = toast.loading('Updating security passkey...');
    try {
      await changePassword({
        current_password: formData.current_password,
        new_password: formData.new_password,
      });
      resetPasswordForm();
      toast.success('Password updated successfully!', { id: toastId });
    } catch (err: any) {
      console.error('Failed password update:', err);
      const msg = err.response?.data?.message || 'Current password authentication failed.';
      toast.error(msg, { id: toastId });
    } finally {
      setUpdatingPassword(false);
    }
  };

  if (!user) {
    return <Loading fullScreen message="Syncing secure portal session..." />;
  }

  return (
    <div className="space-y-8 py-6 animate-fade-in text-left">
      {/* Upper header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">BlueTech Client Workspace</span>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-1">
            Welcome, {user.full_name.split(' ')[0]}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your credentials, examine historic receipts, and monitor active workshop repairs.
          </p>
        </div>

        <button
          onClick={logout}
          className="px-4 py-2.5 bg-red-50 hover:bg-red-100 border border-red-100 text-red-600 text-xs font-bold rounded-xl flex items-center justify-center cursor-pointer transition-colors"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Workspace Sidebar Tabs (1 column) */}
        <div className="lg:col-span-1 space-y-2">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`
              w-full py-3.5 px-4 rounded-xl text-sm font-bold text-left transition-colors cursor-pointer flex items-center space-x-2.5
              ${activeTab === 'profile' 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-100' 
                : 'bg-white hover:bg-slate-50 border border-slate-100 text-slate-700'
              }
            `}
          >
            <User className="w-4.5 h-4.5" />
            <span>Profile Details</span>
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`
              w-full py-3.5 px-4 rounded-xl text-sm font-bold text-left transition-colors cursor-pointer flex items-center space-x-2.5
              ${activeTab === 'orders' 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-100' 
                : 'bg-white hover:bg-slate-50 border border-slate-100 text-slate-700'
              }
            `}
          >
            <ClipboardList className="w-4.5 h-4.5" />
            <span>Order History</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bookings')}
            className={`
              w-full py-3.5 px-4 rounded-xl text-sm font-bold text-left transition-colors cursor-pointer flex items-center space-x-2.5
              ${activeTab === 'bookings' 
                ? 'bg-blue-600 text-white shadow-md shadow-blue-100' 
                : 'bg-white hover:bg-slate-50 border border-slate-100 text-slate-700'
              }
            `}
          >
            <Settings className="w-4.5 h-4.5" />
            <span>Repair Bookings</span>
          </button>
        </div>

        {/* Workspace Panels (3 columns) */}
        <div className="lg:col-span-3">
          
          {/* 1. PROFILE DETAILS PANEL */}
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Account details Card */}
              <Card className="p-6 space-y-4">
                <h3 className="font-extrabold text-slate-900 border-b border-slate-50 pb-2 flex items-center text-sm uppercase tracking-wider text-slate-400">
                  <User className="w-4.5 h-4.5 text-blue-600 mr-2" />
                  Update Details
                </h3>

                <form onSubmit={handleProfileSubmit(onUpdateProfile)} className="space-y-4">
                  <Input
                    id="full_name"
                    label="Full Name"
                    error={profileErrors.full_name?.message}
                    {...regProfile('full_name')}
                  />
                  
                  <Input
                    id="phone_number"
                    label="Phone Number"
                    error={profileErrors.phone_number?.message}
                    {...regProfile('phone_number')}
                  />

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block">Email Address (Read-only)</label>
                    <input
                      type="text"
                      disabled
                      value={user.email}
                      className="w-full py-3 px-4 border-2 border-slate-100 bg-slate-50 rounded-lg text-sm text-slate-400 outline-none cursor-not-allowed font-medium"
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    disabled={updatingProfile}
                    className="w-full py-3 text-xs uppercase tracking-wider font-bold"
                  >
                    {updatingProfile ? 'Saving detail changes...' : 'Save details'}
                  </Button>
                </form>
              </Card>

              {/* Password update Card */}
              <Card className="p-6 space-y-4">
                <h3 className="font-extrabold text-slate-900 border-b border-slate-50 pb-2 flex items-center text-sm uppercase tracking-wider text-slate-400">
                  <Lock className="w-4.5 h-4.5 text-blue-600 mr-2" />
                  Change Password
                </h3>

                <form onSubmit={handlePasswordSubmit(onUpdatePassword)} className="space-y-4">
                  <Input
                    id="current_password"
                    label="Current Password"
                    type="password"
                    placeholder="••••••••"
                    error={passwordErrors.current_password?.message}
                    {...regPassword('current_password')}
                  />
                  
                  <Input
                    id="new_password"
                    label="New Security Password"
                    type="password"
                    placeholder="Min 6 characters"
                    error={passwordErrors.new_password?.message}
                    {...regPassword('new_password')}
                  />

                  <Input
                    id="new_password_confirm"
                    label="Verify New Password"
                    type="password"
                    placeholder="••••••••"
                    error={passwordErrors.new_password_confirm?.message}
                    {...regPassword('new_password_confirm')}
                  />

                  <Button
                    type="submit"
                    variant="secondary"
                    disabled={updatingPassword}
                    className="w-full py-3 text-xs uppercase tracking-wider font-bold border border-slate-200"
                  >
                    {updatingPassword ? 'Updating Password...' : 'Change Passkey'}
                  </Button>
                </form>
              </Card>

            </div>
          )}

          {/* 2. ORDER HISTORY PANEL */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <h3 className="font-extrabold text-slate-900 flex items-center text-sm uppercase tracking-wider text-slate-400">
                <ClipboardList className="w-4.5 h-4.5 text-blue-600 mr-2" />
                Historic Catalog Purchases
              </h3>

              {loadingHistory ? (
                <div className="py-12 flex justify-center"><Loading message="Retrieving order list..." /></div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-200">
                  <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-slate-600">No Orders Registered</p>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1 mb-4">You haven't purchased any items through our storefront yet.</p>
                  <Link to="/products" className="text-xs font-bold text-blue-600 hover:underline">Explore Products Catalog</Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((ord) => (
                    <Card key={ord.id} className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-slate-100 bg-white">
                      <div className="space-y-1.5 text-left flex-1 min-w-0">
                        <div className="flex items-center space-x-2.5">
                          <span className="font-mono text-xs font-bold text-slate-400 truncate max-w-[120px]">{ord.id}</span>
                          <Badge variant={ord.status === 'delivered' ? 'success' : 'info'} className="capitalize text-[10px]">
                            {ord.status}
                          </Badge>
                          <Badge variant={ord.payment_status === 'paid' ? 'success' : 'warning'} className="capitalize text-[10px]">
                            {ord.payment_status}
                          </Badge>
                        </div>
                        <p className="font-bold text-slate-900 text-sm">
                          Shipping to: <span className="text-slate-600 font-medium">{ord.delivery_address}</span>
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Date: {new Date(ord.created_at).toLocaleDateString()} • Items count: {ord.items?.length || 0}
                        </p>
                      </div>

                      <div className="text-left md:text-right flex md:flex-col items-center md:items-end justify-between md:justify-center w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-slate-50">
                        <div className="text-base font-black text-blue-600">
                          {formatCurrency(ord.total_amount)}
                        </div>
                        <Link
                          to={`/track-order?type=order&id=${ord.id}`}
                          className="mt-1 inline-flex items-center text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          <span>Track Shipment</span>
                          <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Link>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. REPAIR BOOKINGS PANEL */}
          {activeTab === 'bookings' && (
            <div className="space-y-4">
              <h3 className="font-extrabold text-slate-900 flex items-center text-sm uppercase tracking-wider text-slate-400">
                <Settings className="w-4.5 h-4.5 text-blue-600 mr-2" />
                Historic Workshop Bookings
              </h3>

              {loadingHistory ? (
                <div className="py-12 flex justify-center"><Loading message="Retrieving repair bookings..." /></div>
              ) : bookings.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-200">
                  <Settings className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-slate-600">No Workshop Appointments</p>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1 mb-4">You have not scheduled any repair diagnostic sessions yet.</p>
                  <Link to="/services" className="text-xs font-bold text-blue-600 hover:underline">View Available Services</Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {bookings.map((bk) => (
                    <Card key={bk.id} className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-slate-100 bg-white">
                      <div className="space-y-1.5 text-left flex-1 min-w-0">
                        <div className="flex items-center space-x-2.5">
                          <span className="font-mono text-xs font-bold text-slate-400 truncate max-w-[120px]">{bk.id}</span>
                          <Badge variant={bk.status === 'completed' ? 'success' : bk.status === 'ready' ? 'success' : 'info'} className="capitalize text-[10px]">
                            {bk.status}
                          </Badge>
                        </div>
                        <p className="font-bold text-slate-900 text-sm flex items-center">
                          <Smartphone className="w-4 h-4 mr-1.5 text-slate-400 flex-shrink-0" />
                          <span className="capitalize">{bk.device_brand} {bk.device_model}</span>
                        </p>
                        <p className="text-xs text-slate-500 line-clamp-1">
                          Problem: "{bk.issue_description}"
                        </p>
                        <p className="text-[11px] text-slate-400 flex items-center">
                          <Calendar className="w-3.5 h-3.5 mr-1 text-slate-300" />
                          Appointment: {new Date(bk.preferred_date).toLocaleDateString()} • {bk.preferred_time} slot
                        </p>
                      </div>

                      <div className="text-left md:text-right flex md:flex-col items-center md:items-end justify-between md:justify-center w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-slate-50">
                        <Link
                          to={`/track-order?type=repair&id=${bk.id}`}
                          className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg cursor-pointer flex items-center shadow-xs"
                        >
                          <span>Track Progress</span>
                          <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Link>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
