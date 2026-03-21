import { useState, useEffect } from 'react'
import Head from 'next/head'

const fmt = n => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'

function loadRazorpay() {
  return new Promise(resolve => {
    if (window.Razorpay) return resolve(true)
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = () => resolve(true); s.onerror = () => resolve(false)
    document.body.appendChild(s)
  })
}

export default function PaymentPortal({ token }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [paying, setPaying]   = useState(false)
  const [paid, setPaid]       = useState(false)
  const [msg, setMsg]         = useState('')

  useEffect(() => {
    if (!token) return
    fetch(`/api/portal/pay?token=${token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setData(d)
        setLoading(false)
      })
      .catch(() => { setError('Failed to load invoice'); setLoading(false) })
  }, [token])

  const handlePay = async () => {
    setPaying(true)
    try {
      const loaded = await loadRazorpay()
      if (!loaded) throw new Error('Payment system failed to load')

      const orderRes = await fetch(`/api/portal/pay?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create-order' }),
      })
      const order = await orderRes.json()
      if (!orderRes.ok) throw new Error(order.error)

      const options = {
        key: order.razorpayKeyId || data.razorpayKeyId,
        amount: order.amount,
        currency: order.currency,
        name: data.org.businessName,
        description: `Payment for ${data.invoice.invoiceNumber}`,
        order_id: order.orderId,
        prefill: order.prefill,
        theme: { color: '#6366F1' },
        modal: { ondismiss: () => setPaying(false) },
        handler: async (response) => {
          const vr = await fetch(`/api/portal/pay?token=${token}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'verify', ...response }),
          })
          const vd = await vr.json()
          if (vr.ok) { setPaid(true); setMsg(vd.message) }
          else setMsg(vd.error || 'Verification failed')
          setPaying(false)
        },
      }
      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', r => { setMsg(`Payment failed: ${r.error.description}`); setPaying(false) })
      rzp.open()
    } catch (e) {
      setMsg(e.message)
      setPaying(false)
    }
  }

  // ── Styles ──
  const PAGE = { minHeight: '100vh', background: '#0D0F1A', fontFamily: "'DM Sans', system-ui, sans-serif", padding: '32px 16px', color: '#ECEEF8' }
  const CARD = { background: '#1E2140', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden', maxWidth: 640, margin: '0 auto' }
  const MONO = { fontFamily: "'DM Mono', monospace" }

  if (loading) return (
    <div style={{ ...PAGE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: '#636880' }}>Loading invoice…</div>
    </div>
  )

  if (error) return (
    <div style={{ ...PAGE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>❌</div>
        <div style={{ fontSize: 16, color: '#FCA5A5' }}>{error}</div>
        <div style={{ fontSize: 13, color: '#636880', marginTop: 8 }}>This link may be invalid or expired.</div>
      </div>
    </div>
  )

  const { invoice, org } = data
  const balance = (invoice.total || 0) - (invoice.paidAmount || 0)
  const isPaid = invoice.status === 'Paid' || paid
  const isOverdue = !isPaid && invoice.dueDate && new Date(invoice.dueDate) < new Date()

  return (
    <>
      <Head>
        <title>{invoice.invoiceNumber} — {org.businessName}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </Head>
      <div style={PAGE}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>

          {/* Brand header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {org.logoUrl
                ? <img src={org.logoUrl} alt={org.businessName} style={{ height: 36, maxWidth: 120, objectFit: 'contain' }} />
                : <div style={{ fontSize: 16, fontWeight: 700, color: '#ECEEF8' }}>{org.businessName}</div>
              }
            </div>
            <div style={{ fontSize: 12, color: '#636880' }}>Secure payment powered by Razorpay</div>
          </div>

          <div style={CARD}>
            {/* Status banner */}
            {isPaid && (
              <div style={{ padding: '14px 20px', background: 'rgba(16,185,129,0.15)', borderBottom: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>✅</span>
                <div>
                  <div style={{ fontWeight: 700, color: '#6EE7B7' }}>Payment received — Thank you!</div>
                  <div style={{ fontSize: 12, color: '#9EA3BF', marginTop: 2 }}>{msg || 'This invoice has been paid in full.'}</div>
                </div>
              </div>
            )}
            {isOverdue && !isPaid && (
              <div style={{ padding: '10px 20px', background: 'rgba(239,68,68,0.12)', borderBottom: '1px solid rgba(239,68,68,0.2)', fontSize: 12, color: '#FCA5A5', fontWeight: 600 }}>
                ⚠ This invoice is overdue — due {fmtDate(invoice.dueDate)}
              </div>
            )}

            {/* Invoice header */}
            <div style={{ padding: '24px 24px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 11, color: '#636880', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Invoice</div>
                  <div style={{ ...MONO, fontSize: 20, fontWeight: 700, color: '#818CF8' }}>{invoice.invoiceNumber}</div>
                  <div style={{ fontSize: 12, color: '#9EA3BF', marginTop: 6 }}>
                    Issued {fmtDate(invoice.issueDate)}
                    {invoice.dueDate && <> · Due <span style={{ color: isOverdue ? '#FCA5A5' : '#9EA3BF' }}>{fmtDate(invoice.dueDate)}</span></>}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: '#636880', marginBottom: 4 }}>Amount due</div>
                  <div style={{ ...MONO, fontSize: 28, fontWeight: 700, color: isPaid ? '#6EE7B7' : '#ECEEF8' }}>{fmt(isPaid ? 0 : balance)}</div>
                </div>
              </div>
            </div>

            {/* Bill to */}
            <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#636880', marginBottom: 6 }}>Bill To</div>
                <div style={{ fontWeight: 600, color: '#ECEEF8' }}>{invoice.customer?.name}</div>
                <div style={{ fontSize: 12, color: '#9EA3BF', marginTop: 2 }}>{invoice.customer?.email}</div>
                {invoice.customer?.address && <div style={{ fontSize: 12, color: '#9EA3BF', marginTop: 1 }}>{invoice.customer.address}</div>}
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#636880', marginBottom: 6 }}>From</div>
                <div style={{ fontWeight: 600, color: '#ECEEF8' }}>{org.businessName}</div>
                {org.businessEmail && <div style={{ fontSize: 12, color: '#9EA3BF', marginTop: 2 }}>{org.businessEmail}</div>}
                {org.gstin && <div style={{ fontSize: 11, color: '#636880', marginTop: 2, ...MONO }}>GSTIN: {org.gstin}</div>}
              </div>
            </div>

            {/* Line items */}
            <div style={{ padding: '0 24px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Description', 'Qty', 'Rate', 'Tax', 'Amount'].map((h, i) => (
                      <th key={h} style={{ padding: '10px 0', textAlign: i > 0 ? 'right' : 'left', fontSize: 11, fontWeight: 600, color: '#636880', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(invoice.lineItems || []).map((item, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '10px 0', color: '#ECEEF8' }}>{item.description}</td>
                      <td style={{ padding: '10px 0', textAlign: 'right', color: '#9EA3BF', ...MONO }}>{item.qty}</td>
                      <td style={{ padding: '10px 0', textAlign: 'right', color: '#9EA3BF', ...MONO }}>{fmt(item.rate)}</td>
                      <td style={{ padding: '10px 0', textAlign: 'right', color: '#9EA3BF' }}>{item.tax || 0}%</td>
                      <td style={{ padding: '10px 0', textAlign: 'right', fontWeight: 600, color: '#ECEEF8', ...MONO }}>
                        {fmt((item.qty||0)*(item.rate||0)*(1+(item.tax||0)/100))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ width: 260 }}>
                {[['Subtotal', fmt(invoice.subtotal)], ['Tax (GST)', fmt(invoice.taxTotal)]].map(([l, v]) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, color: '#636880', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span>{l}</span><span style={MONO}>{v}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', fontSize: 17, fontWeight: 700 }}>
                  <span style={{ color: '#9EA3BF' }}>Total</span>
                  <span style={{ ...MONO, color: '#ECEEF8' }}>{fmt(invoice.total)}</span>
                </div>
                {invoice.paidAmount > 0 && !isPaid && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, color: '#6EE7B7' }}>
                    <span>Already paid</span><span style={MONO}>− {fmt(invoice.paidAmount)}</span>
                  </div>
                )}
                {!isPaid && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', fontSize: 18, fontWeight: 700, borderTop: '2px solid #6366F1', marginTop: 6 }}>
                    <span style={{ color: '#A5B4FC' }}>Balance Due</span>
                    <span style={{ ...MONO, color: '#818CF8' }}>{fmt(balance)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div style={{ padding: '14px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(245,158,11,0.06)', fontSize: 12, color: '#9EA3BF', lineHeight: 1.6 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#636880', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>Notes</div>
                {invoice.notes}
              </div>
            )}

            {/* Pay button */}
            {!isPaid && balance > 0 && data.razorpayKeyId && (
              <div style={{ padding: '20px 24px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                {msg && <div style={{ marginBottom: 12, fontSize: 13, color: '#FCA5A5', textAlign: 'center' }}>{msg}</div>}
                <button onClick={handlePay} disabled={paying}
                  style={{ width: '100%', padding: '14px', background: paying ? '#3A3E5C' : '#6366F1', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: paying ? 'not-allowed' : 'pointer', fontFamily: 'inherit', boxShadow: paying ? 'none' : '0 4px 24px rgba(99,102,241,0.4)', transition: 'all 0.15s' }}>
                  {paying ? 'Opening payment…' : `Pay ${fmt(balance)} securely →`}
                </button>
                <div style={{ textAlign: 'center', fontSize: 11, color: '#636880', marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  🔒 Secured by Razorpay · UPI · Cards · Net Banking · Wallets
                </div>
              </div>
            )}

            {!data.razorpayKeyId && !isPaid && (
              <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center', fontSize: 13, color: '#636880' }}>
                Contact {org.businessEmail || org.businessName} to arrange payment.
                {org.upiId && <div style={{ marginTop: 8, ...MONO, color: '#A5B4FC' }}>UPI: {org.upiId}</div>}
              </div>
            )}
          </div>

          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: '#3A3E5C' }}>
            Powered by Synergific Books
          </div>
        </div>
      </div>
    </>
  )
}

export async function getServerSideProps({ params }) {
  return { props: { token: params?.token || null } }
}