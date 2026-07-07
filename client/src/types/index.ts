// Product
export interface Product {
  id: string;
  title?: string;
  name?: string;
  description: string;
  price: number;
  category?: string;
  brand?: string;
  image_url?: string;
  images?: string[];
  stock_quantity: number;
  is_active?: boolean;
  specifications?: Record<string, string> | string;
  created_at: string;
  updated_at?: string;
  // Section flags
  is_featured?: boolean;
  is_discounted?: boolean;
  discount_percent?: number;
  is_flash_sale?: boolean;
  flash_sale_ends_at?: string;
  is_new_arrival?: boolean;
  is_best_seller?: boolean;
  is_trending?: boolean;
  is_clearance?: boolean;
  is_refurbished?: boolean;
  is_pre_order?: boolean;
  is_back_in_stock?: boolean;
  is_editors_choice?: boolean;
  is_weekly_deal?: boolean;
  is_coming_soon?: boolean;
}

// Service
export interface RepairService {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  estimated_duration: string;
  warranty_period?: string;
  image?: string;
  created_at: string;
}

// Order
export interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  phone_number: string;
  email?: string;
  delivery_address: string;
  delivery_zone: string;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  total_amount: number;
  payment_method: 'mpesa' | 'cash_on_delivery';
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  notes?: string;
  created_at: string;
}

export interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

// Booking
export interface Booking {
  id: string;
  booking_number: string;
  service_id: string;
  service_name: string;
  customer_name: string;
  customer_email?: string;
  customer_phone: string;
  device_model: string;
  device_brand: string;
  issue_description: string;
  preferred_date: string;
  preferred_time: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  created_at: string;
}

// User
export interface User {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  created_at: string;
}

// Delivery Zone
export interface DeliveryZone {
  id: string;
  zone_name: string;
  delivery_fee: number;
  is_active: boolean;
  created_at?: string;
}

// Cart Item
export interface CartItem {
  product: Product;
  quantity: number;
}
