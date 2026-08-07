import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { getMpesaPaymentStatus } from '../../api/orders';
import { Loader2, CheckCircle2, XCircle, Smartphone } from 'lucide-react';
import Button from '../common/Button';

interface Props {
  orderId: string;
  phone: string;
  amount: string;
  onCancel: () => void;
}

type Status = 'waiting' | 'paid' | 'failed';

const MpesaWaitingModal = ({ orderId, phone, amount, onCancel }: Props) => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('waiting');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Lock body scroll while modal is open
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    intervalRef.current = setInterval(async () => {
      try {
        const data = await getMpesaPaymentStatus(orderId);
        if (data.payment_status === 'paid') {
          setStatus('paid');
          clearInterval(intervalRef.current!);
          setTimeout(() => navigate(`/order-success/${orderId}`), 1500);
        } else if (data.payment_status === 'failed') {
          setStatus('failed');
          clearInterval(intervalRef.current!);
        }
      } catch {}
    }, 3000);

    return () => clearInterval(intervalRef.current!);
  }, [orderId, navigate]);

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', padding: '16px' }}>
      <div style={{ background: '#fff', borderRadius: '1rem', padding: '2rem', width: '100%', maxWidth: '360px', textAlign: 'center', boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }}>
        {status === 'waiting' && (
          <>
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center">
                <Smartphone className="w-8 h-8 text-green-600" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Check Your Phone</h2>
              <p className="text-sm text-slate-500 mt-1">
                An M-Pesa prompt has been sent to <span className="font-bold text-slate-700">{phone}</span>
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Enter your PIN to pay <span className="font-bold text-green-600">{amount}</span>
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              Waiting for payment confirmation...
            </div>
            <button onClick={onCancel} className="text-xs text-slate-400 hover:text-slate-600 underline cursor-pointer">
              Cancel
            </button>
          </>
        )}

        {status === 'paid' && (
          <>
            <div className="flex justify-center">
              <CheckCircle2 className="w-16 h-16 text-green-500" />
            </div>
            <h2 className="text-lg font-black text-green-700">Payment Confirmed!</h2>
            <p className="text-sm text-slate-500">Redirecting to your order...</p>
          </>
        )}

        {status === 'failed' && (
          <>
            <div className="flex justify-center">
              <XCircle className="w-16 h-16 text-red-500" />
            </div>
            <h2 className="text-lg font-black text-red-700">Payment Failed</h2>
            <p className="text-sm text-slate-500">You cancelled or the request timed out.</p>
            <Button variant="primary" onClick={onCancel} className="w-full">
              Try Again
            </Button>
          </>
        )}
      </div>
    </div>,
    document.body
  );
};

export default MpesaWaitingModal;
