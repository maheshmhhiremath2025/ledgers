import { useState } from 'react'
import Head from 'next/head'

// Plan picker shown after signup
const PLANS_META = [
  {
    id: 'starter', name: 'Starter', price: '₹0', period: 'Free forever',
    color: '#9EA3BF', bg: 'rgba(158,163,191,0.08)', border: 'rgba(158,163,191,0.2)',
    tagline: 'Perfect to get started',
    features: ['5 invoices / month', '3 purchase orders', '1 organisation', 'Classic PDF template'],
    cta: 'Continue Free',
    ctaBg: 'var(--surface-3)', ctaColor: 'var(--text-2)',
  },
  {
    id: 'professional', name: 'Professional', price: '₹999', period: '/month',
    color: '#3B82F6', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.3)',
    tagline: 'Most popular for growing teams', popular: true,
    features: ['Unlimited invoices & POs', 'All 5 PDF templates', 'Logo & GST config', 'Saved customers'],
    cta: 'Start 14-day Free Trial',
    ctaBg: '#3B82F6', ctaColor: '#fff',
  },
  {
    id: 'business', name: 'Business', price: '₹2,499', period: '/month',
    color: '#6366F1', bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.3)',
    tagline: 'For teams & enterprises',
    features: ['Everything in Pro', '5 team members', 'CSV / Excel export', 'API access'],
    cta: 'Start 14-day Free Trial',
    ctaBg: '#6366F1', ctaColor: '#fff',
  },
]

function PlanPicker({ user, token, onDone }) {
  const [selecting, setSelecting] = useState(null)
  const [logoErr, setLogoErr]     = useState(false)

  const choosePlan = async (planId) => {
    setSelecting(planId)
    if (planId !== 'starter') {
      // Activate trial via billing API
      try {
        await fetch('/api/billing', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ newPlan: planId, userId: user.userId }),
        })
      } catch (e) { /* continue even if fails */ }
    }
    setSelecting(null)
    onDone({ ...user, plan: planId })
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', position: 'relative', overflow: 'hidden' }}>
      {/* Background */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(99,102,241,0.07) 1px, transparent 0)', backgroundSize: '32px 32px', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: '-15%', left: '20%', width: '60%', height: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', maxWidth: 900, width: '100%' }} className="fade-up">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            {!logoErr
              ? <img src="/logo.png" alt="Synergific Books" onError={() => setLogoErr(true)} style={{ height: 32, objectFit: 'contain', display: 'block' }} />
              : <>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(99,102,241,0.4)' }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M8 3v10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/></svg>
                  </div>
                  <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.3px' }}>Synergific Books</span>
                </>
            }
          </div>
          <div style={{ fontSize: 11, color: 'var(--green-text)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10, background: 'var(--green-dim)', display: 'inline-block', padding: '3px 12px', borderRadius: 99, border: '1px solid rgba(16,185,129,0.2)' }}>
            ✓ Account created successfully
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.8px', marginBottom: 10 }}>
            Welcome, {user.name?.split(' ')[0]}! Choose your plan
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-3)', maxWidth: 500, margin: '0 auto', lineHeight: 1.6 }}>
            Start free or unlock the full power of Synergific Books. All paid plans include a 14-day free trial — no credit card needed.
          </p>
        </div>

        {/* Plan cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
          {PLANS_META.map(p => (
            <div key={p.id} style={{
              background: 'var(--surface)',
              border: p.popular ? `2px solid ${p.color}` : `1px solid var(--border-2)`,
              borderRadius: 16,
              padding: 24,
              position: 'relative',
              transition: 'transform 0.15s, box-shadow 0.15s',
              cursor: 'default',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 12px 40px rgba(0,0,0,0.3)` }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}>

              {p.popular && (
                <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: p.color, color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 14px', borderRadius: 99, whiteSpace: 'nowrap', letterSpacing: '0.05em' }}>
                  MOST POPULAR
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: p.color, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{p.name}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 28, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.5px' }}>{p.price}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{p.period}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{p.tagline}</div>
              </div>

              <div style={{ height: 1, background: 'var(--border)', marginBottom: 16 }} />

              <div style={{ marginBottom: 20 }}>
                {p.features.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9, fontSize: 13, color: 'var(--text-2)' }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: `${p.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4l1.5 1.5L6.5 2" stroke={p.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    {f}
                  </div>
                ))}
              </div>

              <button
                onClick={() => choosePlan(p.id)}
                disabled={!!selecting}
                style={{
                  width: '100%', padding: '11px', border: 'none',
                  borderRadius: 10, fontSize: 13, fontWeight: 700,
                  cursor: selecting ? 'not-allowed' : 'pointer',
                  background: p.ctaBg, color: p.ctaColor,
                  opacity: selecting && selecting !== p.id ? 0.5 : 1,
                  transition: 'all 0.15s', fontFamily: 'var(--font)',
                  boxShadow: p.id !== 'starter' ? `0 4px 16px ${p.color}40` : 'none',
                }}>
                {selecting === p.id ? 'Setting up…' : p.cta}
              </button>

              {p.id !== 'starter' && (
                <div style={{ textAlign: 'center', marginTop: 8, fontSize: 11, color: 'var(--text-4)' }}>
                  14-day free trial · No credit card required
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Feature comparison strip */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 20px', display: 'flex', justifyContent: 'center', gap: 32, flexWrap: 'wrap' }}>
          {['🔒 Bank-grade security', '📱 Access anywhere', '☁️ Cloud backup', '🇮🇳 GST compliant', '🔁 Cancel anytime'].map(f => (
            <span key={f} style={{ fontSize: 12, color: 'var(--text-3)' }}>{f}</span>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button onClick={() => choosePlan('starter')} style={{ background: 'none', border: 'none', color: 'var(--text-4)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)' }}>
            Skip for now → Continue with free plan
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AuthPage({ onAuth }) {
  const [logoErr, setLogoErr]   = useState(false)
  const [mode, setMode]       = useState('login')
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [orgId, setOrgId]     = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  // Phase 5: after signup show plan picker
  const [newUser, setNewUser] = useState(null)
  const [newToken, setNewToken] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const body = mode === 'login'
        ? { email, password }
        : { name, email, password, orgId }
      const res = await fetch(`/api/auth/${mode}`, {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Something went wrong'); setLoading(false); return }
      if (data.token) localStorage.setItem('sb_token', data.token)

      if (mode === 'signup') {
        // Show plan picker before entering app
        setNewUser(data.user)
        setNewToken(data.token)
      } else {
        onAuth(data.user, data.token)
      }
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  const switchMode = (m) => { setMode(m); setError(''); setName(''); setEmail(''); setPassword(''); setOrgId('') }

  // Show plan picker after signup
  if (newUser) {
    return (
      <PlanPicker
        user={newUser}
        token={newToken}
        onDone={(user) => onAuth(user, newToken)}
      />
    )
  }

  const inputStyle = {
    width: '100%', padding: '10px 13px',
    background: 'var(--surface)', border: '1px solid var(--border-2)',
    borderRadius: 'var(--r-md)', fontSize: 13, color: 'var(--text)',
    outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
    fontFamily: 'var(--font)',
  }
  const labelStyle = { display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-3)', marginBottom: 6, letterSpacing: '0.03em' }

  const features = [
    { icon: '📄', title: 'Smart Invoicing',    desc: 'Create, send and track invoices with one-click PDF export.' },
    { icon: '📦', title: 'Purchase Orders',    desc: 'Manage vendor POs from draft to delivery with full audit trail.' },
    { icon: '💳', title: 'Payments',           desc: 'Record receipts and payouts, auto-reconcile with invoices.' },
    { icon: '📊', title: 'Ledgers & Reports',  desc: 'Full chart of accounts, trial balance and general ledger.' },
  ]

  return (
    <>
      <Head><title>Synergific Books — {mode === 'login' ? 'Sign In' : 'Create Account'}</title></Head>
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', position: 'relative', overflow: 'hidden' }}>

        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(99,102,241,0.07) 1px, transparent 0)', backgroundSize: '32px 32px', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '60%', height: '60%', background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-20%', right: '30%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(20,184,166,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Left panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 64px', position: 'relative', minWidth: 0 }}>
          <div style={{ maxWidth: 480 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48 }}>
              {!logoErr
                ? <img src="/logo.png" alt="Synergific Books" onError={() => setLogoErr(true)} style={{ height: 36, objectFit: 'contain', display: 'block' }} />
                : <>
                    <div style={{ width: 42, height: 42, borderRadius: 11, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 28px rgba(99,102,241,0.45)', flexShrink: 0 }}>
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 10h12M10 4v12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/></svg>
                    </div>
                    <span style={{ fontSize: 19, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.4px' }}>Synergific Books</span>
                  </>
              }
            </div>

            <div style={{ marginBottom: 40 }}>
              <div style={{ fontSize: 11, color: 'var(--accent-3)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>Finance Management Platform</div>
              <h1 style={{ fontSize: 38, fontWeight: 800, color: 'var(--text)', letterSpacing: '-1.2px', lineHeight: 1.12, marginBottom: 14 }}>
                Everything your<br />business needs
              </h1>
              <p style={{ fontSize: 15, color: 'var(--text-3)', lineHeight: 1.65, maxWidth: 400 }}>
                A complete accounting suite built for modern teams — invoices, purchase orders, payments and ledgers in one place.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {features.map(f => (
                <div key={f.title} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '14px 16px' }}>
                  <div style={{ fontSize: 20, marginBottom: 8 }}>{f.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{f.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.55 }}>{f.desc}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 28, padding: '14px 18px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 22, flexShrink: 0 }}>⚡</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>Multi-org support built in</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>One account, multiple companies — switch instantly from the sidebar.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right panel — form */}
        <div style={{ width: 460, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 48px', borderLeft: '1px solid var(--border)', background: 'var(--bg-2)', position: 'relative' }}>
          <div style={{ width: '100%', maxWidth: 360 }} className="fade-up">

            <div style={{ display: 'flex', background: 'var(--surface)', borderRadius: 'var(--r-md)', padding: 3, marginBottom: 28, border: '1px solid var(--border)' }}>
              {['login', 'signup'].map(m => (
                <button key={m} type="button" onClick={() => switchMode(m)} style={{
                  flex: 1, padding: '8px', border: 'none', borderRadius: 'var(--r)',
                  background: mode === m ? 'var(--surface-3)' : 'transparent',
                  color: mode === m ? 'var(--text)' : 'var(--text-3)',
                  fontWeight: mode === m ? 600 : 400, fontSize: 13, cursor: 'pointer',
                  transition: 'all 0.15s',
                  boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
                  fontFamily: 'var(--font)',
                }}>
                  {m === 'login' ? 'Sign In' : 'Sign Up'}
                </button>
              ))}
            </div>

            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.4px' }}>
                {mode === 'login' ? 'Welcome back' : 'Create your account'}
              </h2>
              <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
                {mode === 'login' ? 'Sign in to your Synergific Books account.' : 'Get started for free — no credit card required.'}
              </p>
            </div>

            {error && (
              <div style={{ background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.25)', color: 'var(--red-text)', padding: '10px 13px', borderRadius: 'var(--r)', fontSize: 13, marginBottom: 16 }}>
                {error}
              </div>
            )}

            <form onSubmit={submit} autoComplete="on">
              {mode === 'signup' && (
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Full Name</label>
                  <input name="name" autoComplete="name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" required style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)' }}
                    onBlur={e => { e.target.style.borderColor = 'var(--border-2)'; e.target.style.boxShadow = 'none' }} />
                </div>
              )}

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Email Address</label>
                <input name="email" autoComplete="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)' }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border-2)'; e.target.style.boxShadow = 'none' }} />
              </div>

              <div style={{ marginBottom: mode === 'signup' ? 14 : 20 }}>
                <label style={labelStyle}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input name="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder={mode === 'signup' ? 'Min 6 characters' : '••••••••'} required minLength={6} style={{ ...inputStyle, paddingRight: 56 }}
                    onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)' }}
                    onBlur={e => { e.target.style.borderColor = 'var(--border-2)'; e.target.style.boxShadow = 'none' }} />
                  <button type="button" onClick={() => setShowPass(s => !s)} style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'var(--font)' }}>
                    {showPass ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {mode === 'signup' && (
                <div style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>Organization ID <span style={{ color: 'var(--text-4)', fontWeight: 400 }}>(optional)</span></label>
                  <input name="orgId" autoComplete="organization" type="text" value={orgId} onChange={e => setOrgId(e.target.value)} placeholder="e.g. acme-corp" style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.15)' }}
                    onBlur={e => { e.target.style.borderColor = 'var(--border-2)'; e.target.style.boxShadow = 'none' }} />
                  <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 5, lineHeight: 1.5 }}>Auto-generated if blank. Share with teammates to collaborate.</div>
                </div>
              )}

              <button type="submit" disabled={loading} style={{
                width: '100%', padding: '11px',
                background: loading ? 'var(--surface-3)' : 'var(--accent)',
                color: loading ? 'var(--text-3)' : '#fff',
                border: 'none', borderRadius: 'var(--r-md)',
                fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(99,102,241,0.4)',
                transition: 'all 0.2s', fontFamily: 'var(--font)',
              }}>
                {loading ? 'Please wait…' : mode === 'login' ? 'Sign In →' : 'Create Account →'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--text-4)' }}>
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button type="button" onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')} style={{ color: 'var(--accent-2)', border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'var(--font)' }}>
                {mode === 'login' ? 'Sign up free' : 'Sign in'}
              </button>
            </div>

            <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'center', gap: 20 }}>
              {['🔒 Secure', '☁️ Cloud sync', '⚡ Fast'].map(t => (
                <span key={t} style={{ fontSize: 11, color: 'var(--text-4)' }}>{t}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}