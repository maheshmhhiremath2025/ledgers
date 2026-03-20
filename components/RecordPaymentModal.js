import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Btn, fmt, fmtDate } from './ui'

const METHODS = ['Bank Transfer', 'UPI', 'Cash', 'Cheque', 'Card', 'Other']

export default function RecordPaymentModal({ invoice, headers, toast, onClose }) {
  const [amount,      setAmount]      = useState('')
  const [method,      setMethod]      = useState('Bank Transfer')
  const [payDate,     setPayDate]     = useState(new Date().toISOString().split('T')[0])
  const [reference,   setReference]   = useState('')
  const [notes,       setNotes]       = useState('')
  const [saving,      setSaving]      = useState(false)
  const [history,     setHistory]     = useState([])
  const [loadingHist, setLoadingHist] = useState(true)

  const balance   = (invoice.total || 0) - (invoice.paidAmount || 0)
  const paying    = Math.min(parseFloat(amount) || 0, balance)
  const afterPay  = balance - paying
  const isFullPay = afterPay <= 0.01

  useEffect(() => {
    // Load payment history
    fetch(`/api/invoices/payments?invoiceId=${invoice._id}`, { headers })
      .then(r => r.json())
      .then(d => { setHistory(d.payments || []); setLoadingHist(false) })
      .catch(() => setLoadingHist(false))
  }, [])

  const record = async () => {
    if (!paying || paying <= 0) { toast('Enter a valid amount', 'error'); return }
    setSaving(true)
    try {
      const r = await fetch('/api/invoices/pay', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId:   invoice._id,
          amount:      paying,
          paymentMode: method,
          paymentDate: payDate,
          reference,
          notes,
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      toast(d.message)
      onClose(true)
    } catch (e) { toast(e.message, 'error') }
    setSaving(false)
  }

  const inputStyle = {
    width: '100%', padding: '9px 12px',
    background: 'var(--surface-2)', border: '1px solid var(--border-2)',
    borderRadius: 'var(--r)', fontSize: 13, color: 'var(--text)',
    outline: 'none', fontFamily: 'var(--font)',
  }
  const labelStyle = { display: 'block', fontSize: 12, color: 'var(--text-3)', fontWeight: 500, marginBottom: 5 }

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="fade-up" style={{ background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-xl)', width: '100%', maxWidth: 520, boxShadow: 'var(--shadow-lg)', overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>Record Payment</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
              {invoice.invoiceNumber} · {invoice.customer?.name}
            </div>
          </div>
          <button onClick={() => onClose(false)} style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--surface-3)', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        <div style={{ overflow: 'auto', flex: 1 }}>
          {/* Balance summary */}
          <div style={{ padding: '14px 20px', background: 'var(--bg-3)', borderBottom: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {[
              { label: 'Invoice Total', value: fmt(invoice.total),             color: 'var(--text)' },
              { label: 'Already Paid',  value: fmt(invoice.paidAmount || 0),   color: 'var(--green-text)' },
              { label: 'Balance Due',   value: fmt(balance),                    color: balance > 0 ? 'var(--amber-text)' : 'var(--green-text)' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 700, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Payment history */}
          {history.length > 0 && (
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Payment History</div>
              {history.map((p, i) => (
                <div key={p._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: i < history.length - 1 ? '1px solid var(--border)' : 'none', fontSize: 13 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent-2)', fontWeight: 600 }}>{p.paymentNumber}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{p.paymentMode}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 1 }}>{fmtDate(p.paymentDate)}{p.reference ? ` · ${p.reference}` : ''}</div>
                  </div>
                  <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--green-text)' }}>{fmt(p.amount)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Payment form */}
          {balance > 0 ? (
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Amount + quick buttons */}
              <div>
                <label style={labelStyle}>Amount (₹) *</label>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                  placeholder={`Max ${balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                  style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)' }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border-2)'; e.target.style.boxShadow = 'none' }} />
                {/* Quick amount buttons */}
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  {[25, 50, 75, 100].map(pct => (
                    <button key={pct} onClick={() => setAmount(((balance * pct) / 100).toFixed(2))}
                      style={{ padding: '4px 10px', fontSize: 11, fontWeight: 600, background: 'var(--surface-2)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-sm)', cursor: 'pointer', color: 'var(--text-2)', fontFamily: 'var(--font)' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-2)'}>
                      {pct === 100 ? 'Full amount' : `${pct}%`}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Payment Mode</label>
                  <select value={method} onChange={e => setMethod(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}
                    onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border-2)'}>
                    {METHODS.map(m => <option key={m} value={m} style={{ background: 'var(--bg-2)' }}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Payment Date</label>
                  <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} style={inputStyle}
                    onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border-2)'} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Reference / Transaction ID <span style={{ color: 'var(--text-4)', fontWeight: 400 }}>(optional)</span></label>
                <input value={reference} onChange={e => setReference(e.target.value)} placeholder="UTR number, cheque no., etc." style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border-2)'} />
              </div>

              <div>
                <label style={labelStyle}>Notes <span style={{ color: 'var(--text-4)', fontWeight: 400 }}>(optional)</span></label>
                <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. First instalment" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border-2)'} />
              </div>

              {/* After-payment preview */}
              {paying > 0 && (
                <div style={{ padding: '12px 14px', background: isFullPay ? 'var(--green-dim)' : 'var(--accent-dim)', border: `1px solid ${isFullPay ? 'rgba(16,185,129,0.25)' : 'rgba(99,102,241,0.2)'}`, borderRadius: 'var(--r-md)', fontSize: 13 }}>
                  {isFullPay ? (
                    <div style={{ color: 'var(--green-text)', fontWeight: 600 }}>✓ This will fully settle the invoice</div>
                  ) : (
                    <div>
                      <span style={{ color: 'var(--accent-2)', fontWeight: 600 }}>After this payment: </span>
                      <span style={{ color: 'var(--text-2)' }}>{fmt(afterPay)} will remain outstanding</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: '24px 20px', textAlign: 'center', color: 'var(--green-text)', fontSize: 14, fontWeight: 600 }}>
              ✓ Invoice fully paid
            </div>
          )}
        </div>

        {/* Footer */}
        {balance > 0 && (
          <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 8, background: 'var(--bg-3)', flexShrink: 0 }}>
            <Btn onClick={() => onClose(false)}>Cancel</Btn>
            <Btn variant="primary" onClick={record} disabled={saving || !paying || paying <= 0}>
              {saving ? 'Recording…' : `💳 Record ${paying > 0 ? fmt(paying) : ''} Payment`}
            </Btn>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}