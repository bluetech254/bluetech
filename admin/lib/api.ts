const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

function getToken(): string {
  if (typeof document === "undefined") return "";
  try {
    const raw = document.cookie
      .split("; ")
      .find((c) => c.startsWith("admin_session="))
      ?.split("=")
      .slice(1)
      .join("=");
    return raw ? JSON.parse(decodeURIComponent(raw)).token ?? "" : "";
  } catch {
    return "";
  }
}

export function getSession() {
  if (typeof document === "undefined") return null;
  try {
    const raw = document.cookie
      .split("; ")
      .find((c) => c.startsWith("admin_session="))
      ?.split("=")
      .slice(1)
      .join("=");
    return raw ? JSON.parse(decodeURIComponent(raw)) : null;
  } catch {
    return null;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

const qs = (params: Record<string, string | number | boolean | undefined>) => {
  const s = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") s.set(k, String(v));
  });
  const str = s.toString();
  return str ? `?${str}` : "";
};

export const adminApi = {
  // Auth
  getMe: () => request("/api/v1/admin/auth/me"),
  changePassword: (current_password: string, new_password: string) =>
    request("/api/v1/admin/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ current_password, new_password }),
    }),
  listAdmins: () => request<{ data: any[]; count: number }>("/api/v1/admin/auth/list"),
  createAdmin: (body: { username: string; email: string; full_name: string; password: string; role: string }) =>
    request("/api/v1/admin/auth/create-admin", { method: "POST", body: JSON.stringify(body) }),
  deactivateAdmin: (id: string) => request(`/api/v1/admin/auth/deactivate/${id}`, { method: "PUT" }),
  toggleUserActive: (id: string, is_active: boolean) =>
    request(`/api/v1/admin/auth/users/${id}/toggle-active${qs({ is_active })}`, { method: "PUT" }),

  // Dashboard & ops
  dashboard: () => request("/api/v1/admin/dashboard"),
  stockAlerts: () => request<{ data: any[]; count: number }>("/api/v1/admin/stock/alerts"),
  updateStockThreshold: (product_id: string, threshold: number) =>
    request(`/api/v1/admin/stock/${product_id}/threshold${qs({ threshold })}`, { method: "PUT" }),
  globalSearch: (q: string) => request(`/api/v1/admin/search${qs({ q })}`),
  auditLog: (limit = 50, admin_id?: string) =>
    request(`/api/v1/admin/audit-log${qs({ limit, admin_id })}`),
  referrals: () => request("/api/v1/admin/referrals"),
  referralsForUser: (user_id: string) => request(`/api/v1/admin/referrals/user/${user_id}`),
  customerHistory: (user_id: string) => request(`/api/v1/admin/customers/${user_id}/history`),
  bulkOrderStatus: (order_ids: string[], status: string) =>
    request("/api/v1/admin/orders/bulk-status", { method: "POST", body: JSON.stringify({ order_ids, status }) }),
  exportOrdersUrl: (params: { status?: string; date_from?: string; date_to?: string }) =>
    `${BASE}/api/v1/admin/export/orders${qs(params)}`,
  exportBookingsUrl: (params: { status?: string }) =>
    `${BASE}/api/v1/admin/export/bookings${qs(params)}`,

  // Orders
  getOrders: (status?: string) => request<{ data: any[]; count: number }>(`/api/v1/orders${qs({ status })}`),
  getOrder: (id: string) => request(`/api/v1/orders/${id}`),
  updateOrderStatus: (id: string, status: string) =>
    request(`/api/v1/orders/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }),
  cancelOrder: (id: string) =>
    request(`/api/v1/orders/${id}`, { method: "DELETE" }),

  // Bookings
  getBookings: (status?: string) => request<{ data: any[]; count: number }>(`/api/v1/bookings${qs({ status })}`),
  getBooking: (id: string) => request(`/api/v1/bookings/${id}`),
  updateBookingStatus: (id: string, status: string) =>
    request(`/api/v1/bookings/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }),
  updateBookingCost: (id: string, estimated_cost?: number, final_cost?: number) =>
    request(`/api/v1/bookings/${id}/cost`, { method: "PUT", body: JSON.stringify({ estimated_cost, final_cost }) }),
  updateBookingNotes: (id: string, internal_notes: string | null) =>
    request(`/api/v1/admin/bookings/${id}/notes`, { method: "PUT", body: JSON.stringify({ internal_notes }) }),
  requestFinalPayment: (id: string) =>
    request<{ authorization_url: string; reference: string; amount: number }>(`/api/v1/payments/booking/${id}/final/request`, { method: "POST" }),
  getFinalPaymentStatus: (id: string) =>
    request<{ final_payment_status: string; final_receipt?: string }>(`/api/v1/payments/booking/${id}/final/status`),
  getTransactions: () =>
    request<{ data: any[]; count: number }>("/api/v1/admin/transactions"),

  // Products
  getProducts: (search?: string, activeOnly?: boolean) =>
    request<{ data: any[]; count: number }>(`/api/v1/products${qs({ search, active_only: activeOnly })}`),
  getProduct: (id: string) => request(`/api/v1/products/${id}`),
  createProduct: (body: Partial<import("./types").Product>) =>
    request("/api/v1/products", { method: "POST", body: JSON.stringify(body) }),
  updateProduct: (id: string, body: Partial<import("./types").Product>) =>
    request(`/api/v1/products/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteProduct: (id: string) => request(`/api/v1/products/${id}`, { method: "DELETE" }),

  // Zones
  getZones: () => request<{ data: any[]; count: number }>("/api/v1/delivery-zones"),

  // Services
  getServices: (category?: string, search?: string, limit?: number) =>
    request<{ data: any[]; count: number }>(`/api/v1/repair-services${qs({ category, search, limit })}`),
  getServiceCategories: () => request("/api/v1/repair-services/categories"),

  // Users
  getUsers: (q?: string) => request<{ data: any[]; count: number }>(`/api/v1/admin/users${qs({ q })}`),

  // Points
  getUserPoints: (user_id: string) => request(`/api/v1/points/admin/user/${user_id}`),
  awardPoints: (user_id: string, points: number, reason: string) =>
    request(`/api/v1/points/admin/award/${user_id}${qs({ points, reason })}`, { method: "POST" }),

  // Devices — brands, models, service pricing
  getBrands: () => request<{ data: any[] }>("/api/v1/admin/devices/brands"),
  createBrand: (body: any) => request("/api/v1/admin/devices/brands", { method: "POST", body: JSON.stringify(body) }),
  updateBrand: (id: string, body: any) => request(`/api/v1/admin/devices/brands/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteBrand: (id: string) => request(`/api/v1/admin/devices/brands/${id}`, { method: "DELETE" }),
  getModels: (brand_id?: string) => request<{ data: any[] }>(`/api/v1/admin/devices/models${qs({ brand_id })}`),
  createModel: (body: any) => request("/api/v1/admin/devices/models", { method: "POST", body: JSON.stringify(body) }),
  updateModel: (id: string, body: any) => request(`/api/v1/admin/devices/models/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteModel: (id: string) => request(`/api/v1/admin/devices/models/${id}`, { method: "DELETE" }),
  getServicePricing: () => request<{ data: any[] }>("/api/v1/admin/devices/pricing"),
  upsertServicePricing: (body: any) => request("/api/v1/admin/devices/pricing", { method: "POST", body: JSON.stringify(body) }),
  deleteServicePricing: (id: string) => request(`/api/v1/admin/devices/pricing/${id}`, { method: "DELETE" }),
};

export const formatKES = (n: number) => `KES ${Math.round(n).toLocaleString("en-KE")}`;
