import { z } from 'zod';
import { PHONE_REGEX } from './phone';

// Register Schema
export const registerSchema = z.object({
  full_name: z.string().min(3, 'Name must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  phone_number: z.string().regex(PHONE_REGEX, 'Invalid phone number (use 07... or 7...)'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string(),
  referral_code: z.string().optional(),
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
});

// Login Schema
export const loginSchema = z.object({
  phone_number: z.string().min(1, 'Phone number is required'),
  password: z.string().min(1, 'Password is required'),
});

// Order Schema
export const orderSchema = z.object({
  customer_name: z.string().min(3, 'Name must be at least 3 characters'),
  phone_number: z.string().regex(PHONE_REGEX, 'Invalid phone number (use 07... or 7...)'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  delivery_address: z.string().min(1, 'Please enter a delivery address'),
  delivery_zone: z.string().min(1, 'Please select a delivery zone'),
  payment_method: z.enum(['mpesa', 'cash_on_delivery', 'points_only']),
  notes: z.string().optional(),
  referral_code: z.string().optional(),
  redeem_points: z.number().int().min(0).optional(),
  terms_accepted: z.boolean().refine((val) => val === true, 'You must accept terms'),
});

// Booking Schema
export const bookingSchema = z.object({
  customer_name: z.string().min(3, 'Name must be at least 3 characters'),
  customer_phone: z.string().regex(PHONE_REGEX, 'Invalid phone number (use 07... or 7...)'),
  customer_email: z.string().email('Invalid email address').optional().or(z.literal('')),
  device_brand: z.string().optional(),
  device_model: z.string().optional(),
  issue_description: z.string().min(10, 'Please provide at least 10 characters'),
  preferred_date: z.string().min(1, 'Please select a date'),
  preferred_time: z.string().min(1, 'Please select a time'),
  notes: z.string().optional(),
  terms_accepted: z.boolean().refine((val) => val === true, 'You must accept terms'),
});

// Contact Form Schema
export const contactSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^254\d{9}$/, 'Invalid phone number format (254XXXXXXXXX)'),
  subject: z.string().min(5, 'Subject must be at least 5 characters'),
  message: z.string().min(20, 'Message must be at least 20 characters'),
});

// Profile Schema
export const profileSchema = z.object({
  full_name: z.string().min(3, 'Name must be at least 3 characters'),
  phone_number: z.string().regex(/^254\d{9}$/, 'Invalid phone number format (254XXXXXXXXX)'),
});

// Password Update Schema
export const passwordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string().min(8, 'New password must be at least 8 characters'),
  new_password_confirm: z.string(),
}).refine((data) => data.new_password === data.new_password_confirm, {
  message: "Passwords don't match",
  path: ["new_password_confirm"],
});

