#!/usr/bin/env node
/**
 * migrate.js — run a SQL migration against Supabase via the Management API.
 *
 * Usage:
 *   node migrate.js supabase/some-migration.sql
 *   node migrate.js "ALTER TABLE foo ADD COLUMN bar text"
 *
 * Reads SUPABASE_ACCESS_TOKEN and SUPABASE_URL from .env.local automatically.
 */

import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// ── load .env.local ──────────────────────────────────────────────────────────
const envPath = resolve(process.cwd(), '.env.local')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const [key, ...rest] = trimmed.split('=')
    if (key && rest.length) process.env[key.trim()] = rest.join('=').trim()
  }
}

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const URL   = process.env.VITE_SUPABASE_URL

if (!TOKEN) { console.error('Missing SUPABASE_ACCESS_TOKEN in .env.local'); process.exit(1) }
if (!URL)   { console.error('Missing VITE_SUPABASE_URL in .env.local');   process.exit(1) }

// ── extract project ref from URL ─────────────────────────────────────────────
const ref = URL.replace('https://', '').split('.')[0]

// ── resolve SQL ───────────────────────────────────────────────────────────────
const arg = process.argv[2]
if (!arg) {
  console.error('Usage: node migrate.js <file.sql | "inline SQL">')
  process.exit(1)
}

let sql
if (existsSync(resolve(process.cwd(), arg))) {
  sql = readFileSync(resolve(process.cwd(), arg), 'utf8')
  // strip SQL comments
  sql = sql.replace(/--[^\n]*/g, '').trim()
  console.log(`Running migration: ${arg}`)
} else {
  sql = arg
  console.log('Running inline SQL...')
}

// ── call Management API ───────────────────────────────────────────────────────
const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method:  'POST',
  headers: {
    Authorization:  `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query: sql }),
})

const text = await res.text()
let body
try { body = JSON.parse(text) } catch { body = text }

if (!res.ok) {
  console.error('Migration failed:', body)
  process.exit(1)
}

if (Array.isArray(body) && body.length > 0) {
  console.table(body)
} else {
  console.log('✅ Migration complete.')
}
