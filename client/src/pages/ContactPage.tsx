import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { contactSchema } from '../utils/validation';
import Input from '../components/common/Input';
import Select from '../components/common/Select';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import { Mail, Phone, MapPin, Clock, Send, AlertCircle, Sparkles, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';

export const ContactPage = () => {
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      subject: '',
      message: '',
    }
  });

  const onSubmit = async (formData: any) => {
    setSubmitting(true);
    const toastId = toast.loading('Sending your message...');
    try {
      await api.post('/contact', formData);
      toast.success('Your message has been sent! Our coordinators will reply within 24 hours.', { id: toastId });
      reset();
    } catch {
      toast.error('Failed to send message. Please try again.', { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 py-6 animate-fade-in text-left">
      {/* Upper Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1.5">
          Contact Our Workshop
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Have a question about gadget stocks, custom repair schedules, or commercial accounts? Reach out directly!
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Direct Coordinates (1 Column) */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Information coordinates */}
          <Card className="p-6 space-y-6">
            <h3 className="font-extrabold text-slate-950 text-base border-b border-slate-50 pb-3 text-xs text-slate-400">
              Direct Coordinates
            </h3>

            <div className="space-y-4 text-sm text-slate-600">
              {/* Phone */}
              <div className="flex items-start space-x-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-inner">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-xs">Phone / WhatsApp</p>
                  <a href="tel:+254707454182" className="font-semibold text-slate-700 mt-0.5 text-xs sm:text-sm hover:text-blue-600 block">+254 707 454 182</a>
                  <a href="https://wa.me/254707454182" target="_blank" rel="noopener noreferrer" className="text-xs text-green-600 font-bold hover:underline">Chat on WhatsApp →</a>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start space-x-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-inner">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-xs">Email</p>
                  <a href="mailto:bluetechnology58@gmail.com" className="font-semibold text-slate-700 mt-0.5 text-xs sm:text-sm hover:text-blue-600 block">bluetechnology58@gmail.com</a>
                </div>
              </div>

              {/* Physical Shop */}
              <div className="flex items-start space-x-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-inner">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-xs">Location</p>
                  <p className="font-semibold text-slate-700 leading-relaxed mt-0.5 text-xs sm:text-sm">
                    1KM behind Kenyatta University,<br />
                    Nairobi, Kenya
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Opening hours table */}
          <Card className="p-6 space-y-4">
            <h3 className="font-extrabold text-slate-950 text-base border-b border-slate-50 pb-3 text-xs text-slate-400 flex items-center">
              <Clock className="w-4 h-4 mr-1.5 text-blue-600" />
              Opening Hours
            </h3>

            <div className="space-y-2.5 text-xs font-semibold text-slate-600">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span>Monday - Friday</span>
                <span className="text-slate-900">08:00 AM - 06:30 PM</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span>Saturday</span>
                <span className="text-slate-900">09:00 AM - 05:00 PM</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Sundays & Holidays</span>
                <span className="text-red-500 font-bold">Closed (Online only)</span>
              </div>
            </div>
          </Card>

          {/* Social Media */}
          <Card className="p-6 space-y-4">
            <h3 className="font-extrabold border-b border-slate-50 pb-3 text-xs text-slate-400">
              Follow & Connect
            </h3>
            <div className="space-y-2.5 text-xs">
              {[
                { label: 'WhatsApp',    href: 'https://wa.me/254707454182',                              color: 'text-green-600' },
                { label: 'Instagram',   href: 'https://www.instagram.com/fixitbluetechnology58',         color: 'text-pink-600' },
                { label: 'Facebook',    href: 'https://www.facebook.com/share/1HLEwcEx22/',              color: 'text-blue-700' },
                { label: 'YouTube',     href: 'https://www.youtube.com/@BlueTechnology58',               color: 'text-red-600' },
                { label: 'TikTok',      href: 'https://www.tiktok.com/@fixitbluetechnology58',           color: 'text-slate-900' },
                { label: 'Threads',     href: 'https://www.threads.com/@fixitbluetechnology58',          color: 'text-slate-700' },
                { label: 'Google Maps', href: 'https://share.google/iKWWoeTxXsnOqGA9U',                 color: 'text-yellow-600' },
              ].map(s => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                  className={`flex items-center justify-between font-semibold hover:underline ${s.color}`}>
                  <span>{s.label}</span>
                  <span className="text-slate-400">→</span>
                </a>
              ))}
            </div>
          </Card>

        </div>

        {/* Right Column: Submission Form (2 Columns) */}
        <div className="lg:col-span-2">
          <Card className="p-6 md:p-8 space-y-6 bg-white">
            <div className="border-b border-slate-50 pb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center">
                <Send className="w-5 h-5 text-blue-600 mr-2" />
                Send us a Message
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Fill out the fields below and our tech engineers will analyze and revert back.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  id="name"
                  label="Your Full Name (required)"
                  placeholder="e.g. Dennis Mutua"
                  error={errors.name?.message}
                  {...register('name')}
                />
                
                <Input
                  id="email"
                  label="Your Email Address (required)"
                  type="email"
                  placeholder="e.g. dennis@example.com"
                  error={errors.email?.message}
                  {...register('email')}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  id="phone"
                  label="Contact Phone (required)"
                  placeholder="Format: 2547XXXXXXXX"
                  error={errors.phone?.message}
                  {...register('phone')}
                />
                
                <Select
                  id="subject"
                  label="Message Subject (required)"
                  placeholder="-- Choose Subject --"
                  options={[
                    { value: 'Product Query', label: 'Gadget/Spare stock availability' },
                    { value: 'Custom Repair Inquiry', label: 'Specialized micro-repair diagnostic' },
                    { value: 'Order Dispatch Delay', label: 'Purchase order delivery shipment follow-up' },
                    { value: 'Other', label: 'General partnership/corporate inquiry' },
                  ]}
                  error={errors.subject?.message}
                  {...register('subject')}
                />
              </div>

              <div className="text-left">
                <label htmlFor="message" className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Your message content (required)
                </label>
                <textarea
                  id="message"
                  rows={5}
                  placeholder="Tell us what you need in detail. If asking about a repair, describe the device symptoms..."
                  className={`
                    w-full py-3 px-4 border-2 rounded-lg outline-none transition-all duration-200 text-sm bg-white
                    ${errors.message ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'}
                  `}
                  {...register('message')}
                />
                {errors.message && (
                  <div className="flex items-center text-red-600 text-xs mt-1.5 space-x-1">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errors.message.message}</span>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={submitting}
                className="w-full py-4 text-xs font-bold uppercase tracking-wider"
                rightIcon={<Send className="w-4 h-4" />}
              >
                {submitting ? 'Sending Message...' : 'Send Inquiry Message'}
              </Button>

            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
