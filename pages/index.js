import Head from 'next/head'
import { useEffect, useState } from 'react'

const FEATURES = [
  { icon: '📄', title: 'GST Invoicing', desc: 'Create professional GST-compliant invoices in seconds. 5 PDF templates, auto-numbering, send by email.' },
  { icon: '📊', title: 'Financial Reports', desc: 'P&L, Balance Sheet, Trial Balance and GSTR-1/3B — all auto-generated from your transactions.' },
  { icon: '🔁', title: 'Recurring Invoices', desc: 'Set weekly, monthly or quarterly schedules. Invoices create and send themselves automatically.' },
  { icon: '💳', title: 'Online Payments', desc: 'Customers pay via UPI, cards or net banking through a branded portal — powered by Razorpay.' },
  { icon: '📒', title: 'Double-Entry Ledger', desc: 'Every transaction posts journal entries automatically. Real-time chart of accounts, always balanced.' },
  { icon: '👥', title: 'Team Access', desc: 'Invite accountants and viewers with role-based access — Admin, Accountant, Viewer.' },
  { icon: '💸', title: 'Expense Tracking', desc: 'Record business expenses by category. Auto-posts to expense ledger. Monthly summaries on dashboard.' },
  { icon: '🌙', title: 'Dark & Light Mode', desc: 'Beautiful dark interface by default with a clean professional light mode.' },
]

const PLANS = [
  {
    name: 'Starter', price: '₹0', period: 'free forever', highlight: false,
    features: ['5 invoices / month', '3 purchase orders / month', 'Classic PDF template', 'Chart of accounts', '1 organisation'],
  },
  {
    name: 'Professional', price: '₹999', period: '/month', highlight: true,
    features: ['Unlimited invoices & POs', 'All 5 PDF templates', 'Logo on invoices', 'GST & bank config', 'Saved customers', 'Email delivery', 'Customer payment portal'],
  },
  {
    name: 'Business', price: '₹2,499', period: '/month', highlight: false,
    features: ['Everything in Professional', '5 team members', 'Role-based access', 'CSV / Excel export', 'Recurring invoices', 'Overdue reminders', 'Priority support'],
  },
]

const TESTIMONIALS = [
  { name: 'Priya S.', role: 'Freelance Designer', text: 'Finally an invoicing tool that understands Indian GST. The recurring billing alone saves me 2 hours every month.' },
  { name: 'Rahul M.', role: 'Software Consultant', text: 'The customer portal is a game changer. Clients pay the same day instead of following up for weeks.' },
  { name: 'Anita K.', role: 'CA & Accountant', text: 'The GSTR-1 export is accurate and the trial balance is always in sync. Highly recommend to my clients.' },
]

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('sb_theme') || 'dark'
    setIsDark(saved === 'dark')
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const toggleTheme = () => {
    const next = isDark ? 'light' : 'dark'
    setIsDark(!isDark)
    localStorage.setItem('sb_theme', next)
    document.documentElement.setAttribute('data-theme', next)
  }

  const C = {
    bg:      isDark ? '#0D0F1A' : '#F0F2F8',
    surface: isDark ? '#1E2140' : '#FFFFFF',
    border:  isDark ? 'rgba(255,255,255,0.08)' : 'rgba(99,102,241,0.12)',
    text:    isDark ? '#ECEEF8' : '#0F1729',
    text2:   isDark ? '#9EA3BF' : '#374151',
    text3:   isDark ? '#636880' : '#6B7280',
    accent:  '#6366F1',
    dim:     isDark ? 'rgba(99,102,241,0.14)' : 'rgba(99,102,241,0.08)',
    navBg:   scrolled ? (isDark ? 'rgba(13,15,26,0.92)' : 'rgba(255,255,255,0.92)') : 'transparent',
  }
  const F = "'DM Sans', system-ui, sans-serif"
  const M = "'DM Mono', monospace"

  return (
    <>
      <Head>
        <title>Synergific Books — GST Invoicing & Accounting for India</title>
        <meta name="description" content="Professional GST invoicing, double-entry accounting, financial reports and online payments for Indian businesses." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </Head>
      <div style={{ background: C.bg, color: C.text, fontFamily: F, minHeight: '100vh' }}>

        {/* Navbar */}
        <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: C.navBg, backdropFilter: scrolled ? 'blur(16px)' : 'none', borderBottom: `1px solid ${scrolled ? C.border : 'transparent'}`, transition: 'all 0.2s' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(99,102,241,0.4)' }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M7 2v10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/></svg>
              </div>
              <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.3px', color: C.text }}>Synergific Books</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              {['features','pricing'].map(id => (
                <a key={id} href={`#${id}`} style={{ fontSize: 14, color: C.text2, fontWeight: 500, textDecoration: 'none', textTransform: 'capitalize' }}
                  onMouseEnter={e => e.target.style.color = C.accent} onMouseLeave={e => e.target.style.color = C.text2}>{id}</a>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={toggleTheme} style={{ width: 34, height: 34, borderRadius: 8, background: C.surface, border: `1px solid ${C.border}`, cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isDark ? '☀️' : '🌙'}
              </button>
              <a href="/app" style={{ padding: '8px 14px', fontSize: 13, fontWeight: 600, color: C.text2, border: `1px solid ${C.border}`, borderRadius: 8, textDecoration: 'none', background: C.surface }}>Log in</a>
              <a href="/app" style={{ padding: '8px 16px', fontSize: 13, fontWeight: 700, color: '#fff', background: C.accent, borderRadius: 8, textDecoration: 'none', boxShadow: '0 4px 16px rgba(99,102,241,0.35)' }}>Get started free</a>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <section style={{ maxWidth: 1100, margin: '0 auto', padding: '96px 24px 80px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: C.dim, border: '1px solid rgba(99,102,241,0.25)', borderRadius: 99, fontSize: 12, fontWeight: 600, color: '#818CF8', marginBottom: 28 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6EE7B7', display: 'inline-block' }} />
            GST-compliant · Made for India · Starts free
          </div>
          <h1 style={{ fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 800, letterSpacing: '-2px', lineHeight: 1.1, marginBottom: 24, color: C.text }}>
            Invoicing & accounting<br />
            <span style={{ color: C.accent }}>built for Indian businesses</span>
          </h1>
          <p style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: C.text2, lineHeight: 1.6, maxWidth: 540, margin: '0 auto 40px' }}>
            Create GST invoices, track expenses, generate GSTR reports and accept online payments — all in one beautiful app.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/app" style={{ padding: '14px 28px', fontSize: 15, fontWeight: 700, color: '#fff', background: C.accent, borderRadius: 10, textDecoration: 'none', boxShadow: '0 6px 24px rgba(99,102,241,0.45)' }}>Start for free — no credit card</a>
            <a href="#features" style={{ padding: '14px 28px', fontSize: 15, fontWeight: 600, color: C.text2, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, textDecoration: 'none' }}>See features ↓</a>
          </div>
          <div style={{ marginTop: 56, display: 'flex', justifyContent: 'center', gap: 48, flexWrap: 'wrap' }}>
            {[['5 mins','to first invoice'],['₹0','to get started'],['GSTR-1','export ready'],['5 templates','PDF designs']].map(([v,l]) => (
              <div key={l} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: M, fontSize: 22, fontWeight: 700, color: C.accent }}>{v}</div>
                <div style={{ fontSize: 12, color: C.text3, marginTop: 3 }}>{l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Mock dashboard */}
        <section style={{ maxWidth: 960, margin: '0 auto 96px', padding: '0 24px' }}>
          <div style={{ borderRadius: 16, overflow: 'hidden', border: `1px solid ${C.border}`, boxShadow: isDark ? '0 32px 96px rgba(0,0,0,0.6)' : '0 32px 96px rgba(99,102,241,0.12)' }}>
            <div style={{ background: isDark ? '#13152B' : '#E8EBF4', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${C.border}` }}>
              {['#EF4444','#F59E0B','#10B981'].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />)}
              <div style={{ flex: 1, height: 22, background: isDark ? '#1E2140' : '#fff', borderRadius: 6, marginLeft: 8, display: 'flex', alignItems: 'center', paddingLeft: 10 }}>
                <span style={{ fontSize: 11, color: C.text3, fontFamily: M }}>synergific-books.vercel.app/app</span>
              </div>
            </div>
            <div style={{ background: C.bg, padding: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
                {[['FY Revenue','₹8,42,500','#818CF8'],['Outstanding','₹1,24,000','#FCD34D'],['Cash Balance','₹3,56,200','#6EE7B7'],['Net Profit','₹4,18,300','#6EE7B7']].map(([l,v,c]) => (
                  <div key={l} style={{ background: C.surface, borderRadius: 10, padding: '12px 14px', border: `1px solid ${C.border}` }}>
                    <div style={{ fontSize: 9, color: C.text3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{l}</div>
                    <div style={{ fontFamily: M, fontSize: 16, fontWeight: 700, color: c }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`, height: 100, display: 'flex', alignItems: 'flex-end', gap: 4, padding: '14px 16px' }}>
                {[30,45,25,60,80,55,90,70,85,100,65,95].map((h,i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                    <div style={{ width: '45%', height: `${h*0.55}px`, background: '#6366F1', borderRadius: '2px 2px 0 0', opacity: 0.85 }} />
                    <div style={{ width: '45%', height: `${h*0.12}px`, background: '#EF4444', borderRadius: '2px 2px 0 0', opacity: 0.7 }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" style={{ maxWidth: 1100, margin: '0 auto 96px', padding: '0 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <h2 style={{ fontSize: 'clamp(28px,4vw,42px)', fontWeight: 800, letterSpacing: '-1.5px', marginBottom: 12, color: C.text }}>Everything your business needs</h2>
            <p style={{ fontSize: 16, color: C.text2, maxWidth: 440, margin: '0 auto' }}>From your first invoice to your CA's annual filing — we handle the full cycle.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
            {FEATURES.map(f => (
              <div key={f.title} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '22px 20px', transition: 'border-color 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(99,102,241,0.1)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = 'none' }}>
                <div style={{ fontSize: 26, marginBottom: 10 }}>{f.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, color: C.text }}>{f.title}</div>
                <div style={{ fontSize: 13, color: C.text2, lineHeight: 1.6 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" style={{ maxWidth: 1100, margin: '0 auto 96px', padding: '0 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <h2 style={{ fontSize: 'clamp(28px,4vw,42px)', fontWeight: 800, letterSpacing: '-1.5px', marginBottom: 12, color: C.text }}>Simple, transparent pricing</h2>
            <p style={{ fontSize: 16, color: C.text2 }}>Start free. Upgrade when you grow.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20, alignItems: 'stretch' }}>
            {PLANS.map(p => (
              <div key={p.name} style={{ background: p.highlight ? C.accent : C.surface, border: `1px solid ${p.highlight ? 'transparent' : C.border}`, borderRadius: 16, padding: '32px 26px', position: 'relative', transform: p.highlight ? 'scale(1.03)' : 'none', boxShadow: p.highlight ? '0 16px 48px rgba(99,102,241,0.4)' : 'none', display: 'flex', flexDirection: 'column' }}>
                {p.highlight && <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#10B981', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 14px', borderRadius: 99, whiteSpace: 'nowrap' }}>Most popular</div>}
                <div style={{ fontSize: 12, fontWeight: 700, color: p.highlight ? 'rgba(255,255,255,0.7)' : C.text3, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{p.name}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                  <span style={{ fontFamily: M, fontSize: 34, fontWeight: 800, color: p.highlight ? '#fff' : C.text }}>{p.price}</span>
                  <span style={{ fontSize: 13, color: p.highlight ? 'rgba(255,255,255,0.6)' : C.text3 }}>{p.period}</span>
                </div>
                <div style={{ borderTop: `1px solid ${p.highlight ? 'rgba(255,255,255,0.2)' : C.border}`, paddingTop: 18, marginTop: 14, marginBottom: 22, flex: 1 }}>
                  {p.features.map(f => (
                    <div key={f} style={{ display: 'flex', gap: 9, marginBottom: 9, fontSize: 13, color: p.highlight ? 'rgba(255,255,255,0.9)' : C.text2 }}>
                      <span style={{ color: p.highlight ? '#6EE7B7' : '#10B981', fontWeight: 700, flexShrink: 0 }}>✓</span>{f}
                    </div>
                  ))}
                </div>
                <a href="/app" style={{ display: 'block', textAlign: 'center', padding: '11px', background: p.highlight ? '#fff' : C.dim, color: C.accent, borderRadius: 10, fontWeight: 700, fontSize: 14, textDecoration: 'none', border: p.highlight ? 'none' : `1px solid rgba(99,102,241,0.25)` }}>
                  {p.price === '₹0' ? 'Start free' : 'Get started'} →
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* Testimonials */}
        <section style={{ maxWidth: 1100, margin: '0 auto 96px', padding: '0 24px' }}>
          <h2 style={{ textAlign: 'center', fontSize: 'clamp(28px,4vw,40px)', fontWeight: 800, letterSpacing: '-1.5px', marginBottom: 44, color: C.text }}>Loved by Indian businesses</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18 }}>
            {TESTIMONIALS.map(t => (
              <div key={t.name} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '24px 20px' }}>
                <div style={{ fontSize: 18, marginBottom: 12, color: '#FCD34D' }}>★★★★★</div>
                <p style={{ fontSize: 13, color: C.text2, lineHeight: 1.7, marginBottom: 16 }}>"{t.text}"</p>
                <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{t.name}</div>
                <div style={{ fontSize: 12, color: C.text3 }}>{t.role}</div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section style={{ maxWidth: 1100, margin: '0 auto 96px', padding: '0 24px' }}>
          <div style={{ background: isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 20, padding: 'clamp(40px,6vw,72px)', textAlign: 'center' }}>
            <h2 style={{ fontSize: 'clamp(26px,4vw,40px)', fontWeight: 800, letterSpacing: '-1.5px', marginBottom: 14, color: C.text }}>Ready to simplify your finances?</h2>
            <p style={{ fontSize: 16, color: C.text2, maxWidth: 440, margin: '0 auto 32px', lineHeight: 1.6 }}>Join Indian freelancers and businesses using Synergific Books. Free to start, no credit card required.</p>
            <a href="/app" style={{ display: 'inline-block', padding: '15px 36px', fontSize: 16, fontWeight: 700, color: '#fff', background: C.accent, borderRadius: 12, textDecoration: 'none', boxShadow: '0 8px 32px rgba(99,102,241,0.45)' }}>
              Create your free account →
            </a>
            <div style={{ marginTop: 16, fontSize: 13, color: C.text3 }}>Free forever plan · No credit card · Setup in 5 minutes</div>
          </div>
        </section>

        {/* Footer */}
        <footer style={{ borderTop: `1px solid ${C.border}`, padding: '28px 24px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: C.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="11" height="11" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M7 2v10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/></svg>
              </div>
              <span style={{ fontWeight: 700, fontSize: 13, color: C.text }}>Synergific Books</span>
            </div>
            <div style={{ display: 'flex', gap: 20 }}>
              {[['Features','#features'],['Pricing','#pricing'],['Log in','/app'],['Sign up','/app']].map(([l,h]) => (
                <a key={l} href={h} style={{ fontSize: 13, color: C.text3, textDecoration: 'none' }}
                  onMouseEnter={e => e.target.style.color = C.accent} onMouseLeave={e => e.target.style.color = C.text3}>{l}</a>
              ))}
            </div>
            <div style={{ fontSize: 12, color: C.text3 }}>© {new Date().getFullYear()} Synergific Software</div>
          </div>
        </footer>

      </div>
    </>
  )
}