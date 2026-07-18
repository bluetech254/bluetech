import React, { useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../hooks/useAuth';
import { loginSchema } from '../utils/validation';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export const LoginPage = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const from = (location.state as any)?.from?.pathname || '/profile';

  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true });
  }, [isAuthenticated, navigate, from]);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone_number: '', password: '' }
  });

  const onSubmit = async (formData: any) => {
    setSubmitting(true);
    const toastId = toast.loading('Authenticating credentials...');
    try {
      let phoneNumber = formData.phone_number.trim();
      if (phoneNumber.startsWith('0')) phoneNumber = phoneNumber.substring(1);
      if (!phoneNumber.startsWith('254')) phoneNumber = '254' + phoneNumber;
      await login(phoneNumber, formData.password);
      toast.success('Successfully logged in!', { id: toastId });
    } catch (err: any) {
      if (err.message === 'unverified') {
        toast.dismiss(toastId);
        navigate('/verify-phone', { state: { phone: err.phone } });
        return;
      }
      const detail = err.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : Array.isArray(detail) ? detail[0]?.msg : err.response?.data?.message || 'Invalid phone number or password.';
      toast.error(msg, { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4 animate-fade-in">
      <div className="space-y-6 text-left">

        {/* Title */}
        <div className="text-center space-y-1">
          <span className="text-xl font-black tracking-tight text-slate-900 block">
            Blue<span className="text-blue-600">Tech</span> Portal
          </span>
          <h1 className="text-2xl font-black text-slate-950 tracking-tight">Sign In</h1>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Log in to sync your repair status updates, checkout faster, and track historical receipts.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <Input
            id="phone_number"
            label="Phone Number"
            type="text"
            placeholder="07XXXXXXXX or 7XXXXXXXX"
            error={errors.phone_number?.message}
            {...register('phone_number')}
          />

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label htmlFor="password" className="text-xs font-semibold text-slate-700">Password</label>
              <Link to="/forgot-password" className="text-[11px] text-slate-400 font-semibold hover:text-blue-600 hover:underline">Forgot?</Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                error={errors.password?.message}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            disabled={submitting}
            className="w-full py-3.5 font-bold uppercase text-xs tracking-wider flex items-center justify-center space-x-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{submitting ? 'Signing In...' : 'Login'}</span>
          </Button>
        </form>

        <div className="border-t border-slate-100 pt-4 text-center">
          <p className="text-xs text-slate-500 font-medium">
            Don't have an online account yet?{' '}
            <Link to="/register" className="font-extrabold text-blue-600 hover:text-blue-700 hover:underline">Create Account</Link>
          </p>
          <p className="text-[11px] text-slate-400 mt-2">
            By signing in, you agree to our{' '}
            <Link to="/privacy-policy" className="hover:text-blue-600 hover:underline">Privacy Policy</Link>.
          </p>
        </div>



      </div>
    </div>
  );
};

export default LoginPage;
