export interface Item {
  id: string
  name: string
  category: string
  unit: string
  price_per_unit: number
  stock: number
  stock_gading: number
  min_stock: number
  notes: string
  par_order_qty: number
  gading_source: 'produksi' | 'supplier'
  created_at: string
}

export interface GadingProduction {
  id: string
  date: string
  type: 'produksi' | 'supplier'
  notes: string
  created_at: string
  items?: GadingProductionItem[]
}

export interface GadingProductionItem {
  id: string
  production_id: string
  item_id: string
  quantity: number
  created_at: string
  item?: Pick<Item, 'name' | 'unit' | 'category'>
}

export interface GadingMaterial {
  id: string
  name: string
  category: string
  unit: string
  stock: number
  notes: string
  created_at: string
}

export interface GadingMaterialTransaction {
  id: string
  material_id: string
  date: string
  type: 'in' | 'out'
  quantity: number
  notes: string
  created_at: string
  material?: Pick<GadingMaterial, 'name' | 'unit'>
}

export interface Menu {
  id: string
  name: string
  category: string
  price: number
  is_active: boolean
  created_at: string
  cogs?: number
  margin?: number
  recipes?: MenuRecipe[]
}

export interface MenuRecipe {
  id: string
  menu_id: string
  item_id: string
  quantity: number
  unit: string
  item?: Item
}

export interface Transaction {
  id: string
  date: string
  type: 'in' | 'out'
  item_id: string
  quantity: number
  notes: string
  created_at: string
  item?: Item
}

export interface Sale {
  id: string
  date: string
  menu_id: string
  quantity: number
  total_price: number
  created_at: string
  menu?: Menu
}

export interface TransferRequest {
  id: string
  request_date: string
  requested_by: string
  status: 'pending' | 'approved' | 'sent' | 'received'
  notes: string
  approved_at: string | null
  created_at: string
  items?: TransferRequestItem[]
}

export interface TransferRequestItem {
  id: string
  request_id: string
  item_id: string
  quantity_requested: number
  quantity_sent: number | null
  created_at: string
  item?: Pick<Item, 'name' | 'unit' | 'category'>
}

export interface Expense {
  id: string
  date: string
  category: string
  description: string
  amount: number
  created_at: string
}
