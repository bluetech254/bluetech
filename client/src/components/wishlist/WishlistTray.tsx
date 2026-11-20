/**
 * WishlistTray — F3
 *
 * Floating pill at the bottom of the screen.
 * Collapses to a count badge; expands to show saved services with
 * "Book now" and "Remove" actions.
 */
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, X, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { useWishlist } from "../../contexts/WishlistContext";

export default function WishlistTray() {
  const { items, toggle, clear } = useWishlist();
  const [open, setOpen] = useState(false);

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none">
      {/* Expanded tray */}
      {open && (
        <div className="pointer-events-auto bg-white rounded-2xl shadow-2xl border border-gray-100 w-[min(380px,90vw)] max-h-72 overflow-y-auto">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="font-semibold text-sm text-gray-800">Saved services ({items.length})</span>
            <div className="flex items-center gap-2">
              <button onClick={clear} className="text-xs text-red-500 hover:underline">Clear all</button>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
          </div>
          <ul className="divide-y divide-gray-50">
            {items.map(service => (
              <li key={service.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{service.name}</p>
                  <p className="text-xs text-gray-400 truncate">{service.category}</p>
                </div>
                <Link
                  to={`/book-repair/${service.id}`}
                  className="shrink-0 text-xs font-semibold text-blue-600 flex items-center gap-0.5 hover:underline"
                >
                  Book <ArrowRight size={12} />
                </Link>
                <button
                  onClick={() => toggle(service)}
                  className="shrink-0 text-gray-300 hover:text-red-400 ml-1"
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Pill toggle */}
      <button
        onClick={() => setOpen(o => !o)}
        className="pointer-events-auto flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-lg transition-all"
      >
        <Bookmark size={15} />
        <span>{items.length} saved service{items.length !== 1 ? "s" : ""}</span>
        {open ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
      </button>
    </div>
  );
}
