import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { Item } from '../lib/types'
import PageHeader from '../components/PageHeader'
import { Plus, X, AlertCircle } from 'lucide-react'

function fmt(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}
const inputStyle = { backgroundColor: '#F8F8F6', border: '1px solid #E8E8E6', color: '#0E0E0E' }

interface Purchase {
  id: string; date: string; item_id: string; quantity: number; unit_price: number; notes: string; created_at: string
  item?: { name: string; unit: string; price_per_unit: number }
}

// Row dalam 1 sesi pembelian
interface PurchaseRow { itemId: string; qty: string; totalPrice: string }

function ItemPicker({ items, value, onChange }: { items: Item[]; value: string; onChange: (id: string) => void }) {
  const selected = items.find(i => i.id === value)
  const [query, setQuery] = useState(selected?.name ?? '')
  const [open, setOpen]   = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = query.trim()
    ? items.filter(i => i.name.toLowerCase().includes(query.toLowerCase()))
    : items

  function select(item: Item) { onChange(item.id); setQuery(item.name); setOpen(false) }
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) { setQuery(e.target.value); onChange(''); setOpen(true) }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input value={query} onChange={handleChange} onFocus={() => setOpen(true)}
        placeholder="Cari barang..." autoComplete="off"
        style={{ ...inputStyle, backgroundColor: '#FFFFFF', width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
      {open && filtered.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#FFFFFF', border: '1px solid #E8E8E6', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.1)', zIndex: 100, maxHeight: 220, overflowY: 'auto', marginTop: 2 }}>
          {filtered.map(item => (
            <div key={item.id} onMouseDown={() => select(item)}
              style={{ padding: '8px 12px', fontSize: 13, cursor: 'pointer', borderBottom: '1px solid #F0F0EE', color: '#0E0E0E' }}
              className="hover:bg-[#F8F8F6]">
              {item.name} <span style={{ color: '#ABABAB', fontSize: 11 }}>({item.unit})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PurchaseModal({ items, suppliers, onClose, onSave }: { items: Item[]; suppliers: string[]; onClose: () => void; onSave: () => void }) {
  const [date, setDate]     = useState(new Date().toISOString().split('T')[0])
  const [supplier, setSupplier] = useState('')
  const [rows, setRows]     = useState<PurchaseRow[]>([{ itemId: '', qty: '', totalPrice: '' }])
  const [saving, setSaving] = useState(false)

  function updateRow(idx: number, field: keyof PurchaseRow, val: string) {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r))
  }

  function addRow() { setRows(prev => [...prev, { itemId: '', qty: '', totalPrice: '' }]) }
  function removeRow(idx: number) { setRows(prev => prev.filter((_, i) => i !== idx)) }

  const validRows = rows.filter(r => r.itemId && r.qty && r.totalPrice)
  const grandTotal = validRows.reduce((s, r) => s + parseFloat(r.totalPrice), 0)

  async function handleSave() {
    if (validRows.length === 0) return
    setSaving(true)
    for (const row of validRows) {
      const item      = items.find(i => i.id === row.itemId)
      const qtyNum    = parseFloat(row.qty)
      const totalNum  = parseFloat(row.totalPrice)
      const unitPrice = qtyNum > 0 ? totalNum / qtyNum : 0
      await supabase.from('transactions').insert({
        date, type: 'in', item_id: row.itemId, quantity: qtyNum,
        unit_price: unitPrice, notes: supplier.trim() || 'Pembelian', source: 'purchase',
      })
      if (item) await supabase.from('items').update({ stock_gading: item.stock_gading + qtyNum }).eq('id', row.itemId)
    }
    setSaving(false); onSave()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E6', borderRadius: 16 }} className="w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div style={{ borderBottom: '1px solid #E8E8E6' }} className="flex items-center justify-between px-6 py-4 flex-shrink-0">
          <h2 style={{ fontFamily: "'Archivo Black', sans-serif", color: '#0E0E0E', fontSize: 16 }}>Catat Pembelian</h2>
          <button onClick={onClose} style={{ color: '#6B6B6B' }}><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {/* Tanggal + Supplier */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={{ color: '#6B6B6B' }} className="block text-xs mb-1.5 uppercase tracking-wider font-medium">Tanggal</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" />
            </div>
            <div>
              <label style={{ color: '#6B6B6B' }} className="block text-xs mb-1.5 uppercase tracking-wider font-medium">Supplier / Sumber</label>
              <input value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="Tokped, pak Budi, dll" style={inputStyle}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" list="supplier-list" autoComplete="off" />
              <datalist id="supplier-list">
                {suppliers.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>
          </div>

          {/* Rows */}
          <div>
            <label style={{ color: '#6B6B6B' }} className="block text-xs mb-2 uppercase tracking-wider font-medium">Item Dibeli</label>
            <div className="space-y-2">
              {rows.map((row, idx) => {
                const selected = items.find(i => i.id === row.itemId)
                return (
                  <div key={idx} style={{ backgroundColor: '#F8F8F6', border: '1px solid #E8E8E6', borderRadius: 12 }} className="p-3">
                    <div className="flex gap-2 items-start">
                      <div className="flex-1">
                        <div className="mb-2">
                          <ItemPicker items={items} value={row.itemId} onChange={id => updateRow(idx, 'itemId', id)} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <input type="number" value={row.qty} onChange={e => updateRow(idx, 'qty', e.target.value)}
                              placeholder={`Qty${selected ? ` (${selected.unit})` : ''}`} min="0" step="0.1"
                              style={{ ...inputStyle, backgroundColor: '#FFFFFF' }}
                              className="w-full px-3 py-2 rounded-lg text-sm outline-none" />
                          </div>
                          <div>
                            <input type="number" value={row.totalPrice} onChange={e => updateRow(idx, 'totalPrice', e.target.value)}
                              placeholder="Total harga beli (Rp)" min="0"
                              style={{ ...inputStyle, backgroundColor: '#FFFFFF' }}
                              className="w-full px-3 py-2 rounded-lg text-sm outline-none" />
                          </div>
                        </div>
                        {row.qty && row.totalPrice && parseFloat(row.qty) > 0 && (
                          <div style={{ color: '#6B6B6B' }} className="text-xs mt-1.5">
                            <span style={{ color: '#D97706', fontWeight: 600 }}>
                              {fmt(parseFloat(row.totalPrice) / parseFloat(row.qty))}/{selected?.unit ?? 'unit'}
                            </span>
                            {selected && (selected.price_per_unit ?? 0) > 0 && (
                              <span style={{ color: (selected.price_per_unit ?? 0) > parseFloat(row.totalPrice) / parseFloat(row.qty) ? '#16A34A' : '#DC2626' }} className="ml-2">
                                · Jual {fmt(selected.price_per_unit ?? 0)}/{selected.unit}
                                {(selected.price_per_unit ?? 0) > parseFloat(row.totalPrice) / parseFloat(row.qty)
                                  ? ` (+${((((selected.price_per_unit ?? 0) - parseFloat(row.totalPrice) / parseFloat(row.qty)) / (parseFloat(row.totalPrice) / parseFloat(row.qty))) * 100).toFixed(0)}%)`
                                  : ` (NOMBOK)`}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      {rows.length > 1 && (
                        <button onClick={() => removeRow(idx)} style={{ color: '#ABABAB', flexShrink: 0, marginTop: 2 }}>
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            <button onClick={addRow} style={{ color: '#D91C1C', border: '1px dashed #FECACA', backgroundColor: '#FFF5F5' }}
              className="w-full mt-2 py-2 rounded-xl text-sm font-medium">
              + Tambah Item
            </button>
          </div>

          {grandTotal > 0 && (
            <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 12 }} className="px-4 py-3 flex justify-between items-center">
              <span style={{ color: '#6B6B6B' }} className="text-sm font-medium">Grand Total</span>
              <span style={{ color: '#16A34A', fontFamily: "'Archivo Black', sans-serif" }} className="text-lg">{fmt(grandTotal)}</span>
            </div>
          )}
        </div>

        <div style={{ borderTop: '1px solid #E8E8E6' }} className="flex gap-3 px-6 py-4 flex-shrink-0">
          <button onClick={onClose} style={{ border: '1px solid #E8E8E6', color: '#6B6B6B' }}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium">Batal</button>
          <button onClick={handleSave} disabled={saving || validRows.length === 0} style={{ backgroundColor: '#D91C1C' }}
            className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60">
            {saving ? 'Menyimpan...' : `Simpan (${validRows.length} item)`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Edit modal ────────────────────────────────────────────────────────────────
function EditModal({ purchase, onClose, onSave }: { purchase: Purchase; onClose: () => void; onSave: () => void }) {
  const [date,      setDate]      = useState(purchase.date)
  const [qty,       setQty]       = useState(String(purchase.quantity))
  const [unitPrice, setUnitPrice] = useState(String(purchase.unit_price))
  const [notes,     setNotes]     = useState(purchase.notes ?? '')
  const [saving,    setSaving]    = useState(false)

  async function handleSave() {
    setSaving(true)
    await supabase.from('transactions').update({
      date,
      quantity: parseFloat(qty) || 0,
      unit_price: parseFloat(unitPrice) || 0,
      notes: notes || null,
    }).eq('id', purchase.id)
    setSaving(false)
    onSave()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: 16, width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #E8E8E6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 15 }}>Edit Pembelian</div>
          <button onClick={onClose} style={{ background: '#F2F2F0', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 13, color: '#6B6B6B', fontWeight: 600 }}>{purchase.item?.name}</div>
          {[
            { label: 'Tanggal', el: <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...inputStyle, width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' as const }} /> },
            { label: 'Jumlah', el: <input type="number" value={qty} onChange={e => setQty(e.target.value)} style={{ ...inputStyle, width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' as const }} /> },
            { label: 'Harga Beli/Unit', el: <input type="number" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} style={{ ...inputStyle, width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' as const }} /> },
            { label: 'Supplier', el: <input type="text" value={notes} onChange={e => setNotes(e.target.value)} style={{ ...inputStyle, width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' as const }} /> },
          ].map(({ label, el }) => (
            <div key={label}>
              <label style={{ fontSize: 11, color: '#6B6B6B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>{label}</label>
              {el}
            </div>
          ))}
        </div>
        <div style={{ borderTop: '1px solid #E8E8E6', display: 'flex', gap: 10, padding: '14px 24px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid #E8E8E6', backgroundColor: '#FFFFFF', color: '#6B6B6B', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Batal</button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', backgroundColor: '#D91C1C', color: '#FFFFFF', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Scan Invoice Modal ────────────────────────────────────────────────────────
interface InvoicePhoto { photoUrl: string; date: string; prodItems: string[] }
interface ScannedRow { itemName: string; qty: number; unit: string; unitPrice: number; mappedItemId: string }

function fuzzyMatch(invoiceName: string, invItems: Item[]): string {
  const words = invoiceName.toLowerCase().split(/[\s().,/]+/).filter(w => w.length > 2)
  let best = { id: '', score: 0 }
  for (const item of invItems) {
    const iw = item.name.toLowerCase().split(/[\s().,/]+/).filter(w => w.length > 2)
    const score = words.filter(w => iw.some(x => x.includes(w) || w.includes(x))).length
    if (score > best.score) best = { id: item.id, score }
  }
  return best.id
}

function ScanInvoiceModal({ invItems, onClose, onSave }: { invItems: Item[]; onClose: () => void; onSave: () => void }) {
  const [photos,      setPhotos]      = useState<InvoicePhoto[]>([])
  const [loading,     setLoading]     = useState(true)
  const [scanning,    setScanning]    = useState<string | null>(null)
  const [scanningAll, setScanningAll] = useState(false)
  const [results,     setResults]     = useState<Record<string, ScannedRow[]>>({})
  const [saving,      setSaving]      = useState<string | null>(null)
  const [savingAll,   setSavingAll]   = useState(false)
  const [done,        setDone]        = useState<Set<string>>(new Set())

  useEffect(() => {
    supabase.from('production_logs')
      .select('produced_at,photo_url,photo_url_2,item:item_id(name)')
      .not('photo_url', 'is', null)
      .order('produced_at', { ascending: false })
      .then(({ data }) => {
        if (!data) { setLoading(false); return }
        const seen = new Set<string>()
        const list: InvoicePhoto[] = []
        for (const row of data as any[]) {
          for (const url of [row.photo_url, row.photo_url_2].filter(Boolean)) {
            if (!seen.has(url)) {
              seen.add(url)
              list.push({ photoUrl: url, date: row.produced_at, prodItems: [row.item?.name].filter(Boolean) })
            } else {
              const ex = list.find(p => p.photoUrl === url)
              if (ex && row.item?.name && !ex.prodItems.includes(row.item.name)) ex.prodItems.push(row.item.name)
            }
          }
        }
        setPhotos(list)
        setLoading(false)
      })
  }, [])

  async function scanOne(photo: InvoicePhoto): Promise<ScannedRow[] | null> {
    try {
      const res  = await fetch('/api/scan-invoice', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ photoUrl: photo.photoUrl }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Scan gagal')
      return (data.items ?? []).map((it: any) => ({
        itemName:     it.itemName ?? '',
        qty:          Number(it.qty) || 0,
        unit:         it.unit ?? 'kg',
        unitPrice:    Number(it.unitPrice) || 0,
        mappedItemId: fuzzyMatch(it.itemName ?? '', invItems),
      }))
    } catch (e: any) {
      alert(`Scan error (${photo.date}): ${e.message}\n\nPastikan GEMINI_API_KEY sudah benar di Vercel env.`)
      return null
    }
  }

  async function scan(photo: InvoicePhoto) {
    setScanning(photo.photoUrl)
    const rows = await scanOne(photo)
    if (rows) setResults(prev => ({ ...prev, [photo.photoUrl]: rows }))
    setScanning(null)
  }

  async function scanAll(photosToScan: InvoicePhoto[]) {
    setScanningAll(true)
    for (const photo of photosToScan) {
      if (done.has(photo.photoUrl)) continue
      setScanning(photo.photoUrl)
      const rows = await scanOne(photo)
      if (rows) setResults(prev => ({ ...prev, [photo.photoUrl]: rows }))
      setScanning(null)
    }
    setScanningAll(false)
  }

  async function saveAll(photosToSave: InvoicePhoto[]) {
    setSavingAll(true)
    for (const photo of photosToSave) {
      if (done.has(photo.photoUrl)) continue
      const rows = (results[photo.photoUrl] ?? []).filter(r => r.mappedItemId && r.qty > 0)
      if (rows.length === 0) continue
      setSaving(photo.photoUrl)
      for (const row of rows) {
        await supabase.from('transactions').insert({
          date: photo.date, type: 'in', source: 'purchase',
          item_id: row.mappedItemId, quantity: row.qty, unit_price: row.unitPrice,
          notes: 'Pluit Cold Storage',
        })
      }
      setDone(prev => new Set([...prev, photo.photoUrl]))
    }
    setSaving(null)
    setSavingAll(false)
    onSave()
  }

  function updateRow(photoUrl: string, idx: number, patch: Partial<ScannedRow>) {
    setResults(prev => ({
      ...prev,
      [photoUrl]: (prev[photoUrl] ?? []).map((r, i) => i === idx ? { ...r, ...patch } : r),
    }))
  }

  async function savePhoto(photo: InvoicePhoto) {
    const rows = (results[photo.photoUrl] ?? []).filter(r => r.mappedItemId && r.qty > 0)
    if (rows.length === 0) return
    setSaving(photo.photoUrl)
    for (const row of rows) {
      await supabase.from('transactions').insert({
        date: photo.date, type: 'in', source: 'purchase',
        item_id: row.mappedItemId, quantity: row.qty, unit_price: row.unitPrice,
        notes: 'Pluit Cold Storage',
      })
    }
    setSaving(null)
    setDone(prev => new Set([...prev, photo.photoUrl]))
    onSave()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 24, overflowY: 'auto' }}>
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: 16, width: '100%', maxWidth: 760, marginTop: 24, marginBottom: 24 }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #E8E8E6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16 }}>📄 Scan Invoice</div>
            <div style={{ color: '#6B6B6B', fontSize: 12, marginTop: 2 }}>Import data beli dari foto invoice di Riwayat Produksi</div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {!loading && photos.length > 0 && (
              <>
                <button onClick={() => scanAll(photos.filter(p => !done.has(p.photoUrl) && !results[p.photoUrl]))}
                  disabled={scanningAll || !!scanning}
                  style={{ backgroundColor: '#0E0E0E', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: (scanningAll || !!scanning) ? 'not-allowed' : 'pointer', opacity: (scanningAll || !!scanning) ? 0.6 : 1 }}>
                  {scanningAll ? 'Scanning...' : '🔍 Scan Semua'}
                </button>
                {Object.keys(results).length > 0 && (
                  <button onClick={() => saveAll(photos)}
                    disabled={savingAll}
                    style={{ backgroundColor: '#16A34A', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: savingAll ? 'not-allowed' : 'pointer', opacity: savingAll ? 0.6 : 1 }}>
                    {savingAll ? 'Menyimpan...' : '💾 Simpan Semua'}
                  </button>
                )}
              </>
            )}
            <button onClick={onClose} style={{ background: '#F2F2F0', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 18, color: '#6B6B6B' }}>×</button>
          </div>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {loading ? (
            <div style={{ color: '#6B6B6B', textAlign: 'center', padding: 40 }}>Memuat invoice...</div>
          ) : photos.length === 0 ? (
            <div style={{ color: '#6B6B6B', textAlign: 'center', padding: 40 }}>Tidak ada invoice photo di Riwayat Produksi.</div>
          ) : photos.map(photo => {
            const rows    = results[photo.photoUrl]
            const isDone  = done.has(photo.photoUrl)
            const isScan  = scanning === photo.photoUrl
            const isSave  = saving  === photo.photoUrl
            return (
              <div key={photo.photoUrl} style={{ border: '1px solid #E8E8E6', borderRadius: 12, overflow: 'hidden', opacity: isDone ? 0.55 : 1 }}>
                {/* Invoice header */}
                <div style={{ backgroundColor: '#F8F8F6', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <a href={photo.photoUrl} target="_blank" rel="noreferrer">
                    <img src={photo.photoUrl} alt="invoice" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, border: '1px solid #E8E8E6', cursor: 'pointer' }} />
                  </a>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{photo.date}</div>
                    <div style={{ color: '#6B6B6B', fontSize: 12 }}>{photo.prodItems.join(', ')}</div>
                  </div>
                  {isDone ? (
                    <span style={{ fontSize: 12, color: '#16A34A', fontWeight: 600 }}>✓ Tersimpan</span>
                  ) : (
                    <button onClick={() => scan(photo)} disabled={!!isScan || !!scanning}
                      style={{ backgroundColor: isScan ? '#ccc' : '#0E0E0E', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: isScan ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
                      {isScan ? 'Scanning...' : rows ? 'Scan Ulang' : '🔍 Scan'}
                    </button>
                  )}
                </div>

                {/* Scanned rows */}
                {rows && !isDone && (
                  <div style={{ padding: '12px 16px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #E8E8E6' }}>
                          {['Item di Invoice', 'Map ke Inventory', 'Qty', 'Harga/unit'].map(h => (
                            <th key={h} style={{ textAlign: 'left', padding: '4px 8px', color: '#6B6B6B', fontWeight: 600, fontSize: 11, textTransform: 'uppercase' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid #F0F0EE' }}>
                            <td style={{ padding: '8px 8px', color: '#6B6B6B', fontSize: 12, maxWidth: 160 }}>{row.itemName}</td>
                            <td style={{ padding: '4px 8px', minWidth: 180 }}>
                              <select value={row.mappedItemId} onChange={e => updateRow(photo.photoUrl, idx, { mappedItemId: e.target.value })}
                                style={{ width: '100%', border: '1px solid #E8E8E6', borderRadius: 6, padding: '5px 8px', fontSize: 13, outline: 'none', backgroundColor: row.mappedItemId ? '#fff' : '#FFF5F5' }}>
                                <option value="">— pilih item —</option>
                                {invItems.filter(i => i.unit === 'kg' || i.unit === 'pcs' || i.unit === 'gr').map(i => (
                                  <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                                ))}
                              </select>
                            </td>
                            <td style={{ padding: '4px 8px' }}>
                              <input type="number" value={row.qty} onChange={e => updateRow(photo.photoUrl, idx, { qty: parseFloat(e.target.value) || 0 })}
                                style={{ width: 70, border: '1px solid #E8E8E6', borderRadius: 6, padding: '5px 8px', fontSize: 13, outline: 'none' }} />
                              <span style={{ color: '#ABABAB', fontSize: 11, marginLeft: 4 }}>{row.unit}</span>
                            </td>
                            <td style={{ padding: '4px 8px' }}>
                              <input type="number" value={row.unitPrice} onChange={e => updateRow(photo.photoUrl, idx, { unitPrice: parseFloat(e.target.value) || 0 })}
                                style={{ width: 100, border: '1px solid #E8E8E6', borderRadius: 6, padding: '5px 8px', fontSize: 13, outline: 'none' }} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                      <button onClick={() => savePhoto(photo)} disabled={!!isSave}
                        style={{ backgroundColor: '#16A34A', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: isSave ? 'not-allowed' : 'pointer', opacity: isSave ? 0.7 : 1 }}>
                        {isSave ? 'Menyimpan...' : '💾 Simpan ke Purchasing'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Stat card with accent left border ─────────────────────────────────────────
function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      border: '1px solid #E8E8E6',
      borderLeft: `3px solid ${color}`,
      borderRadius: 12,
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    }} className="p-4">
      <div style={{ color: '#6B6B6B' }} className="text-xs uppercase tracking-wider mb-1 font-medium">{label}</div>
      <div style={{ color, fontFamily: "'Archivo Black', sans-serif" }} className="text-2xl">{value}</div>
    </div>
  )
}

export default function Purchasing() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [items, setItems]         = useState<Item[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [showModal, setShowModal]   = useState(false)
  const [showScan,  setShowScan]    = useState(false)
  const [editTarget, setEditTarget] = useState<Purchase | null>(null)
  const [sortAsc, setSortAsc] = useState(false)
  const now = new Date()
  const [filterMonth, setFilterMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'))
  const [filterYear,  setFilterYear]  = useState(String(now.getFullYear()))

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [{ data: txData, error: e1 }, { data: itemsData, error: e2 }] = await Promise.all([
        supabase.from('transactions').select('*, item:items(name,unit,price_per_unit)').eq('type', 'in').eq('source', 'purchase').order('date', { ascending: false }).limit(200),
        supabase.from('items').select('*').order('name'),
      ])
      if (e1) throw e1
      if (e2) throw e2
      setPurchases((txData ?? []) as Purchase[])
      setItems(itemsData ?? [])
    } catch (e: any) {
      setError(e.message ?? 'Gagal memuat data.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const supplierList = [...new Set(purchases.map(p => p.notes).filter(Boolean))] as string[]
  const selectedYM   = `${filterYear}-${filterMonth}`
  const monthPurch   = purchases.filter(p => p.date.startsWith(selectedYM))
  const totalMonth   = monthPurch.reduce((s, p) => s + (p.unit_price ?? 0) * p.quantity, 0)
  const sorted       = [...monthPurch].sort((a, b) => sortAsc ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date))

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Purchasing"
        subtitle="Catat dan pantau pembelian bahan baku"
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowScan(true)} style={{ backgroundColor: '#0E0E0E', border: 'none', borderRadius: 10, padding: '8px 14px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              📄 Scan Invoice
            </button>
            <button onClick={() => setShowModal(true)} style={{ backgroundColor: '#D91C1C' }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold hover:bg-[#B51515] transition-colors">
              <Plus size={14} /> Catat Pembelian
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-3 gap-4 px-8 py-5" style={{ borderBottom: '1px solid #E8E8E6' }}>
        <StatCard label="Total Pembelian Bulan Ini" value={fmt(totalMonth)}   color="#D97706" />
        <StatCard label="Transaksi Bulan Ini"       value={monthPurch.length} color="#D91C1C" />
        <StatCard label="Total Semua Transaksi"     value={purchases.length}  color="#6B6B6B" />
      </div>

      <div className="px-8 pt-5 pb-2 flex items-center gap-3">
        {[
          { label: 'Bulan', el: <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{ border: 'none', background: 'transparent', fontSize: 14, fontWeight: 600, color: '#0E0E0E', outline: 'none', cursor: 'pointer' }}>
              {Array.from({ length: 12 }, (_, i) => { const d = new Date(2024, i, 1); return { value: String(i+1).padStart(2,'0'), label: d.toLocaleDateString('id-ID', { month: 'long' }) } }).map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select> },
          { label: 'Tahun', el: <select value={filterYear} onChange={e => setFilterYear(e.target.value)} style={{ border: 'none', background: 'transparent', fontSize: 14, fontWeight: 600, color: '#0E0E0E', outline: 'none', cursor: 'pointer' }}>
              {['2025','2026','2027'].map(y => <option key={y}>{y}</option>)}
            </select> },
        ].map(({ label, el }) => (
          <div key={label} style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E8E6', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px' }}>
            <span style={{ color: '#6B6B6B', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
            {el}
          </div>
        ))}
      </div>

      <div className="px-8 py-5">
        {loading ? (
          <div style={{ color: '#6B6B6B' }} className="py-20 text-center text-sm">Memuat data...</div>
        ) : error ? (
          <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12 }}
            className="flex items-center gap-3 px-5 py-4">
            <AlertCircle size={16} style={{ color: '#DC2626', flexShrink: 0 }} />
            <div>
              <p style={{ color: '#DC2626' }} className="text-sm font-medium">Gagal memuat data</p>
              <p style={{ color: '#EF4444' }} className="text-xs mt-0.5">{error}</p>
            </div>
            <button onClick={loadData} style={{ backgroundColor: '#DC2626', color: '#FFFFFF' }}
              className="ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-[#B91C1C] transition-colors">
              Coba Lagi
            </button>
          </div>
        ) : purchases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div style={{ color: '#ABABAB', fontSize: 40 }}>📦</div>
            <p style={{ color: '#6B6B6B' }} className="text-sm font-medium">Belum ada data pembelian</p>
            <p style={{ color: '#ABABAB' }} className="text-xs">Klik "Catat Pembelian" untuk mulai merekam transaksi</p>
          </div>
        ) : (
          <div style={{ border: '1px solid #E8E8E6', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ overflowX: 'auto' }}>
            <table className="w-full" style={{ minWidth: 900 }}>
              <thead>
                <tr style={{ backgroundColor: '#F8F8F6', borderBottom: '1px solid #E8E8E6' }}>
                  <th onClick={() => setSortAsc(p => !p)}
                    style={{ color: '#6B6B6B', cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none' }}
                    className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-left">
                    Tanggal {sortAsc ? '↑' : '↓'}
                  </th>
                  {['Barang', 'Jumlah', 'Harga Beli/Unit', 'Total Beli', 'Harga Jual', 'Margin', 'Supplier', ''].map(h => (
                    <th key={h} style={{ color: '#6B6B6B' }} className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody style={{ backgroundColor: '#FFFFFF' }}>
                {sorted.map(p => {
                  const buyPrice  = p.unit_price ?? 0
                  const sellPrice = p.item?.price_per_unit ?? 0
                  const margin    = buyPrice > 0 ? ((sellPrice - buyPrice) / buyPrice) * 100 : null
                  const isProfit  = margin !== null && margin > 0
                  return (
                  <tr key={p.id} style={{ borderBottom: '1px solid #F0F0EE' }} className="hover:bg-[#FAFAF9] transition-colors">
                    <td className="px-4 py-3" style={{ color: '#6B6B6B' }}><span className="text-sm">{p.date}</span></td>
                    <td className="px-4 py-3" style={{ color: '#0E0E0E' }}><span className="text-sm font-medium">{p.item?.name}</span></td>
                    <td className="px-4 py-3" style={{ color: '#0E0E0E' }}><span className="text-sm">{p.quantity} {p.item?.unit}</span></td>
                    <td className="px-4 py-3" style={{ color: '#D97706' }}><span className="text-sm font-semibold">{buyPrice > 0 ? fmt(buyPrice) : '—'}</span></td>
                    <td className="px-4 py-3" style={{ color: '#DC2626' }}><span className="text-sm font-semibold">{buyPrice > 0 ? fmt(buyPrice * p.quantity) : '—'}</span></td>
                    <td className="px-4 py-3" style={{ color: '#6B6B6B' }}><span className="text-sm">{sellPrice > 0 ? fmt(sellPrice) : '—'}</span></td>
                    <td className="px-4 py-3">
                      {margin !== null ? (
                        <span style={{
                          backgroundColor: isProfit ? '#F0FDF4' : '#FEF2F2',
                          color: isProfit ? '#16A34A' : '#DC2626',
                          border: `1px solid ${isProfit ? '#BBF7D0' : '#FECACA'}`,
                        }} className="text-xs px-2 py-0.5 rounded-full font-semibold">
                          {isProfit ? '+' : ''}{margin.toFixed(1)}%
                        </span>
                      ) : <span style={{ color: '#ABABAB' }} className="text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3" style={{ color: '#6B6B6B' }}><span className="text-sm">{p.notes || '—'}</span></td>
                    <td className="px-4 py-3">
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setEditTarget(p)}
                          style={{ background: '#F8F8F6', border: '1px solid #E8E8E6', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', color: '#6B6B6B', fontWeight: 600 }}>
                          Edit
                        </button>
                        <button onClick={async () => { if (!window.confirm('Hapus entri ini?')) return; await supabase.from('transactions').delete().eq('id', p.id); loadData() }}
                          style={{ background: 'none', border: '1px solid #FECACA', borderRadius: 6, width: 28, height: 28, cursor: 'pointer', color: '#DC2626', fontSize: 14 }}>
                          ×
                        </button>
                      </div>
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>

      {showModal && <PurchaseModal items={items} suppliers={supplierList} onClose={() => setShowModal(false)} onSave={() => { setShowModal(false); loadData() }} />}
      {editTarget && <EditModal purchase={editTarget} onClose={() => setEditTarget(null)} onSave={() => { setEditTarget(null); loadData() }} />}
      {showScan && <ScanInvoiceModal invItems={items} onClose={() => setShowScan(false)} onSave={() => loadData()} />}
    </div>
  )
}
