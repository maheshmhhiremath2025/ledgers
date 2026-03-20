import { useState, useEffect } from 'react'
import { Btn, Input, Select, Card, SectionTitle, today } from './ui'

export default function PaymentForm({ org, headers, toast, editItem, onClose }) {
  const [form, setForm] = useState({
    type:'Receipt', party:{ name:'', email:'' }, paymentDate:today(),
    amount:'', currency:'INR', paymentMode:'Bank Transfer',
    referenceType:'Invoice', referenceNumber:'', bankAccount:'', notes:'', status:'Cleared',
    ...editItem,
  })
  const [invoices, setInvoices] = useState([])
  const [saving, setSaving] = useState(false)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))
  const setP = (k,v) => setForm(f=>({...f,party:{...f.party,[k]:v}}))

  useEffect(() => {
    fetch('/api/invoices?limit=50', { headers }).then(r=>r.json()).then(d=>setInvoices(d.invoices||[])).catch(()=>{})
  }, [org.id])

  const linkInv = (id) => {
    const inv = invoices.find(i=>i._id===id)
    if(inv) setForm(f=>({ ...f, referenceId:inv._id, referenceNumber:inv.invoiceNumber, party:{ name:inv.customer?.name||'', email:inv.customer?.email||'' }, amount:String(Math.max(0,(inv.total||0)-(inv.paidAmount||0)).toFixed(2)) }))
  }

  const save = async () => {
    if(!form.party.name){ toast('Party name required','error'); return }
    if(!form.amount){ toast('Amount required','error'); return }
    setSaving(true)
    try {
      const isEdit = !!editItem?._id
      const res = await fetch(isEdit?`/api/payments/${editItem._id}`:'/api/payments', { method:isEdit?'PUT':'POST', headers:{...headers,'Content-Type':'application/json'}, body:JSON.stringify(form) })
      if(!res.ok){ const e=await res.json(); throw new Error(e.error) }
      toast(isEdit?'Payment updated!':'Payment recorded!')
      onClose()
    } catch(e){ toast(e.message||'Failed','error') }
    setSaving(false)
  }

  const unpaid = invoices.filter(i=>i.status!=='Paid'&&i.status!=='Cancelled')

  return (
    <div style={{ maxWidth:640, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:22 }}>
        <Btn variant="ghost" onClick={onClose}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg> Back</Btn>
        <div style={{ height:16, width:1, background:'var(--border)' }}/>
        <h2 style={{ fontWeight:700, fontSize:16, color:'var(--text)' }}>{editItem?'Edit Payment':'Record Payment'}</h2>
      </div>

      {/* Type selector */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
        {[
          { t:'Receipt', label:'Money In', sub:'Customer paid you', color:'var(--green)', dim:'var(--green-dim)', icon:'↓' },
          { t:'Payment', label:'Money Out', sub:'You paid vendor',   color:'var(--amber)',dim:'var(--amber-dim)',icon:'↑' },
        ].map(({ t,label,sub,color,dim,icon })=>(
          <button key={t} onClick={()=>set('type',t)} style={{
            padding:'16px', border:`2px solid ${form.type===t?color:'var(--border)'}`, borderRadius:'var(--r-lg)',
            background:form.type===t?dim:'var(--surface)', cursor:'pointer', textAlign:'left', transition:'all 0.15s',
          }}>
            <div style={{ fontSize:22, marginBottom:6 }}>{icon}</div>
            <div style={{ fontWeight:700, fontSize:14, color:form.type===t?color:'var(--text-2)' }}>{label}</div>
            <div style={{ fontSize:12, color:'var(--text-3)', marginTop:2 }}>{sub}</div>
          </button>
        ))}
      </div>

      <Card style={{ padding:20, marginBottom:14 }}>
        {form.type==='Receipt' && unpaid.length>0 && (
          <div style={{ marginBottom:16 }}>
            <SectionTitle>Link to Invoice</SectionTitle>
            <select onChange={e=>linkInv(e.target.value)} defaultValue="" style={{ width:'100%', padding:'8px 11px', background:'var(--surface)', border:'1px solid var(--border-2)', borderRadius:'var(--r)', fontSize:13, color:'var(--text)', cursor:'pointer', outline:'none' }}>
              <option value="">Select invoice to auto-fill…</option>
              {unpaid.map(i=><option key={i._id} value={i._id} style={{ background:'var(--bg-2)' }}>{i.invoiceNumber} — {i.customer?.name} — ₹{Math.max(0,(i.total||0)-(i.paidAmount||0)).toLocaleString('en-IN')}</option>)}
            </select>
          </div>
        )}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <Input label="Party Name *" value={form.party.name} onChange={v=>setP('name',v)} required />
          <Input label="Party Email"  type="email" value={form.party.email} onChange={v=>setP('email',v)} />
          <Input label="Amount (₹) *" type="number" value={form.amount} onChange={v=>set('amount',v)} required />
          <Input label="Payment Date *" type="date" value={form.paymentDate} onChange={v=>set('paymentDate',v)} required />
          <Select label="Payment Mode" value={form.paymentMode} onChange={v=>set('paymentMode',v)} options={['Cash','Bank Transfer','UPI','Cheque','Card','Other']} />
          <Select label="Status" value={form.status} onChange={v=>set('status',v)} options={['Cleared','Pending','Bounced']} />
          <Input label="Reference #" value={form.referenceNumber} onChange={v=>set('referenceNumber',v)} placeholder="INV-0001" />
          <Input label="Bank Account" value={form.bankAccount} onChange={v=>set('bankAccount',v)} placeholder="HDFC — 1234" />
        </div>
        <div style={{ marginTop:12 }}>
          <SectionTitle>Notes</SectionTitle>
          <textarea value={form.notes} onChange={e=>set('notes',e.target.value)} rows={2} placeholder="Additional notes…"
            style={{ width:'100%', padding:'8px 10px', background:'var(--bg-3)', border:'1px solid var(--border)', borderRadius:'var(--r)', fontSize:13, color:'var(--text)', resize:'vertical', fontFamily:'var(--font)', outline:'none' }} />
        </div>
      </Card>

      <div style={{ display:'flex', gap:10, justifyContent:'flex-end', padding:'14px 0', borderTop:'1px solid var(--border)' }}>
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" onClick={save} disabled={saving}>
          {form.type==='Receipt'?'Record Receipt':'Record Payment'}
        </Btn>
      </div>
    </div>
  )
}