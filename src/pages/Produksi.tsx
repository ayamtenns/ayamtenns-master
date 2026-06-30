/**
 * /produksi — mobile form untuk catat produksi & distribusi ke cabang
 * Public route, no login required.
 */
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { notifyWA } from '../lib/notify'

const bg    = '#F5F4F1'
const white = '#FFFFFF'
const ink   = '#0E0E0E'
const muted = '#6B6B6B'
const bdr   = '#E8E8E6'
const green = '#16A34A'
const red   = '#D91C1C'
const amber = '#D97706'

interface ProdItem {
  item_id: string
  item_name: string
  unit: string
  stock_produksi: number
  stock: number
  stock_gading: number
  recipe_name: string
}

type QtyMap = Record<string, string>
type Tab = 'produksi' | 'distribusi'
type DistSource = 'Gudang' | 'BSD' | 'Gading'
type Target = 'BSD' | 'Gading'

function parseQty(val: string): number {
  return parseFloat((val ?? '0').replace(',', '.')) || 0
}

export default function Produksi() {
  const [searchParams] = useSearchParams()
  const canDist = searchParams.get('dist') === '1'
  const [items,      setItems]      = useState<ProdItem[]>([])
  const [tab,        setTab]        = useState<Tab>('produksi')
  const [qty,        setQty]        = useState<QtyMap>({})
  const [distQty,    setDistQty]    = useState<QtyMap>({})
  const [target,     setTarget]     = useState<Target>('BSD')
  const [distSource, setDistSource] = useState<DistSource>('Gudang')
  const [notes,      setNotes]      = useState('')
  const [loading,    setLoading]    = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [done,       setDone]       = useState<string>('')
  const [error,      setError]      = useState('')
  const [date,       setDate]       = useState(() => new Date().toISOString().slice(0, 10))
  const [distDate,   setDistDate]   = useState(() => new Date().toISOString().slice(0, 10))
  const [photoFiles,    setPhotoFiles]    = useState<[File | null, File | null]>([null, null])
  const [photoPreviews, setPhotoPreviews] = useState<[string | null, string | null]>([null, null])
  const [staffName,     setStaffName]     = useState('')

  useEffect(() => { loadItems() }, [])

  async function loadItems() {
    setLoading(true)
    // sub_recipes joined to output item for name/unit/stock_produksi
    const { data } = await supabase
      .from('sub_recipes')
      .select('name, output_item_id, items:output_item_id(id, name, unit, stock_produksi, stock, stock_gading)')
      .not('output_item_id', 'is', null)
      .order('name')

    if (data) {
      const mapped: ProdItem[] = data
        .filter((r: any) => r.items)
        .map((r: any) => ({
          item_id: r.items.id,
          item_name: r.items.name,
          unit: r.items.unit,
          stock_produksi: r.items.stock_produksi ?? 0,
          stock: r.items.stock ?? 0,
          stock_gading: r.items.stock_gading ?? 0,
          recipe_name: r.name,
        }))
      // deduplicate by item_id (in case multiple recipes for same item)
      const seen = new Set<string>()
      setItems(mapped.filter(i => { if (seen.has(i.item_id)) return false; seen.add(i.item_id); return true }))
    }
    setLoading(false)
  }

  function handlePhotoChange(idx: 0 | 1, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setPhotoFiles(p => { const n: [File|null,File|null] = [...p] as any; n[idx] = file; return n })
    if (file) {
      const url = URL.createObjectURL(file)
      setPhotoPreviews(p => { const n: [string|null,string|null] = [...p] as any; n[idx] = url; return n })
    } else {
      setPhotoPreviews(p => { const n: [string|null,string|null] = [...p] as any; n[idx] = null; return n })
    }
  }

  function clearPhoto(idx: 0 | 1) {
    setPhotoFiles(p => { const n: [File|null,File|null] = [...p] as any; n[idx] = null; return n })
    setPhotoPreviews(p => { const n: [string|null,string|null] = [...p] as any; n[idx] = null; return n })
  }

  function hasInput(map: QtyMap) {
    return Object.values(map).some(v => parseQty(v) > 0)
  }

  async function submitProduksi() {
    if (!staffName.trim()) { setError('Nama staff wajib diisi.'); return }
    if (!hasInput(qty)) { setError('Isi minimal 1 jumlah produksi.'); return }
    setSubmitting(true); setError('')
    try {
      // Upload foto invoice (max 2)
      async function uploadPhoto(file: File, suffix: string): Promise<string> {
        const ext = file.name.split('.').pop() ?? 'jpg'
        const path = `${date}-${Date.now()}-${suffix}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('invoice-photos')
          .upload(path, file, { contentType: file.type, upsert: false })
        if (upErr) throw upErr
        return supabase.storage.from('invoice-photos').getPublicUrl(path).data.publicUrl
      }

      const url1 = photoFiles[0] ? await uploadPhoto(photoFiles[0], '1') : null
      const url2 = photoFiles[1] ? await uploadPhoto(photoFiles[1], '2') : null

      for (const item of items) {
        const q = parseQty(qty[item.item_id] || '0')
        if (!q || q <= 0) continue
        const { error: e1 } = await supabase
          .from('items')
          .update({ stock_produksi: item.stock_produksi + q })
          .eq('id', item.item_id)
        if (e1) throw e1
        const { error: e2 } = await supabase
          .from('production_logs')
          .insert({ item_id: item.item_id, quantity: q, notes: notes || null, produced_at: date, photo_url: url1, photo_url_2: url2, staff_name: staffName || null })
        if (e2) throw e2
      }
      // Build WA notification
      const lines = items
        .filter(i => parseQty(qty[i.item_id] || '0') > 0)
        .map(i => `• ${i.item_name}: ${parseQty(qty[i.item_id])} ${i.unit}`)
      const who = staffName.trim() || 'Staff'
      notifyWA(`🏭 *Laporan Produksi*\n👤 ${who}\n📅 ${date}\n\n${lines.join('\n')}${notes ? `\n\n📝 ${notes}` : ''}`)

      await loadItems()
      setQty({})
      setNotes('')
      setStaffName('')
      clearPhoto(0); clearPhoto(1)
      setDone('Produksi berhasil dicatat!')
      setTimeout(() => setDone(''), 3000)
    } catch (e: any) {
      setError(e.message ?? 'Gagal simpan')
    }
    setSubmitting(false)
  }

  async function submitDistribusi() {
    if (!hasInput(distQty)) { setError('Isi minimal 1 jumlah distribusi.'); return }
    setSubmitting(true); setError('')
    const today = new Date().toISOString().slice(0, 10)
    const isBackdate = distDate < today
    // source→target field mapping
    const effectiveTarget = distSource === 'BSD' ? 'Gading' : distSource === 'Gading' ? 'BSD' : target
    const sourceField = distSource === 'Gudang' ? 'stock_produksi' : distSource === 'BSD' ? 'stock' : 'stock_gading'
    const targetField = effectiveTarget === 'BSD' ? 'stock' : 'stock_gading'
    try {
      for (const item of distributableItems) {
        const q = parseQty(distQty[item.item_id] || '0')
        if (!q || q <= 0) continue
        if (!isBackdate) {
          const { data: cur } = await supabase
            .from('items').select(`${sourceField}, ${targetField}`).eq('id', item.item_id).single()
          if (!cur) continue
          const { error: e } = await supabase
            .from('items')
            .update({
              [sourceField]: ((cur as any)[sourceField] ?? 0) - q,
              [targetField]: ((cur as any)[targetField] ?? 0) + q,
            })
            .eq('id', item.item_id)
          if (e) throw e
        }
        const { error: e2 } = await supabase
          .from('distribution_logs')
          .insert({ item_id: item.item_id, quantity: q, target: effectiveTarget, distributed_at: distDate })
        if (e2) throw e2
      }
      await loadItems()
      setDistQty({})
      setDone(`Distribusi ke ${effectiveTarget} berhasil!`)
      setTimeout(() => setDone(''), 3000)
    } catch (e: any) {
      setError(e.message ?? 'Gagal distribusi')
    }
    setSubmitting(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: muted }}>
      Memuat...
    </div>
  )

  const isBackdateMode = distDate < new Date().toISOString().slice(0, 10)
  const distributableItems = isBackdateMode ? items : items.filter(i => {
    const s = distSource === 'Gudang' ? i.stock_produksi : distSource === 'BSD' ? i.stock : i.stock_gading
    return parseFloat(s.toFixed(2)) > 0
  })

  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: 'system-ui, sans-serif', maxWidth: 480, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ background: ink, color: white, padding: '20px 20px 16px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Form Produksi</div>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8 }}>
          {(['produksi', ...(canDist ? ['distribusi'] : [])] as Tab[]).map(t => (
            <button key={t} onClick={() => { setTab(t); setError('') }}
              style={{
                flex: 1, padding: '8px 0', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer',
                background: tab === t ? white : 'rgba(255,255,255,0.15)',
                color: tab === t ? ink : white,
              }}>
              {t === 'produksi' ? '🧪 Catat Produksi' : '📦 Distribusi'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 16px 120px' }}>
        {done && (
          <div style={{ background: '#DCFCE7', color: green, padding: '12px 16px', borderRadius: 10, marginBottom: 16, fontWeight: 600 }}>
            ✓ {done}
          </div>
        )}
        {error && (
          <div style={{ background: '#FEE2E2', color: red, padding: '12px 16px', borderRadius: 10, marginBottom: 16, fontSize: 14 }}>
            {error}
          </div>
        )}

        {/* ── PRODUKSI TAB ── */}
        {tab === 'produksi' && (
          <>
            {/* Staff Name */}
            <div style={{ background: white, borderRadius: 12, padding: '14px 16px', marginBottom: 12, border: `1px solid ${bdr}` }}>
              <label style={{ fontSize: 13, color: muted, display: 'block', marginBottom: 4 }}>Nama Staff</label>
              <input value={staffName} onChange={e => setStaffName(e.target.value)}
                placeholder="Nama kamu..."
                style={{ width: '100%', border: 'none', fontSize: 16, fontWeight: 600, color: ink, background: 'transparent', outline: 'none', boxSizing: 'border-box' }} />
            </div>

            {/* Date */}
            <div style={{ background: white, borderRadius: 12, padding: '14px 16px', marginBottom: 12, border: `1px solid ${bdr}` }}>
              <label style={{ fontSize: 13, color: muted, display: 'block', marginBottom: 4 }}>Tanggal Produksi</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                style={{ width: '100%', border: 'none', fontSize: 16, fontWeight: 600, color: ink, background: 'transparent', outline: 'none' }} />
            </div>

            {/* Items */}
            {items.map(item => (
              <div key={item.item_id} style={{ background: white, borderRadius: 12, padding: '14px 16px', marginBottom: 10, border: `1px solid ${bdr}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: ink }}>{item.item_name}</div>
                    <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>{item.recipe_name}</div>
                  </div>
                </div>
                {/* Qty input with +/- */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={() => setQty(p => ({ ...p, [item.item_id]: String(Math.max(0, (parseQty(p[item.item_id] || '0') - 1))) }))}
                    style={{ width: 44, height: 44, borderRadius: 10, border: `1px solid ${bdr}`, background: bg, fontSize: 20, cursor: 'pointer', color: ink }}>−</button>
                  <input
                    type="text" inputMode="decimal"
                    value={qty[item.item_id] ?? ''}
                    placeholder="0"
                    onChange={e => setQty(p => ({ ...p, [item.item_id]: e.target.value }))}
                    style={{ flex: 1, height: 44, border: `1px solid ${bdr}`, borderRadius: 10, textAlign: 'center', fontSize: 18, fontWeight: 700, color: ink, background: bg, outline: 'none' }}
                  />
                  <button onClick={() => setQty(p => ({ ...p, [item.item_id]: String((parseQty(p[item.item_id] || '0') + 1)) }))}
                    style={{ width: 44, height: 44, borderRadius: 10, border: `1px solid ${bdr}`, background: bg, fontSize: 20, cursor: 'pointer', color: ink }}>+</button>
                  <div style={{ width: 40, fontSize: 13, color: muted, textAlign: 'right' }}>{item.unit}</div>
                </div>
              </div>
            ))}

            {/* Foto Invoice */}
            <div style={{ background: white, borderRadius: 12, padding: '14px 16px', marginBottom: 12, border: `1px solid ${bdr}` }}>
              <label style={{ fontSize: 13, color: muted, display: 'block', marginBottom: 10 }}>Foto Invoice (max 2)</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {([0, 1] as const).map(idx => (
                  <div key={idx}>
                    {photoPreviews[idx] ? (
                      <div style={{ position: 'relative' }}>
                        <img src={photoPreviews[idx]!} alt={`foto ${idx + 1}`}
                          style={{ width: '100%', aspectRatio: '1', borderRadius: 8, objectFit: 'cover', display: 'block', border: `1px solid ${bdr}` }} />
                        <button onClick={() => clearPhoto(idx)}
                          style={{ position: 'absolute', top: 5, right: 5, width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,0,0,0.65)', color: white, border: 'none', fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                          ×
                        </button>
                      </div>
                    ) : (
                      <label style={{ display: 'block', cursor: 'pointer' }}>
                        <input type="file" accept="image/*"
                          onChange={e => handlePhotoChange(idx, e)}
                          style={{ display: 'none' }} />
                        <div style={{ border: `2px dashed ${bdr}`, borderRadius: 10, aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: bg, gap: 4 }}>
                          <div style={{ fontSize: 24 }}>📷</div>
                          <div style={{ fontSize: 11, color: muted, textAlign: 'center' }}>Foto {idx + 1}</div>
                        </div>
                      </label>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div style={{ background: white, borderRadius: 12, padding: '14px 16px', marginBottom: 16, border: `1px solid ${bdr}` }}>
              <label style={{ fontSize: 13, color: muted, display: 'block', marginBottom: 4 }}>Catatan (opsional)</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                placeholder="Misal: batch pagi, rasa lebih pekat..."
                style={{ width: '100%', border: 'none', resize: 'none', fontSize: 14, color: ink, background: 'transparent', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </>
        )}

        {/* ── DISTRIBUSI TAB ── */}
        {tab === 'distribusi' && (
          <>
            {/* Date */}
            <div style={{ background: white, borderRadius: 12, padding: '14px 16px', marginBottom: 12, border: `1px solid ${bdr}` }}>
              <label style={{ fontSize: 13, color: muted, display: 'block', marginBottom: 4 }}>Tanggal Distribusi</label>
              <input type="date" value={distDate} onChange={e => setDistDate(e.target.value)}
                style={{ width: '100%', border: 'none', fontSize: 16, fontWeight: 600, color: ink, background: 'transparent', outline: 'none' }} />
              {distDate < new Date().toISOString().slice(0, 10) && (
                <div style={{ marginTop: 6, fontSize: 12, color: amber, fontWeight: 600 }}>
                  ⚠ Backdate — stok produksi tidak akan diubah, hanya dicatat di log.
                </div>
              )}
            </div>

            {/* Source + Target */}
            <div style={{ background: white, borderRadius: 12, padding: '14px 16px', marginBottom: 12, border: `1px solid ${bdr}` }}>
              <div style={{ fontSize: 13, color: muted, marginBottom: 10 }}>Dari:</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                {(['Gudang', 'BSD', 'Gading'] as DistSource[]).map(s => (
                  <button key={s} onClick={() => { setDistSource(s); setDistQty({}) }}
                    style={{
                      flex: 1, padding: '8px 0', border: `2px solid ${distSource === s ? ink : bdr}`,
                      borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer',
                      background: distSource === s ? ink : white,
                      color: distSource === s ? white : ink,
                    }}>
                    {s === 'Gudang' ? '🏭 Gudang' : s}
                  </button>
                ))}
              </div>
              {distSource === 'Gudang' && (
                <>
                  <div style={{ fontSize: 13, color: muted, marginBottom: 10 }}>Ke:</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['BSD', 'Gading'] as Target[]).map(t => (
                      <button key={t} onClick={() => setTarget(t)}
                        style={{
                          flex: 1, padding: '8px 0', border: `2px solid ${target === t ? ink : bdr}`,
                          borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer',
                          background: target === t ? ink : white,
                          color: target === t ? white : ink,
                        }}>
                        {t}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {distSource !== 'Gudang' && (
                <div style={{ fontSize: 13, color: muted }}>
                  Ke: <strong style={{ color: ink }}>{distSource === 'BSD' ? 'Gading' : 'BSD'}</strong>
                </div>
              )}
            </div>

            {distributableItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: muted }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📦</div>
                <div>Belum ada stok di {distSource === 'Gudang' ? 'Gudang Produksi' : distSource}.</div>
                {distSource === 'Gudang' && <div style={{ fontSize: 13, marginTop: 4 }}>Catat produksi dulu di tab sebelah.</div>}
              </div>
            ) : (
              distributableItems.map(item => {
                const srcStock = distSource === 'Gudang' ? item.stock_produksi : distSource === 'BSD' ? item.stock : item.stock_gading
                const curQty = parseQty(distQty[item.item_id] || '0')
                const overStock = curQty > srcStock
                return (
                <div key={item.item_id} style={{ background: white, borderRadius: 12, padding: '14px 16px', marginBottom: 10, border: `1px solid ${overStock ? amber : bdr}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ fontWeight: 700, fontSize: 16, color: ink }}>{item.item_name}</div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, color: muted }}>Tersedia ({distSource === 'Gudang' ? 'Gudang' : distSource})</div>
                      <button onClick={() => setDistQty(p => ({ ...p, [item.item_id]: String(srcStock) }))}
                        style={{ fontWeight: 700, color: amber, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>
                        {parseFloat(srcStock.toFixed(2))} {item.unit} · Max
                      </button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button onClick={() => setDistQty(p => ({ ...p, [item.item_id]: String(Math.max(0, (parseQty(p[item.item_id] || '0') - 1))) }))}
                      style={{ width: 44, height: 44, borderRadius: 10, border: `1px solid ${bdr}`, background: bg, fontSize: 20, cursor: 'pointer', color: ink }}>−</button>
                    <input
                      type="text" inputMode="decimal"
                      value={distQty[item.item_id] ?? ''}
                      placeholder="0"
                      onChange={e => setDistQty(p => ({ ...p, [item.item_id]: e.target.value }))}
                      style={{ flex: 1, height: 44, border: `1px solid ${overStock ? amber : bdr}`, borderRadius: 10, textAlign: 'center', fontSize: 18, fontWeight: 700, color: ink, background: bg, outline: 'none' }}
                    />
                    <button onClick={() => setDistQty(p => ({ ...p, [item.item_id]: String((parseQty(p[item.item_id] || '0') + 1)) }))}
                      style={{ width: 44, height: 44, borderRadius: 10, border: `1px solid ${bdr}`, background: bg, fontSize: 20, cursor: 'pointer', color: ink }}>+</button>
                    <div style={{ width: 40, fontSize: 13, color: muted, textAlign: 'right' }}>{item.unit}</div>
                  </div>
                  {overStock && (
                    <div style={{ marginTop: 8, fontSize: 12, color: amber, fontWeight: 600 }}>
                      ⚠ Melebihi stok tersedia ({parseFloat(srcStock.toFixed(2))} {item.unit}) — stok akan jadi minus.
                    </div>
                  )}
                </div>
                )
              })
            )}
          </>
        )}
      </div>

      {/* Sticky footer button */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, padding: '12px 16px', background: bg, borderTop: `1px solid ${bdr}` }}>
        {tab === 'produksi' ? (
          <button onClick={submitProduksi} disabled={submitting}
            style={{ width: '100%', padding: '16px 0', borderRadius: 12, border: 'none', background: submitting ? muted : green, color: white, fontSize: 17, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer' }}>
            {submitting ? 'Menyimpan...' : '✓ Simpan Produksi'}
          </button>
        ) : (
          <button onClick={submitDistribusi} disabled={submitting || distributableItems.length === 0}
            style={{ width: '100%', padding: '16px 0', borderRadius: 12, border: 'none', background: submitting || distributableItems.length === 0 ? muted : ink, color: white, fontSize: 17, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer' }}>
            {submitting ? 'Memproses...' : `📦 ${distSource} → ${distSource === 'BSD' ? 'Gading' : distSource === 'Gading' ? 'BSD' : target}`}
          </button>
        )}
      </div>
    </div>
  )
}
