-- Migration: 20261031_wheel_inventory_loreal.sql
-- Description: Seed the 5 L'Oréal Day Event reward offers with quantity 30 each into wheel_inventory table.

CREATE TABLE IF NOT EXISTS wheel_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('gift', 'offer', 'discount_coupon', 'free_service')),
  quantity INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  color TEXT DEFAULT '#8b5cf6',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wheel_inventory_active ON wheel_inventory (is_active);
CREATE INDEX IF NOT EXISTS idx_wheel_inventory_category ON wheel_inventory (category);

-- Deactivate or update previous legacy sample items if desired
UPDATE wheel_inventory SET is_active = false WHERE id LIKE '00000000-0000-0000-0000-00000000010%';

-- Upsert the 5 L'Oréal Consultation Day Offer Items with 30 quantity each
INSERT INTO wheel_inventory (id, title, category, quantity, is_active, color)
VALUES
  ('00000000-0000-0000-0000-000000000201', 'Free L''Oréal Shampoo', 'gift', 30, true, '#3b82f6'),
  ('00000000-0000-0000-0000-000000000202', 'Free L''Oréal Facewash', 'gift', 30, true, '#06b6d4'),
  ('00000000-0000-0000-0000-000000000203', 'Free D-Tan Service', 'free_service', 30, true, '#8b5cf6'),
  ('00000000-0000-0000-0000-000000000204', 'Free Hair Cut Service', 'free_service', 30, true, '#ec4899'),
  ('00000000-0000-0000-0000-000000000205', 'Free L''Oréal absolute repair hair mask', 'gift', 30, true, '#10b981')
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  category = EXCLUDED.category,
  quantity = EXCLUDED.quantity,
  is_active = EXCLUDED.is_active,
  color = EXCLUDED.color;
