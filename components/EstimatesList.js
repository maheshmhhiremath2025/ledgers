import { useState, useEffect, useRef } from 'react'
import { Btn, Card, SectionTitle, fmt2, today } from './ui'
import TemplatePicker from './TemplatePicker'

const newLine = () => ({ description: '', qty: 1, rate: 0, hours: 1, tax: 18, amount: 0 })

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

  const select = c => { onChange({ name: c.name, email: c.email, phone: c.phone || '', address: c.address, gstin: c.gstin }); setSearch(''); setOpen(false) }
  const saveNew = async () => {
    if (!value?.name) return
    setSaving(true)
    await fetch('/api/customers', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(value) })
    setSaving(false); setOpen(false)
    fetch(`/api/customers?search=${encodeURIComponent(search)}`, { headers }).then(r => r.json()).then(d => setCustomers(Array.isArray(d) ? d : []))
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

// ─── Quotation Form (full-page, mirrors InvoiceForm) ───────────────────────────

function EstimateForm({ headers, toast, editItem, onClose, onSaved }) {
  const [custName,    setCustName]    = useState('')
  const [custEmail,   setCustEmail]   = useState('')
  const [custPhone,   setCustPhone]   = useState('')
  const [custAddress, setCustAddress] = useState('')
  const [custGstin,   setCustGstin]   = useState('')
  const [orgGstin,    setOrgGstin]    = useState('')
  const [estNumber,   setEstNumber]   = useState('')
  const [issueDate,   setIssueDate]   = useState(today())
  const [expiryDate,  setExpiryDate]  = useState('')
  const [status,      setStatus]      = useState('Draft')
  const [currency,    setCurrency]    = useState('INR')
  const [notes,       setNotes]       = useState('')
  const [terms,       setTerms]       = useState('')
  const [lineItems,   setLineItems]   = useState([newLine()])
  const [products,    setProducts]    = useState([])
  const [productDropdown, setProductDropdown] = useState(null)
  const [template,    setTemplate]    = useState('classic')
  const [saving,      setSaving]      = useState(false)

  useEffect(() => {
    if (editItem) {
      setCustName(editItem.customer?.name || '')
      setCustEmail(editItem.customer?.email || '')
      setCustPhone(editItem.customer?.phone || '')
      setCustAddress(editItem.customer?.address || '')
      setCustGstin((editItem.customer?.gstin || '').toUpperCase())
      setEstNumber(editItem.estimateNumber || '')
      setIssueDate(editItem.issueDate ? editItem.issueDate.split('T')[0] : today())
      setExpiryDate(editItem.expiryDate ? editItem.expiryDate.split('T')[0] : '')
      setStatus(editItem.status || 'Draft')
      setCurrency(editItem.currency || 'INR')
      setNotes(editItem.notes || '')
      setTerms(editItem.terms || '')
      setLineItems(editItem.lineItems?.length ? editItem.lineItems : [newLine()])
      setTemplate(editItem.template || 'classic')
      return
    }
    Promise.all([
      fetch('/api/config', { headers }).then(r => r.json()),
      fetch('/api/estimates?limit=1', { headers }).then(r => r.json()),
    ]).then(([cfg, estData]) => {
      if (cfg.defaultNotes)    setNotes(cfg.defaultNotes)
      if (cfg.defaultTerms)    setTerms(cfg.defaultTerms)
      if (cfg.defaultCurrency) setCurrency(cfg.defaultCurrency)
      if (cfg.gstin)           setOrgGstin(cfg.gstin)
      const prefix = cfg.estimatePrefix || 'QT'
      const count  = (estData.total || 0) + 1
      setEstNumber(`${prefix}-${String(count).padStart(4, '0')}`)
      const exp = new Date(); exp.setDate(exp.getDate() + 30)
      setExpiryDate(exp.toISOString().split('T')[0])
      if (cfg.defaultTax) setLineItems([{ ...newLine(), tax: cfg.defaultTax, hours: 1 }])
    }).catch(() => {})
  }, [editItem?._id])

  useEffect(() => {
    fetch('/api/products', { headers })
      .then(r => r.json()).then(d => setProducts(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [])

  const setCustomer = c => {
    setCustName(c.name || '')
    setCustEmail(c.email || '')
    setCustPhone(c.phone || '')
    setCustAddress(c.address || '')
    setCustGstin((c.gstin || '').toUpperCase())
  }

  const setLine = (i, k, v) => {
    setLineItems(prev => {
      const ls = [...prev]
      ls[i] = { ...ls[i], [k]: v }
      ls[i].amount = (parseFloat(ls[i].qty) || 0) * (parseFloat(ls[i].hours) || 1) * (parseFloat(ls[i].rate) || 0)
      return ls
    })
  }

  const subtotal = lineItems.reduce((s, l) => s + (parseFloat(l.qty) || 0) * (parseFloat(l.hours) || 1) * (parseFloat(l.rate) || 0), 0)
  const taxTotal  = lineItems.reduce((s, l) => s + (parseFloat(l.qty) || 0) * (parseFloat(l.hours) || 1) * (parseFloat(l.rate) || 0) * (parseFloat(l.tax) || 0) / 100, 0)
  const grand = subtotal + taxTotal

  const orgState  = (orgGstin  || '').slice(0, 2)
  const custState = (custGstin || '').slice(0, 2)
  const isInter   = orgState && custState && orgState !== custState
  const cgstAmt   = isInter ? 0 : taxTotal / 2
  const sgstAmt   = isInter ? 0 : taxTotal / 2
  const igstAmt   = isInter ? taxTotal : 0

  const save = async (statusOverride) => {
    if (!custName.trim()) { toast('Customer name is required', 'error'); return }
    setSaving(statusOverride || 'saving')
    try {
      await fetch('/api/customers', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: custName, email: custEmail, phone: custPhone, address: custAddress, gstin: custGstin }),
      })
      const payload = {
        customer: { name: custName, email: custEmail, phone: custPhone, address: custAddress, gstin: custGstin },
        estimateNumber: estNumber, issueDate, expiryDate: expiryDate || null,
        status: statusOverride || status, currency, notes, terms, lineItems, template,
      }
      const isEdit = !!editItem?._id
      const res = await fetch(isEdit ? `/api/estimates/${editItem._id}` : '/api/estimates', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const e = await res.json()
        throw new Error(e.error)
      }
      toast(isEdit ? 'Quotation updated!' : statusOverride === 'Sent' ? 'Quotation saved & marked Sent!' : 'Quotation saved!')
      onSaved()
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
        <h2 style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{editItem ? `Edit ${editItem.estimateNumber}` : 'New Quotation'}</h2>
      </div>

      {/* Template Picker */}
      <Card style={{ padding: '14px 18px', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <SectionTitle style={{ marginBottom: 6 }}>PDF Template</SectionTitle>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Choose how your quotation PDF looks</div>
          </div>
          <TemplatePicker value={template} onChange={setTemplate} />
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <Card style={{ padding: 18 }}>
          <SectionTitle>Quote To</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <CustomerSelect value={{ name: custName, email: custEmail, phone: custPhone, address: custAddress, gstin: custGstin }} onChange={setCustomer} headers={headers} />
            <F label="Email" value={custEmail} onChange={setCustEmail} type="email" placeholder="customer@company.com" span={2} />
            <F label="Phone" value={custPhone} onChange={setCustPhone} type="tel" placeholder="+91 98765 43210" span={2} />
            <F label="Address" value={custAddress} onChange={setCustAddress} placeholder="City, State" span={2} />
            <F label="GSTIN" value={custGstin} onChange={v => setCustGstin(v.toUpperCase())} placeholder="22AAAAA0000A1Z5" mono uppercase span={2} />
          </div>
        </Card>
        <Card style={{ padding: 18 }}>
          <SectionTitle>Quotation Details</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <F label="Quotation Number" value={estNumber} onChange={setEstNumber} placeholder="QT-0001" span={2} />
            <Sel label="Status" value={status} onChange={setStatus}
              options={['Draft', 'Sent', 'Accepted', 'Declined', 'Expired']} />
            <Sel label="Currency" value={currency} onChange={setCurrency} options={['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD']} />
            <F label="Issue Date *" value={issueDate} onChange={setIssueDate} type="date" />
            <F label="Valid Until" value={expiryDate} onChange={setExpiryDate} type="date" />
          </div>
        </Card>
      </div>

      {/* Line Items */}
      <Card style={{ marginBottom: 14, overflow: 'hidden' }}>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)' }}><SectionTitle>Line Items</SectionTitle></div>
        <div style={{ padding: '12px 18px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 110px 80px 70px 110px 28px', gap: 8, marginBottom: 6 }}>
            {['Description', 'Qty', 'Rate (₹)', 'Hours', 'Tax %', 'Amount', ''].map(h => (
              <div key={h} style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: h === 'Amount' || h === 'Rate (₹)' ? 'right' : 'left' }}>{h}</div>
            ))}
          </div>
          {lineItems.map((line, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 110px 80px 70px 110px 28px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <input value={line.description} onChange={e => { setLine(i, 'description', e.target.value); setProductDropdown(i) }}
                  onFocus={e => { e.target.style.borderColor = 'var(--accent)'; setProductDropdown(i) }}
                  onBlur={() => setTimeout(() => setProductDropdown(null), 200)}
                  placeholder="Item or type to search catalogue…"
                  style={inputCls} />
                {productDropdown === i && products.filter(p => !line.description || p.name.toLowerCase().includes(line.description.toLowerCase())).length > 0 && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 3px)', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-md)', zIndex: 999, boxShadow: 'var(--shadow-lg)', maxHeight: 200, overflowY: 'auto' }}>
                    {products.filter(p => !line.description || p.name.toLowerCase().includes(line.description.toLowerCase())).slice(0, 8).map(p => (
                      <button key={p._id} onMouseDown={() => {
                        setLineItems(prev => prev.map((l, idx) => idx === i ? { ...l, description: p.name, rate: p.price, hours: l.hours || 1, tax: p.taxRate || 18, hsnCode: p.hsnCode || '', unit: p.unit || 'pcs', amount: (parseFloat(l.qty) || 1) * (parseFloat(l.hours) || 1) * (p.price || 0) } : l))
                        setProductDropdown(null)
                      }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', textAlign: 'left', borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{p.name}</div>
                          {p.hsnCode && <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>HSN: {p.hsnCode}</div>}
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
                          <div style={{ fontSize: 12, fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--accent-2)' }}>₹{p.price}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{p.taxRate || 18}% GST</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input type="number" value={line.qty} onChange={e => setLine(i, 'qty', e.target.value)} min="0"
                style={inputCls} onFocus={e => e.target.style.borderColor = 'var(--accent)'} onBlur={e => e.target.style.borderColor = 'var(--border-2)'} />
              <input type="number" value={line.rate} onChange={e => setLine(i, 'rate', e.target.value)} min="0"
                style={{ ...inputCls, textAlign: 'right' }} onFocus={e => e.target.style.borderColor = 'var(--accent)'} onBlur={e => e.target.style.borderColor = 'var(--border-2)'} />
              <input type="number" value={line.hours} onChange={e => setLine(i, 'hours', e.target.value)} min="0"
                style={inputCls} onFocus={e => e.target.style.borderColor = 'var(--accent)'} onBlur={e => e.target.style.borderColor = 'var(--border-2)'} />
              <input type="number" value={line.tax} onChange={e => setLine(i, 'tax', e.target.value)} min="0" max="100"
                style={inputCls} onFocus={e => e.target.style.borderColor = 'var(--accent)'} onBlur={e => e.target.style.borderColor = 'var(--border-2)'} />
              <div style={{ ...inputCls, textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--text-2)', cursor: 'default' }}>
                {fmt2((parseFloat(line.qty) || 0) * (parseFloat(line.hours) || 1) * (parseFloat(line.rate) || 0) * (1 + (parseFloat(line.tax) || 0) / 100))}
              </div>
              <button onClick={() => setLineItems(prev => prev.filter((_, idx) => idx !== i))}
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
          <div style={{ width: 300 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, color: 'var(--text-3)', borderBottom: '1px solid var(--border)' }}>
              <span>Subtotal</span><span style={{ fontFamily: 'var(--mono)' }}>{fmt2(subtotal)}</span>
            </div>
            {isInter ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, color: 'var(--text-3)', borderBottom: '1px solid var(--border)' }}>
                <span>IGST</span><span style={{ fontFamily: 'var(--mono)' }}>{fmt2(igstAmt)}</span>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, color: 'var(--text-3)', borderBottom: '1px solid var(--border)' }}>
                  <span>CGST</span><span style={{ fontFamily: 'var(--mono)' }}>{fmt2(cgstAmt)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, color: 'var(--text-3)', borderBottom: '1px solid var(--border)' }}>
                  <span>SGST</span><span style={{ fontFamily: 'var(--mono)' }}>{fmt2(sgstAmt)}</span>
                </div>
              </>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', fontSize: 17, fontWeight: 700, color: 'var(--accent-2)' }}>
              <span>Total</span><span style={{ fontFamily: 'var(--mono)' }}>{fmt2(grand)}</span>
            </div>
            <div style={{ marginTop: 6, fontSize: 10, color: 'var(--text-4)', textAlign: 'right' }}>
              {isInter ? `Inter-state · IGST (${orgState} → ${custState})` : orgState && custState ? 'Intra-state · CGST + SGST' : 'Defaulting to CGST + SGST (set GSTINs to determine)'}
            </div>
          </div>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
        <Card style={{ padding: 16 }}>
          <SectionTitle>Notes</SectionTitle>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Thank you for your interest!"
            style={{ ...inputCls, resize: 'vertical' }} onFocus={e => e.target.style.borderColor = 'var(--accent)'} onBlur={e => e.target.style.borderColor = 'var(--border-2)'} />
        </Card>
        <Card style={{ padding: 16 }}>
          <SectionTitle>Terms &amp; Conditions</SectionTitle>
          <textarea value={terms} onChange={e => setTerms(e.target.value)} rows={3}
            style={{ ...inputCls, resize: 'vertical' }} onFocus={e => e.target.style.borderColor = 'var(--accent)'} onBlur={e => e.target.style.borderColor = 'var(--border-2)'} />
        </Card>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '16px 0', borderTop: '1px solid var(--border)', alignItems: 'center' }}>
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn onClick={() => save('Draft')} disabled={!!saving}>
          {saving === 'Draft' ? 'Saving…' : 'Save as Draft'}
        </Btn>
        <Btn variant="outline" onClick={() => save(status === 'Draft' ? 'Draft' : status)} disabled={!!saving}>
          {saving === 'saving' ? 'Saving…' : '💾 Save'}
        </Btn>
        <Btn variant="primary" onClick={() => save('Sent')} disabled={!!saving}>
          {saving === 'Sent' ? 'Sending…' : '📤 Send Quotation'}
        </Btn>
      </div>
    </div>
  )
}

// ─── List view ────────────────────────────────────────────────────────────────

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const STATUS_COLORS = {
  Draft:    { bg: 'var(--surface-3)',      color: 'var(--text-3)' },
  Sent:     { bg: 'rgba(59,130,246,0.12)', color: 'var(--blue-text)' },
  Accepted: { bg: 'rgba(16,185,129,0.12)', color: 'var(--green-text)' },
  Declined: { bg: 'rgba(239,68,68,0.12)',  color: 'var(--red-text)' },
  Invoiced: { bg: 'rgba(99,102,241,0.12)', color: 'var(--accent-3)' },
  Expired:  { bg: 'rgba(245,158,11,0.12)', color: 'var(--amber-text)' },
}

export default function EstimatesList({ headers, toast, readOnly }) {
  const [view, setView]       = useState('list')
  const [editing, setEditing] = useState(null)
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')

  const load = () => {
    setLoading(true)
    fetch('/api/estimates', { headers, credentials: 'include' })
      .then(r => r.json())
      .then(d => { setItems(d.estimates || []); setLoading(false) })
      .catch(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const openForm = (item = null) => { setEditing(item); setView('form') }
  const closeForm = () => { setView('list'); setEditing(null) }

  if (view === 'form') {
    return (
      <EstimateForm
        headers={headers}
        toast={toast}
        editItem={editing}
        onClose={closeForm}
        onSaved={() => { closeForm(); load() }}
      />
    )
  }

  const filtered = items.filter(i =>
    !search ||
    (i.estimateNumber || '').toLowerCase().includes(search.toLowerCase()) ||
    (i.customer?.name || '').toLowerCase().includes(search.toLowerCase())
  )

  const viewPdf = (est) => {
    window.open(`/api/estimates/${est._id}/pdf`, '_blank')
  }

  const sendEmail = async (est) => {
    const to = est.customer?.email
    if (!to) { toast('Customer has no email address', 'error'); return }
    if (!confirm(`Email quotation ${est.estimateNumber} to ${to}?`)) return
    const r = await fetch(`/api/estimates/${est._id}/send-email`, { method: 'POST', headers, credentials: 'include', body: JSON.stringify({ to }) })
    const d = await r.json()
    if (r.ok) { toast(`✓ Sent to ${to}`); load() } else toast(d.error || 'Failed', 'error')
  }

  const convert = async (est) => {
    if (!confirm(`Convert quotation ${est.estimateNumber} to invoice?`)) return
    const r = await fetch(`/api/estimates/${est._id}/convert`, { method: 'POST', headers, credentials: 'include' })
    const d = await r.json()
    if (r.ok) { toast(`✓ Invoice ${d.invoice.invoiceNumber} created`); load() }
    else toast(d.error || 'Failed', 'error')
  }

  const remove = async (est) => {
    if (!confirm(`Delete quotation ${est.estimateNumber}?`)) return
    const r = await fetch(`/api/estimates/${est._id}`, { method: 'DELETE', headers, credentials: 'include' })
    if (r.ok) { toast('Deleted'); load() } else toast('Failed', 'error')
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Quotations</h2>
          <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>{items.length} quotations · {fmt(items.reduce((s, i) => s + (i.total || 0), 0))} total quoted</div>
        </div>
        {!readOnly && (
          <button onClick={() => openForm()} style={{ background: 'var(--accent)', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 'var(--r-md)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>+ New Quotation</button>
        )}
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by number or customer…"
        style={{ width: '100%', maxWidth: 420, padding: '10px 14px', background: 'var(--surface-2)', border: '1px solid var(--border-2)', color: 'var(--text)', borderRadius: 'var(--r)', fontSize: 13, marginBottom: 14, outline: 'none', fontFamily: 'var(--font)' }} />

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
        {loading ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>Loading…</div>
          : filtered.length === 0 ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>No quotations yet. Create your first one.</div>
          : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: 'var(--bg-3)' }}>
                <tr>
                  {['Number', 'Customer', 'Date', 'Valid Until', 'Total', 'Status', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(i => {
                  const sc = STATUS_COLORS[i.status] || STATUS_COLORS.Draft
                  return (
                    <tr key={i._id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>{i.estimateNumber}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-2)' }}>{i.customer?.name || '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-3)' }}>{fmtDate(i.issueDate)}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-3)' }}>{fmtDate(i.expiryDate)}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text)', fontFamily: 'var(--mono)' }}>{fmt(i.total)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: sc.bg, color: sc.color, padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600 }}>{i.status}</span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <button onClick={() => viewPdf(i)} style={{ background: 'transparent', border: '1px solid var(--border-2)', color: 'var(--text-2)', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', marginRight: 6, fontFamily: 'var(--font)' }}>PDF</button>
                        {!readOnly && (
                          <button onClick={() => sendEmail(i)} style={{ background: 'transparent', border: '1px solid var(--blue)', color: 'var(--blue-text)', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', marginRight: 6, fontFamily: 'var(--font)' }}>Send</button>
                        )}
                        {!readOnly && i.status !== 'Invoiced' && (
                          <button onClick={() => convert(i)} style={{ background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', marginRight: 6, fontFamily: 'var(--font)' }}>→ Invoice</button>
                        )}
                        {!readOnly && (
                          <>
                            <button onClick={() => openForm(i)} style={{ background: 'transparent', border: '1px solid var(--border-2)', color: 'var(--text-2)', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', marginRight: 6, fontFamily: 'var(--font)' }}>Edit</button>
                            <button onClick={() => remove(i)} style={{ background: 'transparent', border: '1px solid rgba(239,68,68,0.4)', color: 'var(--red)', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>Delete</button>
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
    </div>
  )
}
