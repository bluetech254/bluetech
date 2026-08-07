-- Device brands table
CREATE TABLE IF NOT EXISTS device_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  device_type TEXT NOT NULL DEFAULT 'multi',
  country_of_origin TEXT,
  is_popular BOOLEAN DEFAULT false,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Device models table
CREATE TABLE IF NOT EXISTS device_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES device_brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  device_type TEXT NOT NULL,
  release_year INT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(brand_id, name)
);

-- Service pricing table (smart fallback: model > brand > service default)
CREATE TABLE IF NOT EXISTS service_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES device_brands(id) ON DELETE CASCADE,
  model_id UUID REFERENCES device_models(id) ON DELETE CASCADE,
  price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(service_id, brand_id, model_id)
);

-- RLS: public read
ALTER TABLE device_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read brands" ON device_brands FOR SELECT USING (true);
CREATE POLICY "public read models" ON device_models FOR SELECT USING (true);
CREATE POLICY "public read pricing" ON service_pricing FOR SELECT USING (true);
