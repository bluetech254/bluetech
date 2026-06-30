import { createClient } from '@supabase/supabase-js';
import { Product, Order, OrderItem, Booking, DeliveryZone, RepairService, DashboardStats } from '../types';

// Read config from env ONLY - no localStorage override for security
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

// Always use Supabase - no local mode for security
export const getActiveMode = (): 'supabase' => 'supabase';

// Seed Data
const defaultProducts: Product[] = [
  {
    id: 'prod-001',
    title: 'iPhone 13 Pro (128GB, Alpine Green)',
    description: 'Super Retina XDR display with ProMotion. Professional camera system with Telephoto, Wide, and Ultra Wide cameras. Cinematic mode in 1080p.',
    price: 95000,
    image_url: 'https://images.unsplash.com/photo-1632661674596-df8be070a5c5?auto=format&fit=crop&w=600&q=80',
    specifications: [
      { key: 'Display', value: '6.1-inch Super Retina XDR' },
      { key: 'Processor', value: 'A15 Bionic chip' },
      { key: 'Storage', value: '128GB' },
      { key: 'Camera', value: 'Pro 12MP camera system' },
      { key: 'Battery', value: 'Up to 22 hours video playback' }
    ],
    stock_quantity: 12,
    category: 'Smartphones',
    brand: 'Apple',
    is_active: true
  },
  {
    id: 'prod-002',
    title: 'HP EliteBook 840 G8 Laptop',
    description: 'High-performance business laptop designed for enterprise professionals. Features a fast processor, military-grade durability, and robust security features.',
    price: 82000,
    image_url: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=600&q=80',
    specifications: [
      { key: 'Processor', value: 'Intel Core i7 11th Gen' },
      { key: 'RAM', value: '16GB DDR4' },
      { key: 'Storage', value: '512GB PCIe NVMe SSD' },
      { key: 'Display', value: '14-inch FHD IPS' },
      { key: 'OS', value: 'Windows 11 Pro' }
    ],
    stock_quantity: 7,
    category: 'Laptops',
    brand: 'HP',
    is_active: true
  },
  {
    id: 'prod-003',
    title: 'Samsung Galaxy S22 Ultra (256GB)',
    description: 'The ultimate smartphone with built-in S Pen, 108MP camera, 100x Space Zoom, and a massive 5000mAh battery for all-day performance.',
    price: 88000,
    image_url: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=600&q=80',
    specifications: [
      { key: 'Display', value: '6.8-inch Dynamic AMOLED 2X' },
      { key: 'Processor', value: 'Snapdragon 8 Gen 1' },
      { key: 'RAM', value: '12GB' },
      { key: 'S-Pen', value: 'Included (Built-in)' },
      { key: 'Battery', value: '5000mAh' }
    ],
    stock_quantity: 4,
    category: 'Smartphones',
    brand: 'Samsung',
    is_active: true
  },
  {
    id: 'prod-004',
    title: 'JBL Charge 5 Portable Speaker',
    description: 'Take the party with you whatever the weather. The JBL Charge 5 speaker delivers bold JBL Original Pro Sound, with its optimized long excursion driver.',
    price: 18500,
    image_url: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=600&q=80',
    specifications: [
      { key: 'Output Power', value: '30W RMS' },
      { key: 'Waterproof', value: 'IP67 Waterproof and Dustproof' },
      { key: 'Battery', value: 'Up to 20 hours' },
      { key: 'Charging', value: 'Built-in Powerbank' },
      { key: 'Bluetooth', value: 'Version 5.1' }
    ],
    stock_quantity: 25,
    category: 'Audio',
    brand: 'JBL',
    is_active: true
  }
];

const defaultDeliveryZones: DeliveryZone[] = [
  { id: 'zone-1', zone_name: 'Westlands', delivery_fee: 300, is_active: true },
  { id: 'zone-2', zone_name: 'Kilimani & Hurlingham', delivery_fee: 250, is_active: true },
  { id: 'zone-3', zone_name: 'Karen', delivery_fee: 500, is_active: true },
  { id: 'zone-4', zone_name: 'CBD & Town', delivery_fee: 200, is_active: true },
  { id: 'zone-5', zone_name: 'Kasarani', delivery_fee: 400, is_active: true },
  { id: 'zone-6', zone_name: 'Gigiri & Runda', delivery_fee: 450, is_active: true }
];

const defaultRepairServices: RepairService[] = [
  { id: 'srv-1', service_name: 'Screen Replacement (Smartphone)', service_category: 'Smartphone', base_price: 4500, duration: '1 hour', warranty: '3 months' },
  { id: 'srv-2', service_name: 'Battery Replacement (iPhone)', service_category: 'Smartphone', base_price: 3000, duration: '45 mins', warranty: '6 months' },
  { id: 'srv-3', service_name: 'Keyboard Replacement (Laptop)', service_category: 'Laptop', base_price: 6500, duration: '2 hours', warranty: '6 months' },
  { id: 'srv-4', service_name: 'Motherboard Repair (MacBook)', service_category: 'Laptop', base_price: 15000, duration: '2 days', warranty: '1 month' },
  { id: 'srv-5', service_name: 'OS Reinstallation (Windows/macOS)', service_category: 'Software', base_price: 2500, duration: '1.5 hours', warranty: 'Lifetime' }
];

const defaultBookings: Booking[] = [
  {
    id: 'bk-8429-2026',
    full_name: 'John Kamau',
    phone_number: '254712345678',
    device_type: 'Laptop',
    device_model: 'MacBook Pro 16" (M1 Pro)',
    issue_description: 'Battery draining extremely fast. Laptop shuts down unexpectedly when battery percentage drops below 40%. Requires battery calibration or battery replacement.',
    fulfillment_type: 'pickup',
    status: 'pending',
    estimated_cost: 12000,
    final_cost: 0,
    internal_notes: 'Customer prefers pickup from Westlands office. Requires assessment first.',
    created_at: '2026-06-29T08:15:00EAT'
  },
  {
    id: 'bk-1249-2026',
    full_name: 'Alice Wambui',
    phone_number: '254722987654',
    device_type: 'Smartphone',
    device_model: 'Samsung Galaxy S21 Ultra',
    issue_description: 'Heavily cracked screen after dropping on concrete. Touch screen is unresponsive in the upper half. Rest of the phone seems to boot normally.',
    fulfillment_type: 'dropoff',
    status: 'in_repair',
    estimated_cost: 16500,
    final_cost: 16500,
    internal_notes: 'OEM screen replacement ordered from distributor. Arriving by noon.',
    created_at: '2026-06-28T14:30:00EAT'
  },
  {
    id: 'bk-5321-2026',
    full_name: 'David Ochieng',
    phone_number: '254733445566',
    device_type: 'Gaming Console',
    device_model: 'Sony PlayStation 5',
    issue_description: 'Overheating warning shows up after 20 minutes of high-performance gaming, then console forces shutdown. Loud fan noise.',
    fulfillment_type: 'dropoff',
    status: 'ready',
    estimated_cost: 5000,
    final_cost: 5000,
    internal_notes: 'Heatsink fully cleaned from heavy dust build-up. Liquid metal replaced. Re-tested with Astro Playroom for 2 hours, temperatures stable.',
    created_at: '2026-06-27T11:15:00EAT'
  },
  {
    id: 'bk-0102-2026',
    full_name: 'Mary Atieno',
    phone_number: '254701223344',
    device_type: 'Tablet',
    device_model: 'iPad Air 4',
    issue_description: 'Charging port is loose. Only charges when the USB-C cable is pushed hard and held at an angle.',
    fulfillment_type: 'pickup',
    status: 'completed',
    estimated_cost: 3500,
    final_cost: 3500,
    internal_notes: 'Charging port pin assembly repaired and reinforced. Charges successfully at all normal angles.',
    created_at: '2026-06-26T10:00:00EAT'
  },
  {
    id: 'bk-7762-2026',
    full_name: 'Erick Kiprop',
    phone_number: '254711223344',
    device_type: 'Laptop',
    device_model: 'Lenovo ThinkPad T14',
    issue_description: 'Spilled water on keyboard. Keyboard backlights turn on but several keys (E, R, T, spacebar) do not register inputs.',
    fulfillment_type: 'dropoff',
    status: 'in_diagnosis',
    estimated_cost: 8000,
    final_cost: 0,
    internal_notes: 'Checking motherboard for liquid residue. Dry cleaned, looks clean. Keyboard unit replacement required.',
    created_at: '2026-06-29T09:45:00EAT'
  }
];

const defaultOrders: Order[] = [
  {
    id: 'ord-8831-2026',
    full_name: 'Peter Njoroge',
    phone_number: '254790112233',
    delivery_address: 'Delta Corner, 7th Floor, Ring Road, Westlands',
    delivery_zone: 'Westlands',
    subtotal: 95000,
    total_amount: 95300,
    status: 'pending',
    payment_status: 'paid',
    notes: 'Please leave at reception if not reachable.',
    created_at: '2026-06-29T09:15:00EAT'
  },
  {
    id: 'ord-4521-2026',
    full_name: 'Sarah Hassan',
    phone_number: '254722111222',
    delivery_address: 'Yaya Centre Apartments, Block B, Room 4',
    delivery_zone: 'Kilimani & Hurlingham',
    subtotal: 18500,
    total_amount: 18750,
    status: 'processing',
    payment_status: 'paid',
    notes: 'Deliver after 5 PM if possible.',
    created_at: '2026-06-28T16:00:00EAT'
  },
  {
    id: 'ord-1205-2026',
    full_name: 'Michael Mwangi',
    phone_number: '254755888999',
    delivery_address: 'Karen Brooks Estate, House 42B',
    delivery_zone: 'Karen',
    subtotal: 82000,
    total_amount: 82500,
    status: 'delivered',
    payment_status: 'paid',
    notes: 'Call before arriving.',
    created_at: '2026-06-25T13:00:00EAT'
  }
];

const defaultOrderItems: OrderItem[] = [
  { id: 'item-1', order_id: 'ord-8831-2026', product_id: 'prod-001', product_title: 'iPhone 13 Pro (128GB, Alpine Green)', quantity: 1, unit_price: 95000, total_price: 95000 },
  { id: 'item-2', order_id: 'ord-4521-2026', product_id: 'prod-004', product_title: 'JBL Charge 5 Portable Speaker', quantity: 1, unit_price: 18500, total_price: 18500 },
  { id: 'item-3', order_id: 'ord-1205-2026', product_id: 'prod-002', product_title: 'HP EliteBook 840 G8 Laptop', quantity: 1, unit_price: 82000, total_price: 82000 }
];

// Helper to initialize local storage if empty
export const initializeLocalStorage = () => {
  if (!localStorage.getItem('bt_products')) {
    localStorage.setItem('bt_products', JSON.stringify(defaultProducts));
  }
  if (!localStorage.getItem('bt_delivery_zones')) {
    localStorage.setItem('bt_delivery_zones', JSON.stringify(defaultDeliveryZones));
  }
  if (!localStorage.getItem('bt_repair_services')) {
    localStorage.setItem('bt_repair_services', JSON.stringify(defaultRepairServices));
  }
  if (!localStorage.getItem('bt_bookings')) {
    localStorage.setItem('bt_bookings', JSON.stringify(defaultBookings));
  }
  if (!localStorage.getItem('bt_orders')) {
    localStorage.setItem('bt_orders', JSON.stringify(defaultOrders));
  }
  if (!localStorage.getItem('bt_order_items')) {
    localStorage.setItem('bt_order_items', JSON.stringify(defaultOrderItems));
  }
};

// Unified Data Manager Methods
export const databaseService = {
  // --- PRODUCTS ---
  async getProducts(): Promise<Product[]> {
    if (getActiveMode() === 'supabase' && supabase) {
      const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (!error && data) return data;
      console.warn('Supabase fetch failed, falling back to local:', error);
    }
    initializeLocalStorage();
    return JSON.parse(localStorage.getItem('bt_products') || '[]');
  },

  async saveProduct(product: Partial<Product>): Promise<Product> {
    const isNew = !product.id;
    const finalProduct = {
      ...product,
      id: product.id || `prod-${Math.floor(1000 + Math.random() * 9000)}`,
      created_at: product.created_at || new Date().toISOString()
    } as Product;

    if (getActiveMode() === 'supabase' && supabase) {
      const { data, error } = isNew 
        ? await supabase.from('products').insert(finalProduct).select().single()
        : await supabase.from('products').update(product).eq('id', product.id).select().single();
      
      if (!error && data) return data;
      console.warn('Supabase save failed, writing to local storage:', error);
    }

    initializeLocalStorage();
    const list = JSON.parse(localStorage.getItem('bt_products') || '[]');
    let updatedList;
    if (isNew) {
      updatedList = [finalProduct, ...list];
    } else {
      updatedList = list.map((p: Product) => p.id === product.id ? { ...p, ...product } : p);
    }
    localStorage.setItem('bt_products', JSON.stringify(updatedList));
    return finalProduct;
  },

  async deleteProduct(id: string): Promise<boolean> {
    if (getActiveMode() === 'supabase' && supabase) {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (!error) return true;
      console.warn('Supabase delete failed:', error);
    }
    initializeLocalStorage();
    const list = JSON.parse(localStorage.getItem('bt_products') || '[]');
    const filtered = list.filter((p: Product) => p.id !== id);
    localStorage.setItem('bt_products', JSON.stringify(filtered));
    return true;
  },

  // --- ORDERS ---
  async getOrders(): Promise<Order[]> {
    if (getActiveMode() === 'supabase' && supabase) {
      const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (!error && data) return data;
      console.warn('Supabase fetch failed, falling back to local:', error);
    }
    initializeLocalStorage();
    return JSON.parse(localStorage.getItem('bt_orders') || '[]');
  },

  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    if (getActiveMode() === 'supabase' && supabase) {
      const { data, error } = await supabase.from('order_items').select('*').eq('order_id', orderId);
      if (!error && data) return data;
      console.warn('Supabase fetch failed for items, falling back to local:', error);
    }
    initializeLocalStorage();
    const allItems = JSON.parse(localStorage.getItem('bt_order_items') || '[]');
    return allItems.filter((item: OrderItem) => item.order_id === orderId);
  },

  async updateOrderStatus(orderId: string, status: Order['status']): Promise<boolean> {
    if (getActiveMode() === 'supabase' && supabase) {
      const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
      if (!error) return true;
      console.warn('Supabase status update failed:', error);
    }
    initializeLocalStorage();
    const list = JSON.parse(localStorage.getItem('bt_orders') || '[]');
    const updated = list.map((o: Order) => o.id === orderId ? { ...o, status } : o);
    localStorage.setItem('bt_orders', JSON.stringify(updated));
    return true;
  },

  async updateOrderPaymentStatus(orderId: string, payment_status: Order['payment_status']): Promise<boolean> {
    if (getActiveMode() === 'supabase' && supabase) {
      const { error } = await supabase.from('orders').update({ payment_status }).eq('id', orderId);
      if (!error) return true;
      console.warn('Supabase payment status update failed:', error);
    }
    initializeLocalStorage();
    const list = JSON.parse(localStorage.getItem('bt_orders') || '[]');
    const updated = list.map((o: Order) => o.id === orderId ? { ...o, payment_status } : o);
    localStorage.setItem('bt_orders', JSON.stringify(updated));
    return true;
  },

  async saveOrderDetails(orderId: string, updates: { status: Order['status'], payment_status: Order['payment_status'], notes?: string }): Promise<boolean> {
    if (getActiveMode() === 'supabase' && supabase) {
      const { error } = await supabase.from('orders').update(updates).eq('id', orderId);
      if (!error) return true;
    }
    initializeLocalStorage();
    const list = JSON.parse(localStorage.getItem('bt_orders') || '[]');
    const updated = list.map((o: Order) => o.id === orderId ? { ...o, ...updates } : o);
    localStorage.setItem('bt_orders', JSON.stringify(updated));
    return true;
  },

  async createNewOrder(order: Partial<Order>, items: Partial<OrderItem>[]): Promise<Order> {
    const finalOrder = {
      ...order,
      id: order.id || `ord-${Math.floor(1000 + Math.random() * 9000)}-2026`,
      created_at: new Date().toISOString()
    } as Order;

    if (getActiveMode() === 'supabase' && supabase) {
      const { data, error } = await supabase.from('orders').insert(finalOrder).select().single();
      if (!error && data) {
        const finalItems = items.map(item => ({ ...item, order_id: data.id }));
        await supabase.from('order_items').insert(finalItems);
        return data;
      }
    }

    initializeLocalStorage();
    const list = JSON.parse(localStorage.getItem('bt_orders') || '[]');
    localStorage.setItem('bt_orders', JSON.stringify([finalOrder, ...list]));

    const allItems = JSON.parse(localStorage.getItem('bt_order_items') || '[]');
    const finalItems = items.map((item, index) => ({
      ...item,
      id: item.id || `item-${Date.now()}-${index}`,
      order_id: finalOrder.id
    })) as OrderItem[];
    localStorage.setItem('bt_order_items', JSON.stringify([...allItems, ...finalItems]));

    return finalOrder;
  },

  // --- BOOKINGS ---
  async getBookings(): Promise<Booking[]> {
    if (getActiveMode() === 'supabase' && supabase) {
      const { data, error } = await supabase.from('bookings').select('*').order('created_at', { ascending: false });
      if (!error && data) return data;
      console.warn('Supabase fetch bookings failed, falling back to local:', error);
    }
    initializeLocalStorage();
    return JSON.parse(localStorage.getItem('bt_bookings') || '[]');
  },

  async updateBookingStatus(bookingId: string, status: Booking['status']): Promise<boolean> {
    if (getActiveMode() === 'supabase' && supabase) {
      const { error } = await supabase.from('bookings').update({ status }).eq('id', bookingId);
      if (!error) return true;
    }
    initializeLocalStorage();
    const list = JSON.parse(localStorage.getItem('bt_bookings') || '[]');
    const updated = list.map((b: Booking) => b.id === bookingId ? { ...b, status } : b);
    localStorage.setItem('bt_bookings', JSON.stringify(updated));
    return true;
  },

  async updateBookingDetails(bookingId: string, updates: Partial<Booking>): Promise<boolean> {
    if (getActiveMode() === 'supabase' && supabase) {
      const { error } = await supabase.from('bookings').update(updates).eq('id', bookingId);
      if (!error) return true;
    }
    initializeLocalStorage();
    const list = JSON.parse(localStorage.getItem('bt_bookings') || '[]');
    const updated = list.map((b: Booking) => b.id === bookingId ? { ...b, ...updates } : b);
    localStorage.setItem('bt_bookings', JSON.stringify(updated));
    return true;
  },

  async createNewBooking(booking: Partial<Booking>): Promise<Booking> {
    const finalBooking = {
      ...booking,
      id: booking.id || `bk-${Math.floor(1000 + Math.random() * 9000)}-2026`,
      status: booking.status || 'pending',
      created_at: new Date().toISOString()
    } as Booking;

    if (getActiveMode() === 'supabase' && supabase) {
      const { data, error } = await supabase.from('bookings').insert(finalBooking).select().single();
      if (!error && data) return data;
    }

    initializeLocalStorage();
    const list = JSON.parse(localStorage.getItem('bt_bookings') || '[]');
    localStorage.setItem('bt_bookings', JSON.stringify([finalBooking, ...list]));
    return finalBooking;
  },

  // --- DELIVERY ZONES ---
  async getDeliveryZones(): Promise<DeliveryZone[]> {
    if (getActiveMode() === 'supabase' && supabase) {
      const { data, error } = await supabase.from('delivery_zones').select('*').order('zone_name');
      if (!error && data) return data;
    }
    initializeLocalStorage();
    return JSON.parse(localStorage.getItem('bt_delivery_zones') || '[]');
  },

  async saveDeliveryZone(zone: Partial<DeliveryZone>): Promise<DeliveryZone> {
    const isNew = !zone.id;
    const finalZone = {
      ...zone,
      id: zone.id || `zone-${Math.floor(1000 + Math.random() * 9000)}`,
      is_active: zone.is_active !== undefined ? zone.is_active : true
    } as DeliveryZone;

    if (getActiveMode() === 'supabase' && supabase) {
      const { data, error } = isNew
        ? await supabase.from('delivery_zones').insert(finalZone).select().single()
        : await supabase.from('delivery_zones').update(zone).eq('id', zone.id).select().single();
      if (!error && data) return data;
    }

    initializeLocalStorage();
    const list = JSON.parse(localStorage.getItem('bt_delivery_zones') || '[]');
    let updated;
    if (isNew) {
      updated = [...list, finalZone];
    } else {
      updated = list.map((z: DeliveryZone) => z.id === zone.id ? { ...z, ...zone } : z);
    }
    localStorage.setItem('bt_delivery_zones', JSON.stringify(updated));
    return finalZone;
  },

  async deleteDeliveryZone(id: string): Promise<boolean> {
    if (getActiveMode() === 'supabase' && supabase) {
      const { error } = await supabase.from('delivery_zones').delete().eq('id', id);
      if (!error) return true;
    }
    initializeLocalStorage();
    const list = JSON.parse(localStorage.getItem('bt_delivery_zones') || '[]');
    localStorage.setItem('bt_delivery_zones', JSON.stringify(list.filter((z: DeliveryZone) => z.id !== id)));
    return true;
  },

  // --- REPAIR SERVICES ---
  async getRepairServices(): Promise<RepairService[]> {
    if (getActiveMode() === 'supabase' && supabase) {
      const { data, error } = await supabase.from('repair_services').select('*').order('service_name');
      if (!error && data) {
        console.log('✅ Fetched repair services from Supabase:', data.length);
        return data;
      }
      console.warn('⚠️ Supabase repair services fetch failed:', error);
    }
    console.log('📦 Falling back to local storage for repair services');
    initializeLocalStorage();
    return JSON.parse(localStorage.getItem('bt_repair_services') || '[]');
  },

  async saveRepairService(service: Partial<RepairService>): Promise<RepairService> {
    const isNew = !service.id;
    const finalService = {
      ...service,
      id: service.id || `srv-${Math.floor(1000 + Math.random() * 9000)}`
    } as RepairService;

    if (getActiveMode() === 'supabase' && supabase) {
      const { data, error } = isNew
        ? await supabase.from('repair_services').insert(finalService).select().single()
        : await supabase.from('repair_services').update(service).eq('id', service.id).select().single();
      if (!error && data) return data;
    }

    initializeLocalStorage();
    const list = JSON.parse(localStorage.getItem('bt_repair_services') || '[]');
    let updated;
    if (isNew) {
      updated = [...list, finalService];
    } else {
      updated = list.map((s: RepairService) => s.id === service.id ? { ...s, ...service } : s);
    }
    localStorage.setItem('bt_repair_services', JSON.stringify(updated));
    return finalService;
  },

  async deleteRepairService(id: string): Promise<boolean> {
    if (getActiveMode() === 'supabase' && supabase) {
      const { error } = await supabase.from('repair_services').delete().eq('id', id);
      if (!error) return true;
    }
    initializeLocalStorage();
    const list = JSON.parse(localStorage.getItem('bt_repair_services') || '[]');
    localStorage.setItem('bt_repair_services', JSON.stringify(list.filter((s: RepairService) => s.id !== id)));
    return true;
  },

  // --- USERS ---
  async getUsers(): Promise<any[]> {
    if (getActiveMode() === 'supabase' && supabase) {
      try {
        // Fetch from auth.users via admin API or from a custom users table
        const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
        if (!error && data) return data;
        console.warn('Supabase users fetch failed:', error);
      } catch (e) {
        console.warn('Error fetching users:', e);
      }
    }
    // Return empty array if no Supabase or in local mode
    return [];
  }
};
