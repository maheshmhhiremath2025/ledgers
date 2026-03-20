import { useState, useEffect, useRef } from 'react'
import { Btn, Card, SectionTitle, EmptyState, SearchBar, fmt } from './ui'

const UNITS = ['pcs','hrs','days','kg','g','l','ml','m','sqft','sqm','nos','set','pair','box','roll']
const inp = { width:'100%', padding:'9px 12px', background:'var(--surface-2)', border:'1px solid var(--border-2)', borderRadius:'var(--r)', fontSize:13, color:'var(--text)', outline:'none', fontFamily:'var(--font)' }
const lbl = { display:'block', fontSize:12, color:'var(--text-3)', fontWeight:500, marginBottom:5 }
const focus = e => { e.target.style.borderColor='var(--accent)'; e.target.style.boxShadow='0 0 0 3px rgba(99,102,241,0.12)' }
const blur  = e => { e.target.style.borderColor='var(--border-2)'; e.target.style.boxShadow='none' }

function ProductForm({ item, headers, toast, onClose }) {
  const [name,     setName]     = useState(item?.name        || '')
  const [desc,     setDesc]     = useState(item?.description || '')
  const [hsn,      setHsn]      = useState(item?.hsnCode     || '')
  const [unit,     setUnit]     = useState(item?.unit        || 'pcs')
  const [price,    setPrice]    = useState(item?.price       || '')
  const [tax,      setTax]      = useState(item?.taxRate     ?? 18)
  const [category, setCategory] = useState(item?.category   || '')
  const [saving,   setSaving]   = useState(false)

  const save = async () => {
    if (!name.trim()) { toast('Name required', 'error'); return }
    setSaving(true)
    try {
      const isEdit = !!item?._id
      const r = await fetch(isEdit ? `/api/products/${item._id}` : '/api/products', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: desc, hsnCode: hsn, unit, price: parseFloat(price)||0, taxRate: parseFloat(tax)||0, category }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      toast(isEdit ? 'Product updated!' : 'Product added!')
      onClose(true)
    } catch(e) { toast(e.message, 'error') }
    setSaving(false)
  }

  return (
    <div style={{ maxWidth:560, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
        <Btn variant="ghost" onClick={()=>onClose(false)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back
        </Btn>
        <div style={{ height:16, width:1, background:'var(--border)' }}/>
        <h2 style={{ fontWeight:700, fontSize:16, color:'var(--text)' }}>{item ? 'Edit Product' : 'New Product'}</h2>
      </div>
      <Card style={{ padding:20 }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          <div style={{ gridColumn:'span 2' }}>
            <label style={lbl}>Product / Service Name *</label>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Web Design Services" style={inp} onFocus={focus} onBlur={blur}/>
          </div>
          <div style={{ gridColumn:'span 2' }}>
            <label style={lbl}>Description</label>
            <textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={2} placeholder="Brief description (appears on invoice)" style={{ ...inp, resize:'vertical' }} onFocus={focus} onBlur={blur}/>
          </div>
          <div>
            <label style={lbl}>HSN / SAC Code</label>
            <input value={hsn} onChange={e=>setHsn(e.target.value)} placeholder="998314" style={inp} onFocus={focus} onBlur={blur}/>
          </div>
          <div>
            <label style={lbl}>Category</label>
            <input value={category} onChange={e=>setCategory(e.target.value)} placeholder="Services, Products…" style={inp} onFocus={focus} onBlur={blur}/>
          </div>
          <div>
            <label style={lbl}>Default Price (₹)</label>
            <input type="number" value={price} onChange={e=>setPrice(e.target.value)} placeholder="0.00" style={inp} onFocus={focus} onBlur={blur}/>
          </div>
          <div>
            <label style={lbl}>GST Rate (%)</label>
            <select value={tax} onChange={e=>setTax(e.target.value)} style={{ ...inp, cursor:'pointer' }} onFocus={focus} onBlur={blur}>
              {[0,5,12,18,28].map(r=><option key={r} value={r} style={{ background:'var(--bg-2)' }}>{r}%</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Unit</label>
            <select value={unit} onChange={e=>setUnit(e.target.value)} style={{ ...inp, cursor:'pointer' }} onFocus={focus} onBlur={blur}>
              {UNITS.map(u=><option key={u} value={u} style={{ background:'var(--bg-2)' }}>{u}</option>)}
            </select>
          </div>
        </div>
      </Card>
      <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:16, paddingTop:16, borderTop:'1px solid var(--border)' }}>
        <Btn onClick={()=>onClose(false)}>Cancel</Btn>
        <Btn variant="primary" onClick={save} disabled={saving}>{saving?'Saving…':'✓ Save Product'}</Btn>
      </div>
    </div>
  )
}

export default function ProductCatalogue({ org, headers, toast, readOnly=false }) {
  const [products, setProducts] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [view,     setView]     = useState('list')
  const [editItem, setEditItem] = useState(null)

  const load = () => {
    setLoading(true)
    fetch(`/api/products${search?`?search=${encodeURIComponent(search)}`:''}`, { headers })
      .then(r=>r.json()).then(d=>{ setProducts(Array.isArray(d)?d:[]); setLoading(false) })
      .catch(()=>setLoading(false))
  }

  useEffect(()=>{ load() }, [org.id, search])

  const del = async p => {
    if (!confirm(`Delete "${p.name}"?`)) return
    await fetch(`/api/products/${p._id}`, { method:'DELETE', headers })
    toast('Product deleted'); load()
  }

  if (view==='form') return <ProductForm item={editItem} headers={headers} toast={toast} onClose={refresh=>{ setView('list'); setEditItem(null); if(refresh) load() }}/>

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
        <div>
          <h2 style={{ fontSize:18, fontWeight:700, color:'var(--text)', letterSpacing:'-0.3px' }}>Product Catalogue</h2>
          <p style={{ fontSize:13, color:'var(--text-3)', marginTop:4 }}>{products.length} products · auto-fill invoice line items</p>
        </div>
        {!readOnly && <Btn variant="primary" onClick={()=>{ setEditItem(null); setView('form') }}>+ Add Product</Btn>}
      </div>


      {/* How it works */}
      <div style={{ padding:'12px 16px', background:'var(--accent-dim)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:'var(--r-md)', marginBottom:18, fontSize:12, color:'var(--accent-3)', lineHeight:1.7 }}>
        <b style={{ color:'var(--accent-2)', fontSize:13 }}>📦 How the product catalogue works</b><br/>
        Save your products and services here once — with HSN/SAC codes, default prices and GST rates.
        When creating an invoice, start typing in any line item description and matching products will appear as a dropdown.
        Click to auto-fill the name, price, tax rate and unit instantly. No more retyping the same items every invoice.
      </div>
      <Card>
        <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', gap:10 }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search products…"/>
          <Btn size="sm" onClick={load}>↻</Btn>
        </div>

        {loading ? <div style={{ padding:48, textAlign:'center', color:'var(--text-3)' }}>Loading…</div>
        : products.length===0 ? <EmptyState message="No products yet. Add your first product or service."/>
        : (
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ borderBottom:'1px solid var(--border)' }}>
                {['Name','HSN/SAC','Category','Unit','Price','GST',''].map((h,i)=>(
                  <th key={h} style={{ padding:'10px 14px', textAlign:i>3?'right':'left', fontSize:11, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.05em', background:'var(--bg-3)', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map(p=>(
                <tr key={p._id} style={{ borderBottom:'1px solid var(--border)', transition:'background 0.1s' }}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--surface-2)'}
                  onMouseLeave={e=>e.currentTarget.style.background=''}>
                  <td style={{ padding:'12px 14px' }}>
                    <div style={{ fontWeight:600, color:'var(--text)' }}>{p.name}</div>
                    {p.description && <div style={{ fontSize:11, color:'var(--text-3)', marginTop:1 }}>{p.description}</div>}
                  </td>
                  <td style={{ padding:'12px 14px', fontFamily:'var(--mono)', fontSize:12, color:'var(--text-3)' }}>{p.hsnCode||'—'}</td>
                  <td style={{ padding:'12px 14px', fontSize:12, color:'var(--text-3)' }}>{p.category||'—'}</td>
                  <td style={{ padding:'12px 14px', fontSize:12, color:'var(--text-2)' }}>{p.unit}</td>
                  <td style={{ padding:'12px 14px', textAlign:'right', fontFamily:'var(--mono)', fontWeight:600 }}>{fmt(p.price)}</td>
                  <td style={{ padding:'12px 14px', textAlign:'right', fontSize:12, color:'var(--text-2)' }}>{p.taxRate}%</td>
                  <td style={{ padding:'12px 14px' }}>
                    <div style={{ display:'flex', gap:5, justifyContent:'flex-end' }}>
                      {!readOnly && <Btn size="sm" onClick={()=>{ setEditItem(p); setView('form') }}>Edit</Btn>}
                      {!readOnly && <Btn size="sm" variant="danger" onClick={()=>del(p)}>✕</Btn>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div style={{ padding:'10px 16px', borderTop:'1px solid var(--border)', fontSize:12, color:'var(--text-3)' }}>
          {products.length} item{products.length!==1?'s':''} · Used for auto-filling invoice line items
        </div>
      </Card>
    </div>
  )
}