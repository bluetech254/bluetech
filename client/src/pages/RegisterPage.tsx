import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerUser } from '../api/auth';
import { registerSchema } from '../utils/validation';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import { UserPlus, Sparkles, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export const RegisterPage = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      full_name: '',
      email: '',
      phone_number: '',
      password: '',
      confirm_password: '',
    }
  });

  const onSubmit = async (formData: any) => {
    setSubmitting(true);
    const toastId = toast.loading('Creating your online client account...');

    try {
      // Normalize phone number: remove leading 0 if present, add 254 prefix
      let phoneNumber = formData.phone_number.trim();
      if (phoneNumber.startsWith('0')) {
        phoneNumber = phoneNumber.substring(1);
      }
      if (!phoneNumber.startsWith('254')) {
        phoneNumber = '254' + phoneNumber;
      }

      await registerUser({
        full_name: formData.full_name,
        email: formData.email,
        phone_number: phoneNumber,
        password: formData.password,
      });

      toast.success('Account created successfully! Please sign in.', { id: toastId });
      navigate('/login');
    } catch (err: any) {
      console.error('Failed registration submit:', err);
      const msg = err.response?.data?.message || 'Failed to complete registration. Email or Phone might be already registered.';
      toast.error(msg, { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-10 px-4 animate-fade-in">
      <Card className="p-8 space-y-6 bg-white border border-slate-100 shadow-xl text-left relative">
        
        {/* Floating Icon Accent */}
        <div className="absolute top-0 right-0 -mt-2 -mr-2 bg-blue-100 text-blue-700 p-2.5 rounded-full shadow-inner pointer-events-none">
          <UserPlus className="w-5 h-5" />
        </div>

        {/* Header Title */}
        <div className="text-center space-y-1">
          <span className="text-xl font-black tracking-tight text-slate-900 block">
            Blue<span className="text-blue-600">Tech</span> Portal
          </span>
          <h1 className="text-2xl font-black text-slate-950 tracking-tight">
            Create Client Account
          </h1>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Create an account to book repairs, view historic checkout listings, and track workshop diagnostics.
          </p>
        </div>

        {/* Form elements */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
          
          <Input
            id="full_name"
            label="Full Name"
            placeholder="e.g. Dennis Mutua"
            error={errors.full_name?.message}
            {...register('full_name')}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="email"
              label="Email Address"
              type="email"
              placeholder="e.g. dennis@example.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              id="phone_number"
              label="Phone Number"
              placeholder="07XXXXXXXX or 7XXXXXXXX"
              error={errors.phone_number?.message}
              {...register('phone_number')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative">
              <Input
                id="password"
                label="Password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                error={errors.password?.message}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <div className="relative">
              <Input
                id="confirm_password"
                label="Confirm Password"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="••••••••"
                error={errors.confirm_password?.message}
                {...register('confirm_password')}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-9 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={submitting}
            variant="primary"
            className="w-full py-3.5 font-bold uppercase text-xs tracking-wider"
          >
            {submitting ? 'Registering Account...' : 'Submit registration'}
          </Button>

        </form>

        {/* Divider & Switch link */}
        <div className="border-t border-slate-100 pt-4 text-center">
          <p className="text-xs text-slate-500 font-medium">
            Already registered with us?{' '}
            <Link to="/login" className="font-extrabold text-blue-600 hover:text-blue-700 hover:underline">
              Access Account
            </Link>
          </p>
        </div>

      </Card>
    </div>
  );
};

export default RegisterPage;
