import { useState, useEffect, useRef } from 'react'
import { Btn, Card, SectionTitle, fmt2, today } from './ui'

const newLine = () => ({ description: '', qty: 1, rate: 0, tax: 18, amount: 0 })

const inputCls = {
  width: '100%', padding: '8px 11px',
  background: 'var(--surface-2)', border: '1px solid var(--border-2)',
  borderRadius: 'var(--r)', fontSize: 13, color: 'var(--text)',
  outline: 'none', fontFamily: 'var(--font)', transition: 'border-color 0.15s',
}
const labelCls = { display: 'block', fontSize: 12, color: 'var(--text-3)', fontWeight: 500, marginBottom: 5, letterSpacing: '0.02em' }

function F({ label, value, onChange, type = 'text', placeholder, required, span, mono, uppercase }) {
  return (
    <div style={span ? { gridColumn: `span ${span}` } : {}}>
      {label && <label style={labelCls}>{label}{required && <span style={{ color: 'var(--red)', marginLeft: 2 }}>*</span>}</label>}
      <input type={type} value={value || ''} onChange={e => onChange(uppercase ? e.target.value.toUpperCase() : e.target.value)}
        placeholder={placeholder} required={required}
        style={{ ...inputCls, fontFamily: mono ? 'var(--mono)' : 'var(--font)', textTransform: uppercase ? 'uppercase' : 'none' }}
        onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)' }}
        onBlur={e => { e.target.style.borderColor = 'var(--border-2)'; e.target.style.boxShadow = 'none' }} />
    </div>
  )
}

function Sel({ label, value, onChange, options, span }) {
  return (
    <div style={span ? { gridColumn: `span ${span}` } : {}}>
      {label && <label style={labelCls}>{label}</label>}
      <select value={value || ''} onChange={e => onChange(e.target.value)}
        style={{ ...inputCls, cursor: 'pointer' }}
        onFocus={e => e.target.style.borderColor = 'var(--accent)'}
        onBlur={e => e.target.style.borderColor = 'var(--border-2)'}>
        {options.map(o => <option key={o} value={o} style={{ background: 'var(--bg-2)' }}>{o}</option>)}
      </select>
    </div>
  )
}

function CustomerSelect({ value, onChange, headers }) {
  const [customers, setCustomers] = useState([])
  const [search, setSearch]       = useState('')
  const [open, setOpen]           = useState(false)
  const [saving, setSaving]       = useState(false)
  const ref = useRef()

  useEffect(() => {
    fetch(`/api/customers?search=${encodeURIComponent(search)}`, { headers })
      .then(r => r.json()).then(d => setCustomers(Array.isArray(d) ? d : [])).catch(() => {})
  }, [search, headers['x-org-id']])

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const select = c => { onChange({ name: c.name, email: c.email, address: c.address, gstin: c.gstin }); setSearch(''); setOpen(false) }
  const saveNew = async () => {
    if (!value?.name) return
    setSaving(true)
    await fetch('/api/customers', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(value) })
    setSaving(false); setOpen(false)
    fetch('/api/customers', { headers }).then(r => r.json()).then(d => setCustomers(Array.isArray(d) ? d : []))
  }

  return (
    <div ref={ref} style={{ position: 'relative', gridColumn: 'span 2' }}>
      <label style={labelCls}>Customer Name <span style={{ color: 'var(--red)', marginLeft: 2 }}>*</span></label>
      <div style={{ display: 'flex', gap: 8 }}>
        <input type="text" value={value?.name || ''} autoComplete="off"
          onChange={e => { onChange({ ...(value || {}), name: e.target.value }); setOpen(true) }}
          placeholder="Type to search or create new…"
          style={{ ...inputCls, flex: 1 }}
          onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; setOpen(true) }}
          onBlur={e => { e.target.style.borderColor = 'var(--border-2)'; e.target.style.boxShadow = 'none' }} />
        {value?.name && <Btn size="sm" onClick={saveNew} disabled={saving} style={{ flexShrink: 0 }}>{saving ? '…' : '💾 Save'}</Btn>}
      </div>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--surface-2)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-md)', zIndex: 200, boxShadow: 'var(--shadow-lg)', maxHeight: 240, overflowY: 'auto' }}>
          <div style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search saved customers…"
              style={{ ...inputCls, fontSize: 12, padding: '6px 9px' }} autoFocus />
          </div>
          {customers.length === 0
            ? <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-3)' }}>No saved customers. Fill details and click 💾 Save.</div>
            : customers.map(c => (
              <div key={c._id} onClick={() => select(c)}
                style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{c.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{c.email}{c.gstin ? ` · GST: ${c.gstin}` : ''}</div>
              </div>
            ))
          }
        </div>
      )}
    </div>
  )
}

// Template definitions
const TEMPLATES = [
  { id: 'classic',      name: 'Classic',      desc: 'Clean blue header, professional layout', color: '#185FA5' },
  { id: 'minimal',      name: 'Minimal',      desc: 'Black & white, ultra clean',             color: '#1a1a1a' },
  { id: 'modern',       name: 'Modern',       desc: 'Teal accent, contemporary feel',         color: '#0F6E56' },
  { id: 'bold',         name: 'Bold',         desc: 'Dark header, high contrast',             color: '#1E2140' },
  { id: 'professional', name: 'Professional', desc: 'Purple accent, premium look',            color: '#6366F1' },
]

function MiniInvoice({ color }) {
  return (
    <svg width="80" height="104" viewBox="0 0 80 104" xmlns="http://www.w3.org/2000/svg">
      <rect width="80" height="104" fill="#ffffff" rx="3"/>
      <rect width="80" height="26" fill={color} rx="3"/>
      <rect x="0" y="20" width="80" height="6" fill={color}/>
      <rect x="6" y="6" width="18" height="8" fill="rgba(255,255,255,0.3)" rx="1"/>
      <rect x="50" y="8" width="24" height="3.5" fill="rgba(255,255,255,0.9)" rx="1"/>
      <rect x="54" y="13" width="18" height="2" fill="rgba(255,255,255,0.5)" rx="1"/>
      <rect x="6" y="31" width="16" height="2" fill="#bbb" rx="1"/>
      <rect x="6" y="35" width="28" height="2.5" fill="#333" rx="1"/>
      <rect x="6" y="39" width="20" height="2" fill="#aaa" rx="1"/>
      <rect x="6" y="47" width="68" height="7" fill={color + "22"} rx="1"/>
      <rect x="8" y="50" width="14" height="1.5" fill={color} rx="1"/>
      <rect x="58" y="50" width="12" height="1.5" fill={color} rx="1"/>
      {[0,1,2].map(i => (
        <g key={i}>
          <rect x="6" y={57+i*9} width="68" height="8" fill={i%2===0?"#f9f9f9":"#fff"}/>
          <rect x="8" y={60+i*9} width="22" height="2" fill="#555" rx="1"/>
          <rect x="58" y={60+i*9} width="10" height="2" fill="#333" rx="1"/>
        </g>
      ))}
      <rect x="38" y="84" width="36" height="9" fill={color + "22"} rx="1"/>
      <rect x="40" y="87" width="12" height="2" fill={color} rx="1"/>
      <rect x="58" y="87" width="12" height="2.5" fill={color} rx="1"/>
      <rect x="6" y="98" width="68" height="1" fill="#eee"/>
      <rect x="14" y="101" width="52" height="1.5" fill="#ddd" rx="1"/>
    </svg>
  )
}

function TemplatePicker({ value, onChange }) {
  const [hovered, setHovered] = useState(null)
  return (
    <div>
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:10 }}>
        {TEMPLATES.map(t => {
          const isSelected = value === t.id
          const isHovered  = hovered === t.id
          return (
            <button key={t.id} type="button"
              onClick={() => onChange(t.id)}
              onMouseEnter={() => setHovered(t.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                display:'flex', flexDirection:'column', alignItems:'center', gap:6,
                padding:'8px 8px 6px',
                border: `2px solid ${isSelected ? t.color : isHovered ? t.color+'60' : 'var(--border-2)'}`,
                borderRadius:'var(--r-md)',
                background: isSelected ? t.color+'12' : 'var(--surface-2)',
                cursor:'pointer', transition:'all 0.15s', fontFamily:'var(--font)',
                boxShadow: isSelected ? `0 0 0 3px ${t.color}25` : 'none',
              }}>
              <div style={{ borderRadius:3, overflow:'hidden', border:`1px solid ${isSelected ? t.color+'50' : 'var(--border)'}`, boxShadow:'0 1px 4px rgba(0,0,0,0.1)' }}>
                <MiniInvoice color={t.color}/>
              </div>
              <span style={{ fontSize:11, fontWeight: isSelected ? 700 : 500, color: isSelected ? t.color : 'var(--text-2)', whiteSpace:'nowrap' }}>
                {isSelected ? '✓ ' : ''}{t.name}
              </span>
            </button>
          )
        })}
      </div>
      <div style={{ fontSize:12, color:'var(--text-3)', padding:'6px 10px', background:'var(--surface-2)', borderRadius:'var(--r)', border:'1px solid var(--border)' }}>
        <span style={{ fontWeight:600, color: TEMPLATES.find(t=>t.id===value)?.color }}>
          {TEMPLATES.find(t=>t.id===value)?.name}
        </span>
        {' — '}{TEMPLATES.find(t=>t.id===value)?.desc}
      </div>
    </div>
  )
}


export default function InvoiceForm({ org, headers, toast, editItem, onClose }) {
  const [custName,    setCustName]    = useState('')
  const [custEmail,   setCustEmail]   = useState('')
  const [custAddress, setCustAddress] = useState('')
  const [custGstin,   setCustGstin]   = useState('')
  const [invNumber,   setInvNumber]   = useState('')
  const [issueDate,   setIssueDate]   = useState(today())
  const [dueDate,     setDueDate]     = useState('')
  const [status,      setStatus]      = useState('Due')
  const [currency,    setCurrency]    = useState('INR')
  const [notes,       setNotes]       = useState('')
  const [terms,       setTerms]       = useState('')
  const [lineItems,   setLineItems]   = useState([newLine()])
  const [products,    setProducts]    = useState([])
  const [productDropdown, setProductDropdown] = useState(null) // index of open dropdown
  const [template,    setTemplate]    = useState('classic')
  const [saving,      setSaving]      = useState(false)
  useEffect(() => {
    if (editItem) {
      setCustName(editItem.customer?.name || '')
      setCustEmail(editItem.customer?.email || '')
      setCustAddress(editItem.customer?.address || '')
      setCustGstin((editItem.customer?.gstin || '').toUpperCase())
      setInvNumber(editItem.invoiceNumber || '')
      setIssueDate(editItem.issueDate ? editItem.issueDate.split('T')[0] : today())
      setDueDate(editItem.dueDate ? editItem.dueDate.split('T')[0] : '')
      setStatus(editItem.status === 'Draft' ? 'Due' : editItem.status || 'Due')
      setCurrency(editItem.currency || 'INR')
      setNotes(editItem.notes || '')
      setTerms(editItem.terms || '')
      setLineItems(editItem.lineItems?.length ? editItem.lineItems : [newLine()])
      setTemplate(editItem.template || 'classic')
      return
    }
    Promise.all([
      fetch('/api/config', { headers }).then(r => r.json()),
      fetch('/api/invoices?limit=1', { headers }).then(r => r.json()),
    ]).then(([cfg, invData]) => {
      if (cfg.defaultNotes)    setNotes(cfg.defaultNotes)
      if (cfg.defaultTerms)    setTerms(cfg.defaultTerms)
      if (cfg.defaultCurrency) setCurrency(cfg.defaultCurrency)
      const prefix = cfg.invoicePrefix || 'INV'
      const count  = (invData.total || 0) + 1
      setInvNumber(`${prefix}-${String(count).padStart(4, '0')}`)
      const due = new Date(); due.setDate(due.getDate() + 30)
      setDueDate(due.toISOString().split('T')[0])
      if (cfg.defaultTax) setLineItems([{ ...newLine(), tax: cfg.defaultTax }])
    }).catch(() => {})
  }, [editItem?._id])

  const setCustomer = c => { setCustName(c.name || ''); setCustEmail(c.email || ''); setCustAddress(c.address || ''); setCustGstin((c.gstin || '').toUpperCase()) }
  const setLine = (i, k, v) => {
    setLineItems(prev => { const ls = [...prev]; ls[i] = { ...ls[i], [k]: v }; ls[i].amount = (parseFloat(ls[i].qty)||0)*(parseFloat(ls[i].rate)||0); return ls })
  }

  useEffect(() => {
    fetch('/api/products', { headers })
      .then(r=>r.json()).then(d=>setProducts(Array.isArray(d)?d:[]))
      .catch(()=>{})
  }, [])

  const subtotal = lineItems.reduce((s,l) => s+(parseFloat(l.qty)||0)*(parseFloat(l.rate)||0), 0)
  const taxTotal  = lineItems.reduce((s,l) => s+(parseFloat(l.qty)||0)*(parseFloat(l.rate)||0)*(parseFloat(l.tax)||0)/100, 0)
  const grand = subtotal + taxTotal

  const save = async (statusOverride) => {
    if (!custName.trim()) { toast('Customer name is required', 'error'); return }
    setSaving(statusOverride || 'saving')
    try {
      await fetch('/api/customers', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: custName, email: custEmail, address: custAddress, gstin: custGstin }) })
      const payload = {
        customer: { name: custName, email: custEmail, address: custAddress, gstin: custGstin },
        invoiceNumber: invNumber, issueDate, dueDate,
        status: statusOverride || status, currency, notes, terms, lineItems, template,
      }
      const isEdit = !!editItem?._id
      const res = await fetch(isEdit ? `/api/invoices/${editItem._id}` : '/api/invoices', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const e = await res.json()
        if (e.limitReached) {
          toast(`${e.error} ${e.upgrade}`, 'error')
        } else {
          throw new Error(e.error)
        }
        setSaving(false)
        return
      }
      toast(isEdit ? 'Invoice updated!' : statusOverride === 'Sent' ? 'Invoice saved & sent!' : 'Invoice saved!')
      onClose()
    } catch (e) { toast(e.message || 'Save failed', 'error') }
    setSaving(false)
  }



  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
        <Btn variant="ghost" onClick={onClose}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back
        </Btn>
        <div style={{ height: 16, width: 1, background: 'var(--border)' }} />
        <h2 style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{editItem ? `Edit ${editItem.invoiceNumber}` : 'New Invoice'}</h2>
      </div>

      {/* Template Picker */}
      <Card style={{ padding: '14px 18px', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <SectionTitle style={{ marginBottom: 6 }}>PDF Template</SectionTitle>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Choose how your invoice PDF looks</div>
          </div>
          <TemplatePicker value={template} onChange={setTemplate} />
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <Card style={{ padding: 18 }}>
          <SectionTitle>Bill To</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <CustomerSelect value={{ name: custName, email: custEmail, address: custAddress, gstin: custGstin }} onChange={setCustomer} headers={headers} />
            <F label="Email" value={custEmail} onChange={setCustEmail} type="email" placeholder="customer@company.com" span={2} />
            <F label="Address" value={custAddress} onChange={setCustAddress} placeholder="City, State" span={2} />
            <F label="GSTIN" value={custGstin} onChange={v => setCustGstin(v.toUpperCase())} placeholder="22AAAAA0000A1Z5" mono uppercase span={2} />
          </div>
        </Card>
        <Card style={{ padding: 18 }}>
          <SectionTitle>Invoice Details</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <F label="Invoice Number" value={invNumber} onChange={setInvNumber} placeholder="INV-0001" span={2} />
            <Sel label="Status" value={status === 'Draft' ? 'Due' : status} onChange={v => setStatus(v === 'Due' ? 'Draft' : v)}
              options={['Due','Sent','Paid','Overdue','Cancelled']} />
            <Sel label="Currency" value={currency} onChange={setCurrency} options={['INR','USD','EUR','GBP','AED','SGD']} />
            <F label="Issue Date *" value={issueDate} onChange={setIssueDate} type="date" />
            <F label="Due Date" value={dueDate} onChange={setDueDate} type="date" />
          </div>
        </Card>
      </div>

      {/* Line Items */}
      <Card style={{ marginBottom: 14, overflow: 'hidden' }}>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)' }}><SectionTitle>Line Items</SectionTitle></div>
        <div style={{ padding: '12px 18px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 110px 70px 110px 28px', gap: 8, marginBottom: 6 }}>
            {['Description','Qty','Rate (₹)','Tax %','Amount',''].map(h => (
              <div key={h} style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: h==='Amount'||h==='Rate (₹)'?'right':'left' }}>{h}</div>
            ))}
          </div>
          {lineItems.map((line, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 110px 70px 110px 28px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <div style={{ position:'relative' }}>
                <input value={line.description} onChange={e => { setLine(i,'description',e.target.value); setProductDropdown(i) }}
                  onFocus={e=>{e.target.style.borderColor='var(--accent)';setProductDropdown(i)}}
                  onBlur={()=>setTimeout(()=>setProductDropdown(null),200)}
                  placeholder="Item or type to search catalogue…"
                  style={inputCls} />
                {productDropdown===i && products.filter(p=>!line.description||p.name.toLowerCase().includes(line.description.toLowerCase())).length>0 && (
                  <div style={{ position:'absolute', top:'calc(100% + 3px)', left:0, right:0, background:'var(--surface)', border:'1px solid var(--border-2)', borderRadius:'var(--r-md)', zIndex:999, boxShadow:'var(--shadow-lg)', maxHeight:200, overflowY:'auto' }}>
                    {products.filter(p=>!line.description||p.name.toLowerCase().includes(line.description.toLowerCase())).slice(0,8).map(p=>(
                      <button key={p._id} onMouseDown={()=>{
                        setLineItems(prev=>prev.map((l,idx)=>idx===i?{...l,description:p.name,rate:p.price,tax:p.taxRate||18,hsnCode:p.hsnCode||'',unit:p.unit||'pcs'}:l))
                        setProductDropdown(null)
                      }} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%', padding:'8px 12px', background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font)', textAlign:'left', borderBottom:'1px solid var(--border)', transition:'background 0.1s' }}
                        onMouseEnter={e=>e.currentTarget.style.background='var(--surface-2)'}
                        onMouseLeave={e=>e.currentTarget.style.background='none'}>
                        <div>
                          <div style={{ fontSize:13, fontWeight:500, color:'var(--text)' }}>{p.name}</div>
                          {p.hsnCode && <div style={{ fontSize:10, color:'var(--text-3)', fontFamily:'var(--mono)' }}>HSN: {p.hsnCode}</div>}
                        </div>
                        <div style={{ textAlign:'right', flexShrink:0, marginLeft:8 }}>
                          <div style={{ fontSize:12, fontFamily:'var(--mono)', fontWeight:600, color:'var(--accent-2)' }}>₹{p.price}</div>
                          <div style={{ fontSize:10, color:'var(--text-3)' }}>{p.taxRate||18}% GST</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input type="number" value={line.qty} onChange={e=>setLine(i,'qty',e.target.value)} min="0"
                style={inputCls} onFocus={e=>e.target.style.borderColor='var(--accent)'} onBlur={e=>e.target.style.borderColor='var(--border-2)'} />
              <input type="number" value={line.rate} onChange={e=>setLine(i,'rate',e.target.value)} min="0"
                style={{ ...inputCls, textAlign:'right' }} onFocus={e=>e.target.style.borderColor='var(--accent)'} onBlur={e=>e.target.style.borderColor='var(--border-2)'} />
              <input type="number" value={line.tax} onChange={e=>setLine(i,'tax',e.target.value)} min="0" max="100"
                style={inputCls} onFocus={e=>e.target.style.borderColor='var(--accent)'} onBlur={e=>e.target.style.borderColor='var(--border-2)'} />
              <div style={{ ...inputCls, textAlign:'right', fontFamily:'var(--mono)', color:'var(--text-2)', cursor:'default' }}>
                {fmt2((parseFloat(line.qty)||0)*(parseFloat(line.rate)||0)*(1+(parseFloat(line.tax)||0)/100))}
              </div>
              <button onClick={()=>setLineItems(prev=>prev.filter((_,idx)=>idx!==i))}
                style={{ width:28,height:28,background:'var(--red-dim)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:'var(--r-sm)',cursor:'pointer',color:'var(--red-text)',fontSize:15,display:'flex',alignItems:'center',justifyContent:'center' }}>×</button>
            </div>
          ))}
          <button onClick={()=>setLineItems(prev=>[...prev,newLine()])}
            style={{ width:'100%',marginTop:4,padding:'7px',background:'transparent',border:'1px dashed var(--border-2)',borderRadius:'var(--r)',fontSize:12,color:'var(--text-3)',cursor:'pointer',transition:'all 0.15s',fontFamily:'var(--font)' }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--accent)';e.currentTarget.style.color='var(--accent-2)'}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border-2)';e.currentTarget.style.color='var(--text-3)'}}>
            + Add Line Item
          </button>
        </div>
        <div style={{ padding:'14px 18px',borderTop:'1px solid var(--border)',background:'var(--bg-3)',display:'flex',justifyContent:'flex-end' }}>
          <div style={{ width:280 }}>
            {[['Subtotal',fmt2(subtotal)],['Tax (GST)',fmt2(taxTotal)]].map(([l,v])=>(
              <div key={l} style={{ display:'flex',justifyContent:'space-between',padding:'4px 0',fontSize:13,color:'var(--text-3)',borderBottom:'1px solid var(--border)' }}>
                <span>{l}</span><span style={{ fontFamily:'var(--mono)' }}>{v}</span>
              </div>
            ))}
            <div style={{ display:'flex',justifyContent:'space-between',padding:'10px 0 0',fontSize:17,fontWeight:700,color:'var(--accent-2)' }}>
              <span>Total</span><span style={{ fontFamily:'var(--mono)' }}>{fmt2(grand)}</span>
            </div>
          </div>
        </div>
      </Card>

      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:20 }}>
        <Card style={{ padding:16 }}>
          <SectionTitle>Notes</SectionTitle>
          <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3} placeholder="Thank you for your business!"
            style={{ ...inputCls,resize:'vertical' }} onFocus={e=>e.target.style.borderColor='var(--accent)'} onBlur={e=>e.target.style.borderColor='var(--border-2)'} />
        </Card>
        <Card style={{ padding:16 }}>
          <SectionTitle>Terms &amp; Conditions</SectionTitle>
          <textarea value={terms} onChange={e=>setTerms(e.target.value)} rows={3}
            style={{ ...inputCls,resize:'vertical' }} onFocus={e=>e.target.style.borderColor='var(--accent)'} onBlur={e=>e.target.style.borderColor='var(--border-2)'} />
        </Card>
      </div>

      {/* Separate Save + Send buttons */}
      <div style={{ display:'flex',gap:10,justifyContent:'flex-end',padding:'16px 0',borderTop:'1px solid var(--border)',alignItems:'center' }}>
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn onClick={()=>save('Draft')} disabled={!!saving}>
          {saving==='Draft' ? 'Saving…' : 'Save as Draft'}
        </Btn>
        <Btn variant="outline" onClick={()=>save(status==='Draft'?'Due':status)} disabled={!!saving}>
          {saving==='save' ? 'Saving…' : '💾 Save'}
        </Btn>
        <Btn variant="primary" onClick={()=>save('Sent')} disabled={!!saving}>
          {saving==='Sent' ? 'Sending…' : '📤 Send Invoice'}
        </Btn>
      </div>
    </div>
  )
}