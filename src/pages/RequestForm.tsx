/**
 * /request — halaman publik untuk staff BSD
 * Tidak perlu login. Mobile-first, ringan.
 */
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { notifyWA } from '../lib/notify'
import type { Item } from '../lib/types'

type QtyMap = Record<string, string> // item_id → qty string

const bg    = '#F5F4F1'
const white = '#FFFFFF'
const red   = '#D91C1C'
const ink   = '#0E0E0E'
const muted = '#6B6B6B'
const bdr   = '#E8E8E6'

export default function RequestForm() {
  const [items, setItems]       = useState<Item[]>([])
  const [qtys, setQtys]         = useState<QtyMap>({})
  const [name, setName]         = useState('')
  const [requestDate, setRequestDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes]       = useState('')
  const [loading, setLoading]   = useState(true)
  const [submitting, setSub]    = useState(false)
  const [done, setDone]         = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    supabase.from('items').select('*').neq('category', 'Bahan Baku').order('category').order('name')
      .then(({ data }) => { setItems(data ?? []); setLoading(false) })
  }, [])

  const categories = [...new Set(items.map(i => i.category))]

  function setQty(id: string, val: string) {
    setQtys(prev => ({ ...prev, [id]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Nama wajib diisi.'); return }
    const requested = items.filter(i => parseFloat(qtys[i.id] || '0') > 0)
    if (requested.length === 0) { setError('Pilih minimal 1 barang.'); return }

    setSub(true); setError('')
    try {
      const { data: req, error: e1 } = await supabase
        .from('transfer_requests')
        .insert({ requested_by: name.trim(), notes: notes.trim(), request_date: requestDate })
        .select('id').single()
      if (e1) throw e1

      const { error: e2 } = await supabase.from('transfer_request_items').insert(
        requested.map(i => ({
          request_id: req.id,
          item_id: i.id,
          quantity_requested: parseFloat(qtys[i.id]),
        }))
      )
      if (e2) throw e2

      // Notify supervisor via WA (fire & forget)
      const itemLines = requested
        .map(i => `• ${i.name}: ${qtys[i.id]} ${i.unit}`)
        .join('\n')
      notifyWA(
        `📦 *Permintaan Barang Baru*\n\nDari: ${name.trim()}\nUntuk tanggal: ${new Date(requestDate + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}\n\n${itemLines}${notes.trim() ? `\n\nCatatan: ${notes.trim()}` : ''}\n\n_Cek & approve di sistem AYAMTENNS._`
      )

      setDone(true)
    } catch (err: any) {
      setError(err.message ?? 'Gagal mengirim request.')
    } finally {
      setSub(false)
    }
  }

  // ── Success state ─────────────────────────────────────────────────────────
  if (done) {
    return (
      <div style={{ backgroundColor: bg, minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ backgroundColor: white, borderRadius: 16, padding: 32, textAlign: 'center', maxWidth: 360, width: '100%' }}>
          <div style={{ fontSize: 48 }}>✅</div>
          <h2 style={{ fontFamily: "'Archivo Black', sans-serif", color: ink, fontSize: 20, margin: '16px 0 8px' }}>
            Request Terkirim!
          </h2>
          <p style={{ color: muted, fontSize: 14, lineHeight: 1.6 }}>
            Permintaan barang sudah dikirim ke supervisor.<br />Barang akan disiapkan secepatnya.
          </p>
          <button onClick={() => { setDone(false); setQtys({}); setName(''); setNotes(''); setRequestDate(new Date().toISOString().slice(0, 10)) }}
            style={{ marginTop: 24, backgroundColor: red, color: white, border: 'none', borderRadius: 12, padding: '12px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer', width: '100%' }}>
            Buat Request Baru
          </button>
        </div>
      </div>
    )
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ backgroundColor: bg, minHeight: '100svh', paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ backgroundColor: ink, padding: '20px 20px 16px' }}>
        <div style={{ fontFamily: "'Archivo Black', sans-serif", color: red, fontSize: 18, letterSpacing: '0.06em' }}>
          AYAMTENNS
        </div>
        <div style={{ color: '#5A5A5A', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>
          Request Bahan — BSD
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ padding: '16px 16px 0' }}>
        {/* Nama */}
        <div style={{ backgroundColor: white, borderRadius: 12, padding: 16, marginBottom: 12, border: `1px solid ${bdr}` }}>
          <label style={{ color: muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
            Nama Kamu *
          </label>
          <input
            value={name} onChange={e => setName(e.target.value)}
            placeholder="contoh: Budi"
            style={{ display: 'block', width: '100%', marginTop: 8, padding: '10px 0', fontSize: 16, border: 'none', outline: 'none', backgroundColor: 'transparent', color: ink, borderBottom: `2px solid ${bdr}`, boxSizing: 'border-box' }}
          />
        </div>

        {/* Tanggal Request */}
        <div style={{ backgroundColor: white, borderRadius: 12, padding: 16, marginBottom: 12, border: `1px solid ${bdr}` }}>
          <label style={{ color: muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
            Barang Dibutuhkan Tanggal *
          </label>
          <input
            type="date"
            value={requestDate}
            onChange={e => setRequestDate(e.target.value)}
            style={{ display: 'block', width: '100%', marginTop: 8, padding: '10px 0', fontSize: 16, border: 'none', outline: 'none', backgroundColor: 'transparent', color: ink, borderBottom: `2px solid ${bdr}`, boxSizing: 'border-box' }}
          />
        </div>

        {/* Items */}
        <div style={{ backgroundColor: white, borderRadius: 12, border: `1px solid ${bdr}`, marginBottom: 12, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${bdr}` }}>
            <span style={{ fontFamily: "'Archivo Black', sans-serif", color: ink, fontSize: 13 }}>
              Pilih Barang yang Dibutuhkan
            </span>
            <span style={{ color: muted, fontSize: 12, marginLeft: 8 }}>isi 0 = tidak butuh</span>
          </div>

          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: muted, fontSize: 14 }}>Memuat daftar barang...</div>
          ) : (
            categories.map(cat => (
              <div key={cat}>
                {/* Category header */}
                <div style={{ padding: '8px 16px', backgroundColor: '#F8F8F6', borderTop: `1px solid ${bdr}` }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {cat}
                  </span>
                </div>
                {/* Items in category */}
                {items.filter(i => i.category === cat).map((item, idx) => (
                  <div key={item.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderTop: idx === 0 ? 'none' : `1px solid #F0F0EE`,
                    backgroundColor: parseFloat(qtys[item.id] || '0') > 0 ? '#FFF8F8' : white,
                  }}>
                    <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                      <div style={{ color: ink, fontSize: 14, fontWeight: 500 }}>{item.name}</div>
                      <div style={{ color: muted, fontSize: 12, marginTop: 1 }}>
                        {item.unit}
                        {item.par_order_qty > 0 && (
                          <span style={{ color: '#2563EB', marginLeft: 6, fontWeight: 600 }}>
                            · biasanya {item.par_order_qty} {item.unit}
                          </span>
                        )}
                      </div>
                      {item.notes && (
                        <div style={{ color: '#ABABAB', fontSize: 11, marginTop: 3, lineHeight: 1.4 }}>
                          {item.notes}
                        </div>
                      )}
                    </div>
                    {/* Qty input with +/- */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <button type="button"
                        onClick={() => setQty(item.id, String(Math.max(0, (parseFloat(qtys[item.id] || '0') - 1))))}
                        style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${bdr}`, backgroundColor: '#F2F2F0', color: ink, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        −
                      </button>
                      <input
                        type="number" min="0" step="0.5"
                        value={qtys[item.id] || '0'}
                        onFocus={e => e.target.select()}
                        onChange={e => setQty(item.id, e.target.value)}
                        style={{ width: 52, textAlign: 'center', padding: '6px 4px', fontSize: 15, fontWeight: 600, color: ink, border: `1px solid ${bdr}`, borderRadius: 8, backgroundColor: '#F8F8F6', outline: 'none' }}
                      />
                      <button type="button"
                        onClick={() => setQty(item.id, String((parseFloat(qtys[item.id] || '0') + 1)))}
                        style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${red}`, backgroundColor: red, color: white, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Notes */}
        <div style={{ backgroundColor: white, borderRadius: 12, padding: 16, marginBottom: 12, border: `1px solid ${bdr}` }}>
          <label style={{ color: muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
            Catatan (opsional)
          </label>
          <textarea
            value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="misal: tolong prioritasin ayam tender..."
            rows={3}
            style={{ display: 'block', width: '100%', marginTop: 8, padding: '8px 0', fontSize: 14, border: 'none', outline: 'none', backgroundColor: 'transparent', color: ink, resize: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Summary */}
        {Object.values(qtys).some(v => parseFloat(v) > 0) && (
          <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 12, padding: '10px 16px', marginBottom: 12 }}>
            <span style={{ color: '#16A34A', fontSize: 13, fontWeight: 600 }}>
              {items.filter(i => parseFloat(qtys[i.id] || '0') > 0).length} barang dipilih
            </span>
          </div>
        )}

        {error && (
          <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '10px 16px', marginBottom: 12 }}>
            <span style={{ color: '#DC2626', fontSize: 13 }}>{error}</span>
          </div>
        )}

        <button type="submit" disabled={submitting}
          style={{ width: '100%', backgroundColor: submitting ? '#ABABAB' : red, color: white, border: 'none', borderRadius: 14, padding: '16px', fontSize: 16, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: "'Archivo Black', sans-serif", letterSpacing: '0.04em' }}>
          {submitting ? 'Mengirim...' : 'Kirim Request →'}
        </button>
      </form>
    </div>
  )
}
