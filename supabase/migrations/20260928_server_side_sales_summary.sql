-- ==============================================================================
-- Migration: Server-Side Daily & Periodic Sales Aggregation Function
-- Description: Computes day-by-day sales, product totals, and payment breakdown
--              directly inside PostgreSQL. Returns a ~2 KB summary payload.
-- ==============================================================================

CREATE OR REPLACE FUNCTION get_daily_sales_summary(
  start_date timestamptz,
  end_date timestamptz
)
RETURNS TABLE (
  sale_date text,
  total_sales numeric,
  subtotal numeric,
  discount_amount numeric,
  tax_amount numeric,
  invoice_count bigint,
  cash_sales numeric,
  upi_sales numeric,
  card_sales numeric,
  split_sales numeric,
  product_sales numeric,
  product_units bigint,
  product_invoice_count bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH invoice_product_stats AS (
    SELECT 
      i.id as inv_id,
      -- Format date string in Indian Standard Time (IST: UTC+5:30)
      TO_CHAR(i.created_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD') as ist_date,
      COALESCE(i.grand_total, 0) as g_total,
      COALESCE(i.subtotal, 0) as sub_total,
      COALESCE(i.discount_amount, 0) as disc_total,
      COALESCE(i.tax_amount, 0) as tax_total,
      COALESCE(i.payment_mode, 'upi') as pay_mode,
      COALESCE(SUM(CASE WHEN it.item_type = 'product' THEN COALESCE(it.total_price, 0) ELSE 0 END), 0) as raw_prod_subtotal,
      COALESCE(SUM(CASE WHEN it.item_type = 'product' THEN COALESCE(it.quantity, 1) ELSE 0 END), 0) as raw_prod_units,
      BOOL_OR(it.item_type = 'product') as has_product
    FROM invoices i
    LEFT JOIN invoice_items it ON it.invoice_id = i.id
    WHERE i.status != 'void'
      AND i.created_at >= start_date
      AND i.created_at <= end_date
    GROUP BY i.id, ist_date, i.grand_total, i.subtotal, i.discount_amount, i.tax_amount, i.payment_mode
  )
  SELECT
    ist_date as sale_date,
    COALESCE(SUM(g_total), 0)::numeric as total_sales,
    COALESCE(SUM(sub_total), 0)::numeric as subtotal,
    COALESCE(SUM(disc_total), 0)::numeric as discount_amount,
    COALESCE(SUM(tax_total), 0)::numeric as tax_amount,
    COUNT(*)::bigint as invoice_count,
    COALESCE(SUM(CASE WHEN pay_mode = 'cash' THEN g_total ELSE 0 END), 0)::numeric as cash_sales,
    COALESCE(SUM(CASE WHEN pay_mode = 'upi' THEN g_total ELSE 0 END), 0)::numeric as upi_sales,
    COALESCE(SUM(CASE WHEN pay_mode = 'card' THEN g_total ELSE 0 END), 0)::numeric as card_sales,
    COALESCE(SUM(CASE WHEN pay_mode = 'split' THEN g_total ELSE 0 END), 0)::numeric as split_sales,
    -- Deduct proportional invoice discounts for product revenue
    COALESCE(SUM(
      CASE 
        WHEN sub_total > 0 THEN (raw_prod_subtotal / sub_total) * g_total 
        ELSE raw_prod_subtotal 
      END
    ), 0)::numeric as product_sales,
    COALESCE(SUM(raw_prod_units), 0)::bigint as product_units,
    COALESCE(COUNT(CASE WHEN has_product THEN 1 END), 0)::bigint as product_invoice_count
  FROM invoice_product_stats
  GROUP BY ist_date
  ORDER BY ist_date ASC;
END;
$$;

-- Allow public API clients to execute the function
GRANT EXECUTE ON FUNCTION get_daily_sales_summary(timestamptz, timestamptz) TO anon, authenticated, service_role;
