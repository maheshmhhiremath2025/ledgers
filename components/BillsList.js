import { useState, useEffect } from 'react'
import AttachmentUploader from './AttachmentUploader'

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const STATUS_COLORS = {
  Draft:    { bg: 'var(--surface-3)',     color: 'var(--text-3)' },
  Open:     { bg: 'rgba(59,130,246,0.12)', color: 'var(--blue-text)' },
  Partial:  { bg: 'rgba(245,158,11,0.12)', color: 'var(--amber-text)' },
  Paid:     { bg: 'rgba(16,185,129,0.12)', color: 'var(--green-text)' },
  Overdue:  { bg: 'rgba(239,68,68,0.12)',  color: 'var(--red-text)' },
  Cancelled:{ bg: 'var(--surface-3)',     color: 'var(--text-4)' },
}

export default function BillsList({ headers, toast, readOnly }) {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState(null)
  const [paying, setPaying]     = useState(null)

  const load = () => {
    setLoading(true)
    fetch('/api/bills', { headers, credentials: 'include' })
      .then(r => r.json())
      .then(d => { setItems(d.bills || []); setLoading(false) })
      .catch(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const filtered = items.filter(i =>
    !search ||
    (i.billNumber || '').toLowerCase().includes(search.toLowerCase()) ||
    (i.vendorBillNumber || '').toLowerCase().includes(search.toLowerCase()) ||
    (i.vendor?.name || '').toLowerCase().includes(search.toLowerCase())
  )

  const downloadPdf = (b) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('sb_token') : null
    fetch(`/api/bills/${b._id}/pdf`, { credentials: 'include', headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => r.ok ? r.blob() : Promise.reject(new Error('Failed')))
      .then(blob => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = url; a.download = `${b.billNumber}.pdf`; a.click()
        URL.revokeObjectURL(url)
      })
      .catch(() => toast('PDF download failed', 'error'))
  }

  const remove = async (b) => {
    if (!confirm(`Delete bill ${b.billNumber}?`)) return
    const r = await fetch(`/api/bills/${b._id}`, { method: 'DELETE', headers, credentials: 'include' })
    if (r.ok) { toast('Deleted'); load() } else toast('Failed', 'error')
  }

  const totalDue = items.filter(i => i.status !== 'Paid').reduce((s, i) => s + ((i.total || 0) - (i.paidAmount || 0)), 0)

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 18, flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin:0 }}>Vendor Bills</h2>
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>{items.length} bills · {fmt(totalDue)} outstanding</div>
        </div>
        {!readOnly && (
          <button onClick={() => { setEditing(null); setShowForm(true) }} style={{ background:'var(--accent)', color:'#fff', border:'none', padding:'10px 18px', borderRadius:'var(--r-md)', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' }}>+ New Bill</button>
        )}
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by bill number or vendor…"
        style={{ width:'100%', maxWidth:420, padding:'10px 14px', background:'var(--surface-2)', border:'1px solid var(--border-2)', color:'var(--text)', borderRadius:'var(--r)', fontSize:13, marginBottom:14, outline:'none', fontFamily:'var(--font)' }} />

      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', overflow:'hidden' }}>
        {loading ? <div style={{ padding:40, textAlign:'center', color:'var(--text-3)' }}>Loading…</div>
         : filtered.length === 0 ? <div style={{ padding:40, textAlign:'center', color:'var(--text-3)' }}>No vendor bills yet.</div>
         : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead style={{ background:'var(--bg-3)' }}>
              <tr>
                {['Bill #','Vendor','Date','Due','Total','Balance','Status',''].map(h => (
                  <th key={h} style={{ textAlign:'left', padding:'12px 16px', fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.05em', borderBottom:'1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(i => {
                const sc = STATUS_COLORS[i.status] || STATUS_COLORS.Open
                const balance = (i.total || 0) - (i.paidAmount || 0)
                return (
                  <tr key={i._id} style={{ borderBottom:'1px solid var(--border)' }}>
                    <td style={{ padding:'12px 16px', fontSize:13, color:'var(--text)', fontWeight:600 }}>
                      {i.billNumber}
                      {i.vendorBillNumber && <div style={{ fontSize:11, color:'var(--text-4)', fontWeight:400 }}>vendor: {i.vendorBillNumber}</div>}
                    </td>
                    <td style={{ padding:'12px 16px', fontSize:13, color:'var(--text-2)' }}>{i.vendor?.name || '—'}</td>
                    <td style={{ padding:'12px 16px', fontSize:12, color:'var(--text-3)' }}>{fmtDate(i.billDate)}</td>
                    <td style={{ padding:'12px 16px', fontSize:12, color:'var(--text-3)' }}>{fmtDate(i.dueDate)}</td>
                    <td style={{ padding:'12px 16px', fontSize:13, color:'var(--text)', fontFamily:'var(--mono)' }}>{fmt(i.total)}</td>
                    <td style={{ padding:'12px 16px', fontSize:13, color: balance > 0 ? 'var(--red-text)' : 'var(--green-text)', fontFamily:'var(--mono)' }}>{fmt(balance)}</td>
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ background: sc.bg, color: sc.color, padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:600 }}>{i.status}</span>
                    </td>
                    <td style={{ padding:'12px 16px', textAlign:'right' }}>
                      <button onClick={() => downloadPdf(i)} style={{ background:'transparent', border:'1px solid var(--border-2)', color:'var(--text-2)', padding:'4px 10px', borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer', marginRight:6, fontFamily:'var(--font)' }}>PDF</button>
                      {!readOnly && balance > 0 && (
                        <button onClick={() => setPaying(i)} style={{ background:'var(--green)', color:'#fff', border:'none', padding:'4px 12px', borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer', marginRight:6, fontFamily:'var(--font)' }}>Pay</button>
                      )}
                      {!readOnly && (
                        <>
                          <button onClick={() => { setEditing(i); setShowForm(true) }} style={{ background:'transparent', border:'1px solid var(--border-2)', color:'var(--text-2)', padding:'4px 10px', borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer', marginRight:6, fontFamily:'var(--font)' }}>Edit</button>
                          <button onClick={() => remove(i)} style={{ background:'transparent', border:'1px solid rgba(239,68,68,0.4)', color:'var(--red)', padding:'4px 10px', borderRadius:6, fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'var(--font)' }}>Del</button>
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

      {showForm && <BillForm editing={editing} headers={headers} toast={toast} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load() }} />}
      {paying && <PayModal bill={paying} headers={headers} toast={toast} onClose={() => setPaying(null)} onSaved={() => { setPaying(null); load() }} />}
    </div>
  )
}

function PayModal({ bill, headers, toast, onClose, onSaved }) {
  const balance = (bill.total || 0) - (bill.paidAmount || 0)
  const [amount, setAmount] = useState(balance.toFixed(2))
  const [paymentMode, setMode] = useState('Bank Transfer')
  const [paymentDate, setDate] = useState(new Date().toISOString().slice(0,10))
  const [reference, setRef] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    const r = await fetch(`/api/bills/${bill._id}/pay`, { method: 'POST', headers, credentials:'include', body: JSON.stringify({ amount: parseFloat(amount), paymentMode, paymentDate, reference }) })
    const d = await r.json()
    if (r.ok) { toast(`✓ ${fmt(parseFloat(amount))} paid`); onSaved() }
    else toast(d.error || 'Failed', 'error')
    setSaving(false)
  }
  const inp = { width:'100%', padding:'9px 12px', background:'var(--surface-2)', border:'1px solid var(--border-2)', color:'var(--text)', borderRadius:'var(--r)', fontSize:13, outline:'none', fontFamily:'var(--font)' }

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', display:'flex', alignItems:'center', justifyContent:'center', padding:20, zIndex:9999 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', width:'100%', maxWidth:440, padding:22 }}>
        <div style={{ fontSize:16, fontWeight:700, color:'var(--text)', marginBottom:4 }}>Pay {bill.billNumber}</div>
        <div style={{ fontSize:12, color:'var(--text-3)', marginBottom:18 }}>Vendor: {bill.vendor?.name} · Outstanding: {fmt(balance)}</div>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div><label style={{ fontSize:11, color:'var(--text-3)' }}>Amount</label><input type="number" value={amount} onChange={e => setAmount(e.target.value)} style={inp}/></div>
          <div><label style={{ fontSize:11, color:'var(--text-3)' }}>Payment date</label><input type="date" value={paymentDate} onChange={e => setDate(e.target.value)} style={inp}/></div>
          <div><label style={{ fontSize:11, color:'var(--text-3)' }}>Mode</label>
            <select value={paymentMode} onChange={e => setMode(e.target.value)} style={inp}>
              {['Bank Transfer','Cash','UPI','Cheque','Card','Other'].map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div><label style={{ fontSize:11, color:'var(--text-3)' }}>Reference</label><input value={reference} onChange={e => setRef(e.target.value)} placeholder="UTR / cheque #" style={inp}/></div>
        </div>
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:18 }}>
          <button onClick={onClose} style={{ background:'transparent', border:'1px solid var(--border-2)', color:'var(--text-2)', padding:'9px 16px', borderRadius:'var(--r)', cursor:'pointer', fontSize:13, fontFamily:'var(--font)' }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ background:'var(--green)', color:'#fff', border:'none', padding:'9px 18px', borderRadius:'var(--r)', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'var(--font)' }}>{saving ? 'Saving…' : '✓ Record Payment'}</button>
        </div>
      </div>
    </div>
  )
}

function BillForm({ editing, headers, toast, onClose, onSaved }) {
  const [vendor, setVendor]   = useState(editing?.vendor || { name: '', email: '', phone: '', gstin: '', address: '' })
  const [vendorBillNumber, setVBN] = useState(editing?.vendorBillNumber || '')
  const [billDate, setBillDate] = useState(editing?.billDate ? new Date(editing.billDate).toISOString().slice(0,10) : new Date().toISOString().slice(0,10))
  const [dueDate, setDueDate]   = useState(editing?.dueDate ? new Date(editing.dueDate).toISOString().slice(0,10) : '')
  const [status, setStatus]     = useState(editing?.status || 'Open')
  const [lineItems, setLines]   = useState(editing?.lineItems?.length ? editing.lineItems : [{ description: '', qty: 1, rate: 0, tax: 0 }])
  const [tdsRate, setTdsRate]   = useState(editing?.tdsRate || 0)
  const [tdsSection, setTdsSec] = useState(editing?.tdsSection || '')
  const [notes, setNotes]       = useState(editing?.notes || '')
  const [attachments, setAttachments] = useState(editing?.attachments || [])
  const [saving, setSaving]     = useState(false)

  const updateLine = (idx, patch) => setLines(L => L.map((l, i) => i === idx ? { ...l, ...patch } : l))
  const addLine    = () => setLines(L => [...L, { description: '', qty: 1, rate: 0, tax: 0 }])
  const removeLine = i => setLines(L => L.filter((_, idx) => idx !== i))

  const subtotal = lineItems.reduce((s, l) => s + (Number(l.qty)||0) * (Number(l.rate)||0), 0)
  const taxTotal = lineItems.reduce((s, l) => s + (Number(l.qty)||0) * (Number(l.rate)||0) * (Number(l.tax)||0) / 100, 0)
  const total    = subtotal + taxTotal
  const tdsAmount = (subtotal * (Number(tdsRate)||0)) / 100

  const save = async () => {
    if (!vendor.name) { toast('Vendor name required', 'error'); return }
    if (lineItems.some(l => !l.description)) { toast('All lines need a description', 'error'); return }
    setSaving(true)
    const body = { vendor, vendorBillNumber, billDate, dueDate: dueDate || null, status, lineItems, notes, tdsRate: Number(tdsRate)||0, tdsAmount, tdsSection, attachments }
    const url  = editing ? `/api/bills/${editing._id}` : '/api/bills'
    const r = await fetch(url, { method: editing ? 'PUT' : 'POST', headers, credentials:'include', body: JSON.stringify(body) })
    const d = await r.json()
    if (r.ok) { toast(editing ? '✓ Updated' : '✓ Bill recorded'); onSaved() }
    else toast(d.error || 'Failed', 'error')
    setSaving(false)
  }

  const inp = { width:'100%', padding:'8px 11px', background:'var(--surface-2)', border:'1px solid var(--border-2)', color:'var(--text)', borderRadius:'var(--r)', fontSize:13, outline:'none', fontFamily:'var(--font)' }

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px', zIndex:9999 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', width:'100%', maxWidth:900, maxHeight:'90vh', display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'16px 22px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', flex:'0 0 auto' }}>
          <div style={{ fontSize:16, fontWeight:700, color:'var(--text)' }}>{editing ? 'Edit Bill' : 'New Vendor Bill'}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text-3)', fontSize:20, cursor:'pointer', fontFamily:'var(--font)' }}>×</button>
        </div>
        <div style={{ padding:22, flex:'1 1 auto', overflow:'auto', minHeight:0 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', marginBottom:8 }}>Vendor</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
            <input placeholder="Name *"  value={vendor.name}  onChange={e => setVendor({ ...vendor, name:  e.target.value })} style={inp}/>
            <input placeholder="Email"   value={vendor.email} onChange={e => setVendor({ ...vendor, email: e.target.value })} style={inp}/>
            <input placeholder="Phone"   value={vendor.phone} onChange={e => setVendor({ ...vendor, phone: e.target.value })} style={inp}/>
            <input placeholder="GSTIN"   value={vendor.gstin} onChange={e => setVendor({ ...vendor, gstin: e.target.value })} style={inp}/>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:10, marginBottom:14 }}>
            <div><label style={{ fontSize:11, color:'var(--text-3)' }}>Vendor's bill #</label><input value={vendorBillNumber} onChange={e => setVBN(e.target.value)} placeholder="e.g. INV-789" style={inp}/></div>
            <div><label style={{ fontSize:11, color:'var(--text-3)' }}>Bill date</label><input type="date" value={billDate} onChange={e => setBillDate(e.target.value)} style={inp}/></div>
            <div><label style={{ fontSize:11, color:'var(--text-3)' }}>Due date</label><input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={inp}/></div>
            <div><label style={{ fontSize:11, color:'var(--text-3)' }}>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} style={inp}>
                {['Draft','Open','Partial','Paid','Overdue','Cancelled'].map(s => <option key={s}>{s}</option>)}
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

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', marginBottom:8 }}>TDS (deducted by us)</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                <input type="number" placeholder="Rate %" value={tdsRate} onChange={e => setTdsRate(e.target.value)} style={inp}/>
                <input placeholder="Section (e.g. 194C)" value={tdsSection} onChange={e => setTdsSec(e.target.value)} style={inp}/>
              </div>
              {tdsAmount > 0 && <div style={{ fontSize:11, color:'var(--text-3)', marginTop:6 }}>TDS amount: {fmt(tdsAmount)} (to deduct on payment)</div>}
            </div>
            <div style={{ padding:14, background:'var(--surface-2)', borderRadius:'var(--r)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--text-3)', marginBottom:4 }}><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--text-3)', marginBottom:6 }}><span>GST</span><span>{fmt(taxTotal)}</span></div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:14, color:'var(--text)', fontWeight:700, paddingTop:6, borderTop:'1px solid var(--border)' }}><span>Total</span><span>{fmt(total)}</span></div>
            </div>
          </div>

          <div><label style={{ fontSize:11, color:'var(--text-3)' }}>Notes</label><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{ ...inp, resize:'vertical' }}/></div>
          <div style={{ marginTop:14 }}>
            <label style={{ fontSize:11, color:'var(--text-3)', display:'block', marginBottom:6 }}>Attachments (scanned bills, proofs)</label>
            <AttachmentUploader value={attachments} onChange={setAttachments} headers={headers} toast={toast}/>
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
