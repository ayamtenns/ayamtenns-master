/**
 * /opname-bsd dan /opname-gading
 * Form publik untuk staff isi stok aktual saat stock opname.
 * Mobile-first, tidak perlu login.
 */
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { notifyWA } from '../lib/notify'
import type { Item } from '../lib/types'

type QtyMap = Record<string, string>

const bg    = '#F5F4F1'
const white = '#FFFFFF'
const red   = '#D91C1C'
const ink   = '#0E0E0E'
const muted = '#6B6B6B'
const bdr   = '#E8E8E6'
const green = '#16A34A'

interface OpnameFormProps { branch: 'BSD' | 'Gading' }

export default function OpnameForm({ branch }: OpnameFormProps) {
  const [items,       setItems]   = useState<Item[]>([])
  const [actuals,     setActuals] = useState<QtyMap>({})
  const [name,        setName]    = useState('')
  const [notes,       setNotes]   = useState('')
  const [loading,     setLoading] = useState(true)
  const [submitting,  setSub]     = useState(false)
  const [done,        setDone]    = useState(false)
  const [error,       setError]   = useState('')

  useEffect(() => {
    supabase.from('items').select('*').order('category').order('name')
      .then(({ data }) => { setItems(data ?? []); setLoading(false) })
  }, [])

  const categories = [...new Set(items.map(i => i.category))]

  function setActual(id: string, val: string) {
    setActuals(prev => ({ ...prev, [id]: val }))
  }

  function sysStock(item: Item): number {
    return branch === 'BSD' ? item.stock : (item.stock_gading ?? 0)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Nama wajib diisi.'); return }

    // All items must be filled
    const unfilled = items.filter(i => actuals[i.id] === undefined || actuals[i.id] === '')
    if (unfilled.length > 0) {
      setError(`Isi semua item dulu (${unfilled.length} item belum diisi). Kalau stok 0, tulis 0.`)
      return
    }

    setSub(true); setError('')
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data: opname, error: e1 } = await supabase
        .from('stock_opnames')
        .insert({ date: today, branch, submitted_by: name.trim(), notes: notes.trim(), status: 'pending' })
        .select('id').single()
      if (e1) throw e1

      const opnameItems = items.map(item => ({
        opname_id:    opname.id,
        item_id:      item.id,
        system_stock: sysStock(item),
        actual_count: parseFloat(actuals[item.id] ?? '0'),
      }))
      const { error: e2 } = await supabase.from('stock_opname_items').insert(opnameItems)
      if (e2) throw e2

      // Notify admin
      const diffs = items.filter(i => {
        const actual = parseFloat(actuals[i.id] ?? '0')
        const sys    = sysStock(i)
        return Math.abs(actual - sys) > 0
      })
      const diffLines = diffs.slice(0, 8)
        .map(i => {
          const a = parseFloat(actuals[i.id])
          const s = sysStock(i)
          const diff = a - s
          return `• ${i.name}: ${s} → ${a} (${diff > 0 ? '+' : ''}${diff})`
        }).join('\n')

      notifyWA(
        `📋 *Stock Opname ${branch}*\n\nOleh: ${name.trim()}\nTanggal: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}\n\n${diffs.length} item ada selisih:\n${diffLines}${diffs.length > 8 ? `\n+${diffs.length - 8} lainnya` : ''}\n\n_Review & commit di dashboard._`
      )

      setDone(true)
    } catch (err: any) {
      setError(err.message ?? 'Gagal mengirim.')
    } finally {
      setSub(false)
    }
  }

  if (done) {
    return (
      <div style={{ backgroundColor: bg, minHeight: '100svh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ backgroundColor: white, borderRadius: 16, padding: 32, textAlign: 'center', maxWidth: 360, width: '100%' }}>
          <div style={{ fontSize: 48 }}>✅</div>
          <h2 style={{ fontFamily: "'Archivo Black', sans-serif", color: ink, fontSize: 20, margin: '16px 0 8px' }}>
            Opname Terkirim!
          </h2>
          <p style={{ color: muted, fontSize: 14, lineHeight: 1.6 }}>
            Data stok opname {branch} sudah dikirim ke supervisor untuk di-review dan di-commit.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: bg, minHeight: '100svh', paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ backgroundColor: ink, padding: '20px 20px 16px' }}>
        <div style={{ fontFamily: "'Archivo Black', sans-serif", color: red, fontSize: 18, letterSpacing: '0.06em' }}>
          AYAMTENNS
        </div>
        <div style={{ color: '#5A5A5A', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>
          Stock Opname — {branch}
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ padding: '16px 16px 0' }}>
        {/* Info */}
        <div style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: '10px 16px', marginBottom: 12 }}>
          <p style={{ color: '#1D4ED8', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
            Isi jumlah stok <strong>aktual</strong> yang ada di lokasi sekarang. Kalau 0, tulis 0. Semua item wajib diisi.
          </p>
        </div>

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

        {/* Items */}
        <div style={{ backgroundColor: white, borderRadius: 12, border: `1px solid ${bdr}`, marginBottom: 12, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${bdr}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: "'Archivo Black', sans-serif", color: ink, fontSize: 13 }}>
              Stok Aktual
            </span>
            <span style={{ color: muted, fontSize: 12 }}>Sistem → Aktual</span>
          </div>

          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: muted, fontSize: 14 }}>Memuat daftar barang...</div>
          ) : (
            categories.map(cat => (
              <div key={cat}>
                <div style={{ padding: '8px 16px', backgroundColor: '#F8F8F6', borderTop: `1px solid ${bdr}` }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {cat}
                  </span>
                </div>
                {items.filter(i => i.category === cat).map((item, idx) => {
                  const sys    = sysStock(item)
                  const actual = actuals[item.id]
                  const filled = actual !== undefined && actual !== ''
                  const diff   = filled ? parseFloat(actual) - sys : null
                  const hasDiff = diff !== null && Math.abs(diff) > 0

                  return (
                    <div key={item.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderTop: idx === 0 ? 'none' : `1px solid #F0F0EE`,
                      backgroundColor: hasDiff ? '#FFF8F0' : filled ? '#F0FDF4' : white,
                    }}>
                      <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                        <div style={{ color: ink, fontSize: 14, fontWeight: 500 }}>{item.name}</div>
                        <div style={{ color: muted, fontSize: 12, marginTop: 1 }}>
                          Sistem: <strong>{sys}</strong> {item.unit}
                          {hasDiff && diff !== null && (
                            <span style={{ marginLeft: 6, fontWeight: 700, color: diff > 0 ? green : red }}>
                              ({diff > 0 ? '+' : ''}{diff})
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <button type="button"
                          onClick={() => setActual(item.id, String(Math.max(0, parseFloat(actuals[item.id] || '0') - 1)))}
                          style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${bdr}`, backgroundColor: '#F2F2F0', color: ink, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          −
                        </button>
                        <input
                          type="number" min="0" step="0.5"
                          value={actuals[item.id] ?? ''}
                          placeholder="—"
                          onFocus={e => e.target.select()}
                          onChange={e => setActual(item.id, e.target.value)}
                          style={{ width: 60, textAlign: 'center', padding: '6px 4px', fontSize: 15, fontWeight: 600, color: ink, border: `1px solid ${filled ? (hasDiff ? '#FED7AA' : '#BBF7D0') : bdr}`, borderRadius: 8, backgroundColor: '#F8F8F6', outline: 'none' }}
                        />
                        <button type="button"
                          onClick={() => setActual(item.id, String(parseFloat(actuals[item.id] || '0') + 1))}
                          style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${red}`, backgroundColor: red, color: white, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          +
                        </button>
                      </div>
                    </div>
                  )
                })}
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
            placeholder="misal: ada barang yang baru datang tadi sore..."
            rows={3}
            style={{ display: 'block', width: '100%', marginTop: 8, padding: '8px 0', fontSize: 14, border: 'none', outline: 'none', backgroundColor: 'transparent', color: ink, resize: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {error && (
          <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '10px 16px', marginBottom: 12 }}>
            <span style={{ color: '#DC2626', fontSize: 13 }}>{error}</span>
          </div>
        )}

        <button type="submit" disabled={submitting}
          style={{ width: '100%', backgroundColor: submitting ? '#ABABAB' : red, color: white, border: 'none', borderRadius: 14, padding: '16px', fontSize: 16, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: "'Archivo Black', sans-serif", letterSpacing: '0.04em' }}>
          {submitting ? 'Mengirim...' : 'Kirim Hasil Opname →'}
        </button>
      </form>
    </div>
  )
}
