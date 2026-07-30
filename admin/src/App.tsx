import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { 
  LayoutDashboard, ShoppingBag, Wrench, Package, MapPin, 
  LogOut, Menu, X, RefreshCw, Users, Lock, Eye, EyeOff
} from 'lucide-react';

import { Order, Booking, Product, DeliveryZone, RepairService, User } from './types';
import { databaseService } from './lib/supabase';
import { 
  isAuthenticated, clearSession, createSession, 
  validatePassword, extendSession, ADMIN_CREDENTIALS 
} from './lib/auth';

// Lazy load heavy components
const DashboardView = lazy(() => import('./components/DashboardView'));
const OrdersView = lazy(() => import('./components/OrdersView'));
const BookingsView = lazy(() => import('./components/BookingsView'));
const ProductManagementView = lazy(() => import('./components/ProductManagementView'));
const DeliveryZonesView = lazy(() => import('./components/DeliveryZonesView'));
const ServiceManagementView = lazy(() => import('./components/ServiceManagementView'));
const UsersView = lazy(() => import('./components/UsersView'));

// Loading spinner component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-full">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

// Toast notification
interface Toast { id: string; msg: string; type: 'success' | 'error' | 'info'; }

export default function App() {
  // Auth state
  const [authenticated, setAuthenticated] = useState(isAuthenticated());
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  
  // App state
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Data state
  const [orders, setOrders] = useState<Order[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [services, setServices] = useState<RepairService[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  // Toast state
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  // Tracking for new items
  const [lastOrderCount, setLastOrderCount] = useState(0);
  const [lastBookingCount, setLastBookingCount] = useState(0);

  // Show toast notification
  const showToast = useCallback((msg: string, type: Toast['type']) => {
    const id = `toast-${Date.now()}`;
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  // Handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    try {
      // Try backend API first
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
      const response = await fetch(`${API_URL}/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: loginUsername, 
          password: loginPassword 
        }),
      });

      if (response.ok) {
        const data = await response.json();
        sessionStorage.setItem('bt_admin_token', data.access_token);
        sessionStorage.setItem('bt_admin_data', JSON.stringify(data.user || { username: loginUsername }));
        createSession(loginUsername);
        setAuthenticated(true);
        showToast('Welcome to BlueTech Admin', 'success');
        return;
      }
    } catch (err) {
      console.log('API login failed, trying fallback', err);
    }
    
    // Fallback to environment credentials
    if (loginUsername === ADMIN_CREDENTIALS.username && validatePassword(loginPassword)) {
      createSession(loginUsername);
      setAuthenticated(true);
      showToast('Welcome to BlueTech Admin', 'success');
    } else {
      setLoginError('Invalid credentials');
    }
  };

  // Handle logout
  const handleLogout = () => {
    clearSession();
    setAuthenticated(false);
    showToast('Logged out successfully', 'info');
  };

  // Fetch all data
  const fetchAllData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    
    try {
      const [allProducts, allOrders, allBookings, allZones, allServices, allUsers] = await Promise.all([
        databaseService.getProducts(),
        databaseService.getOrders(),
        databaseService.getBookings(),
        databaseService.getDeliveryZones(),
        databaseService.getRepairServices(),
        databaseService.getUsers()
      ]);

      // Detect new items
      if (silent && lastOrderCount > 0 && allOrders.length > lastOrderCount) {
        showToast(`🛒 ${allOrders.length - lastOrderCount} new order(s)!`, 'info');
      }
      if (silent && lastBookingCount > 0 && allBookings.length > lastBookingCount) {
        showToast(`🔧 ${allBookings.length - lastBookingCount} new booking(s)!`, 'info');
      }

      setProducts(allProducts);
      setOrders(allOrders);
      setBookings(allBookings);
      setZones(allZones);
      setServices(allServices);
      setUsers(allUsers);
      
      setLastOrderCount(allOrders.length);
      setLastBookingCount(allBookings.length);
      
      extendSession(); // Refresh session on activity
    } catch (err) {
      console.error('Error fetching data:', err);
      if (!silent) showToast('Failed to fetch data', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [lastOrderCount, lastBookingCount, showToast]);

  // Initial data load
  useEffect(() => {
    if (authenticated) {
      fetchAllData();
    }
  }, [authenticated]);

  // Auto-poll every 2 minutes
  useEffect(() => {
    if (!authenticated) return;
    
    const interval = setInterval(() => {
      fetchAllData(true);
    }, 120000);
    
    return () => clearInterval(interval);
  }, [authenticated, fetchAllData]);

  // Computed stats
  const pendingOrdersCount = useMemo(() => 
    orders.filter(o => o.status === 'pending').length, [orders]
  );
  const pendingBookingsCount = useMemo(() => 
    bookings.filter(b => b.status === 'pending').length, [bookings]
  );

  // Render login screen
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl mb-4">
              <Lock className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">BlueTech Admin</h1>
            <p className="text-slate-400">Secure Administration Panel</p>
          </div>

          <form onSubmit={handleLogin} className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl">
            {loginError && (
              <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                {loginError}
              </div>
            )}
            
            <div className="mb-4">
              <label className="block text-sm font-semibold text-slate-200 mb-2">Username</label>
              <input
                type="text"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter username"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-slate-200 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all shadow-lg"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Render main app
  return (
    <div className="h-screen flex bg-slate-100 overflow-hidden">
      
      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:relative z-40 w-64 h-full bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-r border-slate-700 transition-transform duration-300 flex flex-col`}>
        
        {/* Logo */}
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-xl font-bold text-white">BlueTech Admin</h1>
          <p className="text-xs text-slate-400 mt-1">v2.0 Optimized</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <button
            onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all mb-1 ${
              activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <LayoutDashboard className="h-4.5 w-4.5" />
            Dashboard
          </button>

          <button
            onClick={() => { setActiveTab('orders'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all mb-1 ${
              activeTab === 'orders' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <ShoppingBag className="h-4.5 w-4.5" />
              Orders
            </div>
            {pendingOrdersCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-extrabold ${activeTab === 'orders' ? 'bg-white text-blue-600' : 'bg-blue-500 text-white'}`}>
                {pendingOrdersCount}
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveTab('products'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all mb-1 ${
              activeTab === 'products' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Package className="h-4.5 w-4.5" />
            Products
          </button>

          <button
            onClick={() => { setActiveTab('repairs'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all mb-1 ${
              activeTab === 'repairs' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <Wrench className="h-4.5 w-4.5" />
              Repairs
            </div>
            {pendingBookingsCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-extrabold ${activeTab === 'repairs' ? 'bg-white text-blue-600' : 'bg-blue-500 text-white'}`}>
                {pendingBookingsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveTab('services'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all mb-1 ${
              activeTab === 'services' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Wrench className="h-4.5 w-4.5" />
            Services
          </button>

          <button
            onClick={() => { setActiveTab('zones'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all mb-1 ${
              activeTab === 'zones' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <MapPin className="h-4.5 w-4.5" />
            Delivery Zones
          </button>

          <button
            onClick={() => { setActiveTab('users'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all mb-1 ${
              activeTab === 'users' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Users className="h-4.5 w-4.5" />
            Users
          </button>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700">
          <p className="text-xs text-slate-500 text-center">Secured & Optimized</p>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="md:hidden p-2 hover:bg-slate-100 rounded-lg"
            >
              {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <h2 className="text-xl font-bold text-slate-900 capitalize">{activeTab}</h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Polling Indicator */}
            <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] text-slate-600 font-semibold">Auto-polling</span>
            </div>

            {/* Manual Refresh */}
            <button
              onClick={() => fetchAllData(true)}
              className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 hover:from-blue-100 hover:to-indigo-100 text-blue-600 p-2 rounded-xl transition-all group"
              title="Refresh data"
            >
              <RefreshCw className="h-4 w-4 group-hover:rotate-180 transition-transform duration-500" />
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 p-2 rounded-xl transition-all"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto">
          {isLoading ? (
            <LoadingSpinner />
          ) : (
            <Suspense fallback={<LoadingSpinner />}>
              {activeTab === 'dashboard' && (
                <DashboardView
                  orders={orders}
                  bookings={bookings}
                  products={products}
                  zones={zones}
                  services={services}
                  onShowToast={showToast}
                />
              )}
              {activeTab === 'orders' && (
                <OrdersView
                  orders={orders}
                  onOrdersUpdated={() => fetchAllData(true)}
                  onShowToast={showToast}
                />
              )}
              {activeTab === 'repairs' && (
                <BookingsView
                  bookings={bookings}
                  services={services}
                  onBookingsUpdated={() => fetchAllData(true)}
                  onShowToast={showToast}
                />
              )}
              {activeTab === 'products' && (
                <ProductManagementView
                  products={products}
                  onProductsUpdated={() => fetchAllData(true)}
                  onShowToast={showToast}
                />
              )}
              {activeTab === 'zones' && (
                <DeliveryZonesView
                  zones={zones}
                  onZonesUpdated={() => fetchAllData(true)}
                  onShowToast={showToast}
                />
              )}
              {activeTab === 'services' && (
                <ServiceManagementView
                  services={services}
                  onServicesUpdated={() => fetchAllData(true)}
                  onShowToast={showToast}
                />
              )}
              {activeTab === 'users' && (
                <UsersView users={users} onShowToast={showToast} onUsersUpdated={() => fetchAllData(true)} />
              )}
            </Suspense>
          )}
        </main>
      </div>

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-xl shadow-lg backdrop-blur-xl border text-sm font-semibold animate-slide-up ${
              toast.type === 'success' ? 'bg-green-500/90 border-green-600 text-white' :
              toast.type === 'error' ? 'bg-red-500/90 border-red-600 text-white' :
              'bg-blue-500/90 border-blue-600 text-white'
            }`}
          >
            {toast.msg}
          </div>
        ))}
      </div>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
