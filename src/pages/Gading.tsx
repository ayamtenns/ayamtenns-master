import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Item, GadingProduction, GadingMaterial } from '../lib/types'
import PageHeader from '../components/PageHeader'
import { Plus, ChevronDown, ChevronUp, AlertCircle, Factory, ArrowDownToLine, ArrowUpFromLine, X, Package } from 'lucide-react'

type Tab     = 'stok' | 'bahan' | 'riwayat'
type QtyMap  = Record<string, string>

const ink   = '#0E0E0E'
const muted = '#6B6B6B'
const bdr   = '#E8E8E6'
const white = '#FFFFFF'

// ── helpers ───────────────────────────────────────────────────────────────────
function TabBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 20px', fontSize: 13, fontWeight: active ? 600 : 400, cursor: 'pointer',
      border: 'none', background: 'none',
      borderBottom: active ? '2px solid #16A34A' : '2px solid transparent',
      color: active ? '#16A34A' : muted,
    }}>{label}</button>
  )
}

// ── Modal: Tambah Stok Jadi ───────────────────────────────────────────────────
function TambahStokModal({ items, onClose, onSaved }: { items: Item[]; onClose: () => void; onSaved: () => void }) {
  const [type, setType]     = useState<'produksi' | 'supplier'>('produksi')
  const [date, setDate]     = useState(new Date().toISOString().split('T')[0])
  const [qtys, setQtys]     = useState<QtyMap>({})
  const [notes, setNotes]   = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  // Filter items berdasarkan tipe yang dipilih
  const visibleItems = items.filter(i => i.gading_source === type)
  const categories   = [...new Set(visibleItems.map(i => i.category))]
  const produced     = visibleItems.filter(i => parseFloat(qtys[i.id] || '0') > 0)

  function setQty(id: string, val: string) { setQtys(p => ({ ...p, [id]: val })) }

  async function handleSave() {
    if (produced.length === 0) { setError('Isi minimal 1 item.'); return }
    setSaving(true); setError('')
    try {
      const { data: prod, error: e1 } = await supabase
        .from('gading_productions')
        .insert({ date, notes: notes.trim(), type })
        .select('id').single()
      if (e1) throw e1

      const { error: e2 } = await supabase.from('gading_production_items').insert(
        produced.map(i => ({ production_id: prod.id, item_id: i.id, quantity: parseFloat(qtys[i.id]) }))
      )
      if (e2) throw e2

      for (const item of produced) {
        const qty = parseFloat(qtys[item.id])
        const { data: cur } = await supabase.from('items').select('stock_gading').eq('id', item.id).single()
        if (cur) await supabase.from('items').update({ stock_gading: cur.stock_gading + qty }).eq('id', item.id)
      }
      onSaved()
    } catch (e: any) { setError(e.message ?? 'Gagal menyimpan.') }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ backgroundColor: white, borderRadius: 16, width: '100%', maxWidth: 600, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '18px 24px', borderBottom: `1px solid ${bdr}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 15, color: ink }}>Tambah Stok Jadi</div>
            <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>Stok finished goods di Gading bertambah</div>
          </div>
          <button onClick={onClose} style={{ background: '#F2F2F0', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '16px 24px' }}>
          {/* Type + Date row */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: muted, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, display: 'block', marginBottom: 6 }}>Sumber</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['produksi', 'supplier'] as const).map(t => (
                  <button key={t} type="button" onClick={() => { setType(t); setQtys({}) }}
                    style={{ flex: 1, padding: '8px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1px solid ${type === t ? '#16A34A' : bdr}`, backgroundColor: type === t ? '#F0FDF4' : '#F8F8F6', color: type === t ? '#16A34A' : muted }}>
                    {t === 'produksi' ? '🏭 Produksi' : '🚚 Dari Supplier'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, color: muted, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, display: 'block', marginBottom: 6 }}>Tanggal</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                style={{ padding: '8px 10px', fontSize: 13, border: `1px solid ${bdr}`, borderRadius: 8, outline: 'none', color: ink, backgroundColor: '#F8F8F6' }} />
            </div>
          </div>

          {/* Items — filtered by gading_source */}
          {categories.map(cat => (
            <div key={cat}>
              <div style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '6px 0 4px' }}>{cat}</div>
              {visibleItems.filter(i => i.category === cat).map(item => {
                const qty    = parseFloat(qtys[item.id] || '0')
                const active = qty > 0
                return (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 8, marginBottom: 2, backgroundColor: active ? '#F0FDF4' : '#F8F8F6', border: `1px solid ${active ? '#BBF7D0' : 'transparent'}` }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: ink }}>{item.name}</span>
                      <span style={{ fontSize: 11, color: muted, marginLeft: 6 }}>{item.unit}</span>
                      <span style={{ fontSize: 11, color: '#ABABAB', marginLeft: 6 }}>stok: {item.stock_gading}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                      <button type="button" onClick={() => setQty(item.id, String(Math.max(0, qty - 1)))}
                        style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${bdr}`, backgroundColor: '#F2F2F0', color: ink, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                      <input type="number" min="0" step="1" value={qtys[item.id] || '0'} onChange={e => setQty(item.id, e.target.value)}
                        style={{ width: 52, textAlign: 'center', padding: '4px', fontSize: 14, fontWeight: 600, color: active ? '#16A34A' : ink, border: `1px solid ${active ? '#BBF7D0' : bdr}`, borderRadius: 6, backgroundColor: active ? '#F0FDF4' : '#F8F8F6', outline: 'none' }} />
                      <button type="button" onClick={() => setQty(item.id, String(qty + 1))}
                        style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #16A34A', backgroundColor: '#16A34A', color: white, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}

          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: 11, color: muted, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, display: 'block', marginBottom: 6 }}>Catatan</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="opsional..."
              style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: `1px solid ${bdr}`, borderRadius: 8, outline: 'none', resize: 'none', color: ink, backgroundColor: '#F8F8F6', boxSizing: 'border-box' }} />
          </div>

          {produced.length > 0 && <div style={{ marginTop: 8, padding: '8px 12px', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, fontSize: 12, color: '#16A34A', fontWeight: 600 }}>{produced.length} item — stok Gading akan bertambah</div>}
          {error && <div style={{ marginTop: 8, padding: '8px 12px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, fontSize: 12, color: '#DC2626' }}>{error}</div>}
        </div>

        <div style={{ padding: '14px 24px', borderTop: `1px solid ${bdr}`, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 10, border: `1px solid ${bdr}`, backgroundColor: white, color: muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Batal</button>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: '10px 24px', borderRadius: 10, border: 'none', backgroundColor: saving ? '#ABABAB' : '#16A34A', color: white, fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: "'Archivo Black', sans-serif" }}>
            {saving ? 'Menyimpan...' : '✓ Simpan'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal: Tambah Item Stok Jadi ─────────────────────────────────────────────
function TambahItemStokModal({ existingCategories, onClose, onSaved }: { existingCategories: string[]; onClose: () => void; onSaved: () => void }) {
  const [name, setName]         = useState('')
  const [unit, setUnit]         = useState('kg')
  const [cat, setCat]           = useState('')
  const [newCat, setNewCat]     = useState('')
  const [source, setSource]     = useState<'produksi' | 'supplier'>('produksi')
  const [minStock, setMinStock] = useState('0')
  const [notes, setNotes]       = useState('')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  const finalCat = cat === '__new__' ? newCat.trim() : cat

  async function handleSave() {
    if (!name.trim())    { setError('Nama wajib diisi.'); return }
    if (!finalCat)       { setError('Kategori wajib diisi.'); return }
    setSaving(true); setError('')
    try {
      const { error: e } = await supabase.from('items').insert({
        name: name.trim(),
        unit: unit.trim(),
        category: finalCat,
        gading_source: source,
        min_stock: parseFloat(minStock) || 0,
        notes: notes.trim(),
        stock: 0,
        stock_gading: 0,
        price_per_unit: 0,
        par_order_qty: 0,
      })
      if (e) throw e
      onSaved()
    } catch (e: any) { setError(e.message ?? 'Gagal menyimpan.') }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ backgroundColor: white, borderRadius: 16, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '18px 24px', borderBottom: `1px solid ${bdr}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 15, color: ink }}>Tambah Item Stok Jadi</div>
          <button onClick={onClose} style={{ background: '#F2F2F0', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
        </div>
        <div style={{ padding: '16px 24px' }}>
          {[
            { label: 'Nama Item', val: name, set: setName, placeholder: 'misal: Trimmingan Ayam' },
            { label: 'Satuan', val: unit, set: setUnit, placeholder: 'misal: kg, pcs, porsi' },
          ].map(f => (
            <div key={f.label} style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: muted, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, display: 'block', marginBottom: 5 }}>{f.label}</label>
              <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                style={{ width: '100%', padding: '9px 12px', fontSize: 13, border: `1px solid ${bdr}`, borderRadius: 8, outline: 'none', color: ink, backgroundColor: '#F8F8F6', boxSizing: 'border-box' }} />
            </div>
          ))}

          {/* Kategori dropdown */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: muted, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, display: 'block', marginBottom: 5 }}>Kategori</label>
            <select value={cat} onChange={e => { setCat(e.target.value); setNewCat('') }}
              style={{ width: '100%', padding: '9px 12px', fontSize: 13, border: `1px solid ${bdr}`, borderRadius: 8, outline: 'none', color: cat ? ink : muted, backgroundColor: '#F8F8F6', boxSizing: 'border-box', cursor: 'pointer' }}>
              <option value="">-- Pilih kategori --</option>
              {existingCategories.map(c => <option key={c} value={c}>{c}</option>)}
              <option value="__new__">+ Kategori baru...</option>
            </select>
            {cat === '__new__' && (
              <input
                value={newCat}
                onChange={e => setNewCat(e.target.value)}
                placeholder="Nama kategori baru"
                autoFocus
                style={{ width: '100%', marginTop: 8, padding: '9px 12px', fontSize: 13, border: `1px solid #16A34A`, borderRadius: 8, outline: 'none', color: ink, backgroundColor: '#F8F8F6', boxSizing: 'border-box' }}
              />
            )}
          </div>

          {/* Source */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: muted, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, display: 'block', marginBottom: 5 }}>Asal</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['produksi', 'supplier'] as const).map(s => (
                <button key={s} type="button" onClick={() => setSource(s)}
                  style={{ flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: `1px solid ${source === s ? '#16A34A' : bdr}`, backgroundColor: source === s ? '#F0FDF4' : '#F8F8F6', color: source === s ? '#16A34A' : muted }}>
                  {s === 'produksi' ? '🏭 Produksi' : '🚚 Supplier'}
                </button>
              ))}
            </div>
          </div>

          {/* Min stock */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: muted, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, display: 'block', marginBottom: 5 }}>Min Stok BSD (opsional)</label>
            <input type="number" min="0" value={minStock} onChange={e => setMinStock(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', fontSize: 13, border: `1px solid ${bdr}`, borderRadius: 8, outline: 'none', color: ink, backgroundColor: '#F8F8F6', boxSizing: 'border-box' }} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: muted, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, display: 'block', marginBottom: 5 }}>Catatan (opsional)</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="misal: hasil trimming dari ayam fillet"
              style={{ width: '100%', padding: '9px 12px', fontSize: 13, border: `1px solid ${bdr}`, borderRadius: 8, outline: 'none', color: ink, backgroundColor: '#F8F8F6', boxSizing: 'border-box' }} />
          </div>

          {error && <div style={{ padding: '8px 12px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, fontSize: 12, color: '#DC2626', marginBottom: 12 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 10, border: `1px solid ${bdr}`, backgroundColor: white, color: muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Batal</button>
            <button onClick={handleSave} disabled={saving}
              style={{ padding: '10px 20px', borderRadius: 10, border: 'none', backgroundColor: saving ? '#ABABAB' : '#16A34A', color: white, fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? '...' : 'Simpan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Modal: Tambah Item Bahan Baku ─────────────────────────────────────────────
function TambahMaterialModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName]   = useState('')
  const [unit, setUnit]   = useState('kg')
  const [cat, setCat]     = useState('Bahan Baku')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  async function handleSave() {
    if (!name.trim()) { setError('Nama wajib diisi.'); return }
    setSaving(true); setError('')
    try {
      const { error: e } = await supabase.from('gading_materials').insert({ name: name.trim(), unit: unit.trim(), category: cat.trim(), notes: notes.trim() })
      if (e) throw e
      onSaved()
    } catch (e: any) { setError(e.message ?? 'Gagal menyimpan.') }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ backgroundColor: white, borderRadius: 16, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '18px 24px', borderBottom: `1px solid ${bdr}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 15, color: ink }}>Tambah Bahan Baku</div>
          <button onClick={onClose} style={{ background: '#F2F2F0', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
        </div>
        <div style={{ padding: '16px 24px' }}>
          {[
            { label: 'Nama Bahan', val: name, set: setName, placeholder: 'misal: Tepung Terigu' },
            { label: 'Satuan', val: unit, set: setUnit, placeholder: 'misal: kg, liter, gram' },
            { label: 'Kategori', val: cat, set: setCat, placeholder: 'misal: Tepung, Bumbu, Ayam' },
          ].map(f => (
            <div key={f.label} style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: muted, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, display: 'block', marginBottom: 5 }}>{f.label}</label>
              <input value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
                style={{ width: '100%', padding: '9px 12px', fontSize: 13, border: `1px solid ${bdr}`, borderRadius: 8, outline: 'none', color: ink, backgroundColor: '#F8F8F6', boxSizing: 'border-box' }} />
            </div>
          ))}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: muted, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, display: 'block', marginBottom: 5 }}>Catatan (opsional)</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="misal: untuk tepung coating ayam"
              style={{ width: '100%', padding: '9px 12px', fontSize: 13, border: `1px solid ${bdr}`, borderRadius: 8, outline: 'none', color: ink, backgroundColor: '#F8F8F6', boxSizing: 'border-box' }} />
          </div>
          {error && <div style={{ padding: '8px 12px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, fontSize: 12, color: '#DC2626', marginBottom: 12 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 10, border: `1px solid ${bdr}`, backgroundColor: white, color: muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Batal</button>
            <button onClick={handleSave} disabled={saving}
              style={{ padding: '10px 20px', borderRadius: 10, border: 'none', backgroundColor: saving ? '#ABABAB' : ink, color: white, fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? '...' : 'Simpan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Modal: Stok Bahan Masuk / Keluar ─────────────────────────────────────────
function StokBahanModal({
  materials, mode, onClose, onSaved,
}: { materials: GadingMaterial[]; mode: 'in' | 'out'; onClose: () => void; onSaved: () => void }) {
  const [date, setDate]       = useState(new Date().toISOString().split('T')[0])
  const [qtys, setQtys]       = useState<QtyMap>({})
  const [notes, setNotes]     = useState('')
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  const active = materials.filter(m => parseFloat(qtys[m.id] || '0') > 0)

  function setQty(id: string, val: string) { setQtys(p => ({ ...p, [id]: val })) }

  async function handleSave() {
    if (active.length === 0) { setError('Isi minimal 1 bahan.'); return }
    setSaving(true); setError('')
    try {
      const txs = active.map(m => ({ material_id: m.id, date, type: mode, quantity: parseFloat(qtys[m.id]), notes: notes.trim() }))
      const { error: e1 } = await supabase.from('gading_material_transactions').insert(txs)
      if (e1) throw e1

      for (const m of active) {
        const qty = parseFloat(qtys[m.id])
        const { data: cur } = await supabase.from('gading_materials').select('stock').eq('id', m.id).single()
        if (cur) {
          const newStock = mode === 'in' ? cur.stock + qty : Math.max(0, cur.stock - qty)
          await supabase.from('gading_materials').update({ stock: newStock }).eq('id', m.id)
        }
      }
      onSaved()
    } catch (e: any) { setError(e.message ?? 'Gagal menyimpan.') }
    finally { setSaving(false) }
  }

  const isIn    = mode === 'in'
  const accent  = isIn ? '#2563EB' : '#D97706'
  const accentBg = isIn ? '#EFF6FF' : '#FFFBEB'
  const accentBdr = isIn ? '#BFDBFE' : '#FDE68A'

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ backgroundColor: white, borderRadius: 16, width: '100%', maxWidth: 540, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '18px 24px', borderBottom: `1px solid ${bdr}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 15, color: ink }}>
              {isIn ? '📦 Bahan Masuk' : '🏭 Bahan Keluar (Dipakai)'}
            </div>
            <div style={{ fontSize: 12, color: muted, marginTop: 2 }}>
              {isIn ? 'Supplier kirim bahan baku ke Gading' : 'Bahan dipakai untuk produksi'}
            </div>
          </div>
          <button onClick={onClose} style={{ background: '#F2F2F0', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={14} /></button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '16px 24px' }}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: muted, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, display: 'block', marginBottom: 5 }}>Tanggal</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ padding: '8px 10px', fontSize: 13, border: `1px solid ${bdr}`, borderRadius: 8, outline: 'none', color: ink, backgroundColor: '#F8F8F6' }} />
          </div>

          {materials.length === 0 ? (
            <p style={{ color: muted, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Belum ada item bahan baku. Tambah dulu di tab Bahan Baku.</p>
          ) : (
            materials.map(m => {
              const qty    = parseFloat(qtys[m.id] || '0')
              const active = qty > 0
              return (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 8, marginBottom: 3, backgroundColor: active ? accentBg : '#F8F8F6', border: `1px solid ${active ? accentBdr : 'transparent'}` }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: ink }}>{m.name}</span>
                    <span style={{ fontSize: 11, color: muted, marginLeft: 6 }}>{m.unit}</span>
                    <span style={{ fontSize: 11, color: '#ABABAB', marginLeft: 6 }}>stok: {m.stock}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                    <button type="button" onClick={() => setQty(m.id, String(Math.max(0, qty - 1)))}
                      style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${bdr}`, backgroundColor: '#F2F2F0', color: ink, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                    <input type="number" min="0" step="0.5" value={qtys[m.id] || '0'} onChange={e => setQty(m.id, e.target.value)}
                      style={{ width: 60, textAlign: 'center', padding: '4px', fontSize: 14, fontWeight: 600, color: active ? accent : ink, border: `1px solid ${active ? accentBdr : bdr}`, borderRadius: 6, backgroundColor: active ? accentBg : '#F8F8F6', outline: 'none' }} />
                    <button type="button" onClick={() => setQty(m.id, String(qty + 1))}
                      style={{ width: 28, height: 28, borderRadius: 6, border: `1px solid ${accent}`, backgroundColor: accent, color: white, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>
                </div>
              )
            })
          )}

          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: 11, color: muted, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, display: 'block', marginBottom: 5 }}>Catatan</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="opsional..."
              style={{ width: '100%', padding: '8px 10px', fontSize: 13, border: `1px solid ${bdr}`, borderRadius: 8, outline: 'none', resize: 'none', color: ink, backgroundColor: '#F8F8F6', boxSizing: 'border-box' }} />
          </div>
          {error && <div style={{ marginTop: 8, padding: '8px 12px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, fontSize: 12, color: '#DC2626' }}>{error}</div>}
        </div>

        <div style={{ padding: '14px 24px', borderTop: `1px solid ${bdr}`, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 10, border: `1px solid ${bdr}`, backgroundColor: white, color: muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Batal</button>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: '10px 24px', borderRadius: 10, border: 'none', backgroundColor: saving ? '#ABABAB' : accent, color: white, fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: "'Archivo Black', sans-serif" }}>
            {saving ? 'Menyimpan...' : isIn ? '✓ Simpan Masuk' : '✓ Simpan Keluar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Gading() {
  const [tab, setTab]               = useState<Tab>('stok')
  const [items, setItems]           = useState<Item[]>([])
  const [materials, setMaterials]   = useState<GadingMaterial[]>([])
  const [productions, setProductions] = useState<GadingProduction[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [expanded, setExpanded]     = useState<Set<string>>(new Set())

  // modals
  const [showStok, setShowStok]             = useState(false)
  const [showAddItem, setShowAddItem]       = useState(false)
  const [showAddMaterial, setShowAddMaterial] = useState(false)
  const [bahanMode, setBahanMode]           = useState<'in' | 'out' | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const [{ data: iData, error: e1 }, { data: mData, error: e2 }, { data: pData, error: e3 }] = await Promise.all([
        supabase.from('items').select('*').order('category').order('name'),
        supabase.from('gading_materials').select('*').order('category').order('name'),
        supabase.from('gading_productions')
          .select('*, items:gading_production_items(*, item:items(name, unit, category))')
          .order('date', { ascending: false }).order('created_at', { ascending: false }).limit(30),
      ])
      if (e1) throw e1; if (e2) throw e2; if (e3) throw e3
      setItems(iData ?? [])
      setMaterials(mData ?? [])
      setProductions((pData ?? []) as GadingProduction[])
    } catch (e: any) { setError(e.message ?? 'Gagal memuat data.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  function toggleExpand(id: string) {
    setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }

  const categories    = [...new Set(items.map(i => i.category))]
  const matCategories = [...new Set(materials.map(m => m.category))]

  const headerActions = (
    <div className="flex gap-2">
      {tab === 'stok' && (
        <>
          <button onClick={() => setShowAddItem(true)} style={{ backgroundColor: ink, color: white, border: 'none' }} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold cursor-pointer">
            <Plus size={13} /> Item Baru
          </button>
          <button onClick={() => setShowStok(true)} style={{ backgroundColor: '#16A34A', color: white, border: 'none' }} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer">
            <Plus size={14} /> Tambah Stok Jadi
          </button>
        </>
      )}
      {tab === 'bahan' && (
        <>
          <button onClick={() => setBahanMode('out')} style={{ backgroundColor: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A' }} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold cursor-pointer">
            <ArrowUpFromLine size={13} /> Bahan Keluar
          </button>
          <button onClick={() => setBahanMode('in')} style={{ backgroundColor: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold cursor-pointer">
            <ArrowDownToLine size={13} /> Bahan Masuk
          </button>
          <button onClick={() => setShowAddMaterial(true)} style={{ backgroundColor: ink, color: white, border: 'none' }} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold cursor-pointer">
            <Plus size={13} /> Item Baru
          </button>
        </>
      )}
    </div>
  )

  return (
    <div className="min-h-screen">
      {showStok      && <TambahStokModal items={items} onClose={() => setShowStok(false)} onSaved={() => { setShowStok(false); loadData() }} />}
      {showAddItem   && <TambahItemStokModal existingCategories={categories} onClose={() => setShowAddItem(false)} onSaved={() => { setShowAddItem(false); loadData() }} />}
      {showAddMaterial && <TambahMaterialModal onClose={() => setShowAddMaterial(false)} onSaved={() => { setShowAddMaterial(false); loadData() }} />}
      {bahanMode     && <StokBahanModal materials={materials} mode={bahanMode} onClose={() => setBahanMode(null)} onSaved={() => { setBahanMode(null); loadData() }} />}

      <PageHeader title="Gading — Central Kitchen" subtitle="Produksi & stok bahan baku" action={headerActions} />

      {/* Tabs */}
      <div style={{ borderBottom: `1px solid ${bdr}`, backgroundColor: white }} className="flex px-8">
        <TabBtn label="Stok Jadi"      active={tab === 'stok'}    onClick={() => setTab('stok')} />
        <TabBtn label="Bahan Baku"     active={tab === 'bahan'}   onClick={() => setTab('bahan')} />
        <TabBtn label="Riwayat Produksi" active={tab === 'riwayat'} onClick={() => setTab('riwayat')} />
      </div>

      {loading ? (
        <div style={{ color: muted }} className="py-20 text-center text-sm">Memuat data...</div>
      ) : error ? (
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, margin: '20px 32px' }} className="flex items-center gap-3 px-5 py-4">
          <AlertCircle size={16} style={{ color: '#DC2626', flexShrink: 0 }} />
          <p style={{ color: '#DC2626' }} className="text-sm">{error}</p>
          <button onClick={loadData} style={{ backgroundColor: '#DC2626', color: white }} className="ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold">Coba Lagi</button>
        </div>
      ) : (
        <div className="px-8 py-5">

          {/* ── Tab: Stok Jadi ── */}
          {tab === 'stok' && (
            <div style={{ backgroundColor: white, border: `1px solid ${bdr}`, borderRadius: 14, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8F8F6' }}>
                    {['Item', 'Kategori', 'Stok Gading', 'Stok BSD'].map(h => (
                      <th key={h} style={{ padding: '9px 16px', color: muted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: h === 'Item' || h === 'Kategori' ? 'left' : 'right' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {categories.map(cat => (
                    <>
                      <tr key={`cat-${cat}`}>
                        <td colSpan={4} style={{ padding: '6px 16px', fontSize: 10, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', borderTop: `1px solid ${bdr}`, backgroundColor: '#F8F8F6' }}>{cat}</td>
                      </tr>
                      {items.filter(i => i.category === cat).map(item => (
                        <tr key={item.id} style={{ borderTop: '1px solid #F0F0EE' }}>
                          <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 500, color: ink }}>
                            {item.name}
                            <span style={{ color: '#ABABAB', fontWeight: 400, marginLeft: 6, fontSize: 11 }}>{item.unit}</span>
                          </td>
                          <td style={{ padding: '10px 16px' }}>
                            <span style={{ backgroundColor: '#F2F2F0', color: muted, border: `1px solid ${bdr}`, borderRadius: 999, padding: '2px 8px', fontSize: 11 }}>{item.category}</span>
                          </td>
                          <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: item.stock_gading === 0 ? '#DC2626' : item.stock_gading <= 3 ? '#D97706' : '#16A34A' }}>
                              {item.stock_gading}
                            </span>
                          </td>
                          <td style={{ padding: '10px 16px', textAlign: 'right', fontSize: 13, color: muted }}>{item.stock}</td>
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Tab: Bahan Baku ── */}
          {tab === 'bahan' && (
            materials.length === 0 ? (
              <div style={{ backgroundColor: white, border: `1px solid ${bdr}`, borderRadius: 14 }} className="flex flex-col items-center justify-center py-16 gap-3">
                <Package size={36} style={{ color: '#ABABAB' }} />
                <p style={{ color: muted, fontSize: 13 }}>Belum ada item bahan baku.</p>
                <p style={{ color: '#ABABAB', fontSize: 12 }}>Tambah item seperti Tepung Terigu, Maizena, Trimmingan Ayam, dll.</p>
                <button onClick={() => setShowAddMaterial(true)} style={{ backgroundColor: ink, color: white, border: 'none', borderRadius: 10, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  + Tambah Item Bahan Baku
                </button>
              </div>
            ) : (
              <div style={{ backgroundColor: white, border: `1px solid ${bdr}`, borderRadius: 14, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F8F8F6' }}>
                      {['Bahan', 'Kategori', 'Stok', ''].map(h => (
                        <th key={h} style={{ padding: '9px 16px', color: muted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: h === 'Stok' ? 'right' : 'left' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matCategories.map(cat => (
                      <>
                        <tr key={`mcat-${cat}`}>
                          <td colSpan={4} style={{ padding: '6px 16px', fontSize: 10, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', borderTop: `1px solid ${bdr}`, backgroundColor: '#F8F8F6' }}>{cat}</td>
                        </tr>
                        {materials.filter(m => m.category === cat).map(m => (
                          <tr key={m.id} style={{ borderTop: '1px solid #F0F0EE' }}>
                            <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 500, color: ink }}>
                              {m.name}
                              <span style={{ color: '#ABABAB', fontWeight: 400, marginLeft: 6, fontSize: 11 }}>{m.unit}</span>
                              {m.notes && <div style={{ fontSize: 11, color: '#ABABAB', marginTop: 1 }}>{m.notes}</div>}
                            </td>
                            <td style={{ padding: '10px 16px' }}>
                              <span style={{ backgroundColor: '#F2F2F0', color: muted, border: `1px solid ${bdr}`, borderRadius: 999, padding: '2px 8px', fontSize: 11 }}>{m.category}</span>
                            </td>
                            <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                              <span style={{ fontSize: 14, fontWeight: 700, color: m.stock === 0 ? '#DC2626' : m.stock <= 5 ? '#D97706' : ink }}>{m.stock}</span>
                            </td>
                            <td style={{ padding: '10px 16px' }}>
                              <div className="flex gap-2 justify-end">
                                <button onClick={() => setBahanMode('in')} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: '1px solid #BFDBFE', backgroundColor: '#EFF6FF', color: '#2563EB', cursor: 'pointer', fontWeight: 600 }}>+ Masuk</button>
                                <button onClick={() => setBahanMode('out')} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 6, border: '1px solid #FDE68A', backgroundColor: '#FFFBEB', color: '#D97706', cursor: 'pointer', fontWeight: 600 }}>− Pakai</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* ── Tab: Riwayat Produksi ── */}
          {tab === 'riwayat' && (
            productions.length === 0 ? (
              <div style={{ backgroundColor: white, border: `1px solid ${bdr}`, borderRadius: 14 }} className="flex flex-col items-center justify-center py-16 gap-3">
                <Factory size={32} style={{ color: '#ABABAB' }} />
                <p style={{ color: muted, fontSize: 13 }}>Belum ada riwayat produksi.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {productions.map(prod => {
                  const isOpen   = expanded.has(prod.id)
                  const totalQty = (prod.items ?? []).reduce((s, pi) => s + pi.quantity, 0)
                  const isSupplier = prod.type === 'supplier'
                  return (
                    <div key={prod.id} style={{ backgroundColor: white, border: `1px solid ${bdr}`, borderRadius: 12, overflow: 'hidden' }}>
                      <div className="flex items-center gap-4 px-5 py-3 cursor-pointer" onClick={() => toggleExpand(prod.id)}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: isSupplier ? '#EFF6FF' : '#F0FDF4', border: `1px solid ${isSupplier ? '#BFDBFE' : '#BBF7D0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16 }}>
                          {isSupplier ? '🚚' : '🏭'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div className="flex items-center gap-2">
                            <span style={{ fontSize: 13, fontWeight: 600, color: ink }}>{prod.date}</span>
                            <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 8px', borderRadius: 999, backgroundColor: isSupplier ? '#EFF6FF' : '#F0FDF4', color: isSupplier ? '#2563EB' : '#16A34A', border: `1px solid ${isSupplier ? '#BFDBFE' : '#BBF7D0'}` }}>
                              {isSupplier ? 'Dari Supplier' : 'Produksi'}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: muted, marginTop: 1 }}>
                            {prod.items?.length ?? 0} item · {totalQty} unit
                            {prod.notes && <span style={{ fontStyle: 'italic', marginLeft: 8 }}>"{prod.notes}"</span>}
                          </div>
                        </div>
                        {isOpen ? <ChevronUp size={15} style={{ color: '#ABABAB' }} /> : <ChevronDown size={15} style={{ color: '#ABABAB' }} />}
                      </div>
                      {isOpen && (
                        <div style={{ borderTop: '1px solid #F0F0EE' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <tbody>
                              {(prod.items ?? []).map(pi => (
                                <tr key={pi.id} style={{ borderTop: '1px solid #F8F8F6' }}>
                                  <td style={{ padding: '8px 16px', fontSize: 13, color: ink, fontWeight: 500 }}>{pi.item?.name ?? '—'}</td>
                                  <td style={{ padding: '8px 16px' }}>
                                    <span style={{ backgroundColor: '#F2F2F0', color: muted, border: `1px solid ${bdr}`, borderRadius: 999, padding: '1px 7px', fontSize: 11 }}>{pi.item?.category ?? '—'}</span>
                                  </td>
                                  <td style={{ padding: '8px 16px', textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#16A34A' }}>+{pi.quantity} {pi.item?.unit}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}
