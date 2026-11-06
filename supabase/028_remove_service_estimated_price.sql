-- 028: Remove estimated price column from repair services
-- No service price should be shown to clients.
-- Public price endpoint (GET /devices/services/{id}/price) has been removed in code.
-- This migration drops the underlying column. Service_pricing (admin-only brand/model
-- overrides) is kept for internal admin use; if unused it can be dropped separately.
-- Run only after confirming admin Services page no longer references base_price.
ALTER TABLE repair_services DROP COLUMN IF EXISTS base_price;
