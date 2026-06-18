import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import PageHeader from '../components/PageHeader'
import { Plus, X, ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react'

const ink   = '#0E0E0E'
const muted = '#6B6B6B'
const bdr   = '#E8E8E6'
const red   = '#D91C1C'

function fmt(n: number) {
  return new Intl.NumberFormat('id-ID').format(Math.round(n))
}
function fmtRp(n: number) {
  return 'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(n))
}

interface InventoryItem {
  id: string
  name: string
  unit: string
  category: string
  cost_price: number
  default_recipe_unit: string | null
  default_recipe_conversion: number | null
}

interface Ingredient {
  id: string
  recipe_id: string
  item_id: string | null
  item_name_override: string | null
  quantity: number
  unit: string
  unit_conversion: number   // recipe_units per 1 inventory_unit, default 1
  manual_cost: number       // cost per unit for manual (non-inventory) ingredients
  item?: { name: string; unit: string; cost_price: number }
}

interface OutputItem {
  id: string
  name: string
  unit: string
  cost_price?: number
}

interface SubRecipe {
  id: string
  name: string
  yield_qty: number
  yield_unit: string
  notes: string | null
  output_item_id: string | null
  output_item?: OutputItem | null
  ingredients?: Ingredient[]
}

// ── Ingredient Row Modal ───────────────────────────────────────────────────────
function IngredientModal({ recipeId, existing, inventoryItems, onClose, onSave }: {
  recipeId: string
  existing?: Ingredient
  inventoryItems: InventoryItem[]
  onClose: () => void
  onSave: () => void
}) {
  // If existing has item_id, pre-select; else use name_override
  const [selectedItemId, setSelectedItemId] = useState(existing?.item_id ?? '')
  const [customName, setCustomName]         = useState(existing?.item_name_override ?? '')
  const [useCustom, setUseCustom]           = useState(!existing?.item_id && !!existing?.item_name_override)
  const [qty,  setQty]    = useState(existing ? String(existing.quantity) : '')
  // For existing ingredients: if unit_conversion was never set (=1), fall back to item's saved default
  const existingItem = inventoryItems.find(i => i.id === existing?.item_id)
  const [unit, setUnit]   = useState(existing?.unit ?? existingItem?.default_recipe_unit ?? 'g')
  const [unitConversion, setUnitConversion] = useState(() => {
    if (existing?.unit_conversion && existing.unit_conversion !== 1) return String(existing.unit_conversion)
    if (existingItem?.default_recipe_conversion && existingItem.default_recipe_conversion !== 1) return String(existingItem.default_recipe_conversion)
    return '1'
  })
  const [manualCost, setManualCost] = useState(existing?.manual_cost ? String(existing.manual_cost) : '')
  const [search, setSearch] = useState('')
  const [saving, setSave] = useState(false)

  // When item selected from dropdown, auto-fill unit & conversion (from saved default or inventory unit)
  function pickItem(id: string) {
    setSelectedItemId(id)
    const item = inventoryItems.find(i => i.id === id)
    if (item) {
      setUnit(item.default_recipe_unit ?? item.unit)
      setUnitConversion(String(item.default_recipe_conversion ?? 1))
    }
  }

  const selectedItem = inventoryItems.find(i => i.id === selectedItemId)
  // Show conversion field when recipe unit differs from inventory unit
  const unitsDiffer = !useCustom && !!selectedItem && unit.trim().toLowerCase() !== selectedItem.unit.toLowerCase()
  const convFactor  = parseFloat(unitConversion) || 1
  const costPerRecipeUnit = selectedItem && selectedItem.cost_price > 0 ? selectedItem.cost_price / convFactor : 0

  const filtered = inventoryItems.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase())
  )

  async function save() {
    const isValid = useCustom ? customName.trim() : selectedItemId
    if (!isValid || !qty) return
    setSave(true)
    const base = { recipe_id: recipeId, quantity: parseFloat(qty), unit, unit_conversion: convFactor, manual_cost: useCustom ? (parseFloat(manualCost) || 0) : 0 }
    const extra = useCustom
      ? { item_id: null as string | null, item_name_override: customName.trim() }
      : { item_id: selectedItemId as string | null, item_name_override: null as string | null }
    const payload = { ...base, ...extra }

    if (existing) {
      await supabase.from('sub_recipe_ingredients').update(payload).eq('id', existing.id)
    } else {
      await supabase.from('sub_recipe_ingredients').insert(payload)
    }
    // Save default recipe unit/conversion back to item so next recipe auto-fills
    if (!useCustom && selectedItemId && unitsDiffer) {
      await supabase.from('items').update({
        default_recipe_unit: unit.trim(),
        default_recipe_conversion: convFactor,
      }).eq('id', selectedItemId)
    }
    setSave(false); onSave()
  }

  const canSave = (useCustom ? customName.trim() : selectedItemId) && !!qty

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div style={{ backgroundColor: '#fff', borderRadius: 16, border: `1px solid ${bdr}`, width: '100%', maxWidth: 440, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ borderBottom: `1px solid ${bdr}`, flexShrink: 0 }} className="flex items-center justify-between px-6 py-4">
          <h3 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 15, color: ink }}>
            {existing ? 'Edit Bahan' : 'Tambah Bahan'}
          </h3>
          <button onClick={onClose}><X size={16} style={{ color: muted }} /></button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: '24px 24px 0' }} className="space-y-4">

          {/* Toggle: from inventory vs custom */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setUseCustom(false)}
              style={{ flex: 1, padding: '8px', borderRadius: 8, border: `2px solid ${!useCustom ? red : bdr}`, backgroundColor: !useCustom ? '#FFF0F0' : '#fff', color: !useCustom ? red : muted, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              📦 Dari Inventory
            </button>
            <button type="button" onClick={() => setUseCustom(true)}
              style={{ flex: 1, padding: '8px', borderRadius: 8, border: `2px solid ${useCustom ? red : bdr}`, backgroundColor: useCustom ? '#FFF0F0' : '#fff', color: useCustom ? red : muted, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              ✏️ Tulis Manual
            </button>
          </div>

          {!useCustom ? (
            <div>
              <label style={{ color: muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Pilih Bahan</label>
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Cari bahan..."
                style={{ display: 'block', width: '100%', marginTop: 6, padding: '10px 12px', fontSize: 13, border: `1px solid ${bdr}`, borderRadius: 10, outline: 'none', color: ink, backgroundColor: '#F8F8F6', boxSizing: 'border-box' }}
              />
              <div style={{ marginTop: 6, border: `1px solid ${bdr}`, borderRadius: 10, maxHeight: 200, overflowY: 'auto', backgroundColor: '#fff' }}>
                {filtered.length === 0 ? (
                  <div style={{ padding: '12px 16px', color: muted, fontSize: 13 }}>Tidak ada hasil</div>
                ) : filtered.map(item => (
                  <div key={item.id} onClick={() => pickItem(item.id)}
                    style={{
                      padding: '10px 16px', cursor: 'pointer', borderBottom: `1px solid #F5F5F3`,
                      backgroundColor: selectedItemId === item.id ? '#FFF0F0' : 'transparent',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                    <div>
                      <span style={{ fontSize: 13, color: ink, fontWeight: selectedItemId === item.id ? 600 : 400 }}>{item.name}</span>
                      <span style={{ fontSize: 11, color: muted, marginLeft: 6 }}>({item.unit})</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                      {item.cost_price > 0 ? (
                        <span style={{ fontSize: 11, color: '#16A34A', fontWeight: 600 }}>{fmtRp(item.cost_price)}/{item.unit}</span>
                      ) : (
                        <span style={{ fontSize: 11, color: '#ABABAB' }}>no cost</span>
                      )}
                      <span style={{ fontSize: 10, padding: '1px 6px', backgroundColor: '#F0F0EE', borderRadius: 4, color: muted }}>{item.category}</span>
                    </div>
                  </div>
                ))}
              </div>
              {selectedItem && (
                <div style={{ marginTop: 8, padding: '8px 12px', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, fontSize: 12, color: '#16A34A' }}>
                  ✓ {selectedItem.name} — modal {selectedItem.cost_price > 0 ? fmtRp(selectedItem.cost_price) + '/' + selectedItem.unit : 'belum diisi'}
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ color: muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Nama Bahan / Jasa</label>
                <input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="misal: Jasa Pengolahan, Gas"
                  style={{ display: 'block', width: '100%', marginTop: 6, padding: '10px 12px', fontSize: 14, border: `1px solid ${bdr}`, borderRadius: 10, outline: 'none', color: ink, backgroundColor: '#F8F8F6', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ color: muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Biaya per Satuan (Rp)</label>
                <input type="number" value={manualCost} onChange={e => setManualCost(e.target.value)} min="0" step="any"
                  onFocus={e => e.target.select()} placeholder="0"
                  style={{ display: 'block', width: '100%', marginTop: 6, padding: '10px 12px', fontSize: 14, border: `1px solid ${bdr}`, borderRadius: 10, outline: 'none', color: ink, backgroundColor: '#F8F8F6', boxSizing: 'border-box' }} />
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ color: muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Jumlah</label>
              <input type="number" value={qty} onChange={e => setQty(e.target.value)} min="0" step="any"
                onFocus={e => e.target.select()}
                style={{ display: 'block', width: '100%', marginTop: 6, padding: '10px 12px', fontSize: 14, border: `1px solid ${bdr}`, borderRadius: 10, outline: 'none', color: ink, backgroundColor: '#F8F8F6', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ color: muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Satuan di Resep</label>
              <input value={unit} onChange={e => setUnit(e.target.value)} placeholder="g / ml / pcs"
                style={{ display: 'block', width: '100%', marginTop: 6, padding: '10px 12px', fontSize: 14, border: `1px solid ${bdr}`, borderRadius: 10, outline: 'none', color: ink, backgroundColor: '#F8F8F6', boxSizing: 'border-box' }} />
            </div>
          </div>

          {/* Conversion field — only when recipe unit ≠ inventory unit */}
          {unitsDiffer && (
            <div style={{ padding: '10px 14px', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10 }}>
              <label style={{ color: '#92400E', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Konversi Satuan
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                <span style={{ fontSize: 13, color: '#92400E', whiteSpace: 'nowrap' }}>1 {selectedItem!.unit} =</span>
                <input type="number" value={unitConversion} onChange={e => setUnitConversion(e.target.value)} min="0" step="any"
                  onFocus={e => e.target.select()}
                  style={{ width: 80, padding: '7px 10px', fontSize: 14, border: `1px solid #FDE68A`, borderRadius: 8, outline: 'none', color: ink, backgroundColor: '#fff', textAlign: 'right' }} />
                <span style={{ fontSize: 13, color: '#92400E', whiteSpace: 'nowrap' }}>{unit}</span>
              </div>
              <div style={{ fontSize: 11, color: '#B45309', marginTop: 4 }}>
                → modal per {unit}: {costPerRecipeUnit > 0 ? fmtRp(costPerRecipeUnit) : '—'}
              </div>
            </div>
          )}

          {/* Cost preview */}
          {qty && !useCustom && selectedItem && selectedItem.cost_price > 0 && (
            <div style={{ padding: '8px 12px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, fontSize: 12, color: '#1D4ED8' }}>
              💰 Biaya bahan ini: {fmtRp(parseFloat(qty) * costPerRecipeUnit)}
              {unitsDiffer
                ? ` (${qty} ${unit} × ${fmtRp(costPerRecipeUnit)}/${unit})`
                : ` (${qty} ${unit} × ${fmtRp(selectedItem.cost_price)}/${selectedItem.unit})`}
            </div>
          )}
          {qty && useCustom && parseFloat(manualCost) > 0 && (
            <div style={{ padding: '8px 12px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, fontSize: 12, color: '#1D4ED8' }}>
              💰 Biaya: {fmtRp(parseFloat(qty) * parseFloat(manualCost))} ({qty} {unit} × {fmtRp(parseFloat(manualCost))}/{unit})
            </div>
          )}

        </div>
        <div style={{ padding: '16px 24px', borderTop: `1px solid ${bdr}`, flexShrink: 0, display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', border: `1px solid ${bdr}`, borderRadius: 10, backgroundColor: '#fff', color: muted, fontSize: 13, cursor: 'pointer' }}>Batal</button>
          <button onClick={save} disabled={saving || !canSave} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 10, backgroundColor: red, color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: (saving || !canSave) ? 0.5 : 1 }}>
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Recipe Modal ──────────────────────────────────────────────────────────────
function RecipeModal({ existing, inventoryItems, onClose, onSave }: {
  existing?: SubRecipe
  inventoryItems: InventoryItem[]
  onClose: () => void
  onSave: () => void
}) {
  const [outputItemId, setOutputItemId] = useState(existing?.output_item_id ?? '')
  const [name,      setName]  = useState(existing?.name ?? '')
  const [yield_qty, setYield] = useState(existing ? String(existing.yield_qty) : '')
  const [yunit,     setYUnit] = useState(existing?.yield_unit ?? 'pcs')
  const [notes,     setNotes] = useState(existing?.notes ?? '')
  const [search,    setSearch] = useState('')
  const [saving,    setSave]  = useState(false)

  const prodItems = inventoryItems.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase())
  )
  const selectedOutputItem = inventoryItems.find(i => i.id === outputItemId)

  function pickOutputItem(item: InventoryItem) {
    setOutputItemId(item.id)
    if (!name) setName(item.name)
    if (!yunit) setYUnit(item.unit)
  }

  async function save() {
    if (!name.trim() || !yield_qty) return
    setSave(true)
    const payload = {
      name: name.trim(),
      yield_qty: parseFloat(yield_qty),
      yield_unit: yunit,
      notes: notes.trim() || null,
      output_item_id: outputItemId || null,
    }
    if (existing) {
      await supabase.from('sub_recipes').update(payload).eq('id', existing.id)
    } else {
      await supabase.from('sub_recipes').insert(payload)
    }
    setSave(false); onSave()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div style={{ backgroundColor: '#fff', borderRadius: 16, border: `1px solid ${bdr}` }} className="w-full max-w-md">
        <div style={{ borderBottom: `1px solid ${bdr}` }} className="flex items-center justify-between px-6 py-4">
          <h3 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 15, color: ink }}>
            {existing ? 'Edit Resep' : 'Tambah Resep Baru'}
          </h3>
          <button onClick={onClose}><X size={16} style={{ color: muted }} /></button>
        </div>
        <div className="p-6 space-y-4">

          {/* Output item picker */}
          <div>
            <label style={{ color: muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Barang Produksi (Inventory)</label>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari barang produksi..."
              style={{ display: 'block', width: '100%', marginTop: 6, padding: '10px 12px', fontSize: 13, border: `1px solid ${bdr}`, borderRadius: 10, outline: 'none', color: ink, backgroundColor: '#F8F8F6', boxSizing: 'border-box' }} />
            <div style={{ marginTop: 6, border: `1px solid ${bdr}`, borderRadius: 10, maxHeight: 160, overflowY: 'auto', backgroundColor: '#fff' }}>
              {prodItems.length === 0
                ? <div style={{ padding: '10px 16px', color: muted, fontSize: 13 }}>Tidak ada hasil</div>
                : prodItems.map(item => (
                  <div key={item.id} onClick={() => pickOutputItem(item)}
                    style={{ padding: '9px 16px', cursor: 'pointer', borderBottom: `1px solid #F5F5F3`, backgroundColor: outputItemId === item.id ? '#FFF0F0' : 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: ink, fontWeight: outputItemId === item.id ? 600 : 400 }}>{item.name}</span>
                    <span style={{ fontSize: 11, color: muted }}>{item.unit} · {item.category}</span>
                  </div>
                ))
              }
            </div>
            {selectedOutputItem
              ? <div style={{ marginTop: 6, padding: '7px 12px', backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, fontSize: 12, color: '#16A34A', display: 'flex', justifyContent: 'space-between' }}>
                  <span>✓ {selectedOutputItem.name}</span>
                  <button onClick={() => setOutputItemId('')} style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: 12 }}>✕</button>
                </div>
              : <div style={{ marginTop: 6, fontSize: 11, color: muted }}>Opsional — untuk link HPP ke inventory</div>
            }
          </div>

          <div>
            <label style={{ color: muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Nama Resep</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="misal: Tender, Pops, Bumbu Dasar"
              style={{ display: 'block', width: '100%', marginTop: 6, padding: '10px 12px', fontSize: 14, border: `1px solid ${bdr}`, borderRadius: 10, outline: 'none', color: ink, backgroundColor: '#F8F8F6', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ color: muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Yield per Batch</label>
              <input type="number" value={yield_qty} onChange={e => setYield(e.target.value)} min="0" step="any"
                onFocus={e => e.target.select()}
                style={{ display: 'block', width: '100%', marginTop: 6, padding: '10px 12px', fontSize: 14, border: `1px solid ${bdr}`, borderRadius: 10, outline: 'none', color: ink, backgroundColor: '#F8F8F6', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ color: muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Satuan</label>
              <input value={yunit} onChange={e => setYUnit(e.target.value)} placeholder="pcs / g / porsi"
                style={{ display: 'block', width: '100%', marginTop: 6, padding: '10px 12px', fontSize: 14, border: `1px solid ${bdr}`, borderRadius: 10, outline: 'none', color: ink, backgroundColor: '#F8F8F6', boxSizing: 'border-box' }} />
            </div>
          </div>
          <div>
            <label style={{ color: muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Catatan</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="misal: 1 batch = 10 porsi tender"
              style={{ display: 'block', width: '100%', marginTop: 6, padding: '10px 12px', fontSize: 13, border: `1px solid ${bdr}`, borderRadius: 10, outline: 'none', color: ink, backgroundColor: '#F8F8F6', resize: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '10px', border: `1px solid ${bdr}`, borderRadius: 10, backgroundColor: '#fff', color: muted, fontSize: 13, cursor: 'pointer' }}>Batal</button>
            <button onClick={save} disabled={saving || !name.trim() || !yield_qty} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 10, backgroundColor: red, color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
interface HppItemUpdate {
  id: string; name: string; unit: string
  oldPrice: number; newPrice: number; totalQty: number; txCount: number
}
interface HppRecipeUpdate {
  recipeName: string; outputName: string; oldHpp: number; newHpp: number
}
interface YieldRow {
  ingredientId: string
  rawItemId: string
  rawItemName: string
  boughtKg: number
  recipeName: string
  outputItemId: string
  outputItemName: string
  outputUnit: string
  produced: number
  yieldPerKg: number
  currentUc: number
  newUc: number
  ingredientQty: number
}

export default function Recipes() {
  const [recipes,   setRecipes]  = useState<SubRecipe[]>([])
  const [invItems,  setInvItems] = useState<InventoryItem[]>([])
  const [loading,   setLoading]  = useState(true)
  const [expanded,  setExpanded] = useState<Set<string>>(new Set())
  const [showNew,   setShowNew]  = useState(false)
  const [editing,   setEditing]  = useState<SubRecipe | null>(null)
  const [addIngTo,  setAddIngTo] = useState<string | null>(null)
  const [editIng,   setEditIng]  = useState<Ingredient | null>(null)
  const [savingHPP, setSavingHPP] = useState<string | null>(null)  // recipe id being saved
  // HPP Bulanan
  const [hppMonth,    setHppMonth]    = useState(() => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}` })
  const [hppRunning,  setHppRunning]  = useState(false)
  const [hppResult,   setHppResult]   = useState<{ items: HppItemUpdate[]; recipes: HppRecipeUpdate[] } | null>(null)
  const [yieldData,   setYieldData]   = useState<YieldRow[] | null>(null)
  const [yieldLoading, setYieldLoading] = useState(false)
  // Unit conversion modal state
  const [convertModal, setConvertModal] = useState<{ recipe: SubRecipe; costPerYieldUnit: number } | null>(null)
  const [convFactor, setConvFactor]     = useState('')  // how many yield_unit per 1 inventory_unit

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: recs }, { data: items }] = await Promise.all([
      supabase
        .from('sub_recipes')
        .select('*, output_item:items!output_item_id(id,name,unit), ingredients:sub_recipe_ingredients(*, item:items(name,unit,cost_price))')
        .order('name')
        .returns<SubRecipe[]>(),
      supabase
        .from('items')
        .select('id,name,unit,category,cost_price,default_recipe_unit,default_recipe_conversion')
        .order('category').order('name'),
    ])
    setRecipes((recs ?? []) as SubRecipe[])
    setInvItems((items ?? []) as InventoryItem[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function toggle(id: string) {
    setExpanded(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  }

  async function deleteRecipe(id: string) {
    if (!confirm('Hapus resep ini beserta semua bahannya?')) return
    await supabase.from('sub_recipe_ingredients').delete().eq('recipe_id', id)
    await supabase.from('sub_recipes').delete().eq('id', id)
    load()
  }

  async function deleteIngredient(id: string) {
    await supabase.from('sub_recipe_ingredients').delete().eq('id', id)
    load()
  }

  // Calculate total HPP for a recipe
  function calcHPP(recipe: SubRecipe) {
    const ings = recipe.ingredients ?? []
    const total = ings.reduce((s, ing) => {
      const cp = ing.item?.cost_price ?? 0
      const conv = ing.unit_conversion > 0 ? ing.unit_conversion : 1
      if (cp > 0) return s + ing.quantity * (cp / conv)
      if (!ing.item_id && ing.manual_cost > 0) return s + ing.quantity * ing.manual_cost
      return s
    }, 0)
    const allCosted = ings.length > 0 && ings.every(i => (i.item?.cost_price ?? 0) > 0)
    const someCosted = ings.some(i => (i.item?.cost_price ?? 0) > 0)
    return { total, allCosted, someCosted }
  }

  // Save calculated HPP to linked inventory item's cost_price
  async function saveHPPToInventory(recipe: SubRecipe) {
    if (!recipe.output_item_id) return
    const { total, someCosted } = calcHPP(recipe)
    if (!someCosted || recipe.yield_qty <= 0) return
    const costPerYieldUnit = total / recipe.yield_qty  // e.g. cost per gram

    // Check if units match between recipe yield and inventory item
    const invUnit   = recipe.output_item?.unit ?? ''
    const yieldUnit = recipe.yield_unit.toLowerCase()
    const grUnits   = ['g', 'gr', 'gram', 'grams']
    const sameUnit  = invUnit.toLowerCase() === yieldUnit
    const needsConv = !sameUnit && (grUnits.includes(yieldUnit) || grUnits.includes(invUnit.toLowerCase()))

    if (needsConv) {
      // Prompt user for conversion factor
      setConvertModal({ recipe, costPerYieldUnit })
      setConvFactor('')
      return
    }

    // Same unit — save directly
    setSavingHPP(recipe.id)
    await supabase.from('items').update({ cost_price: costPerYieldUnit }).eq('id', recipe.output_item_id)
    setSavingHPP(null)
    load()
  }

  async function confirmSaveHPP() {
    if (!convertModal) return
    const factor = parseFloat(convFactor)
    if (!factor || factor <= 0) return
    const { recipe, costPerYieldUnit } = convertModal
    const costPerInvUnit = costPerYieldUnit * factor  // e.g. cost_per_gr × 1000 = cost_per_pack
    setSavingHPP(recipe.id)
    setConvertModal(null)
    await supabase.from('items').update({ cost_price: costPerInvUnit }).eq('id', recipe.output_item_id!)
    setSavingHPP(null)
    load()
  }

  async function fetchYieldData() {
    setYieldLoading(true)
    setYieldData(null)
    const [year, month] = hppMonth.split('-')
    const firstDay = `${year}-${month}-01`
    const lastDay  = new Date(Number(year), Number(month), 0).toISOString().slice(0, 10)

    // 1. Purchasing totals per item
    const { data: txns } = await supabase
      .from('transactions')
      .select('item_id, quantity')
      .eq('type', 'in').eq('source', 'purchase')
      .gte('date', firstDay).lte('date', lastDay)

    if (!txns || txns.length === 0) {
      alert('Tidak ada data purchasing bulan ini.')
      setYieldLoading(false)
      return
    }
    const boughtMap: Record<string, number> = {}
    for (const t of txns) {
      if (t.item_id) boughtMap[t.item_id] = (boughtMap[t.item_id] || 0) + t.quantity
    }

    // 2. Find sub_recipe_ingredients that use these raw materials
    const { data: ings } = await supabase
      .from('sub_recipe_ingredients')
      .select('id, recipe_id, item_id, quantity, unit_conversion, item:items(name), recipe:sub_recipes(id, name, output_item_id, output_item:items!output_item_id(id, name, unit))')
      .in('item_id', Object.keys(boughtMap))

    if (!ings || ings.length === 0) { setYieldLoading(false); return }

    // 3. Production totals for the output items
    const outputIds = [...new Set(ings.map(i => (i.recipe as any)?.output_item_id).filter(Boolean))]
    const { data: prodLogs } = await supabase
      .from('production_logs')
      .select('item_id, quantity')
      .in('item_id', outputIds)
      .gte('produced_at', firstDay).lte('produced_at', lastDay)

    const producedMap: Record<string, number> = {}
    for (const p of prodLogs ?? []) {
      producedMap[p.item_id] = (producedMap[p.item_id] || 0) + p.quantity
    }

    // 4. Build yield rows
    const rows: YieldRow[] = []
    for (const ing of ings) {
      const recipe = ing.recipe as any
      if (!recipe?.output_item_id) continue
      const boughtKg  = boughtMap[ing.item_id!] || 0
      const produced  = producedMap[recipe.output_item_id] || 0
      const rawName = (ing.item as any)?.name ?? ''
      if (!rawName.toLowerCase().startsWith('ayam')) continue
      if (boughtKg === 0 || produced === 0) continue
      const yieldPerKg = produced / boughtKg
      const newUc      = (ing.quantity as number) * yieldPerKg
      rows.push({
        ingredientId:   ing.id,
        rawItemId:      ing.item_id!,
        rawItemName:    (ing.item as any)?.name ?? ing.item_id!,
        boughtKg,
        recipeName:     recipe.name,
        outputItemId:   recipe.output_item_id,
        outputItemName: recipe.output_item?.name ?? '',
        outputUnit:     recipe.output_item?.unit ?? '',
        produced,
        yieldPerKg,
        currentUc:      ing.unit_conversion as number,
        newUc,
        ingredientQty:  ing.quantity as number,
      })
    }
    setYieldData(rows)
    setYieldLoading(false)
  }

  async function runHppBulanan() {
    setHppRunning(true)
    setHppResult(null)

    // Apply yield-based unit_conversions if yield data is loaded
    if (yieldData && yieldData.length > 0) {
      for (const row of yieldData) {
        if (row.newUc > 0 && Math.abs(row.newUc - row.currentUc) > 0.01) {
          await supabase.from('sub_recipe_ingredients')
            .update({ unit_conversion: row.newUc })
            .eq('id', row.ingredientId)
        }
      }
    }

    const [year, month] = hppMonth.split('-')
    const firstDay = `${year}-${month}-01`
    const lastDay  = new Date(Number(year), Number(month), 0).toISOString().slice(0, 10)

    // 1. Fetch all purchases for the month
    const { data: txns } = await supabase
      .from('transactions')
      .select('item_id, quantity, unit_price')
      .eq('type', 'in').eq('source', 'purchase')
      .gte('date', firstDay).lte('date', lastDay)

    if (!txns || txns.length === 0) {
      setHppRunning(false)
      alert('Tidak ada data purchasing untuk bulan ini.')
      return
    }

    // 2. Weighted average per item
    const grouped: Record<string, { totalQty: number; totalCost: number; txCount: number }> = {}
    for (const t of txns) {
      if (!t.item_id) continue
      if (!grouped[t.item_id]) grouped[t.item_id] = { totalQty: 0, totalCost: 0, txCount: 0 }
      grouped[t.item_id].totalQty  += t.quantity
      grouped[t.item_id].totalCost += t.quantity * t.unit_price
      grouped[t.item_id].txCount++
    }

    // 3. Get current prices
    const itemIds = Object.keys(grouped)
    const { data: currentItems } = await supabase
      .from('items').select('id,name,unit,cost_price').in('id', itemIds)
    const itemMap = Object.fromEntries((currentItems ?? []).map(i => [i.id, i]))

    const itemUpdates: HppItemUpdate[] = itemIds
      .map(id => ({
        id,
        name:     itemMap[id]?.name ?? id,
        unit:     itemMap[id]?.unit ?? '',
        oldPrice: itemMap[id]?.cost_price ?? 0,
        newPrice: grouped[id].totalCost / grouped[id].totalQty,
        txCount:  grouped[id].txCount,
        totalQty: grouped[id].totalQty,
      }))
      .filter(u => Math.abs(u.newPrice - u.oldPrice) > 0.5)

    // 4. Write updated cost_prices for bahan baku
    for (const u of itemUpdates) {
      await supabase.from('items').update({ cost_price: u.newPrice }).eq('id', u.id)
    }
    // Also write all (including unchanged) so fresh prices are in DB
    for (const id of itemIds) {
      const np = grouped[id].totalCost / grouped[id].totalQty
      await supabase.from('items').update({ cost_price: np }).eq('id', id)
    }

    // 5. Re-fetch sub recipes with fresh ingredient prices
    const { data: freshRecipes } = await supabase
      .from('sub_recipes')
      .select('*, output_item:items!output_item_id(id,name,unit,cost_price), ingredients:sub_recipe_ingredients(*, item:items(name,unit,cost_price))')
      .not('output_item_id', 'is', null)
      .returns<SubRecipe[]>()

    const recipeUpdates: HppRecipeUpdate[] = []
    for (const recipe of (freshRecipes ?? [])) {
      if (!recipe.output_item_id || !recipe.output_item) continue
      const ings = recipe.ingredients ?? []
      const total = ings.reduce((s, ing) => {
        const cp   = ing.item?.cost_price ?? 0
        const conv = ing.unit_conversion > 0 ? ing.unit_conversion : 1
        if (cp > 0)                              return s + ing.quantity * (cp / conv)
        if (!ing.item_id && ing.manual_cost > 0) return s + ing.quantity * ing.manual_cost
        return s
      }, 0)
      if (total <= 0 || recipe.yield_qty <= 0) continue
      // Skip sub recipes that need a unit conversion (e.g. yield in gr but item in pack)
      if (recipe.output_item.unit.toLowerCase() !== recipe.yield_unit.toLowerCase()) continue

      const newHpp = total / recipe.yield_qty
      const oldHpp = recipe.output_item.cost_price ?? 0
      recipeUpdates.push({ recipeName: recipe.name, outputName: recipe.output_item.name, oldHpp, newHpp })
      await supabase.from('items').update({ cost_price: newHpp }).eq('id', recipe.output_item_id)
    }

    setHppResult({ items: itemUpdates, recipes: recipeUpdates })
    setHppRunning(false)
    load()
  }

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Sub Resep"
        subtitle="Bumbu dasar, coating, dan resep per porsi"
        action={
          <button onClick={() => setShowNew(true)} style={{ backgroundColor: red, color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={14} /> Tambah Resep
          </button>
        }
      />

      <div className="px-8 py-6 space-y-4">

        {/* ── HPP Bulanan ── */}
        <div style={{ backgroundColor: '#fff', border: `1px solid ${bdr}`, borderRadius: 14, padding: '20px 24px' }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: ink, marginBottom: 12 }}>⚡ Hitung HPP Otomatis</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 12, color: muted }}>Bulan</label>
              <input type="month" value={hppMonth} onChange={e => { setHppMonth(e.target.value); setHppResult(null); setYieldData(null) }}
                style={{ border: `1px solid ${bdr}`, borderRadius: 8, padding: '7px 12px', fontSize: 14, color: ink, outline: 'none' }} />
            </div>
            <button onClick={fetchYieldData} disabled={yieldLoading}
              style={{ marginTop: 20, backgroundColor: yieldLoading ? '#ccc' : '#fff', color: yieldLoading ? '#999' : ink, border: `1px solid ${bdr}`, borderRadius: 10, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: yieldLoading ? 'not-allowed' : 'pointer' }}>
              {yieldLoading ? 'Memuat...' : '📊 Lihat Yield'}
            </button>
            <button onClick={runHppBulanan} disabled={hppRunning}
              style={{ marginTop: 20, backgroundColor: hppRunning ? '#ccc' : '#0E0E0E', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: hppRunning ? 'not-allowed' : 'pointer' }}>
              {hppRunning ? 'Menghitung...' : 'Hitung & Simpan HPP'}
            </button>
          </div>
          <p style={{ fontSize: 12, color: muted, marginTop: 8 }}>
            {yieldData ? '✅ Yield bulan ini sudah dimuat — HPP akan pakai yield terbaru.' : 'Klik "Lihat Yield" dulu untuk update yield sebelum hitung HPP, atau langsung hitung pakai yield sebelumnya.'}
          </p>

          {/* Yield table */}
          {yieldData && yieldData.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Yield Rata-rata Bulan Ini</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${bdr}` }}>
                      {['Bahan Baku', 'Produk', 'Beli (kg)', 'Produksi', 'Yield/kg', 'UC Lama → Baru'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '6px 10px', color: muted, fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {yieldData.map(row => {
                      const changed = Math.abs(row.newUc - row.currentUc) > 0.01
                      return (
                        <tr key={row.ingredientId} style={{ borderBottom: `1px solid ${bdr}` }}>
                          <td style={{ padding: '8px 10px', fontWeight: 600 }}>{row.rawItemName}</td>
                          <td style={{ padding: '8px 10px', color: muted }}>{row.outputItemName}</td>
                          <td style={{ padding: '8px 10px' }}>{fmt(row.boughtKg)} kg</td>
                          <td style={{ padding: '8px 10px' }}>{fmt(row.produced)} {row.outputUnit}</td>
                          <td style={{ padding: '8px 10px', fontWeight: 600 }}>{row.yieldPerKg.toFixed(2)} {row.outputUnit}/kg</td>
                          <td style={{ padding: '8px 10px', color: changed ? '#D97706' : muted, fontWeight: changed ? 700 : 400 }}>
                            {row.currentUc.toFixed(2)} → {row.newUc.toFixed(2)}
                            {changed && <span style={{ marginLeft: 6, fontSize: 11 }}>⚠️</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p style={{ fontSize: 12, color: muted, marginTop: 8 }}>Nilai UC baru akan diterapkan otomatis saat klik "Hitung &amp; Simpan HPP".</p>
            </div>
          )}

          {hppResult && (
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Bahan baku updates */}
              {hppResult.items.length > 0 ? (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bahan Baku Diupdate</div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${bdr}` }}>
                          {['Item', 'Total Beli', 'Harga Lama', 'Harga Baru', 'Selisih'].map(h => (
                            <th key={h} style={{ textAlign: 'left', padding: '6px 10px', color: muted, fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {hppResult.items.map(u => (
                          <tr key={u.id} style={{ borderBottom: `1px solid ${bdr}` }}>
                            <td style={{ padding: '8px 10px', fontWeight: 600 }}>{u.name}</td>
                            <td style={{ padding: '8px 10px', color: muted }}>{fmt(u.totalQty)} {u.unit} ({u.txCount}x)</td>
                            <td style={{ padding: '8px 10px', color: muted }}>{fmtRp(u.oldPrice)}</td>
                            <td style={{ padding: '8px 10px', fontWeight: 600 }}>{fmtRp(u.newPrice)}/{u.unit}</td>
                            <td style={{ padding: '8px 10px', color: u.newPrice > u.oldPrice ? red : '#16A34A', fontWeight: 600 }}>
                              {u.newPrice > u.oldPrice ? '+' : ''}{fmtRp(u.newPrice - u.oldPrice)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: 13, color: muted }}>Tidak ada perubahan harga bahan baku bulan ini.</p>
              )}

              {/* Recipe HPP updates */}
              {hppResult.recipes.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>HPP Produk Diupdate</div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${bdr}` }}>
                          {['Produk', 'HPP Lama', 'HPP Baru', 'Selisih'].map(h => (
                            <th key={h} style={{ textAlign: 'left', padding: '6px 10px', color: muted, fontWeight: 600 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {hppResult.recipes.map((r, i) => (
                          <tr key={i} style={{ borderBottom: `1px solid ${bdr}` }}>
                            <td style={{ padding: '8px 10px', fontWeight: 600 }}>{r.outputName}</td>
                            <td style={{ padding: '8px 10px', color: muted }}>{fmtRp(r.oldHpp)}</td>
                            <td style={{ padding: '8px 10px', fontWeight: 600 }}>{fmtRp(r.newHpp)}</td>
                            <td style={{ padding: '8px 10px', color: r.newHpp > r.oldHpp ? red : '#16A34A', fontWeight: 600 }}>
                              {r.newHpp > r.oldHpp ? '+' : ''}{fmtRp(r.newHpp - r.oldHpp)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              <p style={{ fontSize: 12, color: '#16A34A', fontWeight: 600 }}>✓ Semua HPP berhasil disimpan</p>
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ color: muted, textAlign: 'center', padding: 60 }}>Memuat...</div>
        ) : recipes.length === 0 ? (
          <div style={{ backgroundColor: '#fff', border: `1px solid ${bdr}`, borderRadius: 16, padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <p style={{ color: muted, fontSize: 14 }}>Belum ada resep. Klik "+ Tambah Resep" untuk mulai.</p>
          </div>
        ) : (
          recipes.map(recipe => {
            const isOpen = expanded.has(recipe.id)
            const ings   = recipe.ingredients ?? []
            const totalQty = ings.reduce((s, i) => s + i.quantity, 0)
            const { total: hpp, allCosted, someCosted } = calcHPP(recipe)
            const hppPerUnit = recipe.yield_qty > 0 ? hpp / recipe.yield_qty : 0

            return (
              <div key={recipe.id} style={{ backgroundColor: '#fff', border: `1px solid ${bdr}`, borderRadius: 14, overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', cursor: 'pointer' }} onClick={() => toggle(recipe.id)}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: "'Archivo Black', sans-serif", color: ink, fontSize: 15 }}>{recipe.name}</span>
                      <span style={{ fontSize: 12, padding: '2px 8px', backgroundColor: '#EFF6FF', color: '#1D4ED8', borderRadius: 6, fontWeight: 600 }}>
                        yield {fmt(recipe.yield_qty)} {recipe.yield_unit}
                      </span>
                      <span style={{ fontSize: 12, color: muted }}>{ings.length} bahan</span>
                      {/* Linked inventory item badge */}
                      {recipe.output_item && (
                        <span style={{ fontSize: 11, padding: '2px 8px', backgroundColor: '#F3F4F6', color: muted, borderRadius: 6, display: 'flex', alignItems: 'center', gap: 3 }}>
                          📦 {recipe.output_item.name} <span style={{ color: '#ABABAB' }}>({recipe.output_item.unit})</span>
                        </span>
                      )}
                      {/* HPP badge */}
                      {someCosted && (
                        <span style={{
                          fontSize: 12, padding: '2px 8px', borderRadius: 6, fontWeight: 600,
                          backgroundColor: allCosted ? '#F0FDF4' : '#FFFBEB',
                          color: allCosted ? '#16A34A' : '#B45309',
                        }}>
                          HPP {allCosted ? '' : '~'}{fmtRp(hppPerUnit)}/{recipe.yield_unit}
                        </span>
                      )}
                    </div>
                    {recipe.notes && <p style={{ color: '#ABABAB', fontSize: 12, marginTop: 4, fontStyle: 'italic' }}>{recipe.notes}</p>}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                    {/* Simpan HPP ke Inventory — only shown if recipe is linked to an item */}
                    {recipe.output_item_id && someCosted && (
                      <button
                        onClick={e => { e.stopPropagation(); saveHPPToInventory(recipe) }}
                        disabled={savingHPP === recipe.id}
                        title="Hitung & simpan HPP per unit ke inventory"
                        style={{ padding: '6px 10px', border: '1px solid #BBF7D0', borderRadius: 8, backgroundColor: '#F0FDF4', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#16A34A', whiteSpace: 'nowrap' }}>
                        {savingHPP === recipe.id ? '...' : '💾 Simpan HPP'}
                      </button>
                    )}
                    <button onClick={e => { e.stopPropagation(); setEditing(recipe) }}
                      style={{ padding: '6px 8px', border: `1px solid ${bdr}`, borderRadius: 8, backgroundColor: '#F8F8F6', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <Pencil size={12} style={{ color: muted }} />
                    </button>
                    <button onClick={e => { e.stopPropagation(); deleteRecipe(recipe.id) }}
                      style={{ padding: '6px 8px', border: '1px solid #FECACA', borderRadius: 8, backgroundColor: '#FEF2F2', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <Trash2 size={12} style={{ color: red }} />
                    </button>
                    {isOpen ? <ChevronUp size={16} style={{ color: '#ABABAB' }} /> : <ChevronDown size={16} style={{ color: '#ABABAB' }} />}
                  </div>
                </div>

                {/* Ingredients table */}
                {isOpen && (
                  <div style={{ borderTop: `1px solid #F0F0EE` }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#F8F8F6' }}>
                          <th style={{ padding: '8px 20px', textAlign: 'left', color: muted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Bahan</th>
                          <th style={{ padding: '8px 20px', textAlign: 'right', color: muted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Jumlah</th>
                          <th style={{ padding: '8px 20px', textAlign: 'right', color: muted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Biaya</th>
                          <th style={{ padding: '8px 20px', textAlign: 'right', color: muted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>% Batch</th>
                          <th style={{ padding: '8px 20px', width: 80 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {ings.map(ing => {
                          const name = ing.item?.name ?? ing.item_name_override ?? '—'
                          const cp   = ing.item?.cost_price ?? 0
                          const conv = (ing.unit_conversion > 0 ? ing.unit_conversion : 1)
                          const cost = cp > 0 ? ing.quantity * (cp / conv)
                            : (!ing.item_id && ing.manual_cost > 0) ? ing.quantity * ing.manual_cost
                            : null
                          const pct  = totalQty > 0 ? (ing.quantity / recipe.yield_qty * 100).toFixed(1) : '—'
                          return (
                            <tr key={ing.id} style={{ borderTop: '1px solid #F0F0EE' }}>
                              <td style={{ padding: '10px 20px', fontSize: 13, color: ink, fontWeight: 500 }}>
                                {name}
                                {ing.item_id && <span style={{ fontSize: 10, marginLeft: 6, color: '#16A34A', backgroundColor: '#F0FDF4', padding: '1px 5px', borderRadius: 4 }}>linked</span>}
                              </td>
                              <td style={{ padding: '10px 20px', textAlign: 'right', fontSize: 13, color: ink }}>
                                {fmt(ing.quantity)} {ing.unit}
                                {ing.item && ing.unit !== ing.item.unit && ing.unit_conversion > 1 && (
                                  <span style={{ fontSize: 10, marginLeft: 5, color: '#92400E', backgroundColor: '#FEF3C7', padding: '1px 5px', borderRadius: 4 }}>
                                    1 {ing.item.unit} = {fmt(conv)} {ing.unit}
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: '10px 20px', textAlign: 'right', fontSize: 12 }}>
                                {cost !== null
                                  ? <span style={{ color: '#1D4ED8', fontWeight: 600 }}>{fmtRp(cost)}</span>
                                  : <span style={{ color: '#ABABAB' }}>—</span>
                                }
                              </td>
                              <td style={{ padding: '10px 20px', textAlign: 'right', fontSize: 12, color: muted }}>{pct}%</td>
                              <td style={{ padding: '10px 20px' }}>
                                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                  <button onClick={() => setEditIng(ing)}
                                    style={{ padding: '4px 6px', border: `1px solid ${bdr}`, borderRadius: 6, backgroundColor: '#F8F8F6', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                    <Pencil size={11} style={{ color: muted }} />
                                  </button>
                                  <button onClick={() => deleteIngredient(ing.id)}
                                    style={{ padding: '4px 6px', border: '1px solid #FECACA', borderRadius: 6, backgroundColor: '#FEF2F2', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                    <Trash2 size={11} style={{ color: red }} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                        {/* Total row */}
                        <tr style={{ borderTop: '2px solid #E8E8E6', backgroundColor: '#F8F8F6' }}>
                          <td style={{ padding: '10px 20px', fontSize: 13, fontFamily: "'Archivo Black', sans-serif", color: ink }}>Total Batch</td>
                          <td style={{ padding: '10px 20px', textAlign: 'right', fontSize: 12, color: muted }}>
                            {fmt(totalQty)} g → yield {fmt(recipe.yield_qty)} {recipe.yield_unit}
                          </td>
                          <td style={{ padding: '10px 20px', textAlign: 'right' }}>
                            {someCosted ? (
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: '#1D4ED8' }}>{fmtRp(hpp)}</div>
                                {recipe.yield_qty > 0 && (
                                  <div style={{ fontSize: 11, color: muted }}>{fmtRp(hppPerUnit)}/{recipe.yield_unit}</div>
                                )}
                                {!allCosted && <div style={{ fontSize: 10, color: '#B45309', marginTop: 2 }}>⚠ ada bahan tanpa harga</div>}
                              </div>
                            ) : (
                              <span style={{ color: '#ABABAB', fontSize: 12 }}>—</span>
                            )}
                          </td>
                          <td colSpan={2} />
                        </tr>
                      </tbody>
                    </table>
                    <div style={{ padding: '12px 20px', borderTop: `1px solid #F0F0EE` }}>
                      <button onClick={() => setAddIngTo(recipe.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: `1px solid ${bdr}`, borderRadius: 8, backgroundColor: '#F8F8F6', fontSize: 12, fontWeight: 600, color: muted, cursor: 'pointer' }}>
                        <Plus size={13} /> Tambah Bahan
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {showNew    && <RecipeModal inventoryItems={invItems} onClose={() => setShowNew(false)} onSave={() => { setShowNew(false); load() }} />}
      {editing    && <RecipeModal existing={editing} inventoryItems={invItems} onClose={() => setEditing(null)} onSave={() => { setEditing(null); load() }} />}
      {addIngTo   && <IngredientModal recipeId={addIngTo} inventoryItems={invItems} onClose={() => setAddIngTo(null)} onSave={() => { setAddIngTo(null); load() }} />}
      {editIng    && <IngredientModal recipeId={editIng.recipe_id} existing={editIng} inventoryItems={invItems} onClose={() => setEditIng(null)} onSave={() => { setEditIng(null); load() }} />}

      {/* Unit conversion modal */}
      {convertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: 16, border: `1px solid ${bdr}`, width: '100%', maxWidth: 400 }}>
            <div style={{ borderBottom: `1px solid ${bdr}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
              <span style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 14, color: ink }}>Konversi Satuan</span>
              <button onClick={() => setConvertModal(null)}><X size={16} style={{ color: muted }} /></button>
            </div>
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ padding: '12px 16px', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, fontSize: 13, color: '#92400E' }}>
                ⚠️ Resep yield dalam <strong>{convertModal.recipe.yield_unit}</strong>, tapi inventory item <strong>"{convertModal.recipe.output_item?.name}"</strong> satuannya <strong>{convertModal.recipe.output_item?.unit}</strong>.
              </div>
              <div>
                <label style={{ color: muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                  1 {convertModal.recipe.output_item?.unit} = berapa {convertModal.recipe.yield_unit}?
                </label>
                <input
                  type="number" min="1" step="any"
                  value={convFactor}
                  onChange={e => setConvFactor(e.target.value)}
                  placeholder={`contoh: 1000 (kalau 1 ${convertModal.recipe.output_item?.unit} = 1000 ${convertModal.recipe.yield_unit})`}
                  onFocus={e => e.target.select()}
                  style={{ display: 'block', width: '100%', marginTop: 8, padding: '10px 12px', fontSize: 14, border: `1px solid ${bdr}`, borderRadius: 10, outline: 'none', color: ink, backgroundColor: '#F8F8F6', boxSizing: 'border-box' }}
                />
              </div>
              {convFactor && parseFloat(convFactor) > 0 && (
                <div style={{ padding: '10px 14px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, fontSize: 12, color: '#1D4ED8' }}>
                  💰 HPP = {fmtRp(convertModal.costPerYieldUnit)} × {convFactor} = <strong>{fmtRp(convertModal.costPerYieldUnit * parseFloat(convFactor))}/{convertModal.recipe.output_item?.unit}</strong>
                </div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setConvertModal(null)} style={{ flex: 1, padding: '10px', border: `1px solid ${bdr}`, borderRadius: 10, backgroundColor: '#fff', color: muted, fontSize: 13, cursor: 'pointer' }}>Batal</button>
                <button
                  onClick={confirmSaveHPP}
                  disabled={!convFactor || parseFloat(convFactor) <= 0}
                  style={{ flex: 1, padding: '10px', border: 'none', borderRadius: 10, backgroundColor: '#16A34A', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: (!convFactor || parseFloat(convFactor) <= 0) ? 0.5 : 1 }}>
                  Simpan HPP
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
