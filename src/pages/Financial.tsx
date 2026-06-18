import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Expense } from '../lib/types'
import PageHeader from '../components/PageHeader'
import { Plus, X, AlertCircle, Pencil, Trash2 } from 'lucide-react'

function fmt(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}
const inputStyle = { backgroundColor: '#F8F8F6', border: '1px solid #E8E8E6', color: '#0E0E0E' }

const EXPENSE_CATEGORIES = ['Gaji', 'Sewa', 'Utilitas', 'Peralatan', 'Marketing', 'Lainnya']
const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(2024, i, 1) // day=1 to avoid end-of-month overflow
  return { value: String(i + 1).padStart(2, '0'), label: d.toLocaleDateString('id-ID', { month: 'long' }) }
})

interface Purchase {
  id: string
  date: string
  quantity: number
  unit_price: number
  notes: string
  item?: { name: string; unit: string }
}

function PLRow({ label, value, pct, indent = false, bold = false, positive = false, negative = false, separator = false }:
  { label: string; value: number; pct?: number; indent?: boolean; bold?: boolean; positive?: boolean; negative?: boolean; separator?: boolean }) {
  const color = positive ? '#16A34A' : negative ? '#DC2626' : '#0E0E0E'
  return (
    <div className="flex justify-between items-center py-2" style={{ borderBottom: separator ? '1px solid #E8E8E6' : undefined, paddingLeft: indent ? 20 : 0 }}>
      <span style={{ color: indent ? '#6B6B6B' : '#0E0E0E', fontSize: indent ? 12 : 13, fontFamily: bold ? "'Archivo Black', sans-serif" : undefined }}>
        {label}
        {pct !== undefined && (
          <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 600, color: '#ABABAB', fontFamily: 'inherit' }}>
            {pct.toFixed(1)}%
          </span>
        )}
      </span>
      <span style={{ color, fontSize: bold ? 15 : 13, fontFamily: bold ? "'Archivo Black', sans-serif" : undefined, fontWeight: bold ? undefined : 500 }}>
        {value !== 0 ? fmt(Math.abs(value)) : '—'}
      </span>
    </div>
  )
}

const BRANCH_OPTIONS = ['BSD', 'Serpong', 'Shared'] as const
type ExpBranch = typeof BRANCH_OPTIONS[number]

function ExpenseModal({ onClose, onSave, existing, defaultBranch }: {
  onClose: () => void
  onSave: () => void
  existing?: Expense & { branch?: string }
  defaultBranch?: string
}) {
  const [date, setDate]         = useState(existing?.date ?? new Date().toISOString().split('T')[0])
  const [category, setCategory] = useState(existing?.category ?? EXPENSE_CATEGORIES[0])
  const [description, setDesc]  = useState(existing?.description ?? '')
  const [amount, setAmount]     = useState(existing ? String(existing.amount) : '')
  const [expBranch, setExpBranch] = useState<ExpBranch>((existing?.branch as ExpBranch) ?? (defaultBranch as ExpBranch) ?? 'BSD')
  const [saving, setSaving]     = useState(false)

  async function handleSave() {
    if (!amount) return
    setSaving(true)
    const payload = { date, category, description: description.trim(), amount: parseFloat(amount), branch: expBranch }
    if (existing) {
      await supabase.from('expenses').update(payload).eq('id', existing.id)
    } else {
      await supabase.from('expenses').insert(payload)
    }
    setSaving(false); onSave()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E6', borderRadius: 16 }} className="w-full max-w-md">
        <div style={{ borderBottom: '1px solid #E8E8E6' }} className="flex items-center justify-between px-6 py-4">
          <h2 style={{ fontFamily: "'Archivo Black', sans-serif", color: '#0E0E0E', fontSize: 16 }}>
            {existing ? 'Edit Biaya Operasional' : 'Tambah Biaya Operasional'}
          </h2>
          <button onClick={onClose} style={{ color: '#6B6B6B' }}><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          {/* Branch selector */}
          <div>
            <label style={{ color: '#6B6B6B' }} className="block text-xs mb-1.5 uppercase tracking-wider font-medium">Berlaku untuk</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {BRANCH_OPTIONS.map(b => (
                <button key={b} type="button" onClick={() => setExpBranch(b)}
                  style={{
                    flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    border: `1px solid ${expBranch === b ? '#1D4ED8' : '#E8E8E6'}`,
                    backgroundColor: expBranch === b ? '#EFF6FF' : '#F8F8F6',
                    color: expBranch === b ? '#1D4ED8' : '#6B6B6B',
                  }}>
                  {b === 'Shared' ? 'Shared ÷2' : b}
                </button>
              ))}
            </div>
            {expBranch === 'Shared' && (
              <p style={{ fontSize: 11, color: '#6B6B6B', marginTop: 4 }}>Dibagi rata ke BSD dan Serpong masing-masing setengahnya</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={{ color: '#6B6B6B' }} className="block text-xs mb-1.5 uppercase tracking-wider font-medium">Tanggal</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" />
            </div>
            <div>
              <label style={{ color: '#6B6B6B' }} className="block text-xs mb-1.5 uppercase tracking-wider font-medium">Kategori</label>
              <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none">
                {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={{ color: '#6B6B6B' }} className="block text-xs mb-1.5 uppercase tracking-wider font-medium">Deskripsi</label>
            <input value={description} onChange={e => setDesc(e.target.value)} placeholder="Keterangan..." style={inputStyle}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" />
          </div>
          <div>
            <label style={{ color: '#6B6B6B' }} className="block text-xs mb-1.5 uppercase tracking-wider font-medium">Jumlah (Rp) *</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} min="0"
              onFocus={e => e.target.select()} style={inputStyle}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" />
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} style={{ border: '1px solid #E8E8E6', color: '#6B6B6B' }}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium">Batal</button>
            <button onClick={handleSave} disabled={saving || !amount} style={{ backgroundColor: '#D91C1C' }}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60">
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function PurchaseModal({ purchase, onClose, onSave }: { purchase: Purchase; onClose: () => void; onSave: () => void }) {
  const [date,      setDate]      = useState(purchase.date)
  const [qty,       setQty]       = useState(String(purchase.quantity))
  const [unitPrice, setUnitPrice] = useState(String(purchase.unit_price))
  const [notes,     setNotes]     = useState(purchase.notes ?? '')
  const [saving,    setSaving]    = useState(false)

  async function handleSave() {
    setSaving(true)
    await supabase.from('transactions').update({
      date,
      quantity:   parseFloat(qty),
      unit_price: parseFloat(unitPrice),
      notes:      notes.trim(),
    }).eq('id', purchase.id)
    setSaving(false); onSave()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E6', borderRadius: 16 }} className="w-full max-w-md">
        <div style={{ borderBottom: '1px solid #E8E8E6' }} className="flex items-center justify-between px-6 py-4">
          <div>
            <h2 style={{ fontFamily: "'Archivo Black', sans-serif", color: '#0E0E0E', fontSize: 16 }}>Edit Pembelian</h2>
            <p style={{ color: '#6B6B6B', fontSize: 12, marginTop: 2 }}>{purchase.item?.name}</p>
          </div>
          <button onClick={onClose} style={{ color: '#6B6B6B' }}><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={{ color: '#6B6B6B' }} className="block text-xs mb-1.5 uppercase tracking-wider font-medium">Tanggal</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" />
            </div>
            <div>
              <label style={{ color: '#6B6B6B' }} className="block text-xs mb-1.5 uppercase tracking-wider font-medium">Qty ({purchase.item?.unit})</label>
              <input type="number" value={qty} onChange={e => setQty(e.target.value)} min="0" step="0.5"
                onFocus={e => e.target.select()} style={inputStyle}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" />
            </div>
          </div>
          <div>
            <label style={{ color: '#6B6B6B' }} className="block text-xs mb-1.5 uppercase tracking-wider font-medium">Harga / Unit (Rp)</label>
            <input type="number" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} min="0"
              onFocus={e => e.target.select()} style={inputStyle}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" />
          </div>
          <div>
            <label style={{ color: '#6B6B6B' }} className="block text-xs mb-1.5 uppercase tracking-wider font-medium">Supplier / Catatan</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="nama supplier..." style={inputStyle}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" />
          </div>
          <div style={{ backgroundColor: '#FFF7ED', border: '1px solid #FDE68A', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#92400E' }}>
            Total: <strong>{unitPrice && qty ? fmt(parseFloat(unitPrice) * parseFloat(qty)) : '—'}</strong>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} style={{ border: '1px solid #E8E8E6', color: '#6B6B6B' }}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium">Batal</button>
            <button onClick={handleSave} disabled={saving} style={{ backgroundColor: '#D97706' }}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60">
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Financial() {
  const [expenses,      setExpenses]      = useState<Expense[]>([])
  const [purchases,     setPurchases]     = useState<Purchase[]>([])
  const [sales,         setSales]         = useState<{ total_price: number; date: string }[]>([])
  const [importedSales, setImportedSales] = useState<{ nett_amount: number; gross_amount: number; branch: string; channel: string }[]>([])
  const [menuSales,     setMenuSales]     = useState<{ kasir_name: string; qty: number; branch: string }[]>([])
  const [menuCogsMap,   setMenuCogsMap]   = useState<Record<string, { cogs_per_unit: number; include_in_report: boolean }>>({})
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState<string | null>(null)
  const [showModal,     setShowModal]     = useState(false)
  const [editingExp,    setEditingExp]    = useState<(Expense & { branch?: string }) | null>(null)
  const [editingPurch,  setEditingPurch]  = useState<Purchase | null>(null)
  const [showAllHpp,    setShowAllHpp]    = useState(false)
  const [selectedMonth, setMonth]         = useState(new Date().toISOString().slice(5, 7))
  const [selectedYear]                    = useState(new Date().getFullYear())
  const [branch,        setBranch]        = useState<'BSD' | 'Serpong'>('BSD')

  // Supabase caps at 1000 rows per request — paginate until exhausted
  async function fetchAllMenuSales(prefix: string, dateEnd: string) {
    const PAGE = 1000
    let all: { kasir_name: string; qty: number; branch: string }[] = []
    let from = 0
    while (true) {
      const { data, error } = await supabase
        .from('imported_menu_sales')
        .select('kasir_name, qty, branch')
        .gte('date', `${prefix}-01`)
        .lte('date', dateEnd)
        .range(from, from + PAGE - 1)
      if (error) throw error
      if (!data || data.length === 0) break
      all = all.concat(data as any)
      if (data.length < PAGE) break
      from += PAGE
    }
    return all
  }

  const loadData = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const prefix  = `${selectedYear}-${selectedMonth}`
      const lastDay = new Date(parseInt(selectedYear.toString()), parseInt(selectedMonth), 0).getDate()
      const dateEnd = `${prefix}-${String(lastDay).padStart(2, '0')}`
      const [{ data: expData, error: e1 }, { data: salesData, error: e2 }, { data: purchData, error: e3 }, { data: impData, error: e4 }, { data: menuCogsData, error: e6 }] = await Promise.all([
        supabase.from('expenses').select('*').gte('date', `${prefix}-01`).lte('date', dateEnd).order('date', { ascending: false }),
        supabase.from('sales').select('total_price, date').gte('date', `${prefix}-01`).lte('date', dateEnd),
        supabase.from('transactions').select('id, date, quantity, unit_price, notes, item:items(name,unit)')
          .eq('source', 'purchase').eq('type', 'in')
          .gte('date', `${prefix}-01`).lte('date', dateEnd)
          .order('date', { ascending: false }),
        supabase.from('imported_sales').select('nett_amount, gross_amount, branch, channel')
          .gte('date', `${prefix}-01`).lte('date', dateEnd),
        supabase.from('menu_cogs').select('kasir_name, cogs_per_unit, include_in_report'),
      ])
      if (e1) throw e1; if (e2) throw e2; if (e3) throw e3; if (e4) throw e4; if (e6) throw e6

      const menuSalesData = await fetchAllMenuSales(prefix, dateEnd)

      setExpenses(expData ?? [])
      setSales(salesData ?? [])
      setPurchases((purchData ?? []) as unknown as Purchase[])
      setImportedSales((impData ?? []) as any)
      setMenuSales(menuSalesData)
      setMenuCogsMap(Object.fromEntries((menuCogsData ?? []).map((m: any) => [m.kasir_name, m])))
    } catch (e: any) {
      setError(e.message ?? 'Gagal memuat data.')
    } finally {
      setLoading(false)
    }
  }, [selectedMonth, selectedYear])

  useEffect(() => { loadData() }, [loadData])

  // Revenue: use imported_sales (nett after commission) for selected branch, fallback to manual sales
  const branchImported = importedSales.filter(r => r.branch === branch)
  const importedNett   = branchImported.reduce((s, r) => s + r.nett_amount, 0)
  const importedGross  = branchImported.reduce((s, r) => s + r.gross_amount, 0)
  const manualRevenue  = sales.reduce((s, r) => s + r.total_price, 0)
  const totalRevenue   = importedNett > 0 ? importedNett : manualRevenue
  const totalGross     = importedGross > 0 ? importedGross : manualRevenue
  const totalKomisi    = totalGross - totalRevenue

  // Channel breakdown
  const channelBreakdown = ['GRAB', 'GOFOOD', 'POS'].map(ch => ({
    ch,
    gross: branchImported.filter(r => r.channel === ch).reduce((s, r) => s + r.gross_amount, 0),
    nett:  branchImported.filter(r => r.channel === ch).reduce((s, r) => s + r.nett_amount,  0),
  })).filter(c => c.gross > 0)

  // HPP = menu sales qty × COGS estimate per menu (from menu_cogs table)
  // grouped by menu name for the selected branch
  const branchMenuSales = menuSales.filter(m => m.branch === branch)
  const hppByMenu = Object.entries(
    branchMenuSales.reduce<Record<string, number>>((acc, m) => {
      acc[m.kasir_name] = (acc[m.kasir_name] ?? 0) + m.qty
      return acc
    }, {})
  ).map(([name, qty]) => {
    const cog = menuCogsMap[name]
    const cogs = (cog?.include_in_report !== false && cog?.cogs_per_unit) ? cog.cogs_per_unit : 0
    return { name, qty, cogs, total: qty * cogs }
  }).filter(m => m.total > 0).sort((a, b) => b.total - a.total)

  const hasEstimatedCogs = hppByMenu.length > 0
  const totalHPP         = hppByMenu.reduce((s, m) => s + m.total, 0)
  const missingCogs      = branchMenuSales.length > 0
    ? [...new Set(branchMenuSales.map(m => m.kasir_name))].filter(n => !menuCogsMap[n]?.cogs_per_unit).length
    : 0

  // Purchasing cash tracking (separate from HPP, shown as info only)
  const totalPurchaseCash = purchases.reduce((s, p) => s + (p.unit_price ?? 0) * p.quantity, 0)

  // Expenses filtered by branch — Shared is split 50/50
  const branchExpenses = (expenses as (Expense & { branch?: string })[]).filter(e =>
    !e.branch || e.branch === branch || e.branch === 'Shared'
  )
  function expAmt(e: Expense & { branch?: string }) {
    return e.branch === 'Shared' ? e.amount / 2 : e.amount
  }

  async function deleteExpense(id: string) {
    if (!confirm('Hapus biaya ini?')) return
    await supabase.from('expenses').delete().eq('id', id)
    loadData()
  }

  // P&L numbers
  const grossProfit      = totalRevenue - totalHPP
  const totalOperasional = branchExpenses.reduce((s, e) => s + expAmt(e), 0)
  const netProfit        = grossProfit - totalOperasional
  const grossMargin      = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0
  const netMargin        = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0
  const hppPct           = totalRevenue > 0 ? (totalHPP / totalRevenue) * 100 : 0
  const opsPct           = totalRevenue > 0 ? (totalOperasional / totalRevenue) * 100 : 0
  const monthLabel       = MONTHS.find(m => m.value === selectedMonth)?.label

  const byOpCategory = EXPENSE_CATEGORIES.map(cat => ({
    cat, total: branchExpenses.filter(e => e.category === cat).reduce((s, e) => s + expAmt(e), 0)
  })).filter(c => c.total > 0)

  const hasData = totalRevenue > 0 || totalHPP > 0 || totalOperasional > 0

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Financial"
        subtitle="P&L statement — revenue, HPP, dan biaya operasional"
        action={
          <button onClick={() => setShowModal(true)} style={{ backgroundColor: '#D91C1C' }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold">
            <Plus size={14} /> Tambah Biaya
          </button>
        }
      />

      {/* Month + Branch selector */}
      <div style={{ borderBottom: '1px solid #E8E8E6', backgroundColor: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 32px', overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          {(['BSD', 'Serpong'] as const).map(b => (
            <button key={b} onClick={() => setBranch(b)}
              style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: `1px solid ${branch === b ? '#1D4ED8' : '#E8E8E6'}`, backgroundColor: branch === b ? '#EFF6FF' : '#F8F8F6', color: branch === b ? '#1D4ED8' : '#6B6B6B' }}>
              {b}
            </button>
          ))}
        </div>
        <div style={{ width: 1, height: 20, backgroundColor: '#E8E8E6', flexShrink: 0 }} />
        <div style={{ display: 'flex', gap: 4, flexWrap: 'nowrap' }}>
          {MONTHS.map(m => (
            <button key={m.value} onClick={() => setMonth(m.value)}
              style={{ backgroundColor: selectedMonth === m.value ? '#D91C1C' : '#F8F8F6', border: '1px solid ' + (selectedMonth === m.value ? '#D91C1C' : '#E8E8E6'), color: selectedMonth === m.value ? '#FFFFFF' : '#6B6B6B', padding: '6px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer' }}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ color: '#6B6B6B' }} className="flex items-center justify-center py-32 text-sm">Memuat data...</div>
      ) : error ? (
        <div className="px-8 py-5">
          <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12 }} className="flex items-center gap-3 px-5 py-4">
            <AlertCircle size={16} style={{ color: '#DC2626', flexShrink: 0 }} />
            <div>
              <p style={{ color: '#DC2626' }} className="text-sm font-medium">Gagal memuat data</p>
              <p style={{ color: '#EF4444' }} className="text-xs mt-0.5">{error}</p>
            </div>
            <button onClick={loadData} style={{ backgroundColor: '#DC2626', color: '#FFFFFF' }} className="ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold">Coba Lagi</button>
          </div>
        </div>
      ) : (
        <div className="px-8 py-6 space-y-5">

          {/* ── Stat cards ── */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Pendapatan', value: totalRevenue,     color: '#16A34A' },
              { label: 'HPP (Bahan Baku)', value: totalHPP,   color: '#D97706' },
              { label: 'Biaya Operasional', value: totalOperasional, color: '#6B7280' },
              { label: 'Net Profit',  value: netProfit,        color: netProfit >= 0 ? '#16A34A' : '#DC2626' },
            ].map(c => (
              <div key={c.label} style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E6', borderLeft: `3px solid ${c.color}`, borderRadius: 12 }} className="p-4">
                <div style={{ color: '#6B6B6B' }} className="text-xs uppercase tracking-wider mb-1 font-medium">{c.label}</div>
                <div style={{ color: c.color, fontFamily: "'Archivo Black', sans-serif" }} className="text-xl">{fmt(c.value)}</div>
              </div>
            ))}
          </div>

          {/* ── P&L Statement ── */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E6', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ borderBottom: '1px solid #E8E8E6', backgroundColor: '#F8F8F6' }} className="px-6 py-4 flex items-center justify-between">
              <h3 style={{ fontFamily: "'Archivo Black', sans-serif", color: '#0E0E0E', fontSize: 15 }}>
                P&L STATEMENT — {monthLabel?.toUpperCase()} {selectedYear}
              </h3>
              <div className="flex gap-2">
                <span style={{ backgroundColor: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0' }} className="text-xs px-2.5 py-1 rounded-full font-semibold">
                  Gross {grossMargin.toFixed(1)}%
                </span>
                <span style={{ backgroundColor: netProfit >= 0 ? '#F0FDF4' : '#FEF2F2', color: netProfit >= 0 ? '#16A34A' : '#DC2626', border: `1px solid ${netProfit >= 0 ? '#BBF7D0' : '#FECACA'}` }} className="text-xs px-2.5 py-1 rounded-full font-semibold">
                  Net {netMargin.toFixed(1)}%
                </span>
              </div>
            </div>

            {!hasData ? (
              <div className="py-12 text-center">
                <p style={{ color: '#6B6B6B' }} className="text-sm">Belum ada data untuk bulan ini.</p>
                <p style={{ color: '#ABABAB' }} className="text-xs mt-1">Catat penjualan, pembelian, atau biaya operasional.</p>
              </div>
            ) : (
              <div className="px-6 py-4">
                {/* Revenue — with channel breakdown if imported */}
                {channelBreakdown.length > 0 ? (
                  <div style={{ marginBottom: 4 }}>
                    <div style={{ color: '#6B6B6B', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Penjualan per Channel</div>
                    {channelBreakdown.map(c => (
                      <div key={c.ch} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 16, paddingBottom: 3 }}>
                        <span style={{ color: '#6B6B6B', fontSize: 12 }}>{c.ch} <span style={{ color: '#ABABAB' }}>({fmt(c.gross)} gross)</span></span>
                        <span style={{ color: '#16A34A', fontSize: 12, fontWeight: 500 }}>{fmt(c.nett)}</span>
                      </div>
                    ))}
                    {totalKomisi > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 16, paddingBottom: 3 }}>
                        <span style={{ color: '#ABABAB', fontSize: 12 }}>Komisi platform</span>
                        <span style={{ color: '#DC2626', fontSize: 12 }}>({fmt(totalKomisi)})</span>
                      </div>
                    )}
                    <PLRow label="(+) Total Nett Revenue" value={totalRevenue} positive bold separator />
                  </div>
                ) : (
                  <PLRow label="(+) Pendapatan Penjualan" value={totalRevenue} positive bold separator />
                )}

                {/* HPP — from menu sales × COGS estimate */}
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <div style={{ color: '#6B6B6B', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Harga Pokok Penjualan (HPP)
                    </div>
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, backgroundColor: hasEstimatedCogs ? '#FFF7ED' : '#F2F2F0', color: hasEstimatedCogs ? '#D97706' : '#ABABAB', fontWeight: 600 }}>
                      {hasEstimatedCogs ? 'estimasi' : 'belum ada data'}
                    </span>
                    {missingCogs > 0 && (
                      <span style={{ fontSize: 10, color: '#DC2626' }}>· {missingCogs} menu belum ada COGS</span>
                    )}
                  </div>
                  {(showAllHpp ? hppByMenu : hppByMenu.slice(0, 8)).map(m => (
                    <div key={m.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 16, paddingBottom: 2 }}>
                      <span style={{ color: '#6B6B6B', fontSize: 12 }}>
                        {m.name}
                        <span style={{ color: '#ABABAB' }}> ({m.qty} × {fmt(m.cogs)})</span>
                        <span style={{ color: '#D97706', marginLeft: 4, fontSize: 11 }}>
                          {totalHPP > 0 ? `${((m.total / totalHPP) * 100).toFixed(1)}%` : ''}
                        </span>
                      </span>
                      <span style={{ color: '#D97706', fontSize: 12, fontWeight: 500 }}>({fmt(m.total)})</span>
                    </div>
                  ))}
                  {hppByMenu.length > 8 && (
                    <button onClick={() => setShowAllHpp(v => !v)}
                      style={{ paddingLeft: 16, fontSize: 11, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', display: 'block', marginTop: 2 }}>
                      {showAllHpp ? '↑ Sembunyikan' : `↓ Lihat semua ${hppByMenu.length} menu`}
                    </button>
                  )}
                  {!hasEstimatedCogs && (
                    <div style={{ color: '#ABABAB', fontSize: 12, paddingLeft: 16 }}>
                      Import data kasir dulu, lalu isi estimasi COGS di Sales → Settings
                    </div>
                  )}
                  <PLRow label="(−) Total HPP" value={totalHPP} pct={hppPct} negative separator />
                </div>

                {/* Gross Profit */}
                <PLRow label="= LABA KOTOR" value={grossProfit} positive={grossProfit >= 0} negative={grossProfit < 0} bold separator />

                {/* Operational */}
                <div style={{ marginTop: 8 }}>
                  <div style={{ color: '#6B6B6B', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
                    Biaya Operasional
                  </div>
                  {byOpCategory.map(c => (
                    <div key={c.cat} className="flex justify-between items-center py-1" style={{ paddingLeft: 16 }}>
                      <span style={{ color: '#6B6B6B', fontSize: 12 }}>{c.cat}</span>
                      <span style={{ color: '#6B7280', fontSize: 12, fontWeight: 500 }}>({fmt(c.total)})</span>
                    </div>
                  ))}
                  {expenses.length === 0 && (
                    <div style={{ color: '#ABABAB', fontSize: 12, paddingLeft: 16 }}>Belum ada biaya operasional dicatat</div>
                  )}
                  <PLRow label="(−) Total Operasional" value={totalOperasional} pct={opsPct} negative separator />
                </div>

                {/* Net Profit */}
                <div className="flex justify-between items-center pt-4 mt-2">
                  <span style={{ color: '#0E0E0E', fontFamily: "'Archivo Black', sans-serif", fontSize: 15 }}>= NET PROFIT</span>
                  <span style={{ color: netProfit >= 0 ? '#16A34A' : '#DC2626', fontFamily: "'Archivo Black', sans-serif", fontSize: 26 }}>
                    {fmt(netProfit)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ── Cash Keluar: Pembelian Bahan Baku (info only, bukan bagian HPP) ── */}
          {purchases.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <h3 style={{ fontFamily: "'Archivo Black', sans-serif", color: '#0E0E0E', fontSize: 13, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Cash Keluar — Pembelian Bahan Baku
                </h3>
                <span style={{ fontSize: 11, padding: '2px 8px', backgroundColor: '#F0F9FF', color: '#0369A1', border: '1px solid #BAE6FD', borderRadius: 6, fontWeight: 600 }}>
                  info saja · bukan HPP · total {fmt(totalPurchaseCash)}
                </span>
              </div>
              <div style={{ border: '1px solid #E8E8E6', borderRadius: 16, overflow: 'hidden' }}>
                <table className="w-full">
                  <thead>
                    <tr style={{ backgroundColor: '#FFF7ED', borderBottom: '1px solid #E8E8E6' }}>
                      {['Tanggal', 'Barang', 'Qty', 'Harga/Unit', 'Total', 'Supplier', ''].map(h => (
                        <th key={h} style={{ color: '#92400E' }} className={`px-4 py-3 text-xs font-medium uppercase tracking-wider ${h === 'Total' ? 'text-right' : 'text-left'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody style={{ backgroundColor: '#FFFFFF' }}>
                    {purchases.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #F0F0EE' }} className="hover:bg-[#FAFAF9]">
                        <td className="px-4 py-3 text-sm" style={{ color: '#6B6B6B' }}>{p.date}</td>
                        <td className="px-4 py-3 text-sm font-medium" style={{ color: '#0E0E0E' }}>{p.item?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-sm" style={{ color: '#6B6B6B' }}>{p.quantity} {p.item?.unit}</td>
                        <td className="px-4 py-3 text-sm" style={{ color: '#D97706' }}>{p.unit_price > 0 ? fmt(p.unit_price) : '—'}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-right" style={{ color: '#DC2626' }}>{fmt(p.unit_price * p.quantity)}</td>
                        <td className="px-4 py-3 text-sm" style={{ color: '#6B6B6B' }}>{p.notes || '—'}</td>
                        <td className="px-4 py-3">
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                            <button onClick={() => setEditingPurch(p)} title="Edit"
                              style={{ color: '#6B6B6B', background: 'none', border: '1px solid #E8E8E6', borderRadius: 6, padding: '4px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                              <Pencil size={12} />
                            </button>
                            <button onClick={async () => {
                              if (!confirm('Hapus pembelian ini?')) return
                              await supabase.from('transactions').delete().eq('id', p.id)
                              loadData()
                            }} title="Hapus"
                              style={{ color: '#DC2626', background: 'none', border: '1px solid #FECACA', borderRadius: 6, padding: '4px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Detail Biaya Operasional ── */}
          <div>
            <h3 style={{ fontFamily: "'Archivo Black', sans-serif", color: '#0E0E0E', fontSize: 13 }} className="mb-3 uppercase tracking-wide">
              Detail Biaya Operasional
            </h3>
            {branchExpenses.length === 0 ? (
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E6', borderRadius: 12 }} className="flex flex-col items-center justify-center py-10 gap-2">
                <p style={{ color: '#6B6B6B' }} className="text-sm">Belum ada biaya operasional bulan {monthLabel} untuk {branch}.</p>
                <button onClick={() => setShowModal(true)} style={{ color: '#D91C1C' }} className="text-xs font-medium hover:underline">+ Tambah biaya</button>
              </div>
            ) : (
              <div style={{ border: '1px solid #E8E8E6', borderRadius: 16, overflow: 'hidden' }}>
                <table className="w-full">
                  <thead>
                    <tr style={{ backgroundColor: '#F8F8F6', borderBottom: '1px solid #E8E8E6' }}>
                      {['Tanggal', 'Kategori', 'Branch', 'Deskripsi', 'Jumlah', ''].map(h => (
                        <th key={h} style={{ color: '#6B6B6B' }} className={`px-4 py-3 text-xs font-medium uppercase tracking-wider ${h === 'Jumlah' ? 'text-right' : 'text-left'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody style={{ backgroundColor: '#FFFFFF' }}>
                    {branchExpenses.map(e => {
                      const eb = (e as any).branch as string | undefined
                      const displayAmt = eb === 'Shared' ? e.amount / 2 : e.amount
                      return (
                        <tr key={e.id} style={{ borderBottom: '1px solid #F0F0EE' }} className="hover:bg-[#FAFAF9]">
                          <td className="px-4 py-3 text-sm" style={{ color: '#6B6B6B' }}>{e.date}</td>
                          <td className="px-4 py-3">
                            <span style={{ backgroundColor: '#F2F2F0', color: '#6B6B6B', border: '1px solid #E8E8E6' }} className="text-xs px-2.5 py-1 rounded-full font-medium">{e.category}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span style={{
                              fontSize: 11, padding: '2px 7px', borderRadius: 6, fontWeight: 600,
                              backgroundColor: eb === 'Shared' ? '#F5F3FF' : eb === 'Serpong' ? '#F0FDF4' : '#EFF6FF',
                              color: eb === 'Shared' ? '#7C3AED' : eb === 'Serpong' ? '#16A34A' : '#1D4ED8',
                            }}>
                              {eb === 'Shared' ? 'Shared ÷2' : (eb ?? 'BSD')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm" style={{ color: '#0E0E0E' }}>{e.description || '—'}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-right" style={{ color: '#DC2626' }}>
                            {fmt(displayAmt)}
                            {eb === 'Shared' && <span style={{ color: '#ABABAB', fontSize: 10, marginLeft: 4 }}>/{fmt(e.amount)}</span>}
                          </td>
                          <td className="px-4 py-3">
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                              <button onClick={() => setEditingExp(e as any)} title="Edit"
                                style={{ color: '#6B6B6B', background: 'none', border: '1px solid #E8E8E6', borderRadius: 6, padding: '4px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                <Pencil size={12} />
                              </button>
                              <button onClick={() => deleteExpense(e.id)} title="Hapus"
                                style={{ color: '#DC2626', background: 'none', border: '1px solid #FECACA', borderRadius: 6, padding: '4px 6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                <Trash2 size={12} />
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
          </div>

        </div>
      )}

      {showModal && <ExpenseModal onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); loadData() }} defaultBranch={branch} />}
      {editingExp && <ExpenseModal existing={editingExp} onClose={() => setEditingExp(null)} onSave={() => { setEditingExp(null); loadData() }} defaultBranch={branch} />}
      {editingPurch && <PurchaseModal purchase={editingPurch} onClose={() => setEditingPurch(null)} onSave={() => { setEditingPurch(null); loadData() }} />}
    </div>
  )
}
