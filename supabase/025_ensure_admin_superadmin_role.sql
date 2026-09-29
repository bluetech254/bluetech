-- Migration 025: Ensure default admin has superadmin role
--
-- The 024_seed_admin.sql used ON CONFLICT DO NOTHING, so if an 'admin' row
-- already existed (e.g. inserted with the default role='admin'), the role
-- was never updated to 'superadmin'. This migration corrects that.

UPDATE admins
SET role = 'superadmin'
WHERE username = 'admin'
  AND role != 'superadmin';
