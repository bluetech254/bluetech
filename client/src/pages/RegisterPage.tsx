import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerUser } from '../api/auth';
import { registerSchema } from '../utils/validation';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import AuthShell from '../components/common/AuthShell';
import { normalizePhone } from '../utils/phone';

export const RegisterPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const refFromUrl = searchParams.get('ref') || '';

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      full_name: '',
      email: '',
      phone_number: '',
      password: '',
      confirm_password: '',
      referral_code: refFromUrl,
    }
  });

  useEffect(() => {
    if (refFromUrl) setValue('referral_code', refFromUrl);
  }, [refFromUrl, setValue]);

  const onSubmit = async (formData: any) => {
    setSubmitting(true);
    const toastId = toast.loading('Creating your online client account...');

    try {
      const phoneNumber = normalizePhone(formData.phone_number);

      await registerUser({
        full_name: formData.full_name,
        email: formData.email,
        phone_number: phoneNumber,
        password: formData.password,
        referral_code: formData.referral_code || undefined,
      });

      toast.success('Account created! Check your phone for a verification code.', { id: toastId });
      navigate('/verify-phone', { state: { phone: phoneNumber } });
    } catch (err: any) {
      console.error('Failed registration submit:', err);
      const msg = err.response?.data?.message || 'Failed to complete registration. Email or Phone might be already registered.';
      toast.error(msg, { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell>
      <div className="space-y-3 text-left">

        {/* Header Title */}
        <div className="text-center space-y-0.5 -mt-12 sm:mt-0">
          <span className="text-base font-black tracking-tight text-slate-900 block">
            Blue<span className="text-blue-600">Tech</span> Portal
          </span>
          <h1 className="text-lg font-black text-slate-950 tracking-tight">Create Client Account</h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2.5">
          <Input id="full_name" label="Full Name" placeholder="e.g. Dennis Mutua" error={errors.full_name?.message} {...register('full_name')} />

          <div className="grid grid-cols-1 gap-2">
            <Input id="email" label="Email Address" type="email" placeholder="e.g. dennis@example.com" error={errors.email?.message} {...register('email')} />
            <Input id="phone_number" label="Phone Number" placeholder="07XXXXXXXX" error={errors.phone_number?.message} {...register('phone_number')} />
            <Input id="referral_code" label="Referral Code (optional)" placeholder="e.g. BLUE-XXXX" error={errors.referral_code?.message} readOnly={!!refFromUrl} className={refFromUrl ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''} {...register('referral_code')} />
          </div>

          <div className="grid grid-cols-1 gap-2">
            <div className="relative">
              <Input id="password" label="Password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" error={errors.password?.message} {...register('password')} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-8 text-slate-400 hover:text-slate-600 transition-colors">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="relative">
              <Input id="confirm_password" label="Confirm Password" type={showConfirmPassword ? 'text' : 'password'} placeholder="••••••••" error={errors.confirm_password?.message} {...register('confirm_password')} />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-2 top-8 text-slate-400 hover:text-slate-600 transition-colors">
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" disabled={submitting} variant="primary" className="w-full py-2.5 font-bold uppercase text-xs tracking-wider">
            {submitting ? 'Registering Account...' : 'Submit registration'}
          </Button>
        </form>

        <div className="border-t border-slate-100 pt-3 text-center">
          <p className="text-xs text-slate-500 font-medium">
            Already registered with us?{' '}
            <Link to="/login" className="font-extrabold text-blue-600 hover:text-blue-700 hover:underline">Access Account</Link>
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            By registering, you agree to our{' '}
            <Link to="/privacy-policy" className="hover:text-blue-600 hover:underline">Privacy Policy</Link>.
          </p>
        </div>

      </div>
    </AuthShell>
  );
};

export default RegisterPage;
