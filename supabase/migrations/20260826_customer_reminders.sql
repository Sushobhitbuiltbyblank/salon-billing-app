-- ==============================================================================
-- SALON POS & MANAGEMENT SUITE - CUSTOMER FOLLOW-UP REMINDERS MIGRATION
-- ==============================================================================

-- 1. ADD last_reminder_sent_at TO customers TABLE
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMPTZ;

-- Index on last_visit and last_reminder_sent_at for quick reminder queries
CREATE INDEX IF NOT EXISTS idx_customers_last_visit ON customers(last_visit);
CREATE INDEX IF NOT EXISTS idx_customers_last_reminder ON customers(last_reminder_sent_at);

-- 2. CREATE VIEW TO IDENTIFY OVERDUE CUSTOMERS BASED ON SERVICE INTERVALS
--    - Shave / Beard grooming: Overdue if >= 7 days
--    - Haircut / Spa / Other services: Overdue if >= 30 days
--    - Excludes customers who have visited more recently for any subsequent service
CREATE OR REPLACE VIEW customer_due_reminders AS
WITH latest_customer_invoices AS (
    SELECT DISTINCT ON (c.phone)
        c.id AS customer_id,
        c.name AS customer_name,
        c.phone AS customer_phone,
        c.gender AS customer_gender,
        c.total_visits,
        c.total_spent,
        c.last_reminder_sent_at,
        inv.id AS latest_invoice_id,
        inv.created_at AS last_visit_date,
        -- Check if latest invoice contained grooming/shave services
        EXISTS (
            SELECT 1 FROM invoice_items ii 
            WHERE ii.invoice_id = inv.id 
              AND (
                  LOWER(ii.item_name) LIKE '%shave%' OR 
                  LOWER(ii.item_name) LIKE '%beard%' OR 
                  LOWER(ii.item_name) LIKE '%trim%' OR 
                  LOWER(ii.item_name) LIKE '%mustache%' OR 
                  LOWER(ii.item_name) LIKE '%threading%'
              )
        ) AS has_shave_service,
        -- Get the primary service name
        (
            SELECT ii.item_name 
            FROM invoice_items ii 
            WHERE ii.invoice_id = inv.id 
            ORDER BY ii.total_price DESC, ii.created_at ASC 
            LIMIT 1
        ) AS last_service_name
    FROM customers c
    JOIN invoices inv ON (
        inv.customer_phone = c.phone OR 
        inv.customer_id = c.id
    )
    WHERE inv.status != 'void' AND inv.status != 'cancelled'
      AND c.phone IS NOT NULL AND LENGTH(c.phone) >= 7
    ORDER BY c.phone, inv.created_at DESC
)
SELECT 
    customer_id,
    customer_name,
    customer_phone,
    customer_gender,
    total_visits,
    total_spent,
    last_reminder_sent_at,
    latest_invoice_id,
    last_visit_date,
    last_service_name,
    CASE 
        WHEN has_shave_service THEN 'grooming_shave'
        ELSE 'haircut_spa'
    END AS service_type,
    CASE 
        WHEN has_shave_service THEN 7
        ELSE 30
    END AS reminder_interval_days,
    DATE_PART('day', NOW() - last_visit_date)::INTEGER AS days_elapsed,
    -- Overdue flag
    CASE 
        WHEN has_shave_service AND DATE_PART('day', NOW() - last_visit_date) >= 7 THEN true
        WHEN NOT has_shave_service AND DATE_PART('day', NOW() - last_visit_date) >= 30 THEN true
        ELSE false
    END AS is_overdue,
    -- Reminder sent today flag
    CASE 
        WHEN last_reminder_sent_at IS NOT NULL AND DATE(last_reminder_sent_at AT TIME ZONE 'Asia/Kolkata') = CURRENT_DATE THEN true
        ELSE false
    END AS reminder_sent_today
FROM latest_customer_invoices
ORDER BY days_elapsed DESC;

-- 3. STORED FUNCTION FOR DIRECT SUPABASE RPC FETCHING
CREATE OR REPLACE FUNCTION get_customer_due_reminders()
RETURNS TABLE (
    customer_id UUID,
    customer_name VARCHAR,
    customer_phone VARCHAR,
    customer_gender VARCHAR,
    total_visits INTEGER,
    total_spent NUMERIC,
    last_reminder_sent_at TIMESTAMPTZ,
    latest_invoice_id UUID,
    last_visit_date TIMESTAMPTZ,
    last_service_name VARCHAR,
    service_type TEXT,
    reminder_interval_days INTEGER,
    days_elapsed INTEGER,
    is_overdue BOOLEAN,
    reminder_sent_today BOOLEAN
)
LANGUAGE sql
STABLE
AS $$
    SELECT * FROM customer_due_reminders WHERE is_overdue = true;
$$;

-- 4. PG_CRON SCHEDULE (DAILY AT 9:00 AM IST / 03:30 UTC)
-- Note: Enable the pg_cron extension in Supabase Dashboard -> Database -> Extensions if not already enabled.
/*
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
    'daily-salon-due-reminders-9am',
    '30 3 * * *', -- 03:30 UTC = 09:00 AM IST
    $$ 
        -- Optional: Daily refresh or alert log
        INSERT INTO app_notifications (title, body, type, created_at)
        SELECT 
            'Daily Customer Reminders Due',
            COUNT(*) || ' customers are due for follow-up reminders today.',
            'reminder',
            NOW()
        FROM customer_due_reminders
        WHERE is_overdue = true AND reminder_sent_today = false;
    $$
);
*/
