import type {
  Order,
  Booking,
  Product,
  DeliveryZone,
  Service,
  Customer,
  LoyaltyTransaction,
  OrderStatus,
  BookingStatus,
} from "./types";

// ---------- deterministic PRNG so numbers are stable across reloads ----------
let seed = 42;
function rand() {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
}
function randInt(min: number, max: number) {
  return Math.floor(rand() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
}
function daysAgo(n: number, hourJitter = true) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  if (hourJitter) {
    d.setHours(randInt(7, 20), randInt(0, 59), 0, 0);
  }
  return d.toISOString();
}

// ---------- Delivery zones (Nairobi) ----------
export const zones: DeliveryZone[] = [
  { id: "z1", name: "Nairobi CBD", fee: 150, isActive: true, ordersFulfilled: 0 },
  { id: "z2", name: "Westlands", fee: 200, isActive: true, ordersFulfilled: 0 },
  { id: "z3", name: "Kilimani", fee: 200, isActive: true, ordersFulfilled: 0 },
  { id: "z4", name: "Karen", fee: 350, isActive: true, ordersFulfilled: 0 },
  { id: "z5", name: "Embakasi", fee: 250, isActive: true, ordersFulfilled: 0 },
  { id: "z6", name: "Ruiru", fee: 400, isActive: true, ordersFulfilled: 0 },
  { id: "z7", name: "Thika Road", fee: 300, isActive: true, ordersFulfilled: 0 },
  { id: "z8", name: "Ngong Road", fee: 250, isActive: true, ordersFulfilled: 0 },
  { id: "z9", name: "Rongai", fee: 380, isActive: false, ordersFulfilled: 0 },
];

// ---------- Products ----------
const categories = ["Phones", "Laptops", "Tablets", "Accessories", "Audio"];
const brandsByCategory: Record<string, string[]> = {
  Phones: ["Samsung", "Tecno", "Infinix", "Xiaomi", "Apple", "Oppo"],
  Laptops: ["HP", "Dell", "Lenovo", "Apple", "Asus"],
  Tablets: ["Samsung", "Apple", "Lenovo"],
  Accessories: ["Anker", "Baseus", "Oraimo", "Generic"],
  Audio: ["JBL", "Oraimo", "Anker", "Sony"],
};
const productNamesByCategory: Record<string, string[]> = {
  Phones: [
    "Galaxy A15 5G", "Spark 20 Pro", "Hot 40i", "Redmi Note 13", "iPhone 13", "Galaxy S23",
    "Reno 8", "Camon 20", "Note 12", "Galaxy A55",
  ],
  Laptops: [
    "Pavilion 15", "Inspiron 14", "ThinkPad E14", "MacBook Air M1", "Vivobook 15",
    "EliteBook 840", "IdeaPad Slim 3", "Latitude 5420",
  ],
  Tablets: ["Galaxy Tab A9", "iPad 9th Gen", "Tab M10"],
  Accessories: [
    "20W Fast Charger", "10000mAh Power Bank", "USB-C Cable 1m", "Screen Protector Pack",
    "Phone Case (Clear)", "Wireless Mouse", "Laptop Sleeve 15\"", "Type-C Hub 6-in-1",
  ],
  Audio: ["Bluetooth Earbuds", "Over-Ear Headphones", "Portable Speaker", "Neckband Earphones"],
};

export const products: Product[] = [];
let pid = 1;
for (const cat of categories) {
  for (const name of productNamesByCategory[cat]) {
    const brand = pick(brandsByCategory[cat]);
    const basePrice =
      cat === "Phones" ? randInt(9000, 145000) :
      cat === "Laptops" ? randInt(28000, 185000) :
      cat === "Tablets" ? randInt(15000, 95000) :
      cat === "Audio" ? randInt(1200, 12000) :
      randInt(300, 4500);
    const stock = randInt(0, 60);
    products.push({
      id: `p${pid}`,
      title: `${brand} ${name}`,
      description: `${brand} ${name} — genuine unit with official Kenyan warranty.`,
      price: basePrice,
      stock,
      lowStockThreshold: cat === "Accessories" || cat === "Audio" ? 10 : 4,
      category: cat,
      brand,
      imageUrl: "",
      specs:
        cat === "Phones" || cat === "Tablets"
          ? { Storage: pick(["64GB", "128GB", "256GB"]), RAM: pick(["4GB", "6GB", "8GB"]), Color: pick(["Black", "Blue", "Silver", "Green"]) }
          : cat === "Laptops"
          ? { CPU: pick(["Intel i5", "Intel i3", "Ryzen 5", "M1"]), RAM: pick(["8GB", "16GB"]), Storage: pick(["256GB SSD", "512GB SSD"]) }
          : { Color: pick(["Black", "White", "Blue"]) },
      isActive: rand() > 0.06,
      unitsSold: randInt(2, 220),
      createdAt: daysAgo(randInt(10, 300), false),
    });
    pid++;
  }
}

// ---------- Services (repair catalog) ----------
export const services: Service[] = [
  { id: "s1", name: "Screen Replacement — Phone", category: "Phones", basePrice: 3500, durationMins: 60, warrantyDays: 30, jobsCompleted: 0 },
  { id: "s2", name: "Battery Replacement — Phone", category: "Phones", basePrice: 2200, durationMins: 40, warrantyDays: 90, jobsCompleted: 0 },
  { id: "s3", name: "Charging Port Repair", category: "Phones", basePrice: 1800, durationMins: 45, warrantyDays: 30, jobsCompleted: 0 },
  { id: "s4", name: "Water Damage Recovery", category: "Phones", basePrice: 4500, durationMins: 180, warrantyDays: 14, jobsCompleted: 0 },
  { id: "s5", name: "Screen Replacement — Laptop", category: "Laptops", basePrice: 8500, durationMins: 90, warrantyDays: 30, jobsCompleted: 0 },
  { id: "s6", name: "Keyboard Replacement", category: "Laptops", basePrice: 4200, durationMins: 60, warrantyDays: 60, jobsCompleted: 0 },
  { id: "s7", name: "RAM / SSD Upgrade", category: "Laptops", basePrice: 3000, durationMins: 30, warrantyDays: 180, jobsCompleted: 0 },
  { id: "s8", name: "OS Reinstall & Data Backup", category: "Laptops", basePrice: 1500, durationMins: 90, warrantyDays: 7, jobsCompleted: 0 },
  { id: "s9", name: "Motherboard Diagnosis", category: "Laptops", basePrice: 2000, durationMins: 60, warrantyDays: 0, jobsCompleted: 0 },
  { id: "s10", name: "Tablet Screen Replacement", category: "Tablets", basePrice: 5000, durationMins: 75, warrantyDays: 30, jobsCompleted: 0 },
];

// ---------- Customers ----------
const firstNames = ["Brian", "Faith", "Kevin", "Mercy", "Dennis", "Winnie", "Peter", "Grace", "John", "Ann", "Kelvin", "Diana", "Samuel", "Joy", "Collins", "Sharon", "Victor", "Esther", "Moses", "Lilian", "Felix", "Purity", "Eric", "Cynthia"];
const lastNames = ["Mwangi", "Otieno", "Wanjiru", "Kamau", "Achieng", "Njoroge", "Kiptoo", "Wafula", "Odhiambo", "Muthoni", "Cheruiyot", "Nyambura", "Omondi", "Wambui"];

export const customers: Customer[] = [];
for (let i = 1; i <= 60; i++) {
  const fn = pick(firstNames);
  const ln = pick(lastNames);
  const registeredDaysAgo = randInt(1, 260);
  customers.push({
    id: `c${i}`,
    name: `${fn} ${ln}`,
    email: `${fn.toLowerCase()}.${ln.toLowerCase()}${i}@gmail.com`,
    phone: `07${randInt(10000000, 99999999)}`.slice(0, 10),
    verified: rand() > 0.15,
    registeredAt: daysAgo(registeredDaysAgo, false),
    lastSignIn: daysAgo(randInt(0, Math.min(30, registeredDaysAgo))),
    isActive: rand() > 0.05,
    loyaltyPoints: 0,
    lifetimeSpend: 0,
    referralCode: `${fn.slice(0, 3).toUpperCase()}${randInt(100, 999)}`,
    referredBy: rand() > 0.7 ? undefined : undefined,
    referralCount: 0,
  });
}
// wire up some referrals after list exists
for (const c of customers) {
  if (rand() > 0.72) {
    const referrer = pick(customers.filter((x) => x.id !== c.id));
    c.referredBy = referrer.referralCode;
    referrer.referralCount += 1;
  }
}

// ---------- Orders ----------
const statusWeight: Record<OrderStatus, number> = {
  pending: 10, confirmed: 12, processing: 10, dispatched: 8, delivered: 55, cancelled: 5,
};
function weightedStatus<T extends string>(weights: Record<T, number>): T {
  const entries = Object.entries(weights) as [T, number][];
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [k, w] of entries) {
    if (r < w) return k;
    r -= w;
  }
  return entries[0][0];
}

export const orders: Order[] = [];
for (let i = 1; i <= 260; i++) {
  const customer = pick(customers);
  const zone = pick(zones);
  const daysBack = Math.floor((i / 260) ** 0.55 * 60); // more recent orders denser
  const itemCount = randInt(1, 3);
  const items = [];
  let subtotal = 0;
  for (let j = 0; j < itemCount; j++) {
    const p = pick(products);
    const qty = randInt(1, 2);
    items.push({ id: `${i}-${j}`, productId: p.id, title: p.title, qty, unitPrice: p.price });
    subtotal += qty * p.price;
  }
  const status = daysBack < 1 && rand() > 0.4
    ? weightedStatus({ pending: 30, confirmed: 25, processing: 20, dispatched: 15, delivered: 8, cancelled: 2 })
    : weightedStatus(statusWeight);
  const createdAt = daysAgo(daysBack);
  const paid = status === "delivered" ? true : rand() > 0.35;
  const pointsEarned = Math.round(subtotal * 0.1);
  orders.push({
    id: `BT-${1000 + i}`,
    customerName: customer.name,
    phone: customer.phone,
    email: customer.email,
    zoneId: zone.id,
    address: `${zone.name}, House/Plot ${randInt(1, 400)}`,
    items,
    deliveryFee: zone.fee,
    status,
    paymentStatus: paid ? "paid" : "unpaid",
    paymentMethod: pick(["mpesa", "mpesa", "mpesa", "cash_on_delivery", "card"]),
    notes: rand() > 0.85 ? "Customer requested gift wrap." : undefined,
    createdAt,
    updatedAt: createdAt,
    pointsEarned,
  });
  if (paid) {
    customer.lifetimeSpend += subtotal + zone.fee;
    customer.loyaltyPoints += pointsEarned;
  }
  zone.ordersFulfilled += 1;
}
orders.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

// ---------- Bookings (repairs) ----------
const deviceTypes: Array<"phone" | "laptop" | "tablet" | "other"> = ["phone", "laptop", "tablet", "other"];
const bookingStatuses: BookingStatus[] = [
  "pending", "confirmed", "picked_up", "in_diagnosis", "in_repair", "ready", "completed", "cancelled",
];
const bookingWeight: Record<BookingStatus, number> = {
  pending: 8, confirmed: 10, picked_up: 6, in_diagnosis: 10, in_repair: 12, ready: 8, completed: 40, cancelled: 6,
};
const issuesByDevice: Record<string, string[]> = {
  phone: ["Cracked screen", "Battery drains fast", "Charging port loose", "Water damage", "Speaker not working", "Camera not focusing"],
  laptop: ["Won't power on", "Keyboard keys unresponsive", "Overheating & shutting down", "Screen flickering", "Slow performance", "Fan making noise"],
  tablet: ["Cracked screen", "Battery not holding charge", "Touch not responsive"],
  other: ["Smartwatch screen cracked", "Earbuds charging case faulty"],
};

export const bookings: Booking[] = [];
for (let i = 1; i <= 140; i++) {
  const customer = pick(customers);
  const deviceType = pick(deviceTypes);
  const daysBack = Math.floor((i / 140) ** 0.5 * 45);
  const status = daysBack < 1 && rand() > 0.4
    ? weightedStatus({ pending: 30, confirmed: 22, picked_up: 12, in_diagnosis: 14, in_repair: 12, ready: 6, completed: 3, cancelled: 1 })
    : weightedStatus(bookingWeight);
  const svc = pick(services.filter((s) => s.category.toLowerCase().startsWith(deviceType) || s.category === "Phones"));
  const estimatedCost = svc.basePrice + randInt(-300, 800);
  const finalCost = ["ready", "completed"].includes(status) ? estimatedCost + randInt(-200, 500) : undefined;
  const createdAt = daysAgo(daysBack);
  const smsStages: BookingStatus[] = ["confirmed", "in_diagnosis", "ready", "completed"];
  const smsLog = smsStages
    .filter((s) => bookingStatuses.indexOf(s) <= bookingStatuses.indexOf(status) && status !== "cancelled")
    .map((stage) => ({ stage, sentAt: createdAt }));
  bookings.push({
    id: `RB-${2000 + i}`,
    customerName: customer.name,
    phone: customer.phone,
    deviceType,
    deviceModel: `${pick(brandsByCategory[deviceType === "phone" ? "Phones" : deviceType === "laptop" ? "Laptops" : "Tablets"] ?? ["Generic"])} ${pick(["X", "Pro", "Lite", "Max", "Plus", ""])}`.trim(),
    issue: pick(issuesByDevice[deviceType]),
    fulfillmentType: pick(["dropoff", "dropoff", "pickup"]),
    pickupAddress: rand() > 0.5 ? `${pick(zones).name}, House ${randInt(1, 300)}` : undefined,
    status,
    estimatedCost,
    finalCost,
    technicianNotes: rand() > 0.6 ? "Replacement part ordered from supplier." : undefined,
    smsLog,
    createdAt,
    updatedAt: createdAt,
  });
  if (status === "completed") svc.jobsCompleted += 1;
}
bookings.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

// ---------- Loyalty transactions ----------
export const loyaltyTransactions: LoyaltyTransaction[] = [];
let ltid = 1;
for (const o of orders) {
  if (o.paymentStatus === "paid") {
    loyaltyTransactions.push({
      id: `LT-${ltid++}`,
      customerId: customers.find((c) => c.name === o.customerName)?.id ?? "c1",
      customerName: o.customerName,
      type: "earn",
      points: o.pointsEarned,
      reason: `Order ${o.id}`,
      createdAt: o.createdAt,
    });
  }
}
for (const c of customers.filter((c) => c.referralCount > 0)) {
  for (let i = 0; i < c.referralCount; i++) {
    c.loyaltyPoints += 50;
    loyaltyTransactions.push({
      id: `LT-${ltid++}`,
      customerId: c.id,
      customerName: c.name,
      type: "referral_bonus",
      points: 50,
      reason: "Referral first order bonus",
      createdAt: daysAgo(randInt(1, 90)),
    });
  }
}
// a few manual awards & redemptions for realism
for (let i = 0; i < 14; i++) {
  const c = pick(customers);
  if (rand() > 0.5 && c.loyaltyPoints > 1000) {
    const redeemed = 1000;
    c.loyaltyPoints -= redeemed;
    loyaltyTransactions.push({
      id: `LT-${ltid++}`, customerId: c.id, customerName: c.name, type: "redeem",
      points: -redeemed, reason: "Redeemed for order discount", createdAt: daysAgo(randInt(1, 60)),
    });
  } else {
    const bonus = randInt(50, 200);
    c.loyaltyPoints += bonus;
    loyaltyTransactions.push({
      id: `LT-${ltid++}`, customerId: c.id, customerName: c.name, type: "manual_award",
      points: bonus, reason: "Admin goodwill award", createdAt: daysAgo(randInt(1, 60)),
    });
  }
}
loyaltyTransactions.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

// ---------- Derived analytics helpers ----------
export function isSameDay(iso: string, ref: Date) {
  const d = new Date(iso);
  return d.toDateString() === ref.toDateString();
}

export function todayMetrics() {
  const today = new Date();
  const ordersToday = orders.filter((o) => isSameDay(o.createdAt, today));
  const bookingsToday = bookings.filter((b) => isSameDay(b.createdAt, today));
  const revenueToday =
    ordersToday.filter((o) => o.paymentStatus === "paid").reduce((s, o) => s + orderTotal(o), 0) +
    bookingsToday.filter((b) => b.status === "completed" && b.finalCost).reduce((s, b) => s + (b.finalCost ?? 0), 0);
  const activeQueue =
    orders.filter((o) => !["delivered", "cancelled"].includes(o.status)).length +
    bookings.filter((b) => !["completed", "cancelled"].includes(b.status)).length;
  return {
    ordersToday: ordersToday.length,
    bookingsToday: bookingsToday.length,
    revenueToday,
    activeQueue,
  };
}

export function orderTotal(o: Order) {
  return o.items.reduce((s, it) => s + it.qty * it.unitPrice, 0) + o.deliveryFee;
}

export function last30DaysRevenue() {
  const days: { date: string; label: string; productRevenue: number; repairRevenue: number; orders: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString("en-KE", { month: "short", day: "numeric" });
    const productRevenue = orders
      .filter((o) => isSameDay(o.createdAt, d) && o.paymentStatus === "paid")
      .reduce((s, o) => s + orderTotal(o), 0);
    const repairRevenue = bookings
      .filter((b) => isSameDay(b.createdAt, d) && b.status === "completed" && b.finalCost)
      .reduce((s, b) => s + (b.finalCost ?? 0), 0);
    const ordersCount = orders.filter((o) => isSameDay(o.createdAt, d)).length;
    days.push({ date: d.toISOString(), label, productRevenue, repairRevenue, orders: ordersCount });
  }
  return days;
}

export function topProducts(limit = 6) {
  return [...products].sort((a, b) => b.unitsSold * b.price - a.unitsSold * a.price).slice(0, limit);
}

export function lowStockProducts() {
  return products.filter((p) => p.isActive && p.stock <= p.lowStockThreshold);
}

export function orderStatusBreakdown() {
  const map: Record<string, number> = {};
  for (const o of orders) map[o.status] = (map[o.status] ?? 0) + 1;
  return map;
}

export function bookingStatusBreakdown() {
  const map: Record<string, number> = {};
  for (const b of bookings) map[b.status] = (map[b.status] ?? 0) + 1;
  return map;
}

export function totalRevenueAllTime() {
  const productRev = orders.filter((o) => o.paymentStatus === "paid").reduce((s, o) => s + orderTotal(o), 0);
  const repairRev = bookings.filter((b) => b.status === "completed" && b.finalCost).reduce((s, b) => s + (b.finalCost ?? 0), 0);
  return { productRev, repairRev, total: productRev + repairRev };
}

export function formatKES(n: number) {
  return `KES ${Math.round(n).toLocaleString("en-KE")}`;
}
