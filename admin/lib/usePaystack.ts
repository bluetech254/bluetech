/**
 * admin/lib/usePaystack.ts
 *
 * Inline Paystack popup for the admin panel.
 * Dynamically loads the Paystack JS SDK and opens the payment iframe.
 * Uses NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY (Next.js env var prefix).
 */

"use client";

import { useCallback, useState } from "react";

declare global {
  interface Window {
    PaystackPop: {
      setup(options: PaystackOptions): { openIframe(): void };
    };
  }
}

interface PaystackOptions {
  key: string;
  email: string;
  amount: number;        // in kobo (KES × 100)
  currency?: string;
  ref: string;
  metadata?: Record<string, unknown>;
  callback: (response: { reference: string; status: string }) => void;
  onClose: () => void;
}

export interface AdminPayOptions {
  email: string;
  amountKes: number;
  reference: string;
  metadata?: Record<string, unknown>;
  onSuccess: (reference: string) => void;
  onClose: () => void;
}

function loadPaystackSDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") { reject(new Error("SSR")); return; }
    if (window.PaystackPop) { resolve(); return; }
    const existing = document.querySelector('script[src*="paystack.co"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Paystack SDK failed to load")));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Paystack SDK failed to load"));
    document.head.appendChild(script);
  });
}

export function usePaystack() {
  const [loading, setLoading] = useState(false);

  const pay = useCallback(async (opts: AdminPayOptions) => {
    const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
    if (!publicKey) {
      alert("Payment not configured — NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY is not set.");
      return;
    }

    setLoading(true);

    try {
      await loadPaystackSDK();
    } catch {
      setLoading(false);
      alert("Could not load payment window. Check your internet connection.");
      return;
    }

    if (!window.PaystackPop) {
      setLoading(false);
      alert("Payment window unavailable. Try refreshing the page.");
      return;
    }

    const handler = window.PaystackPop.setup({
      key:      publicKey,
      email:    opts.email,
      amount:   Math.round(opts.amountKes * 100),
      currency: "KES",
      ref:      opts.reference,
      metadata: opts.metadata,
      callback(response) {
        setLoading(false);
        if (response.reference) opts.onSuccess(response.reference);
      },
      onClose() {
        setLoading(false);
        opts.onClose();
      },
    });

    handler.openIframe();
  }, []);

  return { pay, loading };
}
