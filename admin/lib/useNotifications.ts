import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import { Order, Booking } from "@/lib/types";

export interface Notif {
  id: string;
  type: "order" | "booking";
  title: string;
  sub: string;
  time: string;
  read: boolean;
}

const STORAGE_KEY = "bt_read_notifs";

export function getRead(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]")); } catch { return new Set(); }
}
export function saveRead(ids: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
}

export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

async function fetchNotifs(): Promise<Notif[]> {
  const read = getRead();
  const [ordersRes, bookingsRes] = await Promise.allSettled([
    adminApi.getOrders() as Promise<{ data: Order[] }>,
    adminApi.getBookings() as Promise<{ data: Booking[] }>,
  ]);

  const items: Notif[] = [];

  if (ordersRes.status === "fulfilled") {
    for (const o of ordersRes.value.data ?? []) {
      items.push({
        id: `order-${o.id}`,
        type: "order",
        title: `New order from ${o.full_name}`,
        sub: `${o.status} · KES ${Math.round(o.total_amount).toLocaleString("en-KE")}`,
        time: o.created_at,
        read: read.has(`order-${o.id}`),
      });
    }
  }

  if (bookingsRes.status === "fulfilled") {
    for (const b of bookingsRes.value.data ?? []) {
      items.push({
        id: `booking-${b.id}`,
        type: "booking",
        title: `Repair booking — ${b.device_model}`,
        sub: `${b.full_name} · ${b.status}`,
        time: b.created_at,
        read: read.has(`booking-${b.id}`),
      });
    }
  }

  return items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
}

export function useNotifications(pollInterval = 60_000) {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const items = await fetchNotifs();
    setNotifs(items);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, pollInterval);
    return () => clearInterval(t);
  }, []);

  function markRead(id: string) {
    const read = getRead();
    read.add(id);
    saveRead(read);
    setNotifs((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }

  function markAllRead() {
    const read = getRead();
    notifs.forEach((n) => read.add(n.id));
    saveRead(read);
    setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return { notifs, loading, markRead, markAllRead, reload: load };
}
