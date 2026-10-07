/**
 * components/cart/PaystackModal.tsx
 *
 * Inline payment modal that uses the Paystack popup SDK.
 * Opens the Paystack popup over the current page — no redirect, no new tab.
 *
 * Flow:
 *  1. Modal mounts → "Pay Now" button shown
 *  2. User clicks → Paystack popup opens on top of the page
 *  3. User picks M-Pesa / card → pays → popup closes
 *  4. onSuccess(reference) called → parent verifies with backend → navigates
 *  5. If user closes popup without paying → onDismiss() called
 */

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CreditCard, Loader2, CheckCircle2, XCircle, X } from 'lucide-react';
import { usePaystack } from '../../hooks/usePaystack';
import { formatCurrency } from '../../utils/formatters';

interface Props {
  /** Displayed amount label */
  amountKes: number;
  /** Customer email — used by Paystack for receipt */
  email: string;
  /** Pre-generated reference from backend */
  reference: string;
  /** Contextual label e.g. "Order payment" or "Commitment fee" */
  label: string;
  /** Called with the Paystack reference after the popup reports success */
  onSuccess: (reference: string) => void;
  /** Called when user dismisses the popup without paying */
  onDismiss: () => void;
  /** Called to close the entire modal without paying */
  onCancel: () => void;
  /** Set by parent after backend verification is done */
  verifyStatus?: 'idle' | 'verifying' | 'paid' | 'failed';
}

const PaystackModal = ({
  amountKes,
  email,
  reference,
  label,
  onSuccess,
  onDismiss,
  onCancel,
  verifyStatus = 'idle',
}: Props) => {
  const { pay, loading: popupLoading } = usePaystack();

  // Lock body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handlePay = () => {
    pay({
      email,
      amountKes,
      reference,
      metadata: { label },
      onSuccess,
      onClose: onDismiss,
    });
  };

  const isProcessing = popupLoading || verifyStatus === 'verifying';

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
        padding: '16px',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div style={{
        background: '#fff', borderRadius: '1rem', padding: '1.75rem',
        width: '100%', maxWidth: '360px', textAlign: 'center',
        boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
      }}>
        {/* Close button */}
        {verifyStatus !== 'paid' && (
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 text-slate-300 hover:text-slate-500"
            style={{ position: 'absolute', top: '1rem', right: '1rem' }}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* ── Idle / ready to pay ── */}
        {(verifyStatus === 'idle' || verifyStatus === 'verifying') && (
          <>
            <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              {isProcessing
                ? <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
                : <CreditCard className="w-7 h-7 text-blue-600" />
              }
            </div>

            <h2 className="text-lg font-black text-slate-900 mb-1">{label}</h2>
            <p className="text-sm text-slate-500 mb-1">
              Amount: <span className="font-bold text-slate-800">{formatCurrency(amountKes)}</span>
            </p>
            <p className="text-xs text-slate-400 mb-5">
              Pay securely via M-Pesa, Visa, or Mastercard inside the popup.
            </p>

            {verifyStatus === 'idle' && !popupLoading && (
              <button
                onClick={handlePay}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors text-sm mb-3"
              >
                Pay {formatCurrency(amountKes)}
              </button>
            )}

            {isProcessing && (
              <div className="flex items-center justify-center gap-2 text-xs text-slate-400 py-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {popupLoading ? 'Opening payment window…' : 'Verifying payment…'}
              </div>
            )}

            {!isProcessing && (
              <button
                onClick={onCancel}
                className="text-xs text-slate-400 hover:text-slate-600 underline"
              >
                Cancel
              </button>
            )}
          </>
        )}

        {/* ── Paid ── */}
        {verifyStatus === 'paid' && (
          <>
            <div className="flex justify-center mb-3">
              <CheckCircle2 className="w-16 h-16 text-green-500" />
            </div>
            <h2 className="text-lg font-black text-green-700 mb-1">Payment Confirmed!</h2>
            <p className="text-sm text-slate-500">Redirecting…</p>
          </>
        )}

        {/* ── Failed ── */}
        {verifyStatus === 'failed' && (
          <>
            <div className="flex justify-center mb-3">
              <XCircle className="w-16 h-16 text-red-500" />
            </div>
            <h2 className="text-lg font-black text-red-700 mb-1">Payment Failed</h2>
            <p className="text-sm text-slate-500 mb-4">
              The payment could not be verified. You can try again.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handlePay}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors text-sm"
              >
                Try Again
              </button>
              <button
                onClick={onCancel}
                className="flex-1 py-3 border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 text-sm"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
};

export default PaystackModal;
