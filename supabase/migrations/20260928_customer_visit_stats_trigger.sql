-- ==============================================================================
-- Migration: Automatic Customer Visit Stats Trigger
-- Description: Automatically recomputes and maintains `total_visits`, `total_spent`,
--              and `last_visit` on the customers table whenever an invoice is
--              inserted, updated, or voided.
-- ==============================================================================

CREATE OR REPLACE FUNCTION update_customer_stats_on_invoice_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_phone VARCHAR(50);
  v_customer_id UUID;
  v_clean_phone VARCHAR(50);
BEGIN
  -- Determine affected customer phone and id (check NEW or OLD)
  IF (TG_OP = 'DELETE') THEN
    v_customer_phone := OLD.customer_phone;
    v_customer_id := OLD.customer_id;
  ELSE
    v_customer_phone := NEW.customer_phone;
    v_customer_id := NEW.customer_id;
  END IF;

  v_clean_phone := RIGHT(REGEXP_REPLACE(COALESCE(v_customer_phone, ''), '\D', '', 'g'), 10);

  IF (v_clean_phone IS NOT NULL AND LENGTH(v_clean_phone) >= 7) OR v_customer_id IS NOT NULL THEN
    -- Recompute stats from all non-void invoices for this customer
    WITH stats AS (
      SELECT 
        COUNT(*)::INTEGER as count_visits,
        COALESCE(SUM(grand_total), 0)::NUMERIC(12, 2) as sum_spent,
        MAX(created_at) as max_visit
      FROM invoices
      WHERE status != 'void'
        AND (
          (v_customer_id IS NOT NULL AND customer_id = v_customer_id)
          OR (v_clean_phone IS NOT NULL AND LENGTH(v_clean_phone) >= 7 AND RIGHT(REGEXP_REPLACE(COALESCE(customer_phone, ''), '\D', '', 'g'), 10) = v_clean_phone)
        )
    )
    UPDATE customers c
    SET 
      total_visits = stats.count_visits,
      total_spent = stats.sum_spent,
      last_visit = COALESCE(stats.max_visit, c.last_visit)
    FROM stats
    WHERE (v_customer_id IS NOT NULL AND c.id = v_customer_id)
       OR (v_clean_phone IS NOT NULL AND LENGTH(v_clean_phone) >= 7 AND RIGHT(REGEXP_REPLACE(COALESCE(c.phone, ''), '\D', '', 'g'), 10) = v_clean_phone);
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_invoice_update_customer_stats ON invoices;

CREATE TRIGGER trg_invoice_update_customer_stats
AFTER INSERT OR UPDATE OR DELETE ON invoices
FOR EACH ROW
EXECUTE FUNCTION update_customer_stats_on_invoice_change();

-- One-time initial recalculation for all existing customers:
WITH customer_aggregates AS (
  SELECT 
    RIGHT(REGEXP_REPLACE(COALESCE(i.customer_phone, ''), '\D', '', 'g'), 10) as phone_key,
    COUNT(*)::INTEGER as calculated_visits,
    COALESCE(SUM(i.grand_total), 0)::NUMERIC(12, 2) as calculated_spent,
    MAX(i.created_at) as calculated_last_visit
  FROM invoices i
  WHERE i.status != 'void'
    AND i.customer_phone IS NOT NULL
  GROUP BY phone_key
)
UPDATE customers c
SET 
  total_visits = GREATEST(c.total_visits, ca.calculated_visits),
  total_spent = GREATEST(c.total_spent, ca.calculated_spent),
  last_visit = COALESCE(ca.calculated_last_visit, c.last_visit)
FROM customer_aggregates ca
WHERE RIGHT(REGEXP_REPLACE(COALESCE(c.phone, ''), '\D', '', 'g'), 10) = ca.phone_key
  AND ca.phone_key IS NOT NULL
  AND LENGTH(ca.phone_key) >= 7;
