export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "dispatched"
  | "delivered"
  | "cancelled";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "picked_up"
  | "in_diagnosis"
  | "in_repair"
  | "ready"
  | "completed"
  | "cancelled";

export type PaymentMethod = "mpesa" | "cash_on_delivery" | "card";
export type PaymentStatus = "paid" | "unpaid";
export type DeviceType = "phone" | "laptop" | "tablet" | "other";
export type FulfillmentType = "dropoff" | "pickup";

export interface OrderItem {
  id: string;
  productId: string;
  title: string;
  qty: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  customerName: string;
  phone: string;
  email?: string;
  zoneId: string;
  address: string;
  items: OrderItem[];
  deliveryFee: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  pointsEarned: number;
}

export interface Booking {
  id: string;
  customerName: string;
  phone: string;
  deviceType: DeviceType;
  deviceModel: string;
  issue: string;
  fulfillmentType: FulfillmentType;
  pickupAddress?: string;
  status: BookingStatus;
  estimatedCost?: number;
  finalCost?: number;
  technicianNotes?: string;
  smsLog: { stage: BookingStatus; sentAt: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  stock: number;
  lowStockThreshold: number;
  category: string;
  brand: string;
  imageUrl: string;
  specs: Record<string, string>;
  isActive: boolean;
  unitsSold: number;
  createdAt: string;
}

export interface DeliveryZone {
  id: string;
  name: string;
  fee: number;
  isActive: boolean;
  ordersFulfilled: number;
}

export interface Service {
  id: string;
  name: string;
  category: string;
  basePrice: number;
  durationMins: number;
  warrantyDays: number;
  jobsCompleted: number;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  verified: boolean;
  registeredAt: string;
  lastSignIn: string;
  isActive: boolean;
  loyaltyPoints: number;
  lifetimeSpend: number;
  referralCode: string;
  referredBy?: string;
  referralCount: number;
}

export interface LoyaltyTransaction {
  id: string;
  customerId: string;
  customerName: string;
  type: "earn" | "redeem" | "referral_bonus" | "manual_award" | "expiry";
  points: number;
  reason: string;
  createdAt: string;
}
