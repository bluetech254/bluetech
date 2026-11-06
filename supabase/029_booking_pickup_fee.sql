-- 029: Flat pickup fee for pickup bookings (dropoff = 0, pickup = 200)
-- Clients pay service (estimated/final set by admin) + pickup fee for pickup bookings.
-- Estimated/final costs remain admin-set only; never from service catalog.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS pickup_fee NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Backfill existing pickup bookings with 200
UPDATE bookings SET pickup_fee = 200 WHERE fulfillment_type = 'pickup' AND (pickup_fee IS NULL OR pickup_fee = 0);

-- Ensure dropoff bookings have no pickup fee
UPDATE bookings SET pickup_fee = 0 WHERE fulfillment_type = 'dropoff' AND pickup_fee <> 0;

-- Enforce pickup bookings have an address
-- (Application-level validation is primary; DB check guards direct writes)
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_pickup_address_check;
ALTER TABLE bookings
  ADD CONSTRAINT bookings_pickup_address_check
  CHECK (fulfillment_type <> 'pickup' OR (pickup_address IS NOT NULL AND length(trim(pickup_address)) >= 10));

CREATE INDEX IF NOT EXISTS idx_bookings_pickup_fee ON bookings (pickup_fee);
