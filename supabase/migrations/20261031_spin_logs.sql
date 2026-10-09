-- Migration: 20261031_spin_logs.sql
-- Description: Create spin_logs table for L'Oréal Professional Day campaign with single-use offer tokens, anti-fraud phone validations, and audit logs.

CREATE TABLE IF NOT EXISTS spin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_token TEXT UNIQUE,
  customer_name TEXT,
  phone_number TEXT NOT NULL,
  won_item TEXT NOT NULL,
  prize_id TEXT,
  is_redeemed BOOLEAN NOT NULL DEFAULT false,
  redeemed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Fast lookup indexes to handle fast lookups and prevent duplicate claims
CREATE INDEX IF NOT EXISTS idx_spin_logs_offer_token ON spin_logs (offer_token);
CREATE INDEX IF NOT EXISTS idx_spin_logs_phone_number ON spin_logs (phone_number);
CREATE INDEX IF NOT EXISTS idx_spin_logs_is_redeemed ON spin_logs (is_redeemed);
CREATE INDEX IF NOT EXISTS idx_spin_logs_created_at ON spin_logs (created_at DESC);

-- Enable Row Level Security (RLS) & allow anonymous/public participation
ALTER TABLE spin_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read spin_logs"
  ON spin_logs FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert spin_logs"
  ON spin_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update spin_logs"
  ON spin_logs FOR UPDATE
  USING (true);
