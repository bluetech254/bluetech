import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { verifyPhone, resendVerification } from '../api/auth';
import Button from '../components/common/Button';
import { ShieldCheck, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthShell from '../components/common/AuthShell';

const VerifyPhonePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const phone = (location.state as any)?.phone || '';
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [submitting, setSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0 || !phone) return;
    try {
      await resendVerification(phone);
      toast.success('Code resent to your phone.');
      setCooldown(30);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to resend code.');
    }
  };

  const handleChange = (i: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    if (val && i < 5) inputs.current[i + 1]?.focus();
    if (val && i === 5) submitCode(next.join(''));
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const next = pasted.split('');
      setDigits(next);
      inputs.current[5]?.focus();
      submitCode(pasted);
    }
  };

  const submitCode = async (code: string) => {
    if (code.length < 6 || submitting) return;
    setSubmitting(true);
    try {
      await verifyPhone(phone, code);
      toast.success('Phone verified! Please log in to continue.');
      navigate('/login', { replace: true });
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Verification failed.');
      setDigits(['', '', '', '', '', '']);
      inputs.current[0]?.focus();
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    submitCode(digits.join(''));
  };

  return (
    <AuthShell>
      <div className="space-y-6">
        <div className="text-center space-y-1">
          <div className="flex justify-center mb-2">
            <ShieldCheck className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-2xl font-black text-slate-950">Verify Phone</h1>
          <p className="text-xs text-slate-500">
            A 6-digit code was sent to{' '}
            <span className="font-semibold text-slate-700">{phone}</span>
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="flex justify-center gap-3">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={el => { inputs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                onPaste={handlePaste}
                className={`w-11 h-14 text-center text-xl font-bold rounded-xl border-2 outline-none transition-all
                  ${d ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-50 text-slate-900'}
                  focus:border-blue-500 focus:ring-2 focus:ring-blue-100`}
              />
            ))}
          </div>

          <Button type="submit" variant="primary" disabled={submitting || digits.join('').length < 6} className="w-full py-3.5 font-bold">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}
            {submitting ? 'Verifying...' : 'Verify & Continue'}
          </Button>
        </form>

      </div>
    </AuthShell>
  );
};

export default VerifyPhonePage;
