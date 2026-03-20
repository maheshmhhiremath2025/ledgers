import { useState, useEffect } from 'react'
import { Btn, Card, Badge, SearchBar, EmptyState, fmt, fmtDate } from './ui'

const inp = { width:'100%', padding:'9px 12px', background:'var(--surface-2)', border:'1px solid var(--border-2)', borderRadius:'var(--r)', fontSize:13, color:'var(--text)', outline:'none', fontFamily:'var(--font)' }
const lbl = { display:'block', fontSize:12, color:'var(--text-3)', fontWeight:500, marginBottom:5 }
const focus = e => { e.target.style.borderColor='var(--accent)'; e.target.style.boxShadow='0 0 0 3px rgba(99,102,241,0.12)' }
const blur  = e => { e.target.style.borderColor='var(--border-2)'; e.target.style.boxShadow='none' }
const newLine = () => ({ description:'', qty:1, rate:0, tax:18, amount:0 })

function CreditNoteForm({ headers, toast, onClose }) {
  const [invSearch,  setInvSearch]  = useState('')
  const [invoices,   setInvoices]   = useState([])
  const [selInvoice, setSelInvoice] = useState(null)
  const [reason,     setReason]     = useState('')
  const [date,       setDate]       = useState(new Date().toISOString().split('T')[0])
  const [lines,      setLines]      = useState([newLine()])
  const [notes,      setNotes]      = useState('')
  const [saving,     setSaving]     = useState(false)

  useEffect(() => {
    if (invSearch.length < 2) { setInvoices([]); return }
    fetch(`/api/invoices?search=${encodeURIComponent(invSearch)}&limit=5`, { headers })
      .then(r=>r.json()).then(d=>setInvoices(d.invoices||d||[]))
      .catch(()=>{})
  }, [invSearch])

  const setLine = (i, k, v) => setLines(prev => prev.map((l,idx) => idx===i ? { ...l, [k]:v } : l))
  const subtotal = lines.reduce((s,l)=>s+(parseFloat(l.qty)||0)*(parseFloat(l.rate)||0),0)
  const taxTotal  = lines.reduce((s,l)=>s+(parseFloat(l.qty)||0)*(parseFloat(l.rate)||0)*(parseFloat(l.tax)||0)/100,0)
  const total     = subtotal+taxTotal

  const save = async () => {
    if (lines.every(l=>!l.description)) { toast('Add at least one line item','error'); return }
    setSaving(true)
    try {
      const r = await fetch('/api/credit-notes', {
        method:'POST',
        headers:{ ...headers, 'Content-Type':'application/json' },
        body: JSON.stringify({
          invoiceId: selInvoice?._id||null,
          invoiceNumber: selInvoice?.invoiceNumber||'',
          customer: selInvoice?.customer||{},
          reason, date, notes,
          lineItems: lines.filter(l=>l.description).map(l=>({
            description:l.description, qty:parseFloat(l.qty)||1,
            rate:parseFloat(l.rate)||0, tax:parseFloat(l.tax)||0,
            amount:(parseFloat(l.qty)||1)*(parseFloat(l.rate)||0),
          })),
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      toast(`Credit note ${d.creditNoteNumber} created!`)
      onClose(true)
    } catch(e) { toast(e.message,'error') }
    setSaving(false)
  }

  return (
    <div style={{ maxWidth:680, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
        <Btn variant="ghost" onClick={()=>onClose(false)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back
        </Btn>
        <div style={{ height:16, width:1, background:'var(--border)' }}/>
        <h2 style={{ fontWeight:700, fontSize:16, color:'var(--text)' }}>New Credit Note</h2>
      </div>

      <Card style={{ padding:20, marginBottom:14 }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          <div>
            <label style={lbl}>Link to Invoice (optional)</label>
            <div style={{ position:'relative' }}>
              <input value={selInvoice ? `${selInvoice.invoiceNumber} — ${selInvoice.customer?.name}` : invSearch}
                onChange={e=>{ setInvSearch(e.target.value); setSelInvoice(null) }}
                placeholder="Search invoice number or customer…" style={inp} onFocus={focus} onBlur={blur}/>
              {invoices.length>0 && !selInvoice && (
                <div style={{ position:'absolute', top:'calc(100%+3px)', left:0, right:0, background:'var(--surface)', border:'1px solid var(--border-2)', borderRadius:'var(--r-md)', zIndex:99, boxShadow:'var(--shadow-lg)', overflow:'hidden' }}>
                  {invoices.slice(0,5).map(inv=>(
                    <button key={inv._id} onMouseDown={()=>{ setSelInvoice(inv); setInvoices([])
                      setLines([{ description:`Credit against ${inv.invoiceNumber}`, qty:1, rate:inv.total||0, tax:0, amount:inv.total||0 }])
                    }} style={{ display:'flex', justifyContent:'space-between', width:'100%', padding:'9px 12px', background:'none', border:'none', borderBottom:'1px solid var(--border)', cursor:'pointer', fontFamily:'var(--font)', textAlign:'left' }}
                      onMouseEnter={e=>e.currentTarget.style.background='var(--surface-2)'}
                      onMouseLeave={e=>e.currentTarget.style.background='none'}>
                      <div style={{ fontSize:13, color:'var(--text)' }}>
                        <span style={{ fontFamily:'var(--mono)', color:'var(--accent-2)', fontWeight:600 }}>{inv.invoiceNumber}</span>
                        <span style={{ color:'var(--text-3)', marginLeft:8 }}>{inv.customer?.name}</span>
                      </div>
                      <span style={{ fontFamily:'var(--mono)', fontSize:13, fontWeight:600 }}>{fmt(inv.total)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selInvoice && <div style={{ fontSize:11, color:'var(--green-text)', marginTop:4 }}>✓ Linked — will reduce invoice outstanding by credit amount</div>}
          </div>
          <div>
            <label style={lbl}>Date</label>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inp} onFocus={focus} onBlur={blur}/>
          </div>
          <div style={{ gridColumn:'span 2' }}>
            <label style={lbl}>Reason for Credit *</label>
            <input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Return of goods, billing adjustment, discount applied…" style={inp} onFocus={focus} onBlur={blur}/>
          </div>
        </div>
      </Card>

      {/* Line items */}
      <Card style={{ padding:16, marginBottom:14 }}>
        <div style={{ fontWeight:600, fontSize:13, color:'var(--text)', marginBottom:12 }}>Line Items</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 60px 100px 70px 28px', gap:8, marginBottom:6 }}>
          {['Description','Qty','Rate (₹)','GST %',''].map(h=>(
            <div key={h} style={{ fontSize:10, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.05em' }}>{h}</div>
          ))}
        </div>
        {lines.map((l,i)=>(
          <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 60px 100px 70px 28px', gap:8, marginBottom:8, alignItems:'center' }}>
            <input value={l.description} onChange={e=>setLine(i,'description',e.target.value)} placeholder="Item description" style={inp} onFocus={focus} onBlur={blur}/>
            <input type="number" value={l.qty} onChange={e=>setLine(i,'qty',e.target.value)} style={inp} onFocus={focus} onBlur={blur}/>
            <input type="number" value={l.rate} onChange={e=>setLine(i,'rate',e.target.value)} style={inp} onFocus={focus} onBlur={blur}/>
            <input type="number" value={l.tax} onChange={e=>setLine(i,'tax',e.target.value)} style={inp} onFocus={focus} onBlur={blur}/>
            <button onClick={()=>setLines(prev=>prev.filter((_,idx)=>idx!==i))} style={{ width:28, height:28, borderRadius:'var(--r)', background:'var(--red-dim)', border:'1px solid rgba(239,68,68,0.2)', color:'var(--red-text)', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
          </div>
        ))}
        <button onClick={()=>setLines(p=>[...p,newLine()])} style={{ fontSize:13, color:'var(--accent-2)', background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font)', fontWeight:500, marginTop:4 }}>+ Add Line</button>

        <div style={{ borderTop:'1px solid var(--border)', marginTop:12, paddingTop:12, display:'flex', flexDirection:'column', gap:4, alignItems:'flex-end' }}>
          <div style={{ fontSize:13, color:'var(--text-2)' }}>Subtotal: <strong style={{ fontFamily:'var(--mono)' }}>{fmt(subtotal)}</strong></div>
          <div style={{ fontSize:13, color:'var(--text-2)' }}>GST: <strong style={{ fontFamily:'var(--mono)' }}>{fmt(taxTotal)}</strong></div>
          <div style={{ fontSize:16, fontWeight:700, color:'var(--text)' }}>Credit Total: <span style={{ fontFamily:'var(--mono)', color:'var(--green-text)' }}>{fmt(total)}</span></div>
        </div>
      </Card>

      <div style={{ marginBottom:16 }}>
        <label style={lbl}>Notes</label>
        <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2} placeholder="Internal notes…" style={{ ...inp, resize:'vertical' }} onFocus={focus} onBlur={blur}/>
      </div>

      <div style={{ display:'flex', justifyContent:'flex-end', gap:10, paddingTop:16, borderTop:'1px solid var(--border)' }}>
        <Btn onClick={()=>onClose(false)}>Cancel</Btn>
        <Btn variant="primary" onClick={save} disabled={saving}>{saving?'Issuing…':'✓ Issue Credit Note'}</Btn>
      </div>
    </div>
  )
}

export default function CreditNotes({ org, headers, toast, readOnly=false }) {
  const [notes,   setNotes]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [view,    setView]    = useState('list')

  const load = () => {
    setLoading(true)
    fetch('/api/credit-notes', { headers })
      .then(r=>r.json()).then(d=>{ setNotes(Array.isArray(d)?d:[]); setLoading(false) })
      .catch(()=>setLoading(false))
  }

  useEffect(()=>{ load() }, [org.id])

  const del = async cn => {
    if (!confirm(`Void ${cn.creditNoteNumber}?`)) return
    await fetch(`/api/credit-notes/${cn._id}`, { method:'DELETE', headers })
    toast('Credit note voided'); load()
  }

  const filtered = notes.filter(n =>
    !search || n.creditNoteNumber?.toLowerCase().includes(search.toLowerCase()) ||
    n.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
    n.reason?.toLowerCase().includes(search.toLowerCase())
  )

  if (view==='form') return <CreditNoteForm headers={headers} toast={toast} onClose={r=>{ setView('list'); if(r) load() }}/>

  const totalIssued = notes.reduce((s,n)=>s+(n.total||0),0)

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
        <div>
          <h2 style={{ fontSize:18, fontWeight:700, color:'var(--text)', letterSpacing:'-0.3px' }}>Credit Notes</h2>
          <p style={{ fontSize:13, color:'var(--text-3)', marginTop:4 }}>{notes.length} credit notes · {fmt(totalIssued)} total issued</p>
        </div>
        {!readOnly && <Btn variant="primary" onClick={()=>setView('form')}>+ New Credit Note</Btn>}
      </div>


      {/* How it works */}
      <div style={{ padding:'12px 16px', background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:'var(--r-md)', marginBottom:18, fontSize:12, color:'var(--text-2)', lineHeight:1.7 }}>
        <b style={{ color:'var(--green-text)', fontSize:13 }}>📝 How credit notes work</b><br/>
        A credit note is issued to reduce the amount a customer owes — for returns, cancellations, or billing adjustments.
        Link it to an existing invoice and the outstanding balance is reduced automatically.
        Credit notes are not refunds — they adjust the books and can be applied against future invoices.
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:18 }}>
        {[
          { label:'Total Issued', value:fmt(totalIssued), color:'var(--green-text)' },
          { label:'This Month',   value:fmt(notes.filter(n=>new Date(n.date)>new Date(Date.now()-30*86400000)).reduce((s,n)=>s+n.total,0)), color:'var(--accent-2)' },
          { label:'Count',        value:notes.length, color:'var(--text-2)' },
        ].map(s=>(
          <div key={s.label} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', padding:'14px 16px' }}>
            <div style={{ fontSize:11, color:'var(--text-3)', fontWeight:500, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:6 }}>{s.label}</div>
            <div style={{ fontFamily:'var(--mono)', fontSize:20, fontWeight:700, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <Card>
        <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', gap:10 }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search credit notes…"/>
          <Btn size="sm" onClick={load}>↻</Btn>
        </div>
        {loading ? <div style={{ padding:48, textAlign:'center', color:'var(--text-3)' }}>Loading…</div>
        : filtered.length===0 ? <EmptyState message={search ? 'No credit notes match your search.' : 'No credit notes yet. Issue one against an invoice.'}/>
        : (
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ borderBottom:'1px solid var(--border)' }}>
                {['CN #','Date','Customer','Reason','Invoice','Total',''].map((h,i)=>(
                  <th key={h} style={{ padding:'10px 14px', textAlign:i>4?'right':'left', fontSize:11, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.05em', background:'var(--bg-3)', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(cn=>(
                <tr key={cn._id} style={{ borderBottom:'1px solid var(--border)', transition:'background 0.1s' }}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--surface-2)'}
                  onMouseLeave={e=>e.currentTarget.style.background=''}>
                  <td style={{ padding:'11px 14px', fontFamily:'var(--mono)', fontSize:12, fontWeight:700, color:'var(--green-text)' }}>{cn.creditNoteNumber}</td>
                  <td style={{ padding:'11px 14px', fontSize:12, color:'var(--text-2)' }}>{fmtDate(cn.date)}</td>
                  <td style={{ padding:'11px 14px', fontWeight:500, color:'var(--text)' }}>{cn.customer?.name||'—'}</td>
                  <td style={{ padding:'11px 14px', fontSize:12, color:'var(--text-3)', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{cn.reason||'—'}</td>
                  <td style={{ padding:'11px 14px', fontFamily:'var(--mono)', fontSize:11, color:'var(--accent-2)' }}>{cn.invoiceNumber||'—'}</td>
                  <td style={{ padding:'11px 14px', textAlign:'right', fontFamily:'var(--mono)', fontWeight:700, color:'var(--green-text)' }}>{fmt(cn.total)}</td>
                  <td style={{ padding:'11px 14px' }}>
                    {!readOnly && <Btn size="sm" variant="danger" onClick={()=>del(cn)}>Void</Btn>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}