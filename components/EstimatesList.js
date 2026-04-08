import { useState, useEffect } from 'react'

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const STATUS_COLORS = {
  Draft:    { bg: 'var(--surface-3)',     color: 'var(--text-3)' },
  Sent:     { bg: 'rgba(59,130,246,0.12)', color: 'var(--blue-text)' },
  Accepted: { bg: 'rgba(16,185,129,0.12)', color: 'var(--green-text)' },
  Declined: { bg: 'rgba(239,68,68,0.12)',  color: 'var(--red-text)' },
  Invoiced: { bg: 'rgba(99,102,241,0.12)', color: 'var(--accent-3)' },
  Expired:  { bg: 'rgba(245,158,11,0.12)', color: 'var(--amber-text)' },
}

export default function EstimatesList({ headers, toast, readOnly }) {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState(null)

  const load = () => {
    setLoading(true)
    fetch('/api/estimates', { headers, credentials: 'include' })
      .then(r => r.json())
      .then(d => { setItems(d.estimates || []); setLoading(false) })
      .catch(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const filtered = items.filter(i =>
    !search ||
    (i.estimateNumber || '').toLowerCase().includes(search.toLowerCase()) ||
    (i.customer?.name || '').toLowerCase().includes(search.toLowerCase())
  )

  const downloadPdf = (est) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('sb_token') : null
    fetch(`/api/estimates/${est._id}/pdf`, { credentials: 'include', headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.ok ? r.blob() : Promise.reject(new Error('Failed')))
      .then(blob => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = url; a.download = `${est.estimateNumber}.pdf`; a.click()
        URL.revokeObjectURL(url)
      })
      .catch(() => toast('PDF download failed', 'error'))
  }

  const sendEmail = async (est) => {
    const to = est.customer?.email
    if (!to) { toast('Customer has no email address', 'error'); return }
    if (!confirm(`Email estimate ${est.estimateNumber} to ${to}?`)) return
    const r = await fetch(`/api/estimates/${est._id}/send-email`, { method: 'POST', headers, credentials: 'include', body: JSON.stringify({ to }) })
    const d = await r.json()
    if (r.ok) { toast(`✓ Sent to ${to}`); load() } else toast(d.error || 'Failed', 'error')
  }

  const convert = async (est) => {
    if (!confirm(`Convert ${est.estimateNumber} to invoice?`)) return
    const r = await fetch(`/api/estimates/${est._id}/convert`, { method: 'POST', headers, credentials: 'include' })
    const d = await r.json()
    if (r.ok) { toast(`✓ Invoice ${d.invoice.invoiceNumber} created from estimate`); load() }
    else toast(d.error || 'Failed', 'error')
  }

  const remove = async (est) => {
    if (!confirm(`Delete estimate ${est.estimateNumber}?`)) return
    const r = await fetch(`/api/estimates/${est._id}`, { method: 'DELETE', headers, credentials: 'include' })
    if (r.ok) { toast('Deleted'); load() } else toast('Failed', 'error')
  }

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 18, flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin:0 }}>Estimates / Quotes</h2>
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>{items.length} estimates · {fmt(items.reduce((s,i)=>s+(i.total||0),0))} total quoted</div>
        </div>
        {!readOnly && (
          <button onClick={() => { setEditing(null); setShowForm(true) }} style={{ background:'var(--accent)', color:'#fff', border:'none', padding:'10px 18px', borderRadius:'var(--r-md)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' }}>+ New Estimate</button>
        )}
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by number or customer…"
        style={{ width:'100%', maxWidth:420, padding:'10px 14px', background:'var(--surface-2)', border:'1px solid var(--border-2)', color:'var(--text)', borderRadius:'var(--r)', fontSize:13, marginBottom:14, outline:'none', fontFamily:'var(--font)' }} />

      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', overflow:'hidden' }}>
        {loading ? <div style={{ padding:40, textAlign:'center', color:'var(--text-3)' }}>Loading…</div>
         : filtered.length === 0 ? <div style={{ padding:40, textAlign:'center', color:'var(--text-3)' }}>No estimates yet. Create your first one.</div>
         : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead style={{ background:'var(--bg-3)' }}>
              <tr>
                {['Number','Customer','Date','Expiry','Total','Status',''].map(h => (
                  <th key={h} style={{ textAlign:'left', padding:'12px 16px', fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.05em', borderBottom:'1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(i => {
                const sc = STATUS_COLORS[i.status] || STATUS_COLORS.Draft
                return (
                  <tr key={i._id} style={{ borderBottom:'1px solid var(--border)' }}>
                    <td style={{ padding:'12px 16px', fontSize:13, color:'var(--text)', fontWeight:600 }}>{i.estimateNumber}</td>
                    <td style={{ padding:'12px 16px', fontSize:13, color:'var(--text-2)' }}>{i.customer?.name || '—'}</td>
                    <td style={{ padding:'12px 16px', fontSize:12, color:'var(--text-3)' }}>{fmtDate(i.issueDate)}</td>
                    <td style={{ padding:'12px 16px', fontSize:12, color:'var(--text-3)' }}>{fmtDate(i.expiryDate)}</td>
                    <td style={{ padding:'12px 16px', fontSize:13, color:'var(--text)', fontFamily:'var(--mono)' }}>{fmt(i.total)}</td>
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ background: sc.bg, color: sc.color, padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:600 }}>{i.status}</span>
                    </td>
                    <td style={{ padding:'12px 16px', textAlign:'right' }}>
                      <button onClick={() => downloadPdf(i)} style={{ background:'transparent', border:'1px solid var(--border-2)', color:'var(--text-2)', padding:'4px 10px', borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer', marginRight:6, fontFamily:'var(--font)' }}>PDF</button>
                      {!readOnly && (
                        <button onClick={() => sendEmail(i)} style={{ background:'transparent', border:'1px solid var(--blue)', color:'var(--blue-text)', padding:'4px 10px', borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer', marginRight:6, fontFamily:'var(--font)' }}>Send</button>
                      )}
                      {!readOnly && i.status !== 'Invoiced' && (
                        <button onClick={() => convert(i)} style={{ background:'transparent', border:'1px solid var(--accent)', color:'var(--accent)', padding:'4px 10px', borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer', marginRight:6, fontFamily:'var(--font)' }}>→ Invoice</button>
                      )}
                      {!readOnly && (
                        <>
                          <button onClick={() => { setEditing(i); setShowForm(true) }} style={{ background:'transparent', border:'1px solid var(--border-2)', color:'var(--text-2)', padding:'4px 10px', borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer', marginRight:6, fontFamily:'var(--font)' }}>Edit</button>
                          <button onClick={() => remove(i)} style={{ background:'transparent', border:'1px solid rgba(239,68,68,0.4)', color:'var(--red)', padding:'4px 10px', borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' }}>Delete</button>
                        </>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {showForm && <EstimateForm editing={editing} headers={headers} toast={toast} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load() }} />}
    </div>
  )
}

function EstimateForm({ editing, headers, toast, onClose, onSaved }) {
  const [customer, setCustomer]   = useState(editing?.customer || { name: '', email: '', phone: '', gstin: '', address: '' })
  const [issueDate, setIssueDate] = useState(editing?.issueDate ? new Date(editing.issueDate).toISOString().slice(0,10) : new Date().toISOString().slice(0,10))
  const [expiryDate, setExpiry]   = useState(editing?.expiryDate ? new Date(editing.expiryDate).toISOString().slice(0,10) : '')
  const [status, setStatus]       = useState(editing?.status || 'Draft')
  const [lineItems, setLines]     = useState(editing?.lineItems?.length ? editing.lineItems : [{ description: '', qty: 1, rate: 0, tax: 0 }])
  const [notes, setNotes]         = useState(editing?.notes || '')
  const [terms, setTerms]         = useState(editing?.terms || '')
  const [saving, setSaving]       = useState(false)

  const updateLine = (idx, patch) => setLines(L => L.map((l, i) => i === idx ? { ...l, ...patch } : l))
  const addLine    = () => setLines(L => [...L, { description: '', qty: 1, rate: 0, tax: 0 }])
  const removeLine = i => setLines(L => L.filter((_, idx) => idx !== i))

  const subtotal = lineItems.reduce((s, l) => s + (Number(l.qty)||0) * (Number(l.rate)||0), 0)
  const taxTotal = lineItems.reduce((s, l) => s + (Number(l.qty)||0) * (Number(l.rate)||0) * (Number(l.tax)||0) / 100, 0)
  const total    = subtotal + taxTotal

  const save = async () => {
    if (!customer.name) { toast('Customer name required', 'error'); return }
    if (lineItems.some(l => !l.description)) { toast('All line items need a description', 'error'); return }
    setSaving(true)
    const body = { customer, issueDate, expiryDate: expiryDate || null, status, lineItems, notes, terms }
    const url  = editing ? `/api/estimates/${editing._id}` : '/api/estimates'
    const r = await fetch(url, { method: editing ? 'PUT' : 'POST', headers, credentials:'include', body: JSON.stringify(body) })
    const d = await r.json()
    if (r.ok) { toast(editing ? '✓ Updated' : '✓ Estimate created'); onSaved() }
    else toast(d.error || 'Failed', 'error')
    setSaving(false)
  }

  const inp = { width:'100%', padding:'8px 11px', background:'var(--surface-2)', border:'1px solid var(--border-2)', color:'var(--text)', borderRadius:'var(--r)', fontSize:13, outline:'none', fontFamily:'var(--font)' }

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px', zIndex:9999 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', width:'100%', maxWidth:900, maxHeight:'90vh', display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'16px 22px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', flex:'0 0 auto' }}>
          <div style={{ fontSize:16, fontWeight:700, color:'var(--text)' }}>{editing ? 'Edit Estimate' : 'New Estimate'}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-3)', fontSize:20, cursor:'pointer', fontFamily:'var(--font)' }}>×</button>
        </div>
        <div style={{ padding:22, flex:'1 1 auto', overflow:'auto', minHeight:0 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', marginBottom:8 }}>Customer</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
            <input placeholder="Name *"  value={customer.name}  onChange={e => setCustomer({ ...customer, name:  e.target.value })} style={inp}/>
            <input placeholder="Email"   value={customer.email} onChange={e => setCustomer({ ...customer, email: e.target.value })} style={inp}/>
            <input placeholder="Phone"   value={customer.phone} onChange={e => setCustomer({ ...customer, phone: e.target.value })} style={inp}/>
            <input placeholder="GSTIN"   value={customer.gstin} onChange={e => setCustomer({ ...customer, gstin: e.target.value })} style={inp}/>
            <input placeholder="Address" value={customer.address} onChange={e => setCustomer({ ...customer, address: e.target.value })} style={{ ...inp, gridColumn:'1 / -1' }}/>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:14 }}>
            <div><label style={{ fontSize:11, color:'var(--text-3)' }}>Issue date</label><input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} style={inp}/></div>
            <div><label style={{ fontSize:11, color:'var(--text-3)' }}>Expiry date</label><input type="date" value={expiryDate} onChange={e => setExpiry(e.target.value)} style={inp}/></div>
            <div><label style={{ fontSize:11, color:'var(--text-3)' }}>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} style={inp}>
                {['Draft','Sent','Accepted','Declined','Expired'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', marginBottom:8 }}>Line items</div>
          <table style={{ width:'100%', marginBottom:10 }}>
            <thead><tr>
              <th style={{ textAlign:'left', fontSize:10, color:'var(--text-3)', padding:'4px 6px' }}>Description</th>
              <th style={{ textAlign:'right', fontSize:10, color:'var(--text-3)', padding:'4px 6px', width:70 }}>Qty</th>
              <th style={{ textAlign:'right', fontSize:10, color:'var(--text-3)', padding:'4px 6px', width:100 }}>Rate</th>
              <th style={{ textAlign:'right', fontSize:10, color:'var(--text-3)', padding:'4px 6px', width:70 }}>GST %</th>
              <th style={{ textAlign:'right', fontSize:10, color:'var(--text-3)', padding:'4px 6px', width:120 }}>Amount</th>
              <th style={{ width:30 }}></th>
            </tr></thead>
            <tbody>
              {lineItems.map((l, i) => (
                <tr key={i}>
                  <td style={{ padding:3 }}><input value={l.description} onChange={e => updateLine(i, { description: e.target.value })} style={inp}/></td>
                  <td style={{ padding:3 }}><input type="number" value={l.qty}  onChange={e => updateLine(i, { qty:  e.target.value })} style={{ ...inp, textAlign:'right' }}/></td>
                  <td style={{ padding:3 }}><input type="number" value={l.rate} onChange={e => updateLine(i, { rate: e.target.value })} style={{ ...inp, textAlign:'right' }}/></td>
                  <td style={{ padding:3 }}><input type="number" value={l.tax}  onChange={e => updateLine(i, { tax:  e.target.value })} style={{ ...inp, textAlign:'right' }}/></td>
                  <td style={{ padding:3, textAlign:'right', fontSize:13, color:'var(--text)', fontFamily:'var(--mono)' }}>{fmt((Number(l.qty)||0)*(Number(l.rate)||0)*(1+(Number(l.tax)||0)/100))}</td>
                  <td style={{ textAlign:'center' }}><button onClick={() => removeLine(i)} style={{ background:'none', border:'none', color:'var(--red)', cursor:'pointer', fontSize:16, fontFamily:'var(--font)' }}>×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={addLine} style={{ background:'transparent', border:'1px dashed var(--border-2)', color:'var(--text-3)', padding:'6px 14px', borderRadius:'var(--r)', fontSize:12, cursor:'pointer', marginBottom:14, fontFamily:'var(--font)' }}>+ Add line</button>

          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:14 }}>
            <div style={{ minWidth:240, padding:14, background:'var(--surface-2)', borderRadius:'var(--r)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--text-3)', marginBottom:4 }}><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--text-3)', marginBottom:6 }}><span>GST</span><span>{fmt(taxTotal)}</span></div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:14, color:'var(--text)', fontWeight:700, paddingTop:6, borderTop:'1px solid var(--border)' }}><span>Total</span><span>{fmt(total)}</span></div>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div><label style={{ fontSize:11, color:'var(--text-3)' }}>Notes</label><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{ ...inp, resize:'vertical' }}/></div>
            <div><label style={{ fontSize:11, color:'var(--text-3)' }}>Terms</label><textarea value={terms} onChange={e => setTerms(e.target.value)} rows={2} style={{ ...inp, resize:'vertical' }}/></div>
          </div>
        </div>
        <div style={{ padding:'14px 22px', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'flex-end', gap:8, flex:'0 0 auto' }}>
          <button onClick={onClose} style={{ background:'transparent', border:'1px solid var(--border-2)', color:'var(--text-2)', padding:'8px 16px', borderRadius:'var(--r)', cursor:'pointer', fontSize:13, fontFamily:'var(--font)' }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ background:'var(--accent)', color:'#fff', border:'none', padding:'8px 18px', borderRadius:'var(--r)', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'var(--font)' }}>{saving ? 'Saving…' : '💾 Save'}</button>
        </div>
      </div>
    </div>
  )
}
