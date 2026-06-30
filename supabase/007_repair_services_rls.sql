-- Enable RLS on repair_services table
ALTER TABLE repair_services ENABLE ROW LEVEL SECURITY;

-- Allow public to view active repair services
CREATE POLICY "Anyone can view active repair services"
ON repair_services FOR SELECT
USING (is_active = true);

-- Allow admins to manage repair services (for now, allow all operations for testing)
CREATE POLICY "Service management policy"
ON repair_services FOR ALL
USING (true)
WITH CHECK (true);
