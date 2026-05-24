import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Expense } from '../lib/types'
import PageHeader from '../components/PageHeader'
import { Plus, X } from 'lucide-react'

function fmt(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}
const inputStyle = { backgroundColor: '#F8F8F6', border: '1px solid #E8E8E6', color: '#0E0E0E' }

const EXPENSE_CATEGORIES = ['Bahan Baku', 'Gaji', 'Sewa', 'Utilitas', 'Peralatan', 'Marketing', 'Lainnya']
const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(); d.setMonth(i)
  return { value: String(i + 1).padStart(2, '0'), label: d.toLocaleDateString('id-ID', { month: 'long' }) }
})

function ExpenseModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [date, setDate]         = useState(new Date().toISOString().split('T')[0])
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0])
  const [description, setDesc]  = useState('')
  const [amount, setAmount]     = useState('')
  const [saving, setSaving]     = useState(false)

  async function handleSave() {
    if (!amount) return
    setSaving(true)
    await supabase.from('expenses').insert({ date, category, description: description.trim(), amount: parseFloat(amount) })
    setSaving(false); onSave()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E6', borderRadius: 16 }} className="w-full max-w-md">
        <div style={{ borderBottom: '1px solid #E8E8E6' }} className="flex items-center justify-between px-6 py-4">
          <h2 style={{ fontFamily: "'Archivo Black', sans-serif", color: '#0E0E0E', fontSize: 16 }}>Tambah Pengeluaran</h2>
          <button onClick={onClose} style={{ color: '#6B6B6B' }} className="hover:text-[#0E0E0E] transition-colors"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={{ color: '#6B6B6B' }} className="block text-xs mb-1.5 uppercase tracking-wider font-medium">Tanggal</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none focus:border-[#D91C1C] transition-colors" />
            </div>
            <div>
              <label style={{ color: '#6B6B6B' }} className="block text-xs mb-1.5 uppercase tracking-wider font-medium">Kategori</label>
              <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none focus:border-[#D91C1C] transition-colors">
                {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={{ color: '#6B6B6B' }} className="block text-xs mb-1.5 uppercase tracking-wider font-medium">Deskripsi</label>
            <input value={description} onChange={e => setDesc(e.target.value)} placeholder="Keterangan..." style={inputStyle}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none focus:border-[#D91C1C] transition-colors" />
          </div>
          <div>
            <label style={{ color: '#6B6B6B' }} className="block text-xs mb-1.5 uppercase tracking-wider font-medium">Jumlah (Rp) *</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} min="0" style={inputStyle}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none focus:border-[#D91C1C] transition-colors" />
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} style={{ border: '1px solid #E8E8E6', color: '#6B6B6B' }}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium hover:text-[#0E0E0E] transition-colors">Batal</button>
            <button onClick={handleSave} disabled={saving || !amount} style={{ backgroundColor: '#D91C1C' }}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold hover:bg-[#B51515] transition-colors disabled:opacity-60">
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Financial() {
  const [expenses, setExpenses]   = useState<Expense[]>([])
  const [sales, setSales]         = useState<{ total_price: number; date: string }[]>([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedMonth, setMonth] = useState(new Date().toISOString().slice(5, 7))
  const [selectedYear]            = useState(new Date().getFullYear())

  const loadData = useCallback(async () => {
    setLoading(true)
    const prefix = `${selectedYear}-${selectedMonth}`
    const [{ data: expData }, { data: salesData }] = await Promise.all([
      supabase.from('expenses').select('*').gte('date', `${prefix}-01`).lte('date', `${prefix}-31`).order('date', { ascending: false }),
      supabase.from('sales').select('total_price, date').gte('date', `${prefix}-01`).lte('date', `${prefix}-31`),
    ])
    setExpenses(expData ?? []); setSales(salesData ?? [])
    setLoading(false)
  }, [selectedMonth, selectedYear])

  useEffect(() => { loadData() }, [loadData])

  const totalRevenue  = sales.reduce((s, r) => s + r.total_price, 0)
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const profit        = totalRevenue - totalExpenses
  const margin        = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0

  const byCategory = EXPENSE_CATEGORIES.map(cat => ({
    cat, total: expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0)
  })).filter(c => c.total > 0)

  const monthLabel = MONTHS.find(m => m.value === selectedMonth)?.label

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Financial"
        subtitle="Laporan keuangan & P&L statement"
        action={
          <button onClick={() => setShowModal(true)} style={{ backgroundColor: '#D91C1C' }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold hover:bg-[#B51515] transition-colors">
            <Plus size={14} /> Tambah Pengeluaran
          </button>
        }
      />

      {/* Month selector */}
      <div style={{ borderBottom: '1px solid #E8E8E6', backgroundColor: '#FFFFFF' }} className="flex gap-1.5 px-8 py-3 overflow-x-auto">
        {MONTHS.map(m => (
          <button key={m.value} onClick={() => setMonth(m.value)}
            style={{
              backgroundColor: selectedMonth === m.value ? '#D91C1C' : '#F8F8F6',
              border: '1px solid ' + (selectedMonth === m.value ? '#D91C1C' : '#E8E8E6'),
              color: selectedMonth === m.value ? '#FFFFFF' : '#6B6B6B',
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors">
            {m.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: '#6B6B6B' }} className="flex items-center justify-center py-32 text-sm">Memuat data...</div>
      ) : (
        <div className="px-8 py-6 space-y-5">
          {/* P&L card */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E6', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ borderBottom: '1px solid #E8E8E6', backgroundColor: '#F8F8F6' }} className="px-6 py-4 flex items-center justify-between">
              <h3 style={{ fontFamily: "'Archivo Black', sans-serif", color: '#0E0E0E', fontSize: 15, letterSpacing: '0.02em' }}>
                P&L STATEMENT — {monthLabel?.toUpperCase()} {selectedYear}
              </h3>
              <span style={{
                backgroundColor: profit >= 0 ? '#F0FDF4' : '#FEF2F2',
                color: profit >= 0 ? '#16A34A' : '#DC2626',
                border: `1px solid ${profit >= 0 ? '#BBF7D0' : '#FECACA'}`,
              }} className="text-xs px-3 py-1 rounded-full font-semibold">
                Margin {margin.toFixed(1)}%
              </span>
            </div>
            <div className="p-6 space-y-2">
              <div className="flex justify-between items-center py-2.5" style={{ borderBottom: '1px solid #F0F0EE' }}>
                <span style={{ color: '#0E0E0E' }} className="text-sm font-medium">Revenue (Penjualan)</span>
                <span style={{ color: '#16A34A', fontFamily: "'Archivo Black', sans-serif" }} className="text-base">{fmt(totalRevenue)}</span>
              </div>
              {byCategory.map(c => (
                <div key={c.cat} className="flex justify-between items-center py-1.5 pl-5">
                  <span style={{ color: '#6B6B6B' }} className="text-xs">{c.cat}</span>
                  <span style={{ color: '#DC2626' }} className="text-xs font-medium">({fmt(c.total)})</span>
                </div>
              ))}
              <div className="flex justify-between items-center py-2.5" style={{ borderBottom: '1px solid #F0F0EE' }}>
                <span style={{ color: '#0E0E0E' }} className="text-sm font-medium">Total Pengeluaran</span>
                <span style={{ color: '#DC2626', fontFamily: "'Archivo Black', sans-serif" }} className="text-base">({fmt(totalExpenses)})</span>
              </div>
              <div className="flex justify-between items-center pt-3">
                <span style={{ color: '#0E0E0E', fontFamily: "'Archivo Black', sans-serif" }} className="text-base">NET PROFIT</span>
                <span style={{ color: profit >= 0 ? '#16A34A' : '#DC2626', fontFamily: "'Archivo Black', sans-serif" }} className="text-2xl">
                  {fmt(profit)}
                </span>
              </div>
            </div>
          </div>

          {/* Expense table */}
          <div>
            <h3 style={{ fontFamily: "'Archivo Black', sans-serif", color: '#0E0E0E', fontSize: 14 }} className="mb-3 uppercase tracking-wide">
              Detail Pengeluaran
            </h3>
            <div style={{ border: '1px solid #E8E8E6', borderRadius: 16, overflow: 'hidden' }}>
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: '#F8F8F6', borderBottom: '1px solid #E8E8E6' }}>
                    {['Tanggal', 'Kategori', 'Deskripsi', 'Jumlah'].map(h => (
                      <th key={h} style={{ color: '#6B6B6B' }}
                        className={`px-4 py-3 text-xs font-medium uppercase tracking-wider ${h === 'Jumlah' ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody style={{ backgroundColor: '#FFFFFF' }}>
                  {expenses.map(e => (
                    <tr key={e.id} style={{ borderBottom: '1px solid #F0F0EE' }} className="hover:bg-[#FAFAFA] transition-colors">
                      <td className="px-4 py-3" style={{ color: '#6B6B6B' }}><span className="text-sm">{e.date}</span></td>
                      <td className="px-4 py-3">
                        <span style={{ backgroundColor: '#F2F2F0', color: '#6B6B6B', border: '1px solid #E8E8E6' }} className="text-xs px-2.5 py-1 rounded-full font-medium">
                          {e.category}
                        </span>
                      </td>
                      <td className="px-4 py-3" style={{ color: '#0E0E0E' }}><span className="text-sm">{e.description || '—'}</span></td>
                      <td className="px-4 py-3 text-right" style={{ color: '#DC2626' }}><span className="text-sm font-semibold">{fmt(e.amount)}</span></td>
                    </tr>
                  ))}
                  {expenses.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-12 text-center" style={{ color: '#ABABAB' }}>Belum ada pengeluaran bulan ini.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showModal && <ExpenseModal onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); loadData() }} />}
    </div>
  )
}
