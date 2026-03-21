import { useState, useEffect } from 'react'
import { Btn, Card, SectionTitle } from './ui'

const PC = {
  starter:      { color: '#9EA3BF', bg: 'rgba(158,163,191,0.08)', border: 'rgba(158,163,191,0.18)' },
  professional: { color: '#3B82F6', bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.22)' },
  business:     { color: '#6366F1', bg: 'rgba(99,102,241,0.08)',  border: 'rgba(99,102,241,0.22)' },
}

const PLANS = [
  {
    id: 'starter', name: 'Starter', price: 0, display: '₹0', period: 'free forever',
    tagline: 'Freelancers & solo consultants',
    features: ['5 invoices / month', '3 purchase orders / month', '1 organisation', 'Classic PDF template', 'Chart of accounts'],
    locked: ['Logo upload', 'GST & bank configuration', 'Saved customers', 'Multiple PDF templates'],
  },
  {
    id: 'professional', name: 'Professional', price: 999, display: '₹999', period: '/month',
    tagline: 'Growing businesses', popular: true,
    features: ['Unlimited invoices & POs', '2 organisations', 'All 5 PDF templates', 'Logo on invoices', 'GST, PAN, bank & UPI config', 'Saved customers & vendors', 'Authorized signatory on PDF'],
    locked: ['Team members', 'CSV export', 'API access'],
  },
  {
    id: 'business', name: 'Business', price: 2499, display: '₹2,499', period: '/month',
    tagline: 'Teams & enterprises',
    features: ['Everything in Professional', '3 organisations', '5 team members', 'Role-based access', 'CSV / Excel export', 'API access', 'Priority support'],
    locked: [],
  },
]

function UsageBar({ label, used, limit, color }) {
  const unlimited = !limit || limit > 9999
  const safeUsed  = Number(used) || 0
  const safeLimit = unlimited ? 0 : Number(limit)
  const pct  = unlimited ? 0 : safeLimit > 0 ? Math.min(100, Math.round((safeUsed / safeLimit) * 100)) : 0
  const warn = !unlimited && pct >= 80
  const hit  = !unlimited && pct >= 100
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>{label}</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: unlimited ? 'var(--green-text)' : hit ? 'var(--red-text)' : warn ? 'var(--amber-text)' : 'var(--text-3)' }}>
          {unlimited ? '∞ unlimited' : `${safeUsed} / ${safeLimit} used`}
        </span>
      </div>
      {!unlimited && (
        <div style={{ height: 6, background: 'var(--surface-3)', borderRadius: 99, overflow: 'hidden', width: '100%' }}>
          <div style={{ height: '100%', width: `${pct}%`, minWidth: pct > 0 ? 6 : 0, background: hit ? 'var(--red)' : warn ? 'var(--amber)' : (color || 'var(--accent)'), borderRadius: 99, transition: 'width 0.5s ease' }} />
        </div>
      )}
      {!unlimited && warn && (
        <div style={{ fontSize: 11, color: hit ? 'var(--red-text)' : 'var(--amber-text)', marginTop: 5 }}>
          {hit ? '⚠ Limit reached — upgrade to continue' : `${100 - pct}% remaining this month`}
        </div>
      )}
    </div>
  )
}

function Check({ ok }) {
  return ok
    ? <div style={{ width:18,height:18,borderRadius:'50%',background:'var(--green-dim)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="var(--green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>
    : <div style={{ width:18,height:18,borderRadius:'50%',background:'var(--surface-3)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 1l6 6M7 1L1 7" stroke="var(--text-4)" strokeWidth="1.5" strokeLinecap="round"/></svg>
      </div>
}

function loadRazorpay() {
  return new Promise(resolve => {
    if (window.Razorpay) return resolve(true)
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = () => resolve(true)
    s.onerror = () => resolve(false)
    document.body.appendChild(s)
  })
}

export default function BillingPage({ headers, toast, user }) {
  const [billing, setBilling]         = useState(null)
  const [loading, setLoading]         = useState(true)
  const [paying, setPaying]           = useState(null)
  const [showPlans, setShowPlans]     = useState(false)
  const [downgrading, setDowngrading] = useState(false)

  // Always include credentials AND userId for double authentication
  const apiFetch = (url, opts = {}) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('sb_token') : null
    const body = opts.body ? JSON.parse(opts.body) : null
    if (body && opts.method === 'POST' && user?.userId) body.userId = user.userId
    return fetch(url, {
      ...opts,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(opts.headers || {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  const load = () => {
    setLoading(true)
    apiFetch('/api/billing')
      .then(r => r.json())
      .then(d => { setBilling(d); setLoading(false) })
      .catch(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const doDowngrade = async () => {
    if (!confirm('Downgrade to Starter? You will lose Pro features.')) return
    setDowngrading(true)
    const r = await apiFetch('/api/billing', { method: 'POST', body: JSON.stringify({ newPlan: 'starter' }) })
    const d = await r.json()
    if (r.ok) { toast('Downgraded to Starter plan'); load(); setShowPlans(false) }
    else toast(d.error || 'Failed', 'error')
    setDowngrading(false)
  }

  const handleUpgrade = async (planId) => {
    if (planId === 'starter') return doDowngrade()
    setPaying(planId)
    try {
      const loaded = await loadRazorpay()
      if (!loaded) throw new Error('Razorpay failed to load. Check your internet connection.')

      const orderRes = await apiFetch('/api/billing/create-order', {
        method: 'POST',
        body: JSON.stringify({ plan: planId }),
      })
      const orderData = await orderRes.json()
      if (!orderRes.ok) throw new Error(orderData.error || 'Order creation failed')

      const options = {
        key:         orderData.keyId,
        amount:      orderData.amount,
        currency:    orderData.currency,
        name:        'Synergific Books',
        description: `${orderData.planName} Plan — Monthly`,
        order_id:    orderData.orderId,
        prefill:     orderData.prefill,
        theme:       { color: '#6366F1' },
        modal:       { ondismiss: () => setPaying(null) },
        handler: async (response) => {
          const vr = await apiFetch('/api/billing/verify-payment', {
            method: 'POST',
            body: JSON.stringify({ ...response, plan: planId }),
          })
          const vd = await vr.json()
          if (vr.ok) {
            toast(`🎉 ${vd.message || 'Plan activated!'}`)
            load()
            setShowPlans(false)
          } else {
            toast(vd.error || 'Payment verification failed', 'error')
          }
          setPaying(null)
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', r => { toast(`Payment failed: ${r.error.description}`, 'error'); setPaying(null) })
      rzp.open()
    } catch (e) {
      toast(e.message || 'Payment failed', 'error')
      setPaying(null)
    }
  }

  if (loading) return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 80, marginBottom: 12, borderRadius: 'var(--r-lg)' }} />)}
    </div>
  )
  if (!billing) return null

  const planMeta  = PLANS.find(p => p.id === billing.plan) || PLANS[0]
  const pc        = PC[billing.plan] || PC.starter
  const inv       = billing.usage?.invoices || { used: 0, limit: 5 }
  const po        = billing.usage?.pos      || { used: 0, limit: 3 }
  const isStarter = billing.plan === 'starter'
  const isPro     = billing.plan === 'professional'
  const isBiz     = billing.plan === 'business'
  const isAdmin   = user?.role === 'admin' // only admins can change plan

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.4px' }}>Billing & Plan</h2>
          <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>Manage your subscription and track usage</p>
        </div>
        {isAdmin && (
          <Btn variant="primary" onClick={() => setShowPlans(s => !s)}>
            {showPlans ? '✕ Hide Plans' : isStarter ? '⚡ Upgrade Plan' : '⚙ Change Plan'}
          </Btn>
        )}
      </div>

      <Card style={{ padding: 22, marginBottom: 16, border: `1px solid ${pc.border}`, background: pc.bg }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: pc.color }}>{planMeta.name} Plan</span>
              {billing.isTrialing && (
                <span style={{ fontSize: 11, fontWeight: 600, background: 'var(--green-dim)', color: 'var(--green-text)', padding: '2px 9px', borderRadius: 99, border: '1px solid rgba(16,185,129,0.2)' }}>Free trial</span>
              )}
              {!isStarter && !billing.isTrialing && (
                <span style={{ fontSize: 11, fontWeight: 600, background: pc.bg, color: pc.color, padding: '2px 9px', borderRadius: 99, border: `1px solid ${pc.border}` }}>Active</span>
              )}
              {isStarter && (
                <span style={{ fontSize: 11, fontWeight: 600, background: 'var(--surface-2)', color: 'var(--text-3)', padding: '2px 9px', borderRadius: 99, border: '1px solid var(--border-2)' }}>Free</span>
              )}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-3)' }}>{planMeta.tagline}</div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 24, fontWeight: 700, color: pc.color }}>{planMeta.display}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{planMeta.period}</div>
          </div>
        </div>

        {billing.isTrialing && billing.trialEndsAt && (
          <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--r)', marginBottom: 16, fontSize: 12, color: 'var(--green-text)' }}>
            ⏰ Trial ends {new Date(billing.trialEndsAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })} — add payment to keep access.
          </div>
        )}
        {billing.planExpiry && !billing.isTrialing && !isStarter && (
          <div style={{ padding: '10px 14px', background: 'var(--blue-dim)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 'var(--r)', marginBottom: 16, fontSize: 12, color: 'var(--blue-text)' }}>
            📅 Next billing: {new Date(billing.planExpiry).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
          </div>
        )}

        <SectionTitle>Usage — {billing.usage?.period}</SectionTitle>
        <UsageBar label="Invoices created"        used={inv.used} limit={inv.limit} color={pc.color} />
        <UsageBar label="Purchase orders created" used={po.used}  limit={po.limit}  color={pc.color} />

        {isAdmin && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            {isStarter && <Btn variant="primary" onClick={() => setShowPlans(true)}>⚡ Upgrade to Professional</Btn>}
            {isPro && <>
              <Btn variant="primary" onClick={() => setShowPlans(true)}>⬆ Upgrade to Business</Btn>
              <Btn size="sm" variant="danger" onClick={doDowngrade} disabled={downgrading}>{downgrading ? 'Downgrading…' : 'Downgrade to Free'}</Btn>
            </>}
            {isBiz && <Btn size="sm" variant="danger" onClick={doDowngrade} disabled={downgrading}>{downgrading ? 'Downgrading…' : 'Downgrade to Free'}</Btn>}
            {!isStarter && (
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>
                💡 <b>Auto-renewal:</b> Your plan renews automatically each month. Contact support to cancel.
              </div>
            )}
          </div>
        )}
        {!isAdmin && (
          <div style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 8, padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 'var(--r)', border: '1px solid var(--border)' }}>
            Only the org admin can change the plan.
          </div>
        )}
      </Card>

      <Card style={{ padding: 20, marginBottom: 16 }}>
        <SectionTitle>Your plan includes</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 24px' }}>
          {planMeta.features.map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8, fontSize: 13 }}>
              <Check ok={true} /><span style={{ color: 'var(--text-2)', lineHeight: 1.4 }}>{f}</span>
            </div>
          ))}
          {planMeta.locked.map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8, fontSize: 13 }}>
              <Check ok={false} /><span style={{ color: 'var(--text-4)', lineHeight: 1.4 }}>{f}</span>
            </div>
          ))}
        </div>
      </Card>

      {showPlans && isAdmin && (
        <div className="fade-up">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.3px' }}>Choose your plan</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Powered by Razorpay · Secure payment · Cancel anytime</div>
            </div>
            <Btn size="sm" variant="ghost" onClick={() => setShowPlans(false)}>✕ Close</Btn>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 14 }}>
            {PLANS.map(p => {
              const isCurrent = p.id === billing.plan
              const pc2 = PC[p.id]
              return (
                <Card key={p.id} style={{ padding: 20, position: 'relative', border: p.popular && !isCurrent ? `2px solid ${pc2.color}` : isCurrent ? `1px solid ${pc2.border}` : '1px solid var(--border)', background: isCurrent ? pc2.bg : 'var(--surface)' }}>
                  {p.popular && !isCurrent && (
                    <div style={{ position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)', background: pc2.color, color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 12px', borderRadius: 99, whiteSpace: 'nowrap' }}>Most popular</div>
                  )}
                  <div style={{ fontWeight: 700, fontSize: 14, color: pc2.color, marginBottom: 2 }}>{p.name}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.5px' }}>{p.display}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 14 }}>{p.period === 'free forever' ? 'Free forever' : 'per month · billed monthly'}</div>
                  <div style={{ marginBottom: 16 }}>
                    {p.features.slice(0, 5).map(f => (
                      <div key={f} style={{ display: 'flex', gap: 7, alignItems: 'flex-start', fontSize: 12, color: 'var(--text-2)', marginBottom: 6 }}>
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0, marginTop: 2 }}><path d="M2 5l2.5 2.5L8 3" stroke="var(--green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        {f}
                      </div>
                    ))}
                    {p.features.length > 5 && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>+{p.features.length - 5} more features</div>}
                  </div>
                  {isCurrent ? (
                    <div style={{ padding: '8px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: pc2.color, background: pc2.bg, borderRadius: 'var(--r)', border: `1px solid ${pc2.border}` }}>✓ Current plan</div>
                  ) : (
                    <button disabled={!!paying || downgrading} onClick={() => handleUpgrade(p.id)}
                      style={{ width: '100%', padding: '10px', border: 'none', borderRadius: 'var(--r)', fontSize: 13, fontWeight: 600, cursor: (paying || downgrading) ? 'not-allowed' : 'pointer', background: p.id === 'starter' ? 'var(--surface-3)' : pc2.color, color: p.id === 'starter' ? 'var(--text-3)' : '#fff', opacity: (paying && paying !== p.id) || downgrading ? 0.5 : 1, transition: 'all 0.15s', fontFamily: 'var(--font)' }}>
                      {paying === p.id ? 'Opening checkout…' : p.id === 'starter' ? 'Downgrade to Free' : `Pay ${p.display}/mo →`}
                    </button>
                  )}
                </Card>
              )
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 28, padding: '12px 0', borderTop: '1px solid var(--border)' }}>
            {['🔒 SSL encrypted', '🏦 Razorpay secured', '🔁 Cancel anytime', '📞 Support included'].map(b => (
              <span key={b} style={{ fontSize: 11, color: 'var(--text-4)' }}>{b}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}