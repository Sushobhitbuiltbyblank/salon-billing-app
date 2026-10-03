---
name: sql-optimization
description: Optimizes SQL queries, index designs, database schemas, and execution plans (specifically for PostgreSQL, Supabase, and relational databases). Use when profiling slow queries, analyzing EXPLAIN plans, creating indexes, or tuning database performance.
---

# SQL Optimization & Query Tuning Skill

This skill provides comprehensive methodologies and patterns for optimizing SQL queries, indexing strategies, execution plans (`EXPLAIN ANALYZE`), and database schema designs with a particular focus on PostgreSQL and Supabase.

## When to Use This Skill
- Diagnosing and speeding up slow SQL queries, API endpoints, or database reporting dashboards.
- Analyzing execution plans (`EXPLAIN (ANALYZE, BUFFERS)`).
- Designing optimal indexes (Composite, Covering/`INCLUDE`, Partial, GIN for JSONB, BRIN).
- Refactoring query anti-patterns (sargability violations, N+1 queries, inefficient `OFFSET` pagination).
- Optimizing Supabase Row-Level Security (RLS) policies and PostgreSQL settings.

---

## 1. Execution Plan Analysis (`EXPLAIN ANALYZE`)

Always inspect query behavior using `EXPLAIN (ANALYZE, BUFFERS)`:

```sql
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT customer_id, SUM(grand_total)
FROM invoices
WHERE created_at >= '2026-10-01' AND status = 'paid'
GROUP BY customer_id;
```

### Scan Types (From Fastest to Slowest)
1. **Index Only Scan**: Data is read entirely from the index without reading the table heap (`Heap Fetches: 0`). Achieved via covering indexes (`INCLUDE`).
2. **Index Scan**: Index is traversed to locate row pointers, followed by reading table heap blocks.
3. **Bitmap Index Scan + Bitmap Heap Scan**: Gathers matching pages via index, builds a bitmap, then fetches rows in physical disk order. Ideal for medium-cardinality queries.
4. **Sequential Scan (Seq Scan)**: Scans every row in the table. Acceptable for small lookup tables (<1000 rows); detrimental on large tables.

### Key Red Flags to Spot
- **`Rows Removed by Filter` is very large**: Indicates missing or misaligned index.
- **`Sort Method: external merge Disk`**: Query sort spilled to disk because `work_mem` was exceeded.
- **Estimated rows differ by orders of magnitude from actual rows**: Stale statistics. Run `ANALYZE table_name;`.
- **`Heap Fetches` high in Index Only Scan**: Table needs `VACUUM` to update the visibility map.

---

## 2. Advanced Indexing Strategies

### The Equality-Range-Sort Rule (ESR)
When creating composite indexes, order columns by:
1. **Equality columns** first (`status = 'paid'`)
2. **Sort columns** next (`ORDER BY created_at DESC`)
3. **Range columns** last (`amount > 500`)

```sql
-- Query:
-- SELECT * FROM invoices WHERE branch_id = 'b1' AND created_at >= '2026-10-01' ORDER BY created_at DESC;

-- Optimal Composite Index:
CREATE INDEX idx_invoices_branch_created ON invoices (branch_id, created_at DESC);
```

### Covering Indexes with `INCLUDE`
Avoid hitting table heap completely by including frequently selected columns into index leaf nodes:

```sql
CREATE INDEX idx_invoices_report 
ON invoices (branch_id, status) 
INCLUDE (grand_total, tax_amount);
```

### Partial / Conditional Indexes
Drastically reduce index size and write overhead by indexing only relevant subsets of data:

```sql
-- Index only active/unarchived records:
CREATE INDEX idx_active_invoices ON invoices (customer_id, created_at) 
WHERE deleted_at IS NULL AND status = 'paid';
```

### JSONB Indexing (PostgreSQL / Supabase)
- **`jsonb_path_ops`**: Faster and smaller (indexes only specific key-value hash paths using `@>` operator):
  ```sql
  CREATE INDEX idx_invoices_metadata ON invoices USING gin (metadata jsonb_path_ops);
  ```
- **Expression index on specific JSON field**:
  ```sql
  CREATE INDEX idx_invoices_payment_mode ON invoices (((metadata->>'paymentMode')));
  ```

---

## 3. Query Writing Best Practices & Sargability

### 1. Maintain Sargability (Search Argument Able)
Never apply functions or expressions to indexed columns in `WHERE` clauses:

```sql
-- ❌ ANTI-PATTERN: Prevents index usage
WHERE DATE(created_at) = '2026-10-01'
WHERE lower(customer_phone) = '9876543210'

-- ✅ OPTIMIZED: Preserves index scan
WHERE created_at >= '2026-10-01 00:00:00+05:30' 
  AND created_at <  '2026-10-02 00:00:00+05:30'
WHERE customer_phone = '9876543210' -- or use an expression index: CREATE INDEX ON users (lower(customer_phone))
```

### 2. Keyset / Cursor Pagination Over `OFFSET`
Avoid large `OFFSET` values which force the engine to scan and discard thousands of rows:

```sql
-- ❌ SLOW: Scans 50,050 rows to return 50
SELECT * FROM invoices ORDER BY id DESC OFFSET 50000 LIMIT 50;

-- ✅ FAST: O(1) index lookup
SELECT * FROM invoices 
WHERE id < 'last_seen_id' 
ORDER BY id DESC 
LIMIT 50;
```

### 3. Replace N+1 Queries with Aggregation / CTEs
Aggregate child collections directly in SQL instead of looping in client code:

```sql
SELECT 
  i.id,
  i.grand_total,
  i.customer_name,
  COALESCE(
    json_agg(
      json_build_object(
        'service_id', ii.service_id,
        'stylist_id', ii.stylist_id,
        'price', ii.final_price
      )
    ) FILTER (WHERE ii.id IS NOT NULL), '[]'
  ) AS items
FROM invoices i
LEFT JOIN invoice_items ii ON ii.invoice_id = i.id
WHERE i.branch_id = 'br_01'
GROUP BY i.id;
```

---

## 4. Supabase & PostgreSQL Specific Optimizations

### Optimizing Row-Level Security (RLS) Policies
Wrap `auth.uid()` in `(SELECT auth.uid())` within RLS policies. This prevents PostgreSQL from re-evaluating the function for every single candidate row:

```sql
-- ❌ SLOW: Evaluates auth.uid() per row (can be 100x slower)
CREATE POLICY "Users view own invoices" ON invoices
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- ✅ OPTIMIZED: Evaluated once per statement
CREATE POLICY "Users view own invoices" ON invoices
FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));
```

### Always Add Indexes to Foreign Keys
PostgreSQL does not automatically index foreign key columns. Without an index, updates or deletes on the parent table may cause table-level locks or slow cascades on the child table:

```sql
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items (invoice_id);
CREATE INDEX idx_invoice_items_stylist_id ON invoice_items (stylist_id);
```

---

## 5. SQL Optimization Checklist
- [ ] Query runs `EXPLAIN (ANALYZE, BUFFERS)` to verify no unintended `Seq Scan` on large tables.
- [ ] All `JOIN` conditions and `WHERE` filter columns are covered by indexes.
- [ ] Composite indexes follow the Equality -> Sort -> Range (ESR) rule.
- [ ] No sargability violations (functions wrapping column names in `WHERE`).
- [ ] Pagination uses cursor / keyset strategy (`WHERE id > ...`) instead of `OFFSET`.
- [ ] No `SELECT *`; only required columns are requested.
- [ ] Supabase RLS policies use `(SELECT auth.uid())` caching pattern.
- [ ] High-volume foreign key references have dedicated indexes.
