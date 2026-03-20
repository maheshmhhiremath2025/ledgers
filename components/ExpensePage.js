import { useState, useEffect } from 'react'
import { Btn, Card, SectionTitle, EmptyState, SearchBar, fmt, fmtDate } from './ui'

const CATEGORIES = [
  'Rent & Office','Salaries & Wages','Travel & Transport',
  'Software & Subscriptions','Marketing & Advertising','Utilities',
  'Professional Fees','Equipment & Hardware','Meals & Entertainment',
  'Bank Charges','Taxes & Compliance','Repairs & Maintenance',
  'Insurance','Miscellaneous',
]

const METHODS = ['Bank Transfer','Cash','UPI','Cheque','Card','Other']

const CAT_COLORS = {
  'Rent & Office': '#6366F1', 'Salaries & Wages': '#10B981', 'Travel & Transport': '#F59E0B',
  'Software & Subscriptions': '#3B82F6', 'Marketing & Advertising': '#EC4899', 'Utilities': '#14B8A6',
  'Professional Fees': '#8B5CF6', 'Equipment & Hardware': '#F97316', 'Meals & Entertainment': '#EF4444',
  'Bank Charges': '#64748B', 'Taxes & Compliance': '#DC2626', 'Repairs & Maintenance': '#059669',
  'Insurance': '#0EA5E9', 'Miscellaneous': '#94A3B8',
}

const inputStyle = { width:'100%', padding:'9px 12px', background:'var(--surface-2)', border:'1px solid var(--border-2)', borderRadius:'var(--r)', fontSize:13, color:'var(--text)', outline:'none', fontFamily:'var(--font)' }
const labelStyle = { display:'block', fontSize:12, color:'var(--text-3)', fontWeight:500, marginBottom:5 }
const today = () => new Date().toISOString().split('T')[0]

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

function Sel({ label, value, onChange, options, span }) {
  return (
    <div style={span ? { gridColumn:`span ${span}` } : {}}>
      {label && <label style={labelStyle}>{label}</label>}
      <select value={value||''} onChange={e=>onChange(e.target.value)}
        style={{ ...inputStyle, cursor:'pointer' }}
        onFocus={e=>e.target.style.borderColor='var(--accent)'}
        onBlur={e=>e.target.style.borderColor='var(--border-2)'}>
        {options.map(o => typeof o==='string'
          ? <option key={o} value={o} style={{background:'var(--bg-2)'}}>{o}</option>
          : <option key={o.value} value={o.value} style={{background:'var(--bg-2)'}}>{o.label}</option>
        )}
      </select>
    </div>
  )
}

// ── Donut chart ──
function CategoryDonut({ byCategory }) {
  if (!byCategory?.length) return null
  const total = byCategory.reduce((s,c)=>s+c.total,0)
  if (!total) return null
  const R=44, CX=52, CY=52, SW=14
  let angle = -Math.PI/2
  const arcs = byCategory.slice(0,6).map(c => {
    const sweep = (c.total/total)*2*Math.PI
    const x1=CX+R*Math.cos(angle), y1=CY+R*Math.sin(angle)
    angle += sweep
    const x2=CX+R*Math.cos(angle), y2=CY+R*Math.sin(angle)
    return { ...c, d:`M${x1},${y1} A${R},${R} 0 ${sweep>Math.PI?1:0},1 ${x2},${y2}`, color:CAT_COLORS[c._id]||'#94A3B8' }
  })
  return (
    <div style={{display:'flex',alignItems:'center',gap:16}}>
      <svg width="104" height="104" viewBox="0 0 104 104" style={{flexShrink:0}}>
        {arcs.map((a,i)=><path key={i} d={a.d} fill="none" stroke={a.color} strokeWidth={SW} strokeLinecap="butt" opacity="0.9"/>)}
        <text x="52" y="48" textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--text)" fontFamily="var(--mono)">{byCategory.length}</text>
        <text x="52" y="62" textAnchor="middle" fontSize="9" fill="var(--text-3)" fontFamily="var(--font)">categories</text>
      </svg>
      <div style={{flex:1}}>
        {arcs.map(a=>(
          <div key={a._id} style={{display:'flex',justifyContent:'space-between',gap:12,marginBottom:5,fontSize:12}}>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:a.color,flexShrink:0}}/>
              <span style={{color:'var(--text-2)',maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a._id}</span>
            </div>
            <span style={{fontFamily:'var(--mono)',color:'var(--text-3)',fontSize:11}}>{fmt(a.total)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Expense Form ──
function ExpenseForm({ editItem, headers, toast, onClose, readOnly }) {
  const [date,        setDate]        = useState(editItem?.date ? new Date(editItem.date).toISOString().split('T')[0] : today())
  const [category,    setCategory]    = useState(editItem?.category || 'Miscellaneous')
  const [vendor,      setVendor]      = useState(editItem?.vendor || '')
  const [description, setDescription] = useState(editItem?.description || '')
  const [amount,      setAmount]      = useState(String(editItem?.amount || ''))
  const [tax,         setTax]         = useState(String(editItem?.tax || '0'))
  const [paymentMode, setPaymentMode] = useState(editItem?.paymentMode || 'Bank Transfer')
  const [reference,   setReference]   = useState(editItem?.reference || '')
  const [notes,       setNotes]       = useState(editItem?.notes || '')
  const [saving,      setSaving]      = useState(false)

  const taxAmt = Math.round((parseFloat(amount)||0) * (parseFloat(tax)||0) / 100 * 100) / 100
  const total  = (parseFloat(amount)||0) + taxAmt

  const save = async () => {
    if (!amount || parseFloat(amount) <= 0) { toast('Amount is required', 'error'); return }
    setSaving(true)
    try {
      const isEdit = !!editItem?._id
      const r = await fetch(isEdit ? `/api/expenses/${editItem._id}` : '/api/expenses', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, category, vendor, description, amount: parseFloat(amount), tax: parseFloat(tax)||0, paymentMode, reference, notes }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      toast(isEdit ? 'Expense updated!' : 'Expense recorded!')
      onClose()
    } catch(e) { toast(e.message, 'error') }
    setSaving(false)
  }

  return (
    <div style={{maxWidth:600, margin:'0 auto'}}>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:22}}>
        <Btn variant="ghost" onClick={onClose}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back
        </Btn>
        <div style={{height:16,width:1,background:'var(--border)'}}/>
        <h2 style={{fontWeight:700,fontSize:16,color:'var(--text)'}}>{editItem ? 'Edit Expense' : 'Record Expense'}</h2>
      </div>

      <Card style={{padding:20,marginBottom:14}}>
        <SectionTitle>Expense Details</SectionTitle>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
          <F label="Date *" value={date} onChange={setDate} type="date" readOnly={readOnly}/>
          <Sel label="Category *" value={category} onChange={setCategory} options={CATEGORIES}/>
          <F label="Vendor / Payee" value={vendor} onChange={setVendor} placeholder="Vendor name" readOnly={readOnly}/>
          <F label="Description" value={description} onChange={setDescription} placeholder="What was this for?" readOnly={readOnly}/>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14}}>
          <F label="Amount (₹) *" value={amount} onChange={setAmount} type="number" placeholder="0.00" readOnly={readOnly}/>
          <F label="GST %" value={tax} onChange={setTax} type="number" placeholder="0" readOnly={readOnly}/>
          <div>
            <label style={labelStyle}>Total (incl. tax)</label>
            <div style={{...inputStyle, background:'var(--bg-3)', fontFamily:'var(--mono)', fontWeight:700, color:'var(--accent-2)', cursor:'default'}}>
              ₹{total.toLocaleString('en-IN',{minimumFractionDigits:2})}
            </div>
          </div>
        </div>
      </Card>

      <Card style={{padding:20,marginBottom:20}}>
        <SectionTitle>Payment Info</SectionTitle>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
          <Sel label="Payment Mode" value={paymentMode} onChange={setPaymentMode} options={METHODS}/>
          <F label="Reference / Cheque No." value={reference} onChange={setReference} placeholder="Optional" readOnly={readOnly}/>
        </div>
        <div>
          <label style={labelStyle}>Notes</label>
          <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2} placeholder="Internal notes"
            style={{...inputStyle,resize:'vertical'}}
            onFocus={e=>e.target.style.borderColor='var(--accent)'}
            onBlur={e=>e.target.style.borderColor='var(--border-2)'}/>
        </div>
      </Card>

      {!readOnly && (
        <div style={{display:'flex',justifyContent:'flex-end',gap:10,paddingTop:16,borderTop:'1px solid var(--border)'}}>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : '✓ Record Expense'}</Btn>
        </div>
      )}
    </div>
  )
}

// ── Main Expenses Page ──
export default function ExpensePage({ org, headers, toast, readOnly=false }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [view,    setView]    = useState('list')
  const [editItem, setEditItem] = useState(null)

  const load = () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (search)    p.set('search', search)
    if (catFilter) p.set('category', catFilter)
    fetch(`/api/expenses?${p}`, { headers })
      .then(r=>r.json())
      .then(d=>{ setData(d); setLoading(false) })
      .catch(()=>setLoading(false))
  }

  useEffect(()=>{ load() }, [org.id, search, catFilter])

  const del = async (exp) => {
    if (!confirm(`Delete ${exp.expenseNumber}?`)) return
    const r = await fetch(`/api/expenses/${exp._id}`, { method:'DELETE', headers })
    if (r.ok) { toast('Deleted'); load() }
  }

  if (view === 'form') {
    return <ExpenseForm editItem={editItem} headers={headers} toast={toast} readOnly={readOnly}
      onClose={()=>{ setView('list'); setEditItem(null); load() }} />
  }

  const expenses     = data?.expenses || []
  const byCategory   = data?.byCategory || []
  const totalAmount  = data?.totalAmount || 0

  // Current month total
  const now = new Date()
  const thisMonthTotal = expenses
    .filter(e => { const d=new Date(e.date); return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear() })
    .reduce((s,e)=>s+e.total,0)

  return (
    <div>
      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
        <div>
          <h2 style={{fontSize:18,fontWeight:700,color:'var(--text)',letterSpacing:'-0.3px'}}>Expenses</h2>
          <p style={{fontSize:13,color:'var(--text-3)',marginTop:4}}>Track business expenses · auto-posted to ledger</p>
        </div>
        {!readOnly && <Btn variant="primary" onClick={()=>{ setEditItem(null); setView('form') }}>+ Record Expense</Btn>}
      </div>

      {/* Stat cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
        {[
          { label:'Total Expenses',    value:fmt(totalAmount),    color:'var(--red-text)' },
          { label:'This Month',        value:fmt(thisMonthTotal), color:'var(--amber-text)' },
          { label:'Total Records',     value:data?.total||0,      color:'var(--text-2)' },
          { label:'Categories Used',   value:byCategory.length,   color:'var(--accent-2)' },
        ].map(s=>(
          <div key={s.label} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--r-lg)',padding:'14px 16px'}}>
            <div style={{fontSize:11,color:'var(--text-3)',fontWeight:500,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:6}}>{s.label}</div>
            <div style={{fontFamily:'var(--mono)',fontSize:20,fontWeight:700,color:s.color}}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      {byCategory.length > 0 && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:20}}>
          <Card style={{padding:'16px 18px'}}>
            <SectionTitle>By Category</SectionTitle>
            <div style={{marginTop:12}}>
              <CategoryDonut byCategory={byCategory}/>
            </div>
          </Card>
          <Card style={{padding:'16px 18px'}}>
            <SectionTitle>Top categories</SectionTitle>
            <div style={{marginTop:12}}>
              {byCategory.slice(0,5).map((c,i)=>{
                const maxTotal = byCategory[0]?.total||1
                return (
                  <div key={c._id} style={{marginBottom:10}}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}>
                      <div style={{display:'flex',alignItems:'center',gap:7}}>
                        <div style={{width:8,height:8,borderRadius:'50%',background:CAT_COLORS[c._id]||'#94A3B8'}}/>
                        <span style={{color:'var(--text-2)'}}>{c._id}</span>
                      </div>
                      <span style={{fontFamily:'var(--mono)',color:'var(--text-3)',fontSize:11}}>{fmt(c.total)}</span>
                    </div>
                    <div style={{height:4,background:'var(--surface-3)',borderRadius:99}}>
                      <div style={{height:'100%',width:`${Math.round(c.total/maxTotal*100)}%`,background:CAT_COLORS[c._id]||'#94A3B8',borderRadius:99,opacity:0.8}}/>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      )}

      {/* Table */}

      {/* How it works */}
      <div style={{ padding:'12px 16px', background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:'var(--r-md)', marginBottom:18, fontSize:12, color:'var(--text-2)', lineHeight:1.7 }}>
        <b style={{ color:'var(--amber-text)', fontSize:13 }}>💸 How expense tracking works</b><br/>
        Record every business expense with a category, amount and payment mode.
        Each expense automatically posts a journal entry to keep your books balanced.
        View monthly breakdowns by category on the Dashboard and include expenses in your Profit & Loss report.
      </div>

      <Card>
        <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search vendor, description…"/>
          <select value={catFilter} onChange={e=>setCatFilter(e.target.value)}
            style={{padding:'7px 11px',background:'var(--surface)',border:'1px solid var(--border-2)',borderRadius:'var(--r)',fontSize:13,color:'var(--text)',cursor:'pointer',outline:'none',fontFamily:'var(--font)'}}>
            <option value="">All categories</option>
            {CATEGORIES.map(c=><option key={c} value={c} style={{background:'var(--bg-2)'}}>{c}</option>)}
          </select>
          <Btn size="sm" onClick={load}>↻</Btn>
        </div>

        {loading ? (
          <div style={{padding:48,textAlign:'center',color:'var(--text-3)'}}>Loading…</div>
        ) : expenses.length === 0 ? (
          <EmptyState message="No expenses recorded yet. Click + Record Expense to start." />
        ) : (
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
            <thead>
              <tr style={{borderBottom:'1px solid var(--border)'}}>
                {['Exp #','Date','Category','Vendor','Description','Mode','Amount','Tax','Total',''].map((h,i)=>(
                  <th key={h} style={{padding:'10px 14px',textAlign:i>5?'right':'left',fontSize:11,fontWeight:600,color:'var(--text-3)',textTransform:'uppercase',letterSpacing:'0.05em',background:'var(--bg-3)',whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {expenses.map(exp=>(
                <tr key={exp._id} onClick={()=>{ if(!readOnly){setEditItem(exp);setView('form')} }}
                  style={{borderBottom:'1px solid var(--border)',cursor:readOnly?'default':'pointer',transition:'background 0.1s'}}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--surface-2)'}
                  onMouseLeave={e=>e.currentTarget.style.background=''}>
                  <td style={{padding:'10px 14px',fontFamily:'var(--mono)',fontSize:11,fontWeight:600,color:'var(--accent-2)'}}>{exp.expenseNumber}</td>
                  <td style={{padding:'10px 14px',fontSize:12,color:'var(--text-2)'}}>{fmtDate(exp.date)}</td>
                  <td style={{padding:'10px 14px'}}>
                    <span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:99,background:`${CAT_COLORS[exp.category]||'#94A3B8'}18`,color:CAT_COLORS[exp.category]||'var(--text-3)'}}>
                      {exp.category}
                    </span>
                  </td>
                  <td style={{padding:'10px 14px',color:'var(--text-2)'}}>{exp.vendor||'—'}</td>
                  <td style={{padding:'10px 14px',color:'var(--text-3)',fontSize:12,maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{exp.description||'—'}</td>
                  <td style={{padding:'10px 14px',fontSize:11,color:'var(--text-3)'}}>{exp.paymentMode}</td>
                  <td style={{padding:'10px 14px',textAlign:'right',fontFamily:'var(--mono)',color:'var(--text-2)'}}>{fmt(exp.amount)}</td>
                  <td style={{padding:'10px 14px',textAlign:'right',fontFamily:'var(--mono)',fontSize:11,color:'var(--text-3)'}}>{exp.tax||0}%</td>
                  <td style={{padding:'10px 14px',textAlign:'right',fontFamily:'var(--mono)',fontWeight:700,color:'var(--red-text)'}}>{fmt(exp.total)}</td>
                  <td style={{padding:'10px 14px'}} onClick={e=>e.stopPropagation()}>
                    {!readOnly && (
                      <div style={{display:'flex',gap:5,justifyContent:'flex-end'}}>
                        <Btn size="sm" onClick={e=>{e.stopPropagation();setEditItem(exp);setView('form')}}>Edit</Btn>
                        <Btn size="sm" variant="danger" onClick={e=>{e.stopPropagation();del(exp)}}>✕</Btn>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div style={{padding:'10px 16px',borderTop:'1px solid var(--border)',fontSize:12,color:'var(--text-3)',display:'flex',justifyContent:'space-between'}}>
          <span>{expenses.length} expense{expenses.length!==1?'s':''}</span>
          <span style={{fontFamily:'var(--mono)',color:'var(--red-text)',fontWeight:600}}>{fmt(expenses.reduce((s,e)=>s+e.total,0))}</span>
        </div>
      </Card>
    </div>
  )
}