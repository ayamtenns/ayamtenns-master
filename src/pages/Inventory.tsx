import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Item, Transaction } from '../lib/types'
import PageHeader from '../components/PageHeader'
import { Plus, AlertTriangle, ArrowUp, ArrowDown, X, Edit2, AlertCircle, Database, Trash2 } from 'lucide-react'
import { seedDatabase } from '../lib/seedData'

const ITEM_CATEGORIES = ['Ayam', 'Bumbu', 'Sayuran', 'Minuman', 'Kemasan', 'Lainnya']
const UNITS           = ['kg', 'gr', 'liter', 'ml', 'pcs', 'dus', 'pack']

function fmt(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

const inputStyle = { backgroundColor: '#F8F8F6', border: '1px solid #E8E8E6', color: '#0E0E0E' }

// ── Item Modal ────────────────────────────────────────────────────────────────
function ItemModal({ item, onClose, onSave }: { item: Partial<Item>; onClose: () => void; onSave: () => void }) {
  const isEdit = !!item?.id
  const [name, setName]         = useState(item?.name ?? '')
  const [category, setCategory] = useState(item?.category ?? ITEM_CATEGORIES[0])
  const [unit, setUnit]         = useState(item?.unit ?? UNITS[0])
  const [price, setPrice]       = useState(String(item?.price_per_unit ?? ''))
  const [stock, setStock]       = useState(String(item?.stock ?? '0'))
  const [minStock, setMinStock] = useState(String(item?.min_stock ?? ''))
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  async function handleSave() {
    if (!name.trim() || !price) { setError('Nama dan harga wajib diisi.'); return }
    setSaving(true)
    try {
      const data = { name: name.trim(), category, unit, price_per_unit: parseFloat(price), stock: parseFloat(stock) || 0, min_stock: parseFloat(minStock) || 0 }
      if (isEdit && item?.id) {
        const { error: e } = await supabase.from('items').update(data).eq('id', item.id)
        if (e) throw e
      } else {
        const { error: e } = await supabase.from('items').insert(data)
        if (e) throw e
      }
      onSave()
    } catch (e: any) { setError(e.message ?? 'Terjadi kesalahan.') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E6', borderRadius: 16 }} className="w-full max-w-lg">
        <div style={{ borderBottom: '1px solid #E8E8E6' }} className="flex items-center justify-between px-6 py-4">
          <h2 style={{ fontFamily: "'Archivo Black', sans-serif", color: '#0E0E0E', fontSize: 16 }}>
            {isEdit ? 'Edit Barang' : 'Tambah Barang'}
          </h2>
          <button onClick={onClose} style={{ color: '#6B6B6B' }} className="hover:text-[#0E0E0E] transition-colors"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label style={{ color: '#6B6B6B' }} className="block text-xs mb-1.5 uppercase tracking-wider font-medium">Nama Barang *</label>
              <input value={name} onChange={e => setName(e.target.value)} style={inputStyle}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none focus:border-[#D91C1C] transition-colors" />
            </div>
            <div>
              <label style={{ color: '#6B6B6B' }} className="block text-xs mb-1.5 uppercase tracking-wider font-medium">Kategori</label>
              <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none focus:border-[#D91C1C] transition-colors">
                {ITEM_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: '#6B6B6B' }} className="block text-xs mb-1.5 uppercase tracking-wider font-medium">Satuan</label>
              <select value={unit} onChange={e => setUnit(e.target.value)} style={inputStyle}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none focus:border-[#D91C1C] transition-colors">
                {UNITS.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: '#6B6B6B' }} className="block text-xs mb-1.5 uppercase tracking-wider font-medium">Harga/Unit (Rp) *</label>
              <input type="number" value={price} onChange={e => setPrice(e.target.value)} min="0" style={inputStyle}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none focus:border-[#D91C1C] transition-colors" />
            </div>
            <div>
              <label style={{ color: '#6B6B6B' }} className="block text-xs mb-1.5 uppercase tracking-wider font-medium">Stok Awal</label>
              <input type="number" value={stock} onChange={e => setStock(e.target.value)} min="0" style={inputStyle}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none focus:border-[#D91C1C] transition-colors" />
            </div>
            <div>
              <label style={{ color: '#6B6B6B' }} className="block text-xs mb-1.5 uppercase tracking-wider font-medium">Min. Stok Alert</label>
              <input type="number" value={minStock} onChange={e => setMinStock(e.target.value)} min="0" style={inputStyle}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none focus:border-[#D91C1C] transition-colors" />
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

// ── Transaction Modal ─────────────────────────────────────────────────────────
function TxModal({ item, type, onClose, onSave }: { item: Item; type: 'in' | 'out'; onClose: () => void; onSave: () => void }) {
  const [qty, setQty]     = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!qty) return
    setSaving(true)
    const qtyNum   = parseFloat(qty)
    const newStock = type === 'in' ? item.stock + qtyNum : item.stock - qtyNum
    await supabase.from('transactions').insert({ date: new Date().toISOString().split('T')[0], type, item_id: item.id, quantity: qtyNum, notes: notes.trim() })
    await supabase.from('items').update({ stock: Math.max(0, newStock) }).eq('id', item.id)
    setSaving(false); onSave()
  }

  const isIn = type === 'in'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E6', borderRadius: 16 }} className="w-full max-w-sm">
        <div style={{ borderBottom: '1px solid #E8E8E6' }} className="flex items-center justify-between px-6 py-4">
          <h2 style={{ fontFamily: "'Archivo Black', sans-serif", color: isIn ? '#16A34A' : '#DC2626', fontSize: 16 }}>
            {isIn ? 'Stok Masuk' : 'Stok Keluar'}
          </h2>
          <button onClick={onClose} style={{ color: '#6B6B6B' }} className="hover:text-[#0E0E0E] transition-colors"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div style={{ backgroundColor: '#F8F8F6', border: '1px solid #EFEFED', borderRadius: 10 }} className="p-3">
            <div style={{ color: '#6B6B6B' }} className="text-xs mb-0.5 font-medium">Barang</div>
            <div style={{ color: '#0E0E0E' }} className="text-sm font-semibold">{item.name}</div>
            <div style={{ color: '#ABABAB' }} className="text-xs mt-0.5">Stok saat ini: {item.stock} {item.unit}</div>
          </div>
          <div>
            <label style={{ color: '#6B6B6B' }} className="block text-xs mb-1.5 uppercase tracking-wider font-medium">Jumlah ({item.unit})</label>
            <input type="number" value={qty} onChange={e => setQty(e.target.value)} min="0" step="0.001" autoFocus
              style={inputStyle} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none focus:border-[#D91C1C] transition-colors" />
          </div>
          <div>
            <label style={{ color: '#6B6B6B' }} className="block text-xs mb-1.5 uppercase tracking-wider font-medium">Catatan</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="opsional..."
              style={inputStyle} className="w-full px-3 py-2.5 rounded-xl text-sm outline-none focus:border-[#D91C1C] transition-colors" />
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} style={{ border: '1px solid #E8E8E6', color: '#6B6B6B' }}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium hover:text-[#0E0E0E] transition-colors">Batal</button>
            <button onClick={handleSave} disabled={saving || !qty}
              style={{ backgroundColor: isIn ? '#16A34A' : '#DC2626' }}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors disabled:opacity-60">
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Stat card with accent left border ─────────────────────────────────────────
function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      border: '1px solid #E8E8E6',
      borderLeft: `3px solid ${color}`,
      borderRadius: 12,
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    }} className="p-4">
      <div style={{ color: '#6B6B6B' }} className="text-xs uppercase tracking-wider mb-1 font-medium">{label}</div>
      <div style={{ color, fontFamily: "'Archivo Black', sans-serif" }} className="text-2xl">{value}</div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Inventory() {
  const [items, setItems]           = useState<Item[]>([])
  const [transactions, setTx]       = useState<Transaction[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [seeding, setSeeding]       = useState(false)
  const [deleting, setDeleting]     = useState(false)
  const [itemModal, setItemModal]   = useState<'add' | Item | null>(null)
  const [txModal, setTxModal]       = useState<{ item: Item; type: 'in' | 'out' } | null>(null)
  const [activeTab, setActiveTab]   = useState<'items' | 'history'>('items')
  const [search, setSearch]         = useState('')
  const [selected, setSelected]     = useState<Set<string>>(new Set())

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [{ data: itemsData, error: e1 }, { data: txData, error: e2 }] = await Promise.all([
        supabase.from('items').select('*').order('name'),
        supabase.from('transactions').select('*, item:items(name,unit)').order('created_at', { ascending: false }).limit(100),
      ])
      if (e1) throw e1
      if (e2) throw e2
      setItems(itemsData ?? [])
      setTx((txData ?? []) as Transaction[])
    } catch (e: any) {
      setError(e.message ?? 'Gagal memuat data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  async function handleDeleteItem(id: string) {
    if (!confirm('Hapus barang ini?')) return
    await supabase.from('items').delete().eq('id', id)
    setSelected(prev => { const s = new Set(prev); s.delete(id); return s })
    loadData()
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return
    if (!confirm(`Hapus ${selected.size} barang yang dipilih? Aksi ini tidak bisa dibatalkan.`)) return
    setDeleting(true)
    const ids = [...selected]
    await supabase.from('items').delete().in('id', ids)
    setSelected(new Set())
    setDeleting(false)
    loadData()
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length && filtered.length > 0) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(i => i.id)))
    }
  }

  async function handleSeed() {
    if (!confirm('Tambahkan 87 item bahan baku Ayamtenns sebagai data awal?')) return
    setSeeding(true)
    const result = await seedDatabase()
    setSeeding(false)
    if (result.success) { loadData() }
    else { alert('Seed gagal: ' + result.message) }
  }

  const lowStock = items.filter(i => i.stock <= i.min_stock && i.min_stock > 0)
  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
  const today    = new Date().toISOString().split('T')[0]

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Inventory"
        subtitle="Kelola stok bahan baku dan monitor pergerakan barang"
        action={
          <div className="flex gap-2">
            <button onClick={() => setItemModal('add')} style={{ backgroundColor: '#D91C1C' }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold hover:bg-[#B51515] transition-colors">
              <Plus size={14} /> Tambah Barang
            </button>
          </div>
        }
      />

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div style={{ backgroundColor: '#FEF2F2', borderBottom: '1px solid #FECACA' }} className="px-8 py-3 flex items-center gap-2">
          <AlertTriangle size={14} style={{ color: '#DC2626' }} />
          <span style={{ color: '#DC2626' }} className="text-sm font-semibold">{lowStock.length} barang kritis:</span>
          <span style={{ color: '#EF4444' }} className="text-sm">{lowStock.map(i => i.name).join(', ')}</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 px-8 py-5" style={{ borderBottom: '1px solid #E8E8E6' }}>
        <StatCard label="Total Item"         value={items.length}                                                        color="#0E0E0E" />
        <StatCard label="Nilai Stok"         value={fmt(items.reduce((s, i) => s + i.stock * i.price_per_unit, 0))}      color="#D97706" />
        <StatCard label="Stok Kritis"        value={lowStock.length}                                                      color={lowStock.length > 0 ? '#DC2626' : '#16A34A'} />
        <StatCard label="Transaksi Hari Ini" value={transactions.filter(t => t.date === today).length}                   color="#D91C1C" />
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid #E8E8E6', backgroundColor: '#FFFFFF' }} className="flex gap-1 px-8 pt-3">
        {(['items', 'history'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{
              borderBottom: activeTab === tab ? '2px solid #D91C1C' : '2px solid transparent',
              color: activeTab === tab ? '#D91C1C' : '#6B6B6B',
              fontWeight: activeTab === tab ? 600 : 400,
            }}
            className="px-4 py-2.5 text-sm transition-colors">
            {tab === 'items' ? 'Daftar Barang' : 'History Transaksi'}
          </button>
        ))}
      </div>

      <div className="px-8 py-5">
        {activeTab === 'items' && (
          <>
            <div className="mb-4 flex items-center gap-3">
              <input value={search} onChange={e => { setSearch(e.target.value); setSelected(new Set()) }} placeholder="Cari barang..."
                style={inputStyle} className="px-3 py-2 rounded-xl text-sm outline-none focus:border-[#D91C1C] transition-colors w-64" />
              {selected.size > 0 && (
                <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10 }}
                  className="flex items-center gap-3 px-4 py-2">
                  <span style={{ color: '#DC2626' }} className="text-sm font-semibold">{selected.size} dipilih</span>
                  <button onClick={handleBulkDelete} disabled={deleting}
                    style={{ backgroundColor: '#DC2626', color: '#FFFFFF' }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-[#B91C1C] transition-colors disabled:opacity-60">
                    <Trash2 size={12} />
                    {deleting ? 'Menghapus...' : `Hapus ${selected.size} barang`}
                  </button>
                  <button onClick={() => setSelected(new Set())} style={{ color: '#ABABAB' }}
                    className="hover:text-[#DC2626] transition-colors"><X size={14} /></button>
                </div>
              )}
            </div>
            {loading ? (
              <div style={{ color: '#6B6B6B' }} className="py-20 text-center text-sm">Memuat data...</div>
            ) : error ? (
              <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12 }}
                className="flex items-center gap-3 px-5 py-4">
                <AlertCircle size={16} style={{ color: '#DC2626', flexShrink: 0 }} />
                <div>
                  <p style={{ color: '#DC2626' }} className="text-sm font-medium">Gagal memuat data</p>
                  <p style={{ color: '#EF4444' }} className="text-xs mt-0.5">{error}</p>
                </div>
                <button onClick={loadData} style={{ backgroundColor: '#DC2626', color: '#FFFFFF' }}
                  className="ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-[#B91C1C] transition-colors">
                  Coba Lagi
                </button>
              </div>
            ) : items.length === 0 ? (
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E6', borderRadius: 16 }}
                className="flex flex-col items-center justify-center py-16 gap-4">
                <div style={{ backgroundColor: '#F8F8F6', borderRadius: '50%', width: 64, height: 64 }}
                  className="flex items-center justify-center">
                  <Database size={28} style={{ color: '#ABABAB' }} />
                </div>
                <div className="text-center">
                  <p style={{ color: '#0E0E0E' }} className="text-sm font-semibold">Inventory masih kosong</p>
                  <p style={{ color: '#6B6B6B' }} className="text-xs mt-1">Tambah barang manual atau load data awal Ayamtenns</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setItemModal('add')}
                    style={{ border: '1px solid #E8E8E6', color: '#0E0E0E' }}
                    className="px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#F8F8F6] transition-colors">
                    + Tambah Manual
                  </button>
                  <button onClick={handleSeed} disabled={seeding}
                    style={{ backgroundColor: '#D91C1C' }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold hover:bg-[#B51515] transition-colors disabled:opacity-60">
                    <Database size={14} />
                    {seeding ? 'Loading...' : 'Load Data Awal Ayamtenns'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ border: '1px solid #E8E8E6', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <table className="w-full">
                  <thead>
                    <tr style={{ backgroundColor: '#F8F8F6', borderBottom: '1px solid #E8E8E6' }}>
                      <th className="px-4 py-3 w-8">
                        <input type="checkbox"
                          checked={filtered.length > 0 && selected.size === filtered.length}
                          onChange={toggleSelectAll}
                          className="cursor-pointer accent-[#D91C1C]" />
                      </th>
                      {['Nama', 'Kategori', 'Satuan', 'Harga/Unit', 'Stok', 'Min', 'Nilai Stok', ''].map(h => (
                        <th key={h} style={{ color: '#6B6B6B' }}
                          className={`px-4 py-3 text-xs font-medium uppercase tracking-wider ${['Harga/Unit', 'Stok', 'Nilai Stok'].includes(h) ? 'text-right' : 'text-left'}`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody style={{ backgroundColor: '#FFFFFF' }}>
                    {filtered.map(item => {
                      const isLow = item.stock <= item.min_stock && item.min_stock > 0
                      return (
                        <tr key={item.id}
                          style={{ borderBottom: '1px solid #F0F0EE', backgroundColor: selected.has(item.id) ? '#FFF8F8' : undefined }}
                          className="hover:bg-[#FAFAF9] transition-colors">
                          <td className="px-4 py-3 w-8">
                            <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleSelect(item.id)}
                              className="cursor-pointer accent-[#D91C1C]" />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              {isLow && <AlertTriangle size={12} style={{ color: '#DC2626' }} />}
                              <span style={{ color: '#0E0E0E' }} className="text-sm font-medium">{item.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span style={{ backgroundColor: '#F2F2F0', color: '#6B6B6B', border: '1px solid #E8E8E6' }} className="text-xs px-2.5 py-1 rounded-full font-medium">
                              {item.category}
                            </span>
                          </td>
                          <td className="px-4 py-3" style={{ color: '#6B6B6B' }}><span className="text-sm">{item.unit}</span></td>
                          <td className="px-4 py-3 text-right" style={{ color: '#D97706' }}><span className="text-sm font-medium">{fmt(item.price_per_unit)}</span></td>
                          <td className="px-4 py-3 text-right">
                            <span style={{ color: isLow ? '#DC2626' : '#0E0E0E' }} className="text-sm font-semibold">
                              {item.stock} {item.unit}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right" style={{ color: '#ABABAB' }}><span className="text-sm">{item.min_stock}</span></td>
                          <td className="px-4 py-3 text-right" style={{ color: '#0E0E0E' }}><span className="text-sm">{fmt(item.stock * item.price_per_unit)}</span></td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 justify-end">
                              <button onClick={() => setTxModal({ item, type: 'in' })} title="Stok masuk"
                                style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', color: '#16A34A' }}
                                className="p-1.5 rounded-lg hover:bg-[#DCFCE7] transition-colors"><ArrowDown size={11} /></button>
                              <button onClick={() => setTxModal({ item, type: 'out' })} title="Stok keluar"
                                style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}
                                className="p-1.5 rounded-lg hover:bg-[#FEE2E2] transition-colors"><ArrowUp size={11} /></button>
                              <button onClick={() => setItemModal(item)}
                                style={{ color: '#ABABAB' }} className="p-1.5 rounded-lg hover:text-[#D91C1C] transition-colors"><Edit2 size={11} /></button>
                              <button onClick={() => handleDeleteItem(item.id)}
                                style={{ color: '#ABABAB' }} className="p-1.5 rounded-lg hover:text-[#DC2626] transition-colors"><X size={11} /></button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                    {filtered.length === 0 && items.length > 0 && (
                      <tr><td colSpan={9} className="px-4 py-12 text-center" style={{ color: '#ABABAB' }}>Tidak ada barang yang cocok.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {activeTab === 'history' && (
          <div style={{ border: '1px solid #E8E8E6', borderRadius: 16, overflow: 'hidden' }}>
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: '#F8F8F6', borderBottom: '1px solid #E8E8E6' }}>
                  {['Tanggal', 'Barang', 'Tipe', 'Jumlah', 'Catatan'].map(h => (
                    <th key={h} style={{ color: '#6B6B6B' }} className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody style={{ backgroundColor: '#FFFFFF' }}>
                {transactions.map(tx => (
                  <tr key={tx.id} style={{ borderBottom: '1px solid #F0F0EE' }} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-4 py-3" style={{ color: '#6B6B6B' }}><span className="text-sm">{tx.date}</span></td>
                    <td className="px-4 py-3" style={{ color: '#0E0E0E' }}><span className="text-sm font-medium">{tx.item?.name}</span></td>
                    <td className="px-4 py-3">
                      <span style={{
                        backgroundColor: tx.type === 'in' ? '#F0FDF4' : '#FEF2F2',
                        color: tx.type === 'in' ? '#16A34A' : '#DC2626',
                        border: `1px solid ${tx.type === 'in' ? '#BBF7D0' : '#FECACA'}`,
                      }} className="text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1 w-fit">
                        {tx.type === 'in' ? <ArrowDown size={10} /> : <ArrowUp size={10} />}
                        {tx.type === 'in' ? 'Masuk' : 'Keluar'}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: '#0E0E0E' }}><span className="text-sm">{tx.quantity} {tx.item?.unit}</span></td>
                    <td className="px-4 py-3" style={{ color: '#6B6B6B' }}><span className="text-sm">{tx.notes || '—'}</span></td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-12 text-center" style={{ color: '#ABABAB' }}>Belum ada transaksi.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {itemModal && <ItemModal item={itemModal === 'add' ? {} : itemModal} onClose={() => setItemModal(null)} onSave={() => { setItemModal(null); loadData() }} />}
      {txModal   && <TxModal item={txModal.item} type={txModal.type} onClose={() => setTxModal(null)} onSave={() => { setTxModal(null); loadData() }} />}
    </div>
  )
}
