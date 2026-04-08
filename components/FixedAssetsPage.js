import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—'

export default function FixedAssetsPage({ headers, toast, readOnly }) {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)

  const load = () => {
    setLoading(true)
    fetch('/api/fixed-assets', { headers, credentials:'include' })
      .then(r => r.json()).then(d => { setItems(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const remove = async (a) => {
    if (!confirm(`Delete asset "${a.name}"?`)) return
    const r = await fetch(`/api/fixed-assets/${a._id}`, { method:'DELETE', headers, credentials:'include' })
    if (r.ok) { toast('Deleted'); load() } else toast('Failed', 'error')
  }

  const totalCost = items.reduce((s, a) => s + (a.cost || 0), 0)
  const totalDep  = items.reduce((s, a) => s + (a.accumulatedDepreciation || 0), 0)
  const totalBook = items.reduce((s, a) => s + (a.bookValue || 0), 0)

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18, flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 style={{ fontSize:20, fontWeight:700, color:'var(--text)', margin:0 }}>Fixed Assets</h2>
          <div style={{ fontSize:13, color:'var(--text-3)', marginTop:4 }}>{items.length} assets · Total cost {fmt(totalCost)} · Accumulated depreciation {fmt(totalDep)} · Book value {fmt(totalBook)}</div>
        </div>
        {!readOnly && (
          <button onClick={() => { setEditing(null); setShowForm(true) }} style={{ background:'var(--accent)', color:'#fff', border:'none', padding:'10px 18px', borderRadius:'var(--r-md)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' }}>+ New Asset</button>
        )}
      </div>

      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', overflow:'hidden' }}>
        {loading ? <div style={{ padding:40, textAlign:'center', color:'var(--text-3)' }}>Loading…</div>
         : items.length === 0 ? <div style={{ padding:40, textAlign:'center', color:'var(--text-3)' }}>No fixed assets yet.</div>
         : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead style={{ background:'var(--bg-3)' }}>
              <tr>{['Asset #','Name','Category','Purchase date','Cost','Monthly','Book value','Status',''].map(h => (
                <th key={h} style={{ textAlign:'left', padding:'12px 16px', fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.05em', borderBottom:'1px solid var(--border)' }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {items.map(a => (
                <tr key={a._id} style={{ borderBottom:'1px solid var(--border)' }}>
                  <td style={{ padding:'12px 16px', fontSize:12, color:'var(--text-2)', fontFamily:'var(--mono)' }}>{a.assetNumber}</td>
                  <td style={{ padding:'12px 16px', fontSize:13, color:'var(--text)', fontWeight:600 }}>{a.name}</td>
                  <td style={{ padding:'12px 16px', fontSize:12, color:'var(--text-3)' }}>{a.category}</td>
                  <td style={{ padding:'12px 16px', fontSize:12, color:'var(--text-3)' }}>{fmtDate(a.purchaseDate)}</td>
                  <td style={{ padding:'12px 16px', fontSize:13, color:'var(--text)', fontFamily:'var(--mono)' }}>{fmt(a.cost)}</td>
                  <td style={{ padding:'12px 16px', fontSize:12, color:'var(--text-3)', fontFamily:'var(--mono)' }}>{fmt(a.monthlyDepreciation)}</td>
                  <td style={{ padding:'12px 16px', fontSize:13, color:'var(--green-text)', fontFamily:'var(--mono)' }}>{fmt(a.bookValue)}</td>
                  <td style={{ padding:'12px 16px', fontSize:11 }}>
                    <span style={{ background: a.status === 'Active' ? 'var(--green-dim)' : 'var(--surface-3)', color: a.status === 'Active' ? 'var(--green-text)' : 'var(--text-3)', padding:'2px 8px', borderRadius:99, fontWeight:600 }}>{a.status}</span>
                  </td>
                  <td style={{ padding:'12px 16px', textAlign:'right' }}>
                    {!readOnly && (
                      <>
                        <button onClick={() => { setEditing(a); setShowForm(true) }} style={{ background:'transparent', border:'1px solid var(--border-2)', color:'var(--text-2)', padding:'4px 10px', borderRadius:6, fontSize:11, cursor:'pointer', marginRight:6, fontFamily:'var(--font)' }}>Edit</button>
                        <button onClick={() => remove(a)} style={{ background:'transparent', border:'1px solid rgba(239,68,68,0.4)', color:'var(--red)', padding:'4px 10px', borderRadius:6, fontSize:11, cursor:'pointer', fontFamily:'var(--font)' }}>Del</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop:14, fontSize:11, color:'var(--text-4)' }}>💡 Monthly depreciation is posted automatically by a scheduled cron job. Set it to call <code style={{ color:'var(--accent-2)' }}>GET /api/fixed-assets/depreciate?secret=$CRON_SECRET</code> on the 1st of every month.</div>

      {showForm && <AssetForm editing={editing} headers={headers} toast={toast} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load() }} />}
    </div>
  )
}

function AssetForm({ editing, headers, toast, onClose, onSaved }) {
  const [form, setForm] = useState({
    name:            editing?.name || '',
    category:        editing?.category || 'Equipment',
    description:     editing?.description || '',
    serialNumber:    editing?.serialNumber || '',
    location:        editing?.location || '',
    purchaseDate:    editing?.purchaseDate ? new Date(editing.purchaseDate).toISOString().slice(0,10) : new Date().toISOString().slice(0,10),
    cost:            editing?.cost || '',
    salvageValue:    editing?.salvageValue || 0,
    usefulLifeYears: editing?.usefulLifeYears || 5,
  })
  const [saving, setSaving] = useState(false)

  const monthlyDep = (Number(form.cost) || 0) - (Number(form.salvageValue) || 0)
  const monthly = monthlyDep > 0 ? monthlyDep / ((Number(form.usefulLifeYears) || 1) * 12) : 0

  const save = async () => {
    if (!form.name || !form.cost) { toast('Name and cost required', 'error'); return }
    setSaving(true)
    const url = editing ? `/api/fixed-assets/${editing._id}` : '/api/fixed-assets'
    const r = await fetch(url, { method: editing ? 'PUT' : 'POST', headers, credentials:'include',
      body: JSON.stringify({ ...form, cost: Number(form.cost), salvageValue: Number(form.salvageValue) || 0, usefulLifeYears: Number(form.usefulLifeYears) }) })
    if (r.ok) { toast(editing ? 'Updated' : 'Created'); onSaved() }
    else { const d = await r.json(); toast(d.error || 'Failed', 'error') }
    setSaving(false)
  }

  const inp = { width:'100%', padding:'9px 12px', background:'var(--surface-2)', border:'1px solid var(--border-2)', color:'var(--text)', borderRadius:'var(--r)', fontSize:13, outline:'none', fontFamily:'var(--font)' }

  if (typeof document === 'undefined') return null
  return createPortal(
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, zIndex:99999 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', width:'100%', maxWidth:560, maxHeight:'90vh', overflow:'auto', padding:22 }}>
        <div style={{ fontSize:16, fontWeight:700, color:'var(--text)', marginBottom:14 }}>{editing ? 'Edit Asset' : 'New Fixed Asset'}</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <div style={{ gridColumn:'1 / -1' }}><label style={{ fontSize:11, color:'var(--text-3)' }}>Name *</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Dell Laptop, Office Furniture" style={inp}/></div>
          <div><label style={{ fontSize:11, color:'var(--text-3)' }}>Category</label>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={inp}>
              {['Equipment','Furniture','Vehicle','Building','Software','Other'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div><label style={{ fontSize:11, color:'var(--text-3)' }}>Serial number</label><input value={form.serialNumber} onChange={e => setForm({ ...form, serialNumber: e.target.value })} style={inp}/></div>
          <div><label style={{ fontSize:11, color:'var(--text-3)' }}>Purchase date *</label><input type="date" value={form.purchaseDate} onChange={e => setForm({ ...form, purchaseDate: e.target.value })} style={inp}/></div>
          <div><label style={{ fontSize:11, color:'var(--text-3)' }}>Location</label><input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} style={inp}/></div>
          <div><label style={{ fontSize:11, color:'var(--text-3)' }}>Cost *</label><input type="number" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} style={inp}/></div>
          <div><label style={{ fontSize:11, color:'var(--text-3)' }}>Salvage value</label><input type="number" value={form.salvageValue} onChange={e => setForm({ ...form, salvageValue: e.target.value })} style={inp}/></div>
          <div style={{ gridColumn:'1 / -1' }}><label style={{ fontSize:11, color:'var(--text-3)' }}>Useful life (years) *</label><input type="number" value={form.usefulLifeYears} onChange={e => setForm({ ...form, usefulLifeYears: e.target.value })} style={inp}/></div>
        </div>
        <div style={{ marginTop:14, padding:12, background:'var(--accent-dim)', borderRadius:'var(--r)', fontSize:12, color:'var(--accent-2)' }}>
          📊 Monthly depreciation will be: <b style={{ fontFamily:'var(--mono)' }}>{fmt(Math.round(monthly * 100) / 100)}</b> (straight-line method)
        </div>
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:18 }}>
          <button onClick={onClose} style={{ background:'transparent', border:'1px solid var(--border-2)', color:'var(--text-2)', padding:'9px 16px', borderRadius:'var(--r)', cursor:'pointer', fontSize:13, fontFamily:'var(--font)' }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ background:'var(--accent)', color:'#fff', border:'none', padding:'9px 18px', borderRadius:'var(--r)', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'var(--font)' }}>{saving ? 'Saving…' : '💾 Save'}</button>
        </div>
      </div>
    </div>,
    document.body
  )
}
