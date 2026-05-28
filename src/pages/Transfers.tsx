import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { notifyWA } from '../lib/notify'
import type { TransferRequest } from '../lib/types'
import PageHeader from '../components/PageHeader'
import { CheckCircle, Truck, PackageCheck, Clock, ChevronDown, ChevronUp, AlertCircle, Copy, Printer, X, Trash2 } from 'lucide-react'

function fmt(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

const STATUS_CONFIG = {
  pending:  { label: 'Menunggu',  color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', icon: Clock },
  approved: { label: 'Disetujui', color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', icon: CheckCircle },
  sent:     { label: 'Dikirim',   color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', icon: Truck },
  received: { label: 'Diterima',  color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0', icon: PackageCheck },
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

// ── Print / Packing List ──────────────────────────────────────────────────────
function PrintView({ req, onClose }: { req: TransferRequest; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 300)
    return () => clearTimeout(t)
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'white', zIndex: 9999,
      padding: '40px 48px', fontFamily: 'sans-serif', overflowY: 'auto',
    }}>
      {/* Close — hidden when printing */}
      <button onClick={onClose} className="print:hidden"
        style={{ position: 'fixed', top: 16, right: 16, background: '#F2F2F0', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
        <X size={14} /> Tutup
      </button>

      {/* Letterhead */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, paddingBottom: 20, borderBottom: '3px solid #0E0E0E' }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 24, letterSpacing: '0.06em', color: '#D91C1C' }}>AYAMTENNS</div>
          <div style={{ fontSize: 11, color: '#6B6B6B', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Packing List — Transfer BSD → Gading Serpong
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 12, color: '#6B6B6B', lineHeight: 2 }}>
          <div><strong>Tanggal Request:</strong> {req.request_date}</div>
          <div><strong>Diminta oleh:</strong> {req.requested_by}</div>
          <div><strong>No. Request:</strong> #{req.id.slice(0, 8).toUpperCase()}</div>
        </div>
      </div>

      {/* Route */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28, fontSize: 12, fontWeight: 700 }}>
        <div style={{ backgroundColor: '#F2F2F0', borderRadius: 6, padding: '6px 14px' }}>BSD</div>
        <div style={{ flex: 1, height: 2, background: 'repeating-linear-gradient(90deg,#D91C1C 0,#D91C1C 6px,transparent 6px,transparent 12px)' }} />
        <div style={{ color: '#D91C1C', fontSize: 16 }}>✈</div>
        <div style={{ flex: 1, height: 2, background: 'repeating-linear-gradient(90deg,#D91C1C 0,#D91C1C 6px,transparent 6px,transparent 12px)' }} />
        <div style={{ backgroundColor: '#0E0E0E', color: 'white', borderRadius: 6, padding: '6px 14px' }}>Gading Serpong</div>
      </div>

      {/* Items table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 24 }}>
        <thead>
          <tr style={{ backgroundColor: '#0E0E0E', color: 'white' }}>
            {['No', 'Barang', 'Kategori', 'Diminta', 'Dikirim', 'Cek ✓'].map((h, i) => (
              <th key={h} style={{ padding: '9px 12px', fontWeight: 700, textAlign: i >= 3 ? 'right' : 'left', width: h === 'No' ? 36 : h === 'Cek ✓' ? 64 : undefined }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(req.items ?? []).map((ri, idx) => {
            const hasDiff = ri.quantity_sent != null && ri.quantity_sent !== ri.quantity_requested
            return (
              <tr key={ri.id} style={{ borderBottom: '1px solid #E8E8E6', backgroundColor: idx % 2 === 0 ? 'white' : '#F8F8F6' }}>
                <td style={{ padding: '9px 12px', color: '#ABABAB' }}>{idx + 1}</td>
                <td style={{ padding: '9px 12px', fontWeight: 600, color: '#0E0E0E' }}>{ri.item?.name ?? '—'}</td>
                <td style={{ padding: '9px 12px', color: '#6B6B6B' }}>{ri.item?.category ?? '—'}</td>
                <td style={{ padding: '9px 12px', textAlign: 'right', color: hasDiff ? '#ABABAB' : '#0E0E0E', textDecoration: hasDiff ? 'line-through' : 'none' }}>
                  {ri.quantity_requested} {ri.item?.unit}
                </td>
                <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, color: hasDiff ? '#2563EB' : '#0E0E0E' }}>
                  {ri.quantity_sent != null ? ri.quantity_sent : ri.quantity_requested} {ri.item?.unit}
                </td>
                <td style={{ padding: '9px 12px', textAlign: 'right' }}>
                  <div style={{ width: 20, height: 20, border: '2px solid #0E0E0E', borderRadius: 3, display: 'inline-block' }} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Notes */}
      {req.notes && (
        <div style={{ marginBottom: 24, padding: '10px 14px', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8 }}>
          <strong style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#D97706' }}>Catatan:</strong>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#0E0E0E' }}>{req.notes}</p>
        </div>
      )}

      {/* Signature blocks */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginTop: 48, paddingTop: 20, borderTop: '1px solid #E8E8E6' }}>
        {['Disiapkan oleh (Gading)', 'Diterima oleh (BSD)'].map(label => (
          <div key={label}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6B6B6B', marginBottom: 48 }}>{label}</div>
            <div style={{ borderTop: '1px solid #0E0E0E', paddingTop: 6, fontSize: 12, color: '#6B6B6B' }}>Nama & Tanda Tangan</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 32, fontSize: 10, color: '#ABABAB', textAlign: 'center' }}>
        Dicetak dari sistem Ayamtenns · {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Transfers() {
  const [requests, setRequests]   = useState<TransferRequest[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [expanded, setExpanded]   = useState<Set<string>>(new Set())
  const [filter, setFilter]       = useState<StatusKey | 'all'>('all')
  const [actioning, setActioning] = useState<string | null>(null)
  const [copied, setCopied]       = useState(false)

  // Edit qty modal — used for both Approve and Tandai Dikirim
  const [editingReq, setEditingReq]   = useState<TransferRequest | null>(null)
  const [editQtys, setEditQtys]       = useState<Record<string, string>>({})
  const [editNotes, setEditNotes]     = useState('')
  const [editMode, setEditMode]       = useState<'approve' | 'send'>('approve')

  // Print overlay
  const [printReq, setPrintReq] = useState<TransferRequest | null>(null)

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
    setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }

  function openEditModal(req: TransferRequest, mode: 'approve' | 'send') {
    const qtys: Record<string, string> = {}
    for (const ri of req.items ?? []) {
      // pre-fill with quantity_sent if already set, otherwise quantity_requested
      qtys[ri.id] = String(ri.quantity_sent ?? ri.quantity_requested)
    }
    setEditQtys(qtys)
    setEditNotes(req.notes ?? '')
    setEditMode(mode)
    setEditingReq(req)
  }

  async function handleEditConfirm() {
    if (!editingReq) return
    setActioning(editingReq.id)
    try {
      // Save quantity_sent per item
      for (const ri of editingReq.items ?? []) {
        const sent = parseFloat(editQtys[ri.id] ?? String(ri.quantity_requested))
        await supabase.from('transfer_request_items').update({ quantity_sent: sent }).eq('id', ri.id)
      }

      if (editMode === 'approve') {
        // Approve — save estimated qty + notes, no stock update yet
        const { error: e1 } = await supabase
          .from('transfer_requests')
          .update({ status: 'approved', approved_at: new Date().toISOString(), notes: editNotes.trim() })
          .eq('id', editingReq.id)
        if (e1) throw e1

      } else {
        // Tandai Dikirim — actual qty confirmed → update stock NOW
        const { error: e1 } = await supabase
          .from('transfer_requests')
          .update({ status: 'sent', notes: editNotes.trim() })
          .eq('id', editingReq.id)
        if (e1) throw e1

        // WA notification to BSD staff
        const itemLines = (editingReq.items ?? [])
          .map(ri => {
            const sent = parseFloat(editQtys[ri.id] ?? String(ri.quantity_requested))
            return `• ${ri.item?.name ?? '?'}: ${sent} ${ri.item?.unit ?? ''}`
          })
          .join('\n')
        notifyWA(
          `🚚 *Barang Sudah Dikirim dari Gading!*\n\nUntuk: ${editingReq.requested_by}\nTanggal: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}\n\n${itemLines}${editNotes.trim() ? `\n\nCatatan: ${editNotes.trim()}` : ''}\n\n_Mohon konfirmasi barang diterima._`
        )

        const txs = (editingReq.items ?? []).map(ri => ({
          date: editingReq.request_date,
          type: 'in' as const,
          item_id: ri.item_id,
          quantity: parseFloat(editQtys[ri.id] ?? String(ri.quantity_requested)),
          notes: `Transfer dari Gading — req. ${editingReq.requested_by}`,
        }))
        if (txs.length > 0) {
          const { error: e2 } = await supabase.from('transactions').insert(txs)
          if (e2) throw e2
          for (const ri of editingReq.items ?? []) {
            const sent = parseFloat(editQtys[ri.id] ?? String(ri.quantity_requested))
            const { data: cur } = await supabase.from('items').select('stock, stock_gading').eq('id', ri.item_id).single()
            if (cur) await supabase.from('items').update({
              stock: cur.stock + sent,
              stock_gading: Math.max(0, cur.stock_gading - sent),
            }).eq('id', ri.item_id)
          }
        }
      }

      setEditingReq(null)
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

  async function handleDelete(id: string) {
    if (!confirm('Hapus request ini? Data tidak bisa dikembalikan.')) return
    setActioning(id)
    await supabase.from('transfer_request_items').delete().eq('request_id', id)
    await supabase.from('transfer_requests').delete().eq('id', id)
    await loadData()
    setActioning(null)
  }

  function copyLink() {
    const url = `${window.location.origin}/request-bsd`
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter)
  const counts = {
    all:      requests.length,
    pending:  requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    sent:     requests.filter(r => r.status === 'sent').length,
    received: requests.filter(r => r.status === 'received').length,
  }

  return (
    <div className="min-h-screen">
      {/* Print overlay */}
      {printReq && <PrintView req={printReq} onClose={() => setPrintReq(null)} />}

      {/* ── Approve Modal ── */}
      {editingReq && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ backgroundColor: 'white', borderRadius: 16, width: '100%', maxWidth: 580, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>

            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E8E8E6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 15, color: '#0E0E0E' }}>
                  {editMode === 'approve' ? 'Review & Approve Request' : 'Tandai Dikirim — Qty Aktual'}
                </div>
                <div style={{ fontSize: 12, color: '#6B6B6B', marginTop: 2 }}>dari {editingReq.requested_by} · {editingReq.request_date}</div>
              </div>
              <button onClick={() => setEditingReq(null)}
                style={{ background: '#F2F2F0', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={14} />
              </button>
            </div>

            <div style={{ overflowY: 'auto', flex: 1, padding: '16px 24px' }}>
              <p style={{ fontSize: 12, color: '#6B6B6B', marginBottom: 14, lineHeight: 1.6 }}>
                {editMode === 'approve'
                  ? <>Sesuaikan estimasi qty yang akan dikirim Gading. <strong>Stok BSD belum berubah</strong> — stok baru ter-update saat "Tandai Dikirim".</>
                  : <>Input qty <strong>aktual</strong> yang dikirim Gading. Angka ini yang masuk ke stok BSD.</>
                }
              </p>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 16 }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8F8F6' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', color: '#6B6B6B', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Barang</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', color: '#6B6B6B', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>Diminta</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', color: '#6B6B6B', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>Dikirim</th>
                  </tr>
                </thead>
                <tbody>
                  {(editingReq.items ?? []).map(ri => {
                    const sent    = parseFloat(editQtys[ri.id] ?? String(ri.quantity_requested))
                    const changed = !isNaN(sent) && sent !== ri.quantity_requested
                    return (
                      <tr key={ri.id} style={{ borderTop: '1px solid #F0F0EE' }}>
                        <td style={{ padding: '10px 12px', color: '#0E0E0E', fontWeight: 500 }}>
                          {ri.item?.name ?? '—'}
                          <span style={{ color: '#ABABAB', fontWeight: 400, marginLeft: 6, fontSize: 11 }}>{ri.item?.unit}</span>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#ABABAB', fontSize: 13 }}>
                          {ri.quantity_requested}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <input
                            type="number" min="0" step="0.5"
                            value={editQtys[ri.id] ?? String(ri.quantity_requested)}
                            onChange={e => setEditQtys(prev => ({ ...prev, [ri.id]: e.target.value }))}
                            style={{
                              width: 80, textAlign: 'right', padding: '5px 8px', fontSize: 13, fontWeight: 600,
                              color: changed ? '#2563EB' : '#0E0E0E',
                              border: `1px solid ${changed ? '#93C5FD' : '#E8E8E6'}`,
                              borderRadius: 6, outline: 'none',
                              backgroundColor: changed ? '#EFF6FF' : '#F8F8F6',
                            }}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              <div>
                <label style={{ fontSize: 11, color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  Catatan untuk Gading (opsional)
                </label>
                <textarea
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  placeholder="misal: selada 1 bonggol besar, ayam dicuci dulu..."
                  rows={3}
                  style={{ width: '100%', padding: '10px 12px', fontSize: 13, border: '1px solid #E8E8E6', borderRadius: 8, outline: 'none', resize: 'none', color: '#0E0E0E', backgroundColor: '#F8F8F6', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ padding: '14px 24px', borderTop: '1px solid #E8E8E6', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setEditingReq(null)}
                style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid #E8E8E6', backgroundColor: 'white', color: '#6B6B6B', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Batal
              </button>
              <button onClick={handleEditConfirm} disabled={!!actioning}
                style={{ padding: '10px 24px', borderRadius: 10, border: 'none', backgroundColor: actioning ? '#ABABAB' : editMode === 'approve' ? '#D91C1C' : '#7C3AED', color: 'white', fontSize: 13, fontWeight: 700, cursor: actioning ? 'not-allowed' : 'pointer', fontFamily: "'Archivo Black', sans-serif" }}>
                {actioning ? 'Menyimpan...' : editMode === 'approve' ? '✓ Approve & Simpan' : '🚚 Simpan & Tandai Dikirim'}
              </button>
            </div>
          </div>
        </div>
      )}

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
            style={{ borderBottom: filter === s ? '2px solid #D91C1C' : '2px solid transparent', color: filter === s ? '#D91C1C' : '#6B6B6B', fontWeight: filter === s ? 600 : 400, whiteSpace: 'nowrap' }}
            className="px-4 py-2.5 text-sm transition-colors flex items-center gap-1.5">
            {s === 'all' ? 'Semua' : STATUS_CONFIG[s].label}
            <span style={{ backgroundColor: '#F2F2F0', color: '#6B6B6B', borderRadius: 999, padding: '1px 7px', fontSize: 11 }}>{counts[s]}</span>
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
            <button onClick={copyLink} style={{ backgroundColor: '#D91C1C', color: '#FFFFFF' }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold mt-1">
              <Copy size={13} /> Copy Link Form
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(req => {
              const isOpen    = expanded.has(req.id)
              const isLoading = actioning === req.id
              const totalEst  = (req.items ?? []).reduce((s, ri) => {
                const price = (ri.item as any)?.price_per_unit ?? 0
                return s + price * (ri.quantity_sent ?? ri.quantity_requested)
              }, 0)

              const PrintBtn = () => (
                <button onClick={e => { e.stopPropagation(); setPrintReq(req) }}
                  style={{ backgroundColor: '#F2F2F0', color: '#0E0E0E', border: '1px solid #E8E8E6', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Printer size={12} /> Print
                </button>
              )

              return (
                <div key={req.id} style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E6', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <div className="flex items-center gap-4 px-5 py-4 cursor-pointer" onClick={() => toggleExpand(req.id)}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span style={{ fontFamily: "'Archivo Black', sans-serif", color: '#0E0E0E', fontSize: 14 }}>{req.requested_by}</span>
                        <StatusBadge status={req.status as StatusKey} />
                      </div>
                      <div style={{ color: '#6B6B6B', fontSize: 12, marginTop: 3 }}>
                        {req.request_date} · {req.items?.length ?? 0} barang
                        {totalEst > 0 && <span style={{ marginLeft: 6, color: '#D97706', fontWeight: 600 }}>{fmt(totalEst)}</span>}
                      </div>
                      {req.notes && <div style={{ color: '#ABABAB', fontSize: 12, marginTop: 2, fontStyle: 'italic' }}>"{req.notes}"</div>}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {req.status === 'pending' && (
                        <button onClick={e => { e.stopPropagation(); openEditModal(req, 'approve') }} disabled={isLoading}
                          style={{ backgroundColor: '#D91C1C', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer' }}>
                          {isLoading ? '...' : '✓ Review & Approve'}
                        </button>
                      )}
                      {req.status === 'approved' && (
                        <>
                          <PrintBtn />
                          <button onClick={e => { e.stopPropagation(); openEditModal(req, 'send') }} disabled={isLoading}
                            style={{ backgroundColor: '#7C3AED', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                            {isLoading ? '...' : '🚚 Tandai Dikirim'}
                          </button>
                        </>
                      )}
                      {req.status === 'sent' && (
                        <>
                          <PrintBtn />
                          <button onClick={e => { e.stopPropagation(); handleUpdateStatus(req.id, 'received') }} disabled={isLoading}
                            style={{ backgroundColor: '#16A34A', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                            {isLoading ? '...' : '✓ Diterima'}
                          </button>
                        </>
                      )}
                      {req.status === 'received' && <PrintBtn />}
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(req.id) }}
                        disabled={isLoading}
                        title="Hapus request"
                        style={{ backgroundColor: 'transparent', color: '#ABABAB', border: '1px solid #E8E8E6', borderRadius: 8, padding: '6px 8px', fontSize: 12, cursor: isLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center' }}>
                        <Trash2 size={13} />
                      </button>
                      {isOpen ? <ChevronUp size={16} style={{ color: '#ABABAB' }} /> : <ChevronDown size={16} style={{ color: '#ABABAB' }} />}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div style={{ borderTop: '1px solid #F0F0EE' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#F8F8F6' }}>
                            {['Barang', 'Kategori', 'Diminta', 'Dikirim', 'Est. Nilai'].map(h => (
                              <th key={h} style={{ color: '#6B6B6B', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '8px 16px', textAlign: ['Diminta', 'Dikirim', 'Est. Nilai'].includes(h) ? 'right' : 'left' }}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(req.items ?? []).map(ri => {
                            const price   = (ri.item as any)?.price_per_unit ?? 0
                            const hasDiff = ri.quantity_sent != null && ri.quantity_sent !== ri.quantity_requested
                            return (
                              <tr key={ri.id} style={{ borderTop: '1px solid #F0F0EE' }}>
                                <td style={{ padding: '10px 16px', color: '#0E0E0E', fontSize: 13, fontWeight: 500 }}>{ri.item?.name ?? '—'}</td>
                                <td style={{ padding: '10px 16px' }}>
                                  <span style={{ backgroundColor: '#F2F2F0', color: '#6B6B6B', border: '1px solid #E8E8E6', borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 500 }}>
                                    {ri.item?.category ?? '—'}
                                  </span>
                                </td>
                                <td style={{ padding: '10px 16px', textAlign: 'right', fontSize: 13, color: hasDiff ? '#ABABAB' : '#0E0E0E', textDecoration: hasDiff ? 'line-through' : 'none' }}>
                                  {ri.quantity_requested} {ri.item?.unit}
                                </td>
                                <td style={{ padding: '10px 16px', textAlign: 'right', fontSize: 13, fontWeight: 600, color: hasDiff ? '#2563EB' : '#6B6B6B' }}>
                                  {ri.quantity_sent != null ? `${ri.quantity_sent} ${ri.item?.unit}` : `${ri.quantity_requested} ${ri.item?.unit}`}
                                </td>
                                <td style={{ padding: '10px 16px', textAlign: 'right', color: '#D97706', fontSize: 13 }}>
                                  {price > 0 ? fmt(price * (ri.quantity_sent ?? ri.quantity_requested)) : '—'}
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
