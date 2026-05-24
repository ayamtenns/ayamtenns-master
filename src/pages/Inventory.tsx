import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Item, Transaction } from '../lib/types'
import PageHeader from '../components/PageHeader'
import { Plus, AlertTriangle, ArrowUp, ArrowDown, X, Package } from 'lucide-react'

const ITEM_CATEGORIES = ['Ayam', 'Bumbu', 'Sayuran', 'Minuman', 'Kemasan', 'Lainnya']
const UNITS = ['kg', 'gr', 'liter', 'ml', 'pcs', 'dus', 'pack']

function fmt(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

// ── Item Modal ────────────────────────────────────────────────────────────────
interface ItemModalProps {
  item: Partial<Item> | null
  onClose: () => void
  onSave: () => void
}

function ItemModal({ item, onClose, onSave }: ItemModalProps) {
  const isEdit = !!item?.id
  const [name, setName] = useState(item?.name ?? '')
  const [category, setCategory] = useState(item?.category ?? ITEM_CATEGORIES[0])
  const [unit, setUnit] = useState(item?.unit ?? UNITS[0])
  const [price, setPrice] = useState(String(item?.price_per_unit ?? ''))
  const [stock, setStock] = useState(String(item?.stock ?? '0'))
  const [minStock, setMinStock] = useState(String(item?.min_stock ?? ''))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!name.trim() || !price) { setError('Nama dan harga wajib diisi.'); return }
    setSaving(true)
    try {
      const data = {
        name: name.trim(), category, unit,
        price_per_unit: parseFloat(price),
        stock: parseFloat(stock) || 0,
        min_stock: parseFloat(minStock) || 0,
      }
      if (isEdit && item?.id) {
        const { error: e } = await supabase.from('items').update(data).eq('id', item.id)
        if (e) throw e
      } else {
        const { error: e } = await supabase.from('items').insert(data)
        if (e) throw e
      }
      onSave()
    } catch (e: any) {
      setError(e.message ?? 'Terjadi kesalahan.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div style={{ backgroundColor: '#171614', border: '1px solid #2a2825' }} className="w-full max-w-lg rounded-xl">
        <div style={{ borderBottom: '1px solid #2a2825' }} className="flex items-center justify-between px-6 py-4">
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#e8e4dc' }} className="text-xl tracking-wider">
            {isEdit ? 'Edit Barang' : 'Tambah Barang'}
          </h2>
          <button onClick={onClose} style={{ color: '#8a867d' }} className="hover:text-white transition-colors"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label style={{ color: '#8a867d' }} className="block text-xs mb-1.5 uppercase tracking-wider">Nama Barang *</label>
              <input value={name} onChange={e => setName(e.target.value)}
                style={{ backgroundColor: '#0d0c0a', border: '1px solid #2a2825', color: '#e8e4dc' }}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none focus:border-[#e5420d] transition-colors" />
            </div>
            <div>
              <label style={{ color: '#8a867d' }} className="block text-xs mb-1.5 uppercase tracking-wider">Kategori</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                style={{ backgroundColor: '#0d0c0a', border: '1px solid #2a2825', color: '#e8e4dc' }}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none focus:border-[#e5420d] transition-colors">
                {ITEM_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: '#8a867d' }} className="block text-xs mb-1.5 uppercase tracking-wider">Satuan</label>
              <select value={unit} onChange={e => setUnit(e.target.value)}
                style={{ backgroundColor: '#0d0c0a', border: '1px solid #2a2825', color: '#e8e4dc' }}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none focus:border-[#e5420d] transition-colors">
                {UNITS.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: '#8a867d' }} className="block text-xs mb-1.5 uppercase tracking-wider">Harga/Unit (Rp) *</label>
              <input type="number" value={price} onChange={e => setPrice(e.target.value)} min="0"
                style={{ backgroundColor: '#0d0c0a', border: '1px solid #2a2825', color: '#e8e4dc' }}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none focus:border-[#e5420d] transition-colors" />
            </div>
            <div>
              <label style={{ color: '#8a867d' }} className="block text-xs mb-1.5 uppercase tracking-wider">Stok Awal</label>
              <input type="number" value={stock} onChange={e => setStock(e.target.value)} min="0"
                style={{ backgroundColor: '#0d0c0a', border: '1px solid #2a2825', color: '#e8e4dc' }}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none focus:border-[#e5420d] transition-colors" />
            </div>
            <div>
              <label style={{ color: '#8a867d' }} className="block text-xs mb-1.5 uppercase tracking-wider">Min. Stok Alert</label>
              <input type="number" value={minStock} onChange={e => setMinStock(e.target.value)} min="0"
                style={{ backgroundColor: '#0d0c0a', border: '1px solid #2a2825', color: '#e8e4dc' }}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none focus:border-[#e5420d] transition-colors" />
            </div>
          </div>
          {error && <p style={{ color: '#ef4444' }} className="text-xs">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} style={{ border: '1px solid #2a2825', color: '#8a867d' }}
              className="flex-1 py-2.5 rounded-lg text-sm hover:text-white transition-colors">Batal</button>
            <button onClick={handleSave} disabled={saving} style={{ backgroundColor: '#e5420d' }}
              className="flex-1 py-2.5 rounded-lg text-white text-sm font-semibold hover:bg-[#ff5520] transition-colors disabled:opacity-60">
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Transaction Modal ─────────────────────────────────────────────────────────
interface TxModalProps {
  item: Item
  type: 'in' | 'out'
  onClose: () => void
  onSave: () => void
}

function TxModal({ item, type, onClose, onSave }: TxModalProps) {
  const [qty, setQty] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!qty) return
    setSaving(true)
    const qtyNum = parseFloat(qty)
    const newStock = type === 'in' ? item.stock + qtyNum : item.stock - qtyNum
    await supabase.from('transactions').insert({
      date: new Date().toISOString().split('T')[0],
      type,
      item_id: item.id,
      quantity: qtyNum,
      notes: notes.trim(),
    })
    await supabase.from('items').update({ stock: Math.max(0, newStock) }).eq('id', item.id)
    setSaving(false)
    onSave()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div style={{ backgroundColor: '#171614', border: '1px solid #2a2825' }} className="w-full max-w-sm rounded-xl">
        <div style={{ borderBottom: '1px solid #2a2825' }} className="flex items-center justify-between px-6 py-4">
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", color: type === 'in' ? '#22c55e' : '#ef4444' }} className="text-xl tracking-wider">
            {type === 'in' ? 'Stok Masuk' : 'Stok Keluar'}
          </h2>
          <button onClick={onClose} style={{ color: '#8a867d' }} className="hover:text-white transition-colors"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div style={{ backgroundColor: '#0d0c0a', border: '1px solid #1e1d1a' }} className="rounded-lg p-3">
            <div style={{ color: '#8a867d' }} className="text-xs mb-0.5">Barang</div>
            <div style={{ color: '#e8e4dc' }} className="text-sm font-medium">{item.name}</div>
            <div style={{ color: '#8a867d' }} className="text-xs mt-0.5">Stok saat ini: {item.stock} {item.unit}</div>
          </div>
          <div>
            <label style={{ color: '#8a867d' }} className="block text-xs mb-1.5 uppercase tracking-wider">Jumlah ({item.unit})</label>
            <input type="number" value={qty} onChange={e => setQty(e.target.value)} min="0" step="0.001" autoFocus
              style={{ backgroundColor: '#0d0c0a', border: '1px solid #2a2825', color: '#e8e4dc' }}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none focus:border-[#e5420d] transition-colors" />
          </div>
          <div>
            <label style={{ color: '#8a867d' }} className="block text-xs mb-1.5 uppercase tracking-wider">Catatan</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="opsional..."
              style={{ backgroundColor: '#0d0c0a', border: '1px solid #2a2825', color: '#e8e4dc' }}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none focus:border-[#e5420d] transition-colors" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} style={{ border: '1px solid #2a2825', color: '#8a867d' }}
              className="flex-1 py-2.5 rounded-lg text-sm hover:text-white transition-colors">Batal</button>
            <button onClick={handleSave} disabled={saving || !qty}
              style={{ backgroundColor: type === 'in' ? '#22c55e' : '#e5420d' }}
              className="flex-1 py-2.5 rounded-lg text-white text-sm font-semibold transition-colors disabled:opacity-60">
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Inventory() {
  const [items, setItems] = useState<Item[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [itemModal, setItemModal] = useState<'add' | Item | null>(null)
  const [txModal, setTxModal] = useState<{ item: Item; type: 'in' | 'out' } | null>(null)
  const [activeTab, setActiveTab] = useState<'items' | 'history'>('items')
  const [search, setSearch] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    const [{ data: itemsData }, { data: txData }] = await Promise.all([
      supabase.from('items').select('*').order('name'),
      supabase.from('transactions').select('*, item:items(name,unit)').order('created_at', { ascending: false }).limit(100),
    ])
    setItems(itemsData ?? [])
    setTransactions((txData ?? []) as Transaction[])
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  async function handleDeleteItem(id: string) {
    if (!confirm('Hapus barang ini?')) return
    await supabase.from('items').delete().eq('id', id)
    loadData()
  }

  const lowStockItems = items.filter(i => i.stock <= i.min_stock && i.min_stock > 0)
  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Inventory"
        subtitle="Kelola stok bahan baku dan monitor pergerakan barang"
        action={
          <button onClick={() => setItemModal('add')}
            style={{ backgroundColor: '#e5420d' }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold hover:bg-[#ff5520] transition-colors">
            <Plus size={15} /> Tambah Barang
          </button>
        }
      />

      {/* Low stock alert */}
      {lowStockItems.length > 0 && (
        <div style={{ backgroundColor: 'rgba(239,68,68,0.05)', borderBottom: '1px solid rgba(239,68,68,0.2)' }}
          className="px-8 py-3 flex items-center gap-2">
          <AlertTriangle size={14} style={{ color: '#ef4444' }} />
          <span style={{ color: '#ef4444' }} className="text-sm font-medium">
            {lowStockItems.length} barang di bawah minimum:
          </span>
          <span style={{ color: '#f87171' }} className="text-sm">
            {lowStockItems.map(i => i.name).join(', ')}
          </span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 px-8 py-5" style={{ borderBottom: '1px solid #1e1d1a' }}>
        {[
          { label: 'Total Item', value: items.length, color: '#e8e4dc' },
          { label: 'Total Nilai Stok', value: fmt(items.reduce((s, i) => s + i.stock * i.price_per_unit, 0)), color: '#d4a017' },
          { label: 'Stok Kritis', value: lowStockItems.length, color: lowStockItems.length > 0 ? '#ef4444' : '#22c55e' },
          { label: 'Transaksi Hari Ini', value: transactions.filter(t => t.date === new Date().toISOString().split('T')[0]).length, color: '#e8e4dc' },
        ].map(s => (
          <div key={s.label} style={{ backgroundColor: '#171614', border: '1px solid #2a2825' }} className="rounded-xl p-4">
            <div style={{ color: '#8a867d' }} className="text-xs uppercase tracking-wider mb-1">{s.label}</div>
            <div style={{ color: s.color }} className="text-2xl font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid #1e1d1a' }} className="flex gap-1 px-8 pt-4">
        {(['items', 'history'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{
              borderBottom: activeTab === tab ? '2px solid #e5420d' : '2px solid transparent',
              color: activeTab === tab ? '#e5420d' : '#8a867d',
            }}
            className="px-4 py-2 text-sm font-medium capitalize transition-colors">
            {tab === 'items' ? 'Daftar Barang' : 'History Transaksi'}
          </button>
        ))}
      </div>

      <div className="px-8 py-5">
        {activeTab === 'items' && (
          <>
            <div className="mb-4">
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari barang..."
                style={{ backgroundColor: '#171614', border: '1px solid #2a2825', color: '#e8e4dc' }}
                className="px-3 py-2 rounded-lg text-sm outline-none focus:border-[#e5420d] transition-colors w-64" />
            </div>
            {loading ? (
              <div style={{ color: '#8a867d' }} className="py-20 text-center text-sm">Memuat data...</div>
            ) : (
              <div style={{ border: '1px solid #1e1d1a' }} className="rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr style={{ backgroundColor: '#0d0c0a', borderBottom: '1px solid #1e1d1a' }}>
                      {['Nama', 'Kategori', 'Satuan', 'Harga/Unit', 'Stok', 'Min Stok', 'Nilai Stok', ''].map(h => (
                        <th key={h} style={{ color: '#8a867d' }}
                          className={`px-4 py-3 text-xs font-medium uppercase tracking-wider ${['Harga/Unit', 'Stok', 'Nilai Stok'].includes(h) ? 'text-right' : 'text-left'}`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody style={{ backgroundColor: '#171614' }}>
                    {filtered.map(item => {
                      const isLow = item.stock <= item.min_stock && item.min_stock > 0
                      return (
                        <tr key={item.id} style={{ borderBottom: '1px solid #1e1d1a' }}
                          className="hover:bg-[#1a1917] transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {isLow && <AlertTriangle size={12} style={{ color: '#ef4444' }} />}
                              <span style={{ color: '#e8e4dc' }} className="text-sm">{item.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span style={{ backgroundColor: '#1f1e1b', color: '#8a867d', border: '1px solid #2a2825' }}
                              className="text-xs px-2 py-0.5 rounded-full">{item.category}</span>
                          </td>
                          <td className="px-4 py-3" style={{ color: '#8a867d' }}><span className="text-sm">{item.unit}</span></td>
                          <td className="px-4 py-3 text-right" style={{ color: '#d4a017' }}><span className="text-sm">{fmt(item.price_per_unit)}</span></td>
                          <td className="px-4 py-3 text-right">
                            <span style={{ color: isLow ? '#ef4444' : '#e8e4dc' }} className="text-sm font-medium">
                              {item.stock} {item.unit}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right" style={{ color: '#8a867d' }}><span className="text-sm">{item.min_stock}</span></td>
                          <td className="px-4 py-3 text-right" style={{ color: '#e8e4dc' }}>
                            <span className="text-sm">{fmt(item.stock * item.price_per_unit)}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5 justify-end">
                              <button onClick={() => setTxModal({ item, type: 'in' })} title="Stok masuk"
                                style={{ backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e' }}
                                className="p-1.5 rounded hover:bg-[rgba(34,197,94,0.2)] transition-colors">
                                <ArrowDown size={12} />
                              </button>
                              <button onClick={() => setTxModal({ item, type: 'out' })} title="Stok keluar"
                                style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}
                                className="p-1.5 rounded hover:bg-[rgba(239,68,68,0.2)] transition-colors">
                                <ArrowUp size={12} />
                              </button>
                              <button onClick={() => setItemModal(item)}
                                style={{ color: '#8a867d' }} className="p-1.5 rounded hover:text-[#e5420d] transition-colors">
                                <Package size={12} />
                              </button>
                              <button onClick={() => handleDeleteItem(item.id)}
                                style={{ color: '#8a867d' }} className="p-1.5 rounded hover:text-red-400 transition-colors">
                                <X size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {activeTab === 'history' && (
          <div style={{ border: '1px solid #1e1d1a' }} className="rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: '#0d0c0a', borderBottom: '1px solid #1e1d1a' }}>
                  {['Tanggal', 'Barang', 'Tipe', 'Jumlah', 'Catatan'].map(h => (
                    <th key={h} style={{ color: '#8a867d' }} className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody style={{ backgroundColor: '#171614' }}>
                {transactions.map(tx => (
                  <tr key={tx.id} style={{ borderBottom: '1px solid #1e1d1a' }} className="hover:bg-[#1a1917] transition-colors">
                    <td className="px-4 py-3" style={{ color: '#8a867d' }}><span className="text-sm">{tx.date}</span></td>
                    <td className="px-4 py-3" style={{ color: '#e8e4dc' }}><span className="text-sm">{tx.item?.name}</span></td>
                    <td className="px-4 py-3">
                      <span style={{
                        backgroundColor: tx.type === 'in' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                        color: tx.type === 'in' ? '#22c55e' : '#ef4444',
                        border: `1px solid ${tx.type === 'in' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                      }} className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                        {tx.type === 'in' ? <ArrowDown size={10} /> : <ArrowUp size={10} />}
                        {tx.type === 'in' ? 'Masuk' : 'Keluar'}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: '#e8e4dc' }}>
                      <span className="text-sm">{tx.quantity} {tx.item?.unit}</span>
                    </td>
                    <td className="px-4 py-3" style={{ color: '#8a867d' }}><span className="text-sm">{tx.notes || '—'}</span></td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-10 text-center" style={{ color: '#8a867d' }}>Belum ada transaksi.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {itemModal && (
        <ItemModal item={itemModal === 'add' ? {} : itemModal} onClose={() => setItemModal(null)} onSave={() => { setItemModal(null); loadData() }} />
      )}
      {txModal && (
        <TxModal item={txModal.item} type={txModal.type} onClose={() => setTxModal(null)} onSave={() => { setTxModal(null); loadData() }} />
      )}
    </div>
  )
}
