import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import PageHeader from '../components/PageHeader'

function fmt(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}
function fmtNum(n: number) {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(n)
}

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(2024, i, 1)
  return { value: String(i + 1).padStart(2, '0'), label: d.toLocaleDateString('id-ID', { month: 'long' }) }
})

interface TransferItem {
  id: string
  quantity_sent: number
  item: { id: string; name: string; unit: string; price_per_unit: number; cost_price: number }
  request: { received_at: string }
}

interface ItemSummary {
  id: string; name: string; unit: string
  price_per_unit: number; cost_price: number
  qty: number; revenue: number; hpp: number; profit: number
}

const COLORS = ['#16A34A', '#2563EB', '#D97706', '#DC2626', '#7C3AED', '#DB2777', '#0891B2', '#65A30D']

export default function LaporanProduksi() {
  const now = new Date()
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'))
  const [year, setYear]   = useState(String(now.getFullYear()))
  const [rows, setRows]   = useState<ItemSummary[]>([])
  const [txCount, setTxCount] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => { load() }, [month, year])

  async function load() {
    setLoading(true)
    const from = `${year}-${month}-01`
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
    const to = `${year}-${month}-${String(lastDay).padStart(2, '0')}`

    const { data } = await supabase
      .from('transfer_request_items')
      .select('id, quantity_sent, item:item_id(id, name, unit, price_per_unit, cost_price), request:request_id(received_at)')
      .not('quantity_sent', 'is', null)
      .gt('quantity_sent', 0)

    const filtered = ((data ?? []) as unknown as TransferItem[]).filter(r => {
      const d = r.request?.received_at
      return d && d >= from && d <= to
    })

    const requestIds = new Set(filtered.map(r => r.request?.received_at)).size
    setTxCount(requestIds)

    const byItem: Record<string, ItemSummary> = {}
    for (const row of filtered) {
      const it = row.item
      if (!it) continue
      if (!byItem[it.id]) byItem[it.id] = { id: it.id, name: it.name, unit: it.unit, price_per_unit: it.price_per_unit, cost_price: it.cost_price, qty: 0, revenue: 0, hpp: 0, profit: 0 }
      const q = row.quantity_sent
      byItem[it.id].qty     += q
      byItem[it.id].revenue += q * it.price_per_unit
      byItem[it.id].hpp     += q * it.cost_price
      byItem[it.id].profit  += q * (it.price_per_unit - it.cost_price)
    }
    setRows(Object.values(byItem).sort((a, b) => b.profit - a.profit))
    setLoading(false)
  }

  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0)
  const totalHPP     = rows.reduce((s, r) => s + r.hpp, 0)
  const totalProfit  = rows.reduce((s, r) => s + r.profit, 0)
  const margin       = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0
  const monthLabel   = MONTHS.find(m => m.value === month)?.label ?? ''

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Laporan Keuntungan Transfer"
        subtitle="Margin dari barang yang dikirim ke Gading Serpong"
      />

      {/* Month/year picker */}
      <div className="px-8 py-4" style={{ borderBottom: '1px solid #E8E8E6' }}>
        <div className="flex items-center gap-3">
          {[
            { label: 'Bulan', el: <select value={month} onChange={e => setMonth(e.target.value)} style={{ border: 'none', background: 'transparent', fontSize: 14, fontWeight: 600, color: '#0E0E0E', outline: 'none', cursor: 'pointer' }}>
                {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select> },
            { label: 'Tahun', el: <select value={year} onChange={e => setYear(e.target.value)} style={{ border: 'none', background: 'transparent', fontSize: 14, fontWeight: 600, color: '#0E0E0E', outline: 'none', cursor: 'pointer' }}>
                {['2025', '2026', '2027'].map(y => <option key={y}>{y}</option>)}
              </select> },
          ].map(({ label, el }) => (
            <div key={label} style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E6', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px' }}>
              <span style={{ color: '#6B6B6B', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
              {el}
            </div>
          ))}
        </div>
      </div>

      <div className="px-8 py-6">
        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Transfer Diterima', value: `${txCount} kali`, color: '#2563EB' },
            { label: 'Total Nilai Transfer', value: fmt(totalRevenue), color: '#D97706' },
            { label: 'Total HPP / Modal', value: fmt(totalHPP), color: '#DC2626' },
            { label: 'Est. Keuntungan', value: fmt(totalProfit), color: '#16A34A', sub: `margin ${margin.toFixed(1)}%` },
          ].map(card => (
            <div key={card.label} style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E6', borderLeft: `3px solid ${card.color}`, borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ color: '#6B6B6B', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{card.label}</div>
              <div style={{ color: card.color, fontSize: 22, fontFamily: "'Archivo Black', sans-serif" }}>{loading ? '...' : card.value}</div>
              {card.sub && <div style={{ color: '#ABABAB', fontSize: 11, marginTop: 4 }}>{card.sub}</div>}
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ color: '#6B6B6B', textAlign: 'center', padding: 60 }}>Memuat...</div>
        ) : rows.length === 0 ? (
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E6', borderRadius: 16, textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>
            <p style={{ color: '#0E0E0E', fontWeight: 600, fontSize: 14 }}>Belum ada transfer diterima di {monthLabel} {year}</p>
          </div>
        ) : (
          <>
            {/* Kontribusi keuntungan per item — progress bars */}
            {totalProfit > 0 && (
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E6', borderRadius: 16, padding: '20px 24px', marginBottom: 20 }}>
                <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 13, color: '#0E0E0E', marginBottom: 16 }}>
                  Kontribusi Keuntungan
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {rows.filter(r => r.cost_price > 0 && r.profit > 0).map((row, i) => {
                    const pct = (row.profit / totalProfit) * 100
                    return (
                      <div key={row.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 13, color: '#0E0E0E' }}>{row.name}</span>
                          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <span style={{ fontSize: 12, color: '#6B6B6B' }}>{pct.toFixed(1)}%</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#16A34A', minWidth: 90, textAlign: 'right' }}>{fmt(row.profit)}</span>
                          </div>
                        </div>
                        <div style={{ height: 8, backgroundColor: '#F0F0EE', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length], borderRadius: 4, transition: 'width 0.4s ease' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Full-width scrollable table */}
            <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E6', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ backgroundColor: '#F8F8F6', padding: '14px 20px', borderBottom: '1px solid #E8E8E6' }}>
                <span style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 13, color: '#0E0E0E' }}>Rekap per Produk — {monthLabel} {year}</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: 700 }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8F8F6', borderBottom: '1px solid #E8E8E6' }}>
                    {[['Produk', false], ['Qty', true], ['Harga/Unit', true], ['HPP/Unit', true], ['Total Nilai', true], ['Total HPP', true], ['Keuntungan', true], ['Margin', true]].map(([h, right]) => (
                      <th key={h as string} style={{ color: '#6B6B6B', whiteSpace: 'nowrap' }}
                        className={`px-4 py-2.5 text-xs font-medium uppercase tracking-wider ${right ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody style={{ backgroundColor: '#FFFFFF' }}>
                  {rows.map((row, i) => {
                    const rowMargin = row.revenue > 0 ? (row.profit / row.revenue) * 100 : 0
                    const hasCost   = row.cost_price > 0
                    return (
                      <tr key={row.id} style={{ borderBottom: '1px solid #F0F0EE' }} className="hover:bg-[#FAFAF9]">
                        <td className="px-4 py-3" style={{ whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: COLORS[i % COLORS.length], flexShrink: 0 }} />
                            <span style={{ color: '#0E0E0E', fontSize: 13 }}>{row.name}</span>
                            {!hasCost && <span style={{ fontSize: 10, color: '#D97706', backgroundColor: '#FEF9C3', border: '1px solid #FDE68A', borderRadius: 4, padding: '1px 5px' }}>HPP belum diisi</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right" style={{ color: '#6B6B6B', fontSize: 13, whiteSpace: 'nowrap' }}>{fmtNum(row.qty)} {row.unit}</td>
                        <td className="px-4 py-3 text-right" style={{ color: '#D97706', fontSize: 13, whiteSpace: 'nowrap' }}>{fmt(row.price_per_unit)}</td>
                        <td className="px-4 py-3 text-right" style={{ color: '#6B6B6B', fontSize: 13, whiteSpace: 'nowrap' }}>{hasCost ? fmt(row.cost_price) : '—'}</td>
                        <td className="px-4 py-3 text-right" style={{ color: '#0E0E0E', fontSize: 13, whiteSpace: 'nowrap' }}>{fmt(row.revenue)}</td>
                        <td className="px-4 py-3 text-right" style={{ color: '#DC2626', fontSize: 13, whiteSpace: 'nowrap' }}>{hasCost ? fmt(row.hpp) : '—'}</td>
                        <td className="px-4 py-3 text-right" style={{ whiteSpace: 'nowrap' }}>
                          <span style={{ color: hasCost ? '#16A34A' : '#ABABAB', fontWeight: hasCost ? 700 : 400, fontSize: 13 }}>
                            {hasCost ? fmt(row.profit) : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right" style={{ whiteSpace: 'nowrap' }}>
                          {hasCost && row.revenue > 0 ? (
                            <span style={{ backgroundColor: rowMargin >= 0 ? '#F0FDF4' : '#FEF2F2', color: rowMargin >= 0 ? '#16A34A' : '#DC2626', border: `1px solid ${rowMargin >= 0 ? '#BBF7D0' : '#FECACA'}`, borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
                              {rowMargin.toFixed(0)}%
                            </span>
                          ) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                  <tr style={{ backgroundColor: '#F8F8F6', borderTop: '2px solid #E8E8E6' }}>
                    <td className="px-4 py-3" style={{ fontWeight: 700, fontSize: 13, color: '#0E0E0E', whiteSpace: 'nowrap' }}>TOTAL</td>
                    <td />
                    <td colSpan={2} />
                    <td className="px-4 py-3 text-right" style={{ color: '#0E0E0E', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>{fmt(totalRevenue)}</td>
                    <td className="px-4 py-3 text-right" style={{ color: '#DC2626', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>{fmt(totalHPP)}</td>
                    <td className="px-4 py-3 text-right" style={{ color: '#16A34A', fontWeight: 700, fontSize: 14, fontFamily: "'Archivo Black', sans-serif", whiteSpace: 'nowrap' }}>{fmt(totalProfit)}</td>
                    <td className="px-4 py-3 text-right">
                      <span style={{ backgroundColor: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0', borderRadius: 999, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>
                        {margin.toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
