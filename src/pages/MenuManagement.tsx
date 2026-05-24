import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Menu, MenuRecipe, Item } from '../lib/types'
import PageHeader from '../components/PageHeader'
import {
  Plus, ChevronDown, ChevronUp, Edit2, Trash2, X, AlertCircle
} from 'lucide-react'

const CATEGORIES = ['Ayam', 'Minuman', 'Tambahan', 'Paket', 'Lainnya']

// ── helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

function calcCogs(recipes: MenuRecipe[]): number {
  return recipes.reduce((sum, r) => {
    const price = r.item?.price_per_unit ?? 0
    return sum + price * r.quantity
  }, 0)
}

// ── Modal ─────────────────────────────────────────────────────────────────────
interface MenuModalProps {
  menu: Partial<Menu> | null
  items: Item[]
  onClose: () => void
  onSave: () => void
}

function MenuModal({ menu, items, onClose, onSave }: MenuModalProps) {
  const isEdit = !!menu?.id
  const [name, setName] = useState(menu?.name ?? '')
  const [category, setCategory] = useState(menu?.category ?? CATEGORIES[0])
  const [price, setPrice] = useState(String(menu?.price ?? ''))
  const [isActive, setIsActive] = useState(menu?.is_active ?? true)
  const [recipes, setRecipes] = useState<MenuRecipe[]>(menu?.recipes ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // recipe item selector
  const [addItemId, setAddItemId] = useState('')
  const [addQty, setAddQty] = useState('')

  function addRecipe() {
    if (!addItemId || !addQty) return
    const item = items.find(i => i.id === addItemId)
    if (!item) return
    setRecipes(prev => [
      ...prev,
      { id: crypto.randomUUID(), menu_id: menu?.id ?? '', item_id: addItemId, quantity: parseFloat(addQty), unit: item.unit, item }
    ])
    setAddItemId('')
    setAddQty('')
  }

  function removeRecipe(id: string) {
    setRecipes(prev => prev.filter(r => r.id !== id))
  }

  async function handleSave() {
    if (!name.trim() || !price) { setError('Nama dan harga wajib diisi.'); return }
    setSaving(true)
    setError('')
    try {
      let menuId = menu?.id
      const menuData = { name: name.trim(), category, price: parseFloat(price), is_active: isActive }

      if (isEdit && menuId) {
        const { error: e } = await supabase.from('menus').update(menuData).eq('id', menuId)
        if (e) throw e
        // delete old recipes
        await supabase.from('menu_recipes').delete().eq('menu_id', menuId)
      } else {
        const { data, error: e } = await supabase.from('menus').insert(menuData).select().single()
        if (e) throw e
        menuId = data.id
      }

      if (recipes.length > 0 && menuId) {
        const { error: e } = await supabase.from('menu_recipes').insert(
          recipes.map(r => ({ menu_id: menuId, item_id: r.item_id, quantity: r.quantity, unit: r.unit }))
        )
        if (e) throw e
      }

      onSave()
    } catch (e: any) {
      setError(e.message ?? 'Terjadi kesalahan.')
    } finally {
      setSaving(false)
    }
  }

  const cogs = calcCogs(recipes)
  const priceNum = parseFloat(price) || 0
  const margin = priceNum > 0 ? ((priceNum - cogs) / priceNum) * 100 : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div style={{ backgroundColor: '#171614', border: '1px solid #2a2825' }} className="w-full max-w-2xl rounded-xl max-h-[90vh] overflow-y-auto">
        {/* header */}
        <div style={{ borderBottom: '1px solid #2a2825' }} className="flex items-center justify-between px-6 py-4">
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#e8e4dc' }} className="text-xl tracking-wider">
            {isEdit ? 'Edit Menu' : 'Tambah Menu'}
          </h2>
          <button onClick={onClose} style={{ color: '#8a867d' }} className="hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* basic info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label style={{ color: '#8a867d' }} className="block text-xs mb-1.5 uppercase tracking-wider">Nama Menu *</label>
              <input value={name} onChange={e => setName(e.target.value)}
                style={{ backgroundColor: '#0d0c0a', border: '1px solid #2a2825', color: '#e8e4dc' }}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none focus:border-[#e5420d] transition-colors" />
            </div>
            <div>
              <label style={{ color: '#8a867d' }} className="block text-xs mb-1.5 uppercase tracking-wider">Kategori</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                style={{ backgroundColor: '#0d0c0a', border: '1px solid #2a2825', color: '#e8e4dc' }}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none focus:border-[#e5420d] transition-colors">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: '#8a867d' }} className="block text-xs mb-1.5 uppercase tracking-wider">Harga Jual (Rp) *</label>
              <input type="number" value={price} onChange={e => setPrice(e.target.value)} min="0"
                style={{ backgroundColor: '#0d0c0a', border: '1px solid #2a2825', color: '#e8e4dc' }}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none focus:border-[#e5420d] transition-colors" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setIsActive(v => !v)}
              style={{ backgroundColor: isActive ? '#e5420d' : '#2a2825' }}
              className="w-10 h-5 rounded-full relative transition-colors">
              <span style={{ left: isActive ? '22px' : '2px' }} className="absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all" />
            </button>
            <span style={{ color: '#8a867d' }} className="text-sm">{isActive ? 'Aktif' : 'Nonaktif'}</span>
          </div>

          {/* COGS preview */}
          {(cogs > 0 || priceNum > 0) && (
            <div style={{ backgroundColor: '#0d0c0a', border: '1px solid #2a2825' }} className="rounded-lg p-4 grid grid-cols-3 gap-4 text-center">
              <div>
                <div style={{ color: '#8a867d' }} className="text-xs uppercase tracking-wider mb-1">COGS</div>
                <div style={{ color: '#d4a017' }} className="text-lg font-semibold">{fmt(cogs)}</div>
              </div>
              <div>
                <div style={{ color: '#8a867d' }} className="text-xs uppercase tracking-wider mb-1">Harga Jual</div>
                <div style={{ color: '#e8e4dc' }} className="text-lg font-semibold">{fmt(priceNum)}</div>
              </div>
              <div>
                <div style={{ color: '#8a867d' }} className="text-xs uppercase tracking-wider mb-1">Gross Margin</div>
                <div style={{ color: margin >= 30 ? '#22c55e' : margin >= 0 ? '#f59e0b' : '#ef4444' }} className="text-lg font-semibold">
                  {margin.toFixed(1)}%
                </div>
              </div>
            </div>
          )}

          {/* recipes */}
          <div>
            <div style={{ borderBottom: '1px solid #2a2825' }} className="flex items-center justify-between pb-2 mb-3">
              <h3 style={{ color: '#e8e4dc' }} className="text-sm font-semibold uppercase tracking-wider">Resep / BOM</h3>
              <span style={{ color: '#8a867d' }} className="text-xs">{recipes.length} bahan</span>
            </div>

            {/* recipe list */}
            {recipes.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {recipes.map(r => (
                  <div key={r.id} style={{ backgroundColor: '#0d0c0a', border: '1px solid #1e1d1a' }}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg">
                    <div className="flex-1 text-sm" style={{ color: '#e8e4dc' }}>{r.item?.name ?? r.item_id}</div>
                    <div style={{ color: '#8a867d' }} className="text-sm">{r.quantity} {r.unit}</div>
                    <div style={{ color: '#d4a017' }} className="text-sm w-24 text-right">
                      {fmt((r.item?.price_per_unit ?? 0) * r.quantity)}
                    </div>
                    <button onClick={() => removeRecipe(r.id)} style={{ color: '#8a867d' }} className="hover:text-red-400 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* add recipe */}
            <div className="flex gap-2">
              <select value={addItemId} onChange={e => setAddItemId(e.target.value)}
                style={{ backgroundColor: '#0d0c0a', border: '1px solid #2a2825', color: addItemId ? '#e8e4dc' : '#8a867d' }}
                className="flex-1 px-3 py-2 rounded-lg text-sm outline-none focus:border-[#e5420d] transition-colors">
                <option value="">Pilih bahan...</option>
                {items.map(item => (
                  <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>
                ))}
              </select>
              <input type="number" value={addQty} onChange={e => setAddQty(e.target.value)} placeholder="Qty"
                min="0" step="0.001"
                style={{ backgroundColor: '#0d0c0a', border: '1px solid #2a2825', color: '#e8e4dc' }}
                className="w-24 px-3 py-2 rounded-lg text-sm outline-none focus:border-[#e5420d] transition-colors" />
              <button onClick={addRecipe}
                style={{ backgroundColor: '#1a1917', border: '1px solid #2a2825', color: '#e5420d' }}
                className="px-3 py-2 rounded-lg hover:bg-[#2a2825] transition-colors">
                <Plus size={16} />
              </button>
            </div>
          </div>

          {error && <p style={{ color: '#ef4444' }} className="text-xs">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} style={{ border: '1px solid #2a2825', color: '#8a867d' }}
              className="flex-1 py-2.5 rounded-lg text-sm hover:text-white transition-colors">
              Batal
            </button>
            <button onClick={handleSave} disabled={saving}
              style={{ backgroundColor: '#e5420d' }}
              className="flex-1 py-2.5 rounded-lg text-white text-sm font-semibold hover:bg-[#ff5520] transition-colors disabled:opacity-60">
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Row ───────────────────────────────────────────────────────────────────────
interface MenuRowProps {
  menu: Menu
  onEdit: () => void
  onDelete: () => void
}

function MenuRow({ menu, onEdit, onDelete }: MenuRowProps) {
  const [expanded, setExpanded] = useState(false)
  const cogs = menu.cogs ?? 0
  const margin = menu.price > 0 ? ((menu.price - cogs) / menu.price) * 100 : 0

  return (
    <>
      <tr style={{ borderBottom: '1px solid #1e1d1a' }}
        className="hover:bg-[#1a1917] transition-colors">
        <td className="px-5 py-3.5">
          <div className="flex items-center gap-2">
            <button onClick={() => setExpanded(v => !v)} style={{ color: '#8a867d' }} className="hover:text-white transition-colors">
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            <span style={{ color: '#e8e4dc' }} className="text-sm font-medium">{menu.name}</span>
          </div>
        </td>
        <td className="px-5 py-3.5">
          <span style={{ backgroundColor: '#1f1e1b', color: '#8a867d', border: '1px solid #2a2825' }}
            className="text-xs px-2 py-0.5 rounded-full">{menu.category}</span>
        </td>
        <td className="px-5 py-3.5 text-right" style={{ color: '#e8e4dc' }}>{fmt(menu.price)}</td>
        <td className="px-5 py-3.5 text-right" style={{ color: '#d4a017' }}>{fmt(cogs)}</td>
        <td className="px-5 py-3.5 text-right">
          <span style={{ color: margin >= 30 ? '#22c55e' : margin >= 0 ? '#f59e0b' : '#ef4444' }}
            className="text-sm font-semibold">
            {margin.toFixed(1)}%
          </span>
        </td>
        <td className="px-5 py-3.5 text-center">
          <span style={{
            backgroundColor: menu.is_active ? 'rgba(34,197,94,0.1)' : 'rgba(139,92,246,0.1)',
            color: menu.is_active ? '#22c55e' : '#8b5cf6',
            border: `1px solid ${menu.is_active ? 'rgba(34,197,94,0.3)' : 'rgba(139,92,246,0.3)'}`,
          }} className="text-xs px-2 py-0.5 rounded-full">
            {menu.is_active ? 'Aktif' : 'Nonaktif'}
          </span>
        </td>
        <td className="px-5 py-3.5">
          <div className="flex items-center gap-2 justify-end">
            <button onClick={onEdit} style={{ color: '#8a867d' }} className="hover:text-[#e5420d] transition-colors">
              <Edit2 size={14} />
            </button>
            <button onClick={onDelete} style={{ color: '#8a867d' }} className="hover:text-red-400 transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
        </td>
      </tr>
      {expanded && menu.recipes && menu.recipes.length > 0 && (
        <tr style={{ backgroundColor: '#0d0c0a' }}>
          <td colSpan={7} className="px-10 py-3">
            <table className="w-full">
              <thead>
                <tr>
                  {['Bahan', 'Qty', 'Satuan', 'Harga/Unit', 'Subtotal'].map(h => (
                    <th key={h} style={{ color: '#8a867d' }} className="text-left text-xs uppercase tracking-wider pb-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {menu.recipes.map(r => (
                  <tr key={r.id}>
                    <td style={{ color: '#e8e4dc' }} className="text-xs py-1">{r.item?.name}</td>
                    <td style={{ color: '#8a867d' }} className="text-xs py-1">{r.quantity}</td>
                    <td style={{ color: '#8a867d' }} className="text-xs py-1">{r.unit}</td>
                    <td style={{ color: '#d4a017' }} className="text-xs py-1">{fmt(r.item?.price_per_unit ?? 0)}</td>
                    <td style={{ color: '#d4a017' }} className="text-xs py-1">{fmt((r.item?.price_per_unit ?? 0) * r.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      )}
      {expanded && (!menu.recipes || menu.recipes.length === 0) && (
        <tr style={{ backgroundColor: '#0d0c0a' }}>
          <td colSpan={7} className="px-10 py-3">
            <p style={{ color: '#8a867d' }} className="text-xs">Belum ada resep untuk menu ini.</p>
          </td>
        </tr>
      )}
    </>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MenuManagement() {
  const [menus, setMenus] = useState<Menu[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'add' | Menu | null>(null)
  const [filterCategory, setFilterCategory] = useState('Semua')
  const [search, setSearch] = useState('')

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

    setMenus(enriched)
    setItems(itemsData ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  async function handleDelete(id: string) {
    if (!confirm('Hapus menu ini?')) return
    await supabase.from('menu_recipes').delete().eq('menu_id', id)
    await supabase.from('menus').delete().eq('id', id)
    loadData()
  }

  const filtered = menus.filter(m => {
    const catOk = filterCategory === 'Semua' || m.category === filterCategory
    const searchOk = m.name.toLowerCase().includes(search.toLowerCase())
    return catOk && searchOk
  })

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
        subtitle="Kelola daftar menu, resep, dan kalkulasi margin"
        action={
          <button onClick={() => setModal('add')}
            style={{ backgroundColor: '#e5420d' }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold hover:bg-[#ff5520] transition-colors">
            <Plus size={15} /> Tambah Menu
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 px-8 py-5" style={{ borderBottom: '1px solid #1e1d1a' }}>
        {[
          { label: 'Total Menu', value: stats.total, color: '#e8e4dc' },
          { label: 'Menu Aktif', value: stats.active, color: '#22c55e' },
          { label: 'Avg. Margin', value: `${stats.avgMargin.toFixed(1)}%`, color: stats.avgMargin >= 30 ? '#22c55e' : '#f59e0b' },
          { label: 'Margin Rendah (<20%)', value: stats.lowMargin, color: stats.lowMargin > 0 ? '#ef4444' : '#22c55e', icon: stats.lowMargin > 0 ? <AlertCircle size={14} /> : null },
        ].map(s => (
          <div key={s.label} style={{ backgroundColor: '#171614', border: '1px solid #2a2825' }} className="rounded-xl p-4">
            <div style={{ color: '#8a867d' }} className="text-xs uppercase tracking-wider mb-1">{s.label}</div>
            <div style={{ color: s.color }} className="text-2xl font-bold flex items-center gap-1">
              {s.value}{s.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 px-8 py-4" style={{ borderBottom: '1px solid #1e1d1a' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari menu..."
          style={{ backgroundColor: '#171614', border: '1px solid #2a2825', color: '#e8e4dc' }}
          className="px-3 py-2 rounded-lg text-sm outline-none focus:border-[#e5420d] transition-colors w-56" />
        <div className="flex gap-1">
          {['Semua', ...CATEGORIES].map(cat => (
            <button key={cat} onClick={() => setFilterCategory(cat)}
              style={{
                backgroundColor: filterCategory === cat ? '#e5420d' : '#171614',
                border: '1px solid #2a2825',
                color: filterCategory === cat ? 'white' : '#8a867d',
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:border-[#e5420d]">
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="px-8 py-5">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div style={{ color: '#8a867d' }} className="text-sm">Memuat data...</div>
          </div>
        ) : (
          <div style={{ border: '1px solid #1e1d1a' }} className="rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: '#0d0c0a', borderBottom: '1px solid #1e1d1a' }}>
                  {['Nama Menu', 'Kategori', 'Harga Jual', 'COGS', 'Gross Margin', 'Status', ''].map(h => (
                    <th key={h} style={{ color: '#8a867d' }}
                      className={`px-5 py-3 text-xs font-medium uppercase tracking-wider ${['Harga Jual', 'COGS'].includes(h) ? 'text-right' : h === 'Gross Margin' ? 'text-right' : 'text-left'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody style={{ backgroundColor: '#171614' }}>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center" style={{ color: '#8a867d' }}>
                      Tidak ada menu ditemukan.
                    </td>
                  </tr>
                ) : (
                  filtered.map(menu => (
                    <MenuRow key={menu.id} menu={menu}
                      onEdit={() => setModal(menu)}
                      onDelete={() => handleDelete(menu.id)} />
                  ))
                )}
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
