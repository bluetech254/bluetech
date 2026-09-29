import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { requestPasswordReset, resetPassword } from '../api/auth';
import { forgotPasswordSchema, resetPasswordSchema } from '../utils/validation';
import { normalizePhone } from '../utils/phone';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import AuthShell from '../components/common/AuthShell';
import { KeyRound, Loader2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Step 1 — request reset code ───────────────────────────────────────────────

type RequestForm = { phone_number: string };

const RequestStep = ({ onSuccess }: { onSuccess: (phone: string) => void }) => {
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<RequestForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { phone_number: '' },
  });

  const onSubmit = async ({ phone_number }: RequestForm) => {
    setSubmitting(true);
    try {
      await requestPasswordReset(normalizePhone(phone_number));
      toast.success('Reset code sent to your phone.');
      onSuccess(normalizePhone(phone_number));
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : 'Failed to send reset code.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        id="phone_number"
        label="Phone Number"
        placeholder="07XXXXXXXX"
        error={errors.phone_number?.message}
        {...register('phone_number')}
      />
      <Button type="submit" variant="primary" disabled={submitting} className="w-full py-3.5 font-bold">
        {submitting && <Loader2 className="w-4 h-4 animate-spin inline mr-2" />}
        {submitting ? 'Sending...' : 'Send Reset Code'}
      </Button>
    </form>
  );
};

// ── Step 2 — submit code + new password ───────────────────────────────────────

type ResetForm = { reset_code: string; new_password: string; confirm_password: string };

const ResetStep = ({ phone, onBack }: { phone: string; onBack: () => void }) => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ResetForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { reset_code: '', new_password: '', confirm_password: '' },
  });

  const onSubmit = async ({ reset_code, new_password }: ResetForm) => {
    setSubmitting(true);
    try {
      await resetPassword(phone, reset_code.trim(), new_password);
      toast.success('Password reset successfully!');
      navigate('/login');
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : 'Reset failed. Check your code.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        id="reset_code"
        label="Reset Code"
        placeholder="6-digit code"
        inputMode="numeric"
        error={errors.reset_code?.message}
        {...register('reset_code')}
      />

      <div className="relative">
        <Input
          id="new_password"
          label="New Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Min 8 chars, uppercase, number, symbol"
          error={errors.new_password?.message}
          {...register('new_password')}
        />
        <button
          type="button"
          onClick={() => setShowPassword(p => !p)}
          className="absolute right-3 top-8 text-slate-400 hover:text-slate-600"
        >
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      <div className="relative">
        <Input
          id="confirm_password"
          label="Confirm Password"
          type={showConfirm ? 'text' : 'password'}
          placeholder="••••••••"
          error={errors.confirm_password?.message}
          {...register('confirm_password')}
        />
        <button
          type="button"
          onClick={() => setShowConfirm(p => !p)}
          className="absolute right-3 top-8 text-slate-400 hover:text-slate-600"
        >
          {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      <Button type="submit" variant="primary" disabled={submitting} className="w-full py-3.5 font-bold">
        {submitting && <Loader2 className="w-4 h-4 animate-spin inline mr-2" />}
        {submitting ? 'Resetting...' : 'Reset Password'}
      </Button>
      <button
        type="button"
        onClick={onBack}
        className="w-full text-xs text-slate-500 hover:text-blue-600"
      >
        ← Back
      </button>
    </form>
  );
};

// ── Page shell ────────────────────────────────────────────────────────────────

const ForgotPasswordPage = () => {
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [phone, setPhone] = useState('');

  return (
    <AuthShell>
      <div className="space-y-6">
        <div className="text-center space-y-1">
          <div className="flex justify-center mb-2">
            <KeyRound className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-2xl font-black text-slate-950">Reset Password</h1>
          <p className="text-xs text-slate-500">
            {step === 'request'
              ? 'Enter your phone number to receive a reset code.'
              : 'Enter the code sent to your phone and your new password.'}
          </p>
        </div>

        {step === 'request' ? (
          <RequestStep onSuccess={(p) => { setPhone(p); setStep('reset'); }} />
        ) : (
          <ResetStep phone={phone} onBack={() => setStep('request')} />
        )}

        <div className="text-center text-xs text-slate-500 pt-2">
          <Link to="/login" className="text-blue-600 font-semibold hover:underline">
            Back to Login
          </Link>
        </div>
      </div>
    </AuthShell>
  );
};

export default ForgotPasswordPage;
