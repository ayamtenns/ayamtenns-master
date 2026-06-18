-- Add branch column to expenses table
-- Run this in Supabase SQL Editor
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS branch text NOT NULL DEFAULT 'BSD';
