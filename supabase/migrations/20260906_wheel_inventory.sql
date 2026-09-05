-- Migration: 20260906_wheel_inventory.sql
-- Description: Create dedicated wheel_inventory table with independent reward stock pool and seed 6 initial items.

CREATE TABLE IF NOT EXISTS wheel_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('gift', 'offer', 'discount_coupon', 'free_service')),
  quantity INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  color TEXT DEFAULT '#8b5cf6',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup by active status & category
CREATE INDEX IF NOT EXISTS idx_wheel_inventory_active ON wheel_inventory (is_active);
CREATE INDEX IF NOT EXISTS idx_wheel_inventory_category ON wheel_inventory (category);

-- Seed 6 initial items with exact specified initial stock quantities
INSERT INTO wheel_inventory (id, title, category, quantity, is_active, color)
VALUES
  ('00000000-0000-0000-0000-000000000101', 'Win VIP Gift', 'gift', 10, true, '#f43f5e'),
  ('00000000-0000-0000-0000-000000000102', 'Free Hair Spa', 'free_service', 30, true, '#3b82f6'),
  ('00000000-0000-0000-0000-000000000103', '20% Discount', 'discount_coupon', 5, true, '#ec4899'),
  ('00000000-0000-0000-0000-000000000104', '100 Rupee Off', 'offer', 15, true, '#10b981'),
  ('00000000-0000-0000-0000-000000000105', 'Free De-Tan', 'free_service', 10, true, '#8b5cf6'),
  ('00000000-0000-0000-0000-000000000106', '40% Discount on Product Purchase of 1000', 'offer', 10, true, '#f59e0b')
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  category = EXCLUDED.category,
  color = EXCLUDED.color;
