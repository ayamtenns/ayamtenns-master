-- ── Migration: Transfer Request module ───────────────────────────────────────
-- Run this in Supabase Dashboard → SQL Editor
-- Adds tables for BSD → Gading transfer request flow

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
  request_id         uuid           not null references transfer_requests(id) on delete cascade,
  item_id            uuid           not null references items(id) on delete restrict,
  quantity_requested numeric(12, 3) not null,
  quantity_sent      numeric(12, 3),
  created_at         timestamptz    not null default now()
);

ALTER TABLE transfer_requests       DISABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_request_items  DISABLE ROW LEVEL SECURITY;
