import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { TrendingUp, Package, ShoppingBag, AlertTriangle } from 'lucide-react'
import PageHeader from '../components/PageHeader'

function fmt(n: number) {
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}jt`
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}rb`
  return `Rp ${n}`
}

export default function Dashboard() {
  const [stats, setStats] = useState({ revenue: 0, expenses: 0, profit: 0, items: 0, menus: 0, lowStock: 0 })
  const [salesChart, setSalesChart] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const now = new Date()
      const month = now.toISOString().slice(0, 7)

      const [{ data: sales }, { data: expenses }, { data: items }, { data: menus }] = await Promise.all([
        supabase.from('sales').select('total_price, date').gte('date', `${month}-01`),
        supabase.from('expenses').select('amount').gte('date', `${month}-01`),
        supabase.from('items').select('stock, min_stock'),
        supabase.from('menus').select('id'),
      ])

      const revenue = (sales ?? []).reduce((s, r) => s + r.total_price, 0)
      const totalExpenses = (expenses ?? []).reduce((s, e) => s + e.amount, 0)
      const lowStock = (items ?? []).filter(i => i.stock <= i.min_stock && i.min_stock > 0).length

      // build daily sales chart for last 14 days
      const chartMap: Record<string, number> = {}
      for (let i = 13; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i)
        chartMap[d.toISOString().split('T')[0]] = 0
      }
      ;(sales ?? []).forEach(s => {
        if (chartMap[s.date] !== undefined) chartMap[s.date] += s.total_price
      })

      setSalesChart(Object.entries(chartMap).map(([date, amount]) => ({
        date: date.slice(5),
        amount,
      })))

      setStats({ revenue, expenses: totalExpenses, profit: revenue - totalExpenses, items: items?.length ?? 0, menus: menus?.length ?? 0, lowStock })
      setLoading(false)
    }
    load()
  }, [])

  const cards = [
    { label: 'Revenue Bulan Ini', value: fmt(stats.revenue), sub: 'Total penjualan', color: '#22c55e', icon: <TrendingUp size={18} /> },
    { label: 'Pengeluaran', value: fmt(stats.expenses), sub: 'Total biaya operasional', color: '#f59e0b', icon: <ShoppingBag size={18} /> },
    { label: 'Net Profit', value: fmt(stats.profit), sub: 'Revenue - Pengeluaran', color: stats.profit >= 0 ? '#22c55e' : '#ef4444', icon: <TrendingUp size={18} /> },
    { label: 'Stok Kritis', value: stats.lowStock, sub: 'Barang di bawah minimum', color: stats.lowStock > 0 ? '#ef4444' : '#22c55e', icon: <AlertTriangle size={18} /> },
  ]

  return (
    <div className="min-h-screen">
      <PageHeader title="Dashboard" subtitle={`Overview bulan ${new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`} />

      {loading ? (
        <div style={{ color: '#8a867d' }} className="flex items-center justify-center py-32 text-sm">Memuat dashboard...</div>
      ) : (
        <div className="px-8 py-6 space-y-6">
          {/* KPI cards */}
          <div className="grid grid-cols-4 gap-4">
            {cards.map(c => (
              <div key={c.label} style={{ backgroundColor: '#171614', border: '1px solid #2a2825' }} className="rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span style={{ color: '#8a867d' }} className="text-xs uppercase tracking-wider">{c.label}</span>
                  <span style={{ color: c.color }}>{c.icon}</span>
                </div>
                <div style={{ color: c.color }} className="text-3xl font-bold mb-1">{c.value}</div>
                <div style={{ color: '#8a867d' }} className="text-xs">{c.sub}</div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-2 gap-4">
            <div style={{ backgroundColor: '#171614', border: '1px solid #2a2825' }} className="rounded-xl p-5">
              <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#e8e4dc' }} className="text-lg tracking-wider mb-4">
                Sales 14 Hari Terakhir
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={salesChart} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <XAxis dataKey="date" tick={{ fill: '#8a867d', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#8a867d', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f1e1b', border: '1px solid #2a2825', borderRadius: 8, color: '#e8e4dc', fontSize: 12 }}
                    formatter={(v) => [fmt(Number(v ?? 0)), 'Revenue']}
                  />
                  <Bar dataKey="amount" fill="#e5420d" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ backgroundColor: '#171614', border: '1px solid #2a2825' }} className="rounded-xl p-5">
              <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#e8e4dc' }} className="text-lg tracking-wider mb-4">
                Trend Revenue
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={salesChart} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <XAxis dataKey="date" tick={{ fill: '#8a867d', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#8a867d', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f1e1b', border: '1px solid #2a2825', borderRadius: 8, color: '#e8e4dc', fontSize: 12 }}
                    formatter={(v) => [fmt(Number(v ?? 0)), 'Revenue']}
                  />
                  <Line type="monotone" dataKey="amount" stroke="#d4a017" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-4">
            <div style={{ backgroundColor: '#171614', border: '1px solid #2a2825' }} className="rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Package size={16} style={{ color: '#d4a017' }} />
                <span style={{ color: '#8a867d' }} className="text-xs uppercase tracking-wider">Total Items</span>
              </div>
              <div style={{ color: '#e8e4dc' }} className="text-4xl font-bold">{stats.items}</div>
              <div style={{ color: '#8a867d' }} className="text-xs mt-1">bahan baku terdaftar</div>
            </div>
            <div style={{ backgroundColor: '#171614', border: '1px solid #2a2825' }} className="rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingBag size={16} style={{ color: '#e5420d' }} />
                <span style={{ color: '#8a867d' }} className="text-xs uppercase tracking-wider">Total Menu</span>
              </div>
              <div style={{ color: '#e8e4dc' }} className="text-4xl font-bold">{stats.menus}</div>
              <div style={{ color: '#8a867d' }} className="text-xs mt-1">menu aktif di sistem</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
