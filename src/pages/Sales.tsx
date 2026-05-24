import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Menu, Sale } from '../lib/types'
import PageHeader from '../components/PageHeader'
import { Plus, X } from 'lucide-react'

function fmt(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}
const inputStyle = { backgroundColor: '#F8F8F6', border: '1px solid #E8E8E6', color: '#0E0E0E' }

function SaleModal({ menus, onClose, onSave }: { menus: Menu[]; onClose: () => void; onSave: () => void }) {
  const [menuId, setMenuId] = useState('')
  const [qty, setQty]       = useState('1')
  const [date, setDate]     = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const selected = menus.find(m => m.id === menuId)
  const total    = selected ? selected.price * (parseInt(qty) || 0) : 0

  async function handleSave() {
    if (!menuId || !qty) return
    setSaving(true)
    await supabase.from('sales').insert({ date, menu_id: menuId, quantity: parseInt(qty), total_price: total })
    setSaving(false); onSave()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E6', borderRadius: 16 }} className="w-full max-w-md">
        <div style={{ borderBottom: '1px solid #E8E8E6' }} className="flex items-center justify-between px-6 py-4">
          <h2 style={{ fontFamily: "'Archivo Black', sans-serif", color: '#0E0E0E', fontSize: 16 }}>Catat Penjualan</h2>
          <button onClick={onClose} style={{ color: '#6B6B6B' }} className="hover:text-[#0E0E0E] transition-colors"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label style={{ color: '#6B6B6B' }} className="block text-xs mb-1.5 uppercase tracking-wider font-medium">Tanggal</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none focus:border-[#D91C1C] transition-colors" />
          </div>
          <div>
            <label style={{ color: '#6B6B6B' }} className="block text-xs mb-1.5 uppercase tracking-wider font-medium">Menu *</label>
            <select value={menuId} onChange={e => setMenuId(e.target.value)}
              style={{ ...inputStyle, color: menuId ? '#0E0E0E' : '#ABABAB' }}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none focus:border-[#D91C1C] transition-colors">
              <option value="">Pilih menu...</option>
              {menus.filter(m => m.is_active).map(m => <option key={m.id} value={m.id}>{m.name} — {fmt(m.price)}</option>)}
            </select>
          </div>
          <div>
            <label style={{ color: '#6B6B6B' }} className="block text-xs mb-1.5 uppercase tracking-wider font-medium">Jumlah</label>
            <input type="number" value={qty} onChange={e => setQty(e.target.value)} min="1" style={inputStyle}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none focus:border-[#D91C1C] transition-colors" />
          </div>
          {total > 0 && (
            <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 12 }} className="p-4 text-center">
              <div style={{ color: '#6B6B6B' }} className="text-xs mb-1 font-medium uppercase tracking-wider">Total</div>
              <div style={{ color: '#16A34A', fontFamily: "'Archivo Black', sans-serif" }} className="text-2xl">{fmt(total)}</div>
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} style={{ border: '1px solid #E8E8E6', color: '#6B6B6B' }}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium hover:text-[#0E0E0E] transition-colors">Batal</button>
            <button onClick={handleSave} disabled={saving || !menuId} style={{ backgroundColor: '#D91C1C' }}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold hover:bg-[#B51515] transition-colors disabled:opacity-60">
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Sales() {
  const [sales, setSales]     = useState<Sale[]>([])
  const [menus, setMenus]     = useState<Menu[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [{ data: salesData }, { data: menusData }] = await Promise.all([
      supabase.from('sales').select('*, menu:menus(name,category,price)').order('date', { ascending: false }).limit(200),
      supabase.from('menus').select('*').eq('is_active', true).order('name'),
    ])
    setSales((salesData ?? []) as Sale[]); setMenus(menusData ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const thisMonth    = new Date().toISOString().slice(0, 7)
  const monthSales   = sales.filter(s => s.date.startsWith(thisMonth))
  const totalRevenue = monthSales.reduce((s, r) => s + r.total_price, 0)
  const totalQty     = monthSales.reduce((s, r) => s + r.quantity, 0)

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Sales"
        subtitle="Data penjualan harian"
        action={
          <button onClick={() => setShowModal(true)} style={{ backgroundColor: '#D91C1C' }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold hover:bg-[#B51515] transition-colors">
            <Plus size={14} /> Catat Penjualan
          </button>
        }
      />

      <div className="grid grid-cols-3 gap-4 px-8 py-5" style={{ borderBottom: '1px solid #E8E8E6' }}>
        {[
          { label: 'Revenue Bulan Ini', value: fmt(totalRevenue), color: '#16A34A' },
          { label: 'Total Porsi',       value: totalQty,           color: '#D97706' },
          { label: 'Total Transaksi',   value: monthSales.length,  color: '#0E0E0E' },
        ].map(s => (
          <div key={s.label} style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E6' }} className="rounded-2xl p-4">
            <div style={{ color: '#6B6B6B' }} className="text-xs uppercase tracking-wider mb-1 font-medium">{s.label}</div>
            <div style={{ color: s.color, fontFamily: "'Archivo Black', sans-serif" }} className="text-2xl">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="px-8 py-5">
        {loading ? (
          <div style={{ color: '#6B6B6B' }} className="py-20 text-center text-sm">Memuat data...</div>
        ) : (
          <div style={{ border: '1px solid #E8E8E6', borderRadius: 16, overflow: 'hidden' }}>
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: '#F8F8F6', borderBottom: '1px solid #E8E8E6' }}>
                  {['Tanggal', 'Menu', 'Kategori', 'Qty', 'Harga Satuan', 'Total'].map(h => (
                    <th key={h} style={{ color: '#6B6B6B' }} className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody style={{ backgroundColor: '#FFFFFF' }}>
                {sales.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #F0F0EE' }} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="px-4 py-3" style={{ color: '#6B6B6B' }}><span className="text-sm">{s.date}</span></td>
                    <td className="px-4 py-3" style={{ color: '#0E0E0E' }}><span className="text-sm font-medium">{s.menu?.name}</span></td>
                    <td className="px-4 py-3">
                      <span style={{ backgroundColor: '#F2F2F0', color: '#6B6B6B', border: '1px solid #E8E8E6' }} className="text-xs px-2.5 py-1 rounded-full font-medium">
                        {s.menu?.category}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: '#0E0E0E' }}><span className="text-sm">{s.quantity}x</span></td>
                    <td className="px-4 py-3" style={{ color: '#D97706' }}><span className="text-sm">{fmt(s.menu?.price ?? 0)}</span></td>
                    <td className="px-4 py-3" style={{ color: '#16A34A' }}><span className="text-sm font-semibold">{fmt(s.total_price)}</span></td>
                  </tr>
                ))}
                {sales.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center" style={{ color: '#ABABAB' }}>Belum ada data penjualan.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && <SaleModal menus={menus} onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); loadData() }} />}
    </div>
  )
}
