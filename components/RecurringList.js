import { useState, useEffect } from 'react'
import { Btn, Card, SectionTitle, EmptyState, fmt, fmtDate, Badge } from './ui'

const FREQ_COLORS = {
  Weekly:    { color: 'var(--teal-text)',   bg: 'var(--teal-dim)' },
  Monthly:   { color: 'var(--accent-2)',    bg: 'var(--accent-dim)' },
  Quarterly: { color: 'var(--amber-text)',  bg: 'var(--amber-dim)' },
  Yearly:    { color: 'var(--purple-text)', bg: 'rgba(99,102,241,0.12)' },
}

const inputCls = { width: '100%', padding: '8px 11px', background: 'var(--surface-2)', border: '1px solid var(--border-2)', borderRadius: 'var(--r)', fontSize: 13, color: 'var(--text)', outline: 'none', fontFamily: 'var(--font)' }
const labelCls = { display: 'block', fontSize: 12, color: 'var(--text-3)', fontWeight: 500, marginBottom: 5 }

function F({ label, value, onChange, type = 'text', placeholder, span }) {
  return (
    <div style={span ? { gridColumn: `span ${span}` } : {}}>
      <label style={labelCls}>{label}</label>
      <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={inputCls}
        onFocus={e => e.target.style.borderColor = 'var(--accent)'}
        onBlur={e => e.target.style.borderColor = 'var(--border-2)'} />
    </div>
  )
}

function Sel({ label, value, onChange, options, span }) {
  return (
    <div style={span ? { gridColumn: `span ${span}` } : {}}>
      <label style={labelCls}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} style={{ ...inputCls, cursor: 'pointer' }}
        onFocus={e => e.target.style.borderColor = 'var(--accent)'}
        onBlur={e => e.target.style.borderColor = 'var(--border-2)'}>
        {options.map(o => typeof o === 'string'
          ? <option key={o} value={o} style={{ background: 'var(--bg-2)' }}>{o}</option>
          : <option key={o.value} value={o.value} style={{ background: 'var(--bg-2)' }}>{o.label}</option>
        )}
      </select>
    </div>
  )
}

const newLine = () => ({ description: '', qty: 1, rate: 0, tax: 18, amount: 0 })
const today = () => new Date().toISOString().split('T')[0]

function RecurringForm({ editItem, headers, toast, onClose }) {
  const [name,        setName]        = useState(editItem?.name || '')
  const [frequency,   setFrequency]   = useState(editItem?.frequency || 'Monthly')
  const [startDate,   setStartDate]   = useState(editItem?.startDate ? editItem.startDate.split('T')[0] : today())
  const [endDate,     setEndDate]     = useState(editItem?.endDate ? editItem.endDate.split('T')[0] : '')
  const [autoSend,    setAutoSend]    = useState(editItem?.autoSend || false)
  const [autoSendTo,  setAutoSendTo]  = useState(editItem?.autoSendTo || '')
  const [dueDays,     setDueDays]     = useState(String(editItem?.template?.dueDays ?? 30))
  const [custName,    setCustName]    = useState(editItem?.template?.customer?.name || '')
  const [custEmail,   setCustEmail]   = useState(editItem?.template?.customer?.email || '')
  const [custAddress, setCustAddress] = useState(editItem?.template?.customer?.address || '')
  const [custGstin,   setCustGstin]   = useState(editItem?.template?.customer?.gstin || '')
  const [currency,    setCurrency]    = useState(editItem?.template?.currency || 'INR')
  const [notes,       setNotes]       = useState(editItem?.template?.notes || '')
  const [terms,       setTerms]       = useState(editItem?.template?.terms || '')
  const [lineItems,   setLineItems]   = useState(editItem?.template?.lineItems?.length ? editItem.template.lineItems : [newLine()])
  const [saving,      setSaving]      = useState(false)

  const setLine = (i, k, v) => setLineItems(prev => { const ls = [...prev]; ls[i] = { ...ls[i], [k]: v }; return ls })
  const subtotal = lineItems.reduce((s, l) => s + (parseFloat(l.qty)||0) * (parseFloat(l.rate)||0), 0)
  const taxTotal  = lineItems.reduce((s, l) => s + (parseFloat(l.qty)||0) * (parseFloat(l.rate)||0) * (parseFloat(l.tax)||0) / 100, 0)

  const save = async () => {
    if (!name.trim()) { toast('Name is required', 'error'); return }
    if (!custName.trim()) { toast('Customer name is required', 'error'); return }
    setSaving(true)
    try {
      const payload = {
        name, frequency, startDate, endDate: endDate || null,
        autoSend, autoSendTo,
        template: {
          customer: { name: custName, email: custEmail, address: custAddress, gstin: custGstin },
          lineItems: lineItems.map(l => ({ ...l, qty: parseFloat(l.qty)||0, rate: parseFloat(l.rate)||0, tax: parseFloat(l.tax)||0 })),
          currency, notes, terms,
          dueDays: parseInt(dueDays) || 30,
        },
      }
      const isEdit = !!editItem?._id
      const r = await fetch(isEdit ? `/api/recurring/${editItem._id}` : '/api/recurring', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      toast(isEdit ? 'Updated!' : 'Recurring invoice created!')
      onClose()
    } catch (e) { toast(e.message, 'error') }
    setSaving(false)
  }

  return (
    <div style={{ maxWidth: 780, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
        <Btn variant="ghost" onClick={onClose}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back
        </Btn>
        <div style={{ height: 16, width: 1, background: 'var(--border)' }} />
        <h2 style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{editItem ? 'Edit Recurring Invoice' : 'New Recurring Invoice'}</h2>
      </div>

      {/* Schedule */}
      <Card style={{ padding: 18, marginBottom: 14 }}>
        <SectionTitle>Schedule</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
          <F label="Name / Description" value={name} onChange={setName} placeholder="Monthly retainer — Acme Corp" span={2} />
          <Sel label="Frequency" value={frequency} onChange={setFrequency} options={['Weekly','Monthly','Quarterly','Yearly']} />
          <F label="Due in (days)" value={dueDays} onChange={setDueDays} type="number" placeholder="30" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          <F label="Start Date" value={startDate} onChange={setStartDate} type="date" />
          <F label="End Date (optional)" value={endDate} onChange={setEndDate} type="date" />
          <Sel label="Currency" value={currency} onChange={setCurrency} options={['INR','USD','EUR','GBP','AED','SGD']} />
        </div>
      </Card>

      {/* Customer */}
      <Card style={{ padding: 18, marginBottom: 14 }}>
        <SectionTitle>Bill To (Customer)</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <F label="Customer Name *" value={custName} onChange={setCustName} placeholder="Acme Corp" />
          <F label="Email" value={custEmail} onChange={setCustEmail} placeholder="billing@acme.com" />
          <F label="Address" value={custAddress} onChange={setCustAddress} placeholder="City, State" />
          <F label="GSTIN" value={custGstin} onChange={v => setCustGstin(v.toUpperCase())} placeholder="22AAAAA0000A1Z5" />
        </div>
      </Card>

      {/* Line Items */}
      <Card style={{ marginBottom: 14, overflow: 'hidden' }}>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)' }}><SectionTitle>Line Items</SectionTitle></div>
        <div style={{ padding: '12px 18px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 110px 70px 110px 28px', gap: 8, marginBottom: 6 }}>
            {['Description','Qty','Rate (₹)','Tax %','Amount',''].map(h => (
              <div key={h} style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</div>
            ))}
          </div>
          {lineItems.map((line, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 110px 70px 110px 28px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <input value={line.description} onChange={e => setLine(i,'description',e.target.value)} placeholder="Item description" style={inputCls} onFocus={e => e.target.style.borderColor='var(--accent)'} onBlur={e => e.target.style.borderColor='var(--border-2)'} />
              <input type="number" value={line.qty} onChange={e => setLine(i,'qty',e.target.value)} style={inputCls} onFocus={e => e.target.style.borderColor='var(--accent)'} onBlur={e => e.target.style.borderColor='var(--border-2)'} />
              <input type="number" value={line.rate} onChange={e => setLine(i,'rate',e.target.value)} style={{ ...inputCls, textAlign:'right' }} onFocus={e => e.target.style.borderColor='var(--accent)'} onBlur={e => e.target.style.borderColor='var(--border-2)'} />
              <input type="number" value={line.tax} onChange={e => setLine(i,'tax',e.target.value)} style={inputCls} onFocus={e => e.target.style.borderColor='var(--accent)'} onBlur={e => e.target.style.borderColor='var(--border-2)'} />
              <div style={{ ...inputCls, textAlign:'right', fontFamily:'var(--mono)', color:'var(--text-2)', cursor:'default', padding:'8px 11px' }}>
                ₹{((parseFloat(line.qty)||0)*(parseFloat(line.rate)||0)*(1+(parseFloat(line.tax)||0)/100)).toLocaleString('en-IN',{minimumFractionDigits:2})}
              </div>
              <button onClick={() => setLineItems(prev => prev.filter((_,idx) => idx!==i))} style={{ width:28,height:28,background:'var(--red-dim)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:'var(--r-sm)',cursor:'pointer',color:'var(--red-text)',fontSize:15,display:'flex',alignItems:'center',justifyContent:'center' }}>×</button>
            </div>
          ))}
          <button onClick={() => setLineItems(prev => [...prev, newLine()])}
            style={{ width:'100%',marginTop:4,padding:'7px',background:'transparent',border:'1px dashed var(--border-2)',borderRadius:'var(--r)',fontSize:12,color:'var(--text-3)',cursor:'pointer',fontFamily:'var(--font)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor='var(--accent)'; e.currentTarget.style.color='var(--accent-2)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border-2)'; e.currentTarget.style.color='var(--text-3)' }}>
            + Add Line Item
          </button>
        </div>
        <div style={{ padding:'12px 18px', borderTop:'1px solid var(--border)', background:'var(--bg-3)', display:'flex', justifyContent:'flex-end' }}>
          <div style={{ width:260 }}>
            {[['Subtotal', subtotal],['Tax (GST)', taxTotal]].map(([l,v]) => (
              <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', fontSize:13, color:'var(--text-3)', borderBottom:'1px solid var(--border)' }}>
                <span>{l}</span><span style={{ fontFamily:'var(--mono)' }}>₹{Number(v).toLocaleString('en-IN',{minimumFractionDigits:2})}</span>
              </div>
            ))}
            <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 0 0', fontSize:16, fontWeight:700, color:'var(--accent-2)' }}>
              <span>Total</span><span style={{ fontFamily:'var(--mono)' }}>₹{(subtotal+taxTotal).toLocaleString('en-IN',{minimumFractionDigits:2})}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Auto-send + Notes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
        <Card style={{ padding: 16 }}>
          <SectionTitle>Auto-send Email</SectionTitle>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
            <input type="checkbox" checked={autoSend} onChange={e => setAutoSend(e.target.checked)} style={{ width:16, height:16, cursor:'pointer', accentColor:'var(--accent)' }} />
            <span style={{ fontSize:13, color:'var(--text-2)' }}>Automatically email invoice when created</span>
          </div>
          {autoSend && (
            <F label="Send to (leave blank to use customer email)" value={autoSendTo} onChange={setAutoSendTo} placeholder="billing@customer.com" />
          )}
          {autoSend && (
            <div style={{ fontSize:11, color:'var(--text-3)', marginTop:8, lineHeight:1.5 }}>
              Requires SMTP configured in Configuration → Email
            </div>
          )}
        </Card>
        <Card style={{ padding: 16 }}>
          <SectionTitle>Notes & Terms</SectionTitle>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Thank you for your business!" style={{ ...inputCls, resize:'vertical', marginBottom:10 }} onFocus={e => e.target.style.borderColor='var(--accent)'} onBlur={e => e.target.style.borderColor='var(--border-2)'} />
          <textarea value={terms} onChange={e => setTerms(e.target.value)} rows={2} placeholder="Payment due within 30 days." style={{ ...inputCls, resize:'vertical' }} onFocus={e => e.target.style.borderColor='var(--accent)'} onBlur={e => e.target.style.borderColor='var(--border-2)'} />
        </Card>
      </div>

      <div style={{ display:'flex', gap:10, justifyContent:'flex-end', padding:'14px 0', borderTop:'1px solid var(--border)' }}>
        <Btn onClick={onClose}>Cancel</Btn>
        <Btn variant="primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : '🔁 Save Recurring Invoice'}</Btn>
      </div>
    </div>
  )
}

export default function RecurringList({ org, headers, toast, readOnly = false }) {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView]       = useState('list') // list | form
  const [editItem, setEditItem] = useState(null)
  const [running, setRunning] = useState(false)

  const load = () => {
    setLoading(true)
    fetch('/api/recurring', { headers })
      .then(r => r.json())
      .then(d => { setItems(d.recurring || []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [org.id])

  const runNow = async () => {
    setRunning(true)
    const r = await fetch('/api/recurring/run', { method: 'POST', headers })
    const d = await r.json()
    toast(d.message || 'Done')
    load()
    setRunning(false)
  }

  const toggleStatus = async (item) => {
    const newStatus = item.status === 'Active' ? 'Paused' : 'Active'
    await fetch(`/api/recurring/${item._id}`, {
      method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    toast(`${newStatus === 'Active' ? 'Resumed' : 'Paused'} — ${item.name}`)
    load()
  }

  const del = async (item) => {
    if (!confirm(`Delete "${item.name}"?`)) return
    await fetch(`/api/recurring/${item._id}`, { method: 'DELETE', headers })
    toast('Deleted')
    load()
  }

  if (view === 'form') {
    return <RecurringForm editItem={editItem} headers={headers} toast={toast} onClose={() => { setView('list'); setEditItem(null); load() }} />
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
        <div>
          <h2 style={{ fontSize:18, fontWeight:700, color:'var(--text)', letterSpacing:'-0.3px' }}>Recurring Invoices</h2>
          <p style={{ fontSize:13, color:'var(--text-3)', marginTop:4 }}>Auto-create invoices on a schedule — weekly, monthly, quarterly or yearly</p>
        </div>
        {!readOnly && (
          <div style={{ display:'flex', gap:8 }}>
            <Btn onClick={runNow} disabled={running}>{running ? '⟳ Running…' : '▶ Run Now'}</Btn>
            <Btn variant="primary" onClick={() => { setEditItem(null); setView('form') }}>+ New Recurring</Btn>
          </div>
        )}
      </div>

      {/* How it works info */}
      <div style={{ padding:'12px 16px', background:'var(--accent-dim)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:'var(--r-md)', marginBottom:18, fontSize:12, color:'var(--accent-3)', lineHeight:1.6 }}>
        <b style={{ color:'var(--accent-2)' }}>🔁 How recurring invoices work</b><br/>
        On each scheduled date, an invoice is automatically created. If auto-send is on, it emails the customer too.
        Click <b>▶ Run Now</b> to process any due invoices immediately. For production, set up a daily cron job calling
        <code style={{ background:'rgba(99,102,241,0.15)', padding:'1px 6px', borderRadius:3, fontFamily:'var(--mono)', margin:'0 4px' }}>GET /api/recurring/run?secret=YOUR_CRON_SECRET</code>
        Add <code style={{ background:'rgba(99,102,241,0.15)', padding:'1px 6px', borderRadius:3, fontFamily:'var(--mono)' }}>CRON_SECRET=your_secret</code> to .env.local.
      </div>

      {/* Stats */}
      <div style={{ display:'flex', gap:10, marginBottom:18 }}>
        {[
          { label:'Active',   value: items.filter(i => i.status==='Active').length,   color:'var(--green-text)' },
          { label:'Paused',   value: items.filter(i => i.status==='Paused').length,   color:'var(--amber-text)' },
          { label:'Total',    value: items.length,                                     color:'var(--text-2)' },
          { label:'Due today', value: items.filter(i => i.status==='Active' && new Date(i.nextRunDate) <= new Date()).length, color:'var(--accent-2)' },
        ].map(s => (
          <div key={s.label} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-md)', padding:'10px 16px', minWidth:110 }}>
            <div style={{ fontSize:11, color:'var(--text-3)', fontWeight:500, marginBottom:3 }}>{s.label}</div>
            <div style={{ fontFamily:'var(--mono)', fontSize:20, fontWeight:700, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <Card>
        {loading ? (
          <div style={{ padding:48, textAlign:'center', color:'var(--text-3)' }}>Loading…</div>
        ) : items.length === 0 ? (
          <EmptyState message="No recurring invoices yet. Create one to auto-generate invoices on a schedule." />
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ borderBottom:'1px solid var(--border)' }}>
                {['Name','Customer','Frequency','Amount','Last Run','Next Run','Status',''].map((h,i) => (
                  <th key={h} style={{ padding:'10px 14px', textAlign:i===3?'right':'left', fontSize:11, fontWeight:600, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.06em', background:'var(--bg-3)', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const fc = FREQ_COLORS[item.frequency] || {}
                const total = (item.template?.lineItems || []).reduce((s,l) => s + (l.qty||0)*(l.rate||0)*(1+(l.tax||0)/100), 0)
                const isDue = item.status === 'Active' && new Date(item.nextRunDate) <= new Date()
                return (
                  <tr key={item._id} style={{ borderBottom:'1px solid var(--border)', transition:'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td style={{ padding:'12px 14px' }}>
                      <div style={{ fontWeight:600, color:'var(--text)' }}>{item.name}</div>
                      {item.autoSend && <div style={{ fontSize:11, color:'var(--teal-text)', marginTop:2 }}>✉ Auto-send on</div>}
                    </td>
                    <td style={{ padding:'12px 14px' }}>
                      <div style={{ color:'var(--text-2)' }}>{item.template?.customer?.name || '—'}</div>
                      <div style={{ fontSize:11, color:'var(--text-3)' }}>{item.template?.customer?.email || ''}</div>
                    </td>
                    <td style={{ padding:'12px 14px' }}>
                      <span style={{ fontSize:11, fontWeight:600, padding:'2px 9px', borderRadius:99, color:fc.color, background:fc.bg }}>{item.frequency}</span>
                    </td>
                    <td style={{ padding:'12px 14px', textAlign:'right', fontFamily:'var(--mono)', fontWeight:700, color:'var(--text)' }}>
                      ₹{total.toLocaleString('en-IN',{minimumFractionDigits:2})}
                    </td>
                    <td style={{ padding:'12px 14px', fontSize:12, color:'var(--text-3)' }}>{item.lastRunDate ? fmtDate(item.lastRunDate) : '—'}</td>
                    <td style={{ padding:'12px 14px', fontSize:12, color: isDue ? 'var(--amber-text)' : 'var(--text-2)', fontWeight: isDue ? 600 : 400 }}>
                      {isDue ? '⚡ Due now' : fmtDate(item.nextRunDate)}
                    </td>
                    <td style={{ padding:'12px 14px' }}>
                      <span style={{ fontSize:11, fontWeight:600, padding:'2px 9px', borderRadius:99, background: item.status==='Active'?'var(--green-dim)':item.status==='Paused'?'var(--amber-dim)':'var(--surface-3)', color: item.status==='Active'?'var(--green-text)':item.status==='Paused'?'var(--amber-text)':'var(--text-4)' }}>
                        {item.status}
                      </span>
                    </td>
                    <td style={{ padding:'12px 14px' }}>
                      {readOnly ? (
                        <span style={{ fontSize:11, color:'var(--text-4)' }}>View only</span>
                      ) : (
                        <div style={{ display:'flex', gap:5, justifyContent:'flex-end' }}>
                          {isDue && <Btn size="sm" variant="primary" onClick={runNow} disabled={running}>Run</Btn>}
                          <Btn size="sm" onClick={() => toggleStatus(item)}>{item.status==='Active'?'Pause':'Resume'}</Btn>
                          <Btn size="sm" onClick={() => { setEditItem(item); setView('form') }}>Edit</Btn>
                          <Btn size="sm" variant="danger" onClick={() => del(item)}>✕</Btn>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        <div style={{ padding:'10px 16px', borderTop:'1px solid var(--border)', fontSize:12, color:'var(--text-3)', display:'flex', justifyContent:'space-between' }}>
          <span>{items.length} recurring schedule{items.length!==1?'s':''}</span>
          <span>{org.name}</span>
        </div>
      </Card>
    </div>
  )
}