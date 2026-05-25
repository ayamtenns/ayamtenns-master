-- Ayamtenns Master — Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── Items (bahan baku) ────────────────────────────────────────────────────────
create table if not exists items (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  category      text not null default 'Lainnya',
  unit          text not null default 'pcs',
  price_per_unit numeric(12, 2) not null default 0,
  stock         numeric(12, 3) not null default 0,
  min_stock     numeric(12, 3) not null default 0,
  created_at    timestamptz not null default now()
);

-- ── Menus ─────────────────────────────────────────────────────────────────────
create table if not exists menus (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  category   text not null default 'Lainnya',
  price      numeric(12, 2) not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── Menu Recipes (BOM) ────────────────────────────────────────────────────────
create table if not exists menu_recipes (
  id       uuid primary key default uuid_generate_v4(),
  menu_id  uuid not null references menus(id) on delete cascade,
  item_id  uuid not null references items(id) on delete restrict,
  quantity numeric(12, 4) not null default 0,
  unit     text not null
);

-- ── Transactions (stok masuk/keluar) ─────────────────────────────────────────
create table if not exists transactions (
  id         uuid primary key default uuid_generate_v4(),
  date       date not null default current_date,
  type       text not null check (type in ('in', 'out')),
  item_id    uuid not null references items(id) on delete restrict,
  quantity   numeric(12, 3) not null,
  notes      text not null default '',
  created_at timestamptz not null default now()
);

-- ── Sales ─────────────────────────────────────────────────────────────────────
create table if not exists sales (
  id          uuid primary key default uuid_generate_v4(),
  date        date not null default current_date,
  menu_id     uuid not null references menus(id) on delete restrict,
  quantity    integer not null default 1,
  total_price numeric(12, 2) not null default 0,
  created_at  timestamptz not null default now()
);

-- ── Expenses ──────────────────────────────────────────────────────────────────
create table if not exists expenses (
  id          uuid primary key default uuid_generate_v4(),
  date        date not null default current_date,
  category    text not null default 'Lainnya',
  description text not null default '',
  amount      numeric(12, 2) not null default 0,
  created_at  timestamptz not null default now()
);

-- ── Transfer Requests (BSD → Gading) ────────────────────────────────────────
-- staff BSD submit permintaan barang; owner approve di dashboard
create table if not exists transfer_requests (
  id             uuid primary key default uuid_generate_v4(),
  request_date   date        not null default current_date,
  requested_by   text        not null default '',
  status         text        not null default 'pending'
                   check (status in ('pending', 'approved', 'sent', 'received')),
  notes          text        not null default '',
  approved_at    timestamptz,
  created_at     timestamptz not null default now()
);

create table if not exists transfer_request_items (
  id                 uuid primary key default uuid_generate_v4(),
  request_id         uuid        not null references transfer_requests(id) on delete cascade,
  item_id            uuid        not null references items(id) on delete restrict,
  quantity_requested numeric(12, 3) not null,
  quantity_sent      numeric(12, 3),
  created_at         timestamptz not null default now()
);

-- ── RLS — DISABLE for internal tool (anon key, no auth) ─────────────────────
-- IMPORTANT: run these every time after creating/altering tables.
-- If you see "row-level security" errors, re-run supabase/fix-rls.sql
alter table items                   disable row level security;
alter table menus                   disable row level security;
alter table menu_recipes            disable row level security;
alter table transactions            disable row level security;
alter table sales                   disable row level security;
alter table expenses                disable row level security;
alter table transfer_requests       disable row level security;
alter table transfer_request_items  disable row level security;

-- ── Sample Data (optional, delete if not needed) ─────────────────────────────
-- insert into items (name, category, unit, price_per_unit, stock, min_stock) values
--   ('Ayam Broiler', 'Ayam', 'kg', 35000, 50, 10),
--   ('Tepung Bumbu', 'Bumbu', 'kg', 18000, 20, 5),
--   ('Minyak Goreng', 'Lainnya', 'liter', 20000, 30, 5),
--   ('Garam', 'Bumbu', 'kg', 8000, 10, 2),
--   ('Bawang Putih', 'Bumbu', 'kg', 40000, 5, 1);
