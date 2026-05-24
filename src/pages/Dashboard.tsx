import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { TrendingUp, ShoppingBag, AlertTriangle, Package } from 'lucide-react'
import PageHeader from '../components/PageHeader'

function fmt(n: number) {
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}jt`
  if (n >= 1_000)     return `Rp ${(n / 1_000).toFixed(0)}rb`
  return `Rp ${n}`
}

const TOOLTIP_STYLE = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #E8E8E6',
  borderRadius: 8,
  color: '#0E0E0E',
  fontSize: 12,
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
}

export default function Dashboard() {
  const [stats, setStats]           = useState({ revenue: 0, expenses: 0, profit: 0, items: 0, menus: 0, lowStock: 0 })
  const [salesChart, setSalesChart] = useState<any[]>([])
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    async function load() {
      const month = new Date().toISOString().slice(0, 7)
      const [{ data: sales }, { data: expenses }, { data: items }, { data: menus }] = await Promise.all([
        supabase.from('sales').select('total_price, date').gte('date', `${month}-01`),
        supabase.from('expenses').select('amount').gte('date', `${month}-01`),
        supabase.from('items').select('stock, min_stock'),
        supabase.from('menus').select('id'),
      ])
      const revenue      = (sales ?? []).reduce((s, r) => s + r.total_price, 0)
      const totalExp     = (expenses ?? []).reduce((s, e) => s + e.amount, 0)
      const lowStock     = (items ?? []).filter(i => i.stock <= i.min_stock && i.min_stock > 0).length

      const chartMap: Record<string, number> = {}
      for (let i = 13; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i)
        chartMap[d.toISOString().split('T')[0]] = 0
      }
      ;(sales ?? []).forEach(s => { if (chartMap[s.date] !== undefined) chartMap[s.date] += s.total_price })

      setSalesChart(Object.entries(chartMap).map(([date, amount]) => ({ date: date.slice(5), amount })))
      setStats({ revenue, expenses: totalExp, profit: revenue - totalExp, items: items?.length ?? 0, menus: menus?.length ?? 0, lowStock })
      setLoading(false)
    }
    load()
  }, [])

  const cards = [
    { label: 'Revenue Bulan Ini', value: fmt(stats.revenue),   color: '#16A34A', bg: '#F0FDF4', icon: <TrendingUp size={16} /> },
    { label: 'Pengeluaran',       value: fmt(stats.expenses),  color: '#D97706', bg: '#FFFBEB', icon: <ShoppingBag size={16} /> },
    { label: 'Net Profit',        value: fmt(stats.profit),    color: stats.profit >= 0 ? '#16A34A' : '#DC2626', bg: stats.profit >= 0 ? '#F0FDF4' : '#FEF2F2', icon: <TrendingUp size={16} /> },
    { label: 'Stok Kritis',       value: stats.lowStock,       color: stats.lowStock > 0 ? '#DC2626' : '#16A34A', bg: stats.lowStock > 0 ? '#FEF2F2' : '#F0FDF4', icon: <AlertTriangle size={16} /> },
  ]

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Dashboard"
        subtitle={`Overview bulan ${new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`}
      />

      {loading ? (
        <div style={{ color: '#6B6B6B' }} className="flex items-center justify-center py-32 text-sm">
          Memuat data...
        </div>
      ) : (
        <div className="px-8 py-6 space-y-5">
          {/* KPI cards */}
          <div className="grid grid-cols-4 gap-4">
            {cards.map(c => (
              <div key={c.label} style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E6' }} className="rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span style={{ color: '#6B6B6B' }} className="text-xs font-medium uppercase tracking-wider">{c.label}</span>
                  <span style={{ backgroundColor: c.bg, color: c.color }} className="p-1.5 rounded-lg">{c.icon}</span>
                </div>
                <div style={{ color: c.color, fontFamily: "'Archivo Black', sans-serif" }} className="text-2xl">{c.value}</div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-2 gap-4">
            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E6' }} className="rounded-2xl p-5">
              <h3 style={{ fontFamily: "'Archivo Black', sans-serif", color: '#0E0E0E', fontSize: 14 }} className="mb-4 uppercase tracking-wide">
                Sales 14 Hari Terakhir
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={salesChart} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <XAxis dataKey="date" tick={{ fill: '#ABABAB', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#ABABAB', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [fmt(Number(v ?? 0)), 'Revenue']} />
                  <Bar dataKey="amount" fill="#D91C1C" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E6' }} className="rounded-2xl p-5">
              <h3 style={{ fontFamily: "'Archivo Black', sans-serif", color: '#0E0E0E', fontSize: 14 }} className="mb-4 uppercase tracking-wide">
                Trend Revenue
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={salesChart} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <XAxis dataKey="date" tick={{ fill: '#ABABAB', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#ABABAB', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [fmt(Number(v ?? 0)), 'Revenue']} />
                  <Line type="monotone" dataKey="amount" stroke="#D91C1C" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Total Bahan Baku', value: stats.items,  sub: 'item terdaftar di inventory', color: '#D97706', icon: <Package size={18} /> },
              { label: 'Total Menu',       value: stats.menus,  sub: 'menu di sistem',               color: '#D91C1C', icon: <ShoppingBag size={18} /> },
            ].map(s => (
              <div key={s.label} style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E6' }} className="rounded-2xl p-5 flex items-center gap-4">
                <div style={{ backgroundColor: '#F8F8F6', color: s.color }} className="p-3 rounded-xl">{s.icon}</div>
                <div>
                  <div style={{ fontFamily: "'Archivo Black', sans-serif", color: '#0E0E0E' }} className="text-3xl">{s.value}</div>
                  <div style={{ color: '#6B6B6B' }} className="text-xs mt-0.5">{s.sub}</div>
                </div>
                <div style={{ color: '#6B6B6B' }} className="ml-auto text-sm font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
