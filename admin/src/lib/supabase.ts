import { createClient } from '@supabase/supabase-js';
import { Product, Order, OrderItem, Booking, DeliveryZone, RepairService, DashboardStats } from '../types';

// Read config from env ONLY
const getSupabaseConfig = () => {
  const url = (import.meta as any).env.VITE_SUPABASE_URL || '';
  const key = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';
  
  return { url, key };
};

const config = getSupabaseConfig();

export let supabase: any = null;
export let isSupabaseConnected = false;

if (config.url && config.key) {
  try {
    supabase = createClient(config.url, config.key);
    isSupabaseConnected = true;
  } catch (e) {
    console.error('Failed to initialize Supabase client:', e);
  }
}

// Always use Supabase - no local mode
export const getActiveMode = (): 'supabase' => 'supabase';

// Unified Data Manager Methods
export const databaseService = {
  // --- PRODUCTS ---
  async getProducts(): Promise<Product[]> {
    if (supabase) {
      const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (!error && data) return data;
      if (error) console.error('Supabase fetch failed:', error);
    }
    return [];
  },

  async saveProduct(product: Partial<Product>): Promise<Product> {
    const isNew = !product.id;
    const finalProduct = {
      ...product,
      id: product.id || `prod-${Math.floor(1000 + Math.random() * 9000)}`,
      created_at: product.created_at || new Date().toISOString()
    } as Product;

    if (supabase) {
      const { data, error } = isNew 
        ? await supabase.from('products').insert(finalProduct).select().single()
        : await supabase.from('products').update(product).eq('id', product.id).select().single();
      
      if (!error && data) return data;
      if (error) console.error('Supabase save failed:', error);
    }
    return finalProduct;
  },

  async deleteProduct(id: string): Promise<boolean> {
    if (supabase) {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (!error) return true;
      if (error) console.error('Supabase delete failed:', error);
    }
    return false;
  },

  // --- ORDERS ---
  async getOrders(): Promise<Order[]> {
    if (supabase) {
      const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (!error && data) return data;
      if (error) console.error('Supabase fetch failed:', error);
    }
    return [];
  },

  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    if (supabase) {
      const { data, error } = await supabase.from('order_items').select('*').eq('order_id', orderId);
      if (!error && data) return data;
      if (error) console.error('Supabase fetch failed:', error);
    }
    return [];
  },

  async updateOrderStatus(orderId: string, status: Order['status']): Promise<boolean> {
    if (supabase) {
      const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
      if (!error) return true;
      if (error) console.error('Supabase update failed:', error);
    }
    return false;
  },

  async saveOrderDetails(orderId: string, data: { status: Order['status']; payment_status: Order['payment_status']; notes?: string }): Promise<boolean> {
    if (supabase) {
      const { error } = await supabase.from('orders').update(data).eq('id', orderId);
      if (!error) return true;
      if (error) console.error('Supabase update failed:', error);
    }
    return false;
  },

  // --- BOOKINGS ---
  async getBookings(): Promise<Booking[]> {
    if (supabase) {
      const { data, error } = await supabase.from('bookings').select('*').order('created_at', { ascending: false });
      if (!error && data) return data;
      if (error) console.error('Supabase fetch failed:', error);
    }
    return [];
  },

  async saveBooking(booking: Partial<Booking>): Promise<Booking> {
    const isNew = !booking.id;
    const finalBooking = {
      ...booking,
      id: booking.id || `bk-${Math.floor(1000 + Math.random() * 9000)}-2026`,
      created_at: booking.created_at || new Date().toISOString()
    } as Booking;

    if (supabase) {
      const { data, error } = isNew 
        ? await supabase.from('bookings').insert(finalBooking).select().single()
        : await supabase.from('bookings').update(booking).eq('id', booking.id).select().single();
      
      if (!error && data) return data;
      if (error) console.error('Supabase save failed:', error);
    }
    return finalBooking;
  },

  async updateBookingStatus(bookingId: string, status: Booking['status']): Promise<boolean> {
    if (supabase) {
      const { error } = await supabase.from('bookings').update({ status }).eq('id', bookingId);
      if (!error) return true;
      if (error) console.error('Supabase update failed:', error);
    }
    return false;
  },

  // --- DELIVERY ZONES ---
  async getDeliveryZones(): Promise<DeliveryZone[]> {
    if (supabase) {
      const { data, error } = await supabase.from('delivery_zones').select('*').order('zone_name', { ascending: true });
      if (!error && data) return data;
      if (error) console.error('Supabase fetch failed:', error);
    }
    return [];
  },

  async saveDeliveryZone(zone: Partial<DeliveryZone>): Promise<DeliveryZone> {
    const isNew = !zone.id;
    const finalZone = {
      ...zone,
      id: zone.id || `zone-${Math.floor(1000 + Math.random() * 9000)}`,
      created_at: zone.created_at || new Date().toISOString()
    } as DeliveryZone;

    if (supabase) {
      const { data, error } = isNew 
        ? await supabase.from('delivery_zones').insert(finalZone).select().single()
        : await supabase.from('delivery_zones').update(zone).eq('id', zone.id).select().single();
      
      if (!error && data) return data;
      if (error) console.error('Supabase save failed:', error);
    }
    return finalZone;
  },

  async deleteDeliveryZone(id: string): Promise<boolean> {
    if (supabase) {
      const { error } = await supabase.from('delivery_zones').delete().eq('id', id);
      if (!error) return true;
      if (error) console.error('Supabase delete failed:', error);
    }
    return false;
  },

  // --- REPAIR SERVICES ---
  async getRepairServices(): Promise<RepairService[]> {
    if (supabase) {
      const { data, error } = await supabase.from('repair_services').select('*').order('service_name', { ascending: true });
      if (!error && data) return data;
      if (error) console.error('Supabase fetch failed:', error);
    }
    return [];
  },

  async saveRepairService(service: Partial<RepairService>): Promise<RepairService> {
    const isNew = !service.id;
    const finalService = {
      ...service,
      id: service.id || `srv-${Math.floor(1000 + Math.random() * 9000)}`,
      created_at: service.created_at || new Date().toISOString()
    } as RepairService;

    if (supabase) {
      const { data, error } = isNew 
        ? await supabase.from('repair_services').insert(finalService).select().single()
        : await supabase.from('repair_services').update(service).eq('id', service.id).select().single();
      
      if (!error && data) return data;
      if (error) console.error('Supabase save failed:', error);
    }
    return finalService;
  },

  async deleteRepairService(id: string): Promise<boolean> {
    if (supabase) {
      const { error } = await supabase.from('repair_services').delete().eq('id', id);
      if (!error) return true;
      if (error) console.error('Supabase delete failed:', error);
    }
    return false;
  },

  // --- USERS ---
  async getUsers(): Promise<any[]> {
    if (supabase) {
      const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
      if (!error && data) return data;
      if (error) console.error('Supabase fetch failed:', error);
    }
    return [];
  },

  async toggleUserActive(userId: string, is_active: boolean): Promise<boolean> {
    if (supabase) {
      const { error } = await supabase.from('users').update({ is_active }).eq('id', userId);
      if (!error) return true;
      if (error) console.error('Supabase update failed:', error);
    }
    return false;
  },

  // --- DASHBOARD STATS ---
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const [orders, bookings, products, services, zones, users] = await Promise.all([
        this.getOrders(),
        this.getBookings(),
        this.getProducts(),
        this.getRepairServices(),
        this.getDeliveryZones(),
        this.getUsers()
      ]);

      const todayOrders = orders.filter(o => {
        const orderDate = new Date(o.created_at).toDateString();
        return orderDate === new Date().toDateString();
      });

      const todayBookings = bookings.filter(b => {
        const bookingDate = new Date(b.created_at).toDateString();
        return bookingDate === new Date().toDateString();
      });

      const activeQueue = bookings.filter(b => ['pending', 'in_diagnosis', 'in_repair'].includes(b.status)).length;

      const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

      return {
        totalOrders: orders.length,
        totalBookings: bookings.length,
        totalProducts: products.length,
        totalServices: services.length,
        totalZones: zones.length,
        totalUsers: users.length,
        ordersToday: todayOrders.length,
        bookingsToday: todayBookings.length,
        activeQueue,
        revenueToday: todayRevenue,
        recentOrders: orders.slice(0, 5),
        recentBookings: bookings.slice(0, 5)
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return {
        totalOrders: 0,
        totalBookings: 0,
        totalProducts: 0,
        totalServices: 0,
        totalZones: 0,
        totalUsers: 0,
        ordersToday: 0,
        bookingsToday: 0,
        activeQueue: 0,
        revenueToday: 0,
        recentOrders: [],
        recentBookings: []
      };
    }
  }
};
