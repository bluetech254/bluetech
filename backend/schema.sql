-- BlueTech PostgreSQL Schema
-- Production-ready schema for PostgreSQL backend
-- This combines all Supabase migrations into a single PostgreSQL schema

-- Note: RLS (Row Level Security) policies are Supabase-specific
-- PostgreSQL uses standard database permissions instead
-- Adjust authentication/authorization as needed for your infrastructure

-- ========================================================================
-- EXTENSIONS
-- ========================================================================

-- uuid-ossp and pgcrypto are not available on all cPanel installs.
-- PostgreSQL 13+ has gen_random_uuid() built-in — no extension needed.

-- ========================================================================
-- ENUMS
-- ========================================================================

DO $$ BEGIN
    CREATE TYPE booking_fulfillment_type AS ENUM ('dropoff', 'pickup');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE booking_status AS ENUM (
        'pending', 'confirmed', 'picked_up', 'in_diagnosis',
        'in_repair', 'ready', 'completed', 'cancelled'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE order_status AS ENUM (
        'pending', 'confirmed', 'processing', 'dispatched', 'delivered', 'cancelled'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('unpaid', 'pending', 'paid', 'failed', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE admin_role AS ENUM ('admin', 'superadmin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ========================================================================
-- USERS TABLE
-- ========================================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password VARCHAR(255),                    -- hashed password (bcrypt)
    is_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    email_verified BOOLEAN DEFAULT FALSE,
    verification_code VARCHAR(255),           -- OTP hash for verification
    otp_expires_at TIMESTAMP WITH TIME ZONE,
    referral_code VARCHAR(20) UNIQUE,         -- unique code for referrals
    referred_by UUID REFERENCES users(id) ON DELETE SET NULL,
    points INTEGER DEFAULT 0,                 -- loyalty points
    account_locked BOOLEAN DEFAULT FALSE,
    lockout_expires_at TIMESTAMP WITH TIME ZONE,
    failed_login_attempts INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_referral_code ON users(referral_code);
CREATE INDEX idx_users_referred_by ON users(referred_by);

-- ========================================================================
-- PRODUCTS TABLE
-- ========================================================================

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    price DECIMAL(12,2) NOT NULL,
    stock_quantity INTEGER DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 10,
    specifications JSONB,
    image_url VARCHAR(512),
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    is_new BOOLEAN DEFAULT FALSE,
    is_bestseller BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_featured ON products(is_featured);

-- ========================================================================
-- DELIVERY ZONES TABLE
-- ========================================================================

CREATE TABLE IF NOT EXISTS delivery_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_name VARCHAR(100) UNIQUE NOT NULL,
    delivery_fee DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed delivery zones
INSERT INTO delivery_zones (zone_name, delivery_fee, is_active) VALUES
    ('Nairobi CBD', 200.00, TRUE),
    ('Westlands / Parklands', 250.00, TRUE),
    ('Kilimani / Ngong Road', 300.00, TRUE),
    ('Thika / Kiambu Outskirts', 450.00, TRUE),
    ('Mombasa / Kisumu / Upcountry', 600.00, TRUE)
ON CONFLICT (zone_name) DO NOTHING;

-- ========================================================================
-- ORDERS TABLE
-- ========================================================================

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    delivery_address TEXT NOT NULL,
    delivery_zone VARCHAR(100) NOT NULL,
    delivery_fee DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    status order_status DEFAULT 'pending',
    payment_method VARCHAR(50) DEFAULT 'cash_on_delivery',
    payment_status payment_status DEFAULT 'unpaid',
    payment_reference VARCHAR(255),
    mpesa_phone VARCHAR(20),
    paystack_reference VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_orders_phone ON orders(phone_number);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- ========================================================================
-- ORDER ITEMS TABLE
-- ========================================================================

CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_title VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    total_price DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);

-- ========================================================================
-- REPAIR SERVICES TABLE
-- ========================================================================

CREATE TABLE IF NOT EXISTS repair_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name VARCHAR(255) NOT NULL,
    service_category VARCHAR(100) NOT NULL,
    description TEXT,
    base_price DECIMAL(12,2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_services_active ON repair_services(is_active);
CREATE INDEX idx_services_category ON repair_services(service_category);

-- ========================================================================
-- BOOKINGS (REPAIR REQUESTS) TABLE
-- ========================================================================

CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    device_type VARCHAR(50) NOT NULL,
    device_model VARCHAR(100),
    issue_description TEXT NOT NULL,
    fulfillment_type booking_fulfillment_type NOT NULL,
    pickup_address TEXT,
    status booking_status DEFAULT 'pending',
    estimated_cost DECIMAL(12,2),
    final_cost DECIMAL(12,2),
    commitment_fee DECIMAL(12,2),                -- deposit/commitment fee
    payment_status payment_status DEFAULT 'unpaid',
    mpesa_phone VARCHAR(20),
    paystack_reference VARCHAR(255),
    notes TEXT,
    internal_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_bookings_phone ON bookings(phone_number);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_created_at ON bookings(created_at);

-- ========================================================================
-- DEVICE BRANDS AND MODELS (for service pricing)
-- ========================================================================

CREATE TABLE IF NOT EXISTS device_brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    device_type VARCHAR(50) NOT NULL,          -- e.g., 'phone', 'laptop', 'tablet'
    is_popular BOOLEAN DEFAULT FALSE,
    logo_url VARCHAR(512),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_brands_active ON device_brands(is_active);
CREATE INDEX idx_brands_device_type ON device_brands(device_type);

CREATE TABLE IF NOT EXISTS device_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES device_brands(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    device_type VARCHAR(50) NOT NULL,
    release_year INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_models_brand ON device_models(brand_id);
CREATE INDEX idx_models_active ON device_models(is_active);
CREATE INDEX idx_models_device_type ON device_models(device_type);

CREATE TABLE IF NOT EXISTS service_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES repair_services(id) ON DELETE CASCADE,
    device_model_id UUID NOT NULL REFERENCES device_models(id) ON DELETE CASCADE,
    price DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_service_pricing_service ON service_pricing(service_id);
CREATE INDEX idx_service_pricing_device_model ON service_pricing(device_model_id);

-- ========================================================================
-- ADMINS TABLE
-- ========================================================================

CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL DEFAULT '',
    email VARCHAR(255),
    password VARCHAR(255) NOT NULL,            -- hashed password (bcrypt)
    role admin_role DEFAULT 'admin',
    is_active BOOLEAN DEFAULT TRUE,
    account_locked BOOLEAN DEFAULT FALSE,
    lockout_expires_at TIMESTAMP WITH TIME ZONE,
    failed_login_attempts INTEGER DEFAULT 0,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_admins_username ON admins(username);
CREATE INDEX idx_admins_active ON admins(is_active);

-- ========================================================================
-- LOYALTY POINTS LEDGER
-- ========================================================================

CREATE TABLE IF NOT EXISTS points_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    points INTEGER NOT NULL,                   -- can be negative for deductions
    type VARCHAR(50) NOT NULL,                 -- e.g., 'signup_bonus', 'purchase', 'referral_signup', 'referral_purchase', 'redemption'
    description VARCHAR(255),
    related_id UUID,                            -- reference to order_id or booking_id
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_points_ledger_user ON points_ledger(user_id);
CREATE INDEX idx_points_ledger_created_at ON points_ledger(created_at);

-- ========================================================================
-- CONTACT MESSAGES
-- ========================================================================

CREATE TABLE IF NOT EXISTS contact_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_contact_messages_email ON contact_messages(email);
CREATE INDEX idx_contact_messages_created_at ON contact_messages(created_at);

-- ========================================================================
-- AUDIT LOG
-- ========================================================================

CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    table_name VARCHAR(100),
    record_id VARCHAR(255),
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent VARCHAR(512),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_log_admin ON audit_log(admin_id);
CREATE INDEX idx_audit_log_table ON audit_log(table_name);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

-- ========================================================================
-- PRODUCT SECTIONS
-- ========================================================================

CREATE TABLE IF NOT EXISTS product_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    display_order INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS section_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES product_sections(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    display_order INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_section_products_section ON section_products(section_id);
CREATE INDEX idx_section_products_product ON section_products(product_id);

-- ========================================================================
-- CREATED_AT AND UPDATED_AT TIMESTAMP TRIGGERS
-- ========================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at_trigger
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER products_updated_at_trigger
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER delivery_zones_updated_at_trigger
    BEFORE UPDATE ON delivery_zones
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER orders_updated_at_trigger
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER bookings_updated_at_trigger
    BEFORE UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER device_brands_updated_at_trigger
    BEFORE UPDATE ON device_brands
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER device_models_updated_at_trigger
    BEFORE UPDATE ON device_models
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER repair_services_updated_at_trigger
    BEFORE UPDATE ON repair_services
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER admins_updated_at_trigger
    BEFORE UPDATE ON admins
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER product_sections_updated_at_trigger
    BEFORE UPDATE ON product_sections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================================================
-- SCHEMA VERIFICATION QUERY
-- ========================================================================
-- Run this to verify all tables are created:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
--
-- Expected 16 tables:
-- admins
-- audit_log
-- bookings
-- contact_messages
-- delivery_zones
-- device_brands
-- device_models
-- order_items
-- orders
-- points_ledger
-- product_sections
-- products
-- repair_services
-- section_products
-- service_pricing
-- users
