-- Migration 024: Seed default admin account
--
-- Creates the superadmin account used by tests and first-time setup.
-- Password: BlueTech@2026!  (bcrypt, rounds=12)
--
-- To change the admin password after seeding, use the admin panel or run:
--   UPDATE admins SET password = '<new_bcrypt_hash>' WHERE username = 'admin';
--
-- ON CONFLICT DO NOTHING ensures this is idempotent — safe to re-run.

INSERT INTO admins (username, email, full_name, password, role, is_active)
VALUES (
    'admin',
    'admin@bluetechnology.co.ke',
    'BlueTech Admin',
    '$2b$12$0IT6czyQP59OhsEi7GHvi.3.wvMdC713KPAzL4FYAwbLgDe0xZTK.',
    'superadmin',
    TRUE
)
ON CONFLICT (username) DO NOTHING;
