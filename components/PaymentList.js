import { useState, useEffect } from 'react'
import { Badge, Btn, SearchBar, Card, EmptyState, Table, fmt, fmtDate } from './ui'

export default function PaymentList({ org, headers, toast, onEdit, readOnly = false }) {
  const [payments, setPayments] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [typeFilter, setTF]     = useState('')

  const load = () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (search) p.set('search', search)
    if (typeFilter) p.set('type', typeFilter)
    fetch(`/api/payments?${p}`, { headers }).then(r=>r.json())
      .then(d=>{ setPayments(d.payments||[]); setLoading(false) }).catch(()=>setLoading(false))
  }
  useEffect(()=>{ load() }, [org.id, search, typeFilter])

  const receipts = payments.filter(p=>p.type==='Receipt')
  const pays     = payments.filter(p=>p.type==='Payment')
  const totalIn  = receipts.reduce((s,p)=>s+(p.amount||0),0)
  const totalOut = pays.reduce((s,p)=>s+(p.amount||0),0)

  const columns = [
    { key:'paymentNumber', label:'#',      render:v=><span style={{ fontFamily:'var(--mono)', fontWeight:600, color:'var(--accent-2)', fontSize:12 }}>{v}</span> },
    { key:'party',         label:'Party',  render:v=><div><div style={{ fontWeight:500, color:'var(--text)' }}>{v?.name||'—'}</div><div style={{ fontSize:11,color:'var(--text-3)' }}>{v?.email||''}</div></div> },
    { key:'type',          label:'Type',   render:v=><Badge status={v}/> },
    { key:'paymentDate',   label:'Date',   render:v=><span style={{ color:'var(--text-2)',fontSize:12 }}>{fmtDate(v)}</span> },
    { key:'paymentMode',   label:'Mode',   render:v=><span style={{ fontSize:12, color:'var(--text-3)' }}>{v}</span> },
    { key:'referenceNumber',label:'Ref',   render:v=><span style={{ fontSize:12, color:'var(--text-3)', fontFamily:'var(--mono)' }}>{v||'—'}</span> },
    { key:'status',        label:'Status', render:v=><Badge status={v}/> },
    { key:'amount',        label:'Amount', align:'right', render:(v,row)=>(
      <span style={{ fontFamily:'var(--mono)', fontWeight:700, fontSize:13, color:row.type==='Receipt'?'var(--green-text)':'var(--amber-text)' }}>
        {row.type==='Receipt'?'+':'-'}{fmt(v)}
      </span>
    )},
    { key:'_act', label:'', render:(_,row)=><Btn size="sm" onClick={e=>{e.stopPropagation();onEdit(row)}}>Edit</Btn> },
  ]

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:20 }}>
        {[
          { label:'Money In', value:fmt(totalIn),       sub:`${receipts.length} receipts`,      color:'var(--green-text)',  bg:'var(--green-dim)',  icon:'↓' },
          { label:'Money Out', value:fmt(totalOut),     sub:`${pays.length} payments`,           color:'var(--amber-text)', bg:'var(--amber-dim)', icon:'↑' },
          { label:'Net Flow',  value:fmt(totalIn-totalOut), sub:'Cash position',                 color:totalIn-totalOut>=0?'var(--green-text)':'var(--red-text)', bg:totalIn-totalOut>=0?'var(--green-dim)':'var(--red-dim)', icon:'~' },
        ].map(s => (
          <div key={s.label} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', padding:'18px 20px', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:12, right:14, width:32, height:32, borderRadius:'var(--r)', background:s.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:700, color:s.color }}>
              {s.icon}
            </div>
            <div style={{ fontSize:11, color:'var(--text-3)', fontWeight:500, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8 }}>{s.label}</div>
            <div style={{ fontFamily:'var(--mono)', fontSize:22, fontWeight:700, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:12, color:'var(--text-3)', marginTop:4 }}>{s.sub}</div>
          </div>
        ))}
      </div>
      <Card>
        <div style={{ display:'flex', gap:10, padding:'12px 16px', borderBottom:'1px solid var(--border)', flexWrap:'wrap' }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search payments…" />
          <select value={typeFilter} onChange={e=>setTF(e.target.value)} style={{ padding:'7px 11px', background:'var(--surface)', border:'1px solid var(--border-2)', borderRadius:'var(--r)', fontSize:13, color:'var(--text)', cursor:'pointer', outline:'none' }}>
            <option value="">All types</option>
            <option style={{ background:'var(--bg-2)' }}>Receipt</option>
            <option style={{ background:'var(--bg-2)' }}>Payment</option>
          </select>
        </div>
        {loading ? <div style={{ padding:48, textAlign:'center', color:'var(--text-3)' }}>Loading…</div>
          : payments.length===0 ? <EmptyState message="No payments yet." />
          : <Table columns={columns} data={payments} onRowClick={onEdit} />}
        <div style={{ padding:'10px 16px', borderTop:'1px solid var(--border)', fontSize:12, color:'var(--text-3)', display:'flex', justifyContent:'space-between' }}>
          <span>{payments.length} transactions</span><span>{org.name}</span>
        </div>
      </Card>
    </div>
  )
}