import { useState, useEffect, useRef } from 'react'
import { Btn, Card, SectionTitle, EmptyState, SearchBar, Badge, fmt, fmtDate } from './ui'

const inputStyle = { width: '100%', padding: '9px 12px', background: 'var(--surface-2)', border: '1px solid var(--border-2)', borderRadius: 'var(--r)', fontSize: 13, color: 'var(--text)', outline: 'none', fontFamily: 'var(--font)' }
const labelStyle = { display: 'block', fontSize: 12, color: 'var(--text-3)', fontWeight: 500, marginBottom: 5 }

function F({ label, value, onChange, placeholder, type = 'text', span, readOnly }) {
  return (
    <div style={span ? { gridColumn: `span ${span}` } : {}}>
      {label && <label style={labelStyle}>{label}</label>}
      <input type={type} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        readOnly={readOnly} style={{ ...inputStyle, opacity: readOnly ? 0.6 : 1 }}
        onFocus={e => { if (!readOnly) { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)' } }}
        onBlur={e => { e.target.style.borderColor = 'var(--border-2)'; e.target.style.boxShadow = 'none' }} />
    </div>
  )
}

// ── Customer Form (Create / Edit) ──
function CustomerForm({ editItem, headers, toast, onClose, readOnly }) {
  const [name,    setName]    = useState(editItem?.name    || '')
  const [email,   setEmail]   = useState(editItem?.email   || '')
  const [phone,   setPhone]   = useState(editItem?.phone   || '')
  const [address, setAddress] = useState(editItem?.address || '')
  const [gstin,   setGstin]   = useState(editItem?.gstin   || '')
  const [saving,  setSaving]  = useState(false)

  const save = async () => {
    if (!name.trim()) { toast('Name is required', 'error'); return }
    setSaving(true)
    try {
      const isEdit = !!editItem?._id
      const r = await fetch(isEdit ? `/api/customers/${editItem._id}` : '/api/customers', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, address, gstin: gstin.toUpperCase() }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      toast(isEdit ? 'Customer updated!' : 'Customer created!')
      onClose()
    } catch (e) { toast(e.message, 'error') }
    setSaving(false)
  }

  return (
    <div style={{ maxWidth: 580, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
        <Btn variant="ghost" onClick={onClose}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back
        </Btn>
        <div style={{ height: 16, width: 1, background: 'var(--border)' }} />
        <h2 style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{editItem ? 'Edit Customer' : 'New Customer'}</h2>
      </div>

      <Card style={{ padding: 20 }}>
        <SectionTitle>Basic Info</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <F label="Name *" value={name} onChange={setName} placeholder="Acme Corp" span={2} readOnly={readOnly} />
          <F label="Email" value={email} onChange={setEmail} placeholder="billing@acme.com" type="email" readOnly={readOnly} />
          <F label="Phone" value={phone} onChange={setPhone} placeholder="+91 98765 43210" readOnly={readOnly} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Address</label>
          <textarea value={address} onChange={e => setAddress(e.target.value)} rows={2} placeholder="City, State, Pincode"
            readOnly={readOnly} style={{ ...inputStyle, resize: 'vertical' }}
            onFocus={e => { e.target.style.borderColor = 'var(--accent)' }}
            onBlur={e => { e.target.style.borderColor = 'var(--border-2)' }} />
        </div>
        <F label="GSTIN" value={gstin} onChange={v => setGstin(v.toUpperCase())} placeholder="22AAAAA0000A1Z5" readOnly={readOnly} />
      </Card>

      {!readOnly && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : '✓ Save Customer'}</Btn>
        </div>
      )}
    </div>
  )
}

// ── Customer Detail View ──
function CustomerDetail({ customerId, headers, toast, onClose, onEdit }) {
  const [data,       setData]      = useState(null)
  const [loading,    setLoading]   = useState(true)
  const [exporting,  setExporting] = useState(false)

  useEffect(() => {
    fetch(`/api/customers/${customerId}`, { headers })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [customerId])

  const exportCustomerCSV = async () => {
    if (!data) return
    setExporting(true)
    try {
      const { customer, invoices, totalBilled, totalPaid, outstanding } = data
      const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'2-digit', year:'numeric' }) : ''
      const fmtn = n => Number(n || 0).toFixed(2)
      const escape = v => { const s = String(v ?? ''); return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g,'""')}"` : s }
      const toCSV = (hdrs, rows) => [hdrs.join(','), ...rows.map(r => r.map(escape).join(','))].join('\n')

      // Sheet 1: Customer info
      const infoRows = [
        ['Name',    customer.name],
        ['Email',   customer.email || ''],
        ['Phone',   customer.phone || ''],
        ['Address', customer.address || ''],
        ['GSTIN',   customer.gstin || ''],
        [''],
        ['Total Billed',  fmtn(totalBilled)],
        ['Total Paid',    fmtn(totalPaid)],
        ['Outstanding',   fmtn(outstanding)],
        ['Invoice Count', invoices.length],
      ]

      // Sheet 2: Invoice history
      const invHeaders = ['Invoice #','Status','Issue Date','Due Date','Subtotal','Tax','Total','Paid','Balance']
      const invRows = invoices.map(inv => [
        inv.invoiceNumber,
        inv.status === 'Draft' ? 'Due' : inv.status,
        fmtDate(inv.issueDate),
        fmtDate(inv.dueDate),
        fmtn(inv.subtotal),
        fmtn(inv.taxTotal),
        fmtn(inv.total),
        fmtn(inv.paidAmount),
        fmtn((inv.total || 0) - (inv.paidAmount || 0)),
      ])

      const csv = '\uFEFF' + [
        '=== CUSTOMER PROFILE ===',
        toCSV(['Field', 'Value'], infoRows),
        '',
        '=== INVOICE HISTORY ===',
        toCSV(invHeaders, invRows),
        '',
        `Total,,,,,,,${fmtn(totalBilled)},${fmtn(totalPaid)},${fmtn(outstanding)}`,
      ].join('\n')

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `customer_${customer.name.replace(/\s+/g,'_')}.csv`
      a.click()
      toast(`Exported ${customer.name}`)
    } catch (e) { toast('Export failed', 'error') }
    setExporting(false)
  }

  if (loading) return <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)' }}>Loading…</div>
  if (!data) return null

  const { customer, invoices, totalBilled, totalPaid, outstanding } = data

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
        <Btn variant="ghost" onClick={onClose}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back
        </Btn>
        <div style={{ height: 16, width: 1, background: 'var(--border)' }} />
        <div style={{ flex: 1 }}>
          <h2 style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{customer.name}</h2>
          {customer.gstin && <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--mono)', marginTop: 2 }}>GSTIN: {customer.gstin}</div>}
        </div>
        <Btn onClick={exportCustomerCSV} disabled={exporting}>
          {exporting ? '⟳ Exporting…' : '⬇ Export CSV'}
        </Btn>
        <Btn onClick={onEdit}>Edit</Btn>
      </div>

      {/* Stats cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 18 }}>
        {[
          { label: 'Total Billed',  value: fmt(totalBilled),  color: 'var(--accent-2)' },
          { label: 'Total Paid',    value: fmt(totalPaid),    color: 'var(--green-text)' },
          { label: 'Outstanding',   value: fmt(outstanding),  color: outstanding > 0 ? 'var(--amber-text)' : 'var(--text-3)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '14px 16px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Contact info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
        <Card style={{ padding: 16 }}>
          <SectionTitle>Contact</SectionTitle>
          <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 10, display: 'flex', flexDirection: 'column', gap: 7 }}>
            {customer.email   && <div><span style={{ color: 'var(--text-3)', fontSize: 11 }}>Email: </span>{customer.email}</div>}
            {customer.phone   && <div><span style={{ color: 'var(--text-3)', fontSize: 11 }}>Phone: </span>{customer.phone}</div>}
            {customer.address && <div><span style={{ color: 'var(--text-3)', fontSize: 11 }}>Address: </span>{customer.address}</div>}
            {!customer.email && !customer.phone && <div style={{ color: 'var(--text-4)', fontSize: 12 }}>No contact info</div>}
          </div>
        </Card>
        <Card style={{ padding: 16 }}>
          <SectionTitle>Summary</SectionTitle>
          <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 10, display: 'flex', flexDirection: 'column', gap: 7 }}>
            <div><span style={{ color: 'var(--text-3)', fontSize: 11 }}>Invoices: </span>{invoices.length}</div>
            <div><span style={{ color: 'var(--text-3)', fontSize: 11 }}>Since: </span>{invoices.length ? fmtDate(invoices[invoices.length - 1]?.issueDate) : '—'}</div>
            <div><span style={{ color: 'var(--text-3)', fontSize: 11 }}>Last invoice: </span>{invoices.length ? fmtDate(invoices[0]?.issueDate) : '—'}</div>
          </div>
        </Card>
      </div>

      {/* Invoice history */}
      <Card style={{ overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <SectionTitle>Invoice History</SectionTitle>
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{invoices.length} invoices</span>
        </div>
        {invoices.length === 0
          ? <EmptyState message="No invoices for this customer yet." />
          : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Invoice #', 'Date', 'Due', 'Status', 'Total', 'Paid', 'Balance'].map((h, i) => (
                    <th key={h} style={{ padding: '9px 14px', textAlign: i > 3 ? 'right' : 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'var(--bg-3)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv._id} style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td style={{ padding: '10px 14px', fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: 'var(--accent-2)' }}>{inv.invoiceNumber}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-2)' }}>{fmtDate(inv.issueDate)}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: inv.status === 'Overdue' ? 'var(--red-text)' : 'var(--text-3)' }}>{fmtDate(inv.dueDate)}</td>
                    <td style={{ padding: '10px 14px' }}><Badge status={inv.status === 'Draft' ? 'Due' : inv.status} /></td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 700 }}>{fmt(inv.total)}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--green-text)' }}>{fmt(inv.paidAmount)}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12, color: (inv.total - inv.paidAmount) > 0 ? 'var(--amber-text)' : 'var(--text-3)' }}>
                      {fmt((inv.total || 0) - (inv.paidAmount || 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--bg-3)', borderTop: '2px solid var(--border-3)' }}>
                  <td colSpan={4} style={{ padding: '10px 14px', fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>Total</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--text)' }}>{fmt(totalBilled)}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--green-text)' }}>{fmt(totalPaid)}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 700, color: outstanding > 0 ? 'var(--amber-text)' : 'var(--text-3)' }}>{fmt(outstanding)}</td>
                </tr>
              </tfoot>
            </table>
          )}
      </Card>
    </div>
  )
}

// ── Export helper ──
function exportCSV(headers, orgId, type) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('sb_token') : ''
  const url = `/api/export?type=${type}`
  const link = document.createElement('a')
  link.href = url
  // Carry auth via header not possible for direct download, so use fetch + blob
  fetch(url, { headers: { 'x-org-id': orgId, ...(token ? { Authorization: `Bearer ${token}` } : {}) } })
    .then(r => r.blob())
    .then(blob => {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${type}.csv`
      a.click()
    })
}

// ── Main Customers Page ──
export default function CustomerPage({ org, headers, toast, readOnly = false }) {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [view, setView]           = useState('list') // list | form | detail
  const [editItem, setEditItem]   = useState(null)
  const [detailId, setDetailId]   = useState(null)
  const [exporting, setExporting] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const exportRef = useRef()

  const load = () => {
    setLoading(true)
    fetch(`/api/customers?withStats=1${search ? `&search=${encodeURIComponent(search)}` : ''}`, { headers })
      .then(r => r.json())
      .then(d => { setCustomers(d.customers || []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [org.id, search])

  useEffect(() => {
    const h = e => { if (exportRef.current && !exportRef.current.contains(e.target)) setShowExport(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const del = async (c) => {
    if (!confirm(`Delete ${c.name}? This won't delete their invoices.`)) return
    const r = await fetch(`/api/customers/${c._id}`, { method: 'DELETE', headers })
    if (r.ok) { toast('Customer deleted'); load() }
  }

  const doExport = async (type) => {
    setExporting(true)
    const token = localStorage.getItem('sb_token')
    const h = { 'x-org-id': org.id, ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    try {
      const r = await fetch(`/api/export?type=${type}`, { headers: h })
      if (!r.ok) throw new Error('Export failed')
      const blob = await r.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${type}.csv`
      a.click()
      toast(`${type} exported!`)
    } catch (e) { toast(e.message, 'error') }
    setExporting(false)
  }

  if (view === 'form') {
    return <CustomerForm editItem={editItem} headers={headers} toast={toast} readOnly={readOnly}
      onClose={() => { setView('list'); setEditItem(null); load() }} />
  }

  if (view === 'detail') {
    return <CustomerDetail customerId={detailId} headers={headers} toast={toast}
      onClose={() => { setView('list'); setDetailId(null) }}
      onEdit={() => { const c = customers.find(x => x._id === detailId); setEditItem(c); setView('form') }} />
  }

  const totalOutstanding = customers.reduce((s, c) => s + (c.outstanding || 0), 0)
  const totalBilled      = customers.reduce((s, c) => s + (c.totalBilled || 0), 0)

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px' }}>Customers</h2>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>{customers.length} customers · {fmt(totalBilled)} total billed</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {/* Export dropdown */}
          <div ref={exportRef} style={{ position: 'relative' }}>
            <Btn onClick={() => setShowExport(v => !v)} disabled={exporting}>
              {exporting ? '⟳ Exporting…' : '⬇ Export CSV ▾'}
            </Btn>
            {showExport && (
              <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 4px)', background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-md)', zIndex: 9999, minWidth: 190, boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
                <div style={{ padding: '6px 12px', fontSize: 10, fontWeight: 700, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid var(--border)' }}>Export as CSV</div>
                {[
                  { type: 'customers',       label: '👥 Customers' },
                  { type: 'expenses',        label: '💸 Expenses' },
                  { type: 'invoices',        label: '📄 Invoices' },
                  { type: 'payments',        label: '💳 Payments' },
                  { type: 'purchase-orders', label: '📦 Purchase Orders' },
                  { type: 'journal',         label: '📒 Journal Entries' },
                  { type: 'ledger',          label: '📊 Chart of Accounts' },
                ].map(({ type, label }) => (
                  <button key={type} onClick={() => { setShowExport(false); doExport(type) }}
                    style={{ display: 'block', width: '100%', padding: '9px 14px', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', textAlign: 'left', fontSize: 13, color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'var(--font)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {!readOnly && <Btn variant="primary" onClick={() => { setEditItem(null); setView('form') }}>+ New Customer</Btn>}
        </div>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
        {[
          { label: 'Total Customers',  value: customers.length,                                                      color: 'var(--accent-2)' },
          { label: 'Total Billed',     value: fmt(totalBilled),                                                      color: 'var(--text)' },
          { label: 'Outstanding',      value: fmt(totalOutstanding),                                                  color: totalOutstanding > 0 ? 'var(--amber-text)' : 'var(--text-3)' },
          { label: 'With Overdue',     value: customers.filter(c => c.hasOverdue).length,                            color: 'var(--red-text)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '14px 16px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <Card>
        {/* Search */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center' }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search by name, email, GSTIN…" />
          <Btn size="sm" onClick={load}>↻</Btn>
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)' }}>Loading…</div>
        ) : customers.length === 0 ? (
          <EmptyState message={search ? 'No customers match your search.' : 'No customers yet. Add your first customer.'} />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Customer', 'Email', 'Phone', 'GSTIN', 'Invoices', 'Total Billed', 'Outstanding', ''].map((h, i) => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: i > 4 ? 'right' : 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'var(--bg-3)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c._id} onClick={() => { setDetailId(c._id); setView('detail') }}
                  style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-dim)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--accent-2)', flexShrink: 0 }}>
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text)' }}>{c.name}</div>
                        {c.hasOverdue && <div style={{ fontSize: 10, color: 'var(--red-text)', marginTop: 1 }}>● Overdue invoice</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', color: 'var(--text-3)', fontSize: 12 }}>{c.email || '—'}</td>
                  <td style={{ padding: '12px 14px', color: 'var(--text-3)', fontSize: 12 }}>{c.phone || '—'}</td>
                  <td style={{ padding: '12px 14px', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-3)' }}>{c.gstin || '—'}</td>
                  <td style={{ padding: '12px 14px', color: 'var(--text-2)' }}>{c.invoiceCount || 0}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--text)' }}>{fmt(c.totalBilled || 0)}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12, color: (c.outstanding || 0) > 0 ? 'var(--amber-text)' : 'var(--text-3)' }}>
                    {fmt(c.outstanding || 0)}
                  </td>
                  <td style={{ padding: '12px 14px' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
                      {!readOnly && <Btn size="sm" onClick={e => { e.stopPropagation(); setEditItem(c); setView('form') }}>Edit</Btn>}
                      {!readOnly && <Btn size="sm" variant="danger" onClick={e => { e.stopPropagation(); del(c) }}>✕</Btn>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-3)', display: 'flex', justifyContent: 'space-between' }}>
          <span>{customers.length} customer{customers.length !== 1 ? 's' : ''}</span>
          <span>{org.name}</span>
        </div>
      </Card>
    </div>
  )
}