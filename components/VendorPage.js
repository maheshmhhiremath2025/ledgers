import { useState, useEffect, useRef } from 'react'
import { Btn, Card, SectionTitle, EmptyState, SearchBar, Badge, fmt, fmtDate } from './ui'

const inputStyle = { width:'100%', padding:'9px 12px', background:'var(--surface-2)', border:'1px solid var(--border-2)', borderRadius:'var(--r)', fontSize:13, color:'var(--text)', outline:'none', fontFamily:'var(--font)' }
const labelStyle = { display:'block', fontSize:12, color:'var(--text-3)', fontWeight:500, marginBottom:5 }

function F({ label, value, onChange, placeholder, type='text', span, readOnly }) {
  return (
    <div style={span ? { gridColumn:`span ${span}` } : {}}>
      {label && <label style={labelStyle}>{label}</label>}
      <input type={type} value={value||''} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        readOnly={readOnly} style={{ ...inputStyle, opacity:readOnly?0.6:1 }}
        onFocus={e=>{ if(!readOnly){e.target.style.borderColor='var(--accent)';e.target.style.boxShadow='0 0 0 3px rgba(99,102,241,0.12)'} }}
        onBlur={e=>{e.target.style.borderColor='var(--border-2)';e.target.style.boxShadow='none'}} />
    </div>
  )
}

function VendorForm({ editItem, headers, toast, onClose, readOnly }) {
  const [name,    setName]    = useState(editItem?.name    || '')
  const [email,   setEmail]   = useState(editItem?.email   || '')
  const [phone,   setPhone]   = useState(editItem?.phone   || '')
  const [address, setAddress] = useState(editItem?.address || '')
  const [gstin,   setGstin]   = useState(editItem?.gstin   || '')
  const [saving,  setSaving]  = useState(false)

  const save = async () => {
    if (!name.trim()) { toast('Name is required', 'error'); return }
    setSaving(true)
    try {
      const isEdit = !!editItem?._id
      const r = await fetch(isEdit ? `/api/vendors/${editItem._id}` : '/api/vendors', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, address, gstin: gstin.toUpperCase() }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      toast(isEdit ? 'Vendor updated!' : 'Vendor created!')
      onClose()
    } catch (e) { toast(e.message, 'error') }
    setSaving(false)
  }

  return (
    <div style={{ maxWidth:580, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:22 }}>
        <Btn variant="ghost" onClick={onClose}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back
        </Btn>
        <div style={{ height:16, width:1, background:'var(--border)' }}/>
        <h2 style={{ fontWeight:700, fontSize:16, color:'var(--text)' }}>{editItem ? 'Edit Vendor' : 'New Vendor'}</h2>
      </div>
      <Card style={{ padding:20 }}>
        <SectionTitle>Vendor Info</SectionTitle>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
          <F label="Name *" value={name} onChange={setName} placeholder="Vendor Co. Ltd." span={2} readOnly={readOnly}/>
          <F label="Email" value={email} onChange={setEmail} placeholder="accounts@vendor.com" type="email" readOnly={readOnly}/>
          <F label="Phone" value={phone} onChange={setPhone} placeholder="+91 98765 43210" readOnly={readOnly}/>
        </div>
        <div style={{ marginBottom:14 }}>
          <label style={labelStyle}>Address</label>
          <textarea value={address} onChange={e=>setAddress(e.target.value)} rows={2} placeholder="City, State, Pincode"
            readOnly={readOnly} style={{ ...inputStyle, resize:'vertical' }}
            onFocus={e=>e.target.style.borderColor='var(--accent)'}
            onBlur={e=>e.target.style.borderColor='var(--border-2)'} />
        </div>
        <F label="GSTIN" value={gstin} onChange={v=>setGstin(v.toUpperCase())} placeholder="22AAAAA0000A1Z5" readOnly={readOnly}/>
      </Card>
      {!readOnly && (
        <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:16, paddingTop:16, borderTop:'1px solid var(--border)' }}>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : '✓ Save Vendor'}</Btn>
        </div>
      )}
    </div>
  )
}

function VendorDetail({ vendorId, headers, toast, onClose, onEdit }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/vendors/${vendorId}`, { headers })
      .then(r=>r.json()).then(d=>{setData(d);setLoading(false)})
      .catch(()=>setLoading(false))
  }, [vendorId])

  if (loading) return <div style={{ padding:48, textAlign:'center', color:'var(--text-3)' }}>Loading…</div>
  if (!data) return null
  const { vendor, pos, totalSpend, totalPending } = data

  return (
    <div style={{ maxWidth:720, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:22 }}>
        <Btn variant="ghost" onClick={onClose}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back
        </Btn>
        <div style={{ height:16, width:1, background:'var(--border)' }}/>
        <div style={{ flex:1 }}>
          <h2 style={{ fontWeight:700, fontSize:16, color:'var(--text)' }}>{vendor.name}</h2>
          {vendor.gstin && <div style={{ fontSize:11, color:'var(--text-3)', fontFamily:'var(--mono)', marginTop:2 }}>GSTIN: {vendor.gstin}</div>}
        </div>
        <Btn onClick={onEdit}>Edit</Btn>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:18 }}>
        {[
          { label:'Total Spend',   value:fmt(totalSpend),   color:'var(--red-text)' },
          { label:'Pending POs',   value:fmt(totalPending), color:'var(--amber-text)' },
          { label:'Total POs',     value:pos.length,         color:'var(--accent-2)' },
        ].map(s=>(
          <div key={s.label} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', padding:'14px 16px' }}>
            <div style={{ fontSize:11, color:'var(--text-3)', fontWeight:500, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>{s.label}</div>
            <div style={{ fontFamily:'var(--mono)', fontSize:20, fontWeight:700, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:18 }}>
        <Card style={{ padding:16 }}>
          <SectionTitle>Contact</SectionTitle>
          <div style={{ fontSize:13, color:'var(--text-2)', marginTop:10, display:'flex', flexDirection:'column', gap:7 }}>
            {vendor.email   && <div><span style={{ color:'var(--text-3)', fontSize:11 }}>Email: </span>{vendor.email}</div>}
            {vendor.phone   && <div><span style={{ color:'var(--text-3)', fontSize:11 }}>Phone: </span>{vendor.phone}</div>}
            {vendor.address && <div><span style={{ color:'var(--text-3)', fontSize:11 }}>Address: </span>{vendor.address}</div>}
            {!vendor.email && !vendor.phone && <div style={{ color:'var(--text-4)', fontSize:12 }}>No contact info</div>}
          </div>
        </Card>
        <Card style={{ padding:16 }}>
          <SectionTitle>Summary</SectionTitle>
          <div style={{ fontSize:13, color:'var(--text-2)', marginTop:10, display:'flex', flexDirection:'column', gap:7 }}>
            <div><span style={{ color:'var(--text-3)', fontSize:11 }}>POs raised: </span>{pos.length}</div>
            <div><span style={{ color:'var(--text-3)', fontSize:11 }}>First PO: </span>{pos.length ? fmtDate(pos[pos.length-1]?.issueDate) : '—'}</div>
            <div><span style={{ color:'var(--text-3)', fontSize:11 }}>Last PO: </span>{pos.length ? fmtDate(pos[0]?.issueDate) : '—'}</div>
          </div>
        </Card>
      </div>

      <Card style={{ overflow:'hidden' }}>
        <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <SectionTitle>Purchase Order History</SectionTitle>
          <span style={{ fontSize:12, color:'var(--text-3)' }}>{pos.length} POs</span>
        </div>
        {pos.length === 0 ? <EmptyState message="No purchase orders for this vendor yet." /> : (
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ borderBottom:'1px solid var(--border)' }}>
                {['PO #','Date','Status','Total',''].map((h,i)=>(
                  <th key={h} style={{ padding:'9px 14px', textAlign:i>2?'right':'left', fontSize:11, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.05em', background:'var(--bg-3)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pos.map(po=>(
                <tr key={po._id} style={{ borderBottom:'1px solid var(--border)' }}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--surface-2)'}
                  onMouseLeave={e=>e.currentTarget.style.background=''}>
                  <td style={{ padding:'10px 14px', fontFamily:'var(--mono)', fontSize:12, fontWeight:600, color:'var(--accent-2)' }}>{po.poNumber}</td>
                  <td style={{ padding:'10px 14px', fontSize:12, color:'var(--text-2)' }}>{fmtDate(po.issueDate)}</td>
                  <td style={{ padding:'10px 14px' }}><Badge status={po.status}/></td>
                  <td style={{ padding:'10px 14px', textAlign:'right', fontFamily:'var(--mono)', fontWeight:700 }}>{fmt(po.total)}</td>
                  <td style={{ padding:'10px 14px', textAlign:'right', fontSize:12, color: po.status==='Paid'?'var(--green-text)':'var(--text-4)' }}>
                    {po.status==='Paid' ? '✓ Paid' : ''}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background:'var(--bg-3)', borderTop:'2px solid var(--border-3)' }}>
                <td colSpan={3} style={{ padding:'10px 14px', fontSize:12, fontWeight:600, color:'var(--text-2)' }}>Total</td>
                <td style={{ padding:'10px 14px', textAlign:'right', fontFamily:'var(--mono)', fontWeight:700, color:'var(--text)' }}>{fmt(totalSpend)}</td>
                <td/>
              </tr>
            </tfoot>
          </table>
        )}
      </Card>
    </div>
  )
}

export default function VendorPage({ org, headers, toast, readOnly=false }) {
  const [vendors, setVendors]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [view, setView]         = useState('list')
  const [editItem, setEditItem] = useState(null)
  const [detailId, setDetailId] = useState(null)
  const [showExport, setShowExport] = useState(false)
  const [exporting, setExporting]   = useState(false)
  const exportRef = useRef()

  const load = () => {
    setLoading(true)
    fetch(`/api/vendors?withStats=1${search?`&search=${encodeURIComponent(search)}`:''}`, { headers })
      .then(r=>r.json()).then(d=>{setVendors(d.vendors||[]);setLoading(false)})
      .catch(()=>setLoading(false))
  }

  useEffect(()=>{ load() }, [org.id, search])
  useEffect(()=>{
    const h = e => { if(exportRef.current && !exportRef.current.contains(e.target)) setShowExport(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const del = async v => {
    if (!confirm(`Delete ${v.name}?`)) return
    const r = await fetch(`/api/vendors/${v._id}`, { method:'DELETE', headers })
    if (r.ok) { toast('Vendor deleted'); load() }
  }

  const doExport = async () => {
    setExporting(true); setShowExport(false)
    const token = localStorage.getItem('sb_token')
    const h = { 'x-org-id': org.id, ...(token?{Authorization:`Bearer ${token}`}:{}) }
    try {
      const r = await fetch('/api/export?type=purchase-orders', { headers: h })
      const blob = await r.blob()
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'purchase_orders.csv'; a.click()
      toast('Exported!')
    } catch(e) { toast('Export failed','error') }
    setExporting(false)
  }

  if (view==='form') return <VendorForm editItem={editItem} headers={headers} toast={toast} readOnly={readOnly}
    onClose={()=>{setView('list');setEditItem(null);load()}}/>
  if (view==='detail') return <VendorDetail vendorId={detailId} headers={headers} toast={toast}
    onClose={()=>{setView('list');setDetailId(null)}}
    onEdit={()=>{const v=vendors.find(x=>x._id===detailId);setEditItem(v);setView('form')}}/>

  const totalSpend = vendors.reduce((s,v)=>s+(v.totalSpend||0),0)

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
        <div>
          <h2 style={{ fontSize:18, fontWeight:700, color:'var(--text)', letterSpacing:'-0.3px' }}>Vendors</h2>
          <p style={{ fontSize:13, color:'var(--text-3)', marginTop:4 }}>{vendors.length} vendors · {fmt(totalSpend)} total spend</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <div ref={exportRef} style={{ position:'relative' }}>
            <Btn onClick={()=>setShowExport(v=>!v)} disabled={exporting}>⬇ Export CSV ▾</Btn>
            {showExport && (
              <div style={{ position:'absolute', right:0, top:'calc(100% + 4px)', background:'var(--surface)', border:'1px solid var(--border-2)', borderRadius:'var(--r-md)', zIndex:9999, minWidth:180, boxShadow:'var(--shadow-lg)', overflow:'hidden' }}>
                <div style={{ padding:'6px 12px', fontSize:10, fontWeight:700, color:'var(--text-4)', textTransform:'uppercase', letterSpacing:'0.07em', borderBottom:'1px solid var(--border)' }}>Export</div>
                <button onClick={doExport} style={{ display:'block', width:'100%', padding:'9px 14px', background:'none', border:'none', textAlign:'left', fontSize:13, color:'var(--text-2)', cursor:'pointer', fontFamily:'var(--font)' }}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--surface-2)'}
                  onMouseLeave={e=>e.currentTarget.style.background='none'}>
                  📦 Purchase Orders CSV
                </button>
              </div>
            )}
          </div>
          {!readOnly && <Btn variant="primary" onClick={()=>{setEditItem(null);setView('form')}}>+ New Vendor</Btn>}
        </div>
      </div>


      {/* How it works */}
      <div style={{ padding:'12px 16px', background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.18)', borderRadius:'var(--r-md)', marginBottom:18, fontSize:12, color:'var(--text-2)', lineHeight:1.7 }}>
        <b style={{ color:'var(--red-text)', fontSize:13 }}>🏭 How vendor management works</b><br/>
        Save your vendors here and they auto-fill when creating Purchase Orders — no retyping names and addresses.
        Each vendor shows total spend, number of POs raised and outstanding payables.
        Click any vendor to see their full purchase order history and contact details.
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:18 }}>
        {[
          { label:'Total Vendors',  value:vendors.length,                                  color:'var(--accent-2)' },
          { label:'Total Spend',    value:fmt(totalSpend),                                 color:'var(--red-text)' },
          { label:'With Open POs',  value:vendors.filter(v=>v.hasPending).length,          color:'var(--amber-text)' },
          { label:'Total POs',      value:vendors.reduce((s,v)=>s+(v.poCount||0),0),       color:'var(--text-2)' },
        ].map(s=>(
          <div key={s.label} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', padding:'14px 16px' }}>
            <div style={{ fontSize:11, color:'var(--text-3)', fontWeight:500, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>{s.label}</div>
            <div style={{ fontFamily:'var(--mono)', fontSize:20, fontWeight:700, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <Card>
        <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', gap:10, alignItems:'center' }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search vendors…"/>
          <Btn size="sm" onClick={load}>↻</Btn>
        </div>
        {loading ? <div style={{ padding:48, textAlign:'center', color:'var(--text-3)' }}>Loading…</div>
        : vendors.length===0 ? <EmptyState message="No vendors yet. Add your first vendor."/>
        : (
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ borderBottom:'1px solid var(--border)' }}>
                {['Vendor','Email','Phone','GSTIN','POs','Total Spend',''].map((h,i)=>(
                  <th key={h} style={{ padding:'10px 14px', textAlign:i>4?'right':'left', fontSize:11, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.05em', background:'var(--bg-3)', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vendors.map(v=>(
                <tr key={v._id} onClick={()=>{setDetailId(v._id);setView('detail')}}
                  style={{ borderBottom:'1px solid var(--border)', cursor:'pointer', transition:'background 0.1s' }}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--surface-2)'}
                  onMouseLeave={e=>e.currentTarget.style.background=''}>
                  <td style={{ padding:'12px 14px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:32, height:32, borderRadius:'50%', background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'var(--red-text)', flexShrink:0 }}>
                        {v.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight:600, color:'var(--text)' }}>{v.name}</div>
                        {v.hasPending && <div style={{ fontSize:10, color:'var(--amber-text)', marginTop:1 }}>● Open PO</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding:'12px 14px', color:'var(--text-3)', fontSize:12 }}>{v.email||'—'}</td>
                  <td style={{ padding:'12px 14px', color:'var(--text-3)', fontSize:12 }}>{v.phone||'—'}</td>
                  <td style={{ padding:'12px 14px', fontFamily:'var(--mono)', fontSize:11, color:'var(--text-3)' }}>{v.gstin||'—'}</td>
                  <td style={{ padding:'12px 14px', color:'var(--text-2)' }}>{v.poCount||0}</td>
                  <td style={{ padding:'12px 14px', textAlign:'right', fontFamily:'var(--mono)', fontWeight:600, color:'var(--red-text)' }}>{fmt(v.totalSpend||0)}</td>
                  <td style={{ padding:'12px 14px' }} onClick={e=>e.stopPropagation()}>
                    <div style={{ display:'flex', gap:5, justifyContent:'flex-end' }}>
                      {!readOnly && <Btn size="sm" onClick={e=>{e.stopPropagation();setEditItem(v);setView('form')}}>Edit</Btn>}
                      {!readOnly && <Btn size="sm" variant="danger" onClick={e=>{e.stopPropagation();del(v)}}>✕</Btn>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div style={{ padding:'10px 16px', borderTop:'1px solid var(--border)', fontSize:12, color:'var(--text-3)', display:'flex', justifyContent:'space-between' }}>
          <span>{vendors.length} vendor{vendors.length!==1?'s':''}</span>
          <span>{org.name}</span>
        </div>
      </Card>
    </div>
  )
}