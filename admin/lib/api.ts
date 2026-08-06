const BASE = "";

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
  getMe: () => request("/api/proxy/admin/auth/me"),
  changePassword: (current_password: string, new_password: string) =>
    request("/api/proxy/admin/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ current_password, new_password }),
    }),
  listAdmins: () => request<{ data: any[]; count: number }>("/api/proxy/admin/auth/list"),
  createAdmin: (body: { username: string; email: string; full_name: string; password: string; role: string }) =>
    request("/api/proxy/admin/auth/create-admin", { method: "POST", body: JSON.stringify(body) }),
  deactivateAdmin: (id: string) => request(`/api/proxy/admin/auth/deactivate/${id}`, { method: "PUT" }),
  toggleUserActive: (id: string, is_active: boolean) =>
    request(`/api/proxy/admin/auth/users/${id}/toggle-active${qs({ is_active })}`, { method: "PUT" }),

  // Dashboard & ops
  dashboard: () => request("/api/proxy/admin/dashboard"),
  stockAlerts: () => request<{ data: any[]; count: number }>("/api/proxy/admin/stock/alerts"),
  updateStockThreshold: (product_id: string, threshold: number) =>
    request(`/api/proxy/admin/stock/${product_id}/threshold${qs({ threshold })}`, { method: "PUT" }),
  globalSearch: (q: string) => request(`/api/proxy/admin/search${qs({ q })}`),
  auditLog: (limit = 50, admin_id?: string) =>
    request(`/api/proxy/admin/audit-log${qs({ limit, admin_id })}`),
  referrals: () => request("/api/proxy/admin/referrals"),
  referralsForUser: (user_id: string) => request(`/api/proxy/admin/referrals/user/${user_id}`),
  customerHistory: (user_id: string) => request(`/api/proxy/admin/customers/${user_id}/history`),
  bulkOrderStatus: (order_ids: string[], status: string) =>
    request("/api/proxy/admin/orders/bulk-status", { method: "POST", body: JSON.stringify({ order_ids, status }) }),
  exportOrdersUrl: (params: { status?: string; date_from?: string; date_to?: string }) =>
    `${BASE}/api/proxy/admin/export/orders${qs(params)}`,
  exportBookingsUrl: (params: { status?: string }) =>
    `${BASE}/api/proxy/admin/export/bookings${qs(params)}`,

  // Orders
  getOrders: (status?: string) => request<{ data: any[]; count: number }>(`/api/proxy/orders${qs({ status })}`),
  getOrder: (id: string) => request(`/api/proxy/orders/${id}`),
  updateOrderStatus: (id: string, status: string) =>
    request(`/api/proxy/orders/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }),

  // Bookings
  getBookings: (status?: string) => request<{ data: any[]; count: number }>(`/api/proxy/bookings${qs({ status })}`),
  getBooking: (id: string) => request(`/api/proxy/bookings/${id}`),
  updateBookingStatus: (id: string, status: string) =>
    request(`/api/proxy/bookings/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }),
  updateBookingCost: (id: string, estimated_cost?: number, final_cost?: number) =>
    request(`/api/proxy/bookings/${id}/cost`, { method: "PUT", body: JSON.stringify({ estimated_cost, final_cost }) }),
  requestFinalPayment: (id: string) =>
    request(`/api/proxy/payments/mpesa/booking/${id}/request-final-payment`, { method: "POST" }),
  getFinalPaymentStatus: (id: string) =>
    request<{ final_payment_status: string; final_receipt?: string }>(`/api/proxy/payments/mpesa/booking/${id}/final/status`),

  // Products
  getProducts: (search?: string, activeOnly?: boolean) =>
    request<{ data: any[]; count: number }>(`/api/proxy/products${qs({ search, active_only: activeOnly })}`),
  getProduct: (id: string) => request(`/api/proxy/products/${id}`),
  createProduct: (body: Partial<import("./types").Product>) =>
    request("/api/proxy/products", { method: "POST", body: JSON.stringify(body) }),
  updateProduct: (id: string, body: Partial<import("./types").Product>) =>
    request(`/api/proxy/products/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteProduct: (id: string) => request(`/api/proxy/products/${id}`, { method: "DELETE" }),

  // Zones
  getZones: () => request<{ data: any[]; count: number }>("/api/proxy/delivery-zones"),

  // Services
  getServices: (category?: string, search?: string, limit?: number) =>
    request<{ data: any[]; count: number }>(`/api/proxy/repair-services${qs({ category, search, limit })}`),
  getServiceCategories: () => request("/api/proxy/repair-services/categories"),

  // Users
  getUsers: (q = "a") => request(`/api/proxy/admin/search${qs({ q })}`),

  // Points
  getUserPoints: (user_id: string) => request(`/api/proxy/points/admin/user/${user_id}`),
  awardPoints: (user_id: string, points: number, reason: string) =>
    request(`/api/proxy/points/admin/award/${user_id}${qs({ points, reason })}`, { method: "POST" }),
};

export const formatKES = (n: number) => `KES ${Math.round(n).toLocaleString("en-KE")}`;
