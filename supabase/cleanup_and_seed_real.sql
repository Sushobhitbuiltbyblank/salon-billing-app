-- ==============================================================================
-- BELEZIA SALON POS - SUPABASE CLEANUP & REAL DATA SETUP SCRIPT
-- ==============================================================================

-- 1. CLEAR ALL PREVIOUS DUMMY INVOICES, TRANSACTIONS, EXPENSES & CUSTOMERS
TRUNCATE TABLE invoice_items CASCADE;
TRUNCATE TABLE invoices CASCADE;
TRUNCATE TABLE expenses CASCADE;
TRUNCATE TABLE customers CASCADE;
TRUNCATE TABLE catalog_items CASCADE;
TRUNCATE TABLE staff CASCADE;
TRUNCATE TABLE categories CASCADE;
TRUNCATE TABLE app_users CASCADE;

-- 2. INSERT 5 REAL STAFF MEMBERS
INSERT INTO staff (id, name, role, commission_rate, status, color, notes) VALUES
('11111111-1111-1111-1111-111111111101', 'Aamir', 'Senior Stylist', 15.00, 'active', '#6366f1', 'Senior Stylist'),
('11111111-1111-1111-1111-111111111102', 'Subhaan', 'Stylist', 15.00, 'active', '#ec4899', 'Stylist'),
('11111111-1111-1111-1111-111111111103', 'Arbaaz', 'Stylist', 15.00, 'active', '#06b6d4', 'Stylist'),
('11111111-1111-1111-1111-111111111104', 'Mahi', 'Beautician Stylist', 15.00, 'active', '#10b981', 'Beautician Stylist'),
('11111111-1111-1111-1111-111111111105', 'Sitara', 'Beautician Stylist', 15.00, 'active', '#f59e0b', 'Beautician Stylist');

-- 3. INSERT 1 ADMIN + 1 RECEPTIONIST (@belezia.com)
INSERT INTO app_users (id, name, email, role, pin, avatar_color, phone, is_active) VALUES
('usr-admin-01', 'Sushobhit Jain', 'sushobhit@belezia.com', 'admin', '9999', '#8b5cf6', '+91 98765 00099', true),
('usr-rec-01', 'Amit Sharma', 'amit@belezia.com', 'receptionist', '1001', '#ec4899', '+91 98765 00101', true);

-- 4. INSERT 6 SERVICE CATEGORIES
INSERT INTO categories (id, name, type, icon) VALUES
('22222222-2222-2222-2222-222222222201', 'Basic Services (Men)', 'service', 'Scissors'),
('22222222-2222-2222-2222-222222222202', 'Detan (Men)', 'service', 'Sparkles'),
('22222222-2222-2222-2222-222222222203', 'Bleach', 'service', 'Sun'),
('22222222-2222-2222-2222-222222222204', 'Facial & Mask', 'service', 'Smile'),
('22222222-2222-2222-2222-222222222205', 'Hair Spa (Loreal)', 'service', 'Droplet'),
('22222222-2222-2222-2222-222222222206', 'Hair Colour (Loreal Majirel)', 'service', 'Palette'),
('22222222-2222-2222-2222-222222222207', 'Haircare Products', 'product', 'Package'),
('22222222-2222-2222-2222-222222222208', 'Skincare Products', 'product', 'Droplet');

-- 5. INSERT 49 REAL SALON SERVICES & 36 RETAIL PRODUCTS
INSERT INTO catalog_items (id, category_id, name, type, price, cost_price, sku, stock_qty, is_active) VALUES
-- 1. Basic services (Men)
('33333333-3333-3333-3333-333333330001', '22222222-2222-2222-2222-222222222201', 'Shaving', 'service', 100, 0, null, 0, true),
('33333333-3333-3333-3333-333333330002', '22222222-2222-2222-2222-222222222201', 'Haircut', 'service', 150, 0, null, 0, true),
('33333333-3333-3333-3333-333333330003', '22222222-2222-2222-2222-222222222201', 'Hair Wash - Shampoo + Conditioner', 'service', 100, 0, null, 0, true),
('33333333-3333-3333-3333-333333330004', '22222222-2222-2222-2222-222222222201', 'Hair Wash - Shampoo Only', 'service', 50, 0, null, 0, true),

-- 2. Detan (Men)
('33333333-3333-3333-3333-333333330005', '22222222-2222-2222-2222-222222222202', 'Detan - Beardo', 'service', 300, 0, null, 0, true),
('33333333-3333-3333-3333-333333330006', '22222222-2222-2222-2222-222222222202', 'Detan - Ozon', 'service', 400, 0, null, 0, true),
('33333333-3333-3333-3333-333333330007', '22222222-2222-2222-2222-222222222202', 'Detan - O3+', 'service', 500, 0, null, 0, true),
('33333333-3333-3333-3333-333333330008', '22222222-2222-2222-2222-222222222202', 'Detan - Kanpeki', 'service', 700, 0, null, 0, true),
('33333333-3333-3333-3333-333333330009', '22222222-2222-2222-2222-222222222202', 'Detan - Sara', 'service', 400, 0, null, 0, true),

-- 3. Bleach (Men / Women)
('33333333-3333-3333-3333-333333330010', '22222222-2222-2222-2222-222222222203', 'Bleach - Fruit', 'service', 300, 0, null, 0, true),
('33333333-3333-3333-3333-333333330011', '22222222-2222-2222-2222-222222222203', 'Bleach - Ozon', 'service', 500, 0, null, 0, true),
('33333333-3333-3333-3333-333333330012', '22222222-2222-2222-2222-222222222203', 'Bleach - Oxy', 'service', 700, 0, null, 0, true),

-- 4. Facial & mask
('33333333-3333-3333-3333-333333330013', '22222222-2222-2222-2222-222222222204', 'Facial - Just O2 - Mask', 'service', 500, 0, null, 0, true),
('33333333-3333-3333-3333-333333330014', '22222222-2222-2222-2222-222222222204', 'Facial - Just O2 - Facial', 'service', 1500, 0, null, 0, true),
('33333333-3333-3333-3333-333333330015', '22222222-2222-2222-2222-222222222204', 'Facial - Aroma Magic - Facial', 'service', 1500, 0, null, 0, true),
('33333333-3333-3333-3333-333333330016', '22222222-2222-2222-2222-222222222204', 'Facial - O3+ - Whitening', 'service', 2500, 0, null, 0, true),
('33333333-3333-3333-3333-333333330017', '22222222-2222-2222-2222-222222222204', 'Facial - O3+ - Power Glow Cleanup', 'service', 2000, 0, null, 0, true),
('33333333-3333-3333-3333-333333330018', '22222222-2222-2222-2222-222222222204', 'Facial - O3+ - MelaDerm', 'service', 4000, 0, null, 0, true),
('33333333-3333-3333-3333-333333330019', '22222222-2222-2222-2222-222222222204', 'Facial - O3+ - Derma Cult', 'service', 2000, 0, null, 0, true),
('33333333-3333-3333-3333-333333330020', '22222222-2222-2222-2222-222222222204', 'Facial - Beardo - Power Glow', 'service', 1500, 0, null, 0, true),
('33333333-3333-3333-3333-333333330021', '22222222-2222-2222-2222-222222222204', 'Facial - Beardo - War Zone', 'service', 1500, 0, null, 0, true),
('33333333-3333-3333-3333-333333330022', '22222222-2222-2222-2222-222222222204', 'Facial - Beardo - Gold', 'service', 1500, 0, null, 0, true),
('33333333-3333-3333-3333-333333330023', '22222222-2222-2222-2222-222222222204', 'Facial - Lotus - Gold Sheen', 'service', 2000, 0, null, 0, true),
('33333333-3333-3333-3333-333333330024', '22222222-2222-2222-2222-222222222204', 'Facial - Lotus - Insta Fair', 'service', 2000, 0, null, 0, true),
('33333333-3333-3333-3333-333333330025', '22222222-2222-2222-2222-222222222204', 'Facial - Sara - Korean Facial', 'service', 4200, 0, null, 0, true),
('33333333-3333-3333-3333-333333330026', '22222222-2222-2222-2222-222222222204', 'Facial - Kanpeki - 4-Step', 'service', 2000, 0, null, 0, true),
('33333333-3333-3333-3333-333333330027', '22222222-2222-2222-2222-222222222204', 'Facial - Kanpeki - Mango', 'service', 2500, 0, null, 0, true),
('33333333-3333-3333-3333-333333330028', '22222222-2222-2222-2222-222222222204', 'Facial - Kanpeki - Papaya', 'service', 4000, 0, null, 0, true),
('33333333-3333-3333-3333-333333330029', '22222222-2222-2222-2222-222222222204', 'Facial - Kanpeki - Coconut', 'service', 2500, 0, null, 0, true),
('33333333-3333-3333-3333-333333330030', '22222222-2222-2222-2222-222222222204', 'Facial - Kanpeki - Avocado', 'service', 2500, 0, null, 0, true),
('33333333-3333-3333-3333-333333330031', '22222222-2222-2222-2222-222222222204', 'Facial - Kanpeki - Pumpkin', 'service', 2500, 0, null, 0, true),
('33333333-3333-3333-3333-333333330032', '22222222-2222-2222-2222-222222222204', 'Facial - Kanpeki - Quinoa', 'service', 2500, 0, null, 0, true),
('33333333-3333-3333-3333-333333330033', '22222222-2222-2222-2222-222222222204', 'Facial - Kanpeki - Chocolate', 'service', 2500, 0, null, 0, true),
('33333333-3333-3333-3333-333333330034', '22222222-2222-2222-2222-222222222204', 'Facial - Ozone - De-Tan', 'service', 2000, 0, null, 0, true),
('33333333-3333-3333-3333-333333330035', '22222222-2222-2222-2222-222222222204', 'Facial - Ozone - Glow For Sure', 'service', 2500, 0, null, 0, true),
('33333333-3333-3333-3333-333333330036', '22222222-2222-2222-2222-222222222204', 'Facial - Ozone - Acne', 'service', 2000, 0, null, 0, true),
('33333333-3333-3333-3333-333333330037', '22222222-2222-2222-2222-222222222204', 'Facial - Ozone - PST', 'service', 2000, 0, null, 0, true),
('33333333-3333-3333-3333-333333330038', '22222222-2222-2222-2222-222222222204', 'Facial - Ozone - CBT', 'service', 2000, 0, null, 0, true),
('33333333-3333-3333-3333-333333330039', '22222222-2222-2222-2222-222222222204', 'Facial - Ozone - Restoring Youth', 'service', 2000, 0, null, 0, true),
('33333333-3333-3333-3333-333333330040', '22222222-2222-2222-2222-222222222204', 'Facial - Ozone - Vitamin C', 'service', 2000, 0, null, 0, true),
('33333333-3333-3333-3333-333333330041', '22222222-2222-2222-2222-222222222204', 'Facial - Ozone - Illuminous Gold', 'service', 2500, 0, null, 0, true),

-- 5. Men's hair spa (Loreal)
('33333333-3333-3333-3333-333333330042', '22222222-2222-2222-2222-222222222205', 'Hair Spa - Loreal - Nourishment', 'service', 600, 0, null, 0, true),
('33333333-3333-3333-3333-333333330043', '22222222-2222-2222-2222-222222222205', 'Hair Spa - Loreal - Absolute Repair', 'service', 1000, 0, null, 0, true),
('33333333-3333-3333-3333-333333330044', '22222222-2222-2222-2222-222222222205', 'Hair Spa - Loreal - Liss Unlimited', 'service', 1000, 0, null, 0, true),
('33333333-3333-3333-3333-333333330045', '22222222-2222-2222-2222-222222222205', 'Hair Spa - Loreal - Inforcer', 'service', 1000, 0, null, 0, true),
('33333333-3333-3333-3333-333333330046', '22222222-2222-2222-2222-222222222205', 'Hair Spa - Loreal - Vitamin O', 'service', 1000, 0, null, 0, true),
('33333333-3333-3333-3333-333333330047', '22222222-2222-2222-2222-222222222205', 'Hair Spa - Loreal - Scalp Advance', 'service', 1500, 0, null, 0, true),
('33333333-3333-3333-3333-333333330048', '22222222-2222-2222-2222-222222222205', 'Hair Spa - Loreal - Absolute Repair Molecule', 'service', 2500, 0, null, 0, true),

-- 6. Men's hair colour (Loreal Majirel)
('33333333-3333-3333-3333-333333330049', '22222222-2222-2222-2222-222222222206', 'Hair Colour - Loreal Majirel - Base 3 No', 'service', 600, 0, null, 0, true),
('33333333-3333-3333-3333-333333330050', '22222222-2222-2222-2222-222222222206', 'Hair Colour - Loreal Majirel - Base 3 No Inoa', 'service', 800, 0, null, 0, true),

-- 7. Haircare Products (Retail for sale)
('33333333-3333-3333-3333-333333330101', '22222222-2222-2222-2222-222222222207', 'L''Oréal Absolute Repair - Shampoo', 'product', 790, 0, 'PRD-LRL-01', 25, true),
('33333333-3333-3333-3333-333333330102', '22222222-2222-2222-2222-222222222207', 'L''Oréal xtansho Blue - Shampoo', 'product', 690, 0, 'PRD-LRL-02', 25, true),
('33333333-3333-3333-3333-333333330103', '22222222-2222-2222-2222-222222222207', 'L''Oréal xtansho Blue - Mask', 'product', 850, 0, 'PRD-LRL-03', 25, true),
('33333333-3333-3333-3333-333333330104', '22222222-2222-2222-2222-222222222207', 'L''Oréal xtansho Gold - Shampoo', 'product', 1120, 0, 'PRD-LRL-04', 25, true),
('33333333-3333-3333-3333-333333330105', '22222222-2222-2222-2222-222222222207', 'L''Oréal xtansho Gold - Mask', 'product', 1290, 0, 'PRD-LRL-05', 25, true),
('33333333-3333-3333-3333-333333330106', '22222222-2222-2222-2222-222222222207', 'Krone - Shampoo', 'product', 850, 0, 'PRD-KRN-01', 25, true),
('33333333-3333-3333-3333-333333330107', '22222222-2222-2222-2222-222222222207', 'Krone - Mask', 'product', 600, 0, 'PRD-KRN-02', 25, true),
('33333333-3333-3333-3333-333333330108', '22222222-2222-2222-2222-222222222207', 'Godrej - Serum', 'product', 299, 0, 'PRD-GDJ-01', 25, true),
('33333333-3333-3333-3333-333333330109', '22222222-2222-2222-2222-222222222207', 'Godrej - Keracare Shampoo', 'product', 1200, 0, 'PRD-GDJ-02', 25, true),
('33333333-3333-3333-3333-333333330110', '22222222-2222-2222-2222-222222222207', 'Godrej - Keracare Conditioner', 'product', 1200, 0, 'PRD-GDJ-03', 25, true),
('33333333-3333-3333-3333-333333330111', '22222222-2222-2222-2222-222222222207', '72 - Shampoo', 'product', 1395, 0, 'PRD-72-01', 25, true),
('33333333-3333-3333-3333-333333330112', '22222222-2222-2222-2222-222222222207', '72 - Mask', 'product', 1695, 0, 'PRD-72-02', 25, true),
('33333333-3333-3333-3333-333333330113', '22222222-2222-2222-2222-222222222207', '72 - Serum', 'product', 1195, 0, 'PRD-72-03', 25, true),
('33333333-3333-3333-3333-333333330114', '22222222-2222-2222-2222-222222222207', '72 - Conditioner', 'product', 1395, 0, 'PRD-72-04', 25, true),
('33333333-3333-3333-3333-333333330115', '22222222-2222-2222-2222-222222222207', 'Pro Viva Smooth - Shampoo', 'product', 1150, 0, 'PRD-PV-01', 25, true),
('33333333-3333-3333-3333-333333330116', '22222222-2222-2222-2222-222222222207', 'Pro Viva Smooth - Conditioner', 'product', 1200, 0, 'PRD-PV-02', 25, true),
('33333333-3333-3333-3333-333333330117', '22222222-2222-2222-2222-222222222207', 'Pro Viva Hydration - Shampoo', 'product', 1150, 0, 'PRD-PV-03', 25, true),
('33333333-3333-3333-3333-333333330118', '22222222-2222-2222-2222-222222222207', 'Pro Viva Hydration - Conditioner', 'product', 1200, 0, 'PRD-PV-04', 25, true),
('33333333-3333-3333-3333-333333330119', '22222222-2222-2222-2222-222222222207', 'Pro Viva Repair - Shampoo', 'product', 1150, 0, 'PRD-PV-05', 25, true),
('33333333-3333-3333-3333-333333330120', '22222222-2222-2222-2222-222222222207', 'Pro Viva Repair - Conditioner', 'product', 1200, 0, 'PRD-PV-06', 25, true),
('33333333-3333-3333-3333-333333330121', '22222222-2222-2222-2222-222222222207', 'Loreal KAS - Shampoo', 'product', 990, 0, 'PRD-KAS-01', 25, true),
('33333333-3333-3333-3333-333333330122', '22222222-2222-2222-2222-222222222207', 'Loreal KAS - Mask', 'product', 1290, 0, 'PRD-KAS-02', 25, true),
('33333333-3333-3333-3333-333333330123', '22222222-2222-2222-2222-222222222207', 'Loreal KAS - Transform Creame', 'product', 1800, 0, 'PRD-KAS-03', 25, true),

-- 8. Skincare Products (Retail for sale)
('33333333-3333-3333-3333-333333330124', '22222222-2222-2222-2222-222222222208', 'ABC - Serum', 'product', 1799, 0, 'PRD-ABC-01', 25, true),
('33333333-3333-3333-3333-333333330125', '22222222-2222-2222-2222-222222222208', 'C-10 - Serum', 'product', 1199, 0, 'PRD-C10-01', 25, true),
('33333333-3333-3333-3333-333333330126', '22222222-2222-2222-2222-222222222208', 'Ozone Face Oil - Oil', 'product', 1903, 0, 'PRD-OZN-01', 25, true),
('33333333-3333-3333-3333-333333330127', '22222222-2222-2222-2222-222222222208', 'Ozone Complexion Brightening - Facewash', 'product', 290, 0, 'PRD-OZN-02', 25, true),
('33333333-3333-3333-3333-333333330128', '22222222-2222-2222-2222-222222222208', 'Ozone Complexion Brightening - Cream', 'product', 350, 0, 'PRD-OZN-03', 25, true),
('33333333-3333-3333-3333-333333330129', '22222222-2222-2222-2222-222222222208', 'Ozone Perfect Skin Tone - Facewash', 'product', 290, 0, 'PRD-OZN-04', 25, true),
('33333333-3333-3333-3333-333333330130', '22222222-2222-2222-2222-222222222208', 'Ozone Perfect Skin Tone - Cream', 'product', 350, 0, 'PRD-OZN-05', 25, true),
('33333333-3333-3333-3333-333333330131', '22222222-2222-2222-2222-222222222208', 'Ozone Youth Restoring - Facewash', 'product', 290, 0, 'PRD-OZN-06', 25, true),
('33333333-3333-3333-3333-333333330132', '22222222-2222-2222-2222-222222222208', 'Ozone Youth Restoring - Cream', 'product', 350, 0, 'PRD-OZN-07', 25, true),
('33333333-3333-3333-3333-333333330133', '22222222-2222-2222-2222-222222222208', 'Ozone Acne Check - Facewash', 'product', 290, 0, 'PRD-OZN-08', 25, true),
('33333333-3333-3333-3333-333333330134', '22222222-2222-2222-2222-222222222208', 'Ozone Acne Check - Cream', 'product', 350, 0, 'PRD-OZN-09', 25, true),
('33333333-3333-3333-3333-333333330135', '22222222-2222-2222-2222-222222222208', 'Kanpeki - Balancing Cleanser', 'product', 960, 0, 'PRD-KNP-01', 25, true),
('33333333-3333-3333-3333-333333330136', '22222222-2222-2222-2222-222222222208', 'Kanpeki - Facial Wash', 'product', 960, 0, 'PRD-KNP-02', 25, true);

-- 6. ENSURE CLEAN SALON SETTINGS (BELEZIA LUXURY SALON)
DELETE FROM salon_settings;
INSERT INTO salon_settings (id, salon_name, tagline, address, phone, email, gst_number, currency_symbol, upi_id, google_review_url, instagram_url, thermal_width, tax_rate, tax_enabled, invoice_prefix)
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
    true,
    'BZ-'
);
