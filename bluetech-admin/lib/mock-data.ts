import type {
  Order,
  Booking,
  Product,
  DeliveryZone,
  Service,
  Customer,
  LoyaltyTransaction,
} from "./types";

export const zones: DeliveryZone[] = [];
export const products: Product[] = [];
export const services: Service[] = [];
export const customers: Customer[] = [];
export const orders: Order[] = [];
export const bookings: Booking[] = [];
export const loyaltyTransactions: LoyaltyTransaction[] = [];

export function isSameDay(iso: string, ref: Date) {
  return new Date(iso).toDateString() === ref.toDateString();
}

export function todayMetrics() {
  return { ordersToday: 0, bookingsToday: 0, revenueToday: 0, activeQueue: 0 };
}

export function orderTotal(o: Order) {
  return o.items.reduce((s, it) => s + it.qty * it.unitPrice, 0) + o.deliveryFee;
}

export function last30DaysRevenue() {
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      date: d.toISOString(),
      label: d.toLocaleDateString("en-KE", { month: "short", day: "numeric" }),
      productRevenue: 0,
      repairRevenue: 0,
      orders: 0,
    });
  }
  return days;
}

export function topProducts(limit = 6) {
  return products.slice(0, limit);
}

export function lowStockProducts() {
  return products.filter((p) => p.isActive && p.stock <= p.lowStockThreshold);
}

export function orderStatusBreakdown() {
  return {} as Record<string, number>;
}

export function bookingStatusBreakdown() {
  return {} as Record<string, number>;
}

export function totalRevenueAllTime() {
  return { productRev: 0, repairRev: 0, total: 0 };
}

export function formatKES(n: number) {
  return `KES ${Math.round(n).toLocaleString("en-KE")}`;
}
