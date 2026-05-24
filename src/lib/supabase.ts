import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  items: {
    id: string
    name: string
    category: string
    unit: string
    price_per_unit: number
    stock: number
    min_stock: number
    created_at: string
  }
  menus: {
    id: string
    name: string
    category: string
    price: number
    is_active: boolean
    created_at: string
  }
  menu_recipes: {
    id: string
    menu_id: string
    item_id: string
    quantity: number
    unit: string
  }
  transactions: {
    id: string
    date: string
    type: 'in' | 'out'
    item_id: string
    quantity: number
    notes: string
    created_at: string
  }
  sales: {
    id: string
    date: string
    menu_id: string
    quantity: number
    total_price: number
    created_at: string
  }
  expenses: {
    id: string
    date: string
    category: string
    description: string
    amount: number
    created_at: string
  }
}
