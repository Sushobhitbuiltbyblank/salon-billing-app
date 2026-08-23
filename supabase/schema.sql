-- ==============================================================================
-- SALON POS & MANAGEMENT SUITE - SUPABASE POSTGRESQL SCHEMA
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 0. APP USERS (ADMIN & RECEPTIONISTS)
CREATE TABLE IF NOT EXISTS app_users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'receptionist')),
    pin VARCHAR(10) NOT NULL,
    avatar_color VARCHAR(30) DEFAULT '#8b5cf6',
    phone VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1. SALON SETTINGS TABLE
CREATE TABLE IF NOT EXISTS salon_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    salon_name VARCHAR(255) NOT NULL DEFAULT 'Belezia Luxury Hair & Beauty Lounge',
    tagline VARCHAR(255) DEFAULT 'Ultra-Premium Unisex Salon & Spa Experience',
    address TEXT DEFAULT 'Shop 14-16, Galleria Boulevard, Indiranagar, Bengaluru, 560038',
    phone VARCHAR(50) DEFAULT '+91 98765 43210',
    email VARCHAR(100) DEFAULT 'hello@belezia.com',
    gst_number VARCHAR(50) DEFAULT '29ABCDE1234F1Z5',
    currency_symbol VARCHAR(10) DEFAULT '₹',
    currency_code VARCHAR(10) DEFAULT 'INR',
    upi_id VARCHAR(100) DEFAULT 'belezia@okaxis',
    google_review_url TEXT DEFAULT 'https://g.page/r/CbGd_cwnL9zrEBM/review',
    instagram_url TEXT DEFAULT 'https://www.instagram.com/beleziasalonlaxminagar?igsi=MTI0ZG85dGRvdTl6aQ%3D%3D&utm_source=qr',
    thermal_width VARCHAR(10) DEFAULT '80mm', -- '80mm' or '58mm'
    tax_rate NUMERIC(5, 2) DEFAULT 18.00, -- GST percentage
    tax_enabled BOOLEAN DEFAULT true,
    invoice_prefix VARCHAR(10) DEFAULT 'BZ-',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. STAFF MEMBERS TABLE
CREATE TABLE IF NOT EXISTS staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role VARCHAR(100) DEFAULT 'Senior Stylist', -- e.g. Senior Stylist, Color Specialist, Aesthetician, Junior Stylist
    commission_rate NUMERIC(8, 2) DEFAULT 15.00, -- Primary Service commission (Percentage % or Flat ₹ Amount)
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'on_leave', 'inactive')),
    color VARCHAR(30) DEFAULT '#8b5cf6', -- Avatar accent color
    notes TEXT, -- Stores JSON configuration for: { commission_type: 'percent'|'fixed', product_commission_rate: 100, product_commission_type: 'fixed'|'percent', custom_notes: '...' }
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('service', 'product')),
    icon VARCHAR(50) DEFAULT 'Sparkles',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CATALOG ITEMS (SERVICES & PRODUCTS) TABLE
CREATE TABLE IF NOT EXISTS catalog_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('service', 'product')),
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    duration_mins INTEGER DEFAULT 45, -- Applicable to services
    cost_price NUMERIC(10, 2) DEFAULT 0.00, -- Cost of goods for retail products
    sku VARCHAR(50),
    stock_qty INTEGER DEFAULT 50, -- Inventory for products
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100),
    gender VARCHAR(20) CHECK (gender IN ('female', 'male', 'other', 'unspecified')),
    birthday DATE,
    anniversary DATE,
    total_visits INTEGER DEFAULT 0,
    total_spent NUMERIC(12, 2) DEFAULT 0.00,
    last_visit TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. INVOICES / TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50),
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(10, 2) DEFAULT 0.00,
    discount_type VARCHAR(20) DEFAULT 'flat' CHECK (discount_type IN ('flat', 'percentage')),
    discount_value NUMERIC(10, 2) DEFAULT 0.00,
    tax_amount NUMERIC(10, 2) DEFAULT 0.00,
    tax_rate NUMERIC(5, 2) DEFAULT 0.00,
    grand_total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    payment_mode VARCHAR(20) NOT NULL DEFAULT 'cash' CHECK (payment_mode IN ('cash', 'card', 'upi', 'split')),
    payment_breakdown JSONB, -- For split payment e.g. {"cash": 500, "upi": 1200}
    status VARCHAR(20) DEFAULT 'paid' CHECK (status IN ('paid', 'pending', 'void')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. INVOICE LINE ITEMS TABLE (WITH SPLIT-STAFF SUPPORT)
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    item_id UUID REFERENCES catalog_items(id) ON DELETE SET NULL,
    item_name VARCHAR(255) NOT NULL,
    item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('service', 'product')),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(10, 2) DEFAULT 0.00,
    total_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    
    -- Split Staff Assignment
    primary_staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    secondary_staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
    primary_split_ratio NUMERIC(5, 2) DEFAULT 100.00, -- e.g. 100%, 60%, 50%
    secondary_split_ratio NUMERIC(5, 2) DEFAULT 0.00, -- e.g. 0%, 40%, 50%
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. EXPENSES TABLE
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(100) NOT NULL, -- e.g. Supplies & Products, Rent & Utilities, Salaries, Refreshments, Maintenance, Marketing
    amount NUMERIC(10, 2) NOT NULL,
    payment_mode VARCHAR(20) DEFAULT 'upi' CHECK (payment_mode IN ('cash', 'card', 'upi', 'bank_transfer')),
    description TEXT,
    expense_date DATE DEFAULT CURRENT_DATE,
    logged_by VARCHAR(100) DEFAULT 'Receptionist',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES FOR HIGH-SPEED LOOKUPS
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_primary_staff ON invoice_items(primary_staff_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_secondary_staff ON invoice_items(secondary_staff_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);

-- ROW LEVEL SECURITY (RLS) POLICIES FOR POS
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE salon_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on app_users" ON app_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on salon_settings" ON salon_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on staff" ON staff FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on categories" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on catalog_items" ON catalog_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on customers" ON customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on invoices" ON invoices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on invoice_items" ON invoice_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on expenses" ON expenses FOR ALL USING (true) WITH CHECK (true);

-- ENABLE SUPABASE REALTIME REPLICATION FOR LIVE MULTI-DEVICE SYNC
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'invoices'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE app_users, salon_settings, staff, categories, catalog_items, customers, invoices, invoice_items, expenses;
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- ==============================================================================
-- CLEAN PRODUCTION SEED TEMPLATE (DEFAULT USERS & SETTINGS)
-- ==============================================================================

-- 1. Initial Salon Settings
INSERT INTO salon_settings (id, salon_name, tagline, address, phone, email, gst_number, currency_symbol, upi_id, google_review_url, instagram_url, thermal_width, tax_rate, tax_enabled)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Belezia Luxury Hair & Beauty Lounge',
    'Ultra-Premium Unisex Salon & Spa Experience',
    'Shop 14-16, Galleria Boulevard, Indiranagar, Bengaluru, 560038',
    '+91 98765 43210',
    'hello@belezia.com',
    '29ABCDE1234F1Z5',
    '₹',
    'belezia@okaxis',
    'https://g.page/r/CbGd_cwnL9zrEBM/review',
    'https://www.instagram.com/beleziasalonlaxminagar?igsi=MTI0ZG85dGRvdTl6aQ%3D%3D&utm_source=qr',
    '80mm',
    18.00,
    true
) ON CONFLICT (id) DO NOTHING;

-- 2. Default App Users (2 Admins + 1 Receptionist)
INSERT INTO app_users (id, name, email, role, pin, avatar_color, phone, is_active) VALUES
('usr-admin-01', 'Sushobhit Jain', 'sushobhit@belezia.com', 'admin', '9999', '#8b5cf6', '+91 98765 00099', true),
('usr-admin-02', 'Prabhat Jain', 'prabhat@belezia.com', 'admin', '3112', '#3b82f6', '+91 98765 00098', true),
('usr-rec-01', 'Amit Sharma', 'amit@belezia.com', 'receptionist', '1001', '#ec4899', '+91 98765 00101', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Core Starter Categories
INSERT INTO categories (id, name, type, icon) VALUES
('22222222-2222-2222-2222-222222222201', 'Hair Services & Styling', 'service', 'Scissors'),
('22222222-2222-2222-2222-222222222202', 'Skin Care & Facials', 'service', 'Sparkles'),
('22222222-2222-2222-2222-222222222203', 'Nails & Hands/Feet Spa', 'service', 'Hand'),
('22222222-2222-2222-2222-222222222204', 'Men Grooming & Shave', 'service', 'UserCheck'),
('22222222-2222-2222-2222-222222222205', 'Retail Products', 'product', 'Package')
ON CONFLICT (id) DO NOTHING;

-- 4. Real Staff Members
INSERT INTO staff (id, name, role, commission_rate, status, color, notes) VALUES
('11111111-1111-1111-1111-111111111101', 'Aamir', 'Senior Stylist', 15.00, 'active', '#6366f1', 'Senior Stylist'),
('11111111-1111-1111-1111-111111111102', 'Subhaan', 'Stylist', 15.00, 'active', '#ec4899', 'Stylist'),
('11111111-1111-1111-1111-111111111103', 'Arbaaz', 'Stylist', 15.00, 'active', '#06b6d4', 'Stylist'),
('11111111-1111-1111-1111-111111111104', 'Mahi', 'Beautician Stylist', 15.00, 'active', '#10b981', 'Beautician Stylist'),
('11111111-1111-1111-1111-111111111105', 'Sitara', 'Beautician Stylist', 15.00, 'active', '#f59e0b', 'Beautician Stylist')
ON CONFLICT (id) DO NOTHING;


