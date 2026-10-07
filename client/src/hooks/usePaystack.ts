/**
 * hooks/usePaystack.ts
 *
 * Wraps the PaystackPop inline JS SDK.
 * Dynamically injects the SDK script if it hasn't loaded yet (handles CSP/race issues).
 * Returns a single `pay()` function that opens the Paystack popup.
 */

import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';

declare global {
  interface Window {
    PaystackPop: {
      setup(options: PaystackOptions): { openIframe(): void };
    };
  }
}

export interface PaystackOptions {
  key: string;
  email: string;
  amount: number;
  currency?: string;
  ref: string;
  metadata?: Record<string, unknown>;
  callback: (response: { reference: string; status: string }) => void;
  onClose: () => void;
}

export interface PayOptions {
  email: string;
  amountKes: number;
  reference: string;
  metadata?: Record<string, unknown>;
  onSuccess: (reference: string) => void;
  onClose: () => void;
}

/** Dynamically load the Paystack SDK if not already present. */
function loadPaystackSDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Already loaded
    if (window.PaystackPop) {
      resolve();
      return;
    }
    // Script tag already injected — wait for it
    const existing = document.querySelector('script[src*="paystack.co"]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Paystack SDK failed to load')));
      return;
    }
    // Inject fresh
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Paystack SDK failed to load'));
    document.head.appendChild(script);
  });
}

export function usePaystack() {
  const [loading, setLoading] = useState(false);

  const pay = useCallback(async (opts: PayOptions) => {
    const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
    if (!publicKey) {
      toast.error('Payment not configured. Contact support.');
      console.error('VITE_PAYSTACK_PUBLIC_KEY is not set');
      return;
    }

    setLoading(true);

    try {
      await loadPaystackSDK();
    } catch {
      setLoading(false);
      toast.error('Could not load payment window. Check your internet connection and try again.');
      return;
    }

    if (!window.PaystackPop) {
      setLoading(false);
      toast.error('Payment window unavailable. Try refreshing the page.');
      return;
    }

    const handler = window.PaystackPop.setup({
      key:      publicKey,
      email:    opts.email,
      amount:   Math.round(opts.amountKes * 100),   // KES → kobo
      currency: 'KES',
      ref:      opts.reference,
      metadata: opts.metadata,
      callback(response) {
        setLoading(false);
        if (response.reference) {
          opts.onSuccess(response.reference);
        }
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
