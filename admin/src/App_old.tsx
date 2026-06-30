import React, { useState, useEffect, useCallback } from 'react';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Wrench, 
  Package, 
  MapPin, 
  Sliders, 
  LogOut, 
  Database, 
  AlertCircle, 
  CheckCircle2, 
  DollarSign, 
  Menu, 
  X, 
  Cpu, 
  Sparkles,
  RefreshCw,
  Bell,
  Users
} from 'lucide-react';

import AuthGate from './components/AuthGate';
import ConfigDrawer from './components/ConfigDrawer';
import DashboardView from './components/DashboardView';
import OrdersView from './components/OrdersView';
import BookingsView from './components/BookingsView';
import ProductManagementView from './components/ProductManagementView';
import DeliveryZonesView from './components/DeliveryZonesView';
import ServiceManagementView from './components/ServiceManagementView';
import UsersView from './components/UsersView';

import { Order, Booking, Product, DeliveryZone, RepairService, User } from './types';
import { databaseService, getActiveMode, isSupabaseConnected } from './lib/supabase';
import { formatKES } from './lib/utils';

// custom toast notification interface
interface ToastMessage {
  id: string;
  msg: string;
  type: 'success' | 'error' | 'info';
}

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);

  // Core Data State
  const [orders, setOrders] = useState<Order[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [services, setServices] = useState<RepairService[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  // Track counts for new items detection
  const [lastOrderCount, setLastOrderCount] = useState<number>(0);
  const [lastBookingCount, setLastBookingCount] = useState<number>(0);
  const [lastPollTime, setLastPollTime] = useState<Date>(new Date());
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dbMode, setDbMode] = useState<'supabase' | 'local'>('local');

  // Floating Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Show Toast Helper
  const showToast = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, msg, type }]);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  // Sync / Fetch Data
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

      // Detect new orders
      if (silent && lastOrderCount > 0 && allOrders.length > lastOrderCount) {
        const newOrdersCount = allOrders.length - lastOrderCount;
        showToast(`🛒 ${newOrdersCount} new order${newOrdersCount > 1 ? 's' : ''} received!`, 'info');
      }

      // Detect new bookings
      if (silent && lastBookingCount > 0 && allBookings.length > lastBookingCount) {
        const newBookingsCount = allBookings.length - lastBookingCount;
        showToast(`🔧 ${newBookingsCount} new repair booking${newBookingsCount > 1 ? 's' : ''} received!`, 'info');
      }

      setProducts(allProducts);
      setOrders(allOrders);
      setBookings(allBookings);
      setZones(allZones);
      setServices(allServices);
      setUsers(allUsers);
      setDbMode(getActiveMode());
      
      // Update counts
      setLastOrderCount(allOrders.length);
      setLastBookingCount(allBookings.length);
      
      // Update last poll time
      if (silent) {
        setLastPollTime(new Date());
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      showToast('Connection issue: Failed to fetch active collections.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast, lastOrderCount, lastBookingCount]);

  // Initial load
  useEffect(() => {
    fetchAllData();
    setDbMode(getActiveMode());

    // Listen to storage events (e.g. database mode changes from ConfigDrawer)
    const handleStorageChange = () => {
      setDbMode(getActiveMode());
      fetchAllData(true);
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [fetchAllData]);

  // Set up polling for new orders and bookings (every 2 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAllData(true); // Silent fetch to check for new items
    }, 120000); // Poll every 2 minutes (120 seconds)
    return () => clearInterval(interval);
  }, [fetchAllData]);

  // Logout handler
  const handleLogout = () => {
    sessionStorage.removeItem('bt_admin_token');
    sessionStorage.removeItem('bt_admin_data');
    window.location.reload();
  };

  // Compute stats badge for header
  const pendingOrdersCount = orders.filter(o => o.status === 'pending').length;
  const pendingBookingsCount = bookings.filter(b => b.status === 'pending').length;
  
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  
  const todayRevenue = orders
    .filter(o => o.created_at && new Date(o.created_at) >= new Date(todayStart) && o.payment_status === 'paid' && o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.total_amount, 0) +
    bookings
    .filter(b => b.created_at && new Date(b.created_at) >= new Date(todayStart) && b.status === 'completed')
    .reduce((sum, b) => sum + b.final_cost, 0);

  // Render view router
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardView 
            orders={orders} 
            bookings={bookings} 
            onNavigate={(tab) => setActiveTab(tab)}
            onViewOrder={(order) => { setActiveTab('orders'); /* trigger selected order if possible, orders view handles double opens */ }}
            onViewBooking={(booking) => { setActiveTab('repairs'); }}
          />
        );
      case 'orders':
        return (
          <OrdersView 
            orders={orders} 
            onOrdersUpdated={() => fetchAllData(true)} 
            onShowToast={showToast} 
          />
        );
      case 'repairs':
        return (
          <BookingsView 
            bookings={bookings} 
            onBookingsUpdated={() => fetchAllData(true)} 
            onShowToast={showToast} 
          />
        );
      case 'products':
        return (
          <ProductManagementView 
            products={products} 
            onProductsUpdated={() => fetchAllData(true)} 
            onShowToast={showToast} 
          />
        );
      case 'zones':
        return (
          <DeliveryZonesView 
            zones={zones} 
            onZonesUpdated={() => fetchAllData(true)} 
            onShowToast={showToast} 
          />
        );
      case 'services':
        return (
          <ServiceManagementView 
            services={services} 
            onServicesUpdated={() => fetchAllData(true)} 
            onShowToast={showToast} 
          />
        );
      case 'users':
        return (
          <UsersView 
            users={users}
          />
        );
      default:
        return <div className="p-8 text-slate-400">View coming soon</div>;
    }
  };

  return (
    <AuthGate>
      <div className="min-h-screen bg-[#F9FAFB] text-slate-900 flex flex-col font-sans">
        
        {/* Sticky Top Header Nav Bar */}
        <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-3 shadow-sm backdrop-blur-md flex items-center justify-between">
          
          {/* Logo & Mobile Menu Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 md:hidden cursor-pointer"
              id="mobile-sidebar-toggle"
            >
              {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
                <Cpu className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="font-bold text-sm tracking-tight text-slate-900 block">Blue Technology</span>
                <span className="text-[10px] text-slate-500 font-semibold block uppercase tracking-wider">Kenya HQ Admin</span>
              </div>
            </div>
          </div>

          {/* Center Quick Stats Badges */}
          <div className="hidden lg:flex items-center gap-3.5">
            
            {/* Pending Orders Counter */}
            <div className="bg-red-50 px-3 py-1 rounded-full border border-red-100 flex items-center gap-1.5">
              <ShoppingBag className="h-3.5 w-3.5 text-red-500" />
              <span className="text-[11px] text-red-700 font-bold">Pending Orders:</span>
              <span className="bg-red-100 text-red-800 font-extrabold px-1.5 py-0.2 rounded text-[10px] min-w-5 text-center">
                {pendingOrdersCount}
              </span>
            </div>

            {/* Pending Bookings Counter */}
            <div className="bg-blue-50 px-3 py-1 rounded-full border border-blue-100 flex items-center gap-1.5">
              <Wrench className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-[11px] text-blue-700 font-bold">Pending Repairs:</span>
              <span className="bg-blue-100 text-blue-800 font-extrabold px-1.5 py-0.2 rounded text-[10px] min-w-5 text-center">
                {pendingBookingsCount}
              </span>
            </div>

            {/* Today Revenue KES counter */}
            <div className="bg-emerald-50 px-3.5 py-1 rounded-full border border-emerald-100 flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
              <span className="text-[11px] text-emerald-700 font-bold">Today's Revenue:</span>
              <span className="text-emerald-800 font-extrabold text-[11px] font-mono">
                {formatKES(todayRevenue)}
              </span>
            </div>

          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-3">

            {/* Polling Status Indicator */}
            <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] text-slate-600 font-semibold">
                Auto-polling every 2min
              </span>
            </div>

            {/* Manual Refresh Button */}
            <button
              onClick={() => fetchAllData(true)}
              className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 hover:from-blue-100 hover:to-indigo-100 text-blue-600 p-2 rounded-xl transition-all cursor-pointer group"
              title="Refresh data (auto-polls every 2 minutes)"
            >
              <RefreshCw className="h-4 w-4 group-hover:rotate-180 transition-transform duration-500" />
            </button>

            {/* DB Connection Indicator Badge */}
            <button
              onClick={() => setIsConfigOpen(true)}
              className={`p-2 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer text-xs font-semibold ${
                dbMode === 'supabase' && isSupabaseConnected
                  ? 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'
              }`}
              id="db-config-badge-btn"
            >
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">{dbMode === 'supabase' ? 'Supabase Live' : 'Local Sandbox'}</span>
            </button>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 p-2 rounded-xl transition-all cursor-pointer"
              id="admin-logout-btn"
              title="Logout Session"
            >
              <LogOut className="h-4 w-4" />
            </button>

          </div>

        </header>

        {/* Workspace Body container */}
        <div className="flex-1 flex relative">
          
          {/* Sidebar Left Navigation Panel */}
          <aside className={`fixed inset-y-0 left-0 z-30 w-[240px] bg-[#1E293B] border-r border-slate-800 flex flex-col justify-between transform transition-transform duration-300 md:translate-x-0 md:static ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}>
            
            {/* Top portion Menu lists */}
            <div className="flex-1 py-6 px-4 space-y-6 overflow-y-auto">
              
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-3 block mb-3">Core Modules</span>
                <nav className="space-y-1.5">
                  
                  {/* Dashboard */}
                  <button
                    onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      activeTab === 'dashboard'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <LayoutDashboard className="h-4.5 w-4.5" />
                    Dashboard Overview
                  </button>

                  {/* Orders */}
                  <button
                    onClick={() => { setActiveTab('orders'); setIsSidebarOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      activeTab === 'orders'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <ShoppingBag className="h-4.5 w-4.5" />
                      Orders Management
                    </div>
                    {pendingOrdersCount > 0 && (
                      <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-extrabold ${activeTab === 'orders' ? 'bg-white text-blue-600' : 'bg-red-500 text-white'}`}>
                        {pendingOrdersCount}
                      </span>
                    )}
                  </button>

                  {/* Repairs / Bookings */}
                  <button
                    onClick={() => { setActiveTab('repairs'); setIsSidebarOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      activeTab === 'repairs'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Wrench className="h-4.5 w-4.5" />
                      Repairs Management
                    </div>
                    {pendingBookingsCount > 0 && (
                      <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-extrabold ${activeTab === 'repairs' ? 'bg-white text-blue-600' : 'bg-blue-500 text-white'}`}>
                        {pendingBookingsCount}
                      </span>
                    )}
                  </button>

                  {/* Users */}
                  <button
                    onClick={() => { setActiveTab('users'); setIsSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      activeTab === 'users'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Users className="h-4.5 w-4.5" />
                    User Management
                  </button>

                </nav>
              </div>

              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-3 block mb-3">Product catalogs</span>
                <nav className="space-y-1.5">
                  
                  {/* Products */}
                  <button
                    onClick={() => { setActiveTab('products'); setIsSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      activeTab === 'products'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Package className="h-4.5 w-4.5" />
                    Products Catalog
                  </button>

                  {/* Delivery Zones */}
                  <button
                    onClick={() => { setActiveTab('zones'); setIsSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      activeTab === 'zones'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <MapPin className="h-4.5 w-4.5" />
                    Delivery Zones Fee
                  </button>

                  {/* Repair Services Catalog */}
                  <button
                    onClick={() => { setActiveTab('services'); setIsSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      activeTab === 'services'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Wrench className="h-4.5 w-4.5 text-slate-400" />
                    Service catalog rates
                  </button>

                </nav>
              </div>

            </div>

            {/* Bottom portion brand watermark */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/25 text-center space-y-1">
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Blue Technology Ltd</span>
              <span className="text-[9px] text-slate-500 block">Nairobi, Kenya • Est. 2026</span>
            </div>

          </aside>

          {/* Backdrop closer on Mobile */}
          {isSidebarOpen && (
            <div 
              className="fixed inset-0 z-20 bg-black/60 md:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          {/* Main workspace scrollable area */}
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6">
            
            {/* Standard loading spinner screen overlay */}
            {isLoading ? (
              <div className="h-96 flex flex-col items-center justify-center text-slate-600 gap-3">
                <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
                <span className="text-sm font-semibold font-mono animate-pulse">Syncing catalog databases...</span>
              </div>
            ) : (
              renderTabContent()
            )}

          </main>

        </div>

        {/* Global Floating Toast Alert Manager */}
        <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 w-full max-w-sm pointer-events-none">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`p-4 rounded-xl shadow-xl border text-xs flex items-start gap-3 pointer-events-auto animate-slide-in ${
                t.type === 'error'
                  ? 'bg-red-50 border-red-200 text-red-900'
                  : t.type === 'info'
                    ? 'bg-blue-50 border-blue-200 text-blue-900'
                    : 'bg-white border-slate-200 text-slate-900'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {t.type === 'error' ? (
                  <AlertCircle className="h-4.5 w-4.5 text-red-500" />
                ) : t.type === 'info' ? (
                  <Wrench className="h-4.5 w-4.5 text-blue-500 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
                )}
              </div>
              <div className="flex-1 font-medium">{t.msg}</div>
            </div>
          ))}
        </div>

        {/* Database configurations drawer settings modal */}
        <ConfigDrawer 
          isOpen={isConfigOpen} 
          onClose={() => setIsConfigOpen(false)} 
        />

      </div>
    </AuthGate>
  );
}
