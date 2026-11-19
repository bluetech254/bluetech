/**
 * hooks/useStk.ts
 *
 * Drives the STK flow against the payments microservice:
 *  1. initiate → payments-api sends an STK prompt
 *  2. poll verify until the customer approves (or it fails / times out)
 *  3. call onSuccess(reference) once paid
 *
 * Exposes a `phase` state so UIs can render progress:
 *  idle → initiating → waiting → paid | failed
 */

import { useCallback, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { initiateOrderPayment, verifyOrderPayment } from '../api/payments';

export type StkPhase = 'idle' | 'initiating' | 'waiting' | 'paid' | 'failed';

export interface StkTarget {
  initiate: () => Promise<{ reference: string }>;
  verify: (reference: string) => Promise<{ status: string }>;
}

export interface StkOptions extends StkTarget {
  onSuccess: (reference: string) => void;
  onFailed?: () => void;
}

export function useStk() {
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<StkPhase>('idle');
  const pollRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setLoading(false);
  }, []);

  const pay = useCallback(
    async (opts: StkOptions) => {
      if (!import.meta.env.VITE_PAYMENTS_API_URL || !import.meta.env.VITE_PAYMENTS_API_KEY) {
        toast.error('Payment is not configured. Contact support.');
        return;
      }

      stop();
      setLoading(true);
      setPhase('initiating');

      let reference: string;
      try {
        const res = await opts.initiate();
        reference = res.reference;
        setPhase('waiting');
        toast.success('STK prompt sent — check your phone and enter your M-Pesa PIN');
      } catch {
        setLoading(false);
        setPhase('failed');
        toast.error('Could not start payment. Please try again.');
        opts.onFailed?.();
        return;
      }

      let attempts = 0;
      const maxAttempts = 40; // ~2 minutes at 3s intervals

      pollRef.current = window.setInterval(async () => {
        attempts += 1;
        try {
          const v = await opts.verify(reference);
          if (v.status === 'paid') {
            stop();
            setPhase('paid');
            opts.onSuccess(reference);
          } else if (v.status === 'failed' || attempts >= maxAttempts) {
            stop();
            setPhase('failed');
            opts.onFailed?.();
          }
        } catch {
          if (attempts >= maxAttempts) {
            stop();
            setPhase('failed');
            opts.onFailed?.();
          }
        }
      }, 3000);
    },
    [stop],
  );

  return { pay, loading, stop, phase };
}

export const orderTarget = (orderId: string): StkTarget => ({
  initiate: () => initiateOrderPayment(orderId),
  verify: (ref) => verifyOrderPayment(ref),
});
