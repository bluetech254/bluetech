import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { trackOrdersByPhone } from '../api/orders';
import { trackBookingsByPhone } from '../api/bookings';
import { Order, Booking } from '../types';
import { formatCurrency } from '../utils/formatters';
import Badge from '../components/common/Badge';
import { User, LogOut, Package, Wrench, Phone, Mail, Calendar, ArrowRight, Smartphone } from 'lucide-react';

export const ProfilePage = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'orders' | 'bookings'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/profile' } } });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!user?.phone_number) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        if (activeTab === 'orders') {
          const data = await trackOrdersByPhone(user.phone_number);
          setOrders(data || []);
        } else {
          const data = await trackBookingsByPhone(user.phone_number);
          setBookings(data || []);
        }
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeTab, user?.phone_number]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center border-2 border-white/40 shadow-xl">
                <User className="w-12 h-12" />
              </div>
              <div>
                <h1 className="text-4xl font-black mb-2">{user.full_name}</h1>
                <div className="flex items-center space-x-4 text-blue-100">
                  <span className="flex items-center space-x-2">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">{user.phone_number}</span>
                  </span>
                  {user.email && (
                    <span className="flex items-center space-x-2">
                      <Mail className="w-4 h-4" />
                      <span className="text-sm">{user.email}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={logout}
              className="px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/40 rounded-xl text-white font-bold transition-all flex items-center space-x-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 -mt-8">
        {/* Tab Navigation */}
        <div className="flex space-x-4 mb-6">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center space-x-3 px-6 py-4 rounded-2xl font-bold transition-all shadow-lg ${
              activeTab === 'orders'
                ? 'bg-white text-blue-600 scale-105'
                : 'bg-white/60 backdrop-blur text-slate-600 hover:bg-white'
            }`}
          >
            <Package className="w-5 h-5" />
            <span>My Orders</span>
            {orders.length > 0 && (
              <span className="px-2.5 py-0.5 bg-blue-600 text-white text-xs font-black rounded-full">
                {orders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('bookings')}
            className={`flex items-center space-x-3 px-6 py-4 rounded-2xl font-bold transition-all shadow-lg ${
              activeTab === 'bookings'
                ? 'bg-white text-blue-600 scale-105'
                : 'bg-white/60 backdrop-blur text-slate-600 hover:bg-white'
            }`}
          >
            <Wrench className="w-5 h-5" />
            <span>My Repairs</span>
            {bookings.length > 0 && (
              <span className="px-2.5 py-0.5 bg-blue-600 text-white text-xs font-black rounded-full">
                {bookings.length}
              </span>
            )}
          </button>
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-2xl shadow-xl p-8 min-h-96">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            </div>
          ) : activeTab === 'orders' ? (
            <div className="space-y-4">
              {orders.length === 0 ? (
                <div className="text-center py-20">
                  <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-slate-900 mb-2">No orders yet</h3>
                  <p className="text-slate-500 mb-6">Start shopping to see your orders here</p>
                  <Link
                    to="/products"
                    className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all"
                  >
                    Browse Products
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </div>
              ) : (
                orders.map((order) => (
                  <div
                    key={order.id}
                    className="border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-all"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="text-xs font-mono text-slate-400">#{order.id.slice(0, 8)}</span>
                          <Badge variant={order.status === 'delivered' ? 'success' : 'info'}>
                            {order.status}
                          </Badge>
                          <Badge variant={order.payment_status === 'paid' ? 'success' : 'warning'}>
                            {order.payment_status}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600">{order.delivery_address}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {new Date(order.created_at).toLocaleDateString()} • {order.items.length} items
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-blue-600">{formatCurrency(order.total_amount)}</div>
                        <Link
                          to={`/track-order?type=order&id=${order.id}`}
                          className="inline-flex items-center text-sm font-bold text-blue-600 hover:text-blue-700 mt-2"
                        >
                          Track Order
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.length === 0 ? (
                <div className="text-center py-20">
                  <Wrench className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-slate-900 mb-2">No repair bookings</h3>
                  <p className="text-slate-500 mb-6">Book a repair service to see it here</p>
                  <Link
                    to="/services"
                    className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all"
                  >
                    View Services
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </div>
              ) : (
                bookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-all"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <span className="text-xs font-mono text-slate-400">#{booking.id.slice(0, 8)}</span>
                          <Badge variant={booking.status === 'completed' ? 'success' : 'info'}>
                            {booking.status}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2 mb-2">
                          <Smartphone className="w-5 h-5 text-slate-400" />
                          <span className="font-bold text-slate-900">
                            {booking.device_brand} {booking.device_model}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mb-2">Issue: {booking.issue_description}</p>
                        <div className="flex items-center space-x-2 text-xs text-slate-400">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(booking.preferred_date).toLocaleDateString()} at {booking.preferred_time}</span>
                        </div>
                      </div>
                      <Link
                        to={`/track-order?type=repair&id=${booking.id}`}
                        className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-sm flex items-center transition-all"
                      >
                        Track
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
