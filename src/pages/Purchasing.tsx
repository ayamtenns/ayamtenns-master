import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Item } from '../lib/types'
import PageHeader from '../components/PageHeader'
import { Plus, X, AlertCircle } from 'lucide-react'

function fmt(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}
const inputStyle = { backgroundColor: '#F8F8F6', border: '1px solid #E8E8E6', color: '#0E0E0E' }

interface Purchase {
  id: string; date: string; item_id: string; quantity: number; notes: string; created_at: string
  item?: { name: string; unit: string; price_per_unit: number }
}

function PurchaseModal({ items, onClose, onSave }: { items: Item[]; onClose: () => void; onSave: () => void }) {
  const [itemId, setItemId] = useState('')
  const [qty, setQty]       = useState('')
  const [date, setDate]     = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes]   = useState('')
  const [saving, setSaving] = useState(false)
  const selected = items.find(i => i.id === itemId)

  async function handleSave() {
    if (!itemId || !qty) return
    setSaving(true)
    const qtyNum = parseFloat(qty)
    await supabase.from('transactions').insert({ date, type: 'in', item_id: itemId, quantity: qtyNum, notes: notes.trim() || 'Pembelian' })
    await supabase.from('items').update({ stock: (selected?.stock ?? 0) + qtyNum }).eq('id', itemId)
    setSaving(false); onSave()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E6', borderRadius: 16 }} className="w-full max-w-md">
        <div style={{ borderBottom: '1px solid #E8E8E6' }} className="flex items-center justify-between px-6 py-4">
          <h2 style={{ fontFamily: "'Archivo Black', sans-serif", color: '#0E0E0E', fontSize: 16 }}>Catat Pembelian</h2>
          <button onClick={onClose} style={{ color: '#6B6B6B' }} className="hover:text-[#0E0E0E] transition-colors"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label style={{ color: '#6B6B6B' }} className="block text-xs mb-1.5 uppercase tracking-wider font-medium">Tanggal</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none focus:border-[#D91C1C] transition-colors" />
          </div>
          <div>
            <label style={{ color: '#6B6B6B' }} className="block text-xs mb-1.5 uppercase tracking-wider font-medium">Barang *</label>
            <select value={itemId} onChange={e => setItemId(e.target.value)}
              style={{ ...inputStyle, color: itemId ? '#0E0E0E' : '#ABABAB' }}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none focus:border-[#D91C1C] transition-colors">
              <option value="">Pilih barang...</option>
              {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
            </select>
          </div>
          {selected && (
            <div style={{ backgroundColor: '#F8F8F6', border: '1px solid #EFEFED', borderRadius: 10 }} className="px-3 py-2 text-xs">
              <span style={{ color: '#6B6B6B' }}>Harga ref: </span>
              <span style={{ color: '#D97706', fontWeight: 600 }}>{fmt(selected.price_per_unit)}/{selected.unit}</span>
              <span style={{ color: '#ABABAB' }}> · Stok: {selected.stock} {selected.unit}</span>
            </div>
          )}
          <div>
            <label style={{ color: '#6B6B6B' }} className="block text-xs mb-1.5 uppercase tracking-wider font-medium">
              Jumlah ({selected?.unit ?? '—'}) *
            </label>
            <input type="number" value={qty} onChange={e => setQty(e.target.value)} min="0" step="0.001" style={inputStyle}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none focus:border-[#D91C1C] transition-colors" />
          </div>
          {selected && qty && (
            <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10 }} className="px-3 py-2 text-xs text-center">
              <span style={{ color: '#6B6B6B' }}>Estimasi biaya: </span>
              <span style={{ color: '#16A34A', fontWeight: 700, fontSize: 14 }}>{fmt(selected.price_per_unit * parseFloat(qty || '0'))}</span>
            </div>
          )}
          <div>
            <label style={{ color: '#6B6B6B' }} className="block text-xs mb-1.5 uppercase tracking-wider font-medium">Catatan</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Supplier, dll..." style={inputStyle}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none focus:border-[#D91C1C] transition-colors" />
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} style={{ border: '1px solid #E8E8E6', color: '#6B6B6B' }}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium hover:text-[#0E0E0E] transition-colors">Batal</button>
            <button onClick={handleSave} disabled={saving || !itemId || !qty} style={{ backgroundColor: '#D91C1C' }}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold hover:bg-[#B51515] transition-colors disabled:opacity-60">
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

export default function Purchasing() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [items, setItems]         = useState<Item[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [{ data: txData, error: e1 }, { data: itemsData, error: e2 }] = await Promise.all([
        supabase.from('transactions').select('*, item:items(name,unit,price_per_unit)').eq('type', 'in').order('date', { ascending: false }).limit(200),
        supabase.from('items').select('*').order('name'),
      ])
      if (e1) throw e1
      if (e2) throw e2
      setPurchases((txData ?? []) as Purchase[])
      setItems(itemsData ?? [])
    } catch (e: any) {
      setError(e.message ?? 'Gagal memuat data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const thisMonth   = new Date().toISOString().slice(0, 7)
  const monthPurch  = purchases.filter(p => p.date.startsWith(thisMonth))
  const totalMonth  = monthPurch.reduce((s, p) => s + (p.item?.price_per_unit ?? 0) * p.quantity, 0)

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Purchasing"
        subtitle="Catat dan pantau pembelian bahan baku"
        action={
          <button onClick={() => setShowModal(true)} style={{ backgroundColor: '#D91C1C' }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold hover:bg-[#B51515] transition-colors">
            <Plus size={14} /> Catat Pembelian
          </button>
        }
      />

      <div className="grid grid-cols-3 gap-4 px-8 py-5" style={{ borderBottom: '1px solid #E8E8E6' }}>
        <StatCard label="Total Pembelian Bulan Ini" value={fmt(totalMonth)}   color="#D97706" />
        <StatCard label="Transaksi Bulan Ini"       value={monthPurch.length} color="#D91C1C" />
        <StatCard label="Total Transaksi"           value={purchases.length}  color="#6B6B6B" />
      </div>

      <div className="px-8 py-5">
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
        ) : purchases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div style={{ color: '#ABABAB', fontSize: 40 }}>📦</div>
            <p style={{ color: '#6B6B6B' }} className="text-sm font-medium">Belum ada data pembelian</p>
            <p style={{ color: '#ABABAB' }} className="text-xs">Klik "Catat Pembelian" untuk mulai merekam transaksi</p>
          </div>
        ) : (
          <div style={{ border: '1px solid #E8E8E6', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: '#F8F8F6', borderBottom: '1px solid #E8E8E6' }}>
                  {['Tanggal', 'Barang', 'Jumlah', 'Harga/Unit', 'Total', 'Catatan'].map(h => (
                    <th key={h} style={{ color: '#6B6B6B' }} className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody style={{ backgroundColor: '#FFFFFF' }}>
                {purchases.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #F0F0EE' }} className="hover:bg-[#FAFAF9] transition-colors">
                    <td className="px-4 py-3" style={{ color: '#6B6B6B' }}><span className="text-sm">{p.date}</span></td>
                    <td className="px-4 py-3" style={{ color: '#0E0E0E' }}><span className="text-sm font-medium">{p.item?.name}</span></td>
                    <td className="px-4 py-3" style={{ color: '#0E0E0E' }}><span className="text-sm">{p.quantity} {p.item?.unit}</span></td>
                    <td className="px-4 py-3" style={{ color: '#D97706' }}><span className="text-sm">{fmt(p.item?.price_per_unit ?? 0)}</span></td>
                    <td className="px-4 py-3" style={{ color: '#16A34A' }}><span className="text-sm font-semibold">{fmt((p.item?.price_per_unit ?? 0) * p.quantity)}</span></td>
                    <td className="px-4 py-3" style={{ color: '#6B6B6B' }}><span className="text-sm">{p.notes || '—'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && <PurchaseModal items={items} onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); loadData() }} />}
    </div>
  )
}
