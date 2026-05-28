import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import {
  TrendingUp, ShoppingBag, ArrowLeftRight,
  Factory, Clock, CheckCircle2, ChevronRight, Package
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import type { Item, TransferRequest, GadingProduction } from '../lib/types'

function fmt(n: number) {
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}jt`
  if (n >= 1_000) return `Rp ${(n / 1_000).toFixed(0)}rb`
  return `Rp ${n}`
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

const TOOLTIP_STYLE = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #E8E8E6',
  borderRadius: 8,
  color: '#0E0E0E',
  fontSize: 12,
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:  { label: 'Pending',   color: '#D97706', bg: '#FEF3C7' },
  approved: { label: 'Disetujui', color: '#2563EB', bg: '#DBEAFE' },
  sent:     { label: 'Dikirim',   color: '#7C3AED', bg: '#EDE9FE' },
  received: { label: 'Diterima',  color: '#16A34A', bg: '#DCFCE7' },
}

export default function Dashboard() {
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ revenue: 0, expenses: 0, items: 0, menus: 0 })
  const [salesChart, setSalesChart] = useState<{ date: string; amount: number }[]>([])
  const [lowStockItems, setLowStockItems] = useState<Item[]>([])
  const [pendingTransfers, setPendingTransfers] = useState<TransferRequest[]>([])
  const [activeTransfers, setActiveTransfers] = useState<TransferRequest[]>([])
  const [lastProductions, setLastProductions] = useState<GadingProduction[]>([])
  const [gadingTopStock, setGadingTopStock] = useState<Item[]>([])

  useEffect(() => {
    async function load() {
      const month = new Date().toISOString().slice(0, 7)

      const [
        { data: sales },
        { data: expenses },
        { data: items },
        { data: menus },
        { data: transfers },
        { data: productions },
      ] = await Promise.all([
        supabase.from('sales').select('total_price, date').gte('date', `${month}-01`),
        supabase.from('expenses').select('amount').gte('date', `${month}-01`),
        supabase.from('items').select('*').order('name'),
        supabase.from('menus').select('id'),
        supabase.from('transfer_requests')
          .select('*, items:transfer_request_items(*, item:items(name, unit, category))')
          .in('status', ['pending', 'approved', 'sent'])
          .order('request_date', { ascending: false })
          .limit(10),
        supabase.from('gading_productions')
          .select('*, items:gading_production_items(*, item:items(name, unit, category))')
          .order('date', { ascending: false })
          .limit(5),
      ])

      const revenue  = (sales ?? []).reduce((s, r) => s + r.total_price, 0)
      const totalExp = (expenses ?? []).reduce((s, e) => s + e.amount, 0)

      const chartMap: Record<string, number> = {}
      for (let i = 13; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i)
        chartMap[d.toISOString().split('T')[0]] = 0
      }
      ;(sales ?? []).forEach(s => { if (chartMap[s.date] !== undefined) chartMap[s.date] += s.total_price })

      const allItems = (items ?? []) as Item[]
      const critical = allItems.filter(i => i.min_stock > 0 && i.stock <= i.min_stock)
        .sort((a, b) => (a.stock / a.min_stock) - (b.stock / b.min_stock))
        .slice(0, 8)

      const topGading = allItems
        .filter(i => i.stock_gading > 0)
        .sort((a, b) => b.stock_gading - a.stock_gading)
        .slice(0, 6)

      const allTransfers = (transfers ?? []) as TransferRequest[]
      setPendingTransfers(allTransfers.filter(t => t.status === 'pending'))
      setActiveTransfers(allTransfers)
      setLowStockItems(critical)
      setGadingTopStock(topGading)
      setLastProductions((productions ?? []) as GadingProduction[])
      setSalesChart(Object.entries(chartMap).map(([date, amount]) => ({ date: date.slice(5), amount })))
      setStats({ revenue, expenses: totalExp, items: allItems.length, menus: menus?.length ?? 0 })
      setLoading(false)
    }
    load()
  }, [])

  const profit = stats.revenue - stats.expenses

  if (loading) {
    return (
      <div className="min-h-screen">
        <PageHeader title="Dashboard" subtitle={`Overview bulan ${new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`} />
        <div style={{ color: '#6B6B6B' }} className="flex items-center justify-center py-32 text-sm">Memuat data...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Dashboard"
        subtitle={`Overview bulan ${new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`}
      />

      <div className="px-8 py-6 space-y-4">

        {/* ── Row 1: KPI cards ── */}
        <div className="grid grid-cols-4 gap-4">
          {[
            {
              label: 'Revenue Bulan Ini',
              value: fmt(stats.revenue),
              color: '#16A34A',
              bg: '#F0FDF4',
              icon: <TrendingUp size={15} />,
            },
            {
              label: 'Pengeluaran',
              value: fmt(stats.expenses),
              color: '#D97706',
              bg: '#FFFBEB',
              icon: <ShoppingBag size={15} />,
            },
            {
              label: 'Net Profit',
              value: fmt(profit),
              color: profit >= 0 ? '#16A34A' : '#DC2626',
              bg: profit >= 0 ? '#F0FDF4' : '#FEF2F2',
              icon: <TrendingUp size={15} />,
            },
            {
              label: 'Permintaan Aktif',
              value: activeTransfers.length,
              sub: pendingTransfers.length > 0 ? `${pendingTransfers.length} perlu diproses` : 'Semua beres',
              color: pendingTransfers.length > 0 ? '#D91C1C' : '#16A34A',
              bg: pendingTransfers.length > 0 ? '#FEF2F2' : '#F0FDF4',
              icon: <ArrowLeftRight size={15} />,
              onClick: () => navigate('/transfers'),
            },
          ].map(c => (
            <div
              key={c.label}
              onClick={c.onClick}
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E8E8E6',
                cursor: c.onClick ? 'pointer' : 'default',
              }}
              className="rounded-2xl p-5 transition-shadow hover:shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <span style={{ color: '#6B6B6B' }} className="text-xs font-medium uppercase tracking-wider">{c.label}</span>
                <span style={{ backgroundColor: c.bg, color: c.color }} className="p-1.5 rounded-lg">{c.icon}</span>
              </div>
              <div style={{ color: c.color, fontFamily: "'Archivo Black', sans-serif" }} className="text-2xl">{c.value}</div>
              {c.sub && <div style={{ color: '#9B9B9B' }} className="text-xs mt-1">{c.sub}</div>}
            </div>
          ))}
        </div>

        {/* ── Row 2: Transfer requests + Sales chart ── */}
        <div className="grid grid-cols-2 gap-4">

          {/* Active transfer requests */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E6' }} className="rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 style={{ fontFamily: "'Archivo Black', sans-serif", color: '#0E0E0E', fontSize: 13 }} className="uppercase tracking-wide">
                Permintaan Transfer
              </h3>
              <button
                onClick={() => navigate('/transfers')}
                style={{ color: '#D91C1C' }}
                className="text-xs flex items-center gap-1 hover:underline"
              >
                Lihat semua <ChevronRight size={12} />
              </button>
            </div>

            {activeTransfers.length === 0 ? (
              <div style={{ color: '#9B9B9B' }} className="text-sm text-center py-8">Tidak ada permintaan aktif</div>
            ) : (
              <div className="space-y-2">
                {activeTransfers.slice(0, 5).map(t => {
                  const cfg = STATUS_CONFIG[t.status]
                  return (
                    <div
                      key={t.id}
                      onClick={() => navigate('/transfers')}
                      style={{ backgroundColor: '#F8F8F6', cursor: 'pointer' }}
                      className="flex items-center gap-3 rounded-xl px-4 py-3 hover:bg-gray-100 transition-colors"
                    >
                      <div style={{ color: '#9B9B9B' }}>
                        {t.status === 'pending'  && <Clock size={14} />}
                        {t.status === 'approved' && <CheckCircle2 size={14} style={{ color: '#2563EB' }} />}
                        {t.status === 'sent'     && <ArrowLeftRight size={14} style={{ color: '#7C3AED' }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div style={{ color: '#0E0E0E' }} className="text-sm font-medium truncate">
                          {t.requested_by || 'BSD'}
                        </div>
                        <div style={{ color: '#9B9B9B' }} className="text-xs">
                          {fmtDate(t.request_date)} · {t.items?.length ?? 0} item
                        </div>
                      </div>
                      <span style={{ backgroundColor: cfg.bg, color: cfg.color }} className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                        {cfg.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Sales chart */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E6' }} className="rounded-2xl p-5">
            <h3 style={{ fontFamily: "'Archivo Black', sans-serif", color: '#0E0E0E', fontSize: 13 }} className="mb-4 uppercase tracking-wide">
              Sales 14 Hari Terakhir
            </h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={salesChart} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fill: '#ABABAB', fontSize: 9 }} axisLine={false} tickLine={false} interval={1} />
                <YAxis tick={{ fill: '#ABABAB', fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [fmt(Number(v ?? 0)), 'Revenue']} />
                <Bar dataKey="amount" fill="#D91C1C" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex justify-between mt-3 pt-3" style={{ borderTop: '1px solid #F0F0EE' }}>
              <div>
                <div style={{ color: '#9B9B9B' }} className="text-xs">Total periode</div>
                <div style={{ color: '#0E0E0E', fontFamily: "'Archivo Black', sans-serif" }} className="text-base">{fmt(stats.revenue)}</div>
              </div>
              <div className="text-right">
                <div style={{ color: '#9B9B9B' }} className="text-xs">Rata-rata/hari</div>
                <div style={{ color: '#0E0E0E', fontFamily: "'Archivo Black', sans-serif" }} className="text-base">
                  {fmt(Math.round(stats.revenue / 14))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Row 3: Low stock + Gading ── */}
        <div className="grid grid-cols-2 gap-4">

          {/* Critical stock */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E6' }} className="rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 style={{ fontFamily: "'Archivo Black', sans-serif", color: '#0E0E0E', fontSize: 13 }} className="uppercase tracking-wide">
                Stok Kritis BSD
              </h3>
              <button
                onClick={() => navigate('/inventory')}
                style={{ color: '#D91C1C' }}
                className="text-xs flex items-center gap-1 hover:underline"
              >
                Inventory <ChevronRight size={12} />
              </button>
            </div>

            {lowStockItems.length === 0 ? (
              <div style={{ color: '#9B9B9B' }} className="text-sm text-center py-8">
                <div style={{ color: '#16A34A' }} className="text-2xl mb-2">✓</div>
                Semua stok aman
              </div>
            ) : (
              <div className="space-y-1.5">
                {lowStockItems.map(item => {
                  const pct = item.min_stock > 0 ? Math.min(100, Math.round((item.stock / item.min_stock) * 100)) : 100
                  const danger = item.stock === 0 ? '#DC2626' : item.stock < item.min_stock ? '#D97706' : '#16A34A'
                  return (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span style={{ color: '#0E0E0E' }} className="text-xs font-medium truncate">{item.name}</span>
                          <span style={{ color: danger }} className="text-xs font-bold ml-2 whitespace-nowrap">
                            {item.stock} / {item.min_stock} {item.unit}
                          </span>
                        </div>
                        <div style={{ backgroundColor: '#F0F0EE', height: 4, borderRadius: 2 }} className="mt-1">
                          <div style={{ width: `${pct}%`, backgroundColor: danger, height: 4, borderRadius: 2, transition: 'width 0.3s' }} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Gading overview */}
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E6' }} className="rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 style={{ fontFamily: "'Archivo Black', sans-serif", color: '#0E0E0E', fontSize: 13 }} className="uppercase tracking-wide flex items-center gap-2">
                <Factory size={13} /> Gading
              </h3>
              <button
                onClick={() => navigate('/gading')}
                style={{ color: '#D91C1C' }}
                className="text-xs flex items-center gap-1 hover:underline"
              >
                Detail <ChevronRight size={12} />
              </button>
            </div>

            {/* Top stok gading */}
            {gadingTopStock.length > 0 && (
              <div className="mb-4">
                <div style={{ color: '#9B9B9B' }} className="text-xs uppercase tracking-wider mb-2">Stok Jadi Tersedia</div>
                <div className="grid grid-cols-2 gap-2">
                  {gadingTopStock.map(item => (
                    <div key={item.id} style={{ backgroundColor: '#F8F8F6' }} className="rounded-xl px-3 py-2">
                      <div style={{ color: '#0E0E0E' }} className="text-xs font-medium truncate">{item.name}</div>
                      <div style={{ color: '#D91C1C', fontFamily: "'Archivo Black', sans-serif" }} className="text-sm">
                        {item.stock_gading} <span style={{ color: '#9B9B9B', fontFamily: 'inherit', fontWeight: 400, fontSize: 10 }}>{item.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent productions */}
            <div style={{ color: '#9B9B9B' }} className="text-xs uppercase tracking-wider mb-2">Produksi Terakhir</div>
            {lastProductions.length === 0 ? (
              <div style={{ color: '#9B9B9B' }} className="text-xs text-center py-3">Belum ada catatan produksi</div>
            ) : (
              <div className="space-y-1.5">
                {lastProductions.slice(0, 3).map(p => (
                  <div key={p.id} className="flex items-center gap-3">
                    <div style={{ fontSize: 16 }}>{p.type === 'produksi' ? '🏭' : '🚚'}</div>
                    <div className="flex-1 min-w-0">
                      <div style={{ color: '#0E0E0E' }} className="text-xs font-medium">
                        {p.type === 'produksi' ? 'Produksi' : 'Dari Supplier'} · {p.items?.length ?? 0} item
                      </div>
                      <div style={{ color: '#9B9B9B' }} className="text-xs">{fmtDate(p.date)}{p.notes ? ` — ${p.notes}` : ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {gadingTopStock.length === 0 && lastProductions.length === 0 && (
              <div style={{ color: '#9B9B9B' }} className="text-sm text-center py-8">
                <Package size={24} className="mx-auto mb-2 opacity-30" />
                Belum ada data Gading
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
