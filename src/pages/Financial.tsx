import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Expense } from '../lib/types'
import PageHeader from '../components/PageHeader'
import { Plus, X } from 'lucide-react'

function fmt(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

const EXPENSE_CATEGORIES = ['Bahan Baku', 'Gaji', 'Sewa', 'Utilitas', 'Peralatan', 'Marketing', 'Lainnya']

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(); d.setMonth(i)
  return { value: String(i + 1).padStart(2, '0'), label: d.toLocaleDateString('id-ID', { month: 'long' }) }
})

interface ExpenseModalProps {
  onClose: () => void
  onSave: () => void
}

function ExpenseModal({ onClose, onSave }: ExpenseModalProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0])
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!amount) return
    setSaving(true)
    await supabase.from('expenses').insert({ date, category, description: description.trim(), amount: parseFloat(amount) })
    setSaving(false)
    onSave()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div style={{ backgroundColor: '#171614', border: '1px solid #2a2825' }} className="w-full max-w-md rounded-xl">
        <div style={{ borderBottom: '1px solid #2a2825' }} className="flex items-center justify-between px-6 py-4">
          <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#e8e4dc' }} className="text-xl tracking-wider">Tambah Pengeluaran</h2>
          <button onClick={onClose} style={{ color: '#8a867d' }} className="hover:text-white transition-colors"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={{ color: '#8a867d' }} className="block text-xs mb-1.5 uppercase tracking-wider">Tanggal</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                style={{ backgroundColor: '#0d0c0a', border: '1px solid #2a2825', color: '#e8e4dc' }}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none focus:border-[#e5420d] transition-colors" />
            </div>
            <div>
              <label style={{ color: '#8a867d' }} className="block text-xs mb-1.5 uppercase tracking-wider">Kategori</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                style={{ backgroundColor: '#0d0c0a', border: '1px solid #2a2825', color: '#e8e4dc' }}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none focus:border-[#e5420d] transition-colors">
                {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={{ color: '#8a867d' }} className="block text-xs mb-1.5 uppercase tracking-wider">Deskripsi</label>
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Keterangan pengeluaran..."
              style={{ backgroundColor: '#0d0c0a', border: '1px solid #2a2825', color: '#e8e4dc' }}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none focus:border-[#e5420d] transition-colors" />
          </div>
          <div>
            <label style={{ color: '#8a867d' }} className="block text-xs mb-1.5 uppercase tracking-wider">Jumlah (Rp) *</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} min="0"
              style={{ backgroundColor: '#0d0c0a', border: '1px solid #2a2825', color: '#e8e4dc' }}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none focus:border-[#e5420d] transition-colors" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} style={{ border: '1px solid #2a2825', color: '#8a867d' }}
              className="flex-1 py-2.5 rounded-lg text-sm hover:text-white transition-colors">Batal</button>
            <button onClick={handleSave} disabled={saving || !amount}
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

export default function Financial() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [sales, setSales] = useState<{ total_price: number; date: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(5, 7))
  const [selectedYear] = useState(new Date().getFullYear())

  const loadData = useCallback(async () => {
    setLoading(true)
    const prefix = `${selectedYear}-${selectedMonth}`
    const [{ data: expData }, { data: salesData }] = await Promise.all([
      supabase.from('expenses').select('*').gte('date', `${prefix}-01`).lte('date', `${prefix}-31`).order('date', { ascending: false }),
      supabase.from('sales').select('total_price, date').gte('date', `${prefix}-01`).lte('date', `${prefix}-31`),
    ])
    setExpenses(expData ?? [])
    setSales(salesData ?? [])
    setLoading(false)
  }, [selectedMonth, selectedYear])

  useEffect(() => { loadData() }, [loadData])

  const totalRevenue = sales.reduce((s, r) => s + r.total_price, 0)
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const grossProfit = totalRevenue - totalExpenses
  const margin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0

  // group expenses by category
  const byCategory = EXPENSE_CATEGORIES.map(cat => ({
    cat,
    total: expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0),
  })).filter(c => c.total > 0)

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Financial"
        subtitle="Laporan keuangan & P&L statement"
        action={
          <button onClick={() => setShowModal(true)}
            style={{ backgroundColor: '#e5420d' }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold hover:bg-[#ff5520] transition-colors">
            <Plus size={15} /> Tambah Pengeluaran
          </button>
        }
      />

      {/* Month selector */}
      <div style={{ borderBottom: '1px solid #1e1d1a' }} className="flex gap-1 px-8 pt-4 pb-3 overflow-x-auto">
        {MONTHS.map(m => (
          <button key={m.value} onClick={() => setSelectedMonth(m.value)}
            style={{
              backgroundColor: selectedMonth === m.value ? '#e5420d' : '#171614',
              border: '1px solid #2a2825',
              color: selectedMonth === m.value ? 'white' : '#8a867d',
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors hover:border-[#e5420d]">
            {m.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: '#8a867d' }} className="flex items-center justify-center py-32 text-sm">Memuat data...</div>
      ) : (
        <div className="px-8 py-6 space-y-6">
          {/* P&L Summary */}
          <div style={{ backgroundColor: '#171614', border: '1px solid #2a2825' }} className="rounded-xl overflow-hidden">
            <div style={{ borderBottom: '1px solid #2a2825', backgroundColor: '#0d0c0a' }} className="px-6 py-4">
              <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#e8e4dc' }} className="text-xl tracking-wider">
                P&L Statement — {MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear}
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2" style={{ borderBottom: '1px solid #1e1d1a' }}>
                  <span style={{ color: '#8a867d' }} className="text-sm">Revenue (Penjualan)</span>
                  <span style={{ color: '#22c55e' }} className="text-sm font-semibold">{fmt(totalRevenue)}</span>
                </div>
                {byCategory.map(c => (
                  <div key={c.cat} className="flex justify-between items-center py-1 pl-4">
                    <span style={{ color: '#8a867d' }} className="text-xs">{c.cat}</span>
                    <span style={{ color: '#ef4444' }} className="text-xs">({fmt(c.total)})</span>
                  </div>
                ))}
                <div className="flex justify-between items-center py-2" style={{ borderBottom: '1px solid #1e1d1a' }}>
                  <span style={{ color: '#8a867d' }} className="text-sm">Total Pengeluaran</span>
                  <span style={{ color: '#ef4444' }} className="text-sm font-semibold">({fmt(totalExpenses)})</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span style={{ color: '#e8e4dc' }} className="font-semibold">Net Profit</span>
                  <div className="text-right">
                    <div style={{ color: grossProfit >= 0 ? '#22c55e' : '#ef4444' }} className="text-xl font-bold">{fmt(grossProfit)}</div>
                    <div style={{ color: '#8a867d' }} className="text-xs">Margin: {margin.toFixed(1)}%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Expense list */}
          <div>
            <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#e8e4dc' }} className="text-lg tracking-wider mb-3">
              Detail Pengeluaran
            </h3>
            <div style={{ border: '1px solid #1e1d1a' }} className="rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: '#0d0c0a', borderBottom: '1px solid #1e1d1a' }}>
                    {['Tanggal', 'Kategori', 'Deskripsi', 'Jumlah'].map(h => (
                      <th key={h} style={{ color: '#8a867d' }} className={`px-4 py-3 text-xs font-medium uppercase tracking-wider ${h === 'Jumlah' ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody style={{ backgroundColor: '#171614' }}>
                  {expenses.map(e => (
                    <tr key={e.id} style={{ borderBottom: '1px solid #1e1d1a' }} className="hover:bg-[#1a1917] transition-colors">
                      <td className="px-4 py-3" style={{ color: '#8a867d' }}><span className="text-sm">{e.date}</span></td>
                      <td className="px-4 py-3">
                        <span style={{ backgroundColor: '#1f1e1b', color: '#8a867d', border: '1px solid #2a2825' }} className="text-xs px-2 py-0.5 rounded-full">
                          {e.category}
                        </span>
                      </td>
                      <td className="px-4 py-3" style={{ color: '#e8e4dc' }}><span className="text-sm">{e.description || '—'}</span></td>
                      <td className="px-4 py-3 text-right" style={{ color: '#ef4444' }}><span className="text-sm font-medium">{fmt(e.amount)}</span></td>
                    </tr>
                  ))}
                  {expenses.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-10 text-center" style={{ color: '#8a867d' }}>Belum ada pengeluaran bulan ini.</td></tr>
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
