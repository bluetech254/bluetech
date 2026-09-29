export type AdminRole = "admin" | "superadmin";

export interface AdminSession {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role: AdminRole;
  token: string;
  exp: number;
}

export type OrderStatus =
  | "pending" | "confirmed" | "processing" | "dispatched" | "delivered" | "cancelled";

export type BookingStatus =
  | "pending" | "confirmed" | "picked_up" | "in_diagnosis" | "in_repair" | "ready" | "completed" | "cancelled";

export interface OrderItem {
  id: string;
  // API returns product_title (not title) and unit_price (not price)
  product_title?: string;
  title?: string;          // fallback alias
  quantity: number;
  unit_price?: number;
  price?: number;          // fallback alias
  total_price?: number;
  product_id?: string;
}

export interface Order {
  id: string;
  full_name: string;
  phone_number: string;
  email?: string;
  delivery_zone?: string;
  delivery_address?: string;
  subtotal: number;
  delivery_fee: number;
  points_discount: number;
  total_amount: number;
  status: OrderStatus;
  payment_status: string;
  payment_method: string;
  mpesa_receipt?: string;
  notes?: string;
  created_at: string;
  order_items: OrderItem[];
}

export interface Booking {
  id: string;
  full_name: string;
  phone_number: string;
  device_type: string;
  device_model: string;
  issue_description: string;
  fulfillment_type: string;
  pickup_address?: string;
  status: BookingStatus;
  estimated_cost?: number;
  final_cost?: number;
  internal_notes?: string;
  commitment_fee?: number;
  commitment_payment_status?: string;
  commitment_receipt?: string;
  final_payment_status?: string;
  final_receipt?: string;
  created_at: string;
}

export interface Product {
  id: string;
  title: string;
  description?: string;
  price: number;
  stock_quantity: number;
  low_stock_threshold: number;
  category: string;
  brand: string;
  image_url?: string;
  specs?: Record<string, string>;
  is_active: boolean;
  units_sold: number;
  created_at: string;
}

export interface DeliveryZone {
  id: string;
  zone_name: string;
  delivery_fee: number;
  is_active: boolean;
}

export interface RepairService {
  id: string;
  service_name: string;
  service_category: string;
  base_price: number;
  duration_minutes: number;
  warranty_days: number;
  is_active: boolean;
}

export interface DashboardData {
  today: { orders: number; bookings: number; revenue: number; new_users: number };
  totals: {
    orders: number; bookings: number; products: number; users: number;
    order_revenue: number; booking_revenue: number; total_revenue: number;
  };
  active_repair_queue: number;
  low_stock_alerts: { id: string; title: string; stock: number; threshold: number }[];
  order_status_breakdown: Record<string, number>;
  revenue_chart: { date: string; revenue: number }[];
  recent_orders: Order[];
  recent_bookings: Booking[];
}

export interface ReferralEntry {
  user_id: string;
  full_name: string;
  referral_count: number;
  points_earned: number;
}

export interface AdminAccount {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role: AdminRole;
  is_active: boolean;
  last_login?: string;
}
