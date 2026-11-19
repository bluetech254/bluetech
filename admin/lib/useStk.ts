/**
 * lib/useStk.ts
 *
 * Drives the STK flow against the payments microservice:
 *  1. initiate → payments-api sends an STK prompt to the customer's phone
 *  2. poll verify until the customer approves (or it fails / times out)
 *  3. call onSuccess(reference) once paid
 */
"use client";

import { useCallback, useRef, useState } from "react";

export type StkPhase = "idle" | "initiating" | "waiting" | "paid" | "failed";

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
  const [phase, setPhase] = useState<StkPhase>("idle");
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
      if (!process.env.NEXT_PUBLIC_PAYMENTS_API_URL || !process.env.NEXT_PUBLIC_PAYMENTS_API_KEY) {
        alert("Payment is not configured. Contact support.");
        return;
      }

      stop();
      setLoading(true);
      setPhase("initiating");

      let reference: string;
      try {
        const res = await opts.initiate();
        reference = res.reference;
        setPhase("waiting");
      } catch {
        setLoading(false);
        setPhase("failed");
        opts.onFailed?.();
        return;
      }

      let attempts = 0;
      const maxAttempts = 40; // ~2 minutes at 3s intervals

      pollRef.current = window.setInterval(async () => {
        attempts += 1;
        try {
          const v = await opts.verify(reference);
          if (v.status === "paid") {
            stop();
            setPhase("paid");
            opts.onSuccess(reference);
          } else if (v.status === "failed" || attempts >= maxAttempts) {
            stop();
            setPhase("failed");
            opts.onFailed?.();
          }
        } catch {
          if (attempts >= maxAttempts) {
            stop();
            setPhase("failed");
            opts.onFailed?.();
          }
        }
      }, 3000);
    },
    [stop],
  );

  return { pay, loading, stop, phase };
}
