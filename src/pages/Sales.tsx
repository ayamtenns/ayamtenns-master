import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Menu, Sale } from '../lib/types'
import PageHeader from '../components/PageHeader'
import { Plus, X } from 'lucide-react'

function fmt(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

interface SaleModalProps {
  menus: Menu[]
  onClose: () => void
  onSave: () => void
}

function SaleModal({ menus, onClose, onSave }: SaleModalProps) {
  const [menuId, setMenuId] = useState('')
  const [qty, setQty] = useState('1')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)

  const selectedMenu = menus.find(m => m.id === menuId)
  const total = selectedMenu ? selectedMenu.price * (parseInt(qty) || 0) : 0

  async function handleSave() {
    if (!menuId || !qty) return
    setSaving(true)
    await supabase.from('sales').insert({
      date, menu_id: menuId, quantity: parseInt(qty), total_price: total,
    })
    setSaving(false)
    onSave()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div style={{ backgroundColor: '#171614', border: '1px solid #2a2825' }} className="w-full max-w-md rounded-xl">
        <div style={{ borderBottom: '1px solid #2a2825' }} className="flex items-center justify-between px-6 py-4">
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#e8e4dc' }} className="text-xl tracking-wider">Catat Penjualan</h2>
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
            <label style={{ color: '#8a867d' }} className="block text-xs mb-1.5 uppercase tracking-wider">Menu *</label>
            <select value={menuId} onChange={e => setMenuId(e.target.value)}
              style={{ backgroundColor: '#0d0c0a', border: '1px solid #2a2825', color: menuId ? '#e8e4dc' : '#8a867d' }}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none focus:border-[#e5420d] transition-colors">
              <option value="">Pilih menu...</option>
              {menus.filter(m => m.is_active).map(m => <option key={m.id} value={m.id}>{m.name} — {fmt(m.price)}</option>)}
            </select>
          </div>
          <div>
            <label style={{ color: '#8a867d' }} className="block text-xs mb-1.5 uppercase tracking-wider">Jumlah</label>
            <input type="number" value={qty} onChange={e => setQty(e.target.value)} min="1"
              style={{ backgroundColor: '#0d0c0a', border: '1px solid #2a2825', color: '#e8e4dc' }}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none focus:border-[#e5420d] transition-colors" />
          </div>
          {total > 0 && (
            <div style={{ backgroundColor: '#0d0c0a', border: '1px solid #1e1d1a' }} className="rounded-lg p-3 text-center">
              <div style={{ color: '#8a867d' }} className="text-xs mb-1">Total</div>
              <div style={{ color: '#22c55e' }} className="text-2xl font-bold">{fmt(total)}</div>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} style={{ border: '1px solid #2a2825', color: '#8a867d' }}
              className="flex-1 py-2.5 rounded-lg text-sm hover:text-white transition-colors">Batal</button>
            <button onClick={handleSave} disabled={saving || !menuId}
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

export default function Sales() {
  const [sales, setSales] = useState<Sale[]>([])
  const [menus, setMenus] = useState<Menu[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [{ data: salesData }, { data: menusData }] = await Promise.all([
      supabase.from('sales').select('*, menu:menus(name,category,price)').order('date', { ascending: false }).limit(200),
      supabase.from('menus').select('*').eq('is_active', true).order('name'),
    ])
    setSales((salesData ?? []) as Sale[])
    setMenus(menusData ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const thisMonth = new Date().toISOString().slice(0, 7)
  const monthSales = sales.filter(s => s.date.startsWith(thisMonth))
  const totalRevenue = monthSales.reduce((s, r) => s + r.total_price, 0)
  const totalQty = monthSales.reduce((s, r) => s + r.quantity, 0)

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Sales"
        subtitle="Data penjualan harian"
        action={
          <button onClick={() => setShowModal(true)}
            style={{ backgroundColor: '#e5420d' }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold hover:bg-[#ff5520] transition-colors">
            <Plus size={15} /> Catat Penjualan
          </button>
        }
      />

      <div className="grid grid-cols-3 gap-4 px-8 py-5" style={{ borderBottom: '1px solid #1e1d1a' }}>
        {[
          { label: 'Revenue Bulan Ini', value: fmt(totalRevenue), color: '#22c55e' },
          { label: 'Total Porsi', value: totalQty, color: '#d4a017' },
          { label: 'Total Transaksi', value: monthSales.length, color: '#e8e4dc' },
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
                  {['Tanggal', 'Menu', 'Kategori', 'Qty', 'Harga Satuan', 'Total'].map(h => (
                    <th key={h} style={{ color: '#8a867d' }} className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody style={{ backgroundColor: '#171614' }}>
                {sales.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #1e1d1a' }} className="hover:bg-[#1a1917] transition-colors">
                    <td className="px-4 py-3" style={{ color: '#8a867d' }}><span className="text-sm">{s.date}</span></td>
                    <td className="px-4 py-3" style={{ color: '#e8e4dc' }}><span className="text-sm">{s.menu?.name}</span></td>
                    <td className="px-4 py-3">
                      <span style={{ backgroundColor: '#1f1e1b', color: '#8a867d', border: '1px solid #2a2825' }} className="text-xs px-2 py-0.5 rounded-full">
                        {s.menu?.category}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: '#e8e4dc' }}><span className="text-sm">{s.quantity}x</span></td>
                    <td className="px-4 py-3" style={{ color: '#d4a017' }}><span className="text-sm">{fmt(s.menu?.price ?? 0)}</span></td>
                    <td className="px-4 py-3" style={{ color: '#22c55e' }}><span className="text-sm font-medium">{fmt(s.total_price)}</span></td>
                  </tr>
                ))}
                {sales.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center" style={{ color: '#8a867d' }}>Belum ada data penjualan.</td></tr>
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
