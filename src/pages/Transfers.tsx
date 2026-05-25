import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { TransferRequest } from '../lib/types'
import PageHeader from '../components/PageHeader'
import { CheckCircle, Truck, PackageCheck, Clock, ChevronDown, ChevronUp, AlertCircle, Copy } from 'lucide-react'

function fmt(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

const STATUS_CONFIG = {
  pending:  { label: 'Menunggu',   color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', icon: Clock },
  approved: { label: 'Disetujui',  color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', icon: CheckCircle },
  sent:     { label: 'Dikirim',    color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', icon: Truck },
  received: { label: 'Diterima',   color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0', icon: PackageCheck },
}

type StatusKey = keyof typeof STATUS_CONFIG

function StatusBadge({ status }: { status: StatusKey }) {
  const cfg = STATUS_CONFIG[status]
  const Icon = cfg.icon
  return (
    <span style={{ backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <Icon size={11} /> {cfg.label}
    </span>
  )
}

export default function Transfers() {
  const [requests, setRequests] = useState<TransferRequest[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [filter, setFilter]     = useState<StatusKey | 'all'>('all')
  const [actioning, setActioning] = useState<string | null>(null)
  const [copied, setCopied]     = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const { data, error: e } = await supabase
        .from('transfer_requests')
        .select(`*, items:transfer_request_items(*, item:items(name, unit, category, price_per_unit))`)
        .order('created_at', { ascending: false })
      if (e) throw e
      setRequests((data ?? []) as TransferRequest[])
    } catch (e: any) {
      setError(e.message ?? 'Gagal memuat data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  async function handleApprove(req: TransferRequest) {
    if (!confirm(`Setujui request dari ${req.requested_by} dan buat stok masuk BSD?`)) return
    setActioning(req.id)
    try {
      // 1. Update request status
      const { error: e1 } = await supabase
        .from('transfer_requests')
        .update({ status: 'approved', approved_at: new Date().toISOString() })
        .eq('id', req.id)
      if (e1) throw e1

      // 2. Create stock-in transactions for each item in BSD inventory
      const txs = (req.items ?? []).map(ri => ({
        date: req.request_date,
        type: 'in' as const,
        item_id: ri.item_id,
        quantity: ri.quantity_requested,
        notes: `Transfer dari Gading — req. ${req.requested_by}`,
      }))
      if (txs.length > 0) {
        const { error: e2 } = await supabase.from('transactions').insert(txs)
        if (e2) throw e2

        // 3. Update stock on each item
        for (const ri of req.items ?? []) {
          const { data: cur } = await supabase.from('items').select('stock').eq('id', ri.item_id).single()
          if (cur) {
            await supabase.from('items').update({ stock: cur.stock + ri.quantity_requested }).eq('id', ri.item_id)
          }
        }
      }
      await loadData()
    } catch (e: any) {
      alert('Error: ' + e.message)
    } finally {
      setActioning(null)
    }
  }

  async function handleUpdateStatus(id: string, status: StatusKey) {
    setActioning(id)
    await supabase.from('transfer_requests').update({ status }).eq('id', id)
    await loadData()
    setActioning(null)
  }

  function copyLink() {
    const url = `${window.location.origin}/request`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter)
  const counts   = {
    all:      requests.length,
    pending:  requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    sent:     requests.filter(r => r.status === 'sent').length,
    received: requests.filter(r => r.status === 'received').length,
  }

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Transfer Request"
        subtitle="Permintaan bahan dari BSD ke Gading Serpong"
        action={
          <button onClick={copyLink}
            style={{ border: '1px solid #E8E8E6', backgroundColor: copied ? '#F0FDF4' : '#FFFFFF', color: copied ? '#16A34A' : '#0E0E0E' }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
            <Copy size={14} />
            {copied ? 'Link Disalin!' : 'Copy Link Form Staff'}
          </button>
        }
      />

      {/* Filter tabs */}
      <div style={{ borderBottom: '1px solid #E8E8E6', backgroundColor: '#FFFFFF' }} className="flex gap-1 px-8 pt-3 overflow-x-auto">
        {(['all', 'pending', 'approved', 'sent', 'received'] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            style={{
              borderBottom: filter === s ? '2px solid #D91C1C' : '2px solid transparent',
              color: filter === s ? '#D91C1C' : '#6B6B6B',
              fontWeight: filter === s ? 600 : 400,
              whiteSpace: 'nowrap',
            }}
            className="px-4 py-2.5 text-sm transition-colors flex items-center gap-1.5">
            {s === 'all' ? 'Semua' : STATUS_CONFIG[s].label}
            <span style={{ backgroundColor: '#F2F2F0', color: '#6B6B6B', borderRadius: 999, padding: '1px 7px', fontSize: 11 }}>
              {counts[s]}
            </span>
          </button>
        ))}
      </div>

      <div className="px-8 py-5">
        {loading ? (
          <div style={{ color: '#6B6B6B' }} className="py-20 text-center text-sm">Memuat data...</div>
        ) : error ? (
          <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12 }} className="flex items-center gap-3 px-5 py-4">
            <AlertCircle size={16} style={{ color: '#DC2626', flexShrink: 0 }} />
            <p style={{ color: '#DC2626' }} className="text-sm">{error}</p>
            <button onClick={loadData} style={{ backgroundColor: '#DC2626', color: '#FFFFFF' }}
              className="ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold">Coba Lagi</button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E6', borderRadius: 16 }}
            className="flex flex-col items-center justify-center py-16 gap-3">
            <div style={{ fontSize: 40 }}>📋</div>
            <p style={{ color: '#6B6B6B' }} className="text-sm">
              {filter === 'all' ? 'Belum ada request masuk.' : `Tidak ada request dengan status "${STATUS_CONFIG[filter as StatusKey]?.label}".`}
            </p>
            <p style={{ color: '#ABABAB' }} className="text-xs">Share link form ke staff BSD untuk mulai menerima request.</p>
            <button onClick={copyLink}
              style={{ backgroundColor: '#D91C1C', color: '#FFFFFF' }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold mt-1">
              <Copy size={13} /> Copy Link Form
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(req => {
              const isOpen   = expanded.has(req.id)
              const isLoading = actioning === req.id
              const totalEst = (req.items ?? []).reduce((s, ri) => {
                const price = (ri.item as any)?.price_per_unit ?? 0
                return s + price * ri.quantity_requested
              }, 0)

              return (
                <div key={req.id} style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E6', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  {/* Header row */}
                  <div className="flex items-center gap-4 px-5 py-4 cursor-pointer" onClick={() => toggleExpand(req.id)}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span style={{ fontFamily: "'Archivo Black', sans-serif", color: '#0E0E0E', fontSize: 14 }}>
                          {req.requested_by}
                        </span>
                        <StatusBadge status={req.status as StatusKey} />
                      </div>
                      <div style={{ color: '#6B6B6B', fontSize: 12, marginTop: 3 }}>
                        {req.request_date} · {req.items?.length ?? 0} barang
                        {totalEst > 0 && <span style={{ marginLeft: 6, color: '#D97706', fontWeight: 600 }}>{fmt(totalEst)}</span>}
                      </div>
                      {req.notes && <div style={{ color: '#ABABAB', fontSize: 12, marginTop: 2, fontStyle: 'italic' }}>"{req.notes}"</div>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Action buttons */}
                      {req.status === 'pending' && (
                        <button onClick={e => { e.stopPropagation(); handleApprove(req) }} disabled={isLoading}
                          style={{ backgroundColor: '#D91C1C', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                          {isLoading ? '...' : '✓ Approve'}
                        </button>
                      )}
                      {req.status === 'approved' && (
                        <button onClick={e => { e.stopPropagation(); handleUpdateStatus(req.id, 'sent') }} disabled={isLoading}
                          style={{ backgroundColor: '#7C3AED', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                          {isLoading ? '...' : '🚚 Tandai Dikirim'}
                        </button>
                      )}
                      {req.status === 'sent' && (
                        <button onClick={e => { e.stopPropagation(); handleUpdateStatus(req.id, 'received') }} disabled={isLoading}
                          style={{ backgroundColor: '#16A34A', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                          {isLoading ? '...' : '✓ Diterima'}
                        </button>
                      )}
                      {isOpen ? <ChevronUp size={16} style={{ color: '#ABABAB' }} /> : <ChevronDown size={16} style={{ color: '#ABABAB' }} />}
                    </div>
                  </div>

                  {/* Expanded item list */}
                  {isOpen && (
                    <div style={{ borderTop: '1px solid #F0F0EE' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#F8F8F6' }}>
                            {['Barang', 'Kategori', 'Diminta', 'Est. Nilai'].map(h => (
                              <th key={h} style={{ color: '#6B6B6B', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '8px 16px', textAlign: h === 'Diminta' || h === 'Est. Nilai' ? 'right' : 'left' }}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(req.items ?? []).map(ri => {
                            const price = (ri.item as any)?.price_per_unit ?? 0
                            return (
                              <tr key={ri.id} style={{ borderTop: '1px solid #F0F0EE' }}>
                                <td style={{ padding: '10px 16px', color: '#0E0E0E', fontSize: 13, fontWeight: 500 }}>{ri.item?.name ?? '—'}</td>
                                <td style={{ padding: '10px 16px' }}>
                                  <span style={{ backgroundColor: '#F2F2F0', color: '#6B6B6B', border: '1px solid #E8E8E6', borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 500 }}>
                                    {ri.item?.category ?? '—'}
                                  </span>
                                </td>
                                <td style={{ padding: '10px 16px', textAlign: 'right', color: '#0E0E0E', fontSize: 13, fontWeight: 600 }}>
                                  {ri.quantity_requested} {ri.item?.unit}
                                </td>
                                <td style={{ padding: '10px 16px', textAlign: 'right', color: '#D97706', fontSize: 13 }}>
                                  {price > 0 ? fmt(price * ri.quantity_requested) : '—'}
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
            })}
          </div>
        )}
      </div>
    </div>
  )
}
