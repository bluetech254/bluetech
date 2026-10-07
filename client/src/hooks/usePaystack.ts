/**
 * hooks/usePaystack.ts
 *
 * Wraps the PaystackPop inline JS SDK (loaded via index.html script tag).
 * Returns a single `pay()` function that opens the Paystack popup.
 *
 * Usage:
 *   const { pay, loading } = usePaystack();
 *   pay({ email, amount, reference, onSuccess, onClose });
 */

import { useCallback, useState } from 'react';

// PaystackPop is injected globally by the SDK script in index.html
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
  amount: number;          // in KOBO (KES × 100)
  currency?: string;       // default 'KES'
  ref: string;             // unique transaction reference
  metadata?: Record<string, unknown>;
  callback: (response: { reference: string; status: string }) => void;
  onClose: () => void;
}

export interface PayOptions {
  email: string;
  amountKes: number;       // in KES — hook converts to kobo automatically
  reference: string;
  metadata?: Record<string, unknown>;
  onSuccess: (reference: string) => void;
  onClose: () => void;
}

export function usePaystack() {
  const [loading, setLoading] = useState(false);

  const pay = useCallback((opts: PayOptions) => {
    const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
    if (!publicKey) {
      console.error('VITE_PAYSTACK_PUBLIC_KEY is not set');
      return;
    }
    if (!window.PaystackPop) {
      console.error('Paystack SDK not loaded — check index.html script tag');
      return;
    }

    setLoading(true);

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
