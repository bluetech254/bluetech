-- Migration 027: Add internal_notes column to bookings table
-- Used by admin to store private repair notes not visible to the customer.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS internal_notes TEXT;
