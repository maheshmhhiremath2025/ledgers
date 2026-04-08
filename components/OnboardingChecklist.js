import { useState, useEffect } from 'react'

// Shows a dismissable getting-started checklist. Auto-hides once all steps
// are complete OR the user dismisses it (persisted in localStorage per org).
export default function OnboardingChecklist({ headers, onNavigate, invoiceCount = 0 }) {
  const [cfg, setCfg]         = useState(null)
  const [counts, setCounts]   = useState({ customers: 0, banks: 0 })
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('sb_onboarding_dismissed') === '1') {
      setDismissed(true)
    }
    Promise.all([
      fetch('/api/org/config', { headers, credentials: 'include' }).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/customers?limit=1', { headers, credentials: 'include' }).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/bank-accounts?limit=1', { headers, credentials: 'include' }).then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([c, cust, banks]) => {
      setCfg(c || {})
      setCounts({
        customers: Array.isArray(cust) ? cust.length : (cust?.items?.length || 0),
        banks:     Array.isArray(banks) ? banks.length : (banks?.items?.length || 0),
      })
      setLoading(false)
    })
  }, [])

  if (loading || dismissed) return null

  const steps = [
    { id: 'org',       label: 'Set up your organisation',     desc: 'Add business name, GSTIN and address',   done: !!(cfg?.gstin || cfg?.legalName), go: 'settings'  },
    { id: 'logo',      label: 'Upload your logo',             desc: 'Appears on all invoices and PDFs',        done: !!cfg?.logoUrl,                    go: 'settings'  },
    { id: 'customer',  label: 'Add your first customer',      desc: 'Save customer details for quick billing', done: counts.customers > 0,              go: 'customers' },
    { id: 'bank',      label: 'Add a bank account',           desc: 'Shows on invoices for payments',          done: counts.banks > 0,                  go: 'bank-accounts' },
    { id: 'invoice',   label: 'Create your first invoice',    desc: 'Send a GST-compliant invoice by email',   done: invoiceCount > 0,                  go: 'invoices'  },
  ]

  const done  = steps.filter(s => s.done).length
  const total = steps.length
  const pct   = Math.round((done / total) * 100)

  if (done === total) return null

  const dismiss = () => {
    localStorage.setItem('sb_onboarding_dismissed', '1')
    setDismissed(true)
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.04))',
      border: '1px solid rgba(99,102,241,0.25)',
      borderRadius: 'var(--r-lg)', padding: 20, position: 'relative',
    }}>
      <button onClick={dismiss} title="Dismiss"
        style={{ position: 'absolute', top: 12, right: 12, background: 'transparent', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 18, padding: 4, lineHeight: 1 }}>×</button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 18 }}>🚀</span>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Get started with HexaLabs Books</div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Complete these steps to get the most out of your account</div>
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-2)', background: 'var(--accent-dim)', padding: '5px 12px', borderRadius: 99 }}>
          {done} of {total} · {pct}%
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 6, background: 'var(--surface-2)', borderRadius: 99, overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #6366F1, #8B5CF6)', transition: 'width 0.3s' }}/>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
        {steps.map(s => (
          <button key={s.id} onClick={() => !s.done && onNavigate(s.go)}
            disabled={s.done}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: 12,
              background: s.done ? 'var(--surface-2)' : 'var(--surface)',
              border: `1px solid ${s.done ? 'var(--border)' : 'var(--border-2)'}`,
              borderRadius: 'var(--r)', cursor: s.done ? 'default' : 'pointer',
              textAlign: 'left', fontFamily: 'var(--font)', opacity: s.done ? 0.65 : 1,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (!s.done) { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-1px)' } }}
            onMouseLeave={e => { if (!s.done) { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.transform = 'none' } }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
              background: s.done ? 'var(--green-text)' : 'var(--surface-2)',
              border: `2px solid ${s.done ? 'var(--green-text)' : 'var(--border-2)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff',
            }}>
              {s.done && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 13l4 4L19 7"/>
                </svg>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', textDecoration: s.done ? 'line-through' : 'none' }}>{s.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{s.desc}</div>
            </div>
            {!s.done && <span style={{ fontSize: 14, color: 'var(--accent-2)' }}>→</span>}
          </button>
        ))}
      </div>
    </div>
  )
}
