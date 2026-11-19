/**
 * components/payments/StkModal.tsx
 *
 * STK payment modal for the admin panel. Shows progress:
 *  1. Sending prompt → Waiting for phone approval → Verifying → Done
 *  2. Auto-starts on mount; user can cancel the wait at any time
 *  3. Surfaces success / failure / timeout instead of hanging
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Smartphone, Loader2, CheckCircle2, XCircle, X, Timer, PhoneCall } from "lucide-react";
import { useStk } from "@/lib/useStk";
import { formatKES } from "@/lib/api";

interface Props {
  amountKes: number;
  target: {
    initiate: () => Promise<{ reference: string }>;
    verify: (reference: string) => Promise<{ status: string }>;
  };
  onSuccess: (reference: string) => void;
  onCancel: () => void;
}

const StkModal = ({ amountKes, target, onSuccess, onCancel }: Props) => {
  const { pay, loading, stop, phase } = useStk();
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      if (timerRef.current) window.clearInterval(timerRef.current);
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    pay({ ...target, onSuccess, onFailed: () => {} });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (["initiating", "waiting"].includes(phase)) {
      setElapsed(0);
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    } else {
      if (timerRef.current) window.clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [phase]);

  const handleCancel = () => {
    stop();
    if (timerRef.current) window.clearInterval(timerRef.current);
    onCancel();
  };

  const handleRetry = () => {
    setElapsed(0);
    pay({ ...target, onSuccess, onFailed: () => {} });
  };

  const busy = phase === "initiating" || phase === "waiting" || loading;
  const mm = String(Math.floor(elapsed / 60)).padStart(1, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return createPortal(
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 99999,
        display: "flex", alignItems: "center", justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)",
        padding: "16px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) handleCancel(); }}
    >
      <div style={{
        background: "#000", borderRadius: "1rem", padding: "1.75rem",
        width: "100%", maxWidth: "380px", textAlign: "center", position: "relative",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
      }}>
        {phase !== "paid" && (
          <button
            onClick={handleCancel}
            className="text-neutral-500 hover:text-neutral-300"
            style={{ position: "absolute", top: "1rem", right: "1rem" }}
            aria-label="Cancel payment"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="w-14 h-14 bg-neutral-900 rounded-full flex items-center justify-center mx-auto mb-4">
          {phase === "paid" ? (
            <CheckCircle2 className="w-7 h-7 text-emerald-400" />
          ) : phase === "failed" ? (
            <XCircle className="w-7 h-7 text-red-400" />
          ) : busy ? (
            <Loader2 className="w-7 h-7 text-neutral-300 animate-spin" />
          ) : (
            <Smartphone className="w-7 h-7 text-neutral-300" />
          )}
        </div>

        <h2 className="text-lg font-black text-neutral-100 mb-1">Final Payment</h2>
        <p className="text-sm text-neutral-400 mb-4">
          Amount: <span className="font-bold text-neutral-100">{formatKES(amountKes)}</span>
        </p>

        {busy && (
          <div className="mb-4">
            <div className="flex items-center justify-center gap-2 text-xs font-semibold">
              <span className={phase === "initiating" ? "text-neutral-100" : "text-neutral-600"}>
                1 Send prompt
              </span>
              <span className="text-neutral-600">→</span>
              <span className={phase === "waiting" ? "text-neutral-100" : "text-neutral-600"}>
                2 Approve on phone
              </span>
              <span className="text-neutral-600">→</span>
              <span className="text-neutral-600">3 Done</span>
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-neutral-800 overflow-hidden">
              <div
                className="h-full bg-neutral-300 transition-all duration-500"
                style={{ width: phase === "initiating" ? "25%" : "65%" }}
              />
            </div>
            <p className="mt-3 text-xs text-neutral-500 flex items-center justify-center gap-1.5">
              {phase === "initiating" ? (
                <>Sending STK prompt…</>
              ) : (
                <>
                  <PhoneCall className="w-3.5 h-3.5" />
                  Customer enters M-Pesa PIN on their phone
                </>
              )}
            </p>
            <p className="mt-1 text-[11px] text-neutral-600 flex items-center justify-center gap-1">
              <Timer className="w-3.5 h-3.5" />
              Waiting {mm}:{ss}
            </p>
          </div>
        )}

        {phase === "paid" ? (
          <p className="text-emerald-400 text-sm font-bold">Payment confirmed — redirecting…</p>
        ) : phase === "failed" ? (
          <div className="space-y-3">
            <p className="text-red-400 text-sm font-semibold">
              Payment was cancelled or timed out. Please try again.
            </p>
            <button
              onClick={handleRetry}
              className="w-full py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-100 font-bold rounded-xl transition-colors text-sm"
            >
              Retry STK
            </button>
          </div>
        ) : null}

        {busy && (
          <button
            onClick={handleCancel}
            className="mt-4 w-full py-3 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900 text-neutral-300 font-semibold rounded-xl transition-colors text-sm"
          >
            Cancel payment
          </button>
        )}

        <p className="text-[10px] uppercase tracking-widest text-neutral-600 mt-5 font-bold">
          Secure STK Push
        </p>
      </div>
    </div>,
    document.body,
  );
};

export default StkModal;
