import { supabase } from './supabase'

export const SEED_ITEMS = [
  // ── A: Ayam ──────────────────────────────────────────────────────────────
  { name: 'Ayam Utuh Segar',       category: 'Ayam',   unit: 'kg',   price_per_unit: 38000, stock: 50,  min_stock: 10 },
  { name: 'Fillet Dada Ayam',      category: 'Ayam',   unit: 'kg',   price_per_unit: 45000, stock: 30,  min_stock: 8  },
  { name: 'Paha Atas Ayam',        category: 'Ayam',   unit: 'kg',   price_per_unit: 40000, stock: 25,  min_stock: 8  },
  { name: 'Sayap Ayam',            category: 'Ayam',   unit: 'kg',   price_per_unit: 35000, stock: 20,  min_stock: 5  },

  // ── B: Frozen ────────────────────────────────────────────────────────────
  { name: 'Nugget Ayam Frozen',    category: 'Bumbu',  unit: 'kg',   price_per_unit: 55000, stock: 15,  min_stock: 5  },
  { name: 'Kentang Goreng Frozen', category: 'Bumbu',  unit: 'kg',   price_per_unit: 28000, stock: 20,  min_stock: 5  },
  { name: 'Keju Slice Frozen',     category: 'Bumbu',  unit: 'pcs',  price_per_unit: 3500,  stock: 100, min_stock: 20 },
  { name: 'Beef Patty Frozen',     category: 'Bumbu',  unit: 'pcs',  price_per_unit: 12000, stock: 50,  min_stock: 10 },

  // ── C: Fresh Produce ─────────────────────────────────────────────────────
  { name: 'Bawang Putih',          category: 'Bumbu',  unit: 'kg',   price_per_unit: 42000, stock: 5,   min_stock: 2  },
  { name: 'Bawang Bombay',         category: 'Bumbu',  unit: 'kg',   price_per_unit: 25000, stock: 4,   min_stock: 2  },
  { name: 'Cabai Merah',           category: 'Bumbu',  unit: 'kg',   price_per_unit: 55000, stock: 3,   min_stock: 1  },
  { name: 'Selada Keriting',       category: 'Sayuran', unit: 'kg',  price_per_unit: 18000, stock: 2,   min_stock: 1  },
  { name: 'Tomat Segar',           category: 'Sayuran', unit: 'kg',  price_per_unit: 15000, stock: 3,   min_stock: 1  },
  { name: 'Acar Timun',            category: 'Sayuran', unit: 'kg',  price_per_unit: 20000, stock: 5,   min_stock: 2  },
  { name: 'Jeruk Nipis',           category: 'Bumbu',  unit: 'kg',   price_per_unit: 22000, stock: 2,   min_stock: 1  },

  // ── D: Dipjoy / Sauces ───────────────────────────────────────────────────
  { name: 'Tepung Bumbu Nashville', category: 'Bumbu', unit: 'kg',   price_per_unit: 32000, stock: 10,  min_stock: 3  },
  { name: 'Tepung Terigu Protein Tinggi', category: 'Bumbu', unit: 'kg', price_per_unit: 16000, stock: 20, min_stock: 5 },
  { name: 'Saus Nashville Hot',    category: 'Bumbu',  unit: 'liter', price_per_unit: 75000, stock: 5,   min_stock: 2  },
  { name: 'Saus Ranch',            category: 'Bumbu',  unit: 'liter', price_per_unit: 60000, stock: 3,   min_stock: 1  },
  { name: 'Saus Garlic Parm',      category: 'Bumbu',  unit: 'liter', price_per_unit: 65000, stock: 3,   min_stock: 1  },
  { name: 'Saus Mayo',             category: 'Bumbu',  unit: 'liter', price_per_unit: 45000, stock: 4,   min_stock: 1  },
  { name: 'Minyak Goreng',         category: 'Bumbu',  unit: 'liter', price_per_unit: 21000, stock: 30,  min_stock: 10 },
  { name: 'Mentega / Butter',      category: 'Bumbu',  unit: 'kg',   price_per_unit: 85000, stock: 3,   min_stock: 1  },
  { name: 'Garam',                 category: 'Bumbu',  unit: 'kg',   price_per_unit: 8000,  stock: 5,   min_stock: 1  },
  { name: 'Lada Hitam Bubuk',      category: 'Bumbu',  unit: 'kg',   price_per_unit: 120000, stock: 1,  min_stock: 0.5 },

  // ── E: Packaging ─────────────────────────────────────────────────────────
  { name: 'Box Sandwich Medium',   category: 'Kemasan', unit: 'pcs', price_per_unit: 1800,  stock: 500, min_stock: 100 },
  { name: 'Box Nashville Large',   category: 'Kemasan', unit: 'pcs', price_per_unit: 2500,  stock: 300, min_stock: 100 },
  { name: 'Paper Bag Branded',     category: 'Kemasan', unit: 'pcs', price_per_unit: 1200,  stock: 300, min_stock: 100 },
  { name: 'Tissue Dinner',         category: 'Kemasan', unit: 'pack', price_per_unit: 15000, stock: 20, min_stock: 5   },

  // ── F: Minuman ───────────────────────────────────────────────────────────
  { name: 'Air Mineral 600ml',     category: 'Minuman', unit: 'pcs', price_per_unit: 4000,  stock: 100, min_stock: 24 },
  { name: 'Sirup Es Teh',          category: 'Minuman', unit: 'liter', price_per_unit: 35000, stock: 5,  min_stock: 2  },
  { name: 'Susu Full Cream',       category: 'Minuman', unit: 'liter', price_per_unit: 22000, stock: 4,  min_stock: 2  },
]

export async function seedDatabase(): Promise<{ success: boolean; message: string }> {
  try {
    const { error } = await supabase.from('items').insert(SEED_ITEMS)
    if (error) throw error
    return { success: true, message: `${SEED_ITEMS.length} item berhasil ditambahkan.` }
  } catch (e: any) {
    return { success: false, message: e.message ?? 'Gagal seed data.' }
  }
}
