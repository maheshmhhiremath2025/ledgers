import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Badge, Btn, SearchBar, Card, EmptyState, fmt, fmtDate } from './ui'
import RecordPaymentModal from './RecordPaymentModal'

// ── PDF dropdown portal ──
function PDFDropdown({ invoiceId, invoiceNumber, orgId, anchorEl, onClose, onOpen }) {
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const ref = useRef()

  useEffect(() => {
    if (!anchorEl) return
    const r = anchorEl.getBoundingClientRect()
    setPos({ top: r.bottom + window.scrollY + 4, left: r.right + window.scrollX - 210 })
  }, [anchorEl])

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target) && !anchorEl?.contains(e.target)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [anchorEl])

  const openPDF = async (mode) => {
    onClose()
    const params = new URLSearchParams({ orgId })
    const url = `/api/invoices/${invoiceId}/pdf?${params}`

    if (mode === 'print') {
      params.set('print', '1')
      window.open(`/api/invoices/${invoiceId}/pdf?${params}`, '_blank')
      onOpen('Opening print dialog…', 'info')
    } else if (mode === 'download') {
      try {
        onOpen('Generating PDF…', 'info')
        // Fetch the exact invoice HTML (same template used in View PDF)
        const params = new URLSearchParams({ orgId })
        const res = await fetch(`/api/invoices/${invoiceId}/pdf?${params}`)
        if (!res.ok) throw new Error('Failed to fetch invoice')
        const html = await res.text()

        // Load html2pdf.js dynamically from CDN
        await new Promise((resolve, reject) => {
          if (window.html2pdf) return resolve()
          const s = document.createElement('script')
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
          s.onload = resolve
          s.onerror = reject
          document.head.appendChild(s)
        })

        // Create hidden container, inject invoice HTML
        const container = document.createElement('div')
        container.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;background:white;'
        container.innerHTML = html
        document.body.appendChild(container)

        // Generate and download PDF
        await window.html2pdf().set({
          margin: 0,
          filename: `${invoiceNumber}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, allowTaint: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        }).from(container.querySelector('.page') || container).save()

        document.body.removeChild(container)
        onOpen('PDF downloaded!', 'success')
      } catch(e) {
        console.error(e)
        onOpen('Download failed — try View PDF and Ctrl+P', 'error')
      }
    } else {
      window.open(url, '_blank')
      onOpen('PDF opened in new tab', 'info')
    }
  }

  if (typeof window === 'undefined') return null

  return createPortal(
    <div ref={ref} style={{ position: 'absolute', top: pos.top, left: pos.left, background: '#1E2140', border: '1px solid rgba(255,255,255,0.16)', borderRadius: 10, zIndex: 99998, minWidth: 210, overflow: 'hidden', boxShadow: '0 16px 64px rgba(0,0,0,0.8)' }}>
      <div style={{ padding: '7px 12px', fontSize: 10, fontWeight: 700, color: '#636880', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {invoiceNumber}
      </div>
      {[
        { mode: 'view',     icon: '👁', label: 'View PDF',      sub: 'Opens in new tab' },
        { mode: 'download', icon: '⬇️', label: 'Download PDF',  sub: 'Direct PDF download' },
        { mode: 'print',    icon: '🖨', label: 'Print',         sub: 'Opens print dialog' },
      ].map(({ mode, icon, label, sub }) => (
        <button key={mode} onClick={() => openPDF(mode)}
          style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.06)', color: '#9EA3BF', fontFamily: 'inherit' }}
          onMouseEnter={e => e.currentTarget.style.background = '#252848'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}>
          <span style={{ fontSize: 15, flexShrink: 0 }}>{icon}</span>
          <div>
            <div style={{ fontWeight: 500, color: '#ECEEF8', fontSize: 12 }}>{label}</div>
            <div style={{ fontSize: 10, color: '#636880', marginTop: 1 }}>{sub}</div>
          </div>
        </button>
      ))}
    </div>,
    document.body
  )
}

// ── Send Email modal ──
function SendEmailModal({ invoice, headers, toast, onClose }) {
  const [to,       setTo]      = useState(invoice.customer?.email || '')
  const [cc,       setCc]      = useState('')
  const [subject,  setSubject] = useState(`Invoice ${invoice.invoiceNumber}`)
  const [body,     setBody]    = useState('')
  const [sending,  setSending] = useState(false)
  const [loadingTpl, setLoadingTpl] = useState(true)

  // Load email template from config
  useEffect(() => {
    fetch('/api/config', { headers })
      .then(r => r.json())
      .then(cfg => {
        if (cfg.emailSubject) setSubject(
          cfg.emailSubject
            .replace('{{invoiceNumber}}', invoice.invoiceNumber)
            .replace('{{businessName}}', cfg.businessName || 'Synergific')
        )
        if (cfg.emailBody) setBody(
          cfg.emailBody
            .replace(/{{invoiceNumber}}/g, invoice.invoiceNumber)
            .replace(/{{customerName}}/g, invoice.customer?.name || 'Customer')
            .replace(/{{amount}}/g, '₹' + Number(invoice.total||0).toLocaleString('en-IN', { minimumFractionDigits: 2 }))
            .replace(/{{businessName}}/g, cfg.businessName || 'Synergific')
            .replace(/{{dueDate}}/g, invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '')
            .replace(/{{notes}}/g, invoice.notes || '')
        )
        setLoadingTpl(false)
      })
      .catch(() => setLoadingTpl(false))
  }, [])

  const send = async () => {
    if (!to.trim()) { toast('Recipient email is required', 'error'); return }
    setSending(true)
    try {
      const r = await fetch('/api/invoices/send-email', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invoice._id, to, cc, subject, body }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || d.message || 'Send failed')
      toast(`✉ Invoice sent to ${to}`)
      onClose(true) // true = refresh list
    } catch (e) {
      toast(e.message, 'error')
    }
    setSending(false)
  }

  const inputStyle = { width: '100%', padding: '8px 11px', background: 'var(--surface-2)', border: '1px solid var(--border-2)', borderRadius: 'var(--r)', fontSize: 13, color: 'var(--text)', outline: 'none', fontFamily: 'var(--font)' }
  const labelStyle = { display: 'block', fontSize: 12, color: 'var(--text-3)', fontWeight: 500, marginBottom: 5 }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="fade-up" style={{ background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-xl)', width: '100%', maxWidth: 540, boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>Send Invoice</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
              {invoice.invoiceNumber} · {invoice.customer?.name} · <span style={{ fontFamily: 'var(--mono)' }}>₹{Number(invoice.total||0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
          <button onClick={() => onClose(false)} style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--surface-3)', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        {/* Form */}
        <div style={{ padding: 20 }}>
          {loadingTpl
            ? <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>Loading template…</div>
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={labelStyle}>To <span style={{ color: 'var(--red)' }}>*</span></label>
                  <input value={to} onChange={e => setTo(e.target.value)} placeholder="customer@company.com" style={inputStyle}
                    onFocus={e => e.target.style.borderColor = 'var(--accent)'} onBlur={e => e.target.style.borderColor = 'var(--border-2)'} />
                </div>
                <div>
                  <label style={labelStyle}>CC <span style={{ color: 'var(--text-4)', fontWeight: 400 }}>(optional)</span></label>
                  <input value={cc} onChange={e => setCc(e.target.value)} placeholder="accounts@company.com" style={inputStyle}
                    onFocus={e => e.target.style.borderColor = 'var(--accent)'} onBlur={e => e.target.style.borderColor = 'var(--border-2)'} />
                </div>
                <div>
                  <label style={labelStyle}>Subject</label>
                  <input value={subject} onChange={e => setSubject(e.target.value)} style={inputStyle}
                    onFocus={e => e.target.style.borderColor = 'var(--accent)'} onBlur={e => e.target.style.borderColor = 'var(--border-2)'} />
                </div>
                <div>
                  <label style={labelStyle}>Message</label>
                  <textarea value={body} onChange={e => setBody(e.target.value)} rows={6}
                    style={{ ...inputStyle, resize: 'vertical' }}
                    onFocus={e => e.target.style.borderColor = 'var(--accent)'} onBlur={e => e.target.style.borderColor = 'var(--border-2)'} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-4)', display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span>📎</span> Invoice PDF will be attached automatically
                </div>
              </div>
            )
          }
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8, background: 'var(--bg-3)' }}>
          <Btn onClick={() => onClose(false)}>Cancel</Btn>
          <Btn variant="primary" onClick={send} disabled={sending || loadingTpl}>
            {sending ? 'Sending…' : '📤 Send Invoice'}
          </Btn>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Main list ──
export default function InvoiceList({ org, headers, toast, onEdit, readOnly = false }) {
  const [invoices, setInvoices]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [statusFilter, setSF]       = useState('')
  const [total, setTotal]           = useState(0)
  const [pdfMenu, setPdfMenu]       = useState(null)
  const [emailModal, setEmailModal] = useState(null)
  const [paymentModal, setPaymentModal] = useState(null)

  const load = () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (search) p.set('search', search)
    if (statusFilter) p.set('status', statusFilter)
    fetch(`/api/invoices?${p}`, { headers })
      .then(r => r.json())
      .then(d => { setInvoices(d.invoices || []); setTotal(d.total || 0); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [org.id, search, statusFilter])

  const markStatus = async (e, inv, status) => {
    e.stopPropagation()
    await fetch(`/api/invoices/${inv._id}`, {
      method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    toast(`Marked as ${status}`)
    load()
  }

  const sharePortal = async (e, inv) => {
    e.stopPropagation()
    try {
      const r = await fetch('/api/portal', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: inv._id }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      await navigator.clipboard.writeText(d.url)
      toast('Payment link copied to clipboard! 🔗', 'success')
    } catch (e) {
      toast(e.message || 'Failed to generate link', 'error')
    }
  }

  const shareWhatsApp = async (e, inv) => {
    e.stopPropagation()
    try {
      const r = await fetch('/api/portal', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: inv._id }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      const amt = new Intl.NumberFormat('en-IN', { style:'currency', currency: inv.currency||'INR', maximumFractionDigits:0 }).format(inv.total || 0)
      const custName = inv.customer?.name || 'there'
      const msg = `Hi ${custName},\n\nPlease find your invoice *${inv.invoiceNumber}* for *${amt}*.\n\nClick the link below to view and pay securely:\n${d.url}\n\nThank you for your business!`
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
    } catch (err) {
      toast(err.message || 'Failed to generate WhatsApp link', 'error')
    }
  }

  const sendReminder = async (e, inv) => {
    e.stopPropagation()
    try {
      const r = await fetch('/api/reminders', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: inv._id }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Failed')
      toast(d.message || 'Reminder sent!')
      load()
    } catch(e) { toast(e.message, 'error') }
  }

  const del = async (e, inv) => {
    e.stopPropagation()
    if (!confirm(`Delete ${inv.invoiceNumber}?`)) return
    await fetch(`/api/invoices/${inv._id}`, { method: 'DELETE', headers })
    toast('Invoice deleted')
    load()
  }

  const PILLS = [
    { label: 'Due',     filter: 'Draft',   color: 'var(--amber-text)' },
    { label: 'Sent',    filter: 'Sent',    color: 'var(--blue-text)' },
    { label: 'Paid',    filter: 'Paid',    color: 'var(--green-text)' },
    { label: 'Overdue', filter: 'Overdue', color: 'var(--red-text)' },
  ]

  return (
    <div>
      {/* Portals */}
      {pdfMenu && (
        <PDFDropdown
          invoiceId={pdfMenu.id} invoiceNumber={pdfMenu.number} orgId={org.id}
          anchorEl={pdfMenu.el} onClose={() => setPdfMenu(null)}
          onOpen={(msg, type) => toast(msg, type)}
        />
      )}
      {paymentModal && (
        <RecordPaymentModal
          invoice={paymentModal}
          headers={headers}
          toast={toast}
          onClose={(refresh) => { setPaymentModal(null); if (refresh) load() }}
        />
      )}
      {emailModal && (
        <SendEmailModal
          invoice={emailModal}
          headers={headers}
          toast={toast}
          onClose={(refresh) => { setEmailModal(null); if (refresh) load() }}
        />
      )}

      {/* Send Email Modal */}
      {paymentModal && (
        <RecordPaymentModal
          invoice={paymentModal}
          headers={headers}
          toast={toast}
          onClose={(refresh) => { setPaymentModal(null); if (refresh) load() }}
        />
      )}
      {emailModal && (
        <SendEmailModal
          invoice={emailModal}
          headers={headers}
          toast={toast}
          onClose={(refresh) => { setEmailModal(null); if (refresh) load() }}
        />
      )}

      {/* Status pills */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        {PILLS.map(({ label, filter, color }) => {
          const items = invoices.filter(i => i.status === filter || (filter === 'Draft' && i.status === 'Due'))
          const active = statusFilter === filter
          return (
            <button key={label} onClick={() => setSF(active ? '' : filter)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
              padding: '10px 16px', minWidth: 130,
              background: active ? 'var(--surface-2)' : 'var(--surface)',
              border: `1px solid ${active ? 'var(--border-3)' : 'var(--border)'}`,
              borderRadius: 'var(--r-md)', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'var(--font)',
            }}>
              <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500, marginBottom: 3 }}>{label}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 700, color }}>{items.length}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
                {fmt(items.reduce((s, i) => s + (i.total || 0), 0))}
              </div>
            </button>
          )
        })}
      </div>

      <Card>
        <div style={{ display: 'flex', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', alignItems: 'center' }}>
          <SearchBar value={search} onChange={setSearch} placeholder="Search invoices…" />
          <select value={statusFilter} onChange={e => setSF(e.target.value)}
            style={{ padding: '7px 11px', background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 'var(--r)', fontSize: 13, color: 'var(--text)', cursor: 'pointer', outline: 'none', fontFamily: 'var(--font)' }}>
            <option value="">All status</option>
            <option value="Draft" style={{ background: 'var(--bg-2)' }}>Due</option>
            {['Sent','Paid','Overdue','Cancelled'].map(s => (
              <option key={s} value={s} style={{ background: 'var(--bg-2)' }}>{s}</option>
            ))}
          </select>
          <Btn size="sm" onClick={load}>↻</Btn>
        </div>

        {loading
          ? <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)' }}>Loading…</div>
          : invoices.length === 0
            ? <EmptyState message="No invoices yet. Create your first invoice." />
            : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Invoice #','Customer','Date','Due Date','Status','Total','Paid',''].map((h,i) => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: i===5||i===6?'right':'left', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', background: 'var(--bg-3)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv._id} onClick={() => onEdit(inv)}
                      style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--accent-2)', fontSize: 12 }}>{inv.invoiceNumber}</span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 500, color: 'var(--text)' }}>{inv.customer?.name || '—'}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{inv.customer?.email || ''}</div>
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--text-2)', fontSize: 12 }}>{fmtDate(inv.issueDate)}</td>
                      <td style={{ padding: '12px 14px', fontSize: 12, color: inv.status==='Overdue'?'var(--red-text)':'var(--text-3)' }}>{fmtDate(inv.dueDate)}</td>
                      <td style={{ padding: '12px 14px' }}><Badge status={inv.status==='Draft'?'Due':inv.status} /></td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--text)' }}>{fmt(inv.total)}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12, color: (inv.paidAmount||0)>=(inv.total||0)?'var(--green-text)':(inv.paidAmount||0)>0?'var(--amber-text)':'var(--text-4)' }}>
                        {fmt(inv.paidAmount||0)}
                      </td>
                      <td style={{ padding: '12px 14px' }} onClick={e => e.stopPropagation()}>
                      {readOnly ? (
                        <div style={{ display:'flex', gap:5, justifyContent:'flex-end' }}>
                          <Btn size="sm" onClick={e => { e.stopPropagation(); setPdfMenu({ id: inv._id, number: inv.invoiceNumber, el: e.currentTarget }) }}>PDF ▾</Btn>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end', alignItems: 'center' }}>
                          {(inv.status==='Draft'||inv.status==='Due') && (
                            <>
                              <Btn size="sm" onClick={e => { e.stopPropagation(); setEmailModal(inv) }}>✉ Send</Btn>
                              <Btn size="sm" variant="primary" onClick={e => { e.stopPropagation(); setPaymentModal(inv) }}>💳 Pay</Btn>
                            </>
                          )}
                          {inv.status==='Sent' && (
                            <>
                              <Btn size="sm" variant="primary" onClick={e => { e.stopPropagation(); setPaymentModal(inv) }}>💳 Pay</Btn>
                            </>
                          )}
                          {inv.status==='Overdue' && (
                            <>
                              <Btn size="sm" variant="danger" onClick={e => sendReminder(e, inv)} title="Send overdue reminder email">⚠ Remind</Btn>
                              <Btn size="sm" variant="primary" onClick={e => { e.stopPropagation(); setPaymentModal(inv) }}>💳 Pay</Btn>
                            </>
                          )}
                          <Btn size="sm"
                            onClick={e => {
                              e.stopPropagation()
                              if (pdfMenu?.id===inv._id) { setPdfMenu(null); return }
                              setPdfMenu({ id: inv._id, number: inv.invoiceNumber, el: e.currentTarget })
                            }}>
                            PDF ▾
                          </Btn>
                          {inv.status !== 'Paid' && inv.status !== 'Cancelled' && (
                            <button onClick={e => shareWhatsApp(e, inv)} title="Share via WhatsApp"
                              style={{ padding:'4px 8px', background:'#25D366', border:'none', borderRadius:'var(--r-sm)', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', gap:4, color:'#fff', fontWeight:600, fontFamily:'var(--font)' }}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.112 1.523 5.84L0 24l6.336-1.502A11.955 11.955 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.882a9.878 9.878 0 01-5.031-1.378l-.36-.214-3.733.885.933-3.608-.235-.372A9.844 9.844 0 012.118 12C2.118 6.98 6.98 2.118 12 2.118c5.019 0 9.882 4.862 9.882 9.882 0 5.019-4.863 9.882-9.882 9.882z"/></svg>
                              WA
                            </button>
                          )}
                          <Btn size="sm" onClick={e => { e.stopPropagation(); setEmailModal(inv) }}>✉</Btn>
                          <Btn size="sm" onClick={e => { e.stopPropagation(); onEdit(inv) }}>Edit</Btn>
                          <Btn size="sm" variant="danger" onClick={e => del(e,inv)}>✕</Btn>
                        </div>
                      )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
        }

        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-3)', display: 'flex', justifyContent: 'space-between' }}>
          <span>{total} invoice{total!==1?'s':''}</span>
          <span>{org.name}</span>
        </div>
      </Card>
    </div>
  )
}