import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Menu, MenuRecipe, Item } from '../lib/types'
import PageHeader from '../components/PageHeader'
import { Plus, ChevronDown, ChevronUp, Edit2, Trash2, X, AlertCircle } from 'lucide-react'

const CATEGORIES = ['Ayam', 'Minuman', 'Tambahan', 'Paket', 'Lainnya']

function fmt(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}
function calcCogs(recipes: MenuRecipe[]) {
  return recipes.reduce((s, r) => s + (r.item?.price_per_unit ?? 0) * r.quantity, 0)
}

// ── shared style helpers ──────────────────────────────────────────────────────
const inputStyle = { backgroundColor: '#F8F8F6', border: '1px solid #E8E8E6', color: '#0E0E0E' }
const cardStyle  = { backgroundColor: '#FFFFFF', border: '1px solid #E8E8E6' }

// ── Modal ─────────────────────────────────────────────────────────────────────
function MenuModal({ menu, items, onClose, onSave }: {
  menu: Partial<Menu>; items: Item[]; onClose: () => void; onSave: () => void
}) {
  const isEdit = !!menu?.id
  const [name, setName]         = useState(menu?.name ?? '')
  const [category, setCategory] = useState(menu?.category ?? CATEGORIES[0])
  const [price, setPrice]       = useState(String(menu?.price ?? ''))
  const [isActive, setIsActive] = useState(menu?.is_active ?? true)
  const [recipes, setRecipes]   = useState<MenuRecipe[]>(menu?.recipes ?? [])
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [addItemId, setAddItemId] = useState('')
  const [addQty, setAddQty]       = useState('')

  function addRecipe() {
    if (!addItemId || !addQty) return
    const item = items.find(i => i.id === addItemId)
    if (!item) return
    setRecipes(p => [...p, { id: crypto.randomUUID(), menu_id: menu?.id ?? '', item_id: addItemId, quantity: parseFloat(addQty), unit: item.unit, item }])
    setAddItemId(''); setAddQty('')
  }

  async function handleSave() {
    if (!name.trim() || !price) { setError('Nama dan harga wajib diisi.'); return }
    setSaving(true); setError('')
    try {
      let menuId = menu?.id
      const data = { name: name.trim(), category, price: parseFloat(price), is_active: isActive }
      if (isEdit && menuId) {
        const { error: e } = await supabase.from('menus').update(data).eq('id', menuId)
        if (e) throw e
        await supabase.from('menu_recipes').delete().eq('menu_id', menuId)
      } else {
        const { data: d, error: e } = await supabase.from('menus').insert(data).select().single()
        if (e) throw e
        menuId = d.id
      }
      if (recipes.length > 0 && menuId) {
        const { error: e } = await supabase.from('menu_recipes').insert(
          recipes.map(r => ({ menu_id: menuId, item_id: r.item_id, quantity: r.quantity, unit: r.unit }))
        )
        if (e) throw e
      }
      onSave()
    } catch (e: any) { setError(e.message ?? 'Terjadi kesalahan.') }
    finally { setSaving(false) }
  }

  const cogs    = calcCogs(recipes)
  const priceNum = parseFloat(price) || 0
  const margin  = priceNum > 0 ? ((priceNum - cogs) / priceNum) * 100 : 0
  const marginColor = margin >= 30 ? '#16A34A' : margin >= 0 ? '#D97706' : '#DC2626'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div style={{ ...cardStyle, borderRadius: 16 }} className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div style={{ borderBottom: '1px solid #E8E8E6' }} className="flex items-center justify-between px-6 py-4">
          <h2 style={{ fontFamily: "'Archivo Black', sans-serif", color: '#0E0E0E', fontSize: 16 }}>
            {isEdit ? 'Edit Menu' : 'Tambah Menu'}
          </h2>
          <button onClick={onClose} style={{ color: '#6B6B6B' }} className="hover:text-[#0E0E0E] transition-colors"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label style={{ color: '#6B6B6B' }} className="block text-xs mb-1.5 uppercase tracking-wider font-medium">Nama Menu *</label>
              <input value={name} onChange={e => setName(e.target.value)} style={inputStyle}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none focus:border-[#D91C1C] transition-colors" />
            </div>
            <div>
              <label style={{ color: '#6B6B6B' }} className="block text-xs mb-1.5 uppercase tracking-wider font-medium">Kategori</label>
              <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none focus:border-[#D91C1C] transition-colors">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: '#6B6B6B' }} className="block text-xs mb-1.5 uppercase tracking-wider font-medium">Harga Jual (Rp) *</label>
              <input type="number" value={price} onChange={e => setPrice(e.target.value)} min="0" style={inputStyle}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none focus:border-[#D91C1C] transition-colors" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setIsActive(v => !v)}
              style={{ backgroundColor: isActive ? '#D91C1C' : '#E8E8E6' }}
              className="w-9 h-5 rounded-full relative transition-colors flex-shrink-0">
              <span style={{ left: isActive ? '20px' : '2px' }} className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all" />
            </button>
            <span style={{ color: '#6B6B6B' }} className="text-sm">{isActive ? 'Aktif' : 'Nonaktif'}</span>
          </div>

          {(cogs > 0 || priceNum > 0) && (
            <div style={{ backgroundColor: '#F8F8F6', border: '1px solid #E8E8E6', borderRadius: 12 }} className="p-4 grid grid-cols-3 gap-4 text-center">
              {[
                { label: 'COGS', value: fmt(cogs), color: '#D97706' },
                { label: 'Harga Jual', value: fmt(priceNum), color: '#0E0E0E' },
                { label: 'Gross Margin', value: `${margin.toFixed(1)}%`, color: marginColor },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ color: '#6B6B6B' }} className="text-xs uppercase tracking-wider mb-1 font-medium">{s.label}</div>
                  <div style={{ color: s.color, fontFamily: "'Archivo Black', sans-serif" }} className="text-lg">{s.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Recipes */}
          <div>
            <div style={{ borderBottom: '1px solid #E8E8E6' }} className="flex items-center justify-between pb-2 mb-3">
              <h3 style={{ color: '#0E0E0E' }} className="text-sm font-semibold uppercase tracking-wider">Resep / BOM</h3>
              <span style={{ color: '#6B6B6B' }} className="text-xs">{recipes.length} bahan</span>
            </div>
            {recipes.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {recipes.map(r => (
                  <div key={r.id} style={{ backgroundColor: '#F8F8F6', border: '1px solid #EFEFED', borderRadius: 8 }}
                    className="flex items-center gap-3 px-3 py-2">
                    <div className="flex-1 text-sm" style={{ color: '#0E0E0E' }}>{r.item?.name ?? r.item_id}</div>
                    <div style={{ color: '#6B6B6B' }} className="text-sm">{r.quantity} {r.unit}</div>
                    <div style={{ color: '#D97706' }} className="text-sm w-24 text-right font-medium">
                      {fmt((r.item?.price_per_unit ?? 0) * r.quantity)}
                    </div>
                    <button onClick={() => setRecipes(p => p.filter(x => x.id !== r.id))}
                      style={{ color: '#ABABAB' }} className="hover:text-[#DC2626] transition-colors"><X size={13} /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <select value={addItemId} onChange={e => setAddItemId(e.target.value)}
                style={{ ...inputStyle, color: addItemId ? '#0E0E0E' : '#ABABAB' }}
                className="flex-1 px-3 py-2 rounded-xl text-sm outline-none focus:border-[#D91C1C] transition-colors">
                <option value="">Pilih bahan...</option>
                {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
              </select>
              <input type="number" value={addQty} onChange={e => setAddQty(e.target.value)} placeholder="Qty" min="0" step="0.001"
                style={inputStyle} className="w-20 px-3 py-2 rounded-xl text-sm outline-none focus:border-[#D91C1C] transition-colors" />
              <button onClick={addRecipe} style={{ backgroundColor: '#D91C1C', color: '#FFFFFF' }}
                className="px-3 py-2 rounded-xl hover:bg-[#B51515] transition-colors">
                <Plus size={15} />
              </button>
            </div>
          </div>

          {error && <p style={{ color: '#DC2626' }} className="text-xs">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} style={{ border: '1px solid #E8E8E6', color: '#6B6B6B' }}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium hover:text-[#0E0E0E] transition-colors">Batal</button>
            <button onClick={handleSave} disabled={saving} style={{ backgroundColor: '#D91C1C' }}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold hover:bg-[#B51515] transition-colors disabled:opacity-60">
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Row ───────────────────────────────────────────────────────────────────────
function MenuRow({ menu, onEdit, onDelete }: { menu: Menu; onEdit: () => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const cogs   = menu.cogs ?? 0
  const margin = menu.price > 0 ? ((menu.price - cogs) / menu.price) * 100 : 0
  const marginColor = margin >= 30 ? '#16A34A' : margin >= 0 ? '#D97706' : '#DC2626'

  return (
    <>
      <tr style={{ borderBottom: '1px solid #F0F0EE' }} className="hover:bg-[#FAFAFA] transition-colors">
        <td className="px-5 py-3.5">
          <div className="flex items-center gap-2">
            <button onClick={() => setExpanded(v => !v)} style={{ color: '#ABABAB' }} className="hover:text-[#0E0E0E] transition-colors">
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            <span style={{ color: '#0E0E0E' }} className="text-sm font-medium">{menu.name}</span>
          </div>
        </td>
        <td className="px-5 py-3.5">
          <span style={{ backgroundColor: '#F2F2F0', color: '#6B6B6B', border: '1px solid #E8E8E6' }} className="text-xs px-2.5 py-1 rounded-full font-medium">
            {menu.category}
          </span>
        </td>
        <td className="px-5 py-3.5 text-right" style={{ color: '#0E0E0E' }}><span className="text-sm font-medium">{fmt(menu.price)}</span></td>
        <td className="px-5 py-3.5 text-right" style={{ color: '#D97706' }}><span className="text-sm">{fmt(cogs)}</span></td>
        <td className="px-5 py-3.5 text-right">
          <span style={{ color: marginColor }} className="text-sm font-semibold">{margin.toFixed(1)}%</span>
        </td>
        <td className="px-5 py-3.5">
          <span style={{
            backgroundColor: menu.is_active ? '#F0FDF4' : '#F5F3FF',
            color: menu.is_active ? '#16A34A' : '#7C3AED',
            border: `1px solid ${menu.is_active ? '#BBF7D0' : '#DDD6FE'}`,
          }} className="text-xs px-2.5 py-1 rounded-full font-medium">
            {menu.is_active ? 'Aktif' : 'Nonaktif'}
          </span>
        </td>
        <td className="px-5 py-3.5">
          <div className="flex items-center gap-2 justify-end">
            <button onClick={onEdit} style={{ color: '#ABABAB' }} className="hover:text-[#D91C1C] transition-colors p-1"><Edit2 size={13} /></button>
            <button onClick={onDelete} style={{ color: '#ABABAB' }} className="hover:text-[#DC2626] transition-colors p-1"><Trash2 size={13} /></button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr style={{ backgroundColor: '#FAFAFA' }}>
          <td colSpan={7} className="px-12 py-3">
            {menu.recipes && menu.recipes.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr>
                    {['Bahan', 'Qty', 'Satuan', 'Harga/Unit', 'Subtotal'].map(h => (
                      <th key={h} style={{ color: '#ABABAB' }} className="text-left text-xs uppercase tracking-wider pb-2 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {menu.recipes.map(r => (
                    <tr key={r.id}>
                      <td style={{ color: '#0E0E0E' }} className="text-xs py-1">{r.item?.name}</td>
                      <td style={{ color: '#6B6B6B' }} className="text-xs py-1">{r.quantity}</td>
                      <td style={{ color: '#6B6B6B' }} className="text-xs py-1">{r.unit}</td>
                      <td style={{ color: '#D97706' }} className="text-xs py-1">{fmt(r.item?.price_per_unit ?? 0)}</td>
                      <td style={{ color: '#D97706' }} className="text-xs py-1 font-medium">{fmt((r.item?.price_per_unit ?? 0) * r.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ color: '#ABABAB' }} className="text-xs">Belum ada resep untuk menu ini.</p>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function MenuManagement() {
  const [menus, setMenus]               = useState<Menu[]>([])
  const [items, setItems]               = useState<Item[]>([])
  const [loading, setLoading]           = useState(true)
  const [modal, setModal]               = useState<'add' | Menu | null>(null)
  const [filterCategory, setFilterCategory] = useState('Semua')
  const [search, setSearch]             = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    const [{ data: menusData }, { data: itemsData }, { data: recipesData }] = await Promise.all([
      supabase.from('menus').select('*').order('name'),
      supabase.from('items').select('*').order('name'),
      supabase.from('menu_recipes').select('*, item:items(*)'),
    ])
    const enriched: Menu[] = (menusData ?? []).map(m => {
      const recipes = (recipesData ?? []).filter(r => r.menu_id === m.id) as MenuRecipe[]
      const cogs = calcCogs(recipes)
      return { ...m, recipes, cogs, margin: m.price > 0 ? ((m.price - cogs) / m.price) * 100 : 0 }
    })
    setMenus(enriched); setItems(itemsData ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  async function handleDelete(id: string) {
    if (!confirm('Hapus menu ini?')) return
    await supabase.from('menu_recipes').delete().eq('menu_id', id)
    await supabase.from('menus').delete().eq('id', id)
    loadData()
  }

  const filtered = menus.filter(m =>
    (filterCategory === 'Semua' || m.category === filterCategory) &&
    m.name.toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total: menus.length,
    active: menus.filter(m => m.is_active).length,
    avgMargin: menus.length ? menus.reduce((s, m) => s + (m.margin ?? 0), 0) / menus.length : 0,
    lowMargin: menus.filter(m => (m.margin ?? 0) < 20).length,
  }

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Menu Management"
        subtitle="Kelola menu, resep, dan kalkulasi margin"
        action={
          <button onClick={() => setModal('add')} style={{ backgroundColor: '#D91C1C' }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold hover:bg-[#B51515] transition-colors">
            <Plus size={14} /> Tambah Menu
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 px-8 py-5" style={{ borderBottom: '1px solid #E8E8E6' }}>
        {[
          { label: 'Total Menu',     value: stats.total,                   color: '#0E0E0E' },
          { label: 'Menu Aktif',     value: stats.active,                  color: '#16A34A' },
          { label: 'Avg. Margin',    value: `${stats.avgMargin.toFixed(1)}%`, color: stats.avgMargin >= 30 ? '#16A34A' : '#D97706' },
          { label: 'Margin < 20%',  value: stats.lowMargin,               color: stats.lowMargin > 0 ? '#DC2626' : '#16A34A' },
        ].map(s => (
          <div key={s.label} style={cardStyle} className="rounded-2xl p-4">
            <div style={{ color: '#6B6B6B' }} className="text-xs uppercase tracking-wider mb-1 font-medium">{s.label}</div>
            <div style={{ color: s.color, fontFamily: "'Archivo Black', sans-serif" }} className="text-2xl flex items-center gap-1">
              {s.value}
              {s.label === 'Margin < 20%' && stats.lowMargin > 0 && <AlertCircle size={14} />}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 px-8 py-4" style={{ borderBottom: '1px solid #E8E8E6', backgroundColor: '#FFFFFF' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari menu..."
          style={inputStyle} className="px-3 py-2 rounded-xl text-sm outline-none focus:border-[#D91C1C] transition-colors w-56" />
        <div className="flex gap-1.5">
          {['Semua', ...CATEGORIES].map(cat => (
            <button key={cat} onClick={() => setFilterCategory(cat)}
              style={{
                backgroundColor: filterCategory === cat ? '#D91C1C' : '#F8F8F6',
                border: '1px solid ' + (filterCategory === cat ? '#D91C1C' : '#E8E8E6'),
                color: filterCategory === cat ? '#FFFFFF' : '#6B6B6B',
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="px-8 py-5">
        {loading ? (
          <div style={{ color: '#6B6B6B' }} className="flex items-center justify-center py-20 text-sm">Memuat data...</div>
        ) : (
          <div style={{ border: '1px solid #E8E8E6', borderRadius: 16, overflow: 'hidden' }}>
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: '#F8F8F6', borderBottom: '1px solid #E8E8E6' }}>
                  {['Nama Menu', 'Kategori', 'Harga Jual', 'COGS', 'Gross Margin', 'Status', ''].map(h => (
                    <th key={h} style={{ color: '#6B6B6B' }}
                      className={`px-5 py-3 text-xs font-medium uppercase tracking-wider ${['Harga Jual', 'COGS', 'Gross Margin'].includes(h) ? 'text-right' : 'text-left'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody style={{ backgroundColor: '#FFFFFF' }}>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-12 text-center" style={{ color: '#ABABAB' }}>Tidak ada menu ditemukan.</td></tr>
                ) : filtered.map(menu => (
                  <MenuRow key={menu.id} menu={menu}
                    onEdit={() => setModal(menu)}
                    onDelete={() => handleDelete(menu.id)} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <MenuModal
          menu={modal === 'add' ? {} : modal}
          items={items}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); loadData() }}
        />
      )}
    </div>
  )
}
