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

interface ProdLog {
  id: string
  quantity: number
  notes: string | null
  produced_at: string
  photo_url: string | null
  photo_url_2: string | null
  item: { id: string; name: string; unit: string; cost_price: number } | null
}

interface DistLog {
  id: string
  quantity: number
  target: string
  distributed_at: string
  item: { id: string; name: string; unit: string } | null
}

interface ItemSummary {
  id: string
  name: string
  unit: string
  costPrice: number
  totalProd: number
  totalBiaya: number
  toBSD: number
  toGading: number
  biayaBSD: number
  biayaGading: number
}

export default function RiwayatProduksi() {
  const now = new Date()
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'))
  const [year, setYear]   = useState(String(now.getFullYear()))
  const [prodLogs, setProdLogs] = useState<ProdLog[]>([])
  const [distLogs, setDistLogs] = useState<DistLog[]>([])
  const [tab, setTab] = useState<'produksi' | 'distribusi'>('produksi')
  const [loading, setLoading] = useState(false)

  // Cleanup state
  const [showCleanup, setShowCleanup]     = useState(false)
  const [cleanBefore, setCleanBefore]     = useState('')   // 'YYYY-MM' cutoff
  const [cleanPreview, setCleanPreview]   = useState<{ id: string; photo_url: string | null; photo_url_2: string | null }[] | null>(null)
  const [cleanLoading, setCleanLoading]   = useState(false)
  const [cleanDone, setCleanDone]         = useState('')

  useEffect(() => { load() }, [month, year])

  async function load() {
    setLoading(true)
    const from = `${year}-${month}-01`
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
    const to = `${year}-${month}-${String(lastDay).padStart(2, '0')}`

    const [pRes, dRes] = await Promise.all([
      supabase
        .from('production_logs')
        .select('id, quantity, notes, produced_at, photo_url, photo_url_2, item:item_id(id, name, unit, cost_price)')
        .gte('produced_at', from)
        .lte('produced_at', to)
        .order('produced_at', { ascending: false }),
      supabase
        .from('distribution_logs')
        .select('id, quantity, target, distributed_at, item:item_id(id, name, unit)')
        .gte('distributed_at', from)
        .lte('distributed_at', to)
        .order('distributed_at', { ascending: false }),
    ])

    setProdLogs((pRes.data ?? []) as unknown as ProdLog[])
    setDistLogs((dRes.data ?? []) as unknown as DistLog[])
    setLoading(false)
  }

  const monthLabel = MONTHS.find(m => m.value === month)?.label ?? ''

  // Build per-item summary
  const byItem: Record<string, ItemSummary> = {}

  for (const row of prodLogs) {
    if (!row.item) continue
    if (!byItem[row.item.id]) byItem[row.item.id] = { id: row.item.id, name: row.item.name, unit: row.item.unit, costPrice: row.item.cost_price ?? 0, totalProd: 0, totalBiaya: 0, toBSD: 0, toGading: 0, biayaBSD: 0, biayaGading: 0 }
    byItem[row.item.id].totalProd  += row.quantity
    byItem[row.item.id].totalBiaya += row.quantity * (row.item.cost_price ?? 0)
  }
  for (const row of distLogs) {
    if (!row.item) continue
    if (!byItem[row.item.id]) byItem[row.item.id] = { id: row.item.id, name: row.item.name, unit: row.item.unit, costPrice: 0, totalProd: 0, totalBiaya: 0, toBSD: 0, toGading: 0, biayaBSD: 0, biayaGading: 0 }
    const cp = byItem[row.item.id].costPrice
    if (row.target === 'BSD')    { byItem[row.item.id].toBSD    += row.quantity; byItem[row.item.id].biayaBSD    += row.quantity * cp }
    if (row.target === 'Gading') { byItem[row.item.id].toGading += row.quantity; byItem[row.item.id].biayaGading += row.quantity * cp }
  }

  const summaryItems = Object.values(byItem).sort((a, b) => b.totalBiaya - a.totalBiaya)

  const totalBiaya       = summaryItems.reduce((s, r) => s + r.totalBiaya, 0)
  const totalBiayaBSD    = summaryItems.reduce((s, r) => s + r.biayaBSD, 0)
  const totalBiayaGading = summaryItems.reduce((s, r) => s + r.biayaGading, 0)
  const totalBSD    = distLogs.filter(r => r.target === 'BSD').reduce((s, r) => s + r.quantity, 0)
  const totalGading = distLogs.filter(r => r.target === 'Gading').reduce((s, r) => s + r.quantity, 0)

  async function deleteEntry(table: 'production_logs' | 'distribution_logs', id: string) {
    if (!window.confirm('Hapus entri ini? Stok akan dikembalikan.')) return

    if (table === 'production_logs') {
      const row = prodLogs.find(r => r.id === id)
      if (row?.item) {
        const { data: cur } = await supabase.from('items').select('stock_produksi').eq('id', row.item.id).single()
        if (cur) await supabase.from('items').update({ stock_produksi: Math.max(0, (cur.stock_produksi ?? 0) - row.quantity) }).eq('id', row.item.id)
      }
    } else {
      const row = distLogs.find(r => r.id === id)
      if (row?.item) {
        const stockField = row.target === 'BSD' ? 'stock' : 'stock_gading'
        const { data: cur } = await supabase.from('items').select('stock_produksi, stock, stock_gading').eq('id', row.item.id).single()
        if (cur) await supabase.from('items').update({
          stock_produksi: (cur.stock_produksi ?? 0) + row.quantity,
          [stockField]: Math.max(0, ((cur as any)[stockField] ?? 0) - row.quantity),
        }).eq('id', row.item.id)
      }
    }

    await supabase.from(table).delete().eq('id', id)
    load()
  }

  async function previewCleanup() {
    if (!cleanBefore) return
    setCleanLoading(true); setCleanPreview(null); setCleanDone('')
    const cutoff = `${cleanBefore}-01`
    const { data } = await supabase
      .from('production_logs')
      .select('id, photo_url, photo_url_2')
      .lt('produced_at', cutoff)
      .or('photo_url.not.is.null,photo_url_2.not.is.null')
    setCleanPreview((data ?? []) as { id: string; photo_url: string | null; photo_url_2: string | null }[])
    setCleanLoading(false)
  }

  async function executeCleanup() {
    if (!cleanPreview || cleanPreview.length === 0) return
    setCleanLoading(true)
    try {
      // Collect storage paths from URLs
      const paths: string[] = []
      for (const row of cleanPreview) {
        for (const url of [row.photo_url, row.photo_url_2]) {
          if (!url) continue
          // Extract path after /invoice-photos/
          const match = url.match(/invoice-photos\/(.+)$/)
          if (match) paths.push(match[1])
        }
      }
      // Delete from storage in batches of 100
      for (let i = 0; i < paths.length; i += 100) {
        await supabase.storage.from('invoice-photos').remove(paths.slice(i, i + 100))
      }
      // Null out DB columns
      const ids = cleanPreview.map(r => r.id)
      await supabase.from('production_logs')
        .update({ photo_url: null, photo_url_2: null })
        .in('id', ids)
      setCleanDone(`${paths.length} foto dari ${cleanPreview.length} entri berhasil dihapus.`)
      setCleanPreview(null)
      load()
    } catch (e: any) {
      setCleanDone(`Error: ${e.message}`)
    }
    setCleanLoading(false)
  }

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Riwayat Produksi"
        subtitle="Log produksi, biaya modal, dan distribusi per bulan"
        action={
          <button onClick={() => { setShowCleanup(true); setCleanPreview(null); setCleanDone('') }}
            style={{ border: '1px solid #E8E8E6', backgroundColor: '#FFFFFF', color: '#6B6B6B', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            🗑 Hapus Foto Lama
          </button>
        }
      />

      {/* Cleanup Modal */}
      {showCleanup && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: 16, width: '100%', maxWidth: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #E8E8E6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 15, color: '#0E0E0E' }}>Hapus Foto Lama</div>
                <div style={{ fontSize: 12, color: '#6B6B6B', marginTop: 2 }}>Log tetap ada, hanya foto yang dihapus dari storage</div>
              </div>
              <button onClick={() => setShowCleanup(false)} style={{ background: '#F2F2F0', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16 }}>×</button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, color: '#6B6B6B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>
                  Hapus foto dari semua entri sebelum:
                </label>
                <input
                  type="month"
                  value={cleanBefore}
                  onChange={e => { setCleanBefore(e.target.value); setCleanPreview(null); setCleanDone('') }}
                  style={{ width: '100%', padding: '10px 12px', fontSize: 14, fontWeight: 600, border: '1px solid #E8E8E6', borderRadius: 10, outline: 'none', color: '#0E0E0E', backgroundColor: '#F8F8F6', boxSizing: 'border-box' }}
                />
                <div style={{ fontSize: 11, color: '#ABABAB', marginTop: 6 }}>
                  Contoh: pilih Juni 2026 → hapus semua foto sebelum Juni (Januari–Mei)
                </div>
              </div>

              {cleanDone && (
                <div style={{ padding: '10px 14px', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, fontSize: 13, color: '#16A34A', fontWeight: 600, marginBottom: 14 }}>
                  ✓ {cleanDone}
                </div>
              )}

              {cleanPreview !== null && (
                <div style={{ padding: '10px 14px', backgroundColor: cleanPreview.length > 0 ? '#FEF2F2' : '#F8F8F6', border: `1px solid ${cleanPreview.length > 0 ? '#FECACA' : '#E8E8E6'}`, borderRadius: 8, marginBottom: 14 }}>
                  {cleanPreview.length === 0
                    ? <span style={{ fontSize: 13, color: '#6B6B6B' }}>Tidak ada foto untuk dihapus di periode ini.</span>
                    : <span style={{ fontSize: 13, color: '#DC2626', fontWeight: 600 }}>
                        Ditemukan {cleanPreview.length} entri dengan foto — akan menghapus permanen dari storage.
                      </span>
                  }
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setShowCleanup(false)}
                  style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid #E8E8E6', backgroundColor: '#FFFFFF', color: '#6B6B6B', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  Batal
                </button>
                {cleanPreview === null || cleanPreview.length === 0 ? (
                  <button onClick={previewCleanup} disabled={!cleanBefore || cleanLoading}
                    style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', backgroundColor: !cleanBefore || cleanLoading ? '#ABABAB' : '#0E0E0E', color: '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: !cleanBefore || cleanLoading ? 'not-allowed' : 'pointer' }}>
                    {cleanLoading ? 'Mengecek...' : 'Cek Foto'}
                  </button>
                ) : (
                  <button onClick={executeCleanup} disabled={cleanLoading}
                    style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', backgroundColor: cleanLoading ? '#ABABAB' : '#DC2626', color: '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: cleanLoading ? 'not-allowed' : 'pointer' }}>
                    {cleanLoading ? 'Menghapus...' : `Hapus ${cleanPreview.length} Entri`}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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
            { label: 'Total Biaya Produksi', value: fmt(totalBiaya),       color: '#7C3AED', sub: `${prodLogs.length} entri produksi` },
            { label: 'Biaya ke BSD',         value: fmt(totalBiayaBSD),    color: '#2563EB', sub: `${fmtNum(totalBSD)} unit dikirim` },
            { label: 'Biaya ke Gading',      value: fmt(totalBiayaGading), color: '#16A34A', sub: `${fmtNum(totalGading)} unit dikirim` },
            { label: 'Sisa di Gudang',       value: fmt(totalBiaya - totalBiayaBSD - totalBiayaGading), color: '#D97706', sub: 'estimasi stok produksi' },
          ].map(card => (
            <div key={card.label} style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E6', borderLeft: `3px solid ${card.color}`, borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ color: '#6B6B6B', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{card.label}</div>
              <div style={{ color: card.color, fontSize: 20, fontFamily: "'Archivo Black', sans-serif" }}>{loading ? '...' : card.value}</div>
              {card.sub && <div style={{ color: '#ABABAB', fontSize: 11, marginTop: 4 }}>{card.sub}</div>}
            </div>
          ))}
        </div>

        {/* Per-item rekap table */}
        {!loading && summaryItems.length > 0 && (
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E6', borderRadius: 16, overflow: 'hidden', marginBottom: 20 }}>
            <div style={{ backgroundColor: '#F8F8F6', padding: '14px 20px', borderBottom: '1px solid #E8E8E6' }}>
              <span style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 13, color: '#0E0E0E' }}>Rekap per Produk — {monthLabel} {year}</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: 700 }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8F8F6', borderBottom: '1px solid #E8E8E6' }}>
                    {[['Produk', false], ['Diproduksi', true], ['HPP/Unit', true], ['Ke BSD', true], ['Biaya BSD', true], ['Ke Gading', true], ['Biaya Gading', true], ['Sisa', true]].map(([h, right]) => (
                      <th key={h as string} style={{ color: '#6B6B6B', whiteSpace: 'nowrap' }}
                        className={`px-4 py-2.5 text-xs font-medium uppercase tracking-wider ${right ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {summaryItems.map(item => {
                    const sisa = item.totalProd - item.toBSD - item.toGading
                    const hasCost = item.costPrice > 0
                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid #F0F0EE' }} className="hover:bg-[#FAFAF9]">
                        <td className="px-4 py-3" style={{ color: '#0E0E0E', fontSize: 13, whiteSpace: 'nowrap' }}>{item.name}</td>
                        <td className="px-4 py-3 text-right" style={{ color: '#7C3AED', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {fmtNum(item.totalProd)} {item.unit}
                        </td>
                        <td className="px-4 py-3 text-right" style={{ whiteSpace: 'nowrap' }}>
                          {hasCost
                            ? <span style={{ color: '#6B6B6B', fontSize: 13 }}>{fmt(item.costPrice)}</span>
                            : <span style={{ fontSize: 10, color: '#D97706', backgroundColor: '#FEF9C3', border: '1px solid #FDE68A', borderRadius: 4, padding: '1px 5px' }}>HPP belum diisi</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-right" style={{ whiteSpace: 'nowrap' }}>
                          {item.toBSD > 0
                            ? <span style={{ color: '#2563EB', fontSize: 13, fontWeight: 600 }}>{fmtNum(item.toBSD)} {item.unit}</span>
                            : <span style={{ color: '#ABABAB', fontSize: 13 }}>—</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-right" style={{ whiteSpace: 'nowrap' }}>
                          {hasCost && item.biayaBSD > 0
                            ? <span style={{ color: '#2563EB', fontSize: 13, fontWeight: 700 }}>{fmt(item.biayaBSD)}</span>
                            : <span style={{ color: '#ABABAB', fontSize: 13 }}>—</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-right" style={{ whiteSpace: 'nowrap' }}>
                          {item.toGading > 0
                            ? <span style={{ color: '#16A34A', fontSize: 13, fontWeight: 600 }}>{fmtNum(item.toGading)} {item.unit}</span>
                            : <span style={{ color: '#ABABAB', fontSize: 13 }}>—</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-right" style={{ whiteSpace: 'nowrap' }}>
                          {hasCost && item.biayaGading > 0
                            ? <span style={{ color: '#16A34A', fontSize: 13, fontWeight: 700 }}>{fmt(item.biayaGading)}</span>
                            : <span style={{ color: '#ABABAB', fontSize: 13 }}>—</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-right" style={{ whiteSpace: 'nowrap' }}>
                          <span style={{ color: sisa > 0 ? '#D97706' : '#ABABAB', fontSize: 13, fontWeight: sisa > 0 ? 600 : 400 }}>
                            {fmtNum(Math.max(0, sisa))} {item.unit}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                  {/* Total row */}
                  <tr style={{ backgroundColor: '#F8F8F6', borderTop: '2px solid #E8E8E6' }}>
                    <td className="px-4 py-3" style={{ fontWeight: 700, fontSize: 13, color: '#0E0E0E', whiteSpace: 'nowrap' }}>TOTAL</td>
                    <td />
                    <td />
                    <td className="px-4 py-3 text-right" style={{ color: '#2563EB', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>{fmtNum(totalBSD)} unit</td>
                    <td className="px-4 py-3 text-right" style={{ color: '#2563EB', fontWeight: 700, fontSize: 13, fontFamily: "'Archivo Black', sans-serif", whiteSpace: 'nowrap' }}>{fmt(totalBiayaBSD)}</td>
                    <td className="px-4 py-3 text-right" style={{ color: '#16A34A', fontWeight: 700, fontSize: 13, whiteSpace: 'nowrap' }}>{fmtNum(totalGading)} unit</td>
                    <td className="px-4 py-3 text-right" style={{ color: '#16A34A', fontWeight: 700, fontSize: 13, fontFamily: "'Archivo Black', sans-serif", whiteSpace: 'nowrap' }}>{fmt(totalBiayaGading)}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Log detail tabs */}
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E6', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #E8E8E6' }}>
            {([['produksi', 'Log Produksi', '#7C3AED'], ['distribusi', 'Log Distribusi', '#2563EB']] as const).map(([key, label, color]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  flex: 1, padding: '12px 0', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                  backgroundColor: tab === key ? '#FFFFFF' : '#F8F8F6',
                  color: tab === key ? color : '#6B6B6B',
                  borderBottom: tab === key ? `2px solid ${color}` : '2px solid transparent',
                }}
              >{label}</button>
            ))}
          </div>

          {loading ? (
            <div style={{ padding: 60, textAlign: 'center', color: '#6B6B6B' }}>Memuat...</div>
          ) : tab === 'produksi' ? (
            prodLogs.length === 0 ? (
              <div style={{ padding: '60px 0', textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🏭</div>
                <p style={{ color: '#0E0E0E', fontWeight: 600, fontSize: 14 }}>Belum ada produksi di {monthLabel} {year}</p>
              </div>
            ) : (
              <table style={{ width: '100%' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8F8F6', borderBottom: '1px solid #E8E8E6' }}>
                    {[['Tanggal', false], ['Produk', false], ['Jumlah', true], ['Biaya', true], ['Catatan', false], ['Invoice', false], ['', false]].map(([h, right]) => (
                      <th key={h as string} style={{ color: '#6B6B6B' }}
                        className={`px-4 py-2.5 text-xs font-medium uppercase tracking-wider ${right ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {prodLogs.map(row => {
                    const biaya = row.quantity * (row.item?.cost_price ?? 0)
                    return (
                      <tr key={row.id} style={{ borderBottom: '1px solid #F0F0EE' }} className="hover:bg-[#FAFAF9]">
                        <td className="px-4 py-3" style={{ color: '#6B6B6B', fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDate(row.produced_at)}</td>
                        <td className="px-4 py-3" style={{ color: '#0E0E0E', fontSize: 13 }}>{row.item?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-right" style={{ color: '#7C3AED', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>{fmtNum(row.quantity)} {row.item?.unit}</td>
                        <td className="px-4 py-3 text-right" style={{ whiteSpace: 'nowrap' }}>
                          {biaya > 0
                            ? <span style={{ color: '#7C3AED', fontSize: 12, fontWeight: 600 }}>{fmt(biaya)}</span>
                            : <span style={{ color: '#ABABAB', fontSize: 12 }}>—</span>
                          }
                        </td>
                        <td className="px-4 py-3" style={{ color: '#6B6B6B', fontSize: 12 }}>{row.notes ?? '—'}</td>
                        <td className="px-4 py-3">
                          <div style={{ display: 'flex', gap: 4 }}>
                            {[row.photo_url, row.photo_url_2].map((url, i) =>
                              url
                                ? <a key={i} href={url} target="_blank" rel="noreferrer">
                                    <img src={url} alt={`invoice ${i + 1}`}
                                      style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6, border: '1px solid #E8E8E6', cursor: 'pointer', display: 'block' }} />
                                  </a>
                                : null
                            )}
                            {!row.photo_url && !row.photo_url_2 && <span style={{ color: '#ABABAB', fontSize: 12 }}>—</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => deleteEntry('production_logs', row.id)}
                            style={{ background: 'none', border: '1px solid #FECACA', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', color: '#DC2626', fontSize: 14, lineHeight: 1 }}>
                            ×
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )
          ) : (
            distLogs.length === 0 ? (
              <div style={{ padding: '60px 0', textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>
                <p style={{ color: '#0E0E0E', fontWeight: 600, fontSize: 14 }}>Belum ada distribusi di {monthLabel} {year}</p>
              </div>
            ) : (
              <table style={{ width: '100%' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8F8F6', borderBottom: '1px solid #E8E8E6' }}>
                    {[['Tanggal', false], ['Produk', false], ['Tujuan', false], ['Jumlah', true], ['', false]].map(([h, right]) => (
                      <th key={h as string} style={{ color: '#6B6B6B' }}
                        className={`px-4 py-2.5 text-xs font-medium uppercase tracking-wider ${right ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {distLogs.map(row => (
                    <tr key={row.id} style={{ borderBottom: '1px solid #F0F0EE' }} className="hover:bg-[#FAFAF9]">
                      <td className="px-4 py-3" style={{ color: '#6B6B6B', fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDate(row.distributed_at)}</td>
                      <td className="px-4 py-3" style={{ color: '#0E0E0E', fontSize: 13 }}>{row.item?.name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 999, padding: '2px 8px', backgroundColor: row.target === 'BSD' ? '#EFF6FF' : '#F0FDF4', color: row.target === 'BSD' ? '#2563EB' : '#16A34A', border: `1px solid ${row.target === 'BSD' ? '#BFDBFE' : '#BBF7D0'}` }}>
                          {row.target}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right" style={{ color: row.target === 'BSD' ? '#2563EB' : '#16A34A', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>{fmtNum(row.quantity)} {row.item?.unit}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => deleteEntry('distribution_logs', row.id)}
                          style={{ background: 'none', border: '1px solid #FECACA', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', color: '#DC2626', fontSize: 14, lineHeight: 1 }}>
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
      </div>
    </div>
  )
}
