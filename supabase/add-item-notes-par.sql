-- Migration: tambah notes dan par_order_qty ke tabel items
-- Run di Supabase Dashboard → SQL Editor

ALTER TABLE items ADD COLUMN IF NOT EXISTS notes         text          NOT NULL DEFAULT '';
ALTER TABLE items ADD COLUMN IF NOT EXISTS par_order_qty numeric(12,3) NOT NULL DEFAULT 0;
