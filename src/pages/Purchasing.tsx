import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Item } from '../lib/types'
import PageHeader from '../components/PageHeader'
import { Plus, X } from 'lucide-react'

function fmt(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

interface Purchase {
  id: string
  date: string
  item_id: string
  quantity: number
  notes: string
  created_at: string
  item?: { name: string; unit: string; price_per_unit: number }
}

interface PurchaseModalProps {
  items: Item[]
  onClose: () => void
  onSave: () => void
}

function PurchaseModal({ items, onClose, onSave }: PurchaseModalProps) {
  const [itemId, setItemId] = useState('')
  const [qty, setQty] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const selectedItem = items.find(i => i.id === itemId)

  async function handleSave() {
    if (!itemId || !qty) return
    setSaving(true)
    const qtyNum = parseFloat(qty)
    await supabase.from('transactions').insert({
      date, type: 'in', item_id: itemId, quantity: qtyNum, notes: notes.trim() || 'Pembelian',
    })
    await supabase.from('items').update({ stock: (selectedItem?.stock ?? 0) + qtyNum }).eq('id', itemId)
    setSaving(false)
    onSave()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div style={{ backgroundColor: '#171614', border: '1px solid #2a2825' }} className="w-full max-w-md rounded-xl">
        <div style={{ borderBottom: '1px solid #2a2825' }} className="flex items-center justify-between px-6 py-4">
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#e8e4dc' }} className="text-xl tracking-wider">Catat Pembelian</h2>
          <button onClick={onClose} style={{ color: '#8a867d' }} className="hover:text-white transition-colors"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label style={{ color: '#8a867d' }} className="block text-xs mb-1.5 uppercase tracking-wider">Tanggal</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ backgroundColor: '#0d0c0a', border: '1px solid #2a2825', color: '#e8e4dc' }}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none focus:border-[#e5420d] transition-colors" />
          </div>
          <div>
            <label style={{ color: '#8a867d' }} className="block text-xs mb-1.5 uppercase tracking-wider">Barang *</label>
            <select value={itemId} onChange={e => setItemId(e.target.value)}
              style={{ backgroundColor: '#0d0c0a', border: '1px solid #2a2825', color: itemId ? '#e8e4dc' : '#8a867d' }}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none focus:border-[#e5420d] transition-colors">
              <option value="">Pilih barang...</option>
              {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
            </select>
          </div>
          {selectedItem && (
            <div style={{ backgroundColor: '#0d0c0a', border: '1px solid #1e1d1a' }} className="rounded-lg p-3 text-xs" >
              <span style={{ color: '#8a867d' }}>Harga referensi: </span>
              <span style={{ color: '#d4a017' }}>{fmt(selectedItem.price_per_unit)}/{selectedItem.unit}</span>
              <span style={{ color: '#8a867d' }}> · Stok saat ini: {selectedItem.stock} {selectedItem.unit}</span>
            </div>
          )}
          <div>
            <label style={{ color: '#8a867d' }} className="block text-xs mb-1.5 uppercase tracking-wider">Jumlah ({selectedItem?.unit ?? '—'}) *</label>
            <input type="number" value={qty} onChange={e => setQty(e.target.value)} min="0" step="0.001"
              style={{ backgroundColor: '#0d0c0a', border: '1px solid #2a2825', color: '#e8e4dc' }}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none focus:border-[#e5420d] transition-colors" />
          </div>
          {selectedItem && qty && (
            <div style={{ backgroundColor: '#0d0c0a', border: '1px solid #1e1d1a' }} className="rounded-lg p-3 text-xs">
              <span style={{ color: '#8a867d' }}>Estimasi biaya: </span>
              <span style={{ color: '#22c55e' }}>{fmt(selectedItem.price_per_unit * parseFloat(qty || '0'))}</span>
            </div>
          )}
          <div>
            <label style={{ color: '#8a867d' }} className="block text-xs mb-1.5 uppercase tracking-wider">Catatan</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Supplier, dll..."
              style={{ backgroundColor: '#0d0c0a', border: '1px solid #2a2825', color: '#e8e4dc' }}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none focus:border-[#e5420d] transition-colors" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} style={{ border: '1px solid #2a2825', color: '#8a867d' }}
              className="flex-1 py-2.5 rounded-lg text-sm hover:text-white transition-colors">Batal</button>
            <button onClick={handleSave} disabled={saving || !itemId || !qty}
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

export default function Purchasing() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [{ data: txData }, { data: itemsData }] = await Promise.all([
      supabase.from('transactions').select('*, item:items(name,unit,price_per_unit)').eq('type', 'in').order('date', { ascending: false }).limit(200),
      supabase.from('items').select('*').order('name'),
    ])
    setPurchases((txData ?? []) as Purchase[])
    setItems(itemsData ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const totalThisMonth = purchases
    .filter(p => p.date.startsWith(new Date().toISOString().slice(0, 7)))
    .reduce((s, p) => s + (p.item?.price_per_unit ?? 0) * p.quantity, 0)

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Purchasing"
        subtitle="Catat dan pantau pembelian bahan baku"
        action={
          <button onClick={() => setShowModal(true)}
            style={{ backgroundColor: '#e5420d' }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold hover:bg-[#ff5520] transition-colors">
            <Plus size={15} /> Catat Pembelian
          </button>
        }
      />

      <div className="grid grid-cols-3 gap-4 px-8 py-5" style={{ borderBottom: '1px solid #1e1d1a' }}>
        {[
          { label: 'Total Pembelian Bulan Ini', value: fmt(totalThisMonth), color: '#d4a017' },
          { label: 'Jumlah Transaksi', value: purchases.filter(p => p.date.startsWith(new Date().toISOString().slice(0, 7))).length, color: '#e8e4dc' },
          { label: 'Total Transaksi', value: purchases.length, color: '#8a867d' },
        ].map(s => (
          <div key={s.label} style={{ backgroundColor: '#171614', border: '1px solid #2a2825' }} className="rounded-xl p-4">
            <div style={{ color: '#8a867d' }} className="text-xs uppercase tracking-wider mb-1">{s.label}</div>
            <div style={{ color: s.color }} className="text-2xl font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="px-8 py-5">
        {loading ? (
          <div style={{ color: '#8a867d' }} className="py-20 text-center text-sm">Memuat data...</div>
        ) : (
          <div style={{ border: '1px solid #1e1d1a' }} className="rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: '#0d0c0a', borderBottom: '1px solid #1e1d1a' }}>
                  {['Tanggal', 'Barang', 'Jumlah', 'Harga/Unit', 'Total', 'Catatan'].map(h => (
                    <th key={h} style={{ color: '#8a867d' }} className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody style={{ backgroundColor: '#171614' }}>
                {purchases.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #1e1d1a' }} className="hover:bg-[#1a1917] transition-colors">
                    <td className="px-4 py-3" style={{ color: '#8a867d' }}><span className="text-sm">{p.date}</span></td>
                    <td className="px-4 py-3" style={{ color: '#e8e4dc' }}><span className="text-sm">{p.item?.name}</span></td>
                    <td className="px-4 py-3" style={{ color: '#e8e4dc' }}>
                      <span className="text-sm">{p.quantity} {p.item?.unit}</span>
                    </td>
                    <td className="px-4 py-3" style={{ color: '#d4a017' }}><span className="text-sm">{fmt(p.item?.price_per_unit ?? 0)}</span></td>
                    <td className="px-4 py-3" style={{ color: '#22c55e' }}>
                      <span className="text-sm font-medium">{fmt((p.item?.price_per_unit ?? 0) * p.quantity)}</span>
                    </td>
                    <td className="px-4 py-3" style={{ color: '#8a867d' }}><span className="text-sm">{p.notes || '—'}</span></td>
                  </tr>
                ))}
                {purchases.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center" style={{ color: '#8a867d' }}>Belum ada data pembelian.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && <PurchaseModal items={items} onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); loadData() }} />}
    </div>
  )
}
