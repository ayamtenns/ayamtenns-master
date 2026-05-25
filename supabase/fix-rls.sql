-- ── Fix RLS (Row Level Security) ──────────────────────────────────────────────
-- Run this in Supabase Dashboard → SQL Editor
-- Internal tool: disable RLS so anon key can read/write all tables.

ALTER TABLE items                   DISABLE ROW LEVEL SECURITY;
ALTER TABLE menus                   DISABLE ROW LEVEL SECURITY;
ALTER TABLE menu_recipes            DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions            DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales                   DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses                DISABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_requests       DISABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_request_items  DISABLE ROW LEVEL SECURITY;

-- Verify — should return 0 rows (no tables with RLS on):
SELECT tablename, rowsecurity
FROM   pg_tables
WHERE  schemaname = 'public'
  AND  rowsecurity = true;
