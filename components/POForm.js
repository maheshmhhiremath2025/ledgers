import { useState, useEffect, useRef } from 'react'
import { Btn, Card, SectionTitle, fmt2, today } from './ui'

const newLine = () => ({ description: '', qty: 1, rate: 0, tax: 18, amount: 0 })

const inputCls = {
  width: '100%', padding: '8px 11px',
  background: 'var(--surface-2)', border: '1px solid var(--border-2)',
  borderRadius: 'var(--r)', fontSize: 13, color: 'var(--text)',
  outline: 'none', fontFamily: 'var(--font)', transition: 'border-color 0.15s',
}
const labelCls = {
  display: 'block', fontSize: 12, color: 'var(--text-3)',
  fontWeight: 500, marginBottom: 5, letterSpacing: '0.02em',
}

function F({ label, value, onChange, type = 'text', placeholder, span }) {
  return (
    <div style={span ? { gridColumn: `span ${span}` } : {}}>
      {label && <label style={labelCls}>{label}</label>}
      <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={inputCls}
        onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)' }}
        onBlur={e => { e.target.style.borderColor = 'var(--border-2)'; e.target.style.boxShadow = 'none' }} />
    </div>
  )
}

function Sel({ label, value, onChange, options }) {
  return (
    <div>
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

// Vendor / Customer dropdown with save
function PartySelect({ label, value, onChange, headers, storageKey = 'customers' }) {
  const [parties, setParties] = useState([])
  const [search, setSearch]   = useState('')
  const [open, setOpen]       = useState(false)
  const [saving, setSaving]   = useState(false)
  const ref = useRef()

  useEffect(() => {
    fetch(`/api/customers?search=${encodeURIComponent(search)}`, { headers })
      .then(r => r.json()).then(d => setParties(Array.isArray(d) ? d : [])).catch(() => {})
  }, [search, headers['x-org-id']])

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const select = c => {
    onChange({ name: c.name, email: c.email, address: c.address, gstin: c.gstin })
    setSearch(''); setOpen(false)
  }

  const saveParty = async () => {
    if (!value?.name) return
    setSaving(true)
    await fetch('/api/customers', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(value),
    })
    setSaving(false); setOpen(false)
    fetch('/api/customers', { headers }).then(r => r.json()).then(d => setParties(Array.isArray(d) ? d : []))
  }

  const filtered = parties.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.email||'').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div ref={ref} style={{ position: 'relative', gridColumn: 'span 2' }}>
      <label style={labelCls}>{label} <span style={{ color: 'var(--red)', marginLeft: 2 }}>*</span></label>
      <div style={{ display: 'flex', gap: 8 }}>
        <input type="text" value={value?.name || ''} autoComplete="off"
          onChange={e => { onChange({ ...(value||{}), name: e.target.value }); setOpen(true) }}
          placeholder="Type to search or add new…"
          style={{ ...inputCls, flex: 1 }}
          onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; setOpen(true) }}
          onBlur={e => { e.target.style.borderColor = 'var(--border-2)'; e.target.style.boxShadow = 'none' }} />
        {value?.name && (
          <Btn size="sm" onClick={saveParty} disabled={saving} style={{ flexShrink: 0 }}>
            {saving ? '…' : '💾 Save'}
          </Btn>
        )}
      </div>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--surface-2)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-md)', zIndex: 200, boxShadow: 'var(--shadow-lg)', maxHeight: 220, overflowY: 'auto' }}>
          <div style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search saved…"
              style={{ ...inputCls, fontSize: 12, padding: '6px 9px' }} autoFocus />
          </div>
          {filtered.length === 0
            ? <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-3)' }}>No saved vendors. Fill details and click 💾 Save.</div>
            : filtered.map(c => (
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

export default function POForm({ org, headers, toast, editItem, onClose }) {
  const [vendName,    setVendName]    = useState('')
  const [vendEmail,   setVendEmail]   = useState('')
  const [vendAddress, setVendAddress] = useState('')
  const [vendGstin,   setVendGstin]   = useState('')
  const [poNumber,    setPoNumber]    = useState('')
  const [issueDate,   setIssueDate]   = useState(today())
  const [expectedDate,setExpectedDate]= useState('')
  const [deliveryAddr,setDeliveryAddr]= useState('')
  const [status,      setStatus]      = useState('Draft')
  const [currency,    setCurrency]    = useState('INR')
  const [notes,       setNotes]       = useState('')
  const [terms,       setTerms]       = useState('')
  const [lineItems,   setLineItems]   = useState([newLine()])
  const [saving,      setSaving]      = useState(false)
  const [configLoaded,setConfigLoaded]= useState(false)
  const [products,    setProducts]    = useState([])
  const [productDropdown, setProductDropdown] = useState(null)

  useEffect(() => {
    if (editItem) {
      setVendName(editItem.vendor?.name || '')
      setVendEmail(editItem.vendor?.email || '')
      setVendAddress(editItem.vendor?.address || '')
      setVendGstin(editItem.vendor?.gstin || '')
      setPoNumber(editItem.poNumber || '')
      setIssueDate(editItem.issueDate ? editItem.issueDate.split('T')[0] : today())
      setExpectedDate(editItem.expectedDate ? editItem.expectedDate.split('T')[0] : '')
      setDeliveryAddr(editItem.deliveryAddress || '')
      setStatus(editItem.status || 'Draft')
      setCurrency(editItem.currency || 'INR')
      setNotes(editItem.notes || '')
      setTerms(editItem.terms || '')
      setLineItems(editItem.lineItems?.length ? editItem.lineItems : [newLine()])
      setConfigLoaded(true)
      return
    }

    Promise.all([
      fetch('/api/config', { headers }).then(r => r.json()),
      fetch('/api/purchase-orders?limit=1', { headers }).then(r => r.json()),
    ]).then(([cfg, poData]) => {
      if (cfg.defaultNotes)  setNotes(cfg.defaultNotes)
      if (cfg.defaultTerms)  setTerms(cfg.defaultTerms)
      if (cfg.defaultCurrency) setCurrency(cfg.defaultCurrency)
      const prefix = cfg.poPrefix || 'PO'
      const count  = (poData.total || 0) + 1
      setPoNumber(`${prefix}-${String(count).padStart(4, '0')}`)
      const exp = new Date()
      exp.setDate(exp.getDate() + 14)
      setExpectedDate(exp.toISOString().split('T')[0])
      if (cfg.defaultTax) setLineItems([{ ...newLine(), tax: cfg.defaultTax }])
      setConfigLoaded(true)
    }).catch(() => setConfigLoaded(true))
  }, [editItem?._id])

  const setVendor = v => {
    setVendName(v.name || ''); setVendEmail(v.email || '')
    setVendAddress(v.address || ''); setVendGstin(v.gstin || '')
  }

  const setLine = (i, k, v) => {
    setLineItems(prev => {
      const ls = [...prev]
      ls[i] = { ...ls[i], [k]: v }
      ls[i].amount = (parseFloat(ls[i].qty)||0) * (parseFloat(ls[i].rate)||0)
      return ls
    })
  }

  useEffect(() => {
    fetch('/api/products', { headers })
      .then(r => r.json()).then(d => setProducts(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [])

  const subtotal = lineItems.reduce((s,l) => s+(parseFloat(l.qty)||0)*(parseFloat(l.rate)||0), 0)
  const taxTotal  = lineItems.reduce((s,l) => s+(parseFloat(l.qty)||0)*(parseFloat(l.rate)||0)*(parseFloat(l.tax)||0)/100, 0)

  const save = async (statusOverride) => {
    if (!vendName.trim()) { toast('Vendor name is required', 'error'); return }
    setSaving(true)
    try {
      // Auto-save vendor
      await fetch('/api/customers', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: vendName, email: vendEmail, address: vendAddress, gstin: vendGstin }),
      })
      const payload = {
        vendor: { name: vendName, email: vendEmail, address: vendAddress, gstin: vendGstin },
        poNumber, issueDate, expectedDate, deliveryAddress: deliveryAddr,
        status: statusOverride || status, currency, notes, terms, lineItems,
      }
      const isEdit = !!editItem?._id
      const url = isEdit ? `/api/purchase-orders/${editItem._id}` : '/api/purchase-orders'
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
      toast(isEdit ? 'PO updated!' : 'Purchase order created!')
      onClose()
    } catch (e) { toast(e.message || 'Save failed', 'error') }
    setSaving(false)
  }

  if (!configLoaded) return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 80, marginBottom: 14, borderRadius: 'var(--r-lg)' }} />)}
    </div>
  )

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
        <Btn variant="ghost" onClick={onClose}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back
        </Btn>
        <div style={{ height: 16, width: 1, background: 'var(--border)' }} />
        <h2 style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>
          {editItem ? `Edit ${editItem.poNumber}` : 'New Purchase Order'}
        </h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <Card style={{ padding: 18 }}>
          <SectionTitle>Vendor Details</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <PartySelect label="Vendor Name" value={{ name: vendName, email: vendEmail, address: vendAddress, gstin: vendGstin }} onChange={setVendor} headers={headers} />
            <F label="Email" value={vendEmail} onChange={setVendEmail} type="email" placeholder="vendor@company.com" span={2} />
            <F label="Address" value={vendAddress} onChange={setVendAddress} placeholder="City, State" span={2} />
            <F label="GSTIN" value={vendGstin} onChange={setVendGstin} placeholder="22AAAAA0000A1Z5" span={2} />
          </div>
        </Card>

        <Card style={{ padding: 18 }}>
          <SectionTitle>Order Details</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <F label="PO Number" value={poNumber} onChange={setPoNumber} placeholder="PO-0001" span={2} />
            <Sel label="Status" value={status} onChange={setStatus} options={['Draft','Sent','Paid','Partial','Cancelled']} />
            <Sel label="Currency" value={currency} onChange={setCurrency} options={['INR','USD','EUR','GBP','AED','SGD']} />
            <F label="Issue Date *" value={issueDate} onChange={setIssueDate} type="date" />
            <F label="Expected Delivery" value={expectedDate} onChange={setExpectedDate} type="date" />
            <F label="Delivery Address" value={deliveryAddr} onChange={setDeliveryAddr} placeholder="Deliver to…" span={2} />
          </div>
        </Card>
      </div>

      {/* Line Items */}
      <Card style={{ marginBottom: 14, overflow: 'hidden' }}>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)' }}>
          <SectionTitle>Line Items</SectionTitle>
        </div>
        <div style={{ padding: '12px 18px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 110px 70px 110px 28px', gap: 8, marginBottom: 6 }}>
            {['Description','Qty','Rate (₹)','Tax %','Amount',''].map(h => (
              <div key={h} style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: h === 'Amount' || h === 'Rate (₹)' ? 'right' : 'left' }}>{h}</div>
            ))}
          </div>
          {lineItems.map((line, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 110px 70px 110px 28px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <div style={{ position:'relative' }}>
                <input value={line.description}
                  onChange={e => { setLine(i,'description',e.target.value); setProductDropdown(i) }}
                  onFocus={e => { e.target.style.borderColor='var(--accent)'; setProductDropdown(i) }}
                  onBlur={() => setTimeout(() => setProductDropdown(null), 200)}
                  placeholder="Item or type to search catalogue…"
                  style={inputCls} />
                {productDropdown===i && products.filter(p => !line.description || p.name.toLowerCase().includes(line.description.toLowerCase())).length > 0 && (
                  <div style={{ position:'absolute', top:'calc(100% + 3px)', left:0, right:0, background:'var(--surface)', border:'1px solid var(--border-2)', borderRadius:'var(--r-md)', zIndex:999, boxShadow:'var(--shadow-lg)', maxHeight:200, overflowY:'auto' }}>
                    {products.filter(p => !line.description || p.name.toLowerCase().includes(line.description.toLowerCase())).slice(0,8).map(p => (
                      <button key={p._id} onMouseDown={() => {
                        setLineItems(prev => prev.map((l,idx) => idx===i ? { ...l, description:p.name, rate:p.price, tax:p.taxRate||18 } : l))
                        setProductDropdown(null)
                      }} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%', padding:'8px 12px', background:'none', border:'none', cursor:'pointer', fontFamily:'var(--font)', textAlign:'left', borderBottom:'1px solid var(--border)', transition:'background 0.1s' }}
                        onMouseEnter={e => e.currentTarget.style.background='var(--surface-2)'}
                        onMouseLeave={e => e.currentTarget.style.background='none'}>
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
              <input type="number" value={line.qty} onChange={e => setLine(i,'qty',e.target.value)} min="0"
                style={inputCls} onFocus={e => e.target.style.borderColor = 'var(--accent)'} onBlur={e => e.target.style.borderColor = 'var(--border-2)'} />
              <input type="number" value={line.rate} onChange={e => setLine(i,'rate',e.target.value)} min="0"
                style={{ ...inputCls, textAlign: 'right' }} onFocus={e => e.target.style.borderColor = 'var(--accent)'} onBlur={e => e.target.style.borderColor = 'var(--border-2)'} />
              <input type="number" value={line.tax} onChange={e => setLine(i,'tax',e.target.value)} min="0" max="100"
                style={inputCls} onFocus={e => e.target.style.borderColor = 'var(--accent)'} onBlur={e => e.target.style.borderColor = 'var(--border-2)'} />
              <div style={{ ...inputCls, textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--text-2)', cursor: 'default' }}>
                {fmt2((parseFloat(line.qty)||0) * (parseFloat(line.rate)||0) * (1+(parseFloat(line.tax)||0)/100))}
              </div>
              <button onClick={() => setLineItems(prev => prev.filter((_,idx) => idx !== i))}
                style={{ width: 28, height: 28, background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--r-sm)', cursor: 'pointer', color: 'var(--red-text)', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
          ))}
          <button onClick={() => setLineItems(prev => [...prev, newLine()])}
            style={{ width: '100%', marginTop: 4, padding: '7px', background: 'transparent', border: '1px dashed var(--border-2)', borderRadius: 'var(--r)', fontSize: 12, color: 'var(--text-3)', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'var(--font)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent-2)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.color = 'var(--text-3)' }}>
            + Add Line Item
          </button>
        </div>
        <div style={{ padding: '14px 18px', borderTop: '1px solid var(--border)', background: 'var(--bg-3)', display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: 280 }}>
            {[['Subtotal', fmt2(subtotal)], ['Tax (GST)', fmt2(taxTotal)]].map(([l,v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, color: 'var(--text-3)', borderBottom: '1px solid var(--border)' }}>
                <span>{l}</span><span style={{ fontFamily: 'var(--mono)' }}>{v}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', fontSize: 17, fontWeight: 700, color: 'var(--teal-text)' }}>
              <span>Total</span><span style={{ fontFamily: 'var(--mono)' }}>{fmt2(subtotal + taxTotal)}</span>
            </div>
          </div>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
        <Card style={{ padding: 16 }}>
          <SectionTitle>Notes</SectionTitle>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Delivery instructions…"
            style={{ ...inputCls, resize: 'vertical' }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border-2)'} />
        </Card>
        <Card style={{ padding: 16 }}>
          <SectionTitle>Terms &amp; Conditions</SectionTitle>
          <textarea value={terms} onChange={e => setTerms(e.target.value)} rows={3}
            style={{ ...inputCls, resize: 'vertical' }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border-2)'} />
        </Card>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '14px 0', borderTop: '1px solid var(--border)' }}>
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn onClick={() => save('Draft')} disabled={saving}>Save as Draft</Btn>
        <Btn variant="primary" onClick={() => save('Sent')} disabled={saving}>Save &amp; Send</Btn>
      </div>
    </div>
  )
}