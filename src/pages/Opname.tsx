import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import PageHeader from '../components/PageHeader'
import { CheckCircle, Clock, AlertCircle, ChevronDown, ChevronUp, Link } from 'lucide-react'

function fmt(n: number) {
  return new Intl.NumberFormat('id-ID').format(n)
}

interface OpnameItem {
  id: string
  item_id: string
  system_stock: number
  actual_count: number
  item?: { name: string; unit: string; category: string }
}

interface Opname {
  id: string
  date: string
  branch: string
  submitted_by: string
  status: 'pending' | 'committed'
  notes: string
  created_at: string
  items?: OpnameItem[]
}

export default function OpnamePage() {
  const [opnames,    setOpnames]   = useState<Opname[]>([])
  const [loading,    setLoading]   = useState(true)
  const [error,      setError]     = useState<string | null>(null)
  const [expanded,   setExpanded]  = useState<Set<string>>(new Set())
  const [committing, setCommitting] = useState<string | null>(null)
  const [copied,     setCopied]    = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const { data, error: e } = await supabase
        .from('stock_opnames')
        .select(`*, items:stock_opname_items(*, item:items(name, unit, category))`)
        .order('created_at', { ascending: false })
      if (e) throw e
      setOpnames((data ?? []) as Opname[])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function toggle(id: string) {
    setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }

  function copyLink(branch: string) {
    const slug = branch === 'BSD' ? 'opname-bsd' : 'opname-gading'
    navigator.clipboard.writeText(`${window.location.origin}/${slug}`)
    setCopied(branch)
    setTimeout(() => setCopied(null), 2000)
  }

  async function commitOpname(opname: Opname) {
    if (!confirm(`Commit opname ${opname.branch} dari ${opname.submitted_by}?\nStok akan diupdate ke angka aktual.`)) return
    setCommitting(opname.id)
    try {
      const stockField = opname.branch === 'BSD' ? 'stock' : 'stock_gading'
      const today = opname.date

      for (const oi of opname.items ?? []) {
        // Update stock
        await supabase.from('items').update({ [stockField]: oi.actual_count }).eq('id', oi.item_id)

        // Log adjustment transaction for audit
        const diff = oi.actual_count - oi.system_stock
        if (diff !== 0) {
          await supabase.from('transactions').insert({
            date:     today,
            type:     diff > 0 ? 'in' : 'out',
            item_id:  oi.item_id,
            quantity: Math.abs(diff),
            notes:    `Stock opname ${opname.branch} — ${opname.submitted_by}`,
            source:   'opname',
          })
        }
      }

      // Mark as committed
      await supabase.from('stock_opnames').update({ status: 'committed' }).eq('id', opname.id)
      await load()
    } catch (e: any) {
      alert('Error: ' + e.message)
    } finally {
      setCommitting(null)
    }
  }

  const pending   = opnames.filter(o => o.status === 'pending')
  const committed = opnames.filter(o => o.status === 'committed')

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Stock Opname"
        subtitle="Review dan commit hasil perhitungan stok fisik"
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            {(['BSD', 'Gading'] as const).map(br => (
              <button key={br} onClick={() => copyLink(br)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: '1px solid #E8E8E6', backgroundColor: copied === br ? '#F0FDF4' : '#FFFFFF', color: copied === br ? '#16A34A' : '#0E0E0E', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                <Link size={13} />
                {copied === br ? 'Disalin!' : `Link ${br}`}
              </button>
            ))}
          </div>
        }
      />

      <div className="px-8 py-6 space-y-6">
        {loading ? (
          <div style={{ color: '#6B6B6B', textAlign: 'center', padding: '60px 0', fontSize: 14 }}>Memuat data...</div>
        ) : error ? (
          <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertCircle size={16} style={{ color: '#DC2626' }} />
            <span style={{ color: '#DC2626', fontSize: 14 }}>{error}</span>
          </div>
        ) : (
          <>
            {/* Pending */}
            {pending.length > 0 && (
              <div>
                <h3 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 13, color: '#0E0E0E', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                  Menunggu Commit ({pending.length})
                </h3>
                <div className="space-y-3">
                  {pending.map(op => <OpnameCard key={op.id} op={op} expanded={expanded.has(op.id)} onToggle={() => toggle(op.id)} onCommit={() => commitOpname(op)} committing={committing === op.id} />)}
                </div>
              </div>
            )}

            {/* Empty state */}
            {pending.length === 0 && committed.length === 0 && (
              <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E6', borderRadius: 16, padding: '48px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                <p style={{ color: '#6B6B6B', fontSize: 14, marginBottom: 4 }}>Belum ada opname masuk.</p>
                <p style={{ color: '#ABABAB', fontSize: 12 }}>Share link ke staff BSD dan Gading untuk mulai opname.</p>
              </div>
            )}

            {/* Committed */}
            {committed.length > 0 && (
              <div>
                <h3 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 13, color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                  Sudah Commit ({committed.length})
                </h3>
                <div className="space-y-3">
                  {committed.map(op => <OpnameCard key={op.id} op={op} expanded={expanded.has(op.id)} onToggle={() => toggle(op.id)} committed />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function OpnameCard({ op, expanded, onToggle, onCommit, committing, committed }: {
  op: Opname
  expanded: boolean
  onToggle: () => void
  onCommit?: () => void
  committing?: boolean
  committed?: boolean
}) {
  const items = op.items ?? []
  const diffs = items.filter(i => i.actual_count !== i.system_stock)
  const totalItems = items.length

  return (
    <div style={{ backgroundColor: '#FFFFFF', border: `1px solid ${committed ? '#E8E8E6' : '#FED7AA'}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', cursor: 'pointer', opacity: committed ? 0.7 : 1 }} onClick={onToggle}>
        <div style={{ flexShrink: 0 }}>
          {committed
            ? <CheckCircle size={20} style={{ color: '#16A34A' }} />
            : <Clock size={20} style={{ color: '#D97706' }} />
          }
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: "'Archivo Black', sans-serif", color: '#0E0E0E', fontSize: 14 }}>{op.branch}</span>
            <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 6, backgroundColor: op.branch === 'BSD' ? '#EFF6FF' : '#F0FDF4', color: op.branch === 'BSD' ? '#1D4ED8' : '#16A34A', fontWeight: 600 }}>{op.branch}</span>
            {committed && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, backgroundColor: '#F0FDF4', color: '#16A34A', fontWeight: 600 }}>✓ Committed</span>}
          </div>
          <div style={{ color: '#6B6B6B', fontSize: 12, marginTop: 2 }}>
            {op.submitted_by} · {op.date} · {diffs.length}/{totalItems} item ada selisih
          </div>
          {op.notes && <div style={{ color: '#ABABAB', fontSize: 12, marginTop: 2, fontStyle: 'italic' }}>"{op.notes}"</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {!committed && onCommit && (
            <button onClick={e => { e.stopPropagation(); onCommit() }} disabled={committing}
              style={{ padding: '8px 16px', backgroundColor: committing ? '#ABABAB' : '#16A34A', color: '#FFFFFF', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: committing ? 'not-allowed' : 'pointer', fontFamily: "'Archivo Black', sans-serif" }}>
              {committing ? 'Menyimpan...' : '✓ Commit'}
            </button>
          )}
          {expanded ? <ChevronUp size={16} style={{ color: '#ABABAB' }} /> : <ChevronDown size={16} style={{ color: '#ABABAB' }} />}
        </div>
      </div>

      {/* Detail table */}
      {expanded && (
        <div style={{ borderTop: '1px solid #F0F0EE' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8F8F6' }}>
                {['Barang', 'Kategori', 'Sistem', 'Aktual', 'Selisih'].map(h => (
                  <th key={h} style={{ color: '#6B6B6B', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '8px 16px', textAlign: ['Sistem', 'Aktual', 'Selisih'].includes(h) ? 'right' : 'left' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items
                .slice()
                .sort((a, b) => {
                  const da = Math.abs(a.actual_count - a.system_stock)
                  const db = Math.abs(b.actual_count - b.system_stock)
                  return db - da // items with diff first
                })
                .map(oi => {
                  const diff = oi.actual_count - oi.system_stock
                  const hasDiff = diff !== 0
                  return (
                    <tr key={oi.id} style={{ borderTop: '1px solid #F0F0EE', backgroundColor: hasDiff ? (diff < 0 ? '#FEF2F2' : '#F0FDF4') : 'white' }}>
                      <td style={{ padding: '9px 16px', fontSize: 13, fontWeight: 500, color: '#0E0E0E' }}>{oi.item?.name ?? '—'}</td>
                      <td style={{ padding: '9px 16px' }}>
                        <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 6, backgroundColor: '#F2F2F0', color: '#6B6B6B', fontWeight: 500 }}>{oi.item?.category ?? '—'}</span>
                      </td>
                      <td style={{ padding: '9px 16px', textAlign: 'right', fontSize: 13, color: '#6B6B6B' }}>{fmt(oi.system_stock)} {oi.item?.unit}</td>
                      <td style={{ padding: '9px 16px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: hasDiff ? (diff < 0 ? '#DC2626' : '#16A34A') : '#0E0E0E' }}>
                        {fmt(oi.actual_count)} {oi.item?.unit}
                      </td>
                      <td style={{ padding: '9px 16px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: diff < 0 ? '#DC2626' : diff > 0 ? '#16A34A' : '#ABABAB' }}>
                        {diff === 0 ? '—' : `${diff > 0 ? '+' : ''}${fmt(diff)}`}
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
