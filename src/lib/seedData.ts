import { supabase } from './supabase'

// Data diambil dari Google Sheet "ayamTenns bsd Barang" — sheet: Barang (A001–I029)
// unit       = Satuan Beli
// price_per_unit = Harga Beli (Rp)
// stock      = Stok Akhir (satuan beli), nilai negatif dibulatkan ke 0
// min_stock  = Stok Minimum dari sheet (0 jika tidak diisi)

export const SEED_ITEMS = [
  // ── A: AYAM ──────────────────────────────────────────────────────────────────
  { name: 'Ayam Tender',      category: 'AYAM', unit: 'pack', price_per_unit: 87500,  stock: 25.3,  min_stock: 3 },
  { name: 'Ayam Pops',        category: 'AYAM', unit: 'pack', price_per_unit: 80000,  stock: 37,    min_stock: 3 },
  { name: 'Ayam Dada Dadu',   category: 'AYAM', unit: 'pack', price_per_unit: 75000,  stock: 35,    min_stock: 3 },
  { name: 'Ayam Paha Fillet', category: 'AYAM', unit: 'pcs',  price_per_unit: 7000,   stock: 6,     min_stock: 5 },

  // ── B: FROZEN ─────────────────────────────────────────────────────────────────
  { name: 'Kentang',             category: 'FROZEN', unit: 'pack', price_per_unit: 64000, stock: 2.1, min_stock: 0 },
  { name: 'Roti Burger',         category: 'FROZEN', unit: 'pcs',  price_per_unit: 7500,  stock: 7,   min_stock: 0 },
  { name: 'T-Nuggets',           category: 'FROZEN', unit: 'pcs',  price_per_unit: 3500,  stock: 0,   min_stock: 0 },
  { name: 'Caramelized Onions',  category: 'FROZEN', unit: 'pcs',  price_per_unit: 0,     stock: 0,   min_stock: 0 },

  // ── C: Fresh Ingredients ──────────────────────────────────────────────────────
  { name: 'Telor Omega',    category: 'Fresh Ingredients', unit: 'pcs',  price_per_unit: 2530,   stock: 276, min_stock: 0 },
  { name: 'Selada',         category: 'Fresh Ingredients', unit: 'gr',   price_per_unit: 140,    stock: 644, min_stock: 0 },
  { name: 'Tomat',          category: 'Fresh Ingredients', unit: 'gr',   price_per_unit: 90,     stock: 164, min_stock: 0 },
  { name: 'Wisman',         category: 'Fresh Ingredients', unit: 'gr',   price_per_unit: 192,    stock: 0,   min_stock: 0 },
  { name: 'Pickle',         category: 'Fresh Ingredients', unit: 'jar',  price_per_unit: 100000, stock: 0,   min_stock: 0 },
  { name: 'Keju Slice',     category: 'Fresh Ingredients', unit: 'pack', price_per_unit: 176400, stock: 0,   min_stock: 0 },
  { name: 'Keju Parmesan',  category: 'Fresh Ingredients', unit: 'pack', price_per_unit: 70000,  stock: 0,   min_stock: 0 },

  // ── D: Dipjoy ─────────────────────────────────────────────────────────────────
  { name: 'Comeback Sauce Cup',    category: 'Dipjoy', unit: 'pcs', price_per_unit: 2000, stock: 0,   min_stock: 0 },
  { name: 'Honey Mustard Cup',     category: 'Dipjoy', unit: 'pcs', price_per_unit: 2500, stock: 0,   min_stock: 0 },
  { name: 'Fancy Ranch Cup',       category: 'Dipjoy', unit: 'pcs', price_per_unit: 2700, stock: 0,   min_stock: 0 },
  { name: 'White Cheese Cup',      category: 'Dipjoy', unit: 'pcs', price_per_unit: 2205, stock: 0,   min_stock: 0 },
  { name: 'Comeback Sauce Refill', category: 'Dipjoy', unit: 'gr',  price_per_unit: 59,   stock: 0,   min_stock: 0 },
  { name: 'Roasted Garlic Refill', category: 'Dipjoy', unit: 'gr',  price_per_unit: 56,   stock: 0,   min_stock: 0 },
  { name: 'Smoking Sauce Refill',  category: 'Dipjoy', unit: 'gr',  price_per_unit: 72,   stock: 540, min_stock: 0 },
  { name: 'Fancy Ranch Refill',    category: 'Dipjoy', unit: 'gr',  price_per_unit: 88,   stock: 0,   min_stock: 0 },
  { name: 'White Cheese Refill',   category: 'Dipjoy', unit: 'gr',  price_per_unit: 67,   stock: 38,  min_stock: 0 },
  { name: 'Comeback Sauce Sachet', category: 'Dipjoy', unit: 'pcs', price_per_unit: 1000, stock: 340, min_stock: 0 },

  // ── E: Spice ──────────────────────────────────────────────────────────────────
  { name: 'Medium', category: 'Spice', unit: 'pack', price_per_unit: 79000, stock: 0, min_stock: 0 },

  // ── F: Tenns Drink ────────────────────────────────────────────────────────────
  { name: 'Susu Full Cream',   category: 'Tenns Drink', unit: 'pcs',  price_per_unit: 18000, stock: 22,   min_stock: 0 },
  { name: 'Fanta Botol',       category: 'Tenns Drink', unit: 'pcs',  price_per_unit: 2750,  stock: 33,   min_stock: 0 },
  { name: 'Cola Botol',        category: 'Tenns Drink', unit: 'btl',  price_per_unit: 10000, stock: 0,    min_stock: 0 },
  { name: 'Sprite Botol',      category: 'Tenns Drink', unit: 'btl',  price_per_unit: 10000, stock: 0,    min_stock: 0 },
  { name: 'Greenfield Susu',   category: 'Tenns Drink', unit: 'btl',  price_per_unit: 33500, stock: 0,    min_stock: 0 },
  { name: 'Mineral Water',     category: 'Tenns Drink', unit: 'pcs',  price_per_unit: 2500,  stock: 20.4, min_stock: 0 },
  { name: 'Black Tea',         category: 'Tenns Drink', unit: 'pack', price_per_unit: 75000, stock: 88,   min_stock: 0 },
  { name: 'Lemon Tea',         category: 'Tenns Drink', unit: 'pack', price_per_unit: 42000, stock: 1.2,  min_stock: 0 },
  { name: 'Peach Tea',         category: 'Tenns Drink', unit: 'pack', price_per_unit: 42000, stock: 13.4, min_stock: 0 },
  { name: 'Lychee Tea',        category: 'Tenns Drink', unit: 'pack', price_per_unit: 42000, stock: 0.2,  min_stock: 0 },
  { name: 'Vit Galon',         category: 'Tenns Drink', unit: 'pcs',  price_per_unit: 20000, stock: 6,    min_stock: 0 },

  // ── G: Other Ingredients ──────────────────────────────────────────────────────
  { name: 'Tepung',        category: 'Other Ingredients', unit: 'pack',  price_per_unit: 18502,  stock: 19.4, min_stock: 0 },
  { name: 'Minyak',        category: 'Other Ingredients', unit: 'pcs',   price_per_unit: 42000,  stock: 82,   min_stock: 0 },
  { name: 'Mentega',       category: 'Other Ingredients', unit: 'gr',    price_per_unit: 30,     stock: 1740, min_stock: 0 },
  { name: 'Beras',         category: 'Other Ingredients', unit: 'pcs',   price_per_unit: 74500,  stock: 12.4, min_stock: 0 },
  { name: 'Minyak Cabai',  category: 'Other Ingredients', unit: 'batch', price_per_unit: 118620, stock: 0,    min_stock: 0 },
  { name: 'Adonan Basah',  category: 'Other Ingredients', unit: 'batch', price_per_unit: 15860,  stock: 0,    min_stock: 0 },

  // ── H: Misc ───────────────────────────────────────────────────────────────────
  { name: 'Sarung Tangan',              category: 'Misc', unit: 'pack', price_per_unit: 4500,  stock: 17,  min_stock: 0 },
  { name: 'Garam',                      category: 'Misc', unit: 'pcs',  price_per_unit: 15000, stock: 0,   min_stock: 0 },
  { name: 'Sarung Tangan Jualan (100)', category: 'Misc', unit: 'pack', price_per_unit: 15000, stock: 1,   min_stock: 0 },
  { name: 'Kantong Sampah 60x100',      category: 'Misc', unit: 'pack', price_per_unit: 25000, stock: 2,   min_stock: 0 },
  { name: 'Tissue',                     category: 'Misc', unit: 'pcs',  price_per_unit: 30000, stock: 1,   min_stock: 0 },
  { name: 'Selotip',                    category: 'Misc', unit: 'pcs',  price_per_unit: 3000,  stock: 0,   min_stock: 0 },
  { name: 'Sambal Sachet',              category: 'Misc', unit: 'pack', price_per_unit: 8000,  stock: 3.7, min_stock: 0 },
  { name: 'Sticker',                    category: 'Misc', unit: 'pcs',  price_per_unit: 12000, stock: 4,   min_stock: 0 },
  { name: 'Kertas Print Thermal',       category: 'Misc', unit: 'pack', price_per_unit: 4500,  stock: 1,   min_stock: 0 },
  { name: 'Gas Portable',               category: 'Misc', unit: 'pcs',  price_per_unit: 20000, stock: 0,   min_stock: 0 },
  { name: 'Sabun Cuci Piring',          category: 'Misc', unit: 'jrg',  price_per_unit: 75000, stock: 1,   min_stock: 0 },
  { name: 'Sabun Pell',                 category: 'Misc', unit: 'jrg',  price_per_unit: 50000, stock: 1.5, min_stock: 0 },
  { name: 'Sabun Lap Meja',             category: 'Misc', unit: 'jrg',  price_per_unit: 50000, stock: 0,   min_stock: 0 },
  { name: 'Batre',                      category: 'Misc', unit: 'pack', price_per_unit: 80000, stock: 0,   min_stock: 0 },
  { name: 'Tisu Dapur Gulung',          category: 'Misc', unit: 'pcs',  price_per_unit: 20000, stock: 0,   min_stock: 0 },

  // ── I: Packaging ──────────────────────────────────────────────────────────────
  { name: 'Kotak Burger',         category: 'Packaging', unit: 'pack', price_per_unit: 52500,  stock: 0,    min_stock: 1 },
  { name: 'Box Solo',             category: 'Packaging', unit: 'pack', price_per_unit: 165000, stock: 1.4,  min_stock: 1 },
  { name: 'Box Maniacc',          category: 'Packaging', unit: 'pack', price_per_unit: 364500, stock: 14,   min_stock: 0 },
  { name: 'Wrapping Paper',       category: 'Packaging', unit: 'pack', price_per_unit: 312500, stock: 0,    min_stock: 0 },
  { name: 'Dine in Tray',         category: 'Packaging', unit: 'pack', price_per_unit: 325000, stock: 0,    min_stock: 0 },
  { name: 'Paper Bowl 360ml',     category: 'Packaging', unit: 'pack', price_per_unit: 12500,  stock: 0,    min_stock: 0 },
  { name: 'Paper Bowl 500ml',     category: 'Packaging', unit: 'pack', price_per_unit: 16000,  stock: 3,    min_stock: 0 },
  { name: 'Tutup Bowl 360ml',     category: 'Packaging', unit: 'pack', price_per_unit: 11000,  stock: 5.6,  min_stock: 0 },
  { name: 'Tutup Bowl 500ml',     category: 'Packaging', unit: 'pack', price_per_unit: 12000,  stock: 2,    min_stock: 0 },
  { name: 'Plastik Uk 15',        category: 'Packaging', unit: 'pack', price_per_unit: 20000,  stock: 0,    min_stock: 0 },
  { name: 'Plastik Uk 20',        category: 'Packaging', unit: 'pack', price_per_unit: 20000,  stock: 12,   min_stock: 0 },
  { name: 'Plastik Uk 25',        category: 'Packaging', unit: 'pack', price_per_unit: 20000,  stock: 12,   min_stock: 0 },
  { name: 'Plastik Uk 30',        category: 'Packaging', unit: 'pack', price_per_unit: 35000,  stock: 0,    min_stock: 0 },
  { name: 'Plastik 1 Gelas',      category: 'Packaging', unit: 'pack', price_per_unit: 10000,  stock: 2,    min_stock: 0 },
  { name: 'Plastik 2 Gelas',      category: 'Packaging', unit: 'pack', price_per_unit: 10000,  stock: 0,    min_stock: 0 },
  { name: 'Bowl Plastik Telor',   category: 'Packaging', unit: 'pack', price_per_unit: 10000,  stock: 0,    min_stock: 0 },
  { name: 'Gelas Tenns',          category: 'Packaging', unit: 'pack', price_per_unit: 30000,  stock: 4.6,  min_stock: 0 },
  { name: 'Tali Merah',           category: 'Packaging', unit: 'pack', price_per_unit: 6000,   stock: 10,   min_stock: 0 },
  { name: 'Tas Tenns',            category: 'Packaging', unit: 'pcs',  price_per_unit: 10000,  stock: 0,    min_stock: 0 },
  { name: 'Cup Saus',             category: 'Packaging', unit: 'pack', price_per_unit: 12000,  stock: 1.9,  min_stock: 0 },
  { name: 'Sendok Plastik',       category: 'Packaging', unit: 'pack', price_per_unit: 5000,   stock: 40,   min_stock: 0 },
  { name: 'Box Nasi',             category: 'Packaging', unit: 'pack', price_per_unit: 22500,  stock: 0,    min_stock: 0 },
  { name: 'Sedotan',              category: 'Packaging', unit: 'pack', price_per_unit: 15000,  stock: 1,    min_stock: 0 },
  { name: 'Tatakan Gelas 2 Gelas',category: 'Packaging', unit: 'pack', price_per_unit: 30000,  stock: 0,    min_stock: 0 },
  { name: 'Cup Saus Gede',        category: 'Packaging', unit: 'pack', price_per_unit: 12000,  stock: 2.3,  min_stock: 0 },
  { name: 'Plastik Klip 8x5',     category: 'Packaging', unit: 'pack', price_per_unit: 5000,   stock: 0,    min_stock: 0 },
  { name: 'Plastik Klip 6x4',     category: 'Packaging', unit: 'pack', price_per_unit: 3500,   stock: 0,    min_stock: 0 },
  { name: 'Cup Ranch 100ml',      category: 'Packaging', unit: 'pack', price_per_unit: 20000,  stock: 0,    min_stock: 0 },
  { name: 'Cup Extra Telor',      category: 'Packaging', unit: 'pack', price_per_unit: 15000,  stock: 0,    min_stock: 0 },
]

/** Detect if a Supabase error is caused by Row-Level Security. */
function isRLSError(err: { code?: string; message?: string }): boolean {
  const code = err.code ?? ''
  const msg  = (err.message ?? '').toLowerCase()
  return code === '42501' || code === 'PGRST301' || msg.includes('row-level security') || msg.includes('rls')
}

export async function seedDatabase(): Promise<{ success: boolean; message: string }> {
  try {
    const { error } = await supabase.from('items').insert(SEED_ITEMS)
    if (error) {
      if (isRLSError(error)) {
        return {
          success: false,
          message:
            'RLS (Row-Level Security) aktif di tabel items.\n' +
            'Jalankan supabase/fix-rls.sql di Supabase SQL Editor, lalu coba lagi.',
        }
      }
      throw error
    }
    return { success: true, message: `${SEED_ITEMS.length} item berhasil ditambahkan.` }
  } catch (e: any) {
    return { success: false, message: e.message ?? 'Gagal seed data.' }
  }
}
