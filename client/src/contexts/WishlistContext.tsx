/**
 * WishlistContext — F3 Service Wishlist
 *
 * Stores saved repair services in localStorage.
 * Fires trackWishlistEvent on every save/remove.
 * No auth required.
 */
import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { RepairService } from "../types";
import { trackWishlistEvent } from "../lib/analytics";
import toast from "react-hot-toast";

interface WishlistContextType {
  items: RepairService[];
  isSaved: (id: string) => boolean;
  toggle: (service: RepairService) => void;
  clear: () => void;
}

const WishlistContext = createContext<WishlistContextType | null>(null);
const STORAGE_KEY = "bt_service_wishlist";

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<RepairService[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  function isSaved(id: string) {
    return items.some(s => s.id === id);
  }

  function toggle(service: RepairService) {
    if (isSaved(service.id)) {
      setItems(prev => prev.filter(s => s.id !== service.id));
      trackWishlistEvent({
        event_type:   "removed",
        service_id:   service.id,
        service_name: service.name,
        category:     service.category,
      });
      toast("Removed from saved services", { icon: "🗑️" });
    } else {
      setItems(prev => [...prev, service]);
      trackWishlistEvent({
        event_type:   "saved",
        service_id:   service.id,
        service_name: service.name,
        category:     service.category,
      });
      toast.success("Service saved!");
    }
  }

  function clear() {
    setItems([]);
    localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <WishlistContext.Provider value={{ items, isSaved, toggle, clear }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used inside WishlistProvider");
  return ctx;
}
