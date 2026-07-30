const BASE = process.env.NEXT_PUBLIC_API_URL!;

function getToken(): string {
  try {
    const raw = document.cookie
      .split("; ")
      .find((c) => c.startsWith("admin_session="))
      ?.split("=")
      .slice(1)
      .join("=");
    if (!raw) return "";
    return JSON.parse(decodeURIComponent(raw)).token ?? "";
  } catch {
    return "";
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `API error ${res.status}`);
  }
  return res.json();
}

export const adminApi = {
  // Admin auth
  getMe: () => api<any>("/api/v1/admin/auth/me"),
  changePassword: (current_password: string, new_password: string) =>
    api("/api/v1/admin/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ current_password, new_password }),
    }),
  listAdmins: () => api<{ data: any[]; count: number }>("/api/v1/admin/auth/list"),
  createAdmin: (body: { username: string; email: string; full_name: string; password: string; role: string }) =>
    api("/api/v1/admin/auth/create-admin", { method: "POST", body: JSON.stringify(body) }),
  deactivateAdmin: (id: string) =>
    api(`/api/v1/admin/auth/deactivate/${id}`, { method: "PUT" }),

  // Dashboard
  dashboard: () => api<any>("/api/v1/admin/dashboard"),

  // Orders
  getOrders: (status?: string) =>
    api<{ data: any[]; count: number }>(`/api/v1/orders${status ? `?status=${status}` : ""}`),
  updateOrderStatus: (id: string, status: string) =>
    api(`/api/v1/orders/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }),

  // Bookings
  getBookings: (status?: string) =>
    api<{ data: any[]; count: number }>(`/api/v1/bookings${status ? `?status=${status}` : ""}`),
  updateBookingStatus: (id: string, status: string) =>
    api(`/api/v1/bookings/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }),
  updateBookingCost: (id: string, estimated_cost: number | null, final_cost: number | null) =>
    api(`/api/v1/bookings/${id}/cost`, { method: "PUT", body: JSON.stringify({ estimated_cost, final_cost }) }),

  // Products
  getProducts: (search?: string, activeOnly = false) =>
    api<{ data: any[]; count: number }>(`/api/v1/products?active_only=${activeOnly}${search ? `&search=${search}` : ""}`),
  createProduct: (body: any) =>
    api("/api/v1/products", { method: "POST", body: JSON.stringify(body) }),
  updateProduct: (id: string, body: any) =>
    api(`/api/v1/products/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteProduct: (id: string) =>
    api(`/api/v1/products/${id}`, { method: "DELETE" }),

  // Zones
  getZones: () => api<{ data: any[]; count: number }>("/api/v1/delivery-zones"),

  // Services
  getServices: () => api<{ data: any[]; count: number }>("/api/v1/repair-services"),

  // Users
  getUsers: () =>
    api<{ data: any[]; count: number }>("/api/v1/admin/search?q=a").catch(() =>
      fetch(`${BASE}/api/v1/admin/search?q=+`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      }).then((r) => r.json())
    ),
  toggleUserActive: (id: string, is_active: boolean) =>
    api(`/api/v1/admin/auth/users/${id}/toggle-active?is_active=${is_active}`, { method: "PUT" }),

  // Loyalty / points
  getReferrals: () => api<any>("/api/v1/admin/referrals"),
  awardPoints: (user_id: string, points: number, reason: string) =>
    api(`/api/v1/points/admin/award/${user_id}`, {
      method: "POST",
      body: JSON.stringify({ points, reason }),
    }),
  getUserPoints: (user_id: string) => api<any>(`/api/v1/points/admin/user/${user_id}`),
};
