import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import PageHeader from '../components/PageHeader'
import { Upload, Settings, History, AlertTriangle, CheckCircle, X, Edit2, Check } from 'lucide-react'
import * as XLSX from 'xlsx'

function fmt(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}
function fmtPct(n: number) { return (n * 100).toFixed(1) + '%' }

// ── Types ──────────────────────────────────────────────────────────────────────
interface ChannelSetting { id: string; channel: string; commission_rate: number; notes: string }
interface MenuCog { id?: string; kasir_name: string; cogs_per_unit: number; include_in_report: boolean; category: string; notes: string }

interface DailySummary {
  date: string
  branch: string
  channel: string
  gross: number
  commission: number
  nett: number
}
interface MenuSaleSummary {
  kasir_name: string
  qty: number
  gross: number
  branch: string
  channel: string
  date: string
}
interface ImportPreview {
  batch: string
  branch_dates: Record<string, string[]>  // branch -> dates
  daily: DailySummary[]
  menu_sales: MenuSaleSummary[]
  total_gross: number
  total_nett: number
  new_menus: string[]   // menus not yet in menu_cogs
}

// ── Parse Excel ────────────────────────────────────────────────────────────────
function parseXlsx(file: File, channelSettings: ChannelSetting[]): Promise<ImportPreview> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data  = new Uint8Array(e.target!.result as ArrayBuffer)
        const wb    = XLSX.read(data, { type: 'array' }) // no cellDates — dates come as serial numbers, handled in toDateStr
        const ws    = wb.Sheets[wb.SheetNames[0]]
        // raw: true → angka tetap number, bukan string formatted (fix: "54,000" → 54000)
        const rows  = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, raw: true })

        // Find header row (row with 'Sales Number')
        const headerIdx = rows.findIndex(r => r[0] === 'Sales Number')
        if (headerIdx === -1) throw new Error('Format tidak dikenal — tidak ada kolom Sales Number')

        const dataRows = rows.slice(headerIdx + 1)

        // Column map (0-indexed from header)
        const COL = {
          branch:  9,
          date:    6,
          channel: 13,  // Visit Purpose: GRABFOOD INT / GOFOOD INT / Take Away / Dine In
          menu:    27,
          qty:     32,
          price:   33,
          total:   40,  // Nett Sales (after tax/service charge), not Total (col 39)
        }

        // Normalise Visit Purpose → GRAB / GOFOOD / POS
        function normChannel(raw: string): string {
          if (!raw) return 'POS'
          const u = raw.toUpperCase()
          if (u.includes('GRABFOOD') || u.includes('GRAB')) return 'GRAB'
          if (u.includes('GOFOOD') || u.includes('GO-FOOD') || u.includes('GO FOOD')) return 'GOFOOD'
          // Take Away, Dine In, dll → POS
          return 'POS'
        }

        // Normalise branch → BSD / Serpong
        function normBranch(raw: string): string {
          if (!raw) return 'BSD'
          if (raw.toLowerCase().includes('serpong')) return 'Serpong'
          return 'BSD'
        }

        // Commission lookup — branch-specific first, then fallback to generic
        function getRate(channel: string, branch: string): number {
          const specific = channelSettings.find(c => c.channel === channel && (c as any).branch === branch)
          if (specific) return specific.commission_rate
          const generic = channelSettings.find(c => c.channel === channel && (!(c as any).branch || (c as any).branch === 'BSD'))
          return generic ? generic.commission_rate : 0
        }

        // Build daily + menu aggregates
        const dailyMap: Record<string, DailySummary>     = {}
        const menuMap:  Record<string, MenuSaleSummary>  = {}

        // Convert Excel date serial to YYYY-MM-DD.
        // Standard formula: days since Unix epoch = serial - 25569
        // No timezone offset needed — serial represents a calendar date, not a timestamp.
        function toDateStr(val: any): string {
          if (!val) return ''
          if (typeof val === 'number') {
            return new Date(Math.round((val - 25569) * 86400 * 1000)).toISOString().slice(0, 10)
          }
          if (val instanceof Date) {
            return val.toISOString().slice(0, 10)
          }
          if (typeof val === 'string') return val.slice(0, 10)
          return ''
        }

        for (const row of dataRows) {
          const total = Number(row[COL.total]) || 0
          const qty   = Number(row[COL.qty]) || 0
          if (qty <= 0) continue  // skip truly empty rows

          const date = toDateStr(row[COL.date])
          if (!date) continue

          const branch  = normBranch(String(row[COL.branch] ?? ''))
          const channel = normChannel(String(row[COL.channel] ?? ''))
          const menu    = String(row[COL.menu] ?? '').trim()
          const rate    = getRate(channel, branch)
          const commission = total * rate

          // Daily
          const dk = `${date}|${branch}|${channel}`
          if (!dailyMap[dk]) dailyMap[dk] = { date, branch, channel, gross: 0, commission: 0, nett: 0 }
          dailyMap[dk].gross      += total
          dailyMap[dk].commission += commission
          dailyMap[dk].nett       += (total - commission)

          // Menu
          const mk = `${date}|${branch}|${channel}|${menu}`
          if (!menuMap[mk]) menuMap[mk] = { kasir_name: menu, qty: 0, gross: 0, branch, channel, date }
          menuMap[mk].qty   += qty
          menuMap[mk].gross += total
        }

        const daily      = Object.values(dailyMap)
        const menu_sales = Object.values(menuMap)
        const total_gross = daily.reduce((s, d) => s + d.gross, 0)
        const total_nett  = daily.reduce((s, d) => s + d.nett, 0)

        // branch_dates summary
        const branch_dates: Record<string, string[]> = {}
        for (const d of daily) {
          if (!branch_dates[d.branch]) branch_dates[d.branch] = []
          if (!branch_dates[d.branch].includes(d.date)) branch_dates[d.branch].push(d.date)
        }

        const batch = `${file.name}|${Date.now()}`

        resolve({ batch, branch_dates, daily, menu_sales, total_gross, total_nett, new_menus: [] })
      } catch (err: any) {
        reject(new Error(err.message || 'Gagal parse file'))
      }
    }
    reader.onerror = () => reject(new Error('Gagal membaca file'))
    reader.readAsArrayBuffer(file)
  })
}

// ── Tab: Import ────────────────────────────────────────────────────────────────
function ImportTab({ channelSettings, menuCogs, onImported }: {
  channelSettings: ChannelSetting[]
  menuCogs: MenuCog[]
  onImported: () => void
}) {
  const fileRef               = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [parsing, setParsing] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  const [done,    setDone]    = useState(false)

  async function handleFile(file: File) {
    setParsing(true); setError(''); setPreview(null); setDone(false)
    try {
      const prev = await parseXlsx(file, channelSettings)
      // Check which menus are new (not in menu_cogs)
      const known = new Set(menuCogs.map(m => m.kasir_name))
      prev.new_menus = [...new Set(prev.menu_sales.map(m => m.kasir_name))].filter(n => !known.has(n))
      setPreview(prev)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setParsing(false)
    }
  }

  async function handleConfirmImport() {
    if (!preview) return
    setSaving(true); setError('')
    try {
      // Insert new menu_cogs entries for unknown menus (cogs=0, include=true)
      if (preview.new_menus.length > 0) {
        await supabase.from('menu_cogs').insert(
          preview.new_menus.map(n => ({ kasir_name: n, cogs_per_unit: 0, include_in_report: true, category: '', notes: '' }))
        )
      }

      // Insert imported_sales (daily channel totals)
      const salesRows = preview.daily.map(d => ({
        import_batch:      preview.batch,
        date:              d.date,
        branch:            d.branch,
        channel:           d.channel,
        gross_amount:      Math.round(d.gross),
        commission_amount: Math.round(d.commission),
        nett_amount:       Math.round(d.nett),
      }))
      const { error: e1 } = await supabase.from('imported_sales').insert(salesRows)
      if (e1) throw e1

      // Insert imported_menu_sales
      const menuRows = preview.menu_sales.map(m => ({
        import_batch: preview.batch,
        date:         m.date,
        branch:       m.branch,
        channel:      m.channel,
        kasir_name:   m.kasir_name,
        qty:          m.qty,
        gross_amount: Math.round(m.gross),
      }))
      const { error: e2 } = await supabase.from('imported_menu_sales').insert(menuRows)
      if (e2) throw e2

      setDone(true)
      onImported()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const bsdDays  = preview?.branch_dates['BSD']?.length ?? 0
  const srpDays  = preview?.branch_dates['Serpong']?.length ?? 0

  return (
    <div className="space-y-5">
      {/* Upload area */}
      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        style={{ border: '2px dashed #E8E8E6', borderRadius: 16, cursor: 'pointer', backgroundColor: '#FAFAF9' }}
        className="flex flex-col items-center justify-center py-12 gap-3 hover:border-[#D91C1C] transition-colors"
      >
        <Upload size={28} style={{ color: '#ABABAB' }} />
        <div className="text-center">
          <p style={{ color: '#0E0E0E', fontWeight: 600, fontSize: 14 }}>Upload file .xlsx dari kasir</p>
          <p style={{ color: '#ABABAB', fontSize: 12, marginTop: 4 }}>Sales Recapitulation Detail Report</p>
        </div>
        <input ref={fileRef} type="file" accept=".xlsx" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
      </div>

      {parsing && <div style={{ color: '#6B6B6B', textAlign: 'center', fontSize: 13 }}>Membaca file...</div>}
      {error   && <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '12px 16px', color: '#DC2626', fontSize: 13 }}>{error}</div>}

      {done && (
        <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 12, padding: '14px 18px', display: 'flex', gap: 10, alignItems: 'center' }}>
          <CheckCircle size={18} style={{ color: '#16A34A', flexShrink: 0 }} />
          <div>
            <p style={{ color: '#16A34A', fontWeight: 600, fontSize: 14 }}>Import berhasil!</p>
            <p style={{ color: '#4ADE80', fontSize: 12, marginTop: 2 }}>Data sudah masuk ke Financial. Cek halaman Settings untuk isi COGS menu baru.</p>
          </div>
        </div>
      )}

      {preview && !done && (
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E6', borderRadius: 16, overflow: 'hidden' }}>
          {/* Preview header */}
          <div style={{ backgroundColor: '#F8F8F6', borderBottom: '1px solid #E8E8E6', padding: '14px 20px' }}>
            <p style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 14, color: '#0E0E0E' }}>Preview Import</p>
            <div style={{ display: 'flex', gap: 16, marginTop: 6, flexWrap: 'wrap' }}>
              {bsdDays > 0 && <span style={{ fontSize: 12, color: '#6B6B6B' }}>BSD: {bsdDays} hari</span>}
              {srpDays > 0 && <span style={{ fontSize: 12, color: '#6B6B6B' }}>Serpong: {srpDays} hari</span>}
              <span style={{ fontSize: 12, color: '#6B6B6B' }}>{[...new Set(preview.menu_sales.map(m => m.kasir_name))].length} menu unik</span>
            </div>
          </div>

          {/* Revenue summary */}
          <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {[
              { label: 'Gross Revenue', value: preview.total_gross, color: '#6B7280' },
              { label: 'Total Komisi', value: preview.total_gross - preview.total_nett, color: '#DC2626' },
              { label: 'Nett Revenue', value: preview.total_nett, color: '#16A34A' },
            ].map(c => (
              <div key={c.label} style={{ backgroundColor: '#F8F8F6', borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, color: '#ABABAB', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{c.label}</div>
                <div style={{ fontSize: 18, color: c.color, fontFamily: "'Archivo Black', sans-serif", marginTop: 3 }}>{fmt(c.value)}</div>
              </div>
            ))}
          </div>

          {/* Channel breakdown */}
          <div style={{ padding: '0 20px 16px' }}>
            <div style={{ fontSize: 11, color: '#ABABAB', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Per Channel</div>
            {['GRAB', 'GOFOOD', 'POS'].map(ch => {
              const rows = preview.daily.filter(d => d.channel === ch)
              if (rows.length === 0) return null
              const gross = rows.reduce((s, r) => s + r.gross, 0)
              const nett  = rows.reduce((s, r) => s + r.nett, 0)
              const rate  = channelSettings.find(c => c.channel === ch)?.commission_rate ?? 0
              return (
                <div key={ch} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #F0F0EE' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#0E0E0E' }}>{ch}</span>
                    <span style={{ fontSize: 11, color: '#ABABAB', backgroundColor: '#F2F2F0', padding: '2px 6px', borderRadius: 4 }}>komisi {fmtPct(rate)}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#16A34A' }}>{fmt(nett)} nett</div>
                    <div style={{ fontSize: 11, color: '#ABABAB' }}>gross {fmt(gross)}</div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* New menus warning */}
          {preview.new_menus.length > 0 && (
            <div style={{ margin: '0 20px 16px', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <AlertTriangle size={15} style={{ color: '#D97706', flexShrink: 0, marginTop: 1 }} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#92400E' }}>{preview.new_menus.length} menu baru ditemukan</p>
                  <p style={{ fontSize: 12, color: '#B45309', marginTop: 2 }}>COGS-nya belum diisi. Setelah import, isi di tab Settings → Menu COGS.</p>
                  <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {preview.new_menus.slice(0, 10).map(n => (
                      <span key={n} style={{ fontSize: 11, backgroundColor: '#FEF3C7', color: '#92400E', padding: '2px 6px', borderRadius: 4 }}>{n}</span>
                    ))}
                    {preview.new_menus.length > 10 && <span style={{ fontSize: 11, color: '#B45309' }}>+{preview.new_menus.length - 10} lainnya</span>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Confirm button */}
          <div style={{ padding: '14px 20px', borderTop: '1px solid #E8E8E6', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setPreview(null)} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid #E8E8E6', color: '#6B6B6B', fontSize: 13, cursor: 'pointer', backgroundColor: '#FFFFFF' }}>Batal</button>
            <button onClick={handleConfirmImport} disabled={saving}
              style={{ padding: '10px 24px', borderRadius: 10, border: 'none', backgroundColor: saving ? '#ABABAB' : '#D91C1C', color: '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: "'Archivo Black', sans-serif" }}>
              {saving ? 'Menyimpan...' : '✓ Konfirmasi Import'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tab: Settings ──────────────────────────────────────────────────────────────
function SettingsTab({ channelSettings, menuCogs, onRefresh }: {
  channelSettings: ChannelSetting[]
  menuCogs: MenuCog[]
  onRefresh: () => void
}) {
  const [editingCh,  setEditingCh]  = useState<string | null>(null) // stores id
  const [chRate,     setChRate]     = useState('')
  const [savingCh,   setSavingCh]   = useState(false)
  const [menuFilter, setMenuFilter] = useState<'all' | 'zero' | 'excluded'>('all')
  const [editingMenu, setEditingMenu] = useState<string | null>(null)
  const [menuEdit,    setMenuEdit]    = useState<Partial<MenuCog>>({})
  const [savingMenu,  setSavingMenu]  = useState(false)

  async function saveChannel(id: string) {
    setSavingCh(true)
    const rate = parseFloat(chRate) / 100
    await supabase.from('channel_settings').update({ commission_rate: rate }).eq('id', id)
    setSavingCh(false); setEditingCh(null); onRefresh()
  }

  async function saveMenu(kasirName: string) {
    setSavingMenu(true)
    const existing = menuCogs.find(m => m.kasir_name === kasirName)
    if (existing?.id) {
      await supabase.from('menu_cogs').update(menuEdit).eq('id', existing.id)
    } else {
      await supabase.from('menu_cogs').insert({ kasir_name: kasirName, ...menuEdit })
    }
    setSavingMenu(false); setEditingMenu(null); onRefresh()
  }

  const filtered = menuCogs.filter(m => {
    if (menuFilter === 'zero')     return m.cogs_per_unit === 0
    if (menuFilter === 'excluded') return !m.include_in_report
    return true
  })

  const zeroCogs = menuCogs.filter(m => m.cogs_per_unit === 0 && m.include_in_report).length

  return (
    <div className="space-y-6">
      {/* Commission rates */}
      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E6', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ backgroundColor: '#F8F8F6', borderBottom: '1px solid #E8E8E6', padding: '14px 20px' }}>
          <p style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 14, color: '#0E0E0E' }}>Komisi Platform</p>
          <p style={{ fontSize: 12, color: '#ABABAB', marginTop: 2 }}>Digunakan saat import data kasir untuk menghitung nett revenue</p>
        </div>
        <div style={{ padding: '8px 0' }}>
          {(['BSD', 'Serpong'] as const).map(br => {
            const branchChs = channelSettings.filter(c => (c as any).branch === br || (!('branch' in c) && br === 'BSD'))
            if (branchChs.length === 0) return null
            return (
              <div key={br}>
                <div style={{ padding: '6px 20px 2px', fontSize: 10, fontWeight: 700, color: '#ABABAB', textTransform: 'uppercase', letterSpacing: '0.08em', backgroundColor: '#FAFAF9' }}>
                  {br}
                </div>
                {branchChs.map(ch => (
                  <div key={ch.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderBottom: '1px solid #F8F8F6' }}>
                    <div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#0E0E0E' }}>{ch.channel}</span>
                      <span style={{ fontSize: 12, color: '#ABABAB', marginLeft: 8 }}>{ch.notes}</span>
                    </div>
                    {editingCh === ch.id ? (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input type="number" value={chRate} onChange={e => setChRate(e.target.value)} step="0.1" min="0" max="100"
                          style={{ width: 70, padding: '6px 10px', fontSize: 13, border: '1px solid #E8E8E6', borderRadius: 8, outline: 'none', textAlign: 'right' }} />
                        <span style={{ fontSize: 12, color: '#6B6B6B' }}>%</span>
                        <button onClick={() => saveChannel(ch.id)} disabled={savingCh}
                          style={{ padding: '6px 14px', backgroundColor: '#16A34A', color: '#FFFFFF', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                          {savingCh ? '...' : '✓'}
                        </button>
                        <button onClick={() => setEditingCh(null)} style={{ padding: '6px', border: '1px solid #E8E8E6', borderRadius: 8, backgroundColor: '#FFFFFF', cursor: 'pointer', color: '#6B6B6B' }}><X size={12} /></button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <span style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18, color: '#D91C1C' }}>{fmtPct(ch.commission_rate)}</span>
                        <button onClick={() => { setEditingCh(ch.id); setChRate((ch.commission_rate * 100).toFixed(1)) }}
                          style={{ padding: '5px 10px', border: '1px solid #E8E8E6', borderRadius: 8, backgroundColor: '#F8F8F6', cursor: 'pointer', color: '#6B6B6B', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Edit2 size={12} /> <span style={{ fontSize: 12 }}>Edit</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>

      {/* Menu COGS */}
      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E6', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ backgroundColor: '#F8F8F6', borderBottom: '1px solid #E8E8E6', padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 14, color: '#0E0E0E' }}>Menu COGS</p>
            <p style={{ fontSize: 12, color: '#ABABAB', marginTop: 2 }}>
              {menuCogs.length} menu terdaftar
              {zeroCogs > 0 && <span style={{ color: '#D97706', marginLeft: 6 }}>· {zeroCogs} belum diisi COGS</span>}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['all', 'zero', 'excluded'] as const).map(f => (
              <button key={f} onClick={() => setMenuFilter(f)}
                style={{ padding: '5px 10px', fontSize: 11, fontWeight: 600, borderRadius: 8, cursor: 'pointer', border: `1px solid ${menuFilter === f ? '#D91C1C' : '#E8E8E6'}`, backgroundColor: menuFilter === f ? '#FEF2F2' : '#FFFFFF', color: menuFilter === f ? '#D91C1C' : '#6B6B6B' }}>
                {f === 'all' ? 'Semua' : f === 'zero' ? 'Belum diisi' : 'Dikecualikan'}
              </button>
            ))}
          </div>
        </div>
        <div style={{ maxHeight: 480, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0 }}>
              <tr style={{ backgroundColor: '#F8F8F6', borderBottom: '1px solid #E8E8E6' }}>
                {['Menu (dari kasir)', 'COGS/unit (Rp)', 'Include', 'Kategori', ''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', fontSize: 11, fontWeight: 700, color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.kasir_name} style={{ borderBottom: '1px solid #F8F8F6', backgroundColor: !m.include_in_report ? '#FAFAF9' : '#FFFFFF' }}>
                  {editingMenu === m.kasir_name ? (
                    <>
                      <td style={{ padding: '8px 16px', fontSize: 12, color: '#0E0E0E', fontWeight: 500 }}>{m.kasir_name}</td>
                      <td style={{ padding: '8px 16px' }}>
                        <input type="number" value={menuEdit.cogs_per_unit ?? m.cogs_per_unit} min="0"
                          onChange={e => setMenuEdit(p => ({ ...p, cogs_per_unit: parseFloat(e.target.value) || 0 }))}
                          onFocus={e => e.target.select()}
                          style={{ width: 100, padding: '5px 8px', fontSize: 13, border: '1px solid #E8E8E6', borderRadius: 8, outline: 'none' }} />
                      </td>
                      <td style={{ padding: '8px 16px' }}>
                        <input type="checkbox" checked={menuEdit.include_in_report ?? m.include_in_report}
                          onChange={e => setMenuEdit(p => ({ ...p, include_in_report: e.target.checked }))} />
                      </td>
                      <td style={{ padding: '8px 16px' }}>
                        <input value={menuEdit.category ?? m.category} onChange={e => setMenuEdit(p => ({ ...p, category: e.target.value }))}
                          placeholder="makanan/minuman/dll"
                          style={{ width: 120, padding: '5px 8px', fontSize: 12, border: '1px solid #E8E8E6', borderRadius: 8, outline: 'none' }} />
                      </td>
                      <td style={{ padding: '8px 16px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => saveMenu(m.kasir_name)} disabled={savingMenu}
                            style={{ padding: '5px 10px', backgroundColor: '#16A34A', color: '#FFFFFF', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>
                            <Check size={12} />
                          </button>
                          <button onClick={() => setEditingMenu(null)}
                            style={{ padding: '5px 10px', border: '1px solid #E8E8E6', borderRadius: 8, backgroundColor: '#FFFFFF', cursor: 'pointer', color: '#6B6B6B' }}>
                            <X size={12} />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ padding: '8px 16px', fontSize: 12, color: '#0E0E0E', fontWeight: 500, opacity: m.include_in_report ? 1 : 0.4 }}>{m.kasir_name}</td>
                      <td style={{ padding: '8px 16px' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: m.cogs_per_unit === 0 ? '#D97706' : '#0E0E0E' }}>
                          {m.cogs_per_unit === 0 ? '—' : fmt(m.cogs_per_unit)}
                        </span>
                      </td>
                      <td style={{ padding: '8px 16px' }}>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600,
                          backgroundColor: m.include_in_report ? '#F0FDF4' : '#F2F2F0',
                          color: m.include_in_report ? '#16A34A' : '#ABABAB' }}>
                          {m.include_in_report ? 'Ya' : 'Skip'}
                        </span>
                      </td>
                      <td style={{ padding: '8px 16px', fontSize: 12, color: '#6B6B6B' }}>{m.category || '—'}</td>
                      <td style={{ padding: '8px 16px' }}>
                        <button onClick={() => { setEditingMenu(m.kasir_name); setMenuEdit({ cogs_per_unit: m.cogs_per_unit, include_in_report: m.include_in_report, category: m.category }) }}
                          style={{ padding: '5px 10px', border: '1px solid #E8E8E6', borderRadius: 8, backgroundColor: '#F8F8F6', cursor: 'pointer', color: '#6B6B6B', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Edit2 size={11} /> <span style={{ fontSize: 11 }}>Edit</span>
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#ABABAB', fontSize: 13 }}>
                  {menuFilter === 'zero' ? 'Semua menu sudah ada COGS-nya 👍' : 'Tidak ada menu'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Tab: History ───────────────────────────────────────────────────────────────
function HistoryTab() {
  const [data,      setData]      = useState<any[]>([])
  const [batches,   setBatches]   = useState<{ batch: string; from: string; to: string; rows: number }[]>([])
  const [loading,   setLoading]   = useState(true)
  const [month,     setMonth]     = useState(new Date().toISOString().slice(0, 7))
  const [deleting,  setDeleting]  = useState<string | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [y, m] = month.split('-').map(Number)
    const lastDay = new Date(y, m, 0).getDate()
    const dateEnd = `${month}-${String(lastDay).padStart(2, '0')}`
    const [{ data: rows }, { data: batchRows }] = await Promise.all([
      supabase.from('imported_sales').select('*').gte('date', `${month}-01`).lte('date', dateEnd).order('date'),
      supabase.from('imported_sales').select('import_batch, date').gte('date', `${month}-01`).lte('date', dateEnd),
    ])
    setData(rows ?? [])

    // Summarise batches
    const batchMap: Record<string, { from: string; to: string; rows: number }> = {}
    for (const r of (batchRows ?? [])) {
      if (!batchMap[r.import_batch]) batchMap[r.import_batch] = { from: r.date, to: r.date, rows: 0 }
      if (r.date < batchMap[r.import_batch].from) batchMap[r.import_batch].from = r.date
      if (r.date > batchMap[r.import_batch].to)   batchMap[r.import_batch].to   = r.date
      batchMap[r.import_batch].rows++
    }
    setBatches(Object.entries(batchMap).map(([batch, v]) => ({ batch, ...v })))
    setLoading(false)
  }, [month])

  useEffect(() => { load() }, [load])

  async function deleteBatch(batch: string) {
    setDeleting(batch)
    await Promise.all([
      supabase.from('imported_sales').delete().eq('import_batch', batch),
      supabase.from('imported_menu_sales').delete().eq('import_batch', batch),
    ])
    setDeleting(null)
    setConfirmDel(null)
    load()
  }

  // Group by date + branch for the table view
  type DayBranch = { date: string; branch: string; channels: Record<string, { gross: number; nett: number }>; total_gross: number; total_nett: number }
  const grouped: DayBranch[] = []
  const seen = new Set<string>()
  for (const r of data) {
    const key = `${r.date}|${r.branch}`
    if (!seen.has(key)) {
      seen.add(key)
      grouped.push({ date: r.date, branch: r.branch, channels: {}, total_gross: 0, total_nett: 0 })
    }
    const g = grouped.find(x => x.date === r.date && x.branch === r.branch)!
    g.channels[r.channel] = { gross: r.gross_amount, nett: r.nett_amount }
    g.total_gross += r.gross_amount
    g.total_nett  += r.nett_amount
  }
  grouped.sort((a, b) => a.date.localeCompare(b.date) || a.branch.localeCompare(b.branch))

  const totalGross = grouped.reduce((s, g) => s + g.total_gross, 0)
  const totalNett  = grouped.reduce((s, g) => s + g.total_nett, 0)

  // Shorten batch name for display (filename without path)
  function batchLabel(b: string) {
    const parts = b.split('|')
    const filename = parts[0].replace('Sales Recapitulation Detail Report_', '').replace('.xlsx', '')
    const ts = parts[1] ? new Date(parseInt(parts[1])).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''
    return `${filename} · diimport ${ts}`
  }

  return (
    <div className="space-y-4">
      {/* Batch manager */}
      {batches.length > 0 && (
        <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E6', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ backgroundColor: '#F8F8F6', borderBottom: '1px solid #E8E8E6', padding: '10px 16px' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Import Batches Bulan Ini</span>
          </div>
          {batches.map(b => (
            <div key={b.batch} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid #F8F8F6' }}>
              <div>
                <div style={{ fontSize: 12, color: '#0E0E0E', fontWeight: 500 }}>{batchLabel(b.batch)}</div>
                <div style={{ fontSize: 11, color: '#ABABAB', marginTop: 2 }}>{b.from} s/d {b.to} · {b.rows} baris</div>
              </div>
              {confirmDel === b.batch ? (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#DC2626' }}>Hapus batch ini?</span>
                  <button onClick={() => deleteBatch(b.batch)} disabled={!!deleting}
                    style={{ padding: '4px 12px', backgroundColor: '#DC2626', color: '#FFFFFF', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    {deleting === b.batch ? 'Menghapus...' : 'Ya, hapus'}
                  </button>
                  <button onClick={() => setConfirmDel(null)}
                    style={{ padding: '4px 10px', border: '1px solid #E8E8E6', borderRadius: 7, backgroundColor: '#FFFFFF', fontSize: 12, cursor: 'pointer', color: '#6B6B6B' }}>
                    Batal
                  </button>
                </div>
              ) : (
                <button onClick={() => setConfirmDel(b.batch)}
                  style={{ padding: '5px 12px', border: '1px solid #FECACA', borderRadius: 8, backgroundColor: '#FEF2F2', color: '#DC2626', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  Hapus
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Month selector + totals */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
          style={{ padding: '8px 12px', fontSize: 13, border: '1px solid #E8E8E6', borderRadius: 10, outline: 'none', color: '#0E0E0E', backgroundColor: '#F8F8F6' }} />
        {totalGross > 0 && (
          <div style={{ display: 'flex', gap: 16 }}>
            <span style={{ fontSize: 13, color: '#6B6B6B' }}>Gross: <strong style={{ color: '#0E0E0E' }}>{fmt(totalGross)}</strong></span>
            <span style={{ fontSize: 13, color: '#6B6B6B' }}>Nett: <strong style={{ color: '#16A34A' }}>{fmt(totalNett)}</strong></span>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: '#ABABAB', padding: 40, fontSize: 13 }}>Memuat...</div>
      ) : grouped.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#ABABAB', padding: 60, fontSize: 13, backgroundColor: '#FFFFFF', border: '1px solid #E8E8E6', borderRadius: 16 }}>
          Belum ada data untuk bulan ini. Upload file kasir di tab Import.
        </div>
      ) : (
        <div style={{ border: '1px solid #E8E8E6', borderRadius: 16, overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8F8F6', borderBottom: '1px solid #E8E8E6' }}>
                {['Tanggal', 'Branch', 'GRAB nett', 'GoFood nett', 'POS nett', 'Gross', 'Nett'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', fontSize: 11, color: '#6B6B6B', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: h === 'Gross' || h === 'Nett' ? 'right' : 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grouped.map((g, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #F8F8F6' }} className="hover:bg-[#FAFAF9]">
                  <td style={{ padding: '9px 16px', fontSize: 13, color: '#6B6B6B' }}>{g.date}</td>
                  <td style={{ padding: '9px 16px' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 6, backgroundColor: g.branch === 'BSD' ? '#EFF6FF' : '#F0FDF4', color: g.branch === 'BSD' ? '#1D4ED8' : '#16A34A' }}>{g.branch}</span>
                  </td>
                  {['GRAB', 'GOFOOD', 'POS'].map(ch => (
                    <td key={ch} style={{ padding: '9px 16px', fontSize: 12, color: '#6B6B6B' }}>
                      {g.channels[ch] ? fmt(g.channels[ch].nett) : '—'}
                    </td>
                  ))}
                  <td style={{ padding: '9px 16px', fontSize: 12, color: '#6B7280', textAlign: 'right' }}>{fmt(g.total_gross)}</td>
                  <td style={{ padding: '9px 16px', fontSize: 13, color: '#16A34A', fontWeight: 700, textAlign: 'right' }}>{fmt(g.total_nett)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function Sales() {
  const [tab,             setTab]             = useState<'import' | 'settings' | 'history'>('import')
  const [channelSettings, setChannelSettings] = useState<ChannelSetting[]>([])
  const [menuCogs,        setMenuCogs]        = useState<MenuCog[]>([])

  const loadSettings = useCallback(async () => {
    const [{ data: ch }, { data: mc }] = await Promise.all([
      supabase.from('channel_settings').select('*').order('channel'),
      supabase.from('menu_cogs').select('*').order('kasir_name'),
    ])
    setChannelSettings(ch ?? [])
    setMenuCogs((mc ?? []) as MenuCog[])
  }, [])

  useEffect(() => { loadSettings() }, [loadSettings])

  const zeroCogs = menuCogs.filter(m => m.cogs_per_unit === 0 && m.include_in_report).length

  const TABS = [
    { key: 'import',   label: 'Import Data',  icon: Upload },
    { key: 'settings', label: 'Settings',      icon: Settings, badge: zeroCogs > 0 ? zeroCogs : 0 },
    { key: 'history',  label: 'Riwayat',       icon: History },
  ] as const

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Sales"
        subtitle="Import data kasir, kelola komisi platform & COGS menu"
      />

      {/* Tab bar */}
      <div style={{ borderBottom: '1px solid #E8E8E6', backgroundColor: '#FFFFFF', padding: '0 32px', display: 'flex', gap: 4 }}>
        {TABS.map(t => {
          const Icon = t.icon
          const active = tab === t.key
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 16px', fontSize: 13, fontWeight: active ? 700 : 500, color: active ? '#D91C1C' : '#6B6B6B', borderBottom: `2px solid ${active ? '#D91C1C' : 'transparent'}`, backgroundColor: 'transparent', border: 'none', cursor: 'pointer', transition: 'all 0.15s', position: 'relative' }}>
              <Icon size={14} />
              {t.label}
              {'badge' in t && t.badge > 0 && (
                <span style={{ backgroundColor: '#D97706', color: '#FFFFFF', fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 10, minWidth: 16, textAlign: 'center' }}>{t.badge}</span>
              )}
            </button>
          )
        })}
      </div>

      <div style={{ padding: '24px 32px' }}>
        {tab === 'import' && (
          <ImportTab
            channelSettings={channelSettings}
            menuCogs={menuCogs}
            onImported={() => { loadSettings(); setTab('history') }}
          />
        )}
        {tab === 'settings' && (
          <SettingsTab
            channelSettings={channelSettings}
            menuCogs={menuCogs}
            onRefresh={loadSettings}
          />
        )}
        {tab === 'history' && <HistoryTab />}
      </div>
    </div>
  )
}
