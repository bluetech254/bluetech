import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { requestPasswordReset, resetPassword } from '../api/auth';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { KeyRound, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const normalizePhone = (p: string) => {
    let n = p.trim();
    if (n.startsWith('0')) n = n.slice(1);
    if (!n.startsWith('254')) n = '254' + n;
    return n;
  };

  const onRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await requestPasswordReset(normalizePhone(phone));
      toast.success('Reset code sent to your phone.');
      setStep('reset');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to send reset code.');
    } finally {
      setSubmitting(false);
    }
  };

  const onReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await resetPassword(normalizePhone(phone), code.trim(), newPassword);
      toast.success('Password reset successfully!');
      navigate('/login');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Reset failed. Check your code.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <Card className="p-8 space-y-6 bg-white border border-slate-100 shadow-xl">
        <div className="text-center space-y-1">
          <div className="flex justify-center mb-2">
            <KeyRound className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-2xl font-black text-slate-950">Reset Password</h1>
          <p className="text-xs text-slate-500">
            {step === 'request' ? 'Enter your phone number to receive a reset code.' : 'Enter the code sent to your phone and your new password.'}
          </p>
        </div>

        {step === 'request' ? (
          <form onSubmit={onRequest} className="space-y-4">
            <Input
              id="phone"
              label="Phone Number"
              placeholder="07XXXXXXXX"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              required
            />
            <Button type="submit" variant="primary" disabled={submitting} className="w-full py-3.5 font-bold">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}
              {submitting ? 'Sending...' : 'Send Reset Code'}
            </Button>
          </form>
        ) : (
          <form onSubmit={onReset} className="space-y-4">
            <Input
              id="code"
              label="Reset Code"
              placeholder="6-digit code"
              value={code}
              onChange={e => setCode(e.target.value)}
              required
            />
            <Input
              id="new_password"
              label="New Password"
              type="password"
              placeholder="Min 8 chars, uppercase, number, symbol"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
            />
            <Button type="submit" variant="primary" disabled={submitting} className="w-full py-3.5 font-bold">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : null}
              {submitting ? 'Resetting...' : 'Reset Password'}
            </Button>
            <button type="button" onClick={() => setStep('request')} className="w-full text-xs text-slate-500 hover:text-blue-600">
              ← Back
            </button>
          </form>
        )}

        <div className="text-center text-xs text-slate-500 pt-2">
          <Link to="/login" className="text-blue-600 font-semibold hover:underline">Back to Login</Link>
        </div>
      </Card>
    </div>
  );
};

export default ForgotPasswordPage;
