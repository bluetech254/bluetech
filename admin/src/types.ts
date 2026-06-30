export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  image_url: string;
  specifications: Record<string, string> | Array<{ key: string; value: string }> | string;
  stock_quantity: number;
  category?: string;
  brand?: string;
  is_active: boolean;
  created_at?: string;
}

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'dispatched' | 'delivered' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'paid';

export interface Order {
  id: string;
  full_name: string;
  phone_number: string;
  delivery_address: string;
  delivery_zone: string;
  subtotal: number;
  total_amount: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  notes?: string;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_title: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export type BookingStatus = 'pending' | 'confirmed' | 'picked_up' | 'in_diagnosis' | 'in_repair' | 'ready' | 'completed' | 'cancelled';
export type FulfillmentType = 'dropoff' | 'pickup';

export interface Booking {
  id: string;
  full_name: string;
  phone_number: string;
  device_type: string;
  device_model: string;
  issue_description: string;
  fulfillment_type: FulfillmentType;
  status: BookingStatus;
  estimated_cost: number;
  final_cost: number;
  internal_notes?: string;
  created_at: string;
}

export interface DeliveryZone {
  id: string;
  zone_name: string;
  delivery_fee: number;
  is_active: boolean;
  created_at?: string;
}

export interface RepairService {
  id: string;
  service_name: string;
  service_category: string;
  base_price: number;
  duration: string;
  warranty: string;
  created_at?: string;
}

export interface DashboardStats {
  totalOrdersToday: number;
  totalBookingsToday: number;
  revenueToday: number;
  pendingActions: number;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone_number?: string;
  created_at: string;
  last_sign_in_at?: string;
  email_confirmed_at?: string;
}
