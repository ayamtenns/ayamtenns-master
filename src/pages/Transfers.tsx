import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { notifyWA } from '../lib/notify'
import type { TransferRequest, TransferRequestItem } from '../lib/types'
import PageHeader from '../components/PageHeader'
import { CheckCircle, Truck, PackageCheck, Clock, ChevronDown, ChevronUp, AlertCircle, Copy, Printer, X, Trash2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

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
  const [filter, setFilter]       = useState<StatusKey | 'all' | 'rekap'>('all')
  const [rekapMonth, setRekapMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [rekapView,  setRekapView]  = useState<'tabel' | 'grafik'>('tabel')
  const [actioning, setActioning] = useState<string | null>(null)
  const [copied, setCopied]       = useState(false)

  // Edit qty modal — used for both Approve and Tandai Dikirim
  const [editingReq, setEditingReq]   = useState<TransferRequest | null>(null)
  const [editQtys, setEditQtys]       = useState<Record<string, string>>({})
  const [editNotes, setEditNotes]     = useState('')
  const [editMode, setEditMode]       = useState<'approve' | 'send' | 'edit'>('approve')
  // Item add/remove within edit modal
  const [editDeletedIds, setEditDeletedIds] = useState<Set<string>>(new Set())
  const [editNewItems,   setEditNewItems]   = useState<{ tempId: string; item_id: string; name: string; unit: string; qty: string }[]>([])
  const [allItems,       setAllItems]       = useState<{ id: string; name: string; unit: string; category: string }[]>([])
  const [itemSearch,     setItemSearch]     = useState('')
  const [showAddItem,    setShowAddItem]    = useState(false)

  // Print overlay
  const [printReq, setPrintReq] = useState<TransferRequest | null>(null)

  // Received date modal
  const [receivingReq, setReceivingReq] = useState<TransferRequest | null>(null)
  const [receivedDate, setReceivedDate] = useState('')

  // WA resend notif
  const [notifSending, setNotifSending] = useState<string | null>(null)
  const [notifResult, setNotifResult]   = useState<Record<string, 'ok' | 'fail'>>({})

  async function handleResendNotif(req: TransferRequest) {
    setNotifSending(req.id)
    const itemLines = (req.items ?? [])
      .map(i => `• ${i.item?.name ?? '?'}: ${i.quantity_requested} ${i.item?.unit ?? ''}`)
      .join('\n')
    const msg = `📦 *Permintaan Barang Baru*\n\nDari: ${req.requested_by}\nTanggal: ${new Date(req.request_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}\n\n${itemLines}${req.notes?.trim() ? `\n\nCatatan: ${req.notes.trim()}` : ''}\n\n_Cek & approve di sistem AYAMTENNS._`
    const ok = await notifyWA(msg)
    setNotifResult(prev => ({ ...prev, [req.id]: ok ? 'ok' : 'fail' }))
    setNotifSending(null)
    if (ok) setTimeout(() => setNotifResult(prev => { const n = { ...prev }; delete n[req.id]; return n }), 3000)
  }

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

  useEffect(() => {
    supabase.from('items').select('id,name,unit,category').order('category').order('name')
      .then(({ data }) => setAllItems(data ?? []))
  }, [])

  function toggleExpand(id: string) {
    setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }

  function openEditModal(req: TransferRequest, mode: 'approve' | 'send' | 'edit') {
    const qtys: Record<string, string> = {}
    for (const ri of req.items ?? []) {
      qtys[ri.id] = String(ri.quantity_sent ?? ri.quantity_requested)
    }
    setEditQtys(qtys)
    setEditNotes(req.notes ?? '')
    setEditMode(mode)
    setEditDeletedIds(new Set())
    setEditNewItems([])
    setShowAddItem(false)
    setItemSearch('')
    setEditingReq(req)
  }

  function toggleDeleteItem(id: string) {
    setEditDeletedIds(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  function addNewItemRow(item: { id: string; name: string; unit: string }) {
    setEditNewItems(prev => [...prev, { tempId: crypto.randomUUID(), item_id: item.id, name: item.name, unit: item.unit, qty: '1' }])
    setShowAddItem(false)
    setItemSearch('')
  }

  function removeNewItem(tempId: string) {
    setEditNewItems(prev => prev.filter(i => i.tempId !== tempId))
  }

  async function handleEditConfirm() {
    if (!editingReq) return
    setActioning(editingReq.id)
    try {
      // 1. Delete removed items
      if (editDeletedIds.size > 0) {
        await supabase.from('transfer_request_items').delete().in('id', [...editDeletedIds])
      }

      // 2. Update qty for remaining existing items
      const remainingItems = (editingReq.items ?? []).filter(ri => !editDeletedIds.has(ri.id))
      for (const ri of remainingItems) {
        const sent = parseFloat(editQtys[ri.id] ?? String(ri.quantity_requested))
        await supabase.from('transfer_request_items').update({ quantity_sent: sent }).eq('id', ri.id)
      }

      // 3. Insert new items
      let insertedItems: { id: string; item_id: string; quantity_requested: number }[] = []
      if (editNewItems.length > 0) {
        const newRows = editNewItems.map(ni => ({
          request_id: editingReq.id,
          item_id: ni.item_id,
          quantity_requested: parseFloat(ni.qty) || 0,
          quantity_sent: parseFloat(ni.qty) || 0,
        }))
        const { data, error: eins } = await supabase.from('transfer_request_items').insert(newRows).select()
        if (eins) throw eins
        insertedItems = (data ?? []) as typeof insertedItems
      }

      if (editMode === 'edit') {
        // Koreksi item saja — status & stok tidak berubah
        await supabase.from('transfer_requests').update({ notes: editNotes.trim() }).eq('id', editingReq.id)

      } else {
        // Tandai Dikirim — update stock
        const { error: e1 } = await supabase
          .from('transfer_requests')
          .update({ status: 'sent', notes: editNotes.trim() })
          .eq('id', editingReq.id)
        if (e1) throw e1

        // Build all items to update (remaining + new)
        const allSentItems = [
          ...remainingItems.map(ri => ({
            item_id: ri.item_id,
            qty: parseFloat(editQtys[ri.id] ?? String(ri.quantity_requested)),
            name: ri.item?.name ?? '?',
            unit: ri.item?.unit ?? '',
          })),
          ...editNewItems.map(ni => ({
            item_id: ni.item_id,
            qty: parseFloat(ni.qty) || 0,
            name: ni.name,
            unit: ni.unit,
          })),
        ]

        // WA notification
        const itemLines = allSentItems.map(i => `• ${i.name}: ${i.qty} ${i.unit}`).join('\n')
        notifyWA(
          `🚚 *Barang Sudah Dikirim dari Gading!*\n\nUntuk: ${editingReq.requested_by}\nTanggal: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}\n\n${itemLines}${editNotes.trim() ? `\n\nCatatan: ${editNotes.trim()}` : ''}\n\n_Mohon konfirmasi barang diterima._`
        )

        // Transactions + stock update
        const txs = allSentItems.map(i => ({
          date: editingReq.request_date,
          type: 'in' as const,
          item_id: i.item_id,
          quantity: i.qty,
          notes: `Transfer dari Gading — req. ${editingReq.requested_by}`,
          source: 'transfer',
        }))
        if (txs.length > 0) {
          const { error: e2 } = await supabase.from('transactions').insert(txs)
          if (e2) throw e2
          for (const i of allSentItems) {
            const { data: cur } = await supabase.from('items').select('stock, stock_gading').eq('id', i.item_id).single()
            if (cur) await supabase.from('items').update({
              stock: cur.stock + i.qty,
              stock_gading: Math.max(0, cur.stock_gading - i.qty),
            }).eq('id', i.item_id)
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

  async function handleConfirmReceived() {
    if (!receivingReq) return
    setActioning(receivingReq.id)
    await supabase.from('transfer_requests')
      .update({ status: 'received', received_at: receivedDate })
      .eq('id', receivingReq.id)
    await loadData()
    setReceivingReq(null)
    setActioning(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus request ini? Data tidak bisa dikembalikan.')) return
    setActioning(id)
    const { error: e1 } = await supabase.from('transfer_request_items').delete().eq('request_id', id)
    const { error: e2 } = await supabase.from('transfer_requests').delete().eq('id', id)
    if (e1 || e2) { alert('Gagal hapus: ' + (e1?.message || e2?.message)); setActioning(null); return }
    await loadData()
    setActioning(null)
  }

  async function handleDeleteItem(req: TransferRequest, ri: TransferRequestItem) {
    if (!confirm(`Hapus "${ri.item?.name}" dari request ini?`)) return
    setActioning(req.id)
    // Delete the item row
    const { error: e1 } = await supabase.from('transfer_request_items').delete().eq('id', ri.id)
    if (e1) { alert('Gagal hapus: ' + e1.message); setActioning(null); return }
    // For sent/received: reverse the transaction so stock is corrected
    if (req.status === 'sent' || req.status === 'received') {
      const sentQty = ri.quantity_sent ?? ri.quantity_requested
      // Delete matching transaction
      await supabase.from('transactions')
        .delete()
        .eq('item_id', ri.item_id)
        .eq('type', 'in')
        .ilike('notes', `%${req.id}%`)
      // Fallback: correct stock directly
      const { data: cur } = await supabase.from('items').select('stock, stock_gading').eq('id', ri.item_id).single()
      if (cur) {
        await supabase.from('items').update({
          stock: Math.max(0, cur.stock - sentQty),
          stock_gading: cur.stock_gading + sentQty,
        }).eq('id', ri.item_id)
      }
    }
    await loadData()
    setActioning(null)
  }

  function copyLink() {
    const url = `${window.location.origin}/request-bsd`
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  const filtered = (filter === 'all' || filter === 'rekap') ? requests : requests.filter(r => r.status === filter)
  const counts = {
    all:      requests.length,
    pending:  requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    sent:     requests.filter(r => r.status === 'sent').length,
    received: requests.filter(r => r.status === 'received').length,
  }

  // Rekap pivot: rows = items, columns = dates, last col = total
  const rekapPivot = (() => {
    const relevant = requests.filter(r => {
      const dateKey = (r as any).received_at ?? r.request_date
      return r.status === 'received' && dateKey.slice(0, 7) === rekapMonth
    })
    if (relevant.length === 0) return null

    // Collect all unique dates (sorted) and all unique items (sorted by category+name)
    const dateSet = new Set<string>()
    const itemMap: Record<string, { item_id: string; name: string; category: string; unit: string; price: number }> = {}
    // cell[item_id][date] = total qty
    const cell: Record<string, Record<string, number>> = {}

    relevant.forEach(r => {
      const dateKey = ((r as any).received_at ?? r.request_date) as string
      dateSet.add(dateKey)
      ;(r.items ?? []).forEach(ri => {
        const qty = ri.quantity_sent ?? ri.quantity_requested
        const price = (ri.item as any)?.price_per_unit ?? 0
        if (!itemMap[ri.item_id]) {
          itemMap[ri.item_id] = { item_id: ri.item_id, name: ri.item?.name ?? '—', category: ri.item?.category ?? '—', unit: ri.item?.unit ?? '', price }
          cell[ri.item_id] = {}
        }
        cell[ri.item_id][dateKey] = (cell[ri.item_id][dateKey] ?? 0) + qty
      })
    })

    const dates = [...dateSet].sort()
    const items = Object.values(itemMap).sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))

    // day totals (nilai) per date
    const dayNilai: Record<string, number> = {}
    dates.forEach(d => {
      dayNilai[d] = items.reduce((s, it) => {
        const q = cell[it.item_id]?.[d] ?? 0
        return s + (it.price > 0 ? it.price * q : 0)
      }, 0)
    })
    const grandTotal = Object.values(dayNilai).reduce((s, v) => s + v, 0)

    return { dates, items, cell, dayNilai, grandTotal }
  })()

  return (
    <div className="min-h-screen">
      {/* Print overlay */}
      {printReq && <PrintView req={printReq} onClose={() => setPrintReq(null)} />}

      {/* Received date modal */}
      {receivingReq && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ backgroundColor: 'white', borderRadius: 16, width: '100%', maxWidth: 380, padding: 24, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 15, color: '#0E0E0E', marginBottom: 4 }}>Konfirmasi Diterima</div>
            <div style={{ fontSize: 12, color: '#6B6B6B', marginBottom: 20 }}>dari {receivingReq.requested_by} · request {receivingReq.request_date}</div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6B6B6B', marginBottom: 6 }}>Tanggal Diterima</label>
            <input
              type="date"
              value={receivedDate}
              onChange={e => setReceivedDate(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E8E8E6', backgroundColor: '#F8F8F6', fontSize: 14, color: '#0E0E0E', boxSizing: 'border-box' }}
            />
            <div className="flex gap-2 mt-5">
              <button onClick={() => setReceivingReq(null)}
                style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid #E8E8E6', backgroundColor: 'white', fontSize: 13, cursor: 'pointer', color: '#6B6B6B' }}>
                Batal
              </button>
              <button onClick={handleConfirmReceived} disabled={!receivedDate}
                style={{ flex: 2, padding: '10px', borderRadius: 10, border: 'none', backgroundColor: '#16A34A', color: 'white', fontSize: 13, fontWeight: 700, cursor: receivedDate ? 'pointer' : 'not-allowed', opacity: receivedDate ? 1 : 0.5 }}>
                ✓ Konfirmasi Diterima
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Approve Modal ── */}
      {editingReq && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ backgroundColor: 'white', borderRadius: 16, width: '100%', maxWidth: 580, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>

            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E8E8E6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 15, color: '#0E0E0E' }}>
                  {editMode === 'edit' ? '✏️ Koreksi Barang' : 'Tandai Dikirim — Qty Aktual'}
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
                {editMode === 'edit'
                  ? <>Koreksi daftar barang. <strong>Stok tidak berubah</strong> — gunakan tombol ✕ di baris item jika perlu reverse stok.</>
                  : <>Input qty <strong>aktual</strong> yang dikirim. Angka ini langsung masuk ke stok BSD.</>
                }
              </p>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 8 }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8F8F6' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', color: '#6B6B6B', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Barang</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', color: '#6B6B6B', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>Diminta</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', color: '#6B6B6B', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>Dikirim</th>
                    <th style={{ width: 32 }} />
                  </tr>
                </thead>
                <tbody>
                  {[...(editingReq.items ?? [])].sort((a, b) => {
                    const catA = a.item?.category ?? ''; const catB = b.item?.category ?? ''
                    return catA.localeCompare(catB) || (a.item?.name ?? '').localeCompare(b.item?.name ?? '')
                  }).map(ri => {
                    const isDeleted = editDeletedIds.has(ri.id)
                    const sent      = parseFloat(editQtys[ri.id] ?? String(ri.quantity_requested))
                    const changed   = !isNaN(sent) && sent !== ri.quantity_requested
                    return (
                      <tr key={ri.id} style={{ borderTop: '1px solid #F0F0EE', opacity: isDeleted ? 0.35 : 1 }}>
                        <td style={{ padding: '10px 12px', color: '#0E0E0E', fontWeight: 500, textDecoration: isDeleted ? 'line-through' : 'none' }}>
                          {ri.item?.name ?? '—'}
                          <span style={{ color: '#ABABAB', fontWeight: 400, marginLeft: 6, fontSize: 11 }}>{ri.item?.unit}</span>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right', color: '#ABABAB', fontSize: 13 }}>
                          {ri.quantity_requested}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <input
                            type="number" min="0" step="0.5"
                            disabled={isDeleted}
                            value={editQtys[ri.id] ?? String(ri.quantity_requested)}
                            onChange={e => setEditQtys(prev => ({ ...prev, [ri.id]: e.target.value }))}
                            style={{
                              width: 80, textAlign: 'right', padding: '5px 8px', fontSize: 13, fontWeight: 600,
                              color: changed ? '#2563EB' : '#0E0E0E',
                              border: `1px solid ${changed ? '#93C5FD' : '#E8E8E6'}`,
                              borderRadius: 6, outline: 'none',
                              backgroundColor: isDeleted ? '#F2F2F0' : changed ? '#EFF6FF' : '#F8F8F6',
                            }}
                          />
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                          <button
                            onClick={() => toggleDeleteItem(ri.id)}
                            title={isDeleted ? 'Batalkan hapus' : 'Hapus dari request'}
                            style={{ background: isDeleted ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${isDeleted ? '#BBF7D0' : '#FECACA'}`, borderRadius: 6, width: 26, height: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
                            {isDeleted ? '↩' : '✕'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}

                  {/* New items added */}
                  {editNewItems.map(ni => (
                    <tr key={ni.tempId} style={{ borderTop: '1px solid #F0F0EE', backgroundColor: '#F0FDF4' }}>
                      <td style={{ padding: '10px 12px', color: '#16A34A', fontWeight: 600, fontSize: 13 }}>
                        <span style={{ fontSize: 10, backgroundColor: '#BBF7D0', color: '#16A34A', borderRadius: 4, padding: '1px 5px', marginRight: 6, fontWeight: 700 }}>BARU</span>
                        {ni.name}
                        <span style={{ color: '#ABABAB', fontWeight: 400, marginLeft: 6, fontSize: 11 }}>{ni.unit}</span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: '#ABABAB', fontSize: 13 }}>—</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <input
                          type="number" min="0" step="0.5"
                          value={ni.qty}
                          onChange={e => setEditNewItems(prev => prev.map(x => x.tempId === ni.tempId ? { ...x, qty: e.target.value } : x))}
                          style={{ width: 80, textAlign: 'right', padding: '5px 8px', fontSize: 13, fontWeight: 600, color: '#16A34A', border: '1px solid #BBF7D0', borderRadius: 6, outline: 'none', backgroundColor: '#DCFCE7' }}
                        />
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                        <button onClick={() => removeNewItem(ni.tempId)}
                          style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, width: 26, height: 26, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Add item section */}
              {showAddItem ? (
                <div style={{ border: '1px solid #E8E8E6', borderRadius: 10, padding: 12, marginBottom: 16, backgroundColor: '#F8F8F6' }}>
                  <input
                    autoFocus
                    value={itemSearch}
                    onChange={e => setItemSearch(e.target.value)}
                    placeholder="Cari barang..."
                    style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid #E8E8E6', borderRadius: 8, outline: 'none', backgroundColor: '#fff', boxSizing: 'border-box', marginBottom: 8 }}
                  />
                  <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid #E8E8E6', borderRadius: 8, backgroundColor: '#fff' }}>
                    {allItems
                      .filter(it =>
                        it.name.toLowerCase().includes(itemSearch.toLowerCase()) &&
                        !(editingReq.items ?? []).some(ri => ri.item_id === it.id && !editDeletedIds.has(ri.id)) &&
                        !editNewItems.some(ni => ni.item_id === it.id)
                      )
                      .slice(0, 30)
                      .map(it => (
                        <div key={it.id} onClick={() => addNewItemRow(it)}
                          style={{ padding: '9px 12px', cursor: 'pointer', borderBottom: '1px solid #F5F5F3', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#EFF6FF')}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                          <span style={{ fontSize: 13, color: '#0E0E0E' }}>{it.name}</span>
                          <span style={{ fontSize: 11, color: '#6B6B6B', backgroundColor: '#F2F2F0', padding: '2px 6px', borderRadius: 4 }}>{it.unit} · {it.category}</span>
                        </div>
                      ))}
                  </div>
                  <button onClick={() => { setShowAddItem(false); setItemSearch('') }}
                    style={{ marginTop: 8, fontSize: 12, color: '#6B6B6B', background: 'none', border: 'none', cursor: 'pointer' }}>
                    Batal
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowAddItem(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', border: '1px dashed #E8E8E6', borderRadius: 8, backgroundColor: '#fff', fontSize: 12, fontWeight: 600, color: '#6B6B6B', cursor: 'pointer', marginBottom: 16 }}>
                  + Tambah Barang
                </button>
              )}

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
                {actioning ? 'Menyimpan...' : editMode === 'edit' ? '✓ Simpan Koreksi' : '🚚 Simpan & Tandai Dikirim'}
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
        {(['all', 'pending', 'sent', 'received'] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            style={{ borderBottom: filter === s ? '2px solid #D91C1C' : '2px solid transparent', color: filter === s ? '#D91C1C' : '#6B6B6B', fontWeight: filter === s ? 600 : 400, whiteSpace: 'nowrap' }}
            className="px-4 py-2.5 text-sm transition-colors flex items-center gap-1.5">
            {s === 'all' ? 'Semua' : STATUS_CONFIG[s].label}
            <span style={{ backgroundColor: '#F2F2F0', color: '#6B6B6B', borderRadius: 999, padding: '1px 7px', fontSize: 11 }}>{counts[s]}</span>
          </button>
        ))}
        <button onClick={() => setFilter('rekap')}
          style={{ borderBottom: filter === 'rekap' ? '2px solid #D91C1C' : '2px solid transparent', color: filter === 'rekap' ? '#D91C1C' : '#6B6B6B', fontWeight: filter === 'rekap' ? 600 : 400, whiteSpace: 'nowrap' }}
          className="px-4 py-2.5 text-sm transition-colors flex items-center gap-1.5">
          📊 Rekap Bulanan
        </button>
      </div>

      <div className="px-8 py-5">
        {/* ── Rekap Bulanan view ── */}
        {filter === 'rekap' ? (
          <div>
            {/* Month picker + summary stats */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 4 }}>Bulan</label>
                <input
                  type="month"
                  value={rekapMonth}
                  onChange={e => setRekapMonth(e.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid #E8E8E6', borderRadius: 10, fontSize: 14, color: '#0E0E0E', backgroundColor: '#fff', outline: 'none' }}
                />
              </div>
              {rekapPivot && (
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ backgroundColor: '#fff', border: '1px solid #E8E8E6', borderRadius: 10, padding: '10px 16px' }}>
                    <div style={{ fontSize: 11, color: '#6B6B6B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Hari</div>
                    <div style={{ fontSize: 20, fontFamily: "'Archivo Black', sans-serif", color: '#0E0E0E', marginTop: 2 }}>{rekapPivot.dates.length}</div>
                  </div>
                  <div style={{ backgroundColor: '#fff', border: '1px solid #E8E8E6', borderRadius: 10, padding: '10px 16px' }}>
                    <div style={{ fontSize: 11, color: '#6B6B6B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Jenis Barang</div>
                    <div style={{ fontSize: 20, fontFamily: "'Archivo Black', sans-serif", color: '#0E0E0E', marginTop: 2 }}>{rekapPivot.items.length}</div>
                  </div>
                  {rekapPivot.grandTotal > 0 && (
                    <div style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '10px 16px' }}>
                      <div style={{ fontSize: 11, color: '#B45309', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Est. Total Nilai</div>
                      <div style={{ fontSize: 20, fontFamily: "'Archivo Black', sans-serif", color: '#92400E', marginTop: 2 }}>{fmt(rekapPivot.grandTotal)}</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {!rekapPivot ? (
              <div style={{ backgroundColor: '#fff', border: '1px solid #E8E8E6', borderRadius: 14, padding: '48px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
                <p style={{ color: '#6B6B6B', fontSize: 14 }}>Tidak ada barang masuk di bulan ini.</p>
                <p style={{ color: '#ABABAB', fontSize: 12, marginTop: 4 }}>Hanya request dengan status "Dikirim" atau "Diterima" yang dihitung.</p>
              </div>
            ) : rekapView === 'grafik' ? (
              /* ── Grafik view ── */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Toggle back to tabel */}
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['tabel', 'grafik'] as const).map(v => (
                    <button key={v} onClick={() => setRekapView(v)}
                      style={{ padding: '6px 16px', borderRadius: 8, border: `1px solid ${rekapView === v ? '#D91C1C' : '#E8E8E6'}`, backgroundColor: rekapView === v ? '#FEF2F2' : '#fff', color: rekapView === v ? '#D91C1C' : '#6B6B6B', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      {v === 'tabel' ? '⊞ Tabel' : '📊 Grafik'}
                    </button>
                  ))}
                </div>

                {/* Chart 1: Nilai per hari */}
                <div style={{ backgroundColor: '#fff', border: '1px solid #E8E8E6', borderRadius: 14, padding: '20px 24px' }}>
                  <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 13, color: '#0E0E0E', marginBottom: 16 }}>Nilai Masuk per Hari</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={rekapPivot.dates.map(d => ({
                      label: new Date(d + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
                      nilai: rekapPivot.dayNilai[d] ?? 0,
                    }))} barSize={28}>
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6B6B6B' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#ABABAB' }} axisLine={false} tickLine={false}
                        tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}jt` : v >= 1000 ? `${(v/1000).toFixed(0)}rb` : String(v)} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #E8E8E6', borderRadius: 8, fontSize: 12 }}
                        formatter={(v) => [fmt(Number(v)), 'Est. Nilai']} />
                      <Bar dataKey="nilai" fill="#D91C1C" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {/* Chart 2: Top item by total qty */}
                  <div style={{ backgroundColor: '#fff', border: '1px solid #E8E8E6', borderRadius: 14, padding: '20px 24px' }}>
                    <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 13, color: '#0E0E0E', marginBottom: 16 }}>Top Item (Frekuensi Masuk)</div>
                    {(() => {
                      const topItems = rekapPivot.items
                        .map(it => ({
                          name: it.name.length > 18 ? it.name.slice(0, 16) + '…' : it.name,
                          count: rekapPivot.dates.filter(d => (rekapPivot.cell[it.item_id]?.[d] ?? 0) > 0).length,
                        }))
                        .sort((a, b) => b.count - a.count)
                        .slice(0, 8)
                      return (
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={topItems} layout="vertical" barSize={14}>
                            <XAxis type="number" tick={{ fontSize: 10, fill: '#ABABAB' }} axisLine={false} tickLine={false} />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#6B6B6B' }} axisLine={false} tickLine={false} width={110} />
                            <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #E8E8E6', borderRadius: 8, fontSize: 12 }}
                              formatter={(v) => [`${Number(v)}× masuk`, 'Frekuensi']} />
                            <Bar dataKey="count" fill="#2563EB" radius={[0, 4, 4, 0]}>
                              {topItems.map((_, i) => <Cell key={i} fill={i === 0 ? '#D91C1C' : i < 3 ? '#2563EB' : '#93C5FD'} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      )
                    })()}
                  </div>

                  {/* Chart 3: Nilai per kategori */}
                  <div style={{ backgroundColor: '#fff', border: '1px solid #E8E8E6', borderRadius: 14, padding: '20px 24px' }}>
                    <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 13, color: '#0E0E0E', marginBottom: 16 }}>Nilai per Kategori</div>
                    {(() => {
                      const catMap: Record<string, number> = {}
                      rekapPivot.items.forEach(it => {
                        const total = rekapPivot.dates.reduce((s, d) => {
                          const q = rekapPivot.cell[it.item_id]?.[d] ?? 0
                          return s + (it.price > 0 ? it.price * q : 0)
                        }, 0)
                        catMap[it.category] = (catMap[it.category] ?? 0) + total
                      })
                      const catData = Object.entries(catMap)
                        .filter(([, v]) => v > 0)
                        .sort((a, b) => b[1] - a[1])
                        .map(([name, nilai]) => ({ name, nilai }))
                      const COLORS = ['#D91C1C','#2563EB','#7C3AED','#16A34A','#D97706','#0891B2','#DB2777','#65A30D']
                      return catData.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#ABABAB', fontSize: 12, paddingTop: 40 }}>Belum ada data harga</div>
                      ) : (
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={catData} layout="vertical" barSize={14}>
                            <XAxis type="number" tick={{ fontSize: 10, fill: '#ABABAB' }} axisLine={false} tickLine={false}
                              tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}jt` : v >= 1000 ? `${(v/1000).toFixed(0)}rb` : String(v)} />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#6B6B6B' }} axisLine={false} tickLine={false} width={90} />
                            <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #E8E8E6', borderRadius: 8, fontSize: 12 }}
                              formatter={(v) => [fmt(Number(v)), 'Est. Nilai']} />
                            <Bar dataKey="nilai" radius={[0, 4, 4, 0]}>
                              {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      )
                    })()}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* View toggle */}
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['tabel', 'grafik'] as const).map(v => (
                    <button key={v} onClick={() => setRekapView(v)}
                      style={{ padding: '6px 16px', borderRadius: 8, border: `1px solid ${rekapView === v ? '#D91C1C' : '#E8E8E6'}`, backgroundColor: rekapView === v ? '#FEF2F2' : '#fff', color: rekapView === v ? '#D91C1C' : '#6B6B6B', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      {v === 'tabel' ? '⊞ Tabel' : '📊 Grafik'}
                    </button>
                  ))}
                </div>
              <div style={{ backgroundColor: '#fff', border: '1px solid #E8E8E6', borderRadius: 14, overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', fontSize: 13, minWidth: '100%' }}>
                  <thead>
                    {/* Date header row */}
                    <tr style={{ backgroundColor: '#F8F8F6' }}>
                      <th style={{ padding: '10px 16px', textAlign: 'left', color: '#6B6B6B', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', position: 'sticky', left: 0, backgroundColor: '#F8F8F6', zIndex: 1, borderRight: '2px solid #E8E8E6' }}>
                        Barang
                      </th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', color: '#6B6B6B', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', borderRight: '1px solid #E8E8E6' }}>
                        Sat.
                      </th>
                      {rekapPivot.dates.map(d => (
                        <th key={d} style={{ padding: '10px 12px', textAlign: 'right', color: '#6B6B6B', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', borderRight: '1px solid #F0F0EE', minWidth: 72 }}>
                          {new Date(d + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </th>
                      ))}
                      <th style={{ padding: '10px 14px', textAlign: 'right', color: '#0E0E0E', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', borderLeft: '2px solid #E8E8E6', backgroundColor: '#F0F0EE' }}>
                        TOTAL
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Category separators + item rows */}
                    {rekapPivot.items.map((item, idx) => {
                      const prevCat = idx > 0 ? rekapPivot.items[idx - 1].category : null
                      const rowTotal = rekapPivot.dates.reduce((s, d) => s + (rekapPivot.cell[item.item_id]?.[d] ?? 0), 0)
                      return (
                        <>
                          {item.category !== prevCat && (
                            <tr key={`cat-${item.category}`} style={{ backgroundColor: '#F8F8F6', borderTop: idx > 0 ? '2px solid #E8E8E6' : 'none' }}>
                              <td colSpan={rekapPivot.dates.length + 3} style={{ padding: '5px 16px', fontSize: 10, fontWeight: 700, color: '#ABABAB', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                {item.category}
                              </td>
                            </tr>
                          )}
                          <tr key={item.item_id} style={{ borderTop: '1px solid #F0F0EE' }}>
                            <td style={{ padding: '9px 16px', fontWeight: 500, color: '#0E0E0E', whiteSpace: 'nowrap', position: 'sticky', left: 0, backgroundColor: '#fff', zIndex: 1, borderRight: '2px solid #E8E8E6' }}>
                              {item.name}
                            </td>
                            <td style={{ padding: '9px 12px', color: '#ABABAB', fontSize: 12, whiteSpace: 'nowrap', borderRight: '1px solid #E8E8E6' }}>
                              {item.unit}
                            </td>
                            {rekapPivot.dates.map(d => {
                              const q = rekapPivot.cell[item.item_id]?.[d]
                              return (
                                <td key={d} style={{ padding: '9px 12px', textAlign: 'right', color: q ? '#0E0E0E' : '#E8E8E6', fontWeight: q ? 600 : 400, borderRight: '1px solid #F0F0EE' }}>
                                  {q ? new Intl.NumberFormat('id-ID').format(q) : '—'}
                                </td>
                              )
                            })}
                            <td style={{ padding: '9px 14px', textAlign: 'right', fontWeight: 700, color: '#0E0E0E', whiteSpace: 'nowrap', borderLeft: '2px solid #E8E8E6', backgroundColor: '#FAFAFA' }}>
                              {new Intl.NumberFormat('id-ID').format(rowTotal)} {item.unit}
                            </td>
                          </tr>
                        </>
                      )
                    })}
                  </tbody>
                  {/* Footer: nilai per day + grand total */}
                  {rekapPivot.grandTotal > 0 && (
                    <tfoot>
                      <tr style={{ borderTop: '2px solid #E8E8E6', backgroundColor: '#FFFBEB' }}>
                        <td style={{ padding: '10px 16px', fontSize: 12, fontFamily: "'Archivo Black', sans-serif", color: '#92400E', whiteSpace: 'nowrap', position: 'sticky', left: 0, backgroundColor: '#FFFBEB', zIndex: 1, borderRight: '2px solid #E8E8E6' }}>
                          Est. Nilai
                        </td>
                        <td style={{ borderRight: '1px solid #E8E8E6' }} />
                        {rekapPivot.dates.map(d => (
                          <td key={d} style={{ padding: '10px 12px', textAlign: 'right', fontSize: 12, fontWeight: 600, color: rekapPivot.dayNilai[d] > 0 ? '#92400E' : '#ABABAB', whiteSpace: 'nowrap', borderRight: '1px solid #F0F0EE' }}>
                            {rekapPivot.dayNilai[d] > 0 ? fmt(rekapPivot.dayNilai[d]) : '—'}
                          </td>
                        ))}
                        <td style={{ padding: '10px 14px', textAlign: 'right', fontSize: 13, fontFamily: "'Archivo Black', sans-serif", color: '#92400E', whiteSpace: 'nowrap', borderLeft: '2px solid #E8E8E6' }}>
                          {fmt(rekapPivot.grandTotal)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
              </div>
            )}
          </div>
        ) : loading ? (
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
                        {req.status === 'received' && (req as any).received_at && <span style={{ marginLeft: 6, color: '#16A34A', fontWeight: 600 }}>· diterima {(req as any).received_at}</span>}
                      </div>
                      {req.notes && <div style={{ color: '#ABABAB', fontSize: 12, marginTop: 2, fontStyle: 'italic' }}>"{req.notes}"</div>}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {req.status === 'pending' && (
                        <>
                          {/* Resend WA notification */}
                          {notifResult[req.id] === 'fail' ? (
                            <a
                              href="https://wa.me/6285121586715?text=halo"
                              target="_blank" rel="noreferrer"
                              onClick={e => e.stopPropagation()}
                              style={{ backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                              ⚠️ Gagal — Chat Bot dulu →
                            </a>
                          ) : (
                            <button
                              onClick={e => { e.stopPropagation(); handleResendNotif(req) }}
                              disabled={notifSending === req.id}
                              title="Kirim ulang notifikasi WA"
                              style={{ backgroundColor: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: notifSending === req.id ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                              {notifSending === req.id ? '⏳' : notifResult[req.id] === 'ok' ? '✓ Terkirim!' : '📲 Kirim Notif'}
                            </button>
                          )}
                          <button onClick={e => { e.stopPropagation(); openEditModal(req, 'send') }} disabled={isLoading}
                            style={{ backgroundColor: '#D91C1C', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer' }}>
                            {isLoading ? '...' : '🚚 Proses & Kirim'}
                          </button>
                        </>
                      )}
                      {req.status === 'approved' && (
                        <>
                          <PrintBtn />
                          {notifResult[req.id] === 'fail' ? (
                            <a
                              href="https://wa.me/6285121586715?text=halo"
                              target="_blank" rel="noreferrer"
                              onClick={e => e.stopPropagation()}
                              style={{ backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                              ⚠️ Gagal — Chat Bot dulu →
                            </a>
                          ) : (
                            <button
                              onClick={e => { e.stopPropagation(); handleResendNotif(req) }}
                              disabled={notifSending === req.id}
                              title="Kirim ulang notifikasi WA"
                              style={{ backgroundColor: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: notifSending === req.id ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                              {notifSending === req.id ? '⏳' : notifResult[req.id] === 'ok' ? '✓ Terkirim!' : '📲 Kirim Notif'}
                            </button>
                          )}
                          <button onClick={e => { e.stopPropagation(); openEditModal(req, 'send') }} disabled={isLoading}
                            style={{ backgroundColor: '#7C3AED', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                            {isLoading ? '...' : '🚚 Tandai Dikirim'}
                          </button>
                        </>
                      )}
                      {req.status === 'sent' && (
                        <>
                          <PrintBtn />
                          <button onClick={e => { e.stopPropagation(); openEditModal(req, 'edit') }} disabled={isLoading}
                            style={{ backgroundColor: '#7C3AED', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                            {isLoading ? '...' : '✏️ Edit'}
                          </button>
                          <button onClick={e => { e.stopPropagation(); setReceivedDate(new Date().toISOString().slice(0, 10)); setReceivingReq(req) }} disabled={isLoading}
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
                            {['Barang', 'Kategori', 'Diminta', 'Dikirim', 'Est. Nilai', ''].map(h => (
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
                                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                  <button
                                    onClick={e => { e.stopPropagation(); handleDeleteItem(req, ri) }}
                                    disabled={!!actioning}
                                    title="Hapus item ini dari request"
                                    style={{ background: 'none', border: '1px solid #FECACA', borderRadius: 6, color: '#DC2626', padding: '3px 7px', fontSize: 11, cursor: actioning ? 'not-allowed' : 'pointer', opacity: actioning ? 0.5 : 1, lineHeight: 1 }}>
                                    ✕
                                  </button>
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
